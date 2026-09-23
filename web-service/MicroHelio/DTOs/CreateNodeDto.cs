using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    // Request DTO for creating a new microgrid node.
    public class CreateNodeDto
    {
        [Required(ErrorMessage = "Node code is required.")]
        public string NodeCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Node name is required.")]
        public string Name { get; set; } = string.Empty;

        [Required]
        public double Latitude { get; set; }

        [Required]
        public double Longitude { get; set; }

        [Required(ErrorMessage = "Address is required.")]
        public string Address { get; set; } = string.Empty;

        [Range(1.0, 10000.0, ErrorMessage = "Capacity must be greater than zero.")]
        public double CapacityKWh { get; set; }

        [Range(1, 100, ErrorMessage = "Total battery slots must be at least 1.")]
        public int TotalBatterySlots { get; set; }

        public int AvailableBatterySlots { get; set; }

        public string OpenTime { get; set; } = "08:00";

        public string CloseTime { get; set; } = "18:00";

        public string OperatingDays { get; set; } = "Mon,Tue,Wed,Thu,Fri,Sat,Sun";

        public string? CreatedBy { get; set; }
    }
}
