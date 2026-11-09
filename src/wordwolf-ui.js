/* =================== ワードウルフの画面 =================== */
// ひつじとオオカミは縫いぐるみの絵（WW_ART。tools/wordwolf-rag-mockup.html の案3を画像で持つ）
const WS = { art: null, ready: null, key: '', at: 0, talkKey: '', talkAt: 0, sent: false, open: -1, pick: -1, cover: -1, peek: false };
const isWordDoc = () => !!doc && doc.game === 'wordwolf' && !!doc.b;
function wwLoad() { WS.art = WW_ART; return Promise.resolve(); }
const wwImg = (k, cls) => WS.art ? h('img', { class: cls || null, src: WS.art[k], alt: '', draggable: 'false' }) : null;
const wwHost = () => local || doc.host === me;
const wwTop = (a, b) => h('div', { class: 'ww-top' }, h('span', null, a), h('span', null, b || ''));
const wwSign = (t, small) => h('div', { class: 'ww-sign' + (small ? ' s' : t.length > 6 ? ' m' : '') }, t);
function wwSend(a, who) {
  if (WS.sent) return; WS.sent = true; bdRender();
  if (local) { try { doc = WW.act(doc, who, a); } catch (e) { toast(e.message); } WS.sent = false; afterChange(); return; }
  withLease(d => { if (!d || d.status !== 'playing' || !d.b) return null; try { return WW.act(d, me, a); } catch (e) { return null; } }).then(r => { if (r !== 'ok') { WS.sent = false; if (isWordDoc()) bdRender(); } });
}
const wwBtn = (t, fn, cls) => h('button', { class: 'ww-btn' + (cls ? ' ' + cls : ''), disabled: WS.sent ? 'disabled' : null, onclick: fn }, t);
const wwForce = () => wwHost() && !local ? h('button', { class: 'ww-force', id: 'wwForce', hidden: true, onclick: () => bdConfirm('来ていない人を待たずに 先へ進めますか？', '進める', () => wwSend({ t: 'force' }, me)) }, '待たずに進める') : null;
function wwCover(name, go) { return [h('div', { class: 'ww-c' }, wwImg('sheep', 'ww-big'), h('div', { class: 'ww-say' }, `${name}の番です`), h('div', { class: 'ww-sm' }, 'ほかの人は 画面を見ないでね')), wwBtn('見る', go)]; }
function wwWords(b) {
  const seat = local ? b.seen.indexOf(0) : b.seats.indexOf(me), n = b.seen.filter(Boolean).length, all = b.seats.length;
  if (seat < 0 || (!local && b.seen[seat])) return [wwTop('お題', `${n} / ${all}人`), h('div', { class: 'ww-c' }, wwImg('sheep', 'ww-big'), h('div', { class: 'ww-say' }, 'みんなが たしかめるのを', h('br'), '待っています')), wwForce()];
  const name = bdName(b.seats[seat]);
  if (WS.open !== seat) {
    if (local) return [wwTop('お題', name), ...wwCover(name, () => { WS.open = seat; bdRender(); })];
    return [wwTop('お題', name), h('div', { class: 'ww-c' }, wwImg('sheep', 'ww-big'), h('div', { class: 'ww-say' }, 'まわりに見えないように', h('br'), 'たしかめてね')), wwBtn('お題を見る', () => { WS.open = seat; bdRender(); })];
  }
  return [wwTop('お題', name), h('div', { class: 'ww-c' }, wwImg('sheep', 'ww-mid'), wwSign(seat === b.wolf ? b.min : b.maj), h('div', { class: 'ww-sm' }, '多い側か 少ない側かは', h('br'), 'まだわからない')), wwBtn(`おぼえた（${n + 1} / ${all}人）`, () => { WS.open = -1; wwSend({ t: 'seen' }, b.seats[seat]); })];
}
const wwClock = b => { const v = Math.max(0, Math.ceil((b.talk - (Date.now() - WS.talkAt)) / 1000)); return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'); };
function wwTalk(b) {
  const seat = local ? -1 : b.seats.indexOf(me), host = wwHost();
  return [wwTop('話し合い', `${b.seats.length}人`),
    h('div', { class: 'ww-c' },
      WS.peek && seat >= 0 ? wwSign(seat === b.wolf ? b.min : b.maj) : h('div', { class: 'ww-flock', style: `--n:${b.seats.length}` }, b.seats.map(() => wwImg('sheep'))),
      h('div', { class: 'ww-clk', id: 'wwClk' }, wwClock(b)), h('div', { class: 'ww-say' }, 'まざったオオカミを', h('br'), 'さがそう'),
      seat >= 0 ? h('button', { class: 'ww-peek', onclick: () => { WS.peek = !WS.peek; bdRender(); } }, WS.peek ? 'お題をかくす' : 'お題をもう一度見る') : null),
    host ? h('div', { class: 'ww-bs' }, wwBtn('＋1分', () => wwSend({ t: 'more' }, local ? b.seats[0] : me), 'l n'), wwBtn('投票へ', () => wwSend({ t: 'vote' }, local ? b.seats[0] : me))) : h('div', { class: 'ww-note' }, '部屋主が 投票へ進めます')];
}
function wwGrid(b, ids, sel, tap, tally) {
  return h('div', { class: 'ww-g', style: `--c:${ids.length > 4 ? 3 : 2}` }, ids.map(i => h(tap ? 'button' : 'div', { class: 'ww-sh' + (i === sel ? ' on' : ''), onclick: tap ? () => tap(i) : null }, wwImg('sheep'), h('b', null, bdName(b.seats[i])), tally && tally[i] ? h('span', { class: 'ww-vt' }, String(tally[i])) : null)));
}
function wwVote(b) {
  const seat = local ? b.votes.findIndex(v => v < 0) : b.seats.indexOf(me), n = b.votes.filter(v => v >= 0).length, all = b.seats.length, title = b.runoff ? '決選投票' : '投票';
  if (seat < 0 || (!local && b.votes[seat] >= 0)) return [wwTop(title, `${n} / ${all}人`), h('div', { class: 'ww-c' }, wwImg('sheep', 'ww-big'), h('div', { class: 'ww-say' }, 'みんなの投票を', h('br'), '待っています')), wwForce()];
  const name = bdName(b.seats[seat]);
  if (local && WS.cover !== seat) return [wwTop(title, name), ...wwCover(name, () => { WS.cover = seat; WS.pick = -1; bdRender(); })];
  const ids = (b.cand || b.seats.map((_, i) => i)).filter(i => i !== seat);
  return [wwTop(title, `${n} / ${all}人`), h('div', { class: 'ww-c' }, h('div', { class: 'ww-say' }, 'オオカミは どのひつじ？'), wwGrid(b, ids, WS.pick, i => { WS.pick = i; bdRender(); })),
    wwBtn('このひつじにする', () => { if (WS.pick < 0) { toast('ひつじを選んでね'); return; } const to = WS.pick; WS.pick = -1; wwSend({ t: 'cast', to }, b.seats[seat]); })];
}
const wwNext = (b, label) => wwHost() ? wwBtn(label || 'つぎへ', () => wwSend({ t: 'next' }, local ? b.seats[0] : me)) : h('div', { class: 'ww-note' }, '部屋主が 進めます');
function wwOpen(b) {
  const tie = b.top.length !== 1, last = tie && (b.runoff || !b.top.length);
  return [wwTop('開票', ''), h('div', { class: 'ww-c' }, h('div', { class: 'ww-say' }, tie ? (last ? '同じ票数のまま…' : '同じ票数！ 決選投票へ') : 'いちばん票が多いのは…'),
    wwGrid(b, b.seats.map((_, i) => i), tie ? -1 : b.top[0], null, b.tally)), wwNext(b)];
}
function wwWho(b) {
  const isWolf = b.accused === b.wolf, name = bdName(b.seats[b.accused]);
  return [wwTop('正体', name), h('div', { class: 'ww-c' }, wwSign(`${name}は…`, true),
    h('div', { class: 'ww-rev' }, isWolf ? [wwImg('hood', 'a'), wwImg('shed', 'b')] : wwImg('sheep', 'c')),
    h('div', { class: 'ww-res' + (isWolf ? '' : ' no') }, isWolf ? 'オオカミだ！' : 'ひつじだった…')), wwNext(b)];
}
function wwGuess(b) {
  const mine = local || b.seats[b.wolf] === me, who = bdName(b.seats[b.wolf]);
  if (!mine) return [wwTop('さいごのチャンス', who), h('div', { class: 'ww-c' }, wwImg('wolf', 'ww-mid'), h('div', { class: 'ww-say' }, `${who}が ひつじのお題を`, h('br'), '考えています')), wwForce()];
  return [wwTop('さいごのチャンス', who), h('div', { class: 'ww-c' }, wwImg('wolf', 'ww-sm-img'), h('div', { class: 'ww-say' }, 'ひつじのお題を当てたら', h('br'), '逆転勝ち'), b.opts.map(w => h('button', { class: 'ww-opt' + (WS.pick === w ? ' on' : ''), onclick: () => { WS.pick = w; bdRender(); } }, w))),
    wwBtn('これにする', () => { if (typeof WS.pick !== 'string') { toast('お題を選んでね'); return; } const w = WS.pick; WS.pick = -1; wwSend({ t: 'guess', w }, b.seats[b.wolf]); })];
}
function wwOver(b) {
  const r = b.result, sheep = r.win === 'sheep', who = bdName(b.seats[b.wolf]);
  const why = { caught: r.guess ? `オオカミの答えは「${r.guess}」。はずれ！` : 'オオカミをつかまえた！', guess: `オオカミが「${r.guess}」を当てた！`, miss: 'ひつじを選んでしまった…', tie: '同じ票数のまま、にげられた…' }[r.why];
  return [h('div', { class: 'ww-c' }, wwSign(sheep ? 'ひつじの勝ち' : 'オオカミの勝ち', true), wwImg(sheep ? 'sheep' : 'wolf', 'ww-mid'), h('div', { class: 'ww-sm' }, why),
    h('div', { class: 'ww-row' }, h('small', null, 'ひつじのお題'), b.maj), h('div', { class: 'ww-row' }, h('small', null, `オオカミのお題（${who}）`), b.min)),
    wwHost() ? h('div', { class: 'ww-bs' }, wwBtn('ゲーム選択へ', backToHub, 'l'), wwBtn('もう一度', rematch)) : h('div', { class: 'ww-note' }, '部屋主が次のゲームを選んでいます')];
}
function wordView() {
  const g = doc, b = g.b, key = b.gid + ':' + b.seq, pk = b.gid + ':' + b.phase + ':' + b.runoff;
  if (WS.key !== key) { WS.key = key; WS.sent = false; }
  if (WS.pk !== pk) { WS.pk = pk; WS.at = Date.now(); WS.pick = -1; WS.open = -1; WS.cover = -1; WS.peek = false; }
  if (b.phase === 'talk' && WS.talkKey !== b.gid) { WS.talkKey = b.gid; WS.talkAt = Date.now(); }
  const head = bdHead('ワードウルフ', local ? '1台で遊ぶ' : '招待コード ' + tableId, 'wordwolf');
  const body = { words: wwWords, talk: wwTalk, vote: wwVote, open: wwOpen, who: wwWho, guess: wwGuess, over: wwOver }[b.phase](b);
  return h('div', { class: 'ww' }, head, ...body.flat().filter(Boolean));
}
// 話し合いの時計と、「待たずに進める」ボタン
setInterval(() => {
  if (!isWordDoc() || doc.status !== 'playing' || !BS.root || !BS.root.isConnected) return;
  const b = doc.b, c = $('wwClk'); if (c) c.textContent = wwClock(b);
  const f = $('wwForce'); if (f && Date.now() - WS.at > 40000) f.hidden = false;
  if (b.phase === 'talk' && wwHost() && !WS.sent && WS.talkKey === b.gid && Date.now() - WS.talkAt >= b.talk) wwSend({ t: 'vote' }, local ? b.seats[0] : me);
}, 500);
function wwSlides() {
  const im = k => () => WS.art ? h('img', { class: 'ww-sla', src: WS.art[k], alt: '' }) : null;
  return [
    { t: 'ひとりだけ ちがうお題', s: '自分が少ない側かは わからない', art: () => h('div', { class: 'sla-col' }, wwSign('うどん'), wwSign('そば')) },
    { t: '声で さぐりあおう', s: 'お題そのものは 言わないように', art: im('sheep') },
    { t: 'オオカミに 投票', s: 'ちがう話をしている人は だれ？', art: im('hood') },
    { t: 'オオカミの逆転', s: 'ひつじのお題を当てたら オオカミの勝ち', art: im('wolf') },
  ];
}
