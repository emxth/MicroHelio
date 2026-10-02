import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Zap,
  ArrowLeft,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Battery,
  Clock,
  Calendar,
  ShieldAlert,
  RefreshCw,
  Globe,
  Sliders,
  ChevronRight,
  Lock,
  Power,
  Info
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';

// Base API URL for C# Web API endpoints
const BASE_URL = `${API_BASE_URL}/MicrogridNodes`;

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Edit Node Specifications Component (`src/pages/EditNode.jsx`)
 * Enterprise UI layer for updating existing microgrid node parameters and status.
 */
export default function EditNode() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Loading & Initial Fetch State
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Form Field State
  const [formData, setFormData] = useState({
    nodeCode: '',
    name: '',
    latitude: '',
    longitude: '',
    address: '',
    capacityKWh: '',
    totalBatterySlots: '',
    availableBatterySlots: '',
    openTime: '08:00',
    closeTime: '18:00',
    operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    isActive: true,
  });

  // Original node data snapshot to detect changes
  const [originalNode, setOriginalNode] = useState(null);

  // Validation & Submission States
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningBanner, setWarningBanner] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  /**
   * Fetch Node details on component load
   */
  useEffect(() => {
    const loadNodeDetails = async () => {
      setIsFetching(true);
      setFetchError(null);
      try {
        const response = await fetch(`${BASE_URL}/${id}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.status === 404) {
          throw new Error(`Microgrid Node with ID "${id}" was not found.`);
        }

        if (!response.ok) {
          throw new Error(`Server error loading node details (Status ${response.status}).`);
        }

        const data = await response.json();
        setOriginalNode(data);

        // Parse operating days string into array
        let daysArr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        if (data.operatingDays) {
          daysArr = data.operatingDays.split(',').map((d) => d.trim()).filter(Boolean);
        }

        setFormData({
          nodeCode: data.nodeCode || `NODE-${data.id}`,
          name: data.name || '',
          latitude: data.latitude != null ? String(data.latitude) : '',
          longitude: data.longitude != null ? String(data.longitude) : '',
          address: data.address || '',
          capacityKWh: data.capacityKWh != null ? String(data.capacityKWh) : '',
          totalBatterySlots: data.totalBatterySlots != null ? String(data.totalBatterySlots) : '10',
          availableBatterySlots: data.availableBatterySlots != null ? String(data.availableBatterySlots) : '10',
          openTime: data.openTime || '08:00',
          closeTime: data.closeTime || '18:00',
          operatingDaysList: daysArr,
          isActive: data.isActive ?? true,
        });
      } catch (err) {
        console.error('Error fetching node specifications:', err);
        setFetchError(err.message || 'Unable to connect to microgrid Web API.');
      } finally {
        setIsFetching(false);
      }
    };

    if (id) {
      loadNodeDetails();
    }
  }, [id]);

  // Toast trigger helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Input change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setWarningBanner(null);
  };

  // Toggle active status switch
  const handleToggleActive = () => {
    setFormData((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
    setWarningBanner(null);
  };

  // Operating days toggle
  const handleToggleDay = (day) => {
    setFormData((prev) => {
      const current = prev.operatingDaysList;
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...prev, operatingDaysList: updated };
    });
    setWarningBanner(null);
  };

  // Operating days preset selector
  const handleSelectDayPreset = (preset) => {
    let days = [];
    if (preset === 'ALL') days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (preset === 'WEEKDAYS') days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    setFormData((prev) => ({ ...prev, operatingDaysList: days }));
  };

  /**
   * Client-side Form Validation
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Station name is required.';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Physical address is required.';
    }

    const lat = parseFloat(formData.latitude);
    if (formData.latitude === '' || isNaN(lat)) {
      newErrors.latitude = 'Latitude coordinate is required.';
    } else if (lat < -90 || lat > 90) {
      newErrors.latitude = 'Latitude must be between -90 and 90 degrees.';
    }

    const lng = parseFloat(formData.longitude);
    if (formData.longitude === '' || isNaN(lng)) {
      newErrors.longitude = 'Longitude coordinate is required.';
    } else if (lng < -180 || lng > 180) {
      newErrors.longitude = 'Longitude must be between -180 and 180 degrees.';
    }

    const cap = parseFloat(formData.capacityKWh);
    if (formData.capacityKWh === '' || isNaN(cap) || cap <= 0) {
      newErrors.capacityKWh = 'Capacity must be greater than 0 kWh.';
    }

    const slots = parseInt(formData.totalBatterySlots, 10);
    if (formData.totalBatterySlots === '' || isNaN(slots) || slots < 1) {
      newErrors.totalBatterySlots = 'Total battery slots must be at least 1.';
    }

    const availSlots = parseInt(formData.availableBatterySlots, 10);
    if (isNaN(availSlots) || availSlots < 0 || availSlots > slots) {
      newErrors.availableBatterySlots = `Available slots must be between 0 and ${slots}.`;
    }

    if (formData.operatingDaysList.length === 0) {
      newErrors.operatingDays = 'At least one operating day must be selected.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle Form Submission (PUT /api/MicrogridNodes/{id})
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setWarningBanner(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const operatingDaysString = formData.operatingDaysList.join(',');

    // Construct PUT payload matching UpdateNodeDto
    const payload = {
      name: formData.name.trim(),
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      address: formData.address.trim(),
      capacityKWh: parseFloat(formData.capacityKWh),
      totalBatterySlots: parseInt(formData.totalBatterySlots, 10),
      availableBatterySlots: parseInt(formData.availableBatterySlots, 10),
      openTime: formData.openTime,
      closeTime: formData.closeTime,
      operatingDays: operatingDaysString,
      isActive: formData.isActive,
    };

    try {
      // 1. If deactivating an active node, check endpoint rules or perform deactivation patch if needed
      let isDeactivationAttempt = originalNode?.isActive && !formData.isActive;

      if (isDeactivationAttempt) {
        // Attempt deactivation endpoint first to verify active reservation constraint
        const deactivateCheck = await fetch(`${BASE_URL}/${id}/deactivate`, {
          method: 'PATCH',
          headers: { 'Accept': 'application/json' },
        });

        if (deactivateCheck.status === 409) {
          const deactData = await deactivateCheck.json().catch(() => ({}));
          const conflictMsg =
            deactData.message ||
            'Cannot deactivate node because active or pending energy reservations exist for this microgrid hub.';
          setWarningBanner(conflictMsg);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Perform PUT request to update specifications
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      // Handle 409 Conflict / 400 Bad Request
      if (response.status === 409) {
        setWarningBanner(responseData.message || 'Update blocked due to active reservation constraints.');
        setIsSubmitting(false);
        return;
      }

      if (response.status === 400) {
        if (responseData.errors) {
          const backendFieldErrors = {};
          Object.keys(responseData.errors).forEach((key) => {
            const fieldName = key.charAt(0).toLowerCase() + key.slice(1);
            backendFieldErrors[fieldName] = responseData.errors[key].join(' ');
          });
          setErrors(backendFieldErrors);
        }
        setWarningBanner(responseData.title || responseData.message || 'Validation failed on central Web API server.');
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        throw new Error(responseData.message || `Failed to update node specifications (Status ${response.status}).`);
      }

      // 200 OK Success
      showToast(`Specifications for node "${payload.name}" updated successfully.`);
      setTimeout(() => {
        navigate('/nodes');
      }, 1200);
    } catch (err) {
      console.error('API Error updating node:', err);
      setWarningBanner(err.message || 'An unexpected error occurred while communicating with the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Loading Spinner
  if (isFetching) {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-[#748C7E]/20 shadow-sm text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2D6A4F] mx-auto" />
          <p className="text-sm font-semibold text-[#1B2621]">Loading Microgrid Node Specifications...</p>
          <p className="text-xs text-[#748C7E]">Fetching details for Node ID: {id}</p>
        </div>
      </div>
    );
  }

  // Render Fetch Error Screen
  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#1B2621]">Failed to Load Node</h2>
          <p className="text-sm text-red-700">{fetchError}</p>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => navigate('/nodes')}
              className="flex-1 py-2.5 bg-white border border-[#748C7E]/30 text-[#1B2621] font-semibold text-sm rounded-xl hover:bg-[#F7FAF7] transition-all"
            >
              Back to Directory
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 bg-[#2D6A4F] text-white font-semibold text-sm rounded-xl hover:bg-[#2D6A4F]/90 transition-all shadow-sm"
            >
              Retry
            </button>
          </div>
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

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#748C7E] font-medium">
            <Link to="/" className="hover:text-[#2D6A4F] transition-colors">Microgrid</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/nodes" className="hover:text-[#2D6A4F] transition-colors">Hubs Directory</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1B2621] font-semibold">Edit Node Specifications</span>
          </div>

          <button
            onClick={() => navigate('/nodes')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#748C7E] hover:text-[#1B2621] bg-white border border-[#748C7E]/20 px-3.5 py-1.5 rounded-xl shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel & Return</span>
          </button>
        </div>

        {/* Header Title Banner */}
        <div className="bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2621] tracking-tight">
                  Edit Node Specifications
                </h1>
              </div>
              <p className="text-sm text-[#748C7E] mt-0.5">
                Updating technical and operational parameters for <strong className="text-[#1B2621]">{formData.name || 'Station Node'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#F7FAF7] text-[#2D6A4F] px-3 py-1.5 rounded-xl border border-[#748C7E]/20">
              {formData.nodeCode}
            </span>
          </div>
        </div>

        {/* Soft Sunlight Warning Alert Banner (#E9C46A) */}
        {warningBanner && (
          <div className="p-4 bg-[#E9C46A]/25 border border-[#E9C46A] text-[#1B2621] rounded-2xl flex items-start gap-3.5 text-sm leading-relaxed animate-in fade-in duration-200 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold text-amber-950 block mb-0.5">Action Blocked / Conflict Warning</strong>
              <span className="text-[#1B2621]">{warningBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setWarningBanner(null)}
              className="text-[#1B2621]/60 hover:text-[#1B2621] transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form Container Card */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-[#748C7E]/20 shadow-sm space-y-8">

          {/* SECTION 0: Read-Only Node Code Header */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#748C7E]" />
              <div>
                <label className="block text-xs font-bold text-[#748C7E] uppercase tracking-wider">
                  Node Code (Immutable Identifier)
                </label>
                <span className="font-mono text-sm font-bold text-[#1B2621]">{formData.nodeCode}</span>
              </div>
            </div>
            <span className="text-xs text-[#748C7E] italic hidden sm:inline">
              Assigned enterprise code cannot be modified after registration.
            </span>
          </div>

          {/* SECTION 1: Basic Station Details */}
          <div className="space-y-4">
            <div className="border-b border-[#748C7E]/15 pb-2.5 flex items-center gap-2 text-[#2D6A4F]">
              <Info className="w-4 h-4" />
              <h2 className="text-sm font-bold text-[#1B2621] uppercase tracking-wider">1. Basic Station Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Station Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Kandy Central Solar Hub"
                  className={`w-full px-4 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.name
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#52B788]/40 focus:border-[#52B788]'
                    }`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Physical Location Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. 88 Station Road, Kandy"
                  className={`w-full px-4 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.address
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#52B788]/40 focus:border-[#52B788]'
                    }`}
                />
                {errors.address && <p className="mt-1 text-xs text-red-600 font-medium">{errors.address}</p>}
              </div>
            </div>
          </div>

          {/* SECTION 2: Geography & Coordinates */}
          <div className="space-y-4">
            <div className="border-b border-[#748C7E]/15 pb-2.5 flex items-center gap-2 text-[#2D6A4F]">
              <MapPin className="w-4 h-4" />
              <h2 className="text-sm font-bold text-[#1B2621] uppercase tracking-wider">2. Geographic Coordinates</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Latitude</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="e.g. 7.2906"
                  className={`w-full px-4 py-2.5 text-sm font-mono bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.latitude
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#52B788]/40 focus:border-[#52B788]'
                    }`}
                />
                {errors.latitude && <p className="mt-1 text-xs text-red-600 font-medium">{errors.latitude}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Longitude</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="e.g. 80.6337"
                  className={`w-full px-4 py-2.5 text-sm font-mono bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.longitude
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#52B788]/40 focus:border-[#52B788]'
                    }`}
                />
                {errors.longitude && <p className="mt-1 text-xs text-red-600 font-medium">{errors.longitude}</p>}
              </div>
            </div>
          </div>

          {/* SECTION 3: Hardware & Battery Slots */}
          <div className="space-y-4">
            <div className="border-b border-[#748C7E]/15 pb-2.5 flex items-center gap-2 text-[#2D6A4F]">
              <Battery className="w-4 h-4" />
              <h2 className="text-sm font-bold text-[#1B2621] uppercase tracking-wider">3. Hardware & Storage Parameters</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Capacity (kWh) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    name="capacityKWh"
                    value={formData.capacityKWh}
                    onChange={handleChange}
                    placeholder="e.g. 750"
                    className={`w-full pl-3.5 pr-14 py-2.5 text-sm font-semibold bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.capacityKWh
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#748C7E]/30 focus:ring-[#52B788]/40 focus:border-[#52B788]'
                      }`}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#2D6A4F] bg-[#2D6A4F]/10 px-2 py-0.5 rounded">
                    kWh
                  </div>
                </div>
                {errors.capacityKWh && <p className="mt-1 text-xs text-red-600 font-medium">{errors.capacityKWh}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Total Battery Slots <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="totalBatterySlots"
                  value={formData.totalBatterySlots}
                  onChange={handleChange}
                  min="1"
                  className={`w-full px-3.5 py-2.5 text-sm font-semibold bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.totalBatterySlots
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#52B788]/40 focus:border-[#52B788]'
                    }`}
                />
                {errors.totalBatterySlots && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.totalBatterySlots}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Available Battery Slots
                </label>
                <input
                  type="number"
                  name="availableBatterySlots"
                  value={formData.availableBatterySlots}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-3.5 py-2.5 text-sm font-semibold bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.availableBatterySlots
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#52B788]/40 focus:border-[#52B788]'
                    }`}
                />
                {errors.availableBatterySlots && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.availableBatterySlots}</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: Operating Hours & Schedule */}
          <div className="space-y-4">
            <div className="border-b border-[#748C7E]/15 pb-2.5 flex items-center gap-2 text-[#2D6A4F]">
              <Clock className="w-4 h-4" />
              <h2 className="text-sm font-bold text-[#1B2621] uppercase tracking-wider">4. Operating Schedule</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Opening Time
                </label>
                <input
                  type="time"
                  name="openTime"
                  value={formData.openTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Closing Time
                </label>
                <input
                  type="time"
                  name="closeTime"
                  value={formData.closeTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 focus:border-[#52B788] transition-all"
                />
              </div>
            </div>

            {/* Days Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Operating Days</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {ALL_DAYS.map((day) => {
                  const isSelected = formData.operatingDaysList.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(day)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${isSelected
                        ? 'bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-sm'
                        : 'bg-[#F7FAF7] text-[#748C7E] border-[#748C7E]/20 hover:text-[#1B2621]'
                        }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {errors.operatingDays && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.operatingDays}</p>
              )}
            </div>
          </div>

          {/* SECTION 5: Status Control (Active / Inactive Toggle) */}
          <div className="p-5 bg-[#F7FAF7] rounded-2xl border border-[#748C7E]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${formData.isActive ? 'bg-[#52B788]/20 text-[#2D6A4F]' : 'bg-gray-200 text-gray-600'}`}>
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1B2621]">Operational Node Status</h3>
                  <p className="text-xs text-[#748C7E]">
                    Current State:{' '}
                    <strong className={formData.isActive ? 'text-[#2D6A4F]' : 'text-amber-700'}>
                      {formData.isActive ? 'Active (Operational)' : 'Inactive (Deactivated)'}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleActive}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#52B788]/50 ${formData.isActive ? 'bg-[#52B788]' : 'bg-gray-300'
                  }`}
                role="switch"
                aria-checked={formData.isActive}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formData.isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <p className="text-xs text-[#748C7E] leading-relaxed pt-1 border-t border-[#748C7E]/15">
              <strong className="text-[#1B2621]">Warning:</strong> A node cannot be deactivated if it has pending or approved energy reservations.
            </p>
          </div>

          {/* Form Action Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#748C7E]/15">
            <button
              type="button"
              onClick={() => navigate('/nodes')}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#748C7E] hover:text-[#1B2621] bg-white border border-[#748C7E]/30 hover:bg-[#F7FAF7] transition-all disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 shadow-sm hover:shadow transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Specifications</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
