using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace MicroHelio.Helpers
{
    /// <summary>
    /// Custom BSON serializer that can deserialize both BsonType.ObjectId and BsonType.String (or int/null)
    /// into a C# string, preventing deserialization errors when documents have mixed ID representations.
    /// </summary>
    public class BsonStringOrObjectIdSerializer : SerializerBase<string?>
    {
        public override string? Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
        {
            var bsonType = context.Reader.GetCurrentBsonType();
            switch (bsonType)
            {
                case BsonType.Null:
                    context.Reader.ReadNull();
                    return null;
                case BsonType.ObjectId:
                    return context.Reader.ReadObjectId().ToString();
                case BsonType.String:
                    return context.Reader.ReadString();
                case BsonType.Int32:
                    return context.Reader.ReadInt32().ToString();
                case BsonType.Int64:
                    return context.Reader.ReadInt64().ToString();
                default:
                    context.Reader.SkipValue();
                    return null;
            }
        }

        public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, string? value)
        {
            if (value == null)
            {
                context.Writer.WriteNull();
            }
            else
            {
                context.Writer.WriteString(value);
            }
        }
    }
}
