import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, CircleAlert, Download, Ticket } from "lucide-react";
import toast from "react-hot-toast";
import {
  downloadReservationReceipt,
  getReservation,
  getReservationReceipt,
} from "../api/reservationsApi";
import { errorMessage } from "../api/axiosClient";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { formatShowtime } from "../utils/showtimeDateTime";

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const reservationId = params.get("reservation_id");
  const [reservation, setReservation] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    if (!reservationId) {
      setLoading(false);
      setFailed(true);
      return;
    }
    let attempts = 0;
    let active = true;
    const poll = async () => {
      try {
        const result = await getReservation(reservationId);
        if (!active) return;
        setReservation(result);
        if (["confirmed", "paid"].includes(result.status)) {
          setConfirmed(true);
          try {
            setReceipt(await getReservationReceipt(reservationId));
          } catch (error) {
            if (active) toast.error(errorMessage(error));
          }
          setLoading(false);
          return;
        }
        if (["cancelled", "expired"].includes(result.status) || attempts >= 9) {
          setLoading(false);
          return;
        }
      } catch (error) {
        if (attempts >= 9) {
          toast.error(errorMessage(error));
          setLoading(false);
          return;
        }
      }
      attempts += 1;
      window.setTimeout(poll, 1000);
    };
    poll();
    return () => {
      active = false;
    };
  }, [reservationId]);
  const download = async () => {
    setDownloading(true);
    try {
      await downloadReservationReceipt(reservationId);
    } catch (error) {
      toast.error(error.message || errorMessage(error));
    } finally {
      setDownloading(false);
    }
  };
  if (loading)
    return (
      <section className="container section">
        <Loader label="Confirming your payment with the cinema…" />
      </section>
    );
  const invalid =
    failed ||
    !reservation ||
    ["cancelled", "expired"].includes(reservation.status);
  return (
    <section className="container section success-wrap page-enter">
      <div className={`success-mark ${invalid ? "success-mark-warning" : ""}`}>
        {invalid ? <CircleAlert size={35} /> : <Check size={35} />}
      </div>
      <span className="eyebrow">
        {invalid
          ? "PAYMENT STATUS"
          : confirmed
            ? "ALL SET"
            : "PAYMENT PROCESSING"}
      </span>
      <h1>
        {invalid
          ? "Booking needs attention."
          : confirmed
            ? "You’re going to the movie."
            : "Your booking is being confirmed."}
      </h1>
      <p>
        {invalid
          ? "The reservation is not active. Please contact the cinema before attempting another payment."
          : confirmed
            ? `${receipt?.movie.title || "Your booking"} is confirmed. See you at the show.`
            : "We’re confirming your payment and reservation. Check your bookings shortly."}
      </p>
      {receipt && (
        <div className="confirmation-ticket">
          <div>
            <span>BOOKING REFERENCE</span>
            <strong>{receipt.bookingReference}</strong>
          </div>
          <Badge tone="success">Confirmed · Paid</Badge>
          <p>
            {receipt.screening.screenName} ·{" "}
            {formatShowtime(receipt.screening.startTime)}
          </p>
          <p>
            Seats:{" "}
            {receipt.seats.length
              ? receipt.seats.join(", ")
              : "Seat details unavailable"}
          </p>
          <p>
            Paid:{" "}
            {Number.isInteger(receipt.payment.amount) &&
            receipt.payment.currency
              ? new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: receipt.payment.currency.toUpperCase(),
                }).format(receipt.payment.amount / 100)
              : "Amount not recorded"}
          </p>
        </div>
      )}
      <div className="success-actions">
        <Link className="btn btn-primary" to="/reservations">
          <Ticket size={16} /> My bookings
        </Link>
        {confirmed && receipt && (
          <Link
            className="btn btn-secondary"
            to={`/reservations/${reservationId}/receipt`}
          >
            View receipt
          </Link>
        )}
        {confirmed && receipt && (
          <Button variant="ghost" loading={downloading} onClick={download}>
            <Download size={16} /> Download PDF
          </Button>
        )}
        <Link className="btn btn-secondary" to="/">
          Back to home
        </Link>
      </div>
    </section>
  );
}
