/* HANDSLab — Interactive Gallery
   사진을 끝없이 이어지는 격자에 놓고, 격자 전체를 완만한 구면(가운데가 가깝고 가장자리가 멀어지는 면)에 얹는다.
   - 끌기(마우스·터치) → 놓으면 관성으로 천천히 멈춤
   - 마우스 위치에 따라 면 전체가 살짝 기울어지는 3D 패럴랙스, 끄는 방향으로 약간 기울어짐
   - 가만히 두면 아주 느리게 흐름(마우스를 올리거나 조작하면 멈춤)
   - 사진에 올리면 확대, 누르면 크게 보기(상세 정보 · 제품/구매 링크)
   - 사진은 화면에 처음 들어올 때만 불러온다(lazy loading)
   - '움직임 줄이기' 설정에서는 흐름·관성·기울기·전환 효과를 끄고 끌기만 남긴다
   외부 라이브러리 없이 CSS 3D transform 으로 직접 구현했다. */
(function () {
  'use strict';
  const DATA = window.HANDSLAB_DATA;
  const root = document.getElementById('gx');
  if (!DATA || !root) return;
  const plane = document.getElementById('gxPlane');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const two = (n) => String(n).padStart(2, '0');
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mod = (a, m) => ((a % m) + m) % m;

  /* ── 갤러리 항목: 로봇핸드 사진 + (있으면) 연구·실험·연구실 사진 ── */
  const TYPE_LABEL = { hand: '로봇핸드', research: '연구', experiment: '실험', lab: '연구실' };
  const hands = DATA.hands.filter((h) => h.photo).map((h) => ({
    type: 'hand', hand: h, src: h.photo.src, w: h.photo.w, h: h.photo.h, look: h.photo.alpha ? '' : 'blend',
    title: h.model, sub: h.maker, idx: 'H' + two(DATA.hands.indexOf(h) + 1),
  }));
  const extra = (window.HANDSLAB_GALLERY_EXTRA || []).filter((x) => x && x.src).map((x, i) => ({
    type: TYPE_LABEL[x.type] ? x.type : 'lab', src: x.src, w: x.w || 1200, h: x.h || 900, look: 'cover',
    title: x.title || '', sub: [TYPE_LABEL[x.type] || '연구실', x.date].filter(Boolean).join(' · '), text: x.text || '', link: x.link || '', idx: 'L' + two(i + 1),
  }));
  // 추가 사진은 제품 사진 사이에 고르게 섞는다
  function interleave(a, b) {
    if (!b.length) return a.slice();
    const out = [], step = (a.length + b.length) / b.length; let j = 0;
    a.forEach((x) => { out.push(x); if (j < b.length && out.length + 1 >= Math.round((j + 1) * step)) out.push(b[j++]); });
    while (j < b.length) out.push(b[j++]);
    return out;
  }
  const ALL = interleave(hands, extra);
  let items = ALL, filter = 'all';

  /* ── 분류 버튼 (추가 사진이 있을 때만) ── */
  const filterBox = $('#gxFilter');
  if (extra.length && filterBox) {
    const types = ['all', 'hand', ...Object.keys(TYPE_LABEL).filter((t) => t !== 'hand' && extra.some((x) => x.type === t))];
    filterBox.innerHTML = types.map((t) => `<button type="button" data-gx-filter="${t}" aria-pressed="${t === 'all'}">${t === 'all' ? '전체' : TYPE_LABEL[t]}</button>`).join('');
    filterBox.hidden = false;
    filterBox.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gx-filter]'); if (!b) return;
      filter = b.dataset.gxFilter;
      $$('[data-gx-filter]', filterBox).forEach((x) => x.setAttribute('aria-pressed', x === b));
      items = filter === 'all' ? ALL : ALL.filter((x) => x.type === filter);
      px = 0; py = 0; vx = vy = 0; build();
    });
  }
  $('#gxHint').textContent = finePointer.matches
    ? '끌어서 둘러보고, 사진을 누르면 크게 볼 수 있습니다.'
    : '옆으로 밀어서 둘러보고, 사진을 누르면 크게 볼 수 있습니다.';

  /* ── 배치: 화면 크기에 맞춰 칸 크기·간격·곡률을 정한다 ── */
  let P = null, cells = [], tiles = [];
  function params() {
    const vw = root.clientWidth, vh = root.clientHeight;
    const small = vw < 640, mid = vw < 1024;
    const tw = small ? 128 : mid ? 168 : Math.round(clamp(vw / 7.4, 188, 244));
    const th = Math.round(tw * 1.18);
    const gap = small ? 14 : mid ? 20 : Math.round(tw * 0.13);
    const cw = tw + gap, ch = th + gap;
    // 격자 한 바퀴가 화면보다 넉넉히 커야 같은 칸이 동시에 두 번 보이지 않는다
    const n = items.length;
    const minC = Math.ceil((vw + cw * 2) / cw) + 1, minR = Math.ceil((vh + ch * 2) / ch) + 1;
    let best = null;
    for (let c = minC; c <= minC + 10; c++) {
      const r = Math.max(minR, Math.ceil(n / c));
      const waste = c * r - n, shape = Math.abs(Math.log((c * cw) / (r * ch) / (vw / vh)));
      const score = waste * 4 + shape * 10;
      if (!best || score < best.score) best = { c, r, score };
    }
    const R = Math.max(vw, vh * 1.25) / 2;                         // 구면 반지름 기준(가로 기준)
    return {
      vw, vh, tw, th, cw, ch, cols: best.c, rows: best.r, W: best.c * cw, H: best.r * ch,
      R2: R * R, depth: small ? 90 : mid ? 150 : 210, persp: small ? 900 : mid ? 1100 : 1300, small,
    };
  }

  function tileHTML(it, k) {
    const label = it.type === 'hand' ? `${it.title}, ${it.sub}. 크게 보기` : `${it.title}${it.sub ? ', ' + it.sub : ''}. 크게 보기`;
    return `<button type="button" class="gx-tile" data-cell="${k}" aria-label="${esc(label)}" style="visibility:hidden">
      <span class="gx-card ${it.look}"><img alt="" decoding="async" draggable="false" width="${it.w}" height="${it.h}">
        <span class="gx-idx" aria-hidden="true">${esc(it.idx)}</span>
        <span class="gx-cap" aria-hidden="true">${esc(it.title)}<small>${esc(it.sub)}</small></span></span></button>`;
  }
  function build() {
    P = params();
    root.style.setProperty('--tw', P.tw + 'px'); root.style.setProperty('--th', P.th + 'px'); root.style.setProperty('--persp', P.persp + 'px');
    cells = [];
    const n = items.length, total = P.cols * P.rows;
    for (let k = 0; k < total; k++) {
      const c = k % P.cols, r = Math.floor(k / P.cols);
      cells.push({
        item: n ? k % n : -1, k,
        bx: (c - (P.cols - 1) / 2) * P.cw,
        by: (r - (P.rows - 1) / 2) * P.ch + (c % 2 ? P.ch * 0.42 : 0),   // 홀수 열은 조금 내려 리듬을 준다
      });
    }
    plane.innerHTML = n ? cells.map((cl) => tileHTML(items[cl.item], cl.k)).join('') : '';
    tiles = $$('.gx-tile', plane).map((el, k) => ({ el, img: $('img', el), shown: false, loaded: false, cell: cells[k] }));
    const kinds = filter === 'all' ? `${hands.length} hands${extra.length ? ` · ${extra.length} stories` : ''}` : `${items.length} ${filter === 'hand' ? 'hands' : 'photos'}`;
    $('#gxCount').textContent = (finePointer.matches ? 'Drag to explore · ' : 'Swipe to explore · ') + kinds;
    layout();
  }

  /* ── 매 프레임: 칸 위치 → 구면 위 좌표 ── */
  let px = 0, py = 0, vx = 0, vy = 0;           // 이동량(px)과 속도(px/ms)
  let mx = 0, my = 0, tmx = 0, tmy = 0;         // 마우스 위치(-1~1), 목표값
  let tilt = 0, ttilt = 0, tiltY = 0, ttiltY = 0;
  let scrollOff = 0;
  function layout() {
    if (!P) return;
    const { W, H, vw, vh, cw, ch, R2, depth } = P;
    const k2 = 2 * depth / R2, hx = vw / 2 + cw * 0.75, hy = vh / 2 + ch * 0.75;
    const oy = py + scrollOff;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i], c = t.cell;
      const x = mod(c.bx + px + W / 2, W) - W / 2;
      const y = mod(c.by + oy + H / 2, H) - H / 2;
      const vis = Math.abs(x) < hx && Math.abs(y) < hy;
      if (vis !== t.shown) { t.shown = vis; t.el.style.visibility = vis ? '' : 'hidden'; }
      if (!vis) continue;
      if (!t.loaded) {                                        // 화면에 처음 들어올 때 사진을 불러온다
        t.loaded = true;
        const it = items[c.item];
        t.img.onload = () => t.img.classList.add('loaded');
        t.img.src = it.src;
        if (t.img.complete) t.img.classList.add('loaded');
      }
      const z = -depth * (x * x + y * y) / R2;
      const ry = Math.atan(k2 * x) * 57.2958, rx = -Math.atan(k2 * y) * 57.2958;
      t.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    }
    plane.style.transform = `translate3d(${(mx * 14).toFixed(2)}px,${(my * 10).toFixed(2)}px,0) rotateX(${(-my * 3.2 + tiltY).toFixed(3)}deg) rotateY(${(mx * 4.2 + tilt).toFixed(3)}deg)`;
  }

  let raf = 0, last = 0, inView = true, hovering = false, idleAt = 0, dragging = false, lbOpen = false;
  const DRIFT = 0.012;                           // 가만히 있을 때 흐르는 속도(px/ms) — 1초에 약 12px
  const driftOn = (t) => !reduce.matches && inView && !hovering && !dragging && !lbOpen && !document.hidden && t - idleAt > 2600;
  function tick(t) {
    raf = 0;
    const dt = last ? Math.min(48, t - last) : 16.67; last = t;
    let busy = dragging;
    if (!dragging) {
      if (Math.abs(vx) + Math.abs(vy) > 0.004) {            // 관성: 매 프레임 조금씩 감속
        px += vx * dt; py += vy * dt;
        const f = Math.pow(0.935, dt / 16.67); vx *= f; vy *= f; busy = true;
      } else { vx = vy = 0; if (driftOn(t)) { px -= DRIFT * dt; busy = true; } }
      ttilt = 0; ttiltY = 0;
    }
    const e = 1 - Math.pow(1 - 0.085, dt / 16.67);          // 부드럽게 따라가기
    mx += (tmx - mx) * e; my += (tmy - my) * e; tilt += (ttilt - tilt) * e; tiltY += (ttiltY - tiltY) * e;
    if (Math.abs(tmx - mx) + Math.abs(tmy - my) + Math.abs(ttilt - tilt) + Math.abs(ttiltY - tiltY) > 0.002) busy = true;
    layout();
    if (busy && inView) raf = requestAnimationFrame(tick); else last = 0;
  }
  const kick = () => { if (!raf && inView) raf = requestAnimationFrame(tick); };

  /* ── 끌기 · 관성 ── */
  let down = null, suppressClick = false;
  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false, touch: e.pointerType !== 'mouse' };
    vx = vy = 0; suppressClick = false;
  });
  root.addEventListener('pointermove', (e) => {
    if (finePointer.matches && e.pointerType === 'mouse' && !reduce.matches) {   // 패럴랙스 목표값
      const r = root.getBoundingClientRect();
      tmx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1); tmy = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      kick();
    }
    if (!down || e.pointerId !== down.id) return;
    if (!down.moved) {
      if (Math.hypot(e.clientX - down.sx, e.clientY - down.sy) < 6) return;
      down.moved = true; dragging = true; root.classList.add('dragging');
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* 지원하지 않는 환경 */ }
    }
    const now = performance.now(), dt = Math.max(1, now - down.lt);
    const dx = e.clientX - down.lx, dy = down.touch ? 0 : e.clientY - down.ly;   // 터치는 가로로만(세로는 페이지 스크롤)
    px += dx; py += dy;
    vx = clamp(vx * 0.2 + (dx / dt) * 0.8, -2.6, 2.6); vy = clamp(vy * 0.2 + (dy / dt) * 0.8, -2.6, 2.6);
    if (!reduce.matches) { ttilt = clamp(vx * 3.2, -5, 5); ttiltY = clamp(-vy * 2.4, -4, 4); }
    down.lx = e.clientX; down.ly = e.clientY; down.lt = now;
    kick();
  });
  function endDrag(e) {
    if (!down || (e && e.pointerId !== down.id)) return;
    const was = down; down = null;
    if (!was.moved) return;
    dragging = false; root.classList.remove('dragging'); suppressClick = true; idleAt = performance.now();
    if (reduce.matches || performance.now() - was.lt > 90) { vx = vy = 0; }   // 멈췄다 놓으면 관성 없이 멈춘다
    kick();
  }
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', (e) => { if (down && down.moved) { endDrag(e); } down = null; dragging = false; root.classList.remove('dragging'); });
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovering = false; tmx = tmy = 0; idleAt = performance.now(); kick(); } });
  root.addEventListener('dragstart', (e) => e.preventDefault());
  // 트랙패드 가로 스크롤(또는 Shift+휠)로도 움직인다. 세로 휠은 페이지 스크롤에 남긴다.
  root.addEventListener('wheel', (e) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!dx) return;
    e.preventDefault(); px -= dx; idleAt = performance.now(); kick();
  }, { passive: false });
  // 키보드: 화살표로 한 칸씩
  const FLING = 1 / 255;                          // 관성으로 약 한 칸 가는 속도 계수
  function nudge(dx, dy) {
    idleAt = performance.now();
    if (reduce.matches) { px += dx; py += dy; layout(); return; }
    vx = dx * FLING; vy = dy * FLING; kick();
  }
  root.addEventListener('keydown', (e) => {
    const map = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!map || !P) return;
    e.preventDefault(); nudge(map[0] * P.cw, map[1] * P.ch);
  });
  // Tab 으로 사진에 초점이 오면 그 사진을 가운데로 데려온다
  plane.addEventListener('focusin', (e) => {
    const el = e.target.closest('.gx-tile'); if (!el || !el.matches(':focus-visible')) return;
    const t = tiles[+el.dataset.cell], c = t.cell;
    const x = mod(c.bx + px + P.W / 2, P.W) - P.W / 2, y = mod(c.by + py + scrollOff + P.H / 2, P.H) - P.H / 2;
    nudge(-x, -y);
  });
  root.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    const el = e.target.closest('.gx-tile'); if (!el) return;
    openLB(cells[+el.dataset.cell].item, el);
  });

  /* ── 페이지 스크롤과 살짝 연결(세로로 천천히 흐르는 느낌) ── */
  function onScroll() {
    if (reduce.matches) return;
    const r = root.getBoundingClientRect();
    scrollOff = -(r.top + r.height / 2 - window.innerHeight / 2) * 0.18;
    if (inView) { if (!raf) layout(); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── 화면 밖이면 멈춘다 ── */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { inView = en[0].isIntersecting; if (inView) { idleAt = performance.now() - 2000; kick(); } }, { rootMargin: '80px' }).observe(root);
  }
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { const w = root.clientWidth, h = root.clientHeight; if (!P || w !== P.vw || h !== P.vh) build(); }, 140); };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(root); else window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', kick);
  reduce.addEventListener && reduce.addEventListener('change', () => { tmx = tmy = mx = my = tilt = tiltY = 0; scrollOff = 0; vx = vy = 0; layout(); kick(); });

  /* ── 크게 보기 ── */
  const lb = $('#lb'), panel = $('#lbPanel'), media = $('#lbMedia'), info = $('#lbInfo'), countEl = $('#lbCount');
  let cur = -1, returnTo = null;
  const val = (v) => (v === null || v === undefined || v === '' ? '<span class="na">미확인</span>' : esc(v));
  const shortW = (t) => (t ? t.replace(/\s*\(.*$/, '') : t);
  function infoHTML(it) {
    if (it.type !== 'hand') {
      return `<p class="lb-idx">${esc(it.sub || TYPE_LABEL[it.type])}</p><h2 id="lbTitle">${esc(it.title)}</h2>
        ${it.text ? `<p class="lb-text">${esc(it.text)}</p>` : ''}
        ${it.link ? `<div class="lb-actions"><a class="btn-solid" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">자세히 보기 ↗</a></div>` : ''}`;
    }
    const h = it.hand;
    const dof = h.activeDof != null ? h.activeDof + (h.activeDofNote ? ` (${h.activeDofNote})` : '') : null;
    const rows = [['손가락 수', h.fingers], ['능동 DoF', dof], ['총 DoF', h.totalDof != null ? h.totalDof : h.dofStated],
      ['무게', shortW(h.weight)], h.gripForce || !h.tipForce ? ['Grip force', h.gripForce] : ['Tip force', h.tipForce], ['Payload', h.payload]];
    return `<p class="lb-idx">${esc(it.idx)} · ${esc(h.kind)}</p>
      <h2 id="lbTitle">${esc(h.model)}</h2>
      <p class="lb-maker">${esc(h.maker)} · ${esc(h.countries.join(', '))}</p>
      <dl class="lb-specs">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${val(v)}</dd></div>`).join('')}</dl>
      <div class="lb-actions">
        <a class="btn-solid" href="#/hand/${h.id}" data-lb-detail>상세 사양 보기</a>
        <a class="btn-line" href="${esc(h.source)}" target="_blank" rel="noopener">제품 페이지 ↗</a>
        ${h.buy ? `<a class="btn-line" href="${esc(h.buy.url)}" target="_blank" rel="noopener noreferrer">구매 링크 ↗</a>` : ''}
      </div>`;
  }
  function mediaHTML(it) {
    const credit = it.type === 'hand' && it.hand.photo
      ? `<p class="lb-credit">사진 출처 · <a href="${esc(it.hand.photo.creditUrl)}" target="_blank" rel="noopener noreferrer">${esc(it.hand.photo.creditName)}</a> ${esc(host(it.hand.photo.creditUrl))}</p>` : '';
    return `<img src="${esc(it.src)}" width="${it.w}" height="${it.h}" alt="${esc(it.type === 'hand' ? it.hand.maker + ' ' + it.title + ' 제품 사진' : it.title)}">${credit}`;
  }
  function fill(i) {
    cur = mod(i, items.length);
    const it = items[cur];
    media.className = 'lb-media ' + it.look;
    media.innerHTML = mediaHTML(it);
    info.innerHTML = infoHTML(it);
    info.scrollTop = 0;
    countEl.textContent = `${two(cur + 1)} / ${two(items.length)}`;
  }
  function openLB(i, fromEl) {
    if (i < 0) return;
    returnTo = fromEl || document.activeElement;
    fill(i);
    lb.hidden = false; lbOpen = true; document.body.classList.add('lb-open');
    lb.classList.toggle('anim', !reduce.matches);
    panel.focus({ preventScroll: true });
    if (!reduce.matches && fromEl && panel.animate) flyFrom($('.gx-card', fromEl));
  }
  // 누른 사진 자리에서 크게 보기 자리로 날아오는 전환
  function flyFrom(card) {
    const img = $('img', media); if (!card || !img) return;
    const a = card.getBoundingClientRect(), b = media.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const ghost = document.createElement('div');
    ghost.className = 'lb-ghost ' + media.className.replace('lb-media', '').trim();
    ghost.innerHTML = `<img src="${img.getAttribute('src')}" alt="">`;
    Object.assign(ghost.style, { position: 'fixed', left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', zIndex: 115, background: 'var(--tile)', overflow: 'hidden', transformOrigin: '0 0', pointerEvents: 'none' });
    const gi = ghost.firstChild;
    Object.assign(gi.style, { width: '100%', height: '100%', objectFit: media.classList.contains('cover') ? 'cover' : 'contain', padding: media.classList.contains('cover') ? '0' : media.classList.contains('blend') ? '6%' : '9%', mixBlendMode: media.classList.contains('blend') ? 'multiply' : 'normal' });
    document.body.appendChild(ghost);
    media.style.visibility = 'hidden';
    const anim = ghost.animate([
      { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`, borderRadius: '18px' },
      { transform: 'none', borderRadius: getComputedStyle(media).borderRadius || '0px' },
    ], { duration: 560, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
    const done = () => { media.style.visibility = ''; ghost.remove(); };
    anim.onfinish = done; anim.oncancel = done;
  }
  function closeLB(instant) {
    if (!lbOpen) return;
    lbOpen = false;
    const finish = () => {
      lb.hidden = true; document.body.classList.remove('lb-open'); media.innerHTML = ''; info.innerHTML = '';
      idleAt = performance.now(); kick();
    };
    if (instant || reduce.matches || !panel.animate) finish();
    else {
      panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(.985)' }], { duration: 200, easing: 'ease-in' });
      $('.lb-backdrop', lb).animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-in' }).onfinish = finish;
    }
    if (returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
  }
  lb.addEventListener('click', (e) => {
    if (e.target.closest('[data-lb-close]')) { closeLB(); return; }
    const s = e.target.closest('[data-lb-step]');
    if (s) { fill(cur + +s.dataset.lbStep); return; }
    if (e.target.closest('[data-lb-detail]')) closeLB(true);      // 상세 화면은 app.js 가 연다(주소 #/hand/…)
  });
  document.addEventListener('keydown', (e) => {
    if (!lbOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLB(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); fill(cur + 1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); fill(cur - 1); return; }
    if (e.key !== 'Tab') return;                                   // 크게 보기 안에서만 초점이 돈다
    const f = $$('a[href], button:not([disabled])', panel).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
  // 휴대폰: 크게 보기에서 사진을 옆으로 밀면 이전/다음
  let sw = null;
  media.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') sw = { x: e.clientX, y: e.clientY }; });
  media.addEventListener('pointerup', (e) => {
    if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) fill(cur + (dx < 0 ? 1 : -1));
  });

  build();
  onScroll();
  kick();
})();
