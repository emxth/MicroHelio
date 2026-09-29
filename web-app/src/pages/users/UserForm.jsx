import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBanner, LoadingState } from '../../components/ui/index';
import { createUser, getUser, updateUser } from '../../services/users';

const emptyForm = {
  username: '',
  email: '',
  password: '',
  role: 'GridOperator',
  fullName: '',
  isActive: true,
};

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;

    async function loadUser() {
      try {
        const user = await getUser(id);
        if (!user) throw new Error('User was not found.');
        setForm({ username: user.username, email: user.email, password: '', role: user.role, fullName: user.fullName, isActive: user.isActive });
      } catch (err) {
        setError(err.message || 'Unable to load user.');
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [editing, id]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function validate() {
    if (!editing && (form.username.trim().length < 3 || form.username.trim().length > 50)) return 'Username must be between 3 and 50 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (!editing && (form.password.length < 8 || form.password.length > 100)) return 'Password must be between 8 and 100 characters.';
    if (editing && form.password && (form.password.length < 8 || form.password.length > 100)) return 'Password must be between 8 and 100 characters.';
    if (form.fullName.trim().length < 2 || form.fullName.trim().length > 100) return 'Full name must be between 2 and 100 characters.';
    if (!['Backoffice', 'GridOperator'].includes(form.role)) return 'Select a valid role.';
    return '';
  }

  async function submit(event) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        email: form.email.trim(),
        role: form.role,
        fullName: form.fullName.trim(),
      };
      if (!editing) {
        payload.username = form.username.trim();
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
        payload.isActive = form.isActive;
      } else {
        payload.isActive = form.isActive;
      }

      if (editing) await updateUser(id, payload);
      else await createUser(payload);
      navigate('/users', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState text="Loading user…" />;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/users" className="text-sm font-medium text-text-muted hover:text-primary">← User Management</Link>
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-dark">{editing ? 'Edit User' : 'New User'}</h2>
        <p className="mt-1 text-sm text-text-muted">{editing ? 'Update staff account details and access.' : 'Create a Backoffice or GridOperator staff account.'}</p>
      </div>

      <ErrorBanner message={error} />

      <form onSubmit={submit} className="card card-body" noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="username">Username</label>
            <input id="username" name="username" value={form.username} onChange={updateField} disabled={editing} className="form-input disabled:bg-bg-app" required />
            {editing && <p className="form-hint">Username cannot be changed.</p>}
          </div>
          <div>
            <label className="form-label" htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" value={form.fullName} onChange={updateField} className="form-input" required />
          </div>
          <div>
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={updateField} className="form-input" required />
          </div>
          <div>
            <label className="form-label" htmlFor="role">Role</label>
            <select id="role" name="role" value={form.role} onChange={updateField} className="form-input" required>
              <option value="Backoffice">Backoffice</option>
              <option value="GridOperator">GridOperator</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="password">{editing ? 'New password (optional)' : 'Password'}</label>
            <input id="password" name="password" type="password" value={form.password} onChange={updateField} className="form-input" required={!editing} />
            <p className="form-hint">Minimum 8 characters.</p>
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-text-dark sm:col-span-2">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={updateField} /> Active staff account
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
          <Link to="/users" className="px-4 py-2 text-sm font-medium border rounded-lg border-border text-text-dark hover:bg-bg-app">Cancel</Link>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-60">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create user'}</button>
        </div>
      </form>
    </div>
  );
}
