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
        private readonly TransactionService _transactionService;
        private readonly IMongoCollection<EnergyBookingSlot> _slots;
        private readonly IMongoCollection<MicrogridNode> _nodesCollection;
        private readonly IMongoCollection<EnergyReservation> _reservationsCollection;

        // Injects the service layer and MongoDB collections for reservation and node logic
        public EnergyReservationsController(
            ReservationService reservationService,
            TransactionService transactionService,
            IMongoClient mongoClient,
            IOptions<MicroHelioDatabaseSettings> settings)
        {
            _reservationService = reservationService;
            _transactionService = transactionService;
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _slots = database.GetCollection<EnergyBookingSlot>(settings.Value.EnergyBookingSlotsCollectionName);
            _nodesCollection = database.GetCollection<MicrogridNode>("MICROGRID_NODE");
            _reservationsCollection = database.GetCollection<EnergyReservation>(settings.Value.EnergyReservationsCollectionName);
        }

        // POST /api/reservations - Creates a new reservation
        // Allowed for Prosumers via mobile app.
        [HttpPost]
        // [Authorize(Roles = "Prosumer")]
        public async Task<IActionResult> CreateReservation([FromBody] CreateReservationDto dto)
        {
            try
            {
                // Process booking request and save to database
                var reservation = await _reservationService.CreateReservationAsync(dto);
                return CreatedAtAction(nameof(GetReservationById), new { id = reservation.Id }, reservation);
            }
            catch (InvalidOperationException ex)
            {
                // Handle capacity or validation failures
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
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
                // Update booking slot and adjust capacity metrics
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
                // Cancel booking and restore slot capacity
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

        // GET /api/nodes - Returns real microgrid nodes from MongoDB for dropdowns
        [HttpGet("/api/nodes")]
        public async Task<IActionResult> GetNodes()
        {
            // Fetch active nodes from MongoDB collection
            var nodes = await _nodesCollection.Find(n => n.IsActive).ToListAsync();

            // Fallback if active filter returns empty list
            if (!nodes.Any())
            {
                nodes = await _nodesCollection.Find(_ => true).ToListAsync();
            }

            // Map database models to clean response DTOs
            var payload = nodes.Select(n => new
            {
                id = n.Id,
                _id = n.Id,
                nodeCode = n.NodeCode,
                name = n.Name,
                address = n.Address
            }).ToList();

            return Ok(payload);
        }

        // GET /api/slots?nodeId={id} - Returns booking slots for a selected node
        [HttpGet("/api/slots")]
        public async Task<IActionResult> GetSlotsForNode([FromQuery] string nodeId)
        {
            if (string.IsNullOrWhiteSpace(nodeId))
                return BadRequest("nodeId is required.");

            // Query slots filtered by node ID and sorted by date/time
            var slots = await _slots.Find(s => s.NodeId == nodeId)
                .SortBy(s => s.SlotDate)
                .ThenBy(s => s.SlotStartTime)
                .ToListAsync();

            // Find all active (Pending or Approved) reservations for this node
            var activeSlotIds = (await _reservationsCollection.Find(r => r.NodeId == nodeId && (r.Status == "Pending" || r.Status == "Approved"))
                .Project(r => r.SlotId)
                .ToListAsync())
                .ToHashSet();

            var payload = slots.Select(s => new
            {
                id = s.Id,
                _id = s.Id,
                nodeId = s.NodeId,
                slotDate = s.SlotDate,
                slotStartTime = s.SlotStartTime,
                slotEndTime = s.SlotEndTime,
                availableCapacityKWh = (s.Id != null && activeSlotIds.Contains(s.Id)) ? 0.0 : s.AvailableCapacityKWh,
                totalCapacityKWh = s.TotalCapacityKWh,
                reservedCapacityKWh = s.ReservedCapacityKWh,
                slotType = s.SlotType,
                isAvailable = s.IsAvailable && s.AvailableCapacityKWh > 0 && (s.Id == null || !activeSlotIds.Contains(s.Id))
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

        [HttpPost("{id}/generate-qr")]
        public async Task<IActionResult> GenerateQr(string id)
        {
            var qrData = await _transactionService.GenerateQrPayloadAsync(id);
            if (qrData == null)
            {
                return BadRequest("Cannot generate QR. Reservation not found or not in 'Approved' status.");
            }

            return Ok(new { message = "QR Payload generated successfully.", payload = qrData });
        }
    }
}