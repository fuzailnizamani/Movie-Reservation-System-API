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
    -- Existing app submissions were ISO UTC strings stored in timezone-less columns.
    ALTER TABLE showtimes
      ALTER COLUMN start_time TYPE TIMESTAMPTZ
        USING start_time AT TIME ZONE 'UTC',
      ALTER COLUMN end_time TYPE TIMESTAMPTZ
        USING end_time AT TIME ZONE 'UTC';

    ALTER TABLE reservations
      ALTER COLUMN showtime_start_snapshot TYPE TIMESTAMPTZ
        USING showtime_start_snapshot AT TIME ZONE 'UTC',
      ALTER COLUMN showtime_end_snapshot TYPE TIMESTAMPTZ
        USING showtime_end_snapshot AT TIME ZONE 'UTC';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE reservations
      ALTER COLUMN showtime_start_snapshot TYPE TIMESTAMP
        USING showtime_start_snapshot AT TIME ZONE 'UTC',
      ALTER COLUMN showtime_end_snapshot TYPE TIMESTAMP
        USING showtime_end_snapshot AT TIME ZONE 'UTC';

    ALTER TABLE showtimes
      ALTER COLUMN start_time TYPE TIMESTAMP
        USING start_time AT TIME ZONE 'UTC',
      ALTER COLUMN end_time TYPE TIMESTAMP
        USING end_time AT TIME ZONE 'UTC';
  `);
};
