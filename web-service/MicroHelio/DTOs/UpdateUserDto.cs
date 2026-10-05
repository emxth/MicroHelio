/*
 * Purpose: Carries optional account updates for an existing system user.
 */
using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    public class UpdateUserDto
    {
        [EmailAddress]
        [StringLength(254)]
        public string? Email { get; set; }

        [StringLength(100, MinimumLength = 8)]
        [DataType(DataType.Password)]
        public string? Password { get; set; }

        [RegularExpression(
            "^(Backoffice|GridOperator)$",
            ErrorMessage = "Role must be Backoffice or GridOperator.")]
        public string? Role { get; set; }

        [StringLength(100, MinimumLength = 2)]
        public string? FullName { get; set; }

        public bool? IsActive { get; set; }
    }
}