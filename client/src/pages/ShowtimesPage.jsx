import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getShowtimes } from "../api/showtimesApi";
import { errorMessage } from "../api/axiosClient";
import useAuth from "../hooks/useAuth";
import ShowtimeCard from "../components/showtimes/ShowtimeCard";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import {
  addDateKeyDays,
  formatShowtimeDateKey,
  getShowtimeDateKey,
} from "../utils/showtimeDateTime";

export default function ShowtimesPage() {
  const [showtimes, setShowtimes] = useState([]);
  const [day, setDay] = useState("");
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  useEffect(() => {
    setLoading(true);
    getShowtimes(day ? { date: day } : {})
      .then(setShowtimes)
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [day]);
  const days = Array.from({ length: 8 }, (_, index) =>
    addDateKeyDays(getShowtimeDateKey(), index),
  );
  const upcomingShowtimes = showtimes.filter(
    (showtime) => new Date(showtime.start_time) > new Date(),
  );
  return (
    <section className="container section page-enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLAN YOUR VISIT</span>
          <h1>
            Showtimes<span className="brand-dot">.</span>
          </h1>
          <p>Choose a screening and find your seat.</p>
        </div>
      </div>
      <div className="date-tabs">
        <button className={!day ? "active" : ""} onClick={() => setDay("")}>
          All dates
        </button>
        {days.map((date) => (
          <button
            key={date}
            className={day === date ? "active" : ""}
            onClick={() => setDay(date)}
          >
            {formatShowtimeDateKey(date, {
              weekday: "short",
              day: "numeric",
            })}
          </button>
        ))}
      </div>
      {loading ? (
        <Loader label="Checking the schedule…" />
      ) : upcomingShowtimes.length ? (
        <div className="showtime-list">
          {upcomingShowtimes.map((showtime) => (
            <ShowtimeCard key={showtime.id} showtime={showtime} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No upcoming screenings"
          detail={
            isAdmin
              ? "Schedule a future showtime to make tickets available."
              : "There are no future screenings scheduled yet. Please check back soon."
          }
          action={
            isAdmin ? (
              <a className="btn btn-primary" href="/admin/showtimes">
                Schedule a showtime
              </a>
            ) : null
          }
        />
      )}
    </section>
  );
}
