/*
 * Purpose: Represents the public account data returned for a prosumer.
 */
namespace MicroHelio.DTOs
{
    public class ProsumerResponseDto
    {
        public string Id { get; set; } = null!;

        public string Nic { get; set; } = null!;

        public string FullName { get; set; } = null!;

        public string Email { get; set; } = null!;

        public string Phone { get; set; } = null!;

        public string Address { get; set; } = null!;

        public string ActivationStatus { get; set; } = null!;

        public bool IsActive { get; set; }

        public string? ReactivatedBy { get; set; }

        public DateTime? DeactivationRequestedAt { get; set; }

        public DateTime? ReactivatedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}