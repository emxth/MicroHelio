import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner, EmptyState, LoadingState, PageHeader, Pagination, SearchBar, useConfirm } from '../../components/ui/index';
import { formatDate, StatusBadge } from '../../utils/helpers';
import { getProsumers, activateProsumer, reactivateProsumer } from '../../services/prosumers';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 10;

export default function ProsumerList({ defaultStatus = '' }) {
  const { hasRole } = useAuth();
  const confirm = useConfirm();
  
  const [prosumers, setProsumers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(defaultStatus);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const canActivate = hasRole(['Backoffice']);

  async function loadProsumers() {
    setLoading(true);
    setError('');
    try {
      setProsumers(await getProsumers() || []);
    } catch (err) {
      setError(err.message || 'Unable to load prosumers.');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setStatus(defaultStatus);
    loadProsumers();
  }, [defaultStatus]);

  const filteredProsumers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return prosumers.filter(p => {
      const matchesSearch = !query || [p.nic, p.fullName, p.email, p.phone]
        .some(value => value?.toLowerCase().includes(query));
      const matchesStatus = !status || p.activationStatus === status;
      return matchesSearch && matchesStatus;
    });
  }, [prosumers, search, status]);

  const visibleProsumers = filteredProsumers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  async function handleActivate(prosumer) {
    if (!confirm(`Are you sure you want to activate ${prosumer.fullName}?`)) return;
    
    setSavingId(prosumer.nic);
    setError('');
    try {
      const updated = await activateProsumer(prosumer.nic);
      setProsumers(current => current.map(item => item.nic === prosumer.nic ? updated : item));
    } catch (err) {
      setError(err.message || 'Unable to activate the prosumer.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleReactivate(prosumer) {
    if (!confirm(`Are you sure you want to reactivate ${prosumer.fullName}?`)) return;
    
    setSavingId(prosumer.nic);
    setError('');
    try {
      const updated = await reactivateProsumer(prosumer.nic);
      setProsumers(current => current.map(item => item.nic === prosumer.nic ? updated : item));
    } catch (err) {
      setError(err.message || 'Unable to reactivate the prosumer.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={defaultStatus === 'Pending' ? "Pending Activations" : "All Prosumers"}
        subtitle="Manage prosumer registrations and activations."
      />

      <ErrorBanner message={error} />

      <div className="p-4 mb-5 card">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={search} onChange={value => updateFilter(setSearch, value)} placeholder="Search NIC, name, email, phone…" />
          {!defaultStatus && (
            <select value={status} onChange={event => updateFilter(setStatus, event.target.value)} className="form-input" style={{ width: 'auto' }}>
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          )}
          <button type="button" onClick={loadProsumers} className="px-3 py-2 text-sm border rounded-lg border-border text-text-dark hover:bg-bg-app">Refresh</button>
        </div>
      </div>

      <div className="card">
        {loading ? <LoadingState text="Loading prosumers…" /> : filteredProsumers.length === 0 ? (
          <EmptyState title="No prosumers found" desc="Try changing your search or filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['NIC', 'Full Name', 'Email', 'Phone', 'Status', 'Created', 'Actions'].map(header => <th key={header} className="table-th">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {visibleProsumers.map(prosumer => (
                    <tr key={prosumer.id} className="table-row">
                      <td className="font-medium table-td text-text-dark">{prosumer.nic}</td>
                      <td className="table-td text-text-dark">{prosumer.fullName}</td>
                      <td className="text-sm table-td text-text-muted">{prosumer.email}</td>
                      <td className="text-sm table-td text-text-muted">{prosumer.phone}</td>
                      <td className="table-td"><StatusBadge status={prosumer.activationStatus} /></td>
                      <td className="text-sm table-td text-text-muted">{formatDate(prosumer.createdAt)}</td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/prosumers/${prosumer.nic}`} className="px-3 py-1.5 text-xs border rounded-lg border-border text-text-dark hover:bg-bg-app">View</Link>
                          {canActivate && prosumer.activationStatus === 'Pending' && (
                            <button type="button" disabled={savingId === prosumer.nic} onClick={() => handleActivate(prosumer)} className="px-3 py-1.5 text-xs text-white rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50">
                              {savingId === prosumer.nic ? 'Activating…' : 'Activate'}
                            </button>
                          )}
                          {canActivate && prosumer.activationStatus === 'Deactivated' && (
                            <button type="button" disabled={savingId === prosumer.nic} onClick={() => handleReactivate(prosumer)} className="px-3 py-1.5 text-xs text-white rounded-lg bg-secondary hover:bg-secondary-hover disabled:opacity-50">
                              {savingId === prosumer.nic ? 'Reactivating…' : 'Reactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={filteredProsumers.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
