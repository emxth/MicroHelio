import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { formatDate, StatusBadge } from '../../utils/helpers';
import {
  PageHeader, StatCard, SearchBar, FilterSelect,
  Pagination, LoadingState, EmptyState,
} from '../../components/ui/index';

const PAGE_SIZE = 10;

export default function TransactionList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setTransactions(await api.get('/transactions') || []); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return transactions.filter(t =>
      (!s || (t.transactionCode || '').toLowerCase().includes(s) ||
        (t.prosumerNic || '').toLowerCase().includes(s)) &&
      (!status || t.transactionStatus === status) &&
      (!date || (t.createdAt || '').startsWith(date))
    );
  }, [transactions, search, status, date]);

  const stats = useMemo(() => {
    const completed = transactions.filter(t => t.transactionStatus === 'Completed');
    return {
      total: transactions.length,
      completed: completed.length,
      pending: transactions.filter(t => t.transactionStatus === 'Initiated').length,
      energy: completed.reduce((a, t) => a + (t.energyTransferredKWh || 0), 0).toFixed(1),
    };
  }, [transactions]);

  return (
    <div>
      <PageHeader
        title="Transaction History"
        subtitle="All completed and pending energy transfer transactions"
        action={
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg border-border text-text-dark hover:bg-bg-app">
            <RefreshIcon /> Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} valueClass="text-secondary" />
        <StatCard label="Pending Verify" value={stats.pending} valueClass="text-yellow-700" />
        <StatCard label="Energy Total" value={`${stats.energy} kWh`} valueClass="text-primary" />
      </div>

      {/* Filters */}
      <div className="mb-5 card">
        <div className="py-4 card-body">
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }}
              placeholder="Search by NIC or transaction code…"
              className="px-3 h-11" />
            <FilterSelect value={status} onChange={v => { setStatus(v); setPage(1); }}
              options={[
                { value: 'Initiated', label: 'Initiated' },
                { value: 'Verified', label: 'Verified' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Failed', label: 'Failed' },
              ]}
              placeholder="All statuses"
              className="px-3 h-11" />
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1); }}
              className="w-full px-3 rounded-lg form-input h-11 sm:w-auto" style={{ width: 'auto' }} />
            <button onClick={() => { setSearch(''); setStatus(''); setDate(''); setPage(1); }}
              className="px-3 py-2 text-sm border rounded-lg border-border text-text-dark hover:bg-bg-app">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <LoadingState /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  {['Code', 'Prosumer NIC', 'Node', 'Energy', 'Operator', 'Date', 'Status', ''].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).length === 0
                    ? <tr><td colSpan="8"><EmptyState title="No transactions found" desc="Try adjusting your filters." /></td></tr>
                    : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(t => (
                      <tr key={t.id} className="table-row">
                        <td className="font-mono text-xs table-td text-text-muted">
                          {t.transactionCode || t.id?.slice(-10)}
                        </td>
                        <td className="text-sm font-medium table-td text-text-dark">{t.prosumerNic || '-'}</td>
                        <td className="text-sm table-td text-text-muted">{t.nodeId || '-'}</td>
                        <td className="text-sm font-semibold table-td text-primary">
                          {t.energyTransferredKWh != null ? `${t.energyTransferredKWh} kWh` : '-'}
                        </td>
                        <td className="text-sm table-td text-text-muted">{t.operatorId || '-'}</td>
                        <td className="text-sm table-td text-text-muted">{formatDate(t.createdAt)}</td>
                        <td className="table-td"><StatusBadge status={t.transactionStatus} /></td>
                        <td className="text-right table-td">
                          <button onClick={() => navigate(`/transactions/${t.id}`)}
                            className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-bg-app text-text-dark">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

function RefreshIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
}
