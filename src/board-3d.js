/* ===== リバーシ・将棋・チェスの3D盤（ボードゲームカフェ：木のテーブルの上に本物らしい盤）。案は tools/board3d-mockup.html の4 ===== */
// three.js は TB.load() で読みこむ（チュンチュンと同じ）。部品・光の作り方も TB.parts() を使う
const BD3 = (() => {
  const PI = Math.PI, SHU = '#ff5a36';
  let T, C, P;
  const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  let sd = 7; const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  const tex = c => { const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
  const mat = (map, r = 1) => new T.MeshStandardMaterial({ map, roughness: r });
  // 将棋の字（Yuji Syuku）。読みこめなくても少し待ったら始める
  const KOMA_CH = '王玉金銀桂香角飛歩龍馬全圭杏と';
  let ready = null;
  function load() {
    if (!ready) ready = Promise.all([TB.load(), document.fonts ? Promise.race([document.fonts.load('176px "Yuji Syuku"', KOMA_CH).catch(() => { }), new Promise(r => setTimeout(r, 2500))]) : 0])
      .then(() => { if (!T) { P = TB.parts(); T = P.T; C = P.C; } }, e => { ready = null; throw e; });
    return ready;
  }

  /* ---- 木目・盤の面 ---- */
  function woodGrain(g, S, [a, b]) {
    g.fillStyle = a; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 140; i++) { const y = rnd() * S, w = 2 + rnd() * 10; g.strokeStyle = b; g.globalAlpha = .08 + rnd() * .16; g.lineWidth = w; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= S; x += 64) g.lineTo(x, y + Math.sin(x / 180 + i) * 10 + (rnd() - .5) * 4); g.stroke(); }
    g.globalAlpha = 1;
  }
  const mats = {};
  const wood = (a, b, r = .6, rep = 1) => { const k = a + b + r + rep; if (!mats[k]) { const [c, g] = cv(512); woodGrain(g, 512, [a, b]); const t = tex(c); if (rep > 1) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); } mats[k] = mat(t, r); } return mats[k]; };
  const glossy = col => mats['g' + col] || (mats['g' + col] = P.gloss(col, { r: .25 }));
  // 盤の上の面：線・市松・星
  function boardTop(N, o) {
    const S = 1024, [c, g] = cv(S), u = S / (N + o.m * 2), x0 = o.m * u;
    if (o.grain) woodGrain(g, S, o.grain); else { g.fillStyle = o.bg; g.fillRect(0, 0, S, S); }
    if (o.checker) for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) if ((r + q) % 2) { g.fillStyle = o.checker; g.fillRect(x0 + q * u, x0 + r * u, u, u); }
    if (o.ink) {
      g.strokeStyle = o.ink; g.lineWidth = o.lw; g.lineCap = 'round';
      for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(x0 + i * u, x0); g.lineTo(x0 + i * u, x0 + N * u); g.stroke(); g.beginPath(); g.moveTo(x0, x0 + i * u); g.lineTo(x0 + N * u, x0 + i * u); g.stroke(); }
      g.fillStyle = o.ink; const st = N === 9 ? [3, 6] : [2, 6]; st.forEach(a => st.forEach(b => { g.beginPath(); g.arc(x0 + a * u, x0 + b * u, u * .07, 0, 7); g.fill(); }));
    }
    if (o.frame) { g.strokeStyle = o.frame; g.lineWidth = 6; g.strokeRect(x0, x0, N * u, N * u); }
    return tex(c);
  }
  // ゲームごとの盤：リバーシは緑の盤、将棋は榧の厚い盤、チェスは寄せ木
  const LOOK = {
    reversi: () => ({ m: .35, h: .2, side: P.paint('#2a2a2a', .4), bg: '#1f7a46', ink: '#0e2a18', lw: 4, rough: .5 }),
    shogi: () => ({ m: .3, h: .6, side: wood('#e8b46a', '#c48a40', .5), grain: ['#f0c27a', '#d69a4c'], ink: '#1a1008', lw: 2.5, rough: .45 }),
    chess: () => ({ m: .45, h: .22, side: wood('#5a321c', '#341a0c', .4), grain: ['#e8c890', '#c9a060'], checker: 'rgba(90,50,24,.92)', frame: 'rgba(60,30,12,.9)', rough: .4 }),
  };

  /* ---- 駒 ---- */
  const DISK = { b: '#121212', w: '#f6f6f2' };
  function disk(p) { // 上が p の色、下が反対の色
    const g = new T.Group(), R = .39, H = .12, top = glossy(DISK[p]), bot = glossy(DISK[p === 'b' ? 'w' : 'b']);
    const a = P.mesh(new T.CylinderGeometry(R, R * .97, H / 2, 40), top); a.position.y = H * .75; g.add(a);
    const b = P.mesh(new T.CylinderGeometry(R * .97, R, H / 2, 40), bot); b.position.y = H * .25; g.add(b);
    return g;
  }
  const SIZE = { K: 1, R: .96, B: .96, D: .96, H: .96, G: .92, S: .92, Z: .92, N: .88, M: .88, L: .84, Y: .84, P: .8, T: .8 };
  const KJ = { K: '玉', R: '飛', B: '角', G: '金', S: '銀', N: '桂', L: '香', P: '歩', D: '龍', H: '馬', Z: '全', M: '圭', Y: '杏', T: 'と' };
  function koma(p) {
    const t = p.toUpperCase(), gote = p !== t, s = SIZE[t] * .98, w = s * .84, hh = s * .92, sh = new T.Shape();
    sh.moveTo(-w / 2, -hh / 2); sh.lineTo(w / 2, -hh / 2); sh.lineTo(w * .4, hh * .22); sh.lineTo(0, hh / 2); sh.lineTo(-w * .4, hh * .22); sh.closePath();
    const th = .15, geo = new T.ExtrudeGeometry(sh, { depth: th - .04, bevelEnabled: true, bevelThickness: .02, bevelSize: .015, bevelSegments: 2 });
    geo.rotateX(-PI / 2); geo.translate(0, .02, 0);
    const g = new T.Group(); g.add(P.mesh(geo, wood('#f2d49c', '#d8b070', .4)));
    const k = 'k' + p; if (!mats[k]) { // 成った駒は朱の字
      const [c, x] = cv(256); x.fillStyle = 'DZMYTH'.includes(t) ? '#b02a16' : '#120a06'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '176px "Yuji Syuku", serif';
      x.fillText(t === 'K' && gote ? '王' : KJ[t], 128, 146); mats[k] = new T.MeshStandardMaterial({ map: tex(c), transparent: true, roughness: .8 }); }
    const lab = new T.Mesh(new T.PlaneGeometry(w * 1.05, w * 1.05), mats[k]); lab.rotation.x = -PI / 2; lab.position.set(0, th + .002, hh * .04); g.add(lab);
    g.rotation.y = gote ? PI : 0; return g;
  }
  const lathe = (pts, m) => P.mesh(new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), 32), m);
  function chessman(p) {
    const t = p.toLowerCase(), white = p !== t, m = glossy(white ? '#f4efe4' : '#161412'), g = new T.Group();
    const base = R => g.add(lathe([[0, 0], [R, 0], [R, .06], [R * .86, .1], [R * .62, .15], [0, .15]], m));
    const stem = (r0, r1, y0, y1) => g.add(lathe([[0, y0], [r0, y0], [r1, y1], [0, y1]], m));
    const ball = (r, y, sy = 1) => { const b = P.mesh(new T.SphereGeometry(r, 20, 14), m); b.position.y = y; b.scale.y = sy; g.add(b); };
    const disc = (r, y, h) => { const d = P.mesh(new T.CylinderGeometry(r, r, h, 32), m); d.position.y = y; g.add(d); };
    const box = (w, h, d, x, y, z) => { const b = P.mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
    if (t === 'p') { base(.28); stem(.17, .1, .15, .38); disc(.16, .4, .04); ball(.14, .52); }
    if (t === 'r') { base(.31); stem(.21, .17, .15, .58); disc(.23, .64, .12); for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4; box(.09, .07, .09, Math.cos(a) * .17, .735, Math.sin(a) * .17); } }
    if (t === 'b') { base(.3); stem(.18, .09, .15, .6); disc(.17, .61, .04); ball(.14, .76, 1.35); ball(.045, .97); }
    if (t === 'q') { base(.32); stem(.2, .1, .15, .7); disc(.19, .71, .04); stem(.1, .2, .71, .88); for (let k = 0; k < 8; k++) { const a = k * PI / 4, b = P.mesh(new T.SphereGeometry(.04, 10, 8), m); b.position.set(Math.cos(a) * .18, .9, Math.sin(a) * .18); g.add(b); } ball(.07, .93); }
    if (t === 'k') { base(.32); stem(.2, .11, .15, .72); disc(.2, .73, .04); stem(.11, .19, .73, .92); disc(.19, .93, .03); box(.06, .22, .06, 0, 1.05, 0); box(.18, .06, .06, 0, 1.08, 0); }
    if (t === 'n') { base(.3); stem(.2, .16, .15, .3);
      const s = new T.Shape(); s.moveTo(-.17, .28); s.lineTo(-.19, .55); s.quadraticCurveTo(-.15, .8, -.02, .88); s.lineTo(.03, .98); s.lineTo(.08, .87); s.quadraticCurveTo(.22, .78, .28, .66); s.lineTo(.25, .57); s.lineTo(.1, .6); s.quadraticCurveTo(.04, .45, .18, .28); s.closePath();
      const hg = new T.ExtrudeGeometry(s, { depth: .16, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 3 }); hg.translate(0, 0, -.08);
      const hd = P.mesh(hg, m); hd.rotation.y = white ? -PI / 2 : PI / 2; g.add(hd); } // 白は奥（黒の側）、黒は手前を向く
    g.scale.setScalar(.95); return g;
  }
  // 駒の見本を1回だけ作って、使うときは形と素材を共有した複製を出す（素材ごとに1つにまとめて軽くする）
  const protos = {};
  function piece(game, p) {
    const k = game + p; if (!protos[k]) { const g = game === 'reversi' ? disk(p) : game === 'shogi' ? koma(p) : chessman(p); protos[k] = P.merge(g); }
    return protos[k].clone();
  }

  /* ---- 盤 ---- */
  function Board(game) {
    const N = game === 'shogi' ? 9 : 8, o = LOOK[game](), W = N + o.m * 2;
    const el = document.createElement('canvas'); el.className = 'bd-3d'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', '3Dの盤');
    const R = new T.WebGLRenderer({ canvas: el, antialias: true }); R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; R.shadowMap.autoUpdate = false; R.outputEncoding = T.sRGBEncoding;
    const sc = new T.Scene(); sc.background = C('#2a1e16');
    sc.add(new T.HemisphereLight(C('#ffe8cc'), C('#3a2414'), .5));
    const key = new T.DirectionalLight(C('#ffd9a8'), 1.3); key.position.set(-5, 11, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, far: 30 }); key.shadow.bias = -.0005; sc.add(key);
    const rim = new T.DirectionalLight(C('#ffffff'), .3); rim.position.set(6, 5, -7); sc.add(rim);
    // 動かない物（テーブル・盤）
    const fixed = new T.Group(); sc.add(fixed);
    const table = P.mesh(new T.PlaneGeometry(40, 40), wood('#6a4228', '#3a2214', .7, 6)); table.rotation.x = -PI / 2; fixed.add(table);
    fixed.add(P.slab(W, W, o.h, .05, o.side, .05));
    const top = new T.Mesh(new T.PlaneGeometry(W - .02, W - .02), mat(boardTop(N, o), o.rough)); top.rotation.x = -PI / 2; top.position.y = o.h + .002; top.receiveShadow = true; fixed.add(top);
    const Y = o.h + .004, at = i => [(i % N) - (N - 1) / 2, ((i / N) | 0) - (N - 1) / 2];
    // 印（置ける点・取れる輪・選んだ駒・さっきの手・王手）。使い回す
    const markMat = { dot: P.paint(SHU, .5), ring: P.paint(SHU, .5), sel: new T.MeshStandardMaterial({ color: C(SHU), transparent: true, opacity: .32, roughness: 1 }),
      last: new T.MeshStandardMaterial({ color: C('#ffd27a'), transparent: true, opacity: .3, roughness: 1 }), chk: new T.MeshStandardMaterial({ color: C('#ff2a1a'), transparent: true, opacity: .5, roughness: 1 }) };
    const markGeo = { dot: new T.CylinderGeometry(.11, .11, .03, 24), ring: new T.TorusGeometry(.44, .04, 10, 40), pad: new T.PlaneGeometry(.96, .96) };
    const pools = {}, marks = new T.Group(); sc.add(marks);
    function mark(kind, i, n) {
      const pool = pools[kind] || (pools[kind] = []);
      if (!pool[n]) { const m = new T.Mesh(kind === 'dot' ? markGeo.dot : kind === 'ring' ? markGeo.ring : markGeo.pad, markMat[kind]); if (kind === 'ring' || kind === 'sel' || kind === 'last' || kind === 'chk') m.rotation.x = -PI / 2; pool[n] = m; marks.add(m); }
      const m = pool[n], [x, z] = at(i); m.visible = true; m.position.set(x, Y + ({ dot: .02, ring: .04, sel: .003, last: .002, chk: .004 })[kind], z); return m;
    }

    /* ---- カメラ：盤が横いっぱいに入る距離が基準。指で回す・傾ける・拡大・ずらす ---- */
    const cam = new T.PerspectiveCamera(30, 1, .1, 100);
    const EL = game === 'shogi' ? 1.05 : .9; // 将棋はマスが小さいので少し真上寄り
    const V = { az: 0, el: EL, zoom: 1, px: 0, pz: 0 }, home = { az: 0 };
    let w = 1, h = 1;
    function fitDist() {
      const vf = cam.fov * PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
      const dW = W / 2 * 1.04 / Math.tan(hf / 2) + W / 2 * Math.cos(V.el), ext = W * Math.sin(V.el) + .9 * Math.cos(V.el), dH = ext * .56 / Math.tan(vf / 2);
      return Math.max(dW, dH);
    }
    function applyCam() {
      const d = fitDist() / V.zoom, c = Math.cos(V.el);
      cam.position.set(V.px + d * c * Math.sin(V.az), Y + d * Math.sin(V.el), V.pz + d * c * Math.cos(V.az)); cam.lookAt(V.px, Y, V.pz); draw();
    }
    function resize() { const r = el.parentNode ? el.parentNode.getBoundingClientRect() : null; if (!r || r.width < 2 || r.height < 2) return; if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1) return; w = r.width; h = r.height; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); applyCam(); }

    /* ---- 描く：変わったときだけ。影は駒が動いたときだけ描き直す ---- */
    let raf = 0, inFrame = false, again = false, shadowDue = true, dead = false;
    const anims = [];
    function frame(now) {
      raf = 0; inFrame = true; again = false;
      for (let k = anims.length - 1; k >= 0; k--) { const a = anims[k], u = Math.min(1, Math.max(0, (now - a.t0) / a.dur)); a.step(u); if (u >= 1) { anims.splice(k, 1); a.end && a.end(); } }
      if (anims.length) shadowDue = true;
      if (shadowDue) { R.shadowMap.needsUpdate = true; shadowDue = false; }
      R.render(sc, cam); inFrame = false;
      if (anims.length || again) raf = requestAnimationFrame(frame);
      if (!anims.length && pendingFix) { pendingFix = false; reconcile(); }
    }
    const draw = () => { if (dead) return; if (inFrame) again = true; else if (!raf) raf = requestAnimationFrame(frame); };
    const kick = () => { shadowDue = true; draw(); };
    const anim = (dur, step, end, delay = 0) => { anims.push({ t0: performance.now() + delay, dur, step, end }); draw(); };
    const ease = u => 1 - (1 - u) ** 3, io = u => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;

    /* ---- 駒をならべる ---- */
    const at3 = [], pieces = new T.Group(); sc.add(pieces);
    let want = '', pendingFix = false;
    function place(i, p) { const o = piece(game, p), [x, z] = at(i); o.position.set(x, Y, z); o.userData.cell = i; o.userData.p = p; pieces.add(o); at3[i] = o; return o; }
    function drop(i) { const o = at3[i]; if (o) { pieces.remove(o); at3[i] = null; } }
    // いま描いている駒を、最新の盤（want）に合わせる
    function reconcile() { for (let i = 0; i < N * N; i++) { const p = want[i] || '.', o = at3[i]; if ((o ? o.userData.p : '.') === p) continue; drop(i); if (p !== '.') place(i, p); } kick(); }
    function finishAnims() { while (anims.length) { const a = anims.shift(); a.step(1); a.end && a.end(); } }
    let lastSeq = null, view = null;
    // s: { cells, view, ev, seq, dots:[], caps:[], sel, last:[], chk }
    function sync(s) {
      const cells = typeof s.cells === 'string' ? s.cells : s.cells.join('');
      finishAnims(); if (pendingFix) { pendingFix = false; reconcile(); } want = cells;
      const ev = s.ev && s.seq !== lastSeq && lastSeq != null ? s.ev : null; lastSeq = s.seq;
      if (ev && ev.kind === 'move' && ev.m) {
        const m = ev.m;
        if (game === 'reversi') { // 置いた石が上からぽとっ → はさんだ石がひっくり返る
          drop(m.t); const o = place(m.t, cells[m.t]); o.position.y = Y + 1.4;
          anim(220, u => { o.position.y = Y + 1.4 * (1 - u * u); });
          (ev.flips || []).forEach((i, k) => { const f = at3[i]; if (!f) return; anim(360, u => { const a = PI * io(u); f.rotation.z = a; f.position.y = Y + Math.sin(PI * u) * .45 + .06 * (1 - Math.cos(a)); }, null, 200 + k * 45); }); // 石のまん中を軸に回す
          pendingFix = true;
        } else if (m.f != null && at3[m.f]) { // 駒をつまんで、ひょいと動かす。取られた駒は消える
          const o = at3[m.f], [x0, z0] = at(m.f), [x1, z1] = at(m.t), cap = at3[m.t], hop = game === 'chess' && o.userData.p.toLowerCase() === 'n' ? .7 : .35;
          at3[m.f] = null; at3[m.t] = o; o.userData.cell = m.t;
          anim(300, u => { const e = io(u); o.position.set(x0 + (x1 - x0) * e, Y + Math.sin(PI * u) * hop, z0 + (z1 - z0) * e); if (cap && u > .55) cap.scale.setScalar(Math.max(.01, 1 - (u - .55) / .45)); },
            () => { if (cap) pieces.remove(cap); });
          pendingFix = true;
        } else if (m.d) { drop(m.t); const o = place(m.t, cells[m.t]); o.position.y = Y + 1.2; anim(240, u => { o.position.y = Y + 1.2 * (1 - u * u); }); pendingFix = true; }
      }
      if (!pendingFix) reconcile();
      // 印
      Object.values(pools).forEach(p => p.forEach(m => m.visible = false));
      const n = {}; const put = (k, i) => mark(k, i, n[k] = (n[k] ?? -1) + 1);
      (s.last || []).forEach(i => i != null && i >= 0 && put('last', i));
      if (s.sel != null && s.sel >= 0) put('sel', s.sel);
      if (s.chk != null && s.chk >= 0) put('chk', s.chk);
      (s.dots || []).forEach(i => put('dot', i)); (s.caps || []).forEach(i => put('ring', i));
      // 向き：自分（1台のときは手番の人）の側が手前。変わったらカメラが盤のまわりを半周する
      const az = s.view === 1 ? PI : 0;
      if (view == null) { V.az = home.az = az; applyCam(); }
      else if (s.view !== view) { home.az = az; const a0 = V.az, d = ((az - a0) % (2 * PI) + 3 * PI) % (2 * PI) - PI, e0 = V.el, z0 = V.zoom, x0 = V.px, q0 = V.pz;
        anim(800, u => { const k = io(u); V.az = a0 + d * k; V.el = e0 + (EL - e0) * k; V.zoom = z0 + (1 - z0) * k; V.px = x0 * (1 - k); V.pz = q0 * (1 - k); applyCam(); }, null, 250); }
      view = s.view; kick();
    }

    /* ---- さわる ---- */
    const ray = new T.Raycaster(), v2 = new T.Vector2();
    function pick(cx, cy) {
      const r = el.getBoundingClientRect(); v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); ray.setFromCamera(v2, cam);
      const hit = ray.intersectObject(pieces, true)[0]; if (hit) { for (let o = hit.object; o; o = o.parent) if (o.userData.cell != null) return o.userData.cell; }
      const t = ray.intersectObject(top)[0]; if (!t) return -1;
      const q = Math.floor(t.point.x + N / 2), rr = Math.floor(t.point.z + N / 2); return q >= 0 && q < N && rr >= 0 && rr < N ? rr * N + q : -1;
    }
    const ptr = new Map(); let g0 = null, moved = false, downAt = 0, lastTap = { t: 0, x: 0, y: 0 };
    function startGesture() {
      const ps = [...ptr.values()]; g0 = { V: { ...V }, ps: ps.map(p => ({ ...p })) };
      if (ps.length >= 2) { g0.d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1; g0.mx = (ps[0].x + ps[1].x) / 2; g0.my = (ps[0].y + ps[1].y) / 2; moved = true; }
    }
    const resetView = () => { const a0 = { ...V }; let d = ((home.az - a0.az) % (2 * PI) + 3 * PI) % (2 * PI) - PI;
      anim(420, u => { const k = ease(u); V.az = a0.az + d * k; V.el = a0.el + (EL - a0.el) * k; V.zoom = a0.zoom + (1 - a0.zoom) * k; V.px = a0.px * (1 - k); V.pz = a0.pz * (1 - k); applyCam(); }); };
    const on = (t, f, o) => { el.addEventListener(t, f, o); offs.push(() => el.removeEventListener(t, f, o)); }, offs = [];
    on('pointerdown', e => {
      if (e.isPrimary) ptr.clear(); try { el.setPointerCapture(e.pointerId); } catch (x) { }
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 1) { moved = false; downAt = performance.now(); } startGesture();
    });
    on('pointermove', e => {
      if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const ps = [...ptr.values()];
      if (ps.length === 1 && g0 && g0.ps.length === 1) {
        const dx = ps[0].x - g0.ps[0].x, dy = ps[0].y - g0.ps[0].y; if (!moved && Math.hypot(dx, dy) < 8) return; moved = true;
        V.az = g0.V.az - dx * .008; V.el = Math.min(1.45, Math.max(.45, g0.V.el + dy * .006)); applyCam();
      } else if (ps.length >= 2 && g0 && g0.d) {
        const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), mx = (ps[0].x + ps[1].x) / 2, my = (ps[0].y + ps[1].y) / 2;
        V.zoom = Math.min(3, Math.max(.7, g0.V.zoom * d / g0.d));
        const k = W / w * 1.2 / V.zoom, dx = (mx - g0.mx) * k, dz = (my - g0.my) * k, c = Math.cos(V.az), s = Math.sin(V.az), lim = W / 2;
        V.px = Math.min(lim, Math.max(-lim, g0.V.px - dx * c - dz * s)); V.pz = Math.min(lim, Math.max(-lim, g0.V.pz + dx * s - dz * c)); applyCam();
      }
    });
    const up = e => {
      if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
      if (!ptr.size && !moved && performance.now() - downAt < 500 && e.type === 'pointerup') {
        const now = performance.now(), dbl = now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
        lastTap = { t: dbl ? 0 : now, x: e.clientX, y: e.clientY };
        if (dbl) resetView(); else { const i = pick(e.clientX, e.clientY); if (i >= 0 && api.onTap) api.onTap(i); }
      }
      if (ptr.size) startGesture(); else g0 = null;
    };
    on('pointerup', up); on('pointercancel', up); on('lostpointercapture', up);
    on('wheel', e => { e.preventDefault(); V.zoom = Math.min(3, Math.max(.7, V.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); applyCam(); }, { passive: false });
    on('contextmenu', e => e.preventDefault());

    const api = {
      el, sync, resize, resetView, onTap: null,
      dispose() { dead = true; if (raf) cancelAnimationFrame(raf); offs.forEach(f => f()); R.dispose(); R.forceContextLoss && R.forceContextLoss(); el.remove(); },
    };
    return api;
  }
  return { load, ready: () => !!T, board: game => Board(game) };
})();
