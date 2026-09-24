import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate('/transactions', { replace: true });
  }, [session]);

  return (
    <div className="min-h-screen text-white bg-text-dark">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-primary" style={{ boxShadow: '0 2px 12px rgba(0,0,0,.15)' }}>
        <div className="flex items-center justify-between h-16 px-6 mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent">
              <SunIcon />
            </div>
            <span className="text-lg font-bold text-white">MicroHelio</span>
          </div>
          <Link to="/login"
            className="px-4 py-2 text-sm font-semibold transition-opacity rounded-lg bg-accent text-text-dark hover:opacity-90">
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-32 pb-24 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1B2621 0%,#2D6A4F 50%,#3a8a68 100%)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="mb-5 text-5xl font-bold leading-tight">
            Smart Solar<br />
            <span className="text-accent">Microgrid Trading</span><br />
            System
          </h1>
          <p className="max-w-2xl mx-auto mb-8 text-lg leading-relaxed text-green-100">
            A complete peer-to-peer solar energy trading platform connecting prosumers,
            grid operators, and backoffice administrators in real time.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login"
              className="px-6 py-3 text-base font-semibold transition-opacity rounded-xl bg-accent text-text-dark hover:opacity-90">
              Access Platform
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-10 pt-10 border-t mt-14 border-white/20">
            {[['QR', 'Secure transfers'], ['GPS', 'Node mapping']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-bold text-white">{v}</div>
                <div className="text-sm text-green-200">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-text-dark">Built for every stakeholder</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {ROLES.map(r => (
              <div key={r.title} className="p-6 text-center transition-transform card hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${r.iconBg}`}>
                  {r.icon}
                </div>
                <h3 className="mb-2 text-base font-bold text-text-dark">{r.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 text-center bg-text-dark">
        <div className="flex items-center justify-center mx-auto mb-4 w-14 h-14 rounded-2xl bg-accent">
          <SunIcon />
        </div>
        <h2 className="mb-6 text-xl font-bold text-white">MicroHelio</h2>
        <Link to="/login"
          className="px-8 py-3 font-semibold rounded-xl bg-accent text-text-dark">
          Sign in to platform
        </Link>
        <div className="pt-6 mt-10 text-xs text-gray-600 border-t border-gray-800">
          Bits & Pieces - SLIIT Faculty of Computing
        </div>
      </footer>
    </div>
  );
}

const ROLES = [
  { title: 'Backoffice', desc: 'Full system administration - users, prosumers, and grid infrastructure.', iconBg: 'bg-primary-light', icon: <ShieldIcon /> },
  { title: 'Grid Operator', desc: 'Approve bookings, scan QR codes, confirm energy transfers on-site.', iconBg: 'bg-success-light', icon: <BoltIcon /> },
  { title: 'Prosumer', desc: 'Reserve energy slots, manage bookings, view nearby nodes via mobile app.', iconBg: 'bg-accent-light', icon: <HomeIcon /> },
];

function SunIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="#1B2621" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3" /><circle cx="12" cy="12" r="4" /></svg>;
}
function ShieldIcon() {
  return <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
function BoltIcon() {
  return <svg className="w-7 h-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
}
function HomeIcon() {
  return <svg className="text-yellow-700 w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
