import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import HomePage from './pages/HomePage';
import MoviesPage from './pages/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage';
import ShowtimesPage from './pages/ShowtimesPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyReservationsPage from './pages/MyReservationsPage';
import ReservationDetailPage from './pages/ReservationDetailPage';
import ReceiptPage from './pages/ReceiptPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMovies from './pages/admin/AdminMovies';
import AdminScreens from './pages/admin/AdminScreens';
import AdminShowtimes from './pages/admin/AdminShowtimes';
import AdminReservations from './pages/admin/AdminReservations';

const protectedPage = (element) => <ProtectedRoute>{element}</ProtectedRoute>;
const adminPage = (element) => <AdminRoute>{element}</AdminRoute>;

export default function App() {
  return <Routes><Route element={<Layout />}>
    <Route index element={<HomePage />} />
    <Route path="movies" element={<MoviesPage />} />
    <Route path="movies/:id" element={<MovieDetailPage />} />
    <Route path="showtimes" element={<ShowtimesPage />} />
    <Route path="showtimes/:id/seats" element={protectedPage(<SeatSelectionPage />)} />
    <Route path="checkout/:reservationId" element={protectedPage(<CheckoutPage />)} />
    <Route path="payment/success" element={protectedPage(<PaymentSuccessPage />)} />
    <Route path="payment/cancel" element={protectedPage(<PaymentCancelPage />)} />
    <Route path="login" element={<LoginPage />} />
    <Route path="register" element={<RegisterPage />} />
    <Route path="reservations" element={protectedPage(<MyReservationsPage />)} />
    <Route path="reservations/:id" element={protectedPage(<ReservationDetailPage />)} />
    <Route path="reservations/:id/receipt" element={protectedPage(<ReceiptPage />)} />
    <Route path="profile" element={protectedPage(<ProfilePage />)} />
    <Route path="admin" element={adminPage(<AdminLayout />)}>
      <Route index element={<AdminDashboard />} />
      <Route path="movies" element={<AdminMovies />} />
      <Route path="screens" element={<AdminScreens />} />
      <Route path="showtimes" element={<AdminShowtimes />} />
      <Route path="reservations" element={<AdminReservations />} />
    </Route>
    <Route path="404" element={<NotFoundPage />} />
    <Route path="*" element={<Navigate to="/404" replace />} />
  </Route></Routes>;
}
