import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Battery,
  Calendar,
  Clock,
  AlertTriangle,
  Zap,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  X,
  RefreshCw,
  Sliders,
  ChevronRight,
  Power,
  Layers,
} from 'lucide-react';

// Central C# Web API REST Endpoints
const NODES_API_URL = 'http://localhost:5056/api/MicrogridNodes';
const SLOTS_API_URL = 'http://localhost:5056/api/EnergyBookingSlots';

// Node Slot & Battery Availability Management Component (`src/pages/NodeSlotManagement.jsx`)
export default function NodeSlotManagement() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Selected Date State (Defaults to Today's date YYYY-MM-DD)
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  // Data Loading States
  const [node, setNode] = useState(null);
  const [slots, setSlots] = useState([]);
  const [isLoadingNode, setIsLoadingNode] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Quick Battery Slot Adjustment State
  const [batterySlotInput, setBatterySlotInput] = useState(0);
  const [isUpdatingBattery, setIsUpdatingBattery] = useState(false);

  // Batch Generation Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({
    date: getTodayString(),
    startTime: '08:00',
    endTime: '18:00',
    capacityKWh: 50,
    durationHours: 2,
    slotType: 'DropOff',
  });
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchError, setBatchError] = useState(null);

  // Helper for numeric inputs to fix leading zero bug ("065" -> "65" or "" when cleared)
  const handleNumericInputChange = (field, value) => {
    if (value === '') {
      setBatchForm((prev) => ({ ...prev, [field]: '' }));
    } else {
      const cleaned = value.toString().replace(/^0+(?=\d)/, '');
      setBatchForm((prev) => ({ ...prev, [field]: cleaned }));
    }
  };

  // Deletion Modal State
  const [deletingSlotId, setDeletingSlotId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to display temporary toast feedback
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch Microgrid Node Station Information
  const fetchNodeInfo = async () => {
    setIsLoadingNode(true);
    try {
      const response = await fetch(`${NODES_API_URL}/${id}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to load station node (HTTP ${response.status})`);
      }

      const data = await response.json();
      setNode(data);
      setBatterySlotInput(data.availableBatterySlots ?? 0);
    } catch (err) {
      console.error('Error loading microgrid node:', err);
      setApiError(err.message || 'Unable to retrieve station details.');
    } finally {
      setIsLoadingNode(false);
    }
  };

  // Fetch Energy Booking Slots for the selected date
  const fetchSlotsByDate = async (targetDate) => {
    setIsLoadingSlots(true);
    setApiError(null);
    try {
      const url = `${SLOTS_API_URL}/node/${id}?date=${targetDate}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to load energy slots for ${targetDate}`);
      }

      const data = await response.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching slots:', err);
      setApiError(err.message || 'Error communicating with slot schedule service.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Load Node on mount / ID change
  useEffect(() => {
    if (id) {
      fetchNodeInfo();
    }
  }, [id]);

  // Load Slots whenever ID or selected date changes
  useEffect(() => {
    if (id && selectedDate) {
      fetchSlotsByDate(selectedDate);
    }
  }, [id, selectedDate]);

  // Quick Battery Slot Availability Update (PATCH /api/MicrogridNodes/{id}/battery-slots)
  const handleUpdateBatterySlots = async (newVal) => {
    if (newVal < 0 || (node && newVal > node.totalBatterySlots)) {
      return;
    }

    setIsUpdatingBattery(true);
    try {
      const response = await fetch(`${NODES_API_URL}/${id}/battery-slots`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(newVal),
      });

      if (!response.ok) {
        throw new Error(`Failed to update available battery slots (HTTP ${response.status})`);
      }

      setBatterySlotInput(newVal);
      setNode((prev) => (prev ? { ...prev, availableBatterySlots: newVal } : prev));
      showToast(`On-site available battery slots updated to ${newVal}.`);
    } catch (err) {
      console.error('Error updating battery slots:', err);
      setApiError(err.message || 'Failed to update battery slot capacity.');
    } finally {
      setIsUpdatingBattery(false);
    }
  };

  // Toggle Individual Slot Availability (PUT /api/EnergyBookingSlots/{slotId})
  const handleToggleSlotAvailability = async (slot) => {
    const updatedStatus = !slot.isAvailable;

    // Optimistic UI Update
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, isAvailable: updatedStatus } : s))
    );

    try {
      const payload = {
        totalCapacityKWh: slot.totalCapacityKWh,
        reservedCapacityKWh: slot.reservedCapacityKWh,
        availableCapacityKWh: slot.availableCapacityKWh,
        isAvailable: updatedStatus,
        slotType: slot.slotType,
      };

      const response = await fetch(`${SLOTS_API_URL}/${slot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update slot availability status`);
      }

      showToast(`Time slot (${slot.slotStartTime} - ${slot.slotEndTime}) marked as ${updatedStatus ? 'Available' : 'Unavailable'}.`);
    } catch (err) {
      console.error('Error toggling slot status:', err);
      // Revert optimistic update
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, isAvailable: slot.isAvailable } : s))
      );
      setApiError(err.message || 'Failed to update slot status on server.');
    }
  };

  // Handle Batch Slot Generation (POST /api/EnergyBookingSlots/batch-generate)
  const handleBatchGenerateSubmit = async (e) => {
    e.preventDefault();
    setBatchError(null);

    // Client-side validation: startTime must be strictly before endTime
    if (!batchForm.startTime || !batchForm.endTime) {
      setBatchError('Please specify both Start Time and End Time.');
      return;
    }

    if (batchForm.startTime >= batchForm.endTime) {
      setBatchError('Start time must be strictly before end time.');
      return;
    }

    const capacityNum = Number(batchForm.capacityKWh);
    if (!capacityNum || capacityNum <= 0) {
      setBatchError('Please provide a valid capacity per slot (greater than 0).');
      return;
    }

    const durationNum = Number(batchForm.durationHours) || 2;

    setIsGeneratingBatch(true);

    try {
      const queryParams = new URLSearchParams({
        nodeId: id,
        date: batchForm.date,
        startTime: batchForm.startTime,
        endTime: batchForm.endTime,
        capacityKWh: capacityNum,
        durationHours: durationNum,
        slotType: batchForm.slotType || 'DropOff',
      });

      const response = await fetch(`${SLOTS_API_URL}/batch-generate?${queryParams.toString()}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.message || `Batch generation failed with status ${response.status}`);
      }

      showToast(`Batch generation complete! Slots generated for ${batchForm.date}.`);
      setShowBatchModal(false);

      // If generated for currently viewed date, refresh table immediately
      if (batchForm.date === selectedDate) {
        await fetchSlotsByDate(selectedDate);
      } else {
        // Switch to the newly generated date
        setSelectedDate(batchForm.date);
      }
    } catch (err) {
      console.error('Error generating batch slots:', err);
      setBatchError(err.message || 'Failed to batch generate slot schedule.');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Delete Slot (DELETE /api/EnergyBookingSlots/{slotId})
  const handleDeleteSlotConfirm = async () => {
    if (!deletingSlotId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${SLOTS_API_URL}/${deletingSlotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete slot (HTTP ${response.status})`);
      }

      setSlots((prev) => prev.filter((s) => s.id !== deletingSlotId));
      showToast('Energy booking slot deleted successfully.');
      setDeletingSlotId(null);
    } catch (err) {
      console.error('Error deleting slot:', err);
      setApiError(err.message || 'Unable to delete energy slot.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Render Skeleton Loader for Initial Station Fetching
  if (isLoadingNode && !node) {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-[#748C7E]/20 shadow-sm text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2D6A4F] mx-auto" />
          <p className="text-sm font-semibold text-[#1B2621]">Loading Microgrid Station & Slot Schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAF7] text-[#1B2621] p-4 sm:p-6 lg:p-8 font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#2D6A4F] text-white px-5 py-3.5 rounded-xl shadow-lg border border-[#52B788]/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#52B788] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Navigation Breadcrumb & Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#748C7E] font-medium">
            <Link to="/nodes" className="hover:text-[#2D6A4F] transition-colors">Microgrid Nodes</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1B2621] font-semibold">Slot Management</span>
          </div>

          <button
            onClick={() => navigate('/nodes')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2D6A4F] hover:text-[#1B2621] bg-white border border-[#748C7E]/20 px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hubs Directory</span>
          </button>
        </div>

        {/* Station Summary Header */}
        <div className="bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2621] tracking-tight">
                  {node?.name || 'Microgrid Hub Station'}
                </h1>
                {node?.isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#52B788]/15 text-[#2D6A4F] border border-[#52B788]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] animate-pulse"></span>
                    Active Hub
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-sm text-[#748C7E] mt-0.5">
                Node Code: <strong className="font-mono text-[#1B2621]">{node?.nodeCode}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#748C7E]">
            <Clock className="w-4 h-4 text-[#2D6A4F]" />
            <span>Operating Window: <strong className="text-[#1B2621]">{node?.openTime || '08:00'} - {node?.closeTime || '18:00'}</strong></span>
          </div>
        </div>

        {/* Live Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* CARD 1: Total Node Capacity */}
          <div className="bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#748C7E] uppercase tracking-wider">Total Grid Capacity</p>
              <p className="text-3xl font-extrabold text-[#1B2621]">
                {node?.capacityKWh?.toLocaleString() || 0} <span className="text-sm text-[#748C7E] font-normal">kWh</span>
              </p>

            </div>
            <div className="p-3.5 bg-[#E9C46A]/20 text-[#1B2621] rounded-2xl">
              <Zap className="w-6 h-6" />
            </div>
          </div>

          {/* CARD 2: Operating Hours Schedule */}
          <div className="bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#748C7E] uppercase tracking-wider">Operating Schedule</p>
              <p className="text-2xl font-bold text-[#1B2621]">
                {node?.openTime || '08:00'} – {node?.closeTime || '18:00'}
              </p>

            </div>
            <div className="p-3.5 bg-[#2D6A4F]/10 text-[#2D6A4F] rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* CARD 3: Real-Time On-Site Battery Slots Widget */}
          <div className="bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#748C7E] uppercase tracking-wider">On-Site Battery Slots</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-extrabold text-[#2D6A4F]">{node?.availableBatterySlots ?? 0}</span>
                  <span className="text-sm font-semibold text-[#748C7E]">/ {node?.totalBatterySlots ?? 0} Avail.</span>
                </div>
              </div>
              <div className="p-3 bg-[#52B788]/20 text-[#2D6A4F] rounded-2xl">
                <Battery className="w-6 h-6" />
              </div>
            </div>

            {/* Quick Adjustment Counter Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleUpdateBatterySlots((node?.availableBatterySlots || 0) - 1)}
                disabled={isUpdatingBattery || (node?.availableBatterySlots || 0) <= 0}
                className="px-3 py-1.5 bg-[#F7FAF7] border border-[#748C7E]/30 rounded-xl font-bold text-sm text-[#1B2621] hover:bg-gray-100 transition-all disabled:opacity-40"
              >
                -
              </button>

              <input
                type="number"
                value={batterySlotInput}
                onChange={(e) => setBatterySlotInput(parseInt(e.target.value, 10) || 0)}
                onBlur={() => handleUpdateBatterySlots(batterySlotInput)}
                min="0"
                max={node?.totalBatterySlots || 100}
                className="w-16 py-1.5 text-center font-bold text-sm bg-[#F7FAF7] border border-[#748C7E]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]"
              />

              <button
                type="button"
                onClick={() => handleUpdateBatterySlots((node?.availableBatterySlots || 0) + 1)}
                disabled={isUpdatingBattery || (node?.availableBatterySlots || 0) >= (node?.totalBatterySlots || 0)}
                className="px-3 py-1.5 bg-[#F7FAF7] border border-[#748C7E]/30 rounded-xl font-bold text-sm text-[#1B2621] hover:bg-gray-100 transition-all disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Global API Error Alert Banner */}
        {apiError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-3 text-sm animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold text-red-900 block mb-0.5">Schedule Service Error</strong>
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => fetchSlotsByDate(selectedDate)}
              className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-semibold hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Date Selection Toolbar & Batch Generator Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#748C7E]/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* HTML5 Date Picker */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-[#2D6A4F]/10 rounded-xl text-[#2D6A4F]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#748C7E] uppercase tracking-wider">
                Select Schedule Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-0.5 px-3.5 py-1.5 text-sm font-semibold bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#52B788]"
              />
            </div>
          </div>

          {/* Batch Generation Primary Action Button */}
          <div className="w-full sm:w-auto flex items-center justify-end">
            <button
              onClick={() => {
                setBatchForm((prev) => ({ ...prev, date: selectedDate }));
                setShowBatchModal(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.98]"
            >
              <span>Create Daily Slots</span>
            </button>
          </div>
        </div>

        {/* Slot Schedule Management Table */}
        <div className="bg-white rounded-2xl border border-[#748C7E]/20 shadow-sm overflow-hidden">
          {isLoadingSlots ? (
            <div className="p-12 text-center text-[#748C7E] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#2D6A4F]" />
              <p className="text-sm font-medium">Fetching energy booking slots for {selectedDate}...</p>
            </div>
          ) : slots.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center text-[#748C7E] flex flex-col items-center justify-center gap-3">
              <div className="p-4 bg-[#F7FAF7] rounded-full text-[#748C7E]">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#1B2621]">No Energy Slots Scheduled for {selectedDate}</h3>
              <p className="text-sm text-[#748C7E] max-w-md">
                There are no active drop-off or charging time slots created for this microgrid hub on the selected date.
              </p>
              <button
                onClick={() => {
                  setBatchForm((prev) => ({ ...prev, date: selectedDate }));
                  setShowBatchModal(true);
                }}
                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white font-semibold text-xs hover:bg-[#2D6A4F]/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Slots Now</span>
              </button>
            </div>
          ) : (
            /* Data Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7FAF7] border-b border-[#748C7E]/20 text-[#1B2621] text-xs uppercase font-bold tracking-wider">
                    <th className="py-4 px-5">Time Window</th>
                    <th className="py-4 px-5">Slot Type</th>
                    <th className="py-4 px-5 text-right">Total Capacity</th>
                    <th className="py-4 px-5 text-right">Reserved</th>
                    <th className="py-4 px-5 text-right">Available</th>
                    <th className="py-4 px-5 text-center">Status Control</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#748C7E]/15 text-sm text-[#1B2621]">
                  {slots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-[#F7FAF7]/60 transition-colors">

                      {/* Time Window */}
                      <td className="py-4 px-5 font-semibold">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#748C7E]" />
                          <span>{slot.slotStartTime} - {slot.slotEndTime}</span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-4 px-5">
                        {slot.slotType === 'Charging' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/20">
                            Charging
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E9C46A]/25 text-[#1B2621] border border-[#E9C46A]">
                            DropOff
                          </span>
                        )}
                      </td>

                      {/* Total Capacity */}
                      <td className="py-4 px-5 text-right font-medium">
                        {slot.totalCapacityKWh} <span className="text-xs text-[#748C7E]">kWh</span>
                      </td>

                      {/* Reserved Capacity */}
                      <td className="py-4 px-5 text-right font-semibold text-amber-800">
                        {slot.reservedCapacityKWh} <span className="text-xs text-[#748C7E]">kWh</span>
                      </td>

                      {/* Available Capacity */}
                      <td className="py-4 px-5 text-right font-bold text-[#2D6A4F]">
                        {slot.availableCapacityKWh} <span className="text-xs text-[#748C7E]">kWh</span>
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSlotAvailability(slot)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${slot.isAvailable ? 'bg-[#52B788]' : 'bg-gray-300'
                            }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${slot.isAvailable ? 'translate-x-5' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => setDeletingSlotId(slot.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Delete Slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* BATCH SLOT GENERATION MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#748C7E]/20 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#748C7E]/20 flex items-center justify-between bg-[#F7FAF7]">
              <div className="flex items-center gap-2.5 text-[#1B2621]">
                <h3 className="text-lg font-bold">Create Slots</h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                disabled={isGeneratingBatch}
                className="text-[#748C7E] hover:text-[#1B2621] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleBatchGenerateSubmit} className="p-6 space-y-4">
              {batchError && (
                <div className="p-3.5 bg-[#E9C46A]/20 border border-[#E9C46A] text-[#1B2621] rounded-xl text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#1B2621] shrink-0 mt-0.5" />
                  <span className="font-medium">{batchError}</span>
                </div>
              )}

              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={batchForm.date}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#52B788]"
                />
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={batchForm.startTime}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#52B788]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={batchForm.endTime}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#52B788]"
                  />
                </div>
              </div>

              {/* Slot Type Selection */}
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1">
                  Trading Slot Type
                </label>
                <select
                  value={batchForm.slotType}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, slotType: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#52B788]"
                >
                  <option value="DropOff">DropOff</option>
                  <option value="Charging">Charging</option>
                </select>
              </div>

              {/* Capacity per Slot */}
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1">
                  Capacity Per Slot (kWh)
                </label>
                <input
                  type="number"
                  value={batchForm.capacityKWh}
                  onChange={(e) => handleNumericInputChange('capacityKWh', e.target.value)}
                  min="1"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#52B788]"
                />
              </div>

              <div className="p-3 bg-[#F7FAF7] rounded-xl border border-[#748C7E]/20 text-xs text-[#748C7E]">
                <p>
                  Will create time slots between <strong className="text-[#1B2621]">{batchForm.startTime || '08:00'}</strong> and <strong className="text-[#1B2621]">{batchForm.endTime || '18:00'}</strong>.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  disabled={isGeneratingBatch}
                  className="px-4 py-2 text-sm font-semibold text-[#748C7E] hover:text-[#1B2621]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingBatch}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 shadow-sm transition-all"
                >
                  {isGeneratingBatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Slots</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETION MODAL */}
      {deletingSlotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#748C7E]/20 shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-[#1B2621]">Delete Energy Slot</h3>
            </div>
            <p className="text-sm text-[#748C7E]">
              Are you sure you want to permanently delete this energy slot record?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSlotId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-[#748C7E] hover:text-[#1B2621]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSlotConfirm}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
