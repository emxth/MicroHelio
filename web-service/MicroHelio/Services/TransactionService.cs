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
            _reservations = database.GetCollection<EnergyReservation>(settings.Value.EnergyReservationsCollectionName);

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
        public async Task<(bool IsSuccess, string Message)> VerifyQrPayloadAsync(string qrPayload)
        {
            try
            {
                // Deserialize the payload
                var payloadData = JsonSerializer.Deserialize<Dictionary<string, string>>(qrPayload);
                if (payloadData == null || !payloadData.ContainsKey("hmacSignature") || !payloadData.ContainsKey("reservationId"))
                    return (false, "QR Payload is missing required fields (reservationId, hmacSignature).");

                var providedSignature = payloadData["hmacSignature"];
                var reservationId = payloadData["reservationId"];
                var prosumerNic = payloadData.GetValueOrDefault("prosumerNic", "");
                var nodeId = payloadData.GetValueOrDefault("nodeId", "");
                var scheduledDate = payloadData.GetValueOrDefault("scheduledDate", "");

                if (scheduledDate.Contains("T")) scheduledDate = scheduledDate.Split('T')[0];
                if (scheduledDate.Contains(" ")) scheduledDate = scheduledDate.Split(' ')[0];

                // Fetch reservation from database
                var reservation = await _reservations.Find(r => r.Id == reservationId).FirstOrDefaultAsync();
                if (reservation == null)
                {
                    return (false, $"Reservation ID '{reservationId}' not found in database.");
                }

                // Reconstruct message and verify HMAC signature with candidate dates for timezone variations
                if (string.IsNullOrEmpty(prosumerNic)) prosumerNic = reservation.ProsumerNic;
                if (string.IsNullOrEmpty(nodeId)) nodeId = reservation.NodeId;

                var candidateDates = new List<string>();
                if (!string.IsNullOrEmpty(scheduledDate)) candidateDates.Add(scheduledDate);
                candidateDates.Add(reservation.ScheduledDate.ToString("yyyy-MM-dd"));
                candidateDates.Add(reservation.ScheduledDate.ToLocalTime().ToString("yyyy-MM-dd"));
                candidateDates.Add(reservation.ScheduledDate.ToUniversalTime().ToString("yyyy-MM-dd"));

                bool signatureValid = false;
                using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_hmacSecret)))
                {
                    foreach (var dateCandidate in candidateDates.Distinct())
                    {
                        var msg = $"{reservation.Id}{reservation.ProsumerNic}{reservation.NodeId}{dateCandidate}";
                        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(msg));
                        var computedSig = Convert.ToBase64String(hash);
                        if (providedSignature == computedSig)
                        {
                            signatureValid = true;
                            break;
                        }
                    }
                }

                if (!signatureValid)
                {
                    return (false, "HMAC signature mismatch. QR payload may be tampered or signed with wrong secret key.");
                }

                if (reservation.Status != "Approved" && reservation.Status != "Completed")
                {
                    return (false, $"Reservation status is '{reservation.Status}'. Only Approved or Completed reservations can be verified.");
                }

                return (true, "QR Payload verified successfully.");
            }
            catch (Exception ex)
            {
                return (false, $"Error verifying payload: {ex.Message}");
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

        // Retrieves a filtered list of transactions based on Prosumer NIC, Operator ID, or Status
        public async Task<List<Transaction>> GetFilteredTransactionsAsync(string? prosumerNic, string? operatorId, string? status = null)
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
            if (!string.IsNullOrEmpty(status))
            {
                filter &= builder.Eq(t => t.TransactionStatus, status);
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
