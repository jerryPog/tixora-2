/**
 * TIXORA CRYPTOGRAPHIC CSRF PROTECTION ENGINE
 * OWASP ASVS 4.0 & Double-Submit Signed Cookie Pattern
 * 
 * Protects all state-changing endpoints against Cross-Site Request Forgery (CWE-352)
 */

const crypto = require('crypto');

const CSRF_SECRET = process.env.TIXORA_CSRF_SECRET || process.env.TIXORA_AUTH_SECRET || 'tixora-master-csrf-cryptographic-salt-2026';
const COOKIE_NAME = 'tixora_csrf';

/**
 * Generate a cryptographically signed CSRF token
 * Token format: <raw_random_32_bytes_hex>.<hmac_signature>
 */
function generateCsrfToken() {
    const raw = crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', CSRF_SECRET).update(raw).digest('hex');
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
    const expected = crypto.createHmac('sha256', CSRF_SECRET).update(raw).digest('hex');
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
    const host = headers['x-forwarded-host'] || headers['host'] || '';

    // If neither origin nor referer is present (e.g. non-browser clients or strict same-origin), allow
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

    // 1. Matches active Host header
    if (host) {
        const hostWithoutPort = host.split(':')[0].toLowerCase();
        if (hostname === hostWithoutPort) return true;
    }

    // 2. Allowed domain whitelist
    if (
        hostname === 'tixora.live' ||
        hostname.endsWith('.tixora.live') ||
        hostname === 'tixoralive.vercel.app' ||
        hostname.endsWith('.vercel.app') ||
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

    // 2. Extract CSRF token from Request Headers or Body
    const headerToken = headers['x-csrf-token'] || headers['x-xsrf-token'] || '';
    const cookies = parseCookies(headers['cookie']);
    const cookieToken = cookies[COOKIE_NAME] || '';

    // If neither header token nor cookie token is provided
    if (!headerToken && !cookieToken) {
        return {
            valid: false,
            code: 'CSRF_TOKEN_MISSING',
            message: 'CSRF protection barrier: Missing X-CSRF-Token header. State-changing requests must include a valid CSRF token.'
        };
    }

    const tokenToValidate = headerToken || cookieToken;

    // 3. Verify cryptographic HMAC signature
    if (!verifyTokenSignature(tokenToValidate)) {
        return {
            valid: false,
            code: 'CSRF_TOKEN_INVALID',
            message: 'CSRF protection barrier: Invalid or forged CSRF token.'
        };
    }

    // 4. Double-Submit validation: If both cookie and header are provided, they must match
    if (headerToken && cookieToken) {
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
    }

    return { valid: true };
}

/**
 * Handle GET /api/auth/csrf or GET /api/csrf
 * Provisions a fresh signed CSRF token and sets the cookie
 */
function handleCsrfEndpoint(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const token = generateCsrfToken();
    const cookieOpts = 'Path=/; Secure; SameSite=Strict; Max-Age=86400';

    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieOpts}`);

    const payload = {
        status: 'ok',
        csrf_token: token,
        cookie_name: COOKIE_NAME,
        policy: 'SameSite=Strict; Secure'
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
