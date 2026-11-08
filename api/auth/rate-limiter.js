/**
 * TIXORA PRODUCTION RATE LIMITER CORE
 * OWASP ASVS 4.0 Compliant Anti-Automation & Brute-Force Defense Engine
 * Protects Authentication, Sign-Ups, and Password Recovery across Node and Vercel Edge
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = process.env.VERCEL
    ? path.join('/tmp', 'tixora_rate_limits.json')
    : path.resolve(__dirname, '../../.rate_limits.json');

// Configuration rules per action
const RULES = {
    login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,  // 15 minutes sliding window
        lockoutMs: 15 * 60 * 1000  // 15 minutes lockout upon violation
    },
    signup: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000,  // 1 hour window
        lockoutMs: 60 * 60 * 1000  // 1 hour lockout
    },
    forgot_password: {
        maxAttempts: 3,
        windowMs: 15 * 60 * 1000,  // 15 minutes window
        lockoutMs: 15 * 60 * 1000  // 15 minutes lockout
    }
};

// In-memory store for instantaneous access
const _store = new Map();

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            if (data && typeof data === 'object') {
                const now = Date.now();
                Object.keys(data).forEach(key => {
                    const item = data[key];
                    // Only load active items
                    if (item && item.resetAt && item.resetAt > now) {
                        _store.set(key, item);
                    }
                });
            }
        }
    } catch (e) {}
}

function saveCache() {
    try {
        const obj = {};
        const now = Date.now();
        for (const [key, item] of _store.entries()) {
            if (item.resetAt > now) {
                obj[key] = item;
            }
        }
        fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {}
}

loadCache();

/**
 * Extract normalized client IP from request
 */
function getClientIp(req) {
    if (!req) return '127.0.0.1';
    
    // Check headers in precedence order
    const xForwardedFor = req.headers && req.headers['x-forwarded-for'];
    let ip = '';
    
    if (xForwardedFor) {
        // First entry in comma-separated chain is the client IP
        ip = xForwardedFor.split(',')[0].trim();
    } else if (req.headers && req.headers['x-real-ip']) {
        ip = req.headers['x-real-ip'].trim();
    } else if (req.socket && req.socket.remoteAddress) {
        ip = req.socket.remoteAddress;
    } else if (req.connection && req.connection.remoteAddress) {
        ip = req.connection.remoteAddress;
    }

    // Normalize IPv6 mapped IPv4 (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
    if (ip.startsWith('::ffff:')) {
        ip = ip.replace('::ffff:', '');
    }

    return ip || '127.0.0.1';
}

/**
 * Check if an IP or identifier is currently rate limited
 */
function checkRateLimit(ip, identifier, action = 'login') {
    const rule = RULES[action] || RULES.login;
    const now = Date.now();
    loadCache();

    const keysToCheck = [];
    if (ip) keysToCheck.push(`${action}:ip:${ip.toLowerCase()}`);
    if (identifier) keysToCheck.push(`${action}:id:${identifier.toLowerCase().trim()}`);

    for (const key of keysToCheck) {
        const entry = _store.get(key);
        if (entry) {
            // Check if active lockout exists
            if (entry.lockedUntil && entry.lockedUntil > now) {
                const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
                return {
                    allowed: false,
                    key: key,
                    action: action,
                    attempts: entry.count,
                    limit: rule.maxAttempts,
                    remaining: 0,
                    retryAfterSeconds: retryAfter,
                    resetAt: new Date(entry.lockedUntil).toISOString(),
                    message: action === 'login'
                        ? `Too many sign in attempts. For account security, access is temporarily locked. Please wait ${Math.ceil(retryAfter / 60)} minutes before trying again.`
                        : `Too many ${action} requests. Please wait ${Math.ceil(retryAfter / 60)} minutes before trying again.`
                };
            }

            // Check if sliding window has expired
            if (entry.resetAt <= now) {
                _store.delete(key);
            }
        }
    }

    // Determine remaining attempts
    let maxCount = 0;
    let closestReset = now + rule.windowMs;

    for (const key of keysToCheck) {
        const entry = _store.get(key);
        if (entry && entry.resetAt > now) {
            if (entry.count > maxCount) {
                maxCount = entry.count;
                closestReset = entry.resetAt;
            }
        }
    }

    const remaining = Math.max(0, rule.maxAttempts - maxCount);

    return {
        allowed: remaining > 0,
        action: action,
        attempts: maxCount,
        limit: rule.maxAttempts,
        remaining: remaining,
        retryAfterSeconds: 0,
        resetAt: new Date(closestReset).toISOString()
    };
}

/**
 * Record an authentication attempt (failure or success)
 */
function recordAttempt(ip, identifier, action = 'login', success = false) {
    const rule = RULES[action] || RULES.login;
    const now = Date.now();
    loadCache();

    const keysToUpdate = [];
    if (ip) keysToUpdate.push(`${action}:ip:${ip.toLowerCase()}`);
    if (identifier) keysToUpdate.push(`${action}:id:${identifier.toLowerCase().trim()}`);

    // If successful login, wipe failed attempts
    if (success && action === 'login') {
        for (const key of keysToUpdate) {
            _store.delete(key);
        }
        saveCache();
        return { success: true, attempts: 0, remaining: rule.maxAttempts };
    }

    // On failure or registration increment
    for (const key of keysToUpdate) {
        let entry = _store.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = {
                count: 1,
                firstAttempt: now,
                resetAt: now + rule.windowMs,
                lockedUntil: null
            };
        } else {
            entry.count += 1;
        }

        // Trigger lockout if threshold met
        if (entry.count >= rule.maxAttempts) {
            entry.lockedUntil = now + rule.lockoutMs;
            entry.resetAt = entry.lockedUntil;
        }

        _store.set(key, entry);
    }

    saveCache();
    return checkRateLimit(ip, identifier, action);
}

/**
 * Clear rate limit for an IP or identifier
 */
function resetRateLimit(ip, identifier, action = 'login') {
    const keys = [];
    if (ip) keys.push(`${action}:ip:${ip.toLowerCase()}`);
    if (identifier) keys.push(`${action}:id:${identifier.toLowerCase().trim()}`);

    for (const key of keys) {
        _store.delete(key);
    }
    saveCache();
}

/**
 * Apply standard HTTP rate limiting headers
 */
function applyRateLimitHeaders(res, rateLimitResult) {
    if (!res || !rateLimitResult) return;

    const setHeader = (name, value) => {
        if (typeof res.setHeader === 'function') {
            res.setHeader(name, String(value));
        } else if (res.headers && typeof res.headers === 'object') {
            res.headers[name] = String(value);
        }
    };

    setHeader('X-RateLimit-Limit', rateLimitResult.limit || 5);
    setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitResult.remaining || 0));
    setHeader('X-RateLimit-Reset', rateLimitResult.resetAt || new Date().toISOString());

    if (!rateLimitResult.allowed && rateLimitResult.retryAfterSeconds > 0) {
        setHeader('Retry-After', rateLimitResult.retryAfterSeconds);
    }
}

module.exports = {
    RULES,
    getClientIp,
    checkRateLimit,
    recordAttempt,
    resetRateLimit,
    applyRateLimitHeaders
};
