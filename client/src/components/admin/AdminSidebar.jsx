import { NavLink } from 'react-router-dom';
import { Clapperboard, Film, MonitorPlay, PanelsTopLeft, ScreenShare, Ticket } from 'lucide-react';

const links = [['/admin', 'Overview', PanelsTopLeft], ['/admin/movies', 'Movies', Film], ['/admin/screens', 'Screens', ScreenShare], ['/admin/showtimes', 'Showtimes', MonitorPlay], ['/admin/reservations', 'Reservations', Ticket]];
export default function AdminSidebar() {
  return <aside className="admin-sidebar"><div className="admin-brand"><Clapperboard size={19} /><span>STUDIO</span></div><nav>{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/admin'}><Icon size={17} />{label}</NavLink>)}</nav><p className="admin-sidebar-note">Manage cinema operations and review customer bookings.</p></aside>;
}
