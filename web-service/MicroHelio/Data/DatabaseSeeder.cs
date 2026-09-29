using MicroHelio.DTOs;
using MicroHelio.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace MicroHelio.Data
{
    public static class DatabaseSeeder
    {
        public static async Task SeedBackofficeAsync(IServiceProvider serviceProvider)
        {
            var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseSeeder");
            var userService = serviceProvider.GetRequiredService<UserService>();
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();

            var adminUsername = configuration["SeedData:Backoffice:Username"];
            var adminPassword = configuration["SeedData:Backoffice:Password"];
            var adminEmail = configuration["SeedData:Backoffice:Email"];

            if (string.IsNullOrEmpty(adminUsername) || string.IsNullOrEmpty(adminPassword) || string.IsNullOrEmpty(adminEmail))
            {
                logger.LogInformation("Backoffice seed data is missing in configuration (e.g. user-secrets). Skipping seed.");
                return;
            }

            // Check if user exists
            var existingUser = await userService.GetByUsernameOrEmailAsync(adminUsername);
            if (existingUser != null)
            {
                logger.LogInformation($"Backoffice user '{adminUsername}' already exists in database. Skipping seed.");
                return;
            }

            var dto = new CreateUserDto
            {
                Username = adminUsername,
                Password = adminPassword,
                Email = adminEmail,
                Role = "Backoffice",
                FullName = "System Admin"
            };

            try
            {
                await userService.CreateAsync(dto);
                logger.LogInformation($"Successfully seeded initial Backoffice user '{adminUsername}'.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to seed Backoffice user.");
            }
        }
    }
}
