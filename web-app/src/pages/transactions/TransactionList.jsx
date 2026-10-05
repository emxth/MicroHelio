import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { formatDate, StatusBadge } from '../../utils/helpers';
import {
  PageHeader, StatCard, SearchBar, FilterSelect,
  Pagination, LoadingState, EmptyState,
} from '../../components/ui/index';

const PAGE_SIZE = 10;

// CSV export helper 
function exportToCSV(rows, filename) {
  const HEADERS = [
    'Transaction Code',
    'Prosumer NIC',
    'Node ID',
    'Energy Transferred (kWh)',
    'Operator ID',
    'Created Date',
    'Status',
    'Reservation ID',
    'Notes',
  ];

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const csvRows = [
    HEADERS.map(escape).join(','),
    ...rows.map(t => [
      t.transactionCode || t._id || '',
      t.prosumerNic || '',
      t.nodeId || '',
      t.energyTransferredKWh ?? '',
      t.operatorId || '',
      formatDate(t.createdAt),
      t.transactionStatus || '',
      t.reservationId || '',
      t.notes || '',
    ].map(escape).join(',')),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Component
export default function TransactionList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

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

  // Build a timestamped filename including active filters
  function buildFilename() {
    const today = new Date().toISOString().split('T')[0];
    const parts = ['transactions', today];
    if (status) parts.push(status.toLowerCase());
    if (date) parts.push(date);
    return parts.join('-') + '.csv';
  }

  function handleExport() {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      exportToCSV(filtered, buildFilename());
    } finally {
      // Small visual feedback delay
      setTimeout(() => setExporting(false), 800);
    }
  }

  return (
    <div>
      <PageHeader
        title="Transaction History"
        subtitle="All completed and pending energy transfer transactions"
        action={
          <div className="flex items-center gap-3">
            {/* CSV Export button */}
            <button
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              title={filtered.length === 0 ? 'No data to export' : `Export ${filtered.length} row${filtered.length !== 1 ? 's' : ''} as CSV`}
              className="flex items-center gap-2 px-4 py-2 text-sm transition-colors border rounded-lg border-border text-text-dark hover:bg-bg-app disabled:opacity-40 disabled:cursor-not-allowed">
              {exporting
                ? <div className="w-4 h-4 border-2 rounded-full border-border border-t-primary animate-spin" />
                : <DownloadIcon />
              }
              {exporting ? 'Exporting…' : `Export CSV${filtered.length < transactions.length ? ` (${filtered.length})` : ''}`}
            </button>

            {/* Refresh */}
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg border-border text-text-dark hover:bg-bg-app">
              <RefreshIcon /> Refresh
            </button>
          </div>
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
            <SearchBar
              value={search}
              onChange={v => { setSearch(v); setPage(1); }}
              placeholder="Search by NIC or transaction code…"
            />
            <FilterSelect
              value={status}
              onChange={v => { setStatus(v); setPage(1); }}
              options={[
                { value: 'Initiated', label: 'Initiated' },
                { value: 'Verified', label: 'Verified' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Failed', label: 'Failed' },
              ]}
              placeholder="All statuses"
            />
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setPage(1); }}
              className="form-input h-11"
              style={{ width: 'auto' }}
            />
            <button
              onClick={() => { setSearch(''); setStatus(''); setDate(''); setPage(1); }}
              className="px-3 py-2 text-sm border rounded-lg border-border text-text-dark hover:bg-bg-app">
              Clear
            </button>
          </div>

          {/* Filter summary - shown when filters are active */}
          {(search || status || date) && (
            <p className="mt-2 text-xs text-text-muted">
              Showing <strong className="text-text-dark">{filtered.length}</strong> of {transactions.length} transactions
              {status && <> · Status: <strong className="text-text-dark">{status}</strong></>}
              {date && <> · Date: <strong className="text-text-dark">{date}</strong></>}
              {search && <> · Search: <strong className="text-text-dark">"{search}"</strong></>}
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <LoadingState /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Code', 'Prosumer NIC', 'Node', 'Energy', 'Operator', 'Date', 'Status', ''].map(h => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).length === 0
                    ? <tr><td colSpan="8"><EmptyState title="No transactions found" desc="Try adjusting your filters." /></td></tr>
                    : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(t => {
                      const id = t.id || t._id;
                      return (
                        <tr key={id} className="table-row">
                          <td className="font-mono text-xs table-td text-text-muted">
                            <button
                              onClick={() => navigate(`/transactions/${id}`)}
                              className="font-mono font-medium text-primary hover:underline">
                              {t.transactionCode || id?.slice(-10)}
                            </button>
                          </td>
                          <td className="text-sm font-medium table-td text-text-dark">{t.prosumerNic || '—'}</td>
                          <td className="text-sm table-td text-text-muted">{t.nodeId || '—'}</td>
                          <td className="text-sm font-semibold table-td text-primary">
                            {t.energyTransferredKWh != null ? `${t.energyTransferredKWh} kWh` : '—'}
                          </td>
                          <td className="text-sm table-td text-text-muted">{t.operatorId || '—'}</td>
                          <td className="text-sm table-td text-text-muted">{formatDate(t.createdAt)}</td>
                          <td className="table-td"><StatusBadge status={t.transactionStatus} /></td>
                          <td className="text-right table-td">
                            <button
                              onClick={() => navigate(`/transactions/${id}`)}
                              className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-primary hover:text-white transition-colors text-text-dark">
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
function DownloadIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
}
