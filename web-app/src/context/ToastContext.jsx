import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const COLORS = {
  success: 'bg-primary text-white',
  error: 'bg-danger text-white',
  warning: 'bg-accent text-text-dark',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed z-50 flex flex-col gap-2 bottom-6 right-6">
        {toasts.map(t => (
          <div key={t.id}
            className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${COLORS[t.type]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
