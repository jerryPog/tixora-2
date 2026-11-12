/**
 * TIXORA ENTERPRISE SECURITY HEADERS & HTTPS ENGINE
 * OWASP ASVS 4.0, Mozilla Observatory A+ Grade Security Compliance
 */

const STANDARD_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https:",
    "object-src 'none'",
    "upgrade-insecure-requests"
].join('; ');

const ADMIN_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https:",
    "object-src 'none'",
    "upgrade-insecure-requests"
].join('; ');

const API_CSP = "default-src 'none'; frame-ancestors 'none'";

const PERMISSIONS_POLICY = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'screen-wake-lock=()',
    'accelerometer=()',
    'gyroscope=()',
    'magnetometer=()'
].join(', ');

const BASE_SECURITY_HEADERS = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': PERMISSIONS_POLICY,
    'Content-Security-Policy': STANDARD_CSP,
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Permitted-Cross-Domain-Policies': 'none'
};

const LOCAL_STANDARD_CSP = STANDARD_CSP.replace(/;\s*upgrade-insecure-requests\b/i, '');
const LOCAL_ADMIN_CSP = ADMIN_CSP.replace(/;\s*upgrade-insecure-requests\b/i, '');

/**
 * Validate whether a hostname belongs to an authorized Tixora / local host.
 * Prevents Host Header Injection and Open Redirects.
 */
function isTrustedHostHeader(rawHost) {
    if (!rawHost || typeof rawHost !== 'string') return false;
    const hostOnly = rawHost.split(',')[0].trim().split(':')[0].toLowerCase();
    const vercelHost = process.env.VERCEL_URL
        ? String(process.env.VERCEL_URL).replace(/^https?:\/\//i, '').split(':')[0].toLowerCase()
        : '';
    return (
        hostOnly === 'localhost' ||
        hostOnly === '127.0.0.1' ||
        hostOnly === 'tixora.live' ||
        hostOnly === 'www.tixora.live' ||
        hostOnly.endsWith('.tixora.live') ||
        hostOnly === 'tixoralive.vercel.app' ||
        /^tixoralive-[a-z0-9-]+\.vercel\.app$/.test(hostOnly) ||
        hostOnly === 'tixora-2.vercel.app' ||
        /^tixora-2-[a-z0-9-]+\.vercel\.app$/.test(hostOnly) ||
        (Boolean(vercelHost) && hostOnly === vercelHost)
    );
}

/**
 * Determine whether the incoming request is plain HTTP on localhost/127.0.0.1.
 * Production HTTPS / custom hosts always receive full HSTS, Secure cookies, and CSP upgrades.
 */
function isPlainLocalHttp(req) {
    if (!req || !req.headers) return false;
    const trustProxy = Boolean(process.env.VERCEL || process.env.TRUST_PROXY === '1');
    const rawHost = String((trustProxy ? req.headers['x-forwarded-host'] : '') || req.headers.host || '').split(',')[0].trim();
    const hostWithoutPort = rawHost.split(':')[0].toLowerCase();
    const isLocalHost = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1';
    if (!isLocalHost) return false;
    const proto = trustProxy ? String(req.headers['x-forwarded-proto'] || '').toLowerCase() : '';
    const encrypted = Boolean(req.socket && req.socket.encrypted);
    return proto !== 'https' && !encrypted;
}

/**
 * Apply all enterprise security headers to an HTTP response
 * @param {http.ServerResponse} res
 * @param {object} options
 */
function applySecurityHeaders(res, options = {}) {
    if (!res) return;
    const { isAdmin = false, isApi = false, isAsset = false, req = null } = options;
    const isLocalPlain = isPlainLocalHttp(req);

    const setHeader = (k, v) => {
        if (typeof res.setHeader === 'function') {
            res.setHeader(k, v);
        } else if (res.headers && typeof res.headers === 'object') {
            res.headers[k] = v;
        }
    };

    if (!isLocalPlain) {
        setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    setHeader('X-Content-Type-Options', 'nosniff');
    setHeader('X-XSS-Protection', '1; mode=block');
    setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    if (isAdmin) {
        setHeader('X-Frame-Options', 'DENY');
        setHeader('Content-Security-Policy', isLocalPlain ? LOCAL_ADMIN_CSP : ADMIN_CSP);
        setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        setHeader('X-Robots-Tag', 'noindex, nofollow');
    } else if (isApi) {
        setHeader('X-Frame-Options', 'DENY');
        setHeader('Content-Security-Policy', API_CSP);
        setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    } else if (isAsset) {
        setHeader('X-Frame-Options', 'SAMEORIGIN');
        setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    } else {
        setHeader('X-Frame-Options', 'SAMEORIGIN');
        setHeader('Content-Security-Policy', isLocalPlain ? LOCAL_STANDARD_CSP : STANDARD_CSP);
        setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }
}

/**
 * Force HTTPS and Canonical Apex Host
 * Issues a 301 Permanent Redirect whenever an unencrypted HTTP or www request is received
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @returns {boolean} true if request was redirected, false otherwise
 */
function enforceHttps(req, res) {
    if (!req || !res) return false;
    const trustProxy = Boolean(process.env.VERCEL || process.env.TRUST_PROXY === '1');
    const rawHost = String((trustProxy ? req.headers['x-forwarded-host'] : '') || req.headers.host || '').split(',')[0].trim();
    const hostWithoutPort = rawHost.split(':')[0].toLowerCase();
    if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
        return false;
    }

    const proto = trustProxy ? String(req.headers['x-forwarded-proto'] || '').toLowerCase() : '';
    const trusted = isTrustedHostHeader(rawHost);
    const isWww = trusted && hostWithoutPort.startsWith('www.');
    const isHttp = proto === 'http';

    if (isHttp || isWww || (rawHost && !trusted)) {
        let targetHost = 'tixora.live';
        if (trusted) {
            targetHost = isWww ? hostWithoutPort.slice(4) : hostWithoutPort;
        }
        // Sanitize req.url to prevent protocol-relative or CRLF redirect injection
        let safePath = String(req.url || '/').replace(/[\r\n\0]/g, '');
        if (!safePath.startsWith('/') || safePath.startsWith('//') || safePath.startsWith('/\\')) {
            safePath = '/';
        }
        const targetUrl = `https://${targetHost}${safePath}`;

        const headers = {
            'Location': targetUrl,
            'Connection': 'close',
            'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
            'X-Content-Type-Options': 'nosniff',
            'Content-Type': 'text/plain; charset=utf-8'
        };

        if (typeof res.writeHead === 'function') {
            res.writeHead(301, headers);
            res.end('301 Moved Permanently: Upgrading to secure HTTPS');
        } else if (typeof res.redirect === 'function') {
            applySecurityHeaders(res, { req });
            res.redirect(301, targetUrl);
        }
        return true;
    }
    return false;
}

module.exports = {
    STANDARD_CSP,
    ADMIN_CSP,
    LOCAL_STANDARD_CSP,
    LOCAL_ADMIN_CSP,
    API_CSP,
    PERMISSIONS_POLICY,
    BASE_SECURITY_HEADERS,
    isTrustedHostHeader,
    isPlainLocalHttp,
    applySecurityHeaders,
    enforceHttps
};

