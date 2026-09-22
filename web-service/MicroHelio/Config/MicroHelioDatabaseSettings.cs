namespace MicroHelio.Config
{
    public class MicroHelioDatabaseSettings
    {
        public string ConnectionString { get; set; } = null!;
        public string DatabaseName { get; set; } = null!;
        public string TransactionsCollectionName { get; set; } = null!;
        public string UsersCollectionName { get; set; } = null!;
        public string ProsumersCollectionName { get; set; } = null!;
    }
}
