import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getAdminReservations } from '../../api/adminApi';
import { errorMessage } from '../../api/axiosClient';
import { getMovies } from '../../api/moviesApi';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/ui/Loader';

const PAGE_SIZE = 20;
const reservationStatuses = [
  'pending_payment',
  'confirmed',
  'cancelled',
  'expired',
  'paid',
];

const formatLabel = (value) => (value || 'unknown').replace(/_/g, ' ');
const formatDateTime = (value) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};
const formatAmount = (amount, currency) => {
  if (!Number.isInteger(amount) || !/^[a-z]{3}$/i.test(currency || '')) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return '—';
  }
};
const reservationStatusClass = (status) => {
  if (['confirmed', 'paid'].includes(status)) return 'badge-success';
  if (status === 'pending_payment') return 'badge-warning';
  if (['cancelled', 'expired'].includes(status)) return 'badge-danger';
  return 'badge-neutral';
};
const paymentStatusClass = (status) => {
  if (status === 'paid') return 'badge-success';
  if (['pending', 'refund_pending'].includes(status)) return 'badge-warning';
  if (['failed', 'refund_failed'].includes(status)) return 'badge-danger';
  if (status === 'refunded') return 'badge-info';
  return 'badge-neutral';
};

export default function AdminReservations() {
  const [filters, setFilters] = useState({
    status: '',
    movieId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [movies, setMovies] = useState([]);
  const [movieLoadError, setMovieLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    getMovies()
      .then((items) => {
        if (active) setMovies([...items].sort((a, b) => a.title.localeCompare(b.title)));
      })
      .catch(() => {
        if (active) setMovieLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');

    const params = {
      page,
      limit: PAGE_SIZE,
      ...Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ''),
      ),
    };

    getAdminReservations(params, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const totalPages = data.pagination.totalPages;
        if (totalPages > 0 && page > totalPages) {
          setPage(totalPages);
          return;
        }
        setReport(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, page, retry]);

  const changeFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };
  const reservations = report?.reservations || [];
  const pagination = report?.pagination;
  const columns = [
    'Reservation',
    'Customer',
    'Movie',
    'Showtime',
    'Screen',
    'Seats',
    'Status',
    'Payment',
    'Total',
    'Created',
  ];

  return (
    <section className="admin-page reservation-report">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">BOOKINGS</span>
          <h1>Reservations</h1>
          <p>Review customer bookings and payment status.</p>
        </div>
      </div>

      <div className="reservation-filters" aria-label="Filter reservations">
        <label className="reservation-filter">
          <span>Reservation status</span>
          <select
            value={filters.status}
            onChange={(event) => changeFilter('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {reservationStatuses.map((status) => (
              <option key={status} value={status}>{formatLabel(status)}</option>
            ))}
          </select>
        </label>
        <label className="reservation-filter">
          <span>Movie</span>
          <select
            value={filters.movieId}
            onChange={(event) => changeFilter('movieId', event.target.value)}
          >
            <option value="">All movies</option>
            {movies.map((movie) => (
              <option key={movie.id} value={movie.id}>{movie.title}</option>
            ))}
          </select>
          {movieLoadError && <small>Movie options could not be loaded.</small>}
        </label>
        <label className="reservation-filter">
          <span>Created from</span>
          <input
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(event) => changeFilter('dateFrom', event.target.value)}
          />
        </label>
        <label className="reservation-filter">
          <span>Created to</span>
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(event) => changeFilter('dateTo', event.target.value)}
          />
        </label>
      </div>

      {loadError ? (
        <div className="notice notice-danger reservation-error" role="alert">
          <div>
            <strong>
              {loadError.includes('403') || loadError.toLowerCase().includes('forbidden')
                ? 'Admin access required'
                : 'Reservations could not be loaded'}
            </strong>
            <p>{loadError}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : loading ? (
        <Loader label="Loading reservations…" />
      ) : reservations.length === 0 ? (
        <EmptyState
          title="No reservations found"
          detail="There are no bookings matching the selected filters."
        />
      ) : (
        <>
          <p className="reservation-result-count">
            {pagination.total} {pagination.total === 1 ? 'reservation' : 'reservations'}
          </p>
          <div className="table-scroll reservations-table-scroll">
            <table className="data-table reservations-table">
              <thead>
                <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td data-label="Reservation" className="cell-title">
                      <span>#{reservation.id}</span>
                      {reservation.booking_reference && (
                        <small>{reservation.booking_reference}</small>
                      )}
                    </td>
                    <td data-label="Customer">
                      <span className="reservation-cell-primary">
                        {reservation.customer_name || `Customer #${reservation.customer_id}`}
                      </span>
                      <small>{reservation.customer_email || 'Email unavailable'}</small>
                    </td>
                    <td data-label="Movie" className="cell-title">
                      {reservation.movie_title || 'Movie unavailable'}
                    </td>
                    <td data-label="Showtime">
                      <span className="reservation-cell-primary">{formatDateTime(reservation.start_time)}</span>
                      {reservation.end_time && (
                        <small>Ends {formatDateTime(reservation.end_time)}</small>
                      )}
                    </td>
                    <td data-label="Screen">{reservation.screen_name || '—'}</td>
                    <td data-label="Seats">
                      {reservation.seat_labels?.length ? reservation.seat_labels.join(', ') : '—'}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${reservationStatusClass(reservation.status)}`}>
                        {formatLabel(reservation.status)}
                      </span>
                    </td>
                    <td data-label="Payment">
                      <span className={`badge ${paymentStatusClass(reservation.payment_status)}`}>
                        {formatLabel(reservation.payment_status)}
                      </span>
                    </td>
                    <td data-label="Total">
                      {formatAmount(reservation.amount, reservation.currency)}
                    </td>
                    <td data-label="Created">{formatDateTime(reservation.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="reservation-pagination">
            <span>
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              <small>{pagination.total} total</small>
            </span>
            <div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
