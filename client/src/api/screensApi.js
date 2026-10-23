import { api } from "./axiosClient";

export const getScreens = (archivedOnly = false) =>
  api
    .get("/screens", {
      params: archivedOnly ? { archivedOnly: true } : {},
    })
    .then(({ data }) => data.screens || []);
export const getScreen = (id) =>
  api.get(`/screens/${id}`).then(({ data }) => data.screen);
export const getScreenSeats = (id) =>
  api.get(`/screens/${id}/seats`).then(({ data }) => data.seats || []);
export const createScreen = (payload) =>
  api.post("/screens", payload).then(({ data }) => data.screen);
export const createScreenSeats = (id, payload) =>
  api.post(`/screens/${id}/seats`, payload).then(({ data }) => data);
export const updateScreen = (id, payload) =>
  api.patch(`/screens/${id}`, payload).then(({ data }) => data.screen);
export const archiveScreen = (id) =>
  api.patch(`/screens/${id}/archive`).then(({ data }) => data);
export const restoreScreen = (id) =>
  api.patch(`/screens/${id}/restore`).then(({ data }) => data);
export const updateScreenSeatPricing = (screenId, seatId, payload) =>
  api
    .patch(`/screens/${screenId}/seats/${seatId}/pricing`, payload)
    .then(({ data }) => data.seat);
