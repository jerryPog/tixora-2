/**
 * TIXORA CRYPTOGRAPHIC CSRF PROTECTION ENGINE
 * OWASP ASVS 4.0 & Double-Submit Signed Cookie Pattern
 * 
 * Protects all state-changing endpoints against Cross-Site Request Forgery (CWE-352)
 */

const crypto = require('crypto');
const { applySecurityHeaders, isPlainLocalHttp } = require('./security-headers');
const { getCsrfSecret } = require('./secrets');

const COOKIE_NAME = 'tixora_csrf';

/**
 * Generate a cryptographically signed CSRF token
 * Token format: <raw_random_32_bytes_hex>.<hmac_signature>
 */
function generateCsrfToken() {
    const raw = crypto.randomBytes(32).toString('hex');
    const secret = getCsrfSecret();
    const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    return `${raw}.${hmac}`;
}

/**
 * Verify HMAC signature of a CSRF token using constant-time comparison
 */
function verifyTokenSignature(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
        return false;
    }
    const [raw, signature] = token.split('.');
    if (!raw || !signature || raw.length !== 64 || signature.length !== 64) {
        return false;
    }
    const secret = getCsrfSecret();
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch (e) {
        return false;
    }
}

/**
 * Parse cookies from header
 */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(c => {
        const parts = c.split('=');
        const name = parts[0].trim();
        if (name) {
            cookies[name] = decodeURIComponent(parts.slice(1).join('=').trim());
        }
    });
    return cookies;
}

/**
 * Check if the request origin matches allowed domains
 */
function isTrustedOrigin(req) {
    if (!req) return true;
    const headers = req.headers || {};
    const origin = headers['origin'] || '';
    const referer = headers['referer'] || '';

    // If neither origin nor referer is present (e.g. direct server/curl API calls with CSRF header+cookie), allow token check
    if (!origin && !referer) {
        return true;
    }

    const testUrl = origin || referer;
    let parsedUrl;
    try {
        parsedUrl = new URL(testUrl);
    } catch (e) {
        return false; // Malformed Origin/Referer header
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal && parsedUrl.protocol !== 'https:') {
        return false;
    }

    const vercelHost = process.env.VERCEL_URL
        ? String(process.env.VERCEL_URL).replace(/^https?:\/\//i, '').split(':')[0].toLowerCase()
        : '';

    // Strict Tixora domain allowlist (no wildcard *.vercel.app)
    if (
        hostname === 'tixora.live' ||
        hostname.endsWith('.tixora.live') ||
        hostname === 'tixoralive.vercel.app' ||
        /^tixoralive-[a-z0-9-]+\.vercel\.app$/.test(hostname) ||
        hostname === 'tixora-2.vercel.app' ||
        /^tixora-2-[a-z0-9-]+\.vercel\.app$/.test(hostname) ||
        (vercelHost && hostname === vercelHost) ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
    ) {
        return true;
    }

    return false;
}

/**
 * Validates CSRF protection for an incoming HTTP request
 * @param {http.IncomingMessage} req
 * @returns {{ valid: boolean, code?: string, message?: string }}
 */
function validateCsrf(req) {
    if (!req) return { valid: true };
    const method = (req.method || 'GET').toUpperCase();

    // Safe HTTP methods do not alter state
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return { valid: true };
    }

    const headers = req.headers || {};

    // 1. Origin / Referer Verification
    if (!isTrustedOrigin(req)) {
        return {
            valid: false,
            code: 'CSRF_ORIGIN_MISMATCH',
            message: 'Cross-Site Request Forgery detected: Request Origin or Referer is not trusted.'
        };
    }

    // 2. Extract CSRF token from Request Headers AND Double-Submit Cookie
    const headerToken = String(headers['x-csrf-token'] || headers['x-xsrf-token'] || '').trim();
    const cookies = parseCookies(headers['cookie']);
    const cookieToken = String(cookies[COOKIE_NAME] || '').trim();

    if (!headerToken) {
        return {
            valid: false,
            code: 'CSRF_TOKEN_MISSING',
            message: 'CSRF protection barrier: Missing X-CSRF-Token header. State-changing requests must include a valid CSRF token.'
        };
    }

    if (!cookieToken) {
        return {
            valid: false,
            code: 'CSRF_COOKIE_MISSING',
            message: 'CSRF protection barrier: Missing CSRF cookie. Request a valid token from /api/auth/csrf.'
        };
    }

    // 3. Verify cryptographic HMAC signature
    if (!verifyTokenSignature(headerToken) || !verifyTokenSignature(cookieToken)) {
        return {
            valid: false,
            code: 'CSRF_TOKEN_INVALID',
            message: 'CSRF protection barrier: Invalid or forged CSRF token.'
        };
    }

    // 4. Double-Submit validation: Header and cookie must strictly match
    try {
        const hBuf = Buffer.from(headerToken);
        const cBuf = Buffer.from(cookieToken);
        if (hBuf.length !== cBuf.length || !crypto.timingSafeEqual(hBuf, cBuf)) {
            return {
                valid: false,
                code: 'CSRF_TOKEN_MISMATCH',
                message: 'CSRF protection barrier: Header token does not match CSRF cookie.'
            };
        }
    } catch (e) {
        return {
            valid: false,
            code: 'CSRF_TOKEN_MISMATCH',
            message: 'CSRF protection barrier: Token comparison failed.'
        };
    }

    return { valid: true };
}

/**
 * Handle GET /api/auth/csrf or GET /api/csrf
 * Provisions a fresh signed CSRF token and sets the cookie
 */
function handleCsrfEndpoint(req, res) {
    applySecurityHeaders(res, { isApi: true, req });
    const { handleCors } = require('./cors');
    if (handleCors(req, res)) return;

    const token = generateCsrfToken();
    const secureAttr = isPlainLocalHttp(req) ? '' : ' Secure;';
    const cookieOpts = `Path=/;${secureAttr} SameSite=Strict; Max-Age=86400`;

    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieOpts}`);

    const payload = {
        status: 'ok',
        csrf_token: token,
        cookie_name: COOKIE_NAME,
        policy: isPlainLocalHttp(req) ? 'SameSite=Strict' : 'SameSite=Strict; Secure'
    };

    if (typeof res.status === 'function') {
        return res.status(200).json(payload);
    } else {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }
}

/**
 * Synchronous / inline CSRF guard for handlers.
 * Returns true if request is allowed, false if blocked (and sends 403 response).
 */
function csrfGuard(req, res) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes((req.method || '').toUpperCase())) {
        const csrfCheck = validateCsrf(req);
        if (!csrfCheck.valid) {
            applySecurityHeaders(res, { isApi: true, req });
            const errPayload = {
                status: 'forbidden',
                code: csrfCheck.code,
                error: 'CSRF_PROTECTION_BLOCKED',
                message: csrfCheck.message
            };
            if (typeof res.status === 'function') {
                res.status(403).json(errPayload);
            } else {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(errPayload));
            }
            return false;
        }
    }
    return true;
}

/**
 * Middleware wrapper to protect any HTTP handler with CSRF checks
 */
function csrfMiddleware(handler) {
    return async (req, res) => {
        if (!csrfGuard(req, res)) return;
        return handler(req, res);
    };
}

module.exports = {
    COOKIE_NAME,
    generateCsrfToken,
    verifyTokenSignature,
    isTrustedOrigin,
    validateCsrf,
    csrfGuard,
    handleCsrfEndpoint,
    csrfMiddleware
};
