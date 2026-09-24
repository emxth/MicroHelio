import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_CONFIG } from '../../config/nav.js';

export default function Sidebar() {
  const { session, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = session?.fullName?.charAt(0)?.toUpperCase() || 'U';
  const roleBadgeCls = session?.role === 'Backoffice'
    ? 'bg-accent text-text-dark'
    : 'bg-secondary text-white';

  return (
    <aside className="fixed top-0 left-0 z-40 flex flex-col w-64 h-full"
      style={{ background: '#2D6A4F', boxShadow: '2px 0 12px rgba(27,38,33,.15)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl bg-accent">
          <SunIcon />
        </div>
        <div>
          <div className="text-base font-bold leading-tight text-white">MicroHelio</div>
          <div className="text-xs text-green-200 opacity-70">Solar Grid Platform</div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold rounded-full text-primary bg-accent">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{session?.fullName || 'User'}</div>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${roleBadgeCls}`}>
              {session?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_CONFIG.map((group) => {
          const visible = group.items.filter(item => hasRole(item.roles));
          if (!visible.length) return null;
          return (
            <div key={group.category} className="mb-1">
              <div className="px-3 py-2 text-xs font-semibold tracking-widest uppercase text-secondary opacity-70">
                {group.category}
              </div>
              {visible.map(item => (
                <NavLink key={item.path} to={item.path}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`
                  }>
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <div className="mx-3 my-1 border-t border-white/10" />
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-green-200
                     hover:bg-red-600 hover:text-white text-sm font-medium transition-all duration-150">
          <LogoutIcon />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="#1B2621" viewBox="0 0 24 24" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
