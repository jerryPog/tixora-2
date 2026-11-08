/**
 * TIXORA SECURE LOGOUT API (Vercel Serverless Function & Node Handler)
 * Clears HttpOnly, Secure, SameSite=Strict Session Cookies
 */

const { csrfGuard } = require('../../lib/csrf');
const { applySecurityHeaders } = require('../../lib/security-headers');

module.exports = async (req, res) => {
    applySecurityHeaders(res, { isApi: true });

    // CSRF Protection Barrier for State-Changing Requests
    if (!csrfGuard(req, res)) return;

    const clearOpts = 'Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';

    res.setHeader('Set-Cookie', [
        `tixora_session=; ${clearOpts}`,
        `tixora_role=; ${clearOpts}`,
        `tixora_auth_status=; Path=/; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    ]);

    const payload = {
        status: 'logged_out',
        cookies_cleared: true,
        cookie_policy: 'HttpOnly; Secure; SameSite=Strict'
    };

    if (typeof res.status === 'function') {
        return res.status(200).json(payload);
    } else {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }
};
