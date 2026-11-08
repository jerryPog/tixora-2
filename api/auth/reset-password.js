/**
 * TIXORA RESET PASSWORD API (Vercel Serverless Function & Node Handler)
 * Consumes single-use reset token atomically, invalidating it forever
 */

const { consumeResetToken, hashToken } = require('../../lib/token-store');
const { validateResetPassword } = require('../../lib/validator');
const { csrfGuard } = require('../../lib/csrf');

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
        const validation = validateResetPassword(body);
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

        const token = validation.sanitized.token;
        const newPassword = validation.sanitized.newPassword;

        // Atomically consume token (Single-use & expiration strictly verified)
        const result = await consumeResetToken(token, newPassword);

        if (!result.success) {
            const statusCode = (result.code === 'already_used' || result.code === 'expired') ? 410 : 400;
            const errPayload = {
                status: 'error',
                code: result.code,
                message: result.message,
                single_use_enforced: true,
                expiry_enforced: true
            };
            if (typeof res.status === 'function') return res.status(statusCode).json(errPayload);
            res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(errPayload));
        }

        const successPayload = {
            status: 'success',
            email: result.email,
            message: 'Password has been updated successfully. Your one-time reset link is now expired and invalidated.',
            token_consumed: true
        };

        if (typeof res.status === 'function') return res.status(200).json(successPayload);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(successPayload));
    } catch (err) {
        const errPayload = { error: 'server_error', message: err.message || 'Internal server error.' };
        if (typeof res.status === 'function') return res.status(500).json(errPayload);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(errPayload));
    }
};
