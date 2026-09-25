/*
 * Author: Ashwin
 * Purpose: Update an existing reservation using the same slot and capacity rules as the mobile app.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const baseUrl = 'http://localhost:5056/api';

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

  useEffect(() => {
    // Load the reservation and node list together before showing the form.
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

  async function handleNodeChange(event) {
    // Changing the node clears the old slot because slots belong to one node.
    const nodeId = event.target.value;
    setSelectedNodeId(nodeId);
    setSelectedSlotId('');
    try {
      await loadSlots(nodeId);
    } catch (error) {
      setSlots([]);
      setMessage({ type: 'error', text: error.message });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);

    if (!selectedSlot) {
      setMessage({ type: 'error', text: 'Please select a valid time slot.' });
      return;
    }

    // The mobile update keeps capacity unchanged and only changes the schedule.
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

  if (loading) {
    return <div className="p-8 text-text-muted">Loading reservation details...</div>;
  }

  if (!reservation) {
    return <div className="p-8 text-danger">{message?.text || 'Reservation not found.'}</div>;
  }

  return (
    <div className="relative min-h-full bg-bg-app p-4 text-text-dark sm:p-6 lg:p-8">
      <div className="absolute right-4 top-4 rounded-full border border-secondary/30 bg-success-light px-3 py-1 text-xs font-semibold text-primary sm:right-6 sm:top-6">
        Grid Operator
      </div>
      <div className="mx-auto w-full max-w-2xl">
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
              <p className="font-medium">{reservation.prosumerNic}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Reserved capacity</p>
              <p className="font-medium">{reservation.requestedCapacityKWh} KWh</p>
            </div>
          </div>

          <label className="block text-sm font-medium text-text-muted">
            Microgrid Node
            <select
              value={selectedNodeId}
              onChange={handleNodeChange}
              required
              className="mt-1 w-full rounded-xl border border-border bg-bg-app px-4 py-2.5 text-text-dark outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>Select a node</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.nodeCode} - {node.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-text-muted">
            New time slot
            <select
              value={selectedSlotId}
              onChange={(event) => setSelectedSlotId(event.target.value)}
              required
              disabled={!selectedNodeId}
              className="mt-1 w-full rounded-xl border border-border bg-bg-app px-4 py-2.5 text-text-dark outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select a time slot</option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {new Date(slot.slotDate).toLocaleDateString()} | {slot.slotStartTime} - {slot.slotEndTime} | Available: {slot.availableCapacityKWh} KWh
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <button type="button" onClick={() => navigate('/operator/reservation-search')} className="text-sm font-medium text-text-muted hover:text-danger">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Updating...' : 'Update Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}