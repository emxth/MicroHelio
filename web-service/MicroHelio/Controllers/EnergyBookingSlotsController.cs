using MicroHelio.DTOs;
using MicroHelio.Models;
using MicroHelio.Services;
using Microsoft.AspNetCore.Mvc;

namespace MicroHelio.Controllers
{
    // API Controller for Energy Booking Slot management.
    [ApiController]
    [Route("api/[controller]")]
    public class EnergyBookingSlotsController : ControllerBase
    {
        private readonly ISlotService _slotService;

        public EnergyBookingSlotsController(ISlotService slotService)
        {
            _slotService = slotService;
        }

        // GET /api/energybookingslots/node/{nodeId}
        [HttpGet("node/{nodeId}")]
        public async Task<ActionResult<IEnumerable<EnergyBookingSlot>>> GetSlotsByNode(string nodeId, [FromQuery] DateTime? date)
        {
            // Begin method execution: Retrieve energy slots for specified node
            if (date.HasValue)
            {
                var slotsByDate = await _slotService.GetSlotsByNodeAndDateAsync(nodeId, date.Value);
                return Ok(slotsByDate);
            }

            var slots = await _slotService.GetSlotsByNodeAsync(nodeId);
            return Ok(slots);
        }

        // GET /api/energybookingslots/{id}
        // Retrieves a specific energy slot by ID.
        [HttpGet("{id}")]
        public async Task<ActionResult<EnergyBookingSlot>> GetSlotById(string id)
        {
            // Begin method execution: Get energy slot by primary key ID
            var slot = await _slotService.GetSlotByIdAsync(id);
            if (slot == null)
            {
                return NotFound(new { message = $"Slot with ID '{id}' not found." });
            }
            return Ok(slot);
        }

        // POST /api/energybookingslots
        // Creates a new energy drop-off or charging slot.
        [HttpPost]
        public async Task<ActionResult<EnergyBookingSlot>> CreateSlot([FromBody] CreateSlotDto dto)
        {
            // Begin method execution: Create slot from DTO
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var createdSlot = await _slotService.CreateSlotAsync(dto);
            return CreatedAtAction(nameof(GetSlotById), new { id = createdSlot.Id }, createdSlot);
        }

        // POST /api/energybookingslots/batch-generate
        // Automatically generates slot schedules for a node across a target day.
        [HttpPost("batch-generate")]
        public async Task<ActionResult<IEnumerable<EnergyBookingSlot>>> BatchGenerateSlots(
            [FromQuery] string nodeId,
            [FromQuery] DateTime date,
            [FromQuery] string startTime,
            [FromQuery] string endTime,
            [FromQuery] double capacityKWh = 50.0,
            [FromQuery] string slotType = "DropOff")
        {
            // Begin method execution: Generate time slots in bulk for node
            try
            {
                var generatedSlots = await _slotService.BatchGenerateSlotsAsync(nodeId, date, startTime, endTime, capacityKWh, slotType);
                return Ok(generatedSlots);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT /api/energybookingslots/{id}
        // Updates slot capacity or availability status.
        [HttpPut("{id}")]
        public async Task<ActionResult<EnergyBookingSlot>> UpdateSlot(string id, [FromBody] UpdateSlotDto dto)
        {
            // Begin method execution: Update slot properties
            var updatedSlot = await _slotService.UpdateSlotAsync(id, dto);
            if (updatedSlot == null)
            {
                return NotFound(new { message = $"Slot with ID '{id}' not found." });
            }
            return Ok(updatedSlot);
        }

        // DELETE /api/energybookingslots/{id}
        // Removes an energy slot document.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSlot(string id)
        {
            // Begin method execution: Delete slot record
            var deleted = await _slotService.DeleteSlotAsync(id);
            if (!deleted)
            {
                return NotFound(new { message = $"Slot with ID '{id}' not found." });
            }
            return NoContent();
        }
    }
}
