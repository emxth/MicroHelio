/* 
 * Purpose: Business logic service implementing Energy Booking Slot CRUD operations and batch slot schedule generation.
 */
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
            var node = await _nodesCollection.Find(n => n.Id == dto.NodeId).FirstOrDefaultAsync();
            if (node != null && !node.IsActive)
            {
                throw new InvalidOperationException("Cannot create energy slots for an inactive microgrid node.");
            }

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
        public async Task<IEnumerable<EnergyBookingSlot>> BatchGenerateSlotsAsync(string nodeId, DateTime date, string startTime, string endTime, double capacityKWh, string slotType = "DropOff")
        {
            var node = await _nodesCollection.Find(n => n.Id == nodeId).FirstOrDefaultAsync();
            if (node == null) throw new InvalidOperationException("Node not found.");
            if (!node.IsActive) throw new InvalidOperationException("Cannot generate energy slots for an inactive microgrid node.");

            if (!TimeSpan.TryParse(startTime, out var startTs))
            {
                throw new ArgumentException("Invalid start time format. Expected format: HH:mm");
            }

            if (!TimeSpan.TryParse(endTime, out var endTs))
            {
                throw new ArgumentException("Invalid end time format. Expected format: HH:mm");
            }

            if (startTs >= endTs)
            {
                throw new ArgumentException("Start time must be strictly before end time.");
            }

            var slot = new EnergyBookingSlot
            {
                NodeId = nodeId,
                SlotDate = date.Date,
                SlotStartTime = startTime,
                SlotEndTime = endTime,
                TotalCapacityKWh = capacityKWh > 0 ? capacityKWh : node.CapacityKWh,
                ReservedCapacityKWh = 0,
                AvailableCapacityKWh = capacityKWh > 0 ? capacityKWh : node.CapacityKWh,
                SlotType = !string.IsNullOrWhiteSpace(slotType) ? slotType : "DropOff",
                IsAvailable = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _slotsCollection.InsertOneAsync(slot);
            return new List<EnergyBookingSlot> { slot };
        }
    }
}
