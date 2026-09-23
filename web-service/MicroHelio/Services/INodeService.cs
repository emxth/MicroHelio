using MicroHelio.DTOs;
using MicroHelio.Models;

namespace MicroHelio.Services
{
    // Service contract for managing Microgrid Nodes and enforcing deactivation rules.
    public interface INodeService
    {
        Task<IEnumerable<MicrogridNode>> GetAllNodesAsync();
        Task<MicrogridNode?> GetNodeByIdAsync(string id);
        Task<MicrogridNode?> GetNodeByCodeAsync(string nodeCode);
        Task<MicrogridNode> CreateNodeAsync(CreateNodeDto dto);
        Task<MicrogridNode?> UpdateNodeAsync(string id, UpdateNodeDto dto);
        Task<bool> DeleteNodeAsync(string id);
        Task<(bool Success, string Message)> DeactivateNodeAsync(string id);
        Task<bool> UpdateBatterySlotsAsync(string id, int availableSlots);
    }
}
