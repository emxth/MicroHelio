using MicroHelio.Config;
using MicroHelio.DTOs;
using MicroHelio.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace MicroHelio.Services
{
    public class UserService
    {
        private static readonly string[] AllowedRoles = { "Backoffice", "GridOperator" };
        private readonly IMongoCollection<User> _users;

        public UserService(
            IMongoClient mongoClient,
            IOptions<MicroHelioDatabaseSettings> settings)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>(settings.Value.UsersCollectionName);
        }

        public async Task<List<UserResponseDto>> GetAllAsync()
        {
            var users = await _users.Find(Builders<User>.Filter.Empty)
                .SortBy(user => user.Username)
                .ToListAsync();

            return users.Select(MapToResponse).ToList();
        }

        public async Task<UserResponseDto?> GetByIdAsync(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return null;
            }

            var filter = Builders<User>.Filter.Eq(user => user.Id, id);
            var user = await _users.Find(filter).FirstOrDefaultAsync();

            return user == null ? null : MapToResponse(user);
        }

        internal async Task<User?> GetByUsernameOrEmailAsync(string identifier)
        {
            var normalizedIdentifier = Normalize(identifier);
            var filter = Builders<User>.Filter.Or(
                Builders<User>.Filter.Eq(user => user.Username, normalizedIdentifier),
                Builders<User>.Filter.Eq(user => user.Email, normalizedIdentifier));

            return await _users.Find(filter).FirstOrDefaultAsync();
        }

        public async Task<UserResponseDto> CreateAsync(CreateUserDto dto)
        {
            var username = Normalize(dto.Username);
            var email = Normalize(dto.Email);
            ValidateRole(dto.Role);

            if (await UsernameExistsAsync(username))
            {
                throw new InvalidOperationException("Username is already in use.");
            }

            if (await EmailExistsAsync(email))
            {
                throw new InvalidOperationException("Email is already in use.");
            }

            var user = new User
            {
                Username = username,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                FullName = dto.FullName.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            try
            {
                await _users.InsertOneAsync(user);
            }
            catch (MongoWriteException exception) when (
                exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
            {
                throw new InvalidOperationException("Username or email is already in use.", exception);
            }

            return MapToResponse(user);
        }

        public async Task<UserResponseDto?> UpdateAsync(
            string id,
            UpdateUserDto dto)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return null;
            }

            var updates = new List<UpdateDefinition<User>>();

            if (dto.Email != null)
            {
                var email = Normalize(dto.Email);
                if (await EmailExistsAsync(email, id))
                {
                    throw new InvalidOperationException("Email is already in use.");
                }

                updates.Add(Builders<User>.Update.Set(user => user.Email, email));
            }

            if (dto.Password != null)
            {
                var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                updates.Add(Builders<User>.Update.Set(user => user.PasswordHash, passwordHash));
            }

            if (dto.Role != null)
            {
                ValidateRole(dto.Role);
                updates.Add(Builders<User>.Update.Set(user => user.Role, dto.Role));
            }

            if (dto.FullName != null)
            {
                updates.Add(Builders<User>.Update.Set(user => user.FullName, dto.FullName.Trim()));
            }

            if (dto.IsActive.HasValue)
            {
                updates.Add(Builders<User>.Update.Set(user => user.IsActive, dto.IsActive.Value));
            }

            if (updates.Count == 0)
            {
                return await GetByIdAsync(id);
            }

            updates.Add(Builders<User>.Update.Set(user => user.UpdatedAt, DateTime.UtcNow));

            var filter = Builders<User>.Filter.Eq(user => user.Id, id);
            User? updatedUser;
            try
            {
                updatedUser = await _users.FindOneAndUpdateAsync(
                    filter,
                    Builders<User>.Update.Combine(updates),
                    new FindOneAndUpdateOptions<User>
                    {
                        ReturnDocument = ReturnDocument.After
                    });
            }
            catch (MongoWriteException exception) when (
                exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
            {
                throw new InvalidOperationException("Email is already in use.", exception);
            }

            return updatedUser == null ? null : MapToResponse(updatedUser);
        }

        public async Task<bool> SetActiveStatusAsync(string id, bool isActive)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return false;
            }

            var filter = Builders<User>.Filter.Eq(user => user.Id, id);
            var update = Builders<User>.Update
                .Set(user => user.IsActive, isActive)
                .Set(user => user.UpdatedAt, DateTime.UtcNow);

            var result = await _users.UpdateOneAsync(filter, update);
            return result.MatchedCount > 0;
        }

        public async Task<bool> UsernameExistsAsync(
            string username,
            string? excludeUserId = null)
        {
            var filters = new List<FilterDefinition<User>>
            {
                Builders<User>.Filter.Eq(user => user.Username, Normalize(username))
            };

            if (excludeUserId != null)
            {
                filters.Add(Builders<User>.Filter.Ne(user => user.Id, excludeUserId));
            }

            return await _users.Find(Builders<User>.Filter.And(filters)).AnyAsync();
        }

        public async Task<bool> EmailExistsAsync(
            string email,
            string? excludeUserId = null)
        {
            var filters = new List<FilterDefinition<User>>
            {
                Builders<User>.Filter.Eq(user => user.Email, Normalize(email))
            };

            if (excludeUserId != null)
            {
                filters.Add(Builders<User>.Filter.Ne(user => user.Id, excludeUserId));
            }

            return await _users.Find(Builders<User>.Filter.And(filters)).AnyAsync();
        }

        private static void ValidateRole(string role)
        {
            if (!AllowedRoles.Contains(role))
            {
                throw new ArgumentException("Role must be Backoffice or GridOperator.", nameof(role));
            }
        }

        private static string Normalize(string value)
        {
            return value.Trim().ToLowerInvariant();
        }

        private static UserResponseDto MapToResponse(User user)
        {
            return new UserResponseDto
            {
                Id = user.Id!,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                FullName = user.FullName,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            };
        }
    }
}