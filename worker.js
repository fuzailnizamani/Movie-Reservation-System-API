const cron = require('node-cron');
const db = require('./db');

cron.schedule('* * * * *', async () => {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Find reservations that have been pending for more than 10 minutes
    const expireQuery = `
      UPDATE reservations
      SET status = 'expired' ,
          payment_intent_id = NULL
      WHERE status = 'pending_payment'
      AND created_at < NOW() - INTERVAL '10 minutes'
      RETURNING id;
    `;

    const { rows } = await client.query(expireQuery);

    // Nothing to expire
    if (rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    // Get the IDs of expired reservations
    const expiredIds = rows.map(row => row.id);

    // Release the seats belonging to those reservations
    const releaseQuery = `
      UPDATE showtime_seats
      SET status = 'available',
          reservation_id = NULL
      WHERE reservation_id = ANY($1);
    `;

    await client.query(releaseQuery, [expiredIds]);

    await client.query('COMMIT');

    console.log(
      `Released seats from ${expiredIds.length} expired reservation(s).`
    );

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reservation expiration failed:', error);

  } finally {
    client.release();
  }
});