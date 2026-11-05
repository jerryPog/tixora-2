/**
 * TIXORA SUPABASE CONFIGURATION
 * Shared credentials across Fan Site (index.html) and Operations Desk (admin.html)
 */

(function (window) {
    'use strict';

    // Official Supabase credentials for new Tixora Project
    const DEFAULT_URL = 'https://hgzcdzlfwweesdljeqdv.supabase.co';
    const DEFAULT_KEY = 'sb_publishable_CyGJeojb0by0XRENmjOlAg_bbjW_Wck';

    // Force update localStorage to the new project credentials (clearing any old deleted project)
    try {
        localStorage.setItem('tixora_supabase_url', DEFAULT_URL);
        localStorage.setItem('tixora_supabase_key', DEFAULT_KEY);
    } catch (e) {}

    window.TIXORA_CONFIG = {
        supabaseUrl: DEFAULT_URL,
        supabaseKey: DEFAULT_KEY
    };
})(window);
