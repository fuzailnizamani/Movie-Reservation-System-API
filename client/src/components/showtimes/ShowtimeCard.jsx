import { Link } from "react-router-dom";
import { ArrowRight, Clock3, MonitorPlay } from "lucide-react";
import {
  formatShowtime,
  SHOWTIME_TIME_ZONE,
} from "../../utils/showtimeDateTime";

export default function ShowtimeCard({ showtime }) {
  const start = new Date(showtime.start_time);
  if (start <= new Date()) return null;
  const price = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: (showtime.currency || "usd").toUpperCase(),
  }).format((showtime.base_price_cents ?? 1000) / 100);
  const startTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: SHOWTIME_TIME_ZONE,
  }).format(start);
  const startDate = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: SHOWTIME_TIME_ZONE,
  }).format(start);
  return (
    <article className="showtime-row">
      <div className="showtime-clock">
        <strong>{startTime}</strong>
      </div>
      <div className="showtime-info">
        <strong>{showtime.movie_title}</strong>
        <span>
          <MonitorPlay size={14} /> {showtime.screen_name} <i>·</i>{" "}
          <Clock3 size={14} /> {startDate}
        </span>
      </div>
      <div className="showtime-price">
        <strong>{price}</strong>
        <span>Base price per seat</span>
      </div>
      <Link
        className="btn btn-secondary btn-sm"
        to={`/showtimes/${showtime.id}/seats`}
      >
        Choose seats <ArrowRight size={15} />
      </Link>
    </article>
  );
}
