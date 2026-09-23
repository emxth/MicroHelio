using MicroHelio.Config;
using MicroHelio.DTOs;
using MicroHelio.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace MicroHelio.Services
{
    // Slot Service implementing energy slot operations
    public class SlotService : ISlotService
    {
        private readonly IMongoCollection<EnergyBookingSlot> _slotsCollection;
        private readonly IMongoCollection<MicrogridNode> _nodesCollection;

        // Constructor initializing Mongo collections using IOptions settings
        public SlotService(IOptions<MicroHelioDatabaseSettings> settings)
        {
            var mongoClient = new MongoClient(settings.Value.ConnectionString);
            var mongoDatabase = mongoClient.GetDatabase(settings.Value.DatabaseName);

            _slotsCollection = mongoDatabase.GetCollection<EnergyBookingSlot>(settings.Value.EnergyBookingSlotsCollectionName);
            _nodesCollection = mongoDatabase.GetCollection<MicrogridNode>(settings.Value.MicrogridNodesCollectionName);
        }

        // Get slots by target node ID
        public async Task<IEnumerable<EnergyBookingSlot>> GetSlotsByNodeAsync(string nodeId)
        {
            return await _slotsCollection.Find(s => s.NodeId == nodeId).ToListAsync();
        }

        // Get slots by target node ID and date
        public async Task<IEnumerable<EnergyBookingSlot>> GetSlotsByNodeAndDateAsync(string nodeId, DateTime date)
        {
            var startOfDay = date.Date;
            var endOfDay = date.Date.AddDays(1).AddTicks(-1);

            return await _slotsCollection
                .Find(s => s.NodeId == nodeId && s.SlotDate >= startOfDay && s.SlotDate <= endOfDay)
                .ToListAsync();
        }

        // Get slot by primary key ID
        public async Task<EnergyBookingSlot?> GetSlotByIdAsync(string id)
        {
            return await _slotsCollection.Find(s => s.Id == id).FirstOrDefaultAsync();
        }

        // Create single energy slot
        public async Task<EnergyBookingSlot> CreateSlotAsync(CreateSlotDto dto)
        {
            var slot = new EnergyBookingSlot
            {
                NodeId = dto.NodeId,
                SlotDate = dto.SlotDate.Date,
                SlotStartTime = dto.SlotStartTime,
                SlotEndTime = dto.SlotEndTime,
                TotalCapacityKWh = dto.TotalCapacityKWh,
                ReservedCapacityKWh = 0,
                AvailableCapacityKWh = dto.TotalCapacityKWh,
                SlotType = dto.SlotType,
                IsAvailable = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _slotsCollection.InsertOneAsync(slot);
            return slot;
        }

        // Update slot capacity or status
        public async Task<EnergyBookingSlot?> UpdateSlotAsync(string id, UpdateSlotDto dto)
        {
            var slot = await GetSlotByIdAsync(id);
            if (slot == null) return null;

            if (dto.TotalCapacityKWh.HasValue)
            {
                slot.TotalCapacityKWh = dto.TotalCapacityKWh.Value;
                slot.AvailableCapacityKWh = Math.Max(0, slot.TotalCapacityKWh - slot.ReservedCapacityKWh);
            }

            if (dto.ReservedCapacityKWh.HasValue)
            {
                slot.ReservedCapacityKWh = dto.ReservedCapacityKWh.Value;
                slot.AvailableCapacityKWh = Math.Max(0, slot.TotalCapacityKWh - slot.ReservedCapacityKWh);
            }

            if (dto.AvailableCapacityKWh.HasValue)
            {
                slot.AvailableCapacityKWh = dto.AvailableCapacityKWh.Value;
            }

            if (dto.IsAvailable.HasValue)
            {
                slot.IsAvailable = dto.IsAvailable.Value;
            }

            if (!string.IsNullOrEmpty(dto.SlotType))
            {
                slot.SlotType = dto.SlotType;
            }

            slot.UpdatedAt = DateTime.UtcNow;

            await _slotsCollection.ReplaceOneAsync(s => s.Id == id, slot);
            return slot;
        }

        // Delete slot document
        public async Task<bool> DeleteSlotAsync(string id)
        {
            var result = await _slotsCollection.DeleteOneAsync(s => s.Id == id);
            return result.DeletedCount > 0;
        }

        // Batch generate daily slots for node schedule
        public async Task<IEnumerable<EnergyBookingSlot>> BatchGenerateSlotsAsync(string nodeId, DateTime date, double capacityKWh, int durationHours)
        {
            var node = await _nodesCollection.Find(n => n.Id == nodeId).FirstOrDefaultAsync();
            if (node == null) throw new InvalidOperationException("Node not found.");

            var createdSlots = new List<EnergyBookingSlot>();
            int startHour = 8;
            int closeHour = 18;

            if (TimeSpan.TryParse(node.OpenTime, out var openTs)) startHour = openTs.Hours;
            if (TimeSpan.TryParse(node.CloseTime, out var closeTs)) closeHour = closeTs.Hours;

            for (int hour = startHour; hour + durationHours <= closeHour; hour += durationHours)
            {
                var startTimeStr = $"{hour:D2}:00";
                var endTimeStr = $"{hour + durationHours:D2}:00";

                var slot = new EnergyBookingSlot
                {
                    NodeId = nodeId,
                    SlotDate = date.Date,
                    SlotStartTime = startTimeStr,
                    SlotEndTime = endTimeStr,
                    TotalCapacityKWh = capacityKWh > 0 ? capacityKWh : node.CapacityKWh,
                    ReservedCapacityKWh = 0,
                    AvailableCapacityKWh = capacityKWh > 0 ? capacityKWh : node.CapacityKWh,
                    SlotType = "DropOff",
                    IsAvailable = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _slotsCollection.InsertOneAsync(slot);
                createdSlots.Add(slot);
            }

            return createdSlots;
        }
    }
}
