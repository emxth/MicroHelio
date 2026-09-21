/* 
 * Author: Ashwin
 * Purpose: API Controller routing RESTful requests to the Reservation Service
 */
using MicroHelio.Config;
using MicroHelio.DTOs;
using MicroHelio.Models;
using MicroHelio.Services;
// using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/reservations")]
    public class EnergyReservationsController : ControllerBase
    {
        private readonly ReservationService _reservationService;
        private readonly IMongoCollection<EnergyBookingSlot> _slots;

        // Injects the service layer for reservation logic
        public EnergyReservationsController(ReservationService reservationService, IMongoClient mongoClient, IOptions<MicroHelioDatabaseSettings> settings)
        {
            _reservationService = reservationService;
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _slots = database.GetCollection<EnergyBookingSlot>(settings.Value.EnergyBookingSlotsCollectionName);
        }

        // POST /api/reservations - Creates a new reservation
        // Allowed for Prosumers via mobile app.
        [HttpPost]
        // [Authorize(Roles = "Prosumer")]
        public async Task<IActionResult> CreateReservation([FromBody] CreateReservationDto dto)
        {
            try
            {
                var reservation = await _reservationService.CreateReservationAsync(dto);
                return CreatedAtAction(nameof(GetReservationById), new { id = reservation.Id }, reservation);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // PUT /api/reservations/{id} - Updates an existing reservation
        [HttpPut("{id}")]
        // [Authorize(Roles = "Prosumer")]
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
        // [Authorize(Roles = "Prosumer,GridOperator,Backoffice")]
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

        // GET /api/nodes - Returns available microgrid nodes for dropdowns
        [HttpGet("/api/nodes")]
        public async Task<IActionResult> GetNodes()
        {
            var nodeIds = await _slots.Find(_ => true)
                .Project(s => s.NodeId)
                .ToListAsync();

            var uniqueNodeIds = nodeIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(id => id)
                .ToList();

            var nodes = uniqueNodeIds.Select((nodeId, index) => new
            {
                id = nodeId,
                _id = nodeId,
                nodeCode = $"NODE-{nodeId.Substring(0, Math.Min(6, nodeId.Length)).ToUpperInvariant()}",
                name = $"Microgrid Node {index + 1}"
            }).ToList();

            return Ok(nodes);
        }

        // GET /api/slots?nodeId={id} - Returns booking slots for a selected node
        [HttpGet("/api/slots")]
        public async Task<IActionResult> GetSlotsForNode([FromQuery] string nodeId)
        {
            if (string.IsNullOrWhiteSpace(nodeId))
                return BadRequest("nodeId is required.");

            var slots = await _slots.Find(s => s.NodeId == nodeId)
                .SortBy(s => s.SlotDate)
                .ThenBy(s => s.SlotStartTime)
                .ToListAsync();

            var payload = slots.Select(s => new
            {
                id = s.Id,
                _id = s.Id,
                nodeId = s.NodeId,
                slotDate = s.SlotDate,
                slotStartTime = s.SlotStartTime,
                slotEndTime = s.SlotEndTime,
                availableCapacityKWh = s.AvailableCapacityKWh,
                totalCapacityKWh = s.TotalCapacityKWh,
                reservedCapacityKWh = s.ReservedCapacityKWh,
                slotType = s.SlotType,
                isAvailable = s.IsAvailable
            }).ToList();

            return Ok(payload);
        }

        // GET /api/reservations?prosumerNic={nic} - Retrieves a prosumer's bookings
        [HttpGet]
        // [Authorize(Roles = "Prosumer,GridOperator,Backoffice")]
        public async Task<IActionResult> GetProsumerReservations([FromQuery] string prosumerNic)
        {
            if (string.IsNullOrEmpty(prosumerNic)) return BadRequest("prosumerNic is required.");
            
            var reservations = await _reservationService.GetByProsumerAsync(prosumerNic);
            return Ok(reservations);
        }

        // GET /api/reservations/{id} - Retrieves one reservation
        [HttpGet("{id}")]
        // [Authorize(Roles = "Prosumer,GridOperator,Backoffice")]
        public async Task<IActionResult> GetReservationById(string id)
        {
            var reservation = await _reservationService.GetByIdAsync(id);
            if (reservation == null) return NotFound();

            return Ok(reservation);
        }

        // GET /api/reservations/dashboard?prosumerNic={nic} - Retrieves counts for mobile dashboard
        [HttpGet("dashboard")]
        // [Authorize(Roles = "Prosumer")]
        public async Task<IActionResult> GetDashboardCounts([FromQuery] string prosumerNic)
        {
            if (string.IsNullOrEmpty(prosumerNic)) return BadRequest("prosumerNic is required.");
            
            var counts = await _reservationService.GetDashboardCountsAsync(prosumerNic);
            return Ok(counts);
        }

        // PATCH /api/reservations/{id}/approve - Approves a booking
        [HttpPatch("{id}/approve")]
        // [Authorize(Roles = "GridOperator")]
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
        // [Authorize(Roles = "GridOperator,Backoffice")]
        public async Task<IActionResult> GetReservationsByStatus(string status)
        {
            var reservations = await _reservationService.GetReservationsByStatusAsync(status);
            return Ok(reservations);
        }

        // GET /api/reservations/search - Multi-parameter search
        [HttpGet("search")]
        // [Authorize(Roles = "GridOperator,Backoffice")]
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