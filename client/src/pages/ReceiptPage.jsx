import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer, Ticket } from "lucide-react";
import toast from "react-hot-toast";
import {
  downloadReservationReceipt,
  getReservationReceipt,
} from "../api/reservationsApi";
import { errorMessage } from "../api/axiosClient";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import { formatShowtime } from "../utils/showtimeDateTime";

const statusTone = {
  confirmed: "success",
  paid: "success",
  pending_payment: "warning",
  failed: "danger",
  cancelled: "danger",
  expired: "neutral",
  refunded: "neutral",
  refund_pending: "warning",
  refund_failed: "danger",
};

const formatDate = (value) =>
  value
    ? formatShowtime(value, {
        dateStyle: "full",
        timeStyle: "short",
      })
    : "Not recorded";

const formatAmount = ({ amount, currency }) => {
  if (!Number.isInteger(amount) || !currency) return "Not recorded";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
};

export default function ReceiptPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    getReservationReceipt(id)
      .then((result) => {
        if (active) setReceipt(result);
      })
      .catch((error) => {
        if (!active) return;
        setFailed(true);
        toast.error(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadReservationReceipt(id);
    } catch (error) {
      toast.error(error.message || errorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  if (loading)
    return (
      <section className="container section">
        <Loader label="Loading your receipt…" />
      </section>
    );
  if (failed || !receipt) {
    return (
      <section className="container section">
        <EmptyState
          title="Receipt unavailable"
          detail="We could not load this booking receipt. It may not belong to your account."
          action={
            <Link className="btn btn-secondary" to="/reservations">
              Back to my bookings
            </Link>
          }
        />
      </section>
    );
  }

  const validTicket =
    receipt.status === "confirmed" &&
    receipt.payment.status === "paid" &&
    new Date(receipt.screening.startTime) > new Date();

  return (
    <section className="container section receipt-page page-enter">
      <Link className="back-link no-print" to={`/reservations/${id}`}>
        <ArrowLeft size={16} /> Booking details
      </Link>
      <article className="receipt-sheet">
        <header className="receipt-heading">
          <div>
            <span className="eyebrow">REELHOUSE CINEMA · BOOKING RECEIPT</span>
            <h1>{receipt.movie.title}</h1>
            <p>Booked {formatDate(receipt.bookingDate)}</p>
          </div>
          {receipt.movie.poster && (
            <img
              className="receipt-poster"
              src={receipt.movie.poster}
              alt={`${receipt.movie.title} poster`}
            />
          )}
        </header>

        <section className="receipt-reference">
          <div>
            <span>BOOKING REFERENCE</span>
            <strong>{receipt.bookingReference}</strong>
          </div>
          <div className="receipt-badges">
            <Badge tone={statusTone[receipt.status] || "neutral"}>
              {receipt.status.replace(/_/g, " ")}
            </Badge>
            <Badge tone={statusTone[receipt.payment.status] || "neutral"}>
              Payment: {receipt.payment.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </section>

        {!validTicket && (
          <p className="receipt-notice">
            {receipt.payment.status === "refund_failed"
              ? "The payment succeeded, but its refund failed. Contact the cinema; this is not a valid ticket."
              : receipt.payment.status === "refund_pending"
                ? "A refund is still processing. This booking is not a valid ticket."
                : receipt.payment.status === "refunded"
                  ? "This booking has been refunded and is not a valid ticket."
                  : receipt.status === "cancelled"
                    ? "This booking was cancelled and is not a valid ticket. Cancellation did not automatically issue a refund."
                    : receipt.status === "expired"
                      ? "This booking expired and is not a valid ticket."
                      : new Date(receipt.screening.startTime) <= new Date()
                        ? "This screening has already started or ended. This booking is no longer a valid entry ticket."
                        : "Payment is not yet confirmed. This is not a valid entry ticket."}
          </p>
        )}

        <div className="receipt-sections">
          <section>
            <h2>Screening</h2>
            <dl>
              <div>
                <dt>Screen</dt>
                <dd>{receipt.screening.screenName || "Not available"}</dd>
              </div>
              <div>
                <dt>Starts</dt>
                <dd>{formatDate(receipt.screening.startTime)}</dd>
              </div>
              <div>
                <dt>Ends</dt>
                <dd>{formatDate(receipt.screening.endTime)}</dd>
              </div>
              <div>
                <dt>Seats</dt>
                <dd>
                  {receipt.seats.length
                    ? receipt.seats.join(", ")
                    : "Seat details unavailable"}
                </dd>
              </div>
              {receipt.seatDetails.map((seat) => (
                <div key={seat.label}>
                  <dt>
                    {seat.label} · {seat.category.replace(/_/g, " ")}
                  </dt>
                  <dd>
                    {formatAmount({
                      amount: seat.priceCents,
                      currency: receipt.payment.currency,
                    })}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h2>Payment</h2>
            <dl>
              <div>
                <dt>
                  {[
                    "paid",
                    "refund_pending",
                    "refund_failed",
                    "refunded",
                  ].includes(receipt.payment.status)
                    ? "Amount charged"
                    : "Payment amount"}
                </dt>
                <dd>{formatAmount(receipt.payment)}</dd>
              </div>
              <div>
                <dt>Payment status</dt>
                <dd>{receipt.payment.status.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt>Paid at</dt>
                <dd>{formatDate(receipt.payment.paidAt)}</dd>
              </div>
              {receipt.payment.refundedAt && (
                <div>
                  <dt>Refunded at</dt>
                  <dd>{formatDate(receipt.payment.refundedAt)}</dd>
                </div>
              )}
              <div className="receipt-transaction">
                <dt>Transaction reference</dt>
                <dd>
                  {receipt.payment.transactionReference || "Not recorded"}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className="receipt-actions no-print">
          <Button loading={downloading} onClick={download}>
            <Download size={16} /> Download PDF
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </Button>
          <Link className="btn btn-ghost" to="/reservations">
            <Ticket size={16} /> My bookings
          </Link>
        </footer>
      </article>
    </section>
  );
}
