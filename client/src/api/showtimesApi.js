import { api } from "./axiosClient";

export const getShowtimes = (params) =>
  api.get("/showtimes", { params }).then(({ data }) => data.showtimes || []);
export const getShowtime = (id) =>
  api.get(`/showtimes/${id}`).then(({ data }) => data.showtime);
export const getShowtimeSeats = (id) =>
  api.get(`/showtimes/${id}/seats`).then(({ data }) => data.inventory || []);
export const createShowtime = (payload) =>
  api.post("/showtimes", payload).then(({ data }) => data.showtime);
export const updateShowtime = (id, payload) =>
  api.patch(`/showtimes/${id}`, payload).then(({ data }) => data.showtime);
export const deleteShowtime = (id) =>
  api.delete(`/showtimes/${id}`).then(({ data }) => data);
export const updateShowtimeSeatPrice = (
  showtimeId,
  seatId,
  priceOverrideCents,
) =>
  api
    .patch(`/showtimes/${showtimeId}/seats/${seatId}/price`, {
      priceOverrideCents,
    })
    .then(({ data }) => data);
