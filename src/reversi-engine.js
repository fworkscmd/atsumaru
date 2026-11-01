/* ===== リバーシ ENGINE (pure; no DOM) ===== */
// 盤は64文字の文字列（'.' 空き、'b' 黒、'w' 白）。0番が左上。席0が黒で先手
const REV = (() => {
  const D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const col = s => s === 0 ? 'b' : 'w';
  const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  // i に置いたときにひっくり返る石
  function flips(cells, i, me) {
    if (cells[i] !== '.') return [];
    const op = me === 'b' ? 'w' : 'b', out = [];
    for (const [dr, dc] of D8) {
      const line = []; let r = (i >> 3) + dr, c = (i & 7) + dc;
      while (on(r, c) && cells[r * 8 + c] === op) { line.push(r * 8 + c); r += dr; c += dc; }
      if (line.length && on(r, c) && cells[r * 8 + c] === me) out.push(...line);
    }
    return out;
  }
  const movesFor = (cells, s) => { const out = []; for (let i = 0; i < 64; i++) if (flips(cells, i, col(s)).length) out.push({ t: i }); return out; };
  const count = cells => ({ b: cells.split('b').length - 1, w: cells.split('w').length - 1 });
  // NPC：角が大事・角のとなりは危ない、という重み＋置ける場所の多さで、3手先まで読む
  const R0 = [100, -20, 10, 5, 5, 10, -20, 100], R1 = [-20, -50, -2, -2, -2, -2, -50, -20], R2 = [10, -2, 1, 1, 1, 1, -2, 10], R3 = [5, -2, 1, 0, 0, 1, -2, 5];
  const W = [R0, R1, R2, R3, R3, R2, R1, R0].flat();
  function evalFor(b, s) {
    const me = col(s), op = col(1 - s);
    if (!movesFor(b.cells, 0).length && !movesFor(b.cells, 1).length) { const n = count(b.cells); return (n[me] - n[op]) * 1000; }
    let v = 0; for (let i = 0; i < 64; i++) v += b.cells[i] === me ? W[i] : b.cells[i] === op ? -W[i] : 0;
    return v + 5 * (movesFor(b.cells, s).length - movesFor(b.cells, 1 - s).length);
  }
  function search(b, d, s) {
    const ms = movesFor(b.cells, b.turn);
    if (!d || !ms.length) return evalFor(b, s);
    let best = b.turn === s ? -Infinity : Infinity;
    for (const m of ms) { const c = { ...b }; REV.play(c, m); const v = search(c, d - 1, s); best = b.turn === s ? Math.max(best, v) : Math.min(best, v); }
    return best;
  }
  function npc(b, rnd = Math.random) {
    let best = null, bv = -Infinity;
    for (const m of movesFor(b.cells, b.turn)) { const c = { ...b }; REV.play(c, m); const v = search(c, 2, b.turn) + rnd() * 3; if (v > bv) { bv = v; best = m; } }
    return best;
  }
  return {
    npc,
    LABEL: ['黒', '白'],
    init() { const c = Array(64).fill('.'); c[27] = c[36] = 'w'; c[28] = c[35] = 'b'; return { cells: c.join('') }; },
    moves: b => movesFor(b.cells, b.turn),
    count: b => count(b.cells),
    play(b, m) {
      const me = col(b.turn), f = flips(b.cells, m.t, me), c = b.cells.split('');
      c[m.t] = me; f.forEach(i => c[i] = me); b.cells = c.join('');
      const next = 1 - b.turn;
      if (movesFor(b.cells, next).length) { b.turn = next; return { flips: f }; }
      // 相手が置けないときはパスして、もう一度自分の番
      if (movesFor(b.cells, b.turn).length) return { flips: f, pass: next };
      b.turn = next; return { flips: f };
    },
    over(b) {
      if (movesFor(b.cells, 0).length || movesFor(b.cells, 1).length) return null;
      const n = count(b.cells);
      return { win: n.b > n.w ? 0 : n.w > n.b ? 1 : null, why: 'end' };
    },
    perft(b, d) { if (!d) return 1; let n = 0; for (const m of movesFor(b.cells, b.turn)) { const c = { ...b }; REV.play(c, m); n += REV.perft(c, d - 1); } return n; },
  };
})();
