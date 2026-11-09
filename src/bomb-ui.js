/* =================== ばくだんパスの画面 =================== */
// alch-ui.js のうしろに差し込まれる。爆弾の絵はボクセルを1回描いて画像にする
const BM = { key: -1, at: 0, sent: false, wait: 0, art: null, ready: null, fly: false };
const isBombDoc = () => !!doc && doc.game === 'bomb' && !!doc.b;
function bmLoad() {
  if (!BM.ready) BM.ready = TB.load().then(() => {
    const T = TB.parts().T, r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.outputEncoding = T.sRGBEncoding; r.setSize(420, 420, false); r.setClearColor(0, 0);
    const s = new T.Scene(), g = new T.Group(); g.rotation.y = -.42; g.rotation.x = .12; s.add(g);
    const geo = new T.BoxGeometry(1, 1, 1), mats = {}, mat = (c, e) => mats[c + (e || '')] || (mats[c + (e || '')] = new T.MeshStandardMaterial({ color: c, roughness: .55, emissive: e || '#000', emissiveIntensity: e ? 1 : 0 }));
    const cube = (x, y, z, c, e) => { const o = new T.Mesh(geo, mat(c, e)); o.position.set(x, y, z); g.add(o); };
    const K = (x, y, z, w, h, d, c, e) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) cube(x + i, y + j, z + k, typeof c === 'function' ? c(i, j) : c, e); };
    [-5, -1, 3].forEach(x => { K(x, -8, -2, 3, 16, 3, (i, j) => j % 5 === 4 ? '#a02418' : '#cc2f20'); K(x, 8, -2, 3, 1, 3, '#f4e6c0'); cube(x + 1, 9, -1, '#c9a27a'); });
    K(-6, -4, 1, 13, 2, 1, '#1c1a18'); K(-6, 3, 1, 13, 2, 1, '#1c1a18'); K(-4, -2, 1, 9, 4, 1, '#1c1e24'); K(-3, -1, 1.6, 7, 2, 1, '#3a0f0c', '#ff2a1a');
    [[-6, 0, 2], [-7, 1, 2], [-7, 2, 2], [-6, 3, 2]].forEach(([x, y, z]) => cube(x, y, z, '#e8402a')); [[6, -1, 2], [7, 0, 2], [7, 1, 2], [6, 2, 2]].forEach(([x, y, z]) => cube(x, y, z, '#3f8fd6'));
    [[0, 10, -1], [1, 11, -1], [2, 11, -1], [3, 12, -1]].forEach(([x, y, z]) => cube(x, y, z, '#c9a27a'));
    [[4, 13, -1, '#ffd54a'], [4.8, 13.7, -.7, '#ff8a3c'], [3.3, 13.8, -1.3, '#ff5a36'], [4.1, 14.3, -1, '#ffe9a0']].forEach(([x, y, z, c]) => cube(x, y, z, c, c));
    const d = new T.DirectionalLight('#fff', .66); d.position.set(-7, 11, 13); s.add(d); s.add(new T.HemisphereLight('#fff', '#6a5a80', .34));
    const c = new T.PerspectiveCamera(30, 1, .1, 140); c.position.set(0, 3.2, 50); c.lookAt(0, 3.2, 0); r.render(s, c); BM.art = r.domElement.toDataURL('image/png'); r.dispose();
  }).catch(e => { BM.ready = null; throw e; });
  return BM.ready;
}
const bmHolder = () => doc.b.seats[doc.b.holder];
const bmMine = () => { const id = bmHolder(); return !BMB.isNpc(id) && (local || id === me); };
const bmDriver = () => local || doc.players[0] === me; // コンピュータの番を進める端末
// 表示の時間：1周目は残り、2周目からは隠す
const bmClock = b => { if (!BMB.shown(b)) return '--:--'; const v = Math.max(0, Math.ceil((b.fuse - (Date.now() - BM.at)) / 1000)); return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'); };
function bmSend(a, id) {
  if (BM.sent) return; BM.sent = true;
  const seq0 = doc.b.seq, who = id || bmHolder();
  if (local) { try { doc = BMB.act(doc, who, a); } catch (e) { console.warn(e); } BM.sent = false; afterChange(); return; }
  withLease(d => d && d.status === 'playing' && d.b && d.b.seq === seq0 ? BMB.act(d, who === me || !BMB.isNpc(who) ? me : who, a) : null, true).then(r => { if (r !== 'ok') BM.sent = false; });
}
function bmPass() { if (!bmMine() || BM.sent || doc.b.phase !== 'play') return; BM.fly = true; const el = document.querySelector('.bm-bomb'); if (el) el.classList.add('fly'); const used = Date.now() - BM.at; setTimeout(() => { BM.fly = false; bmSend({ t: 'pass', used }); }, 230); if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { } }
function bmStage(b) {
  const mine = bmMine(), el = h('div', { class: 'bm-bomb' + (mine ? ' mine' : ''), role: mine ? 'button' : null, 'aria-label': mine ? '爆弾を次の人へ渡す' : null }, BM.art ? h('img', { src: BM.art, alt: '爆弾', draggable: 'false' }) : h('i', { class: 'bm-noart' }));
  if (mine) {
    let y0 = null;
    el.addEventListener('pointerdown', e => { y0 = e.clientY; try { el.setPointerCapture(e.pointerId); } catch (x) { } });
    el.addEventListener('pointermove', e => { if (y0 != null) el.style.translate = `0 ${Math.min(0, e.clientY - y0)}px`; });
    const up = e => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; el.style.translate = ''; if (dy < -50) bmPass(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => { y0 = null; el.style.translate = ''; });
  }
  return el;
}
function bombView() {
  const g = doc, b = g.b, over = g.status !== 'playing';
  if (BM.key !== b.gid + ':' + b.seq) { BM.key = b.gid + ':' + b.seq; BM.at = Date.now(); BM.sent = false; BM.wait = 1000 + Math.random() * 2200; if (navigator.vibrate && b.phase === 'boom') try { navigator.vibrate([120, 40, 200]); } catch (e) { } }
  const mine = bmMine(), seats = h('div', { class: 'bm-seats' }, b.order.map(s => [b.seats[s], s]).map(([id, s]) => h('div', { class: 'bm-seat' + (s === b.holder && b.phase === 'play' ? ' on' : '') + (b.lives[s] <= 0 ? ' out' : '') }, h('b', null, bdName(id)), h('span', null, Array.from({ length: Math.max(0, b.lives[s]) }, () => h('i'))))));
  const head = bdHead('ばくだんパス', `${b.round}回目 ・ ${local ? '1台で遊ぶ' : '招待コード ' + tableId}`, 'bomb');
  if (over) { const w = b.result.win; return h('div', { class: 'bm' }, head, seats, bdOverCard(`${bdName(b.seats[w])}の勝ち！`, '最後まで爆発しなかった人の勝ち', null)); }
  if (b.phase === 'boom') { const s = b.last.s, host = local || g.host === me; return h('div', { class: 'bm bm-boomed' }, head, seats, h('div', { class: 'bm-mid' }, h('div', { class: 'bm-bits', 'aria-hidden': 'true' }, Array.from({ length: 22 }, (_, i) => h('i', { style: `--a:${i * 16.4}deg;--d:${90 + (i * 37) % 130}px;--c:${['#cc2f20', '#f4e6c0', '#1c1a18', '#ffd54a'][i % 4]}` }))), h('div', { class: 'bm-big' }, 'ドカーン！'), h('div', { class: 'bm-who' }, `${bdName(b.seats[s])}で 爆発`), h('small', null, `${b.last.passes}回 回りました`)), host ? h('button', { class: 'bm-go', onclick: () => bmSend({ t: 'next' }, local ? b.seats[0] : me) }, '次の爆弾へ') : h('div', { class: 'bm-note' }, '部屋主が次の爆弾を始めます'));
  }
  const next = b.seats[BMB.nextAlive(b, b.holder)];
  return h('div', { class: 'bm' + (mine ? ' bm-hot' : '') }, head, seats,
    h('div', { class: 'bm-lap' }, BMB.shown(b) ? '1周目 ・ 時間を覚えよう' : '2周目から ・ 時間は見えません'),
    h('div', { class: 'bm-mid' }, h('div', { class: 'bm-topic' }, h('small', null, mine ? 'お題' : `${bdName(bmHolder())}のお題`), BMB.TOPICS[b.topic]), h('div', { class: 'bm-lcd', id: 'bmLcd' }, bmClock(b)), bmStage(b)),
    mine ? h('div', { class: 'bm-note' }, `声で答えて、上へシュッ！（次は ${bdName(next)}）`) : h('div', { class: 'bm-note' }, `${bdName(bmHolder())}が 持っています`),
    mine ? h('button', { class: 'bm-go', onclick: bmPass }, '渡す') : local || g.host !== me ? null : h('button', { class: 'bm-sub', id: 'bmForce', hidden: true, onclick: () => bmSend({ t: 'force' }, me) }, '返事がないので 爆発させる'));
}
// 導火線：持っている端末が時間を見る。持っているほどゆれが強くなる
setInterval(() => {
  if (!isBombDoc() || doc.status !== 'playing' || doc.b.phase !== 'play' || !BS.root || !BS.root.isConnected) return;
  const b = doc.b, used = Date.now() - BM.at, npc = BMB.isNpc(bmHolder()), mine = bmMine(), lcd = $('bmLcd'); if (lcd) lcd.textContent = bmClock(b);
  const el = document.querySelector('.bm-bomb'); if (el) el.style.setProperty('--sh', Math.min(9, 1 + used / 1500).toFixed(1) + 'px');
  const f = $('bmForce'); if (f && used > 25000) f.hidden = false;
  if (BM.fly || BM.sent) return;
  if ((mine || (npc && bmDriver())) && used >= b.fuse) { bmSend({ t: 'boom' }); return; }
  if (npc && bmDriver() && used >= BM.wait) bmSend({ t: 'pass', used });
}, 150);
function bmSlides() {
  const art = () => BM.art ? h('img', { class: 'bm-sla', src: BM.art, alt: '' }) : null;
  return [
    { t: '爆弾が回ってきたら お題に答える', s: '声に出して言う', art: () => h('div', { class: 'bm-topic sla' }, '赤いもの') },
    { t: '上へシュッと はじいて次の人へ', s: '早く渡すほど 安全', art },
    { t: '最初の1周は 時間が見える', s: '2周目から隠れるので 覚えておこう', art: () => h('div', { class: 'bm-lcd' }, '0:23') },
    { t: '手もとで爆発したら ライフが減る', s: '最後まで残った人の勝ち', art: () => slaRank([['1位', 'のこった'], ['2位', 'ドカーン'], ['3位', 'ドカーン']]) },
  ];
}
function bmTicketArt(art) { art.classList.add('tk-css', 'tk-bomb'); art.append(h('img', { class: 'tka-bomb', src: ICON_ART.bomb, alt: '' })); }
