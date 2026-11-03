/* ===== トランプ（大富豪・ババ抜き） ENGINE (pure; no DOM) ===== */
// カードは2文字：マーク S H D C ＋ 数字 3456789TJQKA2（T=10）。ジョーカーは 'JK'
// 卓ドキュメントの b：{ seats:[id…], hands:{ id:[カード…] }, turn:席, seq, last, … }。コンピュータの id は 'npc1' 'npc2' …
const CARD = (() => {
  const SUITS = 'SHDC', RANKS = '3456789TJQKA2';
  const deck = () => { const d = []; for (const s of SUITS) for (const r of RANKS) d.push(s + r); d.push('JK'); return d; };
  const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const isJ = c => c === 'JK', rk = c => isJ(c) ? 13 : RANKS.indexOf(c[1]), st = c => isJ(c) ? '' : c[0];
  const sort = h => h.slice().sort((a, b) => rk(a) - rk(b) || SUITS.indexOf(st(a)) - SUITS.indexOf(st(b)));
  const isNpc = id => /^npc/.test(id);
  // 人数が足りないときはコンピュータを足す。席の順番はランダム
  function seatsFor(humans, min, fill, rnd) { const s = humans.slice(0, 8); let k = 1; if (s.length < min) while (s.length < fill) s.push('npc' + k++); return shuffle(s, rnd); }
  const LABEL = { S: 'スペード', H: 'ハート', D: 'ダイヤ', C: 'クラブ' };
  const name = c => isJ(c) ? 'ジョーカー' : LABEL[c[0]] + 'の' + ({ T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' }[c[1]] || c[1]);
  return { SUITS, RANKS, deck, shuffle, isJ, rk, st, sort, isNpc, seatsFor, name };
})();

/* ---- 大富豪 ---- */
// ルール：同じ数字のそろい（1〜4枚、ジョーカーはどの数字にもなれる）を出す。革命（4枚以上）・8切り・しばり・11バック・スペードの3返し。
// 3回戦。2回戦からはカードの交換（大富豪⇔大貧民は2枚、富豪⇔貧民は1枚）。点は 大富豪 = 人数−1 … 大貧民 = 0
const DFG = (() => {
  const { deck, shuffle, isJ, rk, st, sort, isNpc, seatsFor } = CARD;
  const ROUNDS = 3;
  const titles = n => n <= 3 ? ['大富豪', ...Array(n - 2).fill('平民'), '大貧民'] : ['大富豪', '富豪', ...Array(n - 4).fill('平民'), '貧民', '大貧民'];
  // 出した札の形。rank 13 はジョーカー1枚
  function form(cards) {
    if (!cards.length || cards.length > 5) return null;
    const rs = [...new Set(cards.filter(c => !isJ(c)).map(rk))]; if (rs.length > 1) return null;
    if (cards.filter(isJ).length > 1) return null;
    return { n: cards.length, rank: rs.length ? rs[0] : 13, suits: cards.filter(c => !isJ(c)).map(st).sort().join('') };
  }
  const upside = b => !!b.rev !== !!b.back; // 革命と11バックで強さが逆になる
  // しばり：出せるのは、しばられたマークだけ（ジョーカーはどのマークにもなれる）
  function fitsLock(f, lock) { if (!lock) return true; const L = lock.split(''); for (const s of f.suits) { const i = L.indexOf(s); if (i < 0) return false; L.splice(i, 1); } return true; }
  // 場に出せるか
  function canPlay(b, cards) {
    const f = form(cards); if (!f) return false;
    const fd = b.field; if (!fd) return true;
    if (f.n !== fd.n) return false;
    if (fd.rank === 13) return f.n === 1 && cards[0] === 'S3'; // ジョーカー1枚には、スペードの3だけが勝てる
    if (!fitsLock(f, b.lock)) return false;
    if (f.rank === 13) return true;
    return upside(b) ? f.rank < fd.rank : f.rank > fd.rank;
  }
  // 手札から出せる組み合わせを全部
  function plays(b, s) {
    const hand = b.hands[b.seats[s]], out = [], J = hand.includes('JK'), by = {};
    hand.forEach(c => { if (!isJ(c)) (by[rk(c)] = by[rk(c)] || []).push(c); });
    const pick = (arr, k, from = 0, cur = [], acc = []) => { if (cur.length === k) { acc.push(cur.slice()); return acc; } for (let i = from; i < arr.length; i++) { cur.push(arr[i]); pick(arr, k, i + 1, cur, acc); cur.pop(); } return acc; };
    for (const r in by) for (let k = 1; k <= by[r].length; k++) for (const p of pick(by[r], k)) { out.push(p); if (J) out.push([...p, 'JK']); }
    if (J) out.push(['JK']);
    return out.filter(p => canPlay(b, p));
  }
  const active = (b, s) => !b.out.includes(s);
  const nextFrom = (b, s, skipPassed) => { const n = b.seats.length; for (let k = 1; k <= n; k++) { const t = (s + k) % n; if (active(b, t) && !(skipPassed && b.passed[t])) return t; } return -1; };
  function clear(b, lead) { b.field = null; b.lock = null; b.back = false; b.passed = b.seats.map(() => false); b.turn = active(b, lead) ? lead : nextFrom(b, lead, false); }
  function deal(seats, rnd) { const d = shuffle(deck(), rnd), hands = {}; seats.forEach(id => hands[id] = []); d.forEach((c, i) => hands[seats[i % seats.length]].push(c)); seats.forEach(id => hands[id] = sort(hands[id])); return hands; }
  function startRound(b, rnd) {
    b.hands = deal(b.seats, rnd); b.out = []; b.field = null; b.lock = null; b.rev = false; b.back = false; b.passed = b.seats.map(() => false); b.give = null;
    const prev = b.prev; // 前の回の順位（席の番号を 1位から）
    if (!prev) { b.turn = b.seats.findIndex(id => b.hands[id].includes('D3')); b.phase = 'play'; return; }
    // 交換：下の人は いちばん強いカードを自動で渡す。上の人は いらないカードを選んで返す
    const n = b.seats.length, pairs = [[prev[0], prev[n - 1], 2]]; if (n >= 4) pairs.push([prev[1], prev[n - 2], 1]);
    b.give = {}; b.got = {};
    for (const [hi, lo, k] of pairs) { const H = b.hands[b.seats[lo]], best = sort(H).slice(-k); best.forEach(c => H.splice(H.indexOf(c), 1)); b.hands[b.seats[hi]] = sort(b.hands[b.seats[hi]].concat(best)); b.give[hi] = { to: lo, k }; b.got[hi] = best; b.got[lo] = []; }
    b.phase = 'exchange'; b.turn = prev[n - 1];
  }
  function make(humans, rnd = Math.random) {
    const seats = seatsFor(humans, 3, 4, rnd);
    const b = { seats, round: 1, points: seats.map(() => 0), hist: [], seq: 0, last: null, result: null, prev: null };
    startRound(b, rnd);
    return { v: 6, status: 'playing', game: 'daifugo', players: humans.slice(0, 8), b };
  }
  function endRound(g) {
    const b = g.b, n = b.seats.length, order = b.out.slice(); b.seats.forEach((_, s) => { if (!order.includes(s)) order.push(s); }); b.out = order;
    order.forEach((s, i) => b.points[s] += n - 1 - i); b.hist.push(order.slice()); b.prev = order.slice(); b.phase = 'result';
    if (b.round >= ROUNDS) { g.status = 'over'; const top = Math.max(...b.points); b.result = { win: b.points.map((p, s) => p === top ? s : -1).filter(s => s >= 0), points: b.points.slice() }; }
  }
  const mark = (b, last) => { b.seq++; b.last = { seq: b.seq, ...last }; };
  function act(g0, id, a, rnd = Math.random) {
    if (g0.status !== 'playing') throw new Error('ゲームは終わっています');
    const g = JSON.parse(JSON.stringify(g0)), b = g.b, s = b.seats.indexOf(id);
    if (a.t === 'next') { if (b.phase !== 'result') throw new Error('まだ次の回にはいけません'); b.round++; startRound(b, rnd); mark(b, { kind: 'round', round: b.round }); return g; }
    if (s < 0) throw new Error('このゲームには参加していません');
    const hand = b.hands[id];
    if (a.t === 'give') { // 交換で返すカード
      if (b.phase !== 'exchange' || !b.give[s]) throw new Error('いまは渡せません');
      const cs = a.cards || []; if (cs.length !== b.give[s].k || new Set(cs).size !== cs.length || cs.some(c => !hand.includes(c))) throw new Error(`${b.give[s].k}枚えらんでください`);
      const to = b.give[s].to; cs.forEach(c => hand.splice(hand.indexOf(c), 1)); b.hands[b.seats[to]] = sort(b.hands[b.seats[to]].concat(cs)); b.got[to] = cs; delete b.give[s];
      mark(b, { kind: 'give', seat: s, to, n: cs.length });
      if (!Object.keys(b.give).length) { b.phase = 'play'; b.give = null; }
      return g;
    }
    if (b.phase !== 'play') throw new Error('いまは出せません');
    if (s !== b.turn) throw new Error('いまはほかの人の番です');
    if (a.t === 'pass') {
      if (!b.field) throw new Error('場が空いているときはパスできません');
      b.passed[s] = true; mark(b, { kind: 'pass', seat: s });
      const by = b.field.by, others = b.seats.map((_, t) => t).filter(t => active(b, t) && t !== by);
      if (others.every(t => b.passed[t])) { clear(b, by); b.last.flow = true; } else b.turn = nextFrom(b, s, true);
      return g;
    }
    if (a.t !== 'play') throw new Error('知らない操作です');
    const cs = a.cards || []; if (new Set(cs).size !== cs.length || cs.some(c => !hand.includes(c))) throw new Error('持っていないカードです');
    if (!canPlay(b, cs)) throw new Error(b.field ? '場のカードより強いそろいを出してください' : 'そのカードは一緒に出せません');
    const f = form(cs), fd = b.field, s3 = !!fd && fd.rank === 13, eight = cs.some(c => !isJ(c) && c[1] === '8');
    const info = { kind: 'play', seat: s, cards: cs.slice() };
    if (f.n >= 4) { b.rev = !b.rev; info.rev = true; }
    if (!s3 && cs.some(c => !isJ(c) && c[1] === 'J')) { if (!b.back) info.back = true; b.back = true; }
    if (fd && !b.lock && f.suits.length === f.n && fd.suits.length === fd.n && f.suits === fd.suits) { b.lock = f.suits; info.lock = f.suits; }
    cs.forEach(c => hand.splice(hand.indexOf(c), 1));
    b.field = { cards: cs.slice(), ...f, by: s };
    if (!hand.length) { b.out.push(s); info.done = b.out.length; }
    if (eight) info.eight = true; if (s3) info.s3 = true;
    mark(b, info);
    if (b.seats.filter((_, t) => active(b, t)).length <= 1) { endRound(g); return g; }
    if (eight || s3) { clear(b, s); return g; } // 8切り・スペードの3返し：場が流れて、出した人からもう一度
    const nx = nextFrom(b, s, true);
    if (nx < 0 || nx === s) clear(b, s); else b.turn = nx;
    // 上がった人のあと、ほかの全員がもうパスしていたら場が流れる
    if (!active(b, s) && b.seats.map((_, t) => t).filter(t => active(b, t)).every(t => b.passed[t])) clear(b, s);
    return g;
  }
  // コンピュータ：出すなら、いちばん弱いそろい。強いカード（2・ジョーカー）は、手札が少なくなるまでとっておく
  // s：動かすコンピュータの席（交換のときは番に関係なく、渡す役の席）
  function npc(b, s = b.turn, rnd = Math.random) {
    const hand = b.hands[b.seats[s]];
    if (b.phase === 'exchange') { const k = b.give[s].k; return { t: 'give', cards: sort(hand).slice(0, k) }; }
    const ps = plays(b, s);
    if (!ps.length) return { t: 'pass' };
    const w = p => { const f = form(p), r = f.rank === 13 ? 14 : upside(b) ? 12 - f.rank : f.rank; return r * 10 - f.n * (b.field ? 0 : 3) + (p.includes('JK') && p.length > 1 ? 30 : 0); };
    const sorted = ps.slice().sort((x, y) => w(x) - w(y)), best = sorted[0];
    const strong = best.some(c => isJ(c) || c[1] === '2');
    if (b.field && strong && hand.length > 4 && rnd() < .7) return { t: 'pass' };
    return { t: 'play', cards: best };
  }
  return { ROUNDS, titles, form, canPlay, plays, make, act, npc, isNpc, upside };
})();

/* ---- ババ抜き ---- */
// 手札の同じ数字の2枚は自動で捨てる。自分の番は、となり（次の人）の手札から1枚引く。引かれる側は手札の順番を入れかえてじらせる。
// 手札がなくなった人から上がり。最後にジョーカーを持っていた人の負け
const OLD = (() => {
  const { deck, shuffle, isJ, rk, isNpc, seatsFor } = CARD;
  // 同じ数字の2枚を捨てる（ジョーカーは残る）
  function discard(h) { const keep = [], pairs = [], open = {}; h.forEach(c => { if (isJ(c)) { keep.push(c); return; } const r = rk(c); if (open[r] != null) { pairs.push([keep[open[r]], c]); keep[open[r]] = null; delete open[r]; } else { open[r] = keep.length; keep.push(c); } }); return { keep: keep.filter(Boolean), pairs }; }
  const active = (b, s) => !b.out.includes(s);
  const nextFrom = (b, s) => { const n = b.seats.length; for (let k = 1; k < n; k++) { const t = (s + k) % n; if (active(b, t)) return t; } return -1; };
  function make(humans, rnd = Math.random) {
    const seats = seatsFor(humans, 3, 3, rnd), d = shuffle(deck(), rnd), hands = {}; seats.forEach(id => hands[id] = []); d.forEach((c, i) => hands[seats[i % seats.length]].push(c));
    const b = { seats, hands: {}, out: [], turn: 0, hover: null, seq: 0, last: null, result: null };
    seats.forEach(id => b.hands[id] = shuffle(discard(hands[id]).keep, rnd));
    seats.forEach((id, s) => { if (!b.hands[id].length) b.out.push(s); });
    b.turn = nextFrom(b, seats.length - 1); if (b.turn < 0) b.turn = 0;
    return { v: 6, status: 'playing', game: 'babanuki', players: humans.slice(0, 8), b };
  }
  const from = b => nextFrom(b, b.turn); // 引く相手
  const mark = (b, last) => { b.seq++; b.last = { seq: b.seq, ...last }; };
  function act(g0, id, a, rnd = Math.random) {
    if (g0.status !== 'playing') throw new Error('ゲームは終わっています');
    const g = JSON.parse(JSON.stringify(g0)), b = g.b, s = b.seats.indexOf(id);
    if (s < 0) throw new Error('このゲームには参加していません');
    if (a.t === 'order') { // 自分の手札の並びを入れかえる
      const h = b.hands[id], n = a.hand || []; if (n.length !== h.length || n.slice().sort().join() !== h.slice().sort().join()) throw new Error('手札がちがいます');
      b.hands[id] = n.slice(); b.hover = b.hover && b.hover.seat !== s ? b.hover : null; mark(b, { kind: 'order', seat: s }); return g;
    }
    if (a.t === 'hover') { if (s !== b.turn) return g0; b.hover = { seat: s, i: a.i }; return g; } // 引く人がさわっているカード（相手に見せてドキドキさせる）
    if (a.t !== 'draw') throw new Error('知らない操作です');
    if (s !== b.turn) throw new Error('いまはほかの人の番です');
    const t = from(b), th = b.hands[b.seats[t]]; if (!(a.i >= 0 && a.i < th.length)) throw new Error('そのカードはありません');
    const c = th.splice(a.i, 1)[0], mine = b.hands[id], r = discard(mine.concat(c)); b.hands[id] = r.keep;
    const pair = r.pairs.length ? r.pairs[0] : null; b.hover = null;
    const info = { kind: 'draw', seat: s, from: t, i: a.i, card: c, pair };
    if (!th.length) { b.out.push(t); info.outFrom = true; }
    if (!b.hands[id].length) { b.out.push(s); info.outMe = true; }
    mark(b, info);
    const left = b.seats.map((_, k) => k).filter(k => active(b, k));
    if (left.length <= 1) { b.out.push(left[0]); g.status = 'over'; b.result = { lose: left[0] }; return g; }
    b.turn = active(b, t) ? t : nextFrom(b, t);
    return g;
  }
  // コンピュータ：ランダムに引く
  const npc = (b, rnd = Math.random) => ({ t: 'draw', i: Math.floor(rnd() * b.hands[b.seats[from(b)]].length) });
  return { make, act, npc, from, discard, isNpc };
})();
