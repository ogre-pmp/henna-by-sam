/* ===================================================
   HENNA BY SAM — script.js
   i18n + RTL, glass navigation, compact menu,
   reveal-on-scroll (respects Reduce Motion),
   user-controlled testimonial carousel, gallery dialog,
   inline form validation and Supabase submission
   =================================================== */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ─────────────────────────────────────────────────
     i18n ENGINE
  ───────────────────────────────────────────────── */
  function readLang() {
    try { return localStorage.getItem('hbs-lang') || 'en'; } catch (e) { return 'en'; }
  }

  var I18n = {
    currentLang: readLang(),

    t: function (key) {
      var parts = key.split('.');
      var obj = (window.I18N_LOCALES || {})[this.currentLang];
      for (var i = 0; i < parts.length; i++) {
        if (obj == null) return key;
        obj = obj[parts[i]];
      }
      return (typeof obj === 'string') ? obj : key;
    },

    apply: function () {
      var lang = this.currentLang;
      var isRtl = (lang === 'ar');
      var self = this;

      document.documentElement.lang = lang;
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.body.classList.toggle('lang-ar', isRtl);

      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var txt = self.t(el.dataset.i18n);
        if (txt !== el.dataset.i18n) el.textContent = txt;
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        var txt = self.t(el.dataset.i18nPlaceholder);
        if (txt !== el.dataset.i18nPlaceholder) el.placeholder = txt;
      });
      document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        var txt = self.t(el.dataset.i18nAria);
        if (txt !== el.dataset.i18nAria) el.setAttribute('aria-label', txt);
      });

      updateMenuLabel();
      updateCarouselButtons();
    },

    toggle: function () {
      this.currentLang = (this.currentLang === 'en') ? 'ar' : 'en';
      try { localStorage.setItem('hbs-lang', this.currentLang); } catch (e) { /* private mode */ }
      this.apply();
    }
  };

  /* ─────────────────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────────────────── */
  var navShell   = document.getElementById('navbar');
  var menuBtn    = document.getElementById('nav-hamburger');
  var menu       = document.getElementById('mobile-nav');
  var langBtn    = document.getElementById('lang-switcher');
  var mLangBtn   = document.getElementById('mobile-lang-switcher');

  function isMenuOpen() { return menuBtn.getAttribute('aria-expanded') === 'true'; }

  function updateMenuLabel() {
    menuBtn.setAttribute('aria-label', I18n.t(isMenuOpen() ? 'nav.closeMenu' : 'nav.openMenu'));
  }

  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    updateMenuLabel();
  }

  menuBtn.addEventListener('click', function () { setMenu(!isMenuOpen()); });
  menu.querySelectorAll('a.mobile-link').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('click', function (e) {
    if (isMenuOpen() && !navShell.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen()) { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', function (mq) {
    if (mq.matches) setMenu(false);
  });

  langBtn.addEventListener('click', function () { I18n.toggle(); });
  mLangBtn.addEventListener('click', function () { I18n.toggle(); });

  /* Current-section indicator */
  var navAnchors = document.querySelectorAll('.nav-links a');
  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var id = '#' + entry.target.id;
      navAnchors.forEach(function (a) {
        if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(function (s) { sectionObserver.observe(s); });

  /* ─────────────────────────────────────────────────
     REVEAL ON SCROLL
  ───────────────────────────────────────────────── */
  var revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('revealed'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ─────────────────────────────────────────────────
     TESTIMONIAL CAROUSEL (no autoplay; people stay in control)
  ───────────────────────────────────────────────── */
  var track   = document.getElementById('testimonial-track');
  var prevBtn = document.getElementById('testimonial-prev');
  var nextBtn = document.getElementById('testimonial-next');

  function cardStep() {
    var card = track.querySelector('.testimonial-card');
    if (!card) return track.clientWidth;
    var gap = parseFloat(getComputedStyle(track).columnGap) || 20;
    return card.getBoundingClientRect().width + gap;
  }

  /* scrollLeft is negative in RTL in modern browsers; normalise to 0…max */
  function scrollProgress() {
    var max = track.scrollWidth - track.clientWidth;
    return { pos: Math.abs(track.scrollLeft), max: max };
  }

  function updateCarouselButtons() {
    if (!track) return;
    var p = scrollProgress();
    prevBtn.disabled = p.pos <= 2;
    nextBtn.disabled = p.pos >= p.max - 2;
  }

  function scrollCards(dir) {
    var sign = document.documentElement.dir === 'rtl' ? -1 : 1;
    track.scrollBy({ left: dir * sign * cardStep(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  prevBtn.addEventListener('click', function () { scrollCards(-1); });
  nextBtn.addEventListener('click', function () { scrollCards(1); });
  track.addEventListener('scroll', updateCarouselButtons, { passive: true });
  window.addEventListener('resize', updateCarouselButtons);
  track.addEventListener('keydown', function (e) {
    var rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollCards(rtl ? -1 : 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollCards(rtl ? 1 : -1); }
  });

  /* ─────────────────────────────────────────────────
     GALLERY LIGHTBOX (<dialog>)
  ───────────────────────────────────────────────── */
  var lightbox   = document.getElementById('lightbox');
  var lbImg      = document.getElementById('lightbox-img');
  var lbCaption  = document.getElementById('lightbox-caption');
  var lbClose    = document.getElementById('lightbox-close');
  var lbPrev     = document.getElementById('lightbox-prev');
  var lbNext     = document.getElementById('lightbox-next');
  var items      = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
  var lbIndex    = 0;
  var lastFocus  = null;

  function showImage(i) {
    lbIndex = (i + items.length) % items.length;
    var item  = items[lbIndex];
    var img   = item.querySelector('img');
    var label = item.querySelector('.gallery-label');
    lbImg.src = item.dataset.src;
    lbImg.alt = img ? img.alt : I18n.t('lightbox.imgAlt');
    lbCaption.textContent = label ? label.textContent : '';
  }

  function openLightbox(i) {
    lastFocus = document.activeElement;
    showImage(i);
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    if (lightbox.open) lightbox.close();
  }

  lightbox.addEventListener('close', function () {
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  });

  items.forEach(function (item, i) {
    item.addEventListener('click', function () { openLightbox(i); });
  });
  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', function () { showImage(lbIndex - 1); });
  lbNext.addEventListener('click', function () { showImage(lbIndex + 1); });
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  lightbox.addEventListener('keydown', function (e) {
    var rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'ArrowRight') showImage(lbIndex + (rtl ? -1 : 1));
    if (e.key === 'ArrowLeft')  showImage(lbIndex + (rtl ? 1 : -1));
  });

  /* Swipe between images on touch */
  var touchX = null;
  lightbox.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 50) return;
    var rtl = document.documentElement.dir === 'rtl';
    var forward = rtl ? dx > 0 : dx < 0;
    showImage(lbIndex + (forward ? 1 : -1));
  });

  /* ─────────────────────────────────────────────────
     STATUS BANNER
  ───────────────────────────────────────────────── */
  var toast    = document.getElementById('toast');
  var toastMsg = document.getElementById('toast-msg');
  var toastTimer = null;

  function showToast(message, isError) {
    toastMsg.textContent = message;
    toast.classList.toggle('is-error', !!isError);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 4500);
  }

  /* ─────────────────────────────────────────────────
     BOOKING FORM
  ───────────────────────────────────────────────── */
  var form        = document.getElementById('contact-form');
  var submitBtn   = document.getElementById('form-submit-btn');
  var submitLabel = document.getElementById('form-submit-label');
  var serviceSel  = document.getElementById('service');

  /* "Enquire" links pre-select the matching service */
  document.querySelectorAll('[data-service]').forEach(function (link) {
    link.addEventListener('click', function () {
      serviceSel.value = link.dataset.service;
      setFieldError(serviceSel, false);
    });
  });

  function setFieldError(input, show) {
    var errId = input.getAttribute('aria-describedby');
    var err = errId ? document.getElementById(errId) : null;
    if (show) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    if (err) err.hidden = !show;
  }

  /* Clear an error as soon as the person fixes it */
  ['first-name', 'email', 'service'].forEach(function (id) {
    var el = document.getElementById(id);
    var evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, function () {
      if (el.getAttribute('aria-invalid') === 'true') setFieldError(el, false);
    });
  });

  function setSubmitState(state) {
    submitBtn.classList.remove('is-loading', 'is-success');
    submitBtn.disabled = false;
    var key = 'form.submit';
    if (state === 'loading') { submitBtn.classList.add('is-loading'); submitBtn.disabled = true; key = 'toast.sending'; }
    if (state === 'success') { submitBtn.classList.add('is-success'); submitBtn.disabled = true; key = 'toast.sent'; }
    submitLabel.dataset.i18n = key;
    submitLabel.textContent = I18n.t(key);
  }

  function onSuccess() {
    setSubmitState('success');
    showToast(I18n.t('toast.success'));
    form.reset();
    setTimeout(function () { setSubmitState('idle'); }, 3000);
  }

  function onFailure() {
    setSubmitState('idle');
    var msg = I18n.t('validation.submitError');
    showToast(msg === 'validation.submitError' ? 'Something went wrong. Please try again.' : msg, true);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstNameEl = document.getElementById('first-name');
    var emailEl     = document.getElementById('email');

    var firstName = firstNameEl.value.trim();
    var lastName  = document.getElementById('last-name').value.trim();
    var email     = emailEl.value.trim();
    var phone     = document.getElementById('phone').value.trim();
    var service   = serviceSel.value;
    var eventDate = document.getElementById('event-date').value;
    var location  = document.getElementById('location').value.trim();
    var message   = document.getElementById('message').value.trim();

    var badName    = !firstName;
    var badEmail   = !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var badService = !service;

    setFieldError(firstNameEl, badName);
    setFieldError(emailEl, badEmail);
    setFieldError(serviceSel, badService);

    if (badName || badEmail || badService) {
      (badName ? firstNameEl : badEmail ? emailEl : serviceSel).focus();
      return;
    }

    setSubmitState('loading');

    var row = {
      first_name:   firstName,
      last_name:    lastName,
      email:        email,
      phone:        phone     || null,
      service:      service,
      event_date:   eventDate || null,
      location:     location  || null,
      message:      message   || null,
      language:     I18n.currentLang,
      submitted_at: new Date().toISOString()
    };

    var useSupabase = (typeof SupabaseClient !== 'undefined' &&
                       typeof SUPABASE_ANON_KEY !== 'undefined' &&
                       SUPABASE_ANON_KEY !== 'REPLACE_WITH_YOUR_ANON_KEY');

    if (useSupabase) {
      SupabaseClient.insert('enquiries', row).then(function (result) {
        if (result && result.error) {
          console.error('Supabase error:', result.error);
          onFailure();
        } else {
          onSuccess();
        }
      }, function (err) {
        console.error('Supabase error:', err);
        onFailure();
      });
    } else {
      /* Fallback if Supabase is not yet configured */
      setTimeout(onSuccess, 1200);
    }
  });

  /* ─── Initial render ─── */
  I18n.apply();

})();
