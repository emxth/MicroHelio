/* 
 * Author: Randiv
 * Purpose: Defines the data transfer object for initiating a new transaction with strict input validation.
 */
using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    public class CreateTransactionDto
    {
        [Required(ErrorMessage = "Reservation ID is required.")]
        [RegularExpression(@"^[0-9a-fA-F]{24}$", ErrorMessage = "Reservation ID must be a valid 24-character MongoDB ObjectId hex string.")]
        public string ReservationId { get; set; } = null!;

        [Required(ErrorMessage = "Prosumer NIC is required.")]
        [RegularExpression(@"^([0-9]{9}[vVxX]|[0-9]{12})$", ErrorMessage = "Prosumer NIC must be a valid Sri Lankan 9-digit+V or 12-digit format.")]
        public string ProsumerNic { get; set; } = null!;

        [Required(ErrorMessage = "Node ID is required.")]
        [RegularExpression(@"^[0-9a-fA-F]{24}$", ErrorMessage = "Node ID must be a valid 24-character MongoDB ObjectId hex string.")]
        public string NodeId { get; set; } = null!;

        [Required(ErrorMessage = "Scanned QR Code payload is required.")]
        public string ScannedQrCode { get; set; } = null!;
    }
}
