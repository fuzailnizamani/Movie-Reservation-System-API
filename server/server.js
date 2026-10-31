require('dotenv').config();
const express = require('express');
const cors = require('cors');

const reservationsRouter = require('./routes/reservationsRouter');
const showtimesRouter = require('./routes/showtimesRouter');
const webhookController = require('./controllers/webhookController');
const userRouter = require('./routes/userRouter');
const movieRouter = require('./routes/moviesRouter');
const screensRouter = require('./routes/screensRouter');
const adminRouter = require('./routes/adminRouter');

require('./worker');

const app = express();

const corsOptions = {
  origin: 'https://movie-reservation-system-api.vercel.app',
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.post('/webhook', express.raw({ type: 'application/json' }), webhookController.handleWebhook);

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', userRouter);
app.use('/api/movies', movieRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/showtimes', showtimesRouter);
app.use('/api/screens', screensRouter);
app.use('/api/admin', adminRouter);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}