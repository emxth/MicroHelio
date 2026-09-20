namespace MicroHelio.Config
{
    public class MicroHelioDatabaseSettings
    {
        public string ConnectionString { get; set; } = null!;
        public string DatabaseName { get; set; } = null!;
        public string TransactionsCollectionName { get; set; } = null!;
        public string EnergyReservationsCollectionName { get; set; } = null!;
        public string EnergyBookingSlotsCollectionName { get; set; } = null!;
    }
}
