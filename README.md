# Movie Reservation System

[![Live Demo](https://img.shields.io/badge/live_demo-Visit_Reelhouse-e50914?style=for-the-badge)](https://movie-reservation-system-api.vercel.app/)
[![React](https://img.shields.io/badge/frontend-React_18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/build-Vite-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/backend-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Stripe](https://img.shields.io/badge/payments-Stripe-635bff?logo=stripe&logoColor=white)](https://stripe.com/)

A full-stack movie ticket reservation application built with React, Express, PostgreSQL, and Stripe. Moviegoers can browse films, explore showtimes, choose multiple seats, pay securely, and manage their reservations. Cinema administrators can manage movies, screens, seating, showtimes, prices, and reservation reports through a protected admin area.

The project was developed as a practical portfolio application to demonstrate frontend development, REST API design, relational data modeling, authentication, reservation business logic, payment integration, and deployment.

## Live Demo

**[Visit Live Website](https://movie-reservation-system-api.vercel.app/)**

The public deployment provides the customer-facing application. Administrative pages and administrative API operations require an account with the `admin` role and are not assumed to be publicly accessible.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [How the Application Works](#how-the-application-works)
- [Database Design](#database-design)
- [REST API](#rest-api)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Security and Validation](#security-and-validation)
- [Current Limitations](#current-limitations)
- [Future Improvements](#future-improvements)
- [Developer and Contact](#developer-and-contact)

## Features

### Normal User Features

- Register with a username, email address, and password.
- Log in with JWT access and refresh tokens.
- Browse movies and filter them by title or genre.
- View individual movie details.
- Browse upcoming showtimes and filter by movie, date, or screen through the API.
- View a showtime's screen and live seat inventory.
- Select one or more available seats.
- See base prices, seat categories, surcharges, and showtime-specific price overrides.
- Create a reservation with a ten-minute payment hold.
- Pay through Stripe Payment Intents and Stripe Elements.
- View payment confirmation and reservation status.
- View personal reservations and individual reservation details.
- Cancel pending or confirmed reservations where the reservation rules allow it.
- View receipt details and download a PDF receipt for confirmed, paid reservations.
- Use the profile page and protected reservation, checkout, receipt, and payment-result routes.

### Admin Features and Management System

The admin interface is available under `/admin` in the client and is protected by both the client route guard and server-side JWT role authorization.

- Create, update, and archive movies.
- View archived movies as an administrator.
- Create and update cinema screens.
- Generate seats for screens.
- Configure seat categories such as `standard`, `premium`, `extra_legroom`, and `vip`.
- Configure seat surcharge amounts.
- Archive and restore screens.
- View archived screens.
- Create, update, and archive showtimes.
- Prevent overlapping showtimes on the same screen.
- Set showtime base prices.
- Override the price of an individual seat for a specific showtime.
- Prevent scheduling on archived screens or archived movies.
- Review reservation reports with pagination and filters for status, movie, and reservation creation date.
- Inspect customers, movies, showtimes, screens, seats, reservation status, payment status, totals, and booking references in the admin reservation report.
- Apply business rules that preserve completed showtimes and booking history when deletion or archiving is restricted.

Administrative functionality includes additional management operations and business logic that are not available to regular users. If you are interested in exploring how the admin functionality works, understanding its implementation, or learning more about administrative access, feel free to contact me.

## Technology Stack

### Frontend

- **React 18**: component-based user interface.
- **JavaScript**: application logic and UI behavior.
- **React Router**: client-side routing and protected routes.
- **Vite**: development server and production bundler.
- **Axios**: HTTP client with access-token injection and refresh-token handling.
- **React Hook Form and Zod**: login and registration form handling and validation.
- **Stripe React SDK and Stripe.js**: Stripe Elements and payment confirmation.
- **Lucide React**: interface icons.
- **date-fns**: date-related frontend dependency.
- **CSS**: the existing dark Reelhouse Cinema visual system and responsive layout.

### Backend

- **Node.js**: JavaScript runtime.
- **Express 5**: HTTP server and REST API routing.
- **CommonJS modules**: backend module format.
- **CORS**: cross-origin request configuration.
- **node-postgres (`pg`)**: PostgreSQL connection pooling and transactions.
- **node-cron**: scheduled reservation expiration worker.
- **PDFKit**: PDF receipt generation.
- **dotenv**: environment configuration.

### Database

- **PostgreSQL**: persistent storage for users, movies, screens, seats, showtimes, reservations, and seat snapshots.
- **SQL**: parameterized queries and transactional reservation operations.
- **node-pg-migrate**: ordered database migrations under `server/migrations`.

### Authentication and Security

- **JSON Web Tokens (`jsonwebtoken`)**: signed access and refresh tokens.
- **bcrypt**: password hashing and password verification.
- **Authentication middleware**: validates bearer access tokens.
- **Role middleware**: restricts administrative operations to users with the `admin` role.
- **Zod and controller validation**: validates frontend forms and backend request fields.

### Payment Integration

- **Stripe Payment Intents**: creates or reuses payment intents for pending reservations.
- **Stripe Elements**: collects and confirms payment details in the frontend.
- **Stripe Webhooks**: verifies signed payment and refund events before updating PostgreSQL.

### Development and Deployment Tools

- **Git and GitHub**: source control and repository hosting.
- **Vite development proxy**: forwards local `/api` requests to the backend.
- **Postman or similar API clients**: useful for testing the REST API.
- **pgAdmin or another PostgreSQL client**: useful for inspecting the database.
- **Stripe CLI**: useful for forwarding test webhook events during local payment testing.

## System Architecture

The frontend and backend are separate applications in the same repository. The React client sends HTTP requests to the Express API. The API applies authentication and business rules, uses PostgreSQL transactions for reservation and seat operations, and communicates with Stripe for payment processing.

```mermaid
flowchart LR
  User[Customer or admin browser]
  Client[React SPA\nVite + React Router]
  Axios[Axios API clients\nJWT access and refresh handling]
  Elements[Stripe Elements]
  Proxy[Vite /api proxy\nlocal development]
  API[Express REST API\nserver/server.js]
  Auth[JWT auth and admin role middleware]
  Controllers[Controllers\nusers movies screens showtimes reservations reports]
  DB[(PostgreSQL)]
  Stripe[Stripe Payment Intents]
  Webhook[POST /webhook\nraw body + signature verification]
  Worker[node-cron worker\nevery minute]

  User --> Client
  Client --> Axios
  Client --> Elements
  Axios --> Proxy
  Proxy --> API
  API --> Auth
  Auth --> Controllers
  Controllers <--> DB
  Controllers <--> Stripe
  Elements <--> Stripe
  Stripe --> Webhook
  Webhook <--> DB
  Webhook --> Stripe
  Worker --> DB
```

The webhook route is registered before `express.json()` so Stripe receives the raw request body required for signature verification. The worker is loaded when the server starts and checks for expired pending reservations every minute.

## Project Structure

```text
Movie Reservation System/
├── README.md
├── PROJECT_DIAGRAM.md
├── payment.html
├── client/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── api/                 # Axios API modules
│       ├── components/          # Layout, movies, seats, reservations, admin, UI
│       ├── context/             # AuthContext
│       ├── hooks/               # useAuth
│       ├── pages/               # Customer and payment pages
│       ├── pages/admin/         # Admin dashboard pages
│       ├── routes/              # ProtectedRoute and AdminRoute
│       └── utils/               # Showtime/date formatting helpers
└── server/
    ├── .env.example
    ├── package.json
    ├── server.js               # Express app and route mounting
    ├── db.js                   # PostgreSQL pool
    ├── seed.js                 # Example cinema data generator
    ├── worker.js               # Reservation expiration job
    ├── controllers/            # Request handlers and business logic
    ├── middleware/             # JWT and admin authorization
    ├── routes/                 # REST route definitions
    └── migrations/             # node-pg-migrate schema history
```

Important entry points:

- `client/src/main.jsx` mounts the React application.
- `client/src/App.jsx` defines customer, payment, protected, and admin routes.
- `server/server.js` creates the Express app and mounts `/api` routes and `/webhook`.
- `server/db.js` creates the PostgreSQL pool from `DATABASE_URL`.
- `server/worker.js` expires old pending reservations.
- `server/controllers/webhookController.js` processes Stripe payment and refund events.

## How the Application Works

### User Authentication

1. A user registers with `POST /api/auth/register`.
2. The server validates required fields and email format, checks for duplicate email addresses, hashes the password with bcrypt, and creates a `user` account.
3. Login verifies the bcrypt password hash and issues:
   - A JWT access token that expires after one hour.
   - A refresh token that expires after seven days and is stored for the user.
4. The frontend stores both tokens in `localStorage` and derives the current user role from the access-token payload.
5. Axios attaches the access token to API requests. When an access token expires, it attempts to exchange the refresh token for a new access token.
6. `ProtectedRoute` redirects unauthenticated users to `/login`. `AdminRoute` additionally requires the `admin` role.
7. Logout clears the stored refresh token on the server and removes both local tokens in the client.

### Movie Browsing

Authenticated client requests use `/api/movies`. Regular users receive non-archived movies, while administrators can access archived movie records. The API supports `search` and `genre` query filters. Movie details include title, description, genre, duration, release date, and optional poster data.

### Showtime Selection

Showtime reads are available through `/api/showtimes`, `/api/showtimes/:id`, and `/api/showtimes/:id/seats`. The API supports filtering by `movieId`, `date`, and `screenId`. Showtime times are stored as timezone-aware PostgreSQL timestamps and the application uses the cinema timezone `Asia/Karachi` for date filtering and display.

When an administrator creates a showtime, the server verifies the movie and screen, rejects archived resources, requires a screen with seats, prevents overlapping showtimes on that screen, and creates the related `showtime_seats` inventory rows.

### Seat Selection

The seat-selection page loads showtime details and seat inventory. Each seat exposes its status, category, surcharge, and calculated price. The customer can select multiple available seats. The server rechecks availability inside a transaction, locks the relevant rows, and calculates prices again before creating a reservation. The client never determines the final payable amount by itself.

### Reservation Creation

`POST /api/reservations` performs the following operations in a PostgreSQL transaction:

1. Validates the showtime ID and selected seat IDs.
2. Rejects duplicate or invalid seat IDs.
3. Locks the showtime and selected seat inventory.
4. Rejects archived, started, or unavailable showtimes and seats.
5. Calculates each seat as `price_override_cents ?? base_price_cents + surcharge_cents`.
6. Creates a `pending_payment` reservation with a unique booking reference.
7. Marks the selected `showtime_seats` as `pending_payment`.
8. Stores seat, movie, screen, and showtime snapshots in the reservation.
9. Stores individual seat prices in `reservation_seats`.

The response contains the reservation ID, booking reference, seat pricing, total amount, currency, and `pending_payment` status.

### Payment Processing

1. The client opens checkout for the pending reservation.
2. `POST /api/reservations/create-payment-intent` verifies that the reservation belongs to the authenticated user, is still pending, has not started, and still has its held seats.
3. The server creates or reuses a Stripe PaymentIntent for the server-calculated amount in USD cents and stores its ID on the reservation.
4. Stripe Elements confirms the PaymentIntent in the browser using the publishable key.
5. Stripe sends a signed `payment_intent.succeeded` event to `/webhook`.
6. The webhook verifies the signature, reservation metadata, PaymentIntent ID, amount, and currency.
7. If the reservation and seat hold are still valid, the webhook sets the reservation to `confirmed`, sets `payment_status` to `paid`, records `paid_at`, and marks the seats `booked`.
8. The client polls the reservation after returning from Stripe and displays the receipt when confirmation is available.

The webhook also handles `payment_intent.payment_failed` and `refund.updated`. A successful payment received after an expired or cancelled reservation triggers an attempted Stripe refund instead of confirming the inactive booking.

### Reservation Expiration

- `server/worker.js` schedules a job every minute with `node-cron`.
- Reservations with `status = 'pending_payment'` older than ten minutes are changed to `expired`.
- Their associated `showtime_seats` rows are changed to `available` and their `reservation_id` is cleared.
- The frontend checkout countdown also represents a ten-minute hold.
- If Stripe later reports payment success for an expired or cancelled reservation, the webhook marks the payment for refund and attempts an idempotent refund through Stripe.

### Admin Management

Admin requests carry a JWT whose payload includes `role: 'admin'`. The server verifies the token before applying the admin role middleware. Admin operations use transactions where resource state and seat inventory must remain consistent.

Examples of enforced business rules include:

- Movies and showtimes can be archived instead of physically removed when history must be preserved.
- Archived movies and screens cannot receive new showtimes.
- Screens with upcoming or running showtimes cannot be archived.
- Showtimes on the same screen cannot overlap.
- Seat and showtime price values are validated as non-negative integer cents.
- Reservation reports reject unsupported filters and cap the page size at 100.

## Database Design

The schema is built cumulatively by the migrations in `server/migrations`. The main entities and relationships are:

```mermaid
erDiagram
  USERS ||--o{ RESERVATIONS : "logical user_id association"
  MOVIES ||--o{ SHOWTIMES : schedules
  SCREENS ||--o{ SEATS : contains
  SCREENS ||--o{ SHOWTIMES : hosts
  SHOWTIMES ||--o{ SHOWTIME_SEATS : offers
  SEATS ||--o{ SHOWTIME_SEATS : appears_in
  SHOWTIMES ||--o{ RESERVATIONS : booked_for
  RESERVATIONS ||--o{ RESERVATION_SEATS : snapshots
  SEATS o|--o{ RESERVATION_SEATS : references
  RESERVATIONS o|--o{ SHOWTIME_SEATS : holds

  USERS {
    integer id PK
    varchar username
    varchar email UK
    varchar password
    varchar role
    varchar refresh_token
    timestamp created_at
  }
  MOVIES {
    integer id PK
    varchar title
    integer duration_minutes
    date release_date
    text description
    varchar genre
    varchar poster
    boolean is_archived
  }
  SCREENS {
    integer id PK
    varchar name
    integer total_capacity
    boolean is_archived
  }
  SEATS {
    integer id PK
    integer screen_id FK
    varchar row_letter
    integer seat_number
    varchar category
    integer surcharge_cents
  }
  SHOWTIMES {
    integer id PK
    integer movie_id FK
    integer screen_id FK
    timestamptz start_time
    timestamptz end_time
    integer base_price_cents
    varchar currency
    boolean is_archived
  }
  SHOWTIME_SEATS {
    integer showtime_id PK, FK
    integer seat_id PK, FK
    varchar status
    integer reservation_id FK
    integer price_override_cents
  }
  RESERVATIONS {
    integer id PK
    integer user_id
    integer showtime_id FK
    varchar status
    timestamp created_at
    varchar payment_intent_id
    varchar booking_reference UK
    integer amount
    varchar currency
    varchar payment_status
    timestamp paid_at
    timestamp refunded_at
    text_array seat_labels
    varchar movie_title_snapshot
    varchar movie_poster_snapshot
    varchar screen_name_snapshot
    timestamptz showtime_start_snapshot
    timestamptz showtime_end_snapshot
  }
  RESERVATION_SEATS {
    integer id PK
    integer reservation_id FK
    integer seat_id FK
    varchar seat_label
    varchar category
    integer price_cents
  }
```

### Table Responsibilities

| Table               | Purpose                              | Important rules                                                                    |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `users`             | Accounts and refresh-token storage   | Unique email; default role is `user`.                                              |
| `movies`            | Movie catalog and archive state      | Admin-created; regular movie reads exclude archived rows.                          |
| `screens`           | Cinema auditoriums                   | Can be archived and restored; contains physical seats.                             |
| `seats`             | Physical seats belonging to a screen | Unique per screen, row, and number; category and surcharge are stored here.        |
| `showtimes`         | Scheduled screenings                 | References a movie and screen; stores timezone-aware times and base price.         |
| `showtime_seats`    | Per-screening seat inventory         | Composite primary key; tracks `available`, `pending_payment`, and `booked` states. |
| `reservations`      | Customer booking and payment state   | Stores booking reference, amount, payment fields, and historical snapshots.        |
| `reservation_seats` | Seat-level price and label snapshot  | Preserves what was booked even if the physical seat later changes.                 |

Important constraints include unique user email, unique booking reference, unique physical seat coordinates within a screen, composite showtime-seat identity, non-negative seat surcharges and price overrides, allowed seat categories, and USD showtime currency. Reservation and payment status values are primarily enforced by application logic rather than database `CHECK` constraints. `reservations.user_id` is also an application-level association without a database foreign key in the migration history.

## REST API

The server mounts the routers below from `server/server.js`. Unless stated otherwise, protected endpoints require:

```http
Authorization: Bearer <access-token>
```

The base URL is `/api` in local development. The Stripe webhook is mounted separately at `/webhook`.

### Authentication APIs

| Method | Endpoint                  | Auth       | Description                                              |
| ------ | ------------------------- | ---------- | -------------------------------------------------------- |
| `POST` | `/api/auth/register`      | Public     | Validate and create a user account.                      |
| `POST` | `/api/auth/login`         | Public     | Verify credentials and return access and refresh tokens. |
| `POST` | `/api/auth/refresh-token` | Public     | Exchange a stored refresh token for a new access token.  |
| `POST` | `/api/auth/logout`        | User token | Clear the user's stored refresh token.                   |

Example registration request:

```json
{
  "username": "moviegoer",
  "email": "moviegoer@example.com",
  "password": "replace-with-a-password"
}
```

### Movie APIs

All movie endpoints require a user token. Admin-only operations additionally require the `admin` role.

| Method   | Endpoint          | Auth       | Description                                                  |
| -------- | ----------------- | ---------- | ------------------------------------------------------------ |
| `GET`    | `/api/movies`     | User token | List movies; supports `search` and `genre` query parameters. |
| `GET`    | `/api/movies/:id` | User token | Return one movie.                                            |
| `POST`   | `/api/movies`     | Admin      | Create a movie.                                              |
| `PATCH`  | `/api/movies/:id` | Admin      | Update permitted movie fields.                               |
| `DELETE` | `/api/movies/:id` | Admin      | Archive a movie rather than physically deleting it.          |

### Screen and Seat APIs

All screen routes require a user token. Mutating screen and seat-management routes require the `admin` role.

| Method   | Endpoint                                       | Auth       | Description                                                                        |
| -------- | ---------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `GET`    | `/api/screens`                                 | User token | List active screens; admins may request archived screens with `archivedOnly=true`. |
| `GET`    | `/api/screens/:id`                             | User token | Return one screen.                                                                 |
| `GET`    | `/api/screens/:screenId/seats`                 | User token | List the physical seats for a screen.                                              |
| `POST`   | `/api/screens`                                 | Admin      | Create a screen.                                                                   |
| `PATCH`  | `/api/screens/:id`                             | Admin      | Update screen name or capacity.                                                    |
| `PATCH`  | `/api/screens/:id/archive`                     | Admin      | Archive a screen when business rules permit it.                                    |
| `PATCH`  | `/api/screens/:id/restore`                     | Admin      | Restore an archived screen.                                                        |
| `DELETE` | `/api/screens/:id`                             | Admin      | Archive/delete operation implemented by the screen controller.                     |
| `POST`   | `/api/screens/:screenId/seats`                 | Admin      | Add a seat to a screen.                                                            |
| `PATCH`  | `/api/screens/:screenId/seats/:seatId/pricing` | Admin      | Update seat category and surcharge.                                                |

### Showtime APIs

Showtime reads and seat-inventory reads are public at the server level. The client may still protect some booking screens because booking requires authentication.

| Method   | Endpoint                                 | Auth   | Description                                                          |
| -------- | ---------------------------------------- | ------ | -------------------------------------------------------------------- |
| `GET`    | `/api/showtimes`                         | Public | List showtimes; supports `movieId`, `date`, and `screenId`.          |
| `GET`    | `/api/showtimes/:id`                     | Public | Return showtime details.                                             |
| `GET`    | `/api/showtimes/:id/seats`               | Public | Return seat inventory and calculated prices.                         |
| `POST`   | `/api/showtimes`                         | Admin  | Create a showtime and its seat inventory.                            |
| `PATCH`  | `/api/showtimes/:id`                     | Admin  | Update a showtime.                                                   |
| `DELETE` | `/api/showtimes/:id`                     | Admin  | Archive or remove a showtime according to reservation history rules. |
| `PATCH`  | `/api/showtimes/:id/seats/:seatId/price` | Admin  | Set a showtime-specific seat price override.                         |

### Reservation and Payment APIs

All reservation endpoints require the authenticated user's token. Reservation reads are scoped to the current user.

| Method  | Endpoint                                  | Auth       | Description                                                                |
| ------- | ----------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `GET`   | `/api/reservations`                       | User token | List the current user's reservations.                                      |
| `GET`   | `/api/reservations/:id`                   | User token | View one owned reservation.                                                |
| `POST`  | `/api/reservations`                       | User token | Create a pending-payment reservation and hold seats.                       |
| `POST`  | `/api/reservations/create-payment-intent` | User token | Create or reuse the Stripe PaymentIntent for an owned pending reservation. |
| `PATCH` | `/api/reservations/:id/cancel`            | User token | Cancel an eligible reservation and release its seats.                      |
| `GET`   | `/api/reservations/:id/receipt`           | User token | Return receipt data for an owned reservation.                              |
| `GET`   | `/api/reservations/:id/receipt/pdf`       | User token | Stream a PDF receipt for an eligible paid reservation.                     |

Example reservation request:

```json
{
  "showtimeId": 12,
  "seatIds": [101, 102]
}
```

Example reservation response shape:

```json
{
  "reservation_id": 34,
  "booking_reference": "MOV-...",
  "seats": [
    {
      "seatId": 101,
      "label": "A1",
      "category": "standard",
      "priceCents": 1000
    }
  ],
  "totalAmount": 2000,
  "amount": 2000,
  "currency": "usd",
  "status": "pending_payment"
}
```

### Admin Reporting API

| Method | Endpoint                  | Auth  | Description                   |
| ------ | ------------------------- | ----- | ----------------------------- |
| `GET`  | `/api/admin/reservations` | Admin | Paginated reservation report. |

Supported query parameters are `page`, `limit` up to `100`, `status`, `movieId`, `dateFrom`, and `dateTo`. Supported reservation statuses include `pending_payment`, `confirmed`, `paid`, `cancelled`, and `expired`.

### Stripe Webhook API

| Method | Endpoint   | Auth             | Description                                          |
| ------ | ---------- | ---------------- | ---------------------------------------------------- |
| `POST` | `/webhook` | Stripe signature | Verify and process Stripe payment and refund events. |

Handled events:

- `payment_intent.succeeded`: confirm valid reservations or initiate a refund for inactive reservations.
- `payment_intent.payment_failed`: mark a still-pending reservation payment as failed.
- `refund.updated`: record pending, failed, or successful refund state.

## Local Setup

### Prerequisites

- Node.js with npm. Use a current LTS release compatible with the installed React/Vite and Express dependencies.
- PostgreSQL with a database and connection string.
- Git.
- A Stripe account and matching test-mode keys for local payment testing.
- Stripe CLI if you want to forward Stripe webhooks to a local server.

### 1. Clone the Repository

```bash
git clone https://github.com/fuzailnizamani/Movie-Reservation-System-API.git
cd Movie-Reservation-System
```

### 2. Configure and Run the Backend

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env`, fill in the values described below, and make sure the PostgreSQL database exists.

Apply all migrations:

```bash
npm run migrate up
```

Start the backend with automatic restart during development:

```bash
npm run dev
```

Start the backend normally:

```bash
npm start
```

The default server port is `3000`. The optional `seed.js` script can create example movie, screen, seat, and showtime data after the schema is available:

```bash
node seed.js
```

Do not run the seed script repeatedly against a database unless duplicate sample data is acceptable.

### 3. Configure and Run the Frontend

Open a second terminal:

```bash
cd client
npm install
```

Copy `client/.env.example` to `client/.env` and set a Stripe publishable key. For local development, the default `/api` path is proxied to `http://localhost:3000` by Vite.

Start Vite:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

The client package also provides formatting commands:

```bash
npm run format
npm run format:check
```

Neither `client/package.json` nor `server/package.json` currently defines an automated test script.

### Local Stripe Webhooks

For local payment testing, forward Stripe events to the backend webhook route. The exact CLI command depends on your Stripe CLI installation; the destination should be:

```text
http://localhost:3000/webhook
```

Use the webhook signing secret supplied by Stripe CLI as `STRIPE_WEBHOOK_SECRET`. The frontend publishable key and backend secret key must use the same Stripe mode, either both test keys or both live keys.

## Environment Variables

Create local environment files from the example files. Never commit real credentials.

### Backend: `server/.env`

```dotenv
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
JWT_SECRET=replace_with_a_long_random_secret
REFRESH_TOKEN_SECRET=replace_with_a_different_long_random_secret
```

| Variable                | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `PORT`                  | Express listening port; defaults to `3000` when omitted. |
| `DATABASE_URL`          | PostgreSQL connection string used by `pg`.               |
| `STRIPE_SECRET_KEY`     | Server-side Stripe SDK authentication.                   |
| `STRIPE_WEBHOOK_SECRET` | Verifies the raw Stripe webhook signature.               |
| `JWT_SECRET`            | Signs and verifies one-hour access tokens.               |
| `REFRESH_TOKEN_SECRET`  | Signs and verifies seven-day refresh tokens.             |

### Frontend: `client/.env`

```dotenv
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

| Variable                      | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `VITE_API_BASE_URL`           | API base URL used by Axios. `/api` is suitable for the local Vite proxy. |
| `VITE_PROXY_TARGET`           | Backend target used by the Vite development proxy.                       |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Browser-safe Stripe publishable key used by Stripe.js and Elements.      |

Only publishable Stripe configuration belongs in the frontend. Never place `STRIPE_SECRET_KEY`, database passwords, JWT secrets, or webhook secrets in `client/.env`.

## Security and Validation

The implemented security and validation measures include:

- Passwords are hashed with bcrypt before storage.
- Access and refresh tokens are signed with separate secrets and different expiration periods.
- Bearer access tokens are verified by `userAuthMiddleware`.
- Admin endpoints require both a valid user token and the `admin` role.
- Axios retries eligible unauthorized requests through the refresh-token endpoint.
- Registration and login validate required fields and email format.
- Reservation creation validates positive integer IDs, rejects duplicate seats, and recalculates the total on the server.
- PostgreSQL transactions and row locks protect seat availability during reservation creation.
- The server checks showtime state, seat state, ownership, payment amount, payment currency, and Stripe metadata before confirmation.
- Stripe webhook signatures are verified against the raw request body.
- Stripe refunds use an idempotency key for inactive reservations.
- SQL values are passed through parameterized queries rather than concatenated user input.
- Receipt and reservation endpoints verify the authenticated user owns the requested reservation.
- Environment files are used for secrets and should remain outside version control.

These controls are application features, not a substitute for production hardening. Review deployment CORS, TLS, secret rotation, logging, rate limiting, and database access policies before operating the service publicly.

## Current Limitations

The following points are observable in the current source and should not be mistaken for implemented features:

- There is no automated test script in either package.
- Password changes and profile editing do not have backend API support.
- Cancelling a paid reservation releases seats but does not automatically refund the payment.
- Failed payments leave a pending seat hold until cancellation or the ten-minute expiration job handles it.
- The expiration worker releases seats but does not proactively update `payment_status` or refund a PaymentIntent unless a later Stripe success event triggers the inactive-payment path.
- Reservation, payment, and seat status values are mostly enforced in application code rather than database `CHECK` constraints.
- The migration history does not create a database foreign key from `reservations.user_id` to `users.id`.
- Earlier migrations contain duplicate `CREATE TABLE IF NOT EXISTS` definitions, so an already-created database may not receive every intended constraint from later definitions. Apply migrations in order to a fresh or correctly migrated database and inspect existing deployments before changing schema state.
- `screens.total_capacity` is not automatically synchronized with the number of generated seats.
- The frontend stores access and refresh tokens in `localStorage`.
- The client-side role comes from the JWT payload, so a role change does not affect an already-issued token until a new token is issued.
- The server CORS configuration allows the configured deployed frontend origin rather than every origin.
- Movies require authentication at the backend route level, while showtime reads are public.

## Future Improvements

Potential future improvements, clearly separate from the current implementation, include:

- Add automated unit, integration, and end-to-end tests for authentication, seat concurrency, payment webhooks, and admin rules.
- Move browser token storage to a stronger session strategy such as secure, HTTP-only cookies.
- Add explicit database constraints and indexes for status fields, ownership relationships, and payment intent uniqueness.
- Add a dedicated refund workflow for user-initiated cancellation of paid bookings.
- Improve worker observability, retry handling, and payment reconciliation.
- Add rate limiting, structured logging, and production health checks.
- Add profile editing and password-change endpoints.
- Add seat-capacity reconciliation and stronger seat-grid validation.
- Add automated API documentation generation and OpenAPI/Swagger specifications.

## Developer and Contact

Movie Reservation System was developed as a personal portfolio project to demonstrate practical full-stack development skills, including:

- React frontend development and responsive UI design.
- Express REST API development.
- PostgreSQL schema design, migrations, and transactional operations.
- JWT authentication and role-based authorization.
- Reservation and seat-availability business logic.
- Stripe PaymentIntent and webhook integration.
- PDF receipt generation and scheduled background processing.
- Application deployment and environment configuration.

Connect with me on GitHub: [fuzailnizamani](https://github.com/fuzailnizamani)

- **Live website:** [https://movie-reservation-system-api.vercel.app/](https://movie-reservation-system-api.vercel.app/)
- **GitHub:** [https://github.com/fuzailnizamani](https://github.com/fuzailnizamani)

Recruiters, developers, and anyone interested in the implementation are welcome to connect and discuss the project.
