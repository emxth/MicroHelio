using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    public class CreateProsumerDto
    {
        [Required(ErrorMessage = "NIC is required.")]
        [RegularExpression(
            @"^([0-9]{9}[VvXx]|[0-9]{12})$",
            ErrorMessage = "NIC must be a valid Sri Lankan NIC.")]
        public string Nic { get; set; } = null!;

        [Required(ErrorMessage = "Full name is required.")]
        [StringLength(100, MinimumLength = 2)]
        public string FullName { get; set; } = null!;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress]
        [StringLength(254)]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "Phone is required.")]
        [Phone]
        [StringLength(20)]
        public string Phone { get; set; } = null!;

        [Required(ErrorMessage = "Address is required.")]
        [StringLength(250, MinimumLength = 5)]
        public string Address { get; set; } = null!;

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(100, MinimumLength = 8)]
        [DataType(DataType.Password)]
        public string Password { get; set; } = null!;
    }
}