/**
 * TIXORA SECRETS & KEY ROTATION ENGINE
 * Revokes static fallback strings and generates high-entropy CSPRNG private secrets.
 * Supports runtime environment injection (Vercel/Docker) with automated rotation safeguards.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Known legacy static keys to permanently revoke
const REVOKED_LEGACY_KEYS = new Set([
    'tixora-master-csrf-cryptographic-salt-2026',
    'tixora-master-cryptographic-salt-2026-auth-seal',
    'tixora-legacy-auth-salt',
    'tixora2026'
]);

// In-process cache for secrets during active runtime
const _secretCache = new Map();

/**
 * Checks if a string matches any revoked legacy key
 */
function isRevokedKey(value) {
    if (!value || typeof value !== 'string') return false;
    return REVOKED_LEGACY_KEYS.has(value.trim());
}

/**
 * Retrieves a cryptographically secure secret from environment or persistent local sandbox.
 * Strictly prevents the usage of known revoked static fallback keys.
 * 
 * @param {string} envVarName - e.g. 'TIXORA_AUTH_SECRET', 'TIXORA_CSRF_SECRET'
 * @param {string} cacheFileName - e.g. 'auth_master', 'csrf_master'
 * @returns {string} 64-byte hex cryptographic secret (512-bit entropy)
 */
function getOrGenerateSecret(envVarName, cacheFileName) {
    // 1. Check in-process memory cache
    if (_secretCache.has(envVarName)) {
        return _secretCache.get(envVarName);
    }

    // 2. Check environment variable (e.g. set in Vercel or production server)
    const envVal = process.env[envVarName] || (envVarName !== 'TIXORA_AUTH_SECRET' ? process.env.TIXORA_AUTH_SECRET : null);
    if (envVal && typeof envVal === 'string' && envVal.length >= 16) {
        if (!isRevokedKey(envVal)) {
            _secretCache.set(envVarName, envVal.trim());
            return envVal.trim();
        } else {
            console.warn(`[TIXORA SECURITY] Warning: Environment variable ${envVarName} contained a revoked key. Generating fresh secure key.`);
        }
    }

    // 3. Check persistent secure disk cache in sandbox /tmp
    const cacheDir = process.env.VERCEL ? '/tmp' : os.tmpdir();
    const diskPath = path.join(cacheDir, `.tixora_${cacheFileName}.secret`);

    try {
        if (fs.existsSync(diskPath)) {
            const diskSecret = fs.readFileSync(diskPath, 'utf8').trim();
            if (diskSecret && diskSecret.length >= 32 && !isRevokedKey(diskSecret)) {
                _secretCache.set(envVarName, diskSecret);
                return diskSecret;
            }
        }
    } catch (e) {
        // Fallback to fresh generation
    }

    // 4. Generate fresh 512-bit CSPRNG cryptographic random key
    const freshSecret = crypto.randomBytes(64).toString('hex');
    try {
        fs.writeFileSync(diskPath, freshSecret, { mode: 0o600 });
    } catch (e) {
        // In read-only environments, keep in memory
    }

    _secretCache.set(envVarName, freshSecret);
    return freshSecret;
}

/**
 * Force revoke and rotate all secrets in the current process and on disk
 */
function rotateSecrets() {
    _secretCache.clear();
    const cacheDir = process.env.VERCEL ? '/tmp' : os.tmpdir();
    const files = ['.tixora_auth_master.secret', '.tixora_csrf_master.secret'];
    for (const f of files) {
        try {
            const p = path.join(cacheDir, f);
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
            }
        } catch (e) {}
    }
    // Re-generate fresh secrets
    const newAuth = getOrGenerateSecret('TIXORA_AUTH_SECRET', 'auth_master');
    const newCsrf = getOrGenerateSecret('TIXORA_CSRF_SECRET', 'csrf_master');
    return { authSecretRotated: true, csrfSecretRotated: true };
}

function getAuthSecret() {
    return getOrGenerateSecret('TIXORA_AUTH_SECRET', 'auth_master');
}

function getCsrfSecret() {
    return getOrGenerateSecret('TIXORA_CSRF_SECRET', 'csrf_master');
}

module.exports = {
    isRevokedKey,
    getAuthSecret,
    getCsrfSecret,
    rotateSecrets,
    REVOKED_LEGACY_KEYS
};
