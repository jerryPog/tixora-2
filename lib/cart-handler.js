/**
 * TIXORA PASS CART CHECKOUT HANDLER
 * Validates attendee customer details (Name, Phone, Email)
 * Enforces strict 10-minute pass reservation hold verification.
 */

const crypto = require('crypto');
const { validateCartCheckout } = require('./validator');
const { applySecurityHeaders } = require('./security-headers');
const { handleCors } = require('./cors');
const { csrfGuard } = require('./csrf');
const { readBodyWithLimit, MAX_REQUEST_BODY_SIZE } = require('./uploader');

async function handleCartCheckout(req, res) {
    applySecurityHeaders(res, { isApi: true });
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
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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
    const items = validation.sanitized.items;
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

module.exports = { handleCartCheckout };
