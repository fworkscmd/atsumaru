/* ===== 2人で向かい合うゲームの共通部分（リバーシ・チェス・将棋） (pure; no DOM) ===== */
// 卓ドキュメントの b：{ seats:[先手のid, 後手のid], turn, ply:手数, seq, last, result:{ win:席|null, why } ＋ゲームごとの盤 }
const DUEL = { reversi: REV, chess: CHS, shogi: SHG };
const duelKey = m => [m.f ?? '', m.t, m.pr ?? '', m.d ?? ''].join(',');
// 色（先手・後手）はランダム。ひとりのときは空いた席に NPC（'npc'、ドワーフのゴーレムと同じid）
function duelNew(id, humans, rnd = Math.random) {
  const seats = humans.slice(0, 2); if (seats.length < 2) seats.push('npc');
  if (rnd() < .5) seats.reverse();
  return { v: 6, status: 'playing', game: id, players: humans.slice(0, 2), b: { seats, turn: 0, ply: 0, seq: 0, last: null, result: null, ...DUEL[id].init() } };
}
function duelEnd(g, r) { g.status = 'over'; g.b.result = r; return g; }
function duelAct(g0, id, a) {
  if (g0.status !== 'playing') throw new Error('ゲームは終わっています');
  const g = JSON.parse(JSON.stringify(g0)), b = g.b, E = DUEL[g.game], s = b.seats.indexOf(id);
  if (s < 0) throw new Error('このゲームには参加していません');
  if (a.t === 'resign') { b.seq++; b.last = { seq: b.seq, kind: 'resign', seat: s }; return duelEnd(g, { win: 1 - s, why: 'resign' }); }
  if (a.t !== 'move') throw new Error('知らない操作です');
  if (s !== b.turn) throw new Error('いまは相手の番です');
  const m = E.moves(b).find(x => duelKey(x) === duelKey(a.m || {}));
  if (!m) throw new Error('そこには動かせません');
  const info = E.play(b, m); b.ply++; b.seq++;
  b.last = { seq: b.seq, kind: 'move', seat: s, m, ...info };
  const r = E.over(b);
  return r ? duelEnd(g, r) : g;
}
