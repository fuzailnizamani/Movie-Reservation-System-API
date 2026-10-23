import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3, Star } from 'lucide-react';
import Badge from '../ui/Badge';

const fallbackPosters = [
  'photo-1489599849927-2ee91cede3ba', 'photo-1440404653325-ab127d49abc1', 'photo-1518709268805-4e9042af9f23', 'photo-1517604931442-7e0c8ed2963c',
];

export default function MovieCard({ movie }) {
  const poster = movie.poster || `https://images.unsplash.com/${fallbackPosters[Number(movie.id) % fallbackPosters.length]}?auto=format&fit=crop&w=700&q=85`;
  return <article className={`movie-card ${movie.is_archived ? 'movie-archived' : ''}`}>
    <Link className="poster-wrap" to={`/movies/${movie.id}`} aria-label={`View ${movie.title}`}>
      <img src={poster} alt={`${movie.title} poster`} loading="lazy" />
      {movie.is_archived && <Badge tone="danger">Archived</Badge>}
      <span className="poster-action"><span>Explore film</span><ArrowUpRight size={18} /></span>
    </Link>
    <div className="movie-card-copy"><div className="movie-card-title"><h3><Link to={`/movies/${movie.id}`}>{movie.title}</Link></h3>{movie.rating && <span className="rating"><Star size={13} fill="currentColor" /> {movie.rating}</span>}</div>
      <p>{movie.genre || 'Feature film'} <span>·</span> <Clock3 size={13} /> {movie.duration_minutes} min</p>
    </div>
  </article>;
}
