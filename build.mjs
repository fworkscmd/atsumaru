// PITOPA のビルド：src/ の部品を1つの index.html にまとめる
//   node build.mjs          … 1回だけ作る
//   node build.mjs --watch  … src/ を保存するたびに作り直す（Live Server と一緒に使う）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');

function build() {
  const css = src('style.css') + src('trap.css') + src('board.css');
  const engines = ['dwarf-engine.js', 'trap-engine.js', 'reversi-engine.js', 'chess-engine.js', 'shogi-engine.js', 'bingo-engine.js', 'duel-engine.js'];
  const app = src('app.js').replace('/*__TRAP_UI__*/', () => src('trap-ui.js')).replace('/*__BOARD_UI__*/', () => src('board-ui.js'));
  const js = [...engines.map(src), src('trap-3d.js'), app].join('\n');
  const html = src('template.html').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
  fs.writeFileSync(path.join(root, 'index.html'), html);
  console.log(`[${new Date().toLocaleTimeString()}] index.html を作りました (${(html.length / 1024).toFixed(0)}KB)`);
}

build();
if (process.argv.includes('--watch')) {
  // 作り直すたびに build.mjs を読み直す（見張っている間に build.mjs が変わっても、古い作り方で上書きしないように）
  const self = fileURLToPath(import.meta.url);
  let t = null;
  fs.watch(path.join(root, 'src'), () => { clearTimeout(t); t = setTimeout(() => { try { execFileSync(process.execPath, [self], { stdio: 'inherit' }); } catch (e) { console.error('ビルドに失敗しました'); } }, 120); });
  console.log('src/ を見張っています（Ctrl+C で終了）');
}
