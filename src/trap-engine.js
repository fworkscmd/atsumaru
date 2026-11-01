/* ===== トラッパー ENGINE (pure; no DOM) ===== */
const TR = {
  // 36マス・エサは均等に11こ置くだけ（もどらない）・エサのマスに罠×。5こ取ったら鳥の勝ち、4回つかまえたら罠士の勝ちで鳥48%・平均3.9ラウンド
  // （エサの間かくが約3マスだと五分。36マスでエサ7こだと鳥17%）
  // （捕獲5回だと鳥60%。5こ置いて5こ全部だと鳥21%：残りが少ないとそこだけ守ればよくなる）
  CELLS: 36, GOAL: 5, CAPS: 4, ROUNDS: 10, FOOD: 11,
  // 最初に配る手札（山札は各カード2枚ずつをまぜたもの）。エサを取ったら鳥みんな、つかまえたら罠士が1枚引く（上限は配った枚数）
  HAND_TRAP: 5, HAND_BIRD: 3, COPIES: 2, BOOST: 2, REFILL: true,
  THEMES: ['snow', 'beach', 'autumn', 'flower'],
  BIRD_CARDS: ['flap', 'wait', 'dash', 'tackle', 'tailwind', 'grab', 'call'],
  TRAP_CARDS: ['quality', 'extra', 'poison', 'wind', 'pit'],
  CARD: {
    flap: { n: '羽ばたき', d: '出た目を 1 ふやすか へらす', when: 'post' },
    wait: { n: '様子見', d: 'ふらずに 1か2 すすむ', when: 'pre' },
    dash: { n: 'ダッシュ', d: 'サイコロを 2こ ふる', when: 'pre' },
    tackle: { n: '体当たり', d: '通りすぎた罠を こわす', when: 'pre' },
    tailwind: { n: '追い風', d: '次の鳥の 出目 ＋2', when: 'pre' },
    grab: { n: 'よこどり', d: 'となりの エサも もらう', when: 'pre' },
    call: { n: '仲間よび', d: '仲間を 自分のマスに よぶ', when: 'pre' },
    quality: { n: '高品質', d: '罠が 次の番も のこる', when: 'pre' },
    extra: { n: '追加の罠', d: '罠を 1こ おおく おける', when: 'pre' },
    poison: { n: '毒エサ', d: '取った鳥は 3回 出目−1', when: 'pre' },
    wind: { n: '強風', d: 'このラウンド 鳥の出目−1', when: 'pre' },
    pit: { n: '落とし穴', d: '鳥に見えない 罠を ほる', when: 'pre' },
  },
  BIRD_NAMES: ['あか', 'あお', 'きいろ'],
};
const trClone = g => JSON.parse(JSON.stringify(g));
const trIsNpc = id => /^npc\d$/.test(id || '');
const trMod = c => ((c % TR.CELLS) + TR.CELLS) % TR.CELLS;
function trPick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
function trFoodItem() { return { v: 1 }; }
// エサの置き場所：巣から同じ間かく（24マスなら 4,8,12,16,20）
const trFoodCells = () => Array.from({ length: TR.FOOD }, (_, k) => Math.round((k + 1) * TR.CELLS / (TR.FOOD + 1)));
// 最初にエサを置く（取られてももどらない）
function trRefill(t, rnd) {
  for (const c of trFoodCells()) if (!t.food[c] && !t.pos.includes(c) && !t.traps.some(x => x.c === c) && !(t.pits || []).includes(c)) t.food[c] = trFoodItem(rnd);
}
// humans: 人間のID（1〜4人）。足りない席はNPC
function trNew(humans, rnd = Math.random, now = Date.now()) {
  const ids = humans.slice(0, 4); let k = 1; while (ids.length < 4) ids.push('npc' + k++);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const t = {
    theme: trPick(TR.THEMES, rnd), seats: ids, round: 1, score: 0, caps: 0,
    pos: [-1, 0, 0, 0], poison: [0, 0, 0, 0], food: {}, traps: [], pits: [], wind: false, boost: null, hands: [[], [], [], []],
    phase: 'trap', turn: 0, step: 'pre', roll: null, used: null, fx: {}, seq: 0, last: null, at: now, result: null, stats: { eaten: [0, 0, 0, 0], caught: [0, 0, 0, 0], placed: 0 },
  };
  const deck = kinds => { const d = []; kinds.forEach(k => { for (let i = 0; i < TR.COPIES; i++) d.push(k); }); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; };
  const td = deck(TR.TRAP_CARDS), bd = deck(TR.BIRD_CARDS);
  t.hands = [td.slice(0, TR.HAND_TRAP), ...[0, 1, 2].map(b => bd.slice(b * TR.HAND_BIRD, (b + 1) * TR.HAND_BIRD))];
  trRefill(t, rnd);
  return { v: 6, status: 'playing', game: 'trapper', players: humans.slice(0, 4), t };
}
const trSeatOf = (g, id) => g.t.seats.indexOf(id);
const trTurnId = g => g.t.seats[g.t.turn];
function trMark(t, last, now) { t.seq++; t.last = { seq: t.seq, ...last }; t.at = now; }
function trUseCard(t, s, k) {
  const i = t.hands[s].indexOf(k); if (i < 0) throw new Error('そのカードは持っていません');
  if (t.used) throw new Error('カードは1回の番に1枚まで');
  t.hands[s].splice(i, 1); t.used = k;
}
const trD6 = rnd => 1 + Math.floor(rnd() * 6);
// 鳥がサイコロでうごく数（毒・強風でそれぞれ−1、最低1。そのあと追い風で＋2）
const trBoost = (t, s) => t.boost && t.boost.s === s ? t.boost.n : 0;
function trSteps(t, s, n) { return Math.max(1, n - (t.poison[s] > 0 ? 1 : 0) - (t.wind ? 1 : 0)) + trBoost(t, s); }
// 様子見でうごく数（毒・強風はきかない。追い風はきく）
const trWaitSteps = (t, s, n) => n + trBoost(t, s);
const trNextBird = s => s === 3 ? 1 : s + 1;
function trAct(g0, id, a, rnd = Math.random, now = Date.now()) {
  if (g0.status !== 'playing') throw new Error('ゲームは終わっています');
  const g = trClone(g0), t = g.t, s = t.turn;
  if (t.seats[s] !== id && id !== '*') throw new Error('いまはあなたの番ではありません');
  if (t.phase === 'trap') {
    if (a.t === 'card') {
      if (t.step !== 'pre') throw new Error('カードはサイコロの前に使います');
      if (!TR.TRAP_CARDS.includes(a.k)) throw new Error('罠士のカードではありません');
      if (a.k === 'poison') { const f = t.food[a.cell]; if (!f || f.poison) throw new Error('毒をしこむエサをえらんでください'); trUseCard(t, s, a.k); f.poison = true; }
      else if (a.k === 'pit') {
        if (!(a.cell > 0 && a.cell < TR.CELLS)) throw new Error('落とし穴をほるマスをえらんでください');
        if (t.food[a.cell]) throw new Error('エサのマスには ほれません');
        t.pits = t.pits || []; if (t.pits.includes(a.cell)) throw new Error('そこにはもう落とし穴があります');
        trUseCard(t, s, a.k); t.pits.push(a.cell);
      }
      else if (a.k === 'wind') { trUseCard(t, s, a.k); t.wind = true; }
      else { trUseCard(t, s, a.k); t.fx[a.k] = true; }
      trMark(t, { kind: 'card', seat: s, k: a.k, cell: a.cell }, now); return g;
    }
    if (a.t === 'roll') {
      if (t.step !== 'pre') throw new Error('もうふりました');
      const d = trD6(rnd); t.roll = { d: [d], n: d + (t.fx.extra ? 1 : 0) }; t.step = 'place';
      // 前の罠をかたづける（高品質の罠だけ1回のこる）
      t.traps = t.traps.filter(x => x.q).map(x => ({ c: x.c, q: false, old: true }));
      trMark(t, { kind: 'roll', seat: s, d: [d] }, now); return g;
    }
    if (a.t === 'place') {
      if (t.step !== 'place') throw new Error('先にサイコロをふってください');
      const cells = [...new Set(a.cells || [])];
      if (cells.length > t.roll.n) throw new Error(`罠は${t.roll.n}こまでです`);
      for (const c of cells) { if (!(c > 0 && c < TR.CELLS)) throw new Error('巣には罠をおけません'); if (t.food[c]) throw new Error('エサのマスには罠をおけません'); if (t.traps.some(x => x.c === c)) throw new Error('そこにはもう罠があります'); }
      cells.forEach(c => t.traps.push({ c, q: !!t.fx.quality }));
      t.stats.placed += cells.length;
      t.phase = 'bird'; t.turn = 1; t.step = 'pre'; t.roll = null; t.used = null; t.fx = {};
      trMark(t, { kind: 'place', seat: s, cells }, now); return g;
    }
    throw new Error('知らない操作です');
  }
  if (t.phase === 'bird') {
    if (a.t === 'card') {
      if (t.step !== 'pre') throw new Error('このカードはサイコロの前に使います');
      if (!['dash', 'tackle', 'tailwind', 'grab', 'call'].includes(a.k)) throw new Error('ここでは使えません');
      const ev = { kind: 'card', seat: s, k: a.k };
      if (a.k === 'call') {
        const b = a.target; if (!(b >= 1 && b <= 3) || b === s) throw new Error('よぶ鳥をえらんでください');
        if (t.pos[s] === 0) throw new Error('巣にいるときは使えません');
        if (t.pos[b] === t.pos[s]) throw new Error('その鳥はもう同じマスにいます');
        trUseCard(t, s, a.k); ev.target = b; ev.from = t.pos[b]; t.pos[b] = t.pos[s];
      }
      else if (a.k === 'tailwind') { trUseCard(t, s, a.k); t.boost = { s: trNextBird(s), n: TR.BOOST }; ev.target = t.boost.s; }
      else { trUseCard(t, s, a.k); t.fx[a.k] = true; }
      trMark(t, ev, now); return g;
    }
    if (a.t === 'wait') {
      if (t.step !== 'pre') throw new Error('もうふりました');
      if (![1, 2].includes(a.n)) throw new Error('1か2をえらんでください');
      trUseCard(t, s, 'wait'); return trMove(g, s, trWaitSteps(t, s, a.n), { wait: true }, rnd, now);
    }
    if (a.t === 'roll') {
      if (t.step !== 'pre') throw new Error('もうふりました');
      const d = t.fx.dash ? [trD6(rnd), trD6(rnd)] : [trD6(rnd)];
      t.roll = { d, n: trSteps(t, s, d.reduce((x, y) => x + y, 0)) }; t.step = 'post';
      trMark(t, { kind: 'roll', seat: s, d, n: t.roll.n }, now); return g;
    }
    if (a.t === 'move') {
      if (t.step !== 'post') throw new Error('先にサイコロをふってください');
      const adj = a.adj || 0; if (![-1, 0, 1].includes(adj)) throw new Error('へんな値です');
      if (adj) trUseCard(t, s, 'flap');
      return trMove(g, s, Math.max(1, t.roll.n + adj), { adj }, rnd, now);
    }
    throw new Error('知らない操作です');
  }
  throw new Error('いまは操作できません');
}
function trMove(g, s, n, info, rnd, now) {
  const t = g.t, from = t.pos[s], path = []; for (let i = 1; i <= n; i++) path.push(trMod(from + i));
  const to = path[path.length - 1], broke = [];
  t.pits = t.pits || [];
  // 体当たり：通りすぎた罠と落とし穴をこわす
  if (t.fx.tackle) path.slice(0, -1).forEach(c => { const i = t.traps.findIndex(x => x.c === c), j = t.pits.indexOf(c); if (i >= 0) t.traps.splice(i, 1); if (j >= 0) t.pits.splice(j, 1); if (i >= 0 || j >= 0) broke.push(c); });
  if (t.poison[s] > 0) t.poison[s]--;
  if (trBoost(t, s)) t.boost = null;
  const ev = { kind: 'move', seat: s, from, path, to, broke, n, ...info };
  const ti = t.traps.findIndex(x => x.c === to), pi = t.pits.indexOf(to);
  if (ti >= 0 || pi >= 0) {
    if (ti >= 0) t.traps.splice(ti, 1); if (pi >= 0) { t.pits.splice(pi, 1); ev.pit = true; }
    t.caps++; t.stats.caught[s]++; t.pos[s] = 0; ev.caught = true;
    if (trDraw(t, 0, TR.TRAP_CARDS, TR.HAND_TRAP, rnd)) ev.drew = [0];
  } else {
    t.pos[s] = to;
    // よこどり：止まったマスと、その前後のマスのエサを取る
    const cells = t.fx.grab ? [to, trMod(to - 1), trMod(to + 1)].filter(c => c !== 0) : [to];
    for (const c of cells) { const f = t.food[c]; if (!f) continue;
      delete t.food[c]; t.score++; t.stats.eaten[s]++; ev.food = (ev.food || 0) + 1; if (c !== to) (ev.grabbed = ev.grabbed || []).push(c);
      if (f.poison) { t.poison[s] = 3; ev.poison = true; } }
    // エサを取ったら鳥みんなが1枚ずつ引く
    if (ev.food) { const d = [1, 2, 3].filter(b => trDraw(t, b, TR.BIRD_CARDS, TR.HAND_BIRD, rnd)); if (d.length) ev.drew = d; }
  }
  trMark(t, ev, now);
  if (t.score >= TR.GOAL) return trEnd(g, 'birds', 'goal');
  if (t.caps >= TR.CAPS) return trEnd(g, 'trapper', 'caps');
  t.roll = null; t.used = null; t.fx = {}; t.step = 'pre';
  if (s < 3) { t.turn = s + 1; return g; }
  // ラウンドおわり
  if (t.round >= TR.ROUNDS) return trEnd(g, 'trapper', 'rounds');
  t.round++; t.phase = 'trap'; t.turn = 0; t.wind = false;
  return g;
}
// 手札を1枚ふやす（上限まで。REFILL:false なら引かない）
function trDraw(t, s, kinds, max, rnd) {
  if (!TR.REFILL || t.hands[s].length >= max) return false;
  t.hands[s].push(trPick(kinds, rnd)); return true;
}
function trEnd(g, win, why) { g.status = 'over'; g.t.phase = 'over'; g.t.result = { win, why }; return g; }

/* ---- NPC ---- */
// 鳥が from から k マス先に止まる確率（ふつうの1回ぶり）
function trLandProb(t, s) { const p = {}; for (let k = 1; k <= 6; k++) { const c = trMod(t.pos[s] + trSteps(t, s, k)); p[c] = (p[c] || 0) + 1 / 6; } return p; }
function trCellValue(t, c) { if (t.traps.some(x => x.c === c)) return -6; const f = t.food[c]; return f ? f.v * (f.poison ? .4 : 1) : 0; }
function trNpc(g, rnd = Math.random) {
  const t = g.t, s = t.turn, hand = t.hands[s];
  if (t.phase === 'trap') {
    if (t.step === 'pre' && !t.used) {
      const land = {}; [1, 2, 3].forEach(b => { const p = trLandProb(t, b); for (const c in p) land[c] = (land[c] || 0) + p[c]; });
      if (hand.includes('pit') && rnd() < .5) {
        const cand = Object.keys(land).map(Number).filter(c => c > 0 && !t.food[c] && !(t.pits || []).includes(c)).sort((a, b) => land[b] - land[a]);
        if (cand.length) return { t: 'card', k: 'pit', cell: cand[0] };
      }
      if (hand.includes('wind') && (t.score >= 5 || rnd() < .3)) return { t: 'card', k: 'wind' };
      if (hand.includes('extra')) return { t: 'card', k: 'extra' };
      if (hand.includes('quality') && rnd() < .6) return { t: 'card', k: 'quality' };
      if (hand.includes('poison')) {
        const cand = Object.keys(t.food).filter(c => !t.food[c].poison).sort((a, b) => (land[b] || 0) - (land[a] || 0));
        if (cand.length && (land[cand[0]] || 0) > .3) return { t: 'card', k: 'poison', cell: +cand[0] };
      }
    }
    if (t.step === 'pre') return { t: 'roll' };
    const w = {}; [1, 2, 3].forEach(b => { const p = trLandProb(t, b); for (const c in p) w[c] = (w[c] || 0) + p[c] * (1 + (t.food[c] ? .5 : 0)); });
    const cells = Object.keys(w).map(Number).filter(c => c > 0 && !t.food[c] && !t.traps.some(x => x.c === c)).sort((a, b) => w[b] - w[a] + (rnd() - .5) * .02);
    return { t: 'place', cells: cells.slice(0, t.roll.n) };
  }
  if (t.phase === 'bird') {
    const val = n => trCellValue(t, trMod(t.pos[s] + n));
    if (t.step === 'pre') {
      if (!t.used && hand.includes('call') && t.pos[s] > 0) { const b = [1, 2, 3].find(b => b !== s && t.pos[b] === 0); if (b) return { t: 'card', k: 'call', target: b }; }
      if (!t.used && hand.includes('wait')) { const best = [1, 2].map(n => [n, val(trWaitSteps(t, s, n))]).sort((a, b) => b[1] - a[1])[0]; if (best[1] > 0) return { t: 'wait', n: best[0] }; }
      if (!t.used && hand.includes('grab')) { let ev = 0; for (let a = 1; a <= 6; a++) { const c = trMod(t.pos[s] + trSteps(t, s, a)); if (trCellValue(t, c) < 0) continue; ev += [trMod(c - 1), trMod(c + 1)].reduce((x, k) => x + (k && t.food[k] ? t.food[k].v : 0), 0) / 6; } if (ev > 1) return { t: 'card', k: 'grab' }; }
      if (!t.used && hand.includes('tailwind') && rnd() < .25) return { t: 'card', k: 'tailwind' };
      if (!t.used && hand.includes('dash')) { let one = 0, two = 0; for (let a = 1; a <= 6; a++) { one += val(trSteps(t, s, a)) / 6; for (let b = 1; b <= 6; b++) two += val(trSteps(t, s, a + b)) / 36; } if (two > one + .6) return { t: 'card', k: 'dash' }; }
      return { t: 'roll' };
    }
    if (!t.used && hand.includes('flap')) { const n = t.roll.n; const opts = [[0, val(n)], [1, val(n + 1)], [-1, n > 1 ? val(n - 1) : -99]].sort((a, b) => b[1] - a[1]); if (opts[0][1] > val(n) + .5) return { t: 'move', adj: opts[0][0] }; }
    return { t: 'move', adj: 0 };
  }
  return null;
}
/* ===== END TRAPPER ENGINE ===== */
