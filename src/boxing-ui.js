/* =================== ボクシングの画面 =================== */
// wordwolf-ui.js のうしろに差し込まれる。3D は boxing-3d.js（BX3）
// 試合の人は自分の目から（'fp'）、リングにいない人は横から（'side'）見る。向きえらびは「どこを打つ？」→「どこを守る？」の順（案 C）
// 右・左は画面の見たまま。打つ向きは判定のときに相手の向きにそろえる（MIRROR）
const BX = { gid: null, st: null, wrap: null, hud: null, host: null, loading: null, failed: false, mk: '', seen: 0, step: 'atk', atk: null, sent: false, at: 0, anim: false, banner: null, over: false, view: null, cover: -1, table: false, cn: -1, flash: 0 };
const isBoxDoc = () => !!doc && doc.game === 'boxing' && !!doc.b;
const BX_PICK_MS = 30000, BX_FORCE_MS = 45000;
const MIRROR = { right: 'left', left: 'right', body: 'body' };
const svgEl = s => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
const BXI = {
  ar: d => svgEl(`<svg class="bx-ic${d === 'left' ? ' l' : d === 'body' ? ' d' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M12 6l6 6-6 6"/></svg>`),
  sh: () => svgEl('<svg class="bx-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V6z"/></svg>'),
  fs: () => svgEl('<svg class="bx-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10a3 3 0 013-3h8a3 3 0 013 3v5a4 4 0 01-4 4H9a3 3 0 01-3-3zM10.5 7v4.5M14 7v4.5M6.3 12.5H9"/></svg>'),
  ck: () => svgEl('<svg class="bx-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'),
};
// ロボットの顔（トーナメント表・アイコン）
const BX_FACE = '<symbol id="bxFace" viewBox="0 0 24 24"><path d="M12 2.2v3" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="2" r="1.5" fill="#ffd23a"/><rect x="3.5" y="5" width="17" height="15" rx="4" fill="currentColor"/><rect x="3.5" y="5" width="17" height="3" rx="1.5" fill="#0002"/><rect x="5.5" y="9" width="13" height="5" rx="2" fill="#16141a"/><circle cx="14" cy="11.5" r="1.9" fill="#ffd23a"/><path d="M8.5 16.4h7M8.5 18.2h7" stroke="#0005" stroke-width="1.1"/></symbol>';
const BX_BELT = '<symbol id="bxBelt" viewBox="0 0 48 24"><rect x="0" y="8" width="48" height="8" rx="3" fill="#2a2424"/><rect x="5" y="9.5" width="6" height="5" rx="1.5" fill="#c99a2e"/><rect x="37" y="9.5" width="6" height="5" rx="1.5" fill="#c99a2e"/><path d="M24 2l9 3.5 2.5 6.5-2.5 6.5L24 22l-9-3.5L12.5 12 15 5.5z" fill="#e2b33c" stroke="#9c7419" stroke-width="1"/><path d="M24 6.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z" fill="#ff5a36"/></symbol>';
function bxLoad() { if (!BX.loading) BX.loading = BX3.load().catch(e => { BX.loading = null; throw e; }); return BX.loading; }
const bxHostOk = () => local || doc.host === me;
const bxKey = b => b.gid + ':' + b.tier + ':' + b.mi;
// プレイヤーごとの色：人は卓に入った順、そのあとコンピュータ1・2…（1 赤・2 青・3 黄・4 緑・5 橙・6 紫・7 白・8 黒）
const BX_ACC = ['#c63a2d', '#2f62c8', '#e8b829', '#3c9a52', '#e07a2a', '#7a52b8', '#e8e4dc', '#45474d'];
function bxCi(id) { const hs = (doc.players || []).filter(p => !BOX.isNpc(p) && p !== NPC); let i = hs.indexOf(id); if (i < 0 && BOX.isNpc(id)) i = hs.length + (+id.slice(3) - 1); return ((i % 8) + 8) % 8; }
const bxCol = id => BX3.COLS[bxCi(id)];
// 最初の案内（実況のアナウンス）：この端末で最初の試合のあいだだけ。終わるか「とばす」で出さなくなる
const BX_TUT = 'atsumaru.bxTut';
const bxTutOn = () => { try { return localStorage.getItem(BX_TUT) !== '1'; } catch (e) { return false; } };
const bxTutDone = () => { try { localStorage.setItem(BX_TUT, '1'); } catch (e) { } };
// 自分の席（リングにいなければ -1）。1台で遊ぶときは、人がひとりだけの試合ならその人の目から見る
function bxSeat(b) { const m = b.m; if (!m || b.phase === 'over') return -1; if (!local) return m.seats.indexOf(me); const hs = [0, 1].filter(i => !BOX.isNpc(m.seats[i])); return hs.length === 1 ? hs[0] : -1; }
// 1台で遊ぶとき、まだ選んでいない人の席（人どうしの試合は順番に回す）
const bxLocalPicker = b => { const m = b.m; return [0, 1].find(i => !BOX.isNpc(m.seats[i]) && !m.picks[i]); };
const bxSnap = m => ({ hits: m.hits.slice(), streak: m.streak.slice(), round: m.round, sudden: m.sudden });
const bxWait = ms => new Promise(r => setTimeout(r, ms));
function bxSend(a, who) {
  const cheer = a.t === 'cheer'; if (!cheer) { if (BX.sent) return; BX.sent = true; }
  if (local) { try { doc = BOX.act(doc, who, a); } catch (e) { toast(e.message); } if (!cheer) BX.sent = false; afterChange(); return; }
  withLease(d => { if (!d || d.status !== 'playing' || !d.b) return null; try { return BOX.act(d, me, a); } catch (e) { return null; } }, cheer).then(r => { if (r !== 'ok' && !cheer) { BX.sent = false; if (isBoxDoc()) bdRender(); } });
}
function bxPick(kind, k, who) {
  if (kind === 'atk') { BX.atk = k; BX.step = 'grd'; bdRender(); return; }
  const atk = MIRROR[BX.atk]; BX.step = 'atk'; BX.atk = null; BX.cover = -1;
  bxSend({ t: 'pick', atk, grd: k }, who); if (!local) bdRender();
}
// ---- 1ラウンドの結果を見せる（新しい log が来たら） ----
function bxSync(b) {
  const m = b.m, key = m ? bxKey(b) : 'none';
  if (BX.gid !== b.gid) { BX.gid = b.gid; BX.cn = -1; }
  if (BX.mk !== key) { BX.mk = key; BX.seen = m ? m.log.length : 0; BX.over = !!(m && m.result); BX.step = 'atk'; BX.atk = null; BX.sent = false; BX.anim = false; BX.banner = null; BX.view = m ? bxSnap(m) : null; BX.at = Date.now(); BX.cover = -1; BX.table = false; if (BX.st) BX.st.reset();
    // 新しい試合：まず「○○ VS ○○」を約2秒（いきなり始まらないように）。時間はそのあとから数える
    if (m && !m.log.length && !m.result && b.phase === 'pick') { BX.intro = Date.now() + 2300; BX.at = BX.intro; setTimeout(() => { if (isBoxDoc()) bdRender(); }, 2350); } else BX.intro = 0; }
  const s = bxSeat(b), mode = b.phase === 'over' ? 'champ' : s >= 0 ? 'fp' : 'side';
  if (BX.st) { BX.st.setMode(mode); if (mode === 'champ') BX.st.setColors(null, bxCol(b.champion)); else if (m) BX.st.setColors(bxCol(m.seats[s >= 0 ? s : 0]), bxCol(m.seats[s >= 0 ? 1 - s : 1])); }
  if (!m) return;
  if (m.log.length > BX.seen && !BX.anim) {
    const e = m.log[m.log.length - 1], res = m.result; BX.seen = m.log.length;
    if (!BX.st) { BX.view = bxSnap(m); BX.over = !!res; BX.sent = false; BX.at = Date.now(); return; }
    BX.anim = true; BX.banner = null;
    const ev = mode === 'fp' ? { mine: e.picks[s], opp: e.picks[1 - s], hit: [e.hit[s], e.hit[1 - s]] } : { picks: e.picks, hit: e.hit };
    const st = BX.st, k0 = BX.mk;
    st.round(ev).then(async () => {
      if (BX.mk !== k0 || BX.st !== st) return;
      BX.view = bxSnap(m); BX.banner = bxBanner(e, s, b); bdRender();
      await bxWait(res ? 1100 : 1500); if (BX.mk !== k0) return; BX.banner = null;
      // KO はバネで頭が飛び出す。判定・サドンデスはふつうにひざから崩れる
      if (res) { bdRender(); const L = 1 - res.win, who = mode === 'fp' ? (L === s ? 'me' : 'op') : L; await (res.how === 'ko' ? st.ko(who) : st.down(who)); if (BX.mk !== k0) return; }
      if (res && s >= 0) bxTutDone();
      BX.anim = false; BX.at = Date.now(); BX.sent = false; BX.step = 'atk'; BX.atk = null; if (res) BX.over = true; if (isBoxDoc()) bdRender();
    });
  } else if (m.result && !BX.anim && m.log.length === BX.seen) BX.over = true;
}
function bxBanner(e, s, b) {
  const nm = i => bdName(b.m.seats[i]);
  if (s >= 0) return [e.hit[s] ? ['hit', 'あなたのパンチ：当たり！'] : ['blk', 'あなたのパンチ：ガードされた'], e.hit[1 - s] ? ['hurt', '相手のパンチ：当たった…'] : ['blk', '相手のパンチ：ガード！']];
  return [0, 1].map(i => e.hit[i] ? ['hit', `${nm(i)}の${BOX.DIR_N[MIRROR[e.picks[i].atk]]}が当たり！`] : ['blk', `${nm(i)}のパンチはガード`]);
}
// ---- 上の表示：名前・連続ヒット（4つで KO）・当たった数・ラウンド・残り時間 ----
function bxVs(b, s) {
  const m = b.m, v = BX.view || bxSnap(m), L = s >= 0 ? s : 0, Rr = 1 - L;
  const pl = (i, cls) => h('div', { class: 'bx-pl ' + cls, style: '--c:' + BX_ACC[bxCi(m.seats[i])] }, h('b', null, i === s ? 'あなた' : bdName(m.seats[i])), h('span', { class: 'bx-pips' }, Array.from({ length: BOX.KO }, (_, k) => h('s', { class: k < v.streak[i] ? 'on' : null })), h('em', null, `当たり ${v.hits[i]}`)));
  const picking = b.phase === 'pick' && !BX.anim && !BX.over;
  return h('div', { class: 'bx-vs' }, pl(L, 'a'), h('div', { class: 'bx-rd' }, h('small', null, v.sudden ? 'サドンデス' : `${Math.min(v.round, BOX.ROUNDS)} / ${BOX.ROUNDS}R`), picking && !local ? h('b', { id: 'bxClk' }, bxClock()) : null), pl(Rr, 'b'));
}
const bxClock = () => String(Math.max(0, Math.ceil((BX_PICK_MS - (Date.now() - BX.at)) / 1000)));
function bxTop(b, s) {
  const lbl = b.phase === 'over' ? 'トーナメント' : `${BOX.tierName(b, b.tier)}　第${b.mi + 1}試合`;
  return h('div', { class: 'bx-top' }, h('div', { class: 'bx-lbl' }, h('b', null, lbl), s < 0 && b.phase !== 'over' && !local ? h('span', { class: 'bx-watch' }, '観戦中') : null),
    h('button', { class: 'bx-ib', 'aria-label': 'トーナメント表', onclick: () => { BX.table = !BX.table; bdRender(); } }, '表'),
    h('button', { class: 'bx-ib', 'aria-label': '遊びかた', onclick: () => bdOpenRules('boxing') }, '?'),
    doc.status === 'playing' ? h('button', { class: 'bx-ib q', 'aria-label': '中断してホームにもどる', onclick: confirmQuit }, '中断') : null);
}
// ---- 向きえらび（順番に聞く） ----
function bxPickCard(b, who) {
  const grd = BX.step === 'grd', opts = [['left', '左'], ['body', '下'], ['right', '右']];
  return h('div', { class: 'bx-card' },
    h('div', { class: 'bx-steps' }, grd ? h('span', { class: 'dn' }, BXI.ck(), `打つ：${{ left: '左', body: '下', right: '右' }[BX.atk]}`) : h('span', { class: 'now' }, '1 打つ'), h('hr'), h('span', { class: grd ? 'now' : null }, '2 守る')),
    h('h3', null, grd ? 'どこを守る？' : 'どこを打つ？'),
    h('div', { class: 'bx-tiles' + (grd ? ' g' : '') }, opts.map(([k, t]) => h('button', { class: 'bx-tile', onclick: () => bxPick(grd ? 'grd' : 'atk', k, who) }, h('i', null, grd ? BXI.sh() : BXI.fs(), BXI.ar(k)), t))),
    grd ? h('button', { class: 'bx-back', onclick: () => { BX.step = 'atk'; BX.atk = null; bdRender(); } }, '打つ向きを選びなおす') : h('div', { class: 'bx-hint' }, '右・左は 画面の見たまま'));
}
// ---- 声援（観戦する人） ----
function bxCheers() { return h('div', { class: 'bx-cheer' }, h('small', null, '声援は 試合中の2人の画面にも出ます'), h('div', null, BOX.CHEERS.map((w, i) => h('button', { class: 'c' + i, onclick: () => bxSend({ t: 'cheer', w }, local ? doc.b.entrants.find(x => !BOX.isNpc(x)) : me) }, w)))); }
function bxFloat(b) {
  const cs = b.cheers || [], n = b.cn || 0; if (BX.cn < 0) { BX.cn = n; return; } if (n <= BX.cn) return;
  cs.filter(c => c.n > BX.cn).forEach((c, k) => { const el = h('div', { class: 'bx-fl c' + BOX.CHEERS.indexOf(c.w), style: `left:${12 + ((c.n * 37) % 60)}%;animation-delay:${k * .25}s` }, h('small', null, bdName(c.id)), c.w); BX.wrap.append(el); setTimeout(() => el.remove(), 2800 + k * 250); });
  BX.cn = n;
}
// ---- トーナメント表（上の山と下の山が、真ん中の決勝へ） ----
function bxTree(b) {
  const T = [b.entrants.slice()];
  while (T[T.length - 1].length > 1) { const P = T[T.length - 1], t = T.length - 1, nx = [];
    for (let k = 0; k < P.length / 2; k++) { const gm = P[2 * k] && P[2 * k + 1] ? b.games.find(x => x.tier === t && x.seats[0] === P[2 * k] && x.seats[1] === P[2 * k + 1]) : null; nx.push(gm ? gm.seats[gm.result.win] : null); }
    T.push(nx); }
  return T;
}
// an：いま終わった試合 { t:回戦, k:その回戦の何試合目, id:勝った人 }。勝った人の線がのびて、次の枠に顔と名前がぽんと入る
function bxBracket(b, an) {
  const W = 272, H = 330, T = bxTree(b), n = b.size / 2, L = Math.log2(n), C = W / 2, M = H / 2, FT = M - 30;
  const meId = local ? null : me, col = id => !id ? '#c9c6bf' : BX_ACC[bxCi(id)];
  const fit = (t, w) => t.length * 10 > w ? ` textLength="${w}" lengthAdjust="spacingAndGlyphs"` : '';
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cur = b.phase !== 'over' && b.m ? { t: b.tier, k: b.mi } : null;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="bx-br" role="img" aria-label="トーナメント表"><defs>${BX_FACE}${BX_BELT}</defs>`;
  const path = (d, c) => s += `<path d="${d}" class="${c}"${/grow/.test(c) ? ' pathLength="1"' : ''}/>`;
  const yOf = (j, top) => { const y = j === 0 ? 22 : 44 + (FT - 44) * j / L; return top ? y : H - y; };
  for (const top of [true, false]) {
    for (let j = 0; j < L; j++) { const c = n >> j, off = top ? 0 : c, w = j === 0 ? Math.min(62, W / c - 6) : 84, y = yOf(j, top);
      for (let i = 0; i < c; i++) { const id = T[j][off + i], cx = W / c * (i + .5), lost = j < T.length - 1 && T[j + 1][Math.floor((off + i) / 2)] != null && T[j + 1][Math.floor((off + i) / 2)] !== id;
        // 親へつなぐ線
        const pc = c / 2, pcx = pc >= 1 ? W / pc * (Math.floor(i / 2) + .5) : C, py = j + 1 < L ? yOf(j + 1, top) : (top ? FT : H - FT), by = top ? y + (j ? 13 : 22) : y - (j ? 13 : 22), ty = j + 1 < L ? (top ? py - 13 : py + 13) : py, jy = (by + ty) / 2;
        const win = id && T[j + 1][Math.floor((off + i) / 2)] === id, isCur = cur && cur.t === j && Math.floor((off + i) / 2) === cur.k;
        const fresh = an && an.t === j && Math.floor((off + i) / 2) === an.k;
        path(`M${cx} ${by}V${jy}H${pcx}`, (isCur ? 'nx' : win ? (id === meId ? 'me' : 'win') : 'ln') + (fresh && win ? ' grow' : '')); if (i % 2 === 0) path(`M${pcx} ${jy}V${ty}`, (isCur ? 'nx' : T[j + 1][Math.floor((off + i) / 2)] ? (T[j + 1][Math.floor((off + i) / 2)] === meId ? 'me' : 'win') : 'ln') + (fresh ? ' grow2' : ''));
        const nm = id ? esc(bdName(id)) : '？';
        if (j === 0) s += `<rect x="${cx - w / 2}" y="${y - 22}" width="${w}" height="44" rx="9" class="bxb ${lost ? 'lost' : ''} ${id === meId ? 'mine' : ''}"/><use href="#bxFace" x="${cx - 9}" y="${y - 18}" width="18" height="18" style="color:${col(id)}"/><text x="${cx}" y="${y + 15}" text-anchor="middle"${fit(nm, w - 6)} class="nm ${lost ? 'lost' : ''} ${id === meId ? 'mine' : ''}">${nm}</text>`;
        else s += (an && an.t + 1 === j && off + i === an.k ? '<g class="pop">' : '<g>') + `<rect x="${cx - w / 2}" y="${y - 13}" width="${w}" height="26" rx="8" class="bxb ${isCur ? 'now' : ''} ${id === meId ? 'mine' : ''}"/>` + (id ? `<use href="#bxFace" x="${cx - w / 2 + 5}" y="${y - 9}" width="18" height="18" style="color:${col(id)}"/>` : '') + `<text x="${cx - w / 2 + 27}" y="${y + 4}"${fit(nm, w - 32)} class="nm ${id === meId ? 'mine' : ''}">${nm}</text></g>`;
      } } }
  // 真ん中の決勝
  const f = T[L] || [], champ = T[L + 1] && T[L + 1][0], fn = i => f[i] ? esc(bdName(f[i])) : '？', fin = cur && cur.t === L;
  s += `<rect x="${C - 64}" y="${FT}" width="128" height="60" rx="14" class="bxb ${fin ? 'now' : ''}"/><use href="#bxBelt" x="${C - 24}" y="${FT + 3}" width="48" height="24"/>`;
  const popF = an && an.t + 1 >= L ? ' class="pop"' : '';
  s += `<g${popF}>`;
  s += champ ? `<text x="${C}" y="${FT + 45}" text-anchor="middle" class="fl"${fit(esc(bdName(champ)), 110)}>${esc(bdName(champ))}</text>` : `<text x="${C}" y="${FT + 41}" text-anchor="middle" class="fl">決勝</text><text x="${C}" y="${FT + 53}" text-anchor="middle" class="rs"${fit(fn(0) + ' VS ' + fn(1), 116)}>${fn(0)} VS ${fn(1)}</text>`;
  s += '</g>';
  return svgEl(s + '</svg>');
}
// ---- 試合のおわり ----
function bxMatchOver(b, s) {
  const m = b.m, r = m.result, how = { ko: 'KO', points: '判定', sudden: 'サドンデス', resign: '棄権' }[r.how] || '', wn = bdName(m.seats[r.win]);
  const title = s >= 0 ? (r.win === s ? `${how}で 勝ち！` : `${how}で 負け…`) : `${wn}の勝ち（${how}）`;
  const sub = `当たった数 ${m.hits[0]} − ${m.hits[1]}`;
  return h('div', { class: 'bx-sheet' }, h('div', { class: 'bx-res' + (s >= 0 && r.win !== s ? ' lose' : '') }, h('small', null, `${BOX.tierName(b, b.tier)}　第${b.mi + 1}試合`), h('b', null, title), h('span', null, sub)),
    bxBracket({ ...b, m: null, games: b.games.concat({ tier: b.tier, seats: m.seats, result: r }) }, bxFresh() ? { t: b.tier, k: b.mi, id: m.seats[r.win] } : null), bxHostOk() ? h('button', { class: 'bx-go', onclick: () => bxSend({ t: 'next' }, local ? b.entrants.find(x => !BOX.isNpc(x)) : me) }, b.alive.length === 2 ? '優勝の発表へ' : '次の試合へ') : h('div', { class: 'bx-note' }, '部屋主が 次へ進めます'));
}
// 表が進む動きは、試合が終わって最初の約2秒だけ（描き直すたびにくり返さない）
function bxFresh() { if (BX.anKey !== BX.mk) { BX.anKey = BX.mk; BX.anAt = Date.now(); } return Date.now() - BX.anAt < 2000; }
// 試合の前の「○○ VS ○○」
function bxIntro(b, s) {
  const m = b.m, L = s >= 0 ? s : 0, Rr = 1 - L, face = id => svgEl(`<svg class="bx-vf" viewBox="0 0 24 24" style="color:${BX_ACC[bxCi(id)]}" aria-hidden="true"><defs>${BX_FACE}</defs><use href="#bxFace"/></svg>`);
  return h('div', { class: 'bx-vsi' }, h('small', null, `${BOX.tierName(b, b.tier)}　第${b.mi + 1}試合`),
    h('div', { class: 'row' }, h('div', { class: 'p a' }, face(m.seats[L]), h('b', null, L === s ? 'あなた' : bdName(m.seats[L]))), h('span', { class: 'vs' }, 'VS'), h('div', { class: 'p b' }, face(m.seats[Rr]), h('b', null, bdName(m.seats[Rr])))),
    h('span', { class: 'go' }, 'ファイト！'));
}
function bxChampion(b) {
  // 優勝：リングに立つ優勝者を下から見上げる（3D は 'champ'）。下に名前とボタン。トーナメント表は上の「表」から
  const ch = b.champion, mine = !local && ch === me, wins = b.games.filter(x => x.seats[x.result.win] === ch).length;
  return h('div', { class: 'bx-champ' }, h('div', { class: 'nm' }, h('small', null, 'CHAMPION'), h('b', null, bdName(ch)), h('span', null, mine ? 'あなたが チャンピオン！' : `${wins}試合を 勝ち抜いた`)),
    bxHostOk() ? h('div', { class: 'bx-row' }, h('button', { class: 'bx-sub', onclick: backToHub }, 'ゲーム選択へ'), h('button', { class: 'bx-go', onclick: rematch }, 'もう一度')) : h('div', { class: 'bx-note w' }, '部屋主が次のゲームを選んでいます'));
}
// 実況のひとこと
// ・どのトーナメントでも、自分の1試合目の1ラウンド目は毎回出す（「とばす」でそのトーナメントは出さない）
// ・2・3ラウンド目（ゲージ・読みあいのコツ）は、この端末で最初の試合だけ
function bxAnn(b, s) {
  if (s < 0) return null; const v = BX.view || bxSnap(b.m); if (v.sudden) return null;
  const firstMatch = !b.games.some(x => x.seats.includes(b.m.seats[s]));
  const t = v.round === 1 ? (firstMatch && BX.annSkip !== b.gid ? (BX.step === 'grd' ? ['こんどは 守る向き', '相手が 打ってきそうな向きを 守ろう'] : ['1ラウンド目！', '相手が守っていない向きを 打てば当たり']) : null)
    : !bxTutOn() ? null : v.round === 2 ? ['上の 黄色いゲージ', '当てるたびに たまって、4つで KO！ ガードされると 0にもどる'] : v.round === 3 ? ['読みあいのコツ', '同じ向きばかりだと 読まれるよ'] : null;
  if (!t) return null;
  return h('div', { class: 'bx-ann' }, h('span', { class: 'mic' }, '実況'), h('div', { class: 'bub' }, h('b', null, t[0]), h('span', null, t[1])), h('button', { class: 'bx-annx', onclick: () => { BX.annSkip = b.gid; bxTutDone(); bdRender(); } }, 'とばす'));
}
// ---- 画面 ----
function bxMount() {
  if (BX.wrap) return;
  BX.wrap = h('div', { class: 'bx' }); BX.host = h('div', { class: 'bx-stage' }); BX.hud = h('div', { class: 'bx-hud' }); BX.wrap.append(BX.host, BX.hud);
  addEventListener('resize', () => { if (BX.st && isBoxDoc()) BX.st.resize(); });
}
function bxStart() {
  if (BX.st || BX.failed || !window.THREE || !BX.wrap.isConnected) return;
  try { BX.st = BX3.stage(); } catch (e) { console.warn(e); BX.failed = true; return; }
  BX.host.append(BX.st.el); BX.st.onEvent = k => { if (k === 'hurt') { BX.wrap.classList.remove('hurt'); void BX.wrap.offsetWidth; BX.wrap.classList.add('hurt'); clearTimeout(BX.hurtT); BX.hurtT = setTimeout(() => BX.wrap.classList.remove('hurt'), 650); } }; // 光り終わったら外す（つけたままだと描き直すたびに光りなおす）
  BX.st.resize(); if (isBoxDoc()) { BX.st.setMode(bxSeat(doc.b) >= 0 ? 'fp' : 'side'); bdRender(); }
}
function boxView() {
  bxMount(); const g = doc, b = g.b;
  if (!BX.st) { if (BX.wrap.isConnected) bxStart(); else setTimeout(() => { if (isBoxDoc()) { bxStart(); if (BX.st) BX.st.resize(); } }, 0); }
  else BX.st.resize();
  bxSync(b); const s = bxSeat(b), m = b.m;
  const parts = [bxTop(b, s)];
  if (m && b.phase !== 'over') parts.push(bxVs(b, s));
  if (!BX.st) parts.push(h('div', { class: 'bx-load' }, BX.failed ? '3Dを表示できませんでした' : '読みこんでいます…'));
  if (BX.banner) parts.push(h('div', { class: 'bx-ban' }, BX.banner.map(([c, t]) => h('div', { class: c }, t))));
  if (BX.table) parts.push(h('div', { class: 'bx-sheet' }, h('div', { class: 'bx-res' }, h('small', null, 'トーナメント表'), h('b', null, b.phase === 'over' ? 'けっか' : `${BOX.tierName(b, b.tier)}　第${b.mi + 1}試合`)), bxBracket(b), h('button', { class: 'bx-sub', onclick: () => { BX.table = false; bdRender(); } }, 'とじる')));
  else if (b.phase === 'over') parts.push(bxChampion(b));
  else if (BX.over && m && m.result) parts.push(bxMatchOver(b, s));
  else if (m && b.phase === 'pick' && Date.now() < BX.intro) parts.push(bxIntro(b, s));
  else if (m && b.phase === 'pick' && !BX.anim) {
    if (local && s < 0) { // 1台で、人どうしの試合：順番にスマホを回す
      const i = bxLocalPicker(b);
      if (i == null) parts.push(h('div', { class: 'bx-wait' }, '…'));
      else if (BX.cover !== i) parts.push(h('div', { class: 'bx-card' }, h('h3', null, `${bdName(m.seats[i])}の番です`), h('div', { class: 'bx-hint' }, 'ほかの人は 画面を見ないでね'), h('button', { class: 'bx-go', onclick: () => { BX.cover = i; BX.step = 'atk'; bdRender(); } }, 'えらぶ')));
      else parts.push(bxPickCard(b, m.seats[i]));
    } else if (s >= 0) {
      if (!m.picks[s] && !BX.sent) parts.push(bxAnn(b, s), bxPickCard(b, m.seats[s]));
      else parts.push(h('div', { class: 'bx-wait' }, h('span', null, '相手を待っています…'), bxHostOk() && !local ? h('button', { class: 'bx-force', id: 'bxForce', hidden: Date.now() - BX.at < BX_FORCE_MS, onclick: () => bdConfirm('来ていない人を待たずに 進めますか？', '進める', () => bxSend({ t: 'force' }, me)) }, '待たずに進める') : null));
    } else { parts.push(bxCheers()); if (bxHostOk() && !local) parts.push(h('button', { class: 'bx-force', id: 'bxForce', hidden: Date.now() - BX.at < BX_FORCE_MS, onclick: () => bdConfirm('来ていない人を待たずに 進めますか？', '進める', () => bxSend({ t: 'force' }, me)) }, '待たずに進める')); }
  } else if (m && s < 0 && !BX.over && !local) parts.push(bxCheers());
  BX.hud.replaceChildren(...parts.filter(Boolean));
  bxFloat(b);
  return BX.wrap;
}
// 残り時間・時間切れ・「待たずに進める」
setInterval(() => {
  if (!isBoxDoc() || doc.status !== 'playing' || !BX.wrap || !BX.wrap.isConnected) return;
  const b = doc.b, m = b.m, c = $('bxClk'); if (c) c.textContent = bxClock();
  const f = $('bxForce'); if (f && Date.now() - BX.at >= BX_FORCE_MS) f.hidden = false;
  if (!m || b.phase !== 'pick' || BX.anim || BX.over || local) return;
  const s = bxSeat(b);
  if (s >= 0 && !m.picks[s] && !BX.sent && Date.now() - BX.at >= BX_PICK_MS) { const p = BOX.npcPick(); toast('時間切れ。でたらめに選びました'); BX.step = 'atk'; BX.atk = null; bxSend({ t: 'pick', ...p }, me); }
}, 500);
function bxSlides() {
  const tile = (t, on) => h('span', { class: 'bx-stile' + (on ? ' on' : '') }, t);
  return [
    { t: '打つ向きと 守る向きを えらぶ', s: '右・左・下から 1つずつ', art: () => h('div', { class: 'sla-col' }, h('div', { class: 'sla-row' }, tile('左'), tile('下'), tile('右', 1)), h('div', { class: 'sla-row' }, tile('左', 1), tile('下'), tile('右'))) },
    { t: '守っていない向きなら 当たり', s: '2人いっしょに 見せあう', art: () => h('div', { class: 'sla-vs' }, h('span', { class: 'sla-av' }, '右を打つ'), h('b', null, '→'), h('span', { class: 'sla-av cpu' }, '左を守る')) },
    { t: '4回つづけて 当てたら KO', s: '8ラウンドで決まらなければ 当たった数で', art: () => h('div', { class: 'bx-spips' }, [1, 1, 1, 0].map(o => h('s', { class: o ? 'on' : null }))) },
    { t: '勝ち抜きトーナメント', s: 'ひとりでも コンピュータと戦える', art: () => svgEl(`<svg class="bx-sbelt" viewBox="0 0 48 24" aria-hidden="true"><defs>${BX_BELT}</defs><use href="#bxBelt"/></svg>`) },
  ];
}
