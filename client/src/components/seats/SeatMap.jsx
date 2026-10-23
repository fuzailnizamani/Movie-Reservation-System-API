import Seat from "./Seat";
import SeatLegend from "./SeatLegend";

export default function SeatMap({
  inventory,
  basePriceCents,
  selected,
  onToggle,
}) {
  const rows = Object.groupBy
    ? Object.groupBy(inventory, (seat) => seat.row_letter)
    : inventory.reduce(
        (groups, seat) => ({
          ...groups,
          [seat.row_letter]: [...(groups[seat.row_letter] || []), seat],
        }),
        {},
      );
  const labels = Object.keys(rows).sort();
  const handleKey = (event) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    const buttons = [...document.querySelectorAll(".seat:not(:disabled)")];
    const index = buttons.indexOf(event.currentTarget);
    const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    buttons[(index + step + buttons.length) % buttons.length]?.focus();
    event.preventDefault();
  };
  return (
    <div className="seat-map-wrap">
      <div className="screen-arc">
        <span>SCREEN</span>
      </div>
      <div className="seat-map" role="group" aria-label="Choose your seats">
        {labels.map((rowLabel) => (
          <div className="seat-row" key={rowLabel}>
            <span className="row-label">{rowLabel}</span>
            <div className="seat-row-items">
              {rows[rowLabel].map((seat, index) => (
                <span
                  className={index === 5 ? "seat-gap" : ""}
                  key={seat.seat_id}
                >
                  <Seat
                    seat={seat}
                    basePriceCents={basePriceCents}
                    selected={selected.includes(seat.seat_id)}
                    onToggle={onToggle}
                    onKeyDown={handleKey}
                  />
                </span>
              ))}
            </div>
            <span className="row-label">{rowLabel}</span>
          </div>
        ))}
      </div>
      <SeatLegend />
    </div>
  );
}
