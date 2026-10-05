import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../utils/helpers';
import { PageHeader, StatCard, LoadingState, EmptyState } from '../../components/ui/index';

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState([]);
  const [pendingReservations, setPendingReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  // Complete modal state
  const [modal, setModal] = useState(null); // { id, code }
  const [energy, setEnergy] = useState('');
  const [notes, setNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  const [energyError, setEnergyError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Initiated & Verified transactions AND Pending Reservations
      const [initiated, verified, pendingRes] = await Promise.all([
        api.get('/transactions?status=Initiated'),
        api.get('/transactions?status=Verified'),
        api.get('/reservations/status/Pending'),
      ]);
      const combined = [...(initiated || []), ...(verified || [])];
      // Sort: Verified first (closer to completion), then Initiated
      combined.sort((a, b) => {
        if (a.transactionStatus === 'Verified' && b.transactionStatus !== 'Verified') return -1;
        if (b.transactionStatus === 'Verified' && a.transactionStatus !== 'Verified') return 1;
        return new Date(a.createdAt) - new Date(b.createdAt); // oldest first
      });
      setTransactions(combined);
      setPendingReservations(pendingRes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  // Handle quick approval of pending reservations
  async function handleApproveReservation(id) {
    setApprovingId(id);
    try {
      const operatorId = session?.accountId || session?.accountIdentifier || 'GridOperator';
      await api.patch(`/reservations/${id}/approve`, operatorId);
      showToast('Reservation approved successfully!', 'success');
      load();
    } catch (err) {
      showToast(err.message || 'Failed to approve reservation.', 'error');
    } finally {
      setApprovingId(null);
    }
  }

  // Open complete modal for a transaction
  function openModal(txn) {
    const txnId = txn.id || txn._id;
    setModal({ id: txnId, code: txn.transactionCode || txnId?.slice(-10) });
    setEnergy('');
    setNotes('');
    setEnergyError('');
  }

  function closeModal() {
    if (completing) return;
    setModal(null);
  }

  // Submit energy transfer completion
  async function handleComplete(e) {
    e.preventDefault();
    const kwh = parseFloat(energy);
    if (!energy || isNaN(kwh) || kwh <= 0) {
      setEnergyError('Please enter a valid energy amount greater than 0.');
      return;
    }
    setCompleting(true);
    try {
      await api.patch(`/transactions/${modal.id}/complete`, {
        energyTransferredKWh: kwh,
        notes: notes.trim() || 'Confirmed by operator via dashboard.',
      });
      showToast(`Transaction ${modal.code} marked as complete.`, 'success');
      setModal(null);
      load(); // refresh the list
    } catch (err) {
      showToast(err.message || 'Failed to complete transaction.', 'error');
    } finally {
      setCompleting(false);
    }
  }

  // Stats from loaded data
  const initiated = transactions.filter(t => t.transactionStatus === 'Initiated').length;
  const verified = transactions.filter(t => t.transactionStatus === 'Verified').length;

  // How long ago a transaction was created
  function timeAgo(iso) {
    if (!iso) return '—';
    // eslint-disable-next-line react-hooks/purity
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    return `${h}h ${diff % 60}m ago`;
  }

  return (
    <div>
      <PageHeader
        title="Operator Verification Dashboard"
        subtitle="Pending energy reservations awaiting approval & active transfer transactions"
        action={
          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none text-text-muted">
              <span
                onClick={() => setAutoRefresh(p => !p)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer ${autoRefresh ? 'bg-secondary' : 'bg-border'}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </span>
              Auto-refresh
            </label>
            <button onClick={load}
              className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg border-border text-text-dark hover:bg-bg-app">
              <RefreshIcon /> Refresh
            </button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Approvals"
          value={pendingReservations.length}
          sub="Reservations awaiting approval"
          valueClass={pendingReservations.length > 0 ? 'text-amber-600 font-bold' : 'text-text-muted'}
        />
        <StatCard
          label="Awaiting Completion"
          value={transactions.length}
          sub="Initiated + Verified"
          valueClass={transactions.length > 0 ? 'text-yellow-700' : 'text-secondary'}
        />
        <StatCard
          label="Initiated"
          value={initiated}
          sub="QR not yet scanned"
          valueClass="text-text-muted"
        />
        <StatCard
          label="Verified"
          value={verified}
          sub="QR scanned - ready to complete"
          valueClass="text-secondary"
        />
      </div>

      {/* Pending Reservations Awaiting Approval Card Block */}
      {pendingReservations.length > 0 && (
        <div className="mb-6 border card border-amber-300 bg-amber-50/40">
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-200 bg-amber-100/50">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white rounded-lg bg-amber-500">
                !
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-900">
                  {pendingReservations.length} Pending Reservation{pendingReservations.length > 1 ? 's' : ''} Awaiting Approval
                </h3>
                <p className="text-xs text-amber-700">Review and approve prosumer booking requests to generate QR codes</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/pending-bookings')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
              View All Approvals ({pendingReservations.length})
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold tracking-wider text-left uppercase border-b border-amber-200 bg-amber-50 text-amber-800">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Prosumer NIC</th>
                  <th className="py-2.5 px-4">Node</th>
                  <th className="py-2.5 px-4">Time Slot</th>
                  <th className="py-2.5 px-4">Capacity</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-amber-200/60">
                {pendingReservations.slice(0, 5).map(res => {
                  const resId = res.id || res._id;
                  return (
                    <tr key={resId} className="transition-colors hover:bg-amber-100/40">
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-900">{res.reservationCode}</td>
                      <td className="py-2.5 px-4 font-medium text-text-dark">{res.prosumerNic}</td>
                      <td className="py-2.5 px-4 text-text-muted">{res.nodeCode || res.nodeName || res.nodeId}</td>
                      <td className="py-2.5 px-4 text-text-dark">
                        {res.scheduledStartTime && res.scheduledEndTime ? `${res.scheduledStartTime} - ${res.scheduledEndTime}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-amber-800">{res.requestedCapacityKWh} kWh</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleApproveReservation(resId)}
                          disabled={approvingId === resId}
                          className="px-3 py-1 text-xs font-semibold text-white transition-colors rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                          {approvingId === resId ? 'Approving…' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Priority banner when verified transactions exist */}
      {verified > 0 && (
        <div className="flex items-start gap-3 p-4 mb-5 border rounded-xl"
          style={{ background: '#E8F5EE', borderColor: '#52B788' }}>
          <svg className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-800">
            <strong>{verified} transaction{verified > 1 ? 's' : ''}</strong> {verified > 1 ? 'have' : 'has'} been QR-verified and {verified > 1 ? 'are' : 'is'} ready to be marked complete.
            These are sorted to the top.
          </p>
        </div>
      )}

      {/* Transactions table */}
      <div className="card">
        {loading ? <LoadingState text="Loading pending transactions…" /> : (
          transactions.length === 0 ? (
            <div className="py-16">
              <EmptyState
                title="No pending transactions"
                desc="All transactions have been completed. Check back after prosumers present their QR codes."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Status', 'Code', 'Prosumer NIC', 'Node', 'Reservation', 'QR Verified', 'Waiting', 'Action'].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const id = t.id || t._id;
                    return (
                      <tr key={id} className="table-row">

                        {/* Status */}
                        <td className="table-td">
                          <StatusBadge status={t.transactionStatus} />
                        </td>

                        {/* Transaction code */}
                        <td className="table-td">
                          <button
                            onClick={() => navigate(`/transactions/${id}`)}
                            className="font-mono text-xs font-medium text-primary hover:underline">
                            {t.transactionCode || id?.slice(-10)}
                          </button>
                        </td>

                        {/* Prosumer */}
                        <td className="text-sm font-medium table-td text-text-dark">
                          {t.prosumerNic || '-'}
                        </td>

                        {/* Node */}
                        <td className="text-sm table-td text-text-muted">
                          {t.nodeId || '-'}
                        </td>

                        {/* Reservation ID */}
                        <td className="table-td">
                          <button
                            onClick={() => navigate(`/reservations`)}
                            className="font-mono text-xs text-primary hover:underline">
                            {t.reservationId?.slice(-8) || '—'}
                          </button>
                        </td>

                        {/* QR Verified */}
                        <td className="table-td">
                          {t.serverVerified === true
                            ? <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                              Verified
                            </span>
                            : <span className="text-xs text-text-muted">Awaiting scan</span>
                          }
                        </td>

                        {/* Time waiting */}
                        <td className="table-td">
                          {/* eslint-disable-next-line react-hooks/purity */}
                          <span className={`text-xs font-medium ${Date.now() - new Date(t.createdAt) > 3600000
                            ? 'text-danger'
                            : 'text-text-muted'
                            }`}>
                            {timeAgo(t.createdAt)}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="table-td">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(t)}
                              className="px-3 py-1.5 bg-secondary hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors">
                              Complete
                            </button>
                            <button
                              onClick={() => navigate(`/transactions/${id}`)}
                              className="px-3 py-1.5 border border-border rounded-lg text-xs text-text-dark hover:bg-bg-app transition-colors">
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Footer hint */}
        {!loading && transactions.length > 0 && (
          <div className="px-5 py-3 text-xs border-t border-border text-text-muted">
            {transactions.length} transaction{transactions.length > 1 ? 's' : ''} pending
            {autoRefresh && ' · Auto-refreshes every 30 seconds'}
          </div>
        )}
      </div>

      {/* Complete modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(27,38,33,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md border shadow-xl bg-surface rounded-2xl border-border">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-text-dark">Confirm Energy Transfer</h3>
                <p className="text-xs text-text-muted mt-0.5 font-mono">{modal.code}</p>
              </div>
              <button onClick={closeModal}
                className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg text-text-muted hover:bg-bg-app">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleComplete}>
              <div className="px-6 py-5 space-y-4">

                {/* Info block */}
                <div className="p-3 text-sm border rounded-lg bg-bg-app border-border text-text-muted">
                  Enter the actual energy transferred at the node. This action is
                  <strong className="text-text-dark"> irreversible</strong> and will mark the transaction as Completed.
                </div>

                {/* Energy input */}
                <div>
                  <label className="form-label">
                    Energy Transferred (kWh) <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={energy}
                      onChange={e => { setEnergy(e.target.value); setEnergyError(''); }}
                      className="pr-12 form-input"
                      placeholder="e.g. 24.5"
                      autoFocus
                    />
                    <span className="absolute text-sm font-medium -translate-y-1/2 right-3 top-1/2 text-text-muted">
                      kWh
                    </span>
                  </div>
                  {energyError && <p className="form-error">{energyError}</p>}
                </div>

                {/* Notes input */}
                <div>
                  <label className="form-label">Notes <span className="font-normal text-text-muted">(optional)</span></label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="resize-none form-input"
                    rows={2}
                    placeholder="Any observations or remarks…"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={completing}
                  className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-text-dark hover:bg-bg-app disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-secondary hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                  {completing
                    ? <><div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" /> Completing…</>
                    : <><CheckIcon /> Mark as Complete</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RefreshIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
}
function CheckIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
}
