using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicroHelio.Models
{
    // Represents a Solar Microgrid Station/Node in the system.
    public class MicrogridNode
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("nodeCode")]
        public string NodeCode { get; set; } = string.Empty;

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("latitude")]
        public double Latitude { get; set; }

        [BsonElement("longitude")]
        public double Longitude { get; set; }

        [BsonElement("address")]
        public string Address { get; set; } = string.Empty;

        [BsonElement("capacityKWh")]
        public double CapacityKWh { get; set; }

        [BsonElement("totalBatterySlots")]
        public int TotalBatterySlots { get; set; }

        [BsonElement("availableBatterySlots")]
        public int AvailableBatterySlots { get; set; }

        [BsonElement("openTime")]
        public string OpenTime { get; set; } = "08:00";

        [BsonElement("closeTime")]
        public string CloseTime { get; set; } = "18:00";

        [BsonElement("operatingDays")]
        public string OperatingDays { get; set; } = "Mon,Tue,Wed,Thu,Fri,Sat,Sun";

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdBy")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? CreatedBy { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
