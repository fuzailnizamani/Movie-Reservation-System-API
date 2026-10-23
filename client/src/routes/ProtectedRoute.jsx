import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Loader from '../components/ui/Loader';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, hydrated } = useAuth();
  const location = useLocation();
  if (!hydrated) return <Loader label="Preparing your account…" />;
  return isAuthenticated ? children : <Navigate to="/login" replace state={{ from: location }} />;
}
