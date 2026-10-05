// Spinner
export function Spinner({ className = 'w-5 h-5' }) {
    return (
        <div className={`${className} border-2 border-border border-t-primary rounded-full animate-spin`} />
    );
}

// Loading state
export function LoadingState({ text = 'Loading…' }) {
    return (
        <div className="flex items-center justify-center gap-3 py-16 text-text-muted">
            <Spinner /> <span className="text-sm">{text}</span>
        </div>
    );
}

// Empty state
export function EmptyState({ title = 'Nothing here', desc = '' }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-12 h-12 mb-4 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-semibold text-text-dark">{title}</p>
            {desc && <p className="mt-1 text-xs text-text-muted">{desc}</p>}
        </div>
    );
}

// Error banner
export function ErrorBanner({ message }) {
    if (!message) return null;
    return (
        <div className="flex items-start gap-3 p-4 mb-5 text-sm text-red-700 border border-red-200 rounded-xl bg-danger-light">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message}
        </div>
    );
}

// Stat card
export function StatCard({ label, value, sub, valueClass = '' }) {
    return (
        <div className="p-5 card">
            <div className="text-xs font-semibold tracking-wider uppercase text-text-muted">{label}</div>
            <div className={`text-3xl font-bold text-text-dark mt-1 leading-none ${valueClass}`}>{value ?? '—'}</div>
            {sub && <div className="mt-2 text-xs text-text-muted">{sub}</div>}
        </div>
    );
}

// Page header
export function PageHeader({ title, subtitle, action }) {
    return (
        <div className="flex flex-col justify-between gap-4 mb-6 sm:flex-row sm:items-center">
            <div>
                <h2 className="text-xl font-bold text-text-dark">{title}</h2>
                {subtitle && <p className="text-text-muted text-sm mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

// Search bar
export function SearchBar({ value, onChange, placeholder }) {
    return (
        <div className="flex items-center gap-2 bg-surface border-1.5 border-border rounded-lg px-3 py-2 min-w-60 flex-1">
            <svg className="flex-shrink-0 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder || 'Search…'}
                className="flex-1 text-sm bg-transparent border-none outline-none text-text-dark placeholder-text-muted" />
        </div>
    );
}

// Pagination
export function Pagination({ page, total, pageSize, onPage }) {
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-text-muted">
                {total ? `Showing ${start}–${end} of ${total}` : '0 results'}
            </span>
            <div className="flex gap-2">
                <button onClick={() => onPage(page - 1)} disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-dark
                     hover:bg-bg-app disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ← Prev
                </button>
                <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-dark
                     hover:bg-bg-app disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Next →
                </button>
            </div>
        </div>
    );
}

// Filter select
export function FilterSelect({ value, onChange, options, placeholder = 'All' }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            className="form-input" style={{ width: 'auto' }}>
            <option value="">{placeholder}</option>
            {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
}

// Back link
export function BackLink({ to, label, navigate }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(to)}
                className="flex items-center gap-1.5 text-text-muted hover:text-primary text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                {label}
            </button>
        </div>
    );
}

// Detail row
export function DetailRow({ label, value }) {
    return (
        <div>
            <dt className="mb-1 text-xs font-semibold tracking-widest uppercase text-text-muted">{label}</dt>
            <dd className="text-sm text-text-dark">{value || '—'}</dd>
        </div>
    );
}

// Confirm dialog
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
    return (message) => window.confirm(message);
}

// MicroHelio Official Logo
export { default as Logo } from './Logo';

