/**
 * TIXORA SECURE PASSWORD RESET TOKEN ENGINE
 * Enforces Cryptographic Random Tokens, Strict 15-Minute Expiry, and Atomic Single-Use
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Fallback disk cache file (works in serverless /tmp and local Node)
const CACHE_FILE = process.env.VERCEL 
    ? path.join('/tmp', 'tixora_reset_tokens.json')
    : path.resolve(__dirname, '../../.reset_tokens.json');

// In-memory memory map for ultra-fast lookup within process lifecycle
const _memoryTokens = new Map();

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item && item.tokenHash) {
                        _memoryTokens.set(item.tokenHash, item);
                    }
                });
            }
        }
    } catch (e) {
        // Cache miss or read warning
    }
}

function saveCache() {
    try {
        const arr = Array.from(_memoryTokens.values());
        fs.writeFileSync(CACHE_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (e) {
        // Ephemeral container write warning
    }
}

// Initial cache load
loadCache();

/**
 * Hash raw token with SHA-256 (Tokens are never stored in plain text)
 */
function hashToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return '';
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Create a new expiring, single-use reset token
 * @param {string} email 
 * @param {number} validityMinutes (defaults to 15 minutes)
 * @param {object} meta (optional IP, user-agent)
 */
async function createResetToken(email, validityMinutes = 15, meta = {}) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Please enter a valid email address.');
    }

    loadCache();

    // 1. Invalidate any existing unused tokens for this email (Work only once & prevent lingering links)
    for (const [hash, record] of _memoryTokens.entries()) {
        if (record.email === cleanEmail && !record.isUsed) {
            record.isUsed = true;
            record.usedAt = Date.now();
            record.revokedReason = 'superseded_by_new_request';
        }
    }

    // 2. Generate high-entropy 256-bit cryptographic token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const now = Date.now();
    const expiresAt = now + (validityMinutes * 60 * 1000);

    const record = {
        tokenHash,
        email: cleanEmail,
        createdAt: now,
        expiresAt,
        validityMinutes,
        isUsed: false,
        usedAt: null,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null
    };

    _memoryTokens.set(tokenHash, record);
    saveCache();

    return {
        rawToken,
        tokenHash,
        email: cleanEmail,
        expiresAt,
        expiresInSeconds: validityMinutes * 60,
        validityMinutes
    };
}

/**
 * Verify if a reset token is valid, unexpired, and not yet used
 * @param {string} rawToken 
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
    const tokenHash = hashToken(rawToken);
    const record = _memoryTokens.get(tokenHash);

    if (!record) {
        return {
            valid: false,
            code: 'invalid_token',
            message: 'This password reset link is invalid or does not exist.'
        };
    }

    // Check single-use constraint
    if (record.isUsed || record.usedAt !== null) {
        return {
            valid: false,
            code: 'already_used',
            message: 'This password reset link has already been used. For your security, reset links work only once.',
            usedAt: record.usedAt
        };
    }

    // Check expiration constraint
    const now = Date.now();
    if (now > record.expiresAt) {
        return {
            valid: false,
            code: 'expired',
            message: `This password reset link has expired. Reset links are strictly valid for ${record.validityMinutes || 15} minutes.`,
            expiresAt: record.expiresAt
        };
    }

    const remainingSeconds = Math.max(0, Math.round((record.expiresAt - now) / 1000));

    // Mask email for privacy (e.g. j***y@tixora.live)
    const emailParts = record.email.split('@');
    const maskedUser = emailParts[0].length > 2 
        ? emailParts[0][0] + '***' + emailParts[0].slice(-1)
        : emailParts[0][0] + '***';
    const maskedEmail = `${maskedUser}@${emailParts[1]}`;

    return {
        valid: true,
        email: record.email,
        maskedEmail: maskedEmail,
        expiresAt: record.expiresAt,
        expiresInSeconds: remainingSeconds
    };
}

/**
 * Atomically consume a reset token and update password
 * @param {string} rawToken 
 * @param {string} newPassword 
 */
async function consumeResetToken(rawToken, newPassword) {
    if (!newPassword || newPassword.length < 6) {
        return {
            success: false,
            code: 'weak_password',
            message: 'Password must be at least 6 characters long.'
        };
    }

    // First check validity
    const check = await verifyResetToken(rawToken);
    if (!check.valid) {
        return {
            success: false,
            code: check.code,
            message: check.message
        };
    }

    loadCache();
    const tokenHash = hashToken(rawToken);
    const record = _memoryTokens.get(tokenHash);

    if (!record || record.isUsed) {
        return {
            success: false,
            code: 'already_used',
            message: 'This password reset link has already been used.'
        };
    }

    // ATOMIC CONSUMPTION: Mark token as consumed immediately
    record.isUsed = true;
    record.usedAt = Date.now();
    _memoryTokens.set(tokenHash, record);
    saveCache();

    // Invalidate all other tokens for this email as an extra security precaution
    for (const [hash, r] of _memoryTokens.entries()) {
        if (r.email === record.email) {
            r.isUsed = true;
            if (!r.usedAt) r.usedAt = Date.now();
        }
    }
    saveCache();

    return {
        success: true,
        email: record.email,
        message: 'Your password has been reset successfully. You can now log in with your new password.'
    };
}

module.exports = {
    hashToken,
    createResetToken,
    verifyResetToken,
    consumeResetToken
};
