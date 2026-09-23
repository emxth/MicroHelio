using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicroHelio.Models
{
    public class EnergyBookingSlot
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        [BsonElement("nodeId")]
        public string NodeId { get; set; } = null!;

        [BsonElement("slotDate")]
        public DateTime SlotDate { get; set; }

        [BsonElement("slotStartTime")]
        public string SlotStartTime { get; set; } = null!;

        [BsonElement("slotEndTime")]
        public string SlotEndTime { get; set; } = null!;

        [BsonElement("totalCapacityKWh")]
        public double TotalCapacityKWh { get; set; }

        [BsonElement("reservedCapacityKWh")]
        public double ReservedCapacityKWh { get; set; }

        [BsonElement("availableCapacityKWh")]
        public double AvailableCapacityKWh { get; set; }

        [BsonElement("slotType")]
        public string SlotType { get; set; } = null!;

        [BsonElement("isAvailable")]
        public bool IsAvailable { get; set; }
    }
}