// 에지 패턴 매칭 데모 (브라우저 시뮬레이션). 부품을 끌어 옮기면 탐색 단계를 거쳐 다시 잡는다.
(() => {
  const cv = document.getElementById('matchCv');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  // ── 배경 텍스처 (한 번만) ──
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  {
    const b = bg.getContext('2d');
    const g = b.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2c3a36'); g.addColorStop(1, '#1f2a28');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    const id = b.getImageData(0, 0, W, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = (rnd() - .5) * 26; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
    b.putImageData(id, 0, 0);
    b.strokeStyle = 'rgba(255,255,255,.05)'; b.lineWidth = 2;
    for (let x = 80; x < W; x += 160) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, H); b.stroke(); }
    // 방해 물체
    b.fillStyle = '#8fa29a'; b.beginPath(); b.arc(1060, 190, 64, 0, 7); b.fill();
    b.fillStyle = '#7f918a'; b.fillRect(170, 520, 200, 120);
    b.save(); b.translate(980, 540); b.rotate(.5); b.fillStyle = '#9aaba4'; b.fillRect(-100, -45, 200, 90); b.restore();
    b.fillStyle = '#6f817a'; for (let i = 0; i < 6; i++) { b.beginPath(); b.arc(120 + i * 34, 120, 10, 0, 7); b.fill(); }
  }

  // ── 모델: L 자 브래킷 + 구멍 ──
  const outer = [[-120, -75], [120, -75], [120, -5], [45, -5], [45, 75], [-120, 75]];
  const hole = { x: -62, y: 5, r: 24 };
  const pts = [];
  for (let i = 0; i < outer.length; i++) {
    const [ax, ay] = outer[i], [bx, by] = outer[(i + 1) % outer.length];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 11));
    for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; pts.push([hole.x + Math.cos(a) * hole.r, hole.y + Math.sin(a) * hole.r]); }

  // 가림 (케이블)
  const occ = { x0: 0, y0: 380, x1: W, y1: 470 };
  const cable = (c) => {
    c.save(); c.translate(0, 0);
    const g = c.createLinearGradient(0, occ.y0, 0, occ.y1);
    g.addColorStop(0, '#0d0f12'); g.addColorStop(.35, '#3b3f48'); g.addColorStop(.5, '#555b66'); g.addColorStop(1, '#0b0c0f');
    c.fillStyle = g; c.beginPath();
    c.moveTo(0, occ.y0 + 10); c.bezierCurveTo(W * .3, occ.y0 - 30, W * .6, occ.y1 + 10, W, occ.y0 + 6);
    c.lineTo(W, occ.y0 + 6 + 74); c.bezierCurveTo(W * .6, occ.y1 + 84, W * .3, occ.y0 + 44, 0, occ.y0 + 84); c.closePath(); c.fill();
    c.restore();
  };
  const cableY = x => { // 위 곡선 근사(가림 판정용)
    const t = x / W, a = occ.y0 + 10, b1 = occ.y0 - 30, b2 = occ.y1 + 10, d = occ.y0 + 6;
    return Math.pow(1 - t, 3) * a + 3 * Math.pow(1 - t, 2) * t * b1 + 3 * (1 - t) * t * t * b2 + t * t * t * d;
  };
  const occluded = (x, y) => y > cableY(x) && y < cableY(x) + 74;

  // ── 상태 ──
  const pose = { x: 560, y: 300, th: .35, sc: 1 };
  const base = { x: 560, y: 300 };
  const est = { x: 560, y: 300, th: .35, sc: 1 };
  let mode = 2, drag = null, search = 0, t = 0, ms = 7.8;

  const xf = (p, q) => {
    const c = Math.cos(q.th) * q.sc, s = Math.sin(q.th) * q.sc;
    return [q.x + p[0] * c - p[1] * s, q.y + p[0] * s + p[1] * c];
  };

  function drawScene(c) {
    c.drawImage(bg, 0, 0);
    c.save(); c.translate(pose.x, pose.y); c.rotate(pose.th); c.scale(pose.sc, pose.sc);
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
    const g = c.createLinearGradient(-120, -75, 120, 75); g.addColorStop(0, '#d9e6df'); g.addColorStop(1, '#a9bcb4');
    c.fillStyle = g; c.beginPath(); outer.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    c.moveTo(hole.x + hole.r, hole.y); c.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true);
    c.fill('evenodd');
    c.restore();
    cable(c);
  }

  // 에지 보기: 반 해상도 Sobel
  const sm = document.createElement('canvas'); sm.width = W / 2; sm.height = H / 2;
  const smc = sm.getContext('2d', { willReadFrequently: true });
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const k = i / 255, stops = [[0, 12, 10, 29], [.3, 106, 44, 110], [.6, 255, 122, 89], [1, 255, 230, 170]];
    let j = 0; while (j < stops.length - 2 && k > stops[j + 1][0]) j++;
    const [a, ...ca] = stops[j], [b, ...cb] = stops[j + 1], f = (k - a) / (b - a);
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = ca[ch] + (cb[ch] - ca[ch]) * f;
  }
  function drawEdges() {
    smc.drawImage(cv, 0, 0, sm.width, sm.height);
    const w = sm.width, h = sm.height, src = smc.getImageData(0, 0, w, h), d = src.data;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) gray[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
    const out = smc.createImageData(w, h), o = out.data;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1] - gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1];
      const gy = gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1] - gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1];
      let m = Math.hypot(gx, gy) * .9; m = m < 40 ? 0 : Math.min(255, m);
      o[i * 4] = lut[m * 3 | 0]; o[i * 4 + 1] = lut[(m | 0) * 3 + 1]; o[i * 4 + 2] = lut[(m | 0) * 3 + 2]; o[i * 4 + 3] = 255;
    }
    smc.putImageData(out, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(sm, 0, 0, W, H);
  }

  function drawMatch() {
    // 탐색 단계 표시: 거친 격자 후보 → 좁아짐
    if (search > 0) {
      const k = 1 - search; // 0 → 1
      const level = k < .35 ? 3 : k < .65 ? 2 : k < .85 ? 1 : 0;
      const n = [36, 12, 4, 1][level];
      ctx.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const spread = [520, 220, 70, 0][level];
        const a = i * 2.399, r = spread * Math.sqrt((i + .5) / n);
        const q = { x: pose.x + Math.cos(a) * r, y: pose.y + Math.sin(a) * r * .6, th: pose.th + (i % 5 - 2) * .4 * (1 - k), sc: est.sc };
        ctx.strokeStyle = `rgba(255,181,71,${.15 + .5 * k})`;
        box(q, 1);
      }
      ctx.fillStyle = 'rgba(12,10,29,.65)'; ctx.fillRect(18, H - 66, 210, 40);
      ctx.fillStyle = '#ffd99a'; ctx.font = '600 20px ui-monospace, Consolas, monospace';
      ctx.fillText(`PYRAMID L${level}  ${n} cand`, 30, H - 39);
      return;
    }
    // 특징점
    let occN = 0;
    for (const p of pts) {
      const [x, y] = xf(p, est), oc = occluded(x, y);
      if (oc) occN++;
      ctx.fillStyle = oc ? '#ff4d8d' : '#7cf0a5';
      ctx.beginPath(); ctx.arc(x, y, oc ? 3 : 3.4, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#ff7a59'; ctx.lineWidth = 2.5; box(est, 1.12);
    // 십자 + 축
    const [cx, cy] = [est.x, est.y], c = Math.cos(est.th), s = Math.sin(est.th);
    ctx.strokeStyle = '#ffb547'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - c * 26, cy - s * 26); ctx.lineTo(cx + c * 26, cy + s * 26);
    ctx.moveTo(cx + s * 26, cy - c * 26); ctx.lineTo(cx - s * 26, cy + c * 26); ctx.stroke();
    return occN;
  }
  function box(q, m) {
    const cs = [[-120, -75], [120, -75], [120, 75], [-120, 75]].map(p => xf([p[0] * m, p[1] * m], q));
    ctx.beginPath(); cs.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke();
  }

  // ── HUD ──
  const jEl = document.getElementById('mJudge'), tEl = document.getElementById('mTime'), rEl = document.getElementById('mRead');
  let hudT = 0;
  function hud(occN) {
    if (performance.now() - hudT < 120) return; hudT = performance.now();
    if (search > 0) { jEl.textContent = '···'; jEl.className = 'judge'; rEl.textContent = 'SEARCH …'; return; }
    const cr = 100 * (1 - occN / pts.length) - Math.abs(est.th - pose.th) * 50 - Math.hypot(est.x - pose.x, est.y - pose.y) * .3;
    const ok = cr >= 60;
    jEl.textContent = ok ? 'OK' : 'NG'; jEl.className = 'judge' + (ok ? '' : ' ng');
    ms += ((6.5 + rnd() * 2.5) - ms) * .3;
    tEl.textContent = ms.toFixed(1) + ' ms · sim';
    let deg = ((est.th * 180 / Math.PI) % 360 + 540) % 360 - 180;
    rEl.textContent = `X ${est.x.toFixed(2)}  Y ${est.y.toFixed(2)}  θ ${deg.toFixed(2)}°  SC ${est.sc.toFixed(3)}  CR ${Math.max(0, cr).toFixed(1)}`;
  }

  // ── 입력 ──
  const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  cv.addEventListener('pointerdown', e => {
    const [x, y] = toCanvas(e); drag = { dx: base.x - x, dy: base.y - y };
    cv.setPointerCapture(e.pointerId); cv.classList.add('drag');
  });
  cv.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = toCanvas(e); base.x = Math.max(140, Math.min(W - 140, x + drag.dx)); base.y = Math.max(110, Math.min(H - 110, y + drag.dy)); });
  const end = () => { if (!drag) return; drag = null; cv.classList.remove('drag'); search = 1; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
    mode = +b.dataset.mode;
    document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    if (reduce) frame(performance.now());
  }));

  let visible = false, last = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(frame); } }, { threshold: .05 }).observe(cv);

  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!reduce) t += dt;
    pose.x = base.x + Math.sin(t * .5) * 30; pose.y = base.y + Math.sin(t * .37) * 18;
    pose.th = .35 + t * .28; pose.sc = 1 + Math.sin(t * .6) * .05;
    if (search > 0) { search = Math.max(0, search - dt / .9); if (search === 0) Object.assign(est, pose); }
    else if (drag) { est.x += (pose.x - est.x) * .08; est.y += (pose.y - est.y) * .08; est.th += (pose.th - est.th) * .1; est.sc = pose.sc; }
    else { const k = .35; est.x += (pose.x - est.x) * k; est.y += (pose.y - est.y) * k; est.th += (pose.th - est.th) * k; est.sc += (pose.sc - est.sc) * k; }

    drawScene(ctx);
    let occN = 0;
    if (mode === 1) drawEdges();
    if (mode === 2) occN = drawMatch() || 0;
    if (mode !== 0 || search > 0) { if (mode === 1 && search > 0) drawMatch(); }
    hud(occN);
    if (visible && !reduce) requestAnimationFrame(frame);
  }
  frame(performance.now());
})();
