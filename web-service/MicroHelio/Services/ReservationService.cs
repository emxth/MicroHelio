/* 
 * Author: Ashwin
 * Purpose: FAT Service layer handling all business logic for energy reservations[cite: 1].
 */
using MicroHelio.Config;
using MicroHelio.Models;
using MicroHelio.DTOs;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace MicroHelio.Services
{
    public class ReservationService
    {
        private readonly IMongoCollection<EnergyReservation> _reservations;

        // Initializes the MongoDB connection for the reservations collection.
        public ReservationService(IMongoClient mongoClient, IOptions<MicroHelioDatabaseSettings> settings)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _reservations = database.GetCollection<EnergyReservation>(settings.Value.EnergyReservationsCollectionName);
        }

        // Creates a new reservation, enforcing the 7-day rule[cite: 1, 2].
        public async Task<EnergyReservation> CreateReservationAsync(CreateReservationDto dto)
        {
            var daysUntilBooking = (dto.ScheduledDate.Date - DateTime.UtcNow.Date).TotalDays;
            if (daysUntilBooking > 7 || daysUntilBooking < 0)
            {
                throw new InvalidOperationException("Reservations must be scheduled within the next 7 days.");
            }

            var newReservation = new EnergyReservation
            {
                ReservationCode = "RES-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper(),
                ProsumerNic = dto.ProsumerNic,
                NodeId = dto.NodeId,
                SlotId = dto.SlotId,
                ReservationType = dto.ReservationType,
                ScheduledDate = dto.ScheduledDate.Date,
                ScheduledStartTime = dto.ScheduledStartTime,
                ScheduledEndTime = dto.ScheduledEndTime,
                RequestedCapacityKWh = dto.RequestedCapacityKWh,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _reservations.InsertOneAsync(newReservation);
            return newReservation;
        }

        // Updates a reservation, enforcing the 12-hour rule[cite: 1, 2].
        public async Task UpdateReservationAsync(string id, UpdateReservationDto dto)
        {
            var reservation = await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (reservation == null) throw new KeyNotFoundException("Reservation not found.");

            EnforceTwelveHourRule(reservation.ScheduledDate, reservation.ScheduledStartTime);

            var update = Builders<EnergyReservation>.Update
                .Set(r => r.SlotId, dto.SlotId)
                .Set(r => r.ScheduledDate, dto.ScheduledDate.Date)
                .Set(r => r.ScheduledStartTime, dto.ScheduledStartTime)
                .Set(r => r.ScheduledEndTime, dto.ScheduledEndTime)
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            await _reservations.UpdateOneAsync(r => r.Id == id, update);
        }

        // Cancels a reservation, enforcing the 12-hour rule[cite: 1, 2].
        public async Task CancelReservationAsync(string id, string reason)
        {
            var reservation = await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (reservation == null) throw new KeyNotFoundException("Reservation not found.");

            EnforceTwelveHourRule(reservation.ScheduledDate, reservation.ScheduledStartTime);

            var update = Builders<EnergyReservation>.Update
                .Set(r => r.Status, "Cancelled")
                .Set(r => r.CancellationReason, reason)
                .Set(r => r.CancelledAt, DateTime.UtcNow)
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            await _reservations.UpdateOneAsync(r => r.Id == id, update);

            // TODO: Call Component 2 (Sewwandi) to restore capacity to the slot[cite: 2].
        }

        // Retrieves all reservations for a specific prosumer[cite: 2].
        public async Task<List<EnergyReservation>> GetByProsumerAsync(string nic)
        {
            return await _reservations.Find(r => r.ProsumerNic == nic).ToListAsync();
        }

        // Retrieves a dashboard count summary for a prosumer[cite: 2].
        public async Task<object> GetDashboardCountsAsync(string nic)
        {
            var pending = await _reservations.CountDocumentsAsync(r => r.ProsumerNic == nic && r.Status == "Pending");
            var approved = await _reservations.CountDocumentsAsync(r => r.ProsumerNic == nic && r.Status == "Approved");
            
            return new { PendingCount = pending, ApprovedCount = approved };
        }

        // Validates that the action occurs at least 12 hours before the scheduled time
        private void EnforceTwelveHourRule(DateTime scheduledDate, string startTimeStr)
        {
            if (TimeSpan.TryParse(startTimeStr, out var startTime))
            {
                var scheduledDateTime = scheduledDate.Add(startTime);
                var hoursUntilBooking = (scheduledDateTime - DateTime.UtcNow).TotalHours;

                if (hoursUntilBooking < 12)
                {
                    throw new InvalidOperationException("Updates and cancellations require at least 12 hours' notice.");
                }
            }
        }

        // Approves a reservation and preps it for QR generation.
        public async Task ApproveReservationAsync(string id, string approvedByUserId)
        {
            var reservation = await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (reservation == null) throw new KeyNotFoundException("Reservation not found.");

            if (reservation.Status != "Pending")
            {
                throw new InvalidOperationException("Only Pending reservations can be approved.");
            }

            // Note: Coordinate with Randiv (Component 4) to inject his QR generation logic here,
            // or generate a placeholder string for now until his service is ready[cite: 1, 2].
            string generatedQrPayload = $"QR_PAYLOAD_{id}_{reservation.ProsumerNic}"; 

            var update = Builders<EnergyReservation>.Update
                .Set(r => r.Status, "Approved")
                .Set(r => r.ApprovedBy, approvedByUserId)
                .Set(r => r.ApprovedAt, DateTime.UtcNow)
                .Set(r => r.QrCodeData, generatedQrPayload)
                .Set(r => r.QrGeneratedAt, DateTime.UtcNow)
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            await _reservations.UpdateOneAsync(r => r.Id == id, update);
        }

        // Retrieves all reservations with a specific status (e.g., "Pending" for the Grid Operator queue)[cite: 2].
        public async Task<List<EnergyReservation>> GetReservationsByStatusAsync(string status)
        {
            return await _reservations.Find(r => r.Status == status).ToListAsync();
        }

        // Dynamic search filter for the web and mobile dashboards[cite: 2].
        public async Task<List<EnergyReservation>> SearchReservationsAsync(string? nodeId, string? date, string? status, string? nic)
        {
            var builder = Builders<EnergyReservation>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrEmpty(nodeId))
                filter &= builder.Eq(r => r.NodeId, nodeId);
            
            if (!string.IsNullOrEmpty(status))
                filter &= builder.Eq(r => r.Status, status);
            
            if (!string.IsNullOrEmpty(nic))
                filter &= builder.Eq(r => r.ProsumerNic, nic);

            if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out DateTime parsedDate))
            {
                // Match exact date ignoring time
                filter &= builder.Gte(r => r.ScheduledDate, parsedDate.Date) & 
                          builder.Lt(r => r.ScheduledDate, parsedDate.Date.AddDays(1));
            }

            return await _reservations.Find(filter).ToListAsync();
        }
    }
}