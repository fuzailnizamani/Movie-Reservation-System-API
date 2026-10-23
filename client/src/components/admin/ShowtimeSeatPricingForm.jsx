import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getShowtimeSeats,
  updateShowtimeSeatPrice,
} from "../../api/showtimesApi";
import { errorMessage } from "../../api/axiosClient";
import Button from "../ui/Button";
import Loader from "../ui/Loader";

const formatPrice = (cents, currency = "usd") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

const toCents = (value) => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [units, fraction = ""] = value.split(".");
  const cents = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 99999999 ? cents : null;
};

export default function ShowtimeSeatPricingForm({ showtime, onCancel }) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    getShowtimeSeats(showtime.id)
      .then((inventory) =>
        setSeats(
          inventory.map((seat) => ({
            ...seat,
            overrideInput:
              seat.price_override_cents === null
                ? ""
                : (seat.price_override_cents / 100).toFixed(2),
          })),
        ),
      )
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [showtime.id]);

  const save = async (seat) => {
    const override =
      seat.overrideInput === "" ? null : toCents(seat.overrideInput);
    if (seat.overrideInput !== "" && override === null) {
      toast.error("Enter a valid USD price with up to two decimal places.");
      return;
    }
    setSaving(seat.seat_id);
    try {
      const result = await updateShowtimeSeatPrice(
        showtime.id,
        seat.seat_id,
        override,
      );
      setSeats((current) =>
        current.map((item) =>
          item.seat_id === seat.seat_id
            ? {
                ...item,
                price_override_cents: result.priceOverrideCents,
                price_cents:
                  result.priceOverrideCents ??
                  showtime.base_price_cents + item.surcharge_cents,
                overrideInput:
                  result.priceOverrideCents === null
                    ? ""
                    : (result.priceOverrideCents / 100).toFixed(2),
              }
            : item,
        ),
      );
      toast.success(`Seat ${seat.row_letter}${seat.seat_number} price saved`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Loader label="Loading showtime seat prices…" />;

  return (
    <div className="seat-pricing-editor">
      <p className="field-hint">
        Effective price uses an override when set; otherwise it is showtime base
        price plus the seat-category surcharge. Leave the override blank to use
        that formula. Held seats cannot be repriced.
      </p>
      <div className="seat-pricing-list">
        {seats.map((seat) => (
          <div
            className="seat-pricing-row showtime-price-row"
            key={seat.seat_id}
          >
            <strong>
              {seat.row_letter}
              {seat.seat_number}
            </strong>
            <span>{seat.category.replace(/_/g, " ")}</span>
            <span>Current {formatPrice(seat.price_cents, seat.currency)}</span>
            <label className="seat-surcharge-field">
              <span>Override (USD)</span>
              <input
                inputMode="decimal"
                placeholder="Base + surcharge"
                value={seat.overrideInput}
                onChange={(event) =>
                  setSeats((current) =>
                    current.map((item) =>
                      item.seat_id === seat.seat_id
                        ? { ...item, overrideInput: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <Button
              size="sm"
              loading={saving === seat.seat_id}
              onClick={() => save(seat)}
            >
              Save
            </Button>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onCancel}>
          Close
        </Button>
      </div>
    </div>
  );
}
