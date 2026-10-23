import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Clapperboard, Menu, X, Ticket, Shield, UserRound } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);
  const logout = async () => { await signOut(); close(); navigate('/'); };
  return <header className="site-header"><nav className="nav-shell" aria-label="Main navigation">
    <Link to="/" className="brand" onClick={close}><span className="brand-mark"><Clapperboard size={19} /></span><span>REELHOUSE<span className="brand-dot">.</span></span></Link>
    <button className="mobile-menu icon-button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <div className={`nav-links ${open ? 'nav-open' : ''}`}>
      <NavLink to="/movies" onClick={close}>Movies</NavLink>
      <NavLink to="/showtimes" onClick={close}>Showtimes</NavLink>
      {isAuthenticated && <NavLink to="/reservations" onClick={close}><Ticket size={15} /> My tickets</NavLink>}
      {isAuthenticated && <NavLink to="/profile" onClick={close}><UserRound size={15} /> Account</NavLink>}
      {isAdmin && <NavLink to="/admin" onClick={close}><Shield size={15} /> Studio</NavLink>}
      <div className="nav-actions">{isAuthenticated ? <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button> : <><Link className="nav-login" to="/login" onClick={close}>Sign in</Link><Link className="btn btn-primary btn-sm" to="/register" onClick={close}>Join us</Link></>}</div>
    </div>
  </nav></header>;
}
