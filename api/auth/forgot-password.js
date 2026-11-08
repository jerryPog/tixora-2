/**
 * TIXORA FORGOT PASSWORD API (Vercel Serverless Function & Node Handler)
 * Generates single-use, 15-minute expiring cryptographic reset tokens
 */

const { createResetToken } = require('../../lib/token-store');
const { getClientIp, checkRateLimit, recordAttempt, applyRateLimitHeaders } = require('./rate-limit');

function parseBody(req) {
    return new Promise((resolve) => {
        if (req.body !== undefined) {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            }
            return resolve(body || {});
        }
        if (req.readableEnded) {
            return resolve({});
        }
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', () => resolve({}));
    });
}

module.exports = async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method !== 'POST') {
        const payload = { error: 'Method Not Allowed. Use POST.' };
        if (typeof res.status === 'function') return res.status(405).json(payload);
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    try {
        const body = await parseBody(req);
        const email = (body.email || '').trim();
        const validityMinutes = parseInt(body.validity_minutes, 10) || 15;

        if (!email || !email.includes('@')) {
            const errPayload = { error: 'invalid_email', message: 'Please provide a valid email address.' };
            if (typeof res.status === 'function') return res.status(400).json(errPayload);
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(errPayload));
        }

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
        const errPayload = { error: 'server_error', message: err.message || 'Internal server error.' };
        if (typeof res.status === 'function') return res.status(500).json(errPayload);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(errPayload));
    }
};
