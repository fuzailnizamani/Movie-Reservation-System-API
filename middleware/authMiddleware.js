const jwt = require('jsonwebtoken');

const userAuthMiddleware = (req, res, next) => {
    // 1. Get the Authorization header from the request
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if(!token) {
        return res.status(401).json({ message: 'Access Denied: NO Token Provided' });
    }

    try {
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);

        console.log('User verified:', verifiedUser);

        req.user = verifiedUser;

        next();
    } catch (error) {
        return res.status(403).json({ message: 'Access Denied: Invalid Token' });
    }
};


module.exports = userAuthMiddleware;