using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    // Request DTO for creating an energy slot associated with a microgrid node.
    public class CreateSlotDto
    {
        [Required(ErrorMessage = "Node ID is required.")]
        public string NodeId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Slot date is required.")]
        public DateTime SlotDate { get; set; }

        [Required(ErrorMessage = "Slot start time is required.")]
        public string SlotStartTime { get; set; } = string.Empty;

        [Required(ErrorMessage = "Slot end time is required.")]
        public string SlotEndTime { get; set; } = string.Empty;

        [Range(0.1, 10000.0, ErrorMessage = "Total capacity must be positive.")]
        public double TotalCapacityKWh { get; set; }

        public string SlotType { get; set; } = "DropOff"; // "DropOff" or "Charging"
    }
}
