/* ワードウルフの絵：ピクセル（24×24、牧場の緑。案は https://claude.ai/artifact/NdSK9tk84UixjnnmBbokNd の B）
   起動時にプログラムで点を打ち、1点を8×8にした画像（192×192 の PNG）にする。ぼやけないように、表示は image-rendering:pixelated
   WW_ART：sheep（ひつじ）・hood（ひつじのかぶりものをしたオオカミ）・wolf（オオカミ）・shed（かぶりものをぬいだオオカミ） */
const WW_ART = (() => {
  const N = 24, K = 8;
  const mk = () => ({ R: N, px: Array(N * N).fill(null) });
  const ell = (G, cx, cy, rx, ry, c) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (x + .5 - cx * N) / (rx * N), dy = (y + .5 - cy * N) / (ry * N); if (dx * dx + dy * dy <= 1) G.px[y * N + x] = typeof c === 'function' ? c(dx, dy) : c; } };
  const rect = (G, x0, y0, x1, y1, c) => { for (let y = Math.round(y0 * N); y < Math.round(y1 * N); y++) for (let x = Math.round(x0 * N); x < Math.round(x1 * N); x++) if (x >= 0 && y >= 0 && x < N && y < N) G.px[y * N + x] = c; };
  const tri = (G, a, b, c, col) => { const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const p = [(x + .5) / N, (y + .5) / N], d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) G.px[y * N + x] = col; } };
  const dot = (G, x, y, c) => { const X = Math.floor(x * N), Y = Math.floor(y * N); if (X >= 0 && Y >= 0 && X < N && Y < N) G.px[Y * N + X] = c; };
  const outline = (G, c) => { const o = G.px.slice(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (o[y * N + x]) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < N && Y < N && o[Y * N + X]; })) G.px[y * N + x] = c; } };
  const shade = (a, b, t = .35) => (dx, dy) => dy > t ? b : a;
  const P = { wool: '#ffffff', wool2: '#d9d6cf', face: '#3a302a', leg: '#3a302a', eye: '#ffffff', cheek: '#f2a0a0', fur: '#7a7f8c', fur2: '#5c606b', ear: '#d9a0a0', muz: '#d8d4cc', nose: '#1a1a1a', gold: '#ffd23a', ol: '#2a2620' };
  const puffs = (G, list) => list.forEach(([x, y, r]) => ell(G, x, y, r, r, shade(P.wool, P.wool2, .5)));
  function sheep() { const G = mk();
    rect(G, .36, .78, .45, .96, P.leg); rect(G, .55, .78, .64, .96, P.leg);
    ell(G, .5, .62, .36, .26, shade(P.wool, P.wool2)); puffs(G, [[.29, .44, .14], [.5, .36, .16], [.71, .44, .14], [.22, .6, .12], [.78, .6, .12]]);
    ell(G, .33, .55, .075, .045, P.face); ell(G, .67, .55, .075, .045, P.face); ell(G, .5, .58, .14, .18, P.face); ell(G, .5, .43, .11, .07, shade(P.wool, P.wool2, .8));
    for (const s of [-1, 1]) { dot(G, .5 + s * .065, .57, P.eye); dot(G, .5 + s * .065, .6, P.eye); dot(G, .5 + s * .095, .65, P.cheek); }
    outline(G, P.ol); return G; }
  function wolfHead(G, hood) {
    if (!hood) { tri(G, [.26, .42], [.3, .12], [.45, .32], P.fur2); tri(G, [.74, .42], [.7, .12], [.55, .32], P.fur2); tri(G, [.3, .37], [.32, .2], [.42, .32], P.ear); tri(G, [.7, .37], [.68, .2], [.58, .32], P.ear); }
    ell(G, .5, .5, hood ? .19 : .26, hood ? .18 : .23, P.fur); ell(G, .5, .61, .12, .09, P.muz); ell(G, .5, .56, .045, .03, P.nose);
    for (const s of [-1, 1]) { dot(G, .5 + s * .1, .47, P.gold); dot(G, .5 + s * .14, .47, P.gold); } }
  function wolf(fallen) { const G = mk(); ell(G, .5, .82, .3, .17, P.fur2); rect(G, .38, .86, .46, .97, P.fur2); rect(G, .54, .86, .62, .97, P.fur2); wolfHead(G, false);
    if (fallen) puffs(G, [[.14, .9, .08], [.86, .9, .08], [.24, .95, .06], [.79, .74, .06]]);
    outline(G, P.ol); return G; }
  function hood() { const G = mk(); ell(G, .5, .84, .3, .15, P.fur2);
    puffs(G, [[.27, .42, .14], [.5, .3, .16], [.73, .42, .14], [.22, .6, .13], [.78, .6, .13], [.3, .72, .12], [.7, .72, .12]]);
    tri(G, [.33, .3], [.36, .1], [.45, .26], P.fur2); tri(G, [.67, .3], [.64, .1], [.55, .26], P.fur2);
    wolfHead(G, true); outline(G, P.ol); return G; }
  // 1点を K×K にして PNG に（bg があれば先にぬる）
  function png(G, bg) { try { const c = document.createElement('canvas'); c.width = c.height = N * K; const x = c.getContext('2d'); if (bg) bg(x); G.px.forEach((v, i) => { if (v) { x.fillStyle = v; x.fillRect((i % N) * K, Math.floor(i / N) * K, K, K); } }); return c.toDataURL('image/png'); } catch (e) { return ''; } }
  // 草地の点（アイコンと地の模様）
  let sd = 5; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  const grass = x => { x.fillStyle = '#8fc474'; x.fillRect(0, 0, N * K, N * K); for (let i = 0; i < 60; i++) { x.fillStyle = r() < .5 ? '#7fb366' : '#a3d388'; x.fillRect(Math.floor(r() * N) * K, Math.floor(r() * N) * K, K, K); } };
  const art = { sheep: png(sheep()), hood: png(hood()), wolf: png(wolf(false)), shed: png(wolf(true)) };
  try { // 地の模様のタイル（32×32 の点を4倍に）
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#8fc474'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 70; i++) { x.fillStyle = r() < .5 ? '#7fb366' : '#a3d388'; x.fillRect(Math.floor(r() * 32) * 4, Math.floor(r() * 32) * 4, 4, 4); }
    document.documentElement.style.setProperty('--ww-grass', `url(${c.toDataURL('image/png')})`);
  } catch (e) { }
  art.icon = png(hood(), grass);
  return art;
})();
if (WW_ART.icon) ICON_ART.wordwolf = WW_ART.icon;
