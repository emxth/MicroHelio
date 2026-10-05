/*
 * Author: Arshvinth S
 * Purpose: Update an existing reservation in web-app using interactive card selectors, modal slot picker with red (reserved) / green (available) badges, date filters, and capacity rules.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

const baseUrl = API_BASE_URL;

// Keep backend validation messages readable for both JSON and plain-text responses.
async function getApiErrorMessage(response, fallback) {
  const body = await response.text();
  if (!body) return fallback;
  try {
    const data = JSON.parse(body);
    if (typeof data === 'string') return data;
    return data.error || data.message || fallback;
  } catch {
    return body;
  }
}

export default function UpdateReservationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Modal visibility states
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  // Date filter state inside slot picker modal: 'all' | 'future' | 'date'
  const [slotDateFilter, setSlotDateFilter] = useState('all');
  const [filterCustomDate, setFilterCustomDate] = useState('');

  useEffect(() => {
    async function loadReservation() {
      try {
        const [reservationResponse, nodesResponse] = await Promise.all([
          fetch(`${baseUrl}/reservations/${id}`),
          fetch(`${baseUrl}/nodes`),
        ]);

        if (!reservationResponse.ok || !nodesResponse.ok) {
          throw new Error('Could not load the reservation details.');
        }

        const reservationData = await reservationResponse.json();
        const nodesData = await nodesResponse.json();
        setReservation(reservationData);
        setNodes(nodesData);
        setSelectedNodeId(reservationData.nodeId || '');
        setSelectedSlotId(reservationData.slotId || '');
        await loadSlots(reservationData.nodeId);
      } catch (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to load reservation.' });
      } finally {
        setLoading(false);
      }
    }

    loadReservation();
  }, [id]);

  async function loadSlots(nodeId) {
    if (!nodeId) {
      setSlots([]);
      return;
    }

    const response = await fetch(`${baseUrl}/slots?nodeId=${nodeId}`);
    if (!response.ok) throw new Error('Could not load available time slots.');
    setSlots(await response.json());
  }

  async function selectNode(node) {
    setSelectedNodeId(node.id);
    setSelectedSlotId('');
    setIsNodeModalOpen(false);
    try {
      await loadSlots(node.id);
    } catch (error) {
      setSlots([]);
      setMessage({ type: 'error', text: error.message });
    }
  }

  function selectSlot(slot) {
    setSelectedSlotId(slot.id);
    setIsSlotModalOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);

    if (!selectedSlot) {
      setMessage({ type: 'error', text: 'Please select a valid time slot.' });
      return;
    }

    const originalCapacity = Number(reservation.requestedCapacityKWh);
    const availableCapacity = Number(selectedSlot.availableCapacityKWh);
    if (selectedSlotId !== reservation.slotId && originalCapacity > availableCapacity) {
      setMessage({
        type: 'error',
        text: `The selected slot does not have enough capacity (${availableCapacity} KWh available).`,
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`${baseUrl}/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          scheduledDate: selectedSlot.slotDate,
          scheduledStartTime: selectedSlot.slotStartTime,
          scheduledEndTime: selectedSlot.slotEndTime,
        }),
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(await getApiErrorMessage(response, 'Reservation update failed.'));
      }

      setMessage({ type: 'success', text: 'Reservation updated successfully.' });
      setTimeout(() => navigate('/operator/reservation-search'), 1000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Network error while updating reservation.' });
    } finally {
      setSubmitting(false);
    }
  }

  const getFilteredSlots = () => {
    if (!slots || slots.length === 0) return [];
    const todayStr = new Date().toISOString().split('T')[0];

    return slots.filter(slot => {
      const rawDate = slot.slotDate || '';
      const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

      if (slotDateFilter === 'future') {
        return dateStr >= todayStr;
      }
      if (slotDateFilter === 'date' && filterCustomDate) {
        return dateStr === filterCustomDate;
      }
      return true;
    });
  };

  if (loading) {
    return <div className="p-8 text-text-muted">Loading reservation details...</div>;
  }

  if (!reservation) {
    return <div className="p-8 text-danger">{message?.text || 'Reservation not found.'}</div>;
  }

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const filteredSlotsList = getFilteredSlots();

  return (
    <div className="relative min-h-full bg-bg-app p-4 text-text-dark sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="mx-auto w-full max-w-2xl">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-text-muted hover:text-primary bg-surface border border-border hover:border-secondary rounded-xl shadow-sm transition-all"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => navigate('/operator-dashboard')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-text-muted hover:text-primary bg-surface border border-border hover:border-secondary rounded-xl shadow-sm transition-all"
              title="Operator Dashboard"
            >
              <Home className="w-4 h-4 text-secondary" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Edit Reservation</h1>
          <p className="mt-2 text-text-muted">Choose a new available slot for this reservation.</p>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl border p-4 ${message.type === 'success' ? 'border-secondary bg-secondary text-surface' : 'border-danger/30 bg-danger/10 text-danger'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-text-muted">Prosumer NIC</p>
              <p className="font-semibold text-text-dark">{reservation.prosumerNic}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Reserved Capacity</p>
              <p className="font-semibold text-text-dark">{reservation.requestedCapacityKWh} KWh</p>
            </div>
          </div>

          {/* Interactive Microgrid Node Selector Card */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Microgrid Node <span className="text-danger">*</span>
            </label>
            <div
              onClick={() => setIsNodeModalOpen(true)}
              className="w-full cursor-pointer p-4 bg-bg-app hover:bg-success-light/30 border border-primary/30 rounded-xl flex items-center justify-between transition-all group"
            >
              <div>
                <h4 className="font-bold text-text-dark group-hover:text-primary">
                  {selectedNode ? `${selectedNode.nodeCode} - ${selectedNode.name}` : 'Click to Select Station'}
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedNode ? `Location: ${selectedNode.address || 'N/A'}` : 'Tap to open station picker'}
                </p>
              </div>
              <span className="text-primary text-sm font-bold">▼</span>
            </div>
          </div>

          {/* Interactive Time Slot Selector Card */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              New Time Slot <span className="text-danger">*</span>
            </label>
            <div
              onClick={() => {
                if (!selectedNodeId) {
                  setMessage({ type: 'error', text: 'Please select a Microgrid Station first.' });
                } else {
                  setIsSlotModalOpen(true);
                }
              }}
              className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all group ${selectedNodeId ? 'cursor-pointer bg-bg-app hover:bg-success-light/30 border-primary/30' : 'cursor-not-allowed bg-bg-app/50 border-border opacity-60'}`}
            >
              <div>
                <h4 className="font-bold text-text-dark group-hover:text-primary">
                  {selectedSlot ? `${selectedSlot.slotStartTime} - ${selectedSlot.slotEndTime}` : 'Click to Choose Time Slot'}
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedSlot
                    ? `Date: ${new Date(selectedSlot.slotDate).toLocaleDateString()} | Available Capacity: ${selectedSlot.availableCapacityKWh} KWh`
                    : 'View available & reserved slots'}
                </p>
              </div>
              <span className="text-primary text-sm font-bold">▼</span>
            </div>
          </div>

          {/* Selected Slot Details */}
          {selectedSlot && (
            <div className="p-4 bg-success-light/40 border border-secondary/30 rounded-xl">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Updated Slot Summary</span>
              <p className="text-sm font-semibold text-text-dark mt-1">
                Date: {new Date(selectedSlot.slotDate).toLocaleDateString()} | Time: {selectedSlot.slotStartTime} - {selectedSlot.slotEndTime} | Available Room: {selectedSlot.availableCapacityKWh} KWh
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <button type="button" onClick={() => navigate('/operator/reservation-search')} className="text-sm font-medium text-text-muted hover:text-danger">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#245a42] transition-all">
              {submitting ? 'Updating...' : 'Update Reservation'}
            </button>
          </div>
        </form>
      </div>

      {/* Node Selection Modal Window */}
      {isNodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-primary">Select Microgrid Station</h3>
                <p className="text-xs text-text-muted">Choose a station location to view time slots</p>
              </div>
              <button onClick={() => setIsNodeModalOpen(false)} className="text-text-muted hover:text-text-dark font-bold text-lg p-1">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-3">
              {nodes.map(node => (
                <div
                  key={node.id}
                  onClick={() => selectNode(node)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary flex items-center justify-between ${selectedNodeId === node.id ? 'border-primary bg-success-light/40' : 'border-border bg-bg-app hover:bg-surface'}`}
                >
                  <div>
                    <h4 className="font-bold text-text-dark">{node.nodeCode} - {node.name}</h4>
                    <p className="text-xs text-text-muted mt-1">Location: {node.address || 'N/A'}</p>
                    <p className="text-xs text-primary font-semibold mt-1">Battery Slots: {node.availableBatterySlots ?? 10} / {node.totalBatterySlots ?? 10} available</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${node.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {node.isActive !== false ? '● Active' : '● Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time Slot Selection Modal Window */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-xl w-full p-6 shadow-xl border border-border max-h-[85vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-primary">Select Booking Time Slot</h3>
                <p className="text-xs text-text-muted">Station: {selectedNode ? `${selectedNode.nodeCode} - ${selectedNode.name}` : ''}</p>
              </div>
              <button onClick={() => setIsSlotModalOpen(false)} className="text-text-muted hover:text-text-dark font-bold text-lg p-1">✕</button>
            </div>

            {/* Date Filter Bar */}
            <div className="py-3 border-b border-border bg-bg-app/50 -mx-6 px-6">
              <span className="text-xs font-bold text-text-dark block mb-2">Date Filter Options:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSlotDateFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${slotDateFilter === 'all' ? 'bg-primary text-surface' : 'bg-surface border border-border text-text-dark hover:bg-bg-app'}`}
                >
                  All Dates
                </button>
                <button
                  type="button"
                  onClick={() => setSlotDateFilter('future')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${slotDateFilter === 'future' ? 'bg-primary text-surface' : 'bg-surface border border-border text-text-dark hover:bg-bg-app'}`}
                >
                  From Today Onwards
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSlotDateFilter('date')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${slotDateFilter === 'date' ? 'bg-primary text-surface' : 'bg-surface border border-border text-text-dark hover:bg-bg-app'}`}
                  >
                    Select Date
                  </button>
                  {slotDateFilter === 'date' && (
                    <input
                      type="date"
                      value={filterCustomDate}
                      onChange={(e) => setFilterCustomDate(e.target.value)}
                      className="px-2 py-1 text-xs border border-border rounded-lg bg-surface text-text-dark outline-none focus:border-primary"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="py-2.5 flex items-center gap-4 text-xs font-semibold border-b border-border bg-bg-app/30 -mx-6 px-6">
              <span className="text-text-muted">Status Legend:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">● Available</span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">● Reserved</span>
            </div>

            {/* Slots List */}
            <div className="overflow-y-auto flex-1 py-4 space-y-3">
              {filteredSlotsList.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-sm font-medium">
                  No booking slots found for this station matching the date filter.
                </div>
              ) : (
                filteredSlotsList.map((slot) => {
                  const availCap = Number(slot.availableCapacityKWh ?? 0);
                  const totalCap = Number(slot.totalCapacityKWh ?? 50);
                  const isAvailableFlag = slot.isAvailable !== false && availCap > 0;

                  return (
                    <div
                      key={slot.id}
                      onClick={() => {
                        if (isAvailableFlag) {
                          selectSlot(slot);
                        } else {
                          setMessage({ type: 'error', text: 'This time slot is already reserved and unavailable.' });
                        }
                      }}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isAvailableFlag
                          ? 'cursor-pointer hover:border-primary bg-surface border-border hover:shadow-sm'
                          : 'cursor-not-allowed opacity-60 bg-red-50/40 border-red-200'
                        } ${selectedSlotId === slot.id ? 'border-primary bg-success-light/40 ring-1 ring-primary' : ''}`}
                    >
                      <div>
                        <h4 className="font-bold text-text-dark">{slot.slotStartTime} - {slot.slotEndTime}</h4>
                        <p className="text-xs text-text-muted mt-1">Scheduled Date: {new Date(slot.slotDate).toLocaleDateString()}</p>
                        <p className={`text-xs font-bold mt-1 ${isAvailableFlag ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isAvailableFlag ? `Capacity: ${availCap} / ${totalCap} KWh available` : 'Capacity: Reserved / Fully Booked'}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${isAvailableFlag ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {isAvailableFlag ? '● Available' : '● Reserved'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}