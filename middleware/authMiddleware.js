const jwt = require('jsonwebtoken');

const userAuthMiddleware = (req, res, next) => {
    // 1. Get the Authorization header from the request
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: NO Token Provided' });
    }

    try {
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);

        req.user = verifiedUser;

        next();
    } catch (error) {
        return res.status(403).json({ message: 'Access Denied: Invalid Token' });
    }
};

const adminAuthMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Access Denied: No user information found' });
            }

            // 2. Check if the user's role is in the allowed list
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ message: "Forbidden: You do not have permission" });
            };

            next();
        } catch (error) {
            console.error('Error in adminAuthMiddleware:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

module.exports = {
    userAuthMiddleware,
    adminAuthMiddleware
};