import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getMovies } from '../api/moviesApi';
import { errorMessage } from '../api/axiosClient';
import useAuth from '../hooks/useAuth';
import MovieGrid from '../components/movies/MovieGrid';
import MovieFilters from '../components/movies/MovieFilters';
import EmptyState from '../components/ui/EmptyState';
import Loader from '../components/ui/Loader';

export default function MoviesPage() {
  const [movies, setMovies] = useState([]); const [search, setSearch] = useState(''); const [debounced, setDebounced] = useState(''); const [genre, setGenre] = useState(''); const [showArchived, setShowArchived] = useState(false); const [loading, setLoading] = useState(true);
  const { isAuthenticated, isAdmin } = useAuth();
  useEffect(() => { const timer = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true); getMovies({ search: debounced || undefined, genre: genre || undefined }).then(setMovies).catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false));
  }, [debounced, genre, isAuthenticated]);
  const genres = useMemo(() => [...new Set(movies.map((movie) => movie.genre).filter(Boolean))], [movies]);
  const visible = movies.filter((movie) => (isAdmin && showArchived) || !movie.is_archived);
  return <section className="container section page-enter"><div className="page-heading"><div><span className="eyebrow">THE PROGRAM</span><h1>Movies<span className="brand-dot">.</span></h1><p>{isAuthenticated ? `${visible.length} films in the lineup` : 'Sign in to see what is playing.'}</p></div></div>
    {isAuthenticated && <MovieFilters search={search} setSearch={setSearch} genre={genre} setGenre={setGenre} genres={genres} showArchived={showArchived} setShowArchived={setShowArchived} isAdmin={isAdmin} />}
    {!isAuthenticated ? <EmptyState title="Sign in to browse" detail="Movie listings are available to signed-in members." /> : loading ? <Loader label="Loading the lineup…" /> : visible.length ? <MovieGrid movies={visible} /> : <EmptyState title="No films match that search" detail="Try a different title or clear your filters." action={<button className="btn btn-secondary" onClick={() => { setSearch(''); setGenre(''); }}>Clear filters</button>} />}
  </section>;
}
