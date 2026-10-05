/* 
 * Author: Ashwin
 * Purpose: Service layer handling all business logic for energy reservations and node data enrichment
 */
using MicroHelio.Config;
using MicroHelio.Models;
using MicroHelio.DTOs;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using System.Globalization;

namespace MicroHelio.Services
{
    public class ReservationService
    {
        private readonly IMongoClient _mongoClient;
        private readonly IMongoCollection<EnergyReservation> _reservations;
        private readonly IMongoCollection<EnergyBookingSlot> _slots;
        private readonly IMongoCollection<MicrogridNode> _nodes; // Collection for microgrid node lookups

        // Initializes MongoDB client and collections for reservations, booking slots, and nodes.
        public ReservationService(IMongoClient mongoClient, IOptions<MicroHelioDatabaseSettings> settings)
        {
            _mongoClient = mongoClient;
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _reservations = database.GetCollection<EnergyReservation>(settings.Value.EnergyReservationsCollectionName);
            _slots = database.GetCollection<EnergyBookingSlot>(settings.Value.EnergyBookingSlotsCollectionName);
            _nodes = database.GetCollection<MicrogridNode>("MICROGRID_NODE");
        }

        // Creates a new reservation, enforcing capacity rules, slot availability, and the 7-day booking window.
        public async Task<EnergyReservation> CreateReservationAsync(CreateReservationDto dto)
        {
            ArgumentNullException.ThrowIfNull(dto);

            // Validate details and time windows
            ValidateReservationDetails(dto.ProsumerNic, dto.NodeId, dto.SlotId,
                dto.ReservationType, dto.ScheduledDate, dto.ScheduledStartTime,
                dto.ScheduledEndTime, dto.RequestedCapacityKWh);
            EnsureBookingWindow(dto.ScheduledDate, dto.ScheduledStartTime);
            await EnsureSlotIsAvailableAsync(dto.SlotId, dto.ScheduledDate,
                dto.ScheduledStartTime, dto.ScheduledEndTime, null, dto.ProsumerNic);

            // Build new reservation object
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

            try
            {
                using var session = await _mongoClient.StartSessionAsync();
                session.StartTransaction();
                try
                {
                    var slot = await GetMatchingSlotAsync(session, dto.SlotId, dto.NodeId,
                        dto.ScheduledDate, dto.ScheduledStartTime, dto.ScheduledEndTime);
                    await DeductCapacityAsync(session, slot, dto.RequestedCapacityKWh);
                    await _reservations.InsertOneAsync(session, newReservation);
                    await session.CommitTransactionAsync();
                }
                catch
                {
                    await session.AbortTransactionAsync();
                    throw;
                }
            }
            catch (Exception ex) when (ex is NotSupportedException || ex.Message.Contains("Standalone") || ex.Message.Contains("transaction"))
            {
                var slot = await GetMatchingSlotAsync(null, dto.SlotId, dto.NodeId,
                    dto.ScheduledDate, dto.ScheduledStartTime, dto.ScheduledEndTime);
                await DeductCapacityAsync(null, slot, dto.RequestedCapacityKWh);
                await _reservations.InsertOneAsync(newReservation);
            }

            // Attach readable node details before returning response
            await EnrichReservationWithNodeAsync(newReservation);
            return newReservation;
        }

        // Updates an existing reservation and adjusts slot capacities, enforcing the strict 12-hour notice rule.
        public async Task UpdateReservationAsync(string id, UpdateReservationDto dto)
        {
            var reservation = await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (reservation == null) throw new KeyNotFoundException("Reservation not found.");

            // Enforce editability status and 12-hour notice window
            EnsureEditableStatus(reservation.Status);
            EnforceTwelveHourRule(reservation.ScheduledDate, reservation.ScheduledStartTime);
            ValidateReservationDetails(reservation.ProsumerNic, reservation.NodeId, dto.SlotId,
                reservation.ReservationType, dto.ScheduledDate, dto.ScheduledStartTime,
                dto.ScheduledEndTime, reservation.RequestedCapacityKWh);
            EnsureBookingWindow(dto.ScheduledDate, dto.ScheduledStartTime);
            await EnsureSlotIsAvailableAsync(dto.SlotId, dto.ScheduledDate,
                dto.ScheduledStartTime, dto.ScheduledEndTime, id, reservation.ProsumerNic);
            
            var update = Builders<EnergyReservation>.Update
                .Set(r => r.SlotId, dto.SlotId)
                .Set(r => r.ScheduledDate, dto.ScheduledDate.Date)
                .Set(r => r.ScheduledStartTime, dto.ScheduledStartTime)
                .Set(r => r.ScheduledEndTime, dto.ScheduledEndTime)
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            try
            {
                using var session = await _mongoClient.StartSessionAsync();
                session.StartTransaction();
                try
                {
                    var newSlot = await GetMatchingSlotAsync(session, dto.SlotId, reservation.NodeId,
                        dto.ScheduledDate, dto.ScheduledStartTime, dto.ScheduledEndTime);

                    if (reservation.SlotId != dto.SlotId)
                    {
                        await DeductCapacityAsync(session, newSlot, reservation.RequestedCapacityKWh);

                        var restore = Builders<EnergyBookingSlot>.Update
                            .Inc(s => s.AvailableCapacityKWh, reservation.RequestedCapacityKWh)
                            .Inc(s => s.ReservedCapacityKWh, -reservation.RequestedCapacityKWh)
                            .Set(s => s.IsAvailable, true);
                        var restored = await _slots.UpdateOneAsync(session,
                            s => s.Id == reservation.SlotId && s.ReservedCapacityKWh >= reservation.RequestedCapacityKWh,
                            restore);
                        if (restored.ModifiedCount == 0)
                            throw new InvalidOperationException("The old slot capacity could not be restored.");
                    }

                    await _reservations.UpdateOneAsync(session, r => r.Id == id, update);
                    await session.CommitTransactionAsync();
                }
                catch
                {
                    await session.AbortTransactionAsync();
                    throw;
                }
            }
            catch (Exception ex) when (ex is NotSupportedException || ex.Message.Contains("Standalone") || ex.Message.Contains("transaction"))
            {
                var newSlot = await GetMatchingSlotAsync(null, dto.SlotId, reservation.NodeId,
                    dto.ScheduledDate, dto.ScheduledStartTime, dto.ScheduledEndTime);

                if (reservation.SlotId != dto.SlotId)
                {
                    await DeductCapacityAsync(null, newSlot, reservation.RequestedCapacityKWh);

                    var restore = Builders<EnergyBookingSlot>.Update
                        .Inc(s => s.AvailableCapacityKWh, reservation.RequestedCapacityKWh)
                        .Inc(s => s.ReservedCapacityKWh, -reservation.RequestedCapacityKWh)
                        .Set(s => s.IsAvailable, true);
                    var restored = await _slots.UpdateOneAsync(
                        s => s.Id == reservation.SlotId && s.ReservedCapacityKWh >= reservation.RequestedCapacityKWh,
                        restore);
                    if (restored.ModifiedCount == 0)
                        throw new InvalidOperationException("The old slot capacity could not be restored.");
                }

                await _reservations.UpdateOneAsync(r => r.Id == id, update);
            }
        }

        // Cancels a reservation, requires a reason, and restores capacity back to the booking slot.
        public async Task CancelReservationAsync(string id, string reason)
        {
            var reservation = await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (reservation == null) throw new KeyNotFoundException("Reservation not found.");

            EnsureEditableStatus(reservation.Status);
            if (string.IsNullOrWhiteSpace(reason))
                throw new InvalidOperationException("A cancellation reason is required.");

            EnforceTwelveHourRule(reservation.ScheduledDate, reservation.ScheduledStartTime);

            var update = Builders<EnergyReservation>.Update
                .Set(r => r.Status, "Cancelled")
                .Set(r => r.CancellationReason, reason)
                .Set(r => r.CancelledAt, DateTime.UtcNow)
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            try
            {
                using var session = await _mongoClient.StartSessionAsync();
                session.StartTransaction();
                try
                {
                    var cancelled = await _reservations.UpdateOneAsync(session,
                        r => r.Id == id && (r.Status == "Pending" || r.Status == "Approved"), update);
                    if (cancelled.ModifiedCount == 0)
                        throw new InvalidOperationException("The reservation is no longer active.");

                    var restore = Builders<EnergyBookingSlot>.Update
                        .Inc(s => s.AvailableCapacityKWh, reservation.RequestedCapacityKWh)
                        .Inc(s => s.ReservedCapacityKWh, -reservation.RequestedCapacityKWh)
                        .Set(s => s.IsAvailable, true);
                    var restored = await _slots.UpdateOneAsync(session,
                        s => s.Id == reservation.SlotId && s.ReservedCapacityKWh >= reservation.RequestedCapacityKWh,
                        restore);
                    if (restored.ModifiedCount == 0)
                        throw new KeyNotFoundException("The reservation slot no longer exists.");

                    await session.CommitTransactionAsync();
                }
                catch
                {
                    await session.AbortTransactionAsync();
                    throw;
                }
            }
            catch (Exception ex) when (ex is NotSupportedException || ex.Message.Contains("Standalone") || ex.Message.Contains("transaction"))
            {
                var cancelled = await _reservations.UpdateOneAsync(
                    r => r.Id == id && (r.Status == "Pending" || r.Status == "Approved"), update);
                if (cancelled.ModifiedCount == 0)
                    throw new InvalidOperationException("The reservation is no longer active.");

                var restore = Builders<EnergyBookingSlot>.Update
                    .Inc(s => s.AvailableCapacityKWh, reservation.RequestedCapacityKWh)
                    .Inc(s => s.ReservedCapacityKWh, -reservation.RequestedCapacityKWh)
                    .Set(s => s.IsAvailable, true);
                var restored = await _slots.UpdateOneAsync(
                    s => s.Id == reservation.SlotId && s.ReservedCapacityKWh >= reservation.RequestedCapacityKWh,
                    restore);
                if (restored.ModifiedCount == 0)
                    throw new KeyNotFoundException("The reservation slot no longer exists.");
            }
        }

        // Retrieves all reservations for a prosumer and enriches them with readable node names and codes.
        public async Task<List<EnergyReservation>> GetByProsumerAsync(string nic)
        {
            var reservations = await _reservations.Find(r => r.ProsumerNic == nic).ToListAsync();
            foreach (var res in reservations)
            {
                await EnrichReservationWithNodeAsync(res);
            }
            return reservations;
        }

        // Retrieves a single reservation by ID and attaches readable node details.
        public async Task<EnergyReservation?> GetByIdAsync(string id)
        {
            var reservation = await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (reservation != null)
            {
                await EnrichReservationWithNodeAsync(reservation);
            }
            return reservation;
        }

        // Looks up the MICROGRID_NODE collection to inject NodeCode and Name into the reservation.
        private async Task EnrichReservationWithNodeAsync(EnergyReservation reservation)
        {
            if (!string.IsNullOrEmpty(reservation.NodeId))
            {
                var node = await _nodes.Find(n => n.Id == reservation.NodeId).FirstOrDefaultAsync();
                if (node != null)
                {
                    reservation.NodeCode = node.NodeCode;
                    reservation.NodeName = node.Name;
                }
            }
        }

        // Calculates pending and approved reservation counts for prosumer dashboard metrics.
        public async Task<object> GetDashboardCountsAsync(string nic)
        {
            var pending = await _reservations.CountDocumentsAsync(r => r.ProsumerNic == nic && r.Status == "Pending");
            var approved = await _reservations.CountDocumentsAsync(r => r.ProsumerNic == nic && r.Status == "Approved");
            
            return new { PendingCount = pending, ApprovedCount = approved };
        }

        // Validates that modifications occur at least 12 hours before scheduled booking time.
        private void EnforceTwelveHourRule(DateTime scheduledDate, string startTimeStr)
        {
            if (!TimeSpan.TryParseExact(startTimeStr, "hh\\:mm", CultureInfo.InvariantCulture, out var startTime))
                throw new InvalidOperationException("Start time must use HH:mm format.");

            var scheduledDateTime = scheduledDate.Date.Add(startTime);
            var hoursUntilBooking = (scheduledDateTime - DateTime.UtcNow).TotalHours;

            if (hoursUntilBooking < 12)
                throw new InvalidOperationException("Updates and cancellations require at least 12 hours' notice.");
        }

        // Validates input parameters for format, validity, and capacity constraints.
        private static void ValidateReservationDetails(
            string prosumerNic, string nodeId, string slotId, string reservationType,
            DateTime scheduledDate, string startTimeText, string endTimeText, double capacity)
        {
            if (string.IsNullOrWhiteSpace(prosumerNic) || string.IsNullOrWhiteSpace(reservationType))
                throw new InvalidOperationException("Prosumer NIC and reservation type are required.");

            if (!ObjectId.TryParse(nodeId, out _) || !ObjectId.TryParse(slotId, out _))
                throw new InvalidOperationException("Node ID and slot ID must be valid IDs.");

            if (scheduledDate == default)
                throw new InvalidOperationException("Scheduled date is required.");

            if (capacity <= 0 || double.IsNaN(capacity) || double.IsInfinity(capacity))
                throw new InvalidOperationException("Requested capacity must be greater than zero.");

            if (!TimeSpan.TryParseExact(startTimeText, "hh\\:mm", CultureInfo.InvariantCulture, out var startTime) ||
                !TimeSpan.TryParseExact(endTimeText, "hh\\:mm", CultureInfo.InvariantCulture, out var endTime))
                throw new InvalidOperationException("Start and end times must use HH:mm format.");

            if (endTime <= startTime)
                throw new InvalidOperationException("End time must be after start time.");
        }

        // Ensures bookings are scheduled within the allowable 7-day future window.
        private static void EnsureBookingWindow(DateTime scheduledDate, string startTimeText)
        {
            TimeSpan.TryParseExact(startTimeText, "hh\\:mm", CultureInfo.InvariantCulture, out var startTime);
            var scheduledDateTime = scheduledDate.Date.Add(startTime);
            var hoursUntilBooking = (scheduledDateTime - DateTime.UtcNow).TotalHours;

            if (hoursUntilBooking < 0 || hoursUntilBooking > 7 * 24)
                throw new InvalidOperationException("Reservations must be scheduled within the next 7 days.");
        }

        // Queries and verifies that the requested time slot matches database records within the session.
        private async Task<EnergyBookingSlot> GetMatchingSlotAsync(
            IClientSessionHandle? session, string slotId, string nodeId,
            DateTime scheduledDate, string startTimeText, string endTimeText)
        {
            var find = session != null ? _slots.Find(session, s => s.Id == slotId) : _slots.Find(s => s.Id == slotId);
            var slot = await find.FirstOrDefaultAsync();
            if (slot == null)
                throw new KeyNotFoundException("The requested time slot does not exist.");

            if (slot.NodeId != nodeId || slot.SlotDate.Date != scheduledDate.Date ||
                slot.SlotStartTime != startTimeText || slot.SlotEndTime != endTimeText)
                throw new InvalidOperationException("The selected slot does not match the requested booking.");

            return slot;
        }

        // Safely deducts capacity from the target slot while preventing race conditions.
        private async Task DeductCapacityAsync(
            IClientSessionHandle? session, EnergyBookingSlot slot, double requestedCapacity)
        {
            var update = Builders<EnergyBookingSlot>.Update
                .Inc(s => s.AvailableCapacityKWh, -requestedCapacity)
                .Inc(s => s.ReservedCapacityKWh, requestedCapacity)
                .Set(s => s.IsAvailable, false);
            var result = session != null
                ? await _slots.UpdateOneAsync(session, s => s.Id == slot.Id && s.AvailableCapacityKWh >= requestedCapacity, update)
                : await _slots.UpdateOneAsync(s => s.Id == slot.Id && s.AvailableCapacityKWh >= requestedCapacity, update);
            if (result.ModifiedCount == 0)
                throw new InvalidOperationException("The slot does not have enough available capacity.");
        }

        // Prevents prosumers from booking overlapping time slots.
        private async Task EnsureSlotIsAvailableAsync(
            string slotId, DateTime scheduledDate, string startTimeText,
            string endTimeText, string? reservationId = null, string? prosumerNic = null)
        {
            TimeSpan.TryParseExact(startTimeText, "hh\\:mm", CultureInfo.InvariantCulture, out var startTime);
            TimeSpan.TryParseExact(endTimeText, "hh\\:mm", CultureInfo.InvariantCulture, out var endTime);
            var requestedStart = scheduledDate.Date.Add(startTime);
            var requestedEnd = scheduledDate.Date.Add(endTime);

            var activeReservations = await _reservations.Find(r =>
                r.SlotId == slotId &&
                r.ScheduledDate == scheduledDate.Date &&
                r.Status != "Cancelled" &&
                r.Status != "Completed" &&
                r.Id != reservationId &&
                (string.IsNullOrEmpty(prosumerNic) || r.ProsumerNic == prosumerNic)).ToListAsync();

            var overlaps = activeReservations.Any(reservation =>
                TimeSpan.TryParseExact(reservation.ScheduledStartTime, "hh\\:mm", CultureInfo.InvariantCulture, out var existingStart) &&
                TimeSpan.TryParseExact(reservation.ScheduledEndTime, "hh\\:mm", CultureInfo.InvariantCulture, out var existingEnd) &&
                requestedStart < scheduledDate.Date.Add(existingEnd) &&
                scheduledDate.Date.Add(existingStart) < requestedEnd);

            if (overlaps)
                throw new InvalidOperationException("You already have an active reservation for this time slot.");
        }

        // Restricts updates and cancellations strictly to Pending or Approved bookings.
        private static void EnsureEditableStatus(string status)
        {
            if (status is not ("Pending" or "Approved"))
                throw new InvalidOperationException("Only Pending or Approved reservations can be changed.");
        }

        // Approves a pending reservation and generates the QR code payload.
        public async Task ApproveReservationAsync(string id, string approvedByUserId)
        {
            var reservation = await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (reservation == null) throw new KeyNotFoundException("Reservation not found.");

            if (string.IsNullOrWhiteSpace(approvedByUserId))
                throw new InvalidOperationException("An operator ID is required.");

            if (reservation.Status != "Pending")
            {
                throw new InvalidOperationException("Only Pending reservations can be approved.");
            }

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

        // Retrieves all reservations filtered by status with attached node details.
        public async Task<List<EnergyReservation>> GetReservationsByStatusAsync(string status)
        {
            var reservations = await _reservations.Find(r => r.Status == status).ToListAsync();
            foreach (var res in reservations)
            {
                await EnrichReservationWithNodeAsync(res);
            }
            return reservations;
        }

        // Performs dynamic multi-parameter search filtering for dashboards with node name enrichment.
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
                filter &= builder.Gte(r => r.ScheduledDate, parsedDate.Date) & 
                          builder.Lt(r => r.ScheduledDate, parsedDate.Date.AddDays(1));
            }

            var results = await _reservations.Find(filter).ToListAsync();
            foreach (var res in results)
            {
                await EnrichReservationWithNodeAsync(res);
            }
            return results;
        }
    }
}