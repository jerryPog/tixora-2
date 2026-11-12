(function (window, document) {
  'use strict';

  function forcePortalTopOnLoad() {
    if (window.history && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch (e) {}
    }
    const scrollToTop = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };
    scrollToTop();
    window.addEventListener('beforeunload', scrollToTop);
    window.addEventListener('pageshow', scrollToTop);
    window.addEventListener('load', () => requestAnimationFrame(scrollToTop));
  }
  forcePortalTopOnLoad();

  const CANONICAL_PORTAL_EVENTS = [
    {
      id: 'anyma-genesys-mumbai-2026',
      title: 'Anyma Presents Genesys Live',
      artist: 'Anyma',
      city: 'Mumbai',
      venue: 'Mahalaxmi Racecourse, Mumbai',
      date: '21 Nov 2026 • 17:00 IST',
      poster: 'posters/anyma-aeden-poster-1.webp',
      featured: true,
      tiers: [
        { name: 'GA Early Access', price: 3499, cutPct: 14 },
        { name: 'VIP Pit Standing', price: 7999, cutPct: 16 },
        { name: 'Backstage Deck', price: 14999, cutPct: 16 }
      ]
    },
    {
      id: 'gnr-live-delhi-2026',
      title: "Guns N' Roses Live in Delhi",
      artist: "Guns N' Roses",
      city: 'New Delhi',
      venue: 'Jawaharlal Nehru Stadium, New Delhi',
      date: '05 Dec 2026 • 18:30 IST',
      poster: 'posters/guns-n-roses-india-poster.webp',
      tiers: [
        { name: 'Silver Stand', price: 4999, cutPct: 12 },
        { name: 'Golden Circle', price: 9999, cutPct: 14 }
      ]
    },
    {
      id: 'fred-again-usb-bengaluru-2026',
      title: 'Fred again.. USB India Tour',
      artist: 'Fred again..',
      city: 'Bengaluru',
      venue: 'NICE Grounds, BIEC, Bengaluru',
      date: '12 Dec 2026 • 17:30 IST',
      poster: 'posters/fred-again-india-poster-1.webp',
      tiers: [
        { name: 'GA Floor', price: 2999, cutPct: 14 },
        { name: 'VIP Lounge', price: 6499, cutPct: 15 }
      ]
    },
    {
      id: 'chainsmokers-arena-goa-2026',
      title: 'The Chainsmokers Arena India',
      artist: 'The Chainsmokers',
      city: 'Goa',
      venue: 'Vagator Hilltop Arena, Goa',
      date: '30 Dec 2026 • 18:00 IST',
      poster: 'posters/chainsmokers-bengaluru-banner.webp',
      tiers: [
        { name: 'Sunset Lawn', price: 3999, cutPct: 13 },
        { name: 'Cabana Table Pass', price: 8999, cutPct: 15 }
      ]
    },
    {
      id: 'karan-aujla-chandigarh-2026',
      title: 'Karan Aujla It Was All A Dream',
      artist: 'Karan Aujla',
      city: 'Chandigarh',
      venue: 'Sector 34 Exhibition Ground, Chandigarh',
      date: '18 Oct 2026 • 18:30 IST',
      poster: 'posters/karan-aujla-poster-1.webp',
      tiers: [
        { name: 'Fan Pit GA', price: 2499, cutPct: 12 },
        { name: 'VIP Enclosure', price: 5499, cutPct: 14 }
      ]
    },
    {
      id: 'boris-brejcha-delhi-2026',
      title: 'Boris Brejcha In Concert',
      artist: 'Boris Brejcha',
      city: 'New Delhi',
      venue: 'Indira Gandhi Arena, New Delhi',
      date: '16 Jan 2027 • 20:00 IST',
      poster: 'posters/boris-brejcha-india-poster.webp',
      tiers: [
        { name: 'Arena Floor', price: 2799, cutPct: 13 },
        { name: 'Stage Deck', price: 5999, cutPct: 15 }
      ]
    },
    {
      id: 'martin-garrix-mumbai-2026',
      title: 'Martin Garrix India Arena Tour',
      artist: 'Martin Garrix',
      city: 'Mumbai',
      venue: 'DY Patil Stadium, Mumbai',
      date: '20 Feb 2027 • 17:00 IST',
      poster: 'posters/martin-garrix-india-poster.webp',
      tiers: [
        { name: 'Stadium Floor', price: 3299, cutPct: 14 },
        { name: 'VIP Pit', price: 6999, cutPct: 16 }
      ]
    },
    {
      id: 'dua-lipa-mumbai-2026',
      title: 'Dua Lipa Radical Optimism Tour',
      artist: 'Dua Lipa',
      city: 'Mumbai',
      venue: 'MMRDA Grounds, BKC, Mumbai',
      date: '15 Mar 2027 • 18:00 IST',
      poster: 'posters/dua-lipa-india-poster.webp',
      tiers: [
        { name: 'Gold Lawn', price: 4499, cutPct: 12 },
        { name: 'Lounge Pass', price: 9499, cutPct: 15 }
      ]
    }
  ];

  const SAFE_PORTAL_ROUTES = new Set([
    '/portal',
    '/portal/events',
    '/dashboard',
    '/portal/dashboard',
    '/portal/wallet',
    '/portal/bookings',
    '/admin',
    '/tours'
  ]);

  let _activeUser = null;
  let _activePromoter = null;
  let _activeRole = 'promoter';
  let _portalEvents = CANONICAL_PORTAL_EVENTS.slice();
  let _portalCityFilter = 'all';
  let _bookingStatusFilter = 'all';
  let _portalBookings = [];
  let _portalPayouts = [];
  let _portalCommissions = [];
  let _bookingModalEvent = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeAssetUrl(url, fallback = 'posters/anyma-aeden-poster-1.webp') {
    const clean = String(url || '').trim();
    if (!clean) return fallback;
    if (/^https:\/\/[^\s"'<>]+$/i.test(clean)) return clean;
    if (/^(posters|artists|ezgif-73126691f624a5ac-jpg)\/[a-zA-Z0-9._\-\/]+$/.test(clean) && !clean.includes('..')) {
      return clean;
    }
    return fallback;
  }

  function resetPortalUserState() {
    _activeUser = null;
    _activePromoter = null;
    _activeRole = 'promoter';
    _portalBookings = [];
    _portalPayouts = [];
    _portalCommissions = [];
    _bookingModalEvent = null;
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    const txt = document.getElementById('toast-message');
    if (txt) txt.textContent = msg;
    if (toast) {
      toast.classList.remove('translate-y-36', 'opacity-0', 'pointer-events-none');
      toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      setTimeout(() => {
        toast.classList.add('translate-y-36', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      }, 3600);
    }
  }

  function resolveCurrentPage() {
    const attr = (document.body && document.body.getAttribute('data-portal-page')) || '';
    if (attr) return attr.toLowerCase();
    const path = (window.location.pathname || '/portal').toLowerCase();
    if (path.includes('wallet')) return 'wallet';
    if (path.includes('booking')) return 'bookings';
    if (path.endsWith('/id') || path.includes('portal-id')) return 'id';
    if (path.includes('dashboard')) return 'dashboard';
    return 'events';
  }

  function resolveSafeNextUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const candidate = (params.get('next') || '').trim();
    if (candidate && SAFE_PORTAL_ROUTES.has(candidate.toLowerCase())) {
      return candidate;
    }
    return '/portal';
  }

  function getActiveRefCode() {
    if (_activePromoter && _activePromoter.referral_code) return _activePromoter.referral_code;
    const name =
      (_activePromoter && _activePromoter.full_name) ||
      (_activeUser && _activeUser.email && _activeUser.email.split('@')[0]) ||
      'PROMO';
    return 'TIX-' + name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  function togglePortalMobileMenu(forceState) {
    const panel = document.getElementById('mobile-nav-menu');
    const btn = document.getElementById('mobile-menu-btn');
    if (!panel || !btn) return;
    const shouldOpen =
      typeof forceState === 'boolean' ? forceState : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !shouldOpen);
    btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function initPortalMenuDismiss() {
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('mobile-nav-menu');
      const btn = document.getElementById('mobile-menu-btn');
      if (!panel || panel.classList.contains('hidden')) return;
      if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
        togglePortalMobileMenu(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        togglePortalMobileMenu(false);
        closePortalModal('portal-book-modal');
        closePortalModal('portal-receipt-modal');
      }
    });
  }

  function toggleDashPassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    if (btn) {
      btn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', isPass ? 'true' : 'false');
    }
  }

  function showDashboardState(state) {
    const barrier =
      document.getElementById('dashboard-loading-barrier') ||
      document.getElementById('portal-loading-barrier');
    const gate = document.getElementById('dashboard-auth-gate');
    const workspace =
      document.getElementById('dashboard-workspace') ||
      document.getElementById('portal-workspace');

    if (barrier) barrier.classList.add('hidden');
    if (gate) gate.classList.add('hidden');
    if (workspace) workspace.classList.add('hidden');

    if (state === 'loading' && barrier) {
      barrier.classList.remove('hidden');
    } else if (state === 'login' && gate) {
      gate.classList.remove('hidden');
    } else if (state === 'workspace' && workspace) {
      workspace.classList.remove('hidden');
    }

    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function switchDashboardTab(tab) {
    const tabIn = document.getElementById('tab-dashboard-signin');
    const tabUp = document.getElementById('tab-dashboard-signup');
    const formIn = document.getElementById('form-dashboard-signin');
    const formUp = document.getElementById('form-dashboard-signup');
    const notice = document.getElementById('dash-confirm-notice');
    const errBox = document.getElementById('dashboard-auth-error');

    if (errBox) errBox.classList.add('hidden');
    if (notice) notice.classList.add('hidden');

    if (tab === 'signin') {
      if (tabIn) tabIn.classList.add('is-active');
      if (tabUp) tabUp.classList.remove('is-active');
      if (formIn) formIn.classList.remove('hidden');
      if (formUp) formUp.classList.add('hidden');
    } else {
      if (tabUp) tabUp.classList.add('is-active');
      if (tabIn) tabIn.classList.remove('is-active');
      if (formUp) formUp.classList.remove('hidden');
      if (formIn) formIn.classList.add('hidden');
    }
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function openPortalModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    togglePortalMobileMenu(false);
    el.classList.remove('hidden');
    setTimeout(() => el.classList.remove('opacity-0'), 15);
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function closePortalModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('opacity-0');
    el.classList.add('hidden');
  }

  async function handleDashboardSignIn(e) {
    e.preventDefault();
    const emailInput = document.getElementById('dash-signin-email');
    const passwordInput = document.getElementById('dash-signin-password');
    const email = (emailInput ? emailInput.value : '').trim();
    const password = passwordInput ? passwordInput.value : '';
    const errBox = document.getElementById('dashboard-auth-error');
    const errText = document.getElementById('dashboard-auth-error-text');
    const btn = document.getElementById('btn-dash-signin');
    const btnText = document.getElementById('btn-dash-signin-text');

    if (errBox) errBox.classList.add('hidden');
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Signing in...';

    try {
      if (!window.TixoraAuth) throw new Error('Supabase Auth layer not initialized.');
      const res = await TixoraAuth.signIn(email, password);
      if (passwordInput) passwordInput.value = '';
      const role = res.role || (await TixoraAuth.getUserRole(res.user));
      const nextUrl = resolveSafeNextUrl();

      if (role !== 'admin' && role !== 'manager' && nextUrl !== '/dashboard') {
        showToast('Signed in! Opening your Events Portal...');
        window.location.replace(nextUrl);
        return;
      }

      showToast('Signed in. Workspace ready!');
      await renderPromoterWorkspace(res.user, res.promoter, role);
    } catch (err) {
      console.error('Sign In Error:', err);
      if (errBox && errText) {
        errText.textContent = err.message || 'Invalid email or password.';
        errBox.classList.remove('hidden');
      }
      if (err.code === 'rate_limit' && btn) {
        btn.disabled = true;
        let countdown = err.retry_after || 900;
        const timer = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            if (btnText) btnText.textContent = 'Sign In';
          } else if (btnText) {
            btnText.textContent = `Locked: Retry in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;
          }
        }, 1000);
        if (btnText) {
          btnText.textContent = `Locked: Retry in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;
        }
      }
      showToast(err.message || 'Sign in failed');
    } finally {
      if (btn && (!errBox || !errBox.textContent.toLowerCase().includes('locked'))) {
        btn.disabled = false;
        if (btnText) btnText.textContent = 'Sign In';
      }
    }
  }

  async function handleDashboardSignUp(e) {
    e.preventDefault();
    const fullName = document.getElementById('dash-signup-fullname').value.trim();
    const phone = document.getElementById('dash-signup-phone').value.trim();
    const email = document.getElementById('dash-signup-email').value.trim();
    const passwordInput = document.getElementById('dash-signup-password');
    const password = passwordInput ? passwordInput.value : '';
    const city = document.getElementById('dash-signup-city').value.trim();
    const upiId = document.getElementById('dash-signup-upi').value.trim();

    const errBox = document.getElementById('dashboard-auth-error');
    const errText = document.getElementById('dashboard-auth-error-text');
    const btn = document.getElementById('btn-dash-signup');
    const btnText = document.getElementById('btn-dash-signup-text');

    if (errBox) errBox.classList.add('hidden');

    const upiRegex = /^[\w.\-]{2,64}@[a-zA-Z0-9.\-]{2,64}$/;
    if (!upiRegex.test(upiId)) {
      if (errBox && errText) {
        errText.textContent = 'Enter a valid UPI ID (e.g. name@oksbi, mobile@paytm).';
        errBox.classList.remove('hidden');
      }
      return;
    }

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Submitting...';

    try {
      if (!window.TixoraAuth) throw new Error('Supabase Auth layer not initialized.');
      const res = await TixoraAuth.signUp({
        email,
        password,
        fullName,
        phone,
        city,
        upiId,
        role: 'promoter'
      });
      if (passwordInput) passwordInput.value = '';

      if (res && res.emailConfirmationRequired) {
        const notice = document.getElementById('dash-confirm-notice');
        const emailTarget = document.getElementById('dash-confirm-email');
        const formSignup = document.getElementById('form-dashboard-signup');
        if (emailTarget) emailTarget.textContent = email;
        if (formSignup) formSignup.classList.add('hidden');
        if (notice) notice.classList.remove('hidden');
        showToast('Registered! Verify your email to continue.');
      } else if (res && res.user) {
        showToast('Promoter account activated! Opening Events Portal...');
        window.location.replace(resolveSafeNextUrl());
      }
    } catch (err) {
      console.error('Sign Up Error:', err);
      if (errBox && errText) {
        errText.textContent = err.message || 'Registration failed. Check your details.';
        errBox.classList.remove('hidden');
      }
      showToast(err.message || 'Registration failed');
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Apply & Register';
    }
  }

  async function handleDashboardResend() {
    const email =
      (document.getElementById('dash-signup-email')?.value || '').trim() ||
      (document.getElementById('dash-signin-email')?.value || '').trim();
    if (!email) {
      showToast('Enter an email address to resend.');
      return;
    }
    try {
      await TixoraAuth.resendConfirmation(email);
      showToast('Verification email sent to ' + email);
    } catch (err) {
      showToast(err.message || 'Could not resend email');
    }
  }

  async function handlePortalSignOut() {
    try {
      if (window.TixoraAuth) {
        await TixoraAuth.signOut();
      }
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    resetPortalUserState();
    showToast('Signed out.');
    if (resolveCurrentPage() === 'dashboard' && document.getElementById('dashboard-auth-gate')) {
      showDashboardState('login');
    } else {
      window.location.href = '/dashboard';
    }
  }

  function renderFeaturedSpotlight(events) {
    if (!events || events.length === 0) return;
    const ev = events.find((e) => e.featured) || events[0];
    const baseTier = ev.tiers[0] || { name: 'GA Standard', price: 3499, cutPct: 14 };
    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);
    const activeCut = Math.max(userCut, Number(baseTier.cutPct || 14));
    const earnAmt = Math.round((Number(baseTier.price) * activeCut) / 100);

    const setEl = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setEl('events-featured-title', ev.title);
    setEl('events-featured-venue', ev.venue);
    setEl('events-featured-mrp', '₹' + Number(baseTier.price).toLocaleString('en-IN'));
    setEl('events-featured-cut', `Earn ₹${earnAmt.toLocaleString('en-IN')} / pass (${activeCut}%)`);
    const imgEl = document.getElementById('events-featured-img');
    if (imgEl && ev.poster) imgEl.src = sanitizeAssetUrl(ev.poster);
    const btnEl = document.getElementById('events-featured-btn');
    if (btnEl) {
      btnEl.onclick = () => openPortalBookModal(ev.id);
    }
  }

  async function loadPortalEvents() {
    let list = CANONICAL_PORTAL_EVENTS.slice();
    try {
      if (window.TixoraAuth) {
        const client = window.TixoraAuth.getClient();
        if (client) {
          const { data: events, error } = await Promise.race([
            client
              .from('events')
              .select('*, venues(name, city), ticket_tiers(id, name, price, promoter_cut_pct)')
              .eq('status', 'active')
              .order('event_date', { ascending: true }),
            new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), 2500))
          ]);
          if (!error && Array.isArray(events) && events.length > 0) {
            const dbMapped = events.map((ev) => {
              const tiers =
                Array.isArray(ev.ticket_tiers) && ev.ticket_tiers.length
                  ? ev.ticket_tiers.map((t) => ({
                      name: t.name || 'GA Standard',
                      price: Number(t.price || ev.base_price || 3499),
                      cutPct: Number(t.promoter_cut_pct || 12)
                    }))
                  : [{ name: 'GA Standard', price: Number(ev.base_price || 3499), cutPct: 12 }];
              const venueCity = (ev.venues && ev.venues.city) || ev.city || 'Mumbai';
              const venueName =
                ev.venues && ev.venues.name ? `${ev.venues.name}, ${venueCity}` : ev.venue_name || venueCity;
              return {
                id: String(ev.id || ev.slug || ev.title),
                title: ev.title,
                artist: ev.artist_name || ev.title,
                city: venueCity,
                venue: venueName,
                date: ev.event_date ? String(ev.event_date).slice(0, 16) : '2026 Live Date',
                poster: ev.poster_url || 'posters/anyma-aeden-poster-1.webp',
                featured: Boolean(ev.is_featured),
                tiers
              };
            });
            const seenTitles = new Set(dbMapped.map((x) => x.title.toLowerCase()));
            list = [...dbMapped, ...list.filter((c) => !seenTitles.has(c.title.toLowerCase()))];
          }
        }
      }
    } catch (e) {}
    _portalEvents = list;
    renderFeaturedSpotlight(list);
    filterPortalEvents();
  }

  function setPortalCityFilter(city) {
    _portalCityFilter = (city || 'all').toLowerCase();
    document.querySelectorAll('[data-portal-city]').forEach((btn) => {
      const active = (btn.getAttribute('data-portal-city') || 'all').toLowerCase() === _portalCityFilter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    filterPortalEvents();
  }

  function resetPortalEventFilters() {
    const search = document.getElementById('promo-events-search');
    if (search) search.value = '';
    setPortalCityFilter('all');
  }

  function filterPortalEvents() {
    const grid = document.getElementById('promo-events-grid');
    if (!grid) return;
    const countEl = document.getElementById('promo-events-count');
    const emptyEl = document.getElementById('promo-events-empty');
    const search = (document.getElementById('promo-events-search')?.value || '').trim().toLowerCase();

    const events = _portalEvents.length ? _portalEvents : CANONICAL_PORTAL_EVENTS;
    const filtered = events.filter((ev) => {
      const cityOk =
        _portalCityFilter === 'all' ||
        (ev.city || '').toLowerCase().includes(_portalCityFilter) ||
        (ev.venue || '').toLowerCase().includes(_portalCityFilter);
      const hay = `${ev.title} ${ev.artist} ${ev.venue} ${ev.city} ${ev.date}`.toLowerCase();
      const textOk = !search || hay.includes(search);
      return cityOk && textOk;
    });

    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} of ${events.length} Events`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);

    grid.innerHTML = filtered
      .map((ev) => {
        const baseTier = ev.tiers[0] || { name: 'GA Standard', price: 3499, cutPct: 12 };
        const activeCut = Math.max(userCut, Number(baseTier.cutPct || 12));
        const earnAmt = Math.round((Number(baseTier.price) * activeCut) / 100);
        const safeId = escapeHtml(ev.id);

        return `
          <article class="tour-card tour-card--grid">
            <div class="tour-card-media">
              <img src="${escapeHtml(sanitizeAssetUrl(ev.poster))}" alt="${escapeHtml(ev.title)}" width="480" height="320" loading="lazy" decoding="async">
              <span class="tour-cut-pill tabular-nums">${activeCut.toFixed(0)}% Cut</span>
              <span class="tour-venue-pill">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 flex-shrink-0"></i>
                <span class="truncate">${escapeHtml(ev.venue)}</span>
              </span>
            </div>

            <div class="tour-card-body">
              <div>
                <div class="tour-meta-row">
                  <span class="tour-tag tour-tag--featured">${escapeHtml(ev.city)}</span>
                  <span>${escapeHtml(ev.date)}</span>
                </div>
                <h3 class="tour-card-title">${escapeHtml(ev.title)}</h3>
                <p class="tour-card-desc">${escapeHtml(baseTier.name)} allocation ready &bull; Instant gate QR &amp; sub-60s UPI cut.</p>
              </div>

              <div class="tour-card-footer">
                <div class="tour-price-split tabular-nums">
                  <div>
                    <span class="tour-price-label">Starting MRP</span>
                    <span class="tour-price-val">₹${Number(baseTier.price).toLocaleString('en-IN')}</span>
                  </div>
                  <div class="text-right">
                    <span class="tour-price-label">Your Earnings</span>
                    <span class="tour-price-val" style="color: var(--emerald-ink);">+₹${earnAmt.toLocaleString('en-IN')}/pass</span>
                  </div>
                </div>

                <div>
                  <button type="button" data-book-event="${safeId}" class="btn-editorial-primary btn-compact w-full">
                    <i data-lucide="ticket" class="w-3.5 h-3.5"></i>
                    <span>Book / Reserve Pass</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function openPortalBookModal(eventId) {
    const list = _portalEvents.length ? _portalEvents : CANONICAL_PORTAL_EVENTS;
    const ev = list.find((item) => String(item.id) === String(eventId)) || list[0];
    if (!ev) return;
    _bookingModalEvent = ev;

    const titleEl = document.getElementById('portal-book-title');
    const metaEl = document.getElementById('portal-book-meta');
    const promoEl = document.getElementById('book-promo-id');
    const tierSelect = document.getElementById('book-tier-select');
    const qtySelect = document.getElementById('book-qty-select');

    if (titleEl) titleEl.textContent = ev.title;
    if (metaEl) metaEl.textContent = `${ev.venue} • ${ev.date}`;
    if (promoEl) promoEl.textContent = getActiveRefCode();
    if (tierSelect) {
      tierSelect.innerHTML = ev.tiers
        .map(
          (t, idx) =>
            `<option value="${idx}">${escapeHtml(t.name)} - ₹${Number(t.price).toLocaleString('en-IN')}</option>`
        )
        .join('');
    }
    if (qtySelect) qtySelect.value = '1';

    const nameEl = document.getElementById('book-cust-name');
    const phoneEl = document.getElementById('book-cust-phone');
    const emailEl = document.getElementById('book-cust-email');
    if (nameEl && !nameEl.value && _activePromoter) nameEl.value = _activePromoter.full_name || '';
    if (phoneEl && !phoneEl.value && _activePromoter) phoneEl.value = _activePromoter.phone || '+91 98200 11223';
    if (emailEl && !emailEl.value && _activeUser) emailEl.value = _activeUser.email || '';

    updatePortalBookingSummary();
    openPortalModal('portal-book-modal');
  }

  function updatePortalBookingSummary() {
    if (!_bookingModalEvent) return;
    const tierIdx = Number(document.getElementById('book-tier-select')?.value || 0);
    const qty = Number(document.getElementById('book-qty-select')?.value || 1);
    const tier = _bookingModalEvent.tiers[tierIdx] || _bookingModalEvent.tiers[0];
    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);
    const rate = Math.max(userCut, Number(tier.cutPct || 12));
    const total = Number(tier.price) * qty;
    const cut = Math.round((total * rate) / 100);

    const mrpEl = document.getElementById('book-total-mrp');
    const cutEl = document.getElementById('book-est-cut');
    if (mrpEl) mrpEl.textContent = '₹' + total.toLocaleString('en-IN');
    if (cutEl) cutEl.textContent = '+₹' + cut.toLocaleString('en-IN') + ` (${rate}%)`;
  }

  async function handlePortalBookingSubmit(e) {
    e.preventDefault();
    if (!_bookingModalEvent || !_activeUser) return;

    const tierIdx = Number(document.getElementById('book-tier-select')?.value || 0);
    const qty = Number(document.getElementById('book-qty-select')?.value || 1);
    const tier = _bookingModalEvent.tiers[tierIdx] || _bookingModalEvent.tiers[0];
    const custName = (document.getElementById('book-cust-name')?.value || '').trim();
    const custPhone = (document.getElementById('book-cust-phone')?.value || '').trim();
    const custEmail = (document.getElementById('book-cust-email')?.value || '').trim().toLowerCase();

    const btn = document.getElementById('btn-portal-book-submit');
    const btnText = document.getElementById('btn-portal-book-text');
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Issuing Pass...';

    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);
    const rate = Math.max(userCut, Number(tier.cutPct || 12));
    const totalAmount = Number(tier.price) * qty;
    const commissionAmount = Math.round((totalAmount * rate) / 100);
    let orderRef = 'TIX-' + Math.floor(100000 + Math.random() * 900000);

    try {
      if (window.TixoraAuth && typeof window.TixoraAuth.fetchWithCsrf === 'function') {
        const res = await window.TixoraAuth.fetchWithCsrf('/api/cart/checkout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: { name: custName, phone: custPhone, email: custEmail },
            items: [{ title: _bookingModalEvent.title, tier: tier.name, price: tier.price, quantity: qty }],
            expiresAt: Date.now() + 600000
          })
        });
        const data = await res.json();
        if (res.ok && data && data.order && data.order.orderId) {
          orderRef = data.order.orderId;
        }
      }
    } catch (err) {}

    if (window.TixoraAuth && typeof window.TixoraAuth.recordLocalBooking === 'function') {
      window.TixoraAuth.recordLocalBooking(_activeUser, {
        order_ref: orderRef,
        event_title: _bookingModalEvent.title,
        tier_name: tier.name,
        quantity: qty,
        total_amount: totalAmount,
        commission_rate: rate,
        commission_amount: commissionAmount,
        attendee_name: custName,
        attendee_phone: custPhone,
        attendee_email: custEmail,
        status: 'confirmed',
        channel: 'Promoter Portal',
        created_at: new Date().toISOString()
      });
    }

    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Confirm & Issue Pass';
    closePortalModal('portal-book-modal');
    await hydratePortalLedgerAndHistory();
    showToast(`Pass ${orderRef} issued! Added to Booking History.`);
  }

  function setBookingStatusFilter(status) {
    _bookingStatusFilter = (status || 'all').toLowerCase();
    document.querySelectorAll('[data-booking-status]').forEach((btn) => {
      const active = (btn.getAttribute('data-booking-status') || 'all').toLowerCase() === _bookingStatusFilter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderBookingsTable();
  }

  function renderBookingsTable() {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;

    const search = (document.getElementById('bookings-search')?.value || '').trim().toLowerCase();
    const filtered = _portalBookings.filter((b) => {
      const status = String(b.status || 'confirmed').toLowerCase();
      const statusOk = _bookingStatusFilter === 'all' || status.includes(_bookingStatusFilter);
      const hay = `${b.order_ref} ${b.event_title} ${b.tier_name} ${b.attendee_name} ${b.attendee_email}`.toLowerCase();
      const textOk = !search || hay.includes(search);
      return statusOk && textOk;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-8 text-center text-[var(--muted)] font-sans text-xs">
            No matching bookings found. Reserve passes from <a href="/portal" class="text-[var(--crimson-ink)] font-semibold">Events Home &rarr;</a>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((b) => {
        const st = String(b.status || 'confirmed').toLowerCase();
        const badgeClass =
          st.includes('scan') || st.includes('confirm') || st.includes('paid')
            ? 'ops-badge-emerald'
            : st.includes('pend')
              ? 'ops-badge-gold'
              : 'ops-badge-navy';
        const dt = b.created_at
          ? new Date(b.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : 'Today';

        return `
          <tr>
            <td class="font-bold text-[var(--crimson-ink)] whitespace-nowrap">${escapeHtml(b.order_ref)}</td>
            <td class="min-w-[180px]">
              <div class="font-bold text-white font-sans">${escapeHtml(b.event_title)}</div>
              <div class="text-[11px] text-[var(--muted)]">${escapeHtml(b.tier_name)}</div>
            </td>
            <td class="tabular-nums">${Number(b.quantity || 1)}</td>
            <td class="font-sans text-xs">${escapeHtml(b.attendee_name)}</td>
            <td class="tabular-nums whitespace-nowrap">₹${Number(b.total_amount || 0).toLocaleString('en-IN')}</td>
            <td class="tabular-nums whitespace-nowrap text-[var(--emerald-ink)] font-bold">+₹${Number(b.commission_amount || 0).toLocaleString('en-IN')}</td>
            <td class="whitespace-nowrap text-[var(--muted)]">${escapeHtml(dt)}</td>
            <td>
              <span class="${badgeClass} px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">${escapeHtml(b.status || 'Confirmed')}</span>
            </td>
            <td>
              <button type="button" data-view-receipt="${escapeHtml(b.order_ref)}"
                class="btn-editorial-outline-light btn-compact" style="min-block-size: 36px; padding-inline: 10px;">
                View
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function openBookingReceipt(orderRef) {
    const b = _portalBookings.find((item) => String(item.order_ref) === String(orderRef));
    if (!b) return;
    const setEl = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    setEl('receipt-status', String(b.status || 'Confirmed').toUpperCase());
    setEl('receipt-order-ref', b.order_ref);
    setEl('receipt-event', b.event_title);
    setEl('receipt-tier', `${b.tier_name} x ${b.quantity || 1}`);
    setEl('receipt-attendee', b.attendee_name);
    setEl('receipt-channel', b.channel || 'Tixora Portal');
    setEl('receipt-amount', '₹' + Number(b.total_amount || 0).toLocaleString('en-IN'));
    setEl('receipt-commission', '+₹' + Number(b.commission_amount || 0).toLocaleString('en-IN'));
    openPortalModal('portal-receipt-modal');
  }

  function renderPayoutsTable() {
    const tbody = document.getElementById('wallet-payouts-body');
    if (!tbody) return;
    if (!_portalPayouts || _portalPayouts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-[var(--muted)] font-sans text-xs">
            No UPI payouts dispatched yet. Settlements appear here once passes clear the gate.
          </td>
        </tr>
      `;
      return;
    }
    tbody.innerHTML = _portalPayouts
      .map((p) => {
        const st = String(p.status || 'settled').toLowerCase();
        const badgeClass =
          st.includes('settle') || st.includes('paid') || st.includes('success')
            ? 'ops-badge-emerald'
            : 'ops-badge-gold';
        const dt = p.created_at
          ? new Date(p.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : 'Recent';
        return `
          <tr>
            <td class="font-bold text-white">${escapeHtml(p.payout_ref || p.id || 'PAY-01')}</td>
            <td class="text-[var(--crimson-ink)]">${escapeHtml(p.upi_id || (_activePromoter && _activePromoter.upi_id) || 'user@upi')}</td>
            <td class="tabular-nums font-bold text-[var(--emerald-ink)]">₹${Number(p.amount || 0).toLocaleString('en-IN')}</td>
            <td class="text-[var(--muted)]">${escapeHtml(p.utr_number || p.utr || 'NPCI-AUTO')}</td>
            <td class="text-[var(--muted)] whitespace-nowrap">${escapeHtml(dt)}</td>
            <td><span class="${badgeClass} px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">${escapeHtml(p.status || 'Settled')}</span></td>
          </tr>
        `;
      })
      .join('');
  }

  function renderCommissionLedger() {
    const tbody = document.getElementById('dash-ledger-body');
    if (!tbody) return;
    const rows =
      _portalCommissions.length > 0
        ? _portalCommissions.map((c) => ({
            ref: c.pass_code || c.order_id || 'CM-' + String(c.id || '').slice(0, 6),
            event: c.event_title || 'Concert Pass',
            tier: c.tier_name || 'Standard',
            mrp: Number(c.base_amount || c.ticket_price || 0),
            rate: Number(c.commission_rate || (_activePromoter && _activePromoter.commission_rate) || 8),
            comm: Number(c.commission_amount || c.amount || 0),
            status: c.status || 'Credited'
          }))
        : _portalBookings.map((b) => ({
            ref: b.order_ref,
            event: b.event_title,
            tier: `${b.tier_name} x${b.quantity || 1}`,
            mrp: Number(b.total_amount || 0),
            rate: Number(b.commission_rate || 8),
            comm: Number(b.commission_amount || 0),
            status: b.status || 'Pending Scan'
          }));

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-[var(--muted)] font-sans text-xs">
            No gate scans yet. Book client passes from <a href="/portal" class="text-[var(--crimson-ink)] font-semibold">Events Home &rarr;</a>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td class="font-bold text-[var(--crimson-ink)]">${escapeHtml(r.ref)}</td>
          <td class="font-sans font-semibold text-white">${escapeHtml(r.event)}</td>
          <td class="text-[var(--muted)]">${escapeHtml(r.tier)}</td>
          <td class="tabular-nums">₹${r.mrp.toLocaleString('en-IN')}</td>
          <td class="tabular-nums">${r.rate.toFixed(1)}%</td>
          <td class="tabular-nums font-bold text-[var(--emerald-ink)]">+₹${r.comm.toLocaleString('en-IN')}</td>
          <td><span class="ops-badge-emerald px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">${escapeHtml(r.status)}</span></td>
        </tr>
      `
      )
      .join('');
  }

  async function handleUpdateUpi(e) {
    e.preventDefault();
    const input = document.getElementById('wallet-upi-input');
    const btn = document.getElementById('btn-save-upi');
    const btnText = document.getElementById('btn-save-upi-text');
    if (!input || !window.TixoraAuth) return;

    const newUpi = input.value.trim();
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Saving...';

    try {
      const res = await TixoraAuth.updateMyUpi(newUpi, _activeUser);
      _activePromoter = res.promoter || _activePromoter;
      if (_activePromoter) _activePromoter.upi_id = res.upi_id;

      const accountUpi = document.getElementById('dash-account-upi');
      const idCardUpi = document.getElementById('id-card-upi');
      if (accountUpi) accountUpi.textContent = res.upi_id;
      if (idCardUpi) idCardUpi.textContent = res.upi_id;
      input.value = res.upi_id;
      showToast('Settlement UPI updated to ' + res.upi_id);
    } catch (err) {
      showToast(err.message || 'Invalid UPI ID format');
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Save UPI ID';
    }
  }

  function applyLedgerMetricsAndRender(dbOrders = []) {
    if (!_activeUser || !window.TixoraAuth) return;
    const userCut = Number((_activePromoter && _activePromoter.commission_rate) || 8);
    const localBookings = TixoraAuth.getLocalBookings(_activeUser);
    const mappedOrders = (dbOrders || []).map((o) => {
      const amt = Number(o.total_amount || o.amount || 0);
      return {
        order_ref: o.order_code || 'ORD-' + String(o.id || '').slice(0, 6),
        event_title: (o.events && o.events.title) || o.event_title || 'Tixora Live Pass',
        tier_name: (o.ticket_tiers && o.ticket_tiers.name) || 'GA Standard',
        quantity: Number(o.quantity || 1),
        total_amount: amt,
        commission_rate: userCut,
        commission_amount: Math.round((amt * userCut) / 100),
        attendee_name: o.attendee_name || (_activePromoter && _activePromoter.full_name) || 'Attendee',
        attendee_email: o.attendee_email || '',
        status: o.status || 'confirmed',
        channel: 'Promoter Portal',
        created_at: o.created_at
      };
    });

    const seen = new Set(mappedOrders.map((o) => o.order_ref));
    _portalBookings = [...mappedOrders, ...localBookings.filter((b) => !seen.has(b.order_ref))];

    const dbPasses = Number((_activePromoter && _activePromoter.total_passes_sold) || 0);
    const totalPasses = Math.max(
      dbPasses,
      _portalBookings.reduce((s, b) => s + Number(b.quantity || 1), 0)
    );

    const dbEarn = Number((_activePromoter && _activePromoter.total_earnings) || 0);
    const localEarn = localBookings.reduce((s, b) => s + Number(b.commission_amount || 0), 0);
    const totalEarn = Math.max(
      dbEarn,
      localEarn + _portalCommissions.reduce((s, c) => s + Number(c.commission_amount || 0), 0)
    );

    const grossVol =
      _portalBookings.length > 0
        ? _portalBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0)
        : totalPasses * 3999;

    const settledAmt = _portalPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    const pendingAmt = Math.max(0, totalEarn - settledAmt);

    const setVal = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setVal('dash-kpi-passes', totalPasses.toLocaleString('en-IN'));
    setVal('dash-kpi-volume', '₹' + grossVol.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    setVal('dash-kpi-earnings', '₹' + totalEarn.toLocaleString('en-IN', { minimumFractionDigits: 2 }));

    setVal('wallet-earned-val', '₹' + totalEarn.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    setVal('wallet-settled-val', '₹' + settledAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    setVal('wallet-pending-val', '₹' + pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    setVal('nav-wallet-badge', '₹' + Math.round(totalEarn).toLocaleString('en-IN'));

    setVal('nav-bookings-count', String(_portalBookings.length));
    setVal('bookings-count-val', String(_portalBookings.length));
    setVal(
      'bookings-passes-val',
      String(_portalBookings.reduce((s, b) => s + Number(b.quantity || 1), 0))
    );
    setVal(
      'bookings-gross-val',
      '₹' + _portalBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0).toLocaleString('en-IN')
    );

    renderBookingsTable();
    renderPayoutsTable();
    renderCommissionLedger();
  }

  async function hydratePortalLedgerAndHistory() {
    if (!_activeUser || !window.TixoraAuth) return;
    let dbOrders = [];
    try {
      const [ordersRes, commsRes, payoutsRes] = await Promise.race([
        Promise.all([
          TixoraAuth.getMyOrders(),
          TixoraAuth.getMyCommissions(),
          TixoraAuth.getMyPayouts()
        ]),
        new Promise((resolve) => setTimeout(() => resolve([[], [], []]), 2500))
      ]);
      dbOrders = Array.isArray(ordersRes) ? ordersRes : [];
      _portalCommissions = Array.isArray(commsRes) ? commsRes : [];
      _portalPayouts = Array.isArray(payoutsRes) ? payoutsRes : [];
    } catch (e) {}

    applyLedgerMetricsAndRender(dbOrders);
  }

  async function renderPromoterWorkspace(user, promoter, role = 'promoter') {
    _activeUser = user;
    _activeRole = role || 'promoter';
    _activePromoter = promoter || (window.TixoraAuth ? await TixoraAuth.getPromoterProfile(user) : null);

    const name =
      (_activePromoter && _activePromoter.full_name) ||
      (user.user_metadata && user.user_metadata.full_name) ||
      (user.email ? user.email.split('@')[0] : 'Promoter');
    const city = (_activePromoter && _activePromoter.city) || (user.user_metadata && user.user_metadata.city) || 'Mumbai';
    const email = user.email || '';
    const phone = (_activePromoter && _activePromoter.phone) || (user.user_metadata && user.user_metadata.phone) || '+91 Verified';
    const upi =
      (_activePromoter && _activePromoter.upi_id) ||
      (user.user_metadata && user.user_metadata.upi_id) ||
      (user.email ? user.email.split('@')[0] + '@okhdfcbank' : 'user@upi');
    const refCode = getActiveRefCode();
    const tierName = (_activePromoter && _activePromoter.tier_name) || 'Scout';
    const commRate = Number((_activePromoter && _activePromoter.commission_rate) || 8.0);
    const joinedDate = (_activePromoter && _activePromoter.created_at) || user.created_at;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('dash-hero-title', 'Welcome, ' + name);
    setText('events-hero-title', 'Welcome, ' + name);
    setText('dash-header-name', name);
    setText('dash-header-tier', tierName.toUpperCase() + ' • ' + commRate.toFixed(1) + '%');
    setText('topbar-promoter-id', refCode);
    setText('mobile-promoter-id', refCode);
    setText('events-hero-id', refCode);
    setText('events-hero-tier', tierName.toUpperCase() + ' • ' + commRate.toFixed(1) + '% CUT');

    document.querySelectorAll('[data-portal-id-chip]').forEach((el) => {
      el.textContent = refCode;
    });

    const isAdmin = _activeRole === 'admin' || _activeRole === 'manager';
    ['promo-admin-link', 'promo-mobile-admin-link'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', !isAdmin);
    });

    setText('dash-account-email', email);
    setText('dash-account-city', city);
    setText('dash-account-upi', upi);
    setText('dash-tier-badge', 'TIER • ' + tierName.toUpperCase() + ' (' + commRate.toFixed(1) + '%)');
    setText('id-card-name', name);
    setText('id-card-tier', tierName.toUpperCase() + ' TIER • ' + commRate.toFixed(1) + '% CUT');
    setText('id-card-code', refCode);
    setText('id-card-phone', phone);
    setText('id-card-upi', upi);
    if (joinedDate) {
      setText(
        'id-card-joined',
        new Date(joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      );
    }

    const walletUpiInput = document.getElementById('wallet-upi-input');
    if (walletUpiInput) walletUpiInput.value = upi;

    document.querySelectorAll('#dash-tier-grid [data-tier]').forEach((card) => {
      const isMatch = (card.getAttribute('data-tier') || '').toLowerCase() === tierName.toLowerCase();
      card.style.backgroundColor = isMatch ? 'var(--bg-card)' : '';
      card.style.borderColor = isMatch ? 'var(--crimson)' : '';
      card.style.borderWidth = isMatch ? '1.5px' : '';
    });

    applyLedgerMetricsAndRender([]);
    showDashboardState('workspace');
    // Hydrate live Supabase events and orders without blocking workspace display
    Promise.all([loadPortalEvents(), hydratePortalLedgerAndHistory()]).catch(() => {});
  }

  function copyPromoterId() {
    const code = getActiveRefCode();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => showToast('Promoter ID copied: ' + code))
        .catch(() => showToast('Promoter ID: ' + code));
    } else {
      showToast('Promoter ID: ' + code);
    }
  }

  async function waitForAuthClient(maxWaitMs = 1800) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (window.TixoraAuth && typeof window.TixoraAuth.getSession === 'function') {
        const hasMockOrClient =
          window.TixoraAuth.isConfigured() ||
          String(window.TixoraAuth.getSession).indexOf('mock') !== -1 ||
          typeof window.supabase !== 'undefined';
        if (hasMockOrClient) return true;
      }
      await new Promise((r) => setTimeout(r, 60));
    }
    return Boolean(window.TixoraAuth);
  }

  async function initPortalPage() {
    const pageName = resolveCurrentPage();
    resetPortalUserState();

    // Pre-populate events immediately for snappy rendering
    _portalEvents = CANONICAL_PORTAL_EVENTS.slice();
    renderFeaturedSpotlight(_portalEvents);
    filterPortalEvents();

    showDashboardState('loading');

    try {
      const authReady = await waitForAuthClient(1800);
      if (!authReady || !window.TixoraAuth) {
        if (pageName === 'dashboard') {
          showDashboardState('login');
        } else {
          window.location.replace('/dashboard?next=' + encodeURIComponent(window.location.pathname));
        }
        return;
      }

      if (typeof window.TixoraAuth.onAuthStateChange === 'function') {
        window.TixoraAuth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            resetPortalUserState();
          } else if (_activeUser && session && session.user && _activeUser.id !== session.user.id) {
            resetPortalUserState();
          }
        });
      }

      const session = await TixoraAuth.getSession();
      if (!session || !session.user) {
        resetPortalUserState();
        if (pageName === 'dashboard') {
          showDashboardState('login');
        } else {
          window.location.replace('/dashboard?next=' + encodeURIComponent(window.location.pathname));
        }
        return;
      }

      const [promoter, role] = await Promise.all([
        TixoraAuth.getPromoterProfile(session.user),
        TixoraAuth.getUserRole(session.user)
      ]);
      await renderPromoterWorkspace(session.user, promoter, role);
    } catch (err) {
      console.error('Portal init error:', err);
      resetPortalUserState();
      if (pageName === 'dashboard') {
        showDashboardState('login');
      } else {
        window.location.replace('/dashboard?next=' + encodeURIComponent(window.location.pathname));
      }
    }
  }

  document.addEventListener('click', (e) => {
    const bookBtn = e.target && e.target.closest ? e.target.closest('[data-book-event]') : null;
    if (bookBtn) {
      openPortalBookModal(bookBtn.getAttribute('data-book-event'));
      return;
    }
    const receiptBtn = e.target && e.target.closest ? e.target.closest('[data-view-receipt]') : null;
    if (receiptBtn) {
      openBookingReceipt(receiptBtn.getAttribute('data-view-receipt'));
    }
  });

  // Export clean globals for HTML handlers and verification harnesses
  window.togglePortalMobileMenu = togglePortalMobileMenu;
  window.toggleMobileMenu = togglePortalMobileMenu;
  window.toggleDashPassword = toggleDashPassword;
  window.showDashboardState = showDashboardState;
  window.switchDashboardTab = switchDashboardTab;
  window.openPortalModal = openPortalModal;
  window.closePortalModal = closePortalModal;
  window.handleDashboardSignIn = handleDashboardSignIn;
  window.handleDashboardSignUp = handleDashboardSignUp;
  window.handleDashboardResend = handleDashboardResend;
  window.handleDashboardSignOut = handlePortalSignOut;
  window.handlePortalSignOut = handlePortalSignOut;
  window.renderPromoterWorkspace = renderPromoterWorkspace;
  window.setPortalCityFilter = setPortalCityFilter;
  window.resetPortalEventFilters = resetPortalEventFilters;
  window.filterPortalEvents = filterPortalEvents;
  window.openPortalBookModal = openPortalBookModal;
  window.updatePortalBookingSummary = updatePortalBookingSummary;
  window.handlePortalBookingSubmit = handlePortalBookingSubmit;
  window.setBookingStatusFilter = setBookingStatusFilter;
  window.renderBookingsTable = renderBookingsTable;
  window.openBookingReceipt = openBookingReceipt;
  window.handleUpdateUpi = handleUpdateUpi;
  window.copyPromoterId = copyPromoterId;

  document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    initPortalMenuDismiss();
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    setTimeout(initPortalPage, 80);
  });
})(window, document);
