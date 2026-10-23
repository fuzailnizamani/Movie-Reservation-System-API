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
    ALTER TABLE reservations
      ADD COLUMN booking_reference VARCHAR(32),
      ADD COLUMN amount INTEGER,
      ADD COLUMN currency VARCHAR(3),
      ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
      ADD COLUMN paid_at TIMESTAMP,
      ADD COLUMN refunded_at TIMESTAMP,
      ADD COLUMN seat_labels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN movie_title_snapshot VARCHAR(255),
      ADD COLUMN movie_poster_snapshot VARCHAR(255),
      ADD COLUMN screen_name_snapshot VARCHAR(50),
      ADD COLUMN showtime_start_snapshot TIMESTAMP,
      ADD COLUMN showtime_end_snapshot TIMESTAMP;

    UPDATE reservations
    SET booking_reference = 'MOV-' || UPPER(SUBSTRING(
      MD5(id::text || clock_timestamp()::text || random()::text),
      1,
      24
    ));

    UPDATE reservations
    SET amount = 1000,
        currency = 'usd'
    WHERE payment_intent_id IS NOT NULL;

    UPDATE reservations r
    SET seat_labels = COALESCE((
      SELECT ARRAY_AGG(s.row_letter || s.seat_number ORDER BY s.row_letter, s.seat_number)
      FROM showtime_seats ss
      JOIN seats s ON s.id = ss.seat_id
      WHERE ss.reservation_id = r.id
    ), ARRAY[]::TEXT[]);

    UPDATE reservations
    SET payment_status = CASE
      WHEN status IN ('confirmed', 'paid') THEN 'paid'
      WHEN status = 'pending_payment' THEN 'pending'
      ELSE 'unknown'
    END;

    ALTER TABLE reservations
      ALTER COLUMN booking_reference SET NOT NULL,
      ALTER COLUMN payment_status SET DEFAULT 'pending',
      ADD CONSTRAINT reservations_booking_reference_key UNIQUE (booking_reference);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE reservations
      DROP CONSTRAINT IF EXISTS reservations_booking_reference_key,
      DROP COLUMN IF EXISTS booking_reference,
      DROP COLUMN IF EXISTS amount,
      DROP COLUMN IF EXISTS currency,
      DROP COLUMN IF EXISTS payment_status,
      DROP COLUMN IF EXISTS paid_at,
      DROP COLUMN IF EXISTS refunded_at,
      DROP COLUMN IF EXISTS seat_labels,
      DROP COLUMN IF EXISTS movie_title_snapshot,
      DROP COLUMN IF EXISTS movie_poster_snapshot,
      DROP COLUMN IF EXISTS screen_name_snapshot,
      DROP COLUMN IF EXISTS showtime_start_snapshot,
      DROP COLUMN IF EXISTS showtime_end_snapshot;
  `);
};
