// トラッパーのバランス確認：NPC同士で何千回も対戦させて勝率を出す
//   node tools/trap-sim.mjs                 … いまの設定で4000回
//   node tools/trap-sim.mjs '{"CAPS":4}'    … 数値を変えて試す（TR の値を上書き）
import fs from 'node:fs';
const code = fs.readFileSync(new URL('../src/trap-engine.js', import.meta.url), 'utf8');
const { TR, trNew, trAct, trNpc } = new Function(code + '; return { TR, trNew, trAct, trNpc };')();
Object.assign(TR, JSON.parse(process.argv[2] || '{}'));
const N = 4000; let birds = 0, rounds = 0, score = 0, caps = 0; const why = {};
for (let i = 0; i < N; i++) {
  let g = trNew([]); for (let k = 0; g.status === 'playing' && k < 500; k++) g = trAct(g, '*', trNpc(g));
  if (g.t.result.win === 'birds') birds++; why[g.t.result.why] = (why[g.t.result.why] || 0) + 1;
  rounds += g.t.round; score += g.t.score; caps += g.t.caps;
}
console.log(`鳥チームの勝率 ${(birds / N * 100).toFixed(1)}%  決着 ${JSON.stringify(why)}  平均ラウンド ${(rounds / N).toFixed(1)}  エサ ${(score / N).toFixed(1)}  捕獲 ${(caps / N).toFixed(1)}`);
