// backend/src/middlewares/authAdmin.js
const config = require('../config'); // Or directly process.env
const { AppError } = require('./error'); // Assuming AppError is used

// In a real application, this key should be complex and stored securely,
// and ideally, you'd have a proper admin user authentication system.
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'SUPER_SECRET_ADMIN_KEY';

/**
 * Middleware to authenticate admin API requests.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authAdmin = (req, res, next) => {
    const apiKey = req.headers['x-admin-key'];
    if (!apiKey || apiKey !== ADMIN_API_KEY) {
        // Make sure to pass the error to next() so your error handler can deal with it
        return next(new AppError('Unauthorized: Missing or invalid admin API key', 401));
    }
    // If you had admin user roles, you would attach the admin user to req here
    // req.adminUser = { id: 'admin_user_id', role: 'admin' }; 
    next();
};

module.exports = authAdmin;
