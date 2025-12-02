const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

/**
 * Middleware that ensures the request includes a valid JWT token.
 * Adds the authenticated user's id to the request object for downstream handlers.
 */
const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, token missing');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        // Optional: attach the hydrated user (without password) for downstream access
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (err) {
        res.status(401);
        throw new Error('Not authorized, token invalid');
    }
});

module.exports = { protect };
