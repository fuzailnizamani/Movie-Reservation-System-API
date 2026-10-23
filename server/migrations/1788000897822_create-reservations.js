/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
     pgm.sql(`
    CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      showtime_id INT NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`
    DROP TABLE IF EXISTS reservations;
  `);
};
