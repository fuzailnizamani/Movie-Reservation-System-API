import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Armchair,
  ShieldCheck,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";
import { getMovies } from "../api/moviesApi";
import { errorMessage } from "../api/axiosClient";
import useAuth from "../hooks/useAuth";
import MovieGrid from "../components/movies/MovieGrid";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    getMovies()
      .then(setMovies)
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const featured = movies[0];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="hero-image" />
        <div className="hero-content container">
          <span className="eyebrow">
            <i /> YOUR NEXT NIGHT OUT
          </span>
          <h1>
            Stories hit
            <br />
            <em>different</em> here.
          </h1>
          <p>Find your film. Pick your seats. Let the lights go down.</p>

          <div className="hero-actions">
            <Link
              className="btn btn-primary btn-lg"
              to={isAuthenticated ? "/movies" : "/login"}
            >
              Find a movie <ArrowRight size={17} />
            </Link>
            <a className="hero-discover" href="#now-showing">
              Explore the lineup <ArrowDown size={15} />
            </a>
          </div>

          <div className="hero-caption">
            <span>01 / THE BIG SCREEN</span>
            <span>EST. FOR STORY LOVERS</span>
          </div>
        </div>
        <div className="hero-side-label">
          REELHOUSE CINEMA · GOOD STORIES, BIGGER
        </div>
      </section>

      {/* ================= NOW SHOWING ================= */}
      <section id="now-showing" className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A GOOD PLACE TO START</span>
            <h2>
              Now showing<span className="brand-dot">.</span>
            </h2>
          </div>
          <Link
            className="text-link"
            to={isAuthenticated ? "/movies" : "/login"}
          >
            All movies <ArrowRight size={16} />
          </Link>
        </div>

        {!isAuthenticated ? (
          <EmptyState
            title="Your next film is waiting"
            detail="Sign in to explore the current movie lineup and book seats."
            action={
              <Link className="btn btn-secondary" to="/login">
                Sign in to browse
              </Link>
            }
          />
        ) : loading ? (
          <div className="movie-grid">
            {[1, 2, 3, 4].map((key) => (
              <Skeleton key={key} className="poster-skeleton" />
            ))}
          </div>
        ) : movies.length ? (
          <MovieGrid movies={movies.slice(0, 4)} />
        ) : (
          <EmptyState
            title="No movies listed yet"
            detail="Check back when new movies are announced."
          />
        )}
      </section>

      {/* ================= PROMISE BAND ================= */}
      <section className="promise-band">
        <div className="container promise-grid">
          <div>
            <Armchair />
            <h3>Your seat, your call</h3>
            <p>Pick the spot that makes the movie yours.</p>
          </div>
          <div>
            <ShieldCheck />
            <h3>Secure checkout</h3>
            <p>Payments are handled by Stripe.</p>
          </div>
          <div>
            <Timer />
            <h3>10-minute hold</h3>
            <p>Your selected seats stay yours while you pay.</p>
          </div>
        </div>
      </section>

      {/* ================= FEATURED FILM ================= */}
      {featured && (
        <section className="container home-feature">
          <div>
            <span className="eyebrow">FEATURED FILM</span>
            <h2>{featured.title}</h2>
            <p>{featured.description || "A story made for the big screen."}</p>
            <Button
              onClick={() => window.location.assign(`/movies/${featured.id}`)}
            >
              Explore film <ArrowRight size={16} />
            </Button>
          </div>
          <img
            src={
              featured.poster ||
              "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=85"
            }
            alt={`${featured.title} still`}
          />
        </section>
      )}
    </>
  );
}
