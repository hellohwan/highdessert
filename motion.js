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
      lerp: 0.09,
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

  function restore(el, state) {
    if (!state || el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    el.textContent = '';
    state.originals.forEach((n) => el.appendChild(n));
    el.classList.remove('is-split', 'is-split-in');
  }

  const splitState = new Map();
  headings.forEach((el) => {
    // tinggi baris dipertahankan supaya tidak "melompat" saat dipecah
    splitState.set(el, splitWords(el));
  });

  function playHeading(el) {
    const state = splitState.get(el);
    if (!state || el.classList.contains('is-split-in')) return;
    el.classList.add('is-split-in');
    const total = 1000 + state.count * 45 + 300;
    setTimeout(() => restore(el, state), total);
  }

  // kalau bahasa diganti di tengah animasi, langsung kembalikan teks asli
  document.addEventListener('hd:lang', () => splitState.forEach((s, el) => restore(el, s)));

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
      headings.forEach(playHeading);
      imgs.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    // gambar yang ter-clip tidak terdeteksi IntersectionObserver di Chrome,
    // jadi yang diamati adalah elemen induknya (tidak ter-clip)
    const watch = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        (watch.get(e.target) || []).forEach((el) => {
          if (splitState.has(el)) playHeading(el); else el.classList.add('is-revealed');
        });
        io.unobserve(e.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    const add = (key, el) => { if (!watch.has(key)) { watch.set(key, []); io.observe(key); } watch.get(key).push(el); };
    headings.forEach((el) => add(el, el));
    imgs.forEach((el) => add(el.parentElement || el, el));
  }

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
