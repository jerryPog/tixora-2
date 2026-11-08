/**
 * TIXORA SECURE PASSWORD RESET TOKEN ENGINE
 * Cryptographically Signed HMAC-SHA256 Tokens with Nonce Protection
 * Strictly enforces 15-minute expiration and atomic single-use invalidation
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getAuthSecret } = require('./secrets');

// File cache for consumed nonces and active tokens
const CACHE_FILE = process.env.VERCEL 
    ? path.join('/tmp', 'tixora_consumed_nonces.json')
    : path.resolve(__dirname, '../.reset_consumed.json');

const _consumedNonces = new Set();
const _activeTokens = new Map();

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            if (Array.isArray(data.consumed)) {
                data.consumed.forEach(n => _consumedNonces.add(n));
            }
            if (Array.isArray(data.active)) {
                data.active.forEach(item => {
                    if (item && item.nonce) _activeTokens.set(item.nonce, item);
                });
            }
        }
    } catch (e) {}
}

function saveCache() {
    try {
        const payload = {
            consumed: Array.from(_consumedNonces),
            active: Array.from(_activeTokens.values())
        };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {}
}

loadCache();

/**
 * Hash helper
 */
function hashToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return '';
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Create a new cryptographically signed, expiring, single-use reset token
 * @param {string} email 
 * @param {number} validityMinutes (defaults to 15)
 * @param {object} meta 
 */
async function createResetToken(email, validityMinutes = 15, meta = {}) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Please enter a valid email address.');
    }

    loadCache();

    // Invalidate any existing unused tokens for this email
    for (const [nonce, item] of _activeTokens.entries()) {
        if (item.email === cleanEmail && !item.isUsed) {
            item.isUsed = true;
            _consumedNonces.add(nonce);
        }
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const expiresAt = now + (validityMinutes * 60 * 1000);

    // Cryptographic payload: email:expiresAt:nonce
    const payload = `${cleanEmail}:${expiresAt}:${nonce}`;
    const authSecret = getAuthSecret();
    const hmac = crypto.createHmac('sha256', authSecret).update(payload).digest('hex');
    const b64Payload = Buffer.from(payload).toString('base64url');
    const rawToken = `${b64Payload}.${hmac}`;

    const record = {
        nonce,
        rawToken,
        email: cleanEmail,
        createdAt: now,
        expiresAt,
        validityMinutes,
        isUsed: false,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null
    };

    _activeTokens.set(nonce, record);
    saveCache();

    return {
        rawToken,
        nonce,
        email: cleanEmail,
        expiresAt,
        expiresInSeconds: validityMinutes * 60,
        validityMinutes
    };
}

/**
 * Parse and verify cryptographic token
 */
function parseToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string' || !rawToken.includes('.')) {
        return null;
    }

    const parts = rawToken.trim().split('.');
    if (parts.length !== 2) return null;

    const [b64Payload, hmac] = parts;
    let payload = '';
    try {
        payload = Buffer.from(b64Payload, 'base64url').toString('utf8');
    } catch (e) {
        return null;
    }

    const authSecret = getAuthSecret();
    const expectedHmac = crypto.createHmac('sha256', authSecret).update(payload).digest('hex');
    if (hmac !== expectedHmac) {
        return null; // Tampered or forged token!
    }

    const segments = payload.split(':');
    if (segments.length < 3) return null;

    const email = segments[0];
    const expiresAt = parseInt(segments[1], 10);
    const nonce = segments[2];

    return { email, expiresAt, nonce };
}

/**
 * Verify token validity, expiration, and single-use state
 */
async function verifyResetToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') {
        return {
            valid: false,
            code: 'missing_token',
            message: 'No reset token provided in request.'
        };
    }

    loadCache();
    const parsed = parseToken(rawToken);

    if (!parsed) {
        return {
            valid: false,
            code: 'invalid_token',
            message: 'This password reset link is invalid, malformed, or has been tampered with.'
        };
    }

    const { email, expiresAt, nonce } = parsed;

    // 1. Single-use check: has this nonce already been consumed?
    if (_consumedNonces.has(nonce)) {
        return {
            valid: false,
            code: 'already_used',
            message: 'This password reset link has already been used. For your security, reset links work only once.'
        };
    }

    const record = _activeTokens.get(nonce);
    if (record && record.isUsed) {
        return {
            valid: false,
            code: 'already_used',
            message: 'This password reset link has already been used. For your security, reset links work only once.'
        };
    }

    // 2. Expiration check: has the 15-minute validity window elapsed?
    const now = Date.now();
    if (now > expiresAt) {
        return {
            valid: false,
            code: 'expired',
            message: 'This password reset link has expired. Reset links are strictly valid for 15 minutes.'
        };
    }

    const remainingSeconds = Math.max(0, Math.round((expiresAt - now) / 1000));

    // Mask email for security/privacy
    const emailParts = email.split('@');
    const maskedUser = emailParts[0].length > 2 
        ? emailParts[0][0] + '***' + emailParts[0].slice(-1)
        : emailParts[0][0] + '***';
    const maskedEmail = `${maskedUser}@${emailParts[1]}`;

    return {
        valid: true,
        email: email,
        maskedEmail: maskedEmail,
        expiresAt: expiresAt,
        expiresInSeconds: remainingSeconds
    };
}

/**
 * Atomically consume reset token and update password
 */
async function consumeResetToken(rawToken, newPassword) {
    if (!newPassword || newPassword.length < 6) {
        return {
            success: false,
            code: 'weak_password',
            message: 'Password must be at least 6 characters long.'
        };
    }

    loadCache();
    const check = await verifyResetToken(rawToken);
    if (!check.valid) {
        return {
            success: false,
            code: check.code,
            message: check.message
        };
    }

    const parsed = parseToken(rawToken);
    if (!parsed) {
        return {
            success: false,
            code: 'invalid_token',
            message: 'Invalid reset token.'
        };
    }

    const { nonce, email } = parsed;

    if (_consumedNonces.has(nonce)) {
        return {
            success: false,
            code: 'already_used',
            message: 'This password reset link has already been used.'
        };
    }

    // ATOMIC CONSUMPTION: Burn nonce permanently
    _consumedNonces.add(nonce);

    const record = _activeTokens.get(nonce);
    if (record) {
        record.isUsed = true;
        record.usedAt = Date.now();
    }

    // Invalidate all active tokens for this user email
    for (const [n, item] of _activeTokens.entries()) {
        if (item.email === email) {
            item.isUsed = true;
            _consumedNonces.add(n);
        }
    }

    saveCache();

    return {
        success: true,
        email: email,
        message: 'Your password has been reset successfully. You can now log in with your new password.'
    };
}

const tokenHandler = (req, res) => {
    const payload = { error: 'Direct access to token-store is forbidden.' };
    if (typeof res.status === 'function') return res.status(403).json(payload);
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(payload));
};

tokenHandler.hashToken = hashToken;
tokenHandler.createResetToken = createResetToken;
tokenHandler.verifyResetToken = verifyResetToken;
tokenHandler.consumeResetToken = consumeResetToken;

module.exports = tokenHandler;
module.exports.hashToken = hashToken;
module.exports.createResetToken = createResetToken;
module.exports.verifyResetToken = verifyResetToken;
module.exports.consumeResetToken = consumeResetToken;
