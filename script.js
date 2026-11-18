// PT High-Desert Indonesia — interaksi homepage
(function () {
  // ---------- Bahasa (ID / EN) ----------
  const DICT = window.HD_I18N_EN || {};
  const norm = (v) => v.replace(/\s+/g, ' ').trim();
  let LANG = 'id';
  try { LANG = localStorage.getItem('hd-lang') === 'en' ? 'en' : 'id'; } catch (e) {}
  const t = (v) => (LANG === 'en' && DICT[norm(v)]) || v;
  window.hdT = t;

  const textEntries = [];
  const attrEntries = [];
  const ATTRS = ['aria-label', 'title', 'alt', 'data-title', 'data-desc', 'data-eyebrow', 'data-tags', 'data-image-alt'];
  (function collect() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !n.parentElement.closest('script, style') && DICT[norm(n.nodeValue)]) ? 1 : 3,
    });
    let n; while ((n = walker.nextNode())) textEntries.push({ node: n, orig: n.nodeValue });
    document.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach((el) => {
      ATTRS.forEach((a) => { if (el.hasAttribute(a)) attrEntries.push({ el, a, orig: el.getAttribute(a) }); });
    });
  })();
  const metaDesc = document.querySelector('meta[name="description"]');
  const origTitle = document.title, origDesc = metaDesc ? metaDesc.content : '';
  const tr = (v) => {
    const key = norm(v);
    if (!DICT[key]) return v;
    const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
    return lead + DICT[key] + trail;
  };
  function applyLang(lang, animate) {
    LANG = lang;
    try { localStorage.setItem('hd-lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    const en = lang === 'en';
    textEntries.forEach((x) => { x.node.nodeValue = en ? tr(x.orig) : x.orig; });
    attrEntries.forEach((x) => {
      const v = en ? (x.a === 'data-tags' ? x.orig.split('|').map(tr).join('|') : tr(x.orig)) : x.orig;
      x.el.setAttribute(x.a, v);
    });
    document.title = en ? tr(origTitle) : origTitle;
    if (metaDesc) metaDesc.content = en ? tr(origDesc) : origDesc;
    document.querySelectorAll('.lang-switch').forEach((sw) => {
      sw.classList.toggle('is-en', en);
      sw.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    });
    if (animate) {
      document.body.classList.remove('i18n-fade'); void document.body.offsetWidth;
      document.body.classList.add('i18n-fade');
    }
    document.dispatchEvent(new CustomEvent('hd:lang', { detail: lang }));
  }
  document.querySelectorAll('.lang-switch button').forEach((b) => {
    b.addEventListener('click', () => { if (b.dataset.lang !== LANG) applyLang(b.dataset.lang, true); });
  });
  applyLang(LANG, false);

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const toTop = document.querySelector('.back-to-top');
  const ring = document.querySelector('.ring-progress');
  const RING_LEN = 2 * Math.PI * 22;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Header & back-to-top saat scroll ----------
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(y / max, 1) : 0;

    header.classList.toggle('is-scrolled', y > 40);
    toTop.classList.toggle('is-visible', y > window.innerHeight * 0.6);
    ring.style.strokeDashoffset = RING_LEN * (1 - progress);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  // ---------- Tombol back to top (floating + footer) ----------
  document.querySelectorAll('.js-totop').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  // ---------- Scroll reveal ----------
  const reveals = document.querySelectorAll('.reveal, .slide-in, .slide-up, .timeline, [data-carousel]');
  const revealTargets = reduceMotion ? [] : [...reveals];
  if ('IntersectionObserver' in window && revealTargets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          // hapus delay stagger setelah muncul agar efek hover terasa instan
          el.addEventListener('transitionend', () => { el.style.transitionDelay = '0s'; el.style.setProperty('--d', '0s'); }, { once: true });
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight - 40) el.classList.add('is-visible');
      io.observe(el);
    });
    reveals.forEach((el) => {
      if (!revealTargets.includes(el)) el.classList.add('is-visible');
    });
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  // ---------- Menu mobile ----------
  const toggle = document.querySelector('.nav-toggle');
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('.main-nav a').forEach((a) => {
    a.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // ---------- Highlight menu aktif sesuai section ----------
  const links = [...document.querySelectorAll('.main-nav a')];
  const sections = links
    .filter((a) => (a.getAttribute('href') || '').startsWith('#'))
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window && !document.body.matches('.page-about, .page-business, .page-quality, .page-network, .page-contact')) {
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = '#' + entry.target.id;
          links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => navIO.observe(s));
  }

  // ---------- Counter angka (mis. 1986) ----------
  const counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    const to = +el.dataset.count;
    const from = +(el.dataset.from || 0);
    const dur = 1600;
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    const cIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { runCounter(e.target); cIO.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => { el.textContent = el.dataset.from || 0; cIO.observe(el); });
  }

  // ---------- Video latar: autoplay (muted), putar hanya saat terlihat ----------
  document.querySelectorAll('video[autoplay]').forEach((v) => {
    v.muted = true; v.playsInline = true; // wajib untuk autoplay di Safari/iOS
    let visible = true;
    const tryPlay = () => { if (!visible) return; const p = v.play(); if (p) p.catch(() => armGesture()); };
    // Fallback: kalau browser memblokir autoplay (mis. Low Power Mode), putar saat interaksi pertama
    let armed = false;
    function armGesture() {
      if (armed) return; armed = true;
      const go = () => { ['click', 'touchstart', 'keydown'].forEach((t) => window.removeEventListener(t, go)); armed = false; tryPlay(); };
      ['click', 'touchstart', 'keydown'].forEach((t) => window.addEventListener(t, go, { passive: true }));
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) tryPlay(); else v.pause();
      }, { threshold: 0.15 }).observe(v);
    } else {
      tryPlay();
    }
  });

  // ---------- Parallax halus pada gambar ----------
  const parallaxEls = document.querySelectorAll('.parallax');
  if (parallaxEls.length && !reduceMotion) {
    let pTick = false;
    function updateParallax() {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const progress = (r.top + r.height / 2 - vh / 2) / vh; // -1 .. 1
        const amt = +(el.dataset.parallax || 40);
        el.style.transform = 'translate3d(0,' + (progress * -amt).toFixed(1) + 'px,0)';
      });
      pTick = false;
    }
    window.addEventListener('scroll', () => {
      if (!pTick) { requestAnimationFrame(updateParallax); pTick = true; }
    }, { passive: true });
    updateParallax();
  }

  // ---------- Galeri gambar pilar kualitas ----------
  const qGallery = document.querySelector('.q-pillars');
  if (qGallery) {
    const cards = [...qGallery.querySelectorAll('[data-q-pillar]')];
    const frames = [...qGallery.querySelectorAll('.q-img-frame')];
    const autoplayToggle = qGallery.querySelector('.q-autoplay-toggle');
    if (cards.length && frames.length === 2) {
      const imageCache = new Map();
      function preloadImage(source) {
        let image = imageCache.get(source);
        if (!image) {
          image = new Image();
          image.src = source;
          imageCache.set(source, image);
        }
        return image;
      }

      function preloadGalleryImages() {
        cards.forEach((card) => preloadImage(card.dataset.image));
      }

      let activeIndex = Math.max(0, cards.findIndex((card) => card.classList.contains('is-active')));
      let activeFrame = Math.max(0, frames.findIndex((frame) => frame.classList.contains('is-active')));
      let requestId = 0;
      let galleryVisible = false;
      let pointerInside = false;
      let userPaused = reduceMotion;
      let autoPlayTimer = 0;

      function updateAutoplayToggle() {
        if (!autoplayToggle) return;
        autoplayToggle.hidden = false;
        autoplayToggle.setAttribute('aria-label', t(userPaused ? 'Lanjutkan tayangan otomatis' : 'Jeda tayangan otomatis'));
        autoplayToggle.setAttribute('aria-pressed', String(userPaused));
        autoplayToggle.querySelector('.q-play-icon').hidden = !userPaused;
        autoplayToggle.querySelector('.q-pause-icon').hidden = userPaused;
      }

      updateAutoplayToggle();
      autoplayToggle.addEventListener('click', () => {
        userPaused = !userPaused;
        updateAutoplayToggle();
        if (userPaused) stopAutoPlay();
        else startAutoPlay();
      });
      document.addEventListener('hd:lang', updateAutoplayToggle);

      function selectPillar(index) {
        if (index === activeIndex) {
          requestId++;
          return;
        }
        const card = cards[index];
        const image = preloadImage(card.dataset.image);
        const request = ++requestId;

        function showImage() {
          if (request !== requestId) return;
          const nextFrameIndex = 1 - activeFrame;
          const nextFrame = frames[nextFrameIndex];
          const currentFrame = frames[activeFrame];
          nextFrame.src = card.dataset.image;
          nextFrame.alt = card.dataset.imageAlt;
          nextFrame.removeAttribute('aria-hidden');
          requestAnimationFrame(() => {
            if (request !== requestId) return;
            nextFrame.classList.add('is-active');
            currentFrame.classList.remove('is-active');
            currentFrame.setAttribute('aria-hidden', 'true');
            activeFrame = nextFrameIndex;
            activeIndex = index;
            cards.forEach((item, itemIndex) => {
              const isActive = itemIndex === index;
              item.classList.toggle('is-active', isActive);
              item.setAttribute('aria-pressed', String(isActive));
            });
          });
        }

        if (image.complete && image.naturalWidth) {
          showImage();
        } else if (image.complete) {
          console.error('Gagal memuat gambar pilar kualitas:', card.dataset.image);
        } else {
          image.addEventListener('load', showImage, { once: true });
          image.addEventListener('error', () => {
            console.error('Gagal memuat gambar pilar kualitas:', card.dataset.image);
          }, { once: true });
        }
      }

      function stopAutoPlay() {
        window.clearInterval(autoPlayTimer);
        autoPlayTimer = 0;
      }

      function startAutoPlay() {
        const focusPaused = qGallery.contains(document.activeElement) && document.activeElement !== autoplayToggle;
        if (userPaused || !galleryVisible || pointerInside || document.hidden || autoPlayTimer || focusPaused) return;
        autoPlayTimer = window.setInterval(() => {
          selectPillar((activeIndex + 1) % cards.length);
        }, 5000);
      }

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoPlay();
        else startAutoPlay();
      });

      qGallery.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse') return;
        pointerInside = true;
        stopAutoPlay();
      });
      qGallery.addEventListener('pointerleave', (event) => {
        if (event.pointerType !== 'mouse') return;
        pointerInside = false;
        startAutoPlay();
      });
      qGallery.addEventListener('focusin', stopAutoPlay);
      qGallery.addEventListener('focusout', (event) => {
        if (!qGallery.contains(event.relatedTarget)) startAutoPlay();
      });
      cards.forEach((card, index) => {
        card.addEventListener('pointerenter', () => selectPillar(index));
        card.addEventListener('focus', () => selectPillar(index));
        card.addEventListener('click', () => selectPillar(index));
        card.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectPillar(index);
          }
        });
      });

      if ('IntersectionObserver' in window) {
        const galleryObserver = new IntersectionObserver((entries) => {
          galleryVisible = entries.some((entry) => entry.isIntersecting);
          if (galleryVisible) {
            preloadGalleryImages();
            startAutoPlay();
          }
          else stopAutoPlay();
        }, { threshold: 0.15 });
        galleryObserver.observe(qGallery);
      } else {
        galleryVisible = true;
        preloadGalleryImages();
        startAutoPlay();
      }
    }
  }

  // ---------- Carousel aktivitas bisnis ----------
  const businessTrack = document.querySelector('[data-business-slider]');
  if (businessTrack) {
    const businessCards = [...businessTrack.querySelectorAll('.biz-card')];
    const businessDots = [...document.querySelectorAll('.biz-pagination button')];
    let businessScrollFrame = 0;

    function updateBusinessPagination() {
      const trackLeft = businessTrack.getBoundingClientRect().left;
      let activeIndex = 0, nearest = Infinity;
      businessCards.forEach((card, index) => {
        const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
        if (distance < nearest) { nearest = distance; activeIndex = index; }
      });
      businessDots.forEach((dot, index) => {
        dot.setAttribute('aria-current', String(index === activeIndex));
      });
      businessScrollFrame = 0;
    }

    businessDots.forEach((dot, index) => dot.addEventListener('click', () => {
      const trackLeft = businessTrack.getBoundingClientRect().left;
      const cardLeft = businessCards[index].getBoundingClientRect().left;
      businessTrack.scrollTo({
        left: businessTrack.scrollLeft + cardLeft - trackLeft,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }));
    businessTrack.addEventListener('scroll', () => {
      if (!businessScrollFrame) businessScrollFrame = requestAnimationFrame(updateBusinessPagination);
    }, { passive: true });
    window.addEventListener('resize', updateBusinessPagination);
    updateBusinessPagination();
  }

  // ---------- Carousel struktur manajemen ----------
  const teamTrack = document.querySelector('[data-team-slider]');
  if (teamTrack) {
    const teamCards = [...teamTrack.querySelectorAll('.team-card')];
    const teamDots = [...document.querySelectorAll('.team-pagination button')];
    let teamScrollFrame = 0;

    function updateTeamPagination() {
      const trackLeft = teamTrack.getBoundingClientRect().left;
      let activeIndex = 0, nearest = Infinity;
      teamCards.forEach((card, index) => {
        const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
        if (distance < nearest) { nearest = distance; activeIndex = index; }
      });
      teamDots.forEach((dot, index) => {
        dot.setAttribute('aria-current', String(index === activeIndex));
      });
      teamScrollFrame = 0;
    }

    teamDots.forEach((dot, index) => dot.addEventListener('click', () => {
      const trackLeft = teamTrack.getBoundingClientRect().left;
      const cardLeft = teamCards[index].getBoundingClientRect().left;
      teamTrack.scrollTo({
        left: teamTrack.scrollLeft + cardLeft - trackLeft,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }));
    teamTrack.addEventListener('scroll', () => {
      if (!teamScrollFrame) teamScrollFrame = requestAnimationFrame(updateTeamPagination);
    }, { passive: true });
    window.addEventListener('resize', updateTeamPagination);
    updateTeamPagination();
  }

  // ---------- Carousel (tombol, drag, progress) ----------
  document.querySelectorAll('[data-carousel]').forEach((car) => {
    const section = car.closest('section');
    const btns = section.querySelectorAll('.car-btn');
    const bar = section.querySelector('.carousel-progress span');
    const card = car.querySelector('.div-card');
    const stepSize = () => (card ? card.getBoundingClientRect().width + 28 : 320);

    function update() {
      const max = car.scrollWidth - car.clientWidth;
      const p = max > 0 ? car.scrollLeft / max : 1;
      const visible = max > 0 ? car.clientWidth / car.scrollWidth : 1;
      if (bar) {
        bar.style.width = (visible * 100).toFixed(1) + '%';
        bar.style.transform = 'translateX(' + (p * (1 / visible - 1) * 100).toFixed(1) + '%)';
      }
      btns.forEach((b) => {
        const dir = +b.dataset.dir;
        b.disabled = dir < 0 ? car.scrollLeft <= 2 : car.scrollLeft >= max - 2;
      });
    }
    btns.forEach((b) => b.addEventListener('click', () => {
      car.scrollBy({ left: +b.dataset.dir * stepSize(), behavior: reduceMotion ? 'auto' : 'smooth' });
    }));
    car.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    update();

    // drag dengan mouse
    let down = false, startX = 0, startLeft = 0, moved = false;
    car.addEventListener('mousedown', (e) => {
      down = true; moved = false; startX = e.pageX; startLeft = car.scrollLeft;
    });
    window.addEventListener('mousemove', (e) => {
      if (!down) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) { moved = true; car.classList.add('is-dragging'); }
      car.scrollLeft = startLeft - dx;
    });
    window.addEventListener('mouseup', () => {
      if (!down) return;
      down = false;
      car.classList.remove('is-dragging');
      if (moved) {
        // snap ke kartu terdekat
        const s = stepSize();
        car.scrollTo({ left: Math.round(car.scrollLeft / s) * s, behavior: 'smooth' });
      }
    });
  });

  // ---------- Sub nav aktif + indikator ----------
  const subnav = document.querySelector('.subnav');
  if (subnav) {
    const subLinks = [...subnav.querySelectorAll('a')];
    const indicator = subnav.querySelector('.subnav-indicator');
    const targets = subLinks.map((a) => document.querySelector(a.getAttribute('href')));
    function setActive(i) {
      subLinks.forEach((a, j) => a.classList.toggle('is-active', i === j));
      if (indicator) {
        if (i < 0) { indicator.style.opacity = 0; return; }
        const a = subLinks[i];
        indicator.style.opacity = 1;
        indicator.style.width = a.offsetWidth + 'px';
        indicator.style.transform = 'translateX(' + a.offsetLeft + 'px)';
        // geser hanya baris subnav (bukan halaman) agar link aktif terlihat di HP
        const inner = a.parentElement;
        if (inner.scrollWidth > inner.clientWidth) {
          inner.scrollTo({ left: a.offsetLeft - (inner.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' });
        }
      }
    }
    let current = -2;
    function onSubScroll() {
      const line = 180;
      let idx = -1;
      targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= line) idx = i; });
      if (idx !== current) { current = idx; setActive(idx); }
    }
    window.addEventListener('scroll', () => requestAnimationFrame(onSubScroll), { passive: true });
    window.addEventListener('resize', () => { current = -2; onSubScroll(); });
    onSubScroll();
  }

  // ---------- FAQ accordion dengan animasi tinggi ----------
  document.querySelectorAll('.faq-item').forEach((item) => {
    const summary = item.querySelector('summary');
    const body = item.querySelector('.faq-body');
    summary.addEventListener('click', (e) => {
      if (reduceMotion) return;
      e.preventDefault();
      if (item.open) {
        const h = body.scrollHeight;
        body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.22,.61,.36,1)' })
          .onfinish = () => { item.open = false; };
      } else {
        item.open = true;
        const h = body.scrollHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)' });
      }
    });
  });

  // ---------- Peta jaringan grup (network.html) ----------
  const netMap = document.querySelector('[data-network]');
  if (netMap) {
    const nodes = [...netMap.querySelectorAll('.net-node')];
    const lines = [...netMap.querySelectorAll('.net-lines line')];
    const panel = document.querySelector('.net-panel-inner');
    const out = {
      eyebrow: document.querySelector('[data-panel="eyebrow"]'),
      title: document.querySelector('[data-panel="title"]'),
      desc: document.querySelector('[data-panel="desc"]'),
      tags: document.querySelector('[data-panel="tags"]'),
    };
    let activeKey = 'group';
    function highlight(key) {
      lines.forEach((l) => {
        const keys = (l.dataset.link || '').split(' ');
        l.classList.toggle('is-hot', key === 'group' ? !l.classList.contains('net-flow') : keys.includes(key));
      });
      netMap.classList.toggle('has-focus', true);
    }
    function show(node) {
      const key = node.dataset.node;
      nodes.forEach((n) => n.classList.toggle('is-active', n === node));
      highlight(key);
      if (key === activeKey) return;
      activeKey = key;
      panel.classList.add('is-switching');
      setTimeout(() => {
        out.eyebrow.textContent = node.dataset.eyebrow;
        out.title.textContent = node.dataset.title;
        out.desc.textContent = node.dataset.desc;
        out.tags.innerHTML = '';
        node.dataset.tags.split('|').forEach((t) => {
          const li = document.createElement('li'); li.textContent = t; out.tags.appendChild(li);
        });
        panel.classList.remove('is-switching');
      }, 220);
    }
    // saat bahasa diganti, isi panel ikut diperbarui
    document.addEventListener('hd:lang', () => {
      const cur = nodes.find((n) => n.dataset.node === activeKey);
      if (!cur) return;
      activeKey = null; show(cur);
    });
    nodes.forEach((n) => {
      n.addEventListener('mouseenter', () => show(n));
      n.addEventListener('focus', () => show(n));
      n.addEventListener('click', () => show(n));
    });
  }

  // ---------- Halaman kontak ----------
  const form = document.querySelector('.contact-form');
  if (form) {
    const radios = [...form.querySelectorAll('input[name="topik"]')];
    const topicCards = [...document.querySelectorAll('.topic-card')];
    function selectTopic(value, scroll) {
      const r = radios.find((x) => x.value === value);
      if (!r) return;
      r.checked = true;
      topicCards.forEach((c) => c.classList.toggle('is-selected', c.dataset.topic === value));
      if (scroll) {
        form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        setTimeout(() => form.querySelector('#f-nama').focus({ preventScroll: true }), 700);
      }
    }
    topicCards.forEach((c) => c.addEventListener('click', () => selectTopic(c.dataset.topic, true)));
    radios.forEach((r) => r.addEventListener('change', () => selectTopic(r.value, false)));
    const qTopic = new URLSearchParams(location.search).get('topik');
    selectTopic(qTopic || 'kerja-sama', false);

    // hitung karakter pesan
    const msg = form.querySelector('#f-pesan');
    const counter = form.querySelector('[data-count-chars]');
    msg.addEventListener('input', () => { counter.textContent = msg.value.length; });

    // validasi
    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    function validate() {
      let ok = true;
      form.querySelectorAll('.field').forEach((f) => {
        const input = f.querySelector('input, textarea');
        let bad = input.required && !input.value.trim();
        if (!bad && input.type === 'email' && input.value) bad = !emailOk(input.value.trim());
        f.classList.remove('has-error');
        if (bad) { void f.offsetWidth; f.classList.add('has-error'); ok = false; }
      });
      const consent = form.querySelector('input[name="persetujuan"]');
      form.querySelector('.consent-error').classList.toggle('show', !consent.checked);
      if (!consent.checked) ok = false;
      return ok;
    }
    form.querySelectorAll('input, textarea').forEach((el) => {
      el.addEventListener('input', () => el.closest('.field') && el.closest('.field').classList.remove('has-error'));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate()) {
        const firstErr = form.querySelector('.has-error input, .has-error textarea');
        if (firstErr) firstErr.focus();
        return;
      }
      form.classList.add('is-sending');
      const endpoint = form.dataset.endpoint;
      try {
        if (endpoint) {
          const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error('Gagal mengirim');
        } else {
          await new Promise((r) => setTimeout(r, 900)); // mode demo (belum ada endpoint)
        }
        form.classList.add('is-sent');
      } catch (err) {
        alert(t('Maaf, pesan belum terkirim. Silakan coba lagi.'));
      } finally {
        form.classList.remove('is-sending');
      }
    });
    form.querySelector('.js-form-reset').addEventListener('click', () => {
      form.reset(); counter.textContent = 0;
      form.classList.remove('is-sent');
      selectTopic('kerja-sama', false);
    });
  }

  // salin alamat
  document.querySelectorAll('.copy-btn').forEach((b) => {
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        const t = b.textContent; b.textContent = t('Alamat disalin ✓'); b.classList.add('is-copied');
        setTimeout(() => { b.textContent = t; b.classList.remove('is-copied'); }, 1800);
      } catch (e) { /* clipboard tidak tersedia */ }
    });
  });

  // ---------- Tahun otomatis ----------
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
