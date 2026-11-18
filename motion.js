// PT High-Desert Indonesia — animasi halaman:
// smooth scroll (Lenis), judul muncul per kata, gambar reveal, transisi antar halaman.
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const overlay = document.querySelector('.page-transition');
  const EASE_MS = 900; // durasi tirai transisi (selaras dengan CSS)

  if (overlay) overlay.classList.add('pt-js'); // matikan failsafe CSS
  if (reduceMotion) {
    if (overlay) overlay.classList.add('pt-done');
    return;
  }

  // ---------- 1. Smooth scroll ----------
  let lenis = null;
  if (window.Lenis) {
    const headerH = () => (document.querySelector('.site-header') || {}).offsetHeight || 72;
    lenis = new window.Lenis({
      lerp: 0.14,
      wheelMultiplier: 1,
      autoRaf: true,
      anchors: { offset: -headerH() },
      prevent: (node) => node.closest && node.closest('iframe, .main-nav, [data-lenis-prevent]'),
    });
    root.classList.add('has-lenis');
    window.hdLenis = lenis;
    // tombol "kembali ke atas" memakai Lenis supaya tidak bentrok
    document.querySelectorAll('.js-totop').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        lenis.scrollTo(0, { duration: 1.4 });
      }, true);
    });
    // menu mobile terbuka → hentikan scroll halaman
    new MutationObserver(() => {
      document.body.classList.contains('nav-open') ? lenis.stop() : lenis.start();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // ---------- 2. Judul muncul per kata ----------
  // Teks dipecah per kata hanya selama animasi, lalu node aslinya dikembalikan
  // supaya pergantian bahasa (i18n.js) tetap bekerja.
  const SPLIT_SEL = 'main h2, .bskin-title';
  const headings = [...document.querySelectorAll(SPLIT_SEL)]
    .filter((el) => !el.closest('.page-hero, .hero') && el.textContent.trim());

  function splitWords(el) {
    const originals = [...el.childNodes];
    const frag = document.createDocumentFragment();
    let i = 0;
    const addWords = (text, target) => {
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { target.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'split-w';
        const inner = document.createElement('span');
        inner.textContent = part;
        inner.style.setProperty('--i', i++);
        w.appendChild(inner);
        target.appendChild(w);
      });
    };
    originals.forEach((node) => {
      if (node.nodeType === 3) addWords(node.nodeValue, frag);
      else if (node.nodeType === 1 && node.tagName === 'BR') frag.appendChild(document.createElement('br'));
      else if (node.nodeType === 1) {
        const clone = node.cloneNode(false);
        addWords(node.textContent, clone);
        frag.appendChild(clone);
      }
    });
    el.textContent = '';
    el.appendChild(frag);
    el.classList.add('is-split');
    return { originals, count: i };
  }

  // Pecahan kata dipertahankan supaya animasinya bisa diputar ulang.
  // Saat bahasa diganti, i18n.js memperbarui node teks aslinya → kita pecah ulang dari situ.
  const splitState = new Map();
  headings.forEach((el) => splitState.set(el, splitWords(el)));

  function resplit(el) {
    const old = splitState.get(el);
    const wasIn = el.classList.contains('is-split-in');
    el.textContent = '';
    old.originals.forEach((n) => el.appendChild(n));
    el.classList.remove('is-split', 'is-split-in');
    splitState.set(el, splitWords(el));
    if (wasIn) el.classList.add('is-split-in', 'no-anim');
    requestAnimationFrame(() => el.classList.remove('no-anim'));
  }
  document.addEventListener('hd:lang', () => splitState.forEach((s, el) => resplit(el)));

  // ---------- 3. Gambar reveal + zoom halus ----------
  const IMG_SEL = [
    '.hq-photo', '.intro-photo', '.rd-img-wrap', '.import-img-wrap', '.bskin-img-wrap',
    '.gcg-img-wrap', '.quality-img', '.q-pillar-img', '.research-img', '.div-img-wrap',
    '.std-card-media', '.home-contact-image', '.map-card', '.leader-photo', '.team-photo',
  ].join(',');
  const imgs = [...document.querySelectorAll(IMG_SEL)].filter((el) => !el.closest('.page-hero, .hero'));
  imgs.forEach((el) => el.classList.add('img-reveal'));

  // ---------- Pemicu saat terlihat (dimulai setelah tirai terbuka) ----------
  function startObservers() {
    if (!('IntersectionObserver' in window)) {
      headings.forEach((el) => el.classList.add('is-split-in'));
      imgs.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    // Gambar yang ter-clip tidak terdeteksi IntersectionObserver di Chrome,
    // jadi yang diamati adalah elemen induknya (tidak ter-clip).
    const watch = new Map();
    const show = (el) => el.classList.add(splitState.has(el) ? 'is-split-in' : 'is-revealed');
    const hide = (el) => el.classList.remove('is-split-in', 'is-revealed');
    // masuk layar → putar animasi
    const inIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) (watch.get(e.target) || []).forEach(show); });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    // keluar penuh dari layar (ke atas / ke bawah) → reset, supaya diputar ulang saat kembali
    const outIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (!e.isIntersecting) (watch.get(e.target) || []).forEach(hide); });
    }, { threshold: 0, rootMargin: '0px' });
    const add = (key, el) => {
      if (!watch.has(key)) { watch.set(key, []); inIO.observe(key); outIO.observe(key); }
      watch.get(key).push(el);
    };
    headings.forEach((el) => add(el, el));
    imgs.forEach((el) => add(el.parentElement || el, el));
  }

  // ---------- 5. Animasi terikat scroll (gaya Poch) ----------
  // Nilainya dihitung dari posisi scroll setiap frame, jadi otomatis maju saat
  // scroll turun dan mundur saat scroll naik.
  const DRIFT_SEL = '.fd-cards, .fd-stats, .foundation-cards, .biz-grid, .legacy-panel, .hq-grid, .std-grid, .reg-grid, .entity-grid, .team-grid, .audit-grid, .import-grid';
  const drifts = [...document.querySelectorAll(DRIFT_SEL)].filter((el) => !el.closest('.page-hero, .hero'));
  drifts.forEach((el, i) => { el.dataset.driftDir = i % 2 ? '1' : '-1'; el.classList.add('scrub-drift'); });
  imgs.forEach((el) => el.classList.add('scrub-grow'));

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let vh = window.innerHeight, vw = window.innerWidth;
  window.addEventListener('resize', () => { vh = window.innerHeight; vw = window.innerWidth; });

  // Hanya elemen yang dekat layar yang dihitung (diawasi IntersectionObserver),
  // dan semua pembacaan posisi dilakukan dulu sebelum menulis style → tidak memicu layout berulang.
  const active = new Set();
  const nearIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { active.add(e.target); e.target.classList.add('is-near'); }
      else { active.delete(e.target); e.target.classList.remove('is-near'); }
    });
    requestFrame();
  }, { rootMargin: '150px 0px' });
  drifts.forEach((el) => nearIO.observe(el));
  imgs.forEach((el) => nearIO.observe(el));

  const last = new WeakMap();
  function scrubFrame() {
    ticking = false;
    const mobile = vw <= 960;
    const amt = Math.min(70, vw * 0.05);
    const reads = [];
    active.forEach((el) => reads.push([el, el.getBoundingClientRect()]));
    reads.forEach(([el, r]) => {
      let v;
      if (el.classList.contains('scrub-drift')) {
        if (mobile) { v = ''; }
        else {
          const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
          v = Math.round((0.5 - p) * 2 * amt * +el.dataset.driftDir) + 'px 0';
        }
        if (last.get(el) !== v) { el.style.translate = v; last.set(el, v); }
      } else {
        const q = easeOut(clamp((vh - r.top) / (vh * 0.75), 0, 1));
        v = (Math.round(q * 100) / 100);
        if (last.get(el) === v) return;
        last.set(el, v);
        el.style.scale = (0.86 + 0.14 * v).toFixed(3);
        el.style.opacity = (0.4 + 0.6 * v).toFixed(2);
        el.style.setProperty('--zoom', (1.12 - 0.12 * v).toFixed(3));
      }
    });
  }
  let ticking = false;
  function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(scrubFrame); } }
  if (lenis) lenis.on('scroll', requestFrame);
  else window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);
  requestFrame();

  // ---------- 4. Transisi antar halaman ----------
  let firstVisit = true;
  try { firstVisit = !sessionStorage.getItem('hd-visited'); sessionStorage.setItem('hd-visited', '1'); } catch (e) {}

  function enter() {
    if (!overlay) { startObservers(); return; }
    const hold = firstVisit ? 700 : 150; // kunjungan pertama: tampilkan logo sebentar (loader)
    setTimeout(() => {
      overlay.classList.add('pt-out');
      setTimeout(startObservers, 250);
      setTimeout(() => overlay.classList.add('pt-done'), EASE_MS);
    }, hold);
  }

  function isInternalPageLink(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download') || a.dataset.noTransition !== undefined) return false;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    // tautan ke halaman yang sama (hanya beda #hash) → biarkan smooth scroll
    if (url.pathname === location.pathname && url.search === location.search) return false;
    return url;
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    const url = isInternalPageLink(a, e);
    if (!url || !overlay) return;
    e.preventDefault();
    if (lenis) lenis.stop();
    overlay.classList.remove('pt-out', 'pt-done');
    overlay.classList.add('pt-leave');
    void overlay.offsetWidth;
    overlay.classList.add('pt-in');
    setTimeout(() => { location.href = url.href; }, EASE_MS - 100);
  });

  // kembali via tombol Back (bfcache) → buka lagi tirainya
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted || !overlay) return;
    overlay.classList.remove('pt-leave', 'pt-in');
    overlay.classList.add('pt-out', 'pt-done');
    if (lenis) lenis.start();
  });

  enter();
})();
