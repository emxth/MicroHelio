/*
 * Author: Arshvinth S
 * Purpose: Search, filter, and manage energy reservations from the operator portal.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

const baseUrl = API_BASE_URL;

// Turn API validation responses into text that can be shown directly in the UI.
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

export default function ReservationSearch() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [filters, setFilters] = useState({
    nic: '',
    date: '',
    status: 'All',
    nodeId: '',
  });

  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    reservationId: null,
    reason: '',
    error: '',
    isProcessing: false,
  });

  // Load filters and the initial reservation list when the page opens.
  useEffect(() => {
    fetchNodes();
    fetchReservations();
  }, []);

  // Success and general page notifications disappear after four seconds.
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type) => {
    setToast({ message, type });
  };

  // Populate the node filter from the API.
  const fetchNodes = async () => {
    try {
      const response = await fetch(`${baseUrl}/nodes`);
      if (response.ok) {
        const data = await response.json();
        setNodes(data);
      }
    } catch (error) {
      console.error('Failed to fetch nodes', error);
    }
  };

  // Fetch reservations using the current optional filters.
  const fetchReservations = async (queryString = '') => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/reservations/search${queryString}`);
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      } else {
        showToast('Failed to fetch reservations.', 'error');
      }
    } catch (error) {
      showToast('Network error while fetching reservations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Build only the query parameters the operator actually selected.
  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const params = new URLSearchParams();
    if (filters.nic.trim()) params.append('nic', filters.nic.trim());
    if (filters.date) params.append('date', filters.date);
    if (filters.status && filters.status !== 'All') params.append('status', filters.status);
    if (filters.nodeId) params.append('nodeId', filters.nodeId);

    const queryString = params.toString();
    fetchReservations(queryString ? `?${queryString}` : '');
  };

  // Submit the cancellation reason and keep validation errors inside the modal.
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelModal.reason.trim()) {
      setCancelModal(prev => ({ ...prev, error: 'Cancellation reason is required.' }));
      return;
    }

    setCancelModal(prev => ({ ...prev, error: '', isProcessing: true }));
    try {
      const response = await fetch(`${baseUrl}/reservations/${cancelModal.reservationId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelModal.reason),
      });

      if (response.ok || response.status === 204) {
        showToast('Reservation cancelled successfully.', 'success');
        setCancelModal({ isOpen: false, reservationId: null, reason: '', error: '', isProcessing: false });
        // Refresh the table using the same filters after a successful cancellation.
        handleSearch();
      } else {
        const errorMessage = await getApiErrorMessage(response, 'Failed to cancel reservation.');
        setCancelModal(prev => ({
          ...prev,
          error: errorMessage,
          isProcessing: false,
        }));
      }
    } catch (error) {
      setCancelModal(prev => ({
        ...prev,
        error: 'A network error occurred while cancelling.',
        isProcessing: false,
      }));
    }
  };

  // Helper to render stylish status badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-light text-[#b38a2e] border border-accent/30">{status}</span>;
      case 'Approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-light text-primary border border-secondary/30">{status}</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-light text-danger border border-danger/30">{status}</span>;
      case 'Completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">{status}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const renderToast = () => {
    if (!toast) return null;
    const isSuccess = toast.type === 'success';
    return (
      <div className={`fixed bottom-6 right-6 flex items-center px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 ease-in-out z-50 ${isSuccess ? 'bg-secondary text-surface' : 'bg-danger text-surface'}`}>
        {isSuccess ? (
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        )}
        <span className="font-medium">{toast.message}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-text-muted hover:text-primary bg-surface border border-border hover:border-secondary rounded-xl shadow-sm transition-all"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <button
            onClick={() => navigate('/operator-dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-text-muted hover:text-primary bg-surface border border-border hover:border-secondary rounded-xl shadow-sm transition-all"
            title="Operator Dashboard"
          >
            <Home className="w-4 h-4 text-secondary" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
          <svg className="w-7 h-7 mr-2.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Reservation Management Tracker
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Search, filter, and manage all microgrid energy reservations.
        </p>
      </div>

      {/* Search Filter Bar */}
      <form onSubmit={handleSearch} className="bg-surface rounded-2xl shadow-sm border border-border p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 items-end">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Prosumer NIC</label>
            <input
              type="text"
              value={filters.nic}
              onChange={(e) => setFilters({ ...filters, nic: e.target.value })}
              placeholder="e.g. 199012345678"
              className="w-full px-3.5 py-2 bg-bg-app border border-border rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-xs sm:text-sm text-text-dark placeholder-text-muted/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full px-3.5 py-2 bg-bg-app border border-border rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-xs sm:text-sm text-text-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3.5 py-2 bg-bg-app border border-border rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-xs sm:text-sm text-text-dark"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Microgrid Node</label>
            <select
              value={filters.nodeId}
              onChange={(e) => setFilters({ ...filters, nodeId: e.target.value })}
              className="w-full px-3.5 py-2 bg-bg-app border border-border rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-xs sm:text-sm text-text-dark"
            >
              <option value="">All Nodes</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>{node.nodeCode} - {node.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 xl:col-span-1">
            <button
              type="submit"
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-xl text-surface bg-primary hover:bg-[#245a42] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-sm h-[38px]"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Data Table */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-text-muted font-medium text-sm">Searching reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary mb-1">No reservations match your search</h3>
            <p className="text-text-muted text-sm">Try adjusting your filters to find what you're looking for.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary text-surface uppercase text-xs tracking-wider border-b border-border">
                  <th className="py-3.5 px-4 font-semibold">Code</th>
                  <th className="py-3.5 px-4 font-semibold">Prosumer NIC</th>
                  <th className="py-3.5 px-4 font-semibold">Node</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Time Slot</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface text-sm">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-primary-light/30 transition-colors duration-150">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs font-semibold text-primary">
                      {res.reservationCode}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-text-dark font-medium text-xs sm:text-sm">
                      {res.prosumerNic}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-bg-app border border-border">
                        {res.nodeCode || res.nodeName ? `${res.nodeCode || ''} ${res.nodeName ? `· ${res.nodeName}` : ''}` : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-text-muted text-xs">
                      {res.scheduledDate ? new Date(res.scheduledDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-text-dark text-xs">
                      {res.scheduledStartTime && res.scheduledEndTime ? (
                        <div className="flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{res.scheduledStartTime} - {res.scheduledEndTime}</span>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary">
                        {res.reservationType}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(res.status)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {(res.status === 'Pending' || res.status === 'Approved') && (
                          <>
                            <Link
                              to={`/operator/reservations/${res.id}/edit`}
                              className="inline-flex items-center px-2.5 py-1 border border-secondary text-secondary hover:bg-secondary hover:text-white transition-colors text-xs font-medium rounded-lg shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Link>
                            <button
                              onClick={() => setCancelModal({ isOpen: true, reservationId: res.id, reason: '', isProcessing: false })}
                              className="inline-flex items-center px-2.5 py-1 border border-danger/30 text-xs font-medium rounded-lg text-danger bg-danger-light hover:bg-danger hover:text-surface focus:outline-none transition-all shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel
                            </button>
                          </>
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

      {renderToast()}

      {/* Keep cancellation validation inside the active dialog. */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-text-dark/40 p-4 backdrop-blur-sm transition-opacity">
          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-xl transition-all">
            <div className="px-6 py-5 border-b border-border bg-bg-app flex justify-between items-center">
              <h3 className="text-lg font-semibold text-primary">Cancel Reservation</h3>
              <button
                onClick={() => setCancelModal({ isOpen: false, reservationId: null, reason: '', error: '', isProcessing: false })}
                className="text-text-muted hover:text-danger transition-colors focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-6">
              <div className="mb-5">
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Cancellation Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                  placeholder="Please provide a reason for cancelling this reservation..."
                  className="w-full px-4 py-3 bg-bg-app border border-border rounded-xl focus:ring-2 focus:ring-danger/50 focus:border-danger outline-none transition-all text-text-dark resize-none placeholder-text-muted/60"
                ></textarea>
                <p className="mt-2 text-xs text-text-muted">This reason will be recorded and visible to the prosumer.</p>
                {cancelModal.error && (
                  <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm font-medium text-danger">
                    {cancelModal.error}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-2">
                <button
                  type="button"
                  onClick={() => setCancelModal({ isOpen: false, reservationId: null, reason: '', error: '', isProcessing: false })}
                  className="px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-muted bg-surface hover:bg-bg-app transition-colors"
                >
                  Keep Reservation
                </button>
                <button
                  type="submit"
                  disabled={cancelModal.isProcessing || !cancelModal.reason.trim()}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-surface bg-danger hover:bg-[#d03340] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {cancelModal.isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cancelling...
                    </>
                  ) : (
                    'Confirm Cancellation'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
