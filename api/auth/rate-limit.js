/**
 * TIXORA RATE LIMIT STATUS & RECORDING API
 * Vercel Serverless Function & Node Handler
 */

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
        if (req.readableEnded) return resolve({});
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

    const clientIp = getClientIp(req);

    if (req.method === 'GET') {
        const urlObj = new URL(req.url, 'http://localhost');
        const action = urlObj.searchParams.get('action') || 'login';
        const identifier = urlObj.searchParams.get('identifier') || urlObj.searchParams.get('email') || '';

        const result = checkRateLimit(clientIp, identifier, action);
        applyRateLimitHeaders(res, result);

        const statusCode = result.allowed ? 200 : 429;
        const payload = {
            status: result.allowed ? 'ok' : 'rate_limited',
            allowed: result.allowed,
            action: action,
            remaining: result.remaining,
            limit: result.limit,
            retry_after_seconds: result.retryAfterSeconds,
            reset_at: result.resetAt,
            message: result.message || 'Rate limit OK'
        };

        if (typeof res.status === 'function') return res.status(statusCode).json(payload);
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    if (req.method === 'POST') {
        const body = await parseBody(req);
        const action = body.action || 'login';
        const identifier = body.identifier || body.email || '';
        const success = Boolean(body.success);

        const result = recordAttempt(clientIp, identifier, action, success);
        applyRateLimitHeaders(res, result);

        const statusCode = result.allowed ? 200 : 429;
        const payload = {
            status: result.allowed ? 'recorded' : 'rate_limited',
            allowed: result.allowed,
            action: action,
            remaining: result.remaining,
            limit: result.limit,
            retry_after_seconds: result.retryAfterSeconds,
            reset_at: result.resetAt,
            message: result.message || 'Attempt recorded'
        };

        if (typeof res.status === 'function') return res.status(statusCode).json(payload);
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    const payload = { error: 'Method Not Allowed' };
    if (typeof res.status === 'function') return res.status(405).json(payload);
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(payload));
};
