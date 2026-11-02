/* =================== TRAPPER UI =================== */
const TS = { B: null, root: null, seen: 0, sel: [], card: null, cardCell: null, pending: false, lastLocal: null, overAt: 0 };
const SEAT_COL = ['#4a4d55', '#e85a4a', '#3f7fe0', '#e8b42a'];
const TRAP_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="41" rx="14" ry="3" fill="rgba(0,0,0,.12)"/><circle cx="24" cy="25" r="14" fill="#4a86e0"/><ellipse cx="24" cy="29" rx="9" ry="8" fill="#fbf1dd"/><circle cx="19" cy="22" r="2.2" fill="#151515"/><circle cx="29" cy="22" r="2.2" fill="#151515"/><path d="M21 26l3 4 3-4z" fill="#f3a43a"/><circle cx="15" cy="27" r="2" fill="#ff9a9a"/><circle cx="33" cy="27" r="2" fill="#ff9a9a"/><path d="M22 11c0-4 3-5 3-5s-1 3 1 5z" fill="#4a86e0"/></svg>';
const isTrapDoc = () => !!doc && doc.game === 'trapper' && !!doc.t;
const trCellDesc = (t, c) => c === 0 ? '巣' : t.traps.some(x => x.c === c) ? '罠がある！' : t.food[c] ? 'エサ ＋1' : 'なにもない';
function trName(id) {
  if (trIsNpc(id)) return 'コンピュータ';
  if (local) return 'プレイヤー' + String(id).replace(/\D/g, '');
  const nk = doc && doc.nicks && doc.nicks[id]; if (nk) return nk;
  if (id === me) return myNick || 'あなた';
  return names[id] || 'ゲスト';
}
const trRole = s => s === 0 ? '罠士' : '鳥・' + TR.BIRD_NAMES[s - 1];
function trViewSeat() {
  const t = doc.t; if (!local) return t.seats.indexOf(me);
  const cur = t.seats[t.turn]; if (doc.status === 'playing' && !trIsNpc(cur)) { TS.lastLocal = t.turn; return t.turn; }
  return TS.lastLocal ?? t.seats.findIndex(x => !trIsNpc(x));
}
const trMyTurn = () => { if (!isTrapDoc() || doc.status !== 'playing') return false; const t = doc.t, id = t.seats[t.turn]; if (trIsNpc(id)) return false; return local ? true : id === me; };
const trReset = () => { TS.sel = []; TS.card = null; TS.cardCell = null; };
function trSend(acts) {
  if (TS.pending || (TS.B && TS.B.busy)) return;
  const t = doc.t, seq0 = t.seq, who = local ? t.seats[t.turn] : me;
  try { let g = doc; acts.forEach(a => g = trAct(g, who, a)); if (local) { doc = g; trReset(); afterChange(); return; } }
  catch (e) { toast(e.message); return; }
  TS.pending = true; trRender();
  withLease(d => { if (!d || d.status !== 'playing' || d.game !== 'trapper' || d.t.seq !== seq0) return null; let g = d; for (const a of acts) g = trAct(g, me, a); return g; })
    .then(() => { TS.pending = false; trReset(); if (TS.root && TS.root.isConnected) trRender(); });
}
// iPhone で2本指の操作が盤の外にかかると、ページごと拡大されて操作がおかしくなるので止める
for (const k of ['gesturestart', 'gesturechange']) document.addEventListener(k, e => { if (document.body.classList.contains('trap')) e.preventDefault(); }, { passive: false });
// NPC（とずっと動かない人）の番を進める。オンラインでは部屋主側の端末だけが進める
function trDelay(t) { const l = t.last; if (!l) return 1200; if (l.kind === 'move') return 700 + l.path.length * 230 + (l.caught ? 1500 : 300); if (l.kind === 'place') return 900 + l.cells.length * 110; if (l.kind === 'roll') return 1300; return 900; }
setInterval(() => {
  if (!isTrapDoc() || doc.status !== 'playing' || TS.pending || (TS.B && TS.B.busy) || !TS.root || !TS.root.isConnected) return;
  const t = doc.t, id = t.seats[t.turn], idle = Date.now() - t.at, npc = trIsNpc(id);
  // 「スタート！」と役のお知らせのあいだはコンピュータを動かさない。消えてから3秒待つ（`TS.holdUntil`）
  if (npc && (Date.now() < (TS.holdUntil || 0) || document.querySelector('.tp-spot'))) return;
  // 盤を読みこんでいるあいだも待つ（先に動くと、始まりの動きがとばされる）。読みこめないときのために最大15秒
  if (npc && t.seq === 0 && !TS.B && idle < 15000) return;
  if (local) { if (!npc || idle < trDelay(t)) return; try { doc = trAct(doc, '*', trNpc(doc)); afterChange(); } catch (e) { console.warn(e); } return; }
  if (!isPlayer() || doc.players[0] !== me) return;
  if (!(npc && idle > trDelay(t)) && !(!npc && idle > 90000)) return;
  const seq0 = t.seq; TS.pending = true;
  withLease(d => d && d.status === 'playing' && d.game === 'trapper' && d.t.seq === seq0 ? trAct(d, '*', trNpc(d)) : null, true).then(() => { TS.pending = false; });
}, 400);

// 遊びかた：絵とひとことの6枚（細かいルールは書かない。カードの中身はカードに書いてある）。案は tools/rules-mockup.html の5
function trOpenRules(foot) {
  const show = () => {
    const A = TB.ready() ? TB.ruleArts() : {}, C = TB.ready() ? TB.arts() : {};
    const img = k => () => A[k] ? h('img', { src: A[k], alt: '' }) : null;
    openSlides('チュンチュン大作戦', [
      { t: '罠士1人 VS 鳥3羽', s: '役はランダムで決まるよ', art: img('roles') },
      { t: '罠士は 罠をおく', s: 'サイコロの目の数だけ', art: img('place') },
      { t: '鳥は サイコロで すすむ', s: '止まったマスだけが大事', art: img('move') },
      { t: `エサを${TR.GOAL}こ とったら 鳥の勝ち`, s: '3羽みんなで集めよう', art: img('food') },
      { t: `${TR.CAPS}回つかまえたら 罠士の勝ち`, s: 'つかまった鳥は巣にもどる', art: img('caught') },
      { t: 'カードで 作戦', s: '1回の番に1枚まで', art: () => C.flap ? h('div', { class: 'sl-fan' }, ['flap', 'dash', 'quality'].map((k, i) => h('img', { src: C[k], alt: '', style: `transform:rotate(${(i - 1) * 14}deg) translate(${(i - 1) * 58}%, ${Math.abs(i - 1) * 6}%)` }))) : null },
    ], foot);
  };
  if (TB.ready()) show(); else TB.load().then(show, show);
}
function trCardEl(k, x, rot, opts) {
  const isB = TR.BIRD_CARDS.includes(k), arts = TB.ready() ? TB.arts() : {};
  return h('button', { class: 'tp-card' + (opts.sel ? ' sel' : '') + (opts.off ? ' off' : ''), style: `left:${x}px;transform:rotate(${rot}deg);--cc:${isB ? '#3f7fe0' : '#4a4d55'};--ab:${isB ? '#e6f0ff' : '#ece8e0'}`, 'aria-pressed': String(!!opts.sel), 'aria-label': `${TR.CARD[k].n}：${TR.CARD[k].d}`, onclick: opts.onclick },
    h('div', { class: 'in' }, h('div', { class: 'nm' }, TR.CARD[k].n, h('i', null, isB ? '鳥' : '罠')),
      h('div', { class: 'art' }, arts[k] ? h('img', { src: arts[k], alt: '' }) : null), h('div', { class: 'ds' }, TR.CARD[k].d)));
}
function trCardUsable(t, k) {
  if (t.used) return '1回の番にカードは1枚までです';
  if (t.phase === 'trap') return t.step === 'pre' ? (k === 'poison' && !Object.values(t.food).some(f => !f.poison) ? '毒をしこめるエサがありません' : '') : 'カードはサイコロをふる前に使います';
  if (k === 'flap') return t.step === 'post' ? '' : '羽ばたきはサイコロをふった後に使えます';
  if (t.step !== 'pre') return 'このカードはサイコロをふる前に使います';
  if (k === 'call') { const s = t.turn; if (t.pos[s] === 0) return '巣にいるときは使えません'; if (![1, 2, 3].some(b => b !== s && t.pos[b] !== t.pos[s])) return 'よべる鳥がいません'; }
  return '';
}
function trBoardView() {
  const t = doc.t, vs = trViewSeat(), v = { trapper: vs === 0, flags: [], ghosts: [], rings: [] };
  if (!trMyTurn() || TS.pending) return v;
  const s = t.turn, col = SEAT_COL[s], dest = k => (t.pos[s] + k) % TR.CELLS;
  if (t.phase === 'trap' && t.step === 'place') { v.ghosts = TS.sel.slice(); v.flags = TS.sel.map(c => [c, '#f2b92a']); }
  if (t.phase === 'trap' && t.step === 'pre' && TS.card === 'poison') Object.keys(t.food).filter(c => !t.food[c].poison).forEach(c => v.rings.push([+c, +c === TS.cardCell ? '#f2b92a' : '#a86ad8']));
  if (t.phase === 'trap' && t.step === 'pre' && TS.card === 'pit' && TS.cardCell != null) v.flags.push([TS.cardCell, '#8a5a2a']);
  if (t.phase === 'bird' && t.step === 'post') { const n = t.roll.n; v.flags.push([dest(n), col]); if (TS.card === 'flap') { if (n > 1) v.rings.push([dest(n - 1), col]); v.rings.push([dest(n + 1), col]); } }
  if (t.phase === 'bird' && t.step === 'pre' && TS.card === 'wait') [1, 2].forEach(k => v.rings.push([dest(trWaitSteps(t, s, k)), col]));
  return v;
}
function trPop(c, text, cls, dy) {
  if (!TS.B || !TS.boardEl) return; const p = TS.B.screenOf(c, dy ?? .9);
  const el = h('div', { class: 'tp-pop ' + (cls || ''), style: `left:${p.x}px;top:${p.y}px` }, h('span', null, text)); TS.boardEl.append(el); setTimeout(() => el.remove(), 1700);
}
function trStartTitle() {
  if (!TS.boardEl) return;
  const el = h('div', { class: 'tp-start', 'aria-hidden': 'true' }, h('div', { class: 'felt' }, h('div', { class: 'st' }, 'チュンチュン大作戦')), h('b', null, 'スタート！'));
  TS.boardEl.append(el); setTimeout(() => el.remove(), 1900);
  TS.titleUntil = Date.now() + 1900; TS.holdUntil = TS.titleUntil + 3000;
}
// 役のお知らせ（スポットライト）：まわりを暗くして、自分の席（鳥なら巣にいる自分のコマも）を照らす。案は tools/role-mockup.html の5
// オンラインは最初に1回。1台で遊ぶときは、それぞれの人が最初に画面を見る番に1回ずつ。タップか約3.6秒で消える
function trMaybeRole() {
  if (!isTrapDoc() || !TS.B || TS.B.busy || TS.pending || document.querySelector('.tp-spot')) return;
  const t = doc.t;
  if (t.seq === 0 && TS.roleAt !== t.at) { TS.roleAt = t.at; TS.roleSeen = new Set(); }
  if (!TS.roleSeen) TS.roleSeen = new Set();
  const vs = trViewSeat(); if (vs < 0 || trIsNpc(t.seats[vs]) || TS.roleSeen.has(vs)) return;
  // 始まりの動き →「スタート！」の札が消えてから
  if (t.seq === 0 && TS.introAt !== t.at && !matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wait = (TS.titleUntil || 0) - Date.now(); if (wait > 0) { clearTimeout(TS.roleTimer); TS.roleTimer = setTimeout(() => TS.root && TS.root.isConnected && trMaybeRole(), wait + 50); return; }
  TS.roleSeen.add(vs); trShowRole(vs);
}
function trShowRole(vs) {
  const seat = TS.seats && TS.seats.children[vs]; if (!seat) return;
  const W = innerWidth, H = innerHeight, sr = seat.getBoundingClientRect(), spots = [[sr.left + sr.width / 2, sr.top + sr.height / 2, Math.max(sr.width, sr.height) / 2 + 8]];
  if (vs > 0) { const p = TS.B.birdScreen(vs - 1); spots.push([p.x, p.y, 36]); }
  const id = 'tpspot' + Date.now(), col = SEAT_COL[vs];
  const svg = `<svg width="${W}" height="${H}" aria-hidden="true"><defs><mask id="${id}"><rect width="${W}" height="${H}" fill="#fff"/>${spots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#000"/>`).join('')}</mask></defs><rect width="${W}" height="${H}" fill="rgba(20,16,10,.62)" mask="url(#${id})"/></svg>`;
  const tipW = Math.min(300, W - 24), tipL = Math.max(12, Math.min(W - tipW - 12, sr.left + sr.width / 2 - 40)), ax = sr.left + sr.width / 2 - tipL - 9;
  const goal = vs === 0 ? `罠をしかけて、鳥を${TR.CAPS}回 つかまえよう` : `なかまの鳥と、エサを${TR.GOAL}こ 集めよう`;
  const who = local ? `${trName(doc.t.seats[vs])}は` : 'これが あなた';
  const el = h('div', { class: 'tp-spot', role: 'dialog', 'aria-label': `${who} ${trRole(vs)}。${goal}`, style: `--rc:${col}` },
    h('div', { class: 'dim', svg }),
    ...spots.map(([x, y, r]) => h('i', { class: 'ring', style: `left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px` })),
    h('div', { class: 'felt tip', style: `left:${tipL}px;top:${sr.bottom + 16}px;width:${tipW}px;--ax:${ax}px` },
      h('div', { class: 'st' }, h('small', null, who), h('b', null, trRole(vs)), h('span', null, goal))));
  const close = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 260); TS.holdUntil = Date.now() + 3000; };
  el.addEventListener('pointerdown', e => { e.preventDefault(); close(); });
  document.body.append(el); setTimeout(close, 3600);
}
function trBanner(text) { if (!TS.boardEl) return; const el = h('div', { class: 'tp-banner felt' }, h('div', { class: 'st' }, text)); TS.boardEl.append(el); setTimeout(() => el.remove(), 2500); }
function trEventFx(ev, t) {
  const who = trRole(ev.seat), vs = trViewSeat();
  if (ev.kind === 'card') {
    if (ev.k === 'poison') trBanner(vs === 0 ? `${TR.CARD.poison.n}：${ev.cell}マス目のエサに毒をしこんだ` : '罠士がどこかのエサに毒をしこんだ…');
    else if (ev.k === 'pit') trBanner(vs === 0 ? `${TR.CARD.pit.n}：${ev.cell}マス目にほった` : '罠士がどこかに落とし穴をほった…');
    else if (ev.k === 'call') trBanner(`${who}が${TR.BIRD_NAMES[ev.target - 1]}をよんだ！`);
    else if (ev.k === 'tailwind') trBanner(`追い風！ ${TR.BIRD_NAMES[ev.target - 1]}の出目が＋${TR.BOOST}`);
    else if (ev.k === 'wind') trBanner(`強風！ このラウンドは鳥みんなの出目が−1`);
    else trBanner(`${who}が「${TR.CARD[ev.k].n}」を使った`);
  }
  if (ev.kind === 'roll' && TS.dieEl) { TS.dieEl.classList.remove('spin'); void TS.dieEl.offsetWidth; TS.dieEl.classList.add('spin'); if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { } }
}
function trAfterMove(ev) {
  if (ev.kind === 'move') {
    if (ev.broke && ev.broke.length) trBanner(`体当たりで罠を${ev.broke.length}こ こわした！`);
    const drew = ev.drew ? (ev.caught ? '　罠士がカードを1枚ひいた' : '　鳥みんながカードを1枚ひいた') : '';
    if (ev.caught) { trPop(0, 'つかまった！', 'bad', 1.1); trBanner((ev.pit ? `${trRole(ev.seat)}が落とし穴に落ちた！` : `${trRole(ev.seat)}がつかまった！`) + drew); if (navigator.vibrate) try { navigator.vibrate([40, 40, 80]); } catch (e) { } }
    else if (ev.food) { trPop(ev.to, ev.poison ? `＋${ev.food}　でも毒！` : `＋${ev.food}`, ev.poison ? 'poison' : 'good'); if (ev.grabbed || drew) trBanner((ev.grabbed ? 'よこどりで となりのエサも！' : 'エサをゲット！') + drew); }
  }
  if (ev.kind === 'place') trBanner(ev.cells.length ? `罠を${ev.cells.length}こ おいた` : '罠をおかなかった');
}
function viewTrapShell() {
  const t = doc.t, th = TB.THEMES()[t.theme] || TB.THEMES().flower;
  TS.boardEl = h('div', { class: 'tp-board' }, h('div', { class: 'tp-load' }, '盤をならべています…'));
  TS.dieEl = h('div', { class: 'tp-die', 'aria-live': 'polite' });
  TS.boardEl.append(TS.dieEl);
  TS.head = h('div', { class: 'tp-head' }); TS.seats = h('div', { class: 'tp-seats' }); TS.tags = h('div', { class: 'tp-tags' });
  TS.info = h('div', { class: 'tp-info' }); TS.hand = h('div', { class: 'tp-hand' }); TS.act = h('div', { class: 'tp-act' });
  TS.root = h('div', { class: 'tp', style: `--sky1:${th.sky[0]};--sky2:${th.sky[1]};--sky3:${th.sky[2]};--fg:${th.fg};--sub:${th.sub}` }, TS.head, TS.seats, TS.tags, TS.boardEl, TS.info, TS.hand, TS.act);
  TS.seen = t.seq; trReset();
  const theme = t.theme, root = TS.root;
  TB.load().then(() => {
    if (!root.isConnected || TS.root !== root) return;
    TS.boardEl.querySelector('.tp-load')?.remove();
    try { TS.B = TB.board(TS.boardEl, theme); } catch (e) { TS.boardEl.prepend(h('div', { class: 'tp-load' }, '3Dを表示できませんでした')); return; }
    TS.boardEl.insertBefore(TS.B.el, TS.dieEl);
    TS.B.onTap = (x, y) => trTap(TS.B.pick(x, y));
    TS.B.sync(doc.t, trBoardView());
    // ゲームの最初の1回だけ、始まりの動き（画面をタップでとばせる）→「スタート！」の札
    const t0 = doc.t;
    // （始まってすぐ画面が描き直されて盤が作り直されることがあるので、「見おわった」で覚える）
    if (t0.seq === 0 && TS.introAt !== t0.at) {
      const B = TS.B, seen = () => { TS.introAt = t0.at; trStartTitle(); };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) seen();
      else B.intro(() => { if (TS.B !== B) return; seen(); if (TS.root === root && root.isConnected) trRender(); });
    }
    trRender();
  }).catch(e => { const l = TS.boardEl.querySelector('.tp-load'); if (l) l.textContent = '3Dを読みこめませんでした。電波を確かめてページを開き直してください'; });
  return TS.root;
}
function trTap(c) {
  if (c == null || !isTrapDoc()) return;
  const t = doc.t;
  if (trMyTurn() && !TS.pending && !(TS.B && TS.B.busy)) {
    if (t.phase === 'trap' && t.step === 'place') {
      const i = TS.sel.indexOf(c);
      if (i >= 0) TS.sel.splice(i, 1);
      else if (c === 0) { toast('巣には罠をおけません'); return; }
      else if (t.food[c]) { toast('エサのマスには罠をおけません'); return; }
      else if (t.traps.some(x => x.c === c)) { toast('そこにはもう罠があります'); return; }
      else if (TS.sel.length >= t.roll.n) { toast(`罠は${t.roll.n}こまでです`); return; }
      else TS.sel.push(c);
      trRender(); return;
    }
    if (t.phase === 'trap' && t.step === 'pre' && TS.card === 'poison') {
      if (t.food[c] && !t.food[c].poison) { TS.cardCell = c; trRender(); } else toast('エサのあるマスをタップしてね'); return;
    }
    if (t.phase === 'trap' && t.step === 'pre' && TS.card === 'pit') {
      if (c === 0) toast('巣には ほれません'); else if (t.food[c]) toast('エサのマスには ほれません'); else if ((t.pits || []).includes(c)) toast('そこにはもう落とし穴があります'); else { TS.cardCell = c; trRender(); } return;
    }
  }
  const f = t.food[c], vs = trViewSeat();
  toast(`${c === 0 ? '巣' : c + 'マス目'}：${trCellDesc(t, c)}${f && f.poison && vs === 0 ? '（毒）' : ''}${vs === 0 && (t.pits || []).includes(c) ? '（落とし穴）' : ''}`);
}
function trRender() {
  if (!TS.root || !TS.root.isConnected) { render(); return; }
  const g = doc, t = g.t, vs = trViewSeat(), mine = trMyTurn(), s = t.turn, over = g.status !== 'playing';
  const th = TB.THEMES()[t.theme] || {};
  // 見出し
  const back = local ? () => { doc = null; tableId = null; render(); } : leaveTable;
  const meLab = vs >= 0 ? (local ? trName(t.seats[vs]) : 'あなた') : '観戦中';
  TS.head.replaceChildren(
    h('div', { class: 'tp-ttl' }, h('small', null, `${th.name || ''}　ラウンド ${t.round} / ${TR.ROUNDS}`), h('b', { role: 'heading', 'aria-level': '1', class: vs >= 0 ? null : 'long' }, vs >= 0 ? trRole(vs) : 'チュンチュン大作戦', h('span', null, vs >= 0 ? `（${meLab}）` : '観戦中'))),
    h('button', { class: 'tp-ib', 'aria-label': '遊びかた', onclick: () => trOpenRules() }, h('i', null, '?')),
    over ? h('button', { class: 'tp-ib', 'aria-label': '卓から出る', onclick: back }, h('i', { svg: ICON.back }))
      : h('button', { class: 'tp-ib quit', 'aria-label': '中断してホームにもどる', onclick: confirmQuit }, h('i', null, '中断')));
  TS.seats.replaceChildren(...t.seats.map((id, k) => h('div', { class: 'tp-seat' + (k === s && !over ? ' now' : '') + (k === vs ? ' me' : ''), style: `--c:${SEAT_COL[k]}` },
    h('div', null, h('span', { class: 'r' }, h('i', { style: `background:${SEAT_COL[k]}` }), k === 0 ? '罠士' : TR.BIRD_NAMES[k - 1], k > 0 && t.poison[k] > 0 ? '・毒' : ''), h('span', { class: 'n' }, trName(id))))));
  const tag = (txt, b, hot) => h('span', { class: 'felt tp-tag' + (hot ? ' hot' : '') }, h('span', { class: 'st', style: 'display:block' }, txt, ' ', h('b', null, b)));
  TS.tags.replaceChildren(...[tag('エサ', `${t.score}/${TR.GOAL}`), tag('つかまった', `${t.caps}/${TR.CAPS}`, t.caps >= TR.CAPS - 1), vs > 0 && t.poison[vs] > 0 ? tag('毒', `あと${t.poison[vs]}回`, true) : null,
    t.wind ? tag('強風', '−1', true) : null, t.boost ? tag('追い風', TR.BIRD_NAMES[t.boost.s - 1]) : null].filter(Boolean));
  // 盤（新しいできごとは演出してから反映）
  const ev = t.last && t.last.seq > TS.seen ? t.last : null; TS.seen = Math.max(TS.seen, t.seq);
  if (TS.B) {
    const view = trBoardView();
    if (ev && (ev.kind === 'move' || ev.kind === 'place')) TS.B.play(ev, t, view, () => { trAfterMove(ev); if (TS.root && TS.root.isConnected) trRender(); });
    else TS.B.sync(t, view);
  }
  if (ev) trEventFx(ev, t);
  if (!over) trMaybeRole();
  TS.dieEl.replaceChildren(...(t.roll ? t.roll.d.map(d => h('span', null, String(d))) : []));
  TS.dieEl.setAttribute('aria-label', t.roll ? `サイコロ ${t.roll.d.join('と')}` : '');
  // 終わったら、最後の演出を見せてから結果へ
  if (over) {
    TS.hand.replaceChildren(); TS.hand.className = 'tp-hand empty';
    TS.info.replaceChildren(h('div', { class: 'felt' }, h('div', { class: 'st' }, h('b', null, t.result.win === 'birds' ? '鳥チームの勝ち！' : '罠士の勝ち！'))));
    TS.act.replaceChildren(h('button', { class: 'tp-btn', onclick: () => { TS.root = null; render(); } }, '結果を見る'));
    if (!TS.overAt) { TS.overAt = Date.now(); setTimeout(() => { if (TS.root && TS.root.isConnected && doc && doc.status === 'over') { TS.root = null; render(); } }, 4200); }
    return;
  }
  TS.overAt = 0;
  // 手札
  const hand = vs >= 0 ? t.hands[vs] : [];
  TS.hand.className = 'tp-hand' + (hand.length ? '' : ' empty');
  if (!hand.length) TS.hand.replaceChildren(h('div', { class: 'none' }, vs >= 0 ? 'カードがありません' : ''));
  else {
    // 5枚でも画面に収まるよう、枚数が多いほど重ねて、傾きも小さくする
    const W = TS.hand.clientWidth || 390, n = hand.length, cw = W < 360 ? 100 : 112, step = Math.min(cw + 6, (W - 48 - cw) / Math.max(1, n - 1)), x0 = (W - (cw + step * (n - 1))) / 2, tilt = n > 1 ? Math.min(8, 16 / (n - 1)) : 0;
    TS.hand.replaceChildren(...hand.map((k, i) => {
      const why = mine ? trCardUsable(t, k) : 'あなたの番ではありません', sel = mine && TS.card === k && TS.cardIdx === i;
      return trCardEl(k, x0 + step * i, (i - (n - 1) / 2) * tilt, { sel, off: !!why || TS.pending, onclick: () => {
        if (why) { toast(why); return; }
        if (sel) { TS.card = null; TS.cardIdx = null; } else { TS.card = k; TS.cardIdx = i; } TS.cardCell = null; trRender();
      } });
    }));
  }
  // 説明と操作
  const info = (num, ...txt) => TS.info.replaceChildren(h('div', { class: 'felt' }, h('div', { class: 'st' }, num != null ? h('span', { class: 'num' }, String(num)) : null, h('span', null, ...txt))));
  const btn = (label, fn, o = {}) => h('button', { class: 'tp-btn' + (o.soft ? ' soft' : ''), style: o.col ? `--btn:${o.col}` : null, disabled: o.dis || TS.pending || (TS.B && TS.B.busy), onclick: fn }, label, o.sm ? h('small', null, o.sm) : null);
  const col = SEAT_COL[s];
  if (!mine) {
    const id = t.seats[s];
    info(null, h('b', null, trRole(s)), `（${trName(id)}）の番`, trIsNpc(id) ? '　考え中…' : t.phase === 'trap' && t.step === 'place' ? '　罠をおいています' : '');
    TS.act.replaceChildren(h('div', { class: 'tp-wait' }, vs < 0 ? '観戦中です' : TS.pending ? '送っています…' : trIsNpc(id) ? 'コンピュータが動きます' : local ? 'つぎの人にスマホをわたしてね' : 'まっています（90秒動きがないと自動で進みます）'));
    return;
  }
  if (t.phase === 'trap' && t.step === 'pre') {
    const c = TS.card;
    if (c === 'poison') info(null, TS.cardCell != null ? h('b', null, `${TS.cardCell}マス目のエサに毒`) : '毒をしこむエサのマスをタップ', '（鳥には見えません）');
    else if (c === 'pit') info(null, TS.cardCell != null ? h('b', null, `${TS.cardCell}マス目に落とし穴`) : '落とし穴をほるマスをタップ', '（鳥には見えません）');
    else if (c) info(null, h('b', null, TR.CARD[c].n), '：', TR.CARD[c].d);
    else info(null, 'サイコロの目の数だけ ', h('b', null, '罠をおけます'), '。前の罠はかたづきます');
    TS.act.replaceChildren(btn(c ? `${TR.CARD[c].n}を使ってふる` : 'サイコロをふる', () => trSend(c ? [{ t: 'card', k: c, cell: TS.cardCell }, { t: 'roll' }] : [{ t: 'roll' }]), { col: '#4a4d55', dis: (c === 'poison' || c === 'pit') && TS.cardCell == null }));
    return;
  }
  if (t.phase === 'trap' && t.step === 'place') {
    const n = t.roll.n, k = TS.sel.length;
    info(n, `罠を${n}こまで おけます。`, h('b', null, k < n ? `あと${n - k}こ` : 'ぜんぶえらんだ'), '　マスをタップ');
    TS.act.replaceChildren(...(k ? [btn('えらびなおす', () => { TS.sel = []; trRender(); }, { soft: true })] : []), btn(`罠をおく（${k}/${n}）`, () => trSend([{ t: 'place', cells: TS.sel.slice() }]), { col: '#4a4d55', dis: !k }));
    if (k) TS.act.firstChild.style.flex = '.55';
    return;
  }
  if (t.phase === 'bird' && t.step === 'pre') {
    const c = TS.card, p = t.pos[s], d = k => (p + trWaitSteps(t, s, k)) % TR.CELLS;
    if (c === 'wait') { info(null, h('b', null, '様子見'), '：サイコロをふらずに 1か2 すすむ', trBoost(t, s) ? `（追い風で＋${trBoost(t, s)}）` : ''); TS.act.replaceChildren(...[1, 2].map(k => btn(`${trWaitSteps(t, s, k)}マスすすむ`, () => trSend([{ t: 'wait', n: k }]), { col, sm: `${d(k)}マス目：${trCellDesc(t, d(k))}` }))); return; }
    if (c === 'call') {
      info(null, h('b', null, '仲間よび'), '：よぶ鳥をえらんで、そのままサイコロをふる');
      TS.act.replaceChildren(...[1, 2, 3].filter(b => b !== s && t.pos[b] !== p).map(b => btn(`${TR.BIRD_NAMES[b - 1]}をよぶ`, () => trSend([{ t: 'card', k: 'call', target: b }, { t: 'roll' }]), { col: SEAT_COL[b], sm: t.pos[b] === 0 ? '巣から' : `${t.pos[b]}マス目から` })));
      return;
    }
    const mods = [t.poison[s] > 0 ? `毒で−1・あと${t.poison[s]}回` : '', t.wind ? '強風で−1' : '', trBoost(t, s) ? `追い風で＋${trBoost(t, s)}` : ''].filter(Boolean);
    if (c) info(null, h('b', null, TR.CARD[c].n), '：', TR.CARD[c].d);
    else info(null, 'サイコロをふって すすもう', mods.length ? h('b', null, `（${mods.join('・')}）`) : '');
    TS.act.replaceChildren(btn(c ? `${TR.CARD[c].n}でふる` : 'サイコロをふる', () => trSend(c ? [{ t: 'card', k: c }, { t: 'roll' }] : [{ t: 'roll' }]), { col }));
    return;
  }
  if (t.phase === 'bird' && t.step === 'post') {
    const n = t.roll.n, p = t.pos[s], d = k => (p + k) % TR.CELLS;
    if (TS.card === 'flap') {
      info(n, h('b', null, '羽ばたき'), '：1つふやすか へらすか えらんでね');
      TS.act.replaceChildren(...[-1, 1].filter(a => n + a >= 1).map(a => btn(`${a > 0 ? '＋1' : '−1'}（${d(n + a)}マス目）`, () => trSend([{ t: 'move', adj: a }]), { col, sm: trCellDesc(t, d(n + a)) })));
      return;
    }
    info(n, `${d(n)}マス目：`, h('b', null, trCellDesc(t, d(n))), t.roll.d.length > 1 ? `（${t.roll.d.join('＋')}）` : '');
    TS.act.replaceChildren(btn(`${d(n)}マス目へすすむ`, () => trSend([{ t: 'move', adj: 0 }]), { col }));
  }
}
function viewTrapOver() {
  const g = doc, t = g.t, th = TB.THEMES()[t.theme] || TB.THEMES().flower, win = t.result.win;
  const why = { goal: `エサが${t.score}こ たまった！`, caps: `鳥を${t.caps}回つかまえた！`, rounds: `${TR.ROUNDS}ラウンド守りきった！` }[t.result.why];
  const art = TB.ready() ? TB.arts()[win === 'birds' ? 'flap' : 'quality'] : null;
  const rows = t.seats.map((id, k) => h('div', { class: 'tp-row' }, h('i', { style: `background:${SEAT_COL[k]}` }), h('div', { class: 'w' }, h('b', null, trName(id)), h('span', null, trRole(k))),
    h('div', { class: 'v' }, k === 0 ? `つかまえた ${t.caps}回` : `エサ ${t.stats.eaten[k]}こ・つかまった ${t.stats.caught[k]}回`)));
  const btns = local || g.host === me
    ? h('div', { class: 'tp-endbtns' }, h('button', { class: 'tp-btn soft', onclick: backToHub }, 'ゲーム選択へ'), h('button', { class: 'tp-btn', onclick: rematch }, 'もう一度'))
    : h('div', { class: 'felt' }, h('div', { class: 'st', style: 'padding:10px;text-align:center;font-weight:700;font-size:13px' }, '部屋主が次のゲームを選んでいます'));
  return h('div', { class: 'tp tp-over', style: `--sky1:${th.sky[0]};--sky2:${th.sky[1]};--sky3:${th.sky[2]};--fg:${th.fg};--sub:${th.sub}` },
    h('div', { class: 'tp-head', style: 'padding:0' }, h('div', { class: 'tp-ttl' }, h('small', null, `${th.name}　ラウンド ${t.round}`), h('b', { class: 'long' }, 'チュンチュン大作戦'))),
    h('div', { class: 'hero' }, art ? h('img', { src: art, alt: '' }) : null, h('small', null, 'けっか'), h('b', { role: 'heading', 'aria-level': '1' }, win === 'birds' ? '鳥チームの勝ち！' : '罠士の勝ち！'), h('span', null, why)),
    h('div', { class: 'felt tp-res' }, h('div', { class: 'st' }, rows)), btns);
}
