/* ===== トランプの3Dテーブル（大富豪・ババ抜き） ===== */
// 白い空間に緑のフェルトの卓（tools/cards3d-mockup.html の1）。ほかの人は白い手ぶくろの手（手首なし）がカードの扇を持つ（tools/hands3d-mockup.html の2）
// 自分の手札は別の場面に置いて重ねて描く（見わたしても画面の下に残り、下を向いても卓にめりこまない）。指で引っぱる・スマホを傾けると、首をふるように見わたせる
const CD3 = (() => {
  const PI = Math.PI;
  let T, C, P, ready = null;
  function load() {
    if (!ready) ready = TB.load().then(() => { if (!T) { P = TB.parts(); T = P.T; C = P.C; } }, e => { ready = null; throw e; });
    return ready;
  }
  const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const tex = c => { const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
  const COLS = ['#5aa8e8', '#f2c84b', '#7fd19b', '#d98ad6', '#ff9a4a', '#e85a4a', '#8a8a9a', '#4fc1c0'];

  /* ---- カードの絵（マークは形で描く。絵文字にならないように） ---- */
  function suit(g, s, x, y, r) { g.beginPath();
    if (s === 'H') { g.moveTo(x, y + r * .9); g.bezierCurveTo(x - r * 1.3, y, x - r * .9, y - r * 1.1, x, y - r * .35); g.bezierCurveTo(x + r * .9, y - r * 1.1, x + r * 1.3, y, x, y + r * .9); }
    if (s === 'D') { g.moveTo(x, y - r); g.lineTo(x + r * .72, y); g.lineTo(x, y + r); g.lineTo(x - r * .72, y); }
    if (s === 'S') { g.moveTo(x, y - r); g.bezierCurveTo(x + r * 1.3, y - r * .1, x + r * .9, y + r * 1.0, x, y + r * .35); g.bezierCurveTo(x - r * .9, y + r * 1.0, x - r * 1.3, y - r * .1, x, y - r); g.moveTo(x, y + r * .2); g.lineTo(x + r * .35, y + r * 1.05); g.lineTo(x - r * .35, y + r * 1.05); }
    if (s === 'C') { [[0, -.48], [-.48, .1], [.48, .1]].forEach(([a, b]) => { g.moveTo(x + a * r + r * .44, y + b * r); g.arc(x + a * r, y + b * r, r * .44, 0, 7); }); g.moveTo(x, y); g.lineTo(x + r * .3, y + r * 1.05); g.lineTo(x - r * .3, y + r * 1.05); }
    g.closePath(); g.fill(); }
  const INK = ['#2c3228', '#d9483b'], PAPER = '#fffdf8';
  const mats = {};
  function faceMat(card) {
    if (mats[card]) return mats[card];
    const W = 256, H = 358, [c, g] = cv(W, H); g.fillStyle = PAPER; g.fillRect(0, 0, W, H); g.strokeStyle = '#e8e0d0'; g.lineWidth = 8; g.beginPath(); g.roundRect(14, 14, W - 28, H - 28, 18); g.stroke();
    if (card === 'JK') { g.fillStyle = INK[1]; g.font = '900 46px "Zen Maru Gothic", sans-serif'; g.textAlign = 'center'; g.fillText('JOKER', W / 2, H / 2 + 80);
      g.save(); g.translate(W / 2, H / 2 - 20); g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 26 : 62, a = i / 10 * PI * 2 - PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fillStyle = INK[0]; g.fill(); g.restore(); }
    else { const s = card[0], r = card[1] === 'T' ? '10' : card[1], col = s === 'H' || s === 'D' ? INK[1] : INK[0];
      g.fillStyle = col; g.font = `900 ${r.length > 1 ? 58 : 68}px "Zen Maru Gothic", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(r, 58, 30); suit(g, s, 58, 128, 22);
      g.save(); g.translate(W, H); g.rotate(PI); g.fillText(r, 58, 30); suit(g, s, 58, 128, 22); g.restore(); suit(g, s, W / 2, H / 2 + 4, 62); }
    return mats[card] = new T.MeshStandardMaterial({ map: tex(c), roughness: .8 });
  }
  function backMat() {
    if (mats.back) return mats.back;
    const W = 256, H = 358, [c, g] = cv(W, H); g.fillStyle = PAPER; g.fillRect(0, 0, W, H); g.save(); g.beginPath(); g.roundRect(20, 20, W - 40, H - 40, 14); g.clip(); g.fillStyle = '#d9483b'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let i = -H; i < W + H; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); g.beginPath(); g.moveTo(i + H, 0); g.lineTo(i, H); g.stroke(); } g.restore();
    return mats.back = new T.MeshStandardMaterial({ map: tex(c), roughness: .8 });
  }
  const CW = .64, CH = .9;
  let BODY = null, FACE = null;
  // カード1枚：寝かせた形（表が +y、上の辺が -z）。card が null なら両面とも裏
  function cardMesh(card) {
    if (!BODY) { BODY = P.slab(CW, CH, .012, .06, P.felt(PAPER, 2), .005); FACE = new T.PlaneGeometry(CW - .01, CH - .01); }
    const g = new T.Group(); g.add(BODY.clone());
    const top = new T.Mesh(FACE, card ? faceMat(card) : backMat()); top.rotation.x = -PI / 2; top.position.y = .013; top.receiveShadow = true; g.add(top);
    const bk = new T.Mesh(FACE, backMat()); bk.rotation.x = PI / 2; bk.position.y = -.001; g.add(bk);
    g.userData.card = card; return g;
  }

  /* ---- 手：白い手ぶくろ（ふっくらしたフェルトの切り抜き、手首なし）。こちらから見えるのは手の甲 ---- */
  let HAND = null;
  function handProto() {
    if (HAND) return HAND;
    const s = new T.Shape(), F = [[.112, .4, .062], [.048, .48, .066], [-.02, .51, .068], [-.09, .47, .066]]; // 小指 → 人さし指：[まん中, 先の高さ, はば]
    s.moveTo(.1, 0); s.lineTo(.145, .22);
    F.forEach(([x, top, w]) => { s.lineTo(x + w / 2, top - w / 2); s.absarc(x, top - w / 2, w / 2, 0, PI, false); s.lineTo(x - w / 2, .27); });
    s.lineTo(-.125, .25); s.bezierCurveTo(-.17, .28, -.24, .3, -.255, .23); s.bezierCurveTo(-.265, .16, -.19, .12, -.135, .07); s.lineTo(-.1, 0); s.quadraticCurveTo(0, -.04, .1, 0);
    const D = .05, BT = .04, bend = y => -y * y * .35, geo = new T.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: BT, bevelSize: .026, bevelSegments: 6, curveSegments: 18 });
    geo.translate(0, 0, -D / 2); const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + bend(pos.getY(i))); geo.computeVertexNormals();
    const g = new T.Group(); g.add(P.mesh(geo, P.felt('#fbfaf6', 4)));
    const front = y => D / 2 + BT + bend(y) + .002, dots = new T.Group(), sm = P.felt('#c8c0b0', 2), dg = new T.SphereGeometry(.0065, 6, 4);
    const dash = (x, y, a) => { const o = new T.Mesh(dg, sm); o.position.set(x, y, front(y)); o.scale.set(1.25, 1, .6); o.rotation.z = a; dots.add(o); };
    const pts = s.getSpacedPoints(150); for (let i = 0; i < pts.length - 1; i += 2) { const p = pts[i], q = pts[i + 1], t = new T.Vector2(q.x - p.x, q.y - p.y).normalize(); dash(p.x - t.y * .02, p.y + t.x * .02, Math.atan2(t.y, t.x)); }
    [-.05, .01, .07].forEach(x => { for (let y = .1; y < .25; y += .03) dash(x, y, PI / 2); }); // 甲の3本の縫い目
    g.add(P.merge(dots)); return HAND = g;
  }

  /* ---- 名札：名前と、いまのようす（手番・パス・あがり） ---- */
  function tagTex(name, col, sub, now) {
    const [c, g] = cv(320, 120); g.fillStyle = now ? '#ff5a36' : '#fffdf8'; g.beginPath(); g.roundRect(4, 4, 312, 112, 22); g.fill();
    g.fillStyle = col; g.beginPath(); g.roundRect(4, 4, 22, 112, [22, 0, 0, 22]); g.fill();
    g.strokeStyle = now ? 'rgba(255,255,255,.7)' : '#d8ccb0'; g.lineWidth = 4; g.setLineDash([10, 8]); g.beginPath(); g.roundRect(14, 14, 292, 92, 14); g.stroke(); g.setLineDash([]);
    g.fillStyle = now ? '#fff' : '#2c3228'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 50; g.font = `900 ${fs}px "Zen Maru Gothic", sans-serif`; while (g.measureText(name).width > 250 && fs > 24) { fs -= 2; g.font = `900 ${fs}px "Zen Maru Gothic", sans-serif`; }
    g.fillText(name, 168, sub ? 46 : 62); if (sub) { g.font = '700 26px "Zen Maru Gothic", sans-serif'; g.fillStyle = now ? '#fff' : '#7d7a72'; g.fillText(sub, 168, 90); }
    return tex(c);
  }

  function Table() {
    const el = document.createElement('canvas'); el.className = 'cd-3d'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'トランプのテーブル');
    const R = new T.WebGLRenderer({ canvas: el, antialias: true }); R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; R.shadowMap.autoUpdate = false; R.outputEncoding = T.sRGBEncoding; R.autoClear = false; R.setClearColor(0xf6f5f2, 1);
    const sc = new T.Scene(), hs = new T.Scene(), rig = new T.Object3D(); hs.add(rig);
    sc.add(new T.HemisphereLight(C('#ffffff'), C('#b8b4a8'), .7));
    const key = new T.DirectionalLight(C('#fff6ea'), 1.0); key.position.set(-4, 9, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 30 }); key.shadow.bias = -.0006; sc.add(key);
    const rim = new T.DirectionalLight(C('#ffffff'), .35); rim.position.set(4, 4, -6); sc.add(rim);
    hs.add(new T.HemisphereLight(C('#ffffff'), C('#b8b4a8'), .75)); const hk = new T.DirectionalLight(C('#fff6ea'), .9); hk.position.set(-2, 6, 4); hs.add(hk);
    // 卓：緑のフェルトにふちの縫い目。下にうすい影だけ
    const top = P.slab(6.6, 5.8, .36, 1.1, P.felt('#2f7a4a', 6), .1); top.position.y = -.36; sc.add(top);
    const fl = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: .16 })); fl.rotation.x = -PI / 2; fl.position.y = -.36; fl.receiveShadow = true; sc.add(fl);
    const ring = new T.Group(), sm = P.felt('#9fd0a8', 2), sg = new T.CylinderGeometry(.012, .012, .1, 5);
    for (let i = 0; i < 80; i++) { const a = i / 80 * PI * 2, s = new T.Mesh(sg, sm); s.rotation.z = PI / 2; s.rotation.y = -a + PI / 2; s.position.set(Math.cos(a) * 3.0, .005, Math.sin(a) * 2.6); ring.add(s); } sc.add(P.merge(ring));
    const dyn = new T.Group(); sc.add(dyn);

    /* ---- カメラ：頭の位置から、首をふるように向きだけ変える ---- */
    const cam = new T.PerspectiveCamera(46, 1, .1, 80), HEAD = new T.Vector3(0, 3.1, 3.8), look = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
    let w = 1, h = 1;
    function aim() { cam.position.copy(HEAD); const p = -.62 + look.pitch; cam.lookAt(HEAD.x + Math.sin(look.yaw) * Math.cos(p) * 5, HEAD.y + Math.sin(p) * 5, HEAD.z - Math.cos(look.yaw) * Math.cos(p) * 5); cam.updateMatrixWorld(); rig.position.copy(cam.position); rig.quaternion.copy(cam.quaternion); rig.updateMatrixWorld(true); }
    function resize() { const r = el.parentNode ? el.parentNode.getBoundingClientRect() : null; if (!r || r.width < 2 || r.height < 2) return; if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1) return; w = r.width; h = r.height; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); layoutHand(); draw(); }

    /* ---- 描く：変わったときと、動いているあいだだけ ---- */
    let raf = 0, inFrame = false, again = false, dead = false, shadowDue = true;
    const anims = [];
    function frame(now) {
      raf = 0; inFrame = true; again = false;
      for (let k = anims.length - 1; k >= 0; k--) { const a = anims[k], u = Math.min(1, Math.max(0, (now - a.t0) / a.dur)); a.step(u); if (u >= 1) { anims.splice(k, 1); a.end && a.end(); } }
      const moving = Math.abs(look.ty - look.yaw) > .001 || Math.abs(look.tp - look.pitch) > .001;
      look.yaw += (look.ty - look.yaw) * .25; look.pitch += (look.tp - look.pitch) * .25; aim();
      if (anims.length) shadowDue = true; if (shadowDue) { R.shadowMap.needsUpdate = true; shadowDue = false; }
      R.clear(); R.render(sc, cam); R.clearDepth(); R.render(hs, cam);
      inFrame = false; if (anims.length || moving || again) raf = requestAnimationFrame(frame);
    }
    const draw = () => { if (dead) return; if (inFrame) again = true; else if (!raf) raf = requestAnimationFrame(frame); };
    const kick = () => { shadowDue = true; draw(); };
    const anim = (dur, step, end, delay = 0) => { anims.push({ t0: performance.now() + delay, dur, step, end }); draw(); };
    const io = u => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;

    /* ---- ほかの人：テーブルのむこうがわに、左（次の人）から右へならぶ ---- */
    const rivals = {}; // 席 → { g, fan, tag, n, key }
    let S = null;
    function rivalPos(i, k) { const spread = Math.min(150, 50 * k) * PI / 180, a = k === 1 ? PI / 2 : PI / 2 + spread / 2 - i * spread / (k - 1); return { x: Math.cos(a) * 2.45, z: -Math.sin(a) * 2.2 + .25, a }; }
    function seatXZ(seat) { if (!S || seat === S.me) return { x: 0, z: 2.6 }; const r = rivals[seat]; return r ? { x: r.g.position.x, z: r.g.position.z } : { x: 0, z: -2 }; }
    function buildFan(r, n, hover) {
      r.fan.clear(); const m = Math.min(n, 14);
      for (let i = 0; i < m; i++) { const c = cardMesh(null); c.rotation.x = PI / 2; c.position.y = CH / 2 - .14 + (i === hover ? .12 : 0); const p = new T.Group(); p.add(c); p.rotation.z = (m > 1 ? i / (m - 1) - .5 : 0) * Math.min(1.25, .14 * m); p.position.z = -.03 - i * .006; r.fan.add(p); }
    }
    function syncRivals() {
      const n = S.n, others = []; for (let k = 1; k < n; k++) others.push((S.me + k) % n);
      Object.keys(rivals).forEach(s => { if (!others.includes(+s)) { dyn.remove(rivals[s].g); dyn.remove(rivals[s].tag); delete rivals[s]; } });
      const sc8 = others.length > 5 ? .72 : others.length > 3 ? .85 : 1;
      others.forEach((seat, i) => {
        let r = rivals[seat];
        if (!r) { const g = new T.Group(), fan = new T.Group(); fan.position.set(0, .2, -.09); g.add(fan); const hd = handProto().clone(); hd.scale.setScalar(1.3); g.add(hd);
          const tag = new T.Mesh(new T.PlaneGeometry(.95, .36), new T.MeshStandardMaterial({ roughness: 1 })); tag.castShadow = true; dyn.add(g, tag); r = rivals[seat] = { g, fan, tag, n: -1, key: '', hv: -2 }; }
        const p = rivalPos(i, others.length), info = S.seats[seat];
        r.g.position.set(p.x, .5, p.z); r.g.rotation.order = 'YXZ'; r.g.rotation.y = Math.atan2(-p.x, -p.z + .6); r.g.rotation.x = -.18; r.g.scale.setScalar(sc8);
        const hover = S.target && S.target.seat === seat ? -1 : (S.hover && S.hover.target === seat ? S.hover.i : -1);
        r.g.visible = info.count > 0; if (r.n !== info.count || r.hv !== hover) { r.n = info.count; r.hv = hover; buildFan(r, info.count, hover); }
        const key = [info.name, info.sub, info.now, S.colors[seat]].join('|');
        if (r.key !== key) { r.key = key; if (r.tag.material.map) r.tag.material.map.dispose(); r.tag.material.map = tagTex(info.name, S.colors[seat], info.sub, info.now); r.tag.material.needsUpdate = true; }
        r.tag.position.set(p.x * .62, .2, p.z * .62 + .45); r.tag.rotation.order = 'YXZ'; r.tag.rotation.y = Math.atan2(-p.x, -p.z + 2.5) * .7; r.tag.rotation.x = -.5; r.tag.scale.setScalar(Math.max(.8, sc8));
      });
    }
    /* ---- 場のカード ---- */
    let fieldObjs = [], fieldKey = '', pile = [], pileN = 0;
    function placeField(cards, from) {
      const key = cards.join(); if (key === fieldKey) return; fieldKey = key;
      fieldObjs.forEach(o => { // 流れたカードは、すみの山へ
        const x0 = o.position.x, z0 = o.position.z, tx = -2.0 + Math.random() * .3, tz = .3 + Math.random() * .3; pile.push(o);
        anim(320, u => { const e = io(u); o.position.x = x0 + (tx - x0) * e; o.position.z = z0 + (tz - z0) * e; o.position.y = .01 + pile.indexOf(o) * .002 + Math.sin(PI * u) * .3; }); });
      while (pile.length > 24) dyn.remove(pile.shift());
      fieldObjs = cards.map((c, i) => { const o = cardMesh(c), n = cards.length, tx = (i - (n - 1) / 2) * .42, tz = -.25 + (i % 2) * .04, ry = (Math.random() - .5) * .25; o.rotation.y = ry; dyn.add(o);
        const f = from || { x: tx, z: tz }; o.position.set(f.x, .6, f.z);
        anim(340, u => { const e = io(u); o.position.set(f.x + (tx - f.x) * e, .02 + i * .003 + Math.sin(PI * u) * .6 * (1 - u), f.z + (tz - f.z) * e); }, null, i * 40); return o; });
      kick();
    }
    // ババ抜き：捨てたペアの山（まん中に、だんだん高くなる）
    function placePile(n) {
      if (n === pileN) return;
      for (let i = pileN; i < n; i++) { const o = cardMesh(null), a = Math.random() * 6.3, r = Math.random() * .5; o.position.set(Math.cos(a) * r, .01 + i * .003, -.3 + Math.sin(a) * r * .7); o.rotation.y = Math.random() * 6.3; dyn.add(o); pile.push(o); }
      pileN = n; kick();
    }

    /* ---- 自分の手札（重ねて描く場面）と、ババ抜きで引く相手の手札 ---- */
    const handG = new T.Group(); handG.position.set(0, -1.05, -3.3); handG.rotation.x = -.2; handG.scale.setScalar(.76); rig.add(handG);
    const targG = new T.Group(); targG.position.set(0, .15, -3.8); targG.rotation.x = -.1; targG.scale.setScalar(.62); rig.add(targG);
    let handKey = '', targKey = '';
    function layoutHand() {
      const cs = S && S.hand || [], key = cs.join() + '|' + [...(S && S.sel || [])].join() + '|' + (S && S.hidden) + '|' + w / h;
      if (key === handKey) return; handKey = key; handG.clear();
      const n = cs.length, wide = Math.min(w / h * 3.4, 2.9), W = Math.min(wide, Math.max(.4, n * .3)), ang = Math.min(.6, n * .05);
      cs.forEach((c, i) => { const u = n > 1 ? i / (n - 1) - .5 : 0, m = cardMesh(S.hidden ? null : c); m.rotation.x = PI / 2; const p = new T.Group(); p.add(m); p.userData.hand = i;
        p.position.set(u * W, (S.sel && S.sel.has(c) ? .22 : 0) - u * u * ang * .7, -Math.abs(u) * .1 + i * .004); p.rotation.z = -u * ang; handG.add(p); });
      draw();
    }
    function layoutTarget() {
      const t = S && S.target, key = t ? t.seat + ':' + t.n + ':' + t.hover : '';
      if (key === targKey) return; targKey = key; targG.clear(); if (!t) { draw(); return; }
      const n = t.n, W = Math.min(2.4, n * .32);
      for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) - .5 : 0, m = cardMesh(null); m.rotation.x = PI / 2; const p = new T.Group(); p.add(m); p.userData.target = i;
        p.position.set(u * W, (i === t.hover ? .25 : 0) - u * u * .25, i * .004); p.rotation.z = -u * .4; targG.add(p); }
      draw();
    }

    /* ---- 動き：だれかが出した・引いたとき ---- */
    let lastSeq = null;
    function fly(card, from, to, done) { const o = cardMesh(card); o.position.set(from.x, .7, from.z); dyn.add(o);
      anim(380, u => { const e = io(u); o.position.set(from.x + (to.x - from.x) * e, .7 + Math.sin(PI * u) * .5, from.z + (to.z - from.z) * e); o.rotation.y = u * 2; }, () => { dyn.remove(o); done && done(); }); }

    // s：{ n, me, seats:[{name, count, sub, now}], colors, hand, sel:Set, hidden, field:[], pile:数, target:{seat,n,hover}|null, hover:{target,i}|null, ev, seq }
    function sync(s) {
      const first = !S; S = s; S.colors = S.colors || COLS;
      syncRivals(); layoutHand(); layoutTarget();
      const ev = !first && s.seq !== lastSeq ? s.ev : null; lastSeq = s.seq;
      if (s.field) placeField(s.field, ev && ev.kind === 'play' ? seatXZ(ev.seat) : null);
      if (s.pile != null) placePile(s.pile);
      if (ev && ev.kind === 'draw') { const a = seatXZ(ev.from), b = seatXZ(ev.seat); if (ev.seat !== s.me) fly(null, a, b); }
      kick();
    }

    /* ---- さわる：短いタップは選ぶ、引っぱると見わたす ---- */
    const ray = new T.Raycaster(), v2 = new T.Vector2();
    function pick(cx, cy) {
      const r = el.getBoundingClientRect(); v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); aim(); ray.setFromCamera(v2, cam);
      const hit = ray.intersectObjects([targG, handG], true)[0]; if (!hit) return null;
      for (let o = hit.object; o; o = o.parent) { if (o.userData.hand != null) return { hand: o.userData.hand }; if (o.userData.target != null) return { target: o.userData.target }; }
      return null;
    }
    const offs = [], on = (t, f, o) => { el.addEventListener(t, f, o); offs.push(() => el.removeEventListener(t, f, o)); };
    let drag = null;
    on('pointerdown', e => { if (!e.isPrimary) return; drag = { x: e.clientX, y: e.clientY, ty: look.ty, tp: look.tp, moved: false, t: performance.now() }; try { el.setPointerCapture(e.pointerId); } catch (x) { } });
    on('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.hypot(dx, dy) < 10) return; drag.moved = true;
      look.ty = Math.max(-.75, Math.min(.75, drag.ty - dx * .006)); look.tp = Math.max(-.4, Math.min(.35, drag.tp + dy * .004)); draw(); });
    const up = e => { if (!drag) return; const d = drag; drag = null; if (e.type !== 'pointerup' || d.moved || performance.now() - d.t > 600) return; const p = pick(e.clientX, e.clientY); if (p && api.onTap) api.onTap(p); };
    on('pointerup', up); on('pointercancel', up); on('lostpointercapture', up); on('contextmenu', e => e.preventDefault());
    // 傾きで見わたす（iPhone は許可がいるので、ボタンを押したときに聞く）
    let base = null, gyroOn = false;
    const onOri = e => { if (e.gamma == null) return; if (!base) base = { b: e.beta, g: e.gamma }; look.ty = Math.max(-.75, Math.min(.75, -(e.gamma - base.g) / 40)); look.tp = Math.max(-.4, Math.min(.35, -(e.beta - base.b) / 60)); draw(); };
    async function gyro(want) {
      if (!want) { removeEventListener('deviceorientation', onOri); gyroOn = false; return false; }
      try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function' && await DeviceOrientationEvent.requestPermission() !== 'granted') return false; } catch (e) { return false; }
      base = null; addEventListener('deviceorientation', onOri); gyroOn = true; return true;
    }
    const api = {
      el, sync, resize, gyro, onTap: null, gyroOn: () => gyroOn,
      straight() { look.ty = look.tp = 0; base = null; draw(); },
      dispose() { dead = true; if (raf) cancelAnimationFrame(raf); offs.forEach(f => f()); removeEventListener('deviceorientation', onOri); R.dispose(); R.forceContextLoss && R.forceContextLoss(); el.remove(); },
    };
    aim(); return api;
  }
  return { load, ready: () => !!T, table: () => Table(), COLS };
})();
