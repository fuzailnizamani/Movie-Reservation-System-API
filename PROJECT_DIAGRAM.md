# Movie Reservation System — Project Diagram

## Application architecture

```mermaid
flowchart LR
  subgraph Browser["Customer or admin browser"]
    SPA["React SPA<br/>Vite · React Router"]
    ClientAPI["Axios API clients<br/>access / refresh tokens"]
    Elements["Stripe Elements"]
    SPA --> ClientAPI
    SPA --> Elements
  end

  Proxy["Vite /api proxy<br/>(development)"]
  API["Express API<br/>server/server.js"]
  Routes["API routes<br/>auth · movies · screens · showtimes<br/>customer reservations · admin reporting"]
  Middleware["JWT authentication<br/>admin role checks"]
  Controllers["Controllers<br/>users · movies · screens<br/>showtimes · reservations · admin reports"]
  DB["PostgreSQL<br/>node-postgres pool"]
  Stripe["Stripe<br/>PaymentIntents"]
  Webhook["Stripe webhook<br/>signature-verified events"]
  Worker["Reservation worker<br/>runs every minute"]

  ClientAPI -->|"/api requests"| Proxy
  Proxy --> API
  API --> Routes
  Routes --> Middleware
  Middleware --> Controllers
  Controllers <--> DB
  Controllers <-->|"create / retrieve PaymentIntent"| Stripe
  Elements <-->|"confirm payment"| Stripe
  Stripe -->|"payment events"| Webhook
  API --> Webhook
  Webhook <--> DB
  Webhook -->|"refund inactive bookings"| Stripe
  Worker -->|"expire holds and release seats"| DB
```

The Vite proxy is for local development. The Express API also serves the Stripe webhook at `/webhook` and mounts the JSON APIs under `/api`.

## Main data relationships

```mermaid
erDiagram
  USERS ||--o{ RESERVATIONS : "user_id (logical association)"
  MOVIES ||--o{ SHOWTIMES : schedules
  SCREENS ||--o{ SHOWTIMES : hosts
  SCREENS ||--o{ SEATS : contains
  SHOWTIMES ||--o{ SHOWTIME_SEATS : offers
  SEATS ||--o{ SHOWTIME_SEATS : appears_in
  SHOWTIMES ||--o{ RESERVATIONS : booked_for
  RESERVATIONS ||--o{ RESERVATION_SEATS : snapshots
  SEATS o|--o{ RESERVATION_SEATS : "optional seat reference"

  USERS {
    int id PK
    string email
    string role
  }
  MOVIES {
    int id PK
    string title
  }
  SCREENS {
    int id PK
    string name
  }
  SEATS {
    int id PK
    int screen_id FK
    string row_letter
    int seat_number
    int surcharge_cents
  }
  SHOWTIMES {
    int id PK
    int movie_id FK
    int screen_id FK
    datetime start_time
    datetime end_time
  }
  SHOWTIME_SEATS {
    int showtime_id PK, FK
    int seat_id PK, FK
    string status
    int reservation_id FK
    int price_override_cents
  }
  RESERVATIONS {
    int id PK
    int user_id
    int showtime_id FK
    string status
    string payment_status
    int amount
    string currency
    string payment_intent_id
  }
  RESERVATION_SEATS {
    int id PK
    int reservation_id FK
    int seat_id FK
    string seat_label
    int price_cents
  }
```

`RESERVATION_SEATS` preserves the seat label and price charged at booking time; its `seat_id` may be null if the original seat is deleted. `RESERVATIONS.user_id` associates a booking with a user in application logic; the migrations do not define it as a database foreign key.

## Seat booking and payment

```mermaid
sequenceDiagram
  actor Customer
  participant UI as React client
  participant API as Express API
  participant DB as PostgreSQL
  participant Stripe
  participant Worker as Expiration worker

  Customer->>UI: Select showtime and seats
  UI->>API: POST /api/reservations
  API->>DB: Lock available seats; create pending reservation and seat snapshots
  DB-->>API: Commit reservation and 10-minute seat hold
  API-->>UI: Reservation ID and total
  UI->>API: POST /api/reservations/create-payment-intent
  API->>Stripe: Create or retrieve PaymentIntent
  Stripe-->>API: Payment client secret
  API-->>UI: Payment client secret
  UI->>Stripe: Confirm payment with Stripe Elements
  Stripe-->>API: Signed payment_intent.succeeded webhook
  API->>DB: Mark reservation paid and confirmed; mark seats booked
  API-->>Stripe: Acknowledge webhook

  opt Payment succeeds after the hold expired or reservation was cancelled
    Worker->>DB: Expire old pending reservations and release held seats
    Stripe-->>API: Signed payment_intent.succeeded webhook
    API->>Stripe: Refund payment for inactive reservation
    API->>DB: Record refund status
  end
```
