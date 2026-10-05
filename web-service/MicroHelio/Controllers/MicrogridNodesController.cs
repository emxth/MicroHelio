/* 
 * Purpose: API Controller exposing RESTful endpoints for Solar Microgrid Station Node management.
 */
using MicroHelio.DTOs;
using MicroHelio.Models;
using MicroHelio.Services;
using Microsoft.AspNetCore.Mvc;

namespace MicroHelio.Controllers
{
    // API Controller for Microgrid Node operations.
    [ApiController]
    [Route("api/[controller]")]
    public class MicrogridNodesController : ControllerBase
    {
        private readonly INodeService _nodeService;

        // Constructor injecting INodeService.
        public MicrogridNodesController(INodeService nodeService)
        {
            _nodeService = nodeService;
        }


        // GET /api/microgridnodes
        // Retrieves all registered solar microgrid nodes.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MicrogridNode>>> GetAllNodes()
        {
            // Begin method execution: Retrieve all nodes list
            var nodes = await _nodeService.GetAllNodesAsync();
            return Ok(nodes);
        }
        // GET /api/microgridnodes/{id}
        // Retrieves a single node by ID.
        [HttpGet("{id}")]
        public async Task<ActionResult<MicrogridNode>> GetNodeById(string id)
        {
            // Begin method execution: Retrieve target node by ID
            var node = await _nodeService.GetNodeByIdAsync(id);
            if (node == null)
            {
                return NotFound(new { message = $"Microgrid node with ID '{id}' not found." });
            }
            return Ok(node);
        }

        // POST /api/microgridnodes
        // Creates a new solar microgrid station node.
        [HttpPost]
        public async Task<ActionResult<MicrogridNode>> CreateNode([FromBody] CreateNodeDto dto)
        {
            // Begin method execution: Process node creation request
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var createdNode = await _nodeService.CreateNodeAsync(dto);
                return CreatedAtAction(nameof(GetNodeById), new { id = createdNode.Id }, createdNode);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT /api/microgridnodes/{id}
        // Updates an existing node's details.
        [HttpPut("{id}")]
        public async Task<ActionResult<MicrogridNode>> UpdateNode(string id, [FromBody] UpdateNodeDto dto)
        {
            // Begin method execution: Process node update request
            var updatedNode = await _nodeService.UpdateNodeAsync(id, dto);
            if (updatedNode == null)
            {
                return NotFound(new { message = $"Node with ID '{id}' not found." });
            }
            return Ok(updatedNode);
        }

        // PATCH /api/microgridnodes/{id}/deactivate
        // Deactivates a microgrid node. Fails with 409 Conflict if active reservations exist.
        [HttpPatch("{id}/deactivate")]
        public async Task<IActionResult> DeactivateNode(string id)
        {
            // Begin method execution: Evaluate active reservation constraint before deactivating node
            var (success, message) = await _nodeService.DeactivateNodeAsync(id);
            if (!success)
            {
                return Conflict(new { message });
            }
            return Ok(new { message });
        }

        // PATCH /api/microgridnodes/{id}/battery-slots
        // Updates available battery slots on-site (used by Grid Operators).
        [HttpPatch("{id}/battery-slots")]
        public async Task<IActionResult> UpdateBatterySlots(string id, [FromBody] int availableSlots)
        {
            // Begin method execution: Update battery slot availability
            var success = await _nodeService.UpdateBatterySlotsAsync(id, availableSlots);
            if (!success)
            {
                return NotFound(new { message = $"Node with ID '{id}' not found." });
            }
            return Ok(new { message = "Battery slots updated successfully.", availableSlots });
        }
        // DELETE /api/microgridnodes/{id}
        // Permanently removes a microgrid node.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNode(string id)
        {
            // Begin method execution: Delete microgrid node
            var deleted = await _nodeService.DeleteNodeAsync(id);
            if (!deleted)
            {
                return NotFound(new { message = $"Node with ID '{id}' not found." });
            }
            return NoContent();
        }
    }
}
