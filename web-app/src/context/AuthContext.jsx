import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);
const SESSION_KEY = 'microhelio_session';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
      const expiresAt = stored?.expiresAtUtc && Date.parse(stored.expiresAtUtc);

      if (!stored?.token || !stored?.role || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      return stored;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  });

  /** Call after a successful API login. Persists session to localStorage. */
  const login = useCallback((data) => {
    const s = {
      token: data.token,
      expiresAtUtc: data.expiresAtUtc,
      accountId: data.accountId,
      accountIdentifier: data.accountIdentifier,
      role: data.role,
      fullName: data.fullName,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  /** Clears session everywhere. */
  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  /** Returns true if the current user's role is in the given array. */
  const hasRole = useCallback((roles) => {
    return session ? roles.includes(session.role) : false;
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook — use in any component: const { session, logout, hasRole } = useAuth(); */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
