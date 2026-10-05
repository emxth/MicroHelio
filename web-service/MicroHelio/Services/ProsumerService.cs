/*
 * Purpose: Manages prosumer persistence, registration, profile updates, and activation state.
 */
using MicroHelio.Config;
using MicroHelio.DTOs;
using MicroHelio.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace MicroHelio.Services
{
    public class ProsumerService
    {
        private static readonly string[] ValidStatuses =
        {
            "Pending",
            "Active",
            "Deactivated"
        };

        private readonly IMongoCollection<Prosumer> _prosumers;

        // Opens the configured MongoDB collection used for prosumer accounts.
        public ProsumerService(
            IMongoClient mongoClient,
            IOptions<MicroHelioDatabaseSettings> settings)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _prosumers = database.GetCollection<Prosumer>(settings.Value.ProsumersCollectionName);
        }

        // Returns all prosumers ordered by NIC.
        public async Task<List<ProsumerResponseDto>> GetAllAsync()
        {
            var prosumers = await _prosumers.Find(Builders<Prosumer>.Filter.Empty)
                .SortBy(prosumer => prosumer.Nic)
                .ToListAsync();

            return prosumers.Select(MapToResponse).ToList();
        }

        // Finds a prosumer by NIC and maps the stored entity to its response DTO.
        public async Task<ProsumerResponseDto?> GetByNicAsync(string nic)
        {
            var prosumer = await FindByNicAsync(nic);
            return prosumer == null ? null : MapToResponse(prosumer);
        }

        // Returns the stored prosumer entity for authentication checks.
        internal async Task<Prosumer?> GetEntityByNicAsync(string nic)
        {
            return await FindByNicAsync(nic);
        }

        // Finds a prosumer by a normalized email address for authentication.
        internal async Task<Prosumer?> GetByEmailForAuthAsync(string email)
        {
            if (!TryNormalizeEmail(email, out var normalizedEmail))
            {
                return null;
            }

            var filter = Builders<Prosumer>.Filter.Eq(
                prosumer => prosumer.Email,
                normalizedEmail);

            return await _prosumers.Find(filter).FirstOrDefaultAsync();
        }

        // Returns prosumers matching a validated activation status.
        public async Task<List<ProsumerResponseDto>> GetByStatusAsync(string status)
        {
            ValidateStatus(status);

            var filter = Builders<Prosumer>.Filter.Eq(
                prosumer => prosumer.ActivationStatus,
                status);
            var prosumers = await _prosumers.Find(filter)
                .SortBy(prosumer => prosumer.Nic)
                .ToListAsync();

            return prosumers.Select(MapToResponse).ToList();
        }

        // Validates, hashes, and stores a new prosumer account in Pending state.
        public async Task<ProsumerResponseDto> RegisterAsync(CreateProsumerDto dto)
        {
            if (!TryNormalizeNic(dto.Nic, out var nic) ||
                !TryNormalizeEmail(dto.Email, out var email))
            {
                throw new ArgumentException("NIC and email are required.");
            }

            if (await NicExistsAsync(nic))
            {
                throw new InvalidOperationException("NIC is already registered.");
            }

            if (await EmailExistsAsync(email))
            {
                throw new InvalidOperationException("Email is already in use.");
            }

            var now = DateTime.UtcNow;
            var prosumer = new Prosumer
            {
                Nic = nic,
                FullName = dto.FullName.Trim(),
                Email = email,
                Phone = dto.Phone.Trim(),
                Address = dto.Address.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                ActivationStatus = "Pending",
                IsActive = false,
                CreatedAt = now,
                UpdatedAt = now
            };

            try
            {
                await _prosumers.InsertOneAsync(prosumer);
            }
            catch (MongoWriteException exception) when (
                exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
            {
                throw new InvalidOperationException("NIC or email is already in use.", exception);
            }

            return MapToResponse(prosumer);
        }

        // Applies the supplied profile changes and returns the updated account.
        public async Task<ProsumerResponseDto?> UpdateProfileAsync(
            string nic,
            UpdateProsumerDto dto)
        {
            if (!TryNormalizeNic(nic, out var normalizedNic))
            {
                return null;
            }

            var updates = new List<UpdateDefinition<Prosumer>>();

            if (dto.FullName != null)
            {
                updates.Add(Builders<Prosumer>.Update.Set(
                    prosumer => prosumer.FullName,
                    dto.FullName.Trim()));
            }

            if (dto.Email != null)
            {
                if (!TryNormalizeEmail(dto.Email, out var email))
                {
                    throw new ArgumentException("Email is required.");
                }

                if (await EmailExistsAsync(email, normalizedNic))
                {
                    throw new InvalidOperationException("Email is already in use.");
                }

                updates.Add(Builders<Prosumer>.Update.Set(
                    prosumer => prosumer.Email,
                    email));
            }

            if (dto.Phone != null)
            {
                updates.Add(Builders<Prosumer>.Update.Set(
                    prosumer => prosumer.Phone,
                    dto.Phone.Trim()));
            }

            if (dto.Address != null)
            {
                updates.Add(Builders<Prosumer>.Update.Set(
                    prosumer => prosumer.Address,
                    dto.Address.Trim()));
            }

            if (dto.Password != null)
            {
                updates.Add(Builders<Prosumer>.Update.Set(
                    prosumer => prosumer.PasswordHash,
                    BCrypt.Net.BCrypt.HashPassword(dto.Password)));
            }

            if (updates.Count == 0)
            {
                return await GetByNicAsync(normalizedNic);
            }

            updates.Add(Builders<Prosumer>.Update.Set(
                prosumer => prosumer.UpdatedAt,
                DateTime.UtcNow));

            var filter = Builders<Prosumer>.Filter.Eq(
                prosumer => prosumer.Nic,
                normalizedNic);

            try
            {
                var updatedProsumer = await _prosumers.FindOneAndUpdateAsync(
                    filter,
                    Builders<Prosumer>.Update.Combine(updates),
                    new FindOneAndUpdateOptions<Prosumer>
                    {
                        ReturnDocument = ReturnDocument.After
                    });

                return updatedProsumer == null
                    ? null
                    : MapToResponse(updatedProsumer);
            }
            catch (MongoWriteException exception) when (
                exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
            {
                throw new InvalidOperationException("Email is already in use.", exception);
            }
        }

        // Deactivates an active prosumer and records the request timestamp.
        public async Task<bool> DeactivateAsync(string nic)
        {
            if (!TryNormalizeNic(nic, out var normalizedNic))
            {
                return false;
            }

            var filter = Builders<Prosumer>.Filter.And(
                Builders<Prosumer>.Filter.Eq(
                    prosumer => prosumer.Nic,
                    normalizedNic),
                Builders<Prosumer>.Filter.Eq(
                    prosumer => prosumer.ActivationStatus,
                    "Active"));

            var update = Builders<Prosumer>.Update
                .Set(prosumer => prosumer.ActivationStatus, "Deactivated")
                .Set(prosumer => prosumer.IsActive, false)
                .Set(prosumer => prosumer.DeactivationRequestedAt, DateTime.UtcNow)
                .Set(prosumer => prosumer.UpdatedAt, DateTime.UtcNow);

            var result = await _prosumers.UpdateOneAsync(filter, update);
            return result.MatchedCount > 0;
        }

        // Activates a pending prosumer account.
        public async Task<bool> ActivateAsync(string nic)
        {
            if (!TryNormalizeNic(nic, out var normalizedNic))
            {
                return false;
            }

            var filter = Builders<Prosumer>.Filter.And(
                Builders<Prosumer>.Filter.Eq(
                    prosumer => prosumer.Nic,
                    normalizedNic),
                Builders<Prosumer>.Filter.Eq(
                    prosumer => prosumer.ActivationStatus,
                    "Pending"));

            var update = Builders<Prosumer>.Update
                .Set(prosumer => prosumer.ActivationStatus, "Active")
                .Set(prosumer => prosumer.IsActive, true)
                .Set(prosumer => prosumer.UpdatedAt, DateTime.UtcNow);

            var result = await _prosumers.UpdateOneAsync(filter, update);
            return result.MatchedCount > 0;
        }

        // Reactivates a deactivated account and records the approving backoffice user.
        public async Task<bool> ReactivateAsync(
            string nic,
            string backofficeUserId)
        {
            if (!TryNormalizeNic(nic, out var normalizedNic) ||
                !ObjectId.TryParse(backofficeUserId, out _))
            {
                return false;
            }

            var filter = Builders<Prosumer>.Filter.And(
                Builders<Prosumer>.Filter.Eq(
                    prosumer => prosumer.Nic,
                    normalizedNic),
                Builders<Prosumer>.Filter.Eq(
                    prosumer => prosumer.ActivationStatus,
                    "Deactivated"));

            var update = Builders<Prosumer>.Update
                .Set(prosumer => prosumer.ActivationStatus, "Active")
                .Set(prosumer => prosumer.IsActive, true)
                .Set(prosumer => prosumer.ReactivatedBy, backofficeUserId)
                .Set(prosumer => prosumer.ReactivatedAt, DateTime.UtcNow)
                .Set(prosumer => prosumer.UpdatedAt, DateTime.UtcNow);

            var result = await _prosumers.UpdateOneAsync(filter, update);
            return result.MatchedCount > 0;
        }

        // Checks whether a normalized NIC is already registered.
        public async Task<bool> NicExistsAsync(string nic)
        {
            if (!TryNormalizeNic(nic, out var normalizedNic))
            {
                return false;
            }

            var filter = Builders<Prosumer>.Filter.Eq(
                prosumer => prosumer.Nic,
                normalizedNic);

            return await _prosumers.Find(filter).AnyAsync();
        }

        // Checks whether an email is registered, optionally excluding one NIC.
        public async Task<bool> EmailExistsAsync(
            string email,
            string? excludeNic = null)
        {
            if (!TryNormalizeEmail(email, out var normalizedEmail))
            {
                return false;
            }

            var filters = new List<FilterDefinition<Prosumer>>
            {
                Builders<Prosumer>.Filter.Eq(
                    prosumer => prosumer.Email,
                    normalizedEmail)
            };

            if (excludeNic != null)
            {
                if (!TryNormalizeNic(excludeNic, out var normalizedExcludeNic))
                {
                    return false;
                }

                filters.Add(Builders<Prosumer>.Filter.Ne(
                    prosumer => prosumer.Nic,
                    normalizedExcludeNic));
            }

            return await _prosumers.Find(
                Builders<Prosumer>.Filter.And(filters)).AnyAsync();
        }

        // Finds a stored prosumer using a normalized NIC.
        private async Task<Prosumer?> FindByNicAsync(string nic)
        {
            if (!TryNormalizeNic(nic, out var normalizedNic))
            {
                return null;
            }

            var filter = Builders<Prosumer>.Filter.Eq(
                prosumer => prosumer.Nic,
                normalizedNic);

            return await _prosumers.Find(filter).FirstOrDefaultAsync();
        }

        // Rejects activation statuses that are not supported by the account lifecycle.
        private static void ValidateStatus(string status)
        {
            if (!ValidStatuses.Contains(status))
            {
                throw new ArgumentException(
                    "Status must be Pending, Active, or Deactivated.",
                    nameof(status));
            }
        }

        // Trims and uppercases a NIC, returning false when it is blank.
        private static bool TryNormalizeNic(
            string? nic,
            out string normalizedNic)
        {
            normalizedNic = string.Empty;
            if (string.IsNullOrWhiteSpace(nic))
            {
                return false;
            }

            normalizedNic = nic.Trim().ToUpperInvariant();
            return true;
        }

        // Trims and lowercases an email address, returning false when it is blank.
        private static bool TryNormalizeEmail(
            string? email,
            out string normalizedEmail)
        {
            normalizedEmail = string.Empty;
            if (string.IsNullOrWhiteSpace(email))
            {
                return false;
            }

            normalizedEmail = email.Trim().ToLowerInvariant();
            return true;
        }

        // Copies public account fields into the response DTO without exposing the password hash.
        private static ProsumerResponseDto MapToResponse(Prosumer prosumer)
        {
            return new ProsumerResponseDto
            {
                Id = prosumer.Id!,
                Nic = prosumer.Nic,
                FullName = prosumer.FullName,
                Email = prosumer.Email,
                Phone = prosumer.Phone,
                Address = prosumer.Address,
                ActivationStatus = prosumer.ActivationStatus,
                IsActive = prosumer.IsActive,
                ReactivatedBy = prosumer.ReactivatedBy,
                DeactivationRequestedAt = prosumer.DeactivationRequestedAt,
                ReactivatedAt = prosumer.ReactivatedAt,
                CreatedAt = prosumer.CreatedAt,
                UpdatedAt = prosumer.UpdatedAt
            };
        }
    }
}