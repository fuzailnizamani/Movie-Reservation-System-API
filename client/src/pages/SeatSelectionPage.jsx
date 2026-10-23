import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Armchair, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { createReservation } from "../api/reservationsApi";
import { getShowtime, getShowtimeSeats } from "../api/showtimesApi";
import { errorMessage } from "../api/axiosClient";
import SeatMap from "../components/seats/SeatMap";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import { formatShowtime } from "../utils/showtimeDateTime";

const formatPrice = (cents, currency = "usd") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

export default function SeatSelectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showtime, setShowtime] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [details, seats] = await Promise.all([
      getShowtime(id),
      getShowtimeSeats(id),
    ]);

    setShowtime(details);
    setInventory(seats);
  }, [id]);

  useEffect(() => {
    load()
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [load]);

  const toggleSeat = (seatId) => {
    if (selected.includes(seatId)) {
      setSelected((current) => current.filter((idValue) => idValue !== seatId));
      return;
    }

    setSelected((current) => [...current, seatId]);
  };
  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await createReservation({
        showtimeId: Number(id),
        seatIds: selected,
      });
      toast.success(
        `Seats reserved · ${formatPrice(result.totalAmount, result.currency)}`,
      );
      navigate(`/checkout/${result.reservation_id}`);
    } catch (error) {
      if (error.response?.status === 409) {
        await load();
        setSelected([]);
        toast.error("Some seats were just taken. Choose again.");
      } else toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return <Loader label="Loading the seating plan…" />;
  if (!showtime)
    return (
      <section className="container section">
        <EmptyState
          title="Showtime unavailable"
          detail="This screening could not be found."
        />
      </section>
    );
  const started = new Date(showtime.start_time) <= new Date();
  const availableCount = inventory.filter(
    (seat) => seat.status === "available",
  ).length;
  return (
    <section className="container section page-enter">
      <Link className="back-link" to="/showtimes">
        <ArrowLeft size={16} /> Back to showtimes
      </Link>
      <div className="seat-heading">
        <div>
          <span className="eyebrow">SELECT YOUR SEATS</span>
          <h1>{showtime.movie_title}</h1>
          <p>
            {formatShowtime(showtime.start_time)} <span>·</span>{" "}
            {showtime.screen_name}
          </p>
        </div>
        <div className="available-count">
          <Armchair size={18} />
          <span>{availableCount} seats available</span>
        </div>
      </div>
      {started ? (
        <EmptyState
          title="This screening has started"
          detail="Booking closes when a screening begins. Choose another future showtime."
          action={
            <Link className="btn btn-secondary" to="/showtimes">
              Browse showtimes
            </Link>
          }
        />
      ) : inventory.length ? (
        <div className="booking-layout">
          <SeatMap
            inventory={inventory}
            basePriceCents={showtime.base_price_cents}
            selected={selected}
            onToggle={toggleSeat}
          />
          <aside className="booking-summary">
            <span className="eyebrow">YOUR SELECTION</span>
            <h2>
              {selected.length} {selected.length === 1 ? "seat" : "seats"}
            </h2>
            <div className="selected-chips">
              {selected.length ? (
                inventory
                  .filter((seat) => selected.includes(seat.seat_id))
                  .map((seat) => (
                    <button
                      key={seat.seat_id}
                      onClick={() => toggleSeat(seat.seat_id)}
                      aria-label={`Remove seat ${seat.row_letter}${seat.seat_number}`}
                    >
                      {seat.row_letter}
                      {seat.seat_number} ·{" "}
                      {formatPrice(seat.price_cents, showtime.currency)} ×
                    </button>
                  ))
              ) : (
                <p>Select one or more seats from the map.</p>
              )}
            </div>
            <div className="summary-price">
              <span>Estimated total</span>
              <strong>
                {formatPrice(
                  inventory
                    .filter((seat) => selected.includes(seat.seat_id))
                    .reduce((total, seat) => total + seat.price_cents, 0),
                  showtime.currency,
                )}
              </strong>
            </div>
            <p className="demo-note">
              Prices are per seat. Final pricing is confirmed by the server when
              your seats are reserved. Seats are held for 10 minutes at
              checkout.
            </p>
            <Button
              size="lg"
              className="full-width"
              disabled={!selected.length}
              loading={submitting}
              onClick={submit}
            >
              Continue to checkout <ArrowRight size={16} />
            </Button>
          </aside>
        </div>
      ) : (
        <EmptyState
          title="Seat inventory unavailable"
          detail="This screening has no seats configured."
        />
      )}
    </section>
  );
}
