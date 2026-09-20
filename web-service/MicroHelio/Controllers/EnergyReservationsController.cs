/* 
 * Author: Ashwin
 * Purpose: API Controller routing RESTful requests to the Reservation Service
 */
using MicroHelio.DTOs;
using MicroHelio.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/reservations")]
    [Authorize]
    public class EnergyReservationsController : ControllerBase
    {
        private readonly ReservationService _reservationService;

        // Injects the service layer for reservation logic
        public EnergyReservationsController(ReservationService reservationService)
        {
            _reservationService = reservationService;
        }

        // POST /api/reservations - Creates a new reservation
        // Allowed for Prosumers via mobile app.
        [HttpPost]
        public async Task<IActionResult> CreateReservation([FromBody] CreateReservationDto dto)
        {
            try
            {
                var reservation = await _reservationService.CreateReservationAsync(dto);
                return CreatedAtAction(nameof(GetProsumerReservations), new { id = reservation.Id }, reservation);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // PUT /api/reservations/{id} - Updates an existing reservation
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReservation(string id, [FromBody] UpdateReservationDto dto)
        {
            try
            {
                await _reservationService.UpdateReservationAsync(id, dto);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // PATCH /api/reservations/{id}/cancel - Cancels a reservation
        [HttpPatch("{id}/cancel")]
        public async Task<IActionResult> CancelReservation(string id, [FromBody] string reason)
        {
            try
            {
                await _reservationService.CancelReservationAsync(id, reason);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET /api/reservations?prosumerNic={nic} - Retrieves a prosumer's bookings
        [HttpGet]
        public async Task<IActionResult> GetProsumerReservations([FromQuery] string prosumerNic)
        {
            if (string.IsNullOrEmpty(prosumerNic)) return BadRequest("prosumerNic is required.");
            
            var reservations = await _reservationService.GetByProsumerAsync(prosumerNic);
            return Ok(reservations);
        }

        // GET /api/reservations/dashboard?prosumerNic={nic} - Retrieves counts for mobile dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardCounts([FromQuery] string prosumerNic)
        {
            if (string.IsNullOrEmpty(prosumerNic)) return BadRequest("prosumerNic is required.");
            
            var counts = await _reservationService.GetDashboardCountsAsync(prosumerNic);
            return Ok(counts);
        }

        // PATCH /api/reservations/{id}/approve - Approves a booking
        [HttpPatch("{id}/approve")]
        [Authorize(Roles = "GridOperator,Backoffice")]
        public async Task<IActionResult> ApproveReservation(string id, [FromBody] string operatorId)
        {
            try
            {
                await _reservationService.ApproveReservationAsync(id, operatorId);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET /api/reservations/status/{status} - Gets Approved or Pending lists
        [HttpGet("status/{status}")]
        public async Task<IActionResult> GetReservationsByStatus(string status)
        {
            var reservations = await _reservationService.GetReservationsByStatusAsync(status);
            return Ok(reservations);
        }

        // GET /api/reservations/search - Multi-parameter search
        [HttpGet("search")]
        public async Task<IActionResult> SearchReservations(
            [FromQuery] string? nodeId, 
            [FromQuery] string? date, 
            [FromQuery] string? status, 
            [FromQuery] string? nic)
        {
            var results = await _reservationService.SearchReservationsAsync(nodeId, date, status, nic);
            return Ok(results);
        }
    }
}