require('dotenv').config();
const express = require('express');
const db = require('./db');

const reservationsRouter = require('./routes/reservationsRouter');
const showtimesRouter = require('./routes/showtimesRouter');
const webhookController = require('./controllers/webhookController');
const userRouter = require('./routes/userRouter');

require('./worker');

const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), webhookController.handleWebhook);

app.use(express.json());

app.use('/api/auth', userRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/showtimes', showtimesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});