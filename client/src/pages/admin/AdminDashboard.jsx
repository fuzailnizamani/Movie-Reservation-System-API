import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, MonitorPlay, PanelsTopLeft, Plus, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMovies } from '../../api/moviesApi';
import { getScreens } from '../../api/screensApi';
import { getShowtimes } from '../../api/showtimesApi';
import { errorMessage } from '../../api/axiosClient';
import Loader from '../../components/ui/Loader';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([getMovies(), getScreens(), getShowtimes()]).then(([movies, screens, showtimes]) => setStats({ movies: movies.length, screens: screens.length, showtimes: showtimes.filter((item) => new Date(item.start_time) > new Date()).length })).catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false)); }, []);
  if (loading) return <Loader label="Loading studio overview…" />;
  return <section className="admin-page"><div className="admin-page-heading"><div><span className="eyebrow">OVERVIEW</span><h1>Welcome to your studio.</h1><p>Here’s an overview of your cinema.</p></div><Link className="btn btn-primary" to="movies"><Plus size={16} /> Add a movie</Link></div><div className="stat-grid"><div className="stat-card"><Film /><span>Catalog titles</span><strong>{stats?.movies ?? '—'}</strong></div><div className="stat-card"><PanelsTopLeft /><span>Screens</span><strong>{stats?.screens ?? '—'}</strong></div><div className="stat-card"><MonitorPlay /><span>Upcoming showtimes</span><strong>{stats?.showtimes ?? '—'}</strong></div></div><div className="quick-actions"><Link to="movies">Manage movies <span>→</span></Link><Link to="screens">Manage screens <span>→</span></Link><Link to="showtimes">Schedule showtimes <span>→</span></Link><Link to="reservations">Review reservations <Ticket size={15} /></Link></div></section>;
}
