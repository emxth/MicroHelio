import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, StatusBadge } from '../../utils/helpers';
import { LoadingState, BackLink, DetailRow } from '../../components/ui/index';

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try { setTxn(await api.get(`/transactions/${id}`)); }
    finally { setLoading(false); }
  }

  async function markComplete() {
    const energy = window.prompt('Enter energy transferred (kWh):');
    if (energy === null || isNaN(parseFloat(energy))) return;
    setCompleting(true);
    try {
      await api.patch(`/transactions/${id}/complete`, {
        energyTransferredKWh: parseFloat(energy),
        notes: 'Confirmed by operator via web dashboard.',
      });
      showToast('Energy transfer marked as complete.', 'success');
      load();
    } catch (err) {
      showToast(err.message || 'Failed to complete transaction.', 'error');
    } finally { setCompleting(false); }
  }

  if (loading) return <LoadingState />;
  if (!txn) return (
    <div className="py-16 text-center card card-body">
      <p className="mb-4 font-semibold text-text-dark">Transaction not found</p>
      <button onClick={() => navigate('/transactions')}
        className="px-4 py-2 text-sm text-white rounded-lg bg-primary">Back to list</button>
    </div>
  );

  const canComplete = ['Initiated', 'Verified'].includes(txn.transactionStatus) && hasRole(['GridOperator']);

  const timelineSteps = [
    { label: 'Transaction created', time: txn.createdAt, done: true },
    { label: 'QR code scanned', time: txn.verifiedAt, done: !!txn.verifiedAt },
    { label: 'Server verification', time: txn.verifiedAt, done: txn.serverVerified === true },
    { label: 'Energy transfer done', time: txn.completedAt, done: !!txn.completedAt },
  ];

  return (
    <div className="max-w-4xl">
      <BackLink label="Transaction History" navigate={navigate} to="/transactions" />

      {/* Header */}
      <div className="mb-5 card card-body">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={txn.transactionStatus} />
              {txn.completedAt && (
                <span className="text-sm text-text-muted">Completed {formatDateTime(txn.completedAt)}</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-text-dark">{txn.transactionCode || txn._id}</h2>
            <p className="mt-1 text-sm text-text-muted">Created {formatDateTime(txn.createdAt)}</p>
          </div>
          {canComplete && (
            <button onClick={markComplete} disabled={completing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-secondary hover:bg-green-600 disabled:opacity-60">
              {completing && <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />}
              <CheckIcon /> Confirm Transfer Complete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Detail (2/3) */}
        <div className="space-y-5 lg:col-span-2">

          {/* Main details */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-text-dark">Transaction Details</h3></div>
            <div className="card-body">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <DetailRow label="Prosumer NIC" value={txn.prosumerNic} />
                <DetailRow label="Node" value={txn.nodeId} />
                <div>
                  <dt className="mb-1 text-xs font-semibold tracking-widest uppercase text-text-muted">Energy Transferred</dt>
                  <dd className="text-2xl font-bold text-primary">
                    {txn.energyTransferredKWh != null ? `${txn.energyTransferredKWh} kWh` : '—'}
                  </dd>
                </div>
                <DetailRow label="Operator" value={txn.operatorId} />
                <div className="sm:col-span-2">
                  <dt className="mb-1 text-xs font-semibold tracking-widest uppercase text-text-muted">Reservation ID</dt>
                  <dd className="font-mono text-xs break-all text-text-muted">{txn.reservationId || '—'}</dd>
                </div>
                <DetailRow label="Notes" value={txn.notes} />
              </dl>
            </div>
          </div>

          {/* QR Verification */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-text-dark">QR Verification</h3></div>
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                {txn.serverVerified === true
                  ? <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full bg-success-light">
                    <CheckIcon className="text-green-700" />
                  </div>
                  : txn.serverVerified === false
                    ? <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full bg-danger-light">
                      <XIcon className="text-red-600" />
                    </div>
                    : <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 border rounded-full bg-bg-app border-border">
                      <QrIcon className="text-text-muted" />
                    </div>
                }
                <div>
                  <div className={`font-semibold text-sm ${txn.serverVerified === true ? 'text-green-700' : txn.serverVerified === false ? 'text-red-700' : 'text-text-muted'}`}>
                    {txn.serverVerified === true ? 'QR payload verified successfully'
                      : txn.serverVerified === false ? 'QR verification failed'
                        : 'QR not yet scanned'}
                  </div>
                  <div className="text-xs text-text-muted">
                    {txn.verifiedAt ? `Verified at ${formatDateTime(txn.verifiedAt)}` : 'Awaiting operator scan'}
                  </div>
                </div>
              </div>
              <div className="p-3 border rounded-lg bg-bg-app border-border">
                <div className="mb-1 text-xs font-semibold tracking-widest uppercase text-text-muted">Scanned QR Payload</div>
                <div className="font-mono text-xs break-all text-text-dark">{txn.scannedQrCode || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-5">
          {/* Timeline */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-text-dark">Timeline</h3></div>
            <div className="card-body">
              {timelineSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-primary' : 'bg-bg-app border-2 border-border'}`}>
                      {step.done
                        ? <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        : <span className="block w-2 h-2 rounded-full bg-border" />}
                    </div>
                    {i < timelineSteps.length - 1 && (
                      <div className={`w-0.5 h-6 mt-1 ${step.done ? 'bg-primary opacity-30' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="pb-3">
                    <div className={`text-sm font-medium ${step.done ? 'text-text-dark' : 'text-text-muted'}`}>{step.label}</div>
                    {step.time && <div className="text-xs text-text-muted">{formatDateTime(step.time)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-text-dark">Related</h3></div>
            <div className="space-y-2 card-body">
              <button onClick={() => navigate(`/reservations/${txn.reservationId}`)}
                className="flex items-center justify-between w-full p-3 text-sm border rounded-lg border-border hover:bg-bg-app text-text-dark">
                <span>View Reservation</span>
                <ChevronIcon />
              </button>
              <button onClick={() => navigate(`/nodes/${txn.nodeId}`)}
                className="flex items-center justify-between w-full p-3 text-sm border rounded-lg border-border hover:bg-bg-app text-text-dark">
                <span>View Node</span>
                <ChevronIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className = 'text-white' }) {
  return <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
}
function XIcon({ className = '' }) {
  return <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
}
function QrIcon({ className = '' }) {
  return <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01" /></svg>;
}
function ChevronIcon() {
  return <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>;
}
