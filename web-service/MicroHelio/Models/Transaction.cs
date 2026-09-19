/* 
 * Author: Randiv
 * Purpose: Represents the TRANSACTION collection in MongoDB.
 */
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MicroHelio.Models
{
    public class Transaction
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("transactionCode")]
        public string TransactionCode { get; set; } = null!;

        [BsonRepresentation(BsonType.ObjectId)]
        [BsonElement("reservationId")]
        public string ReservationId { get; set; } = null!;

        // FK to Prosumer - schema specifies this as a string, not ObjectId
        [BsonElement("prosumerNic")]
        public string ProsumerNic { get; set; } = null!;

        [BsonRepresentation(BsonType.ObjectId)]
        [BsonElement("nodeId")]
        public string NodeId { get; set; } = null!;

        [BsonRepresentation(BsonType.ObjectId)]
        [BsonElement("operatorId")]
        public string OperatorId { get; set; } = null!;

        [BsonElement("energyTransferredKWh")]
        public double EnergyTransferredKWh { get; set; }

        // "Initiated", "Completed"
        [BsonElement("transactionStatus")]
        public string TransactionStatus { get; set; } = null!;

        [BsonElement("scannedQrCode")]
        public string? ScannedQrCode { get; set; }

        [BsonElement("serverVerified")]
        public bool ServerVerified { get; set; }

        [BsonElement("verifiedAt")]
        public DateTime? VerifiedAt { get; set; }

        [BsonElement("completedAt")]
        public DateTime? CompletedAt { get; set; }

        [BsonElement("notes")]
        public string? Notes { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }
    }
}
