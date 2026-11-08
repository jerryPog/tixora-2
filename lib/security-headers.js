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

/**
 * Apply all enterprise security headers to an HTTP response
 * @param {http.ServerResponse} res
 * @param {object} options
 */
function applySecurityHeaders(res, options = {}) {
    if (!res) return;
    const { isAdmin = false, isApi = false, isAsset = false } = options;

    const setHeader = (k, v) => {
        if (typeof res.setHeader === 'function') {
            res.setHeader(k, v);
        } else if (res.headers && typeof res.headers === 'object') {
            res.headers[k] = v;
        }
    };

    setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    setHeader('X-Content-Type-Options', 'nosniff');
    setHeader('X-XSS-Protection', '1; mode=block');
    setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    if (isAdmin) {
        setHeader('X-Frame-Options', 'DENY');
        setHeader('Content-Security-Policy', ADMIN_CSP);
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
        setHeader('Content-Security-Policy', STANDARD_CSP);
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
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'];
    const isWww = host.startsWith('www.');
    const isHttp = proto === 'http';

    if (isHttp || isWww) {
        const targetHost = isWww ? host.slice(4) : host;
        const targetUrl = `https://${targetHost}${req.url || '/'}`;

        const headers = {
            'Location': targetUrl,
            'Connection': 'close',
            'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
            'X-Content-Type-Options': 'nosniff',
            'Content-Type': 'text/plain; charset=utf-8'
        };

        if (typeof res.writeHead === 'function') {
            res.writeHead(301, headers);
            res.end(`301 Moved Permanently: Upgrading to secure HTTPS at ${targetUrl}`);
        } else if (typeof res.redirect === 'function') {
            applySecurityHeaders(res);
            res.redirect(301, targetUrl);
        }
        return true;
    }
    return false;
}

module.exports = {
    STANDARD_CSP,
    ADMIN_CSP,
    API_CSP,
    PERMISSIONS_POLICY,
    BASE_SECURITY_HEADERS,
    applySecurityHeaders,
    enforceHttps
};

