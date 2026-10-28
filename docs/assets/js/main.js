// 공통: 언어 전환, 등장 애니메이션, 내비, 숫자 카운트, 플로우 스토리, 갤러리, 릴리스 목록.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 언어 ──
  const koHtml = new Map();
  $$('[data-i18n]').forEach(el => koHtml.set(el, el.innerHTML));
  let lang = 'ko';
  const t = k => (lang === 'en' ? window.EMV_EN : window.EMV_KO_JS)[k] || k;
  window.EMV_T = t;
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'ko';
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const en = window.EMV_EN[el.dataset.i18n];
      el.innerHTML = lang === 'en' && en ? en : koHtml.get(el);
    });
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    try { localStorage.setItem('emv-lang', lang); } catch (_) {}
    renderRelease();
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  let init = new URLSearchParams(location.search).get('lang');
  if (!init) { try { init = localStorage.getItem('emv-lang'); } catch (_) {} }
  if (!init) init = (navigator.language || 'ko').startsWith('ko') ? 'ko' : 'en';

  // ── 등장 ──
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  $$('.reveal, .reveal-scale').forEach(el => { if (!el.closest('.hero')) io.observe(el); });

  // ── 숫자 카운트 ──
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
    const t0 = performance.now(), dur = reduce ? 0 : 1600;
    const step = now => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1, v = to * (1 - Math.pow(1 - k, 4));
      el.textContent = v.toFixed(dec) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // ── 스크롤: 내비 배경, 화면 기울기, 현재 구간 ──
  const nav = $('#nav'), devWin = $('#device .win'), dev = $('#device');
  const secLinks = $$('.links a').map(a => [a, $(a.getAttribute('href'))]);
  function onScroll() {
    const y = scrollY, vh = innerHeight;
    nav.classList.toggle('solid', y > 40);
    if (devWin && !reduce) {
      const r = dev.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (vh - r.top) / (vh * .9)));
      devWin.style.transform = `rotateX(${18 * (1 - k)}deg) scale(${.92 + .08 * k})`;
    }
    let cur = null;
    for (const [a, s] of secLinks) if (s && s.getBoundingClientRect().top < vh * .4) cur = a;
    secLinks.forEach(([a]) => a.classList.toggle('on', a === cur));
    flowUpdate();
  }
  addEventListener('scroll', onScroll, { passive: true });

  // ── 플로우 스토리 ──
  const steps = $$('.flow-steps .step'), items = $$('#flowList li');
  const fTime = $('#flowTime');
  let lastUpto = -2;
  function flowUpdate() {
    let upto = -1;
    steps.forEach(s => {
      const r = s.getBoundingClientRect(), on = r.top < innerHeight * .6 && r.bottom > innerHeight * .3;
      s.classList.toggle('on', on);
      if (r.top < innerHeight * .6) upto = +s.dataset.upto;
    });
    if (upto === lastUpto) return;
    lastUpto = upto;
    let ms = 0;
    items.forEach((li, i) => { const on = i <= upto; li.classList.toggle('on', on); if (on) ms += +li.dataset.ms; });
    fTime.textContent = ms.toFixed(2) + ' ms';
  }

  // ── 갤러리 ──
  const rail = $('#rail');
  const by = d => rail.scrollBy({ left: d * Math.min(800, rail.clientWidth * .8), behavior: reduce ? 'auto' : 'smooth' });
  $('#railPrev').onclick = () => by(-1);
  $('#railNext').onclick = () => by(1);
  rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight') by(1); if (e.key === 'ArrowLeft') by(-1); });
  const shots = $$('.shot');
  function railFx() {
    const c = rail.getBoundingClientRect(), mid = c.left + c.width / 2;
    shots.forEach(s => {
      const r = s.getBoundingClientRect(), d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / c.width);
      s.style.transform = `scale(${1 - d * .1})`; s.style.opacity = 1 - d * .55;
    });
  }
  if (!reduce) { rail.addEventListener('scroll', railFx, { passive: true }); addEventListener('resize', railFx); railFx(); }

  // ── 메일 복사 ──
  const toast = $('#toast');
  $('#copyMail').onclick = async () => {
    try { await navigator.clipboard.writeText('noeulsoft@gmail.com'); } catch (_) {}
    toast.textContent = t('js.copied'); toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  };

  // ── 최신 릴리스 ──
  const REPO = 'Rubiya82/EMVision-Releases';
  let rel = null, relErr = false;
  const fmtSize = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : b + ' B';
  function kind(n) {
    const s = n.toLowerCase();
    if (s.includes('win')) return ['WIN', t('js.win')];
    if (s.includes('linux')) return ['LNX', t('js.linux')];
    if (s.endsWith('.pdf')) return ['PDF', t('js.manual')];
    if (s.includes('sha256')) return ['SUM', t('js.sums')];
    if (s.includes('build-info')) return ['INFO', t('js.build')];
    return ['FILE', t('js.other')];
  }
  function renderRelease() {
    const list = $('#relList');
    if (relErr) { list.innerHTML = `<li class="fine">${t('js.relfail')}</li>`; return; }
    if (!rel) return;
    $('#relName').textContent = rel.name || rel.tag_name;
    $('#relDate').textContent = (rel.published_at || '').slice(0, 10);
    $('#relAll').href = rel.html_url;
    const order = ['WIN', 'LNX', 'PDF', 'SUM', 'INFO', 'FILE'];
    const assets = rel.assets.map(a => ({ a, k: kind(a.name) })).sort((x, y) => order.indexOf(x.k[0]) - order.indexOf(y.k[0]));
    list.innerHTML = '';
    for (const { a, k } of assets) {
      const li = document.createElement('li'), link = document.createElement('a');
      link.href = a.browser_download_url;
      link.innerHTML = `<span class="os">${k[0]}</span><span class="nm"></span><span class="sz mono">${fmtSize(a.size)}</span>`;
      const nm = link.querySelector('.nm'); nm.textContent = k[1];
      const sm = document.createElement('small'); sm.textContent = a.name; nm.appendChild(sm);
      li.appendChild(link); list.appendChild(li);
    }
    const v = (rel.tag_name || '').replace(/^v?/, 'v');
    if (v) $('#heroVer').textContent = v;
  }
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(j => { rel = j; renderRelease(); })
    .catch(() => { relErr = true; renderRelease(); });

  setLang(init);
  onScroll();
})();
