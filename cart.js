/**
 * TIXORA PASS CART & RESERVATION HOLD ENGINE
 * 
 * Simple, minimalist pass cart with customer details capture (Name, Phone, Email)
 * and strict 10-minute hold expiration protocol.
 */

(function () {
    const STORAGE_KEY = 'tixora_cart';
    const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

    let _timerInterval = null;

    // Load Cart from LocalStorage
    function loadCart() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { items: [], expiresAt: null, customer: {} };
            const parsed = JSON.parse(raw);
            
            // Check if cart has already expired
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                localStorage.removeItem(STORAGE_KEY);
                return { items: [], expiresAt: null, customer: {} };
            }
            return {
                items: Array.isArray(parsed.items) ? parsed.items : [],
                expiresAt: parsed.expiresAt || null,
                customer: parsed.customer || {}
            };
        } catch (e) {
            return { items: [], expiresAt: null, customer: {} };
        }
    }

    // Save Cart to LocalStorage
    function saveCart(cart) {
        try {
            if (!cart.items || cart.items.length === 0) {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
            }
        } catch (e) {}
        updateBadge();
    }

    // Update navbar badge count
    function updateBadge() {
        const cart = loadCart();
        const totalItems = cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const badges = document.querySelectorAll('.cart-badge-count, #navbar-cart-count');
        badges.forEach(badge => {
            if (badge) {
                badge.textContent = totalItems;
                if (totalItems > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        });
    }

    // Add Ticket Item to Cart
    function addItem(eventTitle, price, tier = 'GA Standard', image = '') {
        const cart = loadCart();
        
        // If cart was empty or expired, set fresh 10-minute hold expiration
        if (!cart.items.length || !cart.expiresAt || Date.now() > cart.expiresAt) {
            cart.expiresAt = Date.now() + HOLD_DURATION_MS;
        }

        const cleanPrice = Number(price) || 0;
        const itemId = `${eventTitle}__${tier}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');

        const existingIndex = cart.items.findIndex(i => i.id === itemId);
        if (existingIndex > -1) {
            cart.items[existingIndex].quantity = Math.min(10, (cart.items[existingIndex].quantity || 1) + 1);
        } else {
            cart.items.push({
                id: itemId,
                title: eventTitle,
                price: cleanPrice,
                tier: tier,
                image: image || 'posters/anyma-aeden-poster-1.webp',
                quantity: 1,
                addedAt: Date.now()
            });
        }

        saveCart(cart);
        startCountdownTimer();
        renderCartUI();
        openCart();
    }

    // Remove Item from Cart
    function removeItem(itemId) {
        const cart = loadCart();
        cart.items = cart.items.filter(i => i.id !== itemId);
        if (cart.items.length === 0) {
            cart.expiresAt = null;
            stopCountdownTimer();
        }
        saveCart(cart);
        renderCartUI();
    }

    // Update Item Quantity (-1 or +1)
    function updateQuantity(itemId, delta) {
        const cart = loadCart();
        const item = cart.items.find(i => i.id === itemId);
        if (!item) return;

        item.quantity = (item.quantity || 1) + delta;
        if (item.quantity <= 0) {
            return removeItem(itemId);
        }
        if (item.quantity > 10) item.quantity = 10;

        saveCart(cart);
        renderCartUI();
    }

    // Clear entire cart
    function clearCart(reason = '') {
        saveCart({ items: [], expiresAt: null, customer: {} });
        stopCountdownTimer();
        renderCartUI();
        if (reason) {
            showToast(reason);
        }
    }

    // 10-Minute Countdown Timer Handler
    function startCountdownTimer() {
        stopCountdownTimer();
        
        function tick() {
            const cart = loadCart();
            const timerEl = document.getElementById('cart-countdown-timer');
            const timerBanner = document.getElementById('cart-hold-banner');

            if (!cart.expiresAt || cart.items.length === 0) {
                if (timerBanner) timerBanner.classList.add('hidden');
                stopCountdownTimer();
                return;
            }

            const remainingMs = cart.expiresAt - Date.now();

            if (remainingMs <= 0) {
                // Cart Expired!
                stopCountdownTimer();
                clearCart('⚠️ Pass Reservation Expired: Your 10-minute hold has elapsed.');
                if (timerBanner) timerBanner.classList.add('hidden');
                const expiredNotice = document.getElementById('cart-expired-notice');
                if (expiredNotice) expiredNotice.classList.remove('hidden');
                return;
            }

            if (timerBanner) timerBanner.classList.remove('hidden');

            const totalSecs = Math.floor(remainingMs / 1000);
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (timerEl) {
                timerEl.textContent = formatted;
            }
        }

        tick();
        _timerInterval = setInterval(tick, 1000);
    }

    function stopCountdownTimer() {
        if (_timerInterval) {
            clearInterval(_timerInterval);
            _timerInterval = null;
        }
    }

    // Render Cart Modal UI
    function renderCartUI() {
        const cart = loadCart();
        const itemsContainer = document.getElementById('cart-items-container');
        const emptyState = document.getElementById('cart-empty-state');
        const formSection = document.getElementById('cart-checkout-section');
        const totalAmountEl = document.getElementById('cart-total-amount');
        const expiredNotice = document.getElementById('cart-expired-notice');

        if (!itemsContainer) return;

        // Hide expired notice if items exist
        if (cart.items.length > 0 && expiredNotice) {
            expiredNotice.classList.add('hidden');
        }

        if (cart.items.length === 0) {
            itemsContainer.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            if (formSection) formSection.classList.add('hidden');
            if (totalAmountEl) totalAmountEl.textContent = '₹0';
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        if (formSection) formSection.classList.remove('hidden');

        let grandTotal = 0;

        itemsContainer.innerHTML = cart.items.map(item => {
            const lineTotal = item.price * (item.quantity || 1);
            grandTotal += lineTotal;

            return `
                <div class="p-3 sm:p-3.5 rounded-xl bg-[#131622] border border-[#1e2436] flex items-center justify-between gap-3 text-xs">
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-white truncate text-xs sm:text-sm">${escapeHtml(item.title)}</div>
                        <div class="text-[10px] font-mono text-slate-400 mt-0.5">
                            <span class="text-crimson font-semibold">${escapeHtml(item.tier)}</span> • ₹${Number(item.price).toLocaleString('en-IN')} each
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2.5">
                        <!-- Quantity +/- -->
                        <div class="flex items-center rounded-lg bg-[#0d1019] border border-[#1e2436] font-mono">
                            <button type="button" onclick="TixoraCart.updateQuantity('${item.id}', -1)" class="px-2 py-1 text-slate-400 hover:text-white transition-colors" aria-label="Decrease quantity">−</button>
                            <span class="px-1.5 py-1 text-white font-semibold text-[11px]">${item.quantity || 1}</span>
                            <button type="button" onclick="TixoraCart.updateQuantity('${item.id}', 1)" class="px-2 py-1 text-slate-400 hover:text-white transition-colors" aria-label="Increase quantity">+</button>
                        </div>

                        <!-- Line Price -->
                        <div class="text-right min-w-[65px] font-mono font-bold text-white text-xs">
                            ₹${Number(lineTotal).toLocaleString('en-IN')}
                        </div>

                        <!-- Remove Button -->
                        <button type="button" onclick="TixoraCart.removeItem('${item.id}')" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Remove pass">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (totalAmountEl) {
            totalAmountEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');
        }

        if (window.lucide && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    // Modal Control
    function openCart() {
        const modal = document.getElementById('tixora-cart-modal');
        if (modal) {
            renderCartUI();
            startCountdownTimer();
            modal.classList.remove('hidden');
            if (window.lucide && lucide.createIcons) lucide.createIcons();
        }
    }

    function closeCart() {
        const modal = document.getElementById('tixora-cart-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Handle Checkout Submission (Customer Name, Phone, Email)
    async function submitCheckout(e) {
        if (e) e.preventDefault();

        const cart = loadCart();
        if (!cart.items.length) {
            alert('Your cart is empty. Add a concert pass first.');
            return;
        }

        // Check if hold has expired
        if (cart.expiresAt && Date.now() > cart.expiresAt) {
            clearCart('⚠️ Pass Reservation Expired: Your 10-minute hold has elapsed.');
            alert('Your 10-minute reservation hold has expired. Please re-add your tickets.');
            return;
        }

        const nameInput = document.getElementById('cart-cust-name');
        const phoneInput = document.getElementById('cart-cust-phone');
        const emailInput = document.getElementById('cart-cust-email');

        const customerName = (nameInput?.value || '').trim();
        const customerPhone = (phoneInput?.value || '').trim();
        const customerEmail = (emailInput?.value || '').trim().toLowerCase();

        // Client-side validations
        if (!customerName || customerName.length < 2) {
            alert('Please enter your full name (at least 2 characters).');
            nameInput?.focus();
            return;
        }

        const cleanPhone = customerPhone.replace(/[\s-]/g, '');
        if (!cleanPhone || cleanPhone.length < 10 || !/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
            alert('Please enter a valid mobile number (10-15 digits for WhatsApp pass delivery).');
            phoneInput?.focus();
            return;
        }

        if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            alert('Please enter a valid email address.');
            emailInput?.focus();
            return;
        }

        const btn = document.getElementById('cart-checkout-submit-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>Reserving Passes...</span>';
        }

        try {
            const csrfToken = (window.TixoraAuth && TixoraAuth.getCsrfToken && TixoraAuth.getCsrfToken()) || '';
            const res = await fetch('/api/cart/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    customer: {
                        name: customerName,
                        phone: customerPhone,
                        email: customerEmail
                    },
                    items: cart.items,
                    expiresAt: cart.expiresAt
                })
            });

            const data = await res.json();
            if (!res.ok || data.status !== 'success') {
                throw new Error(data.message || data.error || 'Checkout failed.');
            }

            // Show Confirmation View
            renderOrderSuccess(data.order || {
                orderId: 'TIX-' + Math.floor(100000 + Math.random() * 900000),
                customerName: customerName,
                customerPhone: customerPhone,
                customerEmail: customerEmail,
                items: cart.items,
                totalAmount: cart.items.reduce((s, i) => s + (i.price * i.quantity), 0)
            });

            // Clear Cart upon successful reservation
            saveCart({ items: [], expiresAt: null, customer: {} });
            stopCountdownTimer();

        } catch (err) {
            alert(`Reservation Error: ${err.message}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>Confirm & Reserve Passes</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>';
                if (window.lucide && lucide.createIcons) lucide.createIcons();
            }
        }
    }

    // Render Simple Order Success View inside Modal
    function renderOrderSuccess(order) {
        const body = document.getElementById('cart-modal-body');
        if (!body) return;

        body.innerHTML = `
            <div class="text-center py-4 space-y-4">
                <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                    <i data-lucide="check" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-lg font-bold text-white">Passes Reserved Successfully!</h3>
                    <p class="text-xs text-slate-400 mt-1">Order Ref: <span class="text-emerald-400 font-mono font-bold">${escapeHtml(order.orderId || 'TIX-CONFIRMED')}</span></p>
                </div>

                <div class="p-3.5 rounded-xl bg-[#131622] border border-[#1e2436] text-left text-xs font-mono space-y-2">
                    <div class="text-slate-400 flex justify-between">
                        <span>Attendee:</span>
                        <span class="text-white font-bold">${escapeHtml(order.customerName)}</span>
                    </div>
                    <div class="text-slate-400 flex justify-between">
                        <span>WhatsApp Delivery:</span>
                        <span class="text-white">${escapeHtml(order.customerPhone)}</span>
                    </div>
                    <div class="text-slate-400 flex justify-between">
                        <span>Confirmation Email:</span>
                        <span class="text-white">${escapeHtml(order.customerEmail)}</span>
                    </div>
                    <div class="text-slate-400 flex justify-between border-t border-[#1e2436] pt-2">
                        <span>Total Paid:</span>
                        <span class="text-emerald-400 font-bold">₹${Number(order.totalAmount).toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <p class="text-[11px] text-slate-400 leading-relaxed">
                    Dynamic QR turnstile passes have been dispatched to your WhatsApp number and email. BookMyShow verification active.
                </p>

                <button onclick="TixoraCart.resetModal()" class="btn-primary w-full py-2.5 rounded-xl text-xs font-semibold">
                    Done
                </button>
            </div>
        `;

        if (window.lucide && lucide.createIcons) lucide.createIcons();
    }

    // Reset Modal back to Cart state
    function resetModal() {
        closeCart();
        location.reload();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'fixed bottom-5 right-5 z-50 bg-[#0d1019] border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono flex items-center space-x-2';
        t.innerHTML = `<span>${escapeHtml(msg)}</span>`;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transition = 'opacity 0.3s ease';
            setTimeout(() => t.remove(), 300);
        }, 4000);
    }

    // Initialize on DOM Ready
    function init() {
        updateBadge();
        const cart = loadCart();
        if (cart.items.length > 0) {
            startCountdownTimer();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    window.TixoraCart = {
        loadCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        submitCheckout,
        updateBadge,
        resetModal
    };
})();
