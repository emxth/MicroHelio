namespace MicroHelio.DTOs
{
    // Request DTO for updating an existing microgrid node.
    public class UpdateNodeDto
    {
        public string? Name { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Address { get; set; }
        public double? CapacityKWh { get; set; }
        public int? TotalBatterySlots { get; set; }
        public int? AvailableBatterySlots { get; set; }
        public string? OpenTime { get; set; }
        public string? CloseTime { get; set; }
        public string? OperatingDays { get; set; }
        public bool? IsActive { get; set; }
    }
}
