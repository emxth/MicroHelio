/*
 * Purpose: Creates signed JWT responses for authenticated users and prosumers.
 */
using MicroHelio.DTOs;
using MicroHelio.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MicroHelio.Services
{
    public class JwtTokenService
    {
        private readonly string _key;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _expirationMinutes;

        // Loads and validates the signing and token-lifetime configuration.
        public JwtTokenService(IConfiguration configuration)
        {
            var jwtSettings = configuration.GetSection("Jwt");

            _key = jwtSettings["Key"]
                ?? throw new InvalidOperationException("Jwt:Key is not configured.");

            _issuer = jwtSettings["Issuer"]
                ?? throw new InvalidOperationException("Jwt:Issuer is not configured.");

            _audience = jwtSettings["Audience"]
                ?? throw new InvalidOperationException("Jwt:Audience is not configured.");

            if (!int.TryParse(
                    jwtSettings["ExpirationMinutes"],
                    out var expirationMinutes) ||
                expirationMinutes <= 0)
            {
                throw new InvalidOperationException(
                    "Jwt:ExpirationMinutes must be a positive integer.");
            }

            _expirationMinutes = expirationMinutes;
        }

        // Creates a token response for a backoffice or grid-operator user.
        public LoginResponse GenerateForUser(User user)
        {
            if (string.IsNullOrWhiteSpace(user.Id))
            {
                throw new InvalidOperationException(
                    "User ID is required to generate a JWT.");
            }

            if (user.Role != "Backoffice" &&
                user.Role != "GridOperator")
            {
                throw new InvalidOperationException(
                    "User role must be Backoffice or GridOperator.");
            }

            return GenerateToken(
                accountId: user.Id,
                accountIdentifier: user.Username,
                fullName: user.FullName,
                role: user.Role,
                additionalClaims: Array.Empty<Claim>());
        }

        // Creates a token response for an active prosumer account.
        public LoginResponse GenerateForProsumer(Prosumer prosumer)
        {
            if (string.IsNullOrWhiteSpace(prosumer.Id))
            {
                throw new InvalidOperationException(
                    "Prosumer ID is required to generate a JWT.");
            }

            return GenerateToken(
                accountId: prosumer.Id,
                accountIdentifier: prosumer.Nic,
                fullName: prosumer.FullName,
                role: "Prosumer",
                additionalClaims: new[]
                {
                    new Claim("prosumerNic", prosumer.Nic)
                });
        }

        // Signs a JWT with account identity, role, and any additional claims.
        private LoginResponse GenerateToken(
            string accountId,
            string accountIdentifier,
            string fullName,
            string role,
            IEnumerable<Claim> additionalClaims)
        {
            var expiresAtUtc = DateTime.UtcNow.AddMinutes(_expirationMinutes);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, accountId),
                new Claim(ClaimTypes.Name, fullName),
                new Claim(ClaimTypes.Role, role)
            };

            claims.AddRange(additionalClaims);

            var securityKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_key));

            var credentials = new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                expires: expiresAtUtc,
                signingCredentials: credentials);

            var tokenValue = new JwtSecurityTokenHandler()
                .WriteToken(token);

            return new LoginResponse
            {
                Token = tokenValue,
                ExpiresAtUtc = expiresAtUtc,
                AccountId = accountId,
                AccountIdentifier = accountIdentifier,
                Role = role,
                FullName = fullName
            };
        }
    }
}