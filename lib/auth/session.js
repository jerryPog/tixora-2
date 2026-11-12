/**
 * TIXORA SECURE SESSION API (Vercel Serverless Function & Node Handler)
 * Enforces Live Supabase JWT Verification, Cryptographic HMAC Session Signatures,
 * and HttpOnly, Secure, SameSite=Strict Session Cookies.
 */

const crypto = require('crypto');
const { fromSupabaseUrl } = require('@supabase/server');
const {
    resolveEnv,
    verifyCredentials,
    createContextClient,
    createAdminClient
} = require('@supabase/server/core');
const { getClientIp, checkRateLimit, recordAttempt, applyRateLimitHeaders } = require('./rate-limit');
const { validateForm } = require('../validator');
const { csrfGuard } = require('../csrf');
const { applySecurityHeaders, isPlainLocalHttp } = require('../security-headers');
const { handleCors } = require('../cors');
const { readBodyWithLimit, MAX_REQUEST_BODY_SIZE } = require('../uploader');
const { getAuthSecret } = require('../secrets');

const DEFAULT_SUPABASE_URL = 'https://hgzcdzlfwweesdljeqdv.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CyGJeojb0by0XRENmjOlAg_bbjW_Wck';

function getSupabaseUrl() {
    return (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
}

function getServerEnvOverrides() {
    const url = getSupabaseUrl();
    const overrides = {};
    if (!process.env.SUPABASE_URL) {
        overrides.url = url;
    }
    if (!process.env.SUPABASE_PUBLISHABLE_KEYS && !process.env.SUPABASE_PUBLISHABLE_KEY) {
        overrides.publishableKeys = { default: DEFAULT_SUPABASE_PUBLISHABLE_KEY };
    }
    if (!process.env.SUPABASE_JWKS && !process.env.SUPABASE_JWKS_URL) {
        overrides.jwks = new URL(`${url}/auth/v1/.well-known/jwks.json`);
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
}

function createScopedSupabaseClient(accessToken) {
    const envOverrides = getServerEnvOverrides();
    if (accessToken) {
        return createContextClient({
            auth: { token: accessToken },
            env: envOverrides
        });
    }
    return createContextClient({ env: envOverrides });
}

function createOptionalAdminClient() {
    const envOverrides = getServerEnvOverrides();
    const { data: resolved, error } = resolveEnv(envOverrides);
    if (error || !resolved || !resolved.secretKeys || Object.keys(resolved.secretKeys).length === 0) {
        return null;
    }
    return createAdminClient({ env: envOverrides });
}

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ALLOWED_ROLES = new Set(['admin', 'manager', 'promoter', 'attendee']);

function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    String(cookieHeader).split(';').forEach((cookie) => {
        const idx = cookie.indexOf('=');
        if (idx === -1) return;
        const name = cookie.slice(0, idx).trim();
        if (!name) return;
        const value = cookie.slice(idx + 1).trim();
        if (!value) return;
        try {
            list[name] = decodeURIComponent(value);
        } catch (e) {
            list[name] = value;
        }
    });
    return list;
}

function sha256Hex(val) {
    return crypto.createHash('sha256').update(String(val || '')).digest('hex');
}

function signSessionBinding(token, userId, role, issuedAtMs) {
    const secret = getAuthSecret();
    const tokenHash = sha256Hex(token);
    const payload = `${tokenHash}|${userId}|${role}|${issuedAtMs}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `${userId}.${role}.${issuedAtMs}.${sig}`;
}

function verifySessionCookies(req) {
    const headers = (req && req.headers) || {};
    const cookies = parseCookies(headers.cookie);
    const token = cookies.tixora_session || '';
    const cookieRole = (cookies.tixora_role || '').toLowerCase();
    const sigCookie = cookies.tixora_session_sig || '';
    const hasAnySessionCookie = Boolean(token || cookieRole || sigCookie);

    if (!token || !cookieRole || !sigCookie) {
        return { valid: false, tampered: hasAnySessionCookie, role: 'anon', isAdmin: false, userId: null };
    }

    const parts = sigCookie.split('.');
    if (parts.length !== 4) {
        return { valid: false, tampered: true, role: 'anon', isAdmin: false, userId: null };
    }

    const [uid, sigRole, issuedStr, sigHex] = parts;
    const issuedAtMs = Number(issuedStr);
    if (
        !uid ||
        !ALLOWED_ROLES.has(sigRole) ||
        sigRole !== cookieRole ||
        !Number.isFinite(issuedAtMs) ||
        !/^[a-f0-9]{64}$/i.test(sigHex)
    ) {
        return { valid: false, tampered: true, role: 'anon', isAdmin: false, userId: null };
    }

    if (Date.now() - issuedAtMs > SESSION_MAX_AGE_MS || issuedAtMs > Date.now() + 60000) {
        return { valid: false, tampered: false, expired: true, role: 'anon', isAdmin: false, userId: null };
    }

    try {
        const secret = getAuthSecret();
        const expectedPayload = `${sha256Hex(token)}|${uid}|${sigRole}|${issuedStr}`;
        const expectedHex = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');
        const sigBuf = Buffer.from(sigHex, 'hex');
        const expBuf = Buffer.from(expectedHex, 'hex');
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return { valid: false, tampered: true, role: 'anon', isAdmin: false, userId: null };
        }
    } catch (e) {
        return { valid: false, tampered: true, role: 'anon', isAdmin: false, userId: null };
    }

    return {
        valid: true,
        tampered: false,
        userId: uid,
        role: sigRole,
        isAdmin: sigRole === 'admin' || sigRole === 'manager'
    };
}

/**
 * Verify a Supabase JWT using @supabase/server JWKS verification + project issuer pinning,
 * then confirm active user status via Supabase Auth (ctx-scoped client).
 * Never trusts unsigned or client-decoded JWT claims.
 */
async function verifySupabaseAccessToken(accessToken) {
    if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 20 || accessToken.length > 8192) {
        return null;
    }

    try {
        const envOverrides = getServerEnvOverrides();
        const { data: auth, error: verifyError } = await verifyCredentials(
            { token: accessToken, apikey: null },
            {
                auth: 'user',
                issuer: fromSupabaseUrl(getSupabaseUrl()),
                env: envOverrides
            }
        );

        if (verifyError || !auth || !auth.token) {
            return null;
        }

        const supabase = createContextClient({
            auth: { token: auth.token, keyName: auth.keyName },
            env: envOverrides
        });

        const { data, error: userError } = await supabase.auth.getUser(auth.token);
        const user = data && data.user;
        if (userError || !user || !user.id || !user.email) {
            return null;
        }
        return user;
    } catch (e) {
        return null;
    }
}

/**
 * Resolve verified role strictly server-side from Supabase user object & user_roles table.
 */
async function resolveVerifiedRole(user, accessToken) {
    if (!user || !user.email) return 'promoter';
    const email = String(user.email).toLowerCase().trim();

    if (email === 'admin@tixora.live') {
        return 'admin';
    }

    const appRole = String((user.app_metadata && user.app_metadata.role) || '').toLowerCase().trim();
    if (ALLOWED_ROLES.has(appRole)) {
        return appRole;
    }

    try {
        const supabase = createScopedSupabaseClient(accessToken);
        const { data: rows, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .limit(5);

        if (!error && Array.isArray(rows) && rows.length > 0) {
            const roles = rows.map((r) => String(r.role || '').toLowerCase().trim());
            if (roles.includes('admin')) return 'admin';
            if (roles.includes('manager')) return 'manager';
            if (roles.includes('promoter')) return 'promoter';
            if (roles.includes('attendee')) return 'attendee';
        }
    } catch (e) {}

    const metaRole = String((user.user_metadata && user.user_metadata.role) || '').toLowerCase().trim();
    if (metaRole === 'attendee') return 'attendee';
    return 'promoter';
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

function sendJson(res, statusCode, payload) {
    if (typeof res.status === 'function') return res.status(statusCode).json(payload);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(payload));
}

const handler = async (req, res) => {
    applySecurityHeaders(res, { isApi: true, req });
    if (handleCors(req, res)) return;
    if (!csrfGuard(req, res)) return;

    const isLocalPlain = isPlainLocalHttp(req);
    const secureAttr = isLocalPlain ? '' : ' Secure;';
    const cookieSecurity = `Path=/; HttpOnly;${secureAttr} SameSite=Strict`;
    const clearCookieSecurity = `Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    if (req.method === 'POST') {
        let body;
        try {
            body = await parseBody(req);
        } catch (err) {
            if (err.code === 'PAYLOAD_TOO_LARGE') {
                return sendJson(res, 413, {
                    status: 'error',
                    code: 'PAYLOAD_TOO_LARGE',
                    error: `Payload too large. Maximum allowed request size is ${MAX_REQUEST_BODY_SIZE / 1024} KB.`
                });
            }
            body = {};
        }

        const clientIp = getClientIp(req);
        const requestedEmail = (body.email || '').trim().toLowerCase();

        if (requestedEmail) {
            const validation = validateForm('session', { email: requestedEmail, password: body.password || 'session-bearer-sync' });
            if (!validation.isValid && validation.errors.email) {
                return sendJson(res, 400, {
                    status: 'validation_error',
                    code: 'invalid_form_input',
                    message: 'Form validation failed on server.',
                    errors: validation.errors
                });
            }
        }

        const rateCheck = checkRateLimit(clientIp, requestedEmail, 'login');
        applyRateLimitHeaders(res, rateCheck);

        if (!rateCheck.allowed) {
            return sendJson(res, 429, {
                status: 'rate_limited',
                code: 'too_many_attempts',
                message: rateCheck.message,
                retry_after_seconds: rateCheck.retryAfterSeconds,
                reset_at: rateCheck.resetAt
            });
        }

        const accessToken = typeof body.access_token === 'string' ? body.access_token.trim() : '';
        if (!accessToken || accessToken.length < 20) {
            recordAttempt(clientIp, requestedEmail, 'login', false);
            return sendJson(res, 401, {
                status: 'unauthorized',
                code: 'MISSING_ACCESS_TOKEN',
                error: 'Valid authentication token is required.'
            });
        }

        const verifiedUser = await verifySupabaseAccessToken(accessToken);
        if (!verifiedUser) {
            recordAttempt(clientIp, requestedEmail, 'login', false);
            return sendJson(res, 401, {
                status: 'unauthorized',
                code: 'INVALID_SESSION_TOKEN',
                error: 'Session token could not be verified.'
            });
        }

        const verifiedEmail = String(verifiedUser.email).toLowerCase().trim();
        const verifiedRole = await resolveVerifiedRole(verifiedUser, accessToken);
        const issuedAtMs = Date.now();
        const sessionSig = signSessionBinding(accessToken, verifiedUser.id, verifiedRole, issuedAtMs);

        // Successful verified authentication: Reset login rate-limit counter
        recordAttempt(clientIp, verifiedEmail, 'login', true);

        res.setHeader('Set-Cookie', [
            `tixora_session=${encodeURIComponent(accessToken)}; ${cookieSecurity}; Max-Age=604800`,
            `tixora_role=${encodeURIComponent(verifiedRole)}; ${cookieSecurity}; Max-Age=604800`,
            `tixora_session_sig=${encodeURIComponent(sessionSig)}; ${cookieSecurity}; Max-Age=604800`,
            `tixora_auth_status=authenticated; Path=/;${secureAttr} SameSite=Strict; Max-Age=604800`
        ]);

        const policyLabel = isLocalPlain ? 'HttpOnly; SameSite=Strict' : 'HttpOnly; Secure; SameSite=Strict';

        return sendJson(res, 200, {
            status: 'success',
            authenticated: true,
            role: verifiedRole,
            is_admin: verifiedRole === 'admin' || verifiedRole === 'manager',
            cookie_policy: policyLabel
        });
    }

    if (req.method === 'GET') {
        const verified = verifySessionCookies(req);

        if (!verified.valid && verified.tampered) {
            res.setHeader('Set-Cookie', [
                `tixora_session=; ${clearCookieSecurity}`,
                `tixora_role=; ${clearCookieSecurity}`,
                `tixora_session_sig=; ${clearCookieSecurity}`,
                `tixora_auth_status=; Path=/;${secureAttr} SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
            ]);
        }

        return sendJson(res, 200, {
            authenticated: verified.valid,
            has_session_cookie: verified.valid,
            role: verified.valid ? verified.role : 'anon',
            is_admin: verified.valid ? verified.isAdmin : false,
            cookie_policy: isLocalPlain ? 'HttpOnly; SameSite=Strict' : 'HttpOnly; Secure; SameSite=Strict'
        });
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
};

handler.parseCookies = parseCookies;
handler.signSessionBinding = signSessionBinding;
handler.verifySessionCookies = verifySessionCookies;
handler.verifySupabaseAccessToken = verifySupabaseAccessToken;
handler.resolveVerifiedRole = resolveVerifiedRole;
handler.getServerEnvOverrides = getServerEnvOverrides;
handler.createScopedSupabaseClient = createScopedSupabaseClient;
handler.createOptionalAdminClient = createOptionalAdminClient;

module.exports = handler;
