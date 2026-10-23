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
    CREATE TABLE movies (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      duration_minutes INT NOT NULL,
      release_date DATE
    );

    CREATE TABLE screens (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      total_capacity INT NOT NULL
    );

    CREATE TABLE seats (
      id SERIAL PRIMARY KEY,
      screen_id INT REFERENCES screens(id) ON DELETE CASCADE,
      row_letter VARCHAR(5) NOT NULL,
      seat_number INT NOT NULL,
      UNIQUE(screen_id, row_letter, seat_number)
    );

    CREATE TABLE showtimes (
      id SERIAL PRIMARY KEY,
      movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
      screen_id INT REFERENCES screens(id) ON DELETE CASCADE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL
    );

    CREATE TABLE showtime_seats (
      showtime_id INT REFERENCES showtimes(id) ON DELETE CASCADE,
      seat_id INT REFERENCES seats(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'available',
      PRIMARY KEY (showtime_id, seat_id)
    );

    CREATE TABLE reservations (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      showtime_id INT REFERENCES showtimes(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'pending_payment',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => { 
    pgm.sql(`
    DROP TABLE IF EXISTS reservations;
    DROP TABLE IF EXISTS showtime_seats;
    DROP TABLE IF EXISTS showtimes;
    DROP TABLE IF EXISTS seats;
    DROP TABLE IF EXISTS screens;
    DROP TABLE IF EXISTS movies;
  `);
};
