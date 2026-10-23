import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Download,
  ReceiptText,
  Ticket,
} from "lucide-react";
import toast from "react-hot-toast";
import { downloadReservationReceipt } from "../../api/reservationsApi";
import { errorMessage } from "../../api/axiosClient";
import Badge from "../ui/Badge";
import { formatShowtime } from "../../utils/showtimeDateTime";

const tone = {
  confirmed: "success",
  paid: "success",
  pending_payment: "warning",
  expired: "neutral",
  cancelled: "danger",
};
export default function ReservationCard({ reservation }) {
  const status = reservation.status || "pending_payment";
  const [downloading, setDownloading] = useState(false);
  const canDownload =
    status === "confirmed" && reservation.payment_status === "paid";
  const download = async () => {
    setDownloading(true);
    try {
      await downloadReservationReceipt(reservation.id);
    } catch (error) {
      toast.error(error.message || errorMessage(error));
    } finally {
      setDownloading(false);
    }
  };
  return (
    <article className="reservation-card">
      <div className="ticket-icon">
        <Ticket size={21} />
      </div>
      <div className="reservation-main">
        <div className="reservation-title">
          <h3>{reservation.movie_title || `Reservation #${reservation.id}`}</h3>
          <Badge tone={tone[status] || "neutral"}>
            {status.replace(/_/g, " ")}
          </Badge>
        </div>
        {reservation.start_time && (
          <p>
            <CalendarDays size={15} />
            {formatShowtime(reservation.start_time)}{" "}
            {reservation.screen_name ? `· ${reservation.screen_name}` : ""}
          </p>
        )}
        <span className="reservation-sub">
          {reservation.booking_reference || `Reservation #${reservation.id}`}
          {reservation.seat_labels?.length
            ? ` · Seat${reservation.seat_labels.length > 1 ? "s" : ""} ${reservation.seat_labels.join(", ")}`
            : ""}
          {reservation.payment_status === "refunded" ? " · Refunded" : ""}
        </span>
        {Number.isInteger(reservation.amount) && reservation.currency && (
          <span className="reservation-sub">
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: reservation.currency.toUpperCase(),
            }).format(reservation.amount / 100)}{" "}
            total
          </span>
        )}
      </div>
      <div className="reservation-card-actions">
        <Link
          className="icon-button"
          to={`/reservations/${reservation.id}`}
          aria-label={`View reservation ${reservation.id}`}
        >
          <ArrowUpRight size={18} />
        </Link>
        <Link
          className="icon-button"
          to={`/reservations/${reservation.id}/receipt`}
          aria-label={`View receipt ${reservation.id}`}
        >
          <ReceiptText size={18} />
        </Link>
        {canDownload && (
          <button
            type="button"
            className="icon-button"
            disabled={downloading}
            onClick={download}
            aria-label={`Download receipt ${reservation.id}`}
          >
            <Download size={18} />
          </button>
        )}
      </div>
    </article>
  );
}
