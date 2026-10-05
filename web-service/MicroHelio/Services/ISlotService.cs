/* 
 * Purpose: Service interface contract for managing energy booking slots and schedule generation.
 */
using MicroHelio.DTOs;
using MicroHelio.Models;

namespace MicroHelio.Services
{
    // Contract for managing energy drop-off and charging slots.
    public interface ISlotService
    {
        Task<IEnumerable<EnergyBookingSlot>> GetSlotsByNodeAsync(string nodeId);
        Task<IEnumerable<EnergyBookingSlot>> GetSlotsByNodeAndDateAsync(string nodeId, DateTime date);
        Task<EnergyBookingSlot?> GetSlotByIdAsync(string id);
        Task<EnergyBookingSlot> CreateSlotAsync(CreateSlotDto dto);
        Task<EnergyBookingSlot?> UpdateSlotAsync(string id, UpdateSlotDto dto);
        Task<bool> DeleteSlotAsync(string id);
        Task<IEnumerable<EnergyBookingSlot>> BatchGenerateSlotsAsync(string nodeId, DateTime date, string startTime, string endTime, double capacityKWh, string slotType = "DropOff");
    }
}
