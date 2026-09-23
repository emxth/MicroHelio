namespace MicroHelio.DTOs
{
    public class UserResponseDto
    {
        public string Id { get; set; } = null!;

        public string Username { get; set; } = null!;

        public string Email { get; set; } = null!;

        public string Role { get; set; } = null!;

        public string FullName { get; set; } = null!;

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}