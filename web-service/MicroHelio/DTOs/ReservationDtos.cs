/* 
 * Author: Ashwin
 * Purpose: Data Transfer Objects for creating and updating energy reservations.
 */
namespace MicroHelio.DTOs
{
    public class CreateReservationDto
    {
        public string ProsumerNic { get; set; } = null!;
        public string NodeId { get; set; } = null!;
        public string SlotId { get; set; } = null!;
        public string ReservationType { get; set; } = null!;
        public DateTime ScheduledDate { get; set; }
        public string ScheduledStartTime { get; set; } = null!;
        public string ScheduledEndTime { get; set; } = null!;
        public double RequestedCapacityKWh { get; set; }
    }

    public class UpdateReservationDto
    {
        public string SlotId { get; set; } = null!;
        public DateTime ScheduledDate { get; set; }
        public string ScheduledStartTime { get; set; } = null!;
        public string ScheduledEndTime { get; set; } = null!;
    }
}