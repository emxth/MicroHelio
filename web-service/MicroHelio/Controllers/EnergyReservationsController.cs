using MicroHelio.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MicroHelio.Controllers
{
    [ApiController]
    [Route("api/reservations")]
    public class EnergyReservationsController : ControllerBase
    {
        private readonly TransactionService _transactionService;

        // Injects the TransactionService to maintain central API business logic
        public EnergyReservationsController(TransactionService transactionService)
        {
            _transactionService = transactionService;
        }

        /*
         * Endpoint to trigger QR code generation for an approved reservation.
         * Generates an HMAC-signed payload and stores it on the reservation document.
         */
        [HttpPost("{id}/generate-qr")]
        [Authorize(Roles = "Backoffice,GridOperator")]
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