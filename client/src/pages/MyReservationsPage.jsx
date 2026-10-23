import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getReservations } from '../api/reservationsApi';
import { errorMessage } from '../api/axiosClient';
import ReservationCard from '../components/reservations/ReservationCard';
import EmptyState from '../components/ui/EmptyState';
import Loader from '../components/ui/Loader';
import { Link } from 'react-router-dom';

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState([]); const [tab, setTab] = useState('all'); const [loading, setLoading] = useState(true);
  useEffect(() => { getReservations().then(setReservations).catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false)); }, []);
  const visible = reservations.filter((item) => tab === 'all' || (tab === 'upcoming' && ['pending_payment', 'confirmed', 'paid'].includes(item.status)) || (tab === 'closed' && (['cancelled', 'expired'].includes(item.status) || item.payment_status === 'refunded')));
  return <section className="container section page-enter"><div className="page-heading"><div><span className="eyebrow">YOUR TICKETS</span><h1>My reservations<span className="brand-dot">.</span></h1><p>Every movie night, all in one place.</p></div><Link className="btn btn-secondary" to="/movies">Browse films</Link></div><div className="tab-row"><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All</button><button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Upcoming</button><button className={tab === 'closed' ? 'active' : ''} onClick={() => setTab('closed')}>Cancelled / expired</button></div>
    {loading ? <Loader label="Loading your tickets…" /> : visible.length ? <div className="reservation-list">{visible.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)}</div> : <EmptyState title="No reservations yet" detail="Your next cinema night is just a few clicks away." action={<Link className="btn btn-primary" to="/movies">Browse movies</Link>} />}
  </section>;
}
