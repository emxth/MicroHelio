/* 
 * Author: Emith Arachchi
 * Purpose: Handles HTTP RESTful requests for operator QR scanning, verification, and energy transaction completion.
 */
using MicroHelio.DTOs;
using MicroHelio.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TransactionsController : ControllerBase
    {
        private readonly TransactionService _transactionService;

        // Injects the TransactionService to maintain central API business logic
        public TransactionsController(TransactionService transactionService)
        {
            _transactionService = transactionService;
        }

        [HttpPost]
        [Authorize(Roles = "GridOperator")] // Strictly Grid Operator operational tool
        // Creates an initiated transaction record for a Grid Operator scan.
        public async Task<IActionResult> InitiateTransaction([FromBody] CreateTransactionDto dto)
        {
            var operatorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var transaction = await _transactionService.CreateInitiatedTransactionAsync(dto, operatorId ?? "UnknownOperator");

            return CreatedAtAction(nameof(GetTransactionById), new { id = transaction.Id }, transaction);
        }

        [HttpPost("verify")]
        [Authorize(Roles = "GridOperator")] // Strictly Grid Operator operational tool
        // Validates the QR payload signature and confirms its reservation is approved.
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

        [HttpPatch("{id}/complete")]
        [Authorize(Roles = "GridOperator")] // Strictly Grid Operator operational tool
        // Completes a transfer and records the energy amount supplied by the operator.
        public async Task<IActionResult> CompleteTransaction(string id, [FromBody] System.Text.Json.JsonElement element)
        {
            double energyKWh = 0.0;
            if (element.ValueKind == System.Text.Json.JsonValueKind.Number)
            {
                energyKWh = element.GetDouble();
            }
            else if (element.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                if (element.TryGetProperty("energyTransferredKWh", out var prop) && prop.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    energyKWh = prop.GetDouble();
                }
                else if (element.TryGetProperty("energyKWh", out var prop2) && prop2.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    energyKWh = prop2.GetDouble();
                }
            }

            var result = await _transactionService.CompleteTransactionAsync(id, energyKWh);
            if (!result)
            {
                return NotFound("Transaction not found or could not be completed.");
            }

            return Ok(new { message = "Energy transfer finalised. Transaction completed." });
        }

        // Retrieves full transaction history for a Prosumer (via NIC), a Grid Operator (via operatorId), or filtered by Status
        [HttpGet]
        [Authorize(Roles = "Backoffice,GridOperator,Prosumer")] // All three roles need viewing access
        public async Task<IActionResult> GetTransactions([FromQuery] string? prosumerNic, [FromQuery] string? operatorId, [FromQuery] string? status)
        {
            var transactions = await _transactionService.GetFilteredTransactionsAsync(prosumerNic, operatorId, status);
            return Ok(transactions);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Backoffice,GridOperator,Prosumer")] // All three roles need viewing access
        // Returns one transaction by ID for authorized detail views.
        public async Task<IActionResult> GetTransactionById(string id)
        {
            var transaction = await _transactionService.GetTransactionByIdAsync(id);
            if (transaction == null)
            {
                return NotFound();
            }

            return Ok(transaction);
        }
    }
}
