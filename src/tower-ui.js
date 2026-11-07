/* =================== ぐらぐらタワーの画面 =================== */
// bomb-ui.js のうしろに差し込まれる。物理は matter.js（cdnjs から遅延読み込み）、荷物と場面はボクセルを1回描いて画像にする
const TW = { ready: null, art: null, wrap: null, cv: null, X: null, hud: null, seq: -1, gid: 0, eng: null, plat: null, bodies: [], phase: 'wait', x: 187, t: 0, quiet: 0, cam: 0, fell: false, replay: null, drag: false, heldAt: 0, aim: 187, run: false };
const TW_W = 375, TW_S = 40, TW_PLAT = 178;
const isTowerDoc = () => !!doc && doc.game === 'tower' && !!doc.b;
// 荷物：w,h は大きさ（点）、parts は当たり判定の箱 [中心x, 中心y, 幅, 高さ]（下が＋）。f は3Dの形、yen は美術品の値段（億円）
const TW_P = {
  sofa: { n: 'ソファ', w: 132, h: 62, parts: [[0, 14, 132, 34], [-56, -14, 20, 34], [56, -14, 20, 34], [0, -16, 92, 14]], f(B) { B(0, -.35, 0, 3.3, .85, 1.5, '#c8573f'); B(-1.4, .35, 0, .5, .85, 1.5, '#b84a34'); B(1.4, .35, 0, .5, .85, 1.5, '#b84a34'); B(0, .4, -.5, 2.3, .35, .5, '#b84a34'); } },
  fridge: { n: '冷蔵庫', w: 62, h: 108, parts: [[0, 0, 62, 108]], f(B) { B(0, 0, 0, 1.55, 2.7, 1.4, '#e8eef0'); B(0, .45, .72, 1.5, .03, .03, '#a8b4be'); B(-.55, .75, .72, .06, .5, .05, '#8a929e'); B(-.55, -.4, .72, .06, .5, .05, '#8a929e'); } },
  table: { n: 'テーブル', w: 122, h: 52, parts: [[0, -20, 122, 12], [-50, 6, 12, 40], [50, 6, 12, 40]], f(B) { B(0, .5, 0, 3.05, .3, 1.5, '#a9743f'); B(-1.25, -.15, .5, .3, 1, .3, '#7c4d2a'); B(1.25, -.15, .5, .3, 1, .3, '#7c4d2a'); B(-1.25, -.15, -.5, .3, 1, .3, '#7c4d2a'); B(1.25, -.15, -.5, .3, 1, .3, '#7c4d2a'); } },
  tv: { n: 'テレビ', w: 92, h: 62, parts: [[0, -7, 92, 48], [0, 25, 44, 12]], f(B) { B(0, .18, 0, 2.3, 1.2, .3, '#1c1e24'); B(0, .18, .16, 2, 1, .03, '#6fc8e0'); B(0, -.62, 0, 1.1, .3, .6, '#3a3a3a'); } },
  tansu: { n: 'タンス', w: 86, h: 86, parts: [[0, 0, 86, 86]], f(B) { B(0, 0, 0, 2.15, 2.15, 1.3, '#9c6a3e'); [.55, 0, -.55].forEach(y => { B(0, y + .27, .67, 2, .03, .03, '#6b4526'); B(0, y, .68, .3, .08, .05, '#e7b52c'); }); } },
  plant: { n: '観葉植物', w: 44, h: 74, parts: [[0, 22, 34, 30], [0, -14, 44, 44]], f(B) { B(0, -.55, 0, .85, .75, .85, '#c49058'); B(0, .35, 0, 1.1, 1.1, 1, '#4fae6c'); B(.2, .8, .1, .6, .4, .6, '#3f9a5e'); } },
  bath: { n: 'おふろ', w: 132, h: 54, parts: [[0, 20, 132, 14], [-59, 0, 14, 54], [59, 0, 14, 54]], f(B) { B(0, -.5, 0, 3.3, .35, 1.5, '#f4efe6'); B(-1.47, 0, 0, .35, 1.35, 1.5, '#f4efe6'); B(1.47, 0, 0, .35, 1.35, 1.5, '#f4efe6'); B(0, 0, -.68, 2.6, 1.35, .14, '#f4efe6'); B(0, 0, .68, 2.6, 1.35, .14, '#f4efe6'); B(0, -.1, 0, 2.6, .2, 1.2, '#8fd8ff'); } },
  chair: { n: 'いす', w: 54, h: 84, parts: [[0, 8, 54, 10], [-22, -18, 10, 42], [-20, 28, 10, 28], [20, 28, 10, 28]], f(B) { B(0, -.2, 0, 1.35, .25, 1.2, '#a9743f'); B(-.55, .45, 0, .25, 1.05, 1.2, '#7c4d2a'); B(-.5, -.7, 0, .25, .7, 1, '#7c4d2a'); B(.5, -.7, 0, .25, .7, 1, '#7c4d2a'); } },
  wash: { n: '洗たく機', w: 72, h: 82, parts: [[0, 0, 72, 82]], f(B) { B(0, 0, 0, 1.8, 2.05, 1.4, '#dfe4ea'); B(0, -.1, .72, 1, 1, .04, '#55606c'); B(0, -.1, .75, .7, .7, .04, '#8fd8ff'); B(.55, .8, .72, .3, .12, .04, '#e8402a'); } },
  beam: { n: '鉄骨', w: 170, h: 20, den: .004, parts: [[0, 0, 170, 20]], f(B) { B(0, -.2, 0, 4.25, .12, .9, '#d9a01f'); B(0, 0, 0, 4.25, .28, .22, '#d9a01f'); B(0, .2, 0, 4.25, .12, .9, '#d9a01f'); [-1.5, -.5, .5, 1.5].forEach(x => B(x, 0, .12, .3, .2, .04, '#1c1a18')); } },
  beam2: { n: '赤い鉄骨', w: 130, h: 20, den: .004, parts: [[0, 0, 130, 20]], f(B) { B(0, -.2, 0, 3.25, .12, .9, '#e8402a'); B(0, 0, 0, 3.25, .28, .22, '#e8402a'); B(0, .2, 0, 3.25, .12, .9, '#e8402a'); [-1, 0, 1].forEach(x => B(x, 0, .12, .3, .2, .04, '#1c1a18')); } },
  conc: { n: 'コンクリート', w: 88, h: 56, den: .004, parts: [[0, 0, 88, 56]], f(B) { B(0, 0, 0, 2.2, 1.4, 1.5, '#a59a88'); [-.7, .7].forEach(x => B(x, 0, .77, .3, .8, .04, '#8a8070')); } },
  pipes: { n: '鉄パイプ', w: 92, h: 44, parts: [[0, 10, 92, 24], [0, -12, 48, 20]], f(B) { [[-.58, -.25], [.58, -.25], [0, .28]].forEach(([x, y]) => { B(x, y, 0, 1.08, .52, 2, '#7c8894'); B(x, y, 1.02, .6, .28, .04, '#3a4248'); }); } },
  drum: { n: 'ドラム缶', w: 54, h: 66, parts: [[0, 0, 54, 66]], f(B) { B(0, 0, 0, 1.35, 1.65, 1.35, '#3f6fb5'); [-.4, .4].forEach(y => B(0, y, 0, 1.42, .08, 1.42, '#2c4f8a')); B(0, 0, .69, .8, .3, .04, '#ffd54a'); } },
  crate: { n: '木箱', w: 74, h: 64, parts: [[0, 0, 74, 64]], f(B) { B(0, 0, 0, 1.85, 1.6, 1.5, '#b98450'); [-.5, 0, .5].forEach(y => B(0, y, .77, 1.85, .08, .04, '#7c4d2a')); } },
  vase: { n: '青い壺', w: 70, h: 96, yen: 2, parts: [[0, 12, 68, 66], [0, -36, 34, 24]], f(B) { [[.9, -1.1, .22], [1.2, -.85, .3], [1.6, -.45, .5], [1.75, .05, .5], [1.4, .45, .3], [.8, .75, .3], [.9, 1.05, .16]].forEach(([w, y, h]) => B(0, y, 0, w, h, w, '#3f6fb5')); B(0, -.25, .88, 1.76, .12, .04, '#fff'); B(0, .1, .88, 1.76, .1, .04, '#fff'); } },
  bust: { n: '胸像', w: 62, h: 110, yen: 3, parts: [[0, 32, 62, 46], [0, -26, 40, 58]], f(B) { B(0, -1.2, 0, 1.3, .25, 1.1, '#d8d4cc'); B(0, -.65, 0, 1.5, .85, .9, '#e8e4dc'); B(0, -.05, 0, .45, .35, .45, '#e8e4dc'); B(0, .6, 0, .95, 1, .95, '#efece4'); B(0, 1.15, -.1, 1, .3, .8, '#d8d4cc'); [-.24, .24].forEach(x => B(x, .7, .49, .2, .1, .04, '#a8a49c')); B(0, .45, .5, .16, .3, .1, '#d8d4cc'); } },
  frame: { n: '名画', w: 124, h: 88, yen: 5, parts: [[0, 0, 124, 88]], f(B) { B(0, 0, 0, 3.1, 2.2, .4, '#d9a01f'); B(0, 0, .2, 2.7, 1.8, .06, '#5a8a7a'); B(-.5, .2, .24, 1, .8, .04, '#e8402a'); B(.6, -.2, .24, .7, .5, .04, '#ffd54a'); } },
  gold: { n: '金の像', w: 60, h: 84, yen: 8, parts: [[0, 30, 60, 24], [0, -12, 34, 60]], f(B) { B(0, -.9, 0, 1.5, .3, 1.5, '#2a2622'); B(0, -.3, 0, .7, .9, .5, '#e7b52c'); B(0, .4, 0, .6, .6, .6, '#ffd24a'); B(-.65, -.2, 0, .5, .2, .3, '#e7b52c'); B(.65, 0, 0, .5, .2, .3, '#e7b52c'); B(0, .8, 0, .72, .14, .72, '#ffd54a'); } },
  urn: { n: '赤い壺', w: 84, h: 70, yen: 2, parts: [[0, 6, 84, 54], [0, -29, 44, 12]], f(B) { [[1.2, -.75, .3], [1.9, -.35, .5], [2.1, .1, .4], [1.5, .45, .3], [1.1, .75, .2]].forEach(([w, y, h]) => B(0, y, 0, w, h, w, '#c8573f')); B(0, .1, 1.06, 2.12, .1, .04, '#ffd54a'); } },
};
// 世界：物理のクセと場面
const TW_WORLD = { house: { fr: .75, rs: .02, den: .0015, sky: '#a8d4ee' }, site: { fr: .5, rs: 0, den: .002, sky: '#9ad0ec' }, art: { fr: .55, rs: .02, den: .0015, sky: '#efe8dc' } };
function twLoad() {
  if (TW.ready) return TW.ready;
  const matter = window.Matter ? Promise.resolve() : new Promise((ok, ng) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'; s.onload = ok; s.onerror = ng; document.head.append(s); });
  TW.ready = Promise.all([TB.load(), matter]).then(() => { twArt(); }).catch(e => { TW.ready = null; throw e; });
  return TW.ready;
}
function twArt() {
  const T = TB.parts().T, r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.outputEncoding = T.sRGBEncoding; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  const mats = {}, M = (c, e, i) => { const k = c + (e || ''); return mats[k] || (mats[k] = new T.MeshStandardMaterial({ color: c, roughness: .7, emissive: e || '#000', emissiveIntensity: e ? (i || .6) : 0 })); };
  const put = g => (x, y, z, w, h, d, c, e) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), M(c, e)); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const out = { piece: {}, bg: {} };
  // 荷物：少しななめから写して立体に見せる。絵は当たり判定より少し大きい
  Object.keys(TW_P).forEach(id => {
    const p = TW_P[id], s = new T.Scene(), g = new T.Group(); g.rotation.y = -.28; g.rotation.x = .16; s.add(g); p.f(put(g));
    const d = new T.DirectionalLight('#fff', .72); d.position.set(-3, 5, 7); s.add(d); s.add(new T.HemisphereLight('#fff', '#9a8a70', .36));
    const hw = p.w / TW_S / 2 * 1.3, hh = p.h / TW_S / 2 * 1.3, c = new T.OrthographicCamera(-hw, hw, hh, -hh, .1, 30); c.position.set(0, 0, 10); c.lookAt(0, 0, 0); r.setClearColor(0, 0); r.setPixelRatio(1); r.setSize(p.w * 2.6, p.h * 2.6, false); r.render(s, c);
    const im = new Image(); im.src = r.domElement.toDataURL('image/png'); out.piece[id] = im;
  });
  // 場面：画像の下から130点の高さが、荷物をのせる台の上面（y=0）
  const IW = TW_W / TW_S, IH = 900 / TW_S, Y0 = 130 / TW_S;
  const scene = (sky, build) => {
    const s = new T.Scene(); s.background = new T.Color(sky); build(put(s), s);
    const d = new T.DirectionalLight('#fff', .72); d.position.set(-8, 14, 12); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -14, right: 14, top: 22, bottom: -8, far: 50 }); s.add(d); s.add(new T.HemisphereLight('#fff', '#6a6a70', .4));
    const c = new T.OrthographicCamera(-IW / 2, IW / 2, IH - Y0, -Y0, .1, 80); c.position.set(0, 3.4, 30); c.rotation.x = -.11; c.updateMatrixWorld();
    r.setClearColor(sky, 1); r.setPixelRatio(1); r.setSize(TW_W * 2, 1800, false); r.render(s, c); const im = new Image(); im.src = r.domElement.toDataURL('image/jpeg', .9); return im;
  };
  const PW = TW_PLAT / TW_S;
  out.bg.house = scene(TW_WORLD.house.sky, B => {
    [[-3.6, 3.6, '#c8d8e2'], [-1.6, 5.6, '#bcd0dc'], [1.4, 3.2, '#c8d8e2'], [3.6, 6, '#bcd0dc']].forEach(([x, h, c]) => { B(x, h / 2 - 1.4, -7, 1.9, h, 2, c); for (let y = -.6; y < h - 2; y += .9) B(x, y, -5.98, 1.3, .4, .03, '#e8f2f8'); });
    B(0, -2.9, 2, 16, 1, 16, '#8a8f96'); [-3, -1, 1, 3].forEach(x => B(x, -2.38, 7, 1, .04, .24, '#f4efe6'));
    B(0, -.22, 0, PW + .3, .44, 3, '#e8eef0'); B(0, -.7, 0, PW + .3, .5, 3, '#3f6fb5'); B(PW / 2 + .95, -.2, 0, 1.5, 1.7, 3, '#ffd24a'); B(PW / 2 + 1.1, .2, 1.52, 1, .6, .05, '#bfe8ff');
    [-1.5, 1.2, 3.1].forEach(x => B(x, -1.3, 1.2, .8, .8, .5, '#22252c'));
  });
  out.bg.site = scene(TW_WORLD.site.sky, B => {
    for (let y = -2; y < 21; y += 2) { B(-3.6, y, -6, .16, 2, .16, '#e7b52c'); B(-2.8, y, -6, .16, 2, .16, '#e7b52c'); B(-3.2, y, -6, .9, .12, .12, '#e7b52c'); } B(-.4, 21, -6, 8, .3, .3, '#e7b52c');
    for (let j = 0; j < 7; j++) B(3.8, -1.6 + j * 2.2, -7, 3, .2, 3, '#8a929e'); [2.5, 3.8, 5.1].forEach(x => B(x, 5, -7, .28, 14, .28, '#8a929e'));
    B(0, -2.2, 2, 16, 1, 16, '#c8b898'); B(0, -.3, 0, PW + .1, .6, 3, '#6a6e74'); B(0, -.03, 1.52, PW + .1, .1, .04, '#ffd54a'); B(0, -1.2, 0, 1.2, 1.2, 2.4, '#55585e');
  });
  out.bg.art = scene(TW_WORLD.art.sky, B => {
    B(0, 8, -6, 20, 30, .4, '#efe8dc'); B(0, -2.6, 2, 18, 1, 16, '#b98a5e'); B(0, -2.05, 3, 4, .08, 12, '#8f2015');
    [[-3.4, 3, '#5a8a7a', '#fff'], [3.4, 5, '#c8573f', '#ffd54a'], [-3.5, 8, '#3f6fb5', '#ffd54a'], [3.4, 11, '#8a6ab8', '#ffd54a']].forEach(([x, y, a, c]) => { B(x, y, -5.7, 2.4, 1.8, .16, '#d9a01f'); B(x, y, -5.6, 2.1, 1.5, .05, a); B(x - .3, y + .1, -5.56, .8, .7, .04, c); });
    B(0, -1.1, 0, PW - .4, 1.8, 2.6, '#f4efe6'); B(0, -.1, 0, PW + .1, .2, 3, '#d8d4cc');
    [-3, 3].forEach(x => { B(x, -1.2, 3, .14, 1.6, .14, '#d9a01f'); }); B(0, -.6, 3, 6, .07, .07, '#8f2015');
  });
  r.dispose(); TW.art = out;
}
function twEngine() { const { Engine } = Matter; TW.eng = Engine.create(); TW.eng.gravity.y = 1; TW.eng.positionIterations = 10; TW.eng.velocityIterations = 8; }
const twFloor = () => TW.H - 120;
function twBody(id, x, y, a, wd) {
  const { Bodies, Body } = Matter, p = TW_P[id], fr = p.fr != null ? p.fr : wd.fr, opt = { friction: fr, restitution: wd.rs, density: p.den || wd.den };
  const ps = p.parts.map(([cx, cy, w, h]) => Bodies.rectangle(cx, cy, w, h, opt)), b = ps.length > 1 ? Body.create({ parts: ps, friction: fr, restitution: wd.rs }) : ps[0];
  const ox = -b.position.x, oy = -b.position.y; Body.setPosition(b, { x: x - ox * Math.cos(a) + oy * Math.sin(a), y: y - ox * Math.sin(a) - oy * Math.cos(a) }); Body.setAngle(b, a); b.plugin = { id, ox, oy }; return b;
}
// 荷物の位置は「絵の中心」で覚える（台の上面からの高さなので、画面の高さが端末ごとにちがっても同じ）
const twPos = b => { const { ox, oy } = b.plugin, a = b.angle; return { x: b.position.x + ox * Math.cos(a) - oy * Math.sin(a), y: b.position.y + ox * Math.sin(a) + oy * Math.cos(a) }; };
function twBuild(pieces) {
  const { Bodies, Composite } = Matter, wd = TW_WORLD[doc.b.world]; Composite.clear(TW.eng.world, false); TW.bodies = [];
  TW.plat = Bodies.rectangle(TW_W / 2, twFloor() + 10, TW_PLAT, 20, { isStatic: true, friction: .9 }); Composite.add(TW.eng.world, TW.plat);
  pieces.forEach(q => { const b = twBody(q.id, q.x, twFloor() + q.y, q.a, wd); Composite.add(TW.eng.world, b); TW.bodies.push(b); });
}
const twTop = () => TW.bodies.reduce((m, b) => Math.min(m, b.bounds.min.y), twFloor());
const twHeight = () => Math.max(0, (twFloor() - twTop()) / 40).toFixed(1);
const twHoldY = id => twTop() - TW_P[id].h / 2 - 46;
const twMine = () => { const id = doc.b.seats[doc.b.turn]; return !TWR.isNpc(id) && (local || id === me); };
const twDriver = () => local || doc.players[0] === me;
function twSync() {
  const b = doc.b; if (!TW.eng) twEngine();
  if (TW.gid === b.gid && TW.seq === b.seq) return;
  const first = TW.gid !== b.gid; TW.gid = b.gid; TW.seq = b.seq;
  const L = b.last;
  // ほかの人が積んだ：同じ落下をこの端末でも見せてから、書かれた位置にそろえる
  if (!first && L && L.id && L.s !== TW.dropSeat && (L.kind === 'drop' || L.kind === 'crash')) { twBuild(L.from || []); const wd = TW_WORLD[b.world], y = twTop() - TW_P[L.id].h / 2 - 46, o = twBody(L.id, L.x, y, 0, wd); Matter.Composite.add(TW.eng.world, o); TW.bodies.push(o); TW.phase = 'replay'; TW.t = 0; TW.quiet = 0; }
  else { if (b.phase !== 'crash' && TW.phase !== 'fall') twBuild(b.pieces); twHold(); }
  TW.dropSeat = null;
}
function twHold() { const b = doc.b; TW.phase = b.phase === 'crash' ? 'crash' : 'hold'; TW.t = 0; TW.x = TW_W / 2; const t = TW.bodies.slice().sort((p, q) => p.bounds.min.y - q.bounds.min.y)[0]; TW.aim = (t ? t.position.x : TW_W / 2) + (Math.random() - .5) * 54; }
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
  Matter.Engine.update(TW.eng, 1000 / 60); TW.t += 1 / 60;
  const want = Math.max(0, twFloor() - twTop() - TW.H * .42); TW.cam += (want - TW.cam) * .06;
  const b = doc.b, npc = TWR.isNpc(b.seats[b.turn]);
  if (TW.phase === 'hold' && npc && twDriver()) { TW.x += (TW.aim - TW.x) * .05; if (TW.t > 1.3) twDrop(); }
  if (TW.phase === 'fall' || TW.phase === 'replay') {
    const lost = TW.bodies.some(o => o.position.y > twFloor() + 40), still = TW.bodies.every(o => o.speed < .16 && Math.abs(o.angularSpeed) < .012); TW.quiet = still ? TW.quiet + 1 : 0;
    if (TW.phase === 'fall') { if (lost) { twCommit(true); return; } if (TW.quiet > 34 || TW.t > 6) twCommit(false); }
    else if (b.phase === 'crash' ? TW.t > 2.4 : TW.quiet > 34 || TW.t > 5) { if (b.phase !== 'crash') twBuild(b.pieces); twHold(); twHud(); }
  }
}
function twPaint() {
  const X = TW.X, sc = TW.sc, A = TW.art, b = doc.b, wd = TW_WORLD[b.world]; if (!A) return;
  X.setTransform(sc, 0, 0, sc, 0, 0); X.fillStyle = wd.sky; X.fillRect(0, 0, TW_W, TW.H); X.save(); X.translate(0, TW.cam);
  const bg = A.bg[b.world]; if (bg.complete) X.drawImage(bg, 0, twFloor() - (900 - 130), TW_W, 900);
  TW.bodies.forEach(o => { const p = TW_P[o.plugin.id], im = A.piece[o.plugin.id], q = twPos(o); X.save(); X.translate(q.x, q.y); X.rotate(o.angle); if (im.complete) X.drawImage(im, -p.w * .65, -p.h * .65, p.w * 1.3, p.h * 1.3); X.restore(); });
  if (TW.phase === 'hold' && b.phase === 'play') { const p = TW_P[b.cur], y = twHoldY(b.cur), im = A.piece[b.cur]; X.setLineDash([5, 5]); X.strokeStyle = 'rgba(29,58,87,.5)'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(TW.x, y + p.h / 2); X.lineTo(TW.x, twFloor()); X.stroke(); X.setLineDash([]); if (im.complete) X.drawImage(im, TW.x - p.w * .65, y - p.h * .65, p.w * 1.3, p.h * 1.3); }
  X.restore();
}
function twLoop() { if (!TW.run) return; if (!isTowerDoc() || !BS.root || !BS.root.isConnected) { TW.run = false; return; } const now = performance.now(); TW.acc = (TW.acc || 0) + Math.min(100, now - (TW.last || now)); TW.last = now; while (TW.acc >= 16.67 && isTowerDoc() && doc.status === 'playing') { twTick(); TW.acc -= 16.67; } TW.acc = Math.min(TW.acc, 40); twPaint(); requestAnimationFrame(twLoop); }
function twSize() { if (!TW.wrap) return; const w = TW.wrap.clientWidth || TW_W, h = TW.wrap.clientHeight || 667, d = Math.min(2, devicePixelRatio || 1); TW.cv.width = w * d; TW.cv.height = h * d; TW.sc = w / TW_W * d; TW.H = h / (w / TW_W); }
function twMount() {
  if (TW.wrap) return;
  TW.wrap = h('div', { class: 'tw' }); TW.cv = document.createElement('canvas'); TW.X = TW.cv.getContext('2d'); TW.hud = h('div', { class: 'tw-hud' }); TW.wrap.append(TW.cv, TW.hud);
  const toX = e => { const r = TW.wrap.getBoundingClientRect(); return Math.max(26, Math.min(TW_W - 26, (e.clientX - r.left) / r.width * TW_W)); };
  TW.cv.addEventListener('pointerdown', e => { if (TW.phase === 'hold' && twMine() && doc.b.phase === 'play') { TW.drag = true; TW.x = toX(e); } });
  TW.cv.addEventListener('pointermove', e => { if (TW.drag) TW.x = toX(e); });
  addEventListener('pointerup', () => { if (TW.drag) { TW.drag = false; twDrop(); } });
  addEventListener('pointercancel', () => { TW.drag = false; });
  addEventListener('resize', () => { if (isTowerDoc()) twSize(); });
}
function twHud() {
  if (!TW.hud) return; const g = doc, b = g.b, mine = twMine(), name = id => bdName(id), over = g.status !== 'playing', yen = TW.bodies.reduce((n, o) => n + (TW_P[o.plugin.id].yen || 0), 0);
  const hint = b.phase === 'crash' || over ? '' : TW.phase === 'hold' ? (mine ? `${TW_P[b.cur].n}：指で動かして はなす` : `${name(b.seats[b.turn])}が 積んでいます`) : TW.phase === 'loading' ? '読みこんでいます…' : 'ゆれがおさまるのを 待とう';
  const host = local || g.host === me, s = b.last && b.last.s;
  TW.hud.replaceChildren(h('div', { class: 'tw-top' }, h('div', { class: 'tw-seats' }, b.seats.map((id, i) => h('div', { class: 'tw-seat' + (i === b.turn && b.phase === 'play' ? ' on' : '') + (b.lives[i] <= 0 ? ' out' : '') }, h('b', null, name(id)), h('span', null, Array.from({ length: Math.max(0, b.lives[i]) }, () => h('i')))))),
    over ? null : h('button', { class: 'tw-ib', 'aria-label': '遊びかた', onclick: () => bdOpenRules('tower') }, '?'), over ? null : h('button', { class: 'tw-ib', 'aria-label': '中断してホームにもどる', onclick: confirmQuit }, '中断')),
    h('div', { class: 'tw-hint' }, hint), h('div', { class: 'tw-hi' }, h('small', null, TWR.WORLDS[b.world].n), `${twHeight()}m`), b.world === 'art' ? h('div', { class: 'tw-yen' }, h('small', null, '積んだ値段'), `${yen}億円`) : null,
    b.phase === 'crash' && !over ? h('div', { class: 'tw-big' }, 'ガシャーン！', h('small', null, `${name(b.seats[s])}が くずした`), b.world === 'art' ? h('small', null, `${yen}億円が…`) : null) : null,
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
    { t: '落としたら ライフが減る', s: 'くずれたら 次のタワーへ', art: art('fridge') },
    { t: '世界は毎回かわる', s: '家具・工事現場・美術品', art: art('vase') },
    { t: '最後まで残った人の勝ち', s: '形をよく見て そっと積もう', art: () => slaRank([['1位', 'のこった'], ['2位', 'ガシャーン'], ['3位', 'ガシャーン']]) },
  ];
}
function twTicketArt(art) { art.classList.add('tk-css', 'tk-tower'); art.append(h('img', { class: 'tka-tower', src: ICON_ART.tower, alt: '' })); }
