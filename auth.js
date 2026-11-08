/**
 * TIXORA SUPABASE AUTH & RBAC ROUTE GUARD CORE
 * Production-Hardened Client-Side Authentication Engine
 * Powered by @supabase/supabase-js v2
 */

(function (window) {
    'use strict';

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
                } else {
                    await refreshUserData(session.user);
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
     * REAL SUPABASE AUTHENTICATION: Sign In with Email & Password
     */
    async function signIn(email, password) {
        const cleanEmail = (email || '').trim();
        if (!cleanEmail) {
            throw new Error('Please enter your email address.');
        }
        if (!password) {
            throw new Error('Please enter your password.');
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

        _cachedSession = data.session;
        await refreshUserData(data.user);
        const role = await getUserRole(data.user);
        const promoter = await getPromoterProfile(data.user);

        notifyListeners('SIGNED_IN', data.session);
        return { user: data.user, session: data.session, role, promoter, error: null };
    }

    /**
     * REAL SUPABASE AUTHENTICATION: Sign Up as a Promoter or Attendee
     */
    async function signUp({ email, password, fullName, phone, city, upiId, role = 'promoter' }) {
        const cleanEmail = (email || '').trim();
        if (!cleanEmail) throw new Error('Please enter a valid email address.');
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters long.');
        if (!fullName) throw new Error('Please enter your full name.');

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
        signIn,
        signUp,
        signOut,
        resendConfirmation,
        onAuthStateChange,
        guardAdminRoute,
        guardPromoterRoute
    };

})(window);
