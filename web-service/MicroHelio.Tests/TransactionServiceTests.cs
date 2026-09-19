using MicroHelio.Config;
using MicroHelio.Models;
using MicroHelio.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Moq;
using Xunit;

namespace MicroHelio.Tests
{
    public class TransactionServiceTests
    {
        private readonly Mock<IMongoCollection<Transaction>> _mockTransactions;
        private readonly Mock<IMongoCollection<EnergyReservation>> _mockReservations;
        private readonly TransactionService _transactionService;

        public TransactionServiceTests()
        {
            // 1. Mock MongoDB Client and Database
            var mockClient = new Mock<IMongoClient>();
            var mockDatabase = new Mock<IMongoDatabase>();
            _mockTransactions = new Mock<IMongoCollection<Transaction>>();
            _mockReservations = new Mock<IMongoCollection<EnergyReservation>>();

            mockClient.Setup(c => c.GetDatabase(It.IsAny<string>(), null)).Returns(mockDatabase.Object);
            mockDatabase.Setup(d => d.GetCollection<Transaction>(It.IsAny<string>(), null)).Returns(_mockTransactions.Object);
            mockDatabase.Setup(d => d.GetCollection<EnergyReservation>("EnergyReservations", null)).Returns(_mockReservations.Object);

            // 2. Mock Database Settings
            var mockSettings = Options.Create(new MicroHelioDatabaseSettings
            {
                DatabaseName = "TestDb",
                TransactionsCollectionName = "Transactions"
            });

            // 3. Mock Configuration (for Jwt:Key)
            var inMemorySettings = new Dictionary<string, string?> {
                {"Jwt:Key", "SuperSecretKeyThatIsAtLeast32BytesLongForHMACSHA256"}
            };
            IConfiguration configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();

            // 4. Initialize Service
            _transactionService = new TransactionService(mockClient.Object, mockSettings, configuration);
        }

        [Fact]
        public async Task VerifyQrPayloadAsync_WithTamperedSignature_ReturnsFalse()
        {
            // Arrange: A JSON payload where the signature does not match the data
            string tamperedPayload = "{\"reservationId\":\"64f1a2b3c4d5e6f7a8b9c0d1\",\"prosumerNic\":\"19951234567V\",\"nodeId\":\"64f1a2b3c4d5e6f7a8b9c0d2\",\"scheduledDate\":\"2026-09-20\",\"hmacSignature\":\"TamperedInvalidSignature123=\"}";

            // Act
            var result = await _transactionService.VerifyQrPayloadAsync(tamperedPayload);

            // Assert
            Assert.False(result);
        }
    }
}