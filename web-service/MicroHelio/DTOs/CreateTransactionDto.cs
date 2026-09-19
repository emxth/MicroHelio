/* 
 * Author: Randiv
 * Purpose: Defines the data transfer object for initiating a new transaction.
 */
namespace MicroHelio.DTOs
{
    public class CreateTransactionDto
    {
        public string ReservationId { get; set; } = null!;
        public string ProsumerNic { get; set; } = null!;
        public string NodeId { get; set; } = null!;
        public string ScannedQrCode { get; set; } = null!;
    }
}
