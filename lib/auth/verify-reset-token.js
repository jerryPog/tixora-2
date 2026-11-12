/**
 * TIXORA VERIFY RESET TOKEN API (Vercel Serverless Function & Node Handler)
 * Validates token presence, single-use status, and non-expiration
 */

const { verifyResetToken } = require('../token-store');
const { csrfGuard } = require('../csrf');
const { applySecurityHeaders } = require('../security-headers');
const { handleCors } = require('../cors');

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
    applySecurityHeaders(res, { isApi: true, req });
    if (handleCors(req, res)) return;

    let token = '';

    if (req.method === 'GET') {
        const urlObj = new URL(req.url, 'http://localhost');
        token = urlObj.searchParams.get('token') || '';
    } else if (req.method === 'POST') {
        if (!csrfGuard(req, res)) return;
        const body = await parseBody(req);
        token = body.token || '';
    } else {
        const payload = { error: 'Method Not Allowed' };
        if (typeof res.status === 'function') return res.status(405).json(payload);
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    const check = await verifyResetToken(token);

    if (!check.valid) {
        const errPayload = {
            valid: false,
            code: check.code,
            message: check.message,
            single_use_enforced: true,
            expiry_enforced: true
        };
        const statusCode = check.code === 'missing_token' ? 400 : 410; // 410 Gone for expired/used
        if (typeof res.status === 'function') return res.status(statusCode).json(errPayload);
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(errPayload));
    }

    const okPayload = {
        valid: true,
        email: check.maskedEmail,
        expires_at: new Date(check.expiresAt).toISOString(),
        expires_in_seconds: check.expiresInSeconds,
        message: 'Password reset link is verified and ready for use.'
    };

    if (typeof res.status === 'function') return res.status(200).json(okPayload);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(okPayload));
};
