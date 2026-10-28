// 3D 정합 데모: 장면 포인트 클라우드 위에 모델을 맞춰 가는 모습 (브라우저 시뮬레이션).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const box = document.getElementById('cloudBox');
if (box) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * .7;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, .1, 100);
  cam.position.set(3.6, 2.9, 4.3);
  const ctl = new OrbitControls(cam, renderer.domElement);
  ctl.enableDamping = true; ctl.enablePan = false; ctl.minDistance = 3; ctl.maxDistance = 14;
  ctl.autoRotate = !reduce; ctl.autoRotateSpeed = .8; ctl.target.set(-.2, .35, .1);

  // 부품 표면 샘플: 직육면체 윗면·옆면 + 원기둥 보스
  function partSurface(n) {
    const p = [];
    const W = 1.6, D = 1.0, Hh = .5;
    for (let i = 0; i < n; i++) {
      const r = rnd();
      if (r < .45) p.push([(rnd() - .5) * W * 2, Hh, (rnd() - .5) * D * 2]);
      else if (r < .6) p.push([(rnd() - .5) * W * 2, rnd() * Hh, D]);
      else if (r < .72) p.push([W, rnd() * Hh, (rnd() - .5) * D * 2]);
      else if (r < .78) p.push([-W, rnd() * Hh, (rnd() - .5) * D * 2]);
      else if (r < .9) { const a = rnd() * Math.PI * 2; p.push([.7 + Math.cos(a) * .38, Hh + rnd() * .55, Math.sin(a) * .38]); }
      else { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * .38; p.push([.7 + Math.cos(a) * rr, Hh + .55, Math.sin(a) * rr]); }
    }
    return p;
  }
  const truePose = new THREE.Matrix4().compose(new THREE.Vector3(-.3, 0, .2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .6, 0)), new THREE.Vector3(1, 1, 1));

  // 장면 클라우드: 바닥 + 부품(보이는 면만 대충) + 잡음 물체
  const sp = [];
  for (let i = 0; i < 9000; i++) sp.push([(rnd() - .5) * 8, gauss() * .02, (rnd() - .5) * 8]);
  const v = new THREE.Vector3();
  for (const q of partSurface(5200)) { v.set(q[0] + gauss() * .015, q[1] + gauss() * .015, q[2] + gauss() * .015).applyMatrix4(truePose); sp.push([v.x, v.y, v.z]); }
  for (let i = 0; i < 1400; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * .7; sp.push([2.4 + Math.cos(a) * r, .25 - r * r * .4 + gauss() * .02, -2 + Math.sin(a) * r]); }
  const pos = new Float32Array(sp.length * 3), colr = new Float32Array(sp.length * 3);
  const c0 = new THREE.Color('#3b1f6b'), c1 = new THREE.Color('#d94b7b'), c2 = new THREE.Color('#ffb547'), tmp = new THREE.Color();
  sp.forEach((q, i) => {
    pos.set(q, i * 3);
    const k = Math.min(1, Math.max(0, q[1] / 1.1));
    tmp.copy(k < .5 ? c0 : c1).lerp(k < .5 ? c1 : c2, k < .5 ? k * 2 : k * 2 - 1);
    colr.set([tmp.r, tmp.g, tmp.b], i * 3);
  });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: .035, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: .9 })));

  // 모델 (민트색) — ICP 로 끌려온다
  const mp = partSurface(1600), mpos = new Float32Array(mp.length * 3);
  mp.forEach((q, i) => mpos.set(q, i * 3));
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const model = new THREE.Points(mg, new THREE.PointsMaterial({ size: .05, color: '#7cf0a5', sizeAttenuation: true }));
  model.matrixAutoUpdate = false;
  scene.add(model);
  const frameBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.2, .5, 2).translate(0, .25, 0)), new THREE.LineBasicMaterial({ color: '#7cf0a5', transparent: true, opacity: .6 }));
  frameBox.matrixAutoUpdate = false; scene.add(frameBox);
  const axes = new THREE.AxesHelper(.9); axes.matrixAutoUpdate = false; scene.add(axes);

  const tP = new THREE.Vector3(), tQ = new THREE.Quaternion(), tS = new THREE.Vector3();
  truePose.decompose(tP, tQ, tS);
  let sP = new THREE.Vector3(), sQ = new THREE.Quaternion(), iter = 0, hold = 0;
  const cur = new THREE.Matrix4(), cP = new THREE.Vector3(), cQ = new THREE.Quaternion();
  function restart() {
    sP.set(tP.x + (rnd() - .5) * 3, 1.4 + rnd() * .8, tP.z + (rnd() - .5) * 3);
    sQ.setFromEuler(new THREE.Euler((rnd() - .5) * 1.2, rnd() * 3, (rnd() - .5) * 1.2));
    cP.copy(sP); cQ.copy(sQ); iter = 0; hold = 0;
  }
  restart();
  const itEl = document.getElementById('icpIt'), rmsEl = document.getElementById('icpRms');
  let acc = 0;
  function step(dt) {
    acc += dt;
    while (acc > .08) { // ICP 반복 한 번씩
      acc -= .08;
      if (iter < 30) { iter++; const k = iter < 4 ? .18 : .32; cP.lerp(tP, k); cQ.slerp(tQ, k); }
      else if ((hold += .08) > 2.6) restart();
    }
    cur.compose(cP, cQ, tS);
    model.matrix.copy(cur); frameBox.matrix.copy(cur); axes.matrix.copy(cur);
    const err = cP.distanceTo(tP) + cQ.angleTo(tQ) * .8;
    itEl.textContent = 'iter ' + iter;
    rmsEl.textContent = 'RMS ' + (Math.max(.012, err * .9) + (iter >= 30 ? 0 : .004)).toFixed(3) + ' mm';
  }

  // 바닥 격자
  const grid = new THREE.GridHelper(8, 16, '#6a2c6e', '#2b1c4f'); grid.material.transparent = true; grid.material.opacity = .45; scene.add(grid);

  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(box); resize();
  let visible = false, last = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { last = 0; requestAnimationFrame(loop); } }).observe(box);
  function loop(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    if (!reduce) step(dt); else if (iter < 30) { cP.copy(tP); cQ.copy(tQ); iter = 30; step(0); }
    ctl.update(); renderer.render(scene, cam);
    if (visible) requestAnimationFrame(loop);
  }
}
