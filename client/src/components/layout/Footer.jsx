import { Link, useNavigate } from "react-router-dom";
import { Clapperboard } from "lucide-react";
import useAuth from "../../hooks/useAuth";

export default function Footer() {
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const logout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/");
    }
  };

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Clapperboard size={18} />
            </span>
            <span>
              REELHOUSE<span className="brand-dot">.</span>
            </span>
          </Link>
          <p>Make room for a night at the movies.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link to="/movies">All movies</Link>
          <Link to="/showtimes">Showtimes</Link>
        </div>
        <div>
          <h3>Your account</h3>
          {isAuthenticated ? (
            <>
              <Link to="/reservations">My tickets</Link>
              <button className="footer-action" type="button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/reservations">My tickets</Link>
            </>
          )}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Reelhouse Cinema</span>
        <span>Good stories belong on the big screen.</span>
      </div>
    </footer>
  );
}
