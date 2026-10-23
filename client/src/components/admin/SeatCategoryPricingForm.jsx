import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getScreenSeats, updateScreenSeatPricing } from "../../api/screensApi";
import { errorMessage } from "../../api/axiosClient";
import Button from "../ui/Button";
import Loader from "../ui/Loader";

const categories = [
  ["standard", "Standard"],
  ["premium", "Premium"],
  ["extra_legroom", "Extra legroom"],
  ["vip", "VIP"],
];

export default function SeatCategoryPricingForm({ screen, onCancel }) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    getScreenSeats(screen.id)
      .then(setSeats)
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [screen.id]);

  const update = async (seat) => {
    setSaving(seat.id);
    try {
      const saved = await updateScreenSeatPricing(screen.id, seat.id, {
        category: seat.category,
        surchargeCents: Number(seat.surcharge_cents),
      });
      setSeats((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      toast.success(`${saved.row_letter}${saved.seat_number} pricing saved`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Loader label="Loading seat categories…" />;

  return (
    <div className="seat-pricing-editor">
      <p className="field-hint">
        Configure each seat category and its surcharge in USD cents. Changes are
        blocked while that seat is held for payment; existing bookings keep
        their saved prices.
      </p>
      <div className="seat-pricing-list">
        {seats.map((seat) => (
          <div className="seat-pricing-row" key={seat.id}>
            <strong>
              {seat.row_letter}
              {seat.seat_number}
            </strong>
            <select
              aria-label={`Category for seat ${seat.row_letter}${seat.seat_number}`}
              value={seat.category}
              onChange={(event) =>
                setSeats((current) =>
                  current.map((item) =>
                    item.id === seat.id
                      ? { ...item, category: event.target.value }
                      : item,
                  ),
                )
              }
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="seat-surcharge-field">
              <span>Surcharge (cents)</span>
              <input
                type="number"
                min="0"
                max="99999999"
                step="1"
                value={seat.surcharge_cents}
                onChange={(event) =>
                  setSeats((current) =>
                    current.map((item) =>
                      item.id === seat.id
                        ? { ...item, surcharge_cents: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <Button
              size="sm"
              loading={saving === seat.id}
              disabled={
                !Number.isSafeInteger(Number(seat.surcharge_cents)) ||
                Number(seat.surcharge_cents) < 0
              }
              onClick={() => update(seat)}
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
