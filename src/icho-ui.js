/* =================== いっちょあがり！の画面 =================== */
// boxing-ui.js のうしろに差し込まれる。ルールは icho-engine.js（ICH）、絵は icho-3d.js（ICH3）
// 1ターン：市場から2つ選ぶ（こっそり）→ せーので公開 → 冷蔵庫へ自動で入る・そろえば自動で料理 → 入らなければ市場へ出す
// 案は tools/chuka-flow-mockup.html（https://claude.ai/artifact/GrZ2QrUq4TpKt8j6Dwg5vY）
const IC = { art: null, ready: null, sel: [], selKey: '', logKey: '', show: 0, tip: -1, fixSel: -1, cover: -1, lastSeat: -1, at: 0, seqSeen: -1, sent: false };
const isIchoDoc = () => !!doc && doc.game === 'icho' && !!doc.b;
const IC_COL = ['#d8402a', '#4c5ac2', '#3fae5a', '#e88a2a']; // 席の色（公開のときの点）
const IC_SHOW_MS = 2800;
function ichLoad() {
  if (!IC.ready) IC.ready = TB.load().then(() => {
    const sizes = {}; ICH.ING.forEach(x => { if (x.s === 2) sizes[x.k] = [2, 1]; if (x.s === 4) sizes[x.k] = [2, 2]; });
    IC.art = ICH3.renderAll(TB.parts().T, ICH.ING.map(x => x.k).concat(ICH.RC.map(r => r.k)), sizes);
    // ホームのアイコンもラーメンの絵に
    ICON_ART.icho = IC.art.ramen; const gm = GAMES.find(x => x.id === 'icho'); if (gm) gm.icon = '<img class="gi-img" src="' + IC.art.ramen + '" alt="">';
  }).catch(e => { IC.ready = null; throw e; });
  return IC.ready;
}
const icImg = (k, cls, alt = '') => IC.art && IC.art[k] ? h('img', { class: cls || null, src: IC.art[k], alt, draggable: 'false' }) : h('i', { class: 'ic-noart ' + (cls || '') });
const icIngName = x => ICH.ING[x].n;
// 自分の席。1台で遊ぶときは、いま操作する人
function ichSeat(b) {
  if (!local) return b.seats.indexOf(me);
  const hs = b.seats.map((id, s) => ICH.isNpc(id) ? -1 : s).filter(s => s >= 0);
  let v = -1;
  if (b.phase === 'pick') v = hs.find(s => !b.picks[s]) ?? -1;
  else if (b.phase === 'fix') v = hs.find(s => b.fixing.includes(s)) ?? -1;
  else if (b.phase === 'cook') v = hs.find(s => (b.choosing || []).includes(s)) ?? -1;
  if (v < 0) v = IC.lastSeat >= 0 ? IC.lastSeat : hs[0];
  return v;
}
const ichHumans = b => b.seats.filter(id => !ICH.isNpc(id)).length;
function ichSend(a, s) {
  if (IC.sent) return; IC.sent = true;
  SFX.play(a.t === 'pick' || a.t === 'cook' ? 'confirm' : a.t === 'throw' ? 'whoosh' : 'tap');
  const b = doc.b, seq0 = b.seq, id = s >= 0 ? b.seats[s] : me;
  if (s >= 0) IC.lastSeat = s;
  if (local) { try { doc = ICH.act(doc, id, a); } catch (e) { toast(e.message); } IC.sent = false; IC.cover = -1; afterChange(); return; }
  withLease(d => d && d.status === 'playing' && d.b && d.b.seq === seq0 ? ICH.act(d, me, a) : null).then(r => { IC.sent = false; if (r !== 'ok' && isIchoDoc()) bdRender(); });
}
/* ---- 部品 ---- */
const icSizeDots = x => { const s = ICH.ING[x].s, w = s === 1 ? 1 : 2; return h('span', { class: 'ic-sz', style: `grid-template-columns:repeat(${w},5px)`, 'aria-hidden': 'true' }, Array.from({ length: s }, () => h('i'))); };
function icFridge(list, o = {}) {
  const P = ICH.pack(list), cells = [];
  for (let i = 0; i < ICH.FW * ICH.FH; i++) cells.push(h('i', { class: 'ic-slot', style: `grid-column:${i % ICH.FW + 1};grid-row:${(i / ICH.FW | 0) + 1}` }));
  const items = P.items.map(it => {
    const ing = ICH.ING[it.x], k = it.w === 2 && it.h === 2 ? ing.k + ':2x2' : it.w === 2 ? ing.k + ':2x1' : ing.k;
    const cls = 'ic-it' + (o.sel === it.i ? ' sel' : '') + (o.hot && o.hot.has(it.i) ? ' hot' : '') + (o.fresh && it.i >= list.length - o.fresh ? ' new' : '');
    return h('button', { type: 'button', class: cls, style: `grid-column:${it.c + 1}/span ${it.w};grid-row:${it.r + 1}/span ${it.h};--c:${ICH_TINT[ing.k] || '#fff'}`, 'aria-label': ing.n, onclick: o.onTap ? () => o.onTap(it.i) : null },
      icImg(IC.art && IC.art[k] ? k : ing.k), h('span', { class: 'ic-nm' }, ing.n));
  });
  const fr = h('div', { class: 'ic-fr' }, h('div', { class: 'ic-in' }, h('span', { class: 'ic-shelf', style: 'top:33.3%' }), h('span', { class: 'ic-shelf', style: 'top:66.6%' }), cells, items));
  return { el: fr, out: P.out, free: P.free };
}
const ICH_TINT = { rice: '#f3f1ec', egg: '#fbf1e2', negi: '#e6f4dc', noodle: '#fdf0c4', soup: '#e9eef3', pork: '#fbe1dc', skin: '#f7ecd6', nira: '#e2f2d6', crab: '#fbe3dc', tofu: '#f6f4ee', shrimp: '#fde6da', cabbage: '#e4f3d4', pepper: '#e2f2d6', bamboo: '#f6eedc', sprout: '#f7f6ee', chicken: '#fbe9e2', shiitake: '#f1e6d8', carrot: '#fde9d6', banno: '#fff0bf' };
// 材料をタップしたとき：それで作れる料理（点つき。大きい材料ほど高い料理になりやすい）
function icTip(x) {
  const rs = ICH.recipesWith(x);
  return h('div', { class: 'ic-tip', role: 'status' }, h('b', null, icIngName(x)), x === ICH.W ? h('span', null, 'どの材料のかわりにもなる') : h('span', null, 'で作れる：' + rs.map(i => `${ICH.RC[i].n}${ICH.RC[i].p}点`).join('・')));
}
// この材料が入ると作れる、いちばん高い料理の点（市場の「あと1つ」の札）
const icDoneBy = (list, x) => { const t = list.concat(x); return Math.max(0, ...ICH.cookable(t).map(i => ICH.RC[i].p)); };
function icMine(b, s) {
  const made = b.made[s];
  return h('div', { class: 'ic-mine' }, h('small', null, '作った料理'), h('div', { class: 'ic-plates' }, made.length ? made.map(r => icImg(ICH.RC[r].k, 'ic-pl', ICH.RC[r].n)) : h('span', { class: 'ic-none' }, 'まだ なし')), h('b', null, ICH.score(b, s) + '点'));
}
// 相手の札：タップでその人の冷蔵庫をのぞける。選び終わった人には OK
function icOpps(b, v) {
  return h('div', { class: 'ic-opps' }, b.seats.map((id, s) => {
    if (s === v) return null;
    const ok = b.phase === 'pick' && (ICH.isNpc(id) || !!b.picks[s]);
    return h('button', { type: 'button', class: 'ic-op' + (b.phase === 'pick' && !ok ? ' wait' : ''), 'aria-label': `${bdName(id)}の冷蔵庫を見る`, onclick: () => icPeek(b, s) },
      h('i', { style: `background:${IC_COL[s]}` }), h('span', null, bdName(id)), ok ? h('em', null, 'OK') : null, h('b', null, ICH.score(b, s) + '点'));
  }));
}
// 相手の冷蔵庫をのぞく
function icPeek(b, s) {
  const el = $('sheet'), close = () => { el.hidden = true; el.replaceChildren(); };
  const near = ICH.nearest(b.fridge[s], 1)[0];
  el.className = 'sheet bd-sheet';
  el.replaceChildren(h('div', { class: 'inner ic-peek', role: 'dialog', 'aria-modal': 'true', 'aria-label': `${bdName(b.seats[s])}の冷蔵庫` },
    h('div', { class: 'ic-pk-hd' }, h('i', { style: `background:${IC_COL[s]}` }), h('b', null, `${bdName(b.seats[s])}の冷蔵庫`), h('span', null, ICH.score(b, s) + '点')),
    near ? h('div', { class: 'ic-hint' }, icImg(ICH.RC[near.r].k), h('span', null, near.left ? `${ICH.RC[near.r].n}（${ICH.RC[near.r].p}点）まで あと${near.left}つ：` : `${ICH.RC[near.r].n}が作れる`, h('b', null, near.need.map(icIngName).join('・')))) : null,
    icFridge(b.fridge[s]).el, icMine(b, s), h('button', { class: 'ic-go', onclick: close }, 'とじる')));
  el.hidden = false; el.onclick = e => { if (e.target === el) close(); };
}
// レシピ表：いまの冷蔵庫から「あと1つ」「あと2つ」「あと3つ」の順。同じ組は点の高い順
// 冷蔵庫にある材料は緑の枠、市場に出ている材料は金の点。案は tools/icho-rules-mockup.html のレシピ4
function icLeft(list, r) { const w = list.filter(x => x === ICH.W).length, need = ICH.RC[r].i.filter(x => !list.includes(x)); return { need, left: Math.max(0, need.length - w) }; }
function icRecipes(b, v) {
  const el = $('sheet'), close = () => { el.hidden = true; el.replaceChildren(); };
  const list = b.fridge[v] || [], mk = new Set(b.phase === 'pick' ? b.market : []);
  const all = ICH.RC.map((_, r) => ({ r, ...icLeft(list, r) })).sort((a, c) => a.left - c.left || ICH.RC[c.r].p - ICH.RC[a.r].p);
  const LB = ['作れる', 'あと1つ', 'あと2つ', 'あと3つ'], rows = []; let g = -1;
  for (const o of all) {
    if (o.left !== g) { g = o.left; rows.push(h('div', { class: 'ic-rc-sec s' + g }, LB[g])); }
    const R = ICH.RC[o.r];
    rows.push(h('div', { class: 'ic-rc' }, icImg(R.k, 'ic-rc-d', R.n),
      h('div', { class: 'ic-rc-m' }, h('b', null, R.n), h('div', { class: 'ic-rc-i' }, R.i.map(x => h('span', { class: 'ic-rc-g' + (list.includes(x) ? ' have' : ''), title: icIngName(x) }, icImg(ICH.ING[x].k, '', icIngName(x)), mk.has(x) && !list.includes(x) ? h('i', { 'aria-label': '市場にある' }) : null)))),
      h('span', { class: 'ic-rc-p' }, String(R.p), h('small', null, '点'))));
  }
  el.className = 'sheet bd-sheet';
  el.replaceChildren(h('div', { class: 'inner ic-peek ic-rcs', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'レシピ' },
    h('div', { class: 'ic-pk-hd' }, h('b', null, 'レシピ'), h('span', null, 'いまの冷蔵庫から 近い順')),
    h('div', { class: 'ic-rc-key' }, h('span', { class: 'have' }), h('em', null, '冷蔵庫にある'), h('i'), h('em', null, '市場にある'), h('em', { class: 'w' }, '万能スープは どの材料にもなる')),
    h('div', { class: 'ic-rc-list' }, rows), h('button', { class: 'ic-go', onclick: close }, 'とじる')));
  el.hidden = false; el.onclick = e => { if (e.target === el) close(); };
}
// 遊びながら教える：最初の1ターン、本物の画面を暗くして1か所ずつ照らす。画面のタップで次へ、「とばす」で終わり
// この端末で1回（localStorage atsumaru.icCoach）。「？」でいつでもやり直せる。案は tools/icho-rules-mockup.html の遊びかた3
const IC_COACH = [
  ['.ic-hint', '次の料理まで あと何こか', 'ここに出ている材料を 取ると 料理になる'],
  ['.ic-mk', '市場から 2つ えらぼう', '光っている材料で 料理ができる。山（ふせた材料）からでもいい'],
  ['.ic-fr', 'ここが あなたの冷蔵庫', '12マス。大きい材料は 場所をとる。材料をタップすると 作れる料理'],
  ['.ic-rcb', 'レシピは ここ', 'いまの冷蔵庫から 近い順に 見られる'],
  ['.ic-opps', 'ほかの人の 冷蔵庫も 見られる', '名前をタップ。OK は もう えらんだ人'],
  ['.ic > .ic-go', '2つ えらんだら「これでOK」', 'みんなが そろったら せーので 公開。かぶったら 順番が先の人'],
];
function icCoach() {
  document.querySelectorAll('.ic-coach').forEach(e => e.remove());
  const hole = h('div', { class: 'ic-co-hole' }), bub = h('div', { class: 'ic-co-bub', role: 'status', 'aria-live': 'polite' }), skip = h('button', { class: 'ic-co-skip' }, 'とばす');
  const ov = h('div', { class: 'ic-coach' }, hole, bub, skip); document.body.append(ov);
  let i = -1; const end = () => { ov.remove(); removeEventListener('resize', place); try { localStorage.setItem('atsumaru.icCoach', '1'); } catch (e) { } };
  const target = () => { const e = document.querySelector(IC_COACH[i][0]); return e && e.getClientRects().length ? e : null; };
  function place() {
    if (i < 0 || i >= IC_COACH.length) return; const e = target(); if (!e) return;
    const r = e.getBoundingClientRect(), p = 6, H = innerHeight;
    Object.assign(hole.style, { left: r.left - p + 'px', top: r.top - p + 'px', width: r.width + p * 2 + 'px', height: r.height + p * 2 + 'px' });
    const below = r.bottom + 14 + 110 < H || r.top < H / 2;
    bub.style.top = below ? Math.min(H - 120, r.bottom + 14) + 'px' : ''; bub.style.bottom = below ? '' : Math.max(8, H - r.top + 14) + 'px';
  }
  function next() {
    do i++; while (i < IC_COACH.length && !target());
    if (i >= IC_COACH.length) { end(); return; }
    const [, t, s] = IC_COACH[i];
    bub.replaceChildren(h('b', null, t), h('small', null, s), h('span', { class: 'n' }, `${i + 1}/${IC_COACH.length}　タップで次へ`));
    place(); bub.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200 }); SFX.play('pop');
  }
  ov.addEventListener('pointerdown', e => { if (e.target === skip) { end(); return; } next(); });
  addEventListener('resize', place);
  next();
}
function icCoachDue(b, v) {
  if (b.turn !== 1 || b.phase !== 'pick' || b.picks[v]) return false;
  try { if (localStorage.getItem('atsumaru.icCoach')) return false; } catch (e) { }
  return true;
}
// 音：せーの！ → かぶった！。自分の料理ができたら「どーん！」（icCookFx）
function icRevealSfx(b, tug) {
  const L = b.log, v = ichSeat(b); SFX.play('seeno');
  if (!tug) { if (L.clash.some(c => c.s === v)) SFX.later('clash', 420); else if (L.clash.length) SFX.later('pass', 420); }
  if (!(L.cooked[v] || []).length && L.order.some(s => L.cooked[s].length)) SFX.later('pop', 900 + tug);
}
// かぶった！：ひっぱりあい。席の色のフェルトのミトンが材料をつかんで綱引き → 材料がむにっと伸びる
// → 取れなかった人の手がすぽっとはずれて飛んでいく → 順番が先の人のほうへ。1つ約1.9秒、タップでとばせる
// 自分がかかわったものを先に、2つまで。案は tools/icho-clash-mockup.html の2（https://claude.ai/artifact/Uu6iqWWjfG7KVPQfCxvV6N）
const IC_TUG_MS = 1900;
function icTugPlan(b, v) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return [];
  const L = b.log, by = new Map();
  for (const c of L.clash) { if (!by.has(c.m)) by.set(c.m, { m: c.m, x: L.market[c.m], w: c.by, lose: [] }); by.get(c.m).lose.push(c.s); }
  return [...by.values()].sort((a, c) => (c.w === v || c.lose.includes(v)) - (a.w === v || a.lose.includes(v))).slice(0, 2);
}
function icTugFx(list, v) {
  document.querySelectorAll('.ic-tug').forEach(e => e.remove());
  const st = h('div', { class: 'ic-tg' }), ov = h('div', { class: 'ic-tug', role: 'status', 'aria-live': 'polite' }, st); document.body.append(ov);
  let alive = true; const end = () => { alive = false; ov.remove(); }; ov.addEventListener('pointerdown', end);
  const A = (e, kf, o) => e.animate(kf, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.3,.7,.3,1)' }, o));
  const nm = s => s === v && !local ? 'あなた' : bdName(doc.b.seats[s]);
  const one = k => {
    if (!alive) return; if (k >= list.length) { end(); return; }
    const T = list[k], item = icImg(ICH.ING[T.x].k, 'ic-tg-x');
    const win = h('div', { class: 'ic-mit l', style: `--c:${IC_COL[T.w]}` });
    const loses = T.lose.map((s, i) => h('div', { class: 'ic-mit r', style: `--c:${IC_COL[s]};top:${112 + (i - (T.lose.length - 1) / 2) * 46}px` }));
    const word = h('div', { class: 'ic-tg-w' }, 'ぐぐぐ…！');
    const res = h('div', { class: 'ic-tg-res' }, h('b', null, `${nm(T.w)}が 取った！`), h('span', null, `${T.lose.map(nm).join('・')}は 山から1つ`));
    const tags = h('div', { class: 'ic-tg-nm' }, h('span', { style: `background:${IC_COL[T.w]}` }, nm(T.w)), h('span', { style: `background:${IC_COL[T.lose[0]]}` }, T.lose.map(nm).join('・')));
    st.replaceChildren(item, win, ...loses, word, res, tags);
    A(item, [{ transform: 'scale(0)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 220 });
    A(win, [{ transform: 'translateX(-190px)' }, { transform: 'translateX(0)' }], { duration: 300, delay: 120 });
    loses.forEach(e => A(e, [{ transform: 'translateX(190px)' }, { transform: 'translateX(0)' }], { duration: 300, delay: 120 }));
    SFX.later('clash', 420);
    // 綱引き（ぐいぐい）
    const tug = [0, -10, 4, -14, 2, -18], t0 = 450, dt = 120;
    A(word, [{ opacity: 0, transform: 'scale(.4) rotate(-8deg)' }, { opacity: 1, transform: 'scale(1.15) rotate(-8deg)' }, { opacity: 1, transform: 'rotate(-8deg)' }], { duration: 260, delay: t0 });
    A(item, tug.map((x, i) => ({ transform: `translateX(${x / 2}px) scaleX(${1 + i * .05})` })), { duration: tug.length * dt, delay: t0, easing: 'ease-in-out' });
    A(win, tug.map(x => ({ transform: `translateX(${x}px)` })), { duration: tug.length * dt, delay: t0, easing: 'ease-in-out' });
    loses.forEach(e => A(e, tug.map((x, i) => ({ transform: `translateX(${-x * .6 + i * 2}px)` })), { duration: tug.length * dt, delay: t0, easing: 'ease-in-out' }));
    const t1 = t0 + tug.length * dt; // すぽっ
    loses.forEach((e, i) => A(e, [{ transform: 'translateX(10px)' }, { transform: `translate(90px,${40 + i * 30}px) rotate(50deg)`, opacity: 1 }, { transform: `translate(200px,${220 + i * 40}px) rotate(110deg)`, opacity: 0 }], { duration: 520, delay: t1, easing: 'cubic-bezier(.2,.6,.4,1)' }));
    A(item, [{ transform: 'translateX(-9px) scaleX(1.3)' }, { transform: 'translateX(-30px) scale(.85,1.12)' }, { transform: 'translateX(-62px) scale(1)' }], { duration: 300, delay: t1, easing: 'cubic-bezier(.3,1.5,.5,1)' });
    A(win, [{ transform: 'translateX(-18px)' }, { transform: 'translateX(-40px)' }], { duration: 260, delay: t1 });
    A(word, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, delay: t1 });
    A(res, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: t1 + 150 });
    SFX.later('pop', t1); SFX.later('whoosh', t1 + 60);
    if (navigator.vibrate && (T.w === v || T.lose.includes(v))) setTimeout(() => { try { navigator.vibrate(15); } catch (e) { } }, t1);
    setTimeout(() => one(k + 1), IC_TUG_MS);
  };
  one(0);
}
// 自分の料理がふえたら「どーん！」（公開のときも、「どっちを作る？」のあとも）
function icCookWatch(b, v, live) {
  const k = b.gid + ':' + (b.log ? b.log.turn : 0), n = b.log ? (b.log.cooked[v] || []).length : 0;
  if (IC.ckKey !== k) { IC.ckKey = k; IC.ckN = live ? 0 : n; }
  if (n <= IC.ckN) return;
  const add = b.log.cooked[v].slice(IC.ckN); IC.ckN = n;
  const at = Math.max(0, Math.max((IC.revealAt || 0) + 700, (IC.tugEnd || 0) + 200) - Date.now());
  IC.show = Math.max(IC.show, Date.now() + at + add.length * IC_COOK_MS + 400);
  setTimeout(() => { if (isIchoDoc()) icCookFx(add); }, at); setTimeout(() => { if (isIchoDoc()) bdRender(); }, IC.show - Date.now() + 30);
}
// 料理ができた瞬間「どーん！」：3つの材料がまん中でぶつかって白く光る → 料理がくるっと出る → ハンコ「いっちょあがり！」
// 何品もできたら順番に。画面のタップでとばせる。案は tools/icho-cook-mockup.html の4（https://claude.ai/artifact/T36DLDy3L44BZ8R42xBVvb）
const IC_COOK_MS = 1500;
function icCookFx(list) {
  document.querySelectorAll('.ic-cook').forEach(e => e.remove());
  const ov = h('div', { class: 'ic-cook', role: 'status', 'aria-live': 'polite' }), st = h('div', { class: 'ic-ck' }); ov.append(st); document.body.append(ov);
  let alive = true; const end = () => { alive = false; ov.remove(); };
  ov.addEventListener('pointerdown', end);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const A = (e, kf, o) => e.animate(kf, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.3,.7,.3,1)' }, o));
  const one = k => {
    if (!alive) return; if (k >= list.length) { setTimeout(end, 250); return; }
    const r = ICH.RC[list[k]], ings = r.i.map((x, i) => { const e = icImg(ICH.ING[x].k, 'ic-ck-ing'); e.style.left = (14 + i * 92) + 'px'; return e; });
    const dish = icImg(r.k, 'ic-ck-dish'), lbl = h('div', { class: 'ic-ck-lbl' }, r.n, h('small', null, `＋${r.p}点`)), fl = h('div', { class: 'ic-ck-fl' }), stamp = h('div', { class: 'ic-ck-stamp' }, h('small', null, 'いっちょ'), 'あがり！');
    st.replaceChildren(...ings, dish, lbl, fl, stamp);
    if (still) { [dish, lbl, stamp].forEach(e => e.style.opacity = 1); ings.forEach(e => e.style.opacity = 0); SFX.play('dish'); setTimeout(() => one(k + 1), IC_COOK_MS); return; }
    ings.forEach((e, i) => A(e, [{ transform: 'none' }, { transform: `translate(${(1 - i) * 92}px,-150px) scale(1.4)` }], { duration: 380, delay: 150, easing: 'cubic-bezier(.6,0,.9,.6)' }));
    ings.forEach(e => A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 80, delay: 530 }));
    SFX.later('whoosh', 150);
    A(fl, [{ opacity: 0 }, { opacity: .95 }, { opacity: 0 }], { duration: 300, delay: 510 });
    A(st, [{ transform: 'none' }, { transform: 'translate(7px,-3px)' }, { transform: 'translate(-7px,3px)' }, { transform: 'translate(3px,0)' }, { transform: 'none' }], { duration: 260, delay: 530, fill: 'none' }); SFX.later('punch', 530);
    A(dish, [{ opacity: 0, transform: 'rotateY(90deg) scale(.6)' }, { opacity: 1, transform: 'rotateY(0) scale(1.15)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 420, delay: 590, easing: 'cubic-bezier(.3,1.6,.5,1)' }); SFX.later('dish', 610);
    A(lbl, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: 750 });
    A(stamp, [{ opacity: 0, transform: 'scale(2.4) rotate(-22deg)' }, { opacity: 1, transform: 'scale(.92) rotate(-10deg)' }, { opacity: 1, transform: 'scale(1) rotate(-10deg)' }], { duration: 340, delay: 930, easing: 'cubic-bezier(.5,0,.6,1.4)' }); SFX.later('tear', 1030);
    if (navigator.vibrate) setTimeout(() => { try { navigator.vibrate(20); } catch (e) { } }, 530);
    setTimeout(() => one(k + 1), IC_COOK_MS);
  };
  one(0);
}
// 筆の字（Yuji Syuku）。名前はなんでも入るので、使うときに全部の字を読みこむ（Google Fonts が使う字のぶんだけ取ってくる）
function icBrush() { if (IC.brush) return; IC.brush = true; document.head.append(h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Yuji+Syuku&display=swap' })); }
// 開店：赤いのれん「町中華」がゆれて上がり「開店！」。約1.8秒、タップでとばせる。ゲームの最初に、この端末で1回
// 案は tools/icho-endstart-mockup.html の開店1
function icOpenFx() {
  document.querySelectorAll('.ic-open').forEach(e => e.remove());
  const nr = h('div', { class: 'ic-nr' }, h('i', null, '町'), h('i', null, '中'), h('i', null, '華'));
  const big = h('div', { class: 'ic-op-big' }, '開店！'), sub = h('div', { class: 'ic-op-sub' }, `${ICH.TURNS}ターンで閉店。料理を作って 売り上げを きそおう`);
  const ov = h('div', { class: 'ic-open', role: 'status', 'aria-live': 'polite' }, nr, big, sub); document.body.append(ov);
  const end = () => ov.remove(); ov.addEventListener('pointerdown', end);
  const A = (e, kf, o) => e.animate(kf, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.3,.7,.3,1)' }, o));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { nr.remove(); big.style.opacity = sub.style.opacity = 1; SFX.play('ok'); setTimeout(end, 1500); return; }
  A(ov, [{ background: 'rgba(253,235,211,.92)' }, { background: 'rgba(253,235,211,.92)', offset: .75 }, { background: 'rgba(253,235,211,0)' }], { duration: 2000 });
  A(nr, [{ transform: 'rotate(0)' }, { transform: 'rotate(1.4deg)' }, { transform: 'rotate(-1deg)' }, { transform: 'rotate(0)' }], { duration: 420, fill: 'none' });
  A(nr, [{ transform: 'translateY(0)' }, { transform: 'translateY(-115%)' }], { duration: 480, delay: 420, easing: 'cubic-bezier(.6,0,.4,1)' }); SFX.later('whoosh', 420);
  A(big, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.2)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 380, delay: 780, easing: 'cubic-bezier(.3,1.6,.5,1)' }); SFX.later('start', 780);
  A(sub, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 250, delay: 1000 });
  A(big, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 1750 }); A(sub, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 1750 });
  setTimeout(end, 2100);
}
function icOpenDue(b) {
  if (b.turn !== 1 || b.log || b.phase !== 'pick') return false;
  let seen = IC.openGid; try { seen = seen || localStorage.getItem('atsumaru.icOpen'); } catch (e) { }
  return String(seen) !== String(b.gid);
}
/* ---- 画面 ---- */
function ichoView() {
  const g = doc, b = g.b, over = g.status !== 'playing';
  if (!IC.art && !IC.loading) { IC.loading = true; ichLoad().then(() => { IC.loading = false; if (isIchoDoc()) bdRender(); }, () => { IC.loading = false; }); }
  // 新しい公開が来たら「せーの！」を見せる（開き直した直後は見せない）
  const lk = b.gid + ':' + (b.log ? b.log.turn : 0);
  let live = false;
  if (IC.logKey !== lk) { if (IC.logKey && b.log && IC.logKey.split(':')[0] === String(b.gid)) { live = true; IC.revealAt = Date.now();
    // かぶったら先に「ひっぱりあい」。そのぶん「せーの！」の画面と料理の「どーん！」をおくらせる
    const tg = icTugPlan(b, ichSeat(b)), tugMs = tg.length ? 350 + tg.length * IC_TUG_MS : 0;
    IC.tugEnd = tugMs ? Date.now() + tugMs : 0; if (tg.length) setTimeout(() => { if (isIchoDoc()) icTugFx(tg, ichSeat(doc.b)); }, 350);
    IC.show = Date.now() + IC_SHOW_MS + tugMs; setTimeout(() => { if (isIchoDoc()) bdRender(); }, IC_SHOW_MS + tugMs + 30); icRevealSfx(b, tugMs); } IC.logKey = lk; }
  icCookWatch(b, ichSeat(b), live);
  // いま取った材料は、冷蔵庫に入るときにぴょこっと（このターンの公開を見た人だけ）
  if (live) IC.freshKey = lk;
  // 自分の冷蔵庫があふれたら「ブブッ」（公開のあと）
  const fk = b.gid + ':' + b.turn; if (b.phase === 'fix' && b.fixing.includes(ichSeat(b)) && IC.fixKey !== fk) { IC.fixKey = fk; SFX.later('buzz', Date.now() < IC.show ? IC.show - Date.now() : 0); }
  const sk = b.gid + ':' + b.turn + ':' + b.phase; if (IC.selKey !== sk) { IC.selKey = sk; IC.sel = []; IC.tip = -1; IC.fixSel = -1; }
  if (IC.seqSeen !== b.seq) { IC.seqSeen = b.seq; IC.at = Date.now(); }
  icBrush();
  let opening = false;
  if (!over && icOpenDue(b)) { opening = true; IC.openGid = b.gid; try { localStorage.setItem('atsumaru.icOpen', String(b.gid)); } catch (e) { } setTimeout(icOpenFx, 0); }
  const v = ichSeat(b), left = b.T - b.turn + 1;
  // はじめての人には、開店のあとに画面の見かたを教える（1台で何人かのときは、最初の人の画面が出てから）
  if (!over && IC.coachGid !== b.gid && icCoachDue(b, v) && !(local && ichHumans(b) > 1 && IC.cover !== v)) { IC.coachGid = b.gid; setTimeout(() => { if (isIchoDoc() && doc.b.phase === 'pick' && !document.querySelector('.ic-coach')) icCoach(); }, opening || document.querySelector('.ic-open') ? 2300 : 300); }
  const rcb = h('button', { class: 'hub-ib quit ic-rcb', 'aria-label': 'レシピを見る', onclick: () => icRecipes(b, v) }, 'レシピ');
  const help = () => b.phase === 'pick' && !over && !b.picks[v] && !(Date.now() < IC.show) ? icCoach() : bdOpenRules('icho');
  const head = bdHead('いっちょあがり！', over ? '閉店' : `${left === 1 ? 'ラストオーダー' : 'あと' + left + 'ターン'} ・ ${local ? '1台で遊ぶ' : '招待コード ' + tableId}`, 'icho', rcb, help);
  const root = (cls, ...xs) => h('div', { class: 'ic' + (cls ? ' ' + cls : '') }, head, icOpps(b, v), ...xs);
  if (over && !BS.peek) return root('ic-over', icResult(b, v));
  if (over) return root('', icFridge(b.fridge[v]).el, icMine(b, v), bdOverCard('', '', null));
  if (Date.now() < IC.show && b.log) return root('ic-reveal', icReveal(b, v));
  // 1台で何人か：番の人に回す
  if (local && ichHumans(b) > 1 && (b.phase === 'pick' || b.phase === 'fix' || b.phase === 'cook') && IC.cover !== v) {
    return root('', h('div', { class: 'ic-cover' }, h('b', null, `${bdName(b.seats[v])}の番です`), h('span', null, 'ほかの人は 画面を見ないでね'), h('button', { class: 'ic-go', onclick: () => { IC.cover = v; bdRender(); } }, b.phase === 'pick' ? 'えらぶ' : '冷蔵庫を見る')));
  }
  if (b.phase === 'cook') return root('', (b.choosing || []).includes(v) ? icChoose(b, v) : icWaitFix(b, v, b.choosing, '作る料理を 選んでいます…'));
  if (b.phase === 'fix') return root('', b.fixing.includes(v) ? icFix(b, v) : icWaitFix(b, v));
  return root('', icPick(b, v));
}
function icPick(b, v) {
  const list = b.fridge[v], done = !!b.picks[v], sel = done ? b.picks[v] : IC.sel;
  const near = ICH.nearest(list, 1)[0];
  const hint = near ? h('div', { class: 'ic-hint' }, icImg(ICH.RC[near.r].k), h('span', null, near.left ? `${ICH.RC[near.r].n}（${ICH.RC[near.r].p}点）まで あと${near.left}つ：` : `${ICH.RC[near.r].n}が作れる！`, h('b', null, near.need.map(icIngName).join('・')))) : h('div', { class: 'ic-hint' }, h('span', null, '市場の材料で 料理を作ろう'));
  const tap = i => { if (done) return; const n0 = IC.sel.length, at = IC.sel.indexOf(i); if (at >= 0 && i !== -1) IC.sel.splice(at, 1); else if (IC.sel.length < 2) IC.sel.push(i); else if (i === -1 && at >= 0) IC.sel.splice(at, 1); else { IC.sel.shift(); IC.sel.push(i); } SFX.play(IC.sel.length < n0 ? 'unpop' : 'pop'); bdRender(); };
  const mk = b.market.map((x, i) => {
    const k = sel.indexOf(i), hot = icDoneBy(list, x);
    return h('button', { type: 'button', class: 'ic-mc' + (k >= 0 ? ' on' : '') + (hot && b.turn === 1 && !done && k < 0 ? ' coach' : ''), 'aria-label': icIngName(x) + (k >= 0 ? '（選んだ）' : ''), 'aria-pressed': String(k >= 0), onclick: () => tap(i) },
      icImg(ICH.ING[x].k), icSizeDots(x), h('span', { class: 'ic-mn' }, icIngName(x)), k >= 0 ? h('span', { class: 'ic-num' }, String(k + 1)) : null, hot ? h('span', { class: 'ic-hb' }, `あと1つ ${hot}点`) : null);
  });
  const nd = sel.filter(x => x === -1).length;
  mk.push(h('button', { type: 'button', class: 'ic-mc ic-deck' + (nd ? ' on' : ''), 'aria-label': '山から取る' + (nd ? `（${nd}つ）` : ''), onclick: () => tap(-1) }, h('span', { class: 'ic-back' }), h('span', { class: 'ic-mn' }, `山 ${b.deck.length}`), nd ? h('span', { class: 'ic-num' }, nd === 2 ? '×2' : String(sel.indexOf(-1) + 1)) : null));
  const lg = b.log && IC.freshKey === b.gid + ':' + b.log.turn && b.log.turn === b.turn - 1 ? b.log : null, fresh = lg ? icFreshCount(b, v) : 0;
  if (lg) IC.freshKey = ''; // ぴょこっとは1回だけ
  const F = icFridge(list, { sel: IC.tip, fresh, onTap: i => { IC.tip = IC.tip === i ? -1 : i; bdRender(); } });
  const humans = b.seats.filter(id => !ICH.isNpc(id)), picked = humans.filter(id => b.picks[b.seats.indexOf(id)]).length;
  const btn = done ? h('div', { class: 'ic-wait' }, h('span', null, `みんなを待っています… ${picked}/${humans.length}人`), !local && (g => g.host === me)(doc) ? h('button', { class: 'ic-force', id: 'icForce', hidden: Date.now() - IC.at < 40000, onclick: () => bdConfirm('来ていない人を待たずに 進めますか？', '進める', () => ichSend({ t: 'force' }, -1)) }, '待たずに進める') : null)
    : h('button', { class: 'ic-go', disabled: sel.length !== 2 || IC.sent, onclick: () => ichSend({ t: 'pick', p: IC.sel.slice() }, v) }, sel.length === 2 ? 'これでOK' : `あと${2 - sel.length}つ えらぶ`);
  return [h('div', { class: 'ic-pr' }, h('b', null, done ? 'えらんだ！' : '2つ えらぶ'), h('span', null, done ? 'せーので 公開します' : '市場か山から。みんな こっそり いっせいに')), hint,
    h('div', { class: 'ic-mk' + (done ? ' done' : '') }, mk), IC.tip >= 0 && list[IC.tip] != null ? icTip(list[IC.tip]) : null, F.el, btn, icMine(b, v)];
}
// このターンに取って、まだ冷蔵庫に残っている材料の数（冷蔵庫の並びの最後のほう）
function icFreshCount(b, v) { const got = (b.log.got[v] || []).slice(), f = b.fridge[v]; let n = 0; for (let i = f.length - 1; i >= 0 && got.length; i--) { const j = got.lastIndexOf(f[i]); if (j < 0) break; got.splice(j, 1); n++; } return n; }
// どっちを作る？：1つの材料で2つの料理ができるとき
function icChoose(b, v) {
  const list = b.fridge[v], os = ICH.cookable(list).sort((x, y) => ICH.RC[y].p - ICH.RC[x].p);
  const freed = r => ICH.RC[r].i.reduce((a, x) => a + ICH.ING[list.includes(x) ? x : ICH.W].s, 0);
  return [h('div', { class: 'ic-pr' }, h('b', null, 'どっちを 作る？'), h('span', null, '材料が1つしかないので どちらか')),
    h('div', { class: 'ic-pick' }, os.map(r => h('button', { type: 'button', class: 'ic-pk', disabled: IC.sent, onclick: () => ichSend({ t: 'cook', r }, v) }, icImg(ICH.RC[r].k), h('b', null, ICH.RC[r].n), h('small', null, `${ICH.RC[r].p}点・${freed(r)}マス空く`)))),
    icFridge(list, { hot: new Set(list.map((x, i) => os.some(r => ICH.RC[r].i.includes(x)) ? i : -1).filter(i => i >= 0)) }).el, icMine(b, v)];
}
function icFix(b, v) {
  const list = b.fridge[v];
  // いらなそうな材料を先に選んでおく（そのまま「出す」でいい。変えたいときだけタップ）。1つ出すたびに選びなおす
  const dk = b.gid + ':' + b.turn + ':' + list.length;
  if (IC.fixDef !== dk) { IC.fixDef = dk; IC.fixSel = ICH.worst(list); }
  const F = icFridge(list, { sel: IC.fixSel, onTap: i => { IC.fixSel = IC.fixSel === i ? -1 : i; bdRender(); } });
  const tray = F.out.length ? h('div', { class: 'ic-tray' }, h('small', null, '入りきらない'), F.out.map(o => { const ing = ICH.ING[o.x]; return h('button', { type: 'button', class: 'ic-it out' + (IC.fixSel === o.i ? ' sel' : ''), style: `--c:${ICH_TINT[ing.k] || '#fff'}`, 'aria-label': ing.n, onclick: () => { IC.fixSel = IC.fixSel === o.i ? -1 : o.i; bdRender(); } }, icImg(ing.k), h('span', { class: 'ic-nm' }, ing.n)); })) : null;
  const sx = IC.fixSel >= 0 ? list[IC.fixSel] : null;
  return [h('div', { class: 'ic-pr' }, h('b', { class: 'ng' }, '入らない！'), h('span', null, 'いらなそうなものを えらんでおいたよ。変えるなら タップ')), tray, sx != null ? icTip(sx) : null, F.el,
    h('button', { class: 'ic-go red', disabled: sx == null || IC.sent, onclick: () => ichSend({ t: 'throw', i: IC.fixSel }, v) }, sx != null ? `${icIngName(sx)}を 市場へ出す` : '出すものを えらぶ'), icMine(b, v)];
}
function icWaitFix(b, v, list = b.fixing, msg = '冷蔵庫を片付け中…') {
  const who = list.map(s => bdName(b.seats[s])).join('・');
  return [h('div', { class: 'ic-pr' }, h('b', null, 'ちょっと待ってね'), h('span', null, `${who}が ${msg}`)), icFridge(b.fridge[v]).el,
    !local && doc.host === me ? h('button', { class: 'ic-force', id: 'icForce', hidden: Date.now() - IC.at < 40000, onclick: () => ichSend({ t: 'force' }, -1) }, '待たずに進める') : null, icMine(b, v)];
}
// せーの！：だれが何を選んだか・かぶった・自分が取ったもの・できた料理
function icReveal(b, v) {
  const L = b.log, me2 = v, by = L.market.map(() => []);
  L.order.forEach(s => (L.picks[s] || []).forEach(x => { if (x >= 0) by[x].push(s); }));
  const clashM = new Set(L.clash.map(c => c.m));
  const mk = L.market.map((x, i) => h('div', { class: 'ic-mc' + (clashM.has(i) ? ' clash' : '') }, h('span', { class: 'ic-who' }, by[i].map(s => h('i', { style: `background:${IC_COL[s]}` }))), icImg(ICH.ING[x].k), h('span', { class: 'ic-mn' }, icIngName(x)), clashM.has(i) ? h('span', { class: 'ic-cl' }, 'かぶった！') : null));
  const got = L.got[me2] || [], from = L.from[me2] || [];
  const mine = got.map((x, i) => h('span', { class: 'ic-got' }, icImg(ICH.ING[x].k), h('b', null, icIngName(x)), from[i] === 'deck' ? h('small', null, '山から') : from[i] === 'clash' ? h('small', { class: 'cl' }, 'かぶって山から') : null));
  const cooked = L.cooked[me2] || [];
  const others = L.order.filter(s => s !== me2 && L.cooked[s].length).map(s => `${bdName(b.seats[s])}：${L.cooked[s].map(r => ICH.RC[r].n).join('・')}`);
  return [h('div', { class: 'ic-pr' }, h('b', null, 'せーの！'), h('span', null, '順番：' + L.order.map(s => s === me2 && !local ? 'あなた' : bdName(b.seats[s])).join(' → '))),
    h('div', { class: 'ic-mk done' }, mk), h('div', { class: 'ic-gots' }, h('small', null, local && ichHumans(b) > 1 ? bdName(b.seats[me2]) + '：' : 'あなた：'), mine),
    cooked.length ? h('div', { class: 'ic-done' }, cooked.map(r => h('div', { class: 'ic-dish' }, icImg(ICH.RC[r].k, 'big'), h('b', null, ICH.RC[r].n + '！'), h('span', null, `＋${ICH.RC[r].p}点`)))) : h('div', { class: 'ic-none2' }, '料理は まだ'),
    others.length ? h('div', { class: 'ic-others' }, others.join('　')) : null,
    h('button', { class: 'ic-skip', onclick: () => { IC.show = 0; bdRender(); } }, 'とじる')];
}
// 閉店：木札の番付。壁の木札が上から順に落ちてきて、順位・名前・売り上げ（1点＝100円）・称号をたて書きで。
// 札をタップでその人の冷蔵庫と料理。落ちてくる動きは1ゲームに1回。案は tools/icho-endstart-mockup.html の閉店3
function icResult(b, v) {
  const rk = ICH.ranking(b), tt = ICH.titles(b), yen = p => (p * 100).toLocaleString('ja-JP') + '円';
  const fresh = IC.resGid !== b.gid && !matchMedia('(prefers-reduced-motion: reduce)').matches; IC.resGid = b.gid;
  if (fresh) { rk.forEach((_, i) => SFX.later('thud', 250 + i * 160)); SFX.later(rk[0].s === v || local ? 'win' : 'ok', 250 + rk.length * 160 + 200); }
  let no = 0;
  const fuda = rk.map((r, i) => {
    if (!i || r.pts !== rk[i - 1].pts || r.n !== rk[i - 1].n) no = i + 1;
    const nm = r.s === v && !local ? 'あなた' : bdName(r.id), fs = nm.length > 7 ? Math.max(11, Math.floor(118 / nm.length)) : 17;
    return h('button', { type: 'button', class: 'ic-fd' + (r.s === v ? ' me' : '') + (fresh ? ' drop' : ''), style: `animation-delay:${i * .16}s`, 'aria-label': `${no}位 ${nm} ${yen(r.pts)} ${tt[r.s]}`, onclick: () => icPeek(b, r.s) },
      h('span', { class: 'r' }, String(no)), h('span', { class: 'n', style: `font-size:${fs}px` }, nm), h('span', { class: 'y' }, yen(r.pts)), h('span', { class: 'g' }, tt[r.s]));
  });
  const top = rk[0], win = top.s === v && !local ? 'あなたの店' : `${bdName(top.id)}の店`;
  const host = local || doc.host === me;
  return h('div', { class: 'ic-res' }, h('div', { class: 'ic-bz' }, h('b', null, '本日の番付'), h('span', null, `${win}が 本日の一番店（札をタップで料理）`)), h('div', { class: 'ic-fds' }, fuda),
    host ? h('div', { class: 'ic-btns' }, h('button', { class: 'ic-go wh', onclick: backToHub }, 'ゲーム選択へ'), h('button', { class: 'ic-go', onclick: rematch }, 'もう一度')) : h('div', { class: 'ic-wait' }, '部屋主が次のゲームを選んでいます'),
    h('button', { class: 'ic-skip', onclick: () => { BS.peek = true; bdRender(); } }, '冷蔵庫を見る'));
}
// 「待たずに進める」を出す
setInterval(() => {
  if (!isIchoDoc() || doc.status !== 'playing' || !BS.root || !BS.root.isConnected) return;
  const f = $('icForce'); if (f && Date.now() - IC.at >= 40000) f.hidden = false;
}, 1000);
function ichSlides() {
  const im = k => icImg(k, 'ic-sla');
  // ホームの遊びかた（ゲーム中の「？」は画面の上で教える icCoach）
  const ar = () => h('span', { class: 'sla-arr' }, '→'), N = n => ICH.ING.findIndex(x => x.n === n);
  return [
    { t: '町中華を ひらこう', s: '材料を3つ そろえると 料理ができる', art: () => h('div', { class: 'sla-row' }, im('rice'), im('egg'), im('negi'), ar(), im('chahan')) },
    { t: '市場から 2つ えらぶ', s: 'みんな こっそり。山（ふせた材料）からでもいい', art: () => h('div', { class: 'sla-row' }, im('negi'), im('crab'), im('noodle')) },
    { t: 'せーので 見せる', s: 'かぶったら 順番が先の人。もう1人は 山から1つ', art: () => h('div', { class: 'sla-row' }, im('egg'), h('span', { class: 'sla-arr' }, 'かぶった！')) },
    { t: '冷蔵庫は 12マス', s: '大きい材料は 場所をとる。入らなければ 市場へ出す', art: () => h('div', { class: 'ic-sla-fr' }, icFridge(['ライス', '卵', '豚肉', 'しいたけ', 'にんじん'].map(N)).el) },
    { t: '3つそろうと 自動で料理', s: '万能スープは どの材料にもなる（最後に使う）', art: () => h('div', { class: 'sla-row' }, im('pork'), im('pepper'), im('banno'), ar(), im('hoikoro')) },
    { t: '料理ごとに 2〜4点', s: '作りにくい料理ほど 高い。右上の「レシピ」で 見られる', art: () => h('div', { class: 'sla-row' }, ...[['gyoza', 2], ['chahan', 3], ['kanitama', 4]].map(([k, p]) => h('div', { class: 'ic-sla-p' }, im(k), h('b', null, p + '点')))) },
    { t: `${ICH.TURNS}ターンで 閉店`, s: '点が多い人の勝ち。同じなら 料理の数', art: () => h('div', { class: 'sla-row' }, im('ramen'), im('shumai'), im('mabo')) },
  ];
}
function ichTicketArt(art) {
  art.classList.add('tk-css'); art.style.position = 'relative'; art.style.background = 'radial-gradient(circle at 50% 60%,#fff3dc,#f6c98a)';
  if (IC.art) art.append(h('img', { class: 'tka-ic', src: IC.art.ramen, alt: '' }));
  else ichLoad().then(() => { if (art.isConnected) art.append(h('img', { class: 'tka-ic', src: IC.art.ramen, alt: '' })); }, () => { });
}
