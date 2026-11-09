/* =================== ぐらぐらタワーの画面 =================== */
// bomb-ui.js のうしろに差し込まれる。物理は matter.js（cdnjs から遅延読み込み）、荷物と場面はボクセルを1回描いて画像にする
const TW = { ready: null, art: null, wrap: null, cv: null, X: null, hud: null, seq: -1, gid: 0, eng: null, plat: null, bodies: [], phase: 'wait', x: 187, t: 0, quiet: 0, cam: 0, fell: false, replay: null, drag: false, heldAt: 0, aim: 187, run: false };
const TW_W = 375, TW_S = 40, TW_PLAT = 150;
const isTowerDoc = () => !!doc && doc.game === 'tower' && !!doc.b;
// 荷物：絵の1単位が20点（TW_U）。parts は当たり判定の箱 [中心x, 中心y, 幅, 高さ]（下が＋）。なければ全体が1つの箱。形は tools/tower-items-mockup.html
const TW_U = 28, TW_PAD = 12;
const twP = (n, u, v, o) => ({ n, w: u * TW_U, h: v * TW_U, ...o, parts: (o && o.parts || [[0, 0, u * 20, v * 20]]).map(a => a.map(x => x * TW_U / 20)) }); // parts は1単位20点で書いて、TW_U に合わせて広げる
const TW_P = {
  sofa: twP('ソファ', 3.3, 1.1), tansu: twP('タンス', 2.8, 1.1), table: twP('ローテーブル', 3, .8), books: twP('本の山', 2.2, .9), case: twP('スーツケース', 2.2, 1.7), box: twP('ダンボール', 1.5, 1.4),
  tv2: twP('テレビ', 2.3, 1.3, { parts: [[0, -2.5, 46, 21], [0, 10.5, 36, 5]] }), trash: twP('ゴミ箱', 1.3, 1.7), rice: twP('炊飯器', 1.5, 1.4),
  beam: twP('鉄骨', 4.25, .5, { den: .004 }), beam2: twP('赤い鉄骨', 3.25, .5, { den: .004 }), sign: twP('矢印看板', 2.6, 1), bumper: twP('バンパードラム', 1.7, 1.4), conc: twP('コンクリート', 2.4, 1, { den: .004 }), bag: twP('土のう', 1.2, 1.7),
  toolbox: twP('工具箱', 2.4, 1.1, { parts: [[0, 4, 48, 14], [0, -7, 20, 8]] }), drum: twP('ドラム缶', 1.25, 1.7), gen: twP('発電機', 2.4, 1.2, { parts: [[0, 5, 46, 12], [0, -6, 27, 12]] }),
  fragile: twP('段ボール', 1.5, 1.4, undefined), mona: twP('モナリザ', 1.8, 2.2, undefined), wave: twP('波の絵', 3, 1.1, undefined), sunf: twP('ひまわりの絵', 1.8, 1.8, undefined), fossil: twP('アンモナイトの化石', 1.8, 1.7, { parts: [[0, 0, 36, 20], [0, -13.5, 22, 7], [0, 13.5, 22, 7]] }), byobu: twP('金の屏風', 3.1, 1.1, undefined),
  dogu: twP('土偶', 1.4, 1.9, undefined), pot: twP('ツボ', 1.2, 1.95, undefined), rosetta: twP('ロゼッタストーン', 1.3, 1.9, undefined),
};
// 世界：物理と壁の色。すべりにくく、はねない。台を細くして、下は固める（高く積むための値。シミュレーションで決めた）
const TW_FREEZE = 1, TW_DROP = 12;
const TW_WORLD = { house: { fr: 1, fs: 1.5, rs: 0, air: .05, den: .0015, sky: '#f0dcc0' }, site: { fr: 1, fs: 1.5, rs: 0, air: .05, den: .002, sky: '#7fc0ec' }, art: { fr: 1, fs: 1.5, rs: 0, air: .05, den: .0015, sky: '#efe8dc' } };
function twLoad() {
  if (TW.ready) return TW.ready;
  const matter = window.Matter ? Promise.resolve() : new Promise((ok, ng) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'; s.onload = ok; s.onerror = ng; document.head.append(s); });
  TW.ready = Promise.all([TB.load(), matter]).then(() => { twArt(); }).catch(e => { TW.ready = null; throw e; });
  return TW.ready;
}
function twArt() {
  const { T, C } = TB.parts(), kit = twKit(T, C), { I, m, rbox, twWallDeco, TW_BG } = kit;
  const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.outputEncoding = T.sRGBEncoding; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  // まわりの光：色のついた面を映す（画像を読みこまないので軽い）
  const envS = new T.Scene(), face = (c, x, y, z, e) => { const p = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshBasicMaterial({ color: C(c).multiplyScalar(e || 1), side: T.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); envS.add(p); };
  face('#fff4e0', 0, 10, .01); face('#7a5a3a', 0, -10, .01); ['#d8c0a0', '#d8c0a0', '#d8c0a0', '#d8c0a0'].forEach((c, i) => face(c, [10, -10, 0, 0][i], 0, [0, 0, 10, -10][i]));
  const lamp = new T.Mesh(new T.PlaneGeometry(5, 5), new T.MeshBasicMaterial({ color: C('#ffffff').multiplyScalar(5), side: T.DoubleSide })); lamp.position.set(-5, 7, 5); lamp.lookAt(0, 0, 0); envS.add(lamp);
  const pm = new T.PMREMGenerator(r), ENV = pm.fromScene(envS, .04).texture; pm.dispose();
  const light = sc => { sc.environment = ENV; const d = new T.DirectionalLight(C('#fff0dc'), 1.5); d.position.set(-6, 14, 9); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); d.shadow.radius = 7; d.shadow.bias = -.0006; Object.assign(d.shadow.camera, { left: -14, right: 14, top: 20, bottom: -8, far: 50 }); sc.add(d); };
  const out = { piece: {}, bg: {} }, PX = 2.6, geo = (w, h, d, q, o, c) => new T.Mesh(rbox(w, h, d, q), m(c, o || {}));
  // 荷物：すこし上から見たミニチュアを1回描いて画像にする
  Object.keys(TW_P).forEach(id => {
    const p = TW_P[id], s = new T.Scene(), g = new T.Group(); g.rotation.y = -.26; g.rotation.x = .16; s.add(g); light(s);
    I[id][4]((x, y, z, w, hh, d, c, o) => { const a = new T.Mesh(o && o.geo ? o.geo : rbox(w, hh, d, o && o.r >= .7 ? .16 : .1), o && o.mat ? o.mat : m(c, o || {})); a.position.set(x, y, z); a.castShadow = a.receiveShadow = true; g.add(a); return a; });
    const hw = (p.w + TW_PAD * 2) / TW_U / 2, hh = (p.h + TW_PAD * 2) / TW_U / 2, c = new T.OrthographicCamera(-hw, hw, hh, -hh, .1, 30); c.position.set(0, 0, 10); c.lookAt(0, 0, 0); r.setClearColor(0, 0); r.setSize((p.w + TW_PAD * 2) * PX, (p.h + TW_PAD * 2) * PX, false); r.render(s, c);
    const im = new Image(); im.src = r.domElement.toDataURL('image/png'); out.piece[id] = im;
  });
  // 場面：机の上の台。画像の下から130点の高さが、荷物をのせる台の上面（y=0）
  const IW = TW_W / TW_S, IH = 900 / TW_S, Y0 = 130 / TW_S;
  const blob = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(30,20,10,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const scene = (key, desk) => {
    const s = new T.Scene(); light(s); const B = (w, h, d, c, x, y, z, o) => { const a = geo(w, h, d, .13, o, c); a.position.set(x, y, z); a.castShadow = a.receiveShadow = true; s.add(a); return a; };
    const gc = document.createElement('canvas'); gc.width = 4; gc.height = 256; const gx = gc.getContext('2d'), gg = gx.createLinearGradient(0, 0, 0, 256); gg.addColorStop(0, TW_BG[key].w[0]); gg.addColorStop(1, TW_BG[key].w[1]); gx.fillStyle = gg; gx.fillRect(0, 0, 4, 256); const gt = new T.CanvasTexture(gc); gt.encoding = T.sRGBEncoding; const wall = new T.Mesh(new T.PlaneGeometry(60, 30), new T.MeshBasicMaterial({ map: gt, toneMapped: false })); wall.position.set(0, 5, -8); s.add(wall); TW_BG[key].f(twWallDeco(s));
    const fl = new T.Mesh(new T.BoxGeometry(50, 1, 40), m(desk, { r: .6 })); fl.position.y = -1.55; fl.receiveShadow = true; s.add(fl);
    // 土台はどの世界も青い台車（案は tools/tower-stage-mockup.html の2。持ち手はなし）
    const STEEL = { r: .35, me: .6, e: 1 }; B(3.95, .26, 3.2, '#3f6fb5', 0, -.13, 0); B(3.75, .05, 3, '#2c4f8a', 0, .01, 0);
    [-1.6, 1.6].forEach(x => [1.2, -1.2].forEach(z => { B(.3, .4, .3, '#c9cdd6', x, -.42, z, STEEL); const w = new T.Mesh(new T.CylinderGeometry(.26, .26, .2, 28), m('#22252c')); w.rotation.x = Math.PI / 2; w.position.set(x, -.78, z); w.castShadow = true; s.add(w); }));
    const bl = new T.Mesh(new T.PlaneGeometry(8.5, 7), new T.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false })); bl.rotation.x = -Math.PI / 2; bl.position.set(.6, -1.03, 0); s.add(bl);
    const c = new T.OrthographicCamera(-IW / 2, IW / 2, IH - Y0, -Y0, .1, 80); c.position.set(0, 3.4, 30); c.rotation.x = -.11; c.updateMatrixWorld();
    r.setClearColor(TW_WORLD[key].sky, 1); r.setSize(TW_W * 2, 1800, false); r.render(s, c); const im = new Image(); im.src = r.domElement.toDataURL('image/jpeg', .9); return im;
  };
  out.bg.house = scene('house', '#8f6238');
  out.bg.site = scene('site', '#655a4c');
  out.bg.art = scene('art', '#752a32');
  ENV.dispose(); r.dispose(); r.forceContextLoss && r.forceContextLoss(); TW.art = out;
}
/* ---- 始まりの動き：できあがったタワーがぐらぐら → 下から上へカメラ → 大きくぐらぐら → 崩れて画面がゆれ、ほこり → 残った荷物がすーっと消える。案は tools/tower-intro-mockup.html の3 ---- */
const TW_IN = { hold: .7, pan: 1.9, shake: 1.5, fadeAt: 2.3, fade: .7 };
function twIntroLayout(order, t, amp) { const n = order.length, out = []; let x = TW_W / 2, y = twFloor(), a = 0; order.forEach((id, i) => { const p = TW_P[id], k = Math.pow((i + 1) / n, 1.35); a = amp * Math.sin(t * 5.6 - i * .24) * k; const dx = Math.sin(a) * p.h / 2, dy = Math.cos(a) * p.h / 2; x += dx; y -= dy; out.push({ id, x, y, a }); x += dx; y -= dy; }); return out; }
function twIntroStart() {
  const b = doc.b, ids = TWR.WORLDS[b.world].ids, order = []; let s = (b.gid % 2147483646) + 1, h = 0; const nx = () => (s = s * 16807 % 2147483647) / 2147483647;
  while (h < 600 && order.length < 34) { const id = ids[Math.floor(nx() * ids.length)]; order.push(id); h += TW_P[id].h; }
  const top = twIntroLayout(order, 0, 0).slice(-1)[0];
  TW.intro = { t: 0, ph: 'build', order, pts: twIntroLayout(order, 0, .01), ft: 0, sh: 0, dust: [], landed: false, alpha: 1, camTop: Math.max(0, twFloor() - top.y - TW.H * .42) };
  TW.cam = 0; TW.phase = 'intro'; TW.introAt = b.gid;
}
function twIntroEnd() { if (!TW.intro) return; TW.intro = null; twHold(); twHud(); }
function twIntroCollapse() {
  const { Engine, Bodies, Body, Composite } = Matter, ti = TW.intro, e = Engine.create(), f = twFloor(); e.gravity.y = 1; ti.eng = e;
  Composite.add(e.world, [Bodies.rectangle(TW_W / 2, f + 10, TW_PLAT, 20, { isStatic: true, friction: .9 }), Bodies.rectangle(TW_W / 2, f + 98, 700, 40, { isStatic: true, friction: .8 })]);
  const n = ti.pts.length, dir = ti.pts[n - 1].x > TW_W / 2 ? 1 : -1;
  ti.bodies = ti.pts.map((q, i) => { const p = TW_P[q.id], o = Bodies.rectangle(q.x, q.y, p.w, p.h, { friction: .7, frictionAir: .012, restitution: .08, density: .0015, angle: q.a }), k = (i + 1) / n; Body.setVelocity(o, { x: dir * (.5 + k * 4.4), y: -k * .6 }); Body.setAngularVelocity(o, dir * (.012 + k * .05)); o.plugin = { id: q.id }; return o; });
  Composite.add(e.world, ti.bodies); ti.ph = 'fall';
}
function twIntroStep() {
  const ti = TW.intro, D = 1 / 60, f = twFloor();
  if (ti.ph === 'build') {
    ti.t += D; const p0 = TW_IN.hold, p1 = p0 + TW_IN.pan, end = p1 + TW_IN.shake, u = Math.max(0, Math.min(1, (ti.t - p0) / TW_IN.pan));
    let amp = .016; if (ti.t > p0) amp = .016 + .018 * u; if (ti.t > p1) amp = .034 + Math.pow((ti.t - p1) / TW_IN.shake, 2) * .17;
    ti.pts = twIntroLayout(ti.order, ti.t, amp); TW.cam = ti.camTop * (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    if (ti.t >= end) twIntroCollapse(); return;
  }
  ti.ft += D; Matter.Engine.update(ti.eng, 1000 / 60);
  const top = ti.bodies.reduce((m, o) => Math.min(m, o.bounds.min.y), f); TW.cam += (Math.max(0, f - top - TW.H * .42) - TW.cam) * .1;
  if (!ti.landed && ti.bodies.some(o => o.position.y > f + 18)) { ti.landed = true; ti.sh = 1; if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { } for (let i = 0; i < 26; i++) ti.dust.push({ x: TW_W / 2 + (Math.random() - .5) * 260, y: f + 60 - Math.random() * 16, vx: (Math.random() - .5) * 2.2, vy: -.5 - Math.random() * 1.3, r: 10 + Math.random() * 16, l: 1 }); }
  if (ti.sh > 0) ti.sh = Math.max(0, ti.sh - D * 2.1);
  ti.dust.forEach(d => { d.x += d.vx; d.y += d.vy; d.vy *= .985; d.r += .35; d.l -= D * .55; }); ti.dust = ti.dust.filter(d => d.l > 0);
  ti.alpha = Math.max(0, 1 - Math.max(0, ti.ft - TW_IN.fadeAt) / TW_IN.fade);
  if (ti.alpha <= 0) twIntroEnd();
}
function twEngine() { const { Engine } = Matter; TW.eng = Engine.create(); TW.eng.gravity.y = 1; TW.eng.positionIterations = 10; TW.eng.velocityIterations = 8; }
const twFloor = () => TW.H - 120;
function twBody(id, x, y, a, wd) {
  const { Bodies, Body } = Matter, p = TW_P[id], fr = p.fr != null ? p.fr : wd.fr, opt = { friction: fr, frictionStatic: wd.fs, restitution: wd.rs, density: p.den || wd.den, frictionAir: wd.air, slop: .05 };
  const ps = p.parts.map(([cx, cy, w, h]) => Bodies.rectangle(cx, cy, w, h, opt)), b = ps.length > 1 ? Body.create({ parts: ps, friction: fr, frictionStatic: wd.fs, restitution: wd.rs, frictionAir: wd.air }) : ps[0];
  const ox = -b.position.x, oy = -b.position.y; Body.setPosition(b, { x: x - ox * Math.cos(a) + oy * Math.sin(a), y: y - ox * Math.sin(a) - oy * Math.cos(a) }); Body.setAngle(b, a); b.plugin = { id, ox, oy }; return b;
}
// 荷物の位置は「絵の中心」で覚える（台の上面からの高さなので、画面の高さが端末ごとにちがっても同じ）
const twPos = b => { const { ox, oy } = b.plugin, a = b.angle; return { x: b.position.x + ox * Math.cos(a) - oy * Math.sin(a), y: b.position.y + ox * Math.sin(a) + oy * Math.cos(a) }; };
function twBuild(pieces) {
  const { Bodies, Composite } = Matter, wd = TW_WORLD[doc.b.world]; Composite.clear(TW.eng.world, false); TW.bodies = []; TW.fell = false;
  TW.plat = Bodies.rectangle(TW_W / 2, twFloor() + 10, TW_PLAT, 20, { isStatic: true, friction: .9 }); Composite.add(TW.eng.world, TW.plat);
  pieces.forEach(q => { const b = twBody(q.id, q.x, twFloor() + q.y, q.a, wd); Composite.add(TW.eng.world, b); TW.bodies.push(b); });
  twFreeze();
}
// いちばん上の荷物だけが動く（高く積んでも土台がくずれていかないように）。落としたときだけ twCollapse で全部ゆるめて崩す
// 崩れる：固めていた荷物を全部ゆるめて、上ほど大きく左右へ押す
function twCollapse() { if (TW.fell) return; TW.fell = true; const dir = Math.random() < .5 ? -1 : 1, n = TW.bodies.length; TW.bodies.forEach((o, i) => { if (o.isStatic) Matter.Body.setStatic(o, false); const k = (i + 1) / n; Matter.Body.setVelocity(o, { x: dir * (.6 + k * 3.4) + (Math.random() - .5), y: -k * 1.2 }); Matter.Body.setAngularVelocity(o, dir * (.015 + Math.random() * .05)); }); }
function twFreeze() { TW.bodies.forEach((o, i) => { if (i < TW.bodies.length - TW_FREEZE && !o.isStatic) Matter.Body.setStatic(o, true); }); }
const twTop = () => TW.bodies.reduce((m, b) => Math.min(m, b.bounds.min.y), twFloor());
const twHeight = () => Math.max(0, (twFloor() - twTop()) / 40).toFixed(1);
const twHoldY = id => twTop() - TW_P[id].h / 2 - TW_DROP;
const twMine = () => { const id = doc.b.seats[doc.b.turn]; return !TWR.isNpc(id) && (local || id === me); };
const twDriver = () => local || doc.players[0] === me;
function twSync() {
  const b = doc.b; if (!TW.eng) twEngine();
  if (TW.gid === b.gid && TW.seq === b.seq) return;
  const first = TW.gid !== b.gid; TW.gid = b.gid; TW.seq = b.seq; if (!first) TW.intro = null;
  const L = b.last;
  // ほかの人が積んだ：同じ落下をこの端末でも見せてから、書かれた位置にそろえる
  if (!first && L && L.id && L.s !== TW.dropSeat && (L.kind === 'drop' || L.kind === 'crash')) { twBuild(L.from || []); const wd = TW_WORLD[b.world], y = twTop() - TW_P[L.id].h / 2 - TW_DROP, o = twBody(L.id, L.x, y, 0, wd); Matter.Composite.add(TW.eng.world, o); TW.bodies.push(o); TW.phase = 'replay'; TW.t = 0; TW.quiet = 0; }
  else { if (b.phase !== 'crash' && TW.phase !== 'fall') twBuild(b.pieces); twHold(); }
  TW.dropSeat = null;
  let reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  if (first && !reduce && b.tower === 1 && !b.pieces.length && b.phase === 'play' && TW.introAt !== b.gid) twIntroStart();
}
function twHold() { const b = doc.b; TW.phase = b.phase === 'crash' ? 'crash' : 'hold'; TW.t = 0; TW.x = TW_W / 2; if (b.phase === 'play') TW.aim = twAim(b.cur); }
// コンピュータの置き場所：荷物の幅ぶんの下が平らで、なるべく高いところ。少しだけ手がぶれる
function twAim(id) {
  const p = TW_P[id], bw = p.w * .8, cx = TW_W / 2, L = cx - TW_PLAT / 2, R = cx + TW_PLAT / 2, top = twTop();
  const surf = sx => { let y = sx >= L && sx <= R ? twFloor() : 1e9; for (const o of TW.bodies) for (const q of (o.parts.length > 1 ? o.parts.slice(1) : [o])) if (q.bounds.min.x <= sx && sx <= q.bounds.max.x) y = Math.min(y, q.bounds.min.y); return y; };
  let best = cx, sc = 1e18; for (let x = L; x <= R; x += 8) { const ys = [-.5, -.25, 0, .25, .5].map(k => surf(x + k * bw)); if (ys.some(v => v > 1e8)) continue; const hi = Math.min(...ys), s = (Math.max(...ys) - hi) * 3 + Math.abs(x - cx) * .25 + (hi - top) * .6; if (s < sc) { sc = s; best = x; } }
  return best + (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 12 * 1.73;
}
function twDrop() {
  if (TW.phase !== 'hold' || (!twMine() && !(TWR.isNpc(doc.b.seats[doc.b.turn]) && twDriver()))) return;
  const b = doc.b, wd = TW_WORLD[b.world], o = twBody(b.cur, TW.x, twHoldY(b.cur), 0, wd); Matter.Composite.add(TW.eng.world, o); TW.bodies.push(o); TW.phase = 'fall'; TW.t = 0; TW.quiet = 0; TW.fx = TW.x; twHud();
}
function twCommit(fell) {
  const b = doc.b, id = b.seats[b.turn], f = twFloor(), r1 = v => Math.round(v * 10) / 10, pieces = TW.bodies.map(o => { const p = twPos(o); return { id: o.plugin.id, x: r1(p.x), y: r1(p.y - f), a: Math.round(o.angle * 1000) / 1000 }; });
  const a = { t: 'drop', x: r1(TW.fx), pieces, fell, height: +twHeight() }, seq0 = b.seq; TW.dropSeat = b.turn; TW.phase = fell ? 'crash' : 'wait';
  if (local) { try { doc = TWR.act(doc, id, a); } catch (e) { console.warn(e); } afterChange(); return; }
  withLease(d => d && d.status === 'playing' && d.b && d.b.seq === seq0 ? TWR.act(d, id === me || !TWR.isNpc(id) ? me : id, a) : null, true).then(r => { if (r !== 'ok' && isTowerDoc() && doc.b.seq === seq0) { TW.seq = -1; TW.phase = 'wait'; toast('送れませんでした'); bdRender(); } });
}
function twTick() {
  if (TW.intro) { twIntroStep(); return; }
  Matter.Engine.update(TW.eng, 1000 / 60); TW.t += 1 / 60;
  const want = Math.max(0, twFloor() - twTop() - TW.H * .42); TW.cam += (want - TW.cam) * .06;
  const b = doc.b, npc = TWR.isNpc(b.seats[b.turn]);
  if (TW.phase === 'hold' && npc && twDriver()) { TW.x += (TW.aim - TW.x) * .05; if (TW.t > 1.3) twDrop(); }
  if (TW.phase === 'fall' || TW.phase === 'replay') {
    const lost = TW.bodies.some(o => o.position.y > twFloor() + 40), still = TW.bodies.every(o => o.isStatic || (o.speed < .16 && Math.abs(o.angularSpeed) < .012)); TW.quiet = still ? TW.quiet + 1 : 0;
    if (TW.phase === 'replay' && b.phase === 'crash' && !TW.fell && (lost || TW.t > 1.2)) twCollapse();
    if (TW.phase === 'fall') { if (lost) { twCollapse(); twCommit(true); return; } if (TW.quiet > 34 || TW.t > 6) { twFreeze(); twCommit(false); } }
    else if (b.phase === 'crash' ? TW.t > 2.4 : TW.quiet > 34 || TW.t > 5) { if (b.phase !== 'crash') twBuild(b.pieces); twHold(); twHud(); }
  }
}
function twPaint() {
  const X = TW.X, sc = TW.sc, A = TW.art, b = doc.b, wd = TW_WORLD[b.world]; if (!A) return;
  X.setTransform(sc, 0, 0, sc, 0, 0); X.fillStyle = wd.sky; X.fillRect(0, 0, TW_W, TW.H); X.save(); const ti = TW.intro, sn = performance.now() / 16; X.translate(ti && ti.sh ? Math.sin(sn) * 9 * ti.sh : 0, TW.cam + (ti && ti.sh ? Math.cos(sn * .87) * 6 * ti.sh : 0));
  const bg = A.bg[b.world]; if (bg.complete) X.drawImage(bg, 0, twFloor() - (900 - 130), TW_W, 900);
  if (ti) { const one = (id, x, y, a) => { const p = TW_P[id], im = A.piece[id]; X.save(); X.translate(x, y); X.rotate(a); if (im.complete) X.drawImage(im, -p.w / 2 - TW_PAD, -p.h / 2 - TW_PAD, p.w + TW_PAD * 2, p.h + TW_PAD * 2); X.restore(); }; X.globalAlpha = ti.alpha; if (ti.ph === 'build') ti.pts.forEach(q => one(q.id, q.x, q.y, q.a)); else ti.bodies.forEach(o => one(o.plugin.id, o.position.x, o.position.y, o.angle)); ti.dust.forEach(d => { X.globalAlpha = Math.max(0, d.l) * .7; X.fillStyle = '#e9dfcb'; X.beginPath(); X.arc(d.x, d.y, d.r, 0, 7); X.fill(); }); X.globalAlpha = 1; X.restore(); return; }
  TW.bodies.forEach(o => { const p = TW_P[o.plugin.id], im = A.piece[o.plugin.id], q = twPos(o); X.save(); X.translate(q.x, q.y); X.rotate(o.angle); if (im.complete) X.drawImage(im, -p.w / 2 - TW_PAD, -p.h / 2 - TW_PAD, p.w + TW_PAD * 2, p.h + TW_PAD * 2); X.restore(); });
  if (TW.phase === 'hold' && b.phase === 'play') { const p = TW_P[b.cur], y = twHoldY(b.cur), im = A.piece[b.cur]; X.setLineDash([5, 5]); X.strokeStyle = 'rgba(29,58,87,.5)'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(TW.x, y + p.h / 2); X.lineTo(TW.x, twFloor()); X.stroke(); X.setLineDash([]); if (im.complete) X.drawImage(im, TW.x - p.w / 2 - TW_PAD, y - p.h / 2 - TW_PAD, p.w + TW_PAD * 2, p.h + TW_PAD * 2); }
  X.restore();
}
function twLoop() { if (!TW.run) return; if (!isTowerDoc() || !BS.root || !BS.root.isConnected) { TW.run = false; return; } const now = performance.now(); TW.acc = (TW.acc || 0) + Math.min(100, now - (TW.last || now)); TW.last = now; while (TW.acc >= 16.67 && isTowerDoc() && (doc.status === 'playing' || doc.b.phase === 'crash')) { twTick(); TW.acc -= 16.67; } TW.acc = Math.min(TW.acc, 40); twPaint(); requestAnimationFrame(twLoop); }
function twSize() { if (!TW.wrap) return; const w = TW.wrap.clientWidth || TW_W, h = TW.wrap.clientHeight || 667, d = Math.min(2, devicePixelRatio || 1); TW.cv.width = w * d; TW.cv.height = h * d; TW.sc = w / TW_W * d; TW.H = h / (w / TW_W); }
function twMount() {
  if (TW.wrap) return;
  TW.wrap = h('div', { class: 'tw' }); TW.cv = document.createElement('canvas'); TW.X = TW.cv.getContext('2d'); TW.hud = h('div', { class: 'tw-hud' }); TW.wrap.append(TW.cv, TW.hud);
  const toX = e => { const r = TW.wrap.getBoundingClientRect(); return Math.max(26, Math.min(TW_W - 26, (e.clientX - r.left) / r.width * TW_W)); };
  TW.cv.addEventListener('pointerdown', e => { if (TW.intro) { twIntroEnd(); return; } if (TW.phase === 'hold' && twMine() && doc.b.phase === 'play') { TW.drag = true; TW.x = toX(e); } });
  TW.cv.addEventListener('pointermove', e => { if (TW.drag) TW.x = toX(e); });
  addEventListener('pointerup', () => { if (TW.drag) { TW.drag = false; twDrop(); } });
  addEventListener('pointercancel', () => { TW.drag = false; });
  addEventListener('resize', () => { if (isTowerDoc()) twSize(); });
}
function twHud() {
  if (!TW.hud) return; const g = doc, b = g.b, mine = twMine(), name = id => bdName(id), over = g.status !== 'playing';
  const hint = TW.intro || b.phase === 'crash' || over ? '' : TW.phase === 'hold' ? (mine ? `${TW_P[b.cur].n}：指で動かして はなす` : `${name(b.seats[b.turn])}が 積んでいます`) : TW.phase === 'loading' ? '読みこんでいます…' : 'ゆれがおさまるのを 待とう';
  const host = local || g.host === me, s = b.last && b.last.s;
  const tall = TW.bodies.length;
  TW.hud.replaceChildren(h('div', { class: 'tw-top' }, h('div', { class: 'tw-seats' }, b.seats.map((id, i) => h('div', { class: 'tw-seat' + (i === b.turn && b.phase === 'play' ? ' on' : '') + (b.lives[i] <= 0 ? ' out' : '') }, h('b', null, name(id)), h('span', null, Array.from({ length: Math.max(0, b.lives[i]) }, () => h('i')))))),
    over ? null : h('button', { class: 'tw-ib', 'aria-label': '遊びかた', onclick: () => bdOpenRules('tower') }, '?'), over ? null : h('button', { class: 'tw-ib', 'aria-label': '中断してホームにもどる', onclick: confirmQuit }, '中断')),
    h('div', { class: 'tw-hint' }, hint), TW.intro ? null : h('div', { class: 'tw-hi' }, h('small', null, TWR.WORLDS[b.world].n), `${tall}段`),
    b.phase === 'crash' && !over ? h('div', { class: 'tw-big' }, 'ガシャーン！', h('small', null, `${name(b.seats[s])}が くずした`),) : null,
    b.phase === 'crash' && !over ? (host ? h('div', { class: 'tw-row' }, h('button', { class: 'tw-back', onclick: quitGame }, 'もどる'), h('button', { class: 'tw-go', onclick: () => twNext() }, 'つづける')) : h('div', { class: 'tw-note' }, '部屋主が つづけるか決めます')) : null,
    over ? bdOverCard(`${name(b.seats[b.result.win])}の勝ち！`, '最後までくずさなかった人の勝ち', null) : null);
}
function twNext() { const seq0 = doc.b.seq; if (local) { doc = TWR.act(doc, doc.b.seats[0], { t: 'next' }); TW.seq = -1; TW.phase = 'wait'; afterChange(); return; } withLease(d => d && d.status === 'playing' && d.b && d.b.seq === seq0 ? TWR.act(d, me, { t: 'next' }) : null); }
function towerView() {
  twMount(); const ok = !!TW.art && !!window.Matter;
  const go = () => { if (!TW.art || !window.Matter || !isTowerDoc() || !TW.wrap.isConnected) return; twSize(); twSync(); twHud(); if (!TW.run) { TW.run = true; TW.last = 0; requestAnimationFrame(twLoop); } };
  // 画面につながってから大きさを測って、描き始める（絵を先に読みこみ終わっていても、ここで必ず動かす）
  if (TW.wrap.isConnected) go(); else { if (!ok) TW.phase = 'loading'; setTimeout(go, 0); }
  if (TW.H) twHud();
  return TW.wrap;
}
function twSlides() {
  const art = id => () => TW.art ? h('img', { class: 'tw-sla', src: TW.art.piece[id].src, alt: '' }) : null;
  return [
    { t: '指で動かして はなすと落ちる', s: '順番に 荷物を積んでいく', art: art('sofa') },
    { t: '落としたら ライフが減る', s: 'くずれたら 次のタワーへ', art: art('tv2') },
    { t: '世界は毎回かわる', s: '家具・工事現場・美術品', art: art('mona') },
    { t: '最後まで残った人の勝ち', s: '上の面をよく見て そっと積もう', art: () => slaRank([['1位', 'のこった'], ['2位', 'ガシャーン'], ['3位', 'ガシャーン']]) },
  ];
}
function twTicketArt(art) { art.classList.add('tk-css', 'tk-tower'); art.append(h('img', { class: 'tka-tower', src: ICON_ART.tower, alt: '' })); }
