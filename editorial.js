/**
 * TIXORA EDITORIAL INTERACTION & AUTH CONTROLLER
 * Consolidates CIED Editorial motion, WCAG/MWG accessibility, Modals w/ inert management,
 * Tour Carousel, Earnings Calculators, Supabase Auth UI, Live Sync, Lightbox & Tixora AI.
 */

(function (window, document) {
  'use strict';

  const prefersReducedMotion = () =>
    Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function announceStatus(msg) {
    const announcer = document.getElementById('sr-announcer');
    if (!announcer || !msg) return;
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = msg;
    }, 30);
  }

  /* =========================================================================
     1. SCROLL PROGRESS BAR FALLBACK (Only when CSS scroll-timeline unsupported)
     ========================================================================= */
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    const hasNativeScrollTimeline =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('animation-timeline', 'scroll()');

    if (hasNativeScrollTimeline || prefersReducedMotion()) {
      return;
    }

    let rafId = null;
    function updateBar() {
      rafId = null;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    }

    window.addEventListener(
      'scroll',
      () => {
        if (!rafId) {
          rafId = window.requestAnimationFrame(updateBar);
        }
      },
      { passive: true }
    );
    updateBar();
  }

  /* =========================================================================
     2. SCROLL REVEAL OBSERVER (Opt-In After js-ready, Respects Reduced Motion)
     ========================================================================= */
  function initRevealObserver() {
    document.documentElement.classList.add('js-ready');
    const nodes = Array.from(document.querySelectorAll('.reveal'));
    if (!nodes.length) return;

    const revealNode = (el) => {
      if (!el.classList.contains('is-revealed')) {
        el.classList.add('is-revealed');
      }
    };

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      nodes.forEach(revealNode);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            revealNode(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '120px 0px 120px 0px' }
    );

    nodes.forEach((el, idx) => {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        const stagger = (idx % 4) * 60;
        el.style.setProperty('--reveal-delay', `${stagger}ms`);
      }
      observer.observe(el);
    });

    function sweepVisibleReveals() {
      const vh = window.innerHeight || document.documentElement.clientHeight || 900;
      nodes.forEach((el) => {
        if (el.classList.contains('is-revealed')) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= vh + 120) {
          revealNode(el);
          observer.unobserve(el);
        }
      });
    }

    let scrollSweepRaf = null;
    const scheduleSweep = () => {
      if (scrollSweepRaf) return;
      scrollSweepRaf = window.requestAnimationFrame(() => {
        scrollSweepRaf = null;
        sweepVisibleReveals();
      });
    };

    sweepVisibleReveals();
    window.addEventListener('scroll', scheduleSweep, { passive: true });
    window.addEventListener('resize', scheduleSweep, { passive: true });
    window.addEventListener('hashchange', () => setTimeout(sweepVisibleReveals, 60));
    setTimeout(sweepVisibleReveals, 350);
  }

  /* =========================================================================
     3. NAVBAR SCROLL STATE & MOBILE MENU DRAWER
     ========================================================================= */
  function initNavbarState() {
    const pill = document.querySelector('.nav-pill');
    if (!pill) return;

    function syncScrollClass() {
      if (window.scrollY > 24) {
        pill.classList.add('is-scrolled');
      } else {
        pill.classList.remove('is-scrolled');
      }
    }

    window.addEventListener('scroll', syncScrollClass, { passive: true });
    syncScrollClass();
  }

  window.toggleMobileMenu = function (forceClose) {
    const menu = document.getElementById('mobile-nav-menu');
    const btn = document.getElementById('mobile-menu-btn');
    if (!menu) return;

    const shouldClose = forceClose === false || (!menu.classList.contains('hidden') && forceClose !== true);
    if (shouldClose) {
      menu.classList.add('hidden');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    } else {
      menu.classList.remove('hidden');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
  };

  function initMobileMenuDismiss() {
    const menu = document.getElementById('mobile-nav-menu');
    const btn = document.getElementById('mobile-menu-btn');
    if (!menu) return;

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => window.toggleMobileMenu(false));
    });

    document.addEventListener('click', (e) => {
      if (menu.classList.contains('hidden')) return;
      if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
        window.toggleMobileMenu(false);
      }
    });
  }

  /* =========================================================================
     4. MARQUEE PAUSE / RESUME CONTROL (WCAG 2.2.2, No aria-pressed)
     ========================================================================= */
  function initMarqueeControls() {
    const shell = document.getElementById('ecosystem-marquee');
    const toggleBtn = document.getElementById('marquee-toggle');
    if (!shell || !toggleBtn) return;

    let userPaused = prefersReducedMotion();

    function applyMarqueeState() {
      const paused = userPaused || document.hidden;
      shell.classList.toggle('is-paused', paused);
      toggleBtn.textContent = userPaused ? 'Resume motion' : 'Pause motion';
    }

    toggleBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      applyMarqueeState();
    });

    document.addEventListener('visibilitychange', applyMarqueeState);
    applyMarqueeState();
  }

  /* =========================================================================
     5. ACCESSIBLE MODAL & INERT SHELL SYSTEM
     ========================================================================= */
  const MODAL_IDS = [
    'promoter-modal',
    'buy-modal',
    'tixora-cart-modal',
    'link-modal',
    'privacy-modal',
    'terms-modal'
  ];

  let _lastModalTrigger = null;

  function hasAnyOpenModal() {
    return MODAL_IDS.some((id) => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });
  }

  function syncBodyModalState() {
    const hasBackdropModal = hasAnyOpenModal();
    const hasDialogModal = Boolean(document.querySelector('dialog[open]'));
    document.body.classList.toggle('has-modal-open', hasBackdropModal || hasDialogModal);
  }

  function syncPageShellInert(isModalOpen) {
    const shell = document.getElementById('page-shell');
    if (shell) {
      if (isModalOpen) {
        shell.setAttribute('inert', '');
      } else {
        shell.removeAttribute('inert');
      }
    }
    syncBodyModalState();
  }

  window.syncModalFocusInert = function (openedModalEl, isOpen) {
    if (isOpen) {
      if (typeof window.toggleMobileMenu === 'function') {
        window.toggleMobileMenu(false);
      }
      if (!hasAnyOpenModal() || !document.getElementById('page-shell')?.hasAttribute('inert')) {
        if (document.activeElement && document.activeElement !== document.body) {
          _lastModalTrigger = document.activeElement;
        }
      }
      syncPageShellInert(true);
      if (openedModalEl) {
        const focusTarget = openedModalEl.querySelector(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusTarget) {
          setTimeout(() => focusTarget.focus(), 20);
        }
      }
    } else {
      const stillOpen = hasAnyOpenModal();
      syncPageShellInert(stillOpen);
      if (!stillOpen && _lastModalTrigger && typeof _lastModalTrigger.focus === 'function') {
        const trigger = _lastModalTrigger;
        _lastModalTrigger = null;
        setTimeout(() => {
          if (document.body.contains(trigger)) trigger.focus();
        }, 20);
      }
    }
  };

  window.openModal = function (id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (typeof window.toggleMobileMenu === 'function') {
      window.toggleMobileMenu(false);
    }
    if (document.activeElement && document.activeElement !== document.body && !hasAnyOpenModal()) {
      _lastModalTrigger = document.activeElement;
    }
    modal.classList.remove('hidden');
    syncPageShellInert(true);
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      const focusTarget = modal.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (focusTarget) focusTarget.focus();
    }, 15);
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  };

  window.closeModal = function (id) {
    const modal = document.getElementById(id);
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('opacity-0');
    modal.classList.add('hidden');
    const stillOpen = hasAnyOpenModal();
    syncPageShellInert(stillOpen);
    if (!stillOpen && _lastModalTrigger && typeof _lastModalTrigger.focus === 'function') {
      const trigger = _lastModalTrigger;
      _lastModalTrigger = null;
      if (document.body.contains(trigger)) trigger.focus();
    }
  };

  window.openPrivacyModal = function (e) {
    if (e) e.preventDefault();
    window.openModal('privacy-modal');
  };

  window.closePrivacyModal = function () {
    window.closeModal('privacy-modal');
  };

  window.openTermsModal = function (e) {
    if (e) e.preventDefault();
    window.openModal('terms-modal');
  };

  window.closeTermsModal = function () {
    window.closeModal('terms-modal');
  };

  function initGlobalDismissHandlers() {
    window.addEventListener('click', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
        if (e.target.id === 'tixora-cart-modal' && window.TixoraCart) {
          window.TixoraCart.closeCart();
        } else if (e.target.id) {
          window.closeModal(e.target.id);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const mobileMenu = document.getElementById('mobile-nav-menu');
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        window.toggleMobileMenu(false);
        return;
      }
      for (let i = MODAL_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(MODAL_IDS[i]);
        if (el && !el.classList.contains('hidden')) {
          if (MODAL_IDS[i] === 'tixora-cart-modal' && window.TixoraCart) {
            window.TixoraCart.closeCart();
          } else {
            window.closeModal(MODAL_IDS[i]);
          }
          break;
        }
      }
    });
  }

  /* =========================================================================
     6. NATIVE <DIALOG> PHOTO LIGHTBOX ("Inside Tixora")
     ========================================================================= */
  function initLightbox() {
    const dialog = document.getElementById('tixora-lightbox');
    if (!dialog) return;

    const imgEl = document.getElementById('lightbox-image');
    const titleEl = document.getElementById('lightbox-title');
    const metaEl = document.getElementById('lightbox-meta');
    const closeBtn = document.getElementById('lightbox-close-btn');

    document.querySelectorAll('[data-lightbox-src]').forEach((tile) => {
      tile.addEventListener('click', () => {
        const src = tile.getAttribute('data-lightbox-src');
        const alt = tile.getAttribute('data-lightbox-alt') || tile.getAttribute('data-lightbox-title') || 'Concert stage view';
        const title = tile.getAttribute('data-lightbox-title') || '';
        const meta = tile.getAttribute('data-lightbox-meta') || '';
        if (imgEl && src) {
          imgEl.src = src;
          imgEl.alt = alt;
        }
        if (titleEl) titleEl.textContent = title;
        if (metaEl) metaEl.textContent = meta;
        if (typeof window.toggleMobileMenu === 'function') {
          window.toggleMobileMenu(false);
        }
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
          syncBodyModalState();
        }
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.close());
    }

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener('close', syncBodyModalState);
  }

  /* =========================================================================
     7. LIVE CONCERT CAROUSEL (Prev / Next / Dots — Accessible, No Auto-Jump)
     ========================================================================= */
  function initTourCarousel() {
    const track = document.getElementById('events-side-track');
    if (!track) return;

    const prevBtn = document.getElementById('events-prev');
    const nextBtn = document.getElementById('events-next');
    const dotsContainer = document.getElementById('events-dots');
    const cards = Array.from(track.querySelectorAll('.tour-card'));

    function getCardStep() {
      const card = cards[0];
      return card ? card.offsetWidth + 22 : 348;
    }

    function updateDots() {
      if (!dotsContainer) return;
      const dots = Array.from(dotsContainer.querySelectorAll('button'));
      if (!dots.length) return;
      const step = getCardStep();
      const activeIdx = Math.min(dots.length - 1, Math.max(0, Math.round(track.scrollLeft / step)));
      dots.forEach((dot, idx) => {
        dot.classList.toggle('is-active', idx === activeIdx);
        dot.setAttribute('aria-current', idx === activeIdx ? 'true' : 'false');
      });
    }

    if (dotsContainer && cards.length > 0 && dotsContainer.children.length === 0) {
      cards.forEach((card, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = idx === 0 ? 'carousel-dot is-active' : 'carousel-dot';
        const titleNode = card.querySelector('.tour-card-title');
        const label = titleNode ? titleNode.textContent.trim() : `Tour ${idx + 1}`;
        dot.setAttribute('aria-label', `View ${label}`);
        dot.addEventListener('click', () => {
          track.scrollTo({ left: idx * getCardStep(), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        });
        dotsContainer.appendChild(dot);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        track.scrollBy({ left: -getCardStep(), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScroll - 16) {
          track.scrollTo({ left: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        } else {
          track.scrollBy({ left: getCardStep(), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      });
    }

    let rafScroll = null;
    track.addEventListener(
      'scroll',
      () => {
        if (rafScroll) window.cancelAnimationFrame(rafScroll);
        rafScroll = window.requestAnimationFrame(updateDots);
      },
      { passive: true }
    );
  }

  /* =========================================================================
     8. PROMOTER EARNINGS CALCULATORS (Home + Promoter Subpage)
     ========================================================================= */
  function initHomeCalculator() {
    const sliderPasses = document.getElementById('slider-passes');
    const sliderPrice = document.getElementById('slider-price');
    const passesVal = document.getElementById('slider-passes-val');
    const priceVal = document.getElementById('slider-price-val');
    const calcMonthlyRev = document.getElementById('calc-monthly-rev');
    const calcGmv = document.getElementById('calc-gmv');
    const calcRate = document.getElementById('calc-commission-rate');
    const calcRunrate = document.getElementById('calc-annual-runrate');

    if (!sliderPasses || !sliderPrice) return;

    function updateHomeCalculator() {
      const passes = parseInt(sliderPasses.value, 10) || 45;
      const price = parseInt(sliderPrice.value, 10) || 3500;

      if (passesVal) passesVal.textContent = `${passes} Passes`;
      if (priceVal) priceVal.textContent = '₹' + price.toLocaleString('en-IN');

      const gmv = passes * price;
      let rate = 0.08;
      let tierName = 'Scout';

      if (passes >= 300) {
        rate = 0.16;
        tierName = 'Patron';
      } else if (passes >= 101) {
        rate = 0.135;
        tierName = 'Syndicate';
      } else if (passes >= 26) {
        rate = 0.11;
        tierName = 'Capo';
      }

      const monthlyCommission = Math.round(gmv * rate);
      const annualRunrate = monthlyCommission * 12;

      if (calcMonthlyRev) calcMonthlyRev.textContent = '₹' + monthlyCommission.toLocaleString('en-IN');
      if (calcGmv) calcGmv.textContent = '₹' + gmv.toLocaleString('en-IN');
      if (calcRate) calcRate.textContent = `${(rate * 100).toFixed(1)}% (${tierName})`;
      if (calcRunrate) calcRunrate.textContent = '₹' + annualRunrate.toLocaleString('en-IN') + ' / yr';
    }

    sliderPasses.addEventListener('input', updateHomeCalculator);
    sliderPrice.addEventListener('input', updateHomeCalculator);
    updateHomeCalculator();
  }

  function initSubpageCalculator() {
    const tSlider = document.getElementById('page-calc-tickets');
    const pSlider = document.getElementById('page-calc-price');
    const tVal = document.getElementById('page-calc-tickets-val');
    const pVal = document.getElementById('page-calc-price-val');
    const revOut = document.getElementById('page-calc-monthly-rev');
    const grossOut = document.getElementById('page-calc-gross');
    const tierOut = document.getElementById('page-calc-tier');

    if (!tSlider || !pSlider) return;

    function updatePageCalc() {
      const tickets = parseInt(tSlider.value, 10) || 65;
      const price = parseInt(pSlider.value, 10) || 3999;

      if (tVal) tVal.textContent = `${tickets} Passes`;
      if (pVal) pVal.textContent = '₹' + price.toLocaleString('en-IN');

      const gross = tickets * price;
      let pct = 0.08;
      let label = '8.0% (TIER 1 • SCOUT)';

      if (tickets >= 300) {
        pct = 0.16;
        label = '16.0% (TIER 4 • PATRON)';
      } else if (tickets >= 101) {
        pct = 0.135;
        label = '13.5% (TIER 3 • SYNDICATE)';
      } else if (tickets >= 26) {
        pct = 0.11;
        label = '11.0% (TIER 2 • CAPO)';
      }

      const rev = Math.round(gross * pct);
      if (revOut) revOut.textContent = '₹' + rev.toLocaleString('en-IN');
      if (grossOut) grossOut.textContent = '₹' + gross.toLocaleString('en-IN');
      if (tierOut) tierOut.textContent = label;
    }

    tSlider.addEventListener('input', updatePageCalc);
    pSlider.addEventListener('input', updatePageCalc);
    window.updatePageCalc = updatePageCalc;
    updatePageCalc();
  }

  /* =========================================================================
     9. TOAST, COOKIE CONSENT, BUY MODAL & REFERRAL LINK ACTIONS
     ========================================================================= */
  window.showToast = function (msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    if (toast && toastMsg) {
      toastMsg.textContent = msg;
      toast.classList.add('is-visible');
      setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 3600);
    }
    announceStatus(msg);
  };

  window.buyTicketModal = function (eventName, price, category) {
    const titleEl = document.getElementById('buy-event-title');
    const tagEl = document.getElementById('buy-organizer-tag');
    const totalEl = document.getElementById('buy-total-val');

    if (titleEl) titleEl.textContent = eventName;
    if (tagEl) tagEl.textContent = `${category} • Official Quota`;
    if (totalEl) totalEl.textContent = '₹' + Number(price).toLocaleString('en-IN');

    const ev = (window._liveEvents || []).find((e) => e.title === eventName);
    const tierWrapper = document.getElementById('buy-tier-wrapper');
    const tierSelect = document.getElementById('buy-tier-select');

    if (tierWrapper && tierSelect) {
      if (ev && ev.ticket_tiers && ev.ticket_tiers.length > 0) {
        tierWrapper.classList.remove('hidden');
        tierSelect.innerHTML = ev.ticket_tiers
          .map(
            (t) =>
              `<option value="${t.price}" data-tier="${escapeHtml(t.name)}">${escapeHtml(t.name)} — ₹${Number(t.price).toLocaleString('en-IN')}</option>`
          )
          .join('');
        if (totalEl) totalEl.textContent = '₹' + Number(ev.ticket_tiers[0].price).toLocaleString('en-IN');
        if (tagEl) tagEl.textContent = `${ev.ticket_tiers[0].name} • Official Quota`;
      } else {
        tierWrapper.classList.add('hidden');
      }
    }
    window.openModal('buy-modal');
  };

  window.handleBuyTierChange = function (sel) {
    const opt = sel.options[sel.selectedIndex];
    const price = Number(sel.value);
    const tierName = opt ? opt.getAttribute('data-tier') || 'GA Standard' : 'GA Standard';
    const totalEl = document.getElementById('buy-total-val');
    const tagEl = document.getElementById('buy-organizer-tag');
    if (totalEl) totalEl.textContent = '₹' + price.toLocaleString('en-IN');
    if (tagEl) tagEl.textContent = `${tierName} • Official Quota`;
  };

  window.addCurrentModalToCart = function () {
    const titleEl = document.getElementById('buy-event-title');
    const title = titleEl ? titleEl.textContent : 'Concert Tour';
    const tierSelect = document.getElementById('buy-tier-select');
    const tierWrapper = document.getElementById('buy-tier-wrapper');

    let tier = 'GA Standard';
    let price = 3499;

    if (tierSelect && tierWrapper && !tierWrapper.classList.contains('hidden') && tierSelect.options.length > 0) {
      const opt = tierSelect.options[tierSelect.selectedIndex];
      price = Number(tierSelect.value) || price;
      tier = opt ? opt.getAttribute('data-tier') || opt.text.split('—')[0].trim() : tier;
    } else {
      const totalVal = (document.getElementById('buy-total-val')?.textContent || '').replace(/[^0-9]/g, '');
      price = Number(totalVal) || price;
      const orgTag = document.getElementById('buy-organizer-tag')?.textContent || '';
      tier = orgTag.split('•')[0].trim() || tier;
    }

    const matched = TIXORA_EVENTS_DB.find(
      (e) => e.tour.toLowerCase().includes(title.toLowerCase().slice(0, 8)) || e.names.some((n) => title.toLowerCase().includes(n))
    );
    const posterImg = matched ? matched.poster : 'posters/anyma-aeden-poster-1.webp';

    window.closeModal('buy-modal');
    if (window.TixoraCart) {
      window.TixoraCart.addItem(title, price, tier, posterImg);
    }
  };

  window.copyPromoterLink = function (eventName) {
    const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const link = `https://tixora.in/p/${slug}?ref=PROMO-${Math.floor(1000 + Math.random() * 9000)}`;
    const nameEl = document.getElementById('link-event-name');
    const inputEl = document.getElementById('generated-link-input');
    if (nameEl) nameEl.textContent = eventName;
    if (inputEl) inputEl.value = link;
    window.openModal('link-modal');
  };

  window.copyToClipboardAction = function () {
    const input = document.getElementById('generated-link-input');
    if (!input) return;
    input.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(input.value)
        .then(() => {
          window.closeModal('link-modal');
          window.showToast('Link copied.');
        })
        .catch(() => {
          window.closeModal('link-modal');
          window.showToast('Link copied.');
        });
    } else {
      window.closeModal('link-modal');
      window.showToast('Copy the link above.');
    }
  };

  window.simulateSignupSuccess = function () {
    window.closeModal('promoter-modal');
    window.showToast('Application submitted. Verification sent on WhatsApp.');
  };

  window.simulateOrderSuccess = function () {
    window.closeModal('buy-modal');
    window.showToast('Booking verified. Passes sent to BookMyShow.');
  };

  function initCookieBanner() {
    try {
      const consent = localStorage.getItem('tixora-cookies');
      const banner = document.getElementById('cookie-banner');
      if (!consent && banner) {
        setTimeout(() => {
          banner.classList.remove('translate-y-36', 'opacity-0', 'pointer-events-none');
          banner.classList.add('translate-y-0', 'opacity-100');
        }, 900);
      }
    } catch (e) { }
  }

  window.acceptCookies = function (type) {
    try {
      localStorage.setItem('tixora-cookies', type || 'accepted');
    } catch (e) { }
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.classList.remove('translate-y-0', 'opacity-100');
      banner.classList.add('translate-y-36', 'opacity-0', 'pointer-events-none');
    }
    window.showToast(type === 'essential' ? 'Essential cookies saved.' : 'Cookie preferences saved.');
  };

  /* =========================================================================
     10. TIXORA AI CHATBOT ENGINE (Verified Local Poster Paths Only)
     ========================================================================= */
  const TIXORA_EVENTS_DB = [
    {
      id: 'anyma',
      names: ['anyma', 'genesys', 'tale of us', 'matteo milleri', 'afterlife', 'aeden'],
      artist: 'Anyma',
      tour: 'Anyma Presents Genesys Live Mumbai',
      genre: 'Melodic Techno / Immersive Audio-Visual',
      date: 'Saturday, 21 November 2026',
      timings: 'Gates Open: 5:00 PM • Show: 6:30 PM – 10:30 PM IST',
      venue: 'Mahalaxmi Racecourse, Mumbai, Maharashtra',
      mrp: '₹3,499 (GA Standard) • ₹6,999 (VIP)',
      promoterYield: 'Earn ₹490 per pass (14% yield)',
      poster: 'posters/anyma-aeden-poster-1.webp',
      posterAlt: 'Anyma Genesys Live Mumbai Poster',
      topSongs: [
        'Eternity (with Chris Avantgarde)',
        'Syren (with Rebūke)',
        'Explore Your Future',
        'Save Me (with Cassian & Poppy Baskcomb)',
        'Pictures of You',
        'The Sign (with CamelPhat)',
        'Running (feat. Meg Myers)'
      ],
      overview:
        'Anyma brings his Genesys audio-visual show to Mumbai for one open-air night at Mahalaxmi Racecourse.'
    },
    {
      id: 'gnr',
      names: ['guns n roses', "guns n' roses", 'guns and roses', 'gnr', 'axl rose', 'slash', 'delhi'],
      artist: "Guns N' Roses",
      tour: "Guns N' Roses Live in Delhi — 2026 Stadium Tour",
      genre: 'Hard Rock / Classic Rock',
      date: 'Saturday, 05 December 2026',
      timings: 'Gates Open: 4:30 PM • Opening Act: 6:00 PM • GNR Live: 7:30 PM – 10:30 PM (Full 3-Hour Stadium Set)',
      venue: 'Jawaharlal Nehru (JLN) Stadium, New Delhi',
      mrp: '₹4,999 (Silver Stand) • ₹8,999 (Gold Pitch) • ₹14,999 (Platinum Fan Pit)',
      promoterYield: 'Earn ₹600 per pass (12% yield)',
      poster: 'posters/guns-n-roses-india-poster.webp',
      posterAlt: "Guns N' Roses Live in Delhi Poster",
      topSongs: [
        "Sweet Child O' Mine",
        'November Rain',
        'Welcome to the Jungle',
        'Paradise City',
        "Don't Cry",
        "Knockin' on Heaven's Door",
        'Patience',
        'Civil War'
      ],
      overview:
        'Axl Rose, Slash, and Duff McKagan play a full 3-hour stadium rock set in New Delhi.'
    },
    {
      id: 'fredagain',
      names: ['fred again', 'fred again..', 'fred', 'fredagain', 'usb', 'bengaluru', 'bangalore'],
      artist: 'Fred again..',
      tour: 'Fred again.. USB India Tour 2026',
      genre: 'Electronic / UK Garage / House',
      date: 'Saturday, 12 December 2026',
      timings: 'Gates Open: 4:00 PM • Support DJ Sets: 5:30 PM • Fred again.. Live: 8:00 PM – 10:15 PM IST',
      venue: 'NICE Grounds, BIEC, Tumkur Road, Bengaluru',
      mrp: '₹2,999 (Early Bird GA) • ₹3,999 (Phase 1 GA) • ₹7,499 (VIP Raised Deck)',
      promoterYield: 'Earn ₹450 per pass (15% yield)',
      poster: 'posters/fred-again-india-poster-1.webp',
      posterAlt: 'Fred again.. USB India Tour Poster',
      topSongs: [
        'Adore U (with Obongjayar)',
        'Danielle (smile on my face)',
        'Delilah (pull me out of this)',
        "Marea (we've lost dancing) [with The Blessed Madonna]",
        'Jungle',
        'leavemealone (with Baby Keem)',
        'Rumble (with Skrillex & Flowdan)',
        'places to be (with Anderson .Paak & CHIKA)'
      ],
      overview:
        'Grammy winner Fred again.. brings his USB live set and custom lighting rig to Bengaluru.'
    },
    {
      id: 'chainsmokers',
      names: ['chainsmokers', 'the chainsmokers', 'drew taggart', 'alex pall', 'goa', 'vagator'],
      artist: 'The Chainsmokers',
      tour: 'The Chainsmokers Arena India — Goa Year-End Showcase',
      genre: 'EDM / Dance Pop / Festival',
      date: 'Wednesday, 30 December 2026',
      timings: 'Gates Open: 5:00 PM • Festival Openers: 6:30 PM • The Chainsmokers Headline Set: 9:00 PM – 11:00 PM IST',
      venue: 'Vagator Hilltop Arena, Vagator, North Goa',
      mrp: '₹3,999 (GA) • ₹8,499 (VIP Sunset Lounge)',
      promoterYield: 'Earn ₹480 per pass (12% yield)',
      poster: 'posters/chainsmokers-bengaluru-banner.webp',
      posterAlt: 'The Chainsmokers Arena India Goa Poster',
      topSongs: [
        'Closer (feat. Halsey)',
        'Something Just Like This (with Coldplay)',
        "Don't Let Me Down (feat. Daya)",
        'Roses (feat. ROZES)',
        'Paris',
        'Takeaway (with ILLENIUM feat. Lennon Stella)',
        'Side Effects (feat. Emily Warren)',
        'High'
      ],
      overview:
        'Year-end festival set in Goa with The Chainsmokers and supporting international acts.'
    },
    {
      id: 'karanaujla',
      names: ['karan aujla', 'aujla', 'geetan di machine', 'chandigarh', 'dream tour'],
      artist: 'Karan Aujla',
      tour: 'Karan Aujla — It Was All A Dream India Tour',
      genre: 'Punjabi Hip-Hop / Pop',
      date: 'Sunday, 18 October 2026',
      timings: 'Gates Open: 4:30 PM • Opening Acts: 6:00 PM • Karan Aujla Live: 7:30 PM – 10:00 PM IST',
      venue: 'Sector 34 Exhibition Grounds, Chandigarh (Also touring Delhi NCR & Mumbai)',
      mrp: '₹2,499 (Silver Stand) • ₹4,999 (Gold Pitch) • ₹7,999 (VIP Fan Pit)',
      promoterYield: 'Earn ₹375 per pass (15% yield)',
      poster: 'posters/khalid-india-banner.webp',
      posterAlt: 'Karan Aujla It Was All A Dream Tour Artwork',
      topSongs: [
        'Tauba Tauba (from Bad Newz)',
        'Softly (Making Memories album)',
        'Winning Speech',
        'Antidote',
        'White Brown Black (with Avvy Sra)',
        '52 Bars',
        'Admiring You (feat. Preston Pablo)',
        'Chitta Kurta',
        'Mexico'
      ],
      overview:
        'Karan Aujla performs tracks from Making Memories and Four Me with a 14-piece live band.'
    },
    {
      id: 'boris',
      names: ['boris brejcha', 'boris', 'joker', 'high tech minimal', 'minimal'],
      artist: 'Boris Brejcha',
      tour: 'Boris Brejcha In Concert — New Delhi Edition',
      genre: 'High-Tech Minimal Techno',
      date: 'Friday, 16 January 2026',
      timings: 'Doors Open: 6:00 PM • Supporting DJs: 7:00 PM • Boris Brejcha 3-Hour Headliner Set: 9:30 PM – 12:30 AM IST',
      venue: 'Indira Gandhi Indoor Arena, New Delhi',
      mrp: '₹2,799 (GA) • ₹6,499 (VIP Stage Enclosure)',
      promoterYield: 'Earn ₹390 per pass (14% yield)',
      poster: 'ezgif-73126691f624a5ac-jpg/ezgif-frame-045.jpg',
      posterAlt: 'Boris Brejcha In Concert Delhi Stage Artwork',
      topSongs: [
        'Gravity (feat. Laura Korinth)',
        'Purple Noise',
        'Space X',
        'House Music',
        'Take It Smart',
        'Level One',
        'Vienna (feat. Malena Narvay)',
        'Liebe Will'
      ],
      overview:
        'Masked German producer Boris Brejcha brings his 3-hour High-Tech Minimal set to Delhi.'
    },
    {
      id: 'martingarrix',
      names: ['martin garrix', 'garrix', 'stmpd', 'dy patil', 'animals'],
      artist: 'Martin Garrix',
      tour: 'Martin Garrix India Arena Tour — Mumbai Special',
      genre: 'EDM / Progressive House / Electro',
      date: 'Saturday, 20 February 2026',
      timings: 'Gates Open: 4:00 PM • STMPD RCRDS Showcase: 5:30 PM • Martin Garrix Headline Show: 8:00 PM – 10:15 PM IST',
      venue: 'DY Patil Stadium, Nerul, Navi Mumbai',
      mrp: '₹3,299 (GA) • ₹6,999 (Arena Gold) • ₹12,999 (VIP Platinum)',
      promoterYield: 'Earn ₹460 per pass (14% yield)',
      poster: 'ezgif-73126691f624a5ac-jpg/ezgif-frame-095.jpg',
      posterAlt: 'Martin Garrix India Arena Tour Stage Production',
      topSongs: [
        'Animals',
        'Scared to Be Lonely (with Dua Lipa)',
        'In the Name of Love (with Bebe Rexha)',
        'High on Life (feat. Bonn)',
        'Summer Days (feat. Macklemore & Patrick Stump)',
        'Tremor (with Dimitri Vegas & Like Mike)',
        'Starlight (Keep Me Afloat)',
        'Pressure (feat. Tove Lo)'
      ],
      overview:
        'Martin Garrix headlines DY Patil Stadium with custom laser arrays and festival anthems.'
    },
    {
      id: 'dualipa',
      names: ['dua lipa', 'dua', 'radical optimism', 'bkc', 'levitating'],
      artist: 'Dua Lipa',
      tour: 'Dua Lipa — Radical Optimism World Tour India',
      genre: 'Dance-Pop / Nu-Disco',
      date: 'Sunday, 15 March 2026',
      timings: 'Gates Open: 4:00 PM • Support Acts: 6:00 PM • Dua Lipa Live on Stage: 8:00 PM – 10:00 PM IST',
      venue: 'MMRDA Grounds, Bandra-Kurla Complex (BKC), Mumbai',
      mrp: '₹4,499 (Silver GA) • ₹9,999 (Gold Pitch) • ₹16,999 (Diamond Lounge)',
      promoterYield: 'Earn ₹580 per pass (13% yield)',
      poster: 'posters/anyma-aeden-poster-2.webp',
      posterAlt: 'Dua Lipa Radical Optimism Tour Artwork',
      topSongs: [
        'Levitating',
        "Don't Start Now",
        'Houdini',
        'Training Season',
        'Dance the Night (from Barbie The Album)',
        'New Rules',
        'Physical',
        'One Kiss (with Calvin Harris)',
        'Break My Heart'
      ],
      overview:
        'Dua Lipa brings the Radical Optimism stadium tour to Mumbai with live band and choreography.'
    }
  ];

  const CHAT_SUGGESTIONS = [
    'Anyma Mumbai info',
    'Karan Aujla songs',
    "Guns N' Roses timings",
    'Fred again.. venue',
    'Chainsmokers Goa',
    'Promoter payouts'
  ];

  let isChatOpen = false;

  window.scrollToSection = function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  };

  window.toggleChatbot = function () {
    const widget = document.getElementById('ai-chat-widget');
    const toggleBtn = document.getElementById('chat-toggle-btn');
    if (!widget) return;

    isChatOpen = !isChatOpen;
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isChatOpen ? 'true' : 'false');

    if (isChatOpen) {
      if (typeof window.toggleMobileMenu === 'function') {
        window.toggleMobileMenu(false);
      }
      widget.classList.remove('scale-95', 'opacity-0', 'pointer-events-none');
      widget.classList.add('scale-100', 'opacity-100', 'pointer-events-auto');
      const input = document.getElementById('chat-input');
      if (input) setTimeout(() => input.focus(), 180);
    } else {
      widget.classList.remove('scale-100', 'opacity-100', 'pointer-events-auto');
      widget.classList.add('scale-95', 'opacity-0', 'pointer-events-none');
    }
  };

  function renderSuggestions() {
    const container = document.getElementById('chat-suggestions');
    if (!container) return;
    container.innerHTML = CHAT_SUGGESTIONS.map(
      (s) =>
        `<button type="button" onclick="askQuestion('${s.replace(/'/g, "\\'")}')" class="chat-suggestion-chip whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium bg-[var(--soft)] hover:bg-[var(--crimson-btn)] hover:text-white text-[var(--ink)] border border-[var(--line)] transition-colors flex-shrink-0">${escapeHtml(s)}</button>`
    ).join('');
  }

  function renderInitialGreeting() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = `
      <div class="flex items-start gap-2.5">
        <div class="w-7 h-7 rounded-full bg-[var(--crimson-btn)] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
          <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
        </div>
        <div class="bg-[var(--soft)] border border-[var(--line)] rounded-2xl rounded-tl-none p-3.5 space-y-2 text-[var(--ink)] max-w-[88%] leading-relaxed text-xs">
          <p><strong>Tixora AI</strong></p>
          <p class="text-[var(--muted)]">Ask about tour dates, venues, setlists, or promoter UPI payouts.</p>
        </div>
      </div>
    `;
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    renderSuggestions();
  }

  window.resetChat = function () {
    renderInitialGreeting();
  };

  function appendUserMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.insertAdjacentHTML(
      'beforeend',
      `<div class="flex justify-end"><div class="bg-[var(--crimson-btn)] text-white rounded-2xl rounded-tr-none px-3.5 py-2 max-w-[85%] text-xs font-medium">${escapeHtml(text)}</div></div>`
    );
    container.scrollTop = container.scrollHeight;
  }

  function findBestAnswer(query) {
    const clean = query.toLowerCase().trim();

    if (/^(hi|hello|hey|yo|sup|namaste|morning|evening|howdy)($|\s|[!?.])/i.test(clean)) {
      return {
        title: 'Tixora AI',
        answer: 'Ask me about tour dates, venues, setlists, or promoter UPI payouts.',
        actions: [
          { label: 'Anyma Mumbai', action: "askQuestion('Anyma venue and timings')" },
          { label: 'GNR Songs', action: "askQuestion('Guns N Roses popular songs')" },
          { label: 'Promoter Payouts', action: "askQuestion('How fast are UPI payouts?')" }
        ]
      };
    }

    const ev = TIXORA_EVENTS_DB.find((item) => item.names.some((n) => clean.includes(n)));
    if (ev) {
      if (/song|songs|track|tracks|hit|hits|music|setlist|album/i.test(clean)) {
        return {
          title: `${ev.artist} — Top Songs & Hits`,
          answer: `<ol class="space-y-1 text-xs text-[var(--ink)]">${ev.topSongs
            .map((s, idx) => `<li><strong>${idx + 1}.</strong> ${escapeHtml(s)}</li>`)
            .join('')}</ol><p class="text-[11px] text-[var(--muted)] mt-2">Live at ${escapeHtml(ev.venue.split(',')[0])} on ${escapeHtml(ev.date)}.</p>`,
          actions: [
            { label: 'Venue & Timings', action: `askQuestion('${ev.artist} venue and timings')` },
            { label: 'Show Poster', action: `askQuestion('${ev.artist} poster')` }
          ]
        };
      }
      if (/venue|where|location|city|stadium|racecourse|arena/i.test(clean)) {
        return {
          title: `${ev.artist} — Venue & Location`,
          answer: `<div class="space-y-1 text-xs"><div><strong>Venue:</strong> ${escapeHtml(ev.venue)}</div><div><strong>Date:</strong> ${escapeHtml(ev.date)}</div><div><strong>Timings:</strong> ${escapeHtml(ev.timings)}</div></div>`,
          actions: [{ label: 'Top Songs', action: `askQuestion('${ev.artist} popular songs')` }]
        };
      }
      if (/time|timings|timing|schedule|when|gate|gates|door/i.test(clean)) {
        return {
          title: `${ev.artist} — Timings & Schedule`,
          answer: `<div class="space-y-1 text-xs"><div><strong>Date:</strong> ${escapeHtml(ev.date)}</div><div><strong>Schedule:</strong> ${escapeHtml(ev.timings)}</div><div><strong>Venue:</strong> ${escapeHtml(ev.venue)}</div></div>`,
          actions: [{ label: 'Show Poster', action: `askQuestion('${ev.artist} poster')` }]
        };
      }
      if (/poster|posters|image|photo|banner|artwork/i.test(clean)) {
        return {
          title: `${ev.artist} — Official Tour Visual`,
          answer: `<div class="space-y-2"><img src="${ev.poster}" alt="${escapeHtml(ev.posterAlt)}" width="240" height="160" loading="lazy" class="w-full h-auto rounded-xl object-cover border border-[var(--line)]"><div class="text-xs font-semibold text-[var(--ink)]">${escapeHtml(ev.tour)}</div><div class="text-[11px] text-[var(--muted)]">${escapeHtml(ev.date)} • ${escapeHtml(ev.venue.split(',')[0])}</div></div>`,
          actions: [{ label: 'Venue & Timings', action: `askQuestion('${ev.artist} venue and timings')` }]
        };
      }
      return {
        title: ev.tour,
        answer: `<p class="text-xs text-[var(--muted)]">${escapeHtml(ev.overview)}</p><div class="space-y-1 text-xs mt-2"><div><strong>Date:</strong> ${escapeHtml(ev.date)}</div><div><strong>Venue:</strong> ${escapeHtml(ev.venue)}</div><div><strong>MRP:</strong> ${escapeHtml(ev.mrp)}</div><div><strong>Promoter Yield:</strong> ${escapeHtml(ev.promoterYield)}</div></div>`,
        actions: [
          { label: 'Top Songs', action: `askQuestion('${ev.artist} popular songs')` },
          { label: 'Show Poster', action: `askQuestion('${ev.artist} poster')` }
        ]
      };
    }

    if (/commission|earn|yield|rate|tier/i.test(clean)) {
      return {
        title: 'Promoter Commission Structure',
        answer:
          '<div class="space-y-1 text-xs">• <strong>Tier 1 (Scout):</strong> 8.0%<br>• <strong>Tier 2 (Capo):</strong> 11.0%<br>• <strong>Tier 3 (Syndicate):</strong> 13.5%<br>• <strong>Tier 4 (Patron):</strong> 16.0%<br>Zero deposit required. Automated UPI payouts under 60s.</div>',
        actions: [{ label: 'Open Promoter Portal', action: "openModal('promoter-modal')" }]
      };
    }

    if (/payout|upi|settle|withdraw|bank/i.test(clean)) {
      return {
        title: 'Instant UPI Settlement (<60s)',
        answer:
          '<div class="space-y-1 text-xs">Commissions clear via NPCI direct settlement within <strong>&lt;60 seconds</strong> of venue turnstile scan directly to your registered UPI VPA.</div>',
        actions: [{ label: 'Register UPI Handle', action: "openModal('promoter-modal')" }]
      };
    }

    return {
      title: 'Tixora AI',
      answer: 'Try asking about an artist, venue, setlist, or promoter commission rates.',
      actions: [
        { label: 'Anyma Mumbai', action: "askQuestion('Anyma venue and timings')" },
        { label: 'Promoter Payouts', action: "askQuestion('How fast are UPI payouts?')" }
      ]
    };
  }

  function appendBotResponse(item) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const actionsHtml =
      item.actions && item.actions.length
        ? `<div class="pt-2 flex flex-wrap gap-1.5">${item.actions
            .map(
              (act) =>
                `<button type="button" onclick="${act.action}" class="px-2.5 py-1 rounded-full bg-[var(--bg-card)] hover:bg-[var(--crimson-btn)] hover:text-white border border-[var(--line)] text-[var(--ink)] text-[11px] font-medium transition-colors">${escapeHtml(act.label)} &rarr;</button>`
            )
            .join('')}</div>`
        : '';

    container.insertAdjacentHTML(
      'beforeend',
      `<div class="flex items-start gap-2.5">
        <div class="w-7 h-7 rounded-full bg-[var(--crimson-btn)] text-white flex items-center justify-center flex-shrink-0 mt-0.5"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i></div>
        <div class="bg-[var(--soft)] border border-[var(--line)] rounded-2xl rounded-tl-none p-3.5 space-y-2 text-[var(--ink)] max-w-[88%] leading-relaxed text-xs">
          ${item.title ? `<div class="font-bold text-[var(--ink)] pb-1 border-b border-[var(--line)]">${escapeHtml(item.title)}</div>` : ''}
          <div>${item.answer}</div>
          ${actionsHtml}
        </div>
      </div>`
    );

    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    container.scrollTop = container.scrollHeight;
  }

  window.askQuestion = function (query) {
    if (!isChatOpen) window.toggleChatbot();
    appendUserMessage(query);
    const typing = document.getElementById('chat-typing');
    if (typing) typing.classList.remove('hidden');
    setTimeout(() => {
      if (typing) typing.classList.add('hidden');
      appendBotResponse(findBestAnswer(query));
    }, 240);
  };

  window.handleChatSubmit = function (e) {
    if (e) e.preventDefault();
    const input = document.getElementById('chat-input');
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;
    input.value = '';
    window.askQuestion(query);
  };

  /* =========================================================================
     11. PROMOTER AUTH UI CONTROLLER (Preserves Cart & Mobile Buttons!)
     ========================================================================= */
  let _lastAttemptedEmail = '';

  window.refreshPromoterUI = async function () {
    if (!window.TixoraAuth) return;
    const session = await window.TixoraAuth.getSession();
    const authSlot = document.getElementById('nav-auth-slot');
    const mobileFooter = document.getElementById('mobile-nav-footer');
    const deskView = document.getElementById('promoter-desk-view');
    const authView = document.getElementById('promoter-auth-view');

    if (session && session.user) {
      const role = await window.TixoraAuth.getUserRole(session.user);
      const promoter = await window.TixoraAuth.getPromoterProfile(session.user);

      const displayName =
        (promoter && promoter.full_name) ||
        (session.user.user_metadata && session.user.user_metadata.full_name) ||
        session.user.email.split('@')[0];
      const cutPct = (promoter && promoter.commission_rate) || 8;

      if (authSlot) {
        authSlot.innerHTML = `
          ${role === 'admin' ? `<a href="/admin" class="nav-ops-link"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i><span>Ops Desk</span></a>` : ''}
          <button type="button" onclick="openModal('promoter-modal')" class="nav-promoter-pill">
            <span class="truncate max-w-[110px]">${escapeHtml(displayName)}</span>
            <span class="cart-count-pill">${escapeHtml(String(cutPct))}%</span>
          </button>
          <button type="button" onclick="handlePromoterSignOut()" class="nav-signout-btn" aria-label="Sign Out of Promoter Desk">
            <i data-lucide="log-out" class="w-4 h-4"></i>
          </button>
        `;
      }

      if (mobileFooter) {
        mobileFooter.innerHTML = `
          <button type="button" onclick="toggleMobileMenu(false); openModal('promoter-modal')" class="btn-editorial-primary">
            ${escapeHtml(displayName)} (${escapeHtml(String(cutPct))}%)
          </button>
          ${role === 'admin' ? `<a href="/admin" onclick="toggleMobileMenu(false)" class="btn-editorial-outline-light">Ops Desk</a>` : ''}
          <button type="button" onclick="toggleMobileMenu(false); handlePromoterSignOut()" class="btn-editorial-outline-light">Sign Out</button>
        `;
      }

      if (deskView && authView) {
        deskView.classList.remove('hidden');
        authView.classList.add('hidden');

        const nameEl = document.getElementById('desk-promoter-name');
        const subEl = document.getElementById('desk-promoter-sub');
        const tierEl = document.getElementById('desk-tier-badge');
        const refInput = document.getElementById('desk-referral-input');
        const passesEl = document.getElementById('desk-passes-cleared');
        const earnEl = document.getElementById('desk-lifetime-earnings');
        const upiEl = document.getElementById('desk-upi-id');
        const adminLink = document.getElementById('desk-admin-link');
        const waBtn = document.getElementById('desk-whatsapp-btn');

        const refCode =
          (promoter && promoter.referral_code) || `TIX-${session.user.email.split('@')[0].toUpperCase()}`;
        const referralUrl = `${window.location.origin}/?ref=${refCode}`;

        if (nameEl) nameEl.textContent = (promoter && promoter.full_name) || session.user.email;
        if (subEl) subEl.textContent = session.user.email || '';
        if (tierEl)
          tierEl.textContent =
            promoter && promoter.tier_name
              ? `${promoter.tier_name} Tier (${promoter.commission_rate}% Cut)`
              : 'Active Promoter Tier';
        if (refInput) refInput.value = referralUrl;
        if (passesEl)
          passesEl.textContent =
            promoter && promoter.total_passes_sold ? promoter.total_passes_sold.toLocaleString() : '0';
        if (earnEl)
          earnEl.textContent =
            promoter && promoter.total_earnings
              ? '₹' + Number(promoter.total_earnings).toLocaleString('en-IN', { minimumFractionDigits: 2 })
              : '₹0.00';
        if (upiEl) upiEl.textContent = (promoter && promoter.upi_id) || 'Registered UPI ID Active';
        if (role === 'admin' && adminLink) adminLink.classList.remove('hidden');
        if (waBtn) {
          const waText = encodeURIComponent(
            `Official concert pass allocations live on Tixora! Book verified BookMyShow tickets via my link: ${referralUrl}`
          );
          waBtn.href = `https://wa.me/?text=${waText}`;
        }
      }
    } else {
      if (authSlot) {
        authSlot.innerHTML = `
          <button type="button" onclick="openModal('promoter-modal')" class="nav-cta-pill">
            Promoter Portal
          </button>
        `;
      }
      if (mobileFooter) {
        mobileFooter.innerHTML = `
          <button type="button" onclick="toggleMobileMenu(false); openModal('promoter-modal')" class="btn-editorial-primary">Promoter Portal</button>
          <button type="button" onclick="toggleMobileMenu(false); if (window.TixoraCart) { TixoraCart.openCart(); }" class="btn-editorial-outline-light">Open Cart</button>
        `;
      }
      if (deskView && authView) {
        deskView.classList.add('hidden');
        authView.classList.remove('hidden');
      }
    }

    if (window.TixoraCart && typeof window.TixoraCart.updateBadge === 'function') {
      window.TixoraCart.updateBadge();
    }
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  };

  async function initPromoterAuth() {
    if (!window.TixoraAuth) return;
    window.TixoraAuth.onAuthStateChange(async () => {
      await window.refreshPromoterUI();
    });
    await window.refreshPromoterUI();
  }

  window.switchPromoterAuthTab = function (tab) {
    const btnSignin = document.getElementById('tab-auth-signin');
    const btnSignup = document.getElementById('tab-auth-signup');
    const formSignin = document.getElementById('form-promoter-signin');
    const formSignup = document.getElementById('form-promoter-signup');
    const errBox = document.getElementById('promoter-auth-error');
    const confirmNotice = document.getElementById('promoter-confirm-notice');

    if (errBox) errBox.classList.add('hidden');
    if (confirmNotice) confirmNotice.classList.add('hidden');

    if (tab === 'signin') {
      if (btnSignin) btnSignin.classList.add('is-active');
      if (btnSignup) btnSignup.classList.remove('is-active');
      if (formSignin) formSignin.classList.remove('hidden');
      if (formSignup) formSignup.classList.add('hidden');
    } else {
      if (btnSignup) btnSignup.classList.add('is-active');
      if (btnSignin) btnSignin.classList.remove('is-active');
      if (formSignup) formSignup.classList.remove('hidden');
      if (formSignin) formSignin.classList.add('hidden');
    }
  };

  function showRegistrationSuccessNotice(email) {
    _lastAttemptedEmail = email;
    const confirmNotice = document.getElementById('promoter-confirm-notice');
    const emailTarget = document.getElementById('confirm-target-email');
    const formSignup = document.getElementById('form-promoter-signup');
    const formSignin = document.getElementById('form-promoter-signin');
    const errBox = document.getElementById('promoter-auth-error');

    if (errBox) errBox.classList.add('hidden');
    if (formSignup) formSignup.classList.add('hidden');
    if (formSignin) formSignin.classList.add('hidden');
    if (emailTarget) emailTarget.textContent = email;
    if (confirmNotice) confirmNotice.classList.remove('hidden');
  }

  window.handleResendConfirmation = async function () {
    const email =
      _lastAttemptedEmail ||
      document.getElementById('signin-email')?.value ||
      document.getElementById('signup-email')?.value;
    if (!email) {
      window.showToast('Enter an email address first.');
      return;
    }
    const btn = document.getElementById('btn-resend-confirm');
    if (btn) btn.disabled = true;
    try {
      await window.TixoraAuth.resendConfirmation(email);
      window.showToast(`Verification email sent to ${email}`);
    } catch (err) {
      window.showToast(err.message || 'Could not resend email');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.handlePromoterSignIn = async function (e) {
    e.preventDefault();
    const email = document.getElementById('signin-email')?.value || '';
    const passwordInput = document.getElementById('signin-password');
    const password = passwordInput ? passwordInput.value : '';
    if (passwordInput) passwordInput.value = ''; // Zero Plaintext Protocol

    const errBox = document.getElementById('promoter-auth-error');
    const errText = document.getElementById('promoter-auth-error-text');
    const btn = document.getElementById('btn-signin-submit');

    if (errBox) errBox.classList.add('hidden');
    if (btn) btn.disabled = true;

    try {
      const res = await window.TixoraAuth.signIn(email, password);
      window.showToast(`Signed in as ${res.user.email}`);
      await window.refreshPromoterUI();
    } catch (err) {
      if (err.code === 'email_not_confirmed') {
        showRegistrationSuccessNotice(email);
        if (errText)
          errText.textContent =
            'Email verification pending. Click the link in your inbox, then sign in.';
      } else if (errText) {
        errText.textContent = err.message || 'Invalid email or password.';
      }
      if (errBox) errBox.classList.remove('hidden');

      if (err.code === 'rate_limit' && btn) {
        let countdown = err.retry_after || 900;
        const timer = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = 'Sign In';
          } else {
            btn.textContent = `Locked: Retry in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;
          }
        }, 1000);
      }
    } finally {
      if (btn && (!errBox || !errBox.textContent.includes('Locked'))) {
        btn.disabled = false;
      }
    }
  };

  window.handlePromoterSignUp = async function (e) {
    e.preventDefault();
    const fullName = (document.getElementById('signup-fullname')?.value || '').trim();
    const phone = (document.getElementById('signup-phone')?.value || '').trim();
    const email = (document.getElementById('signup-email')?.value || '').trim();
    const passwordInput = document.getElementById('signup-password');
    const password = passwordInput ? passwordInput.value : '';
    if (passwordInput) passwordInput.value = ''; // Zero Plaintext Protocol
    const city = (document.getElementById('signup-city')?.value || '').trim();
    const upiId = (document.getElementById('signup-upi')?.value || '').trim();

    const errBox = document.getElementById('promoter-auth-error');
    const errText = document.getElementById('promoter-auth-error-text');
    const btn = document.getElementById('btn-signup-submit');

    if (errBox) errBox.classList.add('hidden');

    const phoneDigits = phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 10) {
      if (errText) errText.textContent = 'Enter a valid 10-digit WhatsApp number.';
      if (errBox) errBox.classList.remove('hidden');
      return;
    }

    if (!/^[\w.\-]{2,64}@[a-zA-Z]{2,64}$/.test(upiId)) {
      if (errText) errText.textContent = 'Enter a valid UPI ID (e.g. name@oksbi).';
      if (errBox) errBox.classList.remove('hidden');
      return;
    }

    if (password.length < 6) {
      if (errText) errText.textContent = 'Password must be at least 6 characters.';
      if (errBox) errBox.classList.remove('hidden');
      return;
    }

    if (btn) btn.disabled = true;
    try {
      const res = await window.TixoraAuth.signUp({ email, password, fullName, phone, city, upiId, role: 'promoter' });
      if (res && res.emailConfirmationRequired) {
        showRegistrationSuccessNotice(res.email || email);
        window.showToast('Verification link sent to your email.');
      } else {
        window.showToast('Account active. Your referral link is live.');
        await window.refreshPromoterUI();
      }
    } catch (err) {
      if (errText) errText.textContent = err.message || 'Registration failed. Check your details.';
      if (errBox) errBox.classList.remove('hidden');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.handlePromoterSignOut = async function () {
    if (!window.TixoraAuth) return;
    await window.TixoraAuth.signOut();
    window.showToast('Signed out.');
    window.closeModal('promoter-modal');
    await window.refreshPromoterUI();
  };

  window.copyPromoterReferralLink = function () {
    const input = document.getElementById('desk-referral-input');
    const btnText = document.getElementById('copy-btn-text');
    if (!input || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(input.value)
      .then(() => {
        if (btnText) btnText.textContent = 'Copied!';
        window.showToast('Link copied.');
        setTimeout(() => {
          if (btnText) btnText.textContent = 'Copy';
        }, 2500);
      })
      .catch(() => window.showToast('Link copied.'));
  };

  /* =========================================================================
     12. LIVE EVENTS SYNC (Includes renderLiveEvents Fix)
     ========================================================================= */
  window.renderLiveEvents = function (events) {
    if (!Array.isArray(events) || events.length === 0) return;

    let featuredId = null;
    try {
      featuredId = localStorage.getItem('tixora_featured_event_id');
    } catch (e) { }

    const featured =
      events.find((e) => featuredId && String(e.id) === String(featuredId)) ||
      events.find((e) => e.is_featured) ||
      null;

    if (!featured) return;

    const titleEl = document.getElementById('hero-featured-title');
    const venueEl = document.getElementById('hero-featured-venue');
    const mrpEl = document.getElementById('hero-featured-mrp');
    const cutEl = document.getElementById('hero-featured-cut');
    const imgEl = document.getElementById('hero-featured-img');
    const btnEl = document.getElementById('hero-featured-btn');

    const tiers = Array.isArray(featured.ticket_tiers) ? featured.ticket_tiers : [];
    const basePrice = Number(tiers[0]?.price || featured.base_price || 4250);
    const cutPct = Number(tiers[0]?.promoter_cut_pct || 14);
    const earnRs = Math.round((basePrice * cutPct) / 100);
    const venueName =
      featured.venues && featured.venues.name
        ? `${featured.venues.name}, ${featured.venues.city || ''}`.replace(/,\s*$/, '')
        : featured.venue_name || 'Mahalaxmi Racecourse, Mumbai';

    if (titleEl && featured.title) titleEl.textContent = featured.title;
    if (venueEl) venueEl.textContent = venueName;
    if (mrpEl) mrpEl.textContent = '₹' + basePrice.toLocaleString('en-IN');
    if (cutEl) cutEl.textContent = `Earn ₹${earnRs.toLocaleString('en-IN')} / pass`;
    if (imgEl && featured.poster_url) imgEl.src = featured.poster_url;
    if (btnEl && featured.title) {
      btnEl.onclick = () =>
        window.buyTicketModal(featured.title, basePrice, tiers[0]?.name || 'GA Standard');
    }
  };

  async function loadLiveEvents() {
    if (!window.TixoraAuth) return;
    const client = window.TixoraAuth.getClient();
    if (!client) return;

    try {
      const { data: events, error } = await client
        .from('events')
        .select('*, venues(name, city), ticket_tiers(id, name, price, total_quota, available_quota, promoter_cut_pct)')
        .eq('status', 'active')
        .order('event_date', { ascending: true });

      if (!error && events && events.length > 0) {
        window._liveEvents = events;
        window.renderLiveEvents(events);
      }
    } catch (err) { }
  }

  function subscribeToLiveEventsRealtime() {
    if (!window.TixoraAuth) return;
    const client = window.TixoraAuth.getClient();
    if (!client) return;

    try {
      const channel = client.channel('public:events:realtime');
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => {
          await loadLiveEvents();
        })
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || err) {
            try {
              client.removeChannel(channel);
            } catch (e) { }
          }
        });
    } catch (err) { }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'tixora_featured_event_id' || e.key === 'tixora_events_updated') {
      loadLiveEvents();
    }
  });

  /* =========================================================================
     13. SUBPAGE FILTERS (Tours City & Search Filter + FAQ Search)
     ========================================================================= */
  function initToursFilter() {
    const searchInput = document.getElementById('search-input');
    const grid = document.getElementById('tours-grid');
    if (!searchInput || !grid) return;

    const filterBtns = Array.from(document.querySelectorAll('.city-filter-btn'));
    const countBanner = document.getElementById('tours-filter-status');
    const emptyEl = document.getElementById('no-tours-found');
    let activeCity = 'all';

    function runFilter() {
      const query = searchInput.value.toLowerCase().trim();
      const cards = Array.from(grid.querySelectorAll('article[data-city]'));
      let shown = 0;

      cards.forEach((card) => {
        const city = (card.getAttribute('data-city') || '').toLowerCase();
        const searchData = (
          (card.getAttribute('data-search') || '') +
          ' ' +
          (card.getAttribute('data-title') || '') +
          ' ' +
          (card.textContent || '')
        ).toLowerCase();
        const cityOk = activeCity === 'all' || city.includes(activeCity.toLowerCase());
        const textOk = !query || searchData.includes(query);

        if (cityOk && textOk) {
          card.classList.remove('hidden');
          shown++;
        } else {
          card.classList.add('hidden');
        }
      });

      if (countBanner) {
        countBanner.textContent = `Showing ${shown} of ${cards.length} Tours`;
      }
      if (emptyEl) {
        emptyEl.classList.toggle('hidden', shown > 0);
      }
    }

    function setCityFilter(city) {
      activeCity = city || 'all';
      filterBtns.forEach((b) => {
        const isSelected = (b.getAttribute('data-city-filter') || 'all').toLowerCase() === activeCity.toLowerCase();
        b.classList.toggle('is-active', isSelected);
        b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });
      runFilter();
    }

    function resetToursFilters() {
      searchInput.value = '';
      setCityFilter('all');
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        setCityFilter(btn.getAttribute('data-city-filter') || 'all');
      });
    });

    searchInput.addEventListener('input', runFilter);
    window.filterTours = runFilter;
    window.setCityFilter = setCityFilter;
    window.resetToursFilters = resetToursFilters;
    window.resetFilters = resetToursFilters;
    runFilter();
  }

  function initFaqFilter() {
    const faqInput = document.getElementById('faq-search');
    const faqStatus = document.getElementById('faq-filter-status');
    const emptyEl = document.getElementById('no-faq-found');
    const catBtns = Array.from(document.querySelectorAll('.faq-cat-btn'));
    if (!faqInput) return;

    let activeCat = 'all';

    function filterFaq() {
      const q = faqInput.value.toLowerCase().trim();
      const items = Array.from(document.querySelectorAll('.faq-item'));
      let visibleCount = 0;

      items.forEach((item) => {
        const cat = (item.getAttribute('data-cat') || '').toLowerCase();
        const keywords = (item.getAttribute('data-keywords') || '').toLowerCase();
        const catMatch = activeCat === 'all' || cat === activeCat;
        const textMatch = !q || item.textContent.toLowerCase().includes(q) || keywords.includes(q);
        const match = catMatch && textMatch;

        item.classList.toggle('hidden', !match);
        if (match) {
          visibleCount++;
          if (q.length > 2) item.setAttribute('open', '');
        }
      });

      if (faqStatus) {
        faqStatus.textContent = `Showing ${visibleCount} of ${items.length} FAQs`;
      }
      if (emptyEl) {
        emptyEl.classList.toggle('hidden', visibleCount > 0);
      }
    }

    function setFaqCategory(cat) {
      activeCat = (cat || 'all').toLowerCase();
      catBtns.forEach((b) => {
        const bCat = (b.getAttribute('data-cat') || b.getAttribute('data-faq-cat') || 'all').toLowerCase();
        const isSelected = bCat === activeCat;
        b.classList.toggle('is-active', isSelected);
        b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });
      filterFaq();
    }

    function resetFaqFilters() {
      faqInput.value = '';
      setFaqCategory('all');
    }

    catBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetCat = btn.getAttribute('data-cat') || btn.getAttribute('data-faq-cat') || 'all';
        setFaqCategory(targetCat);
      });
    });

    faqInput.addEventListener('input', filterFaq);
    window.filterFaq = filterFaq;
    window.setFaqCategory = setFaqCategory;
    window.resetFaqFilters = resetFaqFilters;
    filterFaq();
  }

  /* =========================================================================
     BOOTSTRAP ON DOM CONTENT LOADED
     ========================================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }

    initScrollProgress();
    initRevealObserver();
    initNavbarState();
    initMobileMenuDismiss();
    initMarqueeControls();
    initGlobalDismissHandlers();
    initLightbox();
    initTourCarousel();
    initHomeCalculator();
    initSubpageCalculator();
    initToursFilter();
    initFaqFilter();
    initCookieBanner();
    renderInitialGreeting();
    const chatInput = document.getElementById('chat-input');
    const chatForm = chatInput && chatInput.closest('form');
    if (chatInput && chatForm) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (e.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          if (typeof chatForm.requestSubmit === 'function') {
            chatForm.requestSubmit();
          } else {
            window.handleChatSubmit(e);
          }
        }
      });
    }
    initPromoterAuth();
    loadLiveEvents();
    subscribeToLiveEventsRealtime();
  });
})(window, document);
