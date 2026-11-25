/* Copper Crown Roofing Co.
   hero -> words that light up -> the roof that builds as you scroll -> services -> materials
   -> inspector's view -> recent roofs -> about -> request form */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- nav + menu ---------------- */
  const nav = $('#nav'), menu = $('#menu'), btn = $('#menuBtn');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  btn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------------- intro words ---------------- */
  const words = $('#words');
  words.innerHTML = words.textContent.trim().split(/\s+/).map(w => `<span>${w}</span>`).join(' ');
  const spans = $$('span', words);

  /* ---------------- services ---------------- */
  const items = $$('#svcList li'), view = $('#svcView');
  const pics = items.map(li => {
    const im = new Image(); im.src = $('img', li).getAttribute('src'); im.alt = '';
    view.appendChild(im); return im;
  });
  function pick(i) {
    items.forEach((li, n) => li.classList.toggle('on', n === i));
    pics.forEach((p, n) => p.classList.toggle('on', n === i));
  }
  items.forEach((li, i) => {
    const b = $('button', li);
    b.addEventListener('click', () => pick(i));
    b.addEventListener('focus', () => pick(i));
    li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && innerWidth > 860) pick(i); });
  });
  pick(0);

  /* ---------------- materials ---------------- */
  const mats = $$('.mat');
  const matOn = m => mats.forEach(x => x.classList.toggle('on', x === m));
  mats.forEach(m => {
    m.addEventListener('click', () => matOn(m));
    m.addEventListener('focus', () => matOn(m));
    m.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') matOn(m); });
  });

  /* ---------------- inspector's view ---------------- */
  // where the damage and chalk rings are painted (see _source/damage.py), in the photo's own 2400 x 1600 space
  const MARKS = [
    { x: 1036, y: 570, label: 'Popped nail' },
    { x: 2052, y: 580, label: 'Broken corner' },
    { x: 516, y: 805, label: 'Hail hits' },
    { x: 1492, y: 810, label: 'Split shake' },
    { x: 958, y: 892, label: 'Lifted edge' },
    { x: 1224, y: 1092, label: 'Hail hits' }
  ];
  $('#chalk').innerHTML = MARKS.map(m => `<text x="${m.x}" y="${m.y + 140}" text-anchor="middle">${m.label}</text>`).join('');

  const box = $('#lensBox'), layer = $('#lensLayer'), ring = $('#lensRing'), zoom = $('#lensZoom');
  const lens = { x: 0, y: 0, tx: 0, ty: 0, set: false, last: -1e9 };
  const radius = () => (innerWidth > 860 ? 150 : 108);
  function pointAt(e) {
    const r = box.getBoundingClientRect();
    lens.tx = e.clientX - r.left; lens.ty = e.clientY - r.top; lens.last = performance.now();
  }
  box.addEventListener('pointermove', pointAt);
  box.addEventListener('pointerdown', pointAt);
  // where a mark lands on screen, given object-fit: cover
  function markAt(i, w, h) {
    const s = Math.max(w / 2400, h / 1600);
    return [(MARKS[i].x - 1200) * s + w / 2, (MARKS[i].y - 800) * s + h / 2];
  }
  function lensStep(now) {
    const w = box.clientWidth, h = box.clientHeight, R = radius();
    if (now - lens.last > 2600) {           // left alone, it wanders from mark to mark
      const visible = MARKS.map((_, i) => markAt(i, w, h)).filter(([x, y]) => x > 40 && x < w - 40 && y > 40 && y < h - 40);
      const order = visible.sort((a, b) => a[0] - b[0]);
      const t = order[Math.floor(now / 2100) % order.length] || [w / 2, h / 2];
      lens.tx = t[0]; lens.ty = t[1];
    }
    if (!lens.set) { lens.x = lens.tx; lens.y = lens.ty; lens.set = true; }
    const k = now - lens.last > 2600 ? 0.05 : 0.2;
    lens.x += (lens.tx - lens.x) * k; lens.y += (lens.ty - lens.y) * k;
    layer.style.clipPath = `circle(${R}px at ${lens.x.toFixed(1)}px ${lens.y.toFixed(1)}px)`;
    zoom.style.transformOrigin = `${lens.x.toFixed(1)}px ${lens.y.toFixed(1)}px`;   // magnify around the glass
    ring.style.width = ring.style.height = R * 2 + 'px';
    ring.style.transform = `translate3d(${(lens.x - R).toFixed(1)}px,${(lens.y - R).toFixed(1)}px,0)`;
  }

  /* ---------------- request form (preview only) ---------------- */
  $('#form').addEventListener('submit', e => {
    e.preventDefault();
    const name = (e.target.elements.name.value || '').trim().split(' ')[0];
    $('#formMsg').textContent = `Thanks${name ? ', ' + name : ''}. This is a preview, so nothing was sent. On the live site this goes straight to the office.`;
  });

  /* ---------------- the roof build ---------------- */
  const build = $('#build'), canvas = $('#roof'), steps = $$('#steps li'), tag = $('#buildTag'), bar = $('#buildBar');
  const scene = window.RoofScene(canvas);
  const NAMES = ['The deck', 'Ice and water shield', 'Underlayment', 'Shingles', 'Copper ridge and flashing'];
  let cur = 0, drawn = -1, stepNow = -1;
  function buildProgress() {
    const r = build.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  }
  let lastT = 0;
  function buildStep(now) {
    const dt = Math.min(250, now - lastT); lastT = now;
    const r = build.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) return;
    const target = buildProgress();
    cur += (target - cur) * (reduce ? 1 : 1 - Math.pow(0.88, dt / 16.7));
    if (Math.abs(target - cur) < 0.0004) cur = target;
    if (Math.abs(cur - drawn) < 0.0002) return;
    drawn = cur;
    scene.draw(cur);
    bar.style.transform = `scaleX(${cur.toFixed(4)})`;
    const i = clamp(Math.floor((cur - 0.03) / 0.18), 0, 4);
    const label = cur < 0.035 ? 'Open framing' : cur > 0.93 ? 'Finished' : NAMES[i];
    if (tag.textContent !== label) tag.textContent = label;
    if (i !== stepNow) {
      stepNow = i;
      steps.forEach((li, n) => { li.classList.toggle('on', n === i); li.classList.toggle('done', n < i); });
    }
  }
  function sizeScene() { scene.resize(); drawn = -1; }
  addEventListener('resize', sizeScene);
  if ('ResizeObserver' in window) new ResizeObserver(sizeScene).observe(canvas);

  /* ---------------- about: letters fill in as you scroll ---------------- */
  const about = $('#about'), para = $('#aboutPara');
  const STICKERS = [                       // which word each one sits on
    { word: 'straight', text: 'Marisol Vega, owner', tilt: -4 },
    { word: 'standing', text: 'Photos before and after', tilt: 3.5, dark: true },
    { word: 'replace', text: '10-year warranty', tilt: -3 }
  ];
  const chars = [], pills = [];
  (() => {
    const text = para.textContent.trim();
    para.setAttribute('aria-label', text);
    para.textContent = '';
    text.split(/\s+/).forEach((w, n) => {
      if (n) para.append(' ');
      const wd = document.createElement('span'); wd.className = 'wd'; wd.setAttribute('aria-hidden', 'true');
      const st = STICKERS.find(x => !x.used && w.startsWith(x.word));
      const first = chars.length;
      [...w].forEach(letter => {
        const ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = letter;
        wd.appendChild(ch); chars.push({ el: ch, d: null });
      });
      if (st) {
        st.used = true;
        const p = document.createElement('span');
        p.className = 'pill p' + pills.length + (st.dark ? ' dark' : ''); p.textContent = st.text;
        p.style.setProperty('--tilt', st.tilt + 'deg');
        wd.appendChild(p); pills.push({ el: p, at: first + w.length + 5 });
      }
      para.appendChild(wd);
    });
  })();
  // keep stickers on screen when their word sits near an edge
  function placePills() {
    pills.forEach(({ el }) => {
      el.style.setProperty('--shift', '0px');
      if (innerWidth <= 860) return;            // phones line them up under the paragraph instead
      const w = el.offsetWidth, host = el.parentElement.getBoundingClientRect();
      const mid = host.left + host.width / 2, edge = 12, vw = document.documentElement.clientWidth;
      const shift = Math.max(0, edge - (mid - w / 2)) - Math.max(0, mid + w / 2 - (vw - edge));
      el.style.setProperty('--shift', shift.toFixed(0) + 'px');
    });
  }
  const COPPER = [196, 115, 63], INK = [23, 28, 33], WAVE = 13;
  let aCur = 0, aT = 0, aFront = null;
  function paint(front) {
    chars.forEach((c, i) => {
      const d = Math.max(0, Math.min(WAVE, front - i));
      if (c.d === d) return;
      c.d = d;
      const st = c.el.style;
      if (d <= 0) { st.color = ''; st.transform = ''; return; }
      // solid copper at the front of the wave, settling to ink behind it
      const m = clamp((d - WAVE * 0.45) / (WAVE * 0.55));
      st.color = `rgb(${COPPER.map((v, k) => Math.round(lerp(v, INK[k], m))).join(',')})`;
      const lift = Math.sin((d / WAVE) * Math.PI);
      st.transform = d >= WAVE ? '' : `translateY(${(-lift * 0.07).toFixed(3)}em) rotate(${(lift * (i % 2 ? 3.5 : -3.5)).toFixed(2)}deg)`;
    });
    pills.forEach(p => p.el.classList.toggle('in', front > p.at));
  }
  function aboutStep(now) {
    const dt = Math.min(250, now - aT); aT = now;
    if (reduce) { if (aFront === null) { aFront = 1e6; paint(aFront); } return; }
    const r = about.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const target = clamp((-r.top / (r.height - innerHeight) - 0.04) / 0.82);
    aCur += (target - aCur) * (1 - Math.pow(0.86, dt / 16.7));
    if (Math.abs(target - aCur) < 0.0005) aCur = target;
    const front = aCur * (chars.length + WAVE);
    if (front === aFront) return;
    aFront = front; paint(front);
  }
  addEventListener('resize', placePills);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(placePills);

  /* ---------------- scroll ---------------- */
  const heroImg = $('#heroImg'), peaks = $$('.work figure>div');
  function onScroll() {
    nav.classList.toggle('solid', scrollY > 40);
    if (!reduce && scrollY < innerHeight * 1.2) heroImg.style.translate = `0 ${(scrollY * 0.16).toFixed(1)}px`;
    // words light up as the paragraph climbs the screen
    const r = words.getBoundingClientRect();
    const t = clamp((innerHeight * 0.88 - r.top) / (r.height + innerHeight * 0.3));
    const n = reduce ? spans.length : Math.round(t * spans.length);
    spans.forEach((s, i) => s.classList.toggle('lit', i < n));
    // recent roofs drift inside their frames
    if (!reduce) peaks.forEach(d => {
      const b = d.getBoundingClientRect();
      if (b.bottom < 0 || b.top > innerHeight) return;
      const m = (b.top + b.height / 2 - innerHeight / 2) / innerHeight;
      d.firstElementChild.style.translate = `0 ${(m * -6).toFixed(2)}%`;
    });
  }

  function reveals() {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); io.unobserve(e.target);
      // once it has arrived, drop the delay so it never slows a hover
      setTimeout(() => { e.target.style.transitionDelay = ''; }, 1400);
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('.sec-head, .svc-wrap, .mat-row, .lens-box, .work figure, .est-copy, .est-form, .foot-cols').forEach(el => {
      el.classList.add('rv');
      if (el.matches('.w2, .w4, .w6, .est-form')) el.style.transitionDelay = '.12s';
      io.observe(el);
    });
  }

  function loop(now) {
    buildStep(now);
    aboutStep(now);
    const r = box.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) lensStep(now);
    requestAnimationFrame(loop);
  }

  /* ---------------- go ---------------- */
  reveals();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  sizeScene();
  requestAnimationFrame(loop);
  onScroll();
})();
