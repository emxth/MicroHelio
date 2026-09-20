using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    public class CreateUserDto
    {
        [Required(ErrorMessage = "Username is required.")]
        [StringLength(50, MinimumLength = 3)]
        public string Username { get; set; } = null!;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress]
        [StringLength(254)]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(100, MinimumLength = 8)]
        [DataType(DataType.Password)]
        public string Password { get; set; } = null!;

        [Required(ErrorMessage = "Role is required.")]
        [RegularExpression(
            "^(Backoffice|GridOperator)$",
            ErrorMessage = "Role must be Backoffice or GridOperator.")]
        public string Role { get; set; } = null!;

        [Required(ErrorMessage = "Full name is required.")]
        [StringLength(100, MinimumLength = 2)]
        public string FullName { get; set; } = null!;
    }
}