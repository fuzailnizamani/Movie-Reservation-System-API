/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE showtimes
      ADD COLUMN base_price_cents INTEGER NOT NULL DEFAULT 1000
        CHECK (base_price_cents >= 0),
      ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'usd'
        CHECK (currency = 'usd');

    ALTER TABLE seats
      ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'standard'
        CHECK (category IN ('standard', 'premium', 'extra_legroom', 'vip')),
      ADD COLUMN surcharge_cents INTEGER NOT NULL DEFAULT 0
        CHECK (surcharge_cents >= 0);

    ALTER TABLE showtime_seats
      ADD COLUMN price_override_cents INTEGER
        CHECK (price_override_cents IS NULL OR price_override_cents >= 0);

    UPDATE reservations
    SET amount = COALESCE(amount, 1000),
        currency = COALESCE(currency, 'usd');

    CREATE TABLE reservation_seats (
      id SERIAL PRIMARY KEY,
      reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      seat_id INTEGER REFERENCES seats(id) ON DELETE SET NULL,
      seat_label VARCHAR(20) NOT NULL,
      category VARCHAR(30) NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      UNIQUE (reservation_id, seat_label)
    );

    CREATE INDEX reservation_seats_reservation_id_idx
      ON reservation_seats (reservation_id);

    INSERT INTO reservation_seats (reservation_id, seat_id, seat_label, category, price_cents)
    SELECT ss.reservation_id,
           s.id,
           s.row_letter || s.seat_number,
           s.category,
           COALESCE(ss.price_override_cents, st.base_price_cents + s.surcharge_cents)
    FROM showtime_seats ss
    JOIN seats s ON s.id = ss.seat_id
    JOIN showtimes st ON st.id = ss.showtime_id
    WHERE ss.reservation_id IS NOT NULL
    ON CONFLICT (reservation_id, seat_label) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE showtime_seats
      DROP COLUMN IF EXISTS price_override_cents;
    DROP TABLE IF EXISTS reservation_seats;
    ALTER TABLE seats
      DROP COLUMN IF EXISTS surcharge_cents,
      DROP COLUMN IF EXISTS category;
    ALTER TABLE showtimes
      DROP COLUMN IF EXISTS currency,
      DROP COLUMN IF EXISTS base_price_cents;
  `);
};
