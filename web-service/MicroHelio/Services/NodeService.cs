using MicroHelio.Config;
using MicroHelio.DTOs;
using MicroHelio.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace MicroHelio.Services
{
    // Node Service implementing node management and deactivation guard
    public class NodeService : INodeService
    {
        private readonly IMongoCollection<MicrogridNode> _nodesCollection;
        private readonly IMongoCollection<EnergyReservation> _reservationsCollection;

        // Constructor initializing Mongo collections using IOptions settings
        public NodeService(IOptions<MicroHelioDatabaseSettings> settings)
        {
            var mongoClient = new MongoClient(settings.Value.ConnectionString);
            var mongoDatabase = mongoClient.GetDatabase(settings.Value.DatabaseName);

            _nodesCollection = mongoDatabase.GetCollection<MicrogridNode>(settings.Value.MicrogridNodesCollectionName);
            _reservationsCollection = mongoDatabase.GetCollection<EnergyReservation>(settings.Value.EnergyReservationsCollectionName);
        }

        // Helper method to dynamically recalculate available battery slots based on active reservations
        private async Task EnrichNodeBatterySlotsAsync(MicrogridNode node)
        {
            if (node == null || string.IsNullOrEmpty(node.Id)) return;
            try
            {
                var activeFilter = Builders<EnergyReservation>.Filter.And(
                    Builders<EnergyReservation>.Filter.Eq(r => r.NodeId, node.Id),
                    Builders<EnergyReservation>.Filter.In(r => r.Status, new[] { "Pending", "Approved" })
                );
                var activeCount = (int)await _reservationsCollection.CountDocumentsAsync(activeFilter);
                node.AvailableBatterySlots = Math.Max(0, node.TotalBatterySlots - activeCount);
            }
            catch
            {
                // Preserve default AvailableBatterySlots if count query fails
            }
        }

        // Get all microgrid nodes
        public async Task<IEnumerable<MicrogridNode>> GetAllNodesAsync()
        {
            var nodes = await _nodesCollection.Find(_ => true).ToListAsync();
            foreach (var node in nodes)
            {
                await EnrichNodeBatterySlotsAsync(node);
            }
            return nodes;
        }

        // Get node by unique ID
        public async Task<MicrogridNode?> GetNodeByIdAsync(string id)
        {
            var node = await _nodesCollection.Find(n => n.Id == id).FirstOrDefaultAsync();
            if (node != null)
            {
                await EnrichNodeBatterySlotsAsync(node);
            }
            return node;
        }

        // Get node by unique node code
        public async Task<MicrogridNode?> GetNodeByCodeAsync(string nodeCode)
        {
            var node = await _nodesCollection.Find(n => n.NodeCode == nodeCode).FirstOrDefaultAsync();
            if (node != null)
            {
                await EnrichNodeBatterySlotsAsync(node);
            }
            return node;
        }

        // Create new microgrid node
        public async Task<MicrogridNode> CreateNodeAsync(CreateNodeDto dto)
        {
            var existingNode = await GetNodeByCodeAsync(dto.NodeCode);
            if (existingNode != null)
            {
                throw new InvalidOperationException($"Node with code '{dto.NodeCode}' already exists.");
            }

            var node = new MicrogridNode
            {
                NodeCode = dto.NodeCode,
                Name = dto.Name,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Address = dto.Address,
                CapacityKWh = dto.CapacityKWh,
                TotalBatterySlots = dto.TotalBatterySlots,
                AvailableBatterySlots = dto.AvailableBatterySlots > 0 ? dto.AvailableBatterySlots : dto.TotalBatterySlots,
                OpenTime = dto.OpenTime,
                CloseTime = dto.CloseTime,
                OperatingDays = dto.OperatingDays,
                IsActive = true,
                CreatedBy = dto.CreatedBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _nodesCollection.InsertOneAsync(node);
            return node;
        }

        // Update existing node details
        public async Task<MicrogridNode?> UpdateNodeAsync(string id, UpdateNodeDto dto)
        {
            var node = await GetNodeByIdAsync(id);
            if (node == null) return null;

            if (!string.IsNullOrEmpty(dto.Name)) node.Name = dto.Name;
            if (dto.Latitude.HasValue) node.Latitude = dto.Latitude.Value;
            if (dto.Longitude.HasValue) node.Longitude = dto.Longitude.Value;
            if (!string.IsNullOrEmpty(dto.Address)) node.Address = dto.Address;
            if (dto.CapacityKWh.HasValue) node.CapacityKWh = dto.CapacityKWh.Value;
            if (dto.TotalBatterySlots.HasValue) node.TotalBatterySlots = dto.TotalBatterySlots.Value;
            if (dto.AvailableBatterySlots.HasValue) node.AvailableBatterySlots = dto.AvailableBatterySlots.Value;
            if (!string.IsNullOrEmpty(dto.OpenTime)) node.OpenTime = dto.OpenTime;
            if (!string.IsNullOrEmpty(dto.CloseTime)) node.CloseTime = dto.CloseTime;
            if (!string.IsNullOrEmpty(dto.OperatingDays)) node.OperatingDays = dto.OperatingDays;
            if (dto.IsActive.HasValue) node.IsActive = dto.IsActive.Value;

            node.UpdatedAt = DateTime.UtcNow;

            await _nodesCollection.ReplaceOneAsync(n => n.Id == id, node);
            return node;
        }

        // Deactivate node after verifying no active (Pending or Approved) reservations exist
        public async Task<(bool Success, string Message)> DeactivateNodeAsync(string id)
        {
            var node = await GetNodeByIdAsync(id);
            if (node == null)
            {
                return (false, "Microgrid node not found.");
            }

            // Cross-query reservations collection for active bookings
            var activeFilter = Builders<EnergyReservation>.Filter.And(
                Builders<EnergyReservation>.Filter.Eq(r => r.NodeId, id),
                Builders<EnergyReservation>.Filter.In(r => r.Status, new[] { "Pending", "Approved" })
            );

            var activeReservationCount = await _reservationsCollection.CountDocumentsAsync(activeFilter);

            if (activeReservationCount > 0)
            {
                return (false, $"Cannot deactivate node '{node.Name}' because it has {activeReservationCount} active reservation(s) (Pending/Approved).");
            }

            node.IsActive = false;
            node.UpdatedAt = DateTime.UtcNow;
            await _nodesCollection.ReplaceOneAsync(n => n.Id == id, node);

            return (true, $"Node '{node.Name}' has been successfully deactivated.");
        }

        // Permanently delete node
        public async Task<bool> DeleteNodeAsync(string id)
        {
            var result = await _nodesCollection.DeleteOneAsync(n => n.Id == id);
            return result.DeletedCount > 0;
        }

        // Update available battery slots on-site
        public async Task<bool> UpdateBatterySlotsAsync(string id, int availableSlots)
        {
            var node = await GetNodeByIdAsync(id);
            if (node == null) return false;

            node.AvailableBatterySlots = availableSlots;
            node.UpdatedAt = DateTime.UtcNow;

            await _nodesCollection.ReplaceOneAsync(n => n.Id == id, node);
            return true;
        }
    }
}
