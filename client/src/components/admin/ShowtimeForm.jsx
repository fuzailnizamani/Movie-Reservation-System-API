import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Button from "../ui/Button";
import {
  formatShowtimeInput,
  toShowtimeIso,
} from "../../utils/showtimeDateTime";

const schema = z
  .object({
    movieId: z.string().min(1, "Choose a movie"),
    screenId: z.string().min(1, "Choose a screen"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    basePrice: z
      .string()
      .regex(
        /^\d+(?:\.\d{1,2})?$/,
        "Enter a price with up to two decimal places",
      )
      .refine((value) => Number(value) <= 999999.99, "Price is too high"),
  })
  .refine((values) => values.endTime > values.startTime, {
    path: ["endTime"],
    message: "End time must be after start time",
  });
const toCents = (value) => {
  const [units, fraction = ""] = value.split(".");
  return Number(units) * 100 + Number(fraction.padEnd(2, "0"));
};
export default function ShowtimeForm({
  movies,
  screens,
  initial = {},
  onSubmit,
  onCancel,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      movieId: String(initial.movie_id || ""),
      screenId: String(initial.screen_id || ""),
      startTime: initial.start_time
        ? formatShowtimeInput(initial.start_time)
        : "",
      endTime: initial.end_time ? formatShowtimeInput(initial.end_time) : "",
      basePrice: ((initial.base_price_cents ?? 1000) / 100).toFixed(2),
    },
  });
  return (
    <form
      className="admin-form"
      onSubmit={handleSubmit(async (values) =>
        onSubmit({
          movieId: Number(values.movieId),
          screenId: Number(values.screenId),
          startTime: toShowtimeIso(values.startTime),
          endTime: toShowtimeIso(values.endTime),
          basePriceCents: toCents(values.basePrice),
        }),
      )}
      noValidate
    >
      <label className="field">
        <span>Movie</span>
        <select {...register("movieId")}>
          <option value="">Select a movie</option>
          {movies.map((movie) => (
            <option key={movie.id} value={movie.id}>
              {movie.title} · {movie.duration_minutes} min
            </option>
          ))}
        </select>
        {errors.movieId && (
          <small className="field-error">{errors.movieId.message}</small>
        )}
      </label>
      <label className="field">
        <span>Screen</span>
        <select {...register("screenId")}>
          <option value="">Select a screen</option>
          {screens.map((screen) => (
            <option key={screen.id} value={screen.id}>
              {screen.name}
            </option>
          ))}
        </select>
        {errors.screenId && (
          <small className="field-error">{errors.screenId.message}</small>
        )}
      </label>
      <label className="field">
        <span>Base ticket price (USD)</span>
        <input
          type="number"
          min="0"
          max="999999.99"
          step="0.01"
          {...register("basePrice")}
        />
        {errors.basePrice && (
          <small className="field-error">{errors.basePrice.message}</small>
        )}
        <small className="field-hint">
          Default: $10.00 per seat. Seat surcharges are added to this price; a
          seat-specific override replaces the base price plus surcharge.
        </small>
      </label>
      <div className="form-columns">
        <label className="field">
          <span>Starts</span>
          <input type="datetime-local" {...register("startTime")} />
          {errors.startTime && (
            <small className="field-error">{errors.startTime.message}</small>
          )}
        </label>
        <label className="field">
          <span>Ends</span>
          <input type="datetime-local" {...register("endTime")} />
          {errors.endTime && (
            <small className="field-error">{errors.endTime.message}</small>
          )}
        </label>
      </div>
      <p className="field-hint">
        The API checks for schedule conflicts. Prices cannot be changed while a
        reservation is awaiting payment.
      </p>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {initial.id ? "Save showtime" : "Create showtime"}
        </Button>
      </div>
    </form>
  );
}
