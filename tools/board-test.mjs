// リバーシ・チェス・将棋・ビンゴのルール確認
//   node tools/board-test.mjs
// 決まった局面から「何通りの手があるか」（perft）を数えて、よく知られた正しい数と比べる。最後にランダムに最後まで指して止まらないか確かめる
import fs from 'node:fs';
const src = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
const code = ['reversi-engine.js', 'chess-engine.js', 'shogi-engine.js', 'bingo-engine.js', 'duel-engine.js'].map(src).join('\n');
const { REV, CHS, SHG, BGO, DUEL, duelNew, duelAct } = new Function(code + '; return { REV, CHS, SHG, BGO, DUEL, duelNew, duelAct };')();

let fail = 0;
const eq = (name, got, want) => { const ok = got === want; if (!ok) fail++; console.log(`${ok ? 'OK ' : 'NG '} ${name}: ${got}${ok ? '' : `（正しくは ${want}）`}`); };
const start = E => ({ turn: 0, ...E.init() });
// FEN の盤の部分からチェスの局面を作る
const fen = (f, turn, cr, ep = -1) => ({ bd: f.split('/').map(r => r.replace(/\d/g, n => '.'.repeat(+n))).join(''), turn, cr, ep, hm: 0, hist: [] });

console.log('--- リバーシ');
[4, 12, 56, 244, 1396].forEach((n, i) => eq(`perft ${i + 1}`, REV.perft(start(REV), i + 1), n));

console.log('--- チェス');
[20, 400, 8902, 197281].forEach((n, i) => eq(`初期配置 perft ${i + 1}`, CHS.perft(start(CHS), i + 1), n));
// Kiwipete：キャスリング・アンパッサン・プロモーションが入り混じる有名な局面
const kiwi = fen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R', 0, 'KQkq');
[48, 2039, 97862].forEach((n, i) => eq(`Kiwipete perft ${i + 1}`, CHS.perft(kiwi, i + 1), n));
const p3 = fen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8', 0, '');
[14, 191, 2812, 43238].forEach((n, i) => eq(`局面3 perft ${i + 1}`, CHS.perft(p3, i + 1), n));
const mate = fen('7k/6Q1/6K1/8/8/8/8/8', 1, '');
eq('チェックメイトを判定', JSON.stringify(CHS.over(mate)), JSON.stringify({ win: 0, why: 'mate' }));
const stale = fen('7k/5Q2/6K1/8/8/8/8/8', 1, '');
eq('ステイルメイトを判定', JSON.stringify(CHS.over(stale)), JSON.stringify({ win: null, why: 'stalemate' }));

console.log('--- 将棋');
[30, 900, 25470].forEach((n, i) => eq(`初期配置 perft ${i + 1}`, SHG.perft(start(SHG), i + 1), n));
const sb = (rows, hand0 = {}, hand1 = {}, turn = 0) => { const H = () => Object.fromEntries(SHG.HAND.map(t => [t, 0])); return { bd: rows.join(''), hand: [{ ...H(), ...hand0 }, { ...H(), ...hand1 }], turn, hist: [] }; };
// 後手玉が1一、先手の金が2三・1三、桂が3三。1二に歩を打つと詰んでしまう形
const uchi = sb(['........k', '.........', '......NGG', '.........', '.........', '.........', '.........', '.........', 'K........'], { P: 1 });
eq('打ち歩詰めは打てない', SHG.moves(uchi).some(m => m.d === 'P' && m.t === 17), false);
const nifu = sb(['....k....', '.........', '.........', '.........', '.........', '.........', '....P....', '.........', '....K....'], { P: 1 });
eq('二歩は打てない（5筋）', SHG.moves(nifu).some(m => m.d === 'P' && m.t % 9 === 4), false);
eq('1段目には歩を打てない', SHG.moves(nifu).some(m => m.d === 'P' && m.t < 9), false);
const forced = sb(['....k....', 'P........', '.........', '.........', '.........', '.........', '.........', '.........', '....K....']);
eq('行き場のない歩は必ず成る', SHG.moves(forced).filter(m => m.f === 9).map(m => !!m.pr).join(), 'true');

console.log('--- ランダムに最後まで指す');
for (const id of ['reversi', 'chess', 'shogi']) {
  const why = {}; let plies = 0, stuck = 0;
  const N = id === 'reversi' ? 200 : 20;
  for (let k = 0; k < N; k++) {
    let g = duelNew(id, ['a', 'b']);
    for (let i = 0; g.status === 'playing' && i < 400; i++) { const ms = DUEL[id].moves(g.b); g = duelAct(g, g.b.seats[g.b.turn], { t: 'move', m: ms[Math.floor(Math.random() * ms.length)] }); }
    if (g.status === 'playing') stuck++; else why[g.b.result.why] = (why[g.b.result.why] || 0) + 1;
    plies += g.b.ply;
  }
  console.log(`${id}：${N}局 決着 ${JSON.stringify(why)} 400手で終わらなかった ${stuck}局 平均 ${(plies / N).toFixed(0)}手`);
}
console.log('--- NPC（ランダムに指す相手と対戦）');
for (const id of ['reversi', 'chess', 'shogi']) {
  const N = id === 'reversi' ? 40 : 10; let win = 0, draw = 0, slow = 0, worst = 0;
  for (let k = 0; k < N; k++) {
    let g = duelNew(id, ['a']), i = 0;
    eq(`${id} ひとりのときはNPCが入る`, g.b.seats.includes('npc') && g.players.length === 1, true);
    for (; g.status === 'playing' && i < 300; i++) {
      const b = g.b, who = b.seats[b.turn];
      let m; if (who === 'npc') { const t0 = performance.now(); m = DUEL[id].npc(b); const dt = performance.now() - t0; worst = Math.max(worst, dt); if (dt > 500) slow++; }
      else { const ms = DUEL[id].moves(b); m = ms[Math.floor(Math.random() * ms.length)]; }
      g = duelAct(g, who, { t: 'move', m });
    }
    if (g.status === 'over') { if (g.b.result.win == null) draw++; else if (g.b.seats[g.b.result.win] === 'npc') win++; }
  }
  console.log(`${id}：NPCの勝ち ${win}/${N}（引き分け ${draw}）・いちばん長く考えた ${worst.toFixed(0)}ms・0.5秒超え ${slow}回`);
}
let g = duelNew('chess', ['a', 'b']);
try { duelAct(g, g.b.seats[1], { t: 'move', m: { f: 52, t: 36 } }); fail++; console.log('NG 相手の番に指せてしまった'); } catch (e) { console.log('OK 相手の番には指せない：' + e.message); }
g = duelAct(g, 'a', { t: 'resign' }); eq('投了で相手の勝ち', g.b.seats[g.b.result.win], 'b');

console.log('--- ビンゴ');
let rounds = 0;
for (let k = 0; k < 500; k++) {
  let b = BGO.make(['host', 'p1', 'p2', 'p3'], 'host');
  while (b.status === 'playing') {
    b = BGO.act(b, 'host', { t: 'draw' });
    const n = b.b.drawn.at(-1);
    for (const p of ['p1', 'p2', 'p3']) {
      if (b.status !== 'playing') break;
      const i = b.b.cards[p].indexOf(n); if (i >= 0) b = BGO.act(b, p, { t: 'mark', i });
      if (b.status === 'playing' && BGO.doneLines(b.b.marks[p]).length && !b.b.done.some(x => x.id === p)) b = BGO.act(b, p, { t: 'bingo' });
    }
  }
  rounds += b.b.drawn.length;
}
console.log(`3人が全員ビンゴするまで 平均 ${(rounds / 500).toFixed(1)}個の番号`);
let bg = BGO.make(['host', 'p1'], 'host');
try { BGO.act(bg, 'p1', { t: 'draw' }); fail++; console.log('NG 回す係以外が回せた'); } catch (e) { console.log('OK 回す係しか回せない：' + e.message); }
try { BGO.act(bg, 'p1', { t: 'mark', i: 0 }); fail++; console.log('NG 出ていない番号に穴をあけられた'); } catch (e) { console.log('OK 出ていない番号はあけられない：' + e.message); }
eq('部屋主にはカードがない', !!bg.b.cards.host, false);

console.log(fail ? `\n${fail}件 おかしいところがあります` : '\nぜんぶOK');
process.exit(fail ? 1 : 0);
