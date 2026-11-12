/**
 * TIXORA PRODUCTION RATE LIMITER & API HANDLER
 * OWASP ASVS 4.0 Compliant Anti-Automation & Brute-Force Defense Engine
 * Self-contained Serverless Function & Node Handler
 */

const fs = require('fs');
const path = require('path');
const { csrfGuard } = require('../csrf');
const { applySecurityHeaders } = require('../security-headers');
const { handleCors } = require('../cors');

const CACHE_FILE = process.env.VERCEL
    ? path.join('/tmp', 'tixora_rate_limits.json')
    : path.resolve(__dirname, '../../.rate_limits.json');

const RULES = {
    login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        lockoutMs: 15 * 60 * 1000
    },
    signup: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000,
        lockoutMs: 60 * 60 * 1000
    },
    forgot_password: {
        maxAttempts: 3,
        windowMs: 15 * 60 * 1000,
        lockoutMs: 15 * 60 * 1000
    }
};

const _store = new Map();

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            if (data && typeof data === 'object') {
                const now = Date.now();
                Object.keys(data).forEach(key => {
                    const item = data[key];
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

function getClientIp(req) {
    if (!req) return '127.0.0.1';
    const trustProxy = Boolean(process.env.VERCEL || process.env.TRUST_PROXY === '1');
    let ip = '';
    if (trustProxy) {
        const xVercelIp = req.headers && req.headers['x-vercel-forwarded-for'];
        const xForwardedFor = req.headers && req.headers['x-forwarded-for'];
        if (xVercelIp) {
            ip = String(xVercelIp).split(',')[0].trim();
        } else if (xForwardedFor) {
            ip = String(xForwardedFor).split(',')[0].trim();
        } else if (req.headers && req.headers['x-real-ip']) {
            ip = String(req.headers['x-real-ip']).trim();
        }
    }
    if (!ip && req.socket && req.socket.remoteAddress) {
        ip = req.socket.remoteAddress;
    } else if (!ip && req.connection && req.connection.remoteAddress) {
        ip = req.connection.remoteAddress;
    }
    if (ip.startsWith('::ffff:')) {
        ip = ip.replace('::ffff:', '');
    }
    const cleanIp = String(ip || '127.0.0.1').replace(/[^a-fA-F0-9.:]/g, '').slice(0, 45);
    return cleanIp || '127.0.0.1';
}

const ALLOWED_ACTIONS = ['login', 'signup', 'forgot_password'];

function sanitizeAction(action) {
    const clean = (action || 'login').toLowerCase().trim();
    return ALLOWED_ACTIONS.includes(clean) ? clean : 'login';
}

function sanitizeIdentifier(id) {
    if (typeof id !== 'string') return '';
    return id.replace(/[\r\n\t\0]/g, '').trim().slice(0, 150);
}

function checkRateLimit(ip, identifier, rawAction = 'login') {
    const action = sanitizeAction(rawAction);
    const cleanId = sanitizeIdentifier(identifier);
    const rule = RULES[action] || RULES.login;
    const now = Date.now();
    loadCache();

    const keysToCheck = [];
    if (ip) keysToCheck.push(`${action}:ip:${ip.toLowerCase()}`);
    if (ip && cleanId) keysToCheck.push(`${action}:ip_id:${ip.toLowerCase()}:${cleanId.toLowerCase()}`);
    if (cleanId) keysToCheck.push(`${action}:id:${cleanId.toLowerCase()}`);

    for (const key of keysToCheck) {
        const entry = _store.get(key);
        if (entry) {
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
            if (entry.resetAt <= now) {
                _store.delete(key);
            }
        }
    }

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

function recordAttempt(ip, identifier, rawAction = 'login', success = false, options = {}) {
    const action = sanitizeAction(rawAction);
    const cleanId = sanitizeIdentifier(identifier);
    const rule = RULES[action] || RULES.login;
    const now = Date.now();
    loadCache();

    const scopeToIpPairOnly = Boolean(options && options.scopeToIpPairOnly);
    const keysToUpdate = [];
    if (ip) keysToUpdate.push(`${action}:ip:${ip.toLowerCase()}`);
    if (ip && cleanId) keysToUpdate.push(`${action}:ip_id:${ip.toLowerCase()}:${cleanId.toLowerCase()}`);
    if (cleanId && !scopeToIpPairOnly) keysToUpdate.push(`${action}:id:${cleanId.toLowerCase()}`);

    if (success && action === 'login') {
        for (const key of keysToUpdate) {
            _store.delete(key);
        }
        saveCache();
        return { success: true, attempts: 0, remaining: rule.maxAttempts };
    }

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

        if (entry.count >= rule.maxAttempts) {
            entry.lockedUntil = now + rule.lockoutMs;
            entry.resetAt = entry.lockedUntil;
        }

        _store.set(key, entry);
    }

    saveCache();
    return checkRateLimit(ip, identifier, action);
}

function resetRateLimit(ip, identifier, action = 'login') {
    const keys = [];
    if (ip) keys.push(`${action}:ip:${ip.toLowerCase()}`);
    if (identifier) keys.push(`${action}:id:${identifier.toLowerCase().trim()}`);
    for (const key of keys) {
        _store.delete(key);
    }
    saveCache();
}

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

function parseBody(req) {
    return new Promise((resolve) => {
        if (req.body !== undefined) {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            }
            return resolve(body || {});
        }
        if (req.readableEnded) return resolve({});
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', () => resolve({}));
    });
}

const handler = async (req, res) => {
    applySecurityHeaders(res, { isApi: true, req });
    if (handleCors(req, res)) return;

    // CSRF Protection Barrier for State-Changing Requests
    if (!csrfGuard(req, res)) return;

    const clientIp = getClientIp(req);

    if (req.method === 'GET') {
        const urlObj = new URL(req.url, 'http://localhost');
        const action = urlObj.searchParams.get('action') || 'login';
        const identifier = urlObj.searchParams.get('identifier') || urlObj.searchParams.get('email') || '';

        const result = checkRateLimit(clientIp, identifier, action);
        applyRateLimitHeaders(res, result);

        const statusCode = result.allowed ? 200 : 429;
        const payload = {
            status: result.allowed ? 'ok' : 'rate_limited',
            allowed: result.allowed,
            action: action,
            remaining: result.remaining,
            limit: result.limit,
            retry_after_seconds: result.retryAfterSeconds,
            reset_at: result.resetAt,
            message: result.message || 'Rate limit OK'
        };

        if (typeof res.status === 'function') return res.status(statusCode).json(payload);
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    if (req.method === 'POST') {
        const body = await parseBody(req);
        const action = body.action || 'login';
        const identifier = body.identifier || body.email || '';
        const success = Boolean(body.success);

        // Security barrier: Never allow unauthenticated HTTP callers to reset rate-limit lockouts.
        // Login counters are cleared server-side only inside POST /api/auth/session after Supabase JWT verification.
        if (success) {
            const errPayload = {
                status: 'forbidden',
                code: 'RATE_LIMIT_RESET_FORBIDDEN',
                error: 'Rate limit counters cannot be reset directly; counters clear automatically upon verified authentication.'
            };
            if (typeof res.status === 'function') return res.status(403).json(errPayload);
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(errPayload));
        }

        // Scope unauthenticated client-reported failures to (IP + identifier) so one IP cannot DoS third-party accounts globally
        const result = recordAttempt(clientIp, identifier, action, false, { scopeToIpPairOnly: true });
        applyRateLimitHeaders(res, result);

        const statusCode = result.allowed ? 200 : 429;
        const payload = {
            status: result.allowed ? 'recorded' : 'rate_limited',
            allowed: result.allowed,
            action: action,
            remaining: result.remaining,
            limit: result.limit,
            retry_after_seconds: result.retryAfterSeconds,
            reset_at: result.resetAt,
            message: result.message || 'Attempt recorded'
        };

        if (typeof res.status === 'function') return res.status(statusCode).json(payload);
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    const payload = { error: 'Method Not Allowed' };
    if (typeof res.status === 'function') return res.status(405).json(payload);
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(payload));
};

handler.RULES = RULES;
handler.getClientIp = getClientIp;
handler.checkRateLimit = checkRateLimit;
handler.recordAttempt = recordAttempt;
handler.resetRateLimit = resetRateLimit;
handler.applyRateLimitHeaders = applyRateLimitHeaders;

module.exports = handler;
