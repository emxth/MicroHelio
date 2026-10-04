/* 
 * Handles HTTP requests for operator QR scanning, verification, and transaction completion.
 */
using MicroHelio.DTOs;
using MicroHelio.Services;
// using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize]
    public class TransactionsController : ControllerBase
    {
        private readonly TransactionService _transactionService;

        // Injects the TransactionService to maintain central API business logic
        public TransactionsController(TransactionService transactionService)
        {
            _transactionService = transactionService;
        }

        // Creates a transaction record when a Grid Operator initiates a scan, setting status to 'Initiated'
        [HttpPost]
        // [Authorize(Roles = "GridOperator")] // Strictly Grid Operator operational tool
        public async Task<IActionResult> InitiateTransaction([FromBody] CreateTransactionDto dto)
        {
            var operatorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var transaction = await _transactionService.CreateInitiatedTransactionAsync(dto, operatorId ?? "UnknownOperator");

            return CreatedAtAction(nameof(GetTransactionById), new { id = transaction.Id }, transaction);
        }

        // Decodes the QR payload, validates the HMAC signature, and confirms the linked reservation is 'Approved'
        [HttpPost("verify")]
        // [Authorize(Roles = "GridOperator")] // Strictly Grid Operator operational tool
        public async Task<IActionResult> VerifyQrCode([FromBody] System.Text.Json.JsonElement element)
        {
            string qrPayload;
            if (element.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                qrPayload = element.GetString() ?? string.Empty;
            }
            else if (element.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                if (element.TryGetProperty("qrPayload", out var payloadProp) && payloadProp.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    qrPayload = payloadProp.GetString() ?? string.Empty;
                }
                else
                {
                    qrPayload = element.GetRawText();
                }
            }
            else
            {
                qrPayload = element.GetRawText();
            }

            var (isVerified, message) = await _transactionService.VerifyQrPayloadAsync(qrPayload);
            if (!isVerified)
            {
                return BadRequest(message);
            }

            return Ok(new { message = message });
        }

        // Operator confirms energy transfer is done; updates status to 'Completed' and stores energyTransferredKWh
        [HttpPatch("{id}/complete")]
        // [Authorize(Roles = "GridOperator")] // Strictly Grid Operator operational tool
        public async Task<IActionResult> CompleteTransaction(string id, [FromBody] double energyTransferredKWh)
        {
            var result = await _transactionService.CompleteTransactionAsync(id, energyTransferredKWh);
            if (!result)
            {
                return NotFound("Transaction not found or could not be completed.");
            }

            return Ok(new { message = "Energy transfer finalised. Transaction completed." });
        }

        // Retrieves full transaction history for a Prosumer (via NIC) or a Grid Operator (via operatorId)
        [HttpGet]
        // [Authorize(Roles = "Backoffice,GridOperator,Prosumer")] // All three roles need viewing access
        public async Task<IActionResult> GetTransactions([FromQuery] string? prosumerNic, [FromQuery] string? operatorId)
        {
            var transactions = await _transactionService.GetFilteredTransactionsAsync(prosumerNic, operatorId);
            return Ok(transactions);
        }

        // Retrieves a single transaction detail for specific view screens
        [HttpGet("{id}")]
        // [Authorize(Roles = "Backoffice,GridOperator,Prosumer")] // All three roles need viewing access
        public async Task<IActionResult> GetTransactionById(string id)
        {
            var transaction = await _transactionService.GetTransactionByIdAsync(id);
            if (transaction == null)
            {
                return NotFound();
            }

            //throw new Exception("This is a simulated database failure for testing!");

            return Ok(transaction);
        }
    }
}
