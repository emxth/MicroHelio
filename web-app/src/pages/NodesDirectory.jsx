import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Edit,
  Power,
  MapPin,
  Zap,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Battery,
  Layers,
  ShieldAlert,
  Sliders,
  ChevronRight,
  Activity
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Base API URL pointing to the central C# Web API on IIS / Localhost
const BASE_URL = `${API_BASE_URL}/MicrogridNodes`;

// Microgrid Hubs Directory Page Component (Smart Solar Microgrid Nodes & Battery Slots)
export default function NodesDirectory() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isBackoffice = hasRole(['Backoffice']);
  const canManageNodes = hasRole(['Backoffice', 'GridOperator']);

  // State Management
  const [nodes, setNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Modal State for Deactivation
  const [deactivateModalNode, setDeactivateModalNode] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [modalConflictError, setModalConflictError] = useState(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch all Microgrid Nodes from backend REST endpoint
  const fetchNodes = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(BASE_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load microgrid hubs. Server status: ${response.status}`);
      }

      const data = await response.json();
      setNodes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching microgrid nodes:', err);
      setFetchError(err.message || 'Unable to connect to microgrid network API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  // Toast helper trigger
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filter nodes locally based on nodeCode or name, and status toggle
  const filteredNodes = nodes.filter((node) => {
    const matchesQuery =
      (node.nodeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (node.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (node.address || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ACTIVE') return matchesQuery && node.isActive;
    if (statusFilter === 'INACTIVE') return matchesQuery && !node.isActive;
    return matchesQuery;
  });

  // Calculate summary metrics for statistics bar
  const totalCapacity = nodes.reduce((acc, curr) => acc + (curr.capacityKWh || 0), 0);
  const totalAvailableSlots = nodes.reduce((acc, curr) => acc + (curr.availableBatterySlots || 0), 0);
  const totalSlots = nodes.reduce((acc, curr) => acc + (curr.totalBatterySlots || 0), 0);
  const activeCount = nodes.filter((n) => n.isActive).length;

  // Open Deactivation Modal
  const handleOpenDeactivateModal = (node) => {
    setDeactivateModalNode(node);
    setModalConflictError(null);
  };

  // Close Deactivation Modal
  const handleCloseModal = () => {
    if (isDeactivating) return; // Prevent closing while API request is in progress
    setDeactivateModalNode(null);
    setModalConflictError(null);
  };

  // Execute PATCH /api/MicrogridNodes/{id}/deactivate API call
  const handleConfirmDeactivate = async () => {
    if (!deactivateModalNode) return;

    setIsDeactivating(true);
    setModalConflictError(null);

    try {
      const response = await fetch(`${BASE_URL}/${deactivateModalNode.id}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const responseData = await response.json().catch(() => ({}));

      // Case 1: Active reservations conflict (409 Conflict)
      if (response.status === 409) {
        const errorMsg =
          responseData.message ||
          'Node cannot be deactivated because there are active energy bookings or slot reservations attached to this microgrid hub.';
        setModalConflictError(errorMsg);
        setIsDeactivating(false);
        return;
      }

      // Case 2: Other API error status
      if (!response.ok) {
        throw new Error(
          responseData.message || `Deactivation failed with HTTP status ${response.status}`
        );
      }

      // Case 3: 200 OK Success
      showToast(`Microgrid Node "${deactivateModalNode.name}" (${deactivateModalNode.nodeCode}) was successfully deactivated.`);
      handleCloseModal();
      await fetchNodes(); // Refresh list to reflect state changes
    } catch (err) {
      console.error('Error during node deactivation:', err);
      setModalConflictError(err.message || 'An unexpected error occurred while communicating with the server.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF7] text-[#1B2621] p-4 sm:p-6 lg:p-8 pb-24 font-sans">
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

      {/* Outer Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title & Top Controls Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#748C7E]/20 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2621] tracking-tight">
                  Microgrid Hubs Directory
                </h1>
                <p className="text-sm text-[#748C7E] mt-0.5">
                  Enterprise Node Management & Battery Slot Provisioning System
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchNodes}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#748C7E]/30 bg-white text-[#1B2621] hover:bg-[#F7FAF7] transition-all font-medium text-sm shadow-sm disabled:opacity-50 cursor-pointer"
              title="Refresh Directory Data"
            >
              <RefreshCw className={`w-4 h-4 text-[#748C7E] ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {canManageNodes && (
              <button
                onClick={() => navigate('/nodes/create')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Register New Node</span>
              </button>
            )}
          </div>
        </div>

        {/* Enterprise Metrics Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#748C7E]/20 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#2D6A4F]/10 rounded-xl text-[#2D6A4F]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#748C7E] uppercase tracking-wider">Total Microgrid Nodes</p>
              <p className="text-2xl font-bold text-[#1B2621]">{nodes.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#748C7E]/20 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#52B788]/15 rounded-xl text-[#2D6A4F]">
              <Activity className="w-5 h-5 text-[#2D6A4F]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#748C7E] uppercase tracking-wider">Active Nodes</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#1B2621]">{activeCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#748C7E]/20 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#E9C46A]/20 rounded-xl text-[#1B2621]">
              <Zap className="w-5 h-5 text-[#1B2621]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#748C7E] uppercase tracking-wider">Grid Capacity</p>
              <p className="text-2xl font-bold text-[#1B2621]">{totalCapacity.toLocaleString()} <span className="text-xs text-[#748C7E] font-normal">kWh</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#748C7E]/20 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#2D6A4F]/10 rounded-xl text-[#2D6A4F]">
              <Battery className="w-5 h-5 text-[#2D6A4F]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#748C7E] uppercase tracking-wider">Battery Slots</p>
              <p className="text-2xl font-bold text-[#1B2621]">{totalAvailableSlots} <span className="text-xs text-[#748C7E] font-normal">/ {totalSlots} Avail.</span></p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-[#748C7E]/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Bar Input */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#748C7E]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by Node Code or Hub Name..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F7FAF7] text-[#1B2621] placeholder-[#748C7E]/70 rounded-xl border border-[#748C7E]/20 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#748C7E] hover:text-[#1B2621] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter Toggle Tabs */}
          <div className="flex items-center gap-1 bg-[#F7FAF7] p-1 rounded-xl border border-[#748C7E]/20 w-full sm:w-auto">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${statusFilter === status
                  ? 'bg-white text-[#2D6A4F] shadow-sm border border-[#748C7E]/20'
                  : 'text-[#748C7E] hover:text-[#1B2621]'
                  }`}
              >
                {status === 'ALL' ? 'All Hubs' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        {/* Global Fetch Error Banner */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Failed to synchronize node data</p>
              <p className="mt-0.5 text-red-700">{fetchError}</p>
            </div>
            <button
              onClick={fetchNodes}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Data Directory Table / Cards View */}
        <div className="bg-white rounded-2xl border border-[#748C7E]/20 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-[#748C7E] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#2D6A4F]" />
              <p className="text-sm font-medium">Connecting to microgrid API & retrieving nodes...</p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="p-12 text-center text-[#748C7E] flex flex-col items-center justify-center gap-3">
              <div className="p-4 bg-[#F7FAF7] rounded-full">
                <Search className="w-8 h-8 text-[#748C7E]/60" />
              </div>
              <h3 className="text-base font-semibold text-[#1B2621]">No microgrid nodes found</h3>
              <p className="text-sm text-[#748C7E] max-w-md">
                {searchTerm
                  ? `No nodes matching query "${searchTerm}". Try adjusting search filters.`
                  : 'No nodes are currently registered in the database.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                  }}
                  className="mt-2 text-xs font-semibold text-[#2D6A4F] hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7FAF7] border-b border-[#748C7E]/20 text-[#1B2621] text-xs uppercase font-bold tracking-wider">
                    <th className="py-4 px-5">Node ID</th>
                    <th className="py-4 px-5">Station Name</th>
                    <th className="py-4 px-5">Location Coordinates</th>
                    <th className="py-4 px-5 text-right">Capacity (kWh)</th>
                    <th className="py-4 px-5 text-center">Battery Slots</th>
                    <th className="py-4 px-5">Operating Hours</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#748C7E]/15 text-sm text-[#1B2621]">
                  {filteredNodes.map((node) => (
                    <tr
                      key={node.id}
                      className="hover:bg-[#F7FAF7]/60 transition-colors"
                    >
                      {/* Node ID & Code */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-[#2D6A4F] whitespace-nowrap">
                            {node.nodeCode || `NODE-${node.id}`}
                          </span>
                        </div>
                      </td>

                      {/* Station Name */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-[#1B2621]">{node.name}</div>
                        <div className="text-xs text-[#748C7E] truncate max-w-xs">{node.address}</div>
                      </td>

                      {/* Location (Address & Coordinates) */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-xs text-[#1B2621]">
                          <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                          <span className="font-mono">
                            {node.latitude != null && node.longitude != null
                              ? `${Number(node.latitude).toFixed(4)}°, ${Number(node.longitude).toFixed(4)}°`
                              : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Capacity (kWh) */}
                      <td className="py-4 px-5 text-right font-semibold">
                        <span className="bg-[#2D6A4F]/5 text-[#2D6A4F] px-2.5 py-1 rounded-lg border border-[#2D6A4F]/10">
                          {node.capacityKWh != null ? node.capacityKWh.toLocaleString() : '0'} kWh
                        </span>
                      </td>

                      {/* Battery Slots (Available / Total) */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F7FAF7] border border-[#748C7E]/20 rounded-lg text-xs font-semibold">
                          <Battery className="w-3.5 h-3.5 text-[#52B788]" />
                          <span>
                            <strong className="text-[#2D6A4F]">{node.availableBatterySlots ?? 0}</strong>
                            <span className="text-[#748C7E]"> / {node.totalBatterySlots ?? 0}</span>
                          </span>
                        </div>
                      </td>

                      {/* Operating Hours */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-xs text-[#748C7E]">
                          <Clock className="w-3.5 h-3.5 text-[#748C7E]" />
                          <span className="font-medium text-[#1B2621]">
                            {node.openTime || '00:00'} - {node.closeTime || '23:59'}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-5 text-center">
                        {node.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#52B788]/15 text-[#2D6A4F] border border-[#52B788]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit Node Button */}
                          <button
                            onClick={() => navigate(`/nodes/edit/${node.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#748C7E]/30 bg-white hover:bg-[#2D6A4F] hover:text-white hover:border-[#2D6A4F] text-xs font-semibold text-[#1B2621] shadow-sm transition-all cursor-pointer"
                            title="Edit Node Specifications"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Manage Battery Slots Button */}
                          <button
                            onClick={() => navigate(`/nodes/${node.id}/slots`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A4F]/10 hover:bg-[#2D6A4F] hover:text-white border border-[#2D6A4F]/20 text-xs font-semibold text-[#2D6A4F] shadow-sm transition-all cursor-pointer"
                            title="Manage Battery Slots & Schedule"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Slots</span>
                          </button>

                          {/* Deactivate Button (Enabled if Active & Backoffice role) */}
                          {isBackoffice && (
                            <button
                              onClick={() => handleOpenDeactivateModal(node)}
                              disabled={!node.isActive}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${node.isActive
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 cursor-pointer'
                                : 'text-gray-300 bg-gray-50 border-gray-200 cursor-not-allowed'
                                }`}
                              title={node.isActive ? 'Deactivate Node' : 'Node is already inactive'}
                            >
                              <Power className="w-3.5 h-3.5" />
                              
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Deactivation Confirmation Modal */}
      {deactivateModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#748C7E]/20 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#748C7E]/20 flex items-center justify-between bg-[#F7FAF7]">
              <div className="flex items-center gap-2.5 text-[#1B2621]">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">Confirm Node Deactivation</h3>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isDeactivating}
                className="text-[#748C7E] hover:text-[#1B2621] p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#1B2621]">
                Are you sure you want to deactivate microgrid hub{' '}
                <strong className="text-[#2D6A4F]">{deactivateModalNode.name}</strong> (
                <span className="font-mono text-xs bg-[#F7FAF7] px-1.5 py-0.5 rounded border border-[#748C7E]/20">
                  {deactivateModalNode.nodeCode || deactivateModalNode.id}
                </span>
                )?
              </p>

              <div className="p-3 bg-[#F7FAF7] rounded-xl border border-[#748C7E]/20 text-xs text-[#748C7E] space-y-1">
                <p>
                  <strong className="text-[#1B2621]">Notice:</strong> Active reservations or booking commitments attached to this node will prevent deactivation.
                </p>
              </div>

              {/* 409 Conflict / Error Warning Banner */}
              {modalConflictError && (
                <div className="p-4 bg-[#E9C46A]/20 border border-[#E9C46A] text-[#1B2621] rounded-xl flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-200">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-amber-900 block mb-0.5">
                      Deactivation Blocked (409 Conflict)
                    </strong>
                    <span>{modalConflictError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-[#748C7E]/20 bg-[#F7FAF7] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isDeactivating}
                className="px-4 py-2 text-sm font-semibold text-[#748C7E] hover:text-[#1B2621] hover:bg-white rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isDeactivating}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {isDeactivating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deactivating...</span>
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    <span>Confirm Deactivation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
