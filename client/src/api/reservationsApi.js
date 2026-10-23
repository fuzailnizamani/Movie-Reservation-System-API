import { api } from './axiosClient';

export const getReservations = () => api.get('/reservations').then(({ data }) => data.reservations || []);
export const getReservation = (id) => api.get(`/reservations/${id}`).then(({ data }) => data.reservation);
export const createReservation = (payload) => api.post('/reservations', payload).then(({ data }) => data);
export const createPaymentIntent = (reservationId) => api.post('/reservations/create-payment-intent', { reservationId }).then(({ data }) => data);
export const cancelReservation = (id) => api.patch(`/reservations/${id}/cancel`).then(({ data }) => data);
export const getReservationReceipt = (id) => api.get(`/reservations/${id}/receipt`).then(({ data }) => data.receipt);
export const downloadReservationReceipt = async (id) => {
  let response;
  try {
    response = await api.get(`/reservations/${id}/receipt/pdf`, { responseType: 'blob' });
  } catch (error) {
    const body = error.response?.data;
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      try {
        const payload = JSON.parse(await body.text());
        throw new Error(payload.error || payload.message || error.message);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) throw error;
        throw parseError;
      }
    }
    const message = body?.error || body?.message;
    if (message) throw new Error(message);
    throw error;
  }
  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes('application/pdf')) {
    const body = await response.data.text();
    let message = 'The receipt PDF could not be downloaded.';
    try {
      message = JSON.parse(body).error || message;
    } catch {
      if (body) message = body;
    }
    throw new Error(message);
  }

  const disposition = response.headers['content-disposition'] || '';
  const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || 'movie-booking-receipt.pdf';
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
