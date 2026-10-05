/* 
 * Author: Sewwandi Edirisooriya
 * Purpose: Request DTO for updating an energy booking slot capacity or availability status.
 */
namespace MicroHelio.DTOs
{
    // Request DTO for updating an energy booking slot capacity or availability status.
    public class UpdateSlotDto
    {
        public double? TotalCapacityKWh { get; set; }
        public double? ReservedCapacityKWh { get; set; }
        public double? AvailableCapacityKWh { get; set; }
        public bool? IsAvailable { get; set; }
        public string? SlotType { get; set; }
    }
}
