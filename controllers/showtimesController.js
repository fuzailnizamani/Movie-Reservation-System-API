const db = require('../db');

const showtimesIdSeatsController = async (req, res) => {
    const showtimeId = req.params.id;
    try {
    const query = `
      SELECT 
        s.id AS seat_id,
        s.row_letter,
        s.seat_number,
        ss.status
      FROM showtime_seats ss
      JOIN seats s ON ss.seat_id = s.id
      WHERE ss.showtime_id = $1
      ORDER BY s.row_letter, s.seat_number;
    `;

    const { rows } = await db.query(query, [showtimeId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Showtime inventory not found.' });
    }

    res.status(200).json({
      showtime_id: showtimeId,
      inventory: rows
    });

  } catch (error) {
    console.error('Inventory extraction failed:', error);
    res.status(500).json({ error: 'System failure.' });
  }
}


module.exports = {
    getShowtimeSeats: showtimesIdSeatsController
}