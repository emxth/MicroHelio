/*
 * Purpose: Carries optional profile updates for an existing prosumer account.
 */
using System.ComponentModel.DataAnnotations;

namespace MicroHelio.DTOs
{
    public class UpdateProsumerDto
    {
        [StringLength(100, MinimumLength = 2)]
        public string? FullName { get; set; }

        [EmailAddress]
        [StringLength(254)]
        public string? Email { get; set; }

        [Phone]
        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(250, MinimumLength = 5)]
        public string? Address { get; set; }

        [StringLength(100, MinimumLength = 8)]
        [DataType(DataType.Password)]
        public string? Password { get; set; }
    }
}