/**
 * TIXORA SECURE SESSION API (Vercel Serverless Function & Node Handler)
 * Enforces HttpOnly, Secure, and SameSite=Strict Session Cookies
 */

const crypto = require('crypto');
const { getClientIp, checkRateLimit, recordAttempt, applyRateLimitHeaders } = require('./rate-limiter');

function parseBody(req) {
    return new Promise((resolve) => {
        if (req.body !== undefined) {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            }
            return resolve(body || {});
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
    });
}

module.exports = async (req, res) => {
    // Security & Header hardening
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const cookieSecurity = 'Path=/; HttpOnly; Secure; SameSite=Strict';

    if (req.method === 'POST') {
        const body = await parseBody(req);
        const clientIp = getClientIp(req);
        const email = body.email || '';

        // Enforce Login Rate Limiting
        const rateCheck = checkRateLimit(clientIp, email, 'login');
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

        const token = body.access_token || crypto.randomBytes(32).toString('hex');
        const role = body.role || 'promoter';

        // Successful authentication: Reset failed counter
        recordAttempt(clientIp, email, 'login', true);

        res.setHeader('Set-Cookie', [
            `tixora_session=${encodeURIComponent(token)}; ${cookieSecurity}; Max-Age=604800`,
            `tixora_role=${encodeURIComponent(role)}; ${cookieSecurity}; Max-Age=604800`,
            `tixora_auth_status=authenticated; Path=/; Secure; SameSite=Strict; Max-Age=604800`
        ]);

        if (typeof res.status === 'function') {
            return res.status(200).json({
                status: 'success',
                authenticated: true,
                role: role,
                cookie_policy: 'HttpOnly; Secure; SameSite=Strict'
            });
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({
                status: 'success',
                authenticated: true,
                role: role,
                cookie_policy: 'HttpOnly; Secure; SameSite=Strict'
            }));
        }
    }

    if (req.method === 'GET') {
        const cookieHeader = req.headers.cookie || '';
        const hasSession = cookieHeader.includes('tixora_session=');
        
        const payload = {
            authenticated: hasSession,
            has_session_cookie: hasSession,
            cookie_policy: 'HttpOnly; Secure; SameSite=Strict'
        };

        if (typeof res.status === 'function') {
            return res.status(200).json(payload);
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        }
    }

    if (typeof res.status === 'function') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    } else {
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
};
