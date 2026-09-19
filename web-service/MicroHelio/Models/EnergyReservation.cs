/* 
 * Author: Randiv (Ashwin change this when you updating, into your name)
 * Purpose: Represents the ENERGY_RESERVATION collection in MongoDB.
 */
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicroHelio.Models
{
    public class EnergyReservation
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("reservationCode")]
        public string ReservationCode { get; set; } = null!;

        // Prosumer NIC is the natural key stored as a string FK
        [BsonElement("prosumerNic")]
        public string ProsumerNic { get; set; } = null!;

        [BsonRepresentation(BsonType.ObjectId)]
        [BsonElement("nodeId")]
        public string NodeId { get; set; } = null!;

        [BsonRepresentation(BsonType.ObjectId)]
        [BsonElement("slotId")]
        public string SlotId { get; set; } = null!;

        [BsonElement("reservationType")]
        public string ReservationType { get; set; } = null!;

        [BsonElement("scheduledDate")]
        public DateTime ScheduledDate { get; set; }

        [BsonElement("scheduledStartTime")]
        public string ScheduledStartTime { get; set; } = null!;

        [BsonElement("scheduledEndTime")]
        public string ScheduledEndTime { get; set; } = null!;

        [BsonElement("requestedCapacityKWh")]
        public double RequestedCapacityKWh { get; set; }

        // "Pending" | "Approved" | "Cancelled" | "Completed"
        [BsonElement("status")]
        public string Status { get; set; } = null!;

        [BsonRepresentation(BsonType.ObjectId)]
        [BsonElement("approvedBy")]
        public string? ApprovedBy { get; set; }

        [BsonElement("approvedAt")]
        public DateTime? ApprovedAt { get; set; }

        [BsonElement("cancellationReason")]
        public string? CancellationReason { get; set; }

        [BsonElement("cancelledAt")]
        public DateTime? CancelledAt { get; set; }

        // Populated only after status becomes "Approved" for Component 4
        [BsonElement("qrCodeData")]
        public string? QrCodeData { get; set; }

        [BsonElement("qrGeneratedAt")]
        public DateTime? QrGeneratedAt { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }
}
