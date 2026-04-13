(function () {
  'use strict';

  /* ---------- -1. Track pageview on load ---------- */
  (function trackPageview() {
    fetch('/.netlify/functions/track-pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/' })
    }).catch(() => {});
  })();

  /* ---------- 0. Apply Admin Content Overrides ---------- */
  let adminContent = null; // Store fetched content globally

  async function applyAdminContent() {
    // Fetch content once and cache it
    if (!adminContent) {
      try {
        const res = await fetch('/.netlify/functions/content-get');
        if (res.ok) {
          const data = await res.json();
          if (Object.keys(data).length > 0) {
            adminContent = data;
          }
        }
      } catch (err) {
        // Fall back to localStorage
        const raw = localStorage.getItem('drEsamContent');
        if (raw) {
          try {
            adminContent = JSON.parse(raw);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    if (!adminContent) return;

    try {
      const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      const c = adminContent;

      // Helper: set text of first matching element
      function setText(sel, val) {
        const el = document.querySelector(sel);
        if (el && val) el.textContent = val;
      }
      function setHref(sel, val) {
        const el = document.querySelector(sel);
        if (el && val) el.href = val;
      }

      // Hero
      if (c.hero) {
        const h = c.hero;
        setText('[data-i18n="hero_title_1"]',     lang === 'ar' ? h.title1Ar : h.title1En);
        setText('[data-i18n="hero_title_em"]',    lang === 'ar' ? h.title2Ar : h.title2En);
        setText('[data-i18n="hero_tagline"]',     lang === 'ar' ? h.taglineAr : h.taglineEn);
        setText('[data-i18n="hero_accent_label"]',lang === 'ar' ? h.accentLabelAr : h.accentLabelEn);
        setText('[data-i18n="hero_accent_title"]',lang === 'ar' ? h.accentTitleAr : h.accentTitleEn);
        const stats = document.querySelectorAll('.hero__stat strong');
        if (stats[0] && h.statEpisodes)  stats[0].textContent = h.statEpisodes;
        if (stats[1] && h.statListeners) stats[1].textContent = h.statListeners;
        if (stats[2] && h.statRating)    stats[2].textContent = h.statRating;
      }

      // About
      if (c.about) {
        const a = c.about;
        setText('.host__name',  lang === 'ar' ? a.nameAr : a.nameEn);
        setText('.host__title', lang === 'ar' ? a.roleAr : a.roleEn);
        const bioEl = document.querySelector('.host__bio');
        if (bioEl) bioEl.textContent = lang === 'ar' ? a.bioAr : a.bioEn;
        const credsList = document.querySelector('.host__credentials');
        if (credsList) {
          const creds = (lang === 'ar' ? a.credsAr : a.credsEn).split('\n').filter(Boolean);
          credsList.innerHTML = creds.map(cr => `<li>${cr}</li>`).join('');
        }
      }

      // Settings — WhatsApp links
      if (c.settings && c.settings.whatsapp) {
        const num = c.settings.whatsapp.replace(/\D/g,'');
        document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(a => {
          a.href = `https://wa.me/${num}`;
        });
      }

      // Platform links
      if (c.platforms) {
        const p = c.platforms;
        const map = {
          spotify:   '[data-platform="spotify"]',
          youtube:   '[data-platform="youtube"]',
          tiktok:    '[data-platform="tiktok"]',
          instagram: '[data-platform="instagram"]',
          apple:     '[data-platform="apple"]',
          google:    '[data-platform="google"]'
        };
        Object.entries(map).forEach(([key, sel]) => {
          if (p[key]) setHref(sel, p[key]);
        });
      }

      // Episodes — skip override, let episodes.js handle dynamic loading from Supabase
    } catch(e) { /* ignore parse errors */ }
  }

  // Apply admin content on page load
  applyAdminContent();

  /* ---------- 1. Navbar scroll effect ---------- */
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  /* ---------- 2. Mobile menu toggle + overlay ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const navOverlay = document.getElementById('nav-overlay');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
    navOverlay.classList.toggle('active');
  });

  // Close menu when overlay is clicked
  navOverlay.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
    navOverlay.classList.remove('active');
  });

  // Close menu when a link is clicked
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('open');
      navOverlay.classList.remove('active');
    });
  });

  /* ---------- 2.5. Episode modal functionality ---------- */
  const episodeModal = document.getElementById('episode-modal');
  const episodeModalOverlay = document.getElementById('episode-modal-overlay');
  const episodeModalClose = document.getElementById('episode-modal-close');
  const episodeButtons = document.querySelectorAll('.episode-thumbnail');

  // Open modal when episode is clicked
  episodeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const episodeNum = button.dataset.episode;
      const episodeTitle = button.dataset.title;
      const episodeImage = button.dataset.image;
      const episodeDesc = button.dataset.description;

      // Populate modal
      document.getElementById('episode-modal-number').textContent = `Episode ${episodeNum}`;
      document.getElementById('episode-modal-title').textContent = episodeTitle;
      document.getElementById('episode-modal-image').src = episodeImage;
      document.getElementById('episode-modal-image').alt = episodeTitle;
      document.getElementById('episode-modal-description').textContent = episodeDesc;
      document.getElementById('episode-modal-duration').textContent = `Duration: ~45 minutes`;
      document.getElementById('episode-modal-date').textContent = `Released: 2026`;

      // Show modal
      episodeModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  // Close modal
  function closeEpisodeModal() {
    episodeModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  episodeModalClose.addEventListener('click', closeEpisodeModal);
  episodeModalOverlay.addEventListener('click', closeEpisodeModal);

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && episodeModal.classList.contains('active')) {
      closeEpisodeModal();
    }
  });

  /* ---------- 3. Intersection Observer — reveal animations ---------- */
  const revealEls = document.querySelectorAll(
    '.episode-card, .host__visual, .host__content, .platform-item, .subscribe__content, .subscribe__form-wrap'
  );

  revealEls.forEach((el, index) => {
    el.classList.add('reveal');
    // Stagger with data-delay (1, 2, 3)
    const delay = (index % 3) + 1;
    el.dataset.delay = delay;
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  // Also observe any elements that already have the 'reveal' class in HTML
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  /* ---------- 4. Country → City dynamic dropdown ---------- */
  const citiesByCountry = {
    'UAE': ['Abu Dhabi','Dubai','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain','Al Ain'],
    'Saudi Arabia': ['Riyadh','Jeddah','Makkah','Madinah','Dammam','Khobar','Tabuk','Abha','Taif'],
    'Kuwait': ['Kuwait City','Salmiya','Hawalli','Ahmadi','Farwaniya','Jahra'],
    'Qatar': ['Doha','Al Wakrah','Al Khor','Lusail','Dukhan'],
    'Bahrain': ['Manama','Riffa','Muharraq','Hamad Town','Isa Town'],
    'Oman': ['Muscat','Salalah','Sohar','Nizwa','Sur','Muttrah'],
    'Jordan': ['Amman','Zarqa','Irbid','Aqaba','Petra'],
    'Egypt': ['Cairo','Alexandria','Giza','Sharm El Sheikh','Luxor','Aswan','Hurghada'],
    'Lebanon': ['Beirut','Tripoli','Sidon','Tyre','Jounieh'],
    'Iraq': ['Baghdad','Basra','Erbil','Mosul','Najaf','Karbala'],
    'UK': ['London','Manchester','Birmingham','Edinburgh','Liverpool','Leeds','Glasgow'],
    'USA': ['New York','Los Angeles','Chicago','Houston','Miami','Dallas','Washington DC','San Francisco'],
    'Canada': ['Toronto','Vancouver','Montreal','Calgary','Ottawa'],
    'Australia': ['Sydney','Melbourne','Brisbane','Perth','Adelaide'],
    'Germany': ['Berlin','Munich','Hamburg','Frankfurt','Cologne'],
    'France': ['Paris','Lyon','Marseille','Toulouse','Nice'],
    'Turkey': ['Istanbul','Ankara','Izmir','Antalya','Bursa'],
    'India': ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Dubai'],
    'Pakistan': ['Karachi','Lahore','Islamabad','Peshawar','Quetta'],
  };

  const countrySelect = document.getElementById('sub-country');
  const citySelect   = document.getElementById('sub-city');

  function populateCities(country) {
    citySelect.innerHTML = '<option value="" disabled selected>— Select City —</option>';
    const list = citiesByCountry[country] || [];
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = c;
      citySelect.appendChild(opt);
    });
    if (!list.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Enter city manually';
      opt.disabled = true;
      citySelect.appendChild(opt);
    }
  }

  if (countrySelect) {
    countrySelect.addEventListener('change', () => populateCities(countrySelect.value));
  }

  /* ---------- 5. Subscribe form — Newsletter Signup ---------- */
  const form = document.getElementById('subscribe-form');
  const btn = document.getElementById('sub-btn');
  const btnText = btn.querySelector('.btn__text');
  const btnLoading = btn.querySelector('.btn__loading');
  const message = document.getElementById('sub-message');
  const emailInput = form.querySelector('input[type=email]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.querySelector('#sub-name').value.trim();
    const email = emailInput.value.trim();

    // Validate email
    if (!email || !email.includes('@')) {
      message.hidden = false;
      message.textContent = 'Please enter a valid email address.';
      message.dataset.state = 'error';
      return;
    }

    btnText.hidden = true;
    btnLoading.hidden = false;
    btn.disabled = true;
    message.hidden = true;

    try {
      // Detect country from IP
      let country = null;
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        country = geoData.country_name || null;
      } catch (err) {
        // Silently fail — country is optional
      }

      const res = await fetch('/api/subscriber-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || null, country })
      });

      const data = await res.json();

      if (res.ok) {
        message.hidden = false;
        message.textContent = "You're in! Welcome to the conversation.";
        message.dataset.state = 'success';
        form.reset();
        setTimeout(() => { message.hidden = true; }, 5000);
      } else if (res.status === 400 && data.error.includes('already')) {
        message.hidden = false;
        message.textContent = 'This email is already subscribed.';
        message.dataset.state = 'error';
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (err) {
      message.hidden = false;
      message.textContent = err.message || 'Something went wrong. Please try again.';
      message.dataset.state = 'error';
    } finally {
      btnText.hidden = false;
      btnLoading.hidden = true;
      btn.disabled = false;
    }
  });

  /* ---------- 5. Active link highlighting (based on scroll position) ---------- */
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.navbar__links a[href^="#"]');

  window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach((section) => {
      const top = section.offsetTop - 100;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });

    navAnchors.forEach((a) => {
      a.classList.remove('active');
      if (a.getAttribute('href') === `#${current}`) {
        a.classList.add('active');
      }
    });
  });

  /* ---------- 6. Hero video crossfade cycling ---------- */
  (function initVideoCycle() {
    const vidA = document.getElementById('hero-vid-a');
    const vidB = document.getElementById('hero-vid-b');
    if (!vidA || !vidB) return;

    function switchTo(next, prev) {
      next.currentTime = 0;
      next.play().catch(() => {});
      next.classList.add('hero__video--active');
      prev.classList.remove('hero__video--active');
      // Pause previous after fade completes
      setTimeout(() => { prev.pause(); prev.currentTime = 0; }, 900);
    }

    vidA.addEventListener('ended', () => switchTo(vidB, vidA));
    vidB.addEventListener('ended', () => switchTo(vidA, vidB));

    [vidA, vidB].forEach(v => {
      v.addEventListener('error', () => {
        const frame = v.closest('.hero__video-frame');
        if (frame) frame.classList.add('video-error');
      });
    });
  })();

  /* ---------- 7. Language Toggle (i18n) ---------- */
  (function initI18n() {
    const translations = {
      en: {
        nav_episodes: 'Episodes', nav_about: 'About', nav_services: 'Services',
        nav_listen: 'Listen On', nav_follow: 'Follow the Show',
        hero_kicker: 'DR ESAM PODCAST', hero_title_1: 'Ideas Worth', hero_title_em: 'Hearing.',
        hero_tagline: "Deep conversations at the intersection of culture, leadership, and the Arab world's future.",
        hero_btn_episodes: 'Latest Episodes', hero_btn_listen: 'Where to Listen',
        hero_stat_episodes: 'Episodes', hero_stat_listeners: 'Listeners', hero_stat_rating: 'Rating',
        hero_accent_label: 'New Episode', hero_accent_title: 'The Future of Arab Media',
        ep_kicker: 'Recent Episodes', ep_title: 'All Episodes',
        avail_on: 'Available On',
        host_kicker: 'Your Host', host_name: 'Dr. Esam',
        host_bio: "Dr. Esam is a thought leader, author, and cultural commentator whose conversations have reached audiences across the Arab world and beyond. With a background spanning academia and media, he brings rigorous thinking and genuine curiosity to every episode.",
        host_cred_1: '35+ years in the IT field',
        host_cred_2: 'Speaker at multiple international forums',
        host_cred_3: 'Producer of multiple AI-powered podcasts',
        svc_kicker: 'Professional Production', svc_title: 'Podcast Production Services',
        svc_desc: "Transform your podcast into a professional production. Choose your package, add enhancements, and we'll handle the rest.",
        qc_kicker: 'Instant Quote', qc_title: 'Build Your Package',
        qc_desc: 'Select your options and get a live price — no surprises.',
        qc_step1: '1. Choose a Production Style', qc_step2: '2. Add Enhancements',
        qc_step3: '3. Episode Length', qc_step4: '4. Delivery Speed',
        qc_placeholder: 'Select a production style to see your quote',
        qc_book: 'Book via WhatsApp →',
        hiw_title: 'How It Works',
        hiw_1_title: 'Send Your Raw Files', hiw_1_desc: 'Upload your audio or video recording via a shared link.',
        hiw_2_title: 'We Produce', hiw_2_desc: 'Our team applies your chosen style, add-ons, and brand.',
        hiw_3_title: 'Review & Publish', hiw_3_desc: 'You approve, we deliver all files ready to upload.',
        sub_kicker: 'Stay Close', sub_title: 'Never Miss a Conversation',
        sub_desc: 'New episodes, exclusive content, and notes from Dr. Esam — delivered to your inbox.',
        sub_fname: 'First Name', sub_lname: 'Family Name', sub_email: 'Email',
        sub_contact: 'Phone / WhatsApp', sub_country: 'Country', sub_city: 'City',
        sub_btn: 'Join the Conversation', sub_loading: 'Submitting...',
        sub_note: 'No spam. Unsubscribe anytime.',
        ph_fname: 'Ali', ph_lname: 'Al Mansouri', ph_country: 'UAE', ph_city: 'Dubai',
        footer_tagline: "Deep conversations at the intersection of culture, leadership, and the Arab world's future.",
        footer_copy: '© 2026 DR Esam Podcast. All rights reserved.',
      },
      ar: {
        nav_episodes: 'الحلقات', nav_about: 'عن البرنامج', nav_services: 'الخدمات',
        nav_listen: 'استمع عبر', nav_follow: 'تابع البرنامج',
        hero_kicker: 'بودكاست د. عصام', hero_title_1: 'أفكار تستحق', hero_title_em: 'الاستماع.',
        hero_tagline: 'حوارات عميقة عند تقاطع الثقافة والقيادة ومستقبل العالم العربي.',
        hero_btn_episodes: 'أحدث الحلقات', hero_btn_listen: 'أين تستمع',
        hero_stat_episodes: 'حلقة', hero_stat_listeners: 'مستمع', hero_stat_rating: 'التقييم',
        hero_accent_label: 'حلقة جديدة', hero_accent_title: 'مستقبل الإعلام العربي',
        ep_kicker: 'أحدث الحلقات', ep_title: 'جميع الحلقات',
        avail_on: 'متاح على',
        host_kicker: 'مقدم البرنامج', host_name: 'د. عصام',
        host_bio: 'د. عصام قائد فكري وكاتب ومحلل ثقافي، وصلت حواراته إلى جمهور واسع في أرجاء العالم العربي وما وراءه. بخلفية تجمع بين الأكاديمية والإعلام، يُضفي على كل حلقة تفكيراً عميقاً وفضولاً حقيقياً.',
        host_cred_1: 'أكثر من 35 عاماً في مجال تقنية المعلومات',
        host_cred_2: 'متحدث في منتديات دولية متعددة',
        host_cred_3: 'منتج بودكاست متعدد مدعوم بالذكاء الاصطناعي',
        svc_kicker: 'إنتاج احترافي', svc_title: 'خدمات إنتاج البودكاست',
        svc_desc: 'حوّل بودكاستك إلى إنتاج احترافي. اختر باقتك، أضف التحسينات، وسنتولى الباقي.',
        qc_kicker: 'سعر فوري', qc_title: 'اصنع باقتك',
        qc_desc: 'اختر خياراتك واحصل على سعر فوري — بدون مفاجآت.',
        qc_step1: '١. اختر أسلوب الإنتاج', qc_step2: '٢. أضف تحسينات',
        qc_step3: '٣. مدة الحلقة', qc_step4: '٤. سرعة التسليم',
        qc_placeholder: 'اختر أسلوب الإنتاج لعرض السعر',
        qc_book: 'احجز عبر واتساب →',
        hiw_title: 'كيف يعمل',
        hiw_1_title: 'أرسل ملفاتك الخام', hiw_1_desc: 'ارفع تسجيلك الصوتي أو المرئي عبر رابط مشاركة.',
        hiw_2_title: 'نتولى الإنتاج', hiw_2_desc: 'يطبق فريقنا الأسلوب والإضافات والهوية البصرية.',
        hiw_3_title: 'راجع وانشر', hiw_3_desc: 'تعتمد، ونسلّم جميع الملفات جاهزة للرفع.',
        sub_kicker: 'ابقَ قريباً', sub_title: 'لا تفوّت أي حوار',
        sub_desc: 'حلقات جديدة، محتوى حصري، وملاحظات من د. عصام — مباشرة إلى بريدك.',
        sub_fname: 'الاسم الأول', sub_lname: 'اسم العائلة', sub_email: 'البريد الإلكتروني',
        sub_contact: 'الهاتف / واتساب', sub_country: 'الدولة', sub_city: 'المدينة',
        sub_btn: 'انضم إلى الحوار', sub_loading: 'جارٍ الإرسال...',
        sub_note: 'لا رسائل مزعجة. إلغاء الاشتراك في أي وقت.',
        ph_fname: 'علي', ph_lname: 'المنصوري', ph_country: 'الإمارات', ph_city: 'دبي',
        footer_tagline: 'حوارات عميقة عند تقاطع الثقافة والقيادة ومستقبل العالم العربي.',
        footer_copy: '© ٢٠٢٦ بودكاست د. عصام. جميع الحقوق محفوظة.',
      }
    };

    let currentLang = 'en';
    const langToggle = document.getElementById('lang-toggle');
    const langLabel  = document.getElementById('lang-label');

    function applyLang(lang) {
      const t = translations[lang];
      document.documentElement.lang = lang;
      document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';

      // Text content
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key] !== undefined) el.textContent = t[key];
      });

      // Placeholders
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (t[key] !== undefined) el.placeholder = t[key];
      });

      langLabel.textContent = lang === 'en' ? 'العربية' : 'English';
    }

    langToggle.addEventListener('click', () => {
      currentLang = currentLang === 'en' ? 'ar' : 'en';
      applyLang(currentLang);
      // Re-apply admin content after language change
      applyAdminContent();
    });
  })();

  /* ---------- 9. Hero kicker cycling ---------- */
  (function initKickerCycle() {
    const kicker = document.querySelector('.navbar__brand-text');
    if (!kicker) return;

    const names = {
      en: ['DR ESAM PODCAST', 'DR ESAM TALK'],
      ar: ['بودكاست د. عصام', 'د. عصام توك'],
    };

    let index = 0;

    function cycleName() {
      const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      const list = names[lang];

      // Fade out
      kicker.classList.add('kicker--fade');

      setTimeout(() => {
        // Swap text while invisible
        index = (index + 1) % list.length;
        kicker.textContent = list[index];

        // Fade back in
        kicker.classList.remove('kicker--fade');
      }, 500);
    }

    // Start cycling after the page intro animation settles
    setTimeout(() => {
      setInterval(cycleName, 3000);
    }, 2000);
  })();

  /* ---------- 11. Quote Calculator ---------- */
  (function initQuoteCalc() {
    const USD_TO_AED = 3.67;

    const tierInputs   = document.querySelectorAll('#qc-tiers input[type="radio"]');
    const addonInputs  = document.querySelectorAll('#qc-addons input[type="checkbox"]');
    const lengthSel    = document.getElementById('qc-length');
    const speedSel     = document.getElementById('qc-speed');
    const breakdown    = document.getElementById('qc-breakdown');
    const totalsPanel  = document.getElementById('qc-totals');
    const totalUsd     = document.getElementById('qc-total-usd');
    const totalAed     = document.getElementById('qc-total-aed');
    const bookBtn      = document.getElementById('qc-book-btn');

    if (!breakdown) return;

    function calcTotal() {
      const tierInput = document.querySelector('#qc-tiers input[type="radio"]:checked');
      if (!tierInput) {
        breakdown.innerHTML = '<p class="qc-result__placeholder">Select a production style to see your quote</p>';
        totalsPanel.hidden = true;
        bookBtn.hidden = true;
        return;
      }

      const basePrice  = parseFloat(tierInput.value);
      const tierLabel  = tierInput.dataset.label;
      const lengthMult = parseFloat(lengthSel.value);
      const speedMult  = parseFloat(speedSel.value);

      let addonsTotal = 0;
      const addonLabels = [];
      addonInputs.forEach(cb => {
        if (cb.checked) {
          addonsTotal += parseFloat(cb.value);
          addonLabels.push(cb.dataset.label);
        }
      });

      const subtotal = (basePrice + addonsTotal) * lengthMult * speedMult;
      const usd = Math.ceil(subtotal);
      const aed = Math.ceil(subtotal * USD_TO_AED / 10) * 10;

      // Breakdown tags
      const tags = [tierLabel, ...addonLabels];
      const lengthText = lengthSel.options[lengthSel.selectedIndex].text;
      const speedText  = speedSel.options[speedSel.selectedIndex].text;
      if (lengthMult !== 1.0) tags.push(lengthText);
      if (speedMult  !== 1.0) tags.push(speedText);

      breakdown.innerHTML = `<div class="qc-result__breakdown-items">${
        tags.map(t => `<span class="qc-result__item">${t}</span>`).join('')
      }</div>`;

      totalUsd.textContent = '$' + usd.toLocaleString();
      totalAed.textContent = aed.toLocaleString() + ' AED';
      totalsPanel.hidden = false;

      // Build WhatsApp message
      const msg = encodeURIComponent(
        `Hi, I'd like to book a podcast production package:\n\n` +
        `📦 Package: ${tags.join(', ')}\n` +
        `💵 Quote: $${usd} USD / ${aed} AED\n\n` +
        `Please confirm availability.`
      );
      bookBtn.href = `https://wa.me/971556266639?text=${msg}`;
      bookBtn.hidden = false;
    }

    tierInputs.forEach(r  => r.addEventListener('change', calcTotal));
    addonInputs.forEach(cb => cb.addEventListener('change', calcTotal));
    lengthSel.addEventListener('change', calcTotal);
    speedSel.addEventListener('change',  calcTotal);
  })();

  /* ---------- 12. Contact Form Handler ---------- */
  (function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('contact-status');
      statusEl.textContent = 'Sending...';
      statusEl.className = 'contact__status';

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      try {
        const response = await fetch('/.netlify/functions/contact-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
          statusEl.textContent = 'Message sent successfully! We\'ll get back to you soon.';
          statusEl.classList.add('success');
          form.reset();
        } else {
          statusEl.textContent = result.error || 'Failed to send message. Please try again.';
          statusEl.classList.add('error');
        }
      } catch (error) {
        statusEl.textContent = 'Error sending message. Please try again later.';
        statusEl.classList.add('error');
        console.error('Contact form error:', error);
      }

      setTimeout(() => {
        statusEl.className = 'contact__status';
        statusEl.textContent = '';
      }, 5000);
    });
  })();

  /* ---------- 13. Prefers-reduced-motion support ---------- */
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mql.matches) {
    document.documentElement.classList.add('reduce-motion');
  }

  mql.addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  });
})();
