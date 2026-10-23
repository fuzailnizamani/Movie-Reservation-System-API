export default function Seat({
  seat,
  basePriceCents,
  selected,
  onToggle,
  onKeyDown,
}) {
  const status = selected ? "selected" : seat.status;
  const isPremium =
    Number.isInteger(seat.price_override_cents) &&
    Number.isInteger(basePriceCents) &&
    seat.price_override_cents > basePriceCents;
  const priceClass = isPremium ? "premium" : "standard";
  const priceLabel = isPremium ? "premium" : "standard";
  const price = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: (seat.currency || "usd").toUpperCase(),
  }).format(seat.price_cents / 100);
  const label = `${seat.row_letter}${seat.seat_number}, ${priceLabel}, ${price}, ${selected ? "selected" : seat.status.replace("_", " ")}`;
  const unavailable = seat.status !== "available" && !selected;
  return (
    <button
      type="button"
      className={`seat seat-${status} seat-price-${priceClass}`}
      data-category-mark={isPremium ? "P" : undefined}
      aria-label={label}
      aria-pressed={selected}
      disabled={unavailable}
      onClick={() => onToggle(seat.seat_id)}
      onKeyDown={onKeyDown}
      title={label}
    >
      <span>{seat.seat_number}</span>
    </button>
  );
}
