import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner, EmptyState, LoadingState, PageHeader, Pagination, SearchBar } from '../../components/ui/index';
import { formatDate, StatusBadge } from '../../utils/helpers';
import { getUsers, setUserStatus } from '../../services/users';

const PAGE_SIZE = 10;

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      setUsers(await getUsers() || []);
    } catch (err) {
      setError(err.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(user => {
      const matchesSearch = !query || [user.username, user.email, user.fullName]
        .some(value => value?.toLowerCase().includes(query));
      const matchesRole = !role || user.role === role;
      const matchesStatus = !status || (status === 'Active' ? user.isActive : !user.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, role, status]);

  const visibleUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  async function toggleStatus(user) {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.fullName}?`)) return;

    setSavingId(user.id);
    setError('');
    try {
      const updated = await setUserStatus(user.id, !user.isActive);
      setUsers(current => current.map(item => item.id === user.id ? updated : item));
    } catch (err) {
      setError(err.message || `Unable to ${action} the user.`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage Backoffice and GridOperator staff accounts."
        action={<Link to="/users/new" className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-hover">Create User</Link>}
      />

      <ErrorBanner message={error} />

      <div className="p-4 mb-5 card">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={search} onChange={value => updateFilter(setSearch, value)} placeholder="Search username, email, or name…" />
          <select value={role} onChange={event => updateFilter(setRole, event.target.value)} className="form-input" style={{ width: 'auto' }}>
            <option value="">All roles</option>
            <option value="Backoffice">Backoffice</option>
            <option value="GridOperator">GridOperator</option>
          </select>
          <select value={status} onChange={event => updateFilter(setStatus, event.target.value)} className="form-input" style={{ width: 'auto' }}>
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button type="button" onClick={loadUsers} className="px-3 py-2 text-sm border rounded-lg border-border text-text-dark hover:bg-bg-app">Refresh</button>
        </div>
      </div>

      <div className="card">
        {loading ? <LoadingState text="Loading users…" /> : filteredUsers.length === 0 ? (
          <EmptyState title="No users found" desc="Try changing your search or filters, or create a new user." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Full Name', 'Username', 'Email', 'Role', 'Status', 'Created', 'Actions'].map(header => <th key={header} className="table-th">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map(user => (
                    <tr key={user.id} className="table-row">
                      <td className="font-medium table-td text-text-dark">{user.fullName}</td>
                      <td className="text-sm table-td text-text-muted">{user.username}</td>
                      <td className="text-sm table-td text-text-muted">{user.email}</td>
                      <td className="table-td"><span className="text-xs font-medium badge badge-primary">{user.role}</span></td>
                      <td className="table-td"><StatusBadge status={user.isActive ? 'Active' : 'Inactive'} /></td>
                      <td className="text-sm table-td text-text-muted">{formatDate(user.createdAt)}</td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/users/${user.id}/edit`} className="px-3 py-1.5 text-xs border rounded-lg border-border text-text-dark hover:bg-bg-app">Edit</Link>
                          <button type="button" disabled={savingId === user.id} onClick={() => toggleStatus(user)} className={`px-3 py-1.5 text-xs rounded-lg text-white disabled:opacity-50 ${user.isActive ? 'bg-danger' : 'bg-secondary'}`}>
                            {savingId === user.id ? 'Saving…' : user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={filteredUsers.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
