(() => {
const ARTIFACT_URL = 'https://claude.ai/artifact/AsSjmSCj2UX5796kW6SCuh';
const VERSION = 'ver 1.3';
const shareBase = () => window.claude ? ARTIFACT_URL : location.origin + location.pathname;
// LINE の中のブラウザだと参加がうまくいかないことがあるので、ふだんのブラウザで開きなおす（LINE の openExternalBrowser）
try { if (!window.claude && /\bLine\//i.test(navigator.userAgent) && !/openExternalBrowser=1/.test(location.search)) location.replace(location.pathname + '?openExternalBrowser=1' + location.hash); } catch (e) { }
// しばらく使われていない卓（前に遊んだまま残っている卓）は、開いた人を部屋主にして新しく始める
const STALE_MS = 30 * 60 * 1000;
let backend = 'local', wantOnline = false, connectErr = '';
const clean = v => JSON.parse(JSON.stringify(v));
// Firestore は「リストの中のリスト」を保存できない（トラッパーの手札 hands など）。保存するときだけ {__a:[…]} に包み、読むときに戻す
const packArr = v => Array.isArray(v) ? v.map(x => Array.isArray(x) ? { __a: packArr(x) } : packArr(x))
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, packArr(x)])) : v;
const unpackArr = v => Array.isArray(v) ? v.map(unpackArr)
  : v && typeof v === 'object' ? (Object.keys(v).length === 1 && Array.isArray(v.__a) ? v.__a.map(unpackArr) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unpackArr(x)]))) : v;
/* ---- つなぎ先：Claudeのページ／Firebase／つながらない（1台） ---- */
function claudeDb(cdb) {
  return { doc: p => { const r = cdb.doc(p); return {
    get: () => r.get(), fresh: () => r.get(), set: v => r.set(clean(v)), onSnapshot: (cb, e) => r.onSnapshot(cb, e),
    tx: async fn => { const l = await r.acquire({ holder: me, ttlMs: 4000 }); if (!l.acquired) return 'busy';
      const s = await r.get(); const next = fn(s.exists ? clean(s.data()) : null); if (next) await r.set(clean(next)); return 'ok'; } }; } };
}
async function connectFirebase(cfg) {
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const [App, Auth, F] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const app = App.initializeApp(cfg), auth = Auth.getAuth(app);
  const cred = await Auth.signInAnonymously(auth);
  // スマホや回線の機器によっては、ふつうの通り道（ストリーミング）が途中で詰まって知らせが止まる。詰まりにくいロングポーリングに固定する
  let fs; try { fs = F.initializeFirestore(app, { experimentalForceLongPolling: true }); } catch (e) { fs = F.getFirestore(app); }
  const wrap = s => ({ exists: s.exists(), data: () => unpackArr(s.data()) });
  const doc = p => { const ref = F.doc(fs, p); return {
    get: async () => wrap(await F.getDoc(ref)), fresh: async () => wrap(await F.getDocFromServer(ref)), set: v => F.setDoc(ref, packArr(clean(v))),
    onSnapshot: (cb, e) => F.onSnapshot(ref, s => cb(wrap(s)), e),
    tx: fn => F.runTransaction(fs, async t => { const s = await t.get(ref); const next = fn(s.exists() ? clean(unpackArr(s.data())) : null); if (next) t.set(ref, packArr(clean(next))); return 'ok'; }) }; };
  // 通信をいったん切ってつなぎ直す（更新ボタンを押したのと同じことを、ページを読みなおさずにやる）
  const kick = async () => { await F.disableNetwork(fs); await F.enableNetwork(fs); };
  return { db: { doc, kick }, uid: cred.user.uid };
}
const HATS = ['#e0503c', '#3f8fe0', '#e8b23a', '#8d8da0'];
const OPEN_MS = 5 * 60 * 1000;
const TABLE_MAX = 8; // 卓に入れる人数。遊べる人数はゲームごとに GAMES の min/max で決める
const CH = { go: '進む', back: '帰る', left: '左へ', right: '右へ' };
const $ = id => document.getElementById(id);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'svg') e.innerHTML = v; // trusted constant markup only
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(3)) { if (c == null || c === false) continue; e.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return e;
}
const ICON = {
  bulb: '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 18h5M10.5 21h3"/><path d="M12 3.5a5.8 5.8 0 0 0-3.5 10.4c.7.6 1 1.3 1 2.1v.4h5V16c0-.8.3-1.5 1-2.1A5.8 5.8 0 0 0 12 3.5z"/><path d="M12 8v3" stroke="#ff5a36"/></svg>',
  up: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg>',
  gear: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8.2" stroke-width="3.4" stroke-dasharray="3.22 3.22"/><circle cx="12" cy="12" r="5.6" stroke-width="2.4"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  pen: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  close: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back:'<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  radar: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="11" cy="11" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M11 11l6-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};

let db = null, user = null, me = null, names = {}, local = false, ready = false;
let tableId = null, doc = null, unsub = null, busy = false, lastRevealKey = '';
// serverDoc：最後にサーバーから届いた卓（doc は自分の操作をすぐ見せるために先に書きかえることがある）
let serverDoc = null, lastSnapAt = 0, onSnap = null, snapErr = null;
// ニックネーム：この端末に覚えておき、卓のデータにも書いてみんなに見せる
let myNick = '', nickGate = false;
try { myNick = localStorage.getItem('atsumaru.nick') || ''; } catch (e) { }
function saveNick(n) { myNick = n; try { localStorage.setItem('atsumaru.nick', n); } catch (e) { } }
function syncNick() {
  if (local || !doc || !myNick || !tableId) return;
  const inTable = (doc.players || []).includes(me) || (doc.requests || []).includes(me);
  if (!inTable || (doc.nicks || {})[me] === myNick) return;
  withLease(d => d && ((d.players || []).includes(me) || (d.requests || []).includes(me)) && (d.nicks || {})[me] !== myNick ? { ...d, nicks: { ...(d.nicks || {}), [me]: myNick } } : null, true);
}

// 見た目：ライト／ダーク。端末に覚える（localStorage atsumaru.theme）
let theme = 'light';
try { theme = localStorage.getItem('atsumaru.theme') === 'dark' ? 'dark' : 'light'; } catch (e) { }
function applyTheme() {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = theme === 'dark' ? '#141311' : '#f6f5f2';
}
applyTheme();
function setTheme(t) { theme = t; try { localStorage.setItem('atsumaru.theme', t); } catch (e) { } applyTheme(); }
// 設定：入場券の形。名前の欄を書きかえ、朱の半券でライト／ダーク。外をタップでとじる
function openSettings() {
  if (document.querySelector('.set-ov')) return;
  const inp = h('input', { id: 'setNick', maxlength: '10', value: myNick || '', placeholder: 'ニックネーム', autocomplete: 'nickname', enterkeyhint: 'done', 'aria-label': 'ニックネーム' });
  const keep = () => {
    const v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 10);
    if (!v) { inp.value = myNick || ''; return; }
    if (v === myNick) return;
    saveNick(v); inp.value = v;
    if (doc) syncNick();
    if (tableId) render();
    toast('名前を「' + v + '」にしました');
  };
  inp.addEventListener('change', keep);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
  const btn = (t, label, icon) => h('button', { class: theme === t ? 'on' : '', 'aria-pressed': String(theme === t), onclick: () => { setTheme(t); stub.querySelectorAll('button').forEach((b, i) => { const on = (i ? 'dark' : 'light') === t; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); }, svg: icon }, label);
  const stub = h('div', { class: 'tk-stub', role: 'group', 'aria-label': '見た目' }, btn('light', 'ライト', ICON.sun), btn('dark', 'ダーク', ICON.moon));
  // 音：あり／なし（端末に覚える）
  const sb = v => h('button', { class: SFX.on === v ? 'on' : '', 'aria-pressed': String(SFX.on === v), onclick: () => { SFX.set(v); snd.querySelectorAll('button').forEach((b, i) => { const on = !i === SFX.on; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); } }, v ? 'あり' : 'なし');
  const snd = h('div', { class: 'set-snd', role: 'group', 'aria-label': '音' }, h('span', { class: 'set-lab' }, '音'), h('div', { class: 'set-seg' }, sb(true), sb(false)));
  const tk = h('div', { class: 'set-tk', role: 'dialog', 'aria-modal': 'true', 'aria-label': '設定' },
    h('div', { class: 'tk-top' }, h('span', { class: 'tk-admit' }, 'SETTINGS ・ 設定'), h('span', { class: 'set-lab' }, 'ニックネーム'),
      h('div', { class: 'set-name' }, inp, h('label', { for: 'setNick', 'aria-label': '名前を書きかえる', svg: ICON.pen })),
      h('span', { class: 'set-note' }, '10文字まで。みんなの画面に出ます'), snd),
    h('div', { class: 'tk-perf' }), stub);
  const ov = h('div', { class: 'set-ov' }, h('div', { class: 'set-in' }, tk));
  const close = () => { keep(); document.removeEventListener('keydown', esc); ov.classList.remove('on'); setTimeout(() => ov.remove(), 200); };
  const esc = e => { if (e.key === 'Escape') close(); };
  ov.addEventListener('click', e => { if (!tk.contains(e.target)) close(); });
  document.addEventListener('keydown', esc);
  document.body.append(ov); requestAnimationFrame(() => ov.classList.add('on'));
}
function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2300); }
async function resolveNames(ids) {
  ids = [...new Set(ids)].filter(id => id && id !== NPC && !(id in names) && !local);
  if (!ids.length || !user) return;
  try { const ps = await user.profiles(ids); ids.forEach(id => names[id] = (ps[id] && ps[id].name) || ''); } catch (e) { }
}
function pIndex(id) { if (/^h\d$/.test(id)) return +id[1]; return doc && doc.players ? doc.players.indexOf(id) : -1; }
const colOf = id => id === NPC ? '#9a9aa8' : HATS2[Math.max(0, pIndex(id)) % 4];
function nameOf(id) {
  if (id === NPC) return 'コンピュータ';
  if (local) return 'ドワーフ' + (pIndex(id) + 1);
  const nk = doc && doc.nicks && doc.nicks[id]; if (nk) return nk;
  if (id === me) return myNick || 'あなた';
  const n = names[id]; if (n) return n;
  const i = pIndex(id); return i >= 0 ? 'ドワーフ' + (i + 1) : 'ドワーフ';
}
const isPlayer = () => doc && doc.players && doc.players.includes(me);
// 1台で遊ぶとき：まだ選んでいない人を順番に操作する
const localActor = () => doc && doc.phase === 'choose' ? needChoice(doc).find(p => p !== NPC && !doc.choice[p]) : null;
const actor = () => local ? localActor() : me;

/* =================== PIXEL SHAFT =================== */
const VW = 180, VH = 170, SX = 70, SW = 40, LV = 22, TOP = 40;
function rng(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// look：自分が使っているアイテムの見た目（helm＝鉄カブトをかぶる、vodka＝顔がまっ赤）。自分の画面の自分にだけ出す
// o：気持ちの動き（案は tools/dwarf-motion-mockup.html、https://claude.ai/artifact/FRCs2S85sx2jEskbATRoqa）
//   bag＝リュックの中身（多いほどふくらむ）、sweat＝汗のコマ（0でなし）、step＝そわそわ足ぶみ、banzai＝バンザイ、climb＝はしごを登るうしろ姿のコマ
function sprite(c, x, y, i, isNpc, mark, look, o = {}) {
  x = Math.round(x - 5); y = Math.round(y - 14);
  const R = (dx, dy, w, h, col) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, w, h); };
  const hat = isNpc ? '#9a9aa8' : HATS2[i % 4], skin = isNpc ? '#9aa0b8' : look === 'vodka' ? '#f49a7a' : '#f6c49a', body = isNpc ? '#7a7f98' : '#4a6ad0';
  const bs = o.bag ? Math.min(5, 1 + Math.floor(o.bag / 5)) : 0;
  if (o.climb) { // はしごをつかんで登る（うしろ姿。リュックが背中に見える）
    R(2, 0, 6, 1, hat); R(1, 1, 8, 2, hat); R(1, 3, 8, 2, skin);
    const up = o.climb % 2; R(0, up ? 1 : 4, 1, 4, skin); R(9, up ? 4 : 1, 1, 4, skin);
    R(2, 5, 6, 6, body); if (bs) { R(1, 5, 8, 4 + bs, '#8a5a32'); R(2, 6, 6, 1, '#a8703e'); R(4, 7, 2, 1, '#c9a24a'); }
    R(2 + (up ? 0 : 4), 11, 2, 3, '#4a3222');
    return;
  }
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 1, y + 14, 8, 2);
  if (bs) { R(-1 - bs, 5, 2 + bs, 6, '#8a5a32'); R(-bs, 5, 1, 6, '#a8703e'); R(-1 - bs, 4, 2 + bs, 1, '#6b4228'); } // リュック
  if (look === 'helm') { R(1, -1, 8, 1, '#8a909a'); R(0, 0, 10, 3, '#a8aeb8'); R(1, 0, 8, 1, '#d8dce4'); R(2, 1, 1, 1, '#6a707a'); R(7, 1, 1, 1, '#6a707a'); }
  else { R(2, 0, 6, 1, hat); R(1, 1, 8, 2, hat); R(4, 0, 2, 1, '#fff6c8'); }
  if (isNpc) { R(1, 3, 8, 4, '#9aa0b8'); R(3, 4, 1, 1, '#ff6b6b'); R(6, 4, 1, 1, '#ff6b6b'); R(1, 7, 8, 5, '#7a7f98'); R(1, 7, 8, 1, '#a8aec6'); }
  else {
    R(1, 3, 8, 3, skin); R(3, 4, 1, 1, '#2a1d14'); R(6, 4, 1, 1, '#2a1d14'); R(4, 5, 2, 1, o.banzai ? '#c83a2a' : '#e88a72');
    if (look === 'vodka') { R(1, 5, 2, 1, '#e8504a'); R(7, 5, 2, 1, '#e8504a'); }
    R(1, 6, 8, 3, '#f4f1ea'); R(2, 9, 6, 1, '#f4f1ea'); R(2, 10, 6, 2, '#4a6ad0'); R(3, 11, 4, 1, '#5a3a22');
    if (!o.banzai) { R(1, 9, 1, 3, '#4a6ad0'); R(8, 9, 1, 3, '#3a54a8'); }
    const st = o.step ? 1 : 0; R(2, 12 - st, 2, 1 + st, '#4a3222'); R(6, 12, 2, 1, '#4a3222');
  }
  if (o.banzai) { R(0, -2, 1, 8, body); R(9, -2, 1, 8, body); R(0, -3, 1, 1, skin); R(9, -3, 1, 1, skin); }
  if (o.sweat) { const k = o.sweat % 3; R(10, 2 + k, 1, 2, '#9ad8ff'); if (o.sweat % 2) R(-1, 1 + k, 1, 1, '#9ad8ff'); }
  if (mark) { R(4, -5, 3, 1, '#f2a541'); R(5, -4, 1, 1, '#f2a541'); }
}
const HATS2 = ['#f2a541', '#6fb1e8', '#7fd19b', '#d98ad6'], BEARDS = ['#d8823a', '#efe4d4', '#8a5a3a', '#3a2a22'];
function faceSvg(i, npc, size) {
  const hat = npc ? '#9a9aa8' : HATS2[i % 4], beard = npc ? '#6b6b78' : BEARDS[i % 4], skin = npc ? '#a8e39a' : '#e8b48a';
  return `<svg width="${size}" height="${size}" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="0" width="6" height="1" fill="${hat}"/><rect x="1" y="1" width="8" height="2" fill="${hat}"/><rect x="4" y="1" width="2" height="1" fill="#fff3c4"/><rect x="2" y="3" width="6" height="2" fill="${skin}"/><rect x="3" y="3" width="1" height="1" fill="#2a1d14"/><rect x="6" y="3" width="1" height="1" fill="#2a1d14"/><rect x="1" y="5" width="8" height="2" fill="${beard}"/><rect x="3" y="7" width="4" height="1" fill="${beard}"/><rect x="2" y="8" width="6" height="2" fill="#5a4636"/></svg>`;
}
const face = (id, size) => h('span', { class: 'face', svg: faceSvg(Math.max(0, pIndex(id)), id === NPC, size) });
function drawShaft(cv, g, opt = {}) {
  const vh = opt.vh || VH; cv.width = VW; cv.height = vh; const c = cv.getContext('2d');
  const depth = g.depth, nextFork = g.phase === 'choose' && g.next && g.next.fork;
  const scroll = Math.max(0, TOP + depth * LV - Math.round(vh * 0.62));
  // night sky
  const sky = c.createLinearGradient(0, 0, 0, TOP); sky.addColorStop(0, '#1b2140'); sky.addColorStop(1, '#5a3a4a');
  c.fillStyle = sky; c.fillRect(0, 0, VW, TOP);
  c.fillStyle = '#ffe9a8'; [[14, 6], [40, 12], [96, 5], [128, 14], [170, 8], [60, 3]].forEach(([x, y]) => c.fillRect(x, y, 1, 1));
  c.fillStyle = '#fff6d0'; c.fillRect(151, 5, 3, 1); c.fillRect(150, 6, 5, 3); c.fillRect(151, 9, 3, 1);
  c.save(); c.translate(0, -scroll);
  const rows = Math.ceil((vh + scroll - TOP) / 8) + 2;
  for (let r = 0; r < rows; r++) {
    const y = TOP + r * 8, dep = r * 8 / LV, heat = Math.min(1, dep / 12);
    c.fillStyle = r < 2 ? '#7a5034' : `rgb(${110 + heat * 40 | 0},${92 - heat * 45 | 0},${80 - heat * 55 | 0})`; c.fillRect(0, y, VW, 8);
    const rr = rng(r * 97 + 13); for (let i = 0; i < 10; i++) { c.fillStyle = `rgba(0,0,0,${.12 + rr() * .1})`; c.fillRect(Math.floor(rr() * VW), y + Math.floor(rr() * 8), 1 + Math.floor(rr() * 2), 1); }
    if (r > 2 && rr() < .5) { const ores = ['#3a3436', '#e8843a', '#e6eef6', '#ffd23a', '#59e3ff']; c.fillStyle = ores[Math.floor(rr() * ores.length)]; const x = rr() < .5 ? Math.floor(rr() * 50) + 6 : Math.floor(rr() * 50) + 120; c.fillRect(x, y + 3, 2, 2); }
  }
  c.fillStyle = '#4f8a3a'; c.fillRect(0, TOP - 3, VW, 4); c.fillStyle = '#2f5a26'; c.fillRect(0, TOP + 1, VW, 1);
  for (let x = 2; x < VW; x += 7) { c.fillStyle = '#6aa84a'; c.fillRect(x, TOP - 4, 1, 1); }
  const shaftBottom = TOP + depth * LV;
  c.fillStyle = '#1a120e'; c.fillRect(SX, TOP - 3, SW, shaftBottom - TOP + 3);
  c.fillStyle = '#2a1e18'; c.fillRect(SX, TOP - 3, 3, shaftBottom - TOP + 3); c.fillRect(SX + SW - 3, TOP - 3, 3, shaftBottom - TOP + 3);
  for (let d = 1; d <= depth; d++) { const y = TOP + d * LV; c.fillStyle = '#3a2a20'; c.fillRect(SX, y - 2, SW, 2); c.fillStyle = 'rgba(242,165,65,.55)'; c.font = '6px monospace'; c.fillText(String(d), SX - 9, y - 6); }
  c.fillStyle = '#7a5a32'; for (let y = TOP - 2; y < shaftBottom - 2; y += 4) c.fillRect(SX + SW - 9, y, 5, 1); c.fillRect(SX + SW - 9, TOP - 2, 1, shaftBottom - TOP); c.fillRect(SX + SW - 5, TOP - 2, 1, shaftBottom - TOP);
  if (g.phase === 'choose') {
    const ny = shaftBottom;
    if (nextFork) {
      c.fillStyle = '#4a3a30'; c.fillRect(SX - 26, ny + 2, 26, LV - 4); c.fillRect(SX + SW, ny + 2, 26, LV - 4);
      c.fillStyle = '#f2a541'; c.font = '7px sans-serif'; c.fillText('左?', SX - 20, ny + 14); c.fillText('右?', SX + SW + 7, ny + 14);
    } else { c.fillStyle = '#4a3a30'; c.fillRect(SX + 2, ny, SW - 4, LV - 2); c.fillStyle = '#f2a541'; c.font = '10px sans-serif'; c.fillText('?', SX + SW / 2 - 3, ny + 15); }
  }
  if (g.pot > 0 && depth > 0) { const y = shaftBottom - 4; for (let i = 0; i < Math.min(6, g.pot); i++) { c.fillStyle = ['#ffd23a', '#e6eef6', '#e8843a'][i % 3]; c.fillRect(SX + 5 + i * 3, y - (i % 2), 2, 2); } }
  const heat = magmaRate(depth + 1);
  const mg = c.createLinearGradient(0, shaftBottom + LV * 2, 0, shaftBottom + LV * 5); mg.addColorStop(0, 'rgba(255,90,30,0)'); mg.addColorStop(1, `rgba(255,90,30,${Math.min(.95, heat * 1.8)})`);
  c.fillStyle = mg; c.fillRect(0, shaftBottom + LV * 2, VW, LV * 3);
  const inside = g.inside || [];
  if (inside.length) { const lg = c.createRadialGradient(SX + 21, shaftBottom - 8, 2, SX + 21, shaftBottom - 8, 44); lg.addColorStop(0, 'rgba(242,165,65,.5)'); lg.addColorStop(1, 'rgba(242,165,65,0)'); c.fillStyle = lg; c.fillRect(0, shaftBottom - 60, VW, 110); }
  // magma moment
  if (opt.boom) {
    const sides = opt.sides && opt.sides.length ? opt.sides : ['main'];
    if (sides.includes('main')) dobon(c, shaftBottom, opt.burnt || [], opt.bt == null ? 1e9 : opt.bt, opt.looks || {});
    else {
      // 分かれ道：掘った横穴を両方見せて、マグマの側だけ溶岩で満たす
      const py = shaftBottom - LV + 2, ph = LV - 2, PW = 28;
      ['left', 'right'].forEach(sd => {
        const px = sd === 'left' ? SX - PW : SX + SW;
        c.fillStyle = '#1a120e'; c.fillRect(px, py, PW, ph);
        if (!sides.includes(sd)) return;
        const cx = px + PW / 2, gl = c.createRadialGradient(cx, py + ph / 2, 2, cx, py + ph / 2, 46); gl.addColorStop(0, 'rgba(255,110,30,.75)'); gl.addColorStop(1, 'rgba(255,110,30,0)'); c.fillStyle = gl; c.fillRect(cx - 46, py - 40, 92, 90);
        c.fillStyle = '#ff6a1e'; c.fillRect(px, py + 6, PW, ph - 6); c.fillStyle = '#ffb23a'; for (let x = px; x < px + PW; x += 4) c.fillRect(x, py + 5 - ((x / 4) % 2), 3, 2);
        c.fillStyle = '#fff1a8'; [[px + 5, py + 10], [px + 15, py + 14], [px + 22, py + 9]].forEach(([x, y]) => c.fillRect(x, y, 2, 2));
        (opt.burnt || []).filter(id => (opt.who || {})[id] === sd).forEach((id, k) => sprite(c, px + 7 + k * 8, py + 2 - (k % 2) * 5, pIndex(id), id === NPC, false));
      });
    }
  }
  // 気持ちの動き：リュックは中身の分ふくらむ。選んでいるあいだはそわそわ、危ない段（マグマ16%〜）では汗。大鉱脈のあとはバンザイ
  const tt = opt.t || Date.now(), choosing = g.phase === 'choose', hot = choosing && magmaRate(depth + 1) >= .16, fr = Math.floor(tt / 180);
  inside.forEach((id, k) => sprite(c, SX + 8 + k * 8, shaftBottom - 2, pIndex(id), id === NPC, id === opt.me, id === opt.me ? (g.armed || {})[id] : null,
    { bag: (g.bag || {})[id] || 0, sweat: hot ? fr + k + 1 : 0, step: choosing && !(g.choice || {})[id] && (Math.floor(tt / 260) + k) % 2 === 0, banzai: !!opt.banzai && (Math.floor(tt / 200) + k) % 2 === 0 }));
  const home = g.players.filter(id => g.out && g.out[id] && g.out[id].result === 'home');
  home.forEach((id, k) => {
    const x = k % 2 ? SX + SW + 14 + Math.floor(k / 2) * 12 : SX - 12 - Math.floor(k / 2) * 12;
    const lg = c.createRadialGradient(x, TOP - 8, 1, x, TOP - 8, 14); lg.addColorStop(0, 'rgba(242,165,65,.45)'); lg.addColorStop(1, 'rgba(242,165,65,0)'); c.fillStyle = lg; c.fillRect(x - 14, TOP - 22, 28, 28);
    sprite(c, x, TOP - 3, pIndex(id), id === NPC, false);
  });
  c.restore();
}

// マグマ「ドボン」：床がバキッと割れて（〜DB_FALL）、溶岩の池に落ちる → しぶき（DB_SPLASH〜）→ ぶくぶく → 顔だけぷかっと浮いて「あちち」
// e は割れてからの時間（ms）。大きい値なら最後の止まった絵（遊びかたのスライドもこれ）。案は tools/dwarf-magma-mockup.html の2（https://claude.ai/artifact/4HxyboJuPinH9w48GBqGep）
const DB_FALL = 160, DB_SPLASH = 380, DB_MS = 1500;
function dobon(c, sb, burnt, e, looks = {}) {
  sb -= LV; // 立っていたのは1段上の床（マグマでも深さは1つ進む）。その床が割れて、下の段が溶岩の池になる
  const P =(x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const lv = c.createLinearGradient(0, sb - 40, 0, sb + 50); lv.addColorStop(0, 'rgba(255,120,40,0)'); lv.addColorStop(.45, `rgba(255,120,40,${e < DB_FALL ? .2 : .45})`); lv.addColorStop(1, 'rgba(255,90,20,.9)'); c.fillStyle = lv; c.fillRect(0, sb - 40, VW, 90);
  const xs = burnt.map((_, k) => SX + 8 + k * 8);
  if (e < DB_FALL) { // ひびがのびる
    const v = e / DB_FALL; P(SX + 19, sb - 2, 1, 2 + v * 3, '#000'); P(SX + 19 - v * 10, sb - 1, v * 10, 1, '#000'); P(SX + 20, sb, v * 12, 1, '#000');
    burnt.forEach((id, k) => sprite(c, xs[k], sb - 2, pIndex(id), id === NPC, false, looks[id]));
    return;
  }
  // 落ちる（池より先に描いて、溶岩に沈んで見えるように）
  const f = Math.min(1, (e - DB_FALL) / 260);
  if (f < 1) burnt.forEach((id, k) => sprite(c, xs[k], sb - 2 + f * f * 18, pIndex(id), id === NPC, false, looks[id]));
  const top = sb - 3, t = Date.now();
  P(SX, top, SW, LV + 6, '#ff6a1e'); for (let x = SX; x < SX + SW; x += 4) P(x, top - ((x / 4 + Math.floor(t / 110)) % 2), 3, 2, '#ffb23a');
  [[6, 5], [20, 9], [31, 4]].forEach(([a, b], k) => P(SX + a, top + b + ((Math.floor(t / 150) + k) % 2), 2, 2, '#fff1a8'));
  // しぶき
  if (e > DB_SPLASH && e < DB_SPLASH + 520) { const v = (e - DB_SPLASH) / 520; for (let q = 0; q < 12; q++) { const a = (q + .5) / 12 * Math.PI; P(SX + SW / 2 + Math.cos(a) * 30 * v, top - Math.sin(a) * 36 * v + v * v * 34, 2, 2, q % 2 ? '#ffb23a' : '#fff1a8'); } }
  // 鉄カブト：池に落ちた瞬間に「カーン」と白い火花
  burnt.forEach((id, k) => { if (looks[id] !== 'helm' || e <= DB_SPLASH || e >= DB_SPLASH + 360) return; const v = (e - DB_SPLASH) / 360, x = xs[k] + 2, y = top - 4; for (let q = 0; q < 8; q++) { const an = q / 8 * 6.283; P(x + Math.cos(an) * (4 + v * 10), y + Math.sin(an) * (3 + v * 7), 2, 1, '#fff6c8'); } });
  // ぶくぶく
  if (e > 700) for (let q = 0; q < 3; q++) { const bt = (e - 700 + q * 220) % 660; P(SX + 9 + q * 11, top + 16 - bt / 30, 2, 2, '#ffd27a'); }
  // 顔だけぷかっ（帽子と目）。ときどき「あちち」で少し跳ねる
  if (e > 900) burnt.forEach((id, k) => {
    const x = SX + 10 + k * (burnt.length > 2 ? 8 : 12), bob = Math.round(Math.sin(e / 140 + k) * .8), hop = (Math.floor(e / 700) + k) % 4 === 0 ? 2 : 0, y = top + 1 + bob - hop;
    const helm = looks[id] === 'helm', hat = helm ? '#a8aeb8' : id === NPC ? '#9a9aa8' : HATS2[Math.max(0, pIndex(id)) % 4];
    P(x - 4, y - 5, 8, 2, hat); P(x - 2, y - 6, 4, 1, hat); if (helm) { P(x - 5, y - 4, 10, 1, '#6a707a'); P(x - 3, y - 6, 3, 1, '#e8ecf2'); } P(x - 4, y - 3, 8, 3, id === NPC ? '#9aa0b8' : '#f6c49a'); P(x - 2, y - 2, 1, 1, '#2a1d14'); P(x + 1, y - 2, 1, 1, '#2a1d14');
  });
}
// ドボンの動き（割れてから DB_MS）。ゆれと赤いフラッシュは、動きを減らす設定ならなし
function boomLoop() {
  if (!G.cv || !G.cv.isConnected || !doc || doc.status !== 'playing' || digActive()) { if (G.cv) G.cv.style.transform = ''; return; }
  const e = Date.now() - boomFrom; if (e < 0 || Date.now() >= boomUntil) { G.cv.style.transform = ''; return; } // 顔がぷかぷかしているあいだも動かす
  drawShaft(G.cv, doc, { boom: true, bt: e, burnt: boomBurnt, sides: boomSides, who: boomWho, looks: boomLooks, me: local ? localActor() : me, vh: boardVh() });
  let still = false; try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (x) { }
  if (!still) {
    const s = e > DB_SPLASH && e < DB_SPLASH + 450 ? (1 - (e - DB_SPLASH) / 450) * 3 : 0;
    G.cv.style.transform = s ? `translate(${Math.round((Math.random() - .5) * 2 * s)}px,${Math.round((Math.random() - .5) * 2 * s)}px)` : '';
    if (e > DB_SPLASH && e < DB_SPLASH + 160) { const c = G.cv.getContext('2d'); c.fillStyle = `rgba(255,60,20,${.45 * (1 - (e - DB_SPLASH) / 160)})`; c.fillRect(0, 0, G.cv.width, G.cv.height); }
  }
  if (G.boom) { const on = e >= DB_SPLASH; if (on && G.boom.hidden) { G.boom.textContent = 'ドボン！'; G.boom.className = 'boom'; G.boom.hidden = false; } }
  requestAnimationFrame(boomLoop);
}

/* =================== WRITES =================== */
const tref = () => db.doc('tables/' + tableId);
async function commit(next) {
  if (local) { doc = next; afterChange(); return; }
  const prev = doc; doc = next; afterChange();
  busy = true;
  try { await tref().set({ ...next, updated: Date.now() }); }
  catch (e) { doc = prev; afterChange(); toast('送れませんでした。電波を確かめてもう一度'); }
  busy = false;
}
function play(a, who) {
  if (busy) return;
  try { let next = act(doc, who || actor(), a); if (local) next = autoLocal(next); commit(next); }
  catch (e) { toast(e.message); }
}
// 1台プレイ：ゴーレムの選択と、そろったときの公開をその場で行う
function autoLocal(g) {
  const humansWaiting = needChoice(g).some(p => p !== NPC && !g.choice[p]);
  if (humansWaiting) return g;
  if (g.phase === 'choose' && g.inside.includes(NPC) && !g.choice[NPC]) { let a = npcChoice(g); g = act(g, NPC, a); if (a.t !== 'choose') g = act(g, NPC, npcChoice(g)); /* アイテムを使ったら、もう一度考えて選ぶ */ }
  if (g.phase === 'choose' && allChosen(g)) g = resolve(g);
  return g;
}
// 1台プレイで人間が全員坑道の外にいるとき、ゴーレムだけで少しずつ進める
setInterval(() => {
  if (!local || !doc || doc.status !== 'playing' || doc.phase !== 'choose' || busy) return;
  if (needChoice(doc).some(p => p !== NPC) || digActive()) return;
  doc = autoLocal(doc); afterChange();
}, 1400);
async function withLease(fn, quiet) {
  const ref = tref();
  try {
    const r = await ref.tx(d => { const n = fn(d); return n ? { ...n, updated: Date.now() } : null; });
    if (r === 'busy' && !quiet) toast('ほかの人が操作中です。もう一度押してください');
    return r;
  } catch (e) {
    const code = (e && e.code) || '';
    console.warn('書き込みに失敗しました', e);
    if (!quiet) toast(/permission[_-]denied/.test(code) ? 'この卓には書き込めませんでした' : /invalid[_-]argument/.test(code) ? '保存できない形のデータでした（開発者に知らせてください）' : '通信できませんでした。もう一度押してください');
    return 'err';
  }
}
// オンライン：自分の選択は、他の人と同時に書いても消えないように、リースを取ってから書く
function choose(a) {
  if (local) { play(a); return; }
  const before = serverDoc;
  withLease(d => {
    if (!d || d.status !== 'playing' || d.phase !== 'choose') return null;
    let g = act(d, me, a);
    if (allChosen(g)) g = resolve(g);
    return g;
  }).then(r => {
    // 書けなかったら、ボタンを押せる状態にもどす（グレーのまま固まらないように）
    if (r !== 'ok' && serverDoc === before && doc && doc.status === 'playing') { doc = serverDoc; afterChange(); }
  });
  // 見た目はすぐ反映（決めたらボタンはグレーになる）
  try { const g = act(doc, me, a); doc = g; afterChange(); } catch (e) { toast(e.message); }
}
const freshLobby = () => ({ v: 6, status: 'lobby', host: me, players: [me], requests: [], denied: [], openedAt: Date.now(), game: 'dwarf', nicks: myNick ? { [me]: myNick } : {}, updated: Date.now() });
function requestJoin() { withLease(d => {
  if (!d || d.status !== 'lobby' || d.players.includes(me) || (d.requests || []).includes(me)) return null;
  if (Date.now() - d.openedAt > OPEN_MS || d.players.length >= TABLE_MAX) return null;
  return { ...d, requests: (d.requests || []).concat(me), denied: (d.denied || []).filter(x => x !== me), nicks: myNick ? { ...(d.nicks || {}), [me]: myNick } : (d.nicks || {}) };
}, true); }
// 部屋主がメンバーを卓から外す（ロビーのあいだだけ）。外された人は「断られた」扱いになり、自動で参加希望を出しなおさない
function kick(id) { withLease(d => {
  if (!d || d.status !== 'lobby' || d.host !== me || id === me || !d.players.includes(id)) return null;
  return { ...d, players: d.players.filter(p => p !== id), denied: (d.denied || []).filter(x => x !== id).concat(id) };
}); }
function answer(id, ok) { withLease(d => {
  if (!d || d.status !== 'lobby' || d.host !== me) return null;
  const requests = (d.requests || []).filter(x => x !== id);
  if (!ok) return { ...d, requests, denied: (d.denied || []).concat(id) };
  if (d.players.length >= TABLE_MAX) { toast(`もう${TABLE_MAX}人そろっています`); return { ...d, requests }; }
  return { ...d, requests, players: d.players.concat(id) };
}); }
// 受付を5分のばす（締め切り後なら残り5分から）。のばせるのは残り30分まで
function extend() {
  withLease(d => {
    if (!d || d.status !== 'lobby' || d.host !== me) return null;
    const now = Date.now(), openedAt = Math.min(Math.max(d.openedAt, now - OPEN_MS) + 5 * 60000, now + 30 * 60000 - OPEN_MS);
    return { ...d, openedAt };
  });
  toast('受付を5分のばしました');
}
const newGameFor = (id, humans, host) => id === 'boxing' ? BOX.make(humans) : id === 'icho' ? ICH.make(humans) : id === 'wordwolf' ? WW.make(humans) : id === 'tower' ? TWR.make(humans) : id === 'bomb' ? BMB.make(humans) : id === 'alchemy' ? ALC.make(humans) : id === 'trapper' ? trNew(humans) : id === 'bingo' ? BGO.make(humans, host) : DUEL[id] ? duelNew(id, humans) : CARDG[id] ? CARDG[id].make(humans) : newGame(humans);
const fits = (g, n) => n >= g.min && n <= g.max;
// id：始めるゲーム。もう一度のときは前と同じゲーム、ロビーからは部屋主の端末で選んでいるゲーム
const gameDoc = (d, pick = d.game || 'dwarf') => {
  const g = gameById(pick), id = g.id, humans = d.players.filter(p => p !== NPC);
  if (!fits(g, humans.length)) return null;
  return { host: d.host, nicks: d.nicks || {}, game: id, openedAt: d.openedAt, requests: [], denied: [], ...newGameFor(id, humans, d.host), game: id };
};
function startGame() { const id = hubPick(doc); withLease(d => d && d.status === 'lobby' && d.host === me ? gameDoc(d, id) : null); }
function regather() { withLease(d => (!d || d.status === 'over' || d.v !== 6) ? freshLobby() : null); }
function rematch() {
  if (local) { const id = doc.game || 'dwarf'; doc = newGameFor(id, doc.players.filter(p => p !== NPC), 'p1'); if (id === 'dwarf') doc = autoLocal(doc); render(); return; }
  withLease(d => d && d.status === 'over' && d.host === me ? gameDoc(d) : null);
}
function nextExpedition() {
  if (local) { play({ t: 'next' }, 'any'); return; }
  withLease(d => d && d.status === 'playing' && d.phase === 'summary' ? act(d, me, { t: 'next' }) : null, true);
}

/* =================== TABLE =================== */
function genId() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function openTable(id) {
  id = id.toUpperCase(); if (unsub) unsub();
  tableId = id; doc = null; serverDoc = null; lastRevealKey = '';
  try { if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id); } catch (e) { }
  render();
  let first = true, resetTried = false;
  onSnap = async snap => {
    if (tableId !== id) return;
    lastSnapAt = Date.now();
    if (!snap.exists) { if (first) { first = false; withLease(d => d ? null : freshLobby()); } return; }
    first = false;
    const data = snap.data();
    const stale = d => Date.now() - (d.updated || 0) > STALE_MS;
    if (!resetTried && stale(data) && !(data.status === 'lobby' && data.host === me && data.players.length === 1)) {
      resetTried = true;
      withLease(d => d && stale(d) ? freshLobby() : null, true).then(r => { if (r === 'ok') toast('前に使った卓だったので、新しく始めました'); });
    }
    const wasIn = !!doc && (doc.players || []).includes(me), nowIn = (data.players || []).includes(me);
    if (wasIn && data.status === 'lobby' && !nowIn && (data.denied || []).includes(me)) toast('部屋主に卓から外されました');
    if (doc && !wasIn && nowIn && data.status === 'lobby' && data.host !== me) { admitAt = Date.now(); SFX.play('ok'); } // 待つ画面から入れてもらえた
    if (doc && data.status === 'lobby' && data.host === me && (data.requests || []).length > (doc.requests || []).length) SFX.play('knock'); // 部屋主：入りたい人が来た
    const prevStatus = doc && doc.status;
    doc = JSON.parse(JSON.stringify(data)); serverDoc = doc;
    syncNick();
    if (myNick && doc.status === 'lobby' && !doc.players.includes(me) && !(doc.requests || []).includes(me) && !(doc.denied || []).includes(me)
      && Date.now() - doc.openedAt < OPEN_MS && doc.players.length < TABLE_MAX) requestJoin();
    await resolveNames([].concat(doc.players || [], doc.requests || [], doc.host || []));
    if (prevStatus === 'playing' && (doc.status === 'playing' || isTrapDoc() || isBoardDoc())) afterChange(); else if (prevStatus === 'lobby' && doc.status === 'playing') tear(render); else render();
  };
  snapErr = () => { toast('つなぎ直しています…'); setTimeout(listen, 2000); }; // 切れたら少しして聞き直す
  listen();
}
function listen() {
  if (!tableId || local || !onSnap) return;
  if (unsub) try { unsub(); } catch (e) { }
  unsub = tref().onSnapshot(onSnap, snapErr);
}
// スマホによってはリアルタイムの知らせが止まることがある（画面を消した・アプリを切りかえた・電波が弱いなど）。
// しばらく知らせが来ないときや画面にもどったときは、自分でサーバーを見にいく。中身がちがえば反映して聞き直す
// （updated は各スマホの時計なのでずれることがある。比べるのは中身）
// 見にいく処理には時間切れをつける（返事が来ないまま「見にいっている途中」で止まらないように）。
// 返事が来ない・失敗したときは、通信をつなぎ直して知らせも聞き直す
let healing = false;
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x);
const within = (p, ms) => Promise.race([p, new Promise((_, ng) => setTimeout(() => ng(new Error('timeout')), ms))]);
async function heal(force) {
  if (local || !db || !tableId || !onSnap || healing || document.hidden) return;
  healing = true; const id = tableId, snapAt = lastSnapAt;
  try {
    const s = await within(tref().fresh(), 4000);
    if (id !== tableId || !s.exists) return;
    // 読んでいるあいだに知らせが届いていたら、そちらが新しいかもしれないので使わない（古い卓にもどって掘る演出が切れていた）
    if (lastSnapAt !== snapAt) { if (force) listen(); return; }
    if (!serverDoc || canon(s.data()) !== canon(serverDoc)) { await within(onSnap(s), 4000); listen(); }
    else if (force) listen();
  } catch (e) {
    if (db.kick) try { await within(db.kick(), 4000); } catch (e2) { }
    if (id === tableId) listen();
  } finally { healing = false; }
}
// ロビーでは「チケットをきった瞬間」を逃さないよう2秒、ゲーム中は5秒、知らせが来ないときに見にいく
setInterval(() => {
  if (!tableId || local) return;
  const gap = doc && doc.status === 'lobby' ? 2000 : 5000;
  if (Date.now() - lastSnapAt > gap) heal();
}, 1000);
// 画面にもどった・電波がもどったときは、すぐ見にいって知らせも聞き直す
document.addEventListener('visibilitychange', () => { if (!document.hidden) heal(true); });
window.addEventListener('online', () => heal(true));
window.addEventListener('focus', () => heal(true));
window.addEventListener('pageshow', e => { if (e.persisted) heal(true); }); // iPhone で戻るボタンなどからページがそのまま復元されたとき
function leaveTable() {
  // ロビーで出るときは、卓のメンバーからも外れる（部屋主なら次の人に部屋主をわたす）
  if (!local && tableId && doc && doc.status === 'lobby' && (doc.players || []).includes(me)) withLease(d => {
    if (!d || d.status !== 'lobby' || !d.players.includes(me)) return null;
    const players = d.players.filter(p => p !== me); if (!players.length) return null;
    return { ...d, players, host: d.host === me ? players[0] : d.host };
  }, true);
  if (unsub) unsub(); unsub = null; tableId = null; doc = null; serverDoc = null; onSnap = null; hubSel = null; hubSheet = 0; bootId = '';
  try { history.replaceState(null, '', location.pathname); } catch (e) { }
  // 出たら、自分の新しい卓へ（最初の画面はもう出さない）
  if (!local && db && me && !window.claude) { openTable(genId()); return; }
  render();
}
/* ---- ゲームの途中でやめる：確かめてから「中断してホーム（ゲーム選択）にもどる」 ---- */
// オンラインでは誰が押してもゲームは終わり、同じメンバーのまま全員ゲーム選択にもどる
function quitNote() {
  if (local) return 'このゲームの続きは消えます';
  if (!isPlayer()) return '観戦をやめて、卓から出ます';
  return 'みんなのゲームが終わって、全員ゲーム選択の画面にもどります';
}
function quitGame() {
  if (local) { doc = null; tableId = null; render(); return; }
  if (!isPlayer()) { leaveTable(); return; }
  withLease(d => d && d.status === 'playing' && d.players.includes(me) ? lobbyFrom(d) : null);
}
function confirmQuit() {
  const el = $('sheet'), close = () => { el.hidden = true; el.replaceChildren(); };
  el.className = 'sheet';
  el.replaceChildren(h('div', { class: 'inner', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'quitT' }, h('div', { class: 'quit-card' },
    h('b', { id: 'quitT' }, 'ゲームを中断して', h('br'), 'ホームにもどりますか？'), h('span', null, quitNote()),
    h('button', { class: 'quit-go', onclick: () => { close(); quitGame(); } }, '中断してホームにもどる'),
    h('button', { class: 'quit-no', onclick: close }, 'つづける'))));
  el.hidden = false; el.onclick = e => { if (e.target === el) close(); };
}
// オンライン：部屋主（いなければ残っている人）がコンピュータの選択と時間切れ・次の探検を進める
const steward = () => { const hs = doc.players.filter(p => p !== NPC && !doc.gone[p]); return hs[0] === me; };
setInterval(() => {
  if (local || !doc || doc.status !== 'playing' || doc.v !== 6 || !isPlayer()) return;
  if (doc.phase === 'choose') {
    // コンピュータは、この端末で掘る演出（と始まりの動き）が終わってから選ぶ。坑道にコンピュータだけ残ると1.5秒ごとに掘って、演出が次の結果に上書きされていた
    const calm = Date.now() >= (G.lockUntil || 0) && Date.now() - (G.revealAt || 0) >= SEENO_MS + DIG_MS + 1000;
    if (calm && doc.inside.includes(NPC) && !doc.choice[NPC] && steward()) withLease(d => {
      if (!d || d.phase !== 'choose' || d.choice[NPC] || !d.inside.includes(NPC)) return null;
      let g = d, a = npcChoice(g); g = act(g, NPC, a); if (a.t !== 'choose') g = act(g, NPC, npcChoice(g)); /* アイテムを使ったら、もう一度考えて選ぶ */
      return allChosen(g) ? resolve(g) : g;
    }, true);
    if (allChosen(doc)) withLease(d => d && d.phase === 'choose' && allChosen(d) ? resolve(d) : null, true);
    else if (Date.now() - doc.lastAt > LIMIT_MS) withLease(d => d && d.phase === 'choose' && Date.now() - d.lastAt > LIMIT_MS ? act(d, me, { t: 'timeout' }) : null, true);
    renderPanel();
  } else if (doc.phase === 'summary' && steward() && Date.now() - doc.lastAt > 9000) nextExpedition();
}, 1500);

/*__TRAP_UI__*/
/*__BOARD_UI__*/
/* =================== PAGES =================== */
function brand(back, sub) {
  return h('div', { class: 'brand' }, h('div', { class: 'name', role: 'heading', 'aria-level': '1' }, 'ドワーフ', h('small', null, sub || '1本の坑道で、進むか帰るか')),
    back ? h('button', { class: 'ibtn', 'aria-label': 'トップへ戻る', onclick: back, svg: ICON.back }) : null);
}
function heroArt() {
  const cv = document.createElement('canvas');
  drawShaft(cv, { depth: 4, phase: 'choose', next: { fork: false }, pot: 3, inside: ['h0', 'h1', 'h2'], players: [], out: {} });
  return h('div', { class: 'sky' }, cv);
}
/* =================== HUB（ゲーム選択：チケット） =================== */
// ドワーフのアイコン：坑道の中（ゲームと同じ色・ランプの光・はしご・鉱石）に、ツルハシをかまえた1人をまん中に描く。案は tools/dwarf-icon-mockup.html の4
const DWARF_ART = (() => {
  try {
    const o = document.createElement('canvas'); o.width = o.height = 22; const c = o.getContext('2d');
    c.fillStyle = '#1a120e'; c.fillRect(0, 0, 22, 22);
    const lg = c.createRadialGradient(11, 12, 1, 11, 12, 15); lg.addColorStop(0, 'rgba(242,165,65,.5)'); lg.addColorStop(1, 'rgba(242,165,65,0)'); c.fillStyle = lg; c.fillRect(0, 0, 22, 22);
    c.fillStyle = '#7a5a32'; c.fillRect(18, 0, 1, 18); c.fillRect(21, 0, 1, 18); for (let y = 1; y < 18; y += 4) c.fillRect(18, y, 4, 1);
    c.fillStyle = '#3a2a20'; c.fillRect(0, 18, 22, 2); c.fillStyle = '#4a3a30'; c.fillRect(0, 20, 22, 2);
    [[2, 16, '#ffd23a'], [4, 17, '#e6eef6'], [17, 16, '#e8843a']].forEach(([x, y, col]) => { c.fillStyle = col; c.fillRect(x, y, 2, 2); });
    sprite(c, 10, 18, 0, false, false); digPick(c, 10, 18, false);
    return o.toDataURL('image/png');
  } catch (e) { return ''; }
})();
// いっちょあがり！のアイコン（3Dの絵を描くまでのかわり。描いたらラーメンの絵になる）
const ICH_ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#fdebd3"/><ellipse cx="32" cy="27" rx="24" ry="8" fill="#d99a3f"/><path d="M8 27h48c-1.5 14-12 23-24 23S9.5 41 8 27z" fill="#d8402a"/><path d="M12 35h40M14 41h36" stroke="#fff" stroke-width="2" stroke-dasharray="4 3" opacity=".7"/><path d="M18 27c3-3 5 3 8 0s5 3 8 0 5 3 8 0" fill="none" stroke="#f3cf5a" stroke-width="2.5"/><circle cx="40" cy="25" r="4" fill="#e79a8b"/></svg>');
const GAMES = [
  { id: 'dwarf', n: 'ドワーフ', sub: '深掘り<br>チキンレース', ppl: '2〜4人', time: '約5分', ok: true, min: 1, max: 4, cls: 'gi-dwarf', icon: '<img class="gi-img gi-pxl" src="' + DWARF_ART + '" alt="">' },
  { id: 'trapper', n: 'チュンチュン大作戦', short: 'チュンチュン', sub: '罠士 VS 鳥3羽<br>1対3のすごろく', ppl: '1〜4人', time: '約10分', ok: true, min: 1, max: 4, cls: 'gi-trap', icon: TRAP_ICON },
  { id: 'bingo', n: 'ビンゴ大会', short: 'ビンゴ', sub: '部屋主が回して<br>みんなで穴あけ', ppl: '2〜8人', time: '約15分', ok: true, min: 2, max: TABLE_MAX, cls: 'gi-bingo', icon: BINGO_ICON },
  { id: 'reversi', n: 'リバーシ', sub: 'はさんで<br>ひっくり返す', ppl: '1〜2人', time: '約10分', ok: true, min: 1, max: 2, cls: 'gi-rev', icon: '<img class="gi-img" src="' + ICON_ART.reversi + '" alt="">' },
  { id: 'shogi', n: '将棋', sub: '玉を詰ませたら<br>勝ち', ppl: '1〜2人', time: '約30分', ok: true, min: 1, max: 2, cls: 'gi-shogi', icon: '<img class="gi-img" src="' + ICON_ART.shogi + '" alt="">' },
  { id: 'chess', n: 'チェス', sub: 'キングを<br>追いつめる', ppl: '1〜2人', time: '約30分', ok: true, min: 1, max: 2, cls: 'gi-chs', icon: '<img class="gi-img" src="' + ICON_ART.chess + '" alt="">' },
  { id: 'daifugo', n: '大富豪', sub: '強いカードを出して<br>先に上がる', ppl: '1〜8人', time: '約20分', ok: true, min: 1, max: TABLE_MAX, cls: 'gi-dfg', icon: '<img class="gi-img" src="' + ICON_ART.daifugo + '" alt="">' },
  { id: 'babanuki', n: 'ババ抜き', sub: 'ジョーカーを<br>最後まで持たない', ppl: '1〜8人', time: '約10分', ok: true, min: 1, max: TABLE_MAX, cls: 'gi-old', icon: '<img class="gi-img" src="' + ICON_ART.babanuki + '" alt="">' },
  { id: 'tower', n: 'ぐらぐらタワー', sub: '順番に積んで<br>くずしたら負け', ppl: '1〜8人', time: '約5分', ok: true, min: 1, max: TABLE_MAX, cls: 'gi-tower', icon: '<img class="gi-img" src="' + ICON_ART.tower + '" alt="">' },
  { id: 'bomb', n: 'ばくだんパス', sub: 'お題に答えて<br>爆弾を次の人へ', ppl: '1〜8人', time: '約5分', ok: true, min: 1, max: TABLE_MAX, cls: 'gi-bomb', icon: '<img class="gi-img" src="' + ICON_ART.bomb + '" alt="">' },
  { id: 'boxing', n: 'ガツンとロボ', sub: '右・左・下の<br>読みあい', ppl: '1〜8人', time: '約10分', ok: true, min: 1, max: TABLE_MAX, cls: 'gi-box', icon: '<img class="gi-img" src="' + ICON_ART.boxing + '" alt="">' },
  { id: 'icho', n: 'いっちょあがり！', short: 'いっちょあがり', sub: '冷蔵庫にためて<br>町中華をつくる', ppl: '1〜4人', time: '約10分', ok: false, min: 1, max: 4, cls: 'gi-icho', icon: '<img class="gi-img" src="' + ICH_ICON + '" alt="">' },
  { id: 'wordwolf', n: 'ワードウルフ', sub: 'ひとりだけ<br>ちがうお題', ppl: '3〜8人', time: '約5分', ok: false, min: 3, max: TABLE_MAX, cls: 'gi-ww', icon: '<img class="gi-img" src="' + ICON_ART.wordwolf + '" alt="">' },
  { id: 'alchemy', n: '月夜の錬金市場', short: '錬金市場', sub: '昼に薬を作り<br>夜にいっせいに売る', ppl: '1〜4人', time: '約30分', ok: false, min: 1, max: 4, cls: 'gi-alm', icon: '<svg viewBox="0 0 40 48" aria-hidden="true"><rect x="14" y="2" width="12" height="5" rx="2" fill="#c9975a"/><path d="M16 7h8v8.5a15 15 0 1 1-8 0z" fill="#fff"/><path d="M5.6 28a14.6 14.6 0 0 0 28.8 0z" fill="#2fa37a"/></svg>' },
];
// チケットの「むずかしさ」（3段階）
const GAME_LV = { icho: 2, boxing: 1, babanuki: 1, bingo: 1, bomb: 1, tower: 1, wordwolf: 2, dwarf: 2, reversi: 2, daifugo: 2, trapper: 3, shogi: 3, chess: 3, alchemy: 3 };
const gameById = id => GAMES.find(g => g.id === id && g.ok) || GAMES[0];
// ゲーム選択の引き出しのジャンル。'wolf' はまだ遊べない（じゅんび中の枠）
const GENRES = [['定番', ['daifugo', 'babanuki', 'reversi', 'shogi', 'chess', 'bingo']], ['みんなでワイワイ', ['dwarf', 'trapper', 'tower', 'boxing', 'bomb']]]; // いっちょあがり！はいま非表示（もどすときは GAMES の ok と、ここに 'icho'）
const SOON = { wolf: '人狼' };
// 選んでいるゲームは端末ごと（部屋主と画面は合わせない）。まだ選んでいなければ卓の前のゲーム
const hubScroll = {}; // 引き出しの横スクロールの位置（描き直しても動かないように）
let hubSel = null, hubSheet = 0; // hubSheet：引き出し 0=閉じている 1=今あけた（動かす） 2=あいている
const hubPick = d => { const g = local ? localGame : hubSel || (d && d.game) || 'dwarf', x = GAMES.find(o => o.id === g); return x && x.ok ? g : 'dwarf'; }; // 非表示のゲームはドワーフにもどす
let localN = 2, localGame = 'dwarf';
function localHubDoc() { return { host: 'h0', players: Array.from({ length: localN }, (_, i) => 'h' + i), requests: [], denied: [], game: localGame, openedAt: Date.now() }; }
const avaTxt = id => id === NPC ? 'コ' : local ? String(pIndex(id) + 1) : nameOf(id).slice(0, 1);
// スタート：半券をちぎってから進む
function tear(then) {
  const t = document.querySelector('.ticket');
  let reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  if (!t || reduce || t.classList.contains('torn')) { then(); return; }
  t.classList.add('torn'); SFX.play('tear'); if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) { }
  setTimeout(then, 700);
}
function pickGame(id) {
  if (local) localGame = id; else hubSel = id;
  hubSheet = 0; render();
}
const hubDrawer = v => { hubSheet = v ? 1 : 0; render(); };
// 同じメンバーのまま、ゲーム選択（ロビー）にもどした卓
const lobbyFrom = d => ({ v: 6, status: 'lobby', host: d.host, players: d.players.filter(p => p !== NPC), requests: [], denied: [], openedAt: Date.now(), game: d.game || 'dwarf', nicks: d.nicks || {}, updated: Date.now() });
function backToHub() {
  if (local) { doc = null; tableId = null; render(); return; }
  withLease(d => d && d.status === 'over' && d.host === me ? lobbyFrom(d) : null);
}
function startLocal() {
  tear(() => { tableId = 'LOCAL'; const hs = Array.from({ length: localN }, (_, i) => 'p' + (i + 1)); doc = newGameFor(localGame, hs, 'p1'); if (localGame === 'dwarf') doc = autoLocal(doc); render(); });
}
function hubHead(right, back, help) {
  return h('div', { class: 'hub-head' }, right, h('span', { style: 'flex:1' }),
    help ? h('button', { class: 'hub-ib', 'aria-label': '遊びかたとコインのリンク', onclick: help }, '?') : null,
    h('button', { class: 'hub-ib', 'aria-label': '設定', onclick: openSettings, svg: ICON.gear }),
    back ? h('button', { class: 'hub-ib', 'aria-label': '卓から出る', onclick: back, svg: ICON.back }) : null);
}
function ticketEl(g, d) {
  const art = h('div', { class: 'tk-art' });
  if (g.id === 'dwarf') { art.classList.add('tk-css'); art.style.position = 'relative'; art.append(h('img', { class: 'tka-cover tka-pxl', src: DWARF_ART, alt: '' })); } // アイコンと同じ絵
  if (BD_TITLE[g.id]) bdTicketArt(g.id, art);
  if (g.id === 'trapper') { art.classList.add('tk-css'); art.style.position = 'relative'; art.style.background = '#8fd0f8'; art.append(h('img', { class: 'tka-cover', src: ICON_ART.trapperTk, alt: '' })); }
  return h('div', { class: 'ticket', style: swayPhase(), role: 'group', 'aria-label': `えらんだゲーム：${g.n}` },
    h('div', { class: 'tk-top' }, art,
      h('div', { class: 'tk-row' }, h('div', { class: 'tk-l' }, h('span', { class: 'tk-admit' }, 'ADMIT ・ 入場券'), h('span', { class: 'tk-name' + (g.n.length > 6 ? ' long' : '') }, g.n)))), // 右の説明文（フレーバー）は出さない（2026-11-14）
    h('div', { class: 'tk-perf' }),
    h('div', { class: 'tk-stub' },
      h('span', null, h('small', null, '人数'), h('b', null, g.ppl)),
      h('span', null, h('small', null, '時間'), h('b', null, g.time)),
      h('span', null, h('small', null, 'むずかしさ'), h('b', { 'aria-label': `3段階の${GAME_LV[g.id] || 2}` }, '★'.repeat(GAME_LV[g.id] || 2) + '☆'.repeat(3 - (GAME_LV[g.id] || 2))))));
}
// 部屋主のOKを待つ画面：自分の名前が書かれた入場券を、部屋主がチェックしている
let admitAt = 0;
// チケットのゆれは時計に合わせる（画面を描き直しても、ゆれが最初にもどってガクッとしないように）
const swayPhase = () => `animation-delay:-${Date.now() % 3200}ms`;
// 卓につながるまで：スマホがコインに「ピッ」とさわって波紋が広がる（案は tools/loading-mockup.html の4）
// 動きは時計に合わせる（描き直しで最初にもどらないように）
// 早くつながっても、最低2秒は見せる（一瞬で切りかわると何が起きたかわからない）
const BOOT_MS = 2000; let bootShownAt = 0, bootT = 0;
function bootHold() {
  const r = BOOT_MS - (Date.now() - bootShownAt); if (!bootShownAt || r <= 0) return false;
  clearTimeout(bootT); bootT = setTimeout(render, r + 20); return true;
}
function viewBoot() {
  if (!bootShownAt) { bootShownAt = Date.now(); SFX.play('pi'); }
  const art = h('div', { class: 'boot-art', 'aria-hidden': 'true', style: `--bt:-${(Date.now() % 1800) / 1000}s` },
    h('div', { class: 'boot-ph' }), h('span', { class: 'boot-pi' }, 'ピッ'), h('div', { class: 'boot-ring' }), h('div', { class: 'boot-ring r2' }), h('div', { class: 'boot-coin' }));
  return h('div', { class: 'hub-wrap boot-wrap' }, hubHead(h('span', { class: 'hub-meta' }, `招待コード ${tableId || bootId}`), leaveTable),
    h('div', { class: 'wait boot' }, art, h('div', { class: 'wait-msg', role: 'status' }, 'よみこみちゅう', h('span', { class: 'wait-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')))));
}
function viewWait(d, left, ok) {
  const req = (d.requests || []).includes(me), den = (d.denied || []).includes(me), full = d.players.length >= TABLE_MAX, hostName = (d.nicks || {})[d.host] || nameOf(d.host);
  const st = ok ? 'ok' : den ? 'no' : req ? 'wait' : !left ? 'closed' : full ? 'full' : 'wait';
  const dots = h('span', { class: 'wait-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const msg = { ok: '入場OK！', wait: [`${hostName}が きみの名前を `, h('span', { class: 'nw' }, 'チェック中', dots)], no: '今回は 入場できませんでした', closed: '受付は もう終わっています', full: `満員です（${TABLE_MAX}人）` }[st];
  const sub = { ok: 'ロビーに入ります', wait: 'OKが出たら、自動でロビーに入ります', no: '', closed: `${hostName}に 受付をのばしてもらってね`, full: '' }[st];
  return h('div', { class: 'hub-wrap' }, hubHead(h('span', { class: 'hub-meta' }, `招待コード ${tableId || bootId}`), leaveTable),
    h('div', { class: 'wait ' + st },
      h('div', { class: 'wait-tk', style: swayPhase() }, h('div', { class: 'wait-top' }, h('span', { class: 'tk-admit' }, 'ADMIT ・ 入場券'), h('b', null, myNick || 'ゲスト')),
        h('div', { class: 'tk-perf' }), h('div', { class: 'wait-stub' }, h('small', null, '招待コード'), h('b', null, tableId)),
        st === 'ok' ? h('i', { class: 'wait-stamp' }, 'OK') : null),
      h('div', { class: 'wait-msg', role: 'status' }, msg),
      sub ? h('div', { class: 'wait-sub' }, sub) : null),
    st === 'ok' ? null : h('button', { class: 'pill wait-x', onclick: leaveTable }, st === 'wait' ? 'やめる' : 'ホームにもどる'));
}
function viewHub() {
  const L = local, d = L ? localHubDoc() : doc;
  const host = L || d.host === me, member = L || d.players.includes(me);
  const pick = gameById(hubPick(d));
  const left = L ? 0 : Math.max(0, OPEN_MS - (Date.now() - d.openedAt));
  // まだメンバーでない人は、部屋主がOKするまで待つ画面。OKが出たら「入場OK！」を少し見せてからロビーへ
  if (!L && !member) return viewWait(d, left);
  if (!L && admitAt && Date.now() - admitAt < 1100) { setTimeout(() => { if (doc && doc.status === 'lobby') render(); }, 1150); return viewWait(d, left, true); }
  const timer = L ? h('span', { class: 'hub-meta' }, '1台で遊ぶ') : h('span', { class: 'hub-meta', id: 'lobbyTimer' }, `招待コード ${tableId} ・ ` + (left ? `あと${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}` : '受付終了'));
  const help = () => {
    const foot = [!L && host ? h('details', { class: 'card' }, h('summary', null, 'コインに書き込むリンク'), h('div', { class: 'linkbox' }, shareBase() + '#' + tableId),
      h('p', { class: 'cap', style: 'margin:8px 0 0;font-size:12px' }, window.claude ? 'NFCシールにこのリンクを書き込むと、かざすだけでこの卓に入れます。今はページを共有された人だけが入れます。' : 'NFCコインにこのリンクを書き込むと、かざすだけでこの卓に入れます。')) : null,
      h('div', { class: 'cap', style: 'text-align:center' }, `PITOPA ${VERSION}` + (L && !connectErr ? ' ・ オンラインにつながっていないので、1台で回して遊べます' : ''))];
    openRules(pick.id, foot);
  };
  const ext = !L && host ? h('button', { class: 'hub-ext', 'aria-label': '受付を5分のばす', onclick: extend }, '＋5分') : null;
  const root = h('div', { class: 'hub-wrap' }, hubHead(h('span', { class: 'hub-timer' }, timer, ext), L ? null : leaveTable));
  if (L && connectErr) root.append(h('div', { class: 'hub-note warn' }, h('span', null, 'オンラインにつながりませんでした', h('br'), h('small', null, `理由：${connectErr}`)), h('button', { class: 'pill on', onclick: () => location.reload() }, 'もう一度')));

  // メンバー
  const row = h('div', { class: 'hub-members' + (!L && d.players.length > 4 ? ' many' : '') });
  if (L) {
    row.append(h('span', { class: 'hub-lab' }, '人数'), h('div', { class: 'seg' }, [1, 2, 3, 4].map(n =>
      h('button', { class: n === localN ? 'on' : '', 'aria-pressed': String(n === localN), onclick: () => { localN = n; render(); } }, n === 1 ? 'ひとり' : n + '人'))));
  } else {
    // 部屋主は、ほかの人のアイコンをタップで卓から外せる（名前を変えるのは右上の設定から）
    d.players.forEach(id => { const mine = id === me, kickable = host && !mine;
      row.append(h(kickable ? 'button' : 'span', { class: 'ava' + (mine ? ' me' : ''), title: nameOf(id) + (id === d.host ? '（部屋主）' : ''),
        'aria-label': kickable ? `${nameOf(id)}（タップで卓から外す）` : null,
        onclick: kickable ? () => bdConfirm(`${nameOf(id)}を 卓から外しますか？`, '外す', () => kick(id)) : null }, avaTxt(id), id === d.host ? h('i', { class: 'crown', 'aria-hidden': 'true' }) : null)); });
    if (d.players.length === 1 && pick.id !== 'bingo') row.append(h('span', { class: 'ava ghost', title: 'コンピュータ（1人なら参加）' }, 'コ'));
    row.append(h('span', { class: 'hub-names' }, d.players.map(nameOf).join('・')));
  }
  root.append(row);
  if (!L) (d.requests || []).forEach(id => root.append(h('div', { class: 'hub-req' },
    h('span', { class: 'ava sm' }, avaTxt(id)), h('span', { class: 't' }, h('b', null, nameOf(id)), ' が参加希望'),
    host ? [h('button', { class: 'pill on', onclick: () => answer(id, true) }, '入れる'), h('button', { class: 'pill', onclick: () => answer(id, false) }, '断る')] : h('span', { class: 'hub-meta' }, '確認中'))));

  // 見出し
  root.append(h('div', { class: 'hub-title' }, h('span', { role: 'heading', 'aria-level': '1' }, 'なにであそぶ？')));

  // チケット
  root.append(h('div', { class: 'tk-stage' }, ticketEl(pick, d)));

  // ほかのゲーム：ふだんは1行。タップで下から引き出し（ジャンルごと）
  const icon = g => h('span', { class: 'gi-ic ' + g.cls, svg: g.icon });
  root.append(h('button', { class: 'hub-bar', 'aria-label': 'ほかのゲームを見る', onclick: () => hubDrawer(true) },
    h('span', { class: 'hub-stack' }, GAMES.filter(g => g.ok && g.id !== pick.id).slice(0, 4).map(icon)),
    h('b', null, 'ほかのであそぶ'), h('small', null, `${GAMES.filter(g => g.ok).length}個のゲーム`), h('i', { svg: ICON.up })));
  if (hubSheet) {
    const sh = h('div', { class: 'gsheet' + (hubSheet === 1 ? '' : ' on'), onclick: e => { if (e.target === e.currentTarget) hubDrawer(false); } },
      h('div', { class: 'gsheet-in', role: 'dialog', 'aria-label': 'ゲームを選ぶ' }, h('i', { class: 'gsheet-grab' }),
        h('div', { class: 'gsheet-h' }, h('button', { class: 'gsheet-x', 'aria-label': '閉じる', onclick: () => hubDrawer(false), svg: ICON.close })),
        GENRES.map(([name, ids]) => h('div', { class: 'gsheet-gen' }, h('span', { class: 'gsheet-gl' }, name), h('div', { class: 'gsheet-row', onscroll: e => { hubScroll[name] = e.currentTarget.scrollLeft; } }, ids.map(id => {
          if (SOON[id]) return h('button', { class: 'gi soon', 'aria-label': `${SOON[id]}（じゅんび中）`, onclick: () => toast(`${SOON[id]}は じゅんび中です`) }, h('span', { class: 'gi-ic gi-secret' }, SOON[id]), h('span', { class: 'gi-t' }, 'じゅんび中'));
          const g = gameById(id), sel = g.id === pick.id;
          return h('button', { class: 'gi' + (sel ? ' sel' : ''), 'aria-label': g.n, 'aria-pressed': String(sel), onclick: () => pickGame(g.id) }, icon(g), h('span', { class: 'gi-t' }, g.short || g.n));
        }))))));
    root.append(sh);
    requestAnimationFrame(() => sh.querySelectorAll('.gsheet-row').forEach((r, i) => { r.scrollLeft = hubScroll[GENRES[i][0]] || 0; }));
    if (hubSheet === 1) { hubSheet = 2; requestAnimationFrame(() => requestAnimationFrame(() => sh.classList.add('on'))); }
  }

  // スタート（人数がゲームに合わないときは押せない）
  const foot = h('div', { class: 'hub-foot' }), cnt = L ? localN : d.players.length, ok = fits(pick, cnt);
  // 遊びかたは「チケットをきる」の右の豆電球
  const tip = h('button', { class: 'hub-tip', 'aria-label': `${pick.n}の遊びかた`, onclick: help, svg: ICON.bulb });
  // ゲストもゲームを見て回れるが、チケットをきれるのは部屋主だけ（ボタンはグレー）
  foot.append(h('div', { class: 'hub-gorow' }, h('button', { class: 'hub-go', disabled: !host || !ok, onclick: () => L ? startLocal() : tear(() => { startGame(); setTimeout(() => { if (doc && doc.status === 'lobby') render(); }, 3000); }) }, 'チケットをきる'), tip));
  const hostName = L ? 'プレイヤー1' : nameOf(d.host);
  foot.append(h('span', { class: 'hub-meta c' + (ok || !host ? '' : ' ng') }, host ? hubFootMsg(pick, cnt, hostName) : `チケットは${hostName}がきります\n（遊ぶゲームも${hostName}が選びます）`));
  root.append(foot);
  return root;
}
// （ひと言）は2行目に回す。いつも2行までにして、チケットの位置がゲームによって動かないようにする
const hubFootMsg = (g, n, hostName) => hubFootText(g, n, hostName).replace('（', '\n（');
function hubFootText(g, n, hostName) {
  if (!fits(g, n)) {
    if (DUEL[g.id]) return `${g.n}は2人で遊ぶゲームです（いま${n}人）`;
    if (n < g.min) return g.id === 'bingo' ? `${g.n}は${g.min}人から（部屋主が回す係になります）` : `${g.n}は${g.min}人から遊べます`;
    return `${g.n}は${g.max}人までです（いま${n}人）`;
  }
  // どのゲームも「○人で△をはじめます（ひと言）」の形
  const note = g.id === 'bingo' ? `回す係は${hostName}`
    : g.id === 'trapper' ? (n < 4 ? '足りない席はコンピュータ' : '')
    : g.id === 'bomb' || g.id === 'tower' ? (n < 3 ? 'コンピュータも入ります' : '')
    : g.id === 'boxing' ? (n !== 4 && n !== 8 ? 'コンピュータも入ります' : '')
    : g.id === 'alchemy' || g.id === 'icho' ? (n < 4 ? '足りない席はコンピュータ' : '')
    : CARDG[g.id] ? (n < 3 ? 'コンピュータも入ります' : '')
    : n === 1 ? '相手はコンピュータ' : '';
  return `${n}人で${g.n}をはじめます${note ? `（${note}）` : ''}`;
}
function viewNick() {
  const first = !myNick;
  const prefill = myNick || (names[me] || '').slice(0, 10);
  const inp = h('input', { id: 'nickIn', maxlength: '10', value: prefill, placeholder: 'たとえば：ハル', autocomplete: 'nickname', 'aria-label': 'ニックネーム', enterkeyhint: 'done' });
  const submit = e => {
    e.preventDefault();
    const v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 10);
    if (!v) { toast('ニックネームを入れてね'); inp.focus(); return; }
    saveNick(v); nickGate = false;
    if (doc) { syncNick(); if (doc.status === 'lobby' && !doc.players.includes(me) && !(doc.requests || []).includes(me) && !(doc.denied || []).includes(me)) requestJoin(); }
    render();
  };
  const root = h('div', { class: 'hub-wrap' }, hubHead(h('span', { class: 'hub-meta' }, `招待コード ${tableId || bootId}`), first ? leaveTable : () => { nickGate = false; render(); }),
    h('div', { class: 'hub-hello' }, h('span', { role: 'heading', 'aria-level': '1' }, first ? 'ようこそ！' : 'なまえを変える'), h('span', { class: 'hub-meta' }, 'みんなの画面に出るニックネームを入れてね（10文字まで）')),
    h('form', { class: 'hub-card', onsubmit: submit }, h('label', { class: 'hub-lab', for: 'nickIn' }, 'ニックネーム'), h('div', { class: 'hub-field' }, inp),
      h('button', { class: 'hub-go', type: 'submit' }, first ? '入場する' : 'これにする')),
    h('span', { class: 'hub-meta c' }, 'この端末に覚えておくので、次からは聞きません'));
  setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) { } }, 50);
  return root;
}
function viewHome() {
  if (ready && local) return viewHub();
  const root = h('div', { class: 'hub-wrap' }, hubHead(null),
    h('div', { class: 'hub-hello' }, h('span', { role: 'heading', 'aria-level': '1' }, 'ピッとかざして、', h('br'), 'パッと集まる。'), h('span', { class: 'hub-meta' }, '1枚のコインをみんなで回して、スマホをかざすと同じ卓に集まれます')));
  if (!ready) root.append(h('div', { class: 'hub-note c' }, '準備しています…'));
  else {
    const inp = h('input', { id: 'codeIn', maxlength: '8', placeholder: '招待コード', autocomplete: 'off', 'aria-label': '招待コード' });
    root.append(h('div', { class: 'hub-card' }, h('span', { class: 'hub-lab' }, 'コインがまだないとき'),
      h('button', { class: 'hub-go', onclick: () => openTable(genId()) }, 'テスト用の卓を作る'),
      h('form', { class: 'hub-field', onsubmit: e => { e.preventDefault(); const v = inp.value.trim().toUpperCase(); if (!/^[A-Z0-9]{4,8}$/.test(v)) { toast('招待コードは英数字4〜8文字です'); return; } openTable(v); } },
        inp, h('button', { class: 'pill on', type: 'submit' }, '入る'))));
  }
  root.append(h('span', { class: 'hub-meta c' }, `PITOPA ${VERSION}`));
  return root;
}
function viewOver() {
  const g = doc;
  const rows = g.players.map(id => ({ id, s: score(g, id) })).sort((x, y) => y.s - x.s);
  const best = rows[0].s, winners = rows.filter(r => r.s === best);
  const bar = h('div', { class: 'bar' }, h('div', { class: 'ttl' }, h('b', null, 'ドワーフ'), h('span', null, `${local ? '1台で遊ぶ' : '招待コード ' + tableId} ・ 5回の探検が終わった`)));
  // 鉱石の山くらべ：地上でひとりずつ、探検ごとに持ち帰った鉱石が足もとに積み上がる（マグマの回は赤くチカッ）→ 高い山の人がぴょんぴょん
  // 動きはこのゲームで1回（G.pileAt）。タップでとばせる。案は tools/dwarf-result-mockup.html の1（https://claude.ai/artifact/7HdW4Y8NMz8bcrx6Hzdwid）
  const art = document.createElement('canvas'), pts = rows.map(r => h('span', { class: 'pt' }, String(r.s)));
  const wtxt = h('b', null, winners.length > 1 ? '引き分け！' : `${nameOf(winners[0].id)}の勝ち！`);
  const win = h('div', { class: 'winbox piles' }, art);
  const list = h('div', { class: 'card ranks' }, rows.map((r, k) => h('div', { class: 'rank' + (r.s === best ? ' win' : '') },
    h('span', { class: 'no' }, String(rows.findIndex(x => x.s === r.s) + 1)),
    h('div', { class: 'mid' }, h('b', null, nameOf(r.id) + (g.gone[r.id] ? '（途中で抜けた）' : '')),
      h('div', { class: 'ores' }, (g.history || []).map(x => { const o = x.out[r.id]; return h('span', { class: o && o.result === 'magma' ? 'warn' : null }, o ? (o.result === 'home' ? `+${o.got}` : o.saved ? `マグマ(+${o.saved})` : 'マグマ') : '—'); }))),
    pts[k])));
  const wl = h('div', { class: 'pilewin' }, h('span', null, '持ち帰った鉱石の山'), wtxt);
  pileShow(art, g, rows, pts, wtxt);
  const btns = local || g.host === me
    ? h('div', { class: 'endbtns' }, h('button', { class: 'btn soft', onclick: backToHub }, 'ゲーム選択へ'), h('button', { class: 'btn', onclick: rematch }, 'もう一度'))
    : h('div', { class: 'card', style: 'text-align:center' }, '部屋主が次のゲームを選んでいます');
  return h('div', { class: 'gscreen over' }, bar, win, wl, list, btns);
}
// 探検のまとめの小さな山くらべ：前からある山の上に、今回の分（帰還・鉄カブトで残した分）が明るい色で積み上がる。マグマの人は山の上が赤くチカッ
// 動きは探検ごとに1回（G.sumKey）。案は tools/dwarf-summary-mockup.html の1
function sumPiles(cv, g) {
  const W = 132, H = 64; cv.width = W; cv.height = H;
  const key = dwGameKey(g) + ':' + g.exp, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (G.sumKey !== key) { G.sumKey = key; G.sumAt = still ? -1e9 : Date.now(); }
  const gain = id => { const o = g.out[id]; return !o ? 0 : o.result === 'home' ? o.got : o.saved || 0; };
  const ids = g.players, best = Math.max(1, ...ids.map(id => g.bank[id] || 0));
  const draw = () => {
    if (!cv.isConnected && cv._on) return; if (cv.isConnected) cv._on = true; else if ((cv._n = (cv._n || 0) + 1) > 30) return;
    const t = Date.now() - G.sumAt, a = Math.min(1, Math.max(0, (t - 250) / 900)), e = 1 - Math.pow(1 - a, 3), c = cv.getContext('2d');
    const P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
    const GY = H - 9, sk = c.createLinearGradient(0, 0, 0, GY); sk.addColorStop(0, '#0d1230'); sk.addColorStop(1, '#27284a'); c.fillStyle = sk; c.fillRect(0, 0, W, GY);
    for (let k = 0; k < 16; k++) P((k * 53) % W, (k * 29) % (GY - 12), 1, 1, '#c8d0ff');
    P(0, GY, W, 2, '#3f8a3a'); P(0, GY + 2, W, H - GY - 2, '#4a3020');
    const gap = W / ids.length, sc = Math.min(1, (GY - 22) / best);
    ids.forEach((id, k) => {
      const x0 = Math.round(gap * (k + .5)), hb = Math.round(((g.bank[id] || 0) - gain(id)) * sc), h = hb + Math.round(gain(id) * sc * e), hw0 = Math.min(12, gap / 2 - 2);
      for (let y = 0; y < h; y += 3) { const hw = 3 + (hw0 - 3) * (1 - y / Math.max(h, 1)); for (let xx = -12; xx <= 12; xx += 4) if (Math.abs(xx) + 2 <= hw) { const x = x0 + xx - 2 + ((y / 3) % 2) * 2, yy = GY - 3 - y, nw = y >= hb; P(x, yy, 4, 3, nw ? '#ffe27a' : (xx + y) % 3 ? '#c8923a' : '#d8b04a'); P(x, yy, 2, 1, nw ? '#fff6c8' : '#e8d08a'); } }
      const o = g.out[id]; if (o && o.result === 'magma' && t > 250 && t < 900 && Math.floor(t / 90) % 2) P(x0 - 8, GY - h - 3, 16, 3, '#c8321e');
      sprite(c, x0, GY - h, Math.max(0, pIndex(id)), id === NPC, false);
    });
    if (t < 1400) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
const PILE_STEP = 650, PILE_T0 = 400;
function pileShow(cv, g, rows, pts, wtxt) {
  const key = g.startedAt + ':' + g.players.join(','), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (G.pileAt == null || G.pileKey !== key) { G.pileKey = key; G.pileAt = still ? -1e9 : Date.now(); G.pileLayer = -1; G.pileCheer = false; }
  const n = (g.history || []).length, done = PILE_T0 + n * PILE_STEP + 500;
  const ids = g.players, best = rows[0].s;
  cv.addEventListener('pointerdown', () => { G.pileAt = Date.now() - done - 1; G.pileCheer = true; });
  let tries = 0;
  const frame = () => {
    // 画面から外れたら（描き直し・ゲーム選択へ）止める。出る前は少しだけ待つ
    if (!cv.isConnected) { if (cv._mounted || ++tries > 30) return; requestAnimationFrame(frame); return; }
    cv._mounted = true;
    const box = cv.parentElement, bw = box ? box.clientWidth : 0, bh = box ? box.clientHeight : 0;
    const H = 120, W = bw && bh ? Math.max(100, Math.min(260, Math.round(H * bw / bh))) : 160;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const t = Date.now() - G.pileAt;
    drawPiles(cv.getContext('2d'), g, W, H, Math.min(t, done + 100000), best);
    // 数字のカウントアップと音
    rows.forEach((r, k) => { const v = t >= done ? r.s : pileUpTo(g, r.id, t); if (pts[k].textContent !== String(v)) pts[k].textContent = v; });
    const layer = Math.floor((t - PILE_T0) / PILE_STEP);
    if (layer > G.pileLayer && layer < n && t < done) { G.pileLayer = layer; const some = ids.some(id => { const o = g.history[layer].out[id]; return o && o.result === 'home' && o.got > 0; }); if (window.SFX) SFX.play(some ? 'stone' : 'crack'); }
    wtxt.style.visibility = t >= done - 400 ? 'visible' : 'hidden';
    if (!G.pileCheer && t >= done - 400) { G.pileCheer = true; if (t < done + 300 && window.SFX) SFX.play('jackpot'); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
// その時刻までに積み上がった鉱石の数（探検ごとに PILE_STEP ずつ）
function pileUpTo(g, id, t) {
  let s = 0; (g.history || []).forEach((x, e) => { const te = PILE_T0 + e * PILE_STEP, o = x.out[id], v = !o ? 0 : o.result === 'home' ? o.got : o.saved || 0; if (t < te || !v) return; s += Math.round(v * Math.min(1, (t - te) / 400)); }); // マグマでも鉄カブトで持ち帰った分は積む
  return s;
}
function drawPiles(c, g, W, H, t, best) {
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const GY = H - 22, sk = c.createLinearGradient(0, 0, 0, GY); sk.addColorStop(0, '#0d1230'); sk.addColorStop(1, '#27284a'); c.fillStyle = sk; c.fillRect(0, 0, W, GY);
  const r = rng(7); for (let k = 0; k < W / 4; k++) { const x = r() * W | 0, y = r() * (GY - 30) | 0; R(x, y, 1, 1, (Math.floor(t / 300) + k) % 7 ? '#c8d0ff' : '#ffffff'); }
  R(0, GY, W, 3, '#3f8a3a'); R(0, GY + 3, W, 2, '#2c6a2a');
  const dg = c.createLinearGradient(0, GY + 5, 0, H); dg.addColorStop(0, '#5a3a24'); dg.addColorStop(1, '#2b1a10'); c.fillStyle = dg; c.fillRect(0, GY + 5, W, H - GY - 5);
  for (let k = 0; k < 30; k++) R((k * 37) % W, GY + 7 + (k * 13) % (H - GY - 8), 1, 1, '#6b4a30');
  const ore = (x, y, k) => { R(x, y, 4, 3, k % 3 ? '#e0a83a' : '#f2c84b'); R(x, y, 2, 1, '#fff0a8'); R(x + 3, y + 2, 1, 1, '#a86e1e'); };
  const ids = g.players, n = ids.length, gap = W / n, top = 26, sc = Math.min(1.1, (GY - top - 16) / Math.max(1, best));
  const end = PILE_T0 + (g.history || []).length * PILE_STEP + 100;
  ids.forEach((id, k) => {
    const x0 = Math.round(gap * (k + .5)), hw0 = Math.min(12, gap / 2 - 3);
    const hgt = Math.round(pileUpTo(g, id, t) * sc);
    (g.history || []).forEach((x, e) => { const te = PILE_T0 + e * PILE_STEP, o = x.out[id]; if (o && o.result === 'magma' && t >= te && t - te < 320) { R(x0 - 8, GY - hgt - 3, 16, 3, '#c8321e'); for (let q = 0; q < 16; q += 3) R(x0 - 8 + q, GY - hgt - 3 + ((q + Math.floor(t / 80)) % 2), 2, 1, '#ff9a3a'); } });
    for (let y = 0; y < hgt; y += 3) { const hw = 3 + (hw0 - 3) * (1 - y / Math.max(hgt, 1)); for (let xx = -12; xx <= 12; xx += 4) if (Math.abs(xx) + 2 <= hw) ore(x0 + xx - 2 + ((y / 3) % 2) * 2, GY - 3 - y, xx + y); }
    const winner = t >= end && pileUpTo(g, id, t + 1e6) === best && best > 0, jump = winner ? Math.abs(Math.sin((t - end) / 160)) * 5 : 0;
    sprite(c, x0, GY - hgt - jump, Math.max(0, pIndex(id)), id === NPC, false);
    if (winner) { const f = Math.floor(t / 90) % 4, col = ['#fff', '#f2c84b', '#ffdf7a', '#fff'][f], sx = x0 + 8, sy = GY - hgt - 20; R(sx, sy - 3 - f, 1, 2, col); R(sx, sy + 2 + f, 1, 2, col); R(sx - 3 - f, sy, 2, 1, col); R(sx + 2 + f, sy, 2, 1, col); }
  });
}
function viewOld() {
  return h('div', { class: 'stack' }, brand(leaveTable),
    h('div', { class: 'card stack-s', style: 'text-align:center' }, 'この卓は前のバージョンのゲームのままです。', h('button', { class: 'btn wide', onclick: regather }, '新しく集合する')));
}

/* =================== IN GAME =================== */
const G = {};
let boomFrom = 0, boomUntil = 0, boomBurnt = [], boomSides = [], boomWho = {}, boomLooks = {};
function viewGameShell() {
  G.bar = h('div', { class: 'bar' }); G.crew = h('div', { class: 'crew' });
  G.cv = h('canvas', { class: 'view', role: 'img', 'aria-label': '坑道の断面' });
  G.depth = h('div', { class: 'depthtag' }); G.heat = h('div', { class: 'heat', 'aria-hidden': 'true' }, h('i'));
  G.heatLbl = h('div', { class: 'heatlbl' }); G.boom = h('div', { class: 'boom', hidden: true }, 'ドボン！');
  G.jp = h('div', { class: 'jptag' });
  G.tip = h('div', { class: 'dw-tip', hidden: true, role: 'status' }, h('b', null, '進む？ 帰る？'), 'マグマゲージを見て、いい塩梅で持ち帰ろう！');
  G.fx = h('div', { class: 'fxtag', hidden: true, role: 'status' });
  G.board = h('div', { class: 'board' }, G.cv, G.depth, G.jp, G.heat, G.heatLbl, G.boom, G.fx, G.tip);
  G.board.addEventListener('pointerdown', introSkip);
  G.reveal = h('div', { class: 'reveal', hidden: true, role: 'status', onclick: hideReveal });
  G.sum = h('div', { class: 'reveal sum', hidden: true, role: 'status' });
  G.rad = h('div', { class: 'radov', hidden: true });
  G.board.append(G.sum, G.rad, G.reveal);
  G.panel = h('div', { class: 'tray' });
  try { if (window.ResizeObserver) { G.ro && G.ro.disconnect(); G.ro = new ResizeObserver(() => { if (doc && doc.status === 'playing' && G.cv && G.cv.isConnected && !digActive() && !introMoving()) drawShaft(G.cv, doc, { boom: Date.now() >= boomFrom && Date.now() < boomUntil, burnt: boomBurnt, sides: boomSides, who: boomWho, looks: boomLooks, me: local ? localActor() : me, vh: boardVh() }); }); G.ro.observe(G.board); } } catch (e) { }
  return h('div', { class: 'gscreen' }, G.bar, G.crew, G.board, G.panel);
}
function boardVh() {
  const r = G.board ? G.board.getBoundingClientRect() : null;
  return r && r.width > 0 && r.height > 0 ? Math.max(110, Math.min(700, Math.round(VW * r.height / r.width))) : VH;
}
// 盤の下のほうに出す ひとこと（ウォッカ・鉄カブトの当たり、ラスト探検）。delay ms 後に dur ms
function fxTag(text, cls, delay, dur = 1900) {
  clearTimeout(G.fxT0); clearTimeout(G.fxT1);
  G.fxT0 = setTimeout(() => { if (!G.fx || !G.fx.isConnected) return; G.fx.textContent = text; G.fx.className = 'fxtag ' + (cls || ''); G.fx.hidden = false;
    G.fxT1 = setTimeout(() => { if (G.fx) G.fx.hidden = true; }, dur); }, Math.max(0, delay));
}
function hideReveal() { if (G.reveal) G.reveal.hidden = true; if (G.board) G.board.classList.remove('revealing'); }
// ゲームが終わったら音（どのゲームも共通）
let sfxStatus = '';
function sfxOver() { const k = doc ? (doc.game || '') + ':' + doc.status : ''; if (sfxStatus.endsWith(':playing') && k.endsWith(':over')) SFX.play('win'); sfxStatus = k; }
function afterChange() {
  sfxOver();
  if (!doc) { render(); return; }
  if (isBoardDoc()) { if (BS.root && BS.root.isConnected && (doc.status === 'playing' || doc.status === 'over')) bdRender(); else render(); return; }
  if (isTrapDoc()) { if (TS.root && TS.root.isConnected && (doc.status === 'playing' || doc.status === 'over')) trRender(); else render(); return; }
  if (doc.status !== 'playing' || !G.cv || !G.cv.isConnected) { render(); return; }
  renderGame();
}
/* ---- 掘る演出：「せーの！」のあと、ツルハシを3回ふる（カツンごとに床のひびがのびる）→ パカッと割れて1段下に着地 ---- */
const SEENO_MS = 900, DIG_MS = 1600, CLIMB_MS = 1300;
const digActive = () => !!G.dig && Date.now() < G.dig.end;
const digEase = u => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
function digPx(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
function digPick(c, x, y, down) { // ツルハシ：上げている／ふりおろした の2コマ
  x = Math.round(x - 5); y = Math.round(y);
  if (!down) { digPx(c, x + 8, y - 12, 1, 6, '#8a5a32'); digPx(c, x + 6, y - 13, 5, 1, '#c9cdd6'); digPx(c, x + 6, y - 12, 1, 1, '#c9cdd6'); digPx(c, x + 10, y - 12, 1, 1, '#c9cdd6'); }
  else { digPx(c, x + 8, y - 6, 4, 1, '#8a5a32'); digPx(c, x + 11, y - 6, 1, 5, '#c9cdd6'); digPx(c, x + 10, y - 2, 1, 1, '#c9cdd6'); }
}
function drawDig(cv, a, now) {
  const u = Math.min(1, Math.max(0, (now - a.start) / DIG_MS)), vh = boardVh(), D = Math.max(1, a.end - a.start), p = (now - a.start) / D;
  const fall = !a.split && u > .68, depth = fall ? a.depth : a.depth - 1;
  // 今回帰る人は、はしごを登りきるまで地上に出さない
  const climbing = (a.leavers || []).length && p < .97, out = climbing ? Object.fromEntries(Object.entries(a.out || {}).filter(([id]) => !a.leavers.includes(id))) : a.out;
  drawShaft(cv, { ...a.from, out, depth, phase: 'dig', inside: [] }, { vh }); // 帰った人は地上に見せる
  const c = cv.getContext('2d'), scroll = Math.max(0, TOP + depth * LV - Math.round(vh * 0.62)), bottom = TOP + depth * LV;
  c.save(); c.translate(0, -scroll);
  const swing = u < .6, hit = Math.floor(u / .2), ph = (u / .2) % 1, down = swing && ph > .5;
  if (!fall && a.stay.length) { // ひび：中央から左右へ、カツンのたびにのびる
    const n = Math.floor(10 * Math.min(1, (Math.min(hit, 3) + (down ? (ph - .5) * 2 : 0)) / 3));
    let x = SX + SW / 2, y = bottom - 1;
    for (let i = 0; i < n; i++) { digPx(c, x, y, 1, 1, '#f2c84b'); digPx(c, SX + SW - (x - SX), y, 1, 1, '#f2c84b'); x -= 1.7; y += i % 2 ? 1 : -1; }
  }
  cv.style.transform = !swing && !fall && a.stay.length ? `translate(${(Math.random() - .5) * 2}px,0)` : '';
  const dy = fall ? -LV * (1 - digEase((u - .68) / .22)) : 0, squash = fall && u > .9 && u < .95 ? 1 : 0, meId = local ? null : me;
  // 公開のあとなので、鉄カブト・ウォッカはみんなの見た目に出す
  const looks = a.looks || {}, bags = a.bags || {}, gain = a.gain || {}, got = fall ? Math.min(1, Math.max(0, (u - .74) / .22)) : 0;
  a.stay.forEach((id, k) => { const x = SX + 8 + k * 8; sprite(c, x, bottom - 2 + dy + squash, pIndex(id), id === NPC, id === meId, looks[id], { bag: (bags[id] || 0) + Math.round((gain[id] || 0) * got) }); if (swing && a.stay.length) digPick(c, x, bottom - 2, down); });
  // 帰る人：はしごへ歩いて（〜18%）→ リュックを背負ってえっさえっさ登る（〜95%）
  const oldB = TOP + (a.depth - 1) * LV, lx = SX + SW - 7;
  if (climbing) (a.leavers || []).forEach((id, k) => {
    const x0 = SX + 8 + Math.max(0, (a.from.inside || []).indexOf(id)) * 8, w = Math.min(1, Math.max(0, p / .18)), cu = Math.min(1, Math.max(0, (p - .18) / .77));
    if (p < 0 || cu <= 0) sprite(c, x0 + (lx - x0) * w, oldB - 2, pIndex(id), id === NPC, id === meId, null, { bag: bags[id] || 0, step: p > 0 && Math.floor(now / 110) % 2 === 0 });
    else sprite(c, lx + k * 2, oldB - 2 - cu * (oldB - TOP + 1) + k * 6, pIndex(id), id === NPC, false, null, { bag: bags[id] || 0, climb: 1 + Math.floor(now / 130) + k });
  });
  // 鉱石が床からきらっと飛び出して、残った人のリュックへ
  if (fall && u < .98) { const n = Math.min(12, a.stay.reduce((s, id) => s + (gain[id] || 0), 0)), r = rng(5);
    for (let q = 0; q < n; q++) { const k = q % a.stay.length, v = Math.min(1, Math.max(0, (u - .7 - q * .012) / .22)); if (v <= 0 || v >= 1) continue;
      const tx = SX + 8 + k * 8 - 6, ty = bottom - 8, sx = SX + 8 + r() * 24, sy = bottom + 2; digPx(c, sx + (tx - sx) * v, sy + (ty - sy) * v - Math.sin(v * Math.PI) * (14 + r() * 8), 3, 2, q % 3 ? '#e0a83a' : '#f2c84b'); } }
  if (down && a.stay.length) { const r = rng(hit * 7 + 3), v = (ph - .5) * 2; for (let i = 0; i < 8; i++) { const vx = (r() - .5) * 40, vy = -20 - r() * 25; digPx(c, SX + SW / 2 + vx * v, bottom - 3 + vy * v + 60 * v * v, 1 + (r() < .3 ? 1 : 0), 1, r() < .25 ? '#ffd23a' : '#8a6a4a'); } }
  if (fall && u < .9) { const v = (u - .68) / .22, r = rng(9); for (let i = 0; i < 8; i++) digPx(c, SX + 4 + r() * (SW - 8), bottom - LV + 2 + v * v * 40 + r() * 4, 3, 2, '#5a4030'); }
  c.restore();
}
// 待っているあいだの気持ちの動き（汗・そわそわ・バンザイ）。ほかの動きがないときだけ、1秒に約6回だけ描き直す
setInterval(() => {
  if (!doc || doc.status !== 'playing' || !G.cv || !G.cv.isConnected || isTrapDoc() || isBoardDoc() || doc.game !== 'dwarf' && doc.game) return;
  const now = Date.now();
  if (digActive() || introMoving() || (now >= boomFrom && now < boomUntil)) return;
  if (doc.phase !== 'choose' && !(now < (G.jpUntil || 0))) return;
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) { }
  drawShaft(G.cv, doc, { banzai: now >= (G.jpFrom || 0) && now < (G.jpUntil || 0), me: local ? localActor() : me, vh: boardVh(), t: now });
}, 170);
function digLoop() {
  if (!G.dig || !G.cv || !G.cv.isConnected) return;
  if (Date.now() >= G.dig.end) { G.dig = null; G.cv.style.transform = ''; if (doc && doc.status === 'playing' && !isTrapDoc() && !isBoardDoc()) renderGame(); return; }
  drawDig(G.cv, G.dig, Date.now()); requestAnimationFrame(digLoop);
}
/* ---- 始まりの動き：画面の外からとことこ → ぴょんとツルハシをかまえる → 3回ふって入口の穴をあける → 「進む？帰る？」のふきだし。案は tools/dwarf-intro-mockup.html の1 ---- */
const IN_WALK = 1700, IN_READY = 450, IN_MOVE = IN_WALK + IN_READY + DIG_MS, IN_TIP = 3400;
const dwGameKey = g => g.startedAt || g.players.join();
// この端末でまだ見ていなくて、最初の探検のまだだれも掘っていないあいだ
const dwIntroDue = g => G.introAt !== dwGameKey(g) && g.exp === 1 && g.depth === 0 && g.phase === 'choose' && !g.reveal && !(g.history || []).length;
const introMoving = () => !!G.intro && Date.now() < G.intro.start + IN_MOVE;
const introTip = () => !!G.intro && !introMoving() && Date.now() < G.intro.start + IN_MOVE + IN_TIP;
function drawIntro(cv, g, now) {
  const p = now - G.intro.start, u = (p - IN_WALK - IN_READY) / DIG_MS, open = u > .68;
  drawShaft(cv, { ...g, inside: [], phase: 'dig' }, { vh: boardVh() });
  const c = cv.getContext('2d'), meId = local ? null : me, ids = g.inside, n = ids.length, gap = 120;
  if (!open) { // まだ穴があいていない地面。カツンのたびにひびがのびる
    digPx(c, SX, TOP - 3, SW, 4, '#4f8a3a'); digPx(c, SX, TOP + 1, SW, 1, '#2f5a26');
    if (u > 0) {
      const hit = Math.floor(u / .2), ph = (u / .2) % 1, k = Math.floor(10 * Math.min(1, (Math.min(hit, 3) + (u < .6 && ph > .5 ? (ph - .5) * 2 : 0)) / 3));
      let x = SX + SW / 2, y = TOP - 2;
      for (let i = 0; i < k; i++) { digPx(c, x, y, 1, 1, '#f2c84b'); digPx(c, SX + SW - (x - SX), y, 1, 1, '#f2c84b'); x -= 1.7; y += i % 2 ? 1 : -1; }
    }
  }
  const swing = u >= 0 && u < .6, ph = (u / .2) % 1, down = swing && ph > .5;
  G.cv.style.transform = u >= .6 && !open ? `translate(${(Math.random() - .5) * 2}px,0)` : '';
  ids.forEach((id, k) => {
    const j = n - 1 - k, xe = SX + 8 + k * 8, xs = -8 - j * 12, t = Math.min(1, Math.max(0, (p - j * gap) / (IN_WALK - (n - 1) * gap)));
    let x = xs + (xe - xs) * t, y = TOP - 3, up = false;
    if (t > 0 && t < 1) y -= Math.floor((p - j * gap) / 110) % 2; // とことこ
    if (p >= IN_WALK && u < 0) { const v = (p - IN_WALK) / IN_READY; if (v < .45) y -= Math.round(Math.sin(v / .45 * Math.PI) * 3); else up = true; }
    if (open) { const v = Math.min(1, (u - .68) / .25); y = TOP - 2 - Math.round(Math.sin(Math.PI * v) * 4); } // ぴょんと穴へ
    sprite(c, x, y, pIndex(id), id === NPC, id === meId);
    if (up || swing) digPick(c, x, y, down);
  });
  if (down) { const r = rng(Math.floor(u / .2) * 7 + 3), v = (ph - .5) * 2; for (let i = 0; i < 8; i++) { const vx = (r() - .5) * 40, vy = -20 - r() * 25; digPx(c, SX + SW / 2 + vx * v, TOP - 3 + vy * v + 60 * v * v, 1 + (r() < .3 ? 1 : 0), 1, r() < .25 ? '#ffd23a' : '#8a6a4a'); } }
  if (open && u < .9) { const v = (u - .68) / .22, r = rng(9); for (let i = 0; i < 8; i++) digPx(c, SX + 4 + r() * (SW - 8), TOP - 3 + v * v * 30 + r() * 4, 3, 2, '#5a4030'); }
}
function introLoop() {
  if (!G.intro || !G.cv || !G.cv.isConnected || !doc || doc.status !== 'playing' || isTrapDoc() || isBoardDoc()) return;
  if (!introMoving()) { G.cv.style.transform = ''; renderGame(); return; }
  drawIntro(G.cv, doc, Date.now()); requestAnimationFrame(introLoop);
}
// 動きのおわり・ふきだしのおわりに画面を合わせる
function introPlan() {
  clearTimeout(G.introT1); clearTimeout(G.introT2); if (!G.intro) return;
  const now = Date.now(), m = G.intro.start + IN_MOVE - now, e = m + IN_TIP;
  G.lockUntil = G.intro.start + IN_MOVE; clearTimeout(G.lockT);
  const sync = () => { if (!G.tip || !G.tip.isConnected) return; const on = introTip(); G.tip.hidden = !on; G.heat.classList.toggle('glow', on); if (!on && !introMoving()) G.intro = null; renderPanel(); };
  if (m > 0) G.introT1 = setTimeout(sync, m + 20); else sync();
  if (e > 0) G.introT2 = setTimeout(sync, e + 20);
}
// 盤をタップ：動きのあいだならふきだしまでとばす。ふきだしならとじる
function introSkip() {
  if (!G.intro) return;
  if (introMoving()) G.intro.start = Date.now() - IN_MOVE;
  else if (introTip()) G.intro.start = Date.now() - IN_MOVE - IN_TIP;
  else return;
  introPlan(); if (doc && G.cv && G.cv.isConnected) { G.cv.style.transform = ''; renderGame(); }
}
function renderGame() {
  const d = doc;
  if (G.intro && (d.exp !== 1 || d.depth !== 0 || d.reveal)) { G.intro = null; introPlan(); }
  if (dwIntroDue(d)) {
    G.introAt = dwGameKey(d);
    let reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
    G.intro = { start: Date.now() - (reduce ? IN_MOVE : 0) }; // 動きを減らす設定なら、ふきだしだけ
    introPlan(); if (!reduce) requestAnimationFrame(introLoop);
  }
  // 新しい結果が届いたら、掘る演出を始める
  // 目印は「ゲーム・探検・深さ」だけ。前は選んだ中身（picks）の文字列も入れていて、届くたびに並び順が変わると同じ結果でも「せーの！」がまた出ていた
  const rv = d.reveal, key = rv ? dwGameKey(d) + ':' + d.exp + ':' + rv.depth : '';
  // 掘る前の様子（ふつうは1つ前に届いた卓）。知らせがおくれて途中をとばしたときも、同じ探検を見ていたなら掘る演出を出す
  const L = G.lastDoc, seen = !!rv && !!L && dwGameKey(L) === dwGameKey(d) && L.exp === d.exp && L.depth < rv.depth;
  // 掘る前を見ていない結果（開き直した直後・古い卓が届いて前にもどったとき）は、「せーの！」も演出も出さずに覚えるだけ
  // 一度覚えた結果は二度と出さない（古い卓が届いて前にもどり、また新しい卓が届いたときに「せーの！」が2回出ないように）
  const shown = G.revKeys || (G.revKeys = new Set()), fresh = !!rv && !shown.has(key);
  if (fresh) { shown.add(key); lastRevealKey = key; }
  if (fresh && seen) {
    const from = L.phase === 'choose' && L.depth === rv.depth - 1 ? L : { ...L, depth: rv.depth - 1, phase: 'choose' };
    const stay = Object.values(rv.sides).flatMap(r => r.who);
    const burnt = [], bs = [], bw = {}; for (const sd in rv.sides) if (rv.sides[sd].magma) { burnt.push(...rv.sides[sd].who); bs.push(sd); rv.sides[sd].who.forEach(id => bw[id] = sd); }
    let reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
    // マグマ・分かれ道は、割れたところで止めて結果へ
    // 全員帰ったとき（だれも掘らない）も、はしごを登る動きだけは見せる（CLIMB_MS）
    const leavers = rv.leavers || [], split = burnt.length > 0 || !!rv.fork || !stay.length;
    const dig = from && !reduce ? (stay.length ? (split ? DIG_MS * .68 : DIG_MS) : leavers.length ? CLIMB_MS : 0) : 0;
    const t0 = Date.now(), after = dig ? SEENO_MS + dig : 0; G.revealAt = t0;
    const bags = { ...(from.bag || {}) }, gain = {}; stay.forEach(id => { if (!burnt.includes(id)) gain[id] = Math.max(0, (d.bag[id] || 0) - (bags[id] || 0)); });
    G.dig = dig ? { start: t0 + SEENO_MS, end: t0 + after, from, out: d.out, stay, depth: rv.depth, split, looks: rv.armed || {}, leavers, bags, gain } : null;
    boomLooks = rv.armed || {};
    // 演出のあいだと結果が出た直後は、ボタンを止める（連打が次の段の選択にならないように）
    G.lockUntil = t0 + after + 1000; clearTimeout(G.lockT); G.lockT = setTimeout(renderPanel, after + 1050);
    if (burnt.length) { boomFrom = t0 + after; boomUntil = boomFrom + 3500; boomBurnt = burnt; boomSides = bs; boomWho = bw; if (G.boom) G.boom.hidden = true; setTimeout(() => requestAnimationFrame(boomLoop), Math.max(0, after - 10)); }
    // 音：せーの！ → ツルハシで3回カツン → パカッ（マグマならドカン、大鉱脈ならキラキラ）
    SFX.play('seeno');
    if (dig && stay.length) { [.1, .3, .5].forEach(u => SFX.later('dig', SEENO_MS + DIG_MS * u)); if (!split) SFX.later('crack', SEENO_MS + DIG_MS * .68); }
    if (dig && leavers.length) [.3, .5, .7].forEach(u => SFX.later('tock', SEENO_MS + dig * u)); // はしごを登る足音
    if (burnt.length) { SFX.later('crack', after); SFX.later('boom', after + DB_SPLASH); SFX.later('sizzle', after + DB_SPLASH + 150); }
    // アイテムの当たり：鉄カブトで半分助かった（カーン）／ウォッカで2倍（ヒック）
    const arm = rv.armed || {}, saved = burnt.filter(id => arm[id] === 'helm'), drunk = Object.values(rv.sides).flatMap(r => r.magma ? [] : r.drunk || []);
    // ギリギリ セーフ！：帰ったすぐ次の段でマグマ（全員帰ったときは、掘らなかった次の段がマグマだったら種明かし）。いい判断を褒める
    const myId = local ? null : me, nextHot = rv.end === 'allhome' && d.next && !d.next.fork && d.next.main && d.next.main.magma;
    const safe = (burnt.length || nextHot) ? rv.leavers : [];
    const safeTxt = !safe.length ? '' : (nextHot ? 'じつは 次の段は マグマだった！ ' : '') + (safe.includes(myId) ? 'ギリギリ セーフ！ ナイス判断' : `${safe.map(nameOf).join('・')} ギリギリ セーフ！`);
    const at = burnt.length ? after + DB_SPLASH + 200 : Math.max(after, SEENO_MS) + 150; // 全員帰ったときは登りきってから
    if (saved.length) { SFX.later('block', after + DB_SPLASH + 40); fxTag([safeTxt, `カーン！ ${saved.map(nameOf).join('・')}は 鉄カブトで 半分 持ち帰り`].filter(Boolean).join('\n'), 'helm', at, 2600); }
    else if (safe.length) { SFX.later('ok', at); fxTag(safeTxt, 'safe', at, 2400); }
    else if (drunk.length) { SFX.later('eat', after + 80); fxTag(`ヒック！ ${drunk.map(nameOf).join('・')}は ウォッカで 鉱石 ×2`, 'vodka', after + 60); }
    else if (Object.values(rv.sides).some(r => r.jackpot)) { SFX.later('jackpot', after + 80); G.jpFrom = t0 + after; G.jpUntil = t0 + after + 2000; } // 大鉱脈：残った人がバンザイ
    if (Object.values(rv.sides).some(r => r.jackpot) && !burnt.length) {
      clearTimeout(renderGame.jt0); renderGame.jt0 = setTimeout(() => { if (!G.boom) return; G.boom.textContent = '大鉱脈！'; G.boom.className = 'boom gold'; G.boom.hidden = false; clearTimeout(renderGame.jt); renderGame.jt = setTimeout(() => { if (G.boom) G.boom.hidden = true; }, 2200); }, after);
    }
    showReveal(rv);
    if (G.dig) requestAnimationFrame(digLoop);
  }
  G.lastDoc = d;
  // ラスト探検：5回目の探検の始まりに、この端末で1回
  if (d.exp === EXPEDITIONS && d.depth === 0 && d.phase === 'choose' && !d.reveal && G.lastExp !== dwGameKey(d)) { G.lastExp = dwGameKey(d); SFX.play('start'); fxTag('ラスト探検！ 最後のチャンス', 'last', 200, 2400); }
  // 掘っているあいだは、上の数字やボタンは掘る前のまま見せる
  const anim = digActive() ? G.dig : null, g = anim ? anim.from : d;
  G.bar.replaceChildren(h('div', { class: 'ttl' }, h('b', null, 'ドワーフ'), h('span', null, `${local ? '1台で遊ぶ' : '招待コード ' + tableId} ・ 探検 ${g.exp} / ${EXPEDITIONS}`)),
    h('button', { class: 'ibtn', 'aria-label': '遊びかた', onclick: () => openRules('dwarf') }, '?'),
    h('button', { class: 'ibtn quit', 'aria-label': '中断してホームにもどる', onclick: confirmQuit }, '中断'));
  G.crew.style.setProperty('--n', g.players.length);
  const meId = local ? localActor() : me;
  G.prevBag = G.prevBag || {}; G.prevHome = G.prevHome || {};
  if (G.prevExp !== g.exp) { G.prevBag = {}; G.prevHome = {}; G.prevExp = g.exp; }
  G.crew.replaceChildren(...g.players.map(id => {
    const o = g.out[id], inside = g.inside.includes(id);
    let st = '', cls = '';
    if (g.gone[id]) st = '抜けた';
    else if (inside) { if (g.phase === 'choose') { st = g.choice[id] ? '決定 ✓' : '考え中…'; cls = g.choice[id] ? 'ok' : 'wait'; } else st = '坑道の中'; }
    else if (o) { st = o.result === 'home' ? `帰還 +${o.got}` : 'マグマ…'; cls = o.result === 'home' ? 'home' : 'wait'; }
    // 持ち帰った合計（＋いまリュックに入っている分）。増えた直後はぴょこっと動く
    const bag = inside ? g.bag[id] || 0 : 0, up = bag > (G.prevBag[id] || 0) || (o && o.result === 'home' && !G.prevHome[id]);
    return h('div', { class: 'chip' + (o && o.result === 'magma' ? ' burnt' : '') + (id === meId || (!local && id === me) ? ' me' : '') },
      face(id, 26), h('span', { class: 'nm' }, nameOf(id)), h('span', { class: 'sc' + (up ? ' bump' : '') }, score(g, id), bag ? h('small', null, `(+${bag})`) : null), h('span', { class: 'sub ' + cls }, st));
  }));
  g.players.forEach(id => { G.prevBag[id] = g.inside.includes(id) ? g.bag[id] || 0 : 0; G.prevHome[id] = !!(g.out[id] && g.out[id].result === 'home'); });
  const now = Date.now(), boom = !anim && now >= boomFrom && now < boomUntil;
  if (anim) drawDig(G.cv, anim, now);
  else if (introMoving()) drawIntro(G.cv, d, now);
  else drawShaft(G.cv, g, { banzai: now >= (G.jpFrom || 0) && now < (G.jpUntil || 0), boom, bt: boom ? now - boomFrom : null, burnt: boomBurnt, sides: boomSides, who: boomWho, looks: boomLooks, me: meId, vh: boardVh() });
  if (boom && now - boomFrom >= DB_SPLASH) { G.boom.textContent = boomSides.includes('main') || boomSides.length > 1 ? 'ドボン！' : (boomSides[0] === 'left' ? '左が' : '右が') + 'ドボン！'; G.boom.className = 'boom'; G.boom.hidden = false; } else if (G.boom.className === 'boom') G.boom.hidden = true;
  G.jp.textContent = `${g.exp === EXPEDITIONS ? 'ラスト探検 ・ ' : ''}大鉱脈チャンス ${Math.round(jackpotRate(g.exp) * 100)}%`;
  G.jp.classList.toggle('last', g.exp === EXPEDITIONS);
  if (boom) setTimeout(() => { if (Date.now() >= boomUntil && G.cv && G.cv.isConnected && doc) { drawShaft(G.cv, doc, { me: local ? localActor() : me, vh: boardVh() }); G.boom.hidden = true; } }, 3600);
  const p = Math.round(magmaRate(g.depth + 1) * 100);
  G.depth.textContent = `深さ ${g.depth}`;
  G.heat.firstChild.style.height = Math.min(100, p / 60 * 100) + '%';
  G.heatLbl.textContent = g.phase === 'choose' ? `次の段 マグマ ${p}%` : '';
  G.heatLbl.hidden = g.phase !== 'choose' || introMoving();
  G.tip.hidden = !introTip(); G.heat.classList.toggle('glow', introTip());
  renderPanel();
}
// 公開の合図は「せーの！」の文字だけ。中身（＋いくつ・帰還・マグマ）は上の席の数字と盤の「ドボン！」で見せる
function showReveal(rv) {
  const hot = Object.values(rv.sides).some(r => r.magma);
  G.reveal.className = 'reveal seeno' + (hot ? ' hot' : '');
  // 鉄カブト・ウォッカを使った人は、公開のときにみんなに見せる（レーダーは秘密のまま。帰った人の分はもどったので出ない）
  const used = Object.entries(rv.armed || {}).map(([id, k]) => h('span', { class: 'ruse' }, itemArt(k), `${nameOf(id)}：${k === 'helm' ? '鉄カブト' : 'ウォッカ'}`));
  G.reveal.replaceChildren(...[h('div', { class: 'rtitle' }, 'せーの！'), used.length ? h('div', { class: 'ruses' }, used) : null].filter(Boolean)); // replaceChildren に null をわたすと「null」の文字が出る
  G.reveal.hidden = false;
  clearTimeout(showReveal.t); showReveal.t = setTimeout(hideReveal, used.length ? 1500 : 1000);
}
function radarSheet(a) {
  const g = doc, used = g.radarSeen[a] === g.depth + 1;
  const art = '<svg width="110" height="110" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true"><rect x="11" y="2" width="2" height="20" fill="#1f4a3a"/><rect x="2" y="11" width="20" height="2" fill="#1f4a3a"/><rect x="7" y="3" width="10" height="1" fill="#3fcf8a"/><rect x="4" y="5" width="2" height="1" fill="#3fcf8a"/><rect x="18" y="5" width="2" height="1" fill="#3fcf8a"/><rect x="3" y="7" width="1" height="10" fill="#3fcf8a"/><rect x="20" y="7" width="1" height="10" fill="#3fcf8a"/><rect x="4" y="18" width="2" height="1" fill="#3fcf8a"/><rect x="18" y="18" width="2" height="1" fill="#3fcf8a"/><rect x="7" y="20" width="10" height="1" fill="#3fcf8a"/><rect x="8" y="8" width="8" height="1" fill="#2a8a5a"/><rect x="8" y="15" width="8" height="1" fill="#2a8a5a"/><rect x="7" y="9" width="1" height="6" fill="#2a8a5a"/><rect x="16" y="9" width="1" height="6" fill="#2a8a5a"/><rect x="13" y="6" width="1" height="1" fill="#9effc8"/><rect x="14" y="7" width="1" height="1" fill="#9effc8"/><rect x="15" y="8" width="1" height="1" fill="#9effc8"/><rect x="12" y="11" width="1" height="1" fill="#9effc8"/><rect x="16" y="15" width="2" height="2" fill="#f2c84b"/></svg>';
  const card = h('div', { class: 'bigcard' }, h('div', { class: 'tagrow' }, h('span', { class: 'tag' }, '道具'), h('span', { class: 'cap' }, '自分にだけ見える')),
    h('div', { class: 'art', svg: art }), h('div', { class: 'nm' }, 'レーダー'), h('div', { class: 'ds' }, '次に掘る段にマグマがあるかが分かる。1ゲームに1回だけ'));
  const body = [h('div', { class: 'cap', style: 'text-align:center;letter-spacing:.1em' }, used ? 'レーダーの反応' : 'レーダーを使いますか？'), card];
  if (used) body.push(radarMsg(g, a));
  return body;
}
function radarMsg(g, a) {
  const n = g.next, d = g.depth + 1;
  if (n.fork) return h('div', { class: 'radarmsg' + (n.left.magma || n.right.magma ? ' danger' : '') }, `深さ${d}の反応　左：`, h('b', null, n.left.magma ? 'マグマ' : '安全'), '　右：', h('b', null, n.right.magma ? 'マグマ' : '安全'), h('span', { class: 'cap' }, '顔に出さないように…'));
  return h('div', { class: 'radarmsg' + (n.main.magma ? ' danger' : '') }, `深さ${d}の反応：`, h('b', null, n.main.magma ? 'マグマあり！' : '安全'), h('span', { class: 'cap' }, '顔に出さないように…'));
}
function renderPanel() {
  if (!G.panel || !doc || doc.status !== 'playing') return;
  const g = digActive() ? G.dig.from : doc, out = [];
  // ドボンの動き（顔がぷかっと浮くまで）を見せてから、探検のまとめを出す
  const dbWait = boomFrom + 1700 - Date.now();
  if (g.phase === 'summary' && dbWait > 0) { G.sum.hidden = true; clearTimeout(G.dbT); G.dbT = setTimeout(renderPanel, dbWait + 20); G.panel.replaceChildren(); return; }
  if (g.phase === 'summary') {
    const rows = g.players.map(id => { const o = g.out[id] || {}; return h('div', { class: 'rl' }, face(id, 22), h('span', { style: 'flex:1' }, nameOf(id)),
      o.result === 'home' ? h('b', { class: 'home' }, `+${o.got} 持ち帰り`) : o.result === 'magma' ? h('b', { class: 'warn' }, `−${o.lost} マグマ`, o.saved ? h('small', { class: 'saved' }, ` 鉄カブトで +${o.saved}`) : null) : h('span', { class: 'cap' }, '—')); });
    const pc = h('canvas', { class: 'sumpile', 'aria-hidden': 'true' }); sumPiles(pc, g);
    G.sum.replaceChildren(h('div', { class: 'rtitle' }, `${g.exp}回目の探検おわり`), h('div', { class: 'note' }, `深さ${g.depth}まで掘った`), pc, ...rows,
      ...(g.exp < EXPEDITIONS ? [h('div', { class: 'rres jack' }, `次の探検は大鉱脈チャンス ${Math.round(jackpotRate(g.exp + 1) * 100)}%`)] : [])); // 最後の探検で「null」と出ないように
    G.sum.hidden = false; G.board.classList.add('revealing'); G.rad.hidden = true;
    out.push(h('button', { class: 'btn wide', style: 'min-height:56px', onclick: nextExpedition }, g.exp >= EXPEDITIONS ? '結果を見る' : `次の探検へ（${g.exp + 1} / ${EXPEDITIONS}）`));
    if (!local) out.push(h('div', { class: 'note' }, '少しすると自動で進みます'));
    G.panel.replaceChildren(...out); return;
  }
  if (G.sum && !G.sum.hidden) { G.sum.hidden = true; if (G.reveal.hidden) G.board.classList.remove('revealing'); }
  const a = actor(), inside = a && g.inside.includes(a);
  const seenNow = inside && g.radarSeen[a] === g.depth + 1;
  if (G.rad) { G.rad.hidden = !seenNow; if (seenNow) G.rad.replaceChildren(radarMsg(g, a)); }
  if (local && a && g.players.filter(p => p !== NPC).length > 1) out.push(h('div', { class: 'passto' }, face(a, 20), `${nameOf(a)}の番：ほかの人に見えないように選んでね`));
  if (inside) {
    const chosen = g.choice[a], seen = g.radarSeen[a] === g.depth + 1, locked = Date.now() < (G.lockUntil || 0);
    out.push(h('div', { class: 'row info' },
      h('div', { class: 'bag' }, h('span', { class: 'cap' }, 'リュック'), h('b', null, g.bag[a] || 0)),
      h('div', { class: 'bag' }, h('span', { class: 'cap' }, '床に残った鉱石'), h('b', { class: 'plain' }, g.pot)),
      bagBtn(g, a, chosen, locked)));
    if (G.bagFor !== a + ':' + g.depth) { G.bagFor = a + ':' + g.depth; G.bagOpen = false; } // 番の人・段がかわったら閉じる
    if (G.bagOpen && !chosen && !locked) out.unshift(bagPop(g, a)); else G.bagOpen = false;
    const opts = options(g);
    // 決めたら全部グレー。結果が出て次の段になるまで押せない
    out.push(h('div', { class: 'choices', style: `grid-template-columns:repeat(${opts.length},minmax(0,1fr))` }, opts.map(c => h('button', {
      class: 'btn choice ' + (c === 'back' ? 'soft' : '') + (chosen === c ? ' picked' : chosen ? ' dim' : '') + (!chosen && introTip() ? ' glow' : ''), 'aria-pressed': String(chosen === c), disabled: !!chosen || locked,
      onclick: () => (local ? play({ t: 'choose', c }) : choose({ t: 'choose', c }))
    }, CH[c]))));
    const waiting = needChoice(g).filter(p => !g.choice[p]).map(nameOf);
    const left = Math.ceil((LIMIT_MS - (Date.now() - g.lastAt)) / 1000);
    out.push(h('div', { class: 'note' }, chosen ? `「${CH[chosen]}」に決定。${waiting.length ? waiting.join('・') + 'を待っています…' : '結果を出しています…'}` : g.next.fork ? '分かれ道！ 左か右か、それとも帰るか' : 'みんな同時に公開されます',
      !local && left <= 15 ? h('span', { class: 'warn' }, `　${Math.max(0, left)}秒で時間切れ`) : null));
  } else if (local) {
    out.push(h('div', { class: 'card', style: 'text-align:center' }, 'みんな坑道の外。残ったコンピュータの結末を見守ろう'));
  } else {
    const o = g.out[me];
    out.push(h('div', { class: 'card', style: 'text-align:center' }, !isPlayer() ? '観戦中。このゲームが終わったら次から参加できます' : o && o.result === 'home' ? `地上に帰還！ この探検で ${o.got} 持ち帰りました。残った人の結末を見守ろう` : o && o.result === 'magma' ? 'マグマに落ちてしまった…。次の探検まで見守ろう' : '待っています'));
  }
  G.panel.replaceChildren(...out);
}
/* ---- バッグ：レーダー・鉄カブト・ウォッカ（どれも1ゲームに1回、1つの段に1つまで、選ぶ前に使う）
   ふだんは革のバッグ1つ。タップでふくろが開いて3つと説明。案は tools/dwarf-bag-mockup.html の2（https://claude.ai/artifact/3Y1ZB8jpTDsnVzuLTqGSkv） ---- */
const ITEMS = [
  { k: 'radar', n: 'レーダー', d: '次の段に マグマがあるか 自分だけわかる' },
  { k: 'helm', n: '鉄カブト', d: 'マグマでも リュックの半分は 持ち帰れる' },
  { k: 'vodka', n: 'ウォッカ', d: '次の段の鉱石が 自分だけ2倍' },
];
const itemLeft = (g, a, k) => !!((g[k] || {})[a]);
const itemArmed = (g, a) => (g.armed || {})[a] || (g.radarSeen[a] === g.depth + 1 ? 'radar' : null);
let ITEM_ART = null;
function itemArt(k) {
  if (!ITEM_ART) {
    const icon = draw => { const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16; const c = cv.getContext('2d'); draw((x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); }); return cv.toDataURL(); };
    ITEM_ART = {
      radar: icon(P => { P(3, 3, 10, 10, '#2a5a3a'); P(2, 4, 12, 8, '#2a5a3a'); P(4, 2, 8, 12, '#2a5a3a'); P(4, 4, 8, 8, '#3f8a52'); P(7, 3, 1, 10, '#7fd19b'); P(3, 7, 10, 1, '#7fd19b'); P(8, 4, 3, 1, '#c8ffd8'); P(9, 5, 2, 1, '#c8ffd8'); P(10, 6, 1, 1, '#c8ffd8'); P(10, 9, 2, 2, '#ff6b5a'); P(6, 14, 4, 2, '#6b5a4a'); }),
      helm: icon(P => { P(4, 3, 8, 1, '#8a909a'); P(3, 4, 10, 2, '#a8aeb8'); P(2, 6, 12, 4, '#a8aeb8'); P(4, 4, 4, 1, '#e8ecf2'); P(3, 6, 2, 2, '#d8dce4'); P(1, 10, 14, 2, '#6a707a'); P(4, 11, 1, 1, '#c8ccd4'); P(8, 11, 1, 1, '#c8ccd4'); P(11, 11, 1, 1, '#c8ccd4'); P(7, 2, 2, 2, '#c9a24a'); }),
      vodka: icon(P => { P(7, 1, 2, 2, '#d8402a'); P(7, 3, 2, 3, '#dfe8ee'); P(6, 6, 4, 1, '#dfe8ee'); P(5, 7, 6, 8, '#dfe8ee'); P(6, 8, 1, 6, '#ffffff'); P(5, 9, 6, 3, '#d8402a'); P(7, 10, 2, 1, '#f2c84b'); P(5, 14, 6, 1, '#b8c4cc'); }),
      sack: icon(P => { P(6, 2, 4, 2, '#3a2214'); P(5, 4, 6, 1, '#c9a24a'); P(4, 5, 8, 2, '#8a5a32'); P(3, 7, 10, 7, '#8a5a32'); P(4, 7, 3, 5, '#a8703e'); P(3, 14, 10, 1, '#5a3a22'); P(7, 9, 2, 2, '#c9a24a'); }),
    };
  }
  return h('img', { class: 'itpx', src: ITEM_ART[k], alt: '' });
}
function bagBtn(g, a, chosen, locked) {
  const n = ITEMS.filter(it => itemLeft(g, a, it.k)).length, on = itemArmed(g, a);
  return h('button', { class: 'sackbtn' + (G.bagOpen ? ' open' : ''), 'aria-expanded': String(!!G.bagOpen), disabled: (!n && !on) || !!chosen || locked,
    onclick: () => { if (on === 'radar') { openRadar(a); return; } G.bagOpen = !G.bagOpen; G.bagSel = null; G.bagFresh = G.bagOpen; SFX.play(G.bagOpen ? 'pop' : 'unpop'); renderPanel(); } },
    itemArt(on || 'sack'), h('span', null, h('b', null, on ? ITEMS.find(x => x.k === on).n : 'バッグ'), h('small', null, on === 'radar' ? '反応を見る' : on ? '使用中' : `のこり ${n}`)));
}
function bagPop(g, a) {
  const on = itemArmed(g, a), sel = G.bagSel;
  const cells = ITEMS.map(it => { const left = itemLeft(g, a, it.k), cls = 'bagit' + (!left ? ' used' : '') + (sel === it.k ? ' sel' : '');
    return h('button', { class: cls, disabled: !left || !!on, onclick: () => { G.bagSel = sel === it.k ? null : it.k; SFX.play('tap'); renderPanel(); } }, itemArt(it.k), h('b', null, it.n), h('small', null, left ? it.d : '使った')); });
  const it = ITEMS.find(x => x.k === sel);
  const use = () => {
    G.bagOpen = false; G.bagSel = null;
    if (it.k === 'radar') { openRadar(a); return; }
    const x = { t: 'item', k: it.k }; SFX.play(it.k === 'vodka' ? 'eat' : 'block'); if (local) play(x); else choose(x);
  };
  // パネルは1.5秒ごとに描き直すので、開く動きはタップした1回目だけ（毎回つけると がくがく開いたり閉じたりして見えた）
  const fresh = G.bagFresh; G.bagFresh = false;
  return h('div', { class: 'bagpop' + (fresh ? ' in' : ''), role: 'dialog', 'aria-label': 'バッグ' }, h('div', { class: 'bagits' }, cells),
    it ? h('button', { class: 'btn wide baguse', onclick: use }, `${it.n}を 使う`) : h('div', { class: 'cap', style: 'text-align:center' }, on ? 'この段では もう使いました' : '1つの段に 1つまで。鉄カブトとウォッカは 帰るを選ぶと もどる'));
}
function openRadar(a) {
  const g = doc, used = g.radarSeen[a] === g.depth + 1;
  const el = $('sheet'); const close = () => { el.hidden = true; el.replaceChildren(); };
  const inner = h('div', { class: 'inner', role: 'dialog', 'aria-modal': 'true' }, ...radarSheet(a));
  if (!used) inner.append(h('button', { class: 'btn wide', style: 'min-height:56px', onclick: () => { if (local) play({ t: 'radar' }); else choose({ t: 'radar' }); setTimeout(() => { const d = doc; if (d && d.radarSeen[a] === d.depth + 1) { inner.replaceChildren(...radarSheet(a), h('button', { class: 'btn wide', style: 'min-height:56px', onclick: close }, '選ぶ画面にもどる')); } else close(); }, 150); } }, '使う'));
  inner.append(h('button', { class: used ? 'btn wide' : 'btn soft wide', onclick: close }, used ? '選ぶ画面にもどる' : 'やめる'));
  el.className = 'sheet'; el.replaceChildren(inner); el.hidden = false; el.onclick = e => { if (e.target === el) close(); };
}
function openSheet(node) {
  const el = $('sheet'); const close = () => { el.hidden = true; el.replaceChildren(); };
  el.className = 'sheet'; el.replaceChildren(h('div', { class: 'inner', role: 'dialog', 'aria-modal': 'true' }, node, h('button', { class: 'btn soft wide', onclick: close }, 'とじる'))); el.hidden = false;
  el.onclick = e => { if (e.target === el) close(); };
}
// 遊びかたのスライド（絵とひとこと。ホームと同じ白・黒・朱）。slides: [{ t, s, art() }]。foot は最後の1枚の下に小さく出す
function openSlides(title, slides, foot) {
  const el = $('sheet'), close = () => { el.hidden = true; el.replaceChildren(); };
  const box = h('div', { class: 'sl', role: 'dialog', 'aria-modal': 'true', 'aria-label': `${title}の遊びかた`, tabindex: '-1' });
  let i = 0;
  const go = d => { const n = Math.max(0, Math.min(slides.length - 1, i + d)); if (n === i) { if (d > 0) close(); return; } i = n; paint(); };
  function paint() {
    const s = slides[i], last = i === slides.length - 1;
    box.replaceChildren(...[
      h('div', { class: 'sl-top' }, h('div', { class: 'sl-bar' }, slides.map((_, k) => h('i', { class: k <= i ? 'on' : null }))), h('button', { class: 'sl-x', 'aria-label': 'とじる', onclick: close }, '×')),
      h('div', { class: 'sl-num' }, `${title}　${String(i + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`),
      h('b', { class: 'sl-t', role: 'heading', 'aria-level': '2' }, s.t), h('p', { class: 'sl-s' }, s.s),
      h('div', { class: 'sl-art' }, s.art ? s.art() : null),
      h('div', { class: 'sl-nav' }, h('button', { onclick: () => go(-1), disabled: i === 0 }, 'もどる'), h('button', { class: 'on', onclick: () => go(1) }, last ? 'わかった' : 'つぎへ')),
      last && foot ? h('div', { class: 'sl-foot' }, foot) : null].filter(Boolean));
  }
  // 横にスワイプでもめくれる
  let x0 = null;
  box.addEventListener('pointerdown', e => { x0 = e.clientX; });
  box.addEventListener('pointerup', e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); });
  box.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  paint(); el.className = 'sheet slides'; el.replaceChildren(box); el.hidden = false; box.focus();
  el.onclick = e => { if (e.target === el) close(); };
}
// ゲームごとの遊びかた
function openRules(id, foot) {
  if (id === 'trapper') trOpenRules(foot);
  else if (id === 'dwarf') openSlides('ドワーフ', dwarfSlides(), foot);
  else bdOpenRules(id, foot);
}
// 遊びかたの枠は縦長。比を保ったまま枠を埋める（.sla-px は object-fit:cover。左右の土が少し切れる。前は横につぶれていた）
function shaftArt(g, opt) { const cv = document.createElement('canvas'); drawShaft(cv, g, opt); cv.className = 'sla-px'; return cv; }
function dwarfSlides() {
  const P = ['h0', 'h1', 'h2'], at = (depth, inside, more) => ({ depth, phase: 'choose', next: { fork: false }, pot: 3, inside, players: [], out: {}, ...more });
  return [
    { t: 'みんなで 1本の坑道を ほる', s: '1段ずつ 下へ すすむ', art: () => shaftArt(at(2, P)) },
    { t: 'こっそり「進む」か「帰る」', s: 'せーの！で いっせいに 見せる', art: () => h('div', { class: 'sla-choice' }, h('span', { class: 'on' }, '進む'), h('span', null, '帰る')) },
    { t: '深いほど 鉱石が ざくざく', s: 'でも マグマが 出やすくなる', art: () => shaftArt(at(7, P, { pot: 6 })) },
    { t: 'マグマが出たら その回の 稼ぎはなし', s: '帰った人の分は 安全', art: () => shaftArt(at(5, [], { phase: 'boom' }), { boom: true, burnt: ['h0', 'h1'] }) },
    { t: `${EXPEDITIONS}回の探検で 合計が多い人の勝ち`, s: 'バッグの レーダー・鉄カブト・ウォッカは どれも1回だけ', art: () => slaRank([['1位', '12こ'], ['2位', '9こ'], ['3位', '5こ']]) },
  ];
}
function slaRank(rows) { return h('div', { class: 'sla-rank' }, rows.map(([a, b], k) => h('div', { class: k ? null : 'win' }, h('b', null, a), h('i', null, `プレイヤー${k + 1}`), h('span', null, b)))); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const el = $('sheet'); el.hidden = true; el.replaceChildren(); if (hubSheet) hubDrawer(false); } });

// チケットのゲーム名：入りきらないときは字を小さくして1行に収める（…で切らない）
function fitTk() {
  document.querySelectorAll('.tk-name').forEach(el => {
    el.style.fontSize = '';
    let s = parseFloat(getComputedStyle(el).fontSize) || 26;
    while (el.scrollWidth > el.clientWidth + 1 && s > 12) { s -= 1; el.style.fontSize = s + 'px'; }
  });
}
try { document.fonts && document.fonts.ready.then(fitTk); } catch (e) { }
window.addEventListener('resize', fitTk);
function render() {
  sfxOver();
  if (TS.B) { TS.B.dispose(); TS.B = null; } TS.root = null;
  let v, inGame = false;
  // コイン（#コードつき）で開いたときは、つながる前から「卓を開いています…」（最初の画面を見せない）
  const booting = !tableId && !ready && !!bootId;
  if (!tableId && !booting) v = viewHome();
  else if (!local && tableId !== 'LOCAL' && (!myNick || nickGate)) v = viewNick();
  else if (!doc || bootHold()) v = viewBoot();
  else if (doc.v !== 6) v = viewOld();
  else if (doc.status === 'lobby') v = viewHub();
  else if ((doc.status === 'playing' || doc.status === 'over') && isBoardDoc()) { v = viewBoard(); inGame = 'board'; }
  else if (doc.status === 'playing' && isTrapDoc()) { v = viewTrapShell(); inGame = 'trap'; }
  else if (doc.status === 'playing') { v = viewGameShell(); inGame = true; }
  else if (isTrapDoc()) { v = viewTrapOver(); inGame = 'trapover'; }
  else v = viewOver();
  const isBoot = v && v.classList && v.classList.contains('boot-wrap'); if (!isBoot) bootShownAt = 0;
  const hubby = !tableId || booting || isBoot || !doc || doc.status === 'lobby' || nickGate || !myNick && !local;
  document.body.className = inGame === 'board' ? 'board' : inGame === 'trap' || inGame === 'trapover' ? 'trap' : inGame || (doc && doc.status === 'over' && !hubby) ? 'ingame' : hubby ? 'hub' : 'page';
  if (inGame !== 'trap') TS.root = null;
  if (inGame !== 'board') bd3Drop();
  $('app').replaceChildren(v);
  fitTk();
  if (inGame === true) renderGame();
  else if (inGame === 'trap') trRender();
  else if (inGame === 'board') bdRender();
  if (inGame !== 'trap' && doc && doc.status === 'lobby' && hubPick(doc) === 'trapper' || !tableId && local && localGame === 'trapper') TB.load().catch(() => { });
  // 盤のゲームを選んでいたら、3Dの盤も先に読んでおく
  if (doc && doc.status === 'lobby' && DUEL[hubPick(doc)] || !tableId && local && DUEL[localGame]) BD3.load().catch(() => { });
  if (doc && doc.status === 'lobby' && hubPick(doc) === 'alchemy' || !tableId && local && localGame === 'alchemy') AL3.load().catch(() => { });
  if (doc && doc.status === 'lobby' && hubPick(doc) === 'bomb' || !tableId && local && localGame === 'bomb') bmLoad().catch(() => { });
  if (doc && doc.status === 'lobby' && hubPick(doc) === 'wordwolf' || !tableId && local && localGame === 'wordwolf') wwLoad().catch(() => { });
  if (doc && doc.status === 'lobby' && hubPick(doc) === 'tower' || !tableId && local && localGame === 'tower') twLoad().catch(() => { });
  if (doc && doc.status === 'lobby' && hubPick(doc) === 'boxing' || !tableId && local && localGame === 'boxing') bxLoad().catch(() => { });
  // いっちょあがり！を選んだら絵を描いておく。描き終わったらホームのアイコンも差しかわるので描き直す
  if ((doc && doc.status === 'lobby' && hubPick(doc) === 'icho' || !tableId && local && localGame === 'icho') && !IC.art && !IC.ready) ichLoad().then(() => { if (!doc || doc.status === 'lobby' || !tableId) render(); }, () => { });
}
setInterval(() => {
  if (doc && doc.status === 'lobby') { const t = $('lobbyTimer'); const left = Math.max(0, OPEN_MS - (Date.now() - doc.openedAt)); if (t) t.textContent = `招待コード ${tableId} ・ ` + (left ? `あと${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}` : '受付終了'); if (!left && t && !t.dataset.closed) { t.dataset.closed = '1'; render(); } }
}, 1000);

// コイン（URL の #コード）で開いたときの卓。つながるまでのあいだ、最初の画面ではなく読みこみ中を出すのに使う
// コードなしで開いたときは、新しい卓（自分が部屋主）を作る。最初の画面（テスト用の卓・招待コード）はもう出さない
let bootId = (() => { const x = (location.hash || '').slice(1).toUpperCase(); if (/^[A-Z0-9]{4,8}$/.test(x)) return x; if (window.claude) return ''; const id = genId(); try { history.replaceState(null, '', '#' + id); } catch (e) { } return id; })();
render();
(async () => {
  const c = window.claude, cfg = window.PITOPA_FIREBASE || window.ATSUMARU_FIREBASE;
  wantOnline = !c && !!(cfg && cfg.apiKey && !/ここに/.test(cfg.apiKey));
  try {
    if (c) {
      let cdb; [cdb, user] = await Promise.all([c.use('db'), c.use('user')]);
      if (cdb) { try { me = await user.id(); } catch (e) { } if (!me) { try { me = (await user.me()).id; } catch (e) { } } db = claudeDb(cdb); backend = 'claude'; }
    } else if (cfg && cfg.apiKey && !/ここに/.test(cfg.apiKey)) {
      const r = await connectFirebase(cfg); db = r.db; me = r.uid; backend = 'firebase';
    }
  } catch (e) { console.warn('オンラインにつながりませんでした', e); connectErr = (e && (e.code || e.message)) || '不明なエラー'; db = null; me = null; }
  ready = true;
  if (!db || !me) { local = true; if (!tableId) render(); return; }
  const go = () => { const hsh = (location.hash || '').slice(1).toUpperCase(); if (/^[A-Z0-9]{4,8}$/.test(hsh) && hsh !== tableId) openTable(hsh); };
  window.addEventListener('hashchange', go);
  go(); if (!tableId) render();
})();
})();
