import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ roles }) {
  const { session, hasRole } = useAuth();

  if (!session) return <Navigate to="/login" replace />;

  if (roles && !hasRole(roles)) return <Navigate to="/transactions" replace />;

  return <Outlet />;
}
