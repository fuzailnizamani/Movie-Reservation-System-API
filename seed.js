// seed.js
const db = require('./db');

async function generateTheaterData() {
  const client = await db.pool.connect();

  try {
    console.log('Initiating surgical data injection...');
    await client.query('BEGIN');

    // 1. Establish the Product
    const movieRes = await client.query(`
      INSERT INTO movies (title, duration_minutes, release_date) 
      VALUES ('The Working Class Strikes Back', 120, '2026-10-01') 
      RETURNING id;
    `);
    const movieId = movieRes.rows[0].id;

    // 2. Establish the Physical Infrastructure
    const screenRes = await client.query(`
      INSERT INTO screens (name, total_capacity) 
      VALUES ('Main Auditorium', 100) 
      RETURNING id;
    `);
    const screenId = screenRes.rows[0].id;

    // 3. Generate the Physical Seating Grid
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatsPerRow = 10;
    
    for (const row of rows) {
      for (let i = 1; i <= seatsPerRow; i++) {
        await client.query(`
          INSERT INTO seats (screen_id, row_letter, seat_number) 
          VALUES ($1, $2, $3);
        `, [screenId, row, i]);
      }
    }

    // 4. Establish the Temporal Event
    const showtimeRes = await client.query(`
      INSERT INTO showtimes (movie_id, screen_id, start_time, end_time) 
      VALUES ($1, $2, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours') 
      RETURNING id;
    `, [movieId, screenId]);
    const showtimeId = showtimeRes.rows[0].id;

    // 5. Map Physical Seats to the Virtual Availability Grid
    await client.query(`
      INSERT INTO showtime_seats (showtime_id, seat_id)
      SELECT $1, id FROM seats WHERE screen_id = $2;
    `, [showtimeId, screenId]);

    await client.query('COMMIT');
    console.log('Injection complete. Cartel monopoly bypassed.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Injection failed. Rolling back changes:', error);
  } finally {
    client.release();
    process.exit();
  }
}

generateTheaterData();