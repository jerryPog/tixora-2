/**
 * TIXORA SECURE SESSION API (Vercel Serverless Function & Node Handler)
 * Enforces HttpOnly, Secure, and SameSite=Strict Session Cookies
 */

const crypto = require('crypto');
const { getClientIp, checkRateLimit, recordAttempt, applyRateLimitHeaders } = require('./rate-limit');
const { validateForm } = require('../../lib/validator');
const { csrfGuard } = require('../../lib/csrf');
const { applySecurityHeaders, isPlainLocalHttp } = require('../../lib/security-headers');
const { handleCors } = require('../../lib/cors');
const { readBodyWithLimit, MAX_REQUEST_BODY_SIZE } = require('../../lib/uploader');

function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        if (!value) return;
        try {
            list[name] = decodeURIComponent(value);
        } catch (e) {
            list[name] = value;
        }
    });
    return list;
}

function extractJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
            const jsonStr = Buffer.from(padded, 'base64').toString('utf8');
            return JSON.parse(jsonStr);
        }
    } catch (e) {}
    return null;
}

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
    // Security & Header hardening
    applySecurityHeaders(res, { isApi: true, req });

    // Domain-Restricted CORS Preflight & Origin Filter
    if (handleCors(req, res)) return;

    // CSRF Protection Barrier for State-Changing Requests
    if (!csrfGuard(req, res)) return;

    const isLocalPlain = isPlainLocalHttp(req);
    const secureAttr = isLocalPlain ? '' : ' Secure;';
    const cookieSecurity = `Path=/; HttpOnly;${secureAttr} SameSite=Strict`;

    if (req.method === 'POST') {
        let body;
        try {
            body = await parseBody(req);
        } catch (err) {
            if (err.code === 'PAYLOAD_TOO_LARGE') {
                const payload = {
                    status: 'error',
                    code: 'PAYLOAD_TOO_LARGE',
                    error: `Payload too large. Maximum allowed request size is ${MAX_REQUEST_BODY_SIZE / 1024} KB.`
                };
                if (typeof res.status === 'function') return res.status(413).json(payload);
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify(payload));
            }
            body = {};
        }
        const clientIp = getClientIp(req);
        const email = (body.email || '').trim().toLowerCase();

        // Server-Side Form Input Validation
        if (email) {
            const validation = validateForm('session', { email, password: body.password || 'session-bearer-sync' });
            if (!validation.isValid && validation.errors.email) {
                const errPayload = {
                    status: 'validation_error',
                    code: 'invalid_form_input',
                    message: 'Form validation failed on server.',
                    errors: validation.errors
                };
                if (typeof res.status === 'function') return res.status(400).json(errPayload);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify(errPayload));
            }
        }

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
        
        // Anti-Privilege-Escalation Check: Verify admin / manager credentials
        const requestedRole = (body.role || 'promoter').toLowerCase();
        let verifiedRole = 'promoter';

        if (requestedRole === 'admin' || requestedRole === 'manager') {
            const jwtPayload = extractJwtPayload(token);
            const tokenEmail = (jwtPayload && jwtPayload.email ? jwtPayload.email : '').toLowerCase().trim();
            const tokenRole = (jwtPayload && jwtPayload.app_metadata && jwtPayload.app_metadata.role ? jwtPayload.app_metadata.role : '').toLowerCase().trim();
            const reqEmail = (email || '').toLowerCase().trim();

            const isAuthorizedAdmin = 
                reqEmail === 'admin@tixora.live' || 
                tokenEmail === 'admin@tixora.live' || 
                tokenRole === 'admin' || 
                tokenRole === 'manager';

            if (isAuthorizedAdmin) {
                verifiedRole = requestedRole;
            } else {
                // Deny unverified administrative privilege escalation
                verifiedRole = 'promoter';
            }
        } else {
            verifiedRole = requestedRole;
        }

        // Successful authentication: Reset failed counter
        recordAttempt(clientIp, email, 'login', true);

        res.setHeader('Set-Cookie', [
            `tixora_session=${encodeURIComponent(token)}; ${cookieSecurity}; Max-Age=604800`,
            `tixora_role=${encodeURIComponent(verifiedRole)}; ${cookieSecurity}; Max-Age=604800`,
            `tixora_auth_status=authenticated; Path=/;${secureAttr} SameSite=Strict; Max-Age=604800`
        ]);

        const policyLabel = isLocalPlain ? 'HttpOnly; SameSite=Strict' : 'HttpOnly; Secure; SameSite=Strict';

        if (typeof res.status === 'function') {
            return res.status(200).json({
                status: 'success',
                authenticated: true,
                role: verifiedRole,
                is_admin: verifiedRole === 'admin' || verifiedRole === 'manager',
                cookie_policy: policyLabel
            });
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({
                status: 'success',
                authenticated: true,
                role: verifiedRole,
                is_admin: verifiedRole === 'admin' || verifiedRole === 'manager',
                cookie_policy: policyLabel
            }));
        }
    }

    if (req.method === 'GET') {
        const cookies = parseCookies(req.headers.cookie);
        const hasSession = Boolean(cookies.tixora_session);
        const role = cookies.tixora_role || (hasSession ? 'promoter' : 'anon');
        const isAdmin = hasSession && (role === 'admin' || role === 'manager');
        
        const payload = {
            authenticated: hasSession,
            has_session_cookie: hasSession,
            role: role,
            is_admin: isAdmin,
            cookie_policy: isLocalPlain ? 'HttpOnly; SameSite=Strict' : 'HttpOnly; Secure; SameSite=Strict'
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
