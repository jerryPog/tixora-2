/**
 * TIXORA UNIFIED AUTH DISPATCHER (Vercel Serverless Function)
 * Consolidates all authentication, rate limiting, and password reset routes into a single shared execution context
 */

const forgotPasswordHandler = require('../../lib/auth/forgot-password');
const verifyResetHandler = require('../../lib/auth/verify-reset-token');
const resetPasswordHandler = require('../../lib/auth/reset-password');
const sessionHandler = require('../../lib/auth/session');
const logoutHandler = require('../../lib/auth/logout');
const rateLimitHandler = require('../../lib/auth/rate-limit');
const { handleValidationRequest } = require('../../lib/validator');
const { handleCsrfEndpoint, validateCsrf } = require('../../lib/csrf');
const { applySecurityHeaders } = require('../../lib/security-headers');
const { handleCors } = require('../../lib/cors');
const { handleUploadEndpoint } = require('../../lib/uploader');

module.exports = async (req, res) => {
    applySecurityHeaders(res, { isApi: true, req });
    if (handleCors(req, res)) return;
    const rawUrl = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.url || '';
    const pathOnly = rawUrl.split('?')[0].toLowerCase();

    if (pathOnly.includes('upload')) {
        return handleUploadEndpoint(req, res);
    }
    if (pathOnly.includes('checkout') || pathOnly.includes('cart')) {
        const { handleCartCheckout } = require('../../lib/cart-handler');
        return handleCartCheckout(req, res);
    }
    if (pathOnly.includes('rate-limit') || pathOnly.includes('rate-limiter')) {
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
    if (pathOnly.includes('csrf')) {
        return handleCsrfEndpoint(req, res);
    }

    // OWASP CSRF Defense Barrier for State-Changing Requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes((req.method || '').toUpperCase())) {
        const csrfCheck = validateCsrf(req);
        if (!csrfCheck.valid) {
            const errPayload = {
                status: 'forbidden',
                code: csrfCheck.code,
                error: 'CSRF_PROTECTION_BLOCKED',
                message: csrfCheck.message
            };
            if (typeof res.status === 'function') return res.status(403).json(errPayload);
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(errPayload));
        }
    }
    if (pathOnly.includes('validate') || pathOnly.includes('validation')) {
        return handleValidationRequest(req, res);
    }
    if (pathOnly.includes('session')) {
        return sessionHandler(req, res);
    }

    // If query string has action=login or similar, it's a rate-limit call
    if (rawUrl.includes('action=') || rawUrl.includes('identifier=')) {
        return rateLimitHandler(req, res);
    }

    // Default: Check session
    return sessionHandler(req, res);
};
