/**
 * TIXORA FORGOT PASSWORD API (Vercel Serverless Function & Node Handler)
 * Generates single-use, 15-minute expiring cryptographic reset tokens
 */

const { createResetToken } = require('../../lib/token-store');
const { getClientIp, checkRateLimit, recordAttempt, applyRateLimitHeaders } = require('./rate-limit');
const { validateForgotPassword } = require('../../lib/validator');
const { csrfGuard } = require('../../lib/csrf');
const { applySecurityHeaders } = require('../../lib/security-headers');
const { handleCors } = require('../../lib/cors');
const { readBodyWithLimit, MAX_REQUEST_BODY_SIZE } = require('../../lib/uploader');

async function parseBody(req) {
    if (req.body !== undefined) {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        return body || {};
    }
    const buf = await readBodyWithLimit(req, MAX_REQUEST_BODY_SIZE);
    if (!buf || buf.length === 0) return {};
    try {
        return JSON.parse(buf.toString('utf8'));
    } catch (e) {
        return {};
    }
}

module.exports = async (req, res) => {
    applySecurityHeaders(res, { isApi: true });
    if (handleCors(req, res)) return;

    // CSRF Protection Barrier for State-Changing Requests
    if (!csrfGuard(req, res)) return;

    if (req.method !== 'POST') {
        const payload = { error: 'Method Not Allowed. Use POST.' };
        if (typeof res.status === 'function') return res.status(405).json(payload);
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    try {
        const body = await parseBody(req);
        
        // Server-Side Form Validation
        const validation = validateForgotPassword(body);
        if (!validation.isValid) {
            const errPayload = {
                status: 'validation_error',
                error: 'invalid_form_input',
                message: Object.values(validation.errors)[0],
                errors: validation.errors
            };
            if (typeof res.status === 'function') return res.status(400).json(errPayload);
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(errPayload));
        }

        const email = validation.sanitized.email;
        const validityMinutes = validation.sanitized.validityMinutes;

        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';

        // Rate limit password reset requests
        const rateCheck = checkRateLimit(ip, email, 'forgot_password');
        applyRateLimitHeaders(res, rateCheck);

        if (!rateCheck.allowed) {
            const errPayload = {
                status: 'rate_limited',
                code: 'too_many_attempts',
                message: rateCheck.message,
                retry_after_seconds: rateCheck.retryAfterSeconds,
                reset_at: rateCheck.resetAt
            };
            if (typeof res.status === 'function') return res.status(429).json(errPayload);
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(errPayload));
        }

        recordAttempt(ip, email, 'forgot_password', false);

        const tokenResult = await createResetToken(email, validityMinutes, {
            ipAddress: ip,
            userAgent: userAgent
        });

        // Determine request origin for link generation
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'tixora.live';
        const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
        const resetLink = `${proto}://${host}/reset-password?token=${tokenResult.rawToken}`;

        const responsePayload = {
            status: 'success',
            message: 'Password reset instructions have been generated. The link will expire in 15 minutes and can only be used once.',
            email: tokenResult.email,
            reset_link: resetLink,
            raw_token: tokenResult.rawToken,
            expires_at: new Date(tokenResult.expiresAt).toISOString(),
            expires_in_seconds: tokenResult.expiresInSeconds,
            validity_minutes: tokenResult.validityMinutes,
            single_use: true
        };

        if (typeof res.status === 'function') return res.status(200).json(responsePayload);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(responsePayload));
    } catch (err) {
        if (err.code === 'PAYLOAD_TOO_LARGE') {
            const payload = { status: 'error', code: 'PAYLOAD_TOO_LARGE', error: `Payload too large. Maximum allowed request size is ${MAX_REQUEST_BODY_SIZE / 1024} KB.` };
            if (typeof res.status === 'function') return res.status(413).json(payload);
            res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        }
        const errPayload = { error: 'server_error', message: err.message || 'Internal server error.' };
        if (typeof res.status === 'function') return res.status(500).json(errPayload);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(errPayload));
    }
};
