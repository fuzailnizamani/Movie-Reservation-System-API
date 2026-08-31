require('dotenv').config();
const express = require('express');
const db = require('./db');

const reservationsRouter = require('./routes/reservationsRouter');
const showtimesRouter = require('./routes/showtimesRouter');
const webhookController = require('./controllers/webhookController');

require('./worker');

const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), webhookController.handleWebhook);

app.use(express.json());
app.use(reservationsRouter);
app.use('/showtimes', showtimesRouter);

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