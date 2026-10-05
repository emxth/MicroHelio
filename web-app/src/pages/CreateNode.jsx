import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

// Central C# Web API REST Endpoint
const BASE_URL = `${API_BASE_URL}/MicrogridNodes`;

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Register New Node Component (`src/pages/CreateNode.jsx`) Backoffice portal page for registering new Microgrid Hub Stations.
 */
export default function CreateNode() {
  const navigate = useNavigate();

  // Safely extract auth session (Role Check)
  let authContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    authContext = useAuth();
  } catch (e) {
    console.warn('AuthContext not available, falling back to session storage.', e);
  }

  const session = authContext?.session || (() => {
    try {
      return JSON.parse(localStorage.getItem('microhelio_session'));
    } catch {
      return { role: 'Backoffice', email: 'admin@microgrid.com' };
    }
  })();

  const isAuthorized = session?.role === 'Backoffice' || session?.role === 'GridOperator';

  // Form State
  const [formData, setFormData] = useState({
    nodeCode: '',
    name: '',
    latitude: '',
    longitude: '',
    address: '',
    capacityKWh: '',
    totalBatterySlots: '10',
    availableBatterySlots: '10',
    openTime: '08:00',
    closeTime: '18:00',
    operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });

  // UI & Validation State
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [conflictError, setConflictError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle text & number input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-sync available slots with total slots if user modifies total battery slots
      if (name === 'totalBatterySlots' && (!prev.availableBatterySlots || prev.availableBatterySlots === prev.totalBatterySlots)) {
        updated.availableBatterySlots = value;
      }
      return updated;
    });

    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setApiError(null);
    setConflictError(null);
  };

  // Toggle individual day selection
  const handleToggleDay = (day) => {
    setFormData((prev) => {
      const currentDays = prev.operatingDaysList;
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...prev, operatingDaysList: newDays };
    });
    if (errors.operatingDays) {
      setErrors((prev) => ({ ...prev, operatingDays: null }));
    }
  };


  /**
   * Client-side Form Validation
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nodeCode.trim()) {
      newErrors.nodeCode = 'Node code is required (e.g. MGN-XXX).';
    } else if (formData.nodeCode.trim().length < 3) {
      newErrors.nodeCode = 'Node code must be at least 3 characters.';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Station name is required.';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Station address is required.';
    }

    // Latitude validation (-90 to 90)
    const lat = parseFloat(formData.latitude);
    if (formData.latitude === '' || isNaN(lat)) {
      newErrors.latitude = 'Latitude coordinate is required.';
    } else if (lat < -90 || lat > 90) {
      newErrors.latitude = 'Latitude must be between -90.0 and 90.0 degrees.';
    }

    // Longitude validation (-180 to 180)
    const lng = parseFloat(formData.longitude);
    if (formData.longitude === '' || isNaN(lng)) {
      newErrors.longitude = 'Longitude coordinate is required.';
    } else if (lng < -180 || lng > 180) {
      newErrors.longitude = 'Longitude must be between -180.0 and 180.0 degrees.';
    }

    // Capacity validation (> 0)
    const cap = parseFloat(formData.capacityKWh);
    if (formData.capacityKWh === '' || isNaN(cap) || cap <= 0) {
      newErrors.capacityKWh = 'Capacity must be a positive number greater than 0 kWh.';
    }

    // Battery slots validation (>= 1)
    const slots = parseInt(formData.totalBatterySlots, 10);
    if (formData.totalBatterySlots === '' || isNaN(slots) || slots < 1) {
      newErrors.totalBatterySlots = 'Total battery slots must be at least 1.';
    }

    const availSlots = parseInt(formData.availableBatterySlots, 10);
    if (isNaN(availSlots) || availSlots < 0 || availSlots > slots) {
      newErrors.availableBatterySlots = `Available slots must be between 0 and ${slots}.`;
    }

    if (!formData.openTime) {
      newErrors.openTime = 'Opening time is required.';
    }

    if (!formData.closeTime) {
      newErrors.closeTime = 'Closing time is required.';
    }

    if (formData.operatingDaysList.length === 0) {
      newErrors.operatingDays = 'Select at least one operating day.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission (POST /api/MicrogridNodes)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setConflictError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Format operating days string (e.g., "Mon,Tue,Wed,Thu,Fri")
    const operatingDaysString = formData.operatingDaysList.join(',');

    // Construct backend DTO payload
    const payload = {
      nodeCode: formData.nodeCode.trim().toUpperCase(),
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
      createdBy: session?.email || session?.userId || 'backoffice-operator',
    };

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      // Case 1: 409 Conflict (Duplicate NodeCode)
      if (response.status === 409) {
        const message =
          responseData.message ||
          `Microgrid Node Code "${payload.nodeCode}" already exists in the system. Please use a unique node code.`;
        setConflictError(message);
        setErrors((prev) => ({ ...prev, nodeCode: 'Duplicate node code detected' }));
        setIsSubmitting(false);
        return;
      }

      // Case 2: 400 Bad Request / Validation Failure
      if (response.status === 400) {
        if (responseData.errors) {
          // Flatten ASP.NET ModelState validation errors
          const backendFieldErrors = {};
          Object.keys(responseData.errors).forEach((key) => {
            const fieldName = key.charAt(0).toLowerCase() + key.slice(1);
            backendFieldErrors[fieldName] = responseData.errors[key].join(' ');
          });
          setErrors(backendFieldErrors);
        }
        setApiError(responseData.title || responseData.message || responseData.details || 'Validation failed on central Web API server.');
        setIsSubmitting(false);
        return;
      }

      // Case 3: Other HTTP Error Codes
      if (!response.ok) {
        throw new Error(responseData.message || responseData.details || `Failed to create microgrid node (HTTP ${response.status})`);
      }

      // Case 4: 201 Created Success
      setSuccessMessage(`Microgrid Node "${payload.name}" (${payload.nodeCode}) registered successfully! Redirecting...`);

      setTimeout(() => {
        navigate('/nodes');
      }, 1500);

    } catch (err) {
      console.error('API Error creating microgrid node:', err);
      setApiError(err.message || 'Failed to connect to microgrid central service endpoint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role Access Guard: Non-authorized users restricted
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl border border-red-200 shadow-lg p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#1B2621]">Unauthorized Access</h2>
          <p className="text-sm text-[#748C7E]">
            Node Registration is restricted to authorized operators. Your current role (<span className="text-red-600 font-semibold">{session?.role || 'Guest'}</span>) does not have permission to register microgrid hubs.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/nodes')}
              className="w-full py-2.5 bg-[#2D6A4F] text-white rounded-xl font-semibold text-sm hover:bg-[#2D6A4F]/90 transition-all shadow-sm"
            >
              Return to Hubs Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAF7] text-[#1B2621] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Navigation Breadcrumbs & Back Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#748C7E] font-medium">
            <Link to="/nodes" className="hover:text-[#2D6A4F] transition-colors">Microgrid Nodes</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1B2621] font-semibold">Register Node</span>
          </div>

          <button
            onClick={() => navigate('/nodes')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#748C7E] hover:text-[#1B2621] bg-white border border-[#748C7E]/20 px-3.5 py-1.5 rounded-xl shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Directory</span>
          </button>
        </div>

        {/* Header Title Banner */}
        <div className="bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2621] tracking-tight">
                Register New Microgrid Node
              </h1>
              <p className="text-sm text-[#748C7E] mt-0.5">
                Provision a solar microgrid station and configure energy storage capacity
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#52B788]/15 text-[#2D6A4F] border border-[#52B788]/30">
              Backoffice Operator Mode
            </span>
          </div>
        </div>

        {/* Global Success Notification */}
        {successMessage && (
          <div className="p-4 bg-[#52B788]/20 border border-[#52B788] text-[#1B2621] rounded-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 text-[#2D6A4F] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 409 Conflict Banner */}
        {conflictError && (
          <div className="p-4 bg-[#E9C46A]/25 border border-[#E9C46A] text-[#1B2621] rounded-2xl flex items-start gap-3 text-sm leading-relaxed animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-900 block mb-0.5">Registration Blocked (409 Conflict)</strong>
              <span>{conflictError}</span>
            </div>
          </div>
        )}

        {/* 400 Bad Request / Generic API Error Banner */}
        {apiError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-3 text-sm animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-red-900 block mb-0.5">Server Validation Error</strong>
              <span>{apiError}</span>
            </div>
          </div>
        )}

        {/* Main Card-Based Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT COLUMN: Identity & Location Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm space-y-5">
              <div className="border-b border-[#748C7E]/15 pb-3 flex items-center gap-2 text-[#2D6A4F]">
                <MapPin className="w-5 h-5" />
                <h2 className="text-base font-bold text-[#1B2621]">Hub Identity & Location</h2>
              </div>

              {/* Node Code */}
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Node Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nodeCode"
                  value={formData.nodeCode}
                  onChange={handleChange}
                  placeholder="e.g. MGN-XXX"
                  className={`w-full px-4 py-2.5 text-sm bg-[#F7FAF7] font-mono text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.nodeCode
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]'
                    }`}
                />
                {errors.nodeCode ? (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.nodeCode}</p>
                ) : (
                  <p className="mt-1 text-xs text-[#748C7E]"> </p>
                )}
              </div>

              {/* Station Name */}
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Station Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Colombo Central Solar Microgrid"
                  className={`w-full px-4 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.name
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]'
                    }`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.name}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5">
                  Physical Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. 142 Galle Road, Colombo 03, Sri Lanka"
                  className={`w-full px-4 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.address
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#748C7E]/30 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]'
                    }`}
                />
                {errors.address && <p className="mt-1 text-xs text-red-600 font-medium">{errors.address}</p>}
              </div>

              {/* Geographic Coordinates (Lat & Lng) */}
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="e.g. 6.9271"
                    className={`w-full px-3.5 py-2.5 text-sm font-mono bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.latitude
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#748C7E]/30 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]'
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
                    placeholder="e.g. 79.8612"
                    className={`w-full px-3.5 py-2.5 text-sm font-mono bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.longitude
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#748C7E]/30 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]'
                      }`}
                  />
                  {errors.longitude && <p className="mt-1 text-xs text-red-600 font-medium">{errors.longitude}</p>}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Capacity & Schedule Parameters */}
            <div className="bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm space-y-5">
              <div className="border-b border-[#748C7E]/15 pb-3 flex items-center gap-2 text-[#2D6A4F]">
                <Sliders className="w-5 h-5" />
                <h2 className="text-base font-bold text-[#1B2621]">Capacity & Operations</h2>
              </div>

              {/* Solar Storage Capacity (kWh) */}
              <div>
                <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Capacity (kWh) <span className="text-red-500">*</span></span>
                  <span className="text-[11px] font-normal text-[#748C7E]">Max output storage</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    name="capacityKWh"
                    value={formData.capacityKWh}
                    onChange={handleChange}
                    placeholder="e.g. 500"
                    className={`w-full pl-4 pr-16 py-2.5 text-sm font-semibold bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.capacityKWh
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#748C7E]/30 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]'
                      }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#2D6A4F] bg-[#2D6A4F]/10 px-2 py-1 rounded-lg">
                    kWh
                  </div>
                </div>
                {errors.capacityKWh && <p className="mt-1 text-xs text-red-600 font-medium">{errors.capacityKWh}</p>}
              </div>

              {/* Total & Available Battery Slots */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    <span>Total Slots</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="totalBatterySlots"
                    value={formData.totalBatterySlots}
                    onChange={handleChange}
                    min="1"
                    placeholder="e.g. 10"
                    className={`w-full px-3.5 py-2.5 text-sm font-semibold bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.totalBatterySlots
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#748C7E]/30 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]'
                      }`}
                  />
                  {errors.totalBatterySlots && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.totalBatterySlots}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-[#52B788]" />
                    <span>Available Slots</span>
                  </label>
                  <input
                    type="number"
                    name="availableBatterySlots"
                    value={formData.availableBatterySlots}
                    onChange={handleChange}
                    min="0"
                    placeholder="e.g. 10"
                    className={`w-full px-3.5 py-2.5 text-sm font-semibold bg-[#F7FAF7] text-[#1B2621] rounded-xl border transition-all focus:outline-none focus:ring-2 ${errors.availableBatterySlots
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#748C7E]/30 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]'
                      }`}
                  />
                  {errors.availableBatterySlots && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.availableBatterySlots}</p>
                  )}
                </div>
              </div>

              {/* Operating Hours (Open & Close Time) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#748C7E]" />
                    <span>Open Time</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="openTime"
                    value={formData.openTime}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F] transition-all"
                  />
                  {errors.openTime && <p className="mt-1 text-xs text-red-600 font-medium">{errors.openTime}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#748C7E]" />
                    <span>Close Time</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="closeTime"
                    value={formData.closeTime}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] rounded-xl border border-[#748C7E]/30 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F] transition-all"
                  />
                  {errors.closeTime && <p className="mt-1 text-xs text-red-600 font-medium">{errors.closeTime}</p>}
                </div>
              </div>

              {/* Operating Days Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#1B2621] uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    <span>Operating Schedule Days</span> <span className="text-red-500">*</span>
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${isSelected
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
          </div>

          {/* Form Control Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
                  <span>Registering Node...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Save & Provision Hub</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
