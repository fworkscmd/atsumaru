/* =================== トランプ（大富豪・ババ抜き）の画面 =================== */
// board-ui.js のうしろに差し込まれる（app.js の変数と、盤のゲームの BS・bdHead・bdOverCard などを共有）
const CARDG = { daifugo: DFG, babanuki: OLD };
const CS = { sel: new Set(), shown: -1, view: -1, lhover: -1, seen: 0, npcKey: '', npcAt: 0 };
const cdIsNpc = id => CARD.isNpc(id);
const SUIT_N = { S: 'スペード', H: 'ハート', D: 'ダイヤ', C: 'クラブ' };
// 見ている席：オンラインは自分。1台で遊ぶときは、さっきまで操作していた人
function cdView() {
  const b = doc.b; if (!local) return Math.max(0, b.seats.indexOf(me));
  const a = cdActing(); if (a >= 0) CS.view = a;
  return CS.view >= 0 ? CS.view : Math.max(0, b.seats.findIndex(id => !cdIsNpc(id)));
}
// この端末でいま操作できる席（なければ -1）
function cdActing() {
  const g = doc, b = g.b; if (g.status !== 'playing') return -1;
  let cand = [];
  if (g.game === 'daifugo') cand = b.phase === 'play' ? [b.turn] : b.phase === 'exchange' ? Object.keys(b.give || {}).map(Number) : [];
  else cand = [b.turn];
  cand = cand.filter(s => !cdIsNpc(b.seats[s]));
  if (!local) { const m = b.seats.indexOf(me); return cand.includes(m) ? m : -1; }
  return cand.length ? cand[0] : -1;
}
const cdHumans = () => doc.b.seats.filter(id => !cdIsNpc(id)).length;
function cdSubOf(s) {
  const g = doc, b = g.b;
  if (g.game === 'daifugo') {
    const k = b.out.indexOf(s); if (k >= 0) return DFG.titles(b.seats.length)[k];
    if (b.phase === 'play' && b.passed && b.passed[s] && b.field) return 'パス';
    if (b.prev) { const p = b.prev.indexOf(s); if (p >= 0) return '前回 ' + DFG.titles(b.seats.length)[p]; }
    return '';
  }
  return b.out.includes(s) ? 'あがり' : '';
}
const cdNow = s => { const g = doc, b = g.b; if (g.status !== 'playing') return false; if (g.game === 'daifugo') return b.phase === 'play' ? b.turn === s : b.phase === 'exchange' && !!(b.give && b.give[s]); return b.turn === s; };
/* ---- 卓：緑のフェルトを真上から（tools/cards2d-mockup.html の1）。上にほかの人、まん中に場、下に自分の手札 ---- */
const CD_SUIT = { S: '♠︎', H: '♥︎', D: '♦︎', C: '♣︎' };
function cdFace(c, cls, tap) {
  if (c === 'JK') return h('div', { class: 'cf jk ' + (cls || ''), onclick: tap }, h('b', null, 'JK'), h('em', null, '★'));
  const r = c[1] === 'T' ? '10' : c[1], s = CD_SUIT[c[0]];
  return h('div', { class: 'cf' + (c[0] === 'H' || c[0] === 'D' ? ' r ' : ' ') + (cls || ''), onclick: tap }, h('b', null, r), h('i', null, s), h('em', null, s));
}
const cdBack = (cls, tap) => h('div', { class: 'cf bk ' + (cls || ''), onclick: tap });
// 横1列に重ねて並べる（枚数が多いほど重なりを深くして、幅に収める）
function cdRow(els, W, avail, arc) {
  const n = els.length, step = n > 1 ? Math.min(W * 1.06, (avail - W) / (n - 1)) : 0;
  els.forEach((el, i) => { const k = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0; el.style.left = (i * step) + 'px'; el.style.setProperty('--k', k.toFixed(3)); el.style.setProperty('--a', arc); });
  return h('div', { class: 'cd-row', style: `width:${Math.ceil(W + step * Math.max(0, n - 1))}px;--w:${W}px` }, els);
}
// ほかの人：裏向きの扇と名札
function cdOpp(s, hov) {
  const b = doc.b, id = b.seats[s], n = b.hands[id].length, k = Math.min(n, 7), sub = cdSubOf(s);
  const fan = h('div', { class: 'cd-fan' }, Array.from({ length: k }, (_, i) => { const el = cdBack(hov != null && Math.round(hov * (k - 1) / Math.max(1, n - 1)) === i ? 'hov' : ''); el.style.setProperty('--k', (i - (k - 1) / 2).toFixed(2)); return el; }));
  return h('div', { class: 'cd-op' + (b.out.includes(s) ? ' done' : '') }, fan, h('span', { class: 'cd-tag' + (cdNow(s) ? ' now' : '') }, h('b', null, bdName(id)), h('small', null, n ? `${n}枚` : ''), sub ? h('i', null, sub) : null));
}
function cdTable(view, act, hidden) {
  const g = doc, b = g.b, dfg = g.game === 'daifugo', n = b.seats.length, playing = g.status === 'playing';
  const small = innerHeight <= 740, avail = Math.min(520, (BS.root && BS.root.clientWidth) || innerWidth) - 24;
  const from = dfg ? -1 : OLD.from(b), pulling = !dfg && playing && act === view && act >= 0;
  // ほかの人がだれかのカードをさわっている（ババ抜き）
  const hov = !dfg && playing && b.hover && !pulling ? b.hover : null;
  const others = Array.from({ length: n - 1 }, (_, i) => (view + 1 + i) % n);
  const opps = h('div', { class: 'cd-opps' + (others.length > 4 ? ' many' : '') }, others.map(s => cdOpp(s, hov && from === s && from !== view ? hov.i : null)));
  let mid;
  if (dfg) {
    const f = b.field, key = f ? b.seq : '';
    mid = h('div', { class: 'cd-mid' }, h('div', { class: 'cd-field' + (f ? '' : ' empty') },
      f ? h('span', { class: 'cd-who' }, `${bdName(b.seats[f.by])}が 出した`) : h('span', { class: 'cd-who' }, '場は空いています'),
      f ? f.cards.map(c => cdFace(c, CS.fieldKey !== key ? 'drop' : '')) : null));
    CS.fieldKey = key;
  } else {
    const total = b.seats.reduce((x, id) => x + b.hands[id].length, 0), pile = 53 - total;
    let pull = null;
    if (pulling) {
      const cnt = b.hands[b.seats[from]].length, cur = local ? CS.lhover : (b.hover && b.hover.seat === view ? b.hover.i : -1), W = small ? 40 : 46;
      pull = h('div', { class: 'cd-pull' }, h('span', { class: 'cd-who' }, `${bdName(b.seats[from])}の手札`),
        cdRow(Array.from({ length: cnt }, (_, i) => cdBack(i === cur ? 'hov' : '', () => cdTap({ target: i }))), W, avail - 20, 7));
    }
    mid = h('div', { class: 'cd-mid' }, pull, h('div', { class: 'cd-pile' }, Array.from({ length: Math.min(6, Math.ceil(pile / 2)) }, (_, i) => h('div', { class: 'cf bk', style: `--r:${[-14, 9, -4, 17, -21, 4][i]}deg;--x:${[-8, 7, -2, 10, -12, 3][i]}px;--y:${[-3, 2, 5, -5, 6, -1][i]}px` })),
      h('span', null, pile ? `すてたペア ${pile / 2 | 0}組` : 'すてたペア')));
  }
  // 自分の手札
  const myId = b.seats[view], hand = b.hands[myId] || [], W = small ? 40 : 46;
  let sel = CS.sel; if (!dfg && hov && from === view) sel = new Set([hand[hov.i]]);
  const mine = hidden ? hand.map(() => cdBack()) : hand.map((c, i) => cdFace(c, sel.has(c) ? 'up' : '', dfg ? () => cdTap({ hand: i }) : null));
  const me = h('div', { class: 'cd-me' }, hand.length ? cdRow(mine, W, avail, 3) : h('span', { class: 'cd-who' }, b.out.includes(view) ? 'あがり！' : ''),
    h('span', { class: 'cd-tag me' + (cdNow(view) ? ' now' : '') }, h('b', null, local ? bdName(myId) : 'あなた'), h('small', null, `${hand.length}枚`), cdSubOf(view) ? h('i', null, cdSubOf(view)) : null));
  return [opps, mid, me];
}
// 起きたこと（8切り・革命など）を大きく知らせる
function cdEvents() {
  const b = doc.b, ev = b.last && b.last.seq > CS.seen ? b.last : null; CS.seen = Math.max(CS.seen, b.seq); if (!ev) return;
  const who = s => bdName(b.seats[s]);
  if (doc.game === 'daifugo') {
    if (ev.kind === 'play') { const t = [ev.rev && (b.rev ? '革命！' : '革命返し！'), ev.eight && '8切り！', ev.s3 && 'スペ3返し！', ev.back && '11バック', ev.lock && 'しばり！'].filter(Boolean); if (ev.done) t.push(`${who(ev.seat)}が ${DFG.titles(b.seats.length)[ev.done - 1]}！`); if (t.length) bdBanner(t.join('　')); }
    if (ev.kind === 'pass' && ev.flow) bdBanner('場が流れた');
    if (ev.kind === 'round') CS.sel.clear();
  } else if (ev.kind === 'draw') {
    const t = []; if (ev.pair) t.push(`${who(ev.seat)}が ペアをすてた`); if (ev.outMe) t.push(`${who(ev.seat)}が あがり！`); if (ev.outFrom) t.push(`${who(ev.from)}が あがり！`); if (t.length) bdBanner(t.join('　'));
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
  }
}
function cardView() {
  const g = doc, b = g.b, dfg = g.game === 'daifugo', over = g.status !== 'playing';
  cdEvents();
  const act = cdActing(), view = cdView();
  const cover = local && cdHumans() > 1 && act >= 0 && CS.shown !== act && !over;
  if (!cover && act >= 0) CS.shown = act;
  const head = bdHead(BD_TITLE[g.game], `${local ? '1台で遊ぶ' : '招待コード ' + tableId}${dfg ? ` ・ ${b.round} / ${DFG.ROUNDS}回戦` : ''}`, g.game);
  const coverEl = cover ? h('div', { class: 'cd-cover' }, h('b', null, `${bdName(b.seats[act])}の番です`), h('span', null, 'ほかの人は 画面を見ないでね'), h('button', { class: 'pill on', onclick: () => { CS.shown = act; CS.sel.clear(); CS.lhover = -1; bdRender(); } }, '手札を見る')) : null;
  // 1台を回しているあいだは手札をふせる
  const stage = h('div', { class: 'cd-stage' }, cdTable(view, act, cover || (local && cdHumans() > 1 && act < 0)), over ? null : cdInfo(act, view), over ? null : cdActs(act, view, cover), coverEl);
  return [head, stage, over ? cdOver(view) : dfg && b.phase === 'result' ? cdRound() : null];
}
function cdInfo(act, view) {
  const g = doc, b = g.b, chips = [];
  let text = '';
  if (g.game === 'daifugo') {
    if (b.rev) chips.push('革命中'); if (b.back) chips.push('11バック'); if (b.lock) chips.push(`しばり ${b.lock.split('').map(s => SUIT_N[s]).join('・')}`);
    if (b.phase === 'exchange') { const gv = act >= 0 && b.give[act]; text = gv ? `${bdName(b.seats[gv.to])}に 返すカードを ${gv.k}枚 えらんでね` : 'カードを交換しています…';
      const got = b.got && b.got[view]; if (got && got.length) chips.push('もらった：' + got.map(CARD.name).join('・')); }
    else if (b.phase === 'play') text = act >= 0 ? (b.field ? '出すカードをえらぶか、パス' : '好きなカードから出せます（場が空いています）') : `${bdName(b.seats[b.turn])}の番`;
    else text = `${b.round}回戦おわり`;
  } else {
    const from = OLD.from(b);
    if (act >= 0) text = `${bdName(b.seats[from])}から 1枚えらんでね（2回タップで引く）`;
    else text = from === view ? `${bdName(b.seats[b.turn])}が あなたのカードを えらんでいます…` : `${bdName(b.seats[b.turn])}が ${bdName(b.seats[from])}から引いています`;
  }
  return h('div', { class: 'cd-info' }, chips.length ? h('div', { class: 'cd-chips' }, chips.map(c => h('span', null, c))) : null, h('span', { class: 'cd-t' }, BS.pending ? '送っています…' : text));
}
function cdActs(act, view, cover) {
  const g = doc, b = g.b;
  if (cover) return h('div', { class: 'cd-acts' });
  if (g.game === 'daifugo') {
    const sel = [...CS.sel].filter(c => b.hands[b.seats[view]].includes(c));
    if (b.phase === 'play' && act >= 0) return h('div', { class: 'cd-acts' },
      h('button', { class: 'pill', disabled: !b.field || BS.pending, onclick: () => cdSend({ t: 'pass' }, act) }, 'パス'),
      h('button', { class: 'pill on', disabled: !sel.length || !DFG.canPlay(b, sel) || BS.pending, onclick: () => cdSend({ t: 'play', cards: sel }, act) }, sel.length ? `${sel.length}枚 出す` : '出す'));
    if (b.phase === 'exchange' && act >= 0) { const k = b.give[act].k; return h('div', { class: 'cd-acts' }, h('button', { class: 'pill on', disabled: sel.length !== k || BS.pending, onclick: () => cdSend({ t: 'give', cards: sel }, act) }, `${k}枚 返す（${sel.length}/${k}）`)); }
    return h('div', { class: 'cd-acts' });
  }
  // ババ抜き：自分の手札をまぜて、引く人をじらせる（オンラインだけ）
  const mine = b.hands[b.seats[view]] || [];
  return h('div', { class: 'cd-acts' }, !local && act < 0 && mine.length > 1 && !cdIsNpc(b.seats[view]) ? h('button', { class: 'pill', disabled: BS.pending, onclick: () => { const n = mine.slice(); for (let i = n.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [n[i], n[j]] = [n[j], n[i]]; } cdSend({ t: 'order', hand: n }, view); } }, '手札をまぜる') : null);
}
// 3Dのカードをタップしたとき
function cdTap(p) {
  const g = doc; if (!g || g.status !== 'playing' || BS.pending) return;
  const b = g.b, act = cdActing(), view = cdView();
  if (local && cdHumans() > 1 && (act < 0 || CS.shown !== act)) return;
  if (g.game === 'daifugo') {
    if (p.hand == null) return; const c = b.hands[b.seats[view]][p.hand]; if (!c) return;
    if (CS.sel.has(c)) CS.sel.delete(c); else CS.sel.add(c); bdRender(); return;
  }
  if (p.target == null) return;
  if (act < 0) { toast('いまはほかの人の番です'); return; }
  const cur = local ? CS.lhover : (b.hover && b.hover.seat === act ? b.hover.i : -1);
  if (cur === p.target) { CS.lhover = -1; cdSend({ t: 'draw', i: p.target }, act); return; }
  if (local) { CS.lhover = p.target; bdRender(); } else cdSend({ t: 'hover', i: p.target }, act);
}
function cdSend(a, seat) {
  if (BS.pending) return;
  const g = doc, b = g.b, E = CARDG[g.game], seq0 = b.seq, id = local ? b.seats[seat] : me;
  try { E.act(g, id, a); } catch (e) { toast(e.message); return; }
  if (a.t === 'play' || a.t === 'give') CS.sel.clear();
  if (local) { doc = E.act(doc, id, a); afterChange(); return; }
  BS.pending = a.t !== 'hover'; bdRender();
  withLease(d => d && d.status === 'playing' && d.b && d.b.seq === seq0 ? E.act(d, me, a) : null, a.t === 'hover')
    .then(() => { BS.pending = false; if (BS.root && BS.root.isConnected) bdRender(); });
}
// 大富豪：1回戦ごとの順位
function cdRound() {
  const b = doc.b, ts = DFG.titles(b.seats.length), host = local || doc.host === me;
  return h('div', { class: 'bd-over' }, h('div', { class: 'bd-card' }, h('small', null, `${b.round}回戦の結果`),
    h('div', { class: 'cd-rank' }, b.out.map((s, i) => h('div', null, h('b', null, ts[i]), h('span', null, bdName(b.seats[s])), h('i', null, `${b.points[s]}点`)))),
    host ? h('button', { class: 'pill on', onclick: () => { CS.sel.clear(); cdSend({ t: 'next' }, 0); } }, `${b.round + 1}回戦へ`) : h('span', { class: 'hub-meta' }, '部屋主が次の回へ進めます')));
}
function cdOver(view) {
  const g = doc, b = g.b, solo = !local || b.seats.some(cdIsNpc);
  if (g.game === 'daifugo') {
    const order = b.seats.map((_, s) => s).sort((x, y) => b.points[y] - b.points[x]), win = b.result.win;
    const title = solo && !local ? (win.includes(view) ? 'あなたの勝ち！' : `${win.map(s => bdName(b.seats[s])).join('・')}の勝ち`) : `${win.map(s => bdName(b.seats[s])).join('・')}の勝ち！`;
    return bdOverCard(title, `${DFG.ROUNDS}回戦の合計点`, h('div', { class: 'cd-rank' }, order.map((s, i) => h('div', null, h('b', null, `${i + 1}位`), h('span', null, bdName(b.seats[s])), h('i', null, `${b.points[s]}点`)))));
  }
  const lose = b.result.lose, place = b.out.indexOf(view) + 1;
  const title = !local ? (lose === view ? 'あなたの負け…' : `${place}番目に あがり！`) : `${bdName(b.seats[lose])}の負け…`;
  return bdOverCard(title, 'ジョーカーを最後まで持っていた人の負け', h('div', { class: 'cd-rank' }, b.out.map((s, i) => h('div', null, h('b', null, s === lose ? '負け' : `${i + 1}番`), h('span', null, bdName(b.seats[s]))))));
}
// コンピュータの番：少し考えるふりをしてから。オンラインでは卓の1人目の端末だけが進める
setInterval(() => {
  if (!isCardDoc() || doc.status !== 'playing' || BS.pending || !BS.root || !BS.root.isConnected) return;
  const b = doc.b, dfg = doc.game === 'daifugo'; let s = -1;
  if (dfg) { if (b.phase === 'play' && cdIsNpc(b.seats[b.turn])) s = b.turn; else if (b.phase === 'exchange') { const k = Object.keys(b.give || {}).find(x => cdIsNpc(b.seats[+x])); if (k != null) s = +k; } }
  else if (cdIsNpc(b.seats[b.turn])) s = b.turn;
  if (s < 0) return;
  const key = b.seq + ':' + s; if (CS.npcKey !== key) { CS.npcKey = key; CS.npcAt = Date.now(); return; }
  if (Date.now() - CS.npcAt < 900) return;
  const mv = d => CARDG[d.game].act(d, d.b.seats[s], dfg ? DFG.npc(d.b, s) : OLD.npc(d.b));
  if (local) { try { doc = mv(doc); afterChange(); } catch (e) { console.warn(e); } return; }
  if (doc.players[0] !== me) return;
  const seq0 = b.seq; BS.pending = true;
  withLease(d => d && d.status === 'playing' && d.b && d.b.seq === seq0 ? mv(d) : null, true).then(() => { BS.pending = false; if (BS.root && BS.root.isConnected) bdRender(); });
}, 300);
const isCardDoc = () => !!doc && !!CARDG[doc.game] && !!doc.b;

/* ---- 遊びかた・チケットの絵 ---- */
const slaCard = (r, red, cls = '') => h('span', { class: 'sla-card ' + (red ? 'r ' : '') + cls }, r);
function cdSlides(id) {
  if (id === 'daifugo') return [
    { t: '場より強いカードを出す', s: '同じ枚数で。出せなければパス', art: () => slaFlow(slaCard('9'), '→', slaCard('K', true)) },
    { t: '強さは 3 → … → A → 2', s: 'ジョーカーが いちばん強い', art: () => h('div', { class: 'sla-row' }, slaCard('3'), slaCard('8', true), slaCard('A'), slaCard('2', true), slaCard('★', false, 'jk')) },
    { t: '同じ数字なら 何枚でも', s: '4枚で 革命！強さが ぎゃくに', art: () => h('div', { class: 'sla-row' }, slaCard('6'), slaCard('6', true), slaCard('6'), slaCard('6', true)) },
    { t: '8切り・しばり・11バック', s: 'スペードの3は ジョーカーに勝てる', art: () => h('div', { class: 'sla-row' }, slaCard('8', true), slaCard('J'), slaCard('3', false, 'sp')) },
    { t: `早く上がった人が 大富豪`, s: `${DFG.ROUNDS}回戦の 合計点で勝負`, art: () => slaRank([['大富豪', '3点'], ['富豪', '2点'], ['大貧民', '0点']]) },
  ];
  return [
    { t: 'となりの人から 1枚引く', s: 'さわったカードは あいてに見える', art: () => slaFlow(h('div', { class: 'sla-row' }, slaCard('', false, 'bk'), slaCard('', false, 'bk up'), slaCard('', false, 'bk')), '→', slaCard('7', true)) },
    { t: '同じ数字の2枚は すてる', s: '自動で すてられる', art: () => slaFlow(slaCard('7', true), slaCard('7'), '→', h('span', { class: 'sla-arr' }, 'ぽい')) },
    { t: 'ジョーカーを 最後まで持っていたら 負け', s: '手札は まぜて じらせる', art: () => slaCard('★', false, 'jk big') },
  ];
}
function cdTicketArt(id, art) {
  art.classList.add('tk-css', 'tk-cards');
  const cs = id === 'daifugo' ? [['2', 1], ['A', 0], ['★', 2], ['K', 1]] : [['', 3], ['★', 2], ['', 3]];
  art.append(h('div', { class: 'tka-cards' }, cs.map(([r, k], i) => h('span', { class: ['', 'r', 'jk', 'bk'][k], style: `--i:${i - (cs.length - 1) / 2}` }, r))));
}
