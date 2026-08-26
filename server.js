const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());

// Test route to verify the connection
app.get('/movies', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM movies');
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});