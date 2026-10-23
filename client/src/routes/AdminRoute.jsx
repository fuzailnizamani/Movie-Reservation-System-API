import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, hydrated } = useAuth();
  if (!hydrated) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdmin ? children : <main className="container section"><div className="notice notice-danger"><h1>Studio access required</h1><p>This section is reserved for cinema administrators.</p></div></main>;
}
