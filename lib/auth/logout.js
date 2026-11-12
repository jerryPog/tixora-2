/**
 * TIXORA SECURE LOGOUT API (Vercel Serverless Function & Node Handler)
 * Clears HttpOnly, Secure, SameSite=Strict Session Cookies
 */

const { csrfGuard } = require('../csrf');
const { applySecurityHeaders, isPlainLocalHttp } = require('../security-headers');
const { handleCors } = require('../cors');

module.exports = async (req, res) => {
    applySecurityHeaders(res, { isApi: true, req });
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
        const payload = { error: 'Method Not Allowed. Use POST.' };
        if (typeof res.status === 'function') return res.status(405).json(payload);
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    // CSRF Protection Barrier for State-Changing Requests
    if (!csrfGuard(req, res)) return;

    const isLocalPlain = isPlainLocalHttp(req);
    const secureAttr = isLocalPlain ? '' : ' Secure;';
    const clearOpts = `Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    res.setHeader('Set-Cookie', [
        `tixora_session=; ${clearOpts}`,
        `tixora_role=; ${clearOpts}`,
        `tixora_session_sig=; ${clearOpts}`,
        `tixora_auth_status=; Path=/;${secureAttr} SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    ]);

    const payload = {
        status: 'logged_out',
        cookies_cleared: true,
        cookie_policy: isLocalPlain ? 'HttpOnly; SameSite=Strict' : 'HttpOnly; Secure; SameSite=Strict'
    };

    if (typeof res.status === 'function') {
        return res.status(200).json(payload);
    } else {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }
};
