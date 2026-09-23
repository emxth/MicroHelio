using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Username, email, or NIC is required.")]
        public string Identifier { get; set; } = null!;

        [Required(ErrorMessage = "Password is required.")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = null!;
    }
}