/* =================== 盤のゲーム（リバーシ・チェス・将棋）とビンゴ大会の画面 =================== */
// app.js の /*__BOARD_UI__*/ の位置に差し込まれる（app.js の変数を共有）
const BS = { root: null, sel: null, seen: 0, pending: false, tab: null, cache: null, taps: new Set(), peek: false, lastSeat: null, fx: null, ro: null };
const isBoardDoc = () => !!doc && (doc.game === 'boxing' || doc.game === 'wordwolf' || doc.game === 'bingo' || doc.game === 'alchemy' || doc.game === 'bomb' || doc.game === 'tower' || !!DUEL[doc.game] || !!CARDG[doc.game]) && !!doc.b;
const BD_TITLE = { reversi: 'リバーシ', chess: 'チェス', shogi: '将棋', bingo: 'ビンゴ大会', daifugo: '大富豪', babanuki: 'ババ抜き', alchemy: '月夜の錬金市場', bomb: 'ばくだんパス', tower: 'ぐらぐらタワー', wordwolf: 'ワードウルフ', boxing: 'ボクシング' };
const CHESS_G = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }, CHESS_N = { Q: 'クイーン', R: 'ルーク', B: 'ビショップ', N: 'ナイト' };
const chessGlyph = t => CHESS_G[t] + '︎'; // 絵文字にならないように文字として出す
const SHOGI_K = { K: '玉', R: '飛', B: '角', G: '金', S: '銀', N: '桂', L: '香', P: '歩', D: '龍', H: '馬', Z: '全', M: '圭', Y: '杏', T: 'と' };
const CHESS_ICON = '<span class="gi-chess">&#9822;&#xFE0E;</span>';
const BINGO_ICON = '<span class="gi-ball"><small>B</small>7</span>';
function bdName(id) {
  if (id === NPC) return 'コンピュータ';
  if (/^npc\d/.test(id)) return 'コンピュータ' + id.slice(3); // トランプは何人もいるので番号つき
  if (local) return 'プレイヤー' + String(id).replace(/\D/g, '');
  const nk = doc && doc.nicks && doc.nicks[id]; if (nk) return nk;
  if (id === me) return myNick || 'あなた';
  return names[id] || 'ゲスト';
}
// 遊びかたのスライド（絵は盤やカードの小さな見本。細かいルールは書かない）
// 盤の見本：rows は1行1文字（b 黒 / w 白 / n 置いたばかりの黒 / d 置ける点 / . 空き）
const slaRev = rows => h('div', { class: 'sla-rev', style: `--n:${rows[0].length}` }, rows.join('').split('').map(c =>
  h('i', { class: c === 'd' ? 'd' : null }, 'bwn'.includes(c) ? h('b', { class: c === 'w' ? 'w' : c === 'n' ? 'n' : null }) : null)));
// チェスの見本：cells は {マス番号: [文字, 'w'|'b']}、dots は点、ring は取れる駒の輪
const slaChess = (n, cells, dots = [], ring = [], hot = []) => h('div', { class: 'sla-ch', style: `--n:${n}` }, Array.from({ length: n * n }, (_, i) =>
  h('i', { class: [(Math.floor(i / n) + i % n) % 2 ? 'dk' : '', dots.includes(i) ? 'd' : '', ring.includes(i) ? 'r' : '', hot.includes(i) ? 'hot' : ''].join(' ') }, cells[i] ? h('span', { class: 'sla-cp ' + cells[i][1] }, chessGlyph(cells[i][0])) : null)));
const slaKoma = (k, cls = '') => h('span', { class: 'sla-koma ' + cls }, h('i', null, k));
const slaFlow = (...xs) => h('div', { class: 'sla-row' }, xs.map(x => typeof x === 'string' ? h('span', { class: 'sla-arr' }, x) : x));
// ビンゴのカード：holes は穴のあいたマス、line は光らせる列
const BG_NUMS = [3, 18, 33, 49, 64, 7, 21, 40, 52, 70, 11, 26, 0, 57, 62, 1, 29, 38, 46, 75, 14, 17, 35, 55, 68];
const slaBingo = (holes, line = []) => h('div', { class: 'sla-bg' }, 'BINGO'.split('').map(L => h('b', null, L)),
  BG_NUMS.map((v, i) => h('i', { class: [holes.includes(i) || i === 12 ? 'h' : '', line.includes(i) ? 'ln' : ''].join(' ') }, i === 12 ? 'FREE' : String(v))));
function bdSlides(id) {
  if (id === 'alchemy') return alSlides();
  if (id === 'wordwolf') return wwSlides();
  if (id === 'boxing') return bxSlides();
  if (id === 'bomb') return bmSlides();
  if (id === 'tower') return twSlides();
  if (CARDG[id]) return cdSlides(id);
  const vsCpu = { t: 'ひとりなら コンピュータが相手', s: '「投了」で いつでも やめられる', art: () => h('div', { class: 'sla-vs' }, h('span', { class: 'sla-av' }, 'あなた'), h('b', null, 'VS'), h('span', { class: 'sla-av cpu' }, 'コンピュータ')) };
  if (id === 'reversi') return [
    { t: 'はさんで ひっくり返す', s: 'あいての石が 自分の色になる', art: () => h('div', { class: 'sla-col' }, slaRev(['nwwb']), slaFlow('↓'), slaRev(['bbbb'])) },
    { t: '置けるのは はさめる所だけ', s: '置けないときは パス', art: () => slaRev(['.d..', 'dwb.', '.bwd', '..d.']) },
    { t: '石が多いほうの勝ち', s: 'どちらも 置けなくなったら おしまい', art: () => h('div', { class: 'sla-col' }, slaRev(['bbwb', 'bwbb', 'bbbw', 'wbbb']), h('div', { class: 'sla-score' }, '黒 12 ： 白 4')) },
    vsCpu];
  if (id === 'chess') return [
    { t: 'キングを つかまえよう', s: '白と黒で 1手ずつ 指す', art: () => h('div', { class: 'sla-row' }, h('span', { class: 'sla-cp big w' }, chessGlyph('K')), h('span', { class: 'sla-arr' }, 'VS'), h('span', { class: 'sla-cp big b' }, chessGlyph('K'))) },
    { t: '駒をタップ → 点の所へ', s: '取れる駒には 朱の輪', art: () => slaChess(5, { 12: ['N', 'w'], 1: ['P', 'b'] }, [3, 5, 9, 15, 19, 21, 23], [1]) },
    { t: 'にげられなくしたら 勝ち', s: 'チェックメイト！', art: () => slaChess(4, { 0: ['K', 'b'], 5: ['Q', 'w'], 10: ['K', 'w'] }, [], [], [0]) },
    vsCpu];
  if (id === 'shogi') return [
    { t: '王を つかまえたら 勝ち', s: '先手と後手で 1手ずつ 指す', art: () => h('div', { class: 'sla-row' }, slaKoma('王', 'big'), h('span', { class: 'sla-arr' }, 'VS'), slaKoma('玉', 'big flip')) },
    { t: '取った駒は 自分の駒に', s: '自分の番に 好きな所へ 打てる', art: () => slaFlow(slaKoma('銀', 'flip'), '→', slaKoma('銀')) },
    { t: '奥の3段で 成れる', s: '歩が「と」に なって 強くなる', art: () => slaFlow(slaKoma('歩'), '→', slaKoma('と', 'red')) },
    vsCpu];
  return [
    { t: '部屋主が 番号を回す', s: 'ほかの人は カードを1枚ずつ', art: () => h('div', { class: 'sla-ball' }, h('small', null, 'B'), '7') },
    { t: '出た番号を タップ', s: '穴があく', art: () => slaBingo([5, 8, 16, 21]) },
    { t: '1列そろったら ビンゴ！', s: 'たて・よこ・ななめ どれでも', art: () => h('div', { class: 'sla-col' }, slaBingo([10, 11, 13, 14, 3, 19], [10, 11, 12, 13, 14]), h('span', { class: 'sla-btn' }, 'ビンゴ！')) },
    { t: '早く押した人が 上の順位', s: '全員そろうか 部屋主の「おわる」で おしまい', art: () => slaRank([['1位', 'ビンゴ！'], ['2位', 'ビンゴ！'], ['3位', 'あと1つ']]) },
  ];
}
function bdOpenRules(id, foot) { openSlides(BD_TITLE[id], bdSlides(id), foot); }
// ハブのチケットの絵
// チケットの絵はアイコンと同じ
const TK_BG = { daifugo: 'linear-gradient(160deg,#7a5ac0,#4a2f88)', babanuki: 'linear-gradient(160deg,#c04a60,#7f1f36)', reversi: 'linear-gradient(160deg,#2f8a62,#1f6b4a)', shogi: 'linear-gradient(160deg,#6b4a30,#3a2618)', chess: 'linear-gradient(160deg,#4a4d55,#24262b)', wordwolf: '#8fc474' };
function bdTicketArt(id, art) {
  if (TK_BG[id]) { art.classList.add('tk-css'); art.style.background = TK_BG[id]; art.style.position = 'relative'; art.append(h('img', { class: 'tka-ic', src: ICON_ART[id], alt: '' })); return; }
  if (id === 'alchemy') { alTicketArt(art); return; }
  if (id === 'bomb') { bmTicketArt(art); return; }
  if (id === 'tower') { twTicketArt(art); return; }
  if (id === 'boxing') { art.classList.add('tk-css'); art.style.position = 'relative'; art.append(h('img', { class: 'tka-cover', src: ICON_ART.boxing, alt: '' })); return; }
  if (CARDG[id]) { cdTicketArt(id, art); return; }
  art.classList.add('tk-css', 'tk-' + id);
  if (id === 'reversi') {
    const on = { 19: 'b', 26: 'w', 27: 'w', 28: 'b', 29: 'w', 34: 'b', 35: 'b', 36: 'w', 37: 'b', 44: 'w', 43: 'b' };
    art.append(h('div', { class: 'tka-rev' }, Array.from({ length: 64 }, (_, i) => h('i', null, on[i] ? h('b', { class: on[i] }) : null))));
  }
  if (id === 'chess') art.append(h('div', { class: 'tka-chess' }, h('span', { class: 'cp b' }, chessGlyph('K')), h('span', { class: 'cp w' }, chessGlyph('N')), h('span', { class: 'cp w' }, chessGlyph('Q'))));
  if (id === 'shogi') art.append(h('div', { class: 'tka-shogi' }, ['飛', '王', '歩'].map((k, i) => h('span', { class: 'koma' + (i === 1 ? ' big' : '') }, h('i', null, k)))));
  if (id === 'bingo') art.append(h('div', { class: 'tka-bingo' }, [['B', 7], ['I', 22], ['N', 41], ['G', 53], ['O', 68]].map(([l, n]) => h('span', null, h('small', null, l), String(n)))));
}

/* ---- 共通 ---- */
function viewBoard() {
  BS.root = h('div', { class: 'bd bd-' + doc.game });
  BS.sel = null; BS.seen = doc.b.seq; BS.npcSeq = null; BS.pending = false; BS.peek = false; BS.lastSeat = null; BS.taps.clear();
  try { if (window.ResizeObserver) { BS.ro && BS.ro.disconnect(); BS.ro = new ResizeObserver(bdFit); BS.ro.observe(BS.root); } } catch (e) { }
  // リバーシ・将棋・チェスは3Dの盤。読みこむまで（読みこめないときも）ふつうの盤で遊べる
  bd3Drop(); CS.sel.clear(); CS.shown = -1; CS.view = -1; CS.lhover = -1; CS.seen = doc.b.seq; CS.fieldKey = doc.b.field ? doc.b.seq : '';
  if (doc.game === 'tower') { const root = BS.root; twLoad().then(() => { if (BS.root === root && isTowerDoc()) bdRender(); }, () => toast('読みこめませんでした')); }
  if (doc.game === 'boxing') { const root = BS.root; bxLoad().then(() => { if (BS.root === root && isBoxDoc()) bdRender(); }, () => { BX.failed = true; if (BS.root === root && isBoxDoc()) bdRender(); }); }
  if (doc.game === 'wordwolf') { const root = BS.root; wwLoad().then(() => { if (BS.root === root && isWordDoc()) bdRender(); }, () => { }); }
  if (doc.game === 'bomb') { const root = BS.root; bmLoad().then(() => { if (BS.root === root && isBombDoc()) bdRender(); }, () => { }); }
  if (doc.game === 'alchemy') { const root = BS.root; AL3.load().then(() => { if (BS.root === root && isAlcDoc()) bdRender(); }, () => { }); }
  if (DUEL[doc.game]) { const root = BS.root, game = doc.game;
    BD3.load().then(() => { if (BS.root !== root || !isBoardDoc() || doc.game !== game) return; try { BS.b3 = BD3.board(game); } catch (e) { console.warn(e); return; } BS.b3.game = game; BS.b3.onTap = bdTap; bdRender(); }, () => { }); }
  return BS.root;
}
function bd3Drop() { if (BS.b3) { BS.b3.dispose(); BS.b3 = null; } if (BS.c3) { BS.c3.dispose(); BS.c3 = null; } }
function bdRender() {
  if (!BS.root || !BS.root.isConnected) { render(); return; }
  const parts = doc.game === 'boxing' ? boxView() : doc.game === 'wordwolf' ? wordView() : doc.game === 'tower' ? towerView() : doc.game === 'bomb' ? bombView() : doc.game === 'alchemy' ? alcView() : doc.game === 'bingo' ? bingoView() : CARDG[doc.game] ? cardView() : duelView();
  BS.root.replaceChildren(...[parts].flat(2).filter(Boolean));
  bdFit();
}
// 盤は残りの場所に収まるいちばん大きい正方形
function bdFit() {
  const st = BS.root && BS.root.querySelector('.bd-stage'), gr = st && st.querySelector('.bd-grid');
  if (st && BS.b3 && BS.b3.el.parentNode === st) { BS.b3.resize(); return; }
  if (st && BS.c3 && BS.c3.el.parentNode === st) { BS.c3.resize(); return; }
  if (!gr) return;
  const s = Math.floor(Math.min(st.clientWidth, st.clientHeight)), n = +gr.dataset.n;
  if (s <= 0) return;
  gr.style.width = gr.style.height = s + 'px'; gr.style.setProperty('--cell', (s / n) + 'px');
}
function bdHead(title, sub, game) {
  // 終わったあとは「ゲーム選択へ」「もう一度」だけ（卓から出るボタンはまぎらわしいので出さない）
  return h('div', { class: 'bd-head' }, h('div', { class: 'bd-ttl' }, h('b', { role: 'heading', 'aria-level': '1' }, title), h('small', null, sub)),
    h('button', { class: 'hub-ib', 'aria-label': '遊びかた', onclick: () => bdOpenRules(game) }, '?'),
    doc.status === 'playing' ? h('button', { class: 'hub-ib quit', 'aria-label': '中断してホームにもどる', onclick: confirmQuit }, '中断')
      : null);
}
function bdBanner(text) {
  const el = h('div', { class: 'bd-banner', role: 'status' }, text); document.body.append(el);
  setTimeout(() => el.remove(), 2400);
}
function bdConfirm(title, ok, fn) {
  const el = $('sheet'), close = () => { el.hidden = true; el.replaceChildren(); };
  el.className = 'sheet bd-sheet';
  el.replaceChildren(h('div', { class: 'inner', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'bd-card' }, h('b', { class: 'bd-sh-t' }, title),
    h('div', { class: 'bd-endbtns' }, h('button', { class: 'pill', onclick: close }, 'やめる'), h('button', { class: 'pill on', onclick: () => { close(); fn(); } }, ok)))));
  el.hidden = false; el.onclick = e => { if (e.target === el) close(); };
}
function bdOverCard(title, sub, extra) {
  if (BS.peek) return h('button', { class: 'bd-peekback pill on', onclick: () => { BS.peek = false; bdRender(); } }, '結果にもどる');
  const btns = local || doc.host === me
    ? h('div', { class: 'bd-endbtns' }, h('button', { class: 'pill', onclick: backToHub }, 'ゲーム選択へ'), h('button', { class: 'pill on', onclick: rematch }, 'もう一度'))
    : h('div', { class: 'hub-meta c' }, '部屋主が次のゲームを選んでいます');
  return h('div', { class: 'bd-over' }, h('div', { class: 'bd-card' }, h('small', null, 'けっか'), h('b', { class: 'bd-res', role: 'heading', 'aria-level': '2' }, title), sub ? h('span', { class: 'hub-meta' }, sub) : null, extra, btns,
    h('button', { class: 'bd-peek', onclick: () => { BS.peek = true; bdRender(); } }, doc.game === 'bingo' ? 'カードを見る' : CARDG[doc.game] ? 'テーブルを見る' : '盤を見る')));
}

/* ---- リバーシ・チェス・将棋 ---- */
// 自分の席（オンライン）。1台のときは今の番の人の向きで見る
function bdViewSeat() {
  const b = doc.b;
  if (!local) return b.seats.indexOf(me);
  if (doc.status === 'playing' && b.seats[b.turn] !== NPC) BS.lastSeat = b.turn;
  return BS.lastSeat ?? b.seats.findIndex(x => x !== NPC);
}
const bdMine = () => doc.status === 'playing' && doc.b.seats[doc.b.turn] !== NPC && (local || doc.b.seats[doc.b.turn] === me);
// NPC の番：少し考えるふりをしてから指す。オンラインでは卓の1人目の端末だけが進める
setInterval(() => {
  if (!isBoardDoc() || !DUEL[doc.game] || doc.status !== 'playing' || BS.pending || !BS.root || !BS.root.isConnected) return;
  const b = doc.b; if (b.seats[b.turn] !== NPC) return;
  if (BS.npcSeq !== b.seq) { BS.npcSeq = b.seq; BS.npcAt = Date.now(); return; }
  if (Date.now() - BS.npcAt < 900) return;
  const npcMove = d => duelAct(d, NPC, { t: 'move', m: DUEL[d.game].npc(d.b) });
  if (local) { try { doc = npcMove(doc); afterChange(); } catch (e) { console.warn(e); } return; }
  if (doc.players[0] !== me) return;
  const seq0 = b.seq; BS.pending = true;
  withLease(d => d && d.status === 'playing' && d.b && d.b.seq === seq0 && d.b.seats[d.b.turn] === NPC ? npcMove(d) : null, true)
    .then(() => { BS.pending = false; if (BS.root && BS.root.isConnected) bdRender(); });
}, 300);
function bdMoves() {
  if (!BS.cache || BS.cache.b !== doc.b) BS.cache = { b: doc.b, list: doc.status === 'playing' ? DUEL[doc.game].moves(doc.b) : [] };
  return BS.cache.list;
}
function duelView() {
  const g = doc, b = g.b, E = DUEL[g.game], over = g.status !== 'playing';
  const vs = bdViewSeat(), view = Math.max(0, vs), flip = g.game !== 'reversi' && view === 1, mine = bdMine();
  const ev = b.last && b.last.seq > BS.seen ? b.last : null; BS.seen = Math.max(BS.seen, b.seq);
  BS.fx = ev && ev.flips ? new Set(ev.flips) : null;
  if (ev && ev.kind === 'move' && navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
  if (ev && ev.pass != null) bdBanner(`${E.LABEL[ev.pass]}は置ける場所がないのでパス`);
  if (ev && ev.check && !over) bdBanner(g.game === 'chess' ? 'チェック！' : '王手！');
  const head = bdHead(BD_TITLE[g.game], `${local ? '1台で遊ぶ' : '招待コード ' + tableId} ・ ${b.ply}手目`, g.game);
  const b3 = BS.b3 && BS.b3.game === g.game ? BS.b3 : null;
  const stage = h('div', { class: 'bd-stage' + (b3 ? ' is3d' : '') }, b3 ? b3.el : duelGrid(flip, view, mine));
  if (b3) bd3Sync(b3, vs, view, mine);
  const foot = over ? null : h('div', { class: 'bd-foot' }, duelInfo(vs, mine), vs >= 0 || local ? h('button', { class: 'pill', onclick: duelResign }, '投了') : null);
  return [head, duelStrip(1 - view, view, false), stage, duelStrip(view, view, true), foot, over ? duelOver(vs) : null];
}
function bdSwatch(game, s) {
  if (game === 'shogi') return h('span', { class: 'bd-sw koma' + (s ? ' gote' : '') }, h('i', null, s ? '後' : '先'));
  return h('span', { class: 'bd-sw ' + (game === 'reversi' ? (s ? 'w' : 'b') : (s ? 'b' : 'w')) });
}
function duelStrip(s, view, bottom) {
  const g = doc, b = g.b, E = DUEL[g.game], id = b.seats[s], now = g.status === 'playing' && b.turn === s;
  let extra = null;
  if (g.game === 'reversi') { const n = REV.count(b); extra = h('b', { class: 'bd-cnt' }, String(s === 0 ? n.b : n.w)); }
  if (g.game === 'chess') extra = h('span', { class: 'bd-caps' }, chessTaken(b, s));
  if (g.game === 'shogi') extra = shogiHand(s, view, bottom);
  const who = !local && id === me ? `${bdName(id)}（あなた）` : bdName(id);
  return h('div', { class: 'bd-pl' + (now ? ' now' : '') + (g.game === 'shogi' ? ' tall' : '') }, bdSwatch(g.game, s),
    h('div', { class: 'who' }, h('small', null, E.LABEL[s] + (now ? '・手番' : '')), h('b', null, who)), extra);
}
// s の人が取ったチェスの駒（相手の駒がいくつ減ったか）
function chessTaken(b, s) {
  const out = [];
  for (const [t, n] of [['Q', 1], ['R', 2], ['B', 2], ['N', 2], ['P', 8]]) {
    const ch = s === 0 ? t.toLowerCase() : t, left = b.bd.split(ch).length - 1;
    for (let k = left; k < n; k++) out.push(h('span', { class: 'cp ' + (s === 0 ? 'b' : 'w') }, chessGlyph(t)));
  }
  return out;
}
function shogiHand(s, view, bottom) {
  const hand = doc.b.hand[s], can = bottom && bdMine() && doc.b.turn === s;
  const items = SHG.HAND.filter(t => hand[t] > 0).map(t => h(can ? 'button' : 'span', { class: 'bd-hand koma' + (s !== view ? ' opp' : '') + (can && BS.sel === t ? ' sel' : ''), 'aria-label': `持ち駒 ${SHOGI_K[t]} ${hand[t]}枚`, onclick: can ? () => bdHandTap(t) : null },
    h('i', null, SHOGI_K[t]), hand[t] > 1 ? h('em', null, String(hand[t])) : null));
  return h('span', { class: 'bd-hands' }, items.length ? items : h('span', { class: 'hub-meta' }, '持ち駒なし'));
}
// 盤の印：動ける・置けるマス（tg）、さっきの手（lm）、王手の王（chk）
function bdMarks(mine) {
  const g = doc, b = g.b, game = g.game, E = DUEL[game], sel = BS.sel;
  const moves = mine && !BS.pending ? bdMoves() : [], tg = new Set();
  if (game === 'reversi') moves.forEach(m => tg.add(m.t));
  else if (sel != null) moves.filter(m => typeof sel === 'string' ? m.d === sel : m.f === sel).forEach(m => tg.add(m.t));
  const lm = b.last && b.last.kind === 'move' ? b.last.m : null;
  const chk = game !== 'reversi' && g.status === 'playing' && E.check(b) ? E.kingAt(b.bd, b.turn) : -1;
  return { tg, lm, chk, sel };
}
// 3Dの盤に今の局面を渡す。手前に来るのは自分の側（1台で遊ぶときは手番の人。リバーシは回さない）
function bd3Sync(b3, vs, view, mine) {
  const b = doc.b, game = doc.game, cells = game === 'reversi' ? b.cells : b.bd, { tg, lm, chk, sel } = bdMarks(mine), all = [...tg];
  b3.sync({ cells, view: game === 'reversi' && local ? 0 : view, ev: b.last, seq: b.seq, dots: all.filter(i => cells[i] === '.'), caps: all.filter(i => cells[i] !== '.'),
    sel: typeof sel === 'number' ? sel : -1, last: lm ? [lm.f, lm.t] : [], chk });
}
function duelGrid(flip, view, mine) {
  const g = doc, b = g.b, game = g.game, N = game === 'shogi' ? 9 : 8, { tg, lm, chk, sel } = bdMarks(mine);
  const cells = [];
  for (let k = 0; k < N * N; k++) {
    const i = flip ? N * N - 1 - k : k, r = (i / N) | 0, c = i % N, p = game === 'reversi' ? b.cells[i] : b.bd[i];
    const cls = ['bd-c'];
    if (game === 'chess') cls.push((r + c) % 2 ? 'dk' : 'lt');
    if (lm && (lm.t === i || lm.f === i)) cls.push('last');
    if (sel === i) cls.push('sel');
    if (tg.has(i)) cls.push(p !== '.' ? 'cap' : 'dot');
    if (i === chk) cls.push('chk');
    cells.push(h('button', { class: cls.join(' '), 'aria-label': bdCellLabel(game, i, p), onclick: () => bdTap(i) }, bdPiece(game, p, i, view)));
  }
  return h('div', { class: 'bd-grid bd-g-' + game, 'data-n': N, style: `--n:${N}` }, cells);
}
function bdPiece(game, p, i, view) {
  if (p === '.') return null;
  if (game === 'reversi') return h('i', { class: 'disc ' + p + (BS.fx && BS.fx.has(i) ? ' flip' : '') });
  if (game === 'chess') return h('span', { class: 'cp ' + (CHS.side(p) ? 'b' : 'w') }, chessGlyph(p.toUpperCase()));
  const t = p.toUpperCase(), s = SHG.side(p);
  return h('span', { class: 'koma' + (s !== view ? ' opp' : '') + (SHG.BASE[t] ? ' pro' : '') }, h('i', null, t === 'K' && s === 1 ? '王' : SHOGI_K[t]));
}
function bdCellLabel(game, i, p) {
  const N = game === 'shogi' ? 9 : 8, r = (i / N) | 0, c = i % N;
  if (game === 'shogi') return `${9 - c}${'一二三四五六七八九'[r]}${p !== '.' ? ' ' + (SHG.side(p) ? '後手の' : '先手の') + SHOGI_K[p.toUpperCase()] : ''}`;
  if (game === 'chess') return `${'abcdefgh'[c]}${8 - r}${p !== '.' ? ' ' + (CHS.side(p) ? '黒の' : '白の') + ({ K: 'キング', P: 'ポーン', ...CHESS_N })[p.toUpperCase()] : ''}`;
  return `${'abcdefgh'[c]}${r + 1}${p === 'b' ? ' 黒' : p === 'w' ? ' 白' : ''}`;
}
function bdTap(i) {
  const g = doc; if (!g || g.status !== 'playing') return;
  if (!bdMine()) { toast(bdViewSeat() < 0 ? '観戦中です' : '相手の番です'); return; }
  if (BS.pending) return;
  const b = g.b, moves = bdMoves();
  if (g.game === 'reversi') { const m = moves.find(x => x.t === i); if (m) bdSend({ t: 'move', m }); else toast('そこには置けません'); return; }
  const E = DUEL[g.game], p = b.bd[i];
  if (BS.sel != null) {
    const c = moves.filter(m => m.t === i && (typeof BS.sel === 'string' ? m.d === BS.sel : m.f === BS.sel));
    if (c.length === 1) { bdSend({ t: 'move', m: c[0] }); return; }
    if (c.length > 1) { bdPromote(c); return; }
  }
  if (p !== '.' && E.side(p) === b.turn) {
    BS.sel = BS.sel === i ? null : i;
    if (BS.sel != null && !moves.some(m => m.f === i)) { toast('その駒は動かせません'); BS.sel = null; }
  } else BS.sel = null;
  bdRender();
}
function bdHandTap(t) {
  if (!bdMine() || BS.pending) return;
  BS.sel = BS.sel === t ? null : t;
  if (BS.sel && !bdMoves().some(m => m.d === t)) { toast('いまは打てる場所がありません'); BS.sel = null; }
  bdRender();
}
// 成る／成らない、ポーンを何にするか
function bdPromote(list) {
  const el = $('sheet'), close = () => { el.hidden = true; el.replaceChildren(); };
  const pick = m => { close(); bdSend({ t: 'move', m }); };
  const s = doc.b.turn;
  let opts;
  if (doc.game === 'chess') opts = list.map(m => h('button', { class: 'bd-pro', onclick: () => pick(m) }, h('span', { class: 'cp ' + (s ? 'b' : 'w') }, chessGlyph(m.pr)), CHESS_N[m.pr]));
  else {
    const t = doc.b.bd[list[0].f].toUpperCase();
    opts = [list.find(m => m.pr), list.find(m => !m.pr)].map(m => h('button', { class: 'bd-pro', onclick: () => pick(m) }, h('span', { class: 'koma' + (m.pr ? ' pro' : '') }, h('i', null, SHOGI_K[m.pr ? SHG.PRO[t] : t])), m.pr ? '成る' : '成らない'));
  }
  el.className = 'sheet bd-sheet';
  el.replaceChildren(h('div', { class: 'inner', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'bd-card' }, h('b', { class: 'bd-sh-t' }, doc.game === 'chess' ? 'ポーンを何にする？' : '成りますか？'),
    h('div', { class: 'bd-pros' }, opts), h('button', { class: 'pill', onclick: close }, 'やめる'))));
  el.hidden = false; el.onclick = e => { if (e.target === el) close(); };
}
function bdSend(a) {
  if (BS.pending) return;
  const b = doc.b, who = local ? b.seats[b.turn] : me, seq0 = b.seq;
  let g; try { g = duelAct(doc, who, a); } catch (e) { toast(e.message); return; }
  BS.sel = null;
  if (local) { doc = g; afterChange(); return; }
  BS.pending = true; bdRender();
  withLease(d => d && d.status === 'playing' && d.b && d.b.seq === seq0 ? duelAct(d, me, a) : null)
    .then(() => { BS.pending = false; if (BS.root && BS.root.isConnected) bdRender(); });
}
function duelResign() {
  const ss = doc.b.seats, who = !local ? me : ss[doc.b.turn] !== NPC ? ss[doc.b.turn] : ss.find(x => x !== NPC);
  bdConfirm(local && !ss.includes(NPC) ? `${bdName(who)}が投了しますか？` : '投了しますか？', '投了する', () => {
    if (local) { try { doc = duelAct(doc, who, { t: 'resign' }); afterChange(); } catch (e) { toast(e.message); } return; }
    withLease(d => d && d.status === 'playing' && d.b ? duelAct(d, me, { t: 'resign' }) : null);
  });
}
function duelInfo(vs, mine) {
  const g = doc, b = g.b, E = DUEL[g.game], s = b.turn, nm = bdName(b.seats[s]);
  let t;
  if (vs < 0 && !local) t = `観戦中 ・ ${E.LABEL[s]}（${nm}）の番`;
  else if (BS.pending) t = '送っています…';
  else if (mine && local && !b.seats.includes(NPC)) t = `${nm}の番（${E.LABEL[s]}）`;
  else if (mine) t = g.game === 'reversi' ? 'あなたの番。点のマスに置けます' : BS.sel != null ? '動かす場所をタップ' : 'あなたの番。動かす駒をタップ';
  else t = `${nm}が考えています…`;
  const chk = g.game !== 'reversi' && E.check(b) ? (g.game === 'chess' ? 'チェック！' : '王手！') : null;
  return h('div', { class: 'bd-info' }, chk ? h('b', { class: 'bd-chk' }, chk) : null, h('span', null, t));
}
function duelOver(vs) {
  const g = doc, b = g.b, r = b.result, E = DUEL[g.game];
  const why = r.why === 'resign' ? `${E.LABEL[b.last.seat]}が投了` : ({
    end: 'どちらも置けなくなった', mate: g.game === 'chess' ? 'チェックメイト' : '詰み', stalemate: 'ステイルメイト（動ける手がない）',
    fifty: '50手ルール', repeat: g.game === 'chess' ? '同じ局面が3回' : '千日手', material: '駒が足りない',
  })[r.why];
  const title = r.win == null ? '引き分け' : (!local || b.seats.includes(NPC)) && vs >= 0 ? (r.win === vs ? 'あなたの勝ち！' : 'あなたの負け…') : `${bdName(b.seats[r.win])}の勝ち！`;
  let sub = why;
  if (g.game === 'reversi') { const n = REV.count(b); sub = `${E.LABEL[0]} ${n.b} − ${n.w} ${E.LABEL[1]}` + (r.why === 'resign' ? `（${why}）` : ''); }
  const who = r.win == null ? null : h('span', { class: 'hub-meta' }, `${E.LABEL[r.win]}：${bdName(b.seats[r.win])}`);
  return bdOverCard(title, sub, who);
}

/* ---- ビンゴ大会 ---- */
function bingoView() {
  const g = doc, b = g.b, over = g.status !== 'playing';
  const holders = g.players.filter(p => b.cards[p]);
  // 1台のときはタブで「回す係」と各カードを切りかえる
  const who = local ? (BS.tab && (BS.tab === b.caller || b.cards[BS.tab]) ? BS.tab : b.caller) : me;
  const ev = b.last && b.last.seq > BS.seen ? b.last : null; BS.seen = Math.max(BS.seen, b.seq);
  if (ev && ev.kind === 'bingo') { bdBanner(`${bdName(ev.id)}がビンゴ！`); if (navigator.vibrate) try { navigator.vibrate([30, 40, 60]); } catch (e) { } }
  if (ev && ev.kind === 'draw' && b.cards[who] && navigator.vibrate) try { navigator.vibrate(15); } catch (e) { }
  const head = bdHead('ビンゴ大会', `${local ? '1台で遊ぶ' : '招待コード ' + tableId} ・ ${b.drawn.length} / 75`, 'bingo');
  const tabs = local ? h('div', { class: 'seg sm bg-tabs' }, [b.caller, ...holders].map(id => h('button', { class: id === who ? 'on' : '', 'aria-pressed': String(id === who), onclick: () => { BS.tab = id; bdRender(); } }, id === b.caller ? '回す係' : bdName(id)))) : null;
  const body = who === b.caller ? bgCaller(b, over) : b.cards[who] ? bgCard(b, who, over) : [h('div', { class: 'hub-note c' }, '観戦中です'), bgList(b)];
  return [head, tabs, bgBall(b, ev, who === b.caller), body, over ? bgOver(b) : null];
}
function bgBall(b, ev, caller) {
  const n = b.drawn[b.drawn.length - 1], recent = b.drawn.slice(-7, -1).reverse();
  return h('div', { class: 'bg-top' },
    h('div', { class: 'bg-ball' + (ev && ev.kind === 'draw' ? ' pop' : '') + (BS.pending && caller ? ' spin' : '') }, n ? [h('small', null, BGO.letter(n)), h('b', null, String(n))] : h('span', null, caller ? '回してね' : 'まだ')),
    h('div', { class: 'bg-recent' }, h('small', null, b.drawn.length ? 'これまで' : '番号はまだ出ていません'), h('div', null, recent.map(x => h('i', null, String(x)))),
      b.drawn.length ? h('button', { class: 'pill', onclick: () => bgHistory(b) }, `出た番号（${b.drawn.length}）`) : null));
}
function bgHistory(b) {
  openSheet(h('div', { class: 'bd-card' }, h('b', { class: 'bd-sh-t' }, '出た番号'), h('div', { class: 'bg-hist' }, 'BINGO'.split('').map((L, c) => h('div', null, h('b', null, L),
    Array.from({ length: 15 }, (_, k) => { const n = c * 15 + k + 1; return h('i', { class: b.drawn.includes(n) ? 'on' : null }, String(n)); }))))));
}
function bgList(b) {
  const rows = doc.players.filter(p => b.cards[p]).map(p => {
    const k = b.done.findIndex(x => x.id === p), rc = BGO.reach(b.marks[p]);
    return h('div', { class: 'bg-row' }, h('span', { class: 'ava sm' }, bdName(p).slice(0, 1)), h('b', { class: 'nm' }, bdName(p)),
      k >= 0 ? h('span', { class: 'bg-rk' }, `${BGO.rank(b, k)}位 ビンゴ`) : rc ? h('span', { class: 'bg-rc' }, rc > 1 ? `リーチ×${rc}` : 'リーチ') : h('span', { class: 'hub-meta' }, '—'));
  });
  return h('div', { class: 'bg-list' }, rows);
}
function bgCaller(b, over) {
  return [bgList(b), h('div', { class: 'bd-foot col' },
    h('button', { class: 'hub-go', disabled: over || BS.pending || b.drawn.length >= 75, onclick: bgDraw }, b.drawn.length >= 75 ? '番号はぜんぶ出ました' : b.drawn.length ? 'つぎの番号を回す' : '番号を回す'),
    over ? null : h('button', { class: 'pill', onclick: () => bdConfirm('ビンゴ大会をおわりますか？', 'おわる', bgEnd) }, 'ビンゴ大会をおわる'))];
}
function bgCard(b, who, over) {
  const cd = b.cards[who], mk = b.marks[who], k = b.done.findIndex(x => x.id === who), rc = BGO.reach(mk);
  const lit = new Set(BGO.doneLines(mk).flat());
  const grid = h('div', { class: 'bg-card' }, 'BINGO'.split('').map(L => h('span', { class: 'bg-l' }, L)), cd.map((n, i) => {
    const on = mk[i] === '1', tap = BS.taps.has(who + ':' + i);
    return h('button', { class: 'bg-c' + (on || tap ? ' on' : '') + (n === 0 ? ' free' : '') + (lit.has(i) ? ' line' : ''), 'aria-pressed': String(on), 'aria-label': n ? `${n}${on ? '（あけた）' : ''}` : 'フリー', onclick: () => bgMark(who, i) }, n ? String(n) : 'FREE');
  }));
  let st;
  if (k >= 0) st = h('div', { class: 'bg-done' }, `${BGO.rank(b, k)}位でビンゴ！`);
  else if (lit.size && !over) st = h('button', { class: 'hub-go bg-go', onclick: () => bgSay(who) }, 'ビンゴ！');
  else st = h('div', { class: 'bd-info' }, rc ? h('b', { class: 'bd-chk' }, rc > 1 ? `リーチ×${rc}` : 'リーチ！') : null,
    h('span', null, over ? 'おわりました' : b.drawn.length ? '出た番号をタップして穴をあけよう' : '部屋主が番号を回すのを待っています'));
  const top = b.done.length ? h('div', { class: 'bg-ranks' }, b.done.slice(0, 4).map((x, j) => h('span', null, `${BGO.rank(b, j)}位 ${bdName(x.id)}`))) : null;
  return [top, h('div', { class: 'bd-stage bg-stage' }, grid), h('div', { class: 'bd-foot col' }, st)];
}
function bgWrite(a, who) {
  if (local) { try { doc = BGO.act(doc, who, a); } catch (e) { toast(e.message); return null; } afterChange(); return null; }
  try { BGO.act(doc, me, a); } catch (e) { toast(e.message); return null; }
  return withLease(d => { if (!d || d.status !== 'playing' || d.game !== 'bingo') return null; try { return BGO.act(d, me, a); } catch (e) { return null; } });
}
function bgDraw() {
  if (BS.pending) return;
  const p = bgWrite({ t: 'draw' }, doc.b.caller);
  if (p) { BS.pending = true; bdRender(); p.then(() => { BS.pending = false; if (BS.root && BS.root.isConnected) bdRender(); }); }
}
function bgEnd() { bgWrite({ t: 'end' }, doc.b.caller); }
function bgSay(who) { bgWrite({ t: 'bingo' }, who); }
function bgMark(who, i) {
  const b = doc.b, n = b.cards[who][i];
  if (doc.status !== 'playing' || b.marks[who][i] === '1' || n === 0) return;
  if (!b.drawn.includes(n)) { toast(`${n}はまだ出ていません`); return; }
  const key = who + ':' + i, p = bgWrite({ t: 'mark', i }, who);
  if (p) { BS.taps.add(key); bdRender(); p.then(() => { BS.taps.delete(key); if (BS.root && BS.root.isConnected) bdRender(); }); }
}
function bgOver(b) {
  const rows = b.done.map((x, k) => h('div', { class: 'bg-row' }, h('b', { class: 'bg-no' }, `${BGO.rank(b, k)}位`), h('b', { class: 'nm' }, bdName(x.id)), h('span', { class: 'hub-meta' }, `${x.at}個目の番号で`)));
  const tops = b.done.filter((x, k) => BGO.rank(b, k) === 1).length;
  return bdOverCard(!b.done.length ? 'ビンゴ大会おわり' : tops > 1 ? `1位が${tops}人！` : `${bdName(b.done[0].id)}が1位！`, b.done.length ? `${b.drawn.length}個の番号が出ました` : 'ビンゴした人はいませんでした', rows.length ? h('div', { class: 'bg-list' }, rows) : null);
}
