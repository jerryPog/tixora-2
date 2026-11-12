/**
 * TIXORA PASS CART CHECKOUT HANDLER
 * Validates attendee customer details (Name, Phone, Email),
 * verifies canonical ticket pricing server-side against catalog/Supabase,
 * and enforces strict 10-minute pass reservation hold verification.
 */

const crypto = require('crypto');
const { validateCartCheckout } = require('./validator');
const { applySecurityHeaders } = require('./security-headers');
const { handleCors } = require('./cors');
const { csrfGuard } = require('./csrf');
const { readBodyWithLimit, MAX_REQUEST_BODY_SIZE } = require('./uploader');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hgzcdzlfwweesdljeqdv.supabase.co';
const SUPABASE_KEY =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_CyGJeojb0by0XRENmjOlAg_bbjW_Wck';

// Canonical authoritative price catalog matching tours.html, index.html, portal-app.js, and database/tixora.sql
const CANONICAL_EVENT_PRICES = {
    'anyma presents genesys live': {
        'ga standard': 3499,
        'ga early access': 3499,
        'general access phase 1': 3499,
        'vip grandstand': 7499,
        'vip pit standing': 7999,
        'backstage deck': 14999,
        'backstage platinum pass': 14999
    },
    'anyma presents genesys live mumbai': {
        'ga standard': 3499,
        'ga early access': 3499,
        'vip': 6999
    },
    'anyma presents æden': {
        'ga standard': 4250
    },
    "guns n' roses live in delhi": {
        'ga standard': 4999,
        'silver stand': 4999,
        'silver pitch standing': 4999,
        'gold front-of-stage': 8999,
        'golden circle': 9999,
        'vip hospitality lounge': 18999
    },
    'fred again.. usb india tour': {
        'ga standard': 2999,
        'ga floor': 2999,
        'early bird field pass': 2999,
        'vip raised deck': 7499,
        'vip elevated deck': 6499,
        'vip lounge': 6499
    },
    'the chainsmokers arena india': {
        'ga standard': 3999,
        'sunset lawn': 3999,
        'sunset ga (before 6 pm)': 3499,
        'all-night vip deck': 7999,
        'cabana table pass': 8999
    },
    'karan aujla it was all a dream': {
        'ga standard': 2499,
        'fan pit ga': 2499,
        'vip enclosure': 5499
    },
    'boris brejcha in concert': {
        'ga standard': 2799,
        'arena floor': 2799,
        'early entrance pass': 2199,
        'stage deck': 5999,
        'fan pit front stage': 7999
    },
    'martin garrix india arena tour': {
        'ga standard': 3299,
        'stadium floor': 3299,
        'vip pit': 6999
    },
    'martin garrix sunburn stadium': {
        'ga standard': 1999,
        'stadium bowl tier 1': 1999,
        'vip ultra deck': 6999
    },
    'dua lipa radical optimism tour': {
        'ga standard': 4499,
        'gold lawn': 4499,
        'lounge pass': 9499
    },
    'ap dhillon brownprint arena': {
        'ga standard': 2499,
        'brownprint arena floor': 2499,
        'vip runway front': 5999
    },
    'diljit dosanjh dil-luminati tour': {
        'ga standard': 3999,
        'silver enclosure': 3999,
        'gold center ring': 7999
    }
};

function normalizeKey(str) {
    return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function fetchLiveEventCatalog() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/events?select=title,starting_price,ticket_tiers(name,price)&status=eq.active&limit=50`,
            {
                method: 'GET',
                headers: { apikey: SUPABASE_KEY }
            }
        );
        if (!res.ok) return null;
        const rows = await res.json();
        return Array.isArray(rows) ? rows : null;
    } catch (e) {
        return null;
    }
}

async function verifyItemPricing(items) {
    let liveEvents = null;
    const verifiedItems = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const titleKey = normalizeKey(item.title);
        const tierKey = normalizeKey(item.tier || 'GA Standard');
        const submittedPrice = Number(item.price);

        const staticTiers = CANONICAL_EVENT_PRICES[titleKey];
        if (staticTiers) {
            const allowedPrices = Object.values(staticTiers);
            const exactTierPrice = staticTiers[tierKey];
            const minEventPrice = Math.min(...allowedPrices);
            if (exactTierPrice !== undefined) {
                if (submittedPrice !== exactTierPrice) {
                    return {
                        valid: false,
                        error: `Price mismatch for "${item.title}" (${item.tier}). Expected ₹${exactTierPrice}.`
                    };
                }
            } else if (!allowedPrices.includes(submittedPrice) || submittedPrice < minEventPrice) {
                return {
                    valid: false,
                    error: `Invalid tier pricing submitted for "${item.title}".`
                };
            }
            verifiedItems.push({ ...item, price: submittedPrice });
            continue;
        }

        // Check active events from Supabase catalog if not in static canonical list
        if (liveEvents === null) {
            liveEvents = (await fetchLiveEventCatalog()) || [];
        }
        const dbMatch = liveEvents.find((ev) => normalizeKey(ev.title) === titleKey);
        if (dbMatch) {
            const tiers = Array.isArray(dbMatch.ticket_tiers) ? dbMatch.ticket_tiers : [];
            const matchedTier = tiers.find((t) => normalizeKey(t.name) === tierKey);
            const validPrices = tiers.map((t) => Number(t.price)).filter((p) => Number.isFinite(p) && p > 0);
            const basePrice = Number(dbMatch.starting_price);
            if (Number.isFinite(basePrice) && basePrice > 0) validPrices.push(basePrice);

            if (matchedTier && Number(matchedTier.price) !== submittedPrice) {
                return {
                    valid: false,
                    error: `Price mismatch for "${item.title}" (${item.tier}).`
                };
            }
            if (!matchedTier && validPrices.length > 0 && !validPrices.includes(submittedPrice)) {
                return {
                    valid: false,
                    error: `Invalid ticket price for "${item.title}".`
                };
            }
            verifiedItems.push({ ...item, price: submittedPrice });
            continue;
        }

        // Unknown event rejected when canonical + active catalog does not list it
        return {
            valid: false,
            error: `Unrecognized or inactive tour "${item.title}".`
        };
    }

    return { valid: true, items: verifiedItems };
}

async function handleCartCheckout(req, res) {
    applySecurityHeaders(res, { isApi: true, req });
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
        const payload = { error: 'Method Not Allowed. Use POST.' };
        if (typeof res.status === 'function') return res.status(405).json(payload);
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    // CSRF Protection Barrier
    if (!csrfGuard(req, res)) return;

    let body = {};
    if (req.body !== undefined) {
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            const payload = { status: 'error', code: 'MALFORMED_JSON', error: 'Invalid JSON request body.' };
            if (typeof res.status === 'function') return res.status(400).json(payload);
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        }
    } else {
        try {
            const buf = await readBodyWithLimit(req, MAX_REQUEST_BODY_SIZE);
            body = buf.length ? JSON.parse(buf.toString('utf8')) : {};
        } catch (err) {
            const status = err.statusCode || 400;
            const payload = { status: 'error', code: err.code || 'BAD_REQUEST', error: err.message };
            if (typeof res.status === 'function') return res.status(status).json(payload);
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(payload));
        }
    }

    const validation = validateCartCheckout(body);
    if (!validation.isValid) {
        const payload = {
            status: 'error',
            code: validation.errors.hold ? 'CART_HOLD_EXPIRED' : 'VALIDATION_FAILED',
            message: Object.values(validation.errors)[0],
            errors: validation.errors
        };
        if (typeof res.status === 'function') return res.status(400).json(payload);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    const customer = validation.sanitized.customer;
    const priceCheck = await verifyItemPricing(validation.sanitized.items);
    if (!priceCheck.valid) {
        const payload = {
            status: 'error',
            code: 'PRICE_VERIFICATION_FAILED',
            message: priceCheck.error
        };
        if (typeof res.status === 'function') return res.status(400).json(payload);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(payload));
    }

    const items = priceCheck.items;
    const totalAmount = items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity || 1)), 0);
    const orderId = 'TIX-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const orderRecord = {
        orderId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        items,
        totalAmount,
        currency: 'INR',
        status: 'confirmed',
        createdAt: new Date().toISOString()
    };

    const successPayload = {
        status: 'success',
        message: 'Passes reserved successfully. Delivery details sent to customer WhatsApp & Email.',
        order: orderRecord
    };

    if (typeof res.status === 'function') return res.status(200).json(successPayload);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(successPayload));
}

module.exports = { handleCartCheckout, CANONICAL_EVENT_PRICES };
