/*
 * Author: Ashwin
 * Purpose: Create and update energy reservations with the same slot capacity rules as the mobile app.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const baseUrl = 'http://localhost:5056/api';

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
  
  const [loading, setLoading] = useState(isEditMode); // True initially if editing
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    prosumerNic: '',
    reservationType: 'Charging',
    nodeId: '',
    slotId: '',
    requestedCapacityKWh: '',
  });

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast && toast.type !== 'error') { // Keep errors visible until dismissed
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
    // Load nodes first, then load the existing reservation when editing.
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
            // Editing needs the old node's slots so its current slot can be selected.
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

  // Refresh the slot choices whenever the operator selects another node.
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

  const handleNodeChange = (e) => {
    const selectedNodeId = e.target.value;
    setFormData((prev) => ({ ...prev, nodeId: selectedNodeId, slotId: '' }));
    fetchSlots(selectedNodeId);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);

    // The selected slot supplies the date and exact start/end times.
    const selectedSlot = slots.find((s) => s.id === formData.slotId);
    if (!selectedSlot) {
      showToast('Please select a valid time slot.', 'error');
      setSubmitting(false);
      return;
    }

    const requestedCapacity = Number(formData.requestedCapacityKWh);
    const availableCapacity = Number(selectedSlot.availableCapacityKWh);

    // Match mobile create validation: capacity must be positive and fit the slot.
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

    // Updates keep the original capacity; a different slot must have enough room.
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

  return (
    <div className="relative min-h-full bg-bg-app text-text-dark font-sans p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="absolute right-4 top-4 rounded-full border border-secondary/30 bg-success-light px-3 py-1 text-xs font-semibold text-primary sm:right-6 sm:top-6">
        Grid Operator
      </div>
      <div className="w-full max-w-2xl">
        
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
                  value={formData.prosumerNic}
                  onChange={handleChange}
                  placeholder="e.g. 199012345678"
                  className="w-full px-4 py-2.5 bg-bg-app border border-text-muted/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-dark"
                />
              </div>

              {/* Reservation Type */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Reservation Type <span className="text-danger">*</span>
                </label>
                <select
                  name="reservationType"
                  required
                  value={formData.reservationType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-bg-app border border-text-muted/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-dark appearance-none"
                >
                  <option value="Charging">Charging (Consume Energy)</option>
                  <option value="DropOff">DropOff (Supply Energy)</option>
                </select>
              </div>
            </div>

            {/* Microgrid Node */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Microgrid Node <span className="text-danger">*</span>
              </label>
              <select
                name="nodeId"
                required
                value={formData.nodeId}
                onChange={handleNodeChange}
                className="w-full px-4 py-2.5 bg-bg-app border border-text-muted/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-dark appearance-none"
              >
                <option value="" disabled>Select a Node</option>
                {nodes.map(node => (
                  <option key={node.id} value={node.id}>{node.nodeCode} - {node.name}</option>
                ))}
              </select>
            </div>

            {/* Available Time Slot */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">
                Available Time Slot <span className="text-danger">*</span>
              </label>
              <select
                name="slotId"
                required
                value={formData.slotId}
                onChange={handleChange}
                disabled={!formData.nodeId}
                className="w-full px-4 py-2.5 bg-bg-app border border-text-muted/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-dark appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled>{formData.nodeId ? 'Select a Time Slot' : 'Please select a node first'}</option>
                {slots.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {new Date(slot.slotDate).toLocaleDateString()} | {slot.slotStartTime} - {slot.slotEndTime} | Available: {slot.availableCapacityKWh} KWh
                  </option>
                ))}
              </select>
              {slots.length === 0 && formData.nodeId && (
                <p className="mt-1 text-xs text-accent font-medium">No slots found for this node.</p>
              )}
            </div>

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
    </div>
  );
}
