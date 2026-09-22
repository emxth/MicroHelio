/*
 * Author: Ashwin
 * Purpose: C# model representing microgrid node documents stored in MongoDB Atlas.
 */
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicroHelio.Models
{
    public class MicrogridNode
    {
        // Primary unique identifier mapped to MongoDB ObjectId
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        // Unique microgrid node code (e.g., MGN-001)
        [BsonElement("nodeCode")]
        public string NodeCode { get; set; } = string.Empty;

        // Human-readable name of the microgrid location
        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        // Geographical latitude coordinate
        [BsonElement("latitude")]
        public double Latitude { get; set; }

        // Geographical longitude coordinate
        [BsonElement("longitude")]
        public double Longitude { get; set; }

        // Physical address of the microgrid facility
        [BsonElement("address")]
        public string Address { get; set; } = string.Empty;

        // Total energy capacity in kilowatt-hours (kWh)
        [BsonElement("capacityKWh")]
        public double CapacityKWh { get; set; }

        // Total number of battery transaction slots available
        [BsonElement("totalBatterySlots")]
        public int TotalBatterySlots { get; set; }

        // Current available battery slots count
        [BsonElement("availableBatterySlots")]
        public int AvailableBatterySlots { get; set; }

        // Facility daily opening time (e.g., "08:00")
        [BsonElement("openTime")]
        public string OpenTime { get; set; } = string.Empty;

        // Facility daily closing time (e.g., "20:00")
        [BsonElement("closeTime")]
        public string CloseTime { get; set; } = string.Empty;

        // Operating days string (e.g., "Mon,Tue,Wed,Thu,Fri,Sat,Sun")
        [BsonElement("operatingDays")]
        public string OperatingDays { get; set; } = string.Empty;

        // Flag indicating whether the node is active and operational
        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        // Foreign key referencing the user/operator who created this node
        [BsonElement("createdBy")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string CreatedBy { get; set; } = string.Empty;

        // Timestamp when the node was first registered
        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Timestamp when the node record was last modified
        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}