/*
 * Purpose: Validates user and prosumer credentials and issues authentication tokens.
 */
using MicroHelio.DTOs;
using MicroHelio.Models;

namespace MicroHelio.Services
{
    public class AuthService
    {
        private readonly UserService _userService;
        private readonly ProsumerService _prosumerService;
        private readonly JwtTokenService _jwtTokenService;

        // Provides the account lookups and token generation required for sign-in.
        public AuthService(
            UserService userService,
            ProsumerService prosumerService,
            JwtTokenService jwtTokenService)
        {
            _userService = userService;
            _prosumerService = prosumerService;
            _jwtTokenService = jwtTokenService;
        }

        // Authenticates an account by username, email, or NIC and returns its token.
        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Identifier) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return null;
            }

            var identifier = request.Identifier.Trim();

            var user = await _userService
                .GetByUsernameOrEmailAsync(identifier);

            if (user != null)
            {
                if (!user.IsActive ||
                    !BCrypt.Net.BCrypt.Verify(
                        request.Password,
                        user.PasswordHash))
                {
                    return null;
                }

                return _jwtTokenService.GenerateForUser(user);
            }

            Prosumer? prosumer;

            if (identifier.Contains('@'))
            {
                prosumer = await _prosumerService
                    .GetByEmailForAuthAsync(identifier);
            }
            else
            {
                prosumer = await _prosumerService
                    .GetEntityByNicAsync(identifier);
            }

            if (prosumer == null ||
                prosumer.ActivationStatus != "Active" ||
                !prosumer.IsActive ||
                !BCrypt.Net.BCrypt.Verify(
                    request.Password,
                    prosumer.PasswordHash))
            {
                return null;
            }

            return _jwtTokenService.GenerateForProsumer(prosumer);
        }
    }
}