/* 
 * Purpose: Represents an Energy Booking Slot entity in MongoDB associated with a Microgrid Node.
 */
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicroHelio.Models
{
    // Represents an Energy Booking Slot associated with a Microgrid Node.
    [BsonIgnoreExtraElements]
    public class EnergyBookingSlot
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("nodeId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string NodeId { get; set; } = string.Empty;

        [BsonElement("slotDate")]
        public DateTime SlotDate { get; set; }

        [BsonElement("slotStartTime")]
        public string SlotStartTime { get; set; } = string.Empty;

        [BsonElement("slotEndTime")]
        public string SlotEndTime { get; set; } = string.Empty;

        [BsonElement("totalCapacityKWh")]
        public double TotalCapacityKWh { get; set; }

        [BsonElement("reservedCapacityKWh")]
        public double ReservedCapacityKWh { get; set; } = 0;

        [BsonElement("availableCapacityKWh")]
        public double AvailableCapacityKWh { get; set; }

        [BsonElement("slotType")]
        public string SlotType { get; set; } = "DropOff"; // "DropOff" or "Charging"

        [BsonElement("isAvailable")]
        public bool IsAvailable { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
