import { useCallback, useEffect, useState } from "react";
import { Edit2, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { getMovies } from "../../api/moviesApi";
import { getScreens } from "../../api/screensApi";
import {
  createShowtime,
  deleteShowtime,
  getShowtimes,
  updateShowtime,
} from "../../api/showtimesApi";
import { errorMessage } from "../../api/axiosClient";
import ShowtimeForm from "../../components/admin/ShowtimeForm";
import ShowtimeSeatPricingForm from "../../components/admin/ShowtimeSeatPricingForm";
import DataTable from "../../components/admin/DataTable";
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";
import {
  formatShowtime,
  SHOWTIME_TIME_ZONE,
} from "../../utils/showtimeDateTime";

export default function AdminShowtimes() {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [pricing, setPricing] = useState(null);

  const load = useCallback(async () => {
    try {
      const [sessions, films, rooms] = await Promise.all([
        getShowtimes(),
        getMovies(),
        getScreens(),
      ]);

      setShowtimes(sessions);
      setMovies(films.filter((movie) => !movie.is_archived));
      setScreens(rooms);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const save = async (payload) => {
    try {
      if (editing?.id) await updateShowtime(editing.id, payload);
      else await createShowtime(payload);
      toast.success(editing?.id ? "Showtime updated" : "Showtime scheduled");
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const remove = async (session) => {
    if (
      !window.confirm(
        `Remove the ${session.movie_title} screening on ${formatShowtime(session.start_time)}? Upcoming showtimes with active reservations and running showtimes cannot be removed. Showtimes with booking history will be archived rather than permanently deleted.`,
      )
    )
      return;
    try {
      const result = await deleteShowtime(session.id);
      toast.success(
        result.archived
          ? "Completed showtime archived; booking history was preserved."
          : "Completed showtime deleted.",
      );
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  if (loading) return <Loader label="Loading schedule…" />;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">PROGRAMMING</span>
          <h1>Showtimes</h1>
          <p>Schedule screenings and set per-showtime ticket prices.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Add showtime
        </button>
      </div>
      <DataTable
        columns={["Movie", "Screen", "Starts", "Base price", "Ends", "Actions"]}
        rows={showtimes}
        renderRow={(session) => (
          <tr key={session.id}>
            <td className="cell-title">{session.movie_title}</td>
            <td>{session.screen_name}</td>
            <td>
              {formatShowtime(session.start_time, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </td>
            <td>
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: (session.currency || "usd").toUpperCase(),
              }).format((session.base_price_cents ?? 1000) / 100)}
            </td>
            <td>
              {new Intl.DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit",
                timeZone: SHOWTIME_TIME_ZONE,
                hour12: true,
              }).format(new Date(session.end_time))}
            </td>
            <td>
              <div className="table-actions">
                <button
                  className="icon-button"
                  aria-label={`Set seat price overrides for showtime ${session.id}`}
                  title="Seat price overrides"
                  onClick={() => setPricing(session)}
                >
                  <SlidersHorizontal size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Edit showtime ${session.id}`}
                  onClick={() => setEditing(session)}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="icon-button danger-icon"
                  aria-label={`Delete showtime ${session.id}`}
                  onClick={() => remove(session)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        )}
      />
      <Modal
        open={Boolean(editing)}
        title={editing?.id ? "Edit showtime" : "Schedule a showtime"}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <ShowtimeForm
            initial={editing}
            movies={movies}
            screens={screens}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(pricing)}
        title={`Seat prices · ${pricing?.movie_title || ""}`}
        onClose={() => setPricing(null)}
      >
        {pricing && (
          <ShowtimeSeatPricingForm
            showtime={pricing}
            onCancel={() => setPricing(null)}
          />
        )}
      </Modal>
    </section>
  );
}
