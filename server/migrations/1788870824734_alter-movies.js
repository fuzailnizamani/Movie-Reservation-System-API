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
        ALTER TABLE movies
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS GENRE VARCHAR(50) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS POSTER VARCHAR(255) DEFAULT NULL
        `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`
        ALTER TABLE movies
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS genre,
        DROP COLUMN IF EXISTS poster
    `);
};