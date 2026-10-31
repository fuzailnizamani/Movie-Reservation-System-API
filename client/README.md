# Reelhouse Cinema Client

React 18 + Vite frontend for the Movie Reservation System API.

## Setup

1. In `server/`, install dependencies with `npm install`.
2. Copy `server/.env.example` to `server/.env` and set the PostgreSQL, JWT, and Stripe secrets.
3. Start the backend from `server/` with `npm run dev` (default: `http://localhost:3000`).
4. In `client/`, install dependencies with `npm install`.
5. Copy `client/.env.example` to `client/.env` and set `VITE_STRIPE_PUBLISHABLE_KEY` to your Stripe publishable key. Set `VITE_PROXY_TARGET` if the backend is not on port 3000. For the Vercel deployment, set `VITE_API_BASE_URL=https://movie-reservation-system-api.onrender.com/api`; keep `/api` for local development.
6. Run `npm run dev` from `client/` and open the URL printed by Vite.

Vite proxies `/api` requests to the backend, so local development does not require CORS configuration. The frontend contains no Stripe secret key. Use Stripe test credentials only in development.

## Backend integration notes

- The API is expected at `/api`; the backend's default port is 3000.
- Showtime creation, updates, deletion, and per-showtime seat-price changes require backend admin authorization. Public showtime and seat-inventory reads remain available without admin access.
- Screens are archived rather than physically deleted. Upcoming or running showtimes block archiving; completed showtimes and booking history remain intact. Admins can view archived screens and restore them from the Screens page.
- Reservations can contain multiple seats. The backend calculates and stores each seat's price and the reservation total in USD cents; the default showtime base price is $10 per seat. Seat surcharges and showtime-specific seat-price overrides are configurable by admins.
- Run `npm run migrate up` from `server/` to apply the database migrations. Showtime times are entered and displayed in the cinema timezone, `Asia/Karachi`. The timezone migration interprets existing timezone-less showtime values as UTC instants, matching the prior form's ISO-UTC submissions. Do not skip migrations when deploying the backend.
- The backend supports registration, login, access-token refresh at `/api/auth/refresh-token`, logout, movies, screens/seats, showtimes, customer reservations, admin reservation reporting at `/api/admin/reservations`, and Stripe PaymentIntents. Profile editing and password changes are not currently supported. The admin reporting endpoint requires a valid administrator access token and supports pagination plus status, movie, and reservation-creation date filters.
