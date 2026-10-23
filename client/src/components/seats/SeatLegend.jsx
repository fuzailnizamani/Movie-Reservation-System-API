export default function SeatLegend() {
  return (
    <div
      className="seat-legend"
      aria-label="Seat availability and category legend"
    >
      <span>
        <i className="legend-standard" />
        Standard
      </span>
      <span>
        <i className="legend-premium" />
        Premium
      </span>
      <span>
        <i className="legend-selected" />
        Selected
      </span>
      <span>
        <i className="legend-booked" />
        Booked
      </span>
      <span>
        <i className="legend-pending" />
        Held
      </span>
    </div>
  );
}
