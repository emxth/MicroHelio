import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ErrorBanner, LoadingState, PageHeader, DetailRow, BackLink, useConfirm } from '../../components/ui/index';
import { formatDate, StatusBadge } from '../../utils/helpers';
import { getProsumerByNic, activateProsumer, reactivateProsumer } from '../../services/prosumers';
import { useAuth } from '../../context/AuthContext';

export default function ProsumerDetail() {
  const { nic } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const confirm = useConfirm();

  const [prosumer, setProsumer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(false);

  const canActivate = hasRole(['Backoffice']);

  useEffect(() => {
    async function loadProsumer() {
      try {
        const data = await getProsumerByNic(nic);
        if (!data) throw new Error('Prosumer not found.');
        setProsumer(data);
      } catch (err) {
        setError(err.message || 'Unable to load prosumer details.');
      } finally {
        setLoading(false);
      }
    }
    loadProsumer();
  }, [nic]);

  async function handleActivate() {
    if (!confirm(`Are you sure you want to activate ${prosumer.fullName}?`)) return;
    
    setSavingId(true);
    setError('');
    try {
      const updated = await activateProsumer(nic);
      setProsumer(updated);
    } catch (err) {
      setError(err.message || 'Unable to activate the prosumer.');
    } finally {
      setSavingId(false);
    }
  }

  async function handleReactivate() {
    if (!confirm(`Are you sure you want to reactivate ${prosumer.fullName}?`)) return;
    
    setSavingId(true);
    setError('');
    try {
      const updated = await reactivateProsumer(nic);
      setProsumer(updated);
    } catch (err) {
      setError(err.message || 'Unable to reactivate the prosumer.');
    } finally {
      setSavingId(false);
    }
  }

  if (loading) return <LoadingState text="Loading prosumer details…" />;

  if (!prosumer && !loading) {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <BackLink to="/prosumers" label="Back to Prosumers" navigate={navigate} />
        <ErrorBanner message={error || 'Prosumer not found'} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <BackLink to="/prosumers" label="Back to Prosumers" navigate={navigate} />
      
      <PageHeader 
        title={prosumer.fullName}
        subtitle={`NIC: ${prosumer.nic}`}
        action={
          <div className="flex gap-2">
            {canActivate && prosumer.activationStatus === 'Pending' && (
              <button type="button" disabled={savingId} onClick={handleActivate} className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50">
                {savingId ? 'Activating…' : 'Activate Prosumer'}
              </button>
            )}
            {canActivate && prosumer.activationStatus === 'Deactivated' && (
              <button type="button" disabled={savingId} onClick={handleReactivate} className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-secondary hover:bg-secondary-hover disabled:opacity-50">
                {savingId ? 'Reactivating…' : 'Reactivate Prosumer'}
              </button>
            )}
          </div>
        }
      />

      <ErrorBanner message={error} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card card-body">
          <h3 className="mb-4 text-lg font-bold text-text-dark">Profile Details</h3>
          <div className="space-y-4">
            <DetailRow label="Full Name" value={prosumer.fullName} />
            <DetailRow label="NIC" value={prosumer.nic} />
            <DetailRow label="Email Address" value={prosumer.email} />
            <DetailRow label="Phone Number" value={prosumer.phone} />
            <DetailRow label="Physical Address" value={prosumer.address} />
          </div>
        </div>

        <div className="card card-body">
          <h3 className="mb-4 text-lg font-bold text-text-dark">Account Status</h3>
          <div className="space-y-4">
            <div>
              <dt className="mb-1 text-xs font-semibold tracking-widest uppercase text-text-muted">Activation Status</dt>
              <dd><StatusBadge status={prosumer.activationStatus} /></dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-semibold tracking-widest uppercase text-text-muted">System Access (isActive)</dt>
              <dd>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${prosumer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {prosumer.isActive ? 'True (Can Login)' : 'False (Locked Out)'}
                </span>
              </dd>
            </div>
            <DetailRow label="Registered At" value={formatDate(prosumer.createdAt)} />
            {prosumer.deactivationRequestedAt && (
              <DetailRow label="Deactivated At" value={formatDate(prosumer.deactivationRequestedAt)} />
            )}
            {prosumer.reactivatedAt && (
              <DetailRow label="Last Reactivated At" value={formatDate(prosumer.reactivatedAt)} />
            )}
            {prosumer.reactivatedBy && (
              <DetailRow label="Reactivated By (User ID)" value={prosumer.reactivatedBy} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
