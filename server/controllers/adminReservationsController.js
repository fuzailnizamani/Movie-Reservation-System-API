const db = require('../db');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const RESERVATION_STATUSES = new Set([
  'pending_payment',
  'confirmed',
  'paid',
  'cancelled',
  'expired'
]);
const ALLOWED_QUERY_PARAMS = new Set([
  'page',
  'limit',
  'status',
  'movieId',
  'dateFrom',
  'dateTo'
]);

const parsePositiveInteger = (value, name, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} is outside the supported range.`);
  }
  return parsed;
};

const parseDate = (value, name) => {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) ||
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${name} must be a valid date in YYYY-MM-DD format.`);
  }
  return value;
};

const getAdminReservations = async (req, res) => {
  try {
    for (const key of Object.keys(req.query)) {
      if (!ALLOWED_QUERY_PARAMS.has(key)) {
        return res.status(400).json({ error: `Unsupported query parameter: ${key}.` });
      }
    }

    const page = parsePositiveInteger(req.query.page, 'page', DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, 'limit', DEFAULT_LIMIT);
    if (limit > MAX_LIMIT) {
      return res.status(400).json({ error: `limit must not exceed ${MAX_LIMIT}.` });
    }
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset)) {
      return res.status(400).json({ error: 'page is outside the supported range.' });
    }

    const { status, movieId: rawMovieId } = req.query;
    if (status !== undefined && (typeof status !== 'string' || !RESERVATION_STATUSES.has(status))) {
      return res.status(400).json({ error: 'status is not a supported reservation status.' });
    }
    const movieId = rawMovieId === undefined
      ? undefined
      : parsePositiveInteger(rawMovieId, 'movieId');
    const dateFrom = parseDate(req.query.dateFrom, 'dateFrom');
    const dateTo = parseDate(req.query.dateTo, 'dateTo');

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return res.status(400).json({ error: 'dateFrom must be on or before dateTo.' });
    }

    const conditions = [];
    const values = [];
    const addFilter = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace('?', `$${values.length}`));
    };

    if (status !== undefined) addFilter('r.status = ?', status);
    if (movieId !== undefined) addFilter('st.movie_id = ?', movieId);
    if (dateFrom) addFilter('r.created_at >= ?::date', dateFrom);
    if (dateTo) addFilter("r.created_at < (?::date + INTERVAL '1 day')", dateTo);

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const joins = 'LEFT JOIN showtimes st ON st.id = r.showtime_id';
    const countResult = await db.query(
      `SELECT COUNT(*)::integer AS total
       FROM reservations r
       ${joins}
       ${whereClause}`,
      values
    );

    const resultValues = [...values, limit, offset];
    const limitParameter = values.length + 1;
    const offsetParameter = values.length + 2;
    const { rows } = await db.query(
      `SELECT r.id,
              r.booking_reference,
              r.user_id AS customer_id,
              u.username AS customer_name,
              u.email AS customer_email,
              COALESCE(r.movie_title_snapshot, m.title) AS movie_title,
              st.movie_id,
              COALESCE(r.showtime_start_snapshot, st.start_time) AS start_time,
              COALESCE(r.showtime_end_snapshot, st.end_time) AS end_time,
              COALESCE(r.screen_name_snapshot, sc.name) AS screen_name,
              COALESCE(
                (SELECT ARRAY_AGG(rs.seat_label ORDER BY rs.seat_label)
                 FROM reservation_seats rs
                 WHERE rs.reservation_id = r.id),
                r.seat_labels,
                ARRAY[]::text[]
              ) AS seat_labels,
              r.status,
              COALESCE(r.payment_status, 'unknown') AS payment_status,
              r.amount,
              r.currency,
              r.created_at
       FROM reservations r
       LEFT JOIN users u ON u.id = r.user_id
       ${joins}
       LEFT JOIN movies m ON m.id = st.movie_id
       LEFT JOIN screens sc ON sc.id = st.screen_id
       ${whereClause}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $${limitParameter}
       OFFSET $${offsetParameter}`,
      resultValues
    );

    const total = countResult.rows[0].total;
    return res.status(200).json({
      reservations: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith('page ') ||
      error.message.startsWith('limit ') ||
      error.message.startsWith('movieId ') ||
      error.message.startsWith('dateFrom ') ||
      error.message.startsWith('dateTo ')
    )) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Failed to fetch admin reservations:', error);
    return res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
};

module.exports = { getAdminReservations };
