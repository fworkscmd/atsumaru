/* =================== 月夜の錬金市場の画面 =================== */
// card-ui.js のうしろに差し込まれる。昼の操作は手もとの写し（AS.b）で進めて、「夜へ」で ALC.act に steps を渡す
const AS = { key: null, day: 0, seat: -1, b: null, steps: [], view: 'morning', night: 0, pick: null, sel: 'still', sell: {}, ord: null, shown: -1, pod: '', waitAt: 0 };
const isAlcDoc = () => !!doc && doc.game === 'alchemy' && !!doc.b;
const alImg = (u, cls, alt = '') => u ? h('img', { class: cls, src: u, alt }) : h('i', { class: cls + ' al-noimg' });
const AL_KIND = { mat: ['#d9a01f', '#fff0b0', '#4a2c10', '#a8641a'], coin: ['#6f7c88', '#e0e6ec', '#262c33', '#465260'], tool: ['#2aa86e', '#c8ffd8', '#10382a', '#167a4e'], wild: ['#2aa86e', '#c8ffd8', '#10382a', '#167a4e'], staff: ['#7a4fd6', '#d9c2ff', '#2c1f52', '#3f2a8a'], junk: ['#55505a', '#b0aab4', '#1d1a20', '#3a3640'], rec: ['#2f8fe0', '#c8e8ff', '#132a52', '#1f5ca8'], fame: ['#e0589a', '#ffd0e4', '#4a1636', '#a82a6e'] };
const alStyle = k => { const [c, l, d, d2] = AL_KIND[k]; return `--c:${c};--l:${l};--d:${d};--d2:${d2}`; };
const alHumans = b => b.seats.map((id, s) => ALC.isNpc(id) ? -1 : s).filter(s => s >= 0);
// この端末で操作する席（1台なら、まだ夜の準備をしていない最初の人）
function alSeat() {
  const b = doc.b; if (!local) return b.seats.indexOf(me);
  const s = alHumans(b).find(x => !b.done[x]); return s == null ? alHumans(b)[0] : s;
}
function alFresh(seat) { const b = doc.b; AS.day = b.day; AS.seat = seat; AS.b = JSON.parse(JSON.stringify(b)); AS.steps = []; AS.sell = {}; AS.ord = null; AS.pick = null; }
function alDo(a) {
  try { ALC.step(AS.b, AS.seat, a); AS.steps.push(a); AS.pick = null; bdRender(); return true; } catch (e) { toast(e.message); return false; }
}
function alUndo() { const v = AS.view; alFresh(AS.seat); AS.view = v; bdRender(); }
function alBar(b, p) {
  return h('div', { class: 'al-bar' }, h('div', { class: 'd' }, h('small', null, '日'), h('b', null, `${b.day} / ${ALC.DAYS}`)), p ? h('div', null, h('small', null, '名声'), h('b', null, String(p.fame))) : null, p ? h('div', null, h('small', null, '金'), h('b', null, String(p.gold))) : null,
    h('span', { class: 'sp' }), h('button', { class: 'al-ib', 'aria-label': '遊びかた', onclick: () => bdOpenRules('alchemy') }, '?'), doc.status === 'playing' ? h('button', { class: 'al-ib', 'aria-label': '中断してホームにもどる', onclick: confirmQuit }, '中断') : null);
}
const alSteps = i => h('div', { class: 'al-steps' }, ['つくる', 'かう', 'うる'].map((t, j) => h('button', { class: j === i ? 'on' : j < i ? 'ok' : '', onclick: () => { AS.view = ['make', 'buy', 'sell'][j]; AS.pick = null; bdRender(); } }, t)));
function alTags(A, tags, m, hot) { return A ? ALC.PK.map(k => { const t = tags[k]; return h('div', { class: 'al-tg' + (k === hot ? ' hot' : ''), style: `left:${t.x}%;top:${t.y}%` }, h('small', null, ALC.POT[k].s), String(m[k])); }) : null; }
function alThumb(id, o = {}) {
  const A = AL3.get(), c = ALC.C[id];
  return h('button', { class: 'al-th' + (o.on ? ' on' : '') + (o.off ? ' off' : ''), style: alStyle(o.kind || c.kind), 'aria-label': o.n || c.n, onclick: o.tap }, o.cost != null ? h('span', { class: 'c2' }, String(o.cost)) : null,
    h('span', { class: 'w2' }, alImg(o.img || (A && A.art[id]), 'al-art', '')), h('b', null, o.n || c.n));
}
function alBig(o) {
  return h('article', { class: 'al-cd', style: alStyle(o.kind) }, h('span', { class: 'co' }, o.cost), h('span', { class: 'rb' }, o.n), h('div', { class: 'win' }, alImg(o.img, 'al-art', o.n)), h('div', { class: 'tx' }, o.t));
}
/* ---- 朝・つくる・かう・うる ---- */
function alMorning(b, A) {
  const [k, d, t] = ALC.RUMORS[b.rumor], p = AS.b.p[AS.seat], nx = p.staff.includes('spy') && b.next != null ? ALC.RUMORS[b.next] : null;
  return [A ? h('img', { class: 'al-bg', src: A.day.url, alt: '朝の市場' }) : null, alBar(b, p), alTags(A, A && A.day.tags, b.m, k),
    h('div', { class: 'al-mid c' }, alBig({ kind: 'staff', cost: '朝', n: 'けさのうわさ', img: A && A.art.spy, t: h('span', null, t, h('br'), `${ALC.POT[k].n} ${d > 0 ? '+' : '−'}${Math.abs(d)}`) }), nx ? h('div', { class: 'al-note' }, `明日のうわさ：${nx[2]}（${ALC.POT[nx[0]].s} ${nx[1] > 0 ? '+' : '−'}${Math.abs(nx[1])}）`) : null),
    h('button', { class: 'al-go', onclick: () => { AS.view = 'make'; bdRender(); } }, 'つくる')];
}
function alUseTool(i) {
  const p = AS.b.p[AS.seat], c = p.hand[i], cc = ALC.C[c];
  if (cc.kind === 'mat' || cc.kind === 'coin' || cc.kind === 'junk' || cc.kind === 'wild') { toast(cc.kind === 'coin' ? `${cc.n}は「かう」で使えます` : cc.kind === 'junk' ? 'すすは なにもできません' : '上のレシピをタップすると使われます'); return; }
  if (cc.pick) { AS.pick = { i, c }; bdRender(); return; }
  alDo({ t: 'tool', i });
}
function alMake(b, A) {
  const p = AS.b.p[AS.seat], pk = AS.pick;
  const recs = p.rec.map(k => { const ok = !!ALC.findCards(p, k) && p.shelf.length < ALC.SHELF; return h('button', { class: 'al-rc' + (ok ? ' ok' : ''), onclick: () => ok ? alDo({ t: 'brew', k }) : toast(p.shelf.length >= ALC.SHELF ? '棚がいっぱいです' : `材料：${ALC.POT[k].need.map(x => ALC.C[x].n).join('・')}`) }, alImg(A && A.bottle[k], 'b'), h('span', null, ALC.POT[k].s)); });
  const hint = pk ? (pk.c === 'vent' ? '消すカードをタップ' : `${ALC.C[pk.c].n}：下の薬をえらんでね`) : p.dbl ? '次に作る薬は 2つできる！' : '光っているレシピをタップで作れる';
  return [alBar(b, p), alSteps(0), h('div', { class: 'al-ttl' }, '材料で 薬をつくろう', h('small', null, hint)),
    h('div', { class: 'al-mid' }, alImg(A && A.pot, 'al-pot', '釜'), h('div', { class: 'al-shelf' }, Array.from({ length: ALC.SHELF }, (_, i) => p.shelf[i] ? h('span', null, alImg(A && A.bottle[p.shelf[i].k], 'b', ALC.POT[p.shelf[i].k].n)) : h('span', { class: 'e' })))),
    pk && pk.c !== 'vent' ? h('div', { class: 'al-recs' }, ALC.PK.map(k => h('button', { class: 'al-rc ok', onclick: () => alDo({ t: 'tool', i: pk.i, k }) }, alImg(A && A.bottle[k], 'b'), h('span', null, ALC.POT[k].s)))) : h('div', { class: 'al-recs' }, recs),
    h('div', { class: 'al-hand' }, p.hand.map((c, i) => alThumb(c, { on: pk && pk.i === i, tap: () => pk && pk.c === 'vent' ? (i === pk.i ? (AS.pick = null, bdRender()) : alDo({ t: 'tool', i: pk.i, x: i })) : alUseTool(i) }))),
    h('div', { class: 'al-row' }, AS.steps.length ? h('button', { class: 'al-sub', onclick: alUndo }, 'やり直す') : null, h('button', { class: 'al-go', onclick: () => { AS.view = 'buy'; AS.pick = null; bdRender(); } }, 'かう へ'))];
}
function alShopList(b, p) {
  const A = AL3.get(), list = b.shop.map(id => ({ id, cost: ALC.C[id].cost, n: ALC.C[id].n, kind: ALC.C[id].kind, t: ALC.C[id].t || (ALC.C[id].kind === 'coin' ? `コイン ${ALC.C[id].v}` : `材料（${ALC.PK.filter(k => ALC.POT[k].need.includes(id)).map(k => ALC.POT[k].s).join('・')}）`), img: A && A.art[id], a: { t: 'buy', id } }));
  ['morph', 'gold'].forEach(k => { if (!p.rec.includes(k)) list.push({ id: 'r:' + k, cost: ALC.POT[k].learn, n: `${ALC.POT[k].s}のレシピ`, kind: 'rec', t: `${ALC.POT[k].n}が作れる（${ALC.POT[k].need.map(x => ALC.C[x].n).join('・')}）。最後に +2`, img: A && A.bottle[k], a: { t: 'learn', k } }); });
  list.push({ id: 'donate', cost: ALC.DONATE, n: '町へ寄付', kind: 'fame', t: `名声 +${ALC.DONATE_F}`, img: A && A.art.c3, a: { t: 'donate' } });
  return list;
}
function alBuy(b, A) {
  const p = AS.b.p[AS.seat], list = alShopList(b, p), cur = list.find(x => x.id === AS.sel) || list[0], mon = ALC.money(p), done = p.buys < 1;
  return [alBar(b, p), alSteps(1), h('div', { class: 'al-ttl c' }, `使えるお金 ${mon}`, h('small', null, done ? '今日の買いものは おわり' : '1日に1回 買える')),
    h('div', { class: 'al-mid c' }, alBig({ kind: cur.kind, cost: String(cur.cost), n: cur.n, img: cur.img, t: cur.t })),
    h('div', { class: 'al-strip' }, list.map(x => alThumb(x.id.startsWith('r:') ? 'c1' : x.id === 'donate' ? 'c3' : x.id, { n: x.n, kind: x.kind, cost: x.cost, img: x.img, on: x.id === cur.id, off: x.cost > mon, tap: () => { AS.sel = x.id; bdRender(); } }))),
    h('div', { class: 'al-row' }, h('button', { class: 'al-sub', disabled: done || cur.cost > mon, onclick: () => alDo(cur.a) }, cur.cost > mon ? 'お金が足りない' : done ? '買った' : `買う（のこり ${mon - cur.cost}）`), h('button', { class: 'al-go', onclick: () => { AS.view = 'sell'; bdRender(); } }, 'うる へ'))];
}
function alHolders(b, s, k) { return b.p.map((q, i) => i !== s && q.shelf.some(x => x.k === k) ? i : -1).filter(i => i >= 0); }
function alSell(b, A) {
  const p = AS.b.p[AS.seat], s = AS.seat, use = AS.ord != null ? ALC.orderUse(p, AS.ord, Object.keys(AS.sell).filter(i => AS.sell[i]).map(Number)) : null;
  const rows = p.shelf.map((x, i) => { const hs = alHolders(doc.b, s, x.k), used = use && use.includes(i), bonus = ALC.ageBonus(p, x);
    return h('div', { class: 'al-sl' }, alImg(A && A.bottle[x.k], 'b'), h('div', { class: 'm' }, h('b', null, `${ALC.POT[x.k].n}　${b.m[x.k]}${bonus ? ` +${bonus}` : ''}`), h('span', null, used ? '注文に使う' : hs.length ? [hs.map(f => alImg(A && A.face[f], 'fc')), `${hs.map(f => bdName(b.seats[f])).join('・')}も持っている`] : 'ほかの人は 持っていない')),
      h('div', { class: 'sw' }, h('button', { class: AS.sell[i] ? 'on' : '', disabled: used, onclick: () => { AS.sell[i] = 1; bdRender(); } }, '売る'), h('button', { class: AS.sell[i] ? '' : 'on', onclick: () => { AS.sell[i] = 0; bdRender(); } }, '取っておく'))); });
  const orders = b.orders.map(o => { const [w, need, f] = ALC.ORDERS[o], ok = !!ALC.orderUse(p, o), on = AS.ord === o; return h('button', { class: 'al-od' + (on ? ' on' : '') + (ok ? ' ok' : ''), onclick: () => { if (!ok) { toast(`${w}：${need.map(k => ALC.POT[k].s).join('・')}が いる`); return; } AS.ord = on ? null : o; bdRender(); } }, h('span', { class: 'n' }, need.map(k => alImg(A && A.bottle[k], 'b'))), h('small', null, w), h('b', null, `名声 ${f}`)); });
  return [alBar(b, p), alSteps(2), h('div', { class: 'al-ttl' }, '今夜、どれを売る？', h('small', null, '同じ薬をみんなで売ると 安くなる')),
    h('div', { class: 'al-mid s' }, h('div', { class: 'al-ods' }, orders), rows.length ? rows : h('div', { class: 'al-note' }, '棚に薬がありません')),
    h('button', { class: 'al-go', onclick: alCommit }, 'これで夜へ')];
}
function alCommit() {
  const g = doc, b = g.b, s = AS.seat, sell = Object.keys(AS.sell).filter(i => AS.sell[i]).map(Number), steps = AS.steps.concat({ t: 'plan', sell, ord: AS.ord }), id = b.seats[s], day = b.day;
  if (local) { doc = ALC.act(doc, id, { t: 'day', steps }); AS.shown = -1; AS.day = 0; afterChange(); return; }
  AS.view = 'wait'; AS.waitAt = Date.now(); bdRender();
  withLease(d => d && d.status === 'playing' && d.b && d.b.day === day && !d.b.done[s] ? ALC.act(d, me, { t: 'day', steps }) : null).then(r => { if (r !== 'ok' && isAlcDoc() && doc.b.day === day && !doc.b.done[s]) { AS.view = 'sell'; toast('送れませんでした。もう一度押してください'); bdRender(); } });
}
function alWait(b, A) {
  const hs = alHumans(b), n = hs.filter(x => b.done[x]).length, host = doc.host === me, late = Date.now() - AS.waitAt > 60000;
  if (!late && AS.waitAt) setTimeout(() => { if (isAlcDoc() && AS.view === 'wait' && BS.root && BS.root.isConnected) bdRender(); }, 60500);
  return [A ? h('img', { class: 'al-bg', src: A.day.url, alt: '' }) : null, alBar(b, b.p[AS.seat]), h('div', { class: 'al-mid c' }, h('div', { class: 'al-note big' }, 'みんなを 待っています', h('small', null, `準備できた人 ${n} / ${hs.length}`))),
    host && late ? h('button', { class: 'al-go', onclick: () => withLease(d => d && d.status === 'playing' && d.b && d.b.day === b.day ? ALC.act(d, me, { t: 'skip' }) : null) }, '待たずに夜へ進める') : null];
}
/* ---- 夜・結果 ---- */
function alNight(b, A) {
  const L = b.last, seat = Math.max(0, AS.seat), rows = L.sold.map(x => {
    const cls = x.who.length > 1 && new Set(x.who).size > 1 ? ' x' : new Set(x.who).size === 1 && x.n === 1 ? ' y' : '';
    return h('div', { class: 'al-ro' + cls }, alImg(A && A.bottle[x.k], 'b'), h('div', { class: 'm' }, `${ALC.POT[x.k].n}${cls === ' x' ? ' かぶった！' : cls === ' y' ? ' ひとりじめ' : ''}`, h('small', null, [...new Set(x.who)].map(s => alImg(A && A.face[s], 'fc')), `${x.n}つ`)), h('div', { class: 'p' }, String(x.price), h('small', null, `相場 ${x.from}→${x.to}`)));
  });
  return [A ? h('img', { class: 'al-bg', src: A.night.url, alt: '夜の市場' }) : null, alTags(A, A && A.night.tags, L.market, null), h('div', { class: 'al-big' }, 'せーの！'),
    h('div', { class: 'al-res' }, rows.length ? rows : h('div', { class: 'al-ro' }, h('div', { class: 'm' }, '今夜は だれも売らなかった'))),
    h('button', { class: 'al-go', onclick: () => { AS.view = 'result'; bdRender(); } }, '今夜の結果へ')];
}
function alResult(b, A) {
  const L = b.last, seat = Math.max(0, AS.seat), g = L.gain[seat], order = b.p.map((_, s) => s).sort((x, y) => b.p[y].fame - b.p[x].fame), myO = L.orders.filter(o => o.s === seat);
  const lines = [g.gold ? ['薬を売った', `+${g.gold} 金`] : null, ...myO.map(o => [`${ALC.ORDERS[o.id][0]}の注文に納めた`, `+${o.f} 名声`]), g.aged ? ['眠りの薬を寝かせた', `熟成 +${g.aged}`] : null].filter(Boolean);
  return [h('div', { class: 'al-bar' }, h('div', { class: 'd' }, h('small', null, '日'), h('b', null, `${L.day} / ${ALC.DAYS}`))), h('div', { class: 'al-ttl' }, '今夜の結果'),
    h('div', { class: 'al-mid s' }, order.map((s, i) => h('div', { class: 'al-rr' + (s === seat ? ' me' : '') }, h('i', null, String(i + 1)), alImg(A && A.face[s], 'f'), h('span', null, bdName(b.seats[s])), h('em', null, L.gain[s].fame ? `+${L.gain[s].fame}` : ''), h('b', null, String(b.p[s].fame)))), lines.map(([a, c]) => h('div', { class: 'al-ln' }, h('span', null, a), h('b', null, c)))),
    h('button', { class: 'al-go', onclick: () => { AS.view = doc.status === 'over' ? 'final' : 'morning'; bdRender(); } }, doc.status === 'over' ? '最後の順位へ' : `${b.day}日目の朝へ`)];
}
function alFinal(b, A) {
  const r = b.result, order = b.p.map((_, s) => s).sort((x, y) => r.score[y] - r.score[x]);
  if (!AS.pod && A) try { AS.pod = AL3.podium(order); } catch (e) { console.warn(e); }
  const host = local || doc.host === me, names = r.win.map(s => bdName(b.seats[s])).join('・');
  return [AS.pod ? h('img', { class: 'al-bg', src: AS.pod, alt: '表彰台' }) : null, h('div', { class: 'al-win' }, h('b', null, `${names}の勝ち！`), h('small', null, `${r.score[r.win[0]]}点`)),
    h('div', { class: 'al-mid e' }, order.map((s, i) => h('div', { class: 'al-ln' }, h('span', null, `${i + 1}位 ${bdName(b.seats[s])}${r.titles[s].length ? `（${r.titles[s].join('・')}）` : ''}`), h('b', null, `${r.score[s]}点`)))),
    host ? h('div', { class: 'al-row' }, h('button', { class: 'al-sub', onclick: backToHub }, 'ゲーム選択へ'), h('button', { class: 'al-go', onclick: rematch }, 'もう一度')) : h('div', { class: 'al-note' }, '部屋主が次のゲームを選んでいます')];
}
function alcView() {
  const g = doc, b = g.b, A = AL3.get(), key = b.gid;
  if (AS.key !== key) { AS.key = key; AS.night = 0; AS.shown = -1; AS.pod = ''; AS.view = 'morning'; AS.day = 0; }
  // 夜の結果が来たら、まず夜の公開を見せる
  if (b.last && b.last.day > AS.night) { AS.night = b.last.day; AS.view = 'night'; }
  const seat = alSeat();
  if (seat >= 0 && g.status === 'playing' && (AS.day !== b.day || AS.seat !== seat)) { const v = AS.view; alFresh(seat); if (v === 'wait' || v === 'make' || v === 'buy' || v === 'sell') AS.view = 'morning'; }
  let parts;
  const humans = alHumans(b).length;
  if (AS.view === 'night') parts = alNight(b, A);
  else if (AS.view === 'result') parts = alResult(b, A);
  else if (g.status === 'over') parts = alFinal(b, A);
  else if (seat < 0 || (!local && b.done[seat])) parts = alWait(b, A);
  else if (local && humans > 1 && AS.shown !== seat) parts = [A ? h('img', { class: 'al-bg', src: A.day.url, alt: '' }) : null, h('div', { class: 'al-mid c' }, h('div', { class: 'al-note big' }, `${bdName(b.seats[seat])}の番です`, h('small', null, 'ほかの人は 画面を見ないでね'))), h('button', { class: 'al-go', onclick: () => { AS.shown = seat; AS.view = 'morning'; bdRender(); } }, '見る')];
  else parts = { morning: alMorning, make: alMake, buy: alBuy, sell: alSell, wait: alWait }[AS.view](b, A);
  return h('div', { class: 'al' + (AS.view === 'night' || g.status === 'over' ? ' night' : '') }, parts);
}
/* ---- 遊びかた・チケット ---- */
function alSlides() {
  const A = AL3.get(), im = (u, c) => alImg(u, c || 'al-sla');
  return [
    { t: '昼に薬を作って 夜に売る', s: `全部で${ALC.DAYS}日。いっせいに進む`, art: () => im(A && A.day.url, 'al-slabig') },
    { t: '手札の材料で 薬をつくる', s: '硫黄2枚で 火の薬', art: () => h('div', { class: 'sla-row' }, im(A && A.art.S), im(A && A.art.S), h('span', { class: 'sla-arr' }, '→'), im(A && A.bottle.fire)) },
    { t: 'お金でカードを買う', s: '1日に1回。デッキがだんだん強くなる', art: () => h('div', { class: 'sla-row' }, im(A && A.art.c3), h('span', { class: 'sla-arr' }, '→'), im(A && A.art.pupil)) },
    { t: '夜、せーの！で いっせいに売る', s: '同じ薬をみんなで売ると 安くなる', art: () => im(A && A.night.url, 'al-slabig') },
    { t: '名声がいちばん多い人の勝ち', s: '注文に納めるか、町へ寄付すると もらえる', art: () => slaRank([['1位', '名声 42'], ['2位', '名声 37'], ['3位', '名声 30']]) },
  ];
}
function alTicketArt(art) {
  art.classList.add('tk-css', 'tk-alc'); const put = () => { const A = AL3.get(); if (A && art.isConnected && !art.querySelector('img')) art.append(h('img', { class: 'tka-alc', src: A.night.url, alt: '' })); };
  if (AL3.get()) { setTimeout(put, 0); return; } AL3.load().then(put).catch(() => { });
}
