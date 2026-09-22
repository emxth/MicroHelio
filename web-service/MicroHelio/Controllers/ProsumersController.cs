using MicroHelio.DTOs;
using MicroHelio.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/prosumers")]
    public class ProsumersController : ControllerBase
    {
        private readonly ProsumerService _prosumerService;

        public ProsumersController(ProsumerService prosumerService)
        {
            _prosumerService = prosumerService;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register(
            [FromBody] CreateProsumerDto dto)
        {
            try
            {
                var prosumer = await _prosumerService.RegisterAsync(dto);

                return CreatedAtAction(
                    nameof(GetByNic),
                    new { nic = prosumer.Nic },
                    prosumer);
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return Conflict(new { message = exception.Message });
            }
        }

        [HttpGet]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            try
            {
                var prosumers = string.IsNullOrWhiteSpace(status)
                    ? await _prosumerService.GetAllAsync()
                    : await _prosumerService.GetByStatusAsync(status);

                return Ok(prosumers);
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpGet("{nic}")]
        [Authorize(Roles = "Backoffice,GridOperator,Prosumer")]
        public async Task<IActionResult> GetByNic(string nic)
        {
            if (User.IsInRole("Prosumer") &&
                !OwnsProsumerNic(nic))
            {
                return Forbid();
            }

            var prosumer = await _prosumerService.GetByNicAsync(nic);

            if (prosumer == null)
            {
                return NotFound();
            }

            return Ok(prosumer);
        }

        [HttpPut("{nic}")]
        [Authorize(Roles = "Prosumer")]
        public async Task<IActionResult> UpdateProfile(
            string nic,
            [FromBody] UpdateProsumerDto dto)
        {
            if (!OwnsProsumerNic(nic))
            {
                return Forbid();
            }

            try
            {
                var prosumer = await _prosumerService.UpdateProfileAsync(nic, dto);

                if (prosumer == null)
                {
                    return NotFound();
                }

                return Ok(prosumer);
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return Conflict(new { message = exception.Message });
            }
        }

        [HttpPatch("{nic}/deactivate")]
        [Authorize(Roles = "Prosumer")]
        public async Task<IActionResult> Deactivate(string nic)
        {
            if (!OwnsProsumerNic(nic))
            {
                return Forbid();
            }

            var prosumer = await _prosumerService.GetByNicAsync(nic);

            if (prosumer == null)
            {
                return NotFound();
            }

            if (prosumer.ActivationStatus != "Active")
            {
                return BadRequest("Prosumer must be Active to deactivate.");
            }

            var updated = await _prosumerService.DeactivateAsync(nic);
            return updated
                ? Ok(await _prosumerService.GetByNicAsync(nic))
                : BadRequest("Prosumer could not be deactivated.");
        }

        [HttpPatch("{nic}/activate")]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Activate(string nic)
        {
            var prosumer = await _prosumerService.GetByNicAsync(nic);

            if (prosumer == null)
            {
                return NotFound();
            }

            if (prosumer.ActivationStatus != "Pending")
            {
                return BadRequest("Prosumer must be Pending to activate.");
            }

            var updated = await _prosumerService.ActivateAsync(nic);
            return updated
                ? Ok(await _prosumerService.GetByNicAsync(nic))
                : BadRequest("Prosumer could not be activated.");
        }

        [HttpPatch("{nic}/reactivate")]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Reactivate(string nic)
        {
            var prosumer = await _prosumerService.GetByNicAsync(nic);

            if (prosumer == null)
            {
                return NotFound();
            }

            if (prosumer.ActivationStatus != "Deactivated")
            {
                return BadRequest("Prosumer must be Deactivated to reactivate.");
            }

            var backofficeUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(backofficeUserId))
            {
                return Forbid();
            }

            var updated = await _prosumerService.ReactivateAsync(
                nic,
                backofficeUserId);

            return updated
                ? Ok(await _prosumerService.GetByNicAsync(nic))
                : BadRequest("Prosumer could not be reactivated.");
        }

        private bool OwnsProsumerNic(string nic)
        {
            var prosumerNic = User.FindFirst("prosumerNic")?.Value;
            return !string.IsNullOrWhiteSpace(prosumerNic) &&
                string.Equals(prosumerNic.Trim(), nic.Trim(), StringComparison.OrdinalIgnoreCase);
        }
    }
}