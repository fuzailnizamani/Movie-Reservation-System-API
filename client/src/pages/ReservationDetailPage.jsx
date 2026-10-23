import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ReceiptText,
  Ticket,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cancelReservation, getReservation } from "../api/reservationsApi";
import { errorMessage } from "../api/axiosClient";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import { formatShowtime } from "../utils/showtimeDateTime";

const formatPrice = (cents, currency = "usd") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

export default function ReservationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getReservation(id)
      .then((result) => {
        if (active) setReservation(result);
      })
      .catch((error) => {
        if (active) toast.error(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const cancel = async () => {
    if (
      !window.confirm(
        "Cancel this reservation? No refund will be processed by the current system.",
      )
    )
      return;
    setBusy(true);
    try {
      await cancelReservation(id);
      toast.success("Reservation cancelled");
      navigate("/reservations");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader label="Loading reservation…" />;
  if (!reservation)
    return (
      <section className="container section">
        <EmptyState
          title="Reservation not found"
          detail="This reservation may not belong to your account."
        />
      </section>
    );

  const seats = (reservation.seats || []).filter(Boolean);
  const validPaid =
    reservation.status === "confirmed" && reservation.payment_status === "paid";
  return (
    <section className="container section page-enter">
      <Link className="back-link" to="/reservations">
        <ArrowLeft size={16} /> All reservations
      </Link>
      <div className="detail-reservation">
        <div className="detail-title">
          <div>
            <span className="eyebrow">
              {reservation.booking_reference ||
                `RESERVATION #${reservation.id}`}
            </span>
            <h1>{reservation.movie_name || "Movie reservation"}</h1>
          </div>
          <Badge
            tone={
              reservation.status === "confirmed"
                ? "success"
                : reservation.status === "pending_payment"
                  ? "warning"
                  : "neutral"
            }
          >
            {reservation.status?.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="reservation-facts">
          <div>
            <CalendarDays />
            <span>Showtime · {reservation.screen_name || "Screen"}</span>
            <strong>
              {reservation.start_time
                ? formatShowtime(reservation.start_time)
                : "Not available"}
              {reservation.end_time
                ? ` – ${formatShowtime(reservation.end_time, {
                    timeStyle: "short",
                  })}`
                : ""}
            </strong>
          </div>
          <div>
            <Ticket />
            <span>Seats</span>
            <strong>
              {seats.length ? seats.join(", ") : "Seat details unavailable"}
            </strong>
          </div>
          <div>
            <XCircle />
            <span>Created</span>
            <strong>{new Date(reservation.created_at).toLocaleString()}</strong>
          </div>
        </div>
        <div className="reservation-price-details">
          {(reservation.seat_details || []).map((seat) => (
            <div key={seat.label}>
              <span>
                {seat.label} · {seat.category.replace(/_/g, " ")}
              </span>
              <strong>
                {formatPrice(seat.priceCents, reservation.currency)}
              </strong>
            </div>
          ))}
          {Number.isInteger(reservation.amount) && (
            <div className="reservation-total">
              <span>
                {reservation.payment_status === "paid"
                  ? "Total charged"
                  : "Total due"}
              </span>
              <strong>
                {formatPrice(reservation.amount, reservation.currency)}
              </strong>
            </div>
          )}
        </div>
        <div className="detail-actions">
          <Link
            className="btn btn-secondary"
            to={`/reservations/${id}/receipt`}
          >
            <ReceiptText size={16} /> View receipt
          </Link>
          {reservation.status === "pending_payment" && (
            <Link className="btn btn-primary" to={`/checkout/${id}`}>
              Complete payment
            </Link>
          )}
          {["pending_payment", "confirmed", "paid"].includes(
            reservation.status,
          ) && (
            <Button variant="danger" loading={busy} onClick={cancel}>
              Cancel reservation
            </Button>
          )}
        </div>
        {!validPaid && (
          <p className="warning-copy">
            {reservation.payment_status === "refunded"
              ? "This reservation was refunded and is not a valid ticket."
              : "Payment is not confirmed. This is not a valid entry ticket."}
          </p>
        )}
        <p className="warning-copy">
          Cancelling a reservation does not automatically issue a refund.
        </p>
      </div>
    </section>
  );
}
