/* ===== ビンゴ大会 ENGINE (pure; no DOM) ===== */
// 部屋主が「回す係」（カードなし）。ほかの人は5×5のカード（まん中はフリー）。番号は1〜75（B 1-15 / I 16-30 / N 31-45 / G 46-60 / O 61-75）
// marks：カードごとに25文字の '0'/'1'（あけた穴）。done：ビンゴした順 [{ id, at: そのとき出ていた番号の数 }]
const BGO = (() => {
  const LINES = [];
  for (let i = 0; i < 5; i++) { LINES.push([0, 1, 2, 3, 4].map(k => i * 5 + k)); LINES.push([0, 1, 2, 3, 4].map(k => k * 5 + i)); }
  LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  const FREE = '0'.repeat(12) + '1' + '0'.repeat(12);
  function card(rnd) {
    const cols = [];
    for (let c = 0; c < 5; c++) {
      const pool = Array.from({ length: 15 }, (_, k) => c * 15 + k + 1);
      for (let i = 14; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      cols.push(pool.slice(0, 5));
    }
    return Array.from({ length: 25 }, (_, i) => i === 12 ? 0 : cols[i % 5][(i / 5) | 0]);
  }
  const doneLines = marks => LINES.filter(L => L.every(i => marks[i] === '1'));
  const reach = marks => LINES.filter(L => L.filter(i => marks[i] === '1').length === 4).length;
  const letter = n => 'BINGO'[Math.floor((n - 1) / 15)];
  // 同じ数の番号でそろった人は同じ順位
  const rank = (b, k) => 1 + b.done.filter(x => x.at < b.done[k].at).length;
  function make(humans, host, rnd = Math.random) {
    const caller = humans.includes(host) ? host : humans[0];
    const b = { caller, cards: {}, marks: {}, drawn: [], done: [], seq: 0, last: null };
    humans.filter(p => p !== caller).forEach(p => { b.cards[p] = card(rnd); b.marks[p] = FREE; });
    return { v: 6, status: 'playing', game: 'bingo', players: humans.slice(), b };
  }
  function act(g0, id, a, rnd = Math.random) {
    if (g0.status !== 'playing') throw new Error('ゲームは終わっています');
    const g = JSON.parse(JSON.stringify(g0)), b = g.b;
    if (a.t === 'draw' || a.t === 'end') {
      if (id !== b.caller) throw new Error('番号を回すのは部屋主です');
      if (a.t === 'end') { g.status = 'over'; return g; }
      const left = []; for (let n = 1; n <= 75; n++) if (!b.drawn.includes(n)) left.push(n);
      if (!left.length) throw new Error('もう全部の番号が出ました');
      const n = left[Math.floor(rnd() * left.length)];
      b.drawn.push(n); b.seq++; b.last = { seq: b.seq, kind: 'draw', n };
      return g;
    }
    const cd = b.cards[id]; if (!cd) throw new Error('カードを持っていません');
    if (a.t === 'mark') {
      const n = cd[a.i]; if (n == null) throw new Error('そのマスはありません');
      if (n && !b.drawn.includes(n)) throw new Error(`${n}はまだ出ていません`);
      const m = b.marks[id].split(''); m[a.i] = '1'; b.marks[id] = m.join('');
      return g;
    }
    if (a.t === 'bingo') {
      if (b.done.some(x => x.id === id)) throw new Error('もうビンゴしています');
      if (!doneLines(b.marks[id]).length) throw new Error('まだ1列そろっていません');
      b.done.push({ id, at: b.drawn.length }); b.seq++; b.last = { seq: b.seq, kind: 'bingo', id };
      if (b.done.length >= Object.keys(b.cards).length) g.status = 'over';
      return g;
    }
    throw new Error('知らない操作です');
  }
  return { make, act, doneLines, reach, letter, rank };
})();
