using MicroHelio.Config;
using MicroHelio.DTOs;
using MicroHelio.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace MicroHelio.Services
{
    public class TransactionService
    {
        private readonly IMongoCollection<Transaction> _transactions;
        private readonly IMongoCollection<EnergyReservation> _reservations;
        private readonly string _hmacSecret;

        // Initializes MongoDB collections using the injected database settings
        public TransactionService(IMongoClient mongoClient, IOptions<MicroHelioDatabaseSettings> settings, IConfiguration configuration)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _transactions = database.GetCollection<Transaction>(settings.Value.TransactionsCollectionName);
            _reservations = database.GetCollection<EnergyReservation>("EnergyReservations");

            // Dynamically load the secret from Secret Manager (local) or Environment Variables (IIS)
            _hmacSecret = configuration["Jwt:Key"] ?? throw new InvalidOperationException("HMAC secret is not configured.");
        }

        // Creates a new transaction record when a Grid Operator initiates a scan
        public async Task<Transaction> CreateInitiatedTransactionAsync(CreateTransactionDto dto, string operatorId)
        {
            var transaction = new Transaction
            {
                TransactionCode = $"TRX-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
                ReservationId = dto.ReservationId,
                ProsumerNic = dto.ProsumerNic,
                NodeId = dto.NodeId,
                OperatorId = operatorId,
                TransactionStatus = "Initiated",
                ScannedQrCode = dto.ScannedQrCode,
                ServerVerified = false,
                CreatedAt = DateTime.UtcNow
            };

            await _transactions.InsertOneAsync(transaction);
            return transaction;
        }

        // Decodes the QR JSON payload, validates the HMAC signature, and confirms the reservation is Approved
        public async Task<bool> VerifyQrPayloadAsync(string qrPayload)
        {
            try
            {
                // 1. Deserialize the payload
                var payloadData = JsonSerializer.Deserialize<Dictionary<string, string>>(qrPayload);
                if (payloadData == null || !payloadData.ContainsKey("hmacSignature") || !payloadData.ContainsKey("reservationId"))
                    return false;

                var providedSignature = payloadData["hmacSignature"];
                var reservationId = payloadData["reservationId"];
                var prosumerNic = payloadData.GetValueOrDefault("prosumerNic", "");
                var nodeId = payloadData.GetValueOrDefault("nodeId", "");
                var scheduledDate = payloadData.GetValueOrDefault("scheduledDate", "");

                // 2. Reconstruct the message to hash
                var messageToHash = $"{reservationId}{prosumerNic}{nodeId}{scheduledDate}";

                // 3. Re-compute HMAC and compare
                using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_hmacSecret)))
                {
                    var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(messageToHash));
                    var computedSignature = Convert.ToBase64String(computedHash);

                    if (providedSignature != computedSignature)
                        return false; // Tampered payload
                }

                // 4. Server-side validation: Ensure reservation exists and is strictly 'Approved'
                var reservation = await _reservations.Find(r => r.Id == reservationId).FirstOrDefaultAsync();
                if (reservation == null || reservation.Status != "Approved")
                {
                    return false;
                }

                return true;
            }
            catch
            {
                return false; // Catch JSON parsing errors or missing fields
            }
        }

        // Updates transaction status to Completed, records energy, and updates the linked reservation
        public async Task<bool> CompleteTransactionAsync(string transactionId, double energyKWh)
        {
            var transaction = await _transactions.Find(t => t.Id == transactionId).FirstOrDefaultAsync();
            if (transaction == null) return false;

            // Update Transaction
            var transactionUpdate = Builders<Transaction>.Update
                .Set(t => t.TransactionStatus, "Completed")
                .Set(t => t.EnergyTransferredKWh, energyKWh)
                .Set(t => t.ServerVerified, true)
                .Set(t => t.VerifiedAt, DateTime.UtcNow)
                .Set(t => t.CompletedAt, DateTime.UtcNow);

            await _transactions.UpdateOneAsync(t => t.Id == transactionId, transactionUpdate);

            // Update Reservation (Cross-component integration rule)
            var reservationUpdate = Builders<EnergyReservation>.Update
                .Set(r => r.Status, "Completed");

            await _reservations.UpdateOneAsync(r => r.Id == transaction.ReservationId, reservationUpdate);

            return true;
        }

        // Retrieves a filtered list of transactions based on Prosumer NIC or Operator ID
        public async Task<List<Transaction>> GetFilteredTransactionsAsync(string? prosumerNic, string? operatorId)
        {
            var builder = Builders<Transaction>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrEmpty(prosumerNic))
            {
                filter &= builder.Eq(t => t.ProsumerNic, prosumerNic);
            }
            if (!string.IsNullOrEmpty(operatorId))
            {
                filter &= builder.Eq(t => t.OperatorId, operatorId);
            }

            return await _transactions.Find(filter).SortByDescending(t => t.CreatedAt).ToListAsync();
        }

        // Retrieves a single transaction by its Object ID
        public async Task<Transaction?> GetTransactionByIdAsync(string id)
        {
            return await _transactions.Find(t => t.Id == id).FirstOrDefaultAsync();
        }

        // Generates an HMAC-signed JSON payload for approved reservations and stores it in the database.
        public async Task<string?> GenerateQrPayloadAsync(string reservationId)
        {
            var reservation = await _reservations.Find(r => r.Id == reservationId).FirstOrDefaultAsync();

            // Ensure reservation exists and is strictly approved before generating a QR code
            if (reservation == null || reservation.Status != "Approved")
            {
                return null;
            }

            // 1. Construct the exact string to hash to ensure verification matches later
            var messageToHash = $"{reservation.Id}{reservation.ProsumerNic}{reservation.NodeId}{reservation.ScheduledDate:yyyy-MM-dd}";

            string computedSignature;
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_hmacSecret)))
            {
                var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(messageToHash));
                computedSignature = Convert.ToBase64String(computedHash);
            }

            // 2. Build the JSON payload object mapped to the agreed schema
            var payloadObj = new
            {
                reservationId = reservation.Id,
                prosumerNic = reservation.ProsumerNic,
                nodeId = reservation.NodeId,
                scheduledDate = reservation.ScheduledDate.ToString("yyyy-MM-dd"),
                hmacSignature = computedSignature
            };

            var qrCodeDataString = JsonSerializer.Serialize(payloadObj);

            // 3. Store the generated QR data on the reservation document
            var update = Builders<EnergyReservation>.Update
                .Set(r => r.QrCodeData, qrCodeDataString)
                .Set(r => r.QrGeneratedAt, DateTime.UtcNow);

            await _reservations.UpdateOneAsync(r => r.Id == reservationId, update);

            return qrCodeDataString;
        }
    }
}
