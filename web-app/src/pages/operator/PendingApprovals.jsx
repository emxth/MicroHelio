/*
 * Author: Ashwin
 * Purpose: Review pending reservations and approve them as a grid operator.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const baseUrl = 'http://localhost:5056/api';

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
      if (!session?.userId) {
        showToast('Your operator session is missing. Please sign in again.', 'error');
        setProcessingId(null);
        return;
      }

      // Record the signed-in operator so approval history identifies the real user.
      const response = await fetch(`${baseUrl}/reservations/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session.userId),
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
    <div className="relative min-h-full bg-bg-app text-text-dark font-sans p-4 sm:p-6 lg:p-8">
      <div className="absolute right-4 top-4 rounded-full border border-secondary/30 bg-success-light px-3 py-1 text-xs font-semibold text-primary sm:right-6 sm:top-6">
        Grid Operator
      </div>
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <svg className="w-8 h-8 mr-3 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Pending Energy Reservations
        </h1>
        <p className="mt-2 text-text-muted">
          Review and approve pending microgrid energy reservations requested by prosumers.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden transition-all duration-300 hover:shadow-md">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-text-muted font-medium">Loading pending reservations...</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">No pending reservations</h3>
              <p className="text-text-muted max-w-sm mx-auto">
                All caught up! There are currently no pending reservations that require your approval at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary text-surface uppercase text-xs tracking-wider">
                    <th className="py-4 px-6 font-semibold">Reservation Code</th>
                    <th className="py-4 px-6 font-semibold">Prosumer NIC</th>
                    <th className="py-4 px-6 font-semibold">Microgrid Node</th>
                    <th className="py-4 px-6 font-semibold">Date</th>
                    <th className="py-4 px-6 font-semibold">Time Slot</th>
                    <th className="py-4 px-6 font-semibold">Type</th>
                    <th className="py-4 px-6 font-semibold">Capacity (KWh)</th>
                    <th className="py-4 px-6 font-semibold text-right rounded-tr-none">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface text-sm">
                  {reservations.map((res) => (
                    <tr key={res.id} className="hover:bg-primary-light transition-colors duration-150 group">
                      <td className="py-4 px-6 whitespace-nowrap font-medium text-text-dark">
                        {res.reservationCode}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-text-muted">
                        {res.prosumerNic}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-accent-light text-text-dark border border-accent/20">
                          {res.nodeCode} - {res.nodeName}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-text-dark">
                        {res.scheduledDate ? new Date(res.scheduledDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-text-dark">
                        {res.scheduledStartTime && res.scheduledEndTime ? (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {res.scheduledStartTime} - {res.scheduledEndTime}
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary">
                          {res.reservationType}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap font-semibold text-primary">
                        {res.requestedCapacityKWh}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleApprove(res.id)}
                          disabled={processingId === res.id}
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-surface bg-secondary hover:bg-[#409c73] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow"
                        >
                          {processingId === res.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Approving...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
      </div>

      {renderToast()}
    </div>
  );
}
