/*
 * Purpose: Exposes backoffice endpoints for managing system user accounts.
 */
using MicroHelio.DTOs;
using MicroHelio.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        private readonly UserService _userService;

        // Stores the user service used by the controller endpoints.
        public UsersController(UserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [Authorize(Roles = "Backoffice")]
        // Returns all system users to authorized backoffice callers.
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        // Returns a system user by database ID.
        public async Task<IActionResult> GetById(string id)
        {
            var user = await _userService.GetByIdAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return Ok(user);
        }

        [HttpPost]
        [Authorize(Roles = "Backoffice")]
        // Creates a user account and maps validation failures to HTTP responses.
        public async Task<IActionResult> Create(
            [FromBody] CreateUserDto dto)
        {
            try
            {
                var user = await _userService.CreateAsync(dto);

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = user.Id },
                    user);
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new
                {
                    message = exception.Message
                });
            }
            catch (InvalidOperationException exception)
            {
                return Conflict(new
                {
                    message = exception.Message
                });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Backoffice")]
        // Updates a user account and maps validation failures to HTTP responses.
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdateUserDto dto)
        {
            try
            {
                var user = await _userService.UpdateAsync(id, dto);

                if (user == null)
                {
                    return NotFound();
                }

                return Ok(user);
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new
                {
                    message = exception.Message
                });
            }
            catch (InvalidOperationException exception)
            {
                return Conflict(new
                {
                    message = exception.Message
                });
            }
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Backoffice")]
        // Changes a user's active status and returns the updated account.
        public async Task<IActionResult> SetStatus(
            string id,
            [FromBody] bool isActive)
        {
            var updated = await _userService.SetActiveStatusAsync(
                id,
                isActive);

            if (!updated)
            {
                return NotFound();
            }

            var user = await _userService.GetByIdAsync(id);
            return Ok(user);
        }
    }
}