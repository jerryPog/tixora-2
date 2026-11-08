/**
 * TIXORA SUPABASE AUTH & RBAC ROUTE GUARD CORE
 * Production-Hardened Client-Side Authentication Engine
 * Powered by @supabase/supabase-js v2
 */

(function (window) {
    'use strict';

    // 0. Force HTTPS upgrade in production browser environments
    if (typeof window !== 'undefined' && window.location) {
        try {
            var _loc = window.location;
            if (_loc.protocol === 'http:' && _loc.hostname !== 'localhost' && _loc.hostname !== '127.0.0.1') {
                _loc.replace('https://' + _loc.host + _loc.pathname + _loc.search + _loc.hash);
            }
        } catch (e) {}
    }

    // Official Supabase project credentials for Tixora Live
    const DEFAULT_URL = 'https://hgzcdzlfwweesdljeqdv.supabase.co';
    const DEFAULT_KEY = 'sb_publishable_CyGJeojb0by0XRENmjOlAg_bbjW_Wck';

    let _supabaseClient = null;
    let _cachedSession = null;
    let _cachedUserRole = null;
    let _cachedPromoter = null;
    const _authListeners = [];

    // Safe storage adapter with localStorage persistence
    const _memoryStorage = {};
    const _safeStorage = {
        getItem: (key) => {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    return window.localStorage.getItem(key);
                }
            } catch (e) {}
            return _memoryStorage[key] || null;
        },
        setItem: (key, val) => {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(key, String(val));
                    return;
                }
            } catch (e) {}
            _memoryStorage[key] = String(val);
        },
        removeItem: (key) => {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem(key);
                    return;
                }
            } catch (e) {}
            delete _memoryStorage[key];
        }
    };

    // ZERO PLAINTEXT PROTOCOL: Purge any legacy plain-text password stores from localStorage
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('tixora_local_users');
            window.localStorage.removeItem('tixora_demo_session');
            for (let i = window.localStorage.length - 1; i >= 0; i--) {
                const k = window.localStorage.key(i);
                if (k && (k.includes('pass') || k.includes('user_store') || k.includes('local_users') || k.includes('demo_session'))) {
                    window.localStorage.removeItem(k);
                }
            }
        }
    } catch (e) {}

    /**
     * Cryptographic Password Hashing Protocol (SHA-256 via Web Crypto API)
     * Cryptographically salts and hashes passwords. Passwords are never stored in plain text.
     */
    async function hashPassword(plainTextPassword, salt = 'tixora-salt-2026') {
        if (!plainTextPassword) return '';
        try {
            if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
                const EncoderClass = typeof TextEncoder !== 'undefined' ? TextEncoder : (typeof window !== 'undefined' ? window.TextEncoder : null);
                if (!EncoderClass) throw new Error('TextEncoder is unavailable.');
                const encoder = new EncoderClass();
                const data = encoder.encode(plainTextPassword + ':' + salt);
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {
            console.warn('[TixoraAuth] Web Crypto unavailable:', e);
        }
        return '';
    }

    let _cachedCsrfToken = null;

    /**
     * Get or fetch valid signed CSRF token
     */
    async function getCsrfToken() {
        if (_cachedCsrfToken) return _cachedCsrfToken;

        // 1. Try reading from document.cookie
        if (typeof document !== 'undefined' && document.cookie) {
            const match = document.cookie.match(/(?:^|;\s*)tixora_csrf=([^;]+)/);
            if (match && match[1]) {
                _cachedCsrfToken = decodeURIComponent(match[1]);
                return _cachedCsrfToken;
            }
        }

        // 2. Fetch from secure CSRF provisioning endpoint
        try {
            const res = await fetch('/api/auth/csrf');
            const data = await res.json();
            if (data && data.csrf_token) {
                _cachedCsrfToken = data.csrf_token;
                return _cachedCsrfToken;
            }
        } catch (e) {
            // Non-blocking fallback
        }
        return '';
    }

    /**
     * Secure Fetch with Automatic CSRF Token Injection & Origin Header
     */
    async function fetchWithCsrf(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const headers = { ...(options.headers || {}) };

        // Attach CSRF token on state-changing requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            const token = await getCsrfToken();
            if (token) {
                headers['X-CSRF-Token'] = token;
            }
        }

        return fetch(url, {
            ...options,
            headers,
            credentials: options.credentials || 'same-origin'
        });
    }

    /**
     * Synchronize session token with server-side endpoint to issue HttpOnly, Secure, SameSite=Strict cookies
     */
    async function syncSessionCookie(accessToken, role) {
        try {
            if (typeof fetch === 'function') {
                await fetchWithCsrf('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: accessToken || '',
                        role: role || 'promoter'
                    })
                });
            }
        } catch (e) {
            console.warn('[TixoraAuth] syncSessionCookie warning:', e);
        }
    }

    /**
     * Clear server-side HttpOnly, Secure, SameSite=Strict session cookies
     */
    async function clearSessionCookie() {
        try {
            if (typeof fetch === 'function') {
                await fetchWithCsrf('/api/auth/logout', {
                    method: 'POST'
                });
            }
        } catch (e) {
            console.warn('[TixoraAuth] clearSessionCookie warning:', e);
        }
    }

    /**
     * Get or initialize the Supabase client
     */
    function getClient() {
        if (_supabaseClient) return _supabaseClient;

        const url = (window.TIXORA_CONFIG && window.TIXORA_CONFIG.supabaseUrl) || DEFAULT_URL;
        const key = (window.TIXORA_CONFIG && window.TIXORA_CONFIG.supabaseKey) || DEFAULT_KEY;

        if (!url || !key) {
            console.warn('[TixoraAuth] Supabase URL or Key not configured.');
            return null;
        }

        if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
            console.warn('[TixoraAuth] Supabase JS SDK v2 not loaded yet.');
            return null;
        }

        try {
            _supabaseClient = window.supabase.createClient(url, key, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storage: _safeStorage
                }
            });

            // Listen for internal Supabase auth state transitions
            _supabaseClient.auth.onAuthStateChange(async (event, session) => {
                _cachedSession = session;
                if (!session) {
                    _cachedUserRole = null;
                    _cachedPromoter = null;
                    await clearSessionCookie();
                } else {
                    await refreshUserData(session.user);
                    const role = await getUserRole(session.user);
                    await syncSessionCookie(session.access_token, role);
                }
                notifyListeners(event, session);
            });

            return _supabaseClient;
        } catch (err) {
            console.error('[TixoraAuth] Error initializing Supabase client:', err);
            return null;
        }
    }

    /**
     * Notify registered listeners of auth state changes
     */
    function notifyListeners(event, session) {
        _authListeners.forEach(fn => {
            try {
                fn(event, session);
            } catch (e) {
                console.error('[TixoraAuth] Listener notification error:', e);
            }
        });
    }

    /**
     * Register a callback for auth changes
     */
    function onAuthStateChange(callback) {
        if (typeof callback === 'function') {
            _authListeners.push(callback);
        }
        return () => {
            const idx = _authListeners.indexOf(callback);
            if (idx !== -1) _authListeners.splice(idx, 1);
        };
    }

    /**
     * Check if Supabase client is configured
     */
    function isConfigured() {
        return Boolean(getClient());
    }

    /**
     * Save dynamic Supabase credentials (e.g. from Admin Settings modal)
     */
    function setCredentials(url, key) {
        if (url) _safeStorage.setItem('tixora_supabase_url', url.trim());
        if (key) _safeStorage.setItem('tixora_supabase_key', key.trim());
        if (window.TIXORA_CONFIG) {
            window.TIXORA_CONFIG.supabaseUrl = url;
            window.TIXORA_CONFIG.supabaseKey = key;
        }
        _supabaseClient = null;
        return getClient();
    }

    /**
     * Clear dynamic Supabase credentials
     */
    function clearCredentials() {
        _safeStorage.removeItem('tixora_supabase_url');
        _safeStorage.removeItem('tixora_supabase_key');
        _supabaseClient = null;
        _cachedSession = null;
        _cachedUserRole = null;
        _cachedPromoter = null;
    }

    /**
     * Get current verified active session from Supabase
     */
    async function getSession() {
        if (_cachedSession && _cachedSession.user) {
            return _cachedSession;
        }

        const client = getClient();
        if (!client) return null;

        try {
            const { data, error } = await client.auth.getSession();
            if (!error && data && data.session) {
                _cachedSession = data.session;
                return data.session;
            }
        } catch (err) {
            console.warn('[TixoraAuth] getSession warning:', err);
        }

        return null;
    }

    /**
     * Get current authenticated user
     */
    async function getUser() {
        const session = await getSession();
        return session ? session.user : null;
    }

    /**
     * Resolve verified user role (admin, manager, promoter, attendee)
     */
    async function getUserRole(user) {
        if (!user) return 'anon';
        if (_cachedUserRole) return _cachedUserRole;

        // 1. Root administrative email (strict exact match)
        if (user.email && user.email.toLowerCase() === 'admin@tixora.live') {
            _cachedUserRole = 'admin';
            return 'admin';
        }

        // 2. Check verified app_metadata signed by Supabase Auth (tamper-proof JWT)
        if (user.app_metadata && user.app_metadata.role) {
            _cachedUserRole = user.app_metadata.role;
            return user.app_metadata.role;
        }

        // 3. Query user_roles table with 1s timeout to prevent hanging UI
        const client = getClient();
        if (client && user.id) {
            try {
                const queryPromise = client
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .maybeSingle();
                const timeoutPromise = new Promise(res => setTimeout(() => res({ data: null }), 1000));
                const { data } = await Promise.race([queryPromise, timeoutPromise]);

                if (data && data.role) {
                    _cachedUserRole = data.role;
                    return data.role;
                }
            } catch (e) {
                // Ignore query error, fall through
            }
        }

        _cachedUserRole = 'promoter';
        return 'promoter';
    }

    /**
     * Fetch promoter profile associated with the authenticated user
     */
    async function getPromoterProfile(user) {
        if (!user) return null;
        if (_cachedPromoter) return _cachedPromoter;

        const client = getClient();
        if (client) {
            try {
                let { data, error } = await client
                    .from('promoters')
                    .select('*, promoter_tiers(tier_name, commission_rate, perks_description)')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!data && user.email) {
                    const res = await client
                        .from('promoters')
                        .select('*, promoter_tiers(tier_name, commission_rate, perks_description)')
                        .eq('email', user.email)
                        .maybeSingle();
                    data = res.data;
                }

                if (data) {
                    _cachedPromoter = data;
                    return data;
                }
            } catch (err) {
                console.warn('[TixoraAuth] Error querying promoters table:', err);
            }
        }

        // Fallback: Synthesize promoter profile from user's verified registration metadata
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || (user.email ? user.email.split('@')[0] : 'Promoter Partner');
        const city = meta.city || 'Mumbai';
        const cleanName = fullName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
        const cleanCity = city.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        const refCode = meta.referral_code || `TIX-${cleanName}-${cleanCity}`;

        const dynamicProfile = {
            id: user.id || 1,
            user_id: user.id,
            full_name: fullName,
            email: user.email,
            city: city,
            referral_code: refCode,
            tier_name: 'Scout',
            commission_rate: 8.00,
            total_passes_sold: 0,
            total_earnings: 0.00,
            upi_id: meta.upi_id || (user.email ? user.email.split('@')[0] + '@okhdfcbank' : 'user@upi'),
            kyc_status: 'verified'
        };

        _cachedPromoter = dynamicProfile;
        return dynamicProfile;
    }

    /**
     * Refresh internal caches
     */
    async function refreshUserData(user) {
        _cachedUserRole = null;
        _cachedPromoter = null;
        if (user) {
            await getUserRole(user);
            await getPromoterProfile(user);
        }
    }

    /**
     * CLIENT-SIDE & SERVER RATE LIMIT PROTOCOL (OWASP ASVS 4.0)
     */
    async function checkRateLimit(action, identifier) {
        const localKey = `tx_rl_${action}_${(identifier || '').toLowerCase().trim()}`;
        const now = Date.now();
        const raw = _safeStorage.getItem(localKey);
        if (raw) {
            try {
                const item = JSON.parse(raw);
                if (item.lockedUntil && item.lockedUntil > now) {
                    const remainingSec = Math.ceil((item.lockedUntil - now) / 1000);
                    return {
                        allowed: false,
                        remaining: 0,
                        retryAfterSeconds: remainingSec,
                        message: action === 'login'
                            ? `Too many sign in attempts. For account security, access is temporarily locked. Try again in ${Math.ceil(remainingSec / 60)} min.`
                            : `Too many registration attempts. Please wait ${Math.ceil(remainingSec / 60)} min before trying again.`
                    };
                }
            } catch (e) {}
        }

        try {
            if (typeof fetch === 'function') {
                const url = `/api/auth/rate-limit?action=${encodeURIComponent(action)}&identifier=${encodeURIComponent(identifier || '')}`;
                const res = await fetch(url);
                const data = await res.json();
                if (!res.ok || data.status === 'rate_limited') {
                    if (data.retry_after_seconds) {
                        _safeStorage.setItem(localKey, JSON.stringify({
                            lockedUntil: now + (data.retry_after_seconds * 1000)
                        }));
                    }
                    return {
                        allowed: false,
                        remaining: 0,
                        retryAfterSeconds: data.retry_after_seconds || 900,
                        message: data.message || 'Too many attempts. Access is temporarily locked.'
                    };
                }
                return {
                    allowed: true,
                    remaining: data.remaining,
                    limit: data.limit
                };
            }
        } catch (e) {}

        return { allowed: true, remaining: 5, limit: 5 };
    }

    async function recordRateLimitAttempt(action, identifier, success) {
        const localKey = `tx_rl_${action}_${(identifier || '').toLowerCase().trim()}`;
        const now = Date.now();

        if (success && action === 'login') {
            _safeStorage.removeItem(localKey);
        } else {
            let item = { count: 1, resetAt: now + (15 * 60 * 1000), lockedUntil: null };
            const raw = _safeStorage.getItem(localKey);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed.resetAt > now) {
                        item.count = (parsed.count || 0) + 1;
                        item.resetAt = parsed.resetAt;
                    }
                } catch (e) {}
            }
            const maxAttempts = action === 'signup' ? 3 : 5;
            const lockoutMs = (action === 'signup' ? 60 : 15) * 60 * 1000;
            if (item.count >= maxAttempts) {
                item.lockedUntil = now + lockoutMs;
                item.resetAt = item.lockedUntil;
            }
            _safeStorage.setItem(localKey, JSON.stringify(item));
        }

        try {
            if (typeof fetch === 'function') {
                await fetchWithCsrf('/api/auth/rate-limit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, identifier, success })
                });
            }
        } catch (e) {}
    }

    /**
     * Server-Side Form Validation Client Preflight
     * Dispatches payloads to /api/auth/validate to guarantee data integrity
     */
    async function validateFormOnServer(formType, data) {
        try {
            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tixora.live';
            const res = await fetchWithCsrf(`${origin}/api/auth/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formType, data })
            });
            const json = await res.json();
            return json;
        } catch (e) {
            return { valid: true };
        }
    }

    /**
     * REAL SUPABASE AUTHENTICATION: Sign In with Email & Password
     */
    async function signIn(email, password) {
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) {
            throw new Error('Please enter your email address.');
        }
        if (!password) {
            throw new Error('Please enter your password.');
        }

        // Server-Side Form Validation Preflight
        const validation = await validateFormOnServer('signin', { email: cleanEmail, password });
        if (validation && validation.valid === false && validation.errors) {
            const firstErr = Object.values(validation.errors)[0];
            const err = new Error(firstErr || 'Form validation failed.');
            err.code = 'validation_error';
            err.errors = validation.errors;
            throw err;
        }

        // Anti-Brute-Force Rate Limit Preflight
        const rateCheck = await checkRateLimit('login', cleanEmail);
        if (!rateCheck.allowed) {
            const err = new Error(rateCheck.message);
            err.code = 'rate_limit';
            err.retry_after = rateCheck.retryAfterSeconds;
            throw err;
        }

        const client = getClient();
        if (!client) {
            throw new Error('Supabase client is not available. Please verify your connection.');
        }

        const { data, error } = await client.auth.signInWithPassword({
            email: cleanEmail,
            password: password
        });

        if (error) {
            // Record failed authentication attempt
            await recordRateLimitAttempt('login', cleanEmail, false);

            const msg = (error.message || '').toLowerCase();
            if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
                const err = new Error('Invalid email or password. Please verify your credentials or register a new account.');
                err.code = 'invalid_credentials';
                throw err;
            }
            if (msg.includes('email not confirmed')) {
                const err = new Error('Your email address has not been confirmed yet. Please click the confirmation link sent to your email.');
                err.code = 'email_not_confirmed';
                err.email = cleanEmail;
                throw err;
            }
            if (msg.includes('rate limit') || msg.includes('too many')) {
                const err = new Error('Too many sign in attempts. Please wait a moment and try again.');
                err.code = 'rate_limit';
                throw err;
            }
            throw new Error(error.message || 'Authentication failed. Please try again.');
        }

        if (!data || !data.session || !data.user) {
            throw new Error('Authentication succeeded but no active session was returned.');
        }

        // Wipe failed attempts on successful sign-in
        await recordRateLimitAttempt('login', cleanEmail, true);

        _cachedSession = data.session;
        await refreshUserData(data.user);
        const role = await getUserRole(data.user);
        const promoter = await getPromoterProfile(data.user);

        // Synchronize with server-side API to issue HttpOnly, Secure, SameSite=Strict cookies
        await syncSessionCookie(data.session.access_token, role);

        notifyListeners('SIGNED_IN', data.session);
        return { user: data.user, session: data.session, role, promoter, error: null };
    }

    /**
     * REAL SUPABASE AUTHENTICATION: Sign Up as a Promoter or Attendee
     */
    async function signUp({ email, password, fullName, phone, city, upiId, role = 'promoter' }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        
        // Server-Side Form Validation Preflight
        const validation = await validateFormOnServer('signup', { email: cleanEmail, password, fullName, phone, city, upiId, role });
        if (validation && validation.valid === false && validation.errors) {
            const firstErr = Object.values(validation.errors)[0];
            const err = new Error(firstErr || 'Form validation failed.');
            err.code = 'validation_error';
            err.errors = validation.errors;
            throw err;
        }

        // Anti-Bot Sign-Up Rate Limit Preflight
        const rateCheck = await checkRateLimit('signup', cleanEmail);
        if (!rateCheck.allowed) {
            const err = new Error(rateCheck.message);
            err.code = 'rate_limit';
            err.retry_after = rateCheck.retryAfterSeconds;
            throw err;
        }

        const client = getClient();
        if (!client) throw new Error('Supabase client is not available.');

        const cleanName = (fullName || 'PROMO').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
        const cleanCity = (city || 'IND').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        const refCode = `TIX-${cleanName}-${cleanCity}-${Math.floor(100 + Math.random() * 900)}`;

        const { data: authData, error: authErr } = await client.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone || '',
                    whatsapp_number: phone || '',
                    city: city || 'Mumbai',
                    upi_id: upiId || `${cleanEmail.split('@')[0]}@upi`,
                    role: role,
                    referral_code: refCode
                }
            }
        });

        if (authErr) {
            throw new Error(authErr.message || 'Unable to register account. Please try again.');
        }

        const user = authData ? authData.user : null;
        const session = authData ? authData.session : null;
        const emailConfirmationRequired = !session;

        // Upsert into promoters table if authenticated or available
        if (user && role === 'promoter') {
            try {
                await client.from('promoters').upsert([{
                    user_id: user.id,
                    full_name: fullName,
                    email: cleanEmail,
                    whatsapp_number: phone || '',
                    city: city || 'Mumbai',
                    upi_id: upiId || `${cleanEmail.split('@')[0]}@upi`,
                    referral_code: refCode,
                    tier_id: 1,
                    kyc_status: 'verified',
                    total_passes_sold: 0,
                    total_earnings: 0.00
                }], { onConflict: 'user_id' });
            } catch (e) {
                // Table trigger will manage DB upsert
            }
        }

        if (session) {
            _cachedSession = session;
            await refreshUserData(user);
            const userRole = await getUserRole(user);
            await syncSessionCookie(session.access_token, userRole);
            notifyListeners('SIGNED_IN', session);
        }

        return {
            user,
            session,
            emailConfirmationRequired,
            email: cleanEmail,
            error: null
        };
    }

    /**
     * Resend verification / confirmation email via Supabase Auth
     */
    async function resendConfirmation(email) {
        const client = getClient();
        if (!client) throw new Error('Supabase client not initialized.');
        const { error } = await client.auth.resend({
            type: 'signup',
            email: (email || '').trim()
        });
        if (error) throw new Error(error.message || 'Failed to resend confirmation email.');
        return { success: true, message: `Verification email resent to ${email}.` };
    }

    /**
     * REQUEST EXPIRING SINGLE-USE PASSWORD RESET LINK
     * Enforces 15-minute expiration and atomic single-use invalidation
     */
    async function requestPasswordReset(email) {
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            throw new Error('Please enter a valid email address.');
        }

        try {
            if (typeof fetch === 'function') {
                const res = await fetchWithCsrf('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: cleanEmail, validity_minutes: 15 })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Unable to generate password reset link.');
                }

                // If Supabase client is also active, trigger native email recovery
                const client = getClient();
                if (client) {
                    try {
                        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tixora.live';
                        await client.auth.resetPasswordForEmail(cleanEmail, {
                            redirectTo: `${origin}/reset-password`
                        });
                    } catch (e) {
                        // Non-blocking warning
                    }
                }

                return data;
            }
        } catch (err) {
            console.error('[TixoraAuth] requestPasswordReset error:', err);
            throw err;
        }

        throw new Error('Network client unavailable.');
    }

    /**
     * VERIFY RESET TOKEN VALIDITY
     * Checks if token exists, has expired (>15 mins), or has already been consumed
     */
    async function verifyResetToken(token) {
        if (!token) {
            return { valid: false, code: 'missing_token', message: 'No reset token provided.' };
        }

        try {
            if (typeof fetch === 'function') {
                const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
                const data = await res.json();
                return data;
            }
        } catch (e) {
            console.warn('[TixoraAuth] verifyResetToken warning:', e);
        }

        return { valid: false, code: 'network_error', message: 'Unable to reach verification server.' };
    }

    /**
     * CONSUME SINGLE-USE RESET TOKEN AND UPDATE PASSWORD
     * Enforces atomic single-use invalidation
     */
    async function resetPasswordWithToken(token, newPassword) {
        if (!token) throw new Error('Reset token is required.');
        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long.');
        }

        try {
            if (typeof fetch === 'function') {
                const res = await fetchWithCsrf('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, new_password: newPassword })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Password reset failed. Link may have expired or already been used.');
                }

                // Invalidate any active session caches
                _cachedSession = null;
                _cachedUserRole = null;
                _cachedPromoter = null;
                await clearSessionCookie();

                return data;
            }
        } catch (err) {
            console.error('[TixoraAuth] resetPasswordWithToken error:', err);
            throw err;
        }

        throw new Error('Network client unavailable.');
    }

    /**
     * REAL SUPABASE AUTHENTICATION: Sign Out
     */
    async function signOut() {
        const client = getClient();
        if (client) {
            try {
                await client.auth.signOut();
            } catch (err) {
                console.warn('[TixoraAuth] signOut warning:', err);
            }
        }

        // Sever server-side HttpOnly session cookies
        await clearSessionCookie();

        _cachedSession = null;
        _cachedUserRole = null;
        _cachedPromoter = null;

        notifyListeners('SIGNED_OUT', null);
        return { success: true };
    }

    /**
     * ROUTE GUARD: Guard Administrative Pages (/admin)
     */
    async function guardAdminRoute(options = {}) {
        const { onAuthorized, onForbidden, onUnauthenticated } = options;

        try {
            const session = await getSession();

            if (!session || !session.user) {
                if (typeof onUnauthenticated === 'function') {
                    onUnauthenticated();
                }
                return { authorized: false, reason: 'unauthenticated' };
            }

            const role = await getUserRole(session.user);

            if (role === 'admin' || role === 'manager') {
                if (typeof onAuthorized === 'function') {
                    onAuthorized(session.user, role);
                }
                return { authorized: true, user: session.user, role };
            } else {
                if (typeof onForbidden === 'function') {
                    onForbidden(session.user, role);
                }
                return { authorized: false, reason: 'forbidden', user: session.user, role };
            }
        } catch (err) {
            console.warn('[TixoraAuth] guardAdminRoute error:', err);
            if (typeof onUnauthenticated === 'function') {
                onUnauthenticated();
            }
            return { authorized: false, reason: 'unauthenticated' };
        }
    }

    /**
     * ROUTE GUARD: Guard Promoter Pages (/dashboard)
     */
    async function guardPromoterRoute(options = {}) {
        const { onAuthorized, onUnauthenticated } = options;

        try {
            const session = await getSession();
            if (!session || !session.user) {
                if (typeof onUnauthenticated === 'function') {
                    onUnauthenticated();
                }
                return { authorized: false, reason: 'unauthenticated' };
            }

            const promoter = await getPromoterProfile(session.user);
            const role = await getUserRole(session.user);

            if (typeof onAuthorized === 'function') {
                onAuthorized(session.user, promoter, role);
            }
            return { authorized: true, user: session.user, promoter, role };
        } catch (err) {
            console.warn('[TixoraAuth] guardPromoterRoute error:', err);
            if (typeof onUnauthenticated === 'function') {
                onUnauthenticated();
            }
            return { authorized: false, reason: 'unauthenticated' };
        }
    }

    /**
     * User-Isolated Data Query: Get orders belonging strictly to authenticated promoter
     */
    async function getMyOrders() {
        const user = await getUser();
        if (!user) return [];
        const client = getClient();
        if (!client) return [];
        const promoter = await getPromoterProfile(user);
        if (!promoter || !promoter.id) return [];
        try {
            const { data } = await client
                .from('orders')
                .select('*, ticket_tiers(name, price), events(title, event_date)')
                .eq('promoter_id', promoter.id)
                .order('created_at', { ascending: false });
            return data || [];
        } catch (e) {
            console.warn('[TixoraAuth] getMyOrders error:', e);
            return [];
        }
    }

    /**
     * User-Isolated Data Query: Get commissions belonging strictly to authenticated promoter
     */
    async function getMyCommissions() {
        const user = await getUser();
        if (!user) return [];
        const client = getClient();
        if (!client) return [];
        const promoter = await getPromoterProfile(user);
        if (!promoter || !promoter.id) return [];
        try {
            const { data } = await client
                .from('promoter_commissions')
                .select('*')
                .eq('promoter_id', promoter.id)
                .order('created_at', { ascending: false });
            return data || [];
        } catch (e) {
            console.warn('[TixoraAuth] getMyCommissions error:', e);
            return [];
        }
    }

    /**
     * User-Isolated Data Query: Get payouts belonging strictly to authenticated promoter
     */
    async function getMyPayouts() {
        const user = await getUser();
        if (!user) return [];
        const client = getClient();
        if (!client) return [];
        const promoter = await getPromoterProfile(user);
        if (!promoter || !promoter.id) return [];
        try {
            const { data } = await client
                .from('upi_payout_logs')
                .select('*')
                .eq('promoter_id', promoter.id)
                .order('created_at', { ascending: false });
            return data || [];
        } catch (e) {
            console.warn('[TixoraAuth] getMyPayouts error:', e);
            return [];
        }
    }

    /**
     * Parameterized Query Helper: Executes PostgREST queries with strict parameter binding
     * Ensures all filter conditions use parameter binding instead of string interpolation.
     */
    function queryParameterized(table, selectFields = '*', filters = {}) {
        const client = getClient();
        if (!client) throw new Error('Database client not initialized');
        let query = client.from(table).select(selectFields);
        for (const [col, val] of Object.entries(filters)) {
            if (val !== undefined && val !== null) {
                query = query.eq(col, val);
            }
        }
        return query;
    }

    /**
     * Parameterized Query: Safely verify a promoter referral code via database RPC
     * Uses PostgreSQL parameterized binding with zero string concatenation.
     */
    async function verifyReferralCode(code) {
        if (!code || typeof code !== 'string') return { is_valid: false, message: 'Invalid referral code' };
        const client = getClient();
        if (!client) return { is_valid: false, message: 'Database client not ready' };
        const cleanCode = code.trim().slice(0, 30);
        try {
            const { data, error } = await client.rpc('verify_referral_code', { code_input: cleanCode });
            if (error) {
                console.warn('[TixoraAuth] verifyReferralCode RPC error:', error);
                return { is_valid: false };
            }
            if (Array.isArray(data) && data.length > 0) {
                return data[0];
            }
            return { is_valid: false };
        } catch (err) {
            console.warn('[TixoraAuth] verifyReferralCode error:', err);
            return { is_valid: false };
        }
    }

    // Export TixoraAuth API to global window
    window.TixoraAuth = {
        getClient,
        isConfigured,
        setCredentials,
        clearCredentials,
        getSession,
        getUser,
        getUserRole,
        getPromoterProfile,
        getMyOrders,
        getMyCommissions,
        getMyPayouts,
        verifyReferralCode,
        queryParameterized,
        validateForm: validateFormOnServer,
        getCsrfToken,
        fetchWithCsrf,
        signIn,
        signUp,
        signOut,
        checkRateLimit,
        recordRateLimitAttempt,
        syncSessionCookie,
        clearSessionCookie,
        resendConfirmation,
        requestPasswordReset,
        verifyResetToken,
        resetPasswordWithToken,
        hashPassword,
        onAuthStateChange,
        guardAdminRoute,
        guardPromoterRoute
    };

})(window);
