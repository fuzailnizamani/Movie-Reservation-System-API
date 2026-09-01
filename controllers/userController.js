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
        });
        
    } catch (error) { 
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = {
    registerUser,
    loginUser
};