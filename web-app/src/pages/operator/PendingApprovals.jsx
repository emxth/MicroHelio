/*
 * Author: Arshvinth S
 * Purpose: Review pending reservations and approve them as a grid operator.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';

const baseUrl = API_BASE_URL;

// Convert every backend error shape into one readable sentence for the user.
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

export default function PendingApprovals() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  // Auto-hide toast after 4 seconds
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

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/reservations/status/Pending`);
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Failed to fetch pending reservations.'));
      }
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      showToast(error.message || 'An error occurred while fetching data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      const operatorId = session?.accountId || session?.userId || session?.accountIdentifier;
      if (!operatorId) {
        showToast('Your operator session is missing. Please sign in again.', 'error');
        setProcessingId(null);
        return;
      }

      // Record the signed-in operator so approval history identifies the real user.
      const response = await fetch(`${baseUrl}/reservations/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify(operatorId),
      });

      if (response.status === 204 || response.ok) {
        showToast('Reservation approved successfully!', 'success');
        // Remove the approved row immediately so the list stays current without another request.
        setReservations(prev => prev.filter(res => res.id !== id));
      } else {
        showToast(await getApiErrorMessage(response, 'Failed to approve reservation.'), 'error');
      }
    } catch (error) {
      showToast('A network error occurred while approving.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const renderToast = () => {
    if (!toast) return null;

    const isSuccess = toast.type === 'success';

    return (
      <div className={`fixed bottom-6 right-6 flex items-center px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 ease-in-out ${isSuccess ? 'bg-secondary text-surface' : 'bg-danger text-surface'}`}>
        {isSuccess ? (
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="font-medium">{toast.message}</span>
        <button onClick={() => setToast(null)} className="ml-4 hover:opacity-75 focus:outline-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Pending Energy Reservations
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Review and approve pending microgrid energy reservations requested by prosumers.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-text-muted font-medium text-sm">Loading pending reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary mb-1">No pending reservations</h3>
            <p className="text-text-muted text-sm max-w-sm mx-auto">
              All caught up! There are currently no pending reservations that require your approval at this time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary text-surface uppercase text-xs tracking-wider border-b border-border">
                  <th className="py-3.5 px-4 font-semibold">Code</th>
                  <th className="py-3.5 px-4 font-semibold">Prosumer NIC</th>
                  <th className="py-3.5 px-4 font-semibold">Microgrid Node</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Time Slot</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Capacity</th>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-bg-app text-text-dark border border-border">
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
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-primary text-xs sm:text-sm">
                      {res.requestedCapacityKWh} <span className="text-xs font-normal text-text-muted">kWh</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleApprove(res.id)}
                        disabled={processingId === res.id}
                        className="inline-flex items-center justify-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-lg text-surface bg-secondary hover:bg-[#409c73] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {processingId === res.id ? (
                          <>
                            <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Approving...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {renderToast()}
    </div>
  );
}
