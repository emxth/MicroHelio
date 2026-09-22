namespace MicroHelio.DTOs
{
    public class LoginResponse
    {
        public string Token { get; set; } = null!;

        public DateTime ExpiresAtUtc { get; set; }

        public string AccountId { get; set; } = null!;

        public string AccountIdentifier { get; set; } = null!;

        public string Role { get; set; } = null!;

        public string FullName { get; set; } = null!;
    }
}