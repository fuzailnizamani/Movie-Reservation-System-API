import { Link } from 'react-router-dom';
import { Clapperboard, Instagram, Facebook, Youtube } from 'lucide-react';

export default function Footer() {
  return <footer className="site-footer"><div className="container footer-grid">
    <div className="footer-brand"><Link to="/" className="brand"><span className="brand-mark"><Clapperboard size={18} /></span><span>REELHOUSE<span className="brand-dot">.</span></span></Link><p>Make room for a night at the movies.</p></div>
    <div><h3>Explore</h3><Link to="/movies">All movies</Link><Link to="/showtimes">Showtimes</Link></div>
    <div><h3>Your account</h3><Link to="/login">Sign in</Link><Link to="/reservations">My tickets</Link></div>
    <div><h3>Follow along</h3><div className="social-links"><a href="https://instagram.com" aria-label="Instagram"><Instagram size={17} /></a><a href="https://facebook.com" aria-label="Facebook"><Facebook size={17} /></a><a href="https://youtube.com" aria-label="YouTube"><Youtube size={18} /></a></div></div>
  </div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Reelhouse Cinema</span><span>Good stories belong on the big screen.</span></div></footer>;
}
