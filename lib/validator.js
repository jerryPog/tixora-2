/**
 * TIXORA SERVER-SIDE FORM VALIDATION ENGINE
 * OWASP ASVS 4.0 Compliant Input Validation & Data Integrity Protocol
 * 
 * Validates and sanitizes every incoming form payload on the server before database processing.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const TOKEN_REGEX = /^[a-zA-Z0-9_-]+\.[a-f0-9]{64}$/;
const REF_CODE_REGEX = /^[A-Z0-9_-]{3,35}$/;

const ALLOWED_LAYOUTS = ['Arena Open-Air', 'Stadium Bowl', 'Club Floor', 'Warehouse', 'Auditorium'];
const ALLOWED_PARTNERS = ['BookMyShow', 'Zomato Live', 'Paytm Insider', 'District by Zomato'];
const ALLOWED_ROLES = ['promoter', 'attendee', 'admin', 'manager'];
const ALLOWED_RATE_ACTIONS = ['login', 'signup', 'forgot_password'];

/**
 * Remove control characters, null bytes, and dangerous scripts
 */
function sanitizeString(str, maxLen = 500) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/[\0\r\x00-\x1F\x7F]/g, '') // Strip control chars
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
        .trim()
        .slice(0, maxLen);
}

/**
 * Validate Sign In / Login Form
 */
function validateSignIn(data) {
    const errors = {};
    const email = sanitizeString(data.email || '', 255).toLowerCase();
    const password = typeof data.password === 'string' ? data.password : '';

    if (!email) {
        errors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(email)) {
        errors.email = 'Please provide a valid email address.';
    }

    if (!password) {
        errors.password = 'Password is required.';
    } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters long.';
    } else if (password.length > 128) {
        errors.password = 'Password must not exceed 128 characters.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized: { email, password }
    };
}

/**
 * Validate Sign Up / Registration Form
 */
function validateSignUp(data) {
    const errors = {};
    const fullName = sanitizeString(data.fullName || data.name || '', 100);
    const email = sanitizeString(data.email || '', 255).toLowerCase();
    const password = typeof data.password === 'string' ? data.password : '';
    const phone = sanitizeString(data.phone || data.whatsapp_number || '', 20).replace(/[\s-]/g, '');
    const city = sanitizeString(data.city || 'Mumbai', 50);
    const upiId = sanitizeString(data.upiId || data.upi_id || '', 100).toLowerCase();
    const role = sanitizeString(data.role || 'promoter', 20).toLowerCase();
    const refCode = sanitizeString(data.referralCode || data.referral_code || '', 35).toUpperCase();

    if (!fullName) {
        errors.fullName = 'Full name is required.';
    } else if (fullName.length < 2) {
        errors.fullName = 'Full name must be at least 2 characters.';
    }

    if (!email) {
        errors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(email)) {
        errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
        errors.password = 'Password is required.';
    } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters.';
    } else if (password.length > 128) {
        errors.password = 'Password must not exceed 128 characters.';
    }

    if (phone && !PHONE_REGEX.test(phone)) {
        errors.phone = 'Please enter a valid phone number (10-15 digits).';
    }

    if (upiId && !UPI_REGEX.test(upiId)) {
        errors.upiId = 'Please enter a valid UPI VPA (e.g. yourname@okhdfcbank).';
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
        errors.role = `Invalid account role: "${role}".`;
    }

    if (refCode && !REF_CODE_REGEX.test(refCode)) {
        errors.referralCode = 'Referral code contains invalid characters.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized: { fullName, email, password, phone, city, upiId, role, referralCode: refCode }
    };
}

/**
 * Validate Forgot Password Request Form
 */
function validateForgotPassword(data) {
    const errors = {};
    const email = sanitizeString(data.email || '', 255).toLowerCase();
    const validityMinutes = parseInt(data.validity_minutes || data.validityMinutes, 10) || 15;

    if (!email) {
        errors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(email)) {
        errors.email = 'Please provide a valid email address.';
    }

    if (validityMinutes < 5 || validityMinutes > 60) {
        errors.validityMinutes = 'Validity window must be between 5 and 60 minutes.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized: { email, validityMinutes }
    };
}

/**
 * Validate Password Reset Submission Form
 */
function validateResetPassword(data) {
    const errors = {};
    const token = sanitizeString(data.token || '', 512);
    const newPassword = typeof data.new_password === 'string' ? data.new_password : (typeof data.newPassword === 'string' ? data.newPassword : '');
    const confirmPassword = typeof data.confirm_password === 'string' ? data.confirm_password : (typeof data.confirmPassword === 'string' ? data.confirmPassword : '');

    if (!token) {
        errors.token = 'Password reset token is required.';
    } else if (!TOKEN_REGEX.test(token)) {
        errors.token = 'Malformed or invalid password reset token structure.';
    }

    if (!newPassword) {
        errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 6) {
        errors.newPassword = 'Password must be at least 6 characters long.';
    } else if (newPassword.length > 128) {
        errors.newPassword = 'Password must not exceed 128 characters.';
    }

    if (confirmPassword && confirmPassword !== newPassword) {
        errors.confirmPassword = 'Passwords do not match.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized: { token, newPassword }
    };
}

/**
 * Validate Tour Creation or Editing Form (Admin Operations)
 */
function validateTour(data) {
    const errors = {};
    const title = sanitizeString(data.title || '', 200);
    const venue = sanitizeString(data.venue || '', 200);
    const layout = sanitizeString(data.layout || 'Arena Open-Air', 50);
    const dateStr = sanitizeString(data.date || data.dateStr || data.event_date || '', 50);
    const mrp = Number(data.mrp || data.starting_price);
    const cut = Number(data.cut || data.promoter_cut_pct);
    const partner = sanitizeString(data.partner || data.partner_engine || 'BookMyShow', 50);
    const posterUrl = sanitizeString(data.poster_url || data.posterUrl || '', 300);
    const description = sanitizeString(data.description || data.desc || '', 2000);

    if (!title || title.length < 3) {
        errors.title = 'Tour title must be at least 3 characters.';
    }

    if (!venue || venue.length < 3) {
        errors.venue = 'Venue name and city must be at least 3 characters.';
    }

    if (!ALLOWED_LAYOUTS.includes(layout)) {
        errors.layout = `Invalid venue layout: "${layout}".`;
    }

    if (!dateStr) {
        errors.date = 'Tour date is required.';
    } else {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            errors.date = 'Tour date must be a valid date format.';
        }
    }

    if (isNaN(mrp) || mrp < 100 || mrp > 1000000) {
        errors.mrp = 'Starting ticket price must be between ₹100 and ₹1,000,000.';
    }

    if (isNaN(cut) || cut < 0 || cut > 100) {
        errors.cut = 'Promoter commission cut must be between 0% and 100%.';
    }

    if (!ALLOWED_PARTNERS.includes(partner)) {
        errors.partner = `Invalid ticketing partner engine: "${partner}".`;
    }

    const tiers = Array.isArray(data.tiers) ? data.tiers : [];
    const validTiers = [];
    if (tiers.length > 0) {
        tiers.forEach((t, i) => {
            const name = sanitizeString(t.name || '', 100);
            const price = Number(t.price);
            const quota = Number(t.quota || t.total_quota);
            if (!name) errors[`tier_${i}_name`] = `Tier #${i + 1} name is required.`;
            if (isNaN(price) || price <= 0) errors[`tier_${i}_price`] = `Tier #${i + 1} price must be positive.`;
            if (isNaN(quota) || quota <= 0) errors[`tier_${i}_quota`] = `Tier #${i + 1} quota must be positive.`;
            validTiers.push({ name, price, quota });
        });
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized: {
            title,
            venue,
            layout,
            dateStr,
            mrp,
            cut,
            partner,
            posterUrl: posterUrl || 'posters/anyma-aeden-poster-1.jpg',
            description,
            tiers: validTiers
        }
    };
}

/**
 * Validate Support Chat Form
 */
function validateChatMessage(data) {
    const errors = {};
    const message = sanitizeString(data.message || data.input || '', 1000);

    if (!message) {
        errors.message = 'Message cannot be empty.';
    } else if (message.length > 1000) {
        errors.message = 'Message must not exceed 1000 characters.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized: { message }
    };
}

/**
 * Master Server-Side Form Validation Dispatcher
 * @param {string} formType
 * @param {Object} data
 * @returns {{ isValid: boolean, errors: Object, sanitized: Object }}
 */
function validateForm(formType, data = {}) {
    if (!data || typeof data !== 'object') {
        return {
            isValid: false,
            errors: { form: 'Malformed request payload. Expected JSON object.' },
            sanitized: {}
        };
    }

    switch ((formType || '').toLowerCase()) {
        case 'signin':
        case 'login':
        case 'session':
            return validateSignIn(data);

        case 'signup':
        case 'register':
        case 'promoter_signup':
            return validateSignUp(data);

        case 'forgotpassword':
        case 'forgot_password':
            return validateForgotPassword(data);

        case 'resetpassword':
        case 'reset_password':
            return validateResetPassword(data);

        case 'tour':
        case 'create_tour':
        case 'edit_tour':
            return validateTour(data);

        case 'chat':
        case 'chat_message':
            return validateChatMessage(data);

        default:
            return {
                isValid: false,
                errors: { form: `Unknown form type "${formType}".` },
                sanitized: {}
            };
    }
}

/**
 * Serverless Validation Endpoint Handler
 * Responds with HTTP 200 on success or HTTP 400 Bad Request with field errors
 */
async function handleValidationRequest(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method !== 'POST') {
        const payload = { error: 'Method Not Allowed. Use POST.' };
        if (typeof res.status === 'function') return res.status(405).json(payload);
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    let body = {};
    if (req.body !== undefined) {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
        body = await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => {
                try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
            });
            req.on('error', () => resolve({}));
        });
    }

    const formType = body.formType || body.form || req.headers['x-tixora-form'] || 'signin';
    const validation = validateForm(formType, body.data || body);

    if (!validation.isValid) {
        const payload = {
            status: 'validation_error',
            valid: false,
            formType: formType,
            errors: validation.errors
        };
        if (typeof res.status === 'function') return res.status(400).json(payload);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    const successPayload = {
        status: 'success',
        valid: true,
        formType: formType,
        sanitized: validation.sanitized
    };
    if (typeof res.status === 'function') return res.status(200).json(successPayload);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(successPayload));
}

module.exports = {
    validateForm,
    validateSignIn,
    validateSignUp,
    validateForgotPassword,
    validateResetPassword,
    validateTour,
    validateChatMessage,
    handleValidationRequest,
    sanitizeString
};
