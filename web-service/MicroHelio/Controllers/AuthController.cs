/*
 * Purpose: Exposes the authentication endpoint for user and prosumer sign-in.
 */
using MicroHelio.DTOs;
using MicroHelio.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        // Stores the authentication service used by the login endpoint.
        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        // Authenticates the supplied credentials and returns a token when valid.
        public async Task<IActionResult> Login(
            [FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);

            if (result == null)
            {
                return Unauthorized(new
                {
                    message = "Invalid credentials or account is unavailable."
                });
            }

            return Ok(result);
        }
    }
}