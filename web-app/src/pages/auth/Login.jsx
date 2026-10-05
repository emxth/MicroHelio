import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ErrorBanner, Spinner, Logo } from '../../components/ui/index';

export default function Login() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (session) navigate('/transactions', { replace: true });
  }, [navigate, session]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.identifier.trim() || !form.password) {
      setError('Please enter your username, email, or NIC and password.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const data = await api.post('/auth/login', {
        identifier: form.identifier.trim(),
        password: form.password,
      });

      if (!data?.token || !data?.role || data.role === 'Prosumer') {
        throw { message: 'Prosumer accounts use the MicroHelio mobile app.' };
      }

      login(data);
      navigate(data.role === 'Backoffice' ? '/transactions' : '/operator-dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="flex-col justify-between hidden w-1/2 p-12 text-white lg:flex"
        style={{ background: 'linear-gradient(160deg,#1B2621 0%,#2D6A4F 60%,#3a8a68 100%)' }}>
        <Link to="/" className="flex items-center">
          <Logo theme="dark" className="w-auto h-10" />
        </Link>
        <div>
          <h2 className="mb-4 text-3xl font-bold leading-tight">Solar energy trading,<br />intelligently managed.</h2>
          <p className="mb-8 leading-relaxed text-green-200">Manage prosumers, grid nodes, reservations and energy transfers - all from one secure platform.</p>
          {['Role-based access control', 'Secure QR energy transfer verification', 'Real-time booking and reservation management'].map(t => (
            <div key={t} className="flex items-center gap-3 mb-3 text-sm text-green-100">
              <div className="flex items-center justify-center flex-shrink-0 w-5 h-5 rounded-full bg-secondary">
                <svg className="w-3 h-3" fill="none" stroke="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center flex-1 p-8 bg-bg-app">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-8 lg:hidden">
            <Logo theme="light" className="w-auto h-10" />
          </Link>

          <h1 className="mb-1 text-2xl font-bold text-text-dark">Welcome back</h1>
          <p className="mb-8 text-sm text-text-muted">Sign in to your operator account</p>

          <ErrorBanner message={error} />

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5 mb-5">
              <label className="form-label">Email address</label>
              <input type="email" value={form.identifier}
                onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                className="w-full p-2 bg-transparent border rounded-xl form-input focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                placeholder="operator@microhelio.com, username, or NIC" required />
            </div>
            
            <div className="flex flex-col gap-1.5 mb-6">
              <label className="block form-label">Password</label>
              <div className="relative w-full">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full p-2 bg-transparent border rounded-xl form-input focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                  placeholder="••••••••" required />
                
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute -translate-y-1/2 right-3 top-1/2 text-text-muted hover:text-text-dark">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="flex items-center justify-center w-full gap-2 py-3 font-semibold text-white transition-colors rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-60">
              {loading ? <><Spinner className="w-4 h-4" style={{ borderTopColor: 'white' }} /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-xs text-center text-text-muted">
            This portal is for <strong>Backoffice</strong> and <strong>Grid Operator</strong> accounts only.<br />
            Prosumers use the MicroHelio Android app.
          </p>
        </div>
      </div>
    </div>
  );
}

