import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_CONFIG } from '../../config/nav.js';
import { Logo } from '../ui/index';

export default function Sidebar() {
    const { session, hasRole } = useAuth();

    const initials = session?.fullName?.charAt(0)?.toUpperCase() || 'U';
    const roleBadgeCls = session?.role === 'Backoffice'
        ? 'bg-accent text-text-dark'
        : 'bg-secondary text-white';

    return (
        <aside
            className="fixed top-0 left-0 z-40 flex flex-col w-64 h-full"
            style={{ background: '#2D6A4F', boxShadow: '2px 0 12px rgba(27,38,33,.15)' }}>

            {/* Brand Logo Header */}
            <div className="flex items-center flex-shrink-0 px-4 py-4 border-b border-white/10">
                <Logo theme="dark" className="w-auto h-10" />
            </div>

            {/* User info */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-bold rounded-full text-primary bg-accent">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                            {session?.fullName || 'User'}
                        </div>
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
                        <div key={group.category} className="mb-2">

                            {/* Category label */}
                            <div className="px-4 pt-1 pb-1.5 text-xs font-semibold tracking-widest uppercase"
                                style={{ color: 'rgba(82,183,136,0.8)' }}>
                                {group.category}
                            </div>

                            {/* Nav links — each item is a full-width flex row */}
                            <div className="flex flex-col gap-0.5 px-2">
                                {visible.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) =>
                                            [
                                                'flex items-center justify-between',
                                                'w-full px-3 py-2.5 rounded-lg',
                                                'text-sm font-medium',
                                                'transition-all duration-150',
                                                'no-underline',
                                                isActive
                                                    ? 'bg-secondary text-white'
                                                    : 'text-green-100 hover:bg-white/10 hover:text-white',
                                            ].join(' ')
                                        }>
                                        <span className="leading-snug">{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="mx-4 mt-2 border-t border-white/10" />
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
}

