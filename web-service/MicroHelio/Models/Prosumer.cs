/*
 * Purpose: Defines a prosumer account and its activation lifecycle data stored in MongoDB.
 */
using MicroHelio.Helpers;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicroHelio.Models
{
    [BsonIgnoreExtraElements]
    public class Prosumer
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("nic")]
        public string Nic { get; set; } = null!;

        [BsonElement("fullName")]
        public string FullName { get; set; } = null!;

        [BsonElement("email")]
        public string Email { get; set; } = null!;

        [BsonElement("phone")]
        public string Phone { get; set; } = null!;

        [BsonElement("address")]
        public string Address { get; set; } = null!;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = null!;

        [BsonElement("activationStatus")]
        public string ActivationStatus { get; set; } = "Pending";

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = false;

        [BsonElement("reactivatedBy")]
        [BsonSerializer(typeof(BsonStringOrObjectIdSerializer))]
        public string? ReactivatedBy { get; set; }

        [BsonElement("deactivationRequestedAt")]
        public DateTime? DeactivationRequestedAt { get; set; }

        [BsonElement("reactivatedAt")]
        public DateTime? ReactivatedAt { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}