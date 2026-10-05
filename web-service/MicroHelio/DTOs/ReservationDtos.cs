/* 
 * Author: Ashwin
 * Purpose: Data Transfer Objects for creating and updating energy reservations.
 */
using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    public class CreateReservationDto
    {
        [Required]
        public string ProsumerNic { get; set; } = null!;

        [Required]
        public string NodeId { get; set; } = null!;

        [Required]
        public string SlotId { get; set; } = null!;

        [Required]
        public string ReservationType { get; set; } = null!;

        public DateTime ScheduledDate { get; set; }

        [Required]
        public string ScheduledStartTime { get; set; } = null!;

        [Required]
        public string ScheduledEndTime { get; set; } = null!;

        [Range(0.01, double.MaxValue)]
        public double RequestedCapacityKWh { get; set; }
    }

    public class UpdateReservationDto
    {
        [Required]
        public string SlotId { get; set; } = null!;

        public DateTime ScheduledDate { get; set; }

        [Required]
        public string ScheduledStartTime { get; set; } = null!;

        [Required]
        public string ScheduledEndTime { get; set; } = null!;
    }
}