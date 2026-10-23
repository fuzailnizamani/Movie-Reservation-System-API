import { useCallback, useEffect, useState } from 'react';
import { Edit2, Plus, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { archiveMovie, createMovie, getMovies, updateMovie } from '../../api/moviesApi';
import { errorMessage } from '../../api/axiosClient';
import MovieForm from '../../components/admin/MovieForm';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Loader from '../../components/ui/Loader';

export default function AdminMovies() {
  const [movies, setMovies] = useState([]); const [loading, setLoading] = useState(true); const [editing, setEditing] = useState(null); const [archiving, setArchiving] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => getMovies().then(setMovies).catch((error) => toast.error(errorMessage(error))).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  const save = async (values) => { try { if (editing?.id) await updateMovie(editing.id, values); else await createMovie(values); toast.success(editing?.id ? 'Movie updated' : 'Movie created'); setEditing(null); await load(); } catch (error) { toast.error(errorMessage(error)); throw error; } };
  const archive = async () => { setBusy(true); try { await archiveMovie(archiving.id); toast.success('Movie archived'); setArchiving(null); await load(); } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(false); } };
  if (loading) return <Loader label="Loading movie catalog…" />;
  return <section className="admin-page"><div className="admin-page-heading"><div><span className="eyebrow">CATALOG</span><h1>Movies</h1><p>Create and maintain the film listing.</p></div><button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add movie</button></div><DataTable columns={['Title', 'Genre', 'Duration', 'Release date', 'Status', 'Actions']} rows={movies} renderRow={(movie) => <tr key={movie.id}><td className="cell-title">{movie.title}</td><td>{movie.genre || '—'}</td><td>{movie.duration_minutes} min</td><td>{movie.release_date?.slice(0, 10) || '—'}</td><td><span className={`badge ${movie.is_archived ? 'badge-neutral' : 'badge-success'}`}>{movie.is_archived ? 'Archived' : 'Active'}</span></td><td><div className="table-actions"><button className="icon-button" aria-label={`Edit ${movie.title}`} onClick={() => setEditing(movie)}><Edit2 size={16} /></button>{!movie.is_archived && <button className="icon-button danger-icon" aria-label={`Archive ${movie.title}`} onClick={() => setArchiving(movie)}><Archive size={16} /></button>}</div></td></tr>} />
    <Modal open={Boolean(editing)} title={editing?.id ? 'Edit movie' : 'Add a movie'} onClose={() => setEditing(null)}>{editing && <MovieForm initial={editing} onSubmit={save} onCancel={() => setEditing(null)} />}</Modal><ConfirmDialog open={Boolean(archiving)} title="Archive this movie?" message={`${archiving?.title} will be hidden from regular members. Movies with current or upcoming showtimes cannot be archived.`} confirmLabel="Archive movie" loading={busy} onCancel={() => setArchiving(null)} onConfirm={archive} />
  </section>;
}
