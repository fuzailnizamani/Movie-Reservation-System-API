const db = require('../db');
const jwt = require('jsonwebtoken');
const becrypt = require('bcrypt');

const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({
            error: 'Username, email, and password are required'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'Invalid email format.'
        });
    }

    try {
        const existingUser = await db.query('select * from users where email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await becrypt.hash(password, 10);
        const query = `
            INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)`;

        const values = [username, email, hashedPassword];

        await db.query(query, values);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format.'
            });
        }

        const query = 'select * from users where email = $1 ';
        const { rows } = await db.query(query, [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email' });
        }

        const user = rows[0];

        const verified = await becrypt.compare(password, user.password);
        if (!verified) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const payload = { userId: user.id, email: user.email, role: user.role };
        const assessToken = jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

        const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
        await db.query('update users set refresh_token = $1 where id = $2', [refreshToken, user.id]);

        res.status(200).json({
            message: 'Login successful',
            accessToken: assessToken,
            refreshToken: refreshToken
        });
        
    } catch (error) { 
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const logoutUser = async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    await db.query(
      'UPDATE users SET refresh_token = NULL WHERE id = $1',
      [userId]
    );

    return res.status(200).json({
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('Logout failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, email, role FROM users WHERE refresh_token = $1',
      [refreshToken]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Invalid refresh token.' });
    }

    const user = rows[0];

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    if (decoded.userId !== user.id) {
      return res.status(403).json({ error: 'Token mismatch.' });
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    return res.status(200).json({
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Refresh token failed:', error);
    return res.status(401).json({ error: 'Refresh token expired or invalid.' });
  }
};


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};