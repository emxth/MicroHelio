import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function FloatingOperatorNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { session } = useAuth();

  // Navigation links for the Grid Operator
  const links = [
    { 
      name: 'Pending Approvals', 
      path: '/pending-approvals', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> 
    },
    { 
      name: 'Reservation Tracker', 
      path: '/operator/reservation-search', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> 
    },
    { 
      name: 'New Reservation', 
      path: '/operator/reservations/new', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> 
    },
  ];

  // Automatically close the menu when the route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Hide on landing or login page, or when not authenticated
  const isPublicPage = location.pathname === '/' || location.pathname === '/login';
  if (isPublicPage || !session) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-start">
      {/* Expandable Menu Items */}
      <div className={`flex flex-col mb-4 space-y-3 transition-all duration-300 origin-bottom-left ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none'}`}>
        {/* Title for the menu card */}
        <div className="bg-primary-light text-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm border border-border">
          Grid Operator Menu
        </div>
        
        {links.map(link => {
          const isActive = location.pathname === link.path;
          return (
             <Link 
               key={link.path}
               to={link.path}
               className={`flex items-center px-4 py-3 rounded-2xl shadow-lg border transition-all duration-200 transform hover:scale-105 ${isActive ? 'bg-primary text-surface border-primary' : 'bg-surface text-text-dark border-border hover:border-secondary hover:text-primary'}`}
             >
                <svg className={`w-5 h-5 mr-3 ${isActive ? 'text-surface' : 'text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {link.icon}
                </svg>
                <span className="font-medium whitespace-nowrap">{link.name}</span>
             </Link>
          )
        })}
      </div>

      {/* Main Floating Action Button (FAB) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-4 transition-all duration-300 transform hover:scale-110 ${isOpen ? 'bg-primary text-surface focus:ring-primary/30 rotate-180' : 'bg-secondary text-surface focus:ring-secondary/30 hover:bg-[#409c73] rotate-0'}`}
        title="Toggle Grid Operator Menu"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
    </div>
  );
}
