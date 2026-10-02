/*
 * Author: Arshvinth S
 * Purpose: Create and update energy reservations with interactive station and slot picker modal windows, red/green availability badges, date filter options, and capacity validation rules.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

const baseUrl = API_BASE_URL;

// Read API errors safely, whether the service returns JSON or plain text.
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

export default function ReservationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [nodes, setNodes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [originalReservation, setOriginalReservation] = useState(null);
  const [loading, setLoading] = useState(isEditMode); 
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal window visibility states
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  // Date filter state inside slot picker modal: 'all' | 'future' | 'date'
  const [slotDateFilter, setSlotDateFilter] = useState('all');
  const [filterCustomDate, setFilterCustomDate] = useState('');

  const [formData, setFormData] = useState({
    prosumerNic: '',
    reservationType: 'Charging',
    nodeId: '',
    slotId: '',
    requestedCapacityKWh: '',
  });

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast && toast.type !== 'error') {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type, details = null) => {
    setToast({ message, type, details });
  };

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch(`${baseUrl}/nodes`);
        if (res.ok) {
          const data = await res.json();
          setNodes(data);
        }
      } catch (err) {
        showToast('Failed to load Microgrid Nodes.', 'error');
      }
    };

    const fetchInitialData = async () => {
      await fetchNodes();
      if (isEditMode) {
        try {
          const res = await fetch(`${baseUrl}/reservations/${id}`);
          if (res.ok) {
            const data = await res.json();
            setOriginalReservation({ slotId: data.slotId, requestedCapacityKWh: Number(data.requestedCapacityKWh) });
            setFormData({
              prosumerNic: data.prosumerNic || '',
              reservationType: data.reservationType || 'Charging',
              nodeId: data.nodeId || '',
              slotId: data.slotId || '',
              requestedCapacityKWh: data.requestedCapacityKWh || '',
            });
            if (data.nodeId) {
              await fetchSlots(data.nodeId);
            }
          } else {
            showToast('Failed to load reservation details.', 'error');
          }
        } catch (err) {
          showToast('Network error while loading reservation.', 'error');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchInitialData();
  }, [id, isEditMode]);

  const fetchSlots = async (selectedNodeId) => {
    if (!selectedNodeId) {
      setSlots([]);
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/slots?nodeId=${selectedNodeId}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      } else {
        showToast('Failed to load available slots.', 'error');
      }
    } catch (err) {
      showToast('Network error while loading slots.', 'error');
    }
  };

  const selectNode = (node) => {
    setFormData((prev) => ({ ...prev, nodeId: node.id, slotId: '' }));
    fetchSlots(node.id);
    setIsNodeModalOpen(false);
  };

  const selectSlot = (slot) => {
    setFormData((prev) => ({
      ...prev,
      slotId: slot.id,
      requestedCapacityKWh: prev.requestedCapacityKWh || (slot.availableCapacityKWh ? String(slot.availableCapacityKWh) : prev.requestedCapacityKWh)
    }));
    setIsSlotModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);

    const selectedSlot = slots.find((s) => s.id === formData.slotId);
    if (!selectedSlot) {
      showToast('Please select a valid time slot.', 'error');
      setSubmitting(false);
      return;
    }

    const requestedCapacity = Number(formData.requestedCapacityKWh);
    const availableCapacity = Number(selectedSlot.availableCapacityKWh);

    if (!Number.isFinite(requestedCapacity) || requestedCapacity <= 0) {
      showToast('Capacity must be greater than zero.', 'error');
      setSubmitting(false);
      return;
    }

    if (!isEditMode && requestedCapacity > availableCapacity) {
      showToast(`Requested capacity exceeds available slot capacity (${availableCapacity} KWh).`, 'error');
      setSubmitting(false);
      return;
    }

    if (isEditMode && formData.slotId !== originalReservation?.slotId && originalReservation?.requestedCapacityKWh > availableCapacity) {
      showToast(`The selected slot does not have enough capacity (${availableCapacity} KWh available).`, 'error');
      setSubmitting(false);
      return;
    }

    const payload = isEditMode
      ? {
        slotId: formData.slotId,
        scheduledDate: selectedSlot.slotDate,
        scheduledStartTime: selectedSlot.slotStartTime,
        scheduledEndTime: selectedSlot.slotEndTime,
      }
      : {
        prosumerNic: formData.prosumerNic,
        nodeId: formData.nodeId,
        slotId: formData.slotId,
        reservationType: formData.reservationType,
        scheduledDate: selectedSlot.slotDate,
        scheduledStartTime: selectedSlot.slotStartTime,
        scheduledEndTime: selectedSlot.slotEndTime,
        requestedCapacityKWh: requestedCapacity,
      };

    try {
      const url = isEditMode 
        ? `${baseUrl}/reservations/${id}`
        : `${baseUrl}/reservations`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 201 || response.status === 204) {
        showToast(`Reservation successfully ${isEditMode ? 'updated' : 'created'}!`, 'success');
        setTimeout(() => {
          navigate('/operator/reservation-search');
        }, 1500);
      } else if (response.status === 400) {
        showToast(await getApiErrorMessage(response, 'Validation failed. Please check the rules.'), 'error');
      } else {
        showToast(await getApiErrorMessage(response, 'An unexpected error occurred.'), 'error');
      }
    } catch (err) {
      showToast('Network error while saving the reservation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter slots for modal window
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

  const selectedNode = nodes.find(n => n.id === formData.nodeId);
  const selectedSlot = slots.find(s => s.id === formData.slotId);

  const renderToast = () => {
    if (!toast) return null;
    const isSuccess = toast.type === 'success';
    
    return (
      <div className={`mb-6 p-4 rounded-xl flex items-start shadow-sm border ${isSuccess ? 'bg-secondary text-surface border-secondary' : 'bg-danger/10 text-danger border-danger/30'}`}>
        {isSuccess ? (
          <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        )}
        <div className="flex-1">
          <h4 className="font-semibold">{isSuccess ? 'Success' : 'Validation Error'}</h4>
          <p className="text-sm mt-1 opacity-90">{toast.message}</p>
        </div>
        {!isSuccess && (
          <button onClick={() => setToast(null)} className="ml-4 hover:opacity-75 focus:outline-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-full bg-bg-app flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-text-muted font-medium">Loading reservation details...</p>
      </div>
    );
  }

  const filteredSlotsList = getFilteredSlots();

  return (
    <div className="relative min-h-full bg-bg-app text-text-dark font-sans p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl">
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
          <div className="rounded-full border border-secondary/30 bg-success-light px-3 py-1 text-xs font-semibold text-primary">
            Grid Operator
          </div>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary flex items-center">
            {isEditMode ? (
              <svg className="w-8 h-8 mr-3 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            ) : (
              <svg className="w-8 h-8 mr-3 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {isEditMode ? 'Edit Reservation' : 'Create Reservation'}
          </h1>
          <p className="mt-2 text-text-muted">
            {isEditMode ? 'Modify an existing energy booking.' : 'Schedule a new energy transaction for a prosumer.'}
          </p>
        </div>

        {renderToast()}

        {/* Form Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prosumer NIC */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Prosumer NIC <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="prosumerNic"
                  required
                  disabled={isEditMode}
                  value={formData.prosumerNic}
                  onChange={handleChange}
                  placeholder="e.g. 199012345678"
                  className="w-full px-4 py-2.5 bg-bg-app border border-text-muted/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-dark disabled:opacity-60"
                />
              </div>

              {/* Reservation Type */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Reservation Type <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    disabled={isEditMode}
                    onClick={() => setFormData(prev => ({ ...prev, reservationType: 'Charging' }))}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${formData.reservationType === 'Charging' ? 'bg-primary text-surface border-primary shadow-sm' : 'bg-bg-app text-text-dark border-border hover:bg-surface'}`}
                  >
                    Charging (Consume)
                  </button>
                  <button
                    type="button"
                    disabled={isEditMode}
                    onClick={() => setFormData(prev => ({ ...prev, reservationType: 'DropOff' }))}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${formData.reservationType === 'DropOff' ? 'bg-primary text-surface border-primary shadow-sm' : 'bg-bg-app text-text-dark border-border hover:bg-surface'}`}
                  >
                    DropOff (Supply)
                  </button>
                </div>
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
                    {selectedNode ? `Location: ${selectedNode.address || 'N/A'} | Battery Slots: ${selectedNode.availableBatterySlots ?? 10} avail` : 'Tap to open station picker'}
                  </p>
                </div>
                <span className="text-primary text-sm font-bold">▼</span>
              </div>
            </div>

            {/* Interactive Time Slot Selector Card */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Available Time Slot <span className="text-danger">*</span>
              </label>
              <div
                onClick={() => {
                  if (!formData.nodeId) {
                    showToast('Please select a Microgrid Station first.', 'error');
                  } else {
                    setIsSlotModalOpen(true);
                  }
                }}
                className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all group ${formData.nodeId ? 'cursor-pointer bg-bg-app hover:bg-success-light/30 border-primary/30' : 'cursor-not-allowed bg-bg-app/50 border-border opacity-60'}`}
              >
                <div>
                  <h4 className="font-bold text-text-dark group-hover:text-primary">
                    {selectedSlot ? `${selectedSlot.slotStartTime} - ${selectedSlot.slotEndTime}` : 'Click to Choose Time Slot'}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedSlot 
                      ? `Date: ${new Date(selectedSlot.slotDate).toLocaleDateString()} | Max Capacity: ${selectedSlot.availableCapacityKWh} KWh` 
                      : (formData.nodeId ? 'View available & reserved slots' : 'Please select a station first')}
                  </p>
                </div>
                <span className="text-primary text-sm font-bold">▼</span>
              </div>
            </div>

            {/* Selected Slot Summary Card */}
            {selectedSlot && (
              <div className="p-4 bg-success-light/40 border border-secondary/30 rounded-xl">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Selected Slot Details</span>
                <p className="text-sm font-semibold text-text-dark mt-1">
                  Date: {new Date(selectedSlot.slotDate).toLocaleDateString()} | Time: {selectedSlot.slotStartTime} - {selectedSlot.slotEndTime} | Max Capacity Limit: {selectedSlot.availableCapacityKWh} KWh
                </p>
              </div>
            )}

            {/* Requested Capacity */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Requested Capacity (KWh) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                name="requestedCapacityKWh"
                required
                min="0.1"
                step="0.1"
                value={formData.requestedCapacityKWh}
                onChange={handleChange}
                placeholder="e.g. 15.5"
                className="w-full px-4 py-2.5 bg-bg-app border border-text-muted/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-dark"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-border">
              <button
                type="button"
                onClick={() => navigate('/operator/reservation-search')}
                className="text-sm font-medium text-text-muted hover:text-danger transition-colors focus:outline-none focus:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-xl text-surface bg-primary hover:bg-[#245a42] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm transform hover:scale-105 active:scale-95"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  isEditMode ? 'Save Changes' : 'Create Reservation'
                )}
              </button>
            </div>
            
          </form>
        </div>
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
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary flex items-center justify-between ${formData.nodeId === node.id ? 'border-primary bg-success-light/40' : 'border-border bg-bg-app hover:bg-surface'}`}
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
                          showToast('This time slot is already reserved and unavailable.', 'error');
                        }
                      }}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                        isAvailableFlag 
                          ? 'cursor-pointer hover:border-primary bg-surface border-border hover:shadow-sm' 
                          : 'cursor-not-allowed opacity-60 bg-red-50/40 border-red-200'
                      } ${formData.slotId === slot.id ? 'border-primary bg-success-light/40 ring-1 ring-primary' : ''}`}
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
