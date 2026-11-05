/**
 * TIXORA SUPABASE CONFIGURATION
 * Shared credentials across Fan Site (index.html) and Operations Desk (admin.html)
 */

(function (window) {
    'use strict';

    // Official Supabase credentials for Tixora Project
    const DEFAULT_URL = 'https://hgzcdzlfwweesdljeqdv.supabase.co';
    const DEFAULT_KEY = 'sb_publishable_CyGJeojb0by0XRENmjOlAg_bbjW_Wck';

    // Auto-update to latest live project credentials
    const currentUrl = localStorage.getItem('tixora_supabase_url');
    if (!currentUrl || !currentUrl.includes('hgzcdzlfwweesdljeqdv')) {
        localStorage.setItem('tixora_supabase_url', DEFAULT_URL);
        localStorage.setItem('tixora_supabase_key', DEFAULT_KEY);
    }

    window.TIXORA_CONFIG = {
        supabaseUrl: localStorage.getItem('tixora_supabase_url') || DEFAULT_URL,
        supabaseKey: localStorage.getItem('tixora_supabase_key') || DEFAULT_KEY
    };
})(window);
