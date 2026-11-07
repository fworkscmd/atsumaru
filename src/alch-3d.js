/* 月夜の錬金市場の絵（AL3）。ボクセルの場面・人・持ちものを three.js で1回だけ描いて画像にする。ゲーム中は画像を見せるだけなので軽い */
const AL3 = (() => {
  let ready = null, A = null, T = null, R = null;
  const W = 375, H = 667;
  const CAST = [{ robe: '#3f6fb5', skin: '#f0c29c', hat: '#2c4f8a' }, { robe: '#e4a23a', skin: '#c99a6a', ears: 1, belt: '#fff' }, { robe: '#b0533c', skin: '#6fb86a', frog: 1, mouth: '#2c6a3c' }, { robe: '#7a5cc4', skin: '#f0c29c', beard: '#eee7da', hat: '#4f3a8f', band: '#f08fb0' }];
  const SPOT = { fire: [-5.4, -7.4], water: [0, -9.2], heal: [5.4, -7.4], sleep: [-5.4, 3.2], morph: [0, 5], gold: [5.4, 3.2] };
  const PC = { fire: '#e8542f', water: '#3f8fd6', heal: '#f08fb0', sleep: '#7a5cc4', morph: '#2fa37a', gold: '#e7b52c' };
  const mats = {};
  const M = (c, e, i) => { const k = c + (e || '') + (i || ''); return mats[k] || (mats[k] = new T.MeshStandardMaterial({ color: c, roughness: .8, emissive: e || '#000', emissiveIntensity: e ? (i || .22) : 0 })); };
  function B(g, x, y, z, w, h, d, c, e, i) { const u = .1, o = new T.Mesh(new T.BoxGeometry(w * u, h * u, d * u), M(c, e, i)); o.position.set((x + w / 2) * u, (y + h / 2) * u, (z + d / 2) * u); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
  const at = (p, x, y, z, ry = 0, rz = 0) => { const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.rotation.z = rz; p.add(g); return g; };
  function person(g, o) {
    const { robe, skin, hat } = o;
    B(g, -3, 0, -2, 2, 2, 3, '#3a2a22'); B(g, 1, 0, -2, 2, 2, 3, '#3a2a22'); B(g, -4, 2, -3, 8, 6, 6, robe); B(g, -4, 4, 3, 8, 1, 1, o.belt || '#ffd54a');
    (o.up ? [[-7, 7, 2, 5], [5, 7, 2, 5]] : [[-6, 3, 2, 4], [4, 3, 2, 4]]).forEach(([x, y, w, h]) => { B(g, x, y, -1, w, h, 2, robe); B(g, x, y + h, -1, w, 1.5, 2, skin); });
    B(g, -5, 8, -4, 10, 8, 8, skin);
    B(g, -4, 11, 4, 3, 3, .6, '#fff'); B(g, 1, 11, 4, 3, 3, .6, '#fff'); B(g, -3, 11, 4.3, 2, 2.4, .6, '#1c1a18'); B(g, 2, 11, 4.3, 2, 2.4, .6, '#1c1a18'); B(g, -3, 12.6, 4.7, .8, .8, .4, '#fff'); B(g, 2, 12.6, 4.7, .8, .8, .4, '#fff');
    B(g, -1.5, 9, 4, 3, 1, .6, o.mouth || '#a8483a');
    if (o.beard) { B(g, -5, 7, 3, 10, 3, 2.2, o.beard); B(g, -3, 5, 3.6, 6, 2, 1.2, o.beard); }
    if (o.ears) { B(g, -5, 16, -1, 3, 4, 2, skin); B(g, 2, 16, -1, 3, 4, 2, skin); B(g, -4.4, 16.4, .8, 1.8, 2.4, .4, '#f2a0a8'); B(g, 2.6, 16.4, .8, 1.8, 2.4, .4, '#f2a0a8'); }
    if (o.frog) { B(g, -5, 15, 1, 4, 4, 3, skin); B(g, 1, 15, 1, 4, 4, 3, skin); B(g, -4, 16, 3.7, 2, 2, .7, '#1c1a18'); B(g, 2, 16, 3.7, 2, 2, .7, '#1c1a18'); }
    if (hat) { B(g, -7, 16, -6, 14, 1, 12, hat); B(g, -5, 17, -4, 10, 3, 8, hat); B(g, -4, 20, -3, 8, 2, 6, hat); B(g, -3, 22, -2, 6, 2, 4, hat); B(g, -2, 24, -1, 4, 2, 2, hat); B(g, -5, 17, 3.6, 10, 1, .8, o.band || '#ffd54a'); }
  }
  function bottle(g, x, y, z, c, glow) { B(g, x - 2, y, z - 2, 6, 4, 6, c, c, glow ? 1 : .2); B(g, x - 1, y + 4, z - 1, 4, 1, 4, c, c, glow ? 1 : .2); B(g, x, y + 5, z, 2, 3, 2, '#e8eef0'); B(g, x, y + 8, z, 2, 1.4, 2, '#a9743f'); }
  function stall(g, c, night) {
    B(g, -13, 0, -5, 26, 8, 10, '#9c6a3e'); B(g, -14, 8, -6, 28, 1, 12, '#c49058'); [-13, 11].forEach(x => [-5, 3].forEach(z => B(g, x, 9, z, 2, 12, 2, '#6b4526')));
    for (let i = 0; i < 7; i++) { B(g, -14 + i * 4, 21, -7, 4, 2, 15, i % 2 ? '#f4efe6' : c); B(g, -14 + i * 4, 19, 6, 4, 2, 2, i % 2 ? '#f4efe6' : c); }
    [-9, -1, 7].forEach(x => bottle(g, x, 9, -1, c, night));
    if (night) { B(g, -1, 17, 3, 2, 2, 2, '#ffcf7a', '#ffb040', 2.4); const l = new T.PointLight('#ffb060', 1.5, 7, 1.5); l.position.set(0, 1.6, .8); g.add(l); }
  }
  function tile(p, x, z, s = 4) { const g = at(p, x, 0, z), a = new T.Mesh(new T.BoxGeometry(s, .35, s), M('#c98c4e')); a.position.y = .175; a.castShadow = a.receiveShadow = true; g.add(a); const b = new T.Mesh(new T.BoxGeometry(s - .3, .04, s - .3), M('#e0a768')); b.position.y = .37; b.receiveShadow = true; g.add(b); return g; }
  function arrows(p, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), n = Math.floor((L - 4.8) / .62), ry = Math.atan2(dx, dz); for (let i = 0; i < n; i++) { const t = (2.6 + i * .62) / L, g = at(p, a[0] + dx * t, .03, a[1] + dz * t, ry); [-1, 1].forEach(s => { const m = new T.Mesh(new T.BoxGeometry(.13, .05, .36), M('#ff9a3c')); m.position.set(s * .12, .02, 0); m.rotation.y = s * .75; m.castShadow = true; g.add(m); }); } }
  function tree(p, x, z) { const g = at(p, x, 0, z); B(g, -1, 0, -1, 2, 6, 2, '#6b4526'); B(g, -5, 6, -5, 10, 5, 10, '#3f9a5e'); B(g, -4, 11, -4, 8, 3, 8, '#4fae6c'); B(g, -2, 14, -2, 4, 2, 4, '#62c07e'); }
  function pot(g, c, i) { [[0, 16], [3, 18], [8, 18], [12, 14]].forEach(([y, s], k) => B(g, -s / 2, y, -s / 2, s, k === 0 ? 3 : k === 3 ? 1 : 5, s, '#26222c')); B(g, -9, 13, -9, 18, 1, 18, '#26222c'); B(g, -7, 13.4, -7, 14, 1, 14, c, c, i || .3); [[-4, 1, 3], [3, -2, 2.4], [0, 4, 2], [-2, -3, 1.6], [5, 3, 1.6]].forEach(([x, z, s], k) => B(g, x, 15 + k * 2.4, z, s, s, s, '#d6ffe2', c)); [[-6, 10], [3, 10]].forEach(([x, z]) => B(g, x, 0, z, 3, 3, 3, '#ff8a3c', '#ff5a1c', 1)); }
  function floor(S, night) { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.fillStyle = night ? '#2a3350' : '#55625f'; c.fillRect(0, 0, 256, 256); c.fillStyle = night ? '#242c48' : '#4b5855'; c.fillRect(0, 0, 128, 128); c.fillRect(128, 128, 128, 128); const tx = new T.CanvasTexture(cv); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(30, 30); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4; const f = new T.Mesh(new T.PlaneGeometry(90, 90), new T.MeshStandardMaterial({ map: tx, roughness: 1 })); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; S.add(f); }
  function town(night) {
    const S = new T.Scene(), O = [0, -2]; floor(S, night);
    Object.keys(SPOT).forEach(k => { const [x, z] = SPOT[k]; arrows(S, O, [x, z]); stall(at(tile(S, x, z), 0, .39, 0), PC[k], night); });
    const w = tile(S, 0, -2, 5); pot(at(w, 0, .39, 0), '#6fe08c', night ? 1.2 : .3);
    [[-1.8, -.9, .7], [1.9, -.6, -.6], [-1.9, .9, .5], [1.8, 1.1, -.5]].forEach(([x, z, r], i) => { const g = at(w, x, .39, z, r); g.scale.setScalar(1.25); person(g, CAST[i]); });
    const cart = at(S, 2.7, 0, 1.2, .5); B(cart, -7, 3, -4, 14, 1, 8, '#9c6a3e'); B(cart, -7, 4, -4, 14, 3, 1, '#c49058'); B(cart, -7, 4, 3, 14, 3, 1, '#c49058'); [[-5, -5], [3, -5], [-5, 4], [3, 4]].forEach(([x, z]) => B(cart, x, 0, z, 3, 3, 1, '#3a2a22')); bottle(cart, -3, 4, -1, '#2fa37a'); bottle(cart, 2, 4, 0, '#e8542f');
    [[-8.6, -3], [8.8, -2.6], [-9, 8.4], [9, 8.2], [-2.6, -12.4], [3, -12.6]].forEach(([x, z]) => tree(S, x, z));
    const sun = new T.DirectionalLight(night ? '#9fbcff' : '#ffe9c8', night ? .32 : .78); sun.position.set(-12, 16, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 60 }); sun.shadow.bias = -.0005; S.add(sun); S.add(new T.HemisphereLight(night ? '#5a6ea8' : '#dfe8ff', night ? '#141a30' : '#6a7a74', night ? .3 : .36));
    const cam = new T.PerspectiveCamera(34, W / H, .1, 200); cam.position.set(6.8, 37, 33); cam.lookAt(.8, 0, 4.6); cam.updateMatrixWorld();
    R.setPixelRatio(2); R.setSize(W, H, false); R.setClearColor(night ? '#1d2340' : '#3e4a4c', 1); R.render(S, cam);
    const tags = {}; Object.keys(SPOT).forEach(k => { const [x, z] = SPOT[k], v = new T.Vector3(x, 3.1, z).project(cam); tags[k] = { x: (v.x + 1) / 2 * 100, y: (1 - v.y) / 2 * 100 }; });
    return { url: R.domElement.toDataURL('image/jpeg', .9), tags };
  }
  function snap(build, pos, look, size = 180, K = 1) {
    const s = new T.Scene(); build(s); const d = new T.DirectionalLight('#fff', .62); d.position.set(-4, 7, 6); s.add(d); s.add(new T.HemisphereLight('#fff', '#8a7aa0', .3));
    const c = new T.PerspectiveCamera(24, 1, .01, 80); c.position.set(look[0] + (pos[0] - look[0]) * K, look[1] + (pos[1] - look[1]) * K, look[2] + (pos[2] - look[2]) * K); c.lookAt(look[0], look[1], look[2]);
    R.setPixelRatio(1); R.setSize(size, size, false); R.setClearColor(0, 0); R.render(s, c); return R.domElement.toDataURL('image/png');
  }
  const small = (f, ry = .5) => snap(s => f(at(s, 0, 0, 0, ry)), [1.6, 1.7, 3.2], [0, .5, 0], 170);
  const who = (o, extra) => snap(s => { person(at(s, 0, 0, 0, -.25, .04), o); if (extra) extra(s); }, [1, 1.7, 6.2], [.1, 1.35, 0], 220, 1.3);
  const coinArt = (a, b) => small(g => { [[-4, 8], [-5, 10], [-5, 10], [-5, 10], [-4, 8]].forEach(([x, w], i) => B(g, x, 5 - 5 + i * 2, 0, w, 2, 2, i % 2 ? a : b)); B(g, -1, 4, 1.6, 2, 2, 1, a); }, .35);
  const ART = {
    S: () => small(g => { B(g, -5, 0, -5, 10, 2, 10, '#7a7468'); B(g, -4, 2, -2, 3, 6, 3, '#f2cc3e'); B(g, -1, 2, -1, 4, 10, 4, '#ffdc55'); B(g, 3, 2, 0, 3, 5, 3, '#e8b92c'); }),
    Q: () => small(g => { B(g, -5, 0, -5, 10, 3, 10, '#b9c2cc'); B(g, -3, 3, -3, 6, 3, 6, '#d6dde4'); B(g, -1, 6, -1, 2, 3, 2, '#eef2f6'); }),
    L: () => small(g => { B(g, -5, 0, -5, 10, 5, 10, '#f6f4ee'); B(g, -3, 5, -3, 6, 3, 6, '#ffffff'); B(g, -1, 8, -1, 2, 2, 2, '#ffffff'); }),
    M: () => small(g => { B(g, -4, 0, -4, 8, 4, 8, '#8f6fd6'); B(g, -3, 4, -3, 6, 3, 6, '#a58ae0'); B(g, -2, 7, -2, 4, 2, 4, '#bfa8ee'); B(g, -1, 9, -1, 2, 2, 2, '#d9c8f8'); B(g, 1, 3, 3.6, 2, 3, .8, '#f4ecff'); }),
    D: () => small(g => { for (let i = 0; i < 3; i++) B(g, -5 + i, i * 3, -3 + i, 10 - i * 2, 3, 6 - i, i % 2 ? '#2f9a5b' : '#3fb872'); B(g, -1, 9, 0, 2, 2, 2, '#7fe0a8'); }),
    G: () => small(g => { B(g, -4, 0, -4, 8, 3, 8, '#e7b52c'); B(g, -2, 3, -2, 4, 2, 4, '#ffd54a'); [[-6, 6], [5, 4], [0, 8], [-3, 10]].forEach(([x, y]) => B(g, x, y, 0, 1.6, 1.6, 1.6, '#fff3b0', '#ffd54a', .6)); }),
    c1: () => coinArt('#b5693a', '#d98f5a'), c2: () => coinArt('#c3cad2', '#dfe4ea'), c3: () => coinArt('#e7b52c', '#ffd54a'),
    soot: () => small(g => { B(g, -5, 0, -4, 10, 8, 8, '#2a2622'); B(g, -3, 8, -3, 6, 2, 6, '#3a3430'); B(g, -3, 4, 4, 2, 2, .6, '#fff'); B(g, 1, 4, 4, 2, 2, .6, '#fff'); }, .2),
    mortar: () => small(g => { B(g, -4, 0, -4, 8, 2, 8, '#c9b8a0'); B(g, -5, 2, -5, 10, 4, 10, '#d9c8b0'); B(g, -4, 5, -4, 8, 1.2, 8, '#8a7a64'); B(g, 1, 4, 0, 2, 10, 2, '#a67c52').rotation.z = -.5; }),
    still: () => small(g => { B(g, -6, 0, -3, 6, 6, 6, '#c98a4a'); B(g, -4, 6, -1, 2, 5, 2, '#b07a3a'); B(g, -4, 10, -1, 9, 2, 2, '#b07a3a'); B(g, 3, 0, -2, 4, 10, 4, '#e8eef0'); B(g, 3.5, 0, -1.5, 3, 4, 3, '#6fc8e0', '#6fc8e0'); }),
    crucible: () => snap(s => pot(at(s, 0, 0, 0, .4), '#6fe08c'), [1.6, 3.6, 5.4], [0, 1.05, 0], 180, 1.35),
    vent: () => small(g => { B(g, -6, 0, -1, 12, 12, 2, '#6f7c88'); for (let i = 0; i < 4; i++) B(g, -5, 1.5 + i * 2.6, 1, 10, 1.2, .8, '#3a4248'); }, .2),
    corner: () => snap(s => { const g = at(s, 0, 0, 0); for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 1 + i * .32; B(g, Math.cos(a) * r - 1.5, Math.max(0, 8 - r * .9), Math.sin(a) * r - 1.5, 3, 1, 3, i % 3 ? '#ffd54a' : '#f0a82c'); } bottle(at(s, -.1, .9, .1, .3, -.1), 0, 0, 0, '#e7b52c'); }, [1.4, 2.4, 5.2], [0, 1, 0], 180, 1.3),
    rumor: () => who({ robe: '#b0533c', skin: '#6fb86a', frog: 1, up: 1, mouth: '#2c6a3c' }),
    back: () => who({ robe: '#2a2a38', skin: '#c9b8a0', hat: '#1c1c28', band: '#555' }),
    pupil: () => who({ robe: '#3f6fb5', skin: '#f0c29c', hat: '#2c4f8a', up: 1 }),
    clerk: () => who({ robe: '#2fa37a', skin: '#f0c29c', belt: '#fff' }, s => { const p = at(s, .7, 1, .5, -.3, .2); B(p, 0, 0, 0, 7, 9, 1, '#f4e6c0'); B(p, 1, 2, 1, 5, 1, .3, '#555'); B(p, 1, 5, 1, 5, 1, .3, '#555'); }),
    spy: () => who({ robe: '#e4a23a', skin: '#c99a6a', ears: 1, belt: '#fff', up: 1 }, s => { const p = at(s, 1, 1, .5, -.3, .3); B(p, 0, 0, 0, 7, 9, 1, '#fff6df'); B(p, 1, 6, 1, 5, 1, .3, '#555'); B(p, 1, 2, 1, 4, 1, .3, '#c8452e'); }),
    cellar: () => small(g => { B(g, -5, 0, -4, 10, 12, 8, '#7c4d2a'); B(g, -5.4, 2, -4.4, 10.8, 1, 8.8, '#3a2a20'); B(g, -5.4, 9, -4.4, 10.8, 1, 8.8, '#3a2a20'); B(g, -1, 5, 3.6, 2, 2, 1, '#a58ae0', '#7a5cc4'); }, .3),
  };
  const nextFrame = () => new Promise(r => setTimeout(r, 0));
  async function build() {
    T = TB.parts().T;
    R = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true }); R.outputEncoding = T.sRGBEncoding; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
    const out = { art: {}, bottle: {}, face: [], day: null, night: null, pot: null };
    out.day = town(false); await nextFrame(); out.night = town(true); await nextFrame();
    out.pot = snap(s => pot(at(s, 0, 0, 0, .4), '#ff6a3a', .35), [1.6, 3.6, 5.4], [0, .95, 0], 320, 1.12);
    CAST.forEach(o => out.face.push(snap(s => person(s, o), [.7, 1.5, 4.2], [0, 1.15, 0], 120)));
    Object.keys(PC).forEach(k => { out.bottle[k] = snap(s => bottle(at(s, 0, 0, 0, .5), -1, 0, -1, PC[k]), [1, 1.2, 2.4], [0, .45, 0], 110); });
    await nextFrame();
    for (const k of Object.keys(ART)) { out.art[k] = ART[k](); await nextFrame(); }
    A = out; return A;
  }
  function load() { if (!ready) ready = TB.load().then(build).catch(e => { ready = null; throw e; }); return ready; }
  // 最後の順位の表彰台（order は順位の席）
  function podium(order) {
    if (!R) return ''; const S = new T.Scene(); floor(S, true);
    [[0, 3.2, 0], [-3.2, 2.1, 0], [3.2, 1.3, 0], [1.8, .25, 3.2]].forEach(([x, h, z], r) => {
      const i = order[r]; if (i == null) return; const g = at(S, x, 0, z), b = new T.Mesh(new T.BoxGeometry(2.8, h, 2.8), M(r === 0 ? '#ffc53d' : '#c98c4e')); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b); const p = at(g, 0, h, 0, .1); p.scale.setScalar(1.5); person(p, { ...CAST[i], up: r === 0 });
    });
    for (let i = 0; i < 60; i++) { const c = ['#ffc53d', '#e8402a', '#3f8fd6', '#2fa37a', '#f08fb0'][i % 5], o = new T.Mesh(new T.BoxGeometry(.16, .16, .05), M(c, c, .6)); o.position.set(((i * 37) % 200) / 10 - 10, 2 + ((i * 53) % 90) / 10, ((i * 29) % 60) / 10 - 3); o.rotation.set(i, i * 2, i * 3); S.add(o); }
    const d = new T.DirectionalLight('#ffe9c8', .8); d.position.set(-6, 12, 9); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 50 }); S.add(d); S.add(new T.HemisphereLight('#c8d0ff', '#223', .5));
    const c = new T.PerspectiveCamera(32, W / H, .1, 100); c.position.set(0, 9, 36); c.lookAt(0, .2, 0); R.setPixelRatio(2); R.setSize(W, H, false); R.setClearColor('#1d2340', 1); R.render(S, c); return R.domElement.toDataURL('image/jpeg', .9);
  }
  return { load, get: () => A, podium, PC };
})();
