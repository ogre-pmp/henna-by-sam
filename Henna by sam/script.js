/* ===================================================
   HENNA BY SAM — script.js
   i18n engine, RTL toggling, localStorage persistence,
   scroll animations, navbar, testimonials,
   gallery lightbox, mobile menu, form handling
   =================================================== */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────
     i18n ENGINE
  ───────────────────────────────────────────────── */
  var I18n = {

    currentLang: localStorage.getItem('hbs-lang') || 'en',

    /* Dot-notation key lookup */
    t: function (key) {
      var parts = key.split('.');
      var obj   = (window.I18N_LOCALES || {})[this.currentLang];
      for (var i = 0; i < parts.length; i++) {
        if (obj == null) return key;
        obj = obj[parts[i]];
      }
      return (typeof obj === 'string') ? obj : key;
    },

    /* Apply all translations + direction to the page */
    apply: function () {
      var lang  = this.currentLang;
      var isRtl = (lang === 'ar');

      /* 1. HTML lang + dir */
      document.documentElement.lang = lang;
      document.documentElement.dir  = isRtl ? 'rtl' : 'ltr';

      /* 2. Text content */
      var i18nEls = document.querySelectorAll('[data-i18n]');
      for (var i = 0; i < i18nEls.length; i++) {
        var el   = i18nEls[i];
        var text = this.t(el.dataset.i18n);
        if (text !== el.dataset.i18n) el.textContent = text;
      }

      /* 3. Placeholders */
      var phEls = document.querySelectorAll('[data-i18n-placeholder]');
      for (var j = 0; j < phEls.length; j++) {
        var phEl  = phEls[j];
        var phTxt = this.t(phEl.dataset.i18nPlaceholder);
        if (phTxt !== phEl.dataset.i18nPlaceholder) phEl.placeholder = phTxt;
      }

      /* 4. aria-label */
      var ariaEls = document.querySelectorAll('[data-i18n-aria]');
      for (var k = 0; k < ariaEls.length; k++) {
        var ariaEl  = ariaEls[k];
        var ariaTxt = this.t(ariaEl.dataset.i18nAria);
        if (ariaTxt !== ariaEl.dataset.i18nAria) ariaEl.setAttribute('aria-label', ariaTxt);
      }

      /* 5. Sync both lang switcher labels */
      var langLabel       = document.getElementById('lang-label');
      var mobileLangLabel = document.getElementById('mobile-lang-label');
      var langLabelTxt    = this.t('nav.langBtn');
      if (langLabel)       langLabel.textContent       = langLabelTxt;
      if (mobileLangLabel) mobileLangLabel.textContent = langLabelTxt;

      /* 6. Arabic body class for font switching */
      if (isRtl) {
        document.body.classList.add('lang-ar');
      } else {
        document.body.classList.remove('lang-ar');
      }
    },

    /* Toggle between en ↔ ar */
    toggle: function () {
      this.currentLang = (this.currentLang === 'en') ? 'ar' : 'en';
      localStorage.setItem('hbs-lang', this.currentLang);
      this.apply();
    }
  };

  /* Apply on page load (restores localStorage preference) */
  I18n.apply();

  /* Wire up both switcher buttons */
  var langSwitcher       = document.getElementById('lang-switcher');
  var mobileLangSwitcher = document.getElementById('mobile-lang-switcher');
  if (langSwitcher)       langSwitcher.addEventListener('click', function () { I18n.toggle(); });
  if (mobileLangSwitcher) mobileLangSwitcher.addEventListener('click', function () { I18n.toggle(); closeMobileNav(); });

  /* ─── Navbar scroll behaviour ─── */
  var navbar = document.getElementById('navbar');

  function onScroll() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ─── Mobile nav ─── */
  var hamburger   = document.getElementById('nav-hamburger');
  var mobileNav   = document.getElementById('mobile-nav');
  var mobileClose = document.getElementById('mobile-nav-close');
  var mobileLinks = document.querySelectorAll('.mobile-link');

  function openMobileNav() {
    mobileNav.classList.add('open');
    mobileNav.style.display = 'flex';
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('nav-open');
  }

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.body.classList.remove('nav-open');
    setTimeout(function () {
      if (!mobileNav.classList.contains('open')) {
        mobileNav.style.display = 'none';
      }
    }, 400);
  }

  hamburger.addEventListener('click', openMobileNav);
  mobileClose.addEventListener('click', closeMobileNav);
  mobileLinks.forEach(function (link) { link.addEventListener('click', closeMobileNav); });

  mobileNav.addEventListener('click', function (e) {
    if (e.target === mobileNav) closeMobileNav();
  });

  /* ─── Scroll reveal animation ─── */
  var revealEls = document.querySelectorAll('.reveal');

  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach(function (el) { revealObserver.observe(el); });

  /* ─── Testimonial Carousel ─── */
  var slides   = document.querySelectorAll('.testimonial-slide');
  var dots     = document.querySelectorAll('.testimonial-dot');
  var prevBtn  = document.getElementById('testimonial-prev');
  var nextBtn  = document.getElementById('testimonial-next');
  var current  = 0;
  var autoTimer= null;

  function goToSlide(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    dots[current].setAttribute('aria-selected', 'false');

    current = (idx + slides.length) % slides.length;

    slides[current].classList.add('active');
    dots[current].classList.add('active');
    dots[current].setAttribute('aria-selected', 'true');
  }

  function startAuto() {
    autoTimer = setInterval(function () { goToSlide(current + 1); }, 5500);
  }

  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  prevBtn.addEventListener('click', function () { goToSlide(current - 1); resetAuto(); });
  nextBtn.addEventListener('click', function () { goToSlide(current + 1); resetAuto(); });

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () { goToSlide(+dot.dataset.idx); resetAuto(); });
    dot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { goToSlide(+dot.dataset.idx); resetAuto(); }
    });
  });

  startAuto();

  var track = document.querySelector('.testimonial-track');
  track.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
  track.addEventListener('mouseleave', startAuto);

  /* ─── Gallery Lightbox ─── */
  var lightbox      = document.getElementById('lightbox');
  var lightboxImg   = document.getElementById('lightbox-img');
  var lightboxClose = document.getElementById('lightbox-close');
  var galleryItems  = document.querySelectorAll('.gallery-item');

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || I18n.t('lightbox.imgAlt');
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  galleryItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var src = item.dataset.src;
      var alt = item.querySelector('img') ? item.querySelector('img').alt : '';
      openLightbox(src, alt);
    });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var src = item.dataset.src;
        var alt = item.querySelector('img') ? item.querySelector('img').alt : '';
        openLightbox(src, alt);
      }
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });

  /* ─── Toast notification ─── */
  var toast    = document.getElementById('toast');
  var toastMsg = document.getElementById('toast-msg');

  function showToast(message, duration) {
    duration = duration || 4000;
    toastMsg.textContent = message;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, duration);
  }

  /* ─── Contact Form ─── */
  var form      = document.getElementById('contact-form');
  var submitBtn = document.getElementById('form-submit-btn');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstName  = document.getElementById('first-name').value.trim();
    var lastName   = document.getElementById('last-name').value.trim();
    var email      = document.getElementById('email').value.trim();
    var phone      = document.getElementById('phone').value.trim();
    var service    = document.getElementById('service').value;
    var eventDate  = document.getElementById('event-date').value;
    var location   = document.getElementById('location').value.trim();
    var message    = document.getElementById('message').value.trim();

    /* ── Validation ── */
    if (!firstName) {
      showToast(I18n.t('validation.firstName'));
      document.getElementById('first-name').focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast(I18n.t('validation.email'));
      document.getElementById('email').focus();
      return;
    }
    if (!service) {
      showToast(I18n.t('validation.service'));
      document.getElementById('service').focus();
      return;
    }

    submitBtn.textContent = I18n.t('toast.sending');
    submitBtn.disabled    = true;

    /* ── Submit to Supabase ── */
    var row = {
      first_name:  firstName,
      last_name:   lastName,
      email:       email,
      phone:       phone      || null,
      service:     service,
      event_date:  eventDate  || null,
      location:    location   || null,
      message:     message    || null,
      language:    I18n.currentLang,
      submitted_at: new Date().toISOString(),
    };

    var useSupabase = (typeof SupabaseClient !== 'undefined' &&
                       typeof SUPABASE_ANON_KEY !== 'undefined' &&
                       SUPABASE_ANON_KEY !== 'REPLACE_WITH_YOUR_ANON_KEY');

    if (useSupabase) {
      SupabaseClient.insert('enquiries', row).then(function (result) {
        if (result.error) {
          console.error('Supabase error:', result.error);
          showToast(I18n.t('validation.submitError') || 'Something went wrong. Please try again.');
          submitBtn.textContent = I18n.t('form.submit');
          submitBtn.disabled    = false;
        } else {
          submitBtn.textContent  = I18n.t('toast.sent');
          submitBtn.style.background = 'var(--taupe-light)';
          showToast(I18n.t('toast.success'));
          form.reset();
          setTimeout(function () {
            submitBtn.textContent      = I18n.t('form.submit');
            submitBtn.disabled         = false;
            submitBtn.style.background = '';
          }, 3000);
        }
      });
    } else {
      /* Fallback if Supabase is not yet configured */
      setTimeout(function () {
        submitBtn.textContent      = I18n.t('toast.sent');
        submitBtn.style.background = 'var(--taupe-light)';
        showToast(I18n.t('toast.success'));
        form.reset();
        setTimeout(function () {
          submitBtn.textContent      = I18n.t('form.submit');
          submitBtn.disabled         = false;
          submitBtn.style.background = '';
        }, 3000);
      }, 1400);
    }
  });

  /* ─── Smooth active-nav highlighting ─── */
  var sections   = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav-links a');

  var sectionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          navAnchors.forEach(function (a) {
            var href = a.getAttribute('href');
            a.style.color = (href === '#' + id) ? 'var(--taupe)' : '';
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(function (s) { sectionObserver.observe(s); });

  /* ─── Parallax subtle hero botanicals ─── */
  var botanicalLeft  = document.querySelector('.hero-botanical-left');
  var botanicalRight = document.querySelector('.hero-botanical-right');

  window.addEventListener('scroll', function () {
    var sy = window.scrollY;
    var isRtl = document.documentElement.dir === 'rtl';
    if (isRtl) {
      /* In RTL the botanicals are mirrored via CSS; adjust accordingly */
      if (botanicalLeft)  botanicalLeft.style.transform  = 'translateY(calc(-50% + ' + (sy * 0.18) + 'px)) scaleX(-1)';
      if (botanicalRight) botanicalRight.style.transform = 'translateY(calc(-50% + ' + (sy * 0.18) + 'px))';
    } else {
      if (botanicalLeft)  botanicalLeft.style.transform  = 'translateY(calc(-50% + ' + (sy * 0.18) + 'px))';
      if (botanicalRight) botanicalRight.style.transform = 'translateY(calc(-50% + ' + (sy * 0.18) + 'px)) scaleX(-1)';
    }
  }, { passive: true });

})();
