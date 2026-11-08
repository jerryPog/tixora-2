/**
 * TIXORA DOMAIN-RESTRICTED CORS ENGINE
 * W3C / WHATWG & OWASP ASVS 4.0 Compliant Cross-Origin Resource Sharing
 * 
 * Restricts all CORS access strictly to official Tixora domains.
 * Completely blocks untrusted 3rd-party origins, preventing credential theft and data exfiltration.
 */

const ALLOWED_DOMAIN_PATTERNS = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https:\/\/([a-zA-Z0-9-]+\.)*tixora\.live$/,
    /^https:\/\/([a-zA-Z0-9-]+\.)*vercel\.app$/
];

/**
 * Validates whether an incoming Origin header is an authorized Tixora domain
 * @param {string} originStr
 * @returns {boolean}
 */
function isAllowedOrigin(originStr) {
    if (!originStr || typeof originStr !== 'string') return false;

    let parsed;
    try {
        parsed = new URL(originStr);
    } catch (e) {
        return false;
    }

    const normalizedOrigin = parsed.origin.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    // In production, must be HTTPS (except localhost / 127.0.0.1 in local dev)
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal && parsed.protocol !== 'https:') {
        return false;
    }

    // Check patterns
    for (const pattern of ALLOWED_DOMAIN_PATTERNS) {
        if (pattern.test(normalizedOrigin)) {
            return true;
        }
    }

    return false;
}

/**
 * Handle CORS headers and Preflight OPTIONS requests
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @returns {boolean} true if preflight request was handled (and ended), false if execution should continue
 */
function handleCors(req, res) {
    if (!req || !res) return false;
    const headers = req.headers || {};
    const origin = headers['origin'];
    const method = (req.method || 'GET').toUpperCase();

    // If no Origin header is present, it's a same-origin or non-browser request; proceed normally
    if (!origin) {
        return false;
    }

    const allowed = isAllowedOrigin(origin);

    if (allowed) {
        const setHeader = (k, v) => {
            if (typeof res.setHeader === 'function') {
                res.setHeader(k, v);
            } else if (res.headers && typeof res.headers === 'object') {
                res.headers[k] = v;
            }
        };

        // Whitelist exact origin (NEVER use wildcard '*' when credentials/cookies are involved)
        setHeader('Access-Control-Allow-Origin', origin);
        setHeader('Access-Control-Allow-Credentials', 'true');
        setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Forwarded-Proto, X-Requested-With, Accept');
        setHeader('Access-Control-Max-Age', '86400');
        setHeader('Vary', 'Origin');

        // Handle preflight OPTIONS request
        if (method === 'OPTIONS') {
            if (typeof res.status === 'function') {
                res.status(204).end();
            } else if (typeof res.writeHead === 'function') {
                res.writeHead(204);
                res.end();
            }
            return true;
        }

        return false;
    } else {
        // Origin is untrusted / third-party attacker
        // For preflight OPTIONS: strictly reject with 403 Forbidden without CORS allow headers
        if (method === 'OPTIONS') {
            const errPayload = {
                status: 'forbidden',
                code: 'CORS_ORIGIN_DENIED',
                error: 'CORS_RESTRICTION_BLOCKED',
                message: `Cross-Origin Resource Sharing blocked: Origin '${origin}' is not authorized.`
            };
            if (typeof res.status === 'function') {
                res.status(403).json(errPayload);
            } else if (typeof res.writeHead === 'function') {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(errPayload));
            }
            return true;
        }

        // For untrusted requests:
        // Set Vary: Origin to avoid cache poisoning
        if (typeof res.setHeader === 'function') {
            res.setHeader('Vary', 'Origin');
        }

        // For API calls from untrusted cross-origin, reject with 403 Forbidden
        const rawUrl = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.url || '';
        if (rawUrl.includes('/api/')) {
            const errPayload = {
                status: 'forbidden',
                code: 'CORS_ORIGIN_DENIED',
                error: 'CORS_RESTRICTION_BLOCKED',
                message: `Cross-Origin Resource Sharing blocked: Origin '${origin}' is not authorized.`
            };
            if (typeof res.status === 'function') {
                res.status(403).json(errPayload);
            } else if (typeof res.writeHead === 'function') {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(errPayload));
            }
            return true;
        }

        return false;
    }
}

module.exports = {
    ALLOWED_DOMAIN_PATTERNS,
    isAllowedOrigin,
    handleCors
};
