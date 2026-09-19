using MicroHelio.DTOs;
using MicroHelio.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    //[Authorize]
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
        [Authorize(Roles = "GridOperator")]
        public async Task<IActionResult> InitiateTransaction([FromBody] CreateTransactionDto dto)
        {
            var operatorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var transaction = await _transactionService.CreateInitiatedTransactionAsync(dto, operatorId);

            return CreatedAtAction(nameof(GetTransactionById), new { id = transaction.Id }, transaction);
        }

        // Decodes the QR payload, validates the HMAC signature, and confirms the linked reservation is 'Approved'
        [HttpPost("verify")]
        [Authorize(Roles = "GridOperator")]
        public async Task<IActionResult> VerifyQrCode([FromBody] string qrPayload)
        {
            var isVerified = await _transactionService.VerifyQrPayloadAsync(qrPayload);
            if (!isVerified)
            {
                return BadRequest("Invalid or tampered QR code payload. Verification failed.");
            }

            return Ok(new { message = "QR Verification successful. Server data matched." });
        }

        // Operator confirms energy transfer is done; updates status to 'Completed' and stores energyTransferredKWh
        [HttpPatch("{id}/complete")]
        [Authorize(Roles = "GridOperator")]
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
        public async Task<IActionResult> GetTransactions([FromQuery] string? prosumerNic, [FromQuery] string? operatorId)
        {
            var transactions = await _transactionService.GetFilteredTransactionsAsync(prosumerNic, operatorId);
            return Ok(transactions);
        }

        // Retrieves a single transaction detail for specific view screens
        [HttpGet("{id}")]
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
