/* ===== ボクシングの3D（BX3）：作業機ロボット・リング・客席・動き =====
   three.js r128（TB.load で読みこむ）。モックアップ（tools/boxing-fp-mockup.html・boxing-ko-mockup.html）と同じ形を、スマホで動く軽さにしたもの
   - ロボットは関節ごとの入れ物を「構え」（関節の位置）に合わせて動かす（liveRobot / R.set）。入れ物の中の部品は素材ごとにまとめて描く
   - 自分の目から見るとき（'fp'）は、自分の側は腕とこぶしだけをカメラの前に置く（fpArms）。観戦（'side'）は2体を横から
   - 止まっているときは1秒に約20回だけ描く。影は動きのあいだだけ描き直す */
const BX3 = (() => {
  let T, C, sd = 7;
  const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const cv = s => { const c = document.createElement('canvas'); c.width = c.height = s; return [c, c.getContext('2d')]; };
  const ctex = (c, srgb, rep = 1) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; if (srgb) t.encoding = T.sRGBEncoding; return t; };
  let PANEL, INKG, CAUTT, GLOWT, M = {};
  function init() {
    if (T) return; T = window.THREE; C = c => new T.Color(c).convertSRGBToLinear();
    // パネルの継ぎ目（凹み）
    let [c, x] = cv(256); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#1c1c1c'; x.lineWidth = 3; x.strokeRect(18, 18, 220, 220); x.beginPath(); x.moveTo(18, 154); x.lineTo(238, 154); x.stroke();
    x.fillStyle = '#b8b8b8'; for (const [a, b] of [[36, 36], [220, 36], [36, 220], [220, 220]]) { x.beginPath(); x.arc(a, b, 4, 0, 7); x.fill(); } PANEL = ctex(c);
    // 使いこんだ塗装：汚れ・こすれ・下のほうのくすみ・スミ入れの線
    [c, x] = cv(256); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1100; i++) { x.fillStyle = `rgba(70,58,46,${rnd() * .09})`; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, .5 + rnd() * 6, 0, 7); x.fill(); }
    for (let i = 0; i < 130; i++) { x.strokeStyle = `rgba(225,220,210,${.25 + rnd() * .4})`; x.lineWidth = .5 + rnd() * .8; const a = rnd() * 256, b = rnd() * 256, t = rnd() * 6.3, l = 2 + rnd() * 8; x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.cos(t) * l, b + Math.sin(t) * l); x.stroke(); }
    const e = x.createLinearGradient(0, 0, 0, 256); e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(.8, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(60,45,30,.35)'); x.fillStyle = e; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(25,20,16,.75)'; x.lineWidth = 2; x.strokeRect(18, 18, 220, 220); x.beginPath(); x.moveTo(18, 154); x.lineTo(238, 154); x.stroke(); INKG = ctex(c, true);
    // 黄色と黒の帯
    [c, x] = cv(128); x.fillStyle = '#f2c230'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#1d1d1f';
    for (let i = -4; i < 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 16, 0); x.lineTo(i * 32 + 144, 128); x.lineTo(i * 32 + 128, 128); x.closePath(); x.fill(); } CAUTT = ctex(c, true); CAUTT.repeat.set(3, 1);
    // 目の光のにじみ（光る板に貼る）
    [c, x] = cv(64); const r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); GLOWT = new T.CanvasTexture(c);
  }
  // ---- 素材 ----
  const paintU = c => new T.MeshStandardMaterial({ color: C(c), map: INKG, bumpMap: PANEL, bumpScale: .012, roughness: .62, metalness: .08, envMapIntensity: .8 });
  const paint = c => M['p' + c] || (M['p' + c] = paintU(c));
  const frameM = c => M['f' + c] || (M['f' + c] = new T.MeshStandardMaterial({ color: C(c), metalness: .75, roughness: .4, bumpMap: PANEL, bumpScale: .006, envMapIntensity: 1 }));
  const plain = (c, r = .9, m = 0) => M['s' + c + r + m] || (M['s' + c + r + m] = new T.MeshStandardMaterial({ color: C(c), roughness: r, metalness: m }));
  const glass = () => M.glass || (M.glass = new T.MeshStandardMaterial({ color: C('#0d1116'), roughness: .08, metalness: .3, envMapIntensity: 1.6 }));
  const chrome = () => M.chrome || (M.chrome = new T.MeshStandardMaterial({ color: C('#d8dade'), metalness: 1, roughness: .16, envMapIntensity: 1.3 }));
  const caut = () => M.caut || (M.caut = new T.MeshStandardMaterial({ map: CAUTT, roughness: .6, bumpMap: PANEL, bumpScale: .006 }));
  const basic = (c, k = 1) => M['b' + c + k] || (M['b' + c + k] = new T.MeshBasicMaterial({ color: C(c).multiplyScalar(k) }));
  // ---- 形 ----
  // 角を丸めた箱（r128 には無いので自分で作る）。1辺を6つに割って、角の近くの点を丸みにのせる
  const RBC = {};
  function RB(w, h, d, r = .02) {
    r = Math.max(.001, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
    const k = [w, h, d, r].map(v => v.toFixed(4)).join(); if (RBC[k]) return RBC[k];
    const m = 3, g = new T.BoxGeometry(1, 1, 1, 2 * m, 2 * m, 2 * m), p = g.attributes.position, n = g.attributes.normal, H = [w / 2, h / 2, d / 2], I = H.map(v => v - r), v = V(0, 0, 0), c = V(0, 0, 0), dd = V(0, 0, 0);
    const rm = (u, ax) => { const j = Math.round(Math.abs(u) * 2 * m); return j ? Math.sign(u) * (I[ax] + r * Math.sin((j - 1) / (m - 1) * Math.PI / 2)) : 0; };
    for (let i = 0; i < p.count; i++) {
      v.set(rm(p.getX(i), 0), rm(p.getY(i), 1), rm(p.getZ(i), 2)); c.set(Math.max(-I[0], Math.min(I[0], v.x)), Math.max(-I[1], Math.min(I[1], v.y)), Math.max(-I[2], Math.min(I[2], v.z)));
      dd.subVectors(v, c); const L = dd.length(); if (L > 1e-6) { dd.multiplyScalar(1 / L); v.copy(c).addScaledVector(dd, r); n.setXYZ(i, dd.x, dd.y, dd.z); }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    return RBC[k] = g;
  }
  const taper = (g0, top, bot = 1) => { const geo = g0.clone(); geo.computeBoundingBox(); const b = geo.boundingBox, p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const t = (p.getY(i) - b.min.y) / (b.max.y - b.min.y), k = bot + (top - bot) * t; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } geo.computeVertexNormals(); return geo; };
  function shape(fn, depth) { const s = new T.Shape(); fn(s); const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 2, curveSegments: 8 }); g.translate(0, 0, -depth / 2); return g; }
  function Mx(g, geo, mat, p = [0, 0, 0], r = [0, 0, 0]) { const m = new T.Mesh(geo, mat); m.position.set(p[0], p[1], p[2]); m.rotation.set(r[0], r[1], r[2]); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
  const merge = (g, skip) => TB.parts().merge(g, skip);

  // ---- 構え（ロボットは +z を向く）。sh 肩・el ひじ・ha こぶし・hip・kn ひざ・an 足首（i=0 は +x 側）----
  const DEF = { body: [0, 0, 0], hr: [0, 0, 0], tw: 0, lean: 0, roll: 0 };
  const mk = (base, o = {}) => ({ ...DEF, ...base, ...o });
  const lp = (A, B, t) => Array.isArray(A) ? A.map((x, i) => lp(x, B[i], t)) : A + (B - A) * t;
  const mixP = (A, B, t) => { if (Array.isArray(A)) return lp(A, B, t); const o = {}; for (const k in A) o[k] = lp(A[k], B[k], t); return o; };
  const E = { l: t => t, i: t => t * t * t, o: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, b: t => { const n = 7.5625, d = 2.75; return t < 1 / d ? n * t * t : t < 2 / d ? n * (t -= 1.5 / d) * t + .75 : t < 2.5 / d ? n * (t -= 2.25 / d) * t + .9375 : n * (t -= 2.625 / d) * t + .984375; } };
  function track(keys, t, mix = mixP) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, A] = keys[i], [b, B, e] = keys[i + 1]; if (t < b) return mix(A, B, E[e || 'io']((t - a) / (b - a))); } return keys[keys.length - 1][1]; }
  const STANCE = mk({ sh: [[.23, 1.22, 0], [-.23, 1.22, 0]], el: [[.3, .9, .12], [-.3, .94, .14]], ha: [[.19, 1.08, .33], [-.16, 1.12, .37]], hip: [[.11, .76, 0], [-.11, .76, 0]], kn: [[.18, .43, .05], [-.17, .43, .13]], an: [[.22, .09, -.06], [-.19, .09, .1]], head: [0, 1.43, .03], tw: .05, lean: .05 });
  const set2 = (P, k, i, v) => { const a = P[k].slice(); a[i] = v; return a; };
  const GRD = { // 守る（その機体から見た向き。left は +x 側）
    left: mk(STANCE, { ha: set2(STANCE, 'ha', 0, [.17, 1.4, .3]), el: set2(STANCE, 'el', 0, [.31, 1.12, .16]), tw: -.08 }),
    right: mk(STANCE, { ha: set2(STANCE, 'ha', 1, [-.17, 1.4, .3]), el: set2(STANCE, 'el', 1, [-.31, 1.12, .16]), tw: .08 }),
    body: mk(STANCE, { ha: [[.12, .96, .3], [-.12, .97, .31]], el: [[.29, .86, .12], [-.29, .86, .12]], lean: .16, head: [0, 1.4, .07] }) };
  // 打つ：tx は相手のどちら側か（+x / −x / 0）、y は高さ、reach は前へのばす距離
  function punchPose(tx, y, reach) { const i = tx < 0 ? 1 : 0, s = i ? -1 : 1, P = mk(STANCE, { tw: -s * .32, lean: .14, head: [0, 1.42, .08] });
    P.ha = set2(P, 'ha', i, [tx * .7 + s * .02, y, reach]); P.el = set2(P, 'el', i, [s * .2, (y + 1.2) / 2, reach * .45]); return P; }
  const HIT = mk(STANCE, { head: [0, 1.44, -.07], hr: [-.45, .18, 0], lean: -.3, tw: .18, body: [0, 0, -.06], el: [[.33, 1.0, 0], [-.32, 1.02, .02]], ha: [[.38, 1.2, .1], [-.35, 1.22, .14]] });
  const KNEEL = mk(STANCE, { body: [0, -.36, .08], kn: [[.19, .07, .16], [-.19, .07, .14]], an: [[.21, .08, -.18], [-.21, .08, -.2]], lean: .45, head: [0, 1.38, .16], hr: [.55, 0, 0], el: [[.3, .88, .12], [-.3, .88, .12]], ha: [[.27, .62, .26], [-.27, .62, .26]] });
  const SLUMP = mk(KNEEL, { lean: .62, head: [0, 1.33, .21], hr: [.85, 0, .18], ha: [[.28, .58, .3], [-.25, .6, .3]] });
  const WIN = mk(STANCE, { ha: [[.24, 1.78, .02], [-.16, 1.12, .37]], el: [[.32, 1.45, 0], [-.3, .94, .14]], hr: [-.15, 0, 0], tw: .1 });

  // ---- 機体 ----
  // プレイヤーごとの色（1 赤・2 青・3 黄・4 緑、8人のときは 橙・紫・白・黒）。sub・frame は共通
  const COLS = [['#9a3027', '#c63a2d', '#ff7a2a'], ['#284d96', '#2f62c8', '#5fd0ff'], ['#c99a1a', '#e8b829', '#fff1a0'], ['#2e6b3c', '#3c9a52', '#9dff7a'], ['#c0601e', '#e07a2a', '#ffd08a'], ['#5a3a8c', '#7a52b8', '#e0a0ff'], ['#cfcac0', '#e8e4dc', '#8fe0ff'], ['#2c2d31', '#45474d', '#ff4a4a']].map(([main, acc, glow]) => ({ main, acc, glow, sub: '#3d3f45', frame: '#585b61' }));
  const RED = COLS[0], BLUE = COLS[1];
  const W = 1.38, AR = 1.35, LG = 1.25, FI = 1.45, PD = .82, HY = -.035, YV = () => V(0, 1, 0);
  const X = (p, k) => [p[0] * (1 + (W - 1) * k), p[1], p[2]];
  function fist(f, mA, mJ) { Mx(f, RB(.1, .04, .1, .014), mJ, [0, .005, 0]); Mx(f, RB(.125, .13, .112, .032), mA, [0, .085, 0]);
    for (let i = 0; i < 3; i++) Mx(f, RB(.005, .024, .116, .002), mJ, [-.031 + i * .031, .14, 0]);
    Mx(f, RB(.036, .072, .042, .013), mA, [.072, .075, .035], [0, 0, -.15]); Mx(f, RB(.08, .016, .06, .006), mJ, [0, .09, -.058]); }
  function eyeGlow(col) { const s = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: GLOWT, color: C(col), transparent: true, depthWrite: false, blending: T.AdditiveBlending })); s.renderOrder = 2; return s; }
  function liveRobot(S) {
    const mP = paintU(S.main), mS = paint(S.sub), mA = paintU(S.acc), mF = frameM(S.frame), mJ = frameM('#3a3c42'), root = new T.Group(), bod = new T.Group(); root.add(bod);
    const glowC = C(S.glow).multiplyScalar(3), eye = new T.MeshBasicMaterial({ color: glowC.clone() }), R = { root, bod, eye, glowC, pads: [], limbs: [], lit: 1 };
    const pel = new T.Group(); bod.add(pel); R.pel = pel;
    Mx(pel, RB(.27 * W, .13, .19, .04), mF); Mx(pel, taper(RB(.13 * W, .14, .035, .012), 1, .75), mP, [0, -.07, .11], [-.12, 0, 0]);
    for (const s of [1, -1]) Mx(pel, taper(RB(.045, .19, .17, .014), 1, 1.1), mP, [s * .165 * W, -.09, 0], [0, 0, s * .16]);
    Mx(pel, new T.CylinderGeometry(.08 * W, .09 * W, .2, 16), mJ, [0, .13, 0]); Mx(pel, RB(.14 * W, .055, .06, .018), mP, [0, .09, .07]); Mx(pel, RB(.16 * W, .055, .06, .018), mP, [0, .15, .07]);
    const ch = new T.Group(); bod.add(ch);
    Mx(ch, shape(z => { z.moveTo(-.18 * W, .13); z.lineTo(.18 * W, .13); z.lineTo(.19 * W, 0); z.lineTo(.11 * W, -.13); z.lineTo(-.11 * W, -.13); z.lineTo(-.19 * W, 0); z.closePath(); }, .19), mP);
    for (const s of [1, -1]) Mx(ch, shape(z => { z.moveTo(s * .015, .1); z.lineTo(s * .15 * W, .1); z.lineTo(s * .15 * W, .01); z.lineTo(s * .06 * W, -.06); z.lineTo(s * .015, -.06); z.closePath(); }, .02), s > 0 ? mA : mS, [0, 0, .12]);
    Mx(ch, RB(.05, .2, .03, .01), mJ, [0, 0, .112]);
    for (const s of [1, -1]) for (let i = 0; i < 3; i++) Mx(ch, RB(.045 * W, .01, .02, .004), mJ, [s * .1 * W, -.075 - i * .02, .11]);
    Mx(ch, RB(.2 * W, .05, .17, .02), mF, [0, .155, 0]); Mx(ch, RB(.24 * W, .22, .1, .03), mS, [0, -.01, -.16]);
    for (const s of [1, -1]) { Mx(ch, new T.CylinderGeometry(.03, .04, .08, 12), mJ, [s * .07 * W, -.13, -.18]);
      Mx(ch, new T.CylinderGeometry(.028, .028, .3, 12), chrome(), [s * .09 * W, .17, -.22]); Mx(ch, new T.CylinderGeometry(.036, .031, .045, 12), mJ, [s * .09 * W, .33, -.22]); Mx(ch, new T.CylinderGeometry(.025, .025, .01, 12), basic('#0b0b0c'), [s * .09 * W, .355, -.22]); }
    Mx(ch, RB(.34 * W, .03, .245, .012), caut(), [0, -.1, 0]);
    const hd = new T.Group(); bod.add(hd); R.head = hd;
    Mx(hd, new T.CylinderGeometry(.04, .046, .09, 12), mJ, [0, -.115, -.02]);
    Mx(hd, RB(.2, .15, .18, .045), mP); Mx(hd, RB(.21, .035, .05, .012), mS, [0, .058, .075]); Mx(hd, RB(.16, .05, .03, .012), glass(), [0, .012, .08]);
    Mx(hd, new T.SphereGeometry(.024, 16, 12), eye, [.025, .012, .094]); Mx(hd, new T.TorusGeometry(.031, .006, 8, 20), mJ, [.025, .012, .095]);
    for (let i = 0; i < 4; i++) Mx(hd, new T.CylinderGeometry(.006, .006, .11, 6), mJ, [0, -.03 - i * .014, .091], [0, 0, Math.PI / 2]);
    Mx(hd, new T.CylinderGeometry(.006, .006, .14, 6), mJ, [.08, .12, -.04]); Mx(hd, new T.SphereGeometry(.012, 10, 8), eye, [.08, .19, -.04]);
    const halo = eyeGlow(S.glow); halo.position.set(.025, .012, .12); halo.scale.setScalar(.16); hd.add(halo); R.halo = halo;
    const grp = () => { const q = new T.Group(); bod.add(q); return q; }, len = (A, B) => V(...A).distanceTo(V(...B)), P0 = STANCE, a = AR, k = LG;
    for (let i = 0; i < 2; i++) { const side = i ? -1 : 1, L = {};
      L.sh = grp(); Mx(L.sh, new T.SphereGeometry(.06 * a, 16, 12), mJ);
      const pad = Mx(L.sh, RB(.17 * a * PD, .12 * PD, .19 * a, .05), mS, [side * .035 * a, .055, 0], [0, 0, -side * .28]); Mx(pad, RB(.17 * a * PD + .004, .03, .19 * a + .004, .01), caut(), [0, -.04 * PD, 0]); R.pads.push(pad);
      let l = len(X(P0.sh[i], 1), X(P0.el[i], .6)); L.up = grp(); Mx(L.up, RB(.085 * a, l * .8, .09 * a, .025), mF, [0, l * .5, 0]); Mx(L.up, RB(.1 * a, l * .42, .1 * a, .025), mS, [0, l * .36, 0]);
      L.el = grp(); Mx(L.el, new T.SphereGeometry(.052 * a, 14, 10), mJ);
      l = len(X(P0.el[i], .6), P0.ha[i]); L.fo = grp(); Mx(L.fo, taper(RB(.13 * a, l * .84, .136 * a, .035), .84, 1.05), mP, [0, l * .48, 0]); Mx(L.fo, new T.CylinderGeometry(.056 * a, .056 * a, .032, 16), caut(), [0, l * .88, 0]);
      const f = new T.Group(); f.position.y = l * .93; f.scale.setScalar(FI); L.fo.add(f); fist(f, mA, mJ);
      L.hp = grp(); Mx(L.hp, new T.SphereGeometry(.065 * k, 16, 12), mJ);
      l = len(X(P0.kn[i], .5), X(P0.hip[i], .6)); L.th = grp(); Mx(L.th, taper(RB(.12 * k, l * .84, .13 * k, .03), 1.14, .9), mS, [0, l * .52, 0]);
      L.kn = grp(); Mx(L.kn, new T.SphereGeometry(.056 * k, 14, 10), mJ); Mx(L.kn, RB(.095 * k, .11, .065, .028), mP, [0, .01, .075], [-.2, 0, 0]);
      l = len(X(P0.an[i], .4), X(P0.kn[i], .5)); L.sn = grp(); Mx(L.sn, taper(RB(.16 * k, l * .86, .18 * k, .045), 1.1, .8), mP, [0, l * .5, 0]); Mx(L.sn, RB(.15 * k * 1.02, .035, .17 * k, .012), caut(), [0, l * .25, 0]);
      L.an = grp(); Mx(L.an, new T.SphereGeometry(.045 * k, 12, 10), mJ); Mx(L.an, taper(RB(.14 * k, .08, .29, .028), .85, 1), mS, [0, -.048, .05], [0, side * .08, 0]); Mx(L.an, RB(.115 * k, .055, .07, .022), mA, [side * .004, -.055, .17], [0, side * .08, 0]);
      R.limbs.push(L); }
    // 入れ物ごとに素材でまとめる（肩の板ははずれて飛ぶので別）
    [pel, ch, hd].forEach(g => merge(g, [halo])); R.limbs.forEach(L => Object.values(L).forEach(g => merge(g, R.pads)));
    const put = (q, p) => q.position.set(p[0], p[1], p[2]), aim = (q, A, B) => { q.position.set(A[0], A[1], A[2]); q.quaternion.setFromUnitVectors(YV(), V(B[0] - A[0], B[1] - A[1], B[2] - A[2]).normalize()); }, add = (p, o) => [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
    R.set = P => { const b = P.body; pel.position.set(b[0], .82 + b[1], b[2]); pel.rotation.set(0, P.tw * .35, P.roll * .5); ch.position.set(b[0], 1.13 + b[1], b[2]); ch.rotation.set(P.lean, P.tw, P.roll);
      const h = add(P.head, b); hd.position.set(h[0], h[1] + HY, h[2]); hd.rotation.set(P.hr[0], P.hr[1], P.hr[2]);
      R.limbs.forEach((L, i) => { const Sh = add(X(P.sh[i], 1), b), El = add(X(P.el[i], .6), b), Ha = add(P.ha[i], b), Hp = add(X(P.hip[i], .6), b), Kn = X(P.kn[i], .5), An = X(P.an[i], .4);
        put(L.sh, Sh); aim(L.up, Sh, El); put(L.el, El); aim(L.fo, El, Ha); put(L.hp, Hp); aim(L.th, Kn, Hp); put(L.kn, Kn); aim(L.sn, An, Kn); put(L.an, An); }); };
    R.color = c => { mP.color.copy(C(c.main)); mA.color.copy(C(c.acc)); glowC.copy(C(c.glow)).multiplyScalar(3); halo.material.color.copy(C(c.glow)); R.light(R.lit); };
    R.light = v => { R.lit = v; eye.color.copy(glowC).multiplyScalar(Math.max(.02, v)); halo.material.opacity = Math.max(0, Math.min(1, v)); };
    R.reset = () => { R.pads.forEach((p, i) => { const s = i ? -1 : 1; p.position.set(s * .035 * a, .055, 0); p.rotation.set(0, 0, -s * .28); }); R.light(1); if (R.spring) R.spring.visible = false; };
    // KO のバネ（首から頭まで）
    const pts = []; for (let i = 0; i <= 90; i++) { const q = i / 90 * Math.PI * 2 * 6; pts.push(V(Math.cos(q) * .045, i / 90, Math.sin(q) * .045)); }
    R.spring = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 180, .0105, 6), chrome()); R.spring.visible = false; R.spring.castShadow = true; bod.add(R.spring);
    R.set(STANCE); return R;
  }
  // 自分の腕とこぶし（カメラの前に置く。i=0 が画面の右）
  const ARM_REST = [[.23, -.27, -.8], [-.22, -.25, -.86]];
  function fpArms() {
    const mP = paintU(RED.main), mA = paintU(RED.acc), mJ = frameM('#3a3c42'), rig = new T.Group(), arms = [];
    rig.color = c => { mP.color.copy(C(c.main)); mA.color.copy(C(c.acc)); };
    for (let i = 0; i < 2; i++) { const s = i ? -1 : 1, q = new T.Group(), l = .566; rig.add(q);
      Mx(q, taper(RB(.13 * AR, l * .84, .136 * AR, .035), .84, 1.05), mP, [0, l * .46, 0]); Mx(q, new T.CylinderGeometry(.056 * AR, .056 * AR, .032, 16), caut(), [0, l * .88, 0]);
      const f = new T.Group(); f.position.y = l * .93; f.scale.set(-s * FI, FI, FI); q.add(f); fist(f, mA, mJ); merge(q);
      q.traverse(o => { if (o.isMesh) o.castShadow = false; }); arms.push(q); }
    rig.arms = arms;
    rig.setHands = H => H.forEach((h, i) => { const s = i ? -1 : 1, e = [h[0] + s * .17, h[1] - .34, h[2] + .42], q = arms[i]; q.position.set(e[0], e[1], e[2]); q.quaternion.setFromUnitVectors(YV(), V(h[0] - e[0], h[1] - e[1], h[2] - e[2]).normalize()); });
    rig.setHands(ARM_REST); return rig;
  }
  // ---- リングと客席 ----
  function arena(sc) {
    const g = new T.Group(); sc.add(g); const S = 5, H = S / 2 - .05;
    const mat = plain('#8a92a0', .95); Mx(g, new T.BoxGeometry(S, .22, S), mat, [0, -.11, 0]).castShadow = false;
    Mx(g, new T.BoxGeometry(S + .08, .6, S + .08), plain('#1f2c4e'), [0, -.5, 0]).castShadow = false;
    const ring = new T.Mesh(new T.RingGeometry(1.22, 1.25, 64), plain('#c7ccd4')); ring.rotation.x = -Math.PI / 2; ring.position.y = .003; ring.receiveShadow = true; g.add(ring);
    const cir = new T.Mesh(new T.CircleGeometry(.9, 48), plain('#959dab')); cir.rotation.x = -Math.PI / 2; cir.position.y = .002; cir.receiveShadow = true; g.add(cir);
    const st = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .32 : .7; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); } st.closePath();
    const sm = new T.Mesh(new T.ShapeGeometry(st), plain('#d33a2a')); sm.rotation.x = -Math.PI / 2; sm.position.y = .005; sm.receiveShadow = true; g.add(sm);
    const cols = ['#d33a2a', '#f4efe6', '#2f62b8', '#f4efe6'];
    [[-H, -H], [H, -H], [H, H], [-H, H]].forEach(([x, z], i) => { Mx(g, new T.CylinderGeometry(.055, .065, 1.35, 12), plain('#c9cdd6', .3, .9), [x, .67, z]); Mx(g, RB(.2, .8, .2, .04), plain(cols[i]), [x, .72, z]); });
    [.38, .68, .98].forEach((y, j) => { const c = plain(['#f4efe6', '#d33a2a', '#f4efe6'][j], .6);
      [[[-H, -H], [H, -H]], [[H, -H], [H, H]], [[-H, -H], [-H, H]], [[-H, H], [H, H]]].forEach(([a, b]) => { const A = V(a[0], y, a[1]), B = V(b[0], y, b[1]), d = B.clone().sub(A), r = Mx(g, new T.CylinderGeometry(.03, .03, d.length(), 8), c); r.position.copy(A).lerp(B, .5); r.quaternion.setFromUnitVectors(YV(), d.normalize()); }); });
    merge(g);
    // 客席：暗い人影と、スマホの光
    const cr = new T.Group(); sc.add(cr); const pm = plain('#221c2c', 1), body = new T.CylinderGeometry(.19, .21, .5, 8), head = new T.SphereGeometry(.15, 10, 8), lightG = new T.PlaneGeometry(.06, .1), lm = basic('#ffffff', 1.4), lw = basic('#ffd9a0', 1.4);
    for (let row = 0; row < 5; row++) for (let i = 0; i < 34; i++) { const a = -1.2 + i / 33 * 2.4, r = 5 + row * 1.1, x = Math.sin(a) * r * 1.1 + (rnd() - .5) * .3, z = -Math.cos(a) * r, y = .2 + row * .55;
      const b = new T.Mesh(body, pm); b.position.set(x, y, z); cr.add(b); const hh = new T.Mesh(head, pm); hh.position.set(x, y + .4, z); cr.add(hh);
      if (rnd() < .08) { const l = new T.Mesh(lightG, rnd() < .5 ? lm : lw); l.position.set(x + .1, y + .45, z + .22); l.lookAt(0, 1, 3); cr.add(l); } }
    cr.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = false; }); merge(cr);
    return [g, cr];
  }
  // 映りこみ用の小さな部屋（RoomEnvironment の代わり）
  function envMap(R) { const es = new T.Scene(); es.add(new T.Mesh(new T.BoxGeometry(12, 7, 12), new T.MeshBasicMaterial({ color: C('#2a2630'), side: T.BackSide })));
    [[0, 3.3, 0, -Math.PI / 2, 0, 6, 3, '#ffffff'], [-5.9, 1.5, 0, 0, Math.PI / 2, 4, 2, '#ffd6b0'], [5.9, 1.5, 0, 0, -Math.PI / 2, 4, 2, '#b8d0ff'], [0, 1.5, -5.9, 0, 0, 5, 2, '#ffffff']].forEach(([x, y, z, rx, ry, w, h, c]) => { const p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: C(c).multiplyScalar(3), side: T.DoubleSide })); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); es.add(p); });
    const pm = new T.PMREMGenerator(R), t = pm.fromScene(es, .04).texture; pm.dispose(); return t; }

  // ---- 舞台：描く・動かす ----
  function Stage() {
    init(); sd = 7; M = {};
    let pr = Math.min(window.devicePixelRatio || 1, 1.5); try { if (localStorage.getItem('atsumaru.bxq') === '1') pr = 1; } catch (e) { }
    const R = new T.WebGLRenderer({ antialias: true }); R.setPixelRatio(pr); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; R.shadowMap.autoUpdate = false;
    const el = R.domElement; el.className = 'bx-cv';
    const sc = new T.Scene(); sc.background = C('#120e18'); sc.fog = new T.Fog(C('#120e18'), 9, 18); sc.environment = envMap(R);
    const AR = arena(sc);
    const key = new T.SpotLight(C('#ffe8cc'), 1.5, 0, .55, .55, 1); key.position.set(-.6, 6.5, 1.6); key.target.position.set(0, .8, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .02; sc.add(key, key.target);
    const r1 = new T.SpotLight(C('#ff7a5a'), .7, 0, .6, .6, 1); r1.position.set(-4, 3, -3); r1.target.position.set(0, 1, 0); sc.add(r1, r1.target);
    const r2 = new T.SpotLight(C('#6aa0ff'), .8, 0, .6, .6, 1); r2.position.set(4, 3, -3); r2.target.position.set(0, 1, 0); sc.add(r2, r2.target);
    const fill = new T.DirectionalLight(C('#ffffff'), .35); fill.position.set(.5, 2, 4); sc.add(fill); const hemi = new T.HemisphereLight(C('#c8d0ff'), C('#2a1e1a'), .35); sc.add(hemi);
    const A = liveRobot(RED), B = liveRobot(BLUE); sc.add(A.root, B.root);
    const cam = new T.PerspectiveCamera(56, .5625, .04, 60), rig = fpArms(); sc.add(rig);
    // 光る星（当たった・ガード）
    const burst = (() => { const s = new T.Shape(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? .07 : .17; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return new T.ShapeGeometry(s); })();
    const fx = [0, 1].map(() => { const m = new T.Mesh(burst, new T.MeshBasicMaterial({ color: C('#ffe27a').multiplyScalar(1.6), transparent: true, depthTest: false })); m.renderOrder = 5; m.visible = false; sc.add(m); return m; });
    const sparks = Array.from({ length: 12 }, () => { const m = new T.Mesh(new T.SphereGeometry(.012, 6, 4), basic('#ffcf6a', 2)); m.visible = false; sc.add(m); return { m, v: V((rnd() - .5) * 1.6, 1 + rnd() * 1.4, (rnd() - .2) * 1.2) }; });
    const S = { mode: '', w: 1, h: 1, anim: null, t0: 0, raf: 0, last: 0, shake: 0, alive: true, onEvent: null, slow: 0, frames: [] };
    // どちらの機体を「相手」として正面に置くか。fp：B（青）が相手、自分は腕だけ。side：A（赤）と B（青）が向かいあう
    const CAMS = { fp: { pos: [0, 1.45, 2.15], look: [0, 1.02, 0], hf: 34 }, side: { pos: [.2, 1.55, 4.7], look: [0, .92, 0], hf: 46 }, champ: { pos: [.15, .42, 2.5], look: [0, 1.38, 0], hf: 33 } };
    // 優勝：腰のベルトと、舞う紙吹雪（1回で描けるようにまとめた板）
    const belt = (() => { const g = new T.Group(), gold = new T.MeshStandardMaterial({ color: C('#d9a92f'), metalness: 1, roughness: .38, envMapIntensity: .9 }), lea = plain('#2a2424', .55);
      Mx(g, RB(.66, .075, .014, .006), lea); const oct = new T.Shape(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8, r = .13; i ? oct.lineTo(Math.cos(a) * r, Math.sin(a) * r * .82) : oct.moveTo(Math.cos(a) * r, Math.sin(a) * r * .82); } oct.closePath();
      Mx(g, new T.ExtrudeGeometry(oct, { depth: .012, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2 }), gold, [0, 0, .006]);
      const st = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .028 : .065; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); } st.closePath();
      Mx(g, new T.ExtrudeGeometry(st, { depth: .006, bevelEnabled: false }), plain('#ff5a36', .3, .2), [0, 0, .028]); for (const x of [-.22, .22]) Mx(g, RB(.07, .06, .01, .004), gold, [x, 0, .01]);
      merge(g); g.scale.setScalar(.95); g.position.set(0, 0, .13); g.visible = false; B.pel.add(g); return g; })();
    const CONF = 150, conf = new T.InstancedMesh(new T.PlaneGeometry(.026, .042), new T.MeshBasicMaterial({ side: T.DoubleSide }), CONF), cfx = [], q4 = new T.Matrix4(), qq = new T.Quaternion(), ee = new T.Euler(), one = V(1, 1, 1);
    for (let i = 0; i < CONF; i++) { cfx.push({ p: V((rnd() - .5) * 2.2, rnd() * 2.3, (rnd() - .5) * 1.6), r: V(rnd() * 6, rnd() * 6, rnd() * 6), w: V(rnd() * 4, rnd() * 4, rnd() * 4), v: .25 + rnd() * .3 }); conf.setColorAt(i, C(['#ff5a36', '#ffd23a', '#3d74e0', '#3cbf6a', '#ffffff'][i % 5]).multiplyScalar(1.3)); }
    conf.visible = false; conf.frustumCulled = false; sc.add(conf);
    function stepConf(dt) { cfx.forEach((c, i) => { c.p.y -= c.v * dt; c.p.x += Math.sin(c.r.y) * .05 * dt; if (c.p.y < 0) c.p.y += 2.3; c.r.addScaledVector(c.w, dt); qq.setFromEuler(ee.set(c.r.x, c.r.y, c.r.z)); q4.compose(c.p, qq, one); conf.setMatrixAt(i, q4); }); conf.instanceMatrix.needsUpdate = true; }
    function setMode(m) {
      if (S.mode === m) return; S.mode = m; S.anim = null; A.reset(); B.reset(); A.set(STANCE); B.set(STANCE); fx.forEach(f => f.visible = false);
      belt.visible = conf.visible = m === 'champ';
      if (m === 'champ') { A.root.visible = false; B.root.position.set(0, 0, 0); B.root.rotation.set(0, 0, 0); rig.visible = false; B.set(WIN); stepConf(0); }
      else if (m === 'fp') { A.root.visible = false; B.root.position.set(0, 0, 0); B.root.rotation.set(0, 0, 0); rig.visible = true; }
      else { A.root.visible = true; A.root.position.set(-.55, 0, .1); A.root.rotation.set(0, .95, 0); B.root.position.set(.58, 0, -.02); B.root.rotation.set(0, -.62, 0); rig.visible = false; }
      A.home = { p: A.root.position.clone(), q: A.root.quaternion.clone() }; B.home = { p: B.root.position.clone(), q: B.root.quaternion.clone() };
      placeCam(); R.shadowMap.needsUpdate = true; draw();
    }
    function placeCam(shk = 0, roll = 0, drop = 0) { const c = S.camO || CAMS[S.mode] || CAMS.fp, asp = S.w / S.h; cam.aspect = asp; cam.fov = 2 * Math.atan(Math.tan(c.hf / 2 * Math.PI / 180) / asp) * 180 / Math.PI; cam.updateProjectionMatrix();
      cam.position.set(c.pos[0] + (rnd() - .5) * shk, c.pos[1] + (rnd() - .5) * shk - drop, c.pos[2]); cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(c.look[0], c.look[1] + drop * .35, c.look[2]);
      // 始まりの動きで2台とも映るときは、2台のまん中が画面の横のまん中に来るように向きを合わせる（片方のアップ solo はそのまま）
      if (S.camO && !c.solo && A.root.visible) { const look = V(...c.look), hw = Math.tan(c.hf / 2 * Math.PI / 180);
        for (let i = 0; i < 3; i++) { cam.updateMatrixWorld(); const pts = [A, B].map(Rb => Rb.root.position.clone().add(V(0, 1.0, 0)).project(cam));
          if (pts.some(p => p.z > 1 || Math.abs(p.x) > 1.6 || Math.abs(p.y) > 1.3)) break;
          const m = (pts[0].x + pts[1].x) / 2; if (Math.abs(m) < .005) break; look.addScaledVector(V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), m * hw * cam.position.distanceTo(look)); cam.lookAt(look); } }
      rig.position.copy(cam.position); rig.quaternion.copy(cam.quaternion); }
    function resize() { if (S.paused && el.isConnected) { S.paused = false; stop(); schedule(0); } const p = el.parentNode; if (!p) return; const w = Math.max(1, p.clientWidth), h = Math.max(1, p.clientHeight); if (w === S.w && h === S.h) return; S.w = w; S.h = h; R.setSize(w, h, false); el.style.width = w + 'px'; el.style.height = h + 'px'; placeCam(); draw(); }
    function draw() { R.render(sc, cam); }
    // 世界の点 → カメラから見た位置（腕の行き先に使う）
    const toCam = p => { rig.updateMatrixWorld(true); return rig.worldToLocal(V(...p)).toArray(); };
    const star = (i, p, col, t) => { const f = fx[i]; f.visible = t >= 0 && t < .45; if (!f.visible) return; f.material.color.copy(C(col)).multiplyScalar(1.6); f.material.opacity = 1 - t / .45; f.position.set(...p); f.lookAt(cam.position); f.scale.setScalar(.6 + t * 2.2); };
    // ---- 1ラウンドの動き（自分の目から）。mine/opp：{atk,grd}、hit：[自分の当たり, 相手の当たり]
    function fpRound(ev) { const T0 = .15, T1 = 1.15;
      const tgt = { left: [.2, 1.36, .32], right: [-.2, 1.36, .32], body: [0, 1.0, .36] }[ev.mine.atk], mi = tgt[0] < 0 ? 1 : 0;
      const myTo = toCam(tgt), myBack = ARM_REST[mi].map((v, k) => v + [0, -.04, .08][k]), stop = ev.hit[0] ? myTo : myTo.map((v, k) => v + [0, 0, .12][k]);
      const og = GRD[ev.opp.grd], oHit = mk(HIT), oBlock = mk(og, { lean: og.lean - .12, body: [0, 0, -.03] });
      const otx = { right: .17, left: -.17, body: 0 }[ev.opp.atk], oPunch = punchPose(otx, ev.opp.atk === 'body' ? 1.02 : 1.32, .82);
      const myG = { right: [[.11, -.05, -.5], ARM_REST[1]], left: [ARM_REST[0], [-.11, -.05, -.5]], body: [[.1, -.36, -.55], [-.1, -.34, -.56]] }[ev.mine.grd];
      return { dur: 2.2, step: t => {
        // 相手の構え
        B.set(track([[0, STANCE], [T0, og, 'o'], [T0 + .22, og], [T0 + .3, ev.hit[0] ? oHit : oBlock, 'o'], [T0 + .7, og, 'io'], [T1, STANCE, 'io'], [T1 + .2, oPunch, 'i'], [T1 + .45, oPunch], [T1 + .8, STANCE, 'io']], t));
        // 自分の腕
        const H0 = ARM_REST.map(a => a.slice()), Hmy = H0.map(a => a.slice()); Hmy[mi] = myBack; const Hp = H0.map(a => a.slice()); Hp[mi] = stop;
        const pick = track([[0, H0], [T0, Hmy, 'o'], [T0 + .2, Hp, 'i'], [T0 + .45, Hp], [T0 + .75, H0, 'io'], [T1, H0], [T1 + .18, myG, 'o'], [T1 + .6, myG], [T1 + .95, H0, 'io']], t); rig.setHands(pick);
        star(0, tgt, ev.hit[0] ? '#ffe27a' : '#9fd0ff', t - (T0 + .2)); const me = toWorld(myG[ev.mine.grd === 'left' ? 1 : 0]);
        star(1, ev.hit[1] ? [otx * .6, 1.3, 1.25] : me, ev.hit[1] ? '#ff6a4a' : '#9fd0ff', ev.hit[1] ? -1 : t - (T1 + .2));
        S.shake = (ev.hit[0] && t > T0 + .2 && t < T0 + .38 ? .02 : 0) + (ev.hit[1] && t > T1 + .2 && t < T1 + .5 ? .07 : 0);
        if (ev.hit[1] && S.onEvent && !S.hurt && t > T1 + .2) { S.hurt = 1; S.onEvent('hurt'); }
        if (ev.hit[0] && S.onEvent && !S.zap && t > T0 + .2) { S.zap = 1; S.onEvent('hit'); }
      } }; }
    const toWorld = p => { rig.updateMatrixWorld(true); return rig.localToWorld(V(...p)).toArray(); };
    // 観戦：赤が打ってから青が打つ
    function sideRound(ev) { const T0 = .15, T1 = 1.15, [p0, p1] = ev.picks;
      const pp = (atk) => punchPose({ right: -.17, left: .17, body: 0 }[atk], atk === 'body' ? 1.0 : 1.3, .66);
      return { dur: 2.2, step: t => {
        A.set(track([[0, STANCE], [T0, STANCE], [T0 + .2, pp(p0.atk), 'i'], [T0 + .45, pp(p0.atk)], [T0 + .75, STANCE, 'io'], [T1, GRD[p0.grd], 'o'], [T1 + .25, GRD[p0.grd]], [T1 + .3, ev.hit[1] ? HIT : GRD[p0.grd], 'o'], [T1 + .75, STANCE, 'io']], t));
        B.set(track([[0, STANCE], [T0, GRD[p1.grd], 'o'], [T0 + .25, GRD[p1.grd]], [T0 + .3, ev.hit[0] ? HIT : GRD[p1.grd], 'o'], [T0 + .75, STANCE, 'io'], [T1, STANCE], [T1 + .2, pp(p1.atk), 'i'], [T1 + .45, pp(p1.atk)], [T1 + .8, STANCE, 'io']], t));
        const mid = [.02, 1.32, .06]; star(0, mid, ev.hit[0] ? '#ffe27a' : '#9fd0ff', t - (T0 + .2)); star(1, mid, ev.hit[1] ? '#ffe27a' : '#9fd0ff', t - (T1 + .2));
        S.shake = (ev.hit[0] && t > T0 + .2 && t < T0 + .35) || (ev.hit[1] && t > T1 + .2 && t < T1 + .35) ? .025 : 0;
      } }; }
    // KO：バネで頭が飛び出す（頭はつながったまま）。肩の板がはずれて落ち、ひざをついてうなだれる
    function koAnim(Rb, ev) { const pads = Rb.pads.map(p => ({ m: p, o: p.position.clone(), r: p.rotation.clone() }));
      return { dur: 3.6, step: t => {
        Rb.set(track([[0, STANCE], [.16, HIT, 'o'], [.55, HIT], [1.2, KNEEL, 'i'], [2.0, SLUMP, 'io']], t));
        const u0 = t - .28, up = u0 < 0 ? 0 : Math.max(0, .34 + Math.sin(u0 * 16) * .22 * Math.exp(-u0 * 2.2));
        Rb.spring.visible = u0 > 0; Rb.spring.scale.set(1, up + .07, 1); Rb.spring.position.copy(Rb.head.position).add(V(0, -.14, 0)); Rb.head.position.y += up; if (u0 > 0) Rb.head.rotation.z += Math.sin(u0 * 9) * .35 * Math.exp(-u0 * 1.5);
        pads.forEach((p, i) => { const s = i ? -1 : 1, u = Math.max(0, t - .3); if (!u) { p.m.position.copy(p.o); p.m.rotation.copy(p.r); return; } const y = Math.max(-1.4, 1.3 * u - 4.9 * u * u); p.m.position.set(p.o.x + s * .5 * Math.min(u, .62), p.o.y + y, p.o.z + .25 * Math.min(u, .62)); p.m.rotation.set(p.r.x + u * 5 * s, p.r.y, p.r.z + u * 7 * s); });
        const hw = Rb.head.getWorldPosition(V(0, 0, 0)); sparks.forEach(s => { s.m.visible = u0 > 0 && u0 < .7; if (s.m.visible) { s.m.position.set(hw.x + s.v.x * u0, hw.y - .12 + s.v.y * u0 - 4.9 * u0 * u0, hw.z + s.v.z * u0); s.m.scale.setScalar(1 - u0 / .7); } });
        Rb.light(t < .3 ? 1 : (Math.sin(t * 25) > .3 ? .8 : .15) * (t < 2.6 ? 1 : Math.max(0, 1 - (t - 2.6) / .4)));
        if (ev && ev.winner) ev.winner.set(track([[0, STANCE], [1.2, STANCE], [1.7, WIN, 'o']], t));
      } }; }
    // 自分が KO されたとき：カメラがかたむいて床へ
    // 判定・サドンデスで負けたとき：バネなしで、ひざから崩れてうなだれる。最後に目の光が消える
    function downAnim(Rb, ev) { return { dur: 3.0, step: t => {
      Rb.set(track([[0, STANCE], [.2, STANCE], [.9, KNEEL, 'i'], [1.1, mk(KNEEL, { body: [0, -.33, .08] }), 'o'], [1.3, KNEEL, 'io'], [2.2, SLUMP, 'io']], t));
      Rb.light(t < 1.4 ? 1 : t < 2.1 ? (Math.sin(t * 40) > 0 ? .6 : 0) * (1 - (t - 1.4) / .7) : 0);
      if (ev && ev.winner) ev.winner.set(track([[0, STANCE], [1.0, STANCE], [1.5, WIN, 'o']], t));
    } }; }
    // トーナメントの始まり（案は bx-intro の10「着地＋紹介」）：暗いリングにスポットライト → A がドスンと着地して紹介 → B も → 全部の光がついて試合の画面へ。
    // 2台は向かいあって立ち、リング（星）を2台のまん中にずらしておく。自分の目（fp）なら最後に A の肩ごしから目へ切りかえる。
    // label(k)：0＝A の札、1＝B の札、-1＝消す（札は画面の側で出す）
    let dust = null;
    function introAnim(o) {
      if (!dust) dust = Array.from({ length: 22 }, (_, i) => { const m = new T.Mesh(new T.SphereGeometry(.05, 8, 6), new T.MeshStandardMaterial({ color: C('#b8bcc6'), roughness: 1, transparent: true })); m.visible = false; sc.add(m); return { m, a: i / 22 * Math.PI * 2, v: .8 + (i % 5) * .25 }; });
      const fp = !!o.fp, al = .55, bl = 2.85, AZ = 1.35, MID = AZ / 2, env = sc.environment; let lb = -2;
      const ck = (pos, look, hf, solo) => ({ pos, look, hf, solo }), SIDE = ck([3.1, 1.35, MID], [0, 1.1, MID], 44);
      const camK = fp ? [[5.0, SIDE], [5.75, ck([.4, 1.62, 2.6], [0, 1.15, 0], 38), 'io'], [6.05, { ...CAMS.fp, solo: 0 }, 'io']] : [[5.0, SIDE], [5.5, ck([3.0, 1.4, MID], [0, 1.05, MID], 46), 'io']];
      const drop = t0 => t => { const u = Math.min(1, Math.max(0, (t - t0) / .45)); return u >= 1 ? 0 : 6 * (1 - u * u); };
      const land = t0 => t => track([[0, mk(STANCE, { body: [0, .05, 0] })], [t0 + .45, mk(STANCE, { body: [0, .05, 0] })], [t0 + .55, KNEEL, 'o'], [t0 + .95, KNEEL], [t0 + 1.3, STANCE, 'io'], [t0 + 1.55, WIN, 'o'], [t0 + 1.95, WIN], [t0 + 2.25, STANCE, 'io']], t);
      const dA = drop(al), dB = drop(bl), lA = land(al), lB = land(bl);
      const lights = (k, amb) => { key.intensity = k; r1.intensity = r2.intensity = 0; fill.intensity = .35 * amb; hemi.intensity = .35 * amb; };
      A.root.visible = true; rig.visible = false;
      const fin = () => { S.camO = null; S.shake = 0; AR.forEach(g => g.position.z = 0); key.position.set(-.6, 6.5, 1.6); key.target.position.set(0, .8, 0); key.intensity = 1.5; r1.intensity = .7; r2.intensity = .8; fill.intensity = .35; hemi.intensity = .35; sc.environment = env;
        dust.forEach(d => d.m.visible = false); A.reset(); B.reset(); if (o.label) o.label(-1); const m = S.mode; S.mode = ''; setMode(m); };
      return { dur: fp ? 6.4 : 5.6, fin, step: t => {
        const ph = t < 2.7 ? 0 : t < 5.0 ? 1 : 2, cut = fp && t > 5.9;
        AR.forEach(g => g.position.z = cut ? 0 : MID);
        if (ph < 2) { const tz = ph === 0 ? AZ : 0, f = ph === 0 ? -1 : 1, on = ph === 1 || t > .25; key.position.set(f * -.9, 5.6, tz + f * 1.6); key.target.position.set(0, .9, tz); lights(on ? 2.0 : 0, on ? .55 : .03); sc.environment = null; }
        else { key.position.set(-.6, 6.5, 1.6); key.target.position.set(0, .8, 0); key.intensity = 1.5; r1.intensity = .7; r2.intensity = .8; fill.intensity = .35; hemi.intensity = .35; sc.environment = env; }
        A.root.position.set(0, dA(t), AZ); A.root.rotation.set(0, Math.PI, 0); B.root.position.set(0, dB(t), 0); B.root.rotation.set(0, 0, 0); A.set(lA(t)); B.set(lB(t));
        A.root.visible = !cut; rig.visible = cut; if (cut) rig.setHands(ARM_REST);
        dust.forEach((d, i) => { const u = t - ((i % 2 ? al : bl) + .45), z = i % 2 ? AZ : 0; d.m.visible = u > 0 && u < 1.1; if (!d.m.visible) return; const r = .3 + u * d.v; d.m.position.set(Math.cos(d.a) * r, .05 + u * .25, z + Math.sin(d.a) * r); d.m.scale.setScalar(1 + u * 1.5); d.m.material.opacity = .7 * (1 - u / 1.1); });
        const k = t > al + 1.0 && t < 2.65 ? 0 : t > bl + 1.0 && t < 4.95 ? 1 : -1; if (k !== lb) { lb = k; if (o.label) o.label(k); }
        S.shake = (t > al + .45 && t < al + .7) || (t > bl + .45 && t < bl + .7) ? .08 : 0;
        S.camO = ph === 0 ? ck([1.15, 1.15, -.35], [0, 1.15, AZ], 48, 1) : ph === 1 ? ck([-1.15, 1.15, 1.7], [0, 1.15, 0], 48, 1) : cut ? CAMS.fp : track(camK, t);
      } }; }
    function fallAnim() { return { dur: 2.4, step: t => { const u = E.o(Math.min(1, Math.max(0, (t - .2) / 1.1))); S.roll = u * .55; S.drop = u * 1.05; B.set(track([[0, STANCE], [.5, STANCE], [1.2, WIN, 'o']], t)); } }; }
    function frame(now) {
      S.raf = 0; if (!S.alive) return; if (!el.isConnected) { S.paused = true; return; }
      let moving = false;
      // 動きの途中でまちがいがあっても止まらないように、その動きは終わりにして先へ進める
      if (S.anim) { const t = (now - S.t0) / 1000; let bad = false; try { S.anim.step(Math.min(t, S.anim.dur)); } catch (e) { console.warn(e); bad = true; } moving = true; if (bad || t >= S.anim.dur) { const done = S.anim.done; S.anim = null; done && done(); } }
      if (S.mode === 'champ') { stepConf(Math.min(.05, (now - (S.last || now)) / 1000)); moving = moving || 'champ'; }
      else if (!S.hold && !S.anim) { const b = Math.sin(now / 600) * .006; B.bod.position.y = b; A.bod.position.y = -b; if (S.mode === 'fp') rig.setHands(ARM_REST.map((h, i) => [h[0], h[1] + Math.sin(now / 520 + i * 1.7) * .008, h[2]])); }
      placeCam(S.shake, S.roll || 0, S.drop || 0);
      if (moving === true) R.shadowMap.needsUpdate = true; // 紙吹雪だけのときは影を描き直さない
      const t0 = performance.now(); draw(); const dt = performance.now() - t0;
      // 重い端末はこまかさを下げる（動きのあいだ、続けて重いとき）
      if (moving) { S.frames.push(now - (S.last || now)); if (S.frames.length >= 30) { const avg = S.frames.reduce((a, b) => a + b, 0) / S.frames.length; S.frames = []; if (avg > 40 && pr > 1) { if (++S.slow >= 2) { pr = 1; R.setPixelRatio(1); S.w = 0; resize(); try { localStorage.setItem('atsumaru.bxq', '1'); } catch (e) { } } } else S.slow = 0; } }
      S.last = now; schedule(moving ? 0 : 50); void dt;
    }
    // 次のコマ。描き直しの合図（requestAnimationFrame）が来ないときも、少し待って自分で進める（動きの途中で止まらないように）
    function schedule(ms) { if (S.raf || S.bk || !S.alive) return; const go = () => { S.raf = requestAnimationFrame(t => { clearTimeout(S.bk); S.bk = 0; frame(t); }); S.bk = setTimeout(() => { S.bk = 0; if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; frame(performance.now()); } }, 150); };
      if (ms) S.raf = setTimeout(() => { S.raf = 0; go(); }, ms); else go(); }
    const stop = () => { if (S.raf) { cancelAnimationFrame(S.raf); clearTimeout(S.raf); S.raf = 0; } if (S.bk) { clearTimeout(S.bk); S.bk = 0; } };
    function run(a) { return new Promise(ok => { S.hurt = S.zap = 0; S.anim = { ...a, done: ok }; S.t0 = performance.now(); stop(); schedule(0); }); }
    schedule(0);
    return {
      el, setMode, resize,
      // 色：fp は a＝自分（腕）・b＝相手、side は a＝赤の席・b＝青の席、champ は b＝優勝した人
      setColors: (a, b) => { if (a) { A.color(a); rig.color(a); } if (b) B.color(b); schedule(0); },
      round: ev => run(S.mode === 'fp' ? fpRound(ev) : sideRound(ev)),
      // who：倒れる側。fp では 'op'（相手）か 'me'（自分）、side では 0（赤）か 1（青）
      ko: who => { if (S.mode === 'fp') return who === 'me' ? run(fallAnim()) : run(koAnim(B)); const L = who === 0 ? A : B, Wn = who === 0 ? B : A; return run(koAnim(L, { winner: Wn })); },
      down: who => { if (S.mode === 'fp') return who === 'me' ? run(fallAnim()) : run(downAnim(B)); const L = who === 0 ? A : B, Wn = who === 0 ? B : A; return run(downAnim(L, { winner: Wn })); },
      hold: v => { S.hold = v; },
      // トーナメントの始まりの動き。o：{ fp: 自分の目で終わるか, label(k) }。skip() で最後まで飛ばす
      intro: o => { const a = introAnim(o); return run(a).then(a.fin); },
      skip: () => { if (S.anim) S.t0 = -1e9; schedule(0); },
      reset: () => { S.anim = null; S.roll = S.drop = 0; A.reset(); B.reset(); A.set(STANCE); B.set(STANCE); fx.forEach(f => f.visible = false); sparks.forEach(s => s.m.visible = false); rig.setHands(ARM_REST); R.shadowMap.needsUpdate = true; schedule(0); },
      set onEvent(f) { S.onEvent = f; },
      busy: () => !!S.anim,
      dispose: () => { S.alive = false; stop(); R.dispose(); R.forceContextLoss && R.forceContextLoss(); el.remove(); },
    };
  }
  return { load: () => TB.load().then(() => { init(); TB.parts(); }), stage: () => Stage(), COLS };
})();
