import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/users': 'User Management',
  '/users/new': 'New User',
  '/pending-activations': 'Pending Activations',
  '/prosumers': 'Prosumer Management',
  '/nodes': 'Microgrid Nodes',
  '/nodes/new': 'New Node',
  '/nodes/create': 'New Node',
  '/slots': 'Energy Slots',
  '/slots/new': 'New Slot',
  '/reservations': 'All Reservations',
  '/pending-approvals': 'Pending Approvals',
  '/pending-bookings': 'Pending Approvals',
  '/transactions': 'Transaction History',
  '/operator-dashboard': 'Operator Dashboard',
  '/operator/pending-approvals': 'Pending Approvals',
  '/operator/reservation-search': 'Reservation Tracker',
  '/operator/reservations/new': 'New Reservation',
};

function getTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes('/edit')) return 'Edit Node';
  if (pathname.startsWith('/prosumers/')) return 'Prosumer Detail';
  if (pathname.startsWith('/nodes/')) return 'Node Detail';
  if (pathname.startsWith('/reservations/')) return 'Reservation Detail';
  if (pathname.startsWith('/transactions/')) return 'Transaction Detail';
  return 'MicroHelio';
}

export default function AppLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = getTitle(pathname);
  const initials = session?.fullName?.charAt(0)?.toUpperCase() || 'U';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />

      {/* Fixed top header */}
      <header className="fixed top-0 right-0 z-30 flex items-center justify-between h-16 px-6 border-b left-64 bg-surface border-border"
        style={{ boxShadow: '0 1px 4px rgba(27,38,33,.07)' }}>
        <h1 className="text-base font-semibold text-text-dark">{title}</h1>
        <div className="flex items-center gap-3.5">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-text-dark">{session?.fullName}</div>
            <div className="text-xs text-text-muted">{session?.email}</div>
          </div>
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold rounded-full text-primary bg-accent">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-danger hover:bg-danger/10 border border-border hover:border-danger/30 rounded-xl transition-all shadow-sm"
            title="Sign out of account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="min-h-screen pt-16 ml-64">
        <div className="w-full max-w-[1600px] mx-auto p-6 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
