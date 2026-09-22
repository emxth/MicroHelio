namespace MicroHelio.Config
{
    public class MicroHelioDatabaseSettings
    {
        public string ConnectionString { get; set; } = "mongodb://localhost:27017";
        public string DatabaseName { get; set; } = "MicroHelioDb";
        public string TransactionsCollectionName { get; set; } = "Transaction";
        public string MicrogridNodesCollectionName { get; set; } = "microgrid_node";
        public string EnergyBookingSlotsCollectionName { get; set; } = "energy_booking_slot";
        public string EnergyReservationsCollectionName { get; set; } = "energy_reservation";
    }
}
