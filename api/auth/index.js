/**
 * TIXORA UNIFIED AUTH DISPATCHER (Vercel Serverless Function)
 * Consolidates all authentication and password reset routes into a single shared execution context
 */

const forgotPasswordHandler = require('./forgot-password');
const verifyResetHandler = require('./verify-reset-token');
const resetPasswordHandler = require('./reset-password');
const sessionHandler = require('./session');
const logoutHandler = require('./logout');
const rateLimitHandler = require('./rate-limit');

module.exports = async (req, res) => {
    const rawUrl = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.url || '';
    const pathOnly = rawUrl.split('?')[0].toLowerCase();

    if (pathOnly.includes('rate-limit')) {
        return rateLimitHandler(req, res);
    }
    if (pathOnly.includes('forgot-password')) {
        return forgotPasswordHandler(req, res);
    }
    if (pathOnly.includes('verify-reset-token') || pathOnly.includes('verify-token')) {
        return verifyResetHandler(req, res);
    }
    if (pathOnly.includes('reset-password')) {
        return resetPasswordHandler(req, res);
    }
    if (pathOnly.includes('logout')) {
        return logoutHandler(req, res);
    }
    if (pathOnly.includes('session')) {
        return sessionHandler(req, res);
    }

    // Default: Check session
    return sessionHandler(req, res);
};

