/* 
 * Author: Randiv
 * Purpose: Handles HTTP requests for operator QR scanning, verification, and transaction completion.
 * Architecture: Complies with the FAT Service pattern by delegating business logic to TransactionService.
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
        public async Task<IActionResult> VerifyQrCode([FromBody] string qrPayload)
        {
            var isVerified = await _transactionService.VerifyQrPayloadAsync(qrPayload);
            if (!isVerified)
            {
                return BadRequest("Invalid or tampered QR code payload. Verification failed.");
            }

            return Ok(new { message = "QR Verification successful. Server data matched." });
        }

        [HttpPatch("{id}/complete")]
        [Authorize(Roles = "GridOperator")] // Strictly Grid Operator operational tool
        // Completes a transfer and records the energy amount supplied by the operator.
        public async Task<IActionResult> CompleteTransaction(string id, [FromBody] double energyTransferredKWh)
        {
            var result = await _transactionService.CompleteTransactionAsync(id, energyTransferredKWh);
            if (!result)
            {
                return NotFound("Transaction not found or could not be completed.");
            }

            return Ok(new { message = "Energy transfer finalised. Transaction completed." });
        }

        [HttpGet]
        [Authorize(Roles = "Backoffice,GridOperator,Prosumer")] // All three roles need viewing access
        // Returns transaction history filtered by prosumer NIC or operator ID.
        public async Task<IActionResult> GetTransactions([FromQuery] string? prosumerNic, [FromQuery] string? operatorId)
        {
            var transactions = await _transactionService.GetFilteredTransactionsAsync(prosumerNic, operatorId);
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

            //throw new Exception("This is a simulated database failure for testing!");

            return Ok(transaction);
        }
    }
}
