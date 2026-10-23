import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Clock3, Star, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { getMovie } from "../api/moviesApi";
import { getShowtimes } from "../api/showtimesApi";
import { errorMessage } from "../api/axiosClient";
import useAuth from "../hooks/useAuth";
import ShowtimeCard from "../components/showtimes/ShowtimeCard";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";

export default function MovieDetailPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    Promise.all([getMovie(id), getShowtimes({ movieId: id })])
      .then(([film, sessions]) => {
        setMovie(film);
        setShowtimes(sessions);
      })
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);
  if (!isAuthenticated)
    return (
      <section className="container section">
        <EmptyState
          title="Sign in to see this film"
          detail="Movie details are available to signed-in members."
          action={
            <Link className="btn btn-primary" to="/login">
              Sign in
            </Link>
          }
        />
      </section>
    );
  if (loading) return <Loader label="Loading film details…" />;
  if (!movie)
    return (
      <section className="container section">
        <EmptyState
          title="Film not found"
          detail="This listing may have been removed."
        />
      </section>
    );
  const poster =
    movie.poster ||
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=85";
  const releaseDate = movie.release_date
    ? format(parseISO(String(movie.release_date).slice(0, 10)), "MMM d, yyyy")
    : "Release date unavailable";
  const upcomingShowtimes = showtimes.filter(
    (session) => new Date(session.start_time) > new Date(),
  );
  return (
    <div className="page-enter">
      <section
        className="film-backdrop"
        style={{ "--film-image": `url("${poster}")` }}
      >
        <div className="container film-backdrop-inner">
          <span className="eyebrow">
            <i /> NOW SHOWING
          </span>
          <h1>{movie.title}</h1>
          <div className="film-meta">
            {movie.rating && (
              <span>
                <Star size={16} fill="currentColor" /> {movie.rating}
              </span>
            )}
            <span>
              <Clock3 size={15} /> {movie.duration_minutes} min
            </span>
            <span>{movie.genre || "Feature film"}</span>
          </div>
        </div>
      </section>
      <section className="container film-detail">
        <div className="film-poster">
          <img src={poster} alt={`${movie.title} poster`} />
        </div>
        <div className="film-copy">
          <span className="eyebrow">THE FILM</span>
          <h2>A story for the big screen.</h2>
          <p>
            {movie.description ||
              "A new film is ready to be discovered. Join us for the full experience on the big screen."}
          </p>
          <p className="release-meta">
            <CalendarDays size={15} /> Released {releaseDate}
          </p>
        </div>
      </section>
      <section className="container section showtimes-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR SCREENING</span>
            <h2>
              Choose a showtime<span className="brand-dot">.</span>
            </h2>
          </div>
          <span className="price-note">
            Seat prices vary by showtime and category
          </span>
        </div>
        {upcomingShowtimes.length ? (
          <div className="showtime-list">
            {upcomingShowtimes.map((session) => (
              <ShowtimeCard key={session.id} showtime={session} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No upcoming showtimes"
            detail="There are no future screenings scheduled for this movie."
          />
        )}
      </section>
    </div>
  );
}
