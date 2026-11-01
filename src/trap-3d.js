/* ===== トラッパー 3D盤（フェルトのミニチュア） ===== */
const TB = (() => {
  const SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let loading = null;
  function load() {
    if (window.THREE) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((ok, ng) => { const s = document.createElement('script'); s.src = SRC; s.onload = () => ok(); s.onerror = () => { loading = null; ng(new Error('3Dの読みこみに失敗しました')); }; document.head.appendChild(s); });
    return loading;
  }
  let T, C;
  let sd = 11; const rr = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  let FELT = null; const feltRep = {};
  function feltTex(rep) {
    if (!FELT) {
      const [c, g] = cv(256); g.fillStyle = '#ededed'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { const x = rr() * 256, y = rr() * 256, a = rr() * 6.3, l = 2 + rr() * 6, lt = rr() < .5; g.strokeStyle = lt ? `rgba(255,255,255,${.25 + rr() * .35})` : `rgba(0,0,0,${.08 + rr() * .12})`; g.lineWidth = .6 + rr() * .7; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      FELT = c;
    }
    if (!feltRep[rep]) { const t = new T.CanvasTexture(FELT); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; feltRep[rep] = t; }
    return feltRep[rep];
  }
  const mats = {};
  function felt(col, rep = 1) { const k = col + rep; if (!mats[k]) { const c = C(col).multiplyScalar(1.07); mats[k] = new T.MeshStandardMaterial({ color: c, map: feltTex(rep), bumpMap: feltTex(rep), bumpScale: .02, roughness: 1 }); } return mats[k]; }
  function stitchTex(col, ink) { const [c, g] = cv(128); g.fillStyle = col; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) { const x = rr() * 128, y = rr() * 128, a = rr() * 6.3, l = 1 + rr() * 3; g.strokeStyle = rr() < .5 ? `rgba(255,255,255,${.1 + rr() * .12})` : `rgba(0,0,0,${.04 + rr() * .06})`; g.lineWidth = .6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.strokeStyle = ink; g.lineWidth = 2.5; g.setLineDash([6, 5]); g.lineCap = 'round'; g.strokeRect(11, 11, 106, 106);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
  const mesh = (g, m) => { const o = new T.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; };
  const gloss = (col, o = {}) => new T.MeshPhysicalMaterial({ color: C(col), roughness: o.r ?? .25, metalness: o.m ?? 0, clearcoat: o.cc ?? .6, clearcoatRoughness: .2, transparent: !!o.t, opacity: o.t || 1 });
  const paint = (col, r = .55, m = 0) => new T.MeshStandardMaterial({ color: C(col), roughness: r, metalness: m });
  function rrect(w, d, r) { const s = new T.Shape(), x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
  function slab(w, d, h, r, m, bv = .05) { const g = new T.ExtrudeGeometry(rrect(w - 2 * bv, d - 2 * bv, r), { depth: h - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 3, curveSegments: 8 }); g.rotateX(-Math.PI / 2); g.translate(0, bv, 0); return mesh(g, m); }
  // ── コマ
  // 鳥：平たいフェルトの切り抜きを木の台に立てたコマ。横向き（くちばしが +x）で、平らな面が +z と -z。両面に羽・目・ほっぺ・縁のステッチ
  let SIL = null, THREAD = null;
  function silhouette() { const circ = [[0, .25, .2], [.15, .42, .13]], tri = [[-.1, .3], [-.36, .42], [-.1, .17]], P = [0, .3], pts = [];
    // 体・頭の円としっぽの三角の外形を、中心から放射状に測ってつなぐ
    for (let k = 0; k < 160; k++) { const a = k / 160 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); let best = 0;
      for (const [cx, cy, r] of circ) { const ox = P[0] - cx, oy = P[1] - cy, b = ox * dx + oy * dy, c = ox * ox + oy * oy - r * r, D = b * b - c; if (D >= 0) best = Math.max(best, -b + Math.sqrt(D)); }
      for (let i = 0; i < 3; i++) { const [x1, y1] = tri[i], [x2, y2] = tri[(i + 1) % 3], ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
        const t = ((x1 - P[0]) * ey - (y1 - P[1]) * ex) / den, u = ((x1 - P[0]) * dy - (y1 - P[1]) * dx) / den; if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t); }
      pts.push([P[0] + dx * best, P[1] + dy * best]); }
    return pts; }
  function dash(par, a, b, r = .005) { const d = new T.Vector3().subVectors(b, a); const o = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 5), THREAD); o.position.copy(a).add(b).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); par.add(o); }
  function bird(col) { const g = new T.Group(), st = new T.Group();
    if (!SIL) { SIL = silhouette(); THREAD = new T.MeshStandardMaterial({ color: C('#fff6e6'), roughness: .9 }); }
    const sh = new T.Shape(); SIL.forEach(([x, y], k) => k ? sh.lineTo(x, y) : sh.moveTo(x, y));
    const bg = new T.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: true, bevelThickness: .014, bevelSize: .012, bevelSegments: 2 }); bg.translate(0, 0, -.025); st.add(mesh(bg, felt(col, 4)));
    const F = .039, n = SIL.length, dk = '#' + C(col).multiplyScalar(.82).getHexString();
    const inset = SIL.map((p, k) => { const a = SIL[(k + n - 1) % n], b = SIL[(k + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty); return [p[0] - ty / L * .024, p[1] + tx / L * .024]; });
    const flat = (shape, m) => { const gg = new T.ExtrudeGeometry(shape, { depth: .008, bevelEnabled: false, curveSegments: 24 }); gg.translate(0, 0, -.004); return mesh(gg, m); };
    const eyeM = gloss('#121212', { r: .08, cc: 1 }), shine = new T.MeshBasicMaterial({ color: 0xffffff }), wings = [];
    for (const f of [-1, 1]) {
      // 羽は肩を軸に回る（はばたき）
      const piv = new T.Group(); piv.position.set(.056, .213, f * (F + .004)); st.add(piv); wings.push(piv);
      const w = new T.Shape(); w.absellipse(-.05 - .056, .24 - .213, .11, .065, 0, Math.PI * 2, false, -.25); piv.add(flat(w, felt(dk, 4)));
      const ck = new T.Shape(); ck.absarc(.21, .39, .025, 0, Math.PI * 2); const cm = flat(ck, felt('#ff9a9a', 4)); cm.position.z = f * (F + .004); st.add(cm);
      const e = mesh(new T.CylinderGeometry(.028, .028, .012, 20), eyeM); e.rotation.x = Math.PI / 2; e.position.set(.19, .45, f * (F + .006)); st.add(e);
      const h = new T.Mesh(new T.SphereGeometry(.008, 8, 6), shine); h.position.set(.182, .458, f * (F + .013)); st.add(h);
      for (let k = 0; k < n; k += 4) { const a = inset[k], b = inset[(k + 2) % n]; dash(st, new T.Vector3(a[0], a[1], f * (F + .002)), new T.Vector3(b[0], b[1], f * (F + .002))); }
    }
    const bt = new T.Shape(); bt.moveTo(.25, .46); bt.lineTo(.36, .42); bt.lineTo(.25, .38); bt.lineTo(.25, .46);
    const bkg = new T.ExtrudeGeometry(bt, { depth: .03, bevelEnabled: true, bevelThickness: .008, bevelSize: .006, bevelSegments: 2 }); bkg.translate(0, 0, -.015); st.add(mesh(bkg, felt('#f3a43a', 6)));
    st.position.y = -.01; g.add(st);
    const stand = slab(.36, .16, .05, .05, paint('#d6b085', .75), .015); g.add(stand);
    const flap = v => wings.forEach(p => p.rotation.z = -v * .7); flap(.25);
    g.userData.flap = flap; g.userData.stand = stand; return g; }
  let trapMats = null;
  function trap(ghost) { const g = new T.Group();
    if (!trapMats) trapMats = { mt: paint('#5d6066', .45, .35), red: paint('#d24a3a', .5), gmt: Object.assign(paint('#5d6066', .45, .35), { transparent: true, opacity: .45 }), gred: Object.assign(paint('#d24a3a', .5), { transparent: true, opacity: .45 }), gold: paint('#d9a63a', .3, .6) };
    const mt = ghost ? trapMats.gmt : trapMats.mt, red = ghost ? trapMats.gred : trapMats.red;
    const base = mesh(new T.CylinderGeometry(.28, .3, .05, 28), mt); base.position.y = .025; g.add(base);
    const jaws = [];
    for (const s of [-1, 1]) { const j = mesh(new T.TorusGeometry(.23, .035, 10, 24, Math.PI), mt); j.position.set(0, .06, 0); j.rotation.set(-Math.PI / 2 + s * 1.15, 0, s > 0 ? 0 : Math.PI); g.add(j); jaws.push(j); }
    const plate = mesh(new T.CylinderGeometry(.09, .09, .05, 20), red); plate.position.y = .07; g.add(plate);
    g.userData.jaws = jaws; g.userData.base = base; return g; }
  function seed() { const g = new T.Group(); for (const [x, z, ry] of [[0, 0, .3], [.11, .05, 1.4], [.04, .12, 2.4]]) { const s = mesh(new T.SphereGeometry(.06, 12, 10), felt('#4a3a2a')); s.scale.set(.6, .45, 1.1); s.position.set(x, .03, z); s.rotation.y = ry; g.add(s);
    const st = mesh(new T.SphereGeometry(.061, 12, 10, 0, Math.PI * 2, 0, .9), felt('#efe2c4')); st.scale.set(.18, .46, 1.11); st.position.set(x, .031, z); st.rotation.y = ry; g.add(st); } return g; }
  function apple(col = '#e04a3a') { const g = new T.Group(); const a = mesh(new T.SphereGeometry(.17, 24, 18), felt(col)); a.scale.set(1, .9, 1); a.position.y = .16; g.add(a);
    const st = mesh(new T.CylinderGeometry(.015, .02, .1, 8), paint('#6a4a2a', .8)); st.position.y = .34; st.rotation.z = .3; g.add(st); const lf = mesh(new T.SphereGeometry(.07, 12, 8), felt('#5aa84a')); lf.scale.set(1.3, .25, .7); lf.position.set(.07, .35, 0); lf.rotation.z = -.4; g.add(lf); return g; }
  function acorn() { const g = new T.Group(); const n = mesh(new T.SphereGeometry(.13, 24, 18), gloss('#f0b83a', { r: .2, m: .6, cc: 1 })); n.scale.set(1, 1.25, 1); n.position.y = .15; g.add(n);
    const cap = mesh(new T.SphereGeometry(.145, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), felt('#8a5a2a')); cap.position.y = .22; g.add(cap); const stem = mesh(new T.CylinderGeometry(.018, .018, .08, 8), paint('#5a3a1a', .8)); stem.position.y = .37; g.add(stem);
    const sp = mesh(new T.TorusGeometry(.2, .012, 8, 32), gloss('#ffe08a', { r: .2, m: .5 })); sp.rotation.x = Math.PI / 2; sp.position.y = .02; g.add(sp); return g; }
  function bubbles() { const g = new T.Group(); for (const [x, y, s] of [[.12, .42, .05], [.2, .55, .035], [.14, .66, .025]]) { const b = mesh(new T.SphereGeometry(s, 12, 8), gloss('#a86ad8', { t: .85 })); b.position.set(x, y, 0); b.castShadow = false; g.add(b); } return g; }
  // 落とし穴：土のふちがついた黒い穴
  function pit() { const g = new T.Group(); const hole = mesh(new T.CylinderGeometry(.27, .27, .012, 28), paint('#2a2018', .95)); hole.position.y = .008; hole.receiveShadow = true; hole.castShadow = false; g.add(hole);
    const rim = mesh(new T.TorusGeometry(.28, .045, 8, 28), felt('#8a6038')); rim.rotation.x = Math.PI / 2; rim.scale.z = .6; rim.position.y = .015; g.add(rim);
    for (const [a, s] of [[.6, 1], [2.4, .8], [4.3, .9]]) { const d = mesh(new T.SphereGeometry(.06, 10, 6), felt('#9a6e42')); d.scale.set(s, .45, s); d.position.set(Math.cos(a) * .36, .02, Math.sin(a) * .36); g.add(d); }
    return g; }
  // 風のうず（フェルトのひも）
  function gust(col = '#ffffff') { const g = new T.Group(); for (const [y, r, l] of [[.55, .16, 1.5], [.35, .12, 1.7], [.75, .1, 1.3]]) { const a = mesh(new T.TorusGeometry(r, .025, 8, 24, Math.PI * l), felt(col)); a.position.set(-.1 + r, y, 0); a.rotation.z = -.4; g.add(a);
      const tl = mesh(new T.CylinderGeometry(.025, .025, .45, 8), felt(col)); tl.rotation.z = Math.PI / 2; tl.position.set(-.1 - .1, y - r, 0); g.add(tl); } return g; }
  function flag(col) { const g = new T.Group(); const p = mesh(new T.CylinderGeometry(.012, .012, .7, 8), paint('#e8dcc0', .7)); p.position.y = .35; g.add(p);
    const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(.3, -.09); sh.lineTo(0, -.2); const f = mesh(new T.ExtrudeGeometry(sh, { depth: .012, bevelEnabled: false }), felt(col)); f.position.set(0, .68, 0); g.add(f);
    const b = mesh(new T.SphereGeometry(.03, 10, 8), gloss(col)); b.position.y = .71; g.add(b); return g; }
  function star(col) { const s = new T.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .05 : .13, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new T.ExtrudeGeometry(s, { depth: .03, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); return mesh(g, felt(col)); }
  // ── 飾り
  function pine(col, snow, s) { const g = new T.Group(); const t = mesh(new T.CylinderGeometry(.045, .06, .25, 8), paint('#8a5a32', .85)); t.position.y = .12; g.add(t);
    for (let j = 0; j < 3; j++) { const c = mesh(new T.ConeGeometry(.34 - j * .08, .34, 14), felt(col)); c.position.y = .36 + j * .19; g.add(c); if (snow) { const w = mesh(new T.ConeGeometry(.2 - j * .05, .14, 14), felt('#ffffff')); w.position.y = .47 + j * .19; g.add(w); } }
    g.scale.setScalar(s); return g; }
  function blob(col, s) { const g = new T.Group(); const t = mesh(new T.CylinderGeometry(.045, .065, .32, 8), paint('#8a5a32', .85)); t.position.y = .16; g.add(t);
    const c = mesh(new T.SphereGeometry(.3, 22, 16), felt(col)); c.position.y = .52; g.add(c); const c2 = mesh(new T.SphereGeometry(.18, 18, 12), felt(col)); c2.position.set(.18, .42, .12); g.add(c2); g.scale.setScalar(s); return g; }
  function mush(x, z) { const g = new T.Group(); const st = mesh(new T.CylinderGeometry(.03, .04, .1, 8), felt('#fbf1dd')); st.position.y = .05; g.add(st); const cp = mesh(new T.SphereGeometry(.08, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), felt('#e8584a')); cp.position.y = .09; g.add(cp);
    for (let k = 0; k < 4; k++) { const d = mesh(new T.SphereGeometry(.014, 6, 4), felt('#ffffff')); const a = k * 1.6; d.position.set(Math.cos(a) * .05, .14, Math.sin(a) * .05); g.add(d); } g.position.set(x, 0, z); return g; }
  function snowman() { const g = new T.Group(); const W = felt('#ffffff');
    for (const [r, y] of [[.3, .28], [.21, .7], [.15, .98]]) { const b = mesh(new T.SphereGeometry(r, 22, 16), W); b.position.y = y; g.add(b); }
    const sc = mesh(new T.TorusGeometry(.15, .045, 8, 20), felt('#e04a3a')); sc.rotation.x = Math.PI / 2; sc.position.y = .86; g.add(sc);
    const n = mesh(new T.ConeGeometry(.035, .16, 8), felt('#f08a2a')); n.rotation.x = Math.PI / 2; n.position.set(0, .98, .2); g.add(n);
    for (const s of [-1, 1]) { const e = mesh(new T.SphereGeometry(.025, 10, 6), gloss('#111')); e.position.set(s * .055, 1.03, .135); g.add(e); }
    const hat = mesh(new T.CylinderGeometry(.1, .1, .14, 16), felt('#3a3a4a')); hat.position.y = 1.18; g.add(hat); const br = mesh(new T.CylinderGeometry(.16, .16, .02, 20), felt('#3a3a4a')); br.position.y = 1.11; g.add(br);
    g.scale.setScalar(1.5); return g; }
  function palm(s, lean) { const g = new T.Group(); let y = 0, x = 0; for (let i = 0; i < 6; i++) { const seg = mesh(new T.CylinderGeometry(.06, .075, .2, 8), felt(i % 2 ? '#b98a56' : '#a87a48')); x += lean * .04 * i; seg.position.set(x, y + .1, 0); seg.rotation.z = -lean * .25; g.add(seg); y += .18; }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const lf = mesh(new T.SphereGeometry(.3, 16, 8), felt(k % 2 ? '#4fa25a' : '#62b562')); lf.scale.set(1, .12, .32); lf.position.set(x + Math.cos(a) * .24, y + .02, Math.sin(a) * .24); lf.rotation.y = -a; lf.rotation.z = -.35; g.add(lf); }
    for (const [dx, dz] of [[.05, .05], [-.05, .04]]) { const co = mesh(new T.SphereGeometry(.06, 10, 8), felt('#7a5230')); co.position.set(x + dx, y - .06, dz); g.add(co); }
    g.scale.setScalar(s); return g; }
  function umbrella() { const g = new T.Group(); const p = mesh(new T.CylinderGeometry(.015, .015, .7, 8), paint('#f4f0e6')); p.position.y = .35; g.add(p);
    const geo = new T.ConeGeometry(.42, .16, 8, 1, true); geo.clearGroups(); const per = geo.index.count / 8; for (let i = 0; i < 8; i++) geo.addGroup(i * per, per, i % 2);
    const u = mesh(geo, [felt('#ff6a5a'), felt('#ffffff')]); u.position.y = .72; g.add(u); g.rotation.z = .15; g.scale.setScalar(1.3); return g; }
  function hut() { const g = new T.Group(); const b = mesh(new T.BoxGeometry(.6, .45, .5), felt('#f2e2c4')); b.position.y = .225; g.add(b);
    const roof = mesh(new T.ConeGeometry(.5, .38, 4), felt('#c0503a')); roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 1.05); roof.position.y = .62; g.add(roof);
    const d = mesh(new T.BoxGeometry(.14, .24, .02), felt('#8a5a32')); d.position.set(0, .12, .26); g.add(d); const w = mesh(new T.BoxGeometry(.12, .1, .02), gloss('#ffe9a0')); w.position.set(.18, .28, .26); g.add(w); g.scale.setScalar(1.4); return g; }
  function flower(col) { const g = new T.Group(); const st = mesh(new T.CylinderGeometry(.012, .012, .22, 5), felt('#4f9a4a')); st.position.y = .11; g.add(st);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; const p = mesh(new T.SphereGeometry(.05, 8, 6), felt(col)); p.scale.set(1, .4, .7); p.position.set(Math.cos(a) * .06, .23, Math.sin(a) * .06); p.rotation.y = -a; g.add(p); }
    const c = mesh(new T.SphereGeometry(.035, 8, 6), felt('#ffd23a')); c.position.y = .24; g.add(c); g.scale.setScalar(1.6); return g; }
  function windmill() { const g = new T.Group(); const t = mesh(new T.CylinderGeometry(.22, .32, 1.1, 8), felt('#f4ead8')); t.position.y = .55; g.add(t);
    const r = mesh(new T.ConeGeometry(.3, .32, 8), felt('#c0503a')); r.position.y = 1.26; g.add(r); const hub = new T.Group(); hub.position.set(0, 1.0, .3); g.add(hub);
    for (let k = 0; k < 4; k++) { const b = mesh(new T.BoxGeometry(.1, .5, .02), felt('#fffaf0')); b.position.y = .28; const arm = new T.Group(); arm.add(b); arm.rotation.z = k * Math.PI / 2 + .4; hub.add(arm); }
    g.userData.hub = hub; g.scale.setScalar(1.35); return g; }
  function hay() { const h = mesh(new T.CylinderGeometry(.2, .2, .32, 18), felt('#e8c35a')); h.rotation.z = Math.PI / 2; h.position.y = .2; const g = new T.Group(); g.add(h); g.scale.setScalar(1.4); return g; }
  function rock(s) { const r = mesh(new T.DodecahedronGeometry(.16, 0), felt('#a8a49a')); r.scale.set(s, s * .6, s); r.position.y = .05; return r; }
  function pondAt(sc, x, z, sx, sz, col, rimCol) { const p = mesh(new T.CylinderGeometry(1, 1, .04, 40), gloss(col, { r: .03, cc: 1 })); p.scale.set(sx, 1, sz); p.position.set(x, 0, z); sc.add(p);
    const rm = mesh(new T.TorusGeometry(1, .06, 8, 40), felt(rimCol)); rm.rotation.x = Math.PI / 2; rm.scale.set(sx, sz, 1); rm.position.set(x, .02, z); sc.add(rm); }
  // ── 島とコース
  const SH = {
    circle: t => [3.3 * Math.cos(t), 3.15 * Math.sin(t)],
    bean: t => { const r = 3.2 + .36 * Math.cos(2 * t + .7); return [r * Math.cos(t) * .96, r * Math.sin(t)]; },
    bloom: t => { const r = 3.15 + .28 * Math.sin(3 * t + .4); return [r * Math.cos(t), r * Math.sin(t)]; },
    squircle: t => { const c = Math.cos(t), s = Math.sin(t); return [3.3 * Math.sign(c) * Math.abs(c) ** .5, 3.15 * Math.sign(s) * Math.abs(s) ** .5]; },
  };
  const TH = {
    snow:   { name: '雪の島', shape: 'circle', ground: '#dce4ee', soil: '#8a6a52', tiles: ['#fbfdff', '#cfe0f0', '#6f8ab0'], sky: ['#c8d8f2', '#e6eefa', '#f8f4fb'], fg: '#2e3a52', sub: '#5f6f8c' },
    beach:  { name: '南の島', shape: 'bean', ground: '#f3dcaa', soil: '#c99a5e', tiles: ['#fff8e6', '#ffe6cc', '#d0a070'], sky: ['#a8e2ff', '#bfe7f5', '#6fb4cf'], sea: true, fg: '#123a4a', sub: '#2f6a80' },
    autumn: { name: '秋の島', shape: 'bloom', ground: '#a9aa62', soil: '#8a5a3a', tiles: ['#fff2dc', '#f8dcb8', '#b8845a'], sky: ['#ffd9a8', '#ffeccf', '#fff7ea'], fg: '#4a2e1a', sub: '#8a6248' },
    flower: { name: '花の島', shape: 'squircle', ground: '#9ed27e', soil: '#9a6a45', tiles: ['#fffaf2', '#ffe8ee', '#d098a8'], sky: ['#d8eeff', '#f2f6ff', '#fff0f4'], fg: '#3a3326', sub: '#7a6e58' },
  };
  // 島の形は24マス用。マスがふえたら島を同じ割合で大きくして、1マスの大きさをそろえる
  function trackOf(shape, n = TR.CELLS) {
    const K = n / 24, f = t => SH[shape](t).map(v => v * K), M = 2400, t0 = 3 * Math.PI / 4, pts = [], L = [0];
    for (let i = 0; i <= M; i++) { pts.push(f(t0 + i / M * Math.PI * 2)); if (i) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    const tot = L[M], out = []; let j = 0;
    for (let k = 0; k < n; k++) { const want = k / n * tot; while (L[j + 1] < want) j++; const [x, z] = pts[j], [x2, z2] = pts[j + 1]; out.push({ x, z, a: Math.atan2(z2 - z, x2 - x) }); }
    return { cells: out, size: Math.min(.9, tot / n - .1), f, K };
  }
  function islandShape(tr, pad) { const s = new T.Shape(); for (let i = 0; i <= 120; i++) { const [x, z] = tr.f(i / 120 * Math.PI * 2), r = Math.hypot(x, z), k = (r + pad) / r; i ? s.lineTo(x * k, -z * k) : s.moveTo(x * k, -z * k); } return s; }
  function slabShape(shape, h, m, bv = .1) { const g = new T.ExtrudeGeometry(shape, { depth: h - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 3, curveSegments: 16 }); g.rotateX(-Math.PI / 2); g.translate(0, bv, 0); return mesh(g, m); }
  function inside(tr, x, z, margin) { const a = Math.atan2(z, x); const [cx, cz] = tr.f(a); return Math.hypot(x, z) < Math.hypot(cx, cz) - .6 - margin; }
  function decorate(sc, th, tr) { sd = 3; const put = (o, x, z, ry) => { o.position.x = x; o.position.z = z; o.rotation.y = ry ?? rr() * 6; sc.add(o); return o; };
    const scatter = (n, make, margin, avoid = []) => { for (let i = 0, c = 0; i < 400 && c < n; i++) { const x = (rr() - .5) * 6, z = (rr() - .5) * 6; if (!inside(tr, x, z, margin)) continue; if (avoid.some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r)) continue; put(make(c), x, z); c++; } };
    const out = {};
    if (th === 'snow') { pondAt(sc, -.5, .6, 1.0, .7, '#9fd0ee', '#ffffff'); put(snowman(), 1.2, .5, -.3); scatter(15, i => pine(['#3d8f6a', '#4f9a74', '#2f7a5a'][i % 3], true, 1 + rr() * .5), 0, [[-.5, .6, 1.4], [1.2, .5, .6]]); scatter(5, () => rock(.8 + rr() * .6), .1, [[-.5, .6, 1.3]]); }
    if (th === 'beach') { pondAt(sc, -.3, .3, 1.5, 1.0, '#6cc8d4', '#fff2d0'); scatter(6, i => palm(1.1 + rr() * .3, i % 2 ? .6 : -.6), .1, [[-.3, .3, 1.9]]); put(umbrella(), 1.6, 1.3, 0); for (const [x, z, c] of [[1.2, -1.3, '#ff8a6a'], [-1.9, -1.0, '#ffb04a'], [.8, 1.9, '#ff7a9a']]) { const s = star(c); s.position.set(x, .01, z); s.rotation.y = x; sc.add(s); } }
    if (th === 'autumn') { put(hut(), .2, -.5, .3); scatter(12, i => i % 4 === 3 ? pine('#c8642a', false, 1) : blob(['#e8783a', '#d84a3a', '#f0b23a'][i % 3], .85 + rr() * .4), 0, [[.2, -.5, 1.0]]); scatter(14, () => { const l = mesh(new T.CylinderGeometry(.06, .06, .01, 8), felt(['#e8783a', '#d84a3a', '#f0b23a'][Math.floor(rr() * 3)])); l.position.y = .01; return l; }, -.2); [[-1.2, 1.4], [1.4, 1.2], [-.4, 1.9]].forEach(([x, z]) => sc.add(mush(x, z))); }
    if (th === 'flower') { out.mill = put(windmill(), -.8, -.6, .4); pondAt(sc, 1.0, .9, .85, .6, '#6ab8e8', '#b8b0a0'); scatter(60, i => flower(['#ff7a9a', '#ffffff', '#b98aff', '#ffb04a'][i % 4]), -.1, [[-.8, -.6, .7], [1.0, .9, 1.1]]); scatter(3, () => hay(), .2, [[-.8, -.6, .8], [1.0, .9, 1.2]]); }
    return out;
  }
  const BIRD_COL = ['#e85a4a', '#4a86e0', '#f2c23a'];
  // ── 盤
  function Board(host, theme) {
    const th = TH[theme] || TH.flower, tr = trackOf(th.shape);
    const R = new T.WebGLRenderer({ antialias: true, alpha: true }); R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.outputEncoding = T.sRGBEncoding; R.setClearColor(0, 0);
    R.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation'; host.append(R.domElement);
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight(C('#eaf4ff'), C('#7a8a5a'), .6));
    const SR = 6 * tr.K, key = new T.DirectionalLight(C('#fff4e2'), 1.25); key.position.set(-5, 10, 4).multiplyScalar(tr.K); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -SR, right: SR, top: SR, bottom: -SR, far: 30 * tr.K }); key.shadow.bias = -.0006; sc.add(key);
    const rim = new T.DirectionalLight(C('#ffffff'), .35); rim.position.set(5, 4, -6); sc.add(rim);
    sd = 11;
    const soil = slabShape(islandShape(tr, .5), .7, felt(th.soil, 2), .12); soil.position.y = -.95; sc.add(soil);
    const ground = slabShape(islandShape(tr, .53), .3, felt(th.ground, 3), .12); ground.position.y = -.3; sc.add(ground);
    if (th.sea) { const sea = mesh(new T.CylinderGeometry(40, 40, .05, 48), felt('#6fb4cf', 6)); sea.position.y = -.7; sea.castShadow = false; sc.add(sea); }
    // 飾りは24マスの島の大きさで並べて、島ごと大きくする
    const dg = new T.Group(); dg.scale.setScalar(tr.K); sc.add(dg);
    const deco = decorate(dg, theme, { f: SH[th.shape] });
    const [cA, cB, ink] = th.tiles; const tA = stitchTex(cA, ink), tB = stitchTex(cB, ink), tN = stitchTex('#f6d6a8', '#b98a5a'); const S = tr.size;
    const tiles = [], tops = [];
    tr.cells.forEach((p, k) => { const g = new T.Group(); const col = k === 0 ? '#f6d6a8' : (k % 2 ? cA : cB);
      g.add(slab(S, S, .14, .16, felt(col), .04));
      const top = new T.Mesh(new T.PlaneGeometry(S - .06, S - .06), new T.MeshStandardMaterial({ map: k === 0 ? tN : (k % 2 ? tA : tB), roughness: 1 })); top.rotation.x = -Math.PI / 2; top.position.y = .141; top.receiveShadow = true; top.userData.cell = k; g.add(top); tops.push(top);
      g.position.set(p.x, -.04, p.z); g.rotation.y = -p.a; sc.add(g); tiles.push(g); });
    const P = k => { const p = tr.cells[k]; return new T.Vector3(p.x, .1, p.z); };
    // 巣
    { const v = P(0); const nest = mesh(new T.TorusGeometry(.33, .05, 10, 32), felt('#a8743e')); nest.rotation.x = Math.PI / 2; nest.position.set(v.x, v.y + .04, v.z); sc.add(nest);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, tw = mesh(new T.CylinderGeometry(.012, .012, .26, 5), felt('#8a5a2a')); tw.rotation.set(Math.PI / 2, 0, a); tw.position.set(v.x + Math.cos(a) * .33, v.y + .07, v.z + Math.sin(a) * .33); tw.rotation.y = a + 1.2; sc.add(tw); } }
    const BS = 1.3;
    const birds = BIRD_COL.map(c => { const b = bird(c); b.scale.setScalar(BS); sc.add(b); return b; });
    const dyn = new T.Group(); sc.add(dyn);
    const cam = new T.PerspectiveCamera(36, 1, .1, 100);
    // カメラ：ふだんは盤のコースがぴったり入る距離。指で回す・傾ける・ひろげる・ずらす
    const EL0 = Math.atan2(15.5, 10.1), TARGET = new T.Vector3(0, -.1, .15);
    const V = { az: 0, el: EL0, zoom: 1, pan: new T.Vector3() }; let fitDist = 20;
    const half = S / 2 + .12, bounds = []; tr.cells.forEach(c => { for (const [dx, dz] of [[-half, -half], [half, -half], [-half, half], [half, half]]) bounds.push(new T.Vector3(c.x + dx, 0, c.z + dz)); bounds.push(new T.Vector3(c.x, .75, c.z)); });
    const dirOf = (az, el) => new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    let W = 1, H = 1;
    function applyCam() { const tg = TARGET.clone().add(V.pan); cam.position.copy(tg).addScaledVector(dirOf(V.az, V.el), fitDist * V.zoom); cam.lookAt(tg); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); faceAll(); dirty = true; draw(); }
    function fit() {
      const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); R.setSize(W, H, false); cam.aspect = W / H;
      const D = dirOf(0, EL0); let lo = 3, hi = 60; for (let it = 0; it < 22; it++) { const d = (lo + hi) / 2; cam.position.copy(TARGET).addScaledVector(D, d); cam.lookAt(TARGET); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
        const ok = bounds.every(v => { const p = v.clone().project(cam); return Math.abs(p.x) < .95 && Math.abs(p.y) < .95; }); if (ok) hi = d; else lo = d; }
      fitDist = hi; applyCam(); }
    const changed = () => Math.abs(V.az) > .02 || Math.abs(V.el - EL0) > .02 || Math.abs(V.zoom - 1) > .02 || V.pan.length() > .05;
    const resetBtn = document.createElement('button'); resetBtn.className = 'tp-reset'; resetBtn.type = 'button'; resetBtn.textContent = '視点をもどす'; resetBtn.hidden = true; host.append(resetBtn);
    function resetView() { const a0 = { ...V, pan: V.pan.clone() }; const az0 = ((a0.az + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      anim(420, u => { V.az = az0 * (1 - u); V.el = a0.el + (EL0 - a0.el) * u; V.zoom = a0.zoom + (1 - a0.zoom) * u; V.pan.copy(a0.pan).multiplyScalar(1 - u); applyCam(); }, () => { resetBtn.hidden = true; }, 0, t => 1 - (1 - t) ** 3); }
    resetBtn.addEventListener('click', e => { e.stopPropagation(); resetView(); });
    const viewMoved = () => { applyCam(); resetBtn.hidden = !changed(); };
    // 指の操作
    const el = R.domElement, ptr = new Map(); let g0 = null, tapCb = null, lastTap = 0;
    el.style.touchAction = 'none';
    const two = () => { const [a, b] = [...ptr.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
    function startGesture() { const p = [...ptr.values()]; g0 = { n: p.length, az: V.az, el: V.el, zoom: V.zoom, pan: V.pan.clone(), x: p[0].x, y: p[0].y, t: performance.now(), moved: g0 ? g0.moved : false, ...(p.length > 1 ? two() : {}) }; }
    // 指が1本目のときは前の指の記録を捨てる（離した知らせが届かず指が残ったままになると、タップが効かなくなるため）
    el.addEventListener('pointerdown', e => { if (e.isPrimary) ptr.clear(); try { el.setPointerCapture(e.pointerId); } catch (x) { } ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 1) g0 = null; startGesture(); });
    el.addEventListener('pointermove', e => { if (!ptr.has(e.pointerId) || !g0) return; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size === 1) { const p = ptr.get(e.pointerId), dx = p.x - g0.x, dy = p.y - g0.y; if (!g0.moved && Math.hypot(dx, dy) < 8) return; g0.moved = true;
        V.az = g0.az - dx * .009; V.el = Math.min(1.45, Math.max(.42, g0.el + dy * .006)); viewMoved(); }
      else if (ptr.size === 2 && g0.d) { const q = two(); g0.moved = true; V.zoom = Math.min(1.25, Math.max(.4, g0.zoom * g0.d / Math.max(20, q.d)));
        const k = fitDist * V.zoom / Math.max(200, H) * 1.1, right = new T.Vector3(Math.cos(V.az), 0, -Math.sin(V.az)), fwd = new T.Vector3(-Math.sin(V.az), 0, -Math.cos(V.az));
        V.pan.copy(g0.pan).addScaledVector(right, -(q.cx - g0.cx) * k).addScaledVector(fwd, (q.cy - g0.cy) * k); if (V.pan.length() > 3) V.pan.setLength(3); viewMoved(); } });
    const up = e => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
      if (ptr.size === 0 && g0) { const tap = !g0.moved && g0.n === 1 && performance.now() - g0.t < 500; const now = performance.now();
        if (tap) { if (now - lastTap < 320 && changed()) { lastTap = 0; resetView(); } else { lastTap = now; tapCb && tapCb(e.clientX, e.clientY); } } g0 = null; }
      else if (ptr.size === 1) startGesture();
      if (!ptr.size) kick(); };
    const lost = e => { if (!ptr.delete(e.pointerId)) return; if (ptr.size) { startGesture(); g0.moved = true; } else { g0 = null; kick(); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', lost); el.addEventListener('lostpointercapture', lost);
    el.addEventListener('wheel', e => { e.preventDefault(); V.zoom = Math.min(1.25, Math.max(.4, V.zoom * Math.exp(e.deltaY * .0012))); viewMoved(); }, { passive: false });
    // 影は光が動かないので、物が動いたときだけ描き直す（視点を動かすだけなら前の影を使う。動かすと重くなるのはここが大きい）
    // 風車だけが回っているときは、毎フレームではなく1秒に20回くらいに落とす
    R.shadowMap.autoUpdate = false;
    let dirty = true, raf = 0, shadowDue = true, lastDraw = 0, millN = 0; const anims = [];
    function frame(now) { raf = 0; let alive = false;
      if (anims.length) shadowDue = true;
      for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i]; const t = Math.min(1, (now - a.t0) / a.dur); if (t >= 0) a.step(a.ease ? a.ease(t) : t, t); if (t >= 1) { anims.splice(i, 1); a.done && a.done(); } else alive = true; }
      const millOnly = deco.mill && !dirty && !shadowDue && !anims.length;
      if (millOnly && now - lastDraw < 48) { raf = requestAnimationFrame(frame); return; }
      if (deco.mill) { deco.mill.userData.hub.rotation.z += .01 * Math.min(4, Math.max(1, (now - lastDraw) / 16.7)); alive = true; if (++millN % 6 === 0) shadowDue = true; }
      if (shadowDue) { R.shadowMap.needsUpdate = true; shadowDue = false; }
      R.render(sc, cam); dirty = false; lastDraw = now; if (alive || anims.length) raf = requestAnimationFrame(frame); }
    const draw = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const kick = () => { shadowDue = true; draw(); };
    function anim(dur, step, done, delay = 0, ease) { anims.push({ t0: performance.now() + delay, dur, step, done, ease }); kick(); }
    const eo = t => 1 - (1 - t) * (1 - t), eb = t => { const c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
    // 同じマスに複数の鳥：少しずらす
    function slot(k, i, n) { const v = P(k); if (n < 2) return v; const p = tr.cells[k], r = n === 2 ? .24 : .31, a = (n === 2 ? [Math.PI, 0] : [Math.PI * 7 / 6, -Math.PI / 6, Math.PI / 2])[i % 3], off = [Math.cos(a) * r, -Math.sin(a) * r], ca = Math.cos(-p.a), sa = Math.sin(-p.a); return v.add(new T.Vector3(off[0] * ca + off[1] * sa, 0, -off[0] * sa + off[1] * ca)); }
    // 平らな面をカメラに向け、くちばしを画面の上で進む側（左か右）に向ける。少しだけ奥へひねって立体に見せる
    function face(b, k) { const a = tr.cells[k], n = tr.cells[(k + 1) % tr.cells.length], s = (n.x - a.x) * Math.cos(V.az) - (n.z - a.z) * Math.sin(V.az) >= 0 ? 1 : -1;
      b.rotation.y = V.az + (s > 0 ? 0 : Math.PI) - s * .3; b.userData.cell = k; }
    function faceAll() { if (typeof birds === 'undefined' || busy) return; birds.forEach(b => b.userData.cell != null && face(b, b.userData.cell)); }
    var state = null, busy = false;
    function placeBirds(pos) { for (let i = 0; i < 3; i++) { const k = pos[i + 1], same = [1, 2, 3].filter(j => pos[j] === k), v = slot(k, same.indexOf(i + 1), same.length); birds[i].position.copy(v); birds[i].scale.setScalar(same.length > 2 ? BS * .8 : same.length > 1 ? BS * .9 : BS); face(birds[i], k); } }
    const trapObjs = {}, foodObjs = {}, pitObjs = {}; let marks = [];
    function syncItems(t, view) {
      // 落とし穴（罠士の画面だけ）
      const wantPit = new Set(view.trapper ? t.pits || [] : []);
      for (const c in pitObjs) if (!wantPit.has(+c)) { dyn.remove(pitObjs[c]); delete pitObjs[c]; }
      wantPit.forEach(c => { if (pitObjs[c]) return; const o = pit(); const v = P(c); o.position.set(v.x, v.y, v.z); dyn.add(o); pitObjs[c] = o; });
      // 罠
      const want = new Set(t.traps.map(x => x.c));
      for (const c in trapObjs) if (!want.has(+c)) { dyn.remove(trapObjs[c]); delete trapObjs[c]; }
      t.traps.forEach(x => { if (!trapObjs[x.c]) { const o = trap(); const v = P(x.c); o.position.set(v.x - .08, v.y, v.z - .08); o.rotation.y = x.c; dyn.add(o); trapObjs[x.c] = o; }
        const o = trapObjs[x.c]; o.userData.base.material = x.q && !x.old ? trapMats.gold : trapMats.mt; });
      // エサ
      for (const c in foodObjs) { const f = t.food[c]; if (!f || foodObjs[c].userData.key !== f.v + ':' + !!(f.poison && view.trapper)) { dyn.remove(foodObjs[c]); delete foodObjs[c]; } }
      for (const c in t.food) if (!foodObjs[c]) { const f = t.food[c]; const o = apple(); if (f.poison && view.trapper) o.add(bubbles()); const v = P(+c); o.position.set(v.x + .1, v.y, v.z + .1); o.rotation.y = +c; o.userData.key = f.v + ':' + !!(f.poison && view.trapper); dyn.add(o); foodObjs[c] = o; }
    }
    function setMarks(view) {
      marks.forEach(m => sc.remove(m)); marks = [];
      (view.flags || []).forEach(([k, col]) => { const f = flag(col); const v = P(k); f.position.set(v.x + .26, v.y, v.z - .26); sc.add(f); marks.push(f); });
      (view.ghosts || []).forEach(k => { const g = trap(true); const v = P(k); g.position.set(v.x - .08, v.y + .02, v.z - .08); sc.add(g); marks.push(g); });
      (view.rings || []).forEach(([k, col]) => { const r = new T.Mesh(new T.TorusGeometry(.36, .035, 8, 32), new T.MeshBasicMaterial({ color: C(col) })); r.rotation.x = Math.PI / 2; const v = P(k); r.position.set(v.x, v.y + .03, v.z); sc.add(r); marks.push(r); });
      dirty = true; kick();
    }
    function sync(t, view = {}) { state = t; if (!busy) { placeBirds(t.pos); syncItems(t, view); } setMarks(view); kick(); }
    // ── 演出
    function hop(i, path, onStep, done) {
      const b = birds[i]; let k = 0;
      const next = () => { if (k >= path.length) { done && done(); return; } const from = b.position.clone(), c = path[k], to = P(c); face(b, c); const last = k === path.length - 1;
        anim(230, t => { b.position.lerpVectors(from, to, t); b.position.y = to.y + Math.sin(Math.PI * t) * .5; b.userData.flap(.25 + Math.sin(Math.PI * t) * 1.1); }, () => { onStep && onStep(c, last); k++; next(); }); };
      next();
    }
    // カメラに向いて立つ星（スピンは children[0].rotation.y）
    function standStar(col, s) { const g = new T.Group(), st = star(col); st.rotation.x = Math.PI / 2; st.scale.setScalar(s); g.add(st); g.rotation.y = V.az; return g; }
    const right = () => new T.Vector3(Math.cos(V.az), 0, -Math.sin(V.az));
    // エサ：りんごが頭の上にポーン → 下で2回ぴょんぴょん → 落ちてきたら星がはじける（案は tools/motion-mockup.html の2）
    function eatShow(b, got, done) {
      const base = b.position.clone(), R0 = right(), top = k => base.clone().addScaledVector(R0, (k - (got.length - 1) / 2) * .4).add(new T.Vector3(0, 1.3, 0)), from = got.map(o => o.position.clone());
      anim(400, u => got.forEach((o, k) => { o.position.lerpVectors(from[k], top(k), eo(u)); o.position.y += Math.sin(Math.PI * u) * .25; o.rotation.y = u * 6; }), () => {
        anim(800, u => { b.position.y = base.y + Math.abs(Math.sin(u * Math.PI * 2)) * .32; b.userData.flap(.25 + Math.abs(Math.sin(u * Math.PI * 4)) * 1.2); got.forEach((o, k) => { o.position.y = top(k).y + Math.sin(u * Math.PI * 2) * .06; o.rotation.y += .05; }); }, () => {
          b.position.y = base.y; b.userData.flap(.25);
          const mid = base.clone().addScaledVector(R0, .1).add(new T.Vector3(0, .55, 0)), f2 = got.map(o => o.position.clone());
          anim(200, u => got.forEach((o, k) => { o.position.lerpVectors(f2[k], mid, u); o.scale.setScalar(Math.max(.001, 1 - u)); }), () => {
            got.forEach(o => dyn.remove(o));
            const st = [0, 1, 2, 3].map(k => { const s = standStar(k % 2 ? '#ffe27a' : '#ffd23a', .9); dyn.add(s); return s; });
            anim(600, u => st.forEach((s, k) => { const a = k / 4 * Math.PI * 2 + .4, e = eo(u); s.position.copy(mid).addScaledVector(R0, Math.cos(a) * .65 * e); s.position.y = mid.y + .2 + Math.sin(a) * .45 * e; s.scale.setScalar(Math.max(.001, 1 - u)); s.children[0].rotation.y = u * 3; }),
              () => { st.forEach(s => dyn.remove(s)); done(); });
          });
        });
      });
    }
    // 罠：とび上がって、頭の上を星が3つぐるぐる → ふらふらしてから巣へ（案は tools/motion-mockup.html の1）
    function dizzy(b, done) {
      const from = b.position.clone(), to = P(0), st = [0, 1, 2].map(() => { const s = standStar('#ffd23a', .75); s.visible = false; dyn.add(s); return s; });
      anim(250, u => { b.position.y = from.y + Math.sin(Math.PI * u) * .3; }, () => {
        b.position.y = from.y; st.forEach(s => s.visible = true);
        anim(1200, u => { const ms = u * 1200, pop = Math.max(.001, eb(Math.min(1, ms / 250)) * (1 - Math.max(0, (ms - 1050) / 150))); b.rotation.z = Math.sin(ms * .011) * .22;
          st.forEach((s, k) => { const a = ms * .006 + k * Math.PI * 2 / 3; s.position.set(from.x + Math.cos(a) * .3, from.y + .95, from.z + Math.sin(a) * .3); s.scale.setScalar(pop); s.rotation.y = V.az; s.children[0].rotation.y = ms * .01; }); }, () => {
          st.forEach(s => dyn.remove(s)); b.rotation.z = 0;
          anim(700, u => { b.position.lerpVectors(from, to, u); b.position.y = to.y + Math.sin(Math.PI * u) * 1.6; b.userData.flap(.25 + Math.abs(Math.sin(u * 18)) * 1.2); }, done, 0, eo);
        });
      });
    }
    function play(ev, t, view, cb) {
      state = t; busy = true;
      const finish = () => { busy = false; if (state) { placeBirds(state.pos); syncItems(state, view || {}); } kick(); cb && cb(); };
      if (ev.kind === 'move') {
        const i = ev.seat - 1, got = [];
        hop(i, ev.path, (c, last) => {
          if (ev.broke && ev.broke.includes(c) && trapObjs[c]) { const o = trapObjs[c]; delete trapObjs[c]; anim(380, u => { o.position.y = .1 + u * .9; o.rotation.x = u * 5; o.scale.setScalar(1 - u); }, () => dyn.remove(o)); }
          if (!last) return;
          if (ev.caught && trapObjs[c]) { const o = trapObjs[c]; o.userData.jaws.forEach((j, s) => { const r0 = j.rotation.x; anim(140, u => j.rotation.x = r0 + (s ? -1 : 1) * u * .9); }); }
          for (const fc of [c, ...(ev.grabbed || [])]) if (ev.food && foodObjs[fc]) { got.push(foodObjs[fc]); delete foodObjs[fc]; }
        }, () => {
          const b = birds[i];
          if (ev.caught) dizzy(b, finish);
          else if (got.length) eatShow(b, got, finish);
          else setTimeout(finish, 150);
        });
        return;
      }
      if (ev.kind === 'place') {
        syncItems({ ...t, traps: t.traps.filter(x => !ev.cells.includes(x.c)) }, view || {});
        ev.cells.forEach((c, j) => { const o = trap(); const v = P(c); o.position.set(v.x - .08, v.y, v.z - .08); o.rotation.y = c; dyn.add(o); trapObjs[c] = o; o.userData.base.material = state.traps.find(x => x.c === c && x.q) ? trapMats.gold : trapMats.mt;
          anim(420, u => { o.position.y = v.y + (1 - u) * 1.4; }, null, j * 110, eb); });
        setTimeout(finish, 420 + ev.cells.length * 110); return;
      }
      finish();
    }
    function pick(clientX, clientY) { const r = R.domElement.getBoundingClientRect(); const m = new T.Vector2((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1); const rc = new T.Raycaster(); rc.setFromCamera(m, cam);
      const hit = rc.intersectObjects(tops, false)[0]; if (hit) return hit.object.userData.cell;
      // 少しはずれても一番近いマス
      const p = new T.Vector3(); rc.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -.1), p); let best = -1, bd = .7; tr.cells.forEach((c, k) => { const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = k; } }); return best < 0 ? null : best; }
    function screenOf(k, dy = .6) { const v = P(k); v.y += dy; v.project(cam); const r = R.domElement.getBoundingClientRect(); return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height }; }
    let ro = null; try { ro = new ResizeObserver(fit); ro.observe(host); } catch (e) { window.addEventListener('resize', fit); }
    fit();
    return { el: R.domElement, sync, play, pick, screenOf, fit, resetView, set onTap(f) { tapCb = f; }, get busy() { return busy; },
      dispose() { cancelAnimationFrame(raf); ro && ro.disconnect(); R.dispose(); R.forceContextLoss && R.forceContextLoss(); R.domElement.remove(); } };
  }
  // ── カードの絵（起動時に一度だけ描いて画像にする）
  const ART = {};
  function die3(n) { const g = new T.Group(); const b = slab(.5, .5, .5, .1, felt('#fffaf0'), .06); g.add(b); const L = { 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]] }[n];
    L.forEach(([a, c]) => { const p = mesh(new T.SphereGeometry(.045, 10, 6), felt('#e04a3a')); p.scale.y = .4; p.position.set(a * .13, .5, c * .13); g.add(p); }); return g; }
  function cardArts() {
    if (ART.flap) return ART;
    const w = 240, h = 180, R = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(w, h); R.shadowMap.enabled = true; R.outputEncoding = T.sRGBEncoding; R.setClearColor(0, 0);
    const draw = (kind, build, look) => { const sc = new T.Scene(); sc.add(new T.HemisphereLight(C('#ffffff'), C('#8a8a7a'), .85)); const d = new T.DirectionalLight(C('#fff4e2'), 1.2); d.position.set(-2, 5, 4); d.castShadow = true; d.shadow.mapSize.set(512, 512); sc.add(d);
      const shp = new T.Mesh(new T.PlaneGeometry(6, 6), new T.ShadowMaterial({ opacity: .22 })); shp.rotation.x = -Math.PI / 2; shp.receiveShadow = true; sc.add(shp); build(sc);
      const cam = new T.PerspectiveCamera(30, w / h, .1, 50); cam.position.set(.9, 1.7, 3.1); cam.lookAt(...look); R.render(sc, cam); ART[kind] = R.domElement.toDataURL('image/png'); };
    sd = 21;
    draw('flap', sc => { const b = bird('#4a86e0'); b.userData.flap(1.3); b.position.y = .3; b.rotation.y = .4; b.scale.setScalar(1.6); b.userData.stand.visible = false; sc.add(b); for (const [x, z] of [[-.25, .2], [.2, .25], [0, -.2]]) { const p = mesh(new T.SphereGeometry(.08, 12, 8), felt('#ffffff')); p.scale.y = .6; p.position.set(x, .04, z); sc.add(p); } }, [0, .6, 0]);
    draw('wait', sc => { const bu = blob('#62b562', 1.1); bu.children[0].visible = false; bu.position.set(.15, -.15, .1); sc.add(bu); const b = bird('#4a86e0'); b.scale.setScalar(1.4); b.position.set(-.35, 0, -.1); b.rotation.y = .7; b.userData.stand.visible = false; sc.add(b); }, [0, .35, 0]);
    draw('dash', sc => { const a = die3(4); a.position.set(-.33, 0, 0); a.rotation.y = .5; sc.add(a); const b = die3(5); b.position.set(.33, 0, .1); b.rotation.y = -.3; sc.add(b); }, [0, .25, 0]);
    draw('tackle', sc => { const b = bird('#4a86e0'); b.scale.setScalar(1.5); b.rotation.set(.35, .9, 0); b.position.set(-.3, .05, 0); b.userData.stand.visible = false; sc.add(b); const t1 = trap(); t1.scale.setScalar(1.2); t1.position.set(.45, 0, .1); t1.rotation.set(0, .4, .5); sc.add(t1);
      for (let k = 0; k < 5; k++) { const s = star('#ffd23a'); s.scale.setScalar(.6); s.position.set(.2 + rr() * .5, .45 + rr() * .3, rr() * .3); s.rotation.set(1.3, 0, rr()); sc.add(s); } }, [0, .35, 0]);
    draw('quality', sc => { const t = trap(); t.traverse(o => { if (o.material === trapMats.mt) o.material = trapMats.gold; }); t.scale.setScalar(1.8); sc.add(t); for (const [x, y, z] of [[.5, .55, 0], [-.45, .45, .1], [.1, .75, -.1]]) { const s = star('#ffe27a'); s.position.set(x, y, z); s.rotation.x = 1.3; s.scale.setScalar(.8); sc.add(s); } }, [0, .3, 0]);
    draw('extra', sc => { const a = trap(); a.scale.setScalar(1.5); a.position.set(-.3, 0, -.1); sc.add(a); const b = trap(); b.scale.setScalar(1.5); b.position.set(.3, 0, .2); b.rotation.y = 1; sc.add(b);
      const pl = new T.Group(); pl.add(mesh(new T.BoxGeometry(.32, .1, .1), felt('#f2b92a')), mesh(new T.BoxGeometry(.1, .32, .1), felt('#f2b92a'))); pl.position.set(.45, .7, 0); sc.add(pl); }, [0, .3, 0]);
    draw('poison', sc => { const a = apple('#8a4ac0'); a.scale.setScalar(2.2); sc.add(a); for (const [x, y, s] of [[.35, .75, .07], [.5, .95, .05], [.42, 1.1, .035]]) { const b = mesh(new T.SphereGeometry(s, 12, 8), gloss('#7acf5a', { t: .85 })); b.position.set(x, y, 0); sc.add(b); } }, [0, .45, 0]);
    draw('tailwind', sc => { const gu = gust('#7fbde8'); gu.position.set(-.55, 0, -.1); sc.add(gu); const b = bird('#4a86e0'); b.userData.flap(.9); b.scale.setScalar(1.4); b.position.set(.3, .05, 0); b.rotation.y = .3; b.userData.stand.visible = false; sc.add(b); }, [0, .4, 0]);
    draw('grab', sc => { const b = bird('#e85a4a'); b.scale.setScalar(1.4); b.position.set(-.05, 0, -.1); b.rotation.y = .4; sc.add(b); const s = apple(); s.scale.setScalar(1.2); s.position.set(-.6, 0, .2); sc.add(s); const a = apple(); a.scale.setScalar(1.3); a.position.set(.65, 0, .15); sc.add(a); }, [0, .3, 0]);
    draw('call', sc => { const a = bird('#e85a4a'); a.scale.setScalar(1.25); a.position.set(-.38, 0, 0); a.rotation.y = .4; a.userData.flap(.8); sc.add(a); const b = bird('#f2c23a'); b.scale.setScalar(1.25); b.position.set(.42, 0, .1); b.rotation.y = Math.PI + .3; sc.add(b); }, [0, .35, 0]);
    draw('wind', sc => { const gu = gust('#6f8fa8'); gu.scale.setScalar(1.3); gu.position.set(-.35, -.1, 0); sc.add(gu); for (const [x, y, c] of [[.55, .55, '#e8783a'], [.35, .85, '#d84a3a'], [.7, .3, '#f0b23a']]) { const l = mesh(new T.SphereGeometry(.09, 12, 8), felt(c)); l.scale.set(1.3, .3, .7); l.position.set(x, y, 0); l.rotation.set(1, 0, x * 3); sc.add(l); } }, [0, .45, 0]);
    draw('pit', sc => { const p = pit(); p.scale.setScalar(1.9); sc.add(p); const s = apple(); s.scale.setScalar(1.1); s.position.set(.05, .02, .05); sc.add(s); }, [0, .1, 0]);
    draw('ticket', sc => { const b = bird('#e85a4a'); b.scale.setScalar(1.5); b.position.set(-.35, 0, 0); b.rotation.y = .6; sc.add(b); const t1 = trap(); t1.scale.setScalar(1.4); t1.position.set(.45, 0, .1); sc.add(t1); const s = apple(); s.scale.setScalar(1.2); s.position.set(.05, 0, .55); sc.add(s); }, [0, .3, 0]);
    R.dispose(); R.forceContextLoss && R.forceContextLoss();
    return ART;
  }
  // ── 遊びかたスライドの絵（はじめて開いたときに一度だけ描く）
  const RULE = {};
  function ruleArts() {
    if (RULE.roles) return RULE;
    const R = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(560, 420); R.shadowMap.enabled = true; R.outputEncoding = T.sRGBEncoding; R.setClearColor(0, 0);
    const shot = (kind, build, cam, look) => { const sc = new T.Scene(); sc.add(new T.HemisphereLight(C('#ffffff'), C('#8a8a7a'), .8));
      const d = new T.DirectionalLight(C('#fff4e2'), 1.15); d.position.set(-2.5, 6, 4); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); sc.add(d);
      const shp = new T.Mesh(new T.PlaneGeometry(10, 10), new T.ShadowMaterial({ opacity: .2 })); shp.rotation.x = -Math.PI / 2; shp.receiveShadow = true; sc.add(shp);
      build(sc); const c = new T.PerspectiveCamera(30, 4 / 3, .1, 50); c.position.set(...cam); c.lookAt(...look); R.render(sc, c); RULE[kind] = R.domElement.toDataURL('image/png'); };
    const tA = stitchTex('#fffaf2', '#d098a8'), tB = stitchTex('#ffe8ee', '#d098a8');
    const tile = (sc, x, k) => { const g = new T.Group(); g.add(slab(.8, .8, .14, .16, felt(k % 2 ? '#fffaf2' : '#ffe8ee'), .04));
      const top = new T.Mesh(new T.PlaneGeometry(.74, .74), new T.MeshStandardMaterial({ map: k % 2 ? tA : tB, roughness: 1 })); top.rotation.x = -Math.PI / 2; top.position.y = .141; top.receiveShadow = true; g.add(top); g.position.x = x; sc.add(g); };
    const put = (sc, o, x, y, z, s, ry = 0) => { o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; sc.add(o); return o; };
    sd = 31;
    shot('roles', sc => { put(sc, trap(), -1.05, 0, .1, 1.7, .5); put(sc, bird(BIRD_COL[0]), .35, 0, .25, 1.45, -.3); put(sc, bird(BIRD_COL[1]), .95, 0, -.25, 1.45, -.3); put(sc, bird(BIRD_COL[2]), 1.35, 0, .45, 1.45, -.3); }, [.2, 2.3, 5.6], [.15, .35, 0]);
    shot('place', sc => { tile(sc, -.9, 0); tile(sc, 0, 1); tile(sc, .9, 0); put(sc, trap(), -.9, .14, 0, 1.25, .4); put(sc, trap(), .9, .9, 0, 1.25, -.3); put(sc, die3(3), 0, .14, .55, 1, .5); }, [0, 2.4, 4.8], [0, .35, 0]);
    shot('move', sc => { [-1.2, -.4, .4, 1.2].forEach((x, k) => tile(sc, x, k)); const b = put(sc, bird(BIRD_COL[1]), 0, .55, 0, 1.4, -.3); b.userData.flap(1.2);
      for (const x of [-.9, -.55, -.2]) { const p = mesh(new T.SphereGeometry(.035, 8, 6), felt('#ffffff')); p.position.set(x, .45 + Math.sin((x + 1) * 2.5) * .25, 0); sc.add(p); }
      put(sc, die3(4), -1.05, .14, .75, 1, .6); }, [0, 2.3, 5.0], [0, .35, 0]);
    shot('food', sc => { put(sc, bird(BIRD_COL[0]), 0, 0, 0, 1.6, -.3); for (let k = 0; k < 5; k++) { const a = Math.PI * (1.08 - k * .29); put(sc, apple(), Math.cos(a) * 1.15, k % 2 ? .55 : .1, Math.sin(a) * .35 + .3, 1.05, k); } }, [0, 2.0, 5.0], [0, .4, 0]);
    shot('caught', sc => { const t = trap(); t.userData.jaws.forEach((j, k) => j.rotation.x += (k ? -1 : 1) * .9); put(sc, t, 0, 0, 0, 1.7, .6); const b = put(sc, bird(BIRD_COL[2]), 0, .05, 0, 1.45, -.3); b.rotation.z = .2; b.userData.flap(-.3);
      for (let k = 0; k < 3; k++) { const s = star('#ffd23a'); s.rotation.x = Math.PI / 2 - .3; const a = k * 2.1 + .3; s.position.set(Math.cos(a) * .42 + .1, 1.0 + k * .03, Math.sin(a) * .3); sc.add(s); } }, [0, 1.9, 4.3], [0, .5, 0]);
    R.dispose(); R.forceContextLoss && R.forceContextLoss();
    return RULE;
  }
  return {
    load, THEMES: () => TH, ready: () => !!window.THREE,
    ruleArts() { this.init(); return ruleArts(); },
    init() { if (T) return; T = window.THREE; C = c => new T.Color(c).convertSRGBToLinear(); },
    board(host, theme) { this.init(); return Board(host, theme); },
    arts() { this.init(); return cardArts(); },
    // モックアップ用（tools/motion-mockup.html）。コマや飾りの部品をそのまま使う
    parts() { this.init(); return { T, C, felt, mesh, gloss, paint, slab, stitchTex, bird, apple, trap, star }; },
  };
})();
