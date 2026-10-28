// 표면 결함 데모 (브라우저 시뮬레이션): 자리마다 점수를 내고 임계값을 넘는 곳을 표시한다.
(() => {
  const cv = document.getElementById('defectCv');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, CELL = 10, GW = W / CELL | 0, GH = H / CELL | 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

  // 결함: 긁힘(선), 얼룩(넓고 옅음), 찍힘(점)
  const defects = [
    { kind: 'line', x0: 120, y0: 120, x1: 300, y1: 190, w: 3, peak: 168 },
    { kind: 'blob', x: 520, y: 270, r: 60, peak: 128 },
    { kind: 'dot', x: 400, y: 90, r: 7, peak: 112 }
  ];
  const distLine = (x, y, d) => {
    const vx = d.x1 - d.x0, vy = d.y1 - d.y0, k = Math.max(0, Math.min(1, ((x - d.x0) * vx + (y - d.y0) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(x - d.x0 - vx * k, y - d.y0 - vy * k);
  };
  const contrib = (x, y, d) => {
    if (d.kind === 'line') return d.peak * Math.exp(-Math.pow(distLine(x, y, d) / 9, 2));
    const r = Math.hypot(x - d.x, y - d.y);
    return d.peak * Math.exp(-Math.pow(r / (d.kind === 'blob' ? d.r * .7 : 10), 2));
  };

  // 표면 화상
  const img = document.createElement('canvas'); img.width = W; img.height = H;
  {
    const c = img.getContext('2d'), id = c.createImageData(W, H), d = id.data;
    const row = new Float32Array(H).map(() => (rnd() - .5) * 18);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = 112 + row[y] + (rnd() - .5) * 16 + Math.sin(x * .004 + y * .002) * 14;
      for (const df of defects) {
        if (df.kind === 'line') v -= 70 * Math.exp(-Math.pow(distLine(x, y, df) / df.w, 2));
        else if (df.kind === 'blob') v += 22 * Math.exp(-Math.pow(Math.hypot(x - df.x, y - df.y) / df.r, 2));
        else v -= 80 * Math.exp(-Math.pow(Math.hypot(x - df.x, y - df.y) / df.r, 2));
      }
      const i = (y * W + x) * 4; d[i] = v * .98; d[i + 1] = v; d[i + 2] = v * 1.04; d[i + 3] = 255;
    }
    c.putImageData(id, 0, 0);
  }
  // 셀 점수
  const score = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const x = gx * CELL + CELL / 2, y = gy * CELL + CELL / 2;
    let v = 18 + rnd() * 34;
    for (const d of defects) v = Math.max(v, contrib(x, y, d) + rnd() * 8);
    score[gy * GW + gx] = v;
  }
  const col = v => { // 노을 색표
    const k = Math.min(1, v / 180);
    const st = [[0, [60, 20, 110]], [.45, [217, 75, 123]], [.75, [255, 122, 89]], [1, [255, 225, 150]]];
    let j = 0; while (j < st.length - 2 && k > st[j + 1][0]) j++;
    const f = (k - st[j][0]) / (st[j + 1][0] - st[j][0]);
    return st[j][1].map((a, i) => Math.round(a + (st[j + 1][1][i] - a) * f));
  };

  const range = document.getElementById('thRange'), out = document.getElementById('thOut'), pill = document.getElementById('defJudge');
  let th = +range.value, sweep = reduce ? 1 : 0, visible = false;

  function draw() {
    ctx.drawImage(img, 0, 0);
    const lim = sweep * W;
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const x = gx * CELL; if (x > lim) continue;
      const v = score[gy * GW + gx], a = Math.max(0, Math.min(.85, (v - th * .45) / (th * .5)));
      if (a <= .02) continue;
      const [r, g, b] = col(v); ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(x, gy * CELL, CELL, CELL);
    }
    let ng = 0;
    ctx.font = '700 15px ui-monospace, Consolas, monospace';
    for (const d of defects) {
      const cx = d.kind === 'line' ? (d.x0 + d.x1) / 2 : d.x, cy = d.kind === 'line' ? (d.y0 + d.y1) / 2 : d.y;
      if (d.peak <= th) continue;
      ng++;
      if (cx > lim) continue;
      const hw = d.kind === 'line' ? Math.abs(d.x1 - d.x0) / 2 + 18 : d.kind === 'blob' ? d.r + 8 : 22;
      const hh = d.kind === 'line' ? Math.abs(d.y1 - d.y0) / 2 + 18 : hw;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2); ctx.setLineDash([]);
      const label = String(d.peak); const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(12,10,29,.8)'; ctx.fillRect(cx - hw, cy - hh - 24, tw, 22);
      ctx.fillStyle = '#ffd99a'; ctx.fillText(label, cx - hw + 6, cy - hh - 8);
    }
    if (sweep < 1) {
      const g = ctx.createLinearGradient(lim - 60, 0, lim, 0); g.addColorStop(0, 'rgba(255,181,71,0)'); g.addColorStop(1, 'rgba(255,181,71,.55)');
      ctx.fillStyle = g; ctx.fillRect(lim - 60, 0, 60, H);
      ctx.fillStyle = '#ffd99a'; ctx.fillRect(lim - 2, 0, 2, H);
    }
    out.textContent = th;
    pill.textContent = ng ? `NG · ${ng}` : 'OK'; pill.className = 'pill' + (ng ? '' : ' ok');
  }
  range.addEventListener('input', () => { th = +range.value; draw(); });
  let last = 0;
  function loop(now) {
    const dt = last ? (now - last) / 1000 : 0; last = now;
    sweep = Math.min(1, sweep + dt / 2.2);
    draw();
    if (sweep < 1 && visible) requestAnimationFrame(loop);
  }
  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible && sweep < 1) { last = 0; requestAnimationFrame(loop); }
  }, { threshold: .35 }).observe(cv);
  draw();
})();
