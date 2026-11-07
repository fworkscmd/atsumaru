/* 月夜の錬金市場のルール（DOMなし）。昼はいっせいに手もとで進めて「夜へ」で1回書く。全員そろったら夜を計算する */
// 手もとの操作をあとで同じ結果にするため、山札を切る乱数は席ごとの種（p.rs）から出す
const ALC = (() => {
  const DAYS = 12, HAND = 5, SHELF = 4, SEATS = 4, STAFF_MAX = 3, KINGDOM = 6, PMAX = 12, DONATE = 7, DONATE_F = 3;
  const POT = {
    fire: { n: '火の薬', s: '火', need: ['S', 'S'], base: 3 }, water: { n: '水の薬', s: '水', need: ['Q', 'L'], base: 4 },
    heal: { n: '癒しの薬', s: '癒し', need: ['L', 'M'], base: 5 }, sleep: { n: '眠りの薬', s: '眠り', need: ['M', 'M'], base: 4, age: 1 },
    morph: { n: '変身の薬', s: '変身', need: ['D', 'Q', 'M'], base: 8, learn: 6 }, gold: { n: '金の薬', s: '金', need: ['G', 'S', 'Q', 'L'], base: 12, learn: 9, soot: 2 },
  };
  const PK = Object.keys(POT);
  const C = {
    S: { n: '硫黄', kind: 'mat', cost: 2 }, Q: { n: '水銀', kind: 'mat', cost: 3 }, L: { n: '塩', kind: 'mat', cost: 2 }, M: { n: '月の露', kind: 'mat', cost: 3 }, D: { n: '竜のうろこ', kind: 'mat', cost: 4 }, G: { n: '星の粉', kind: 'mat', cost: 5 },
    c1: { n: '銅貨', kind: 'coin', v: 1, cost: 0 }, c2: { n: '銀貨', kind: 'coin', v: 2, cost: 3 }, c3: { n: '金貨', kind: 'coin', v: 3, cost: 6 },
    soot: { n: 'すす', kind: 'junk', cost: 0, t: 'なにもできない' },
    mortar: { n: '乳鉢', kind: 'tool', cost: 3, t: 'カードを2枚引く' }, still: { n: '蒸留器', kind: 'wild', cost: 4, t: 'どの材料の代わりにもなる' }, crucible: { n: 'るつぼ', kind: 'tool', cost: 5, t: '次に作る薬が 2つできる' },
    vent: { n: '換気口', kind: 'tool', cost: 3, pick: 'hand', t: '手札を1枚 消して コイン+1' }, corner: { n: '買い占め', kind: 'tool', cost: 5, pick: 'pot', d: 2, t: '好きな薬の相場を +2' }, rumor: { n: '悪いうわさ', kind: 'tool', cost: 4, pick: 'pot', d: -3, t: '好きな薬の相場を −3' },
    back: { n: '裏ルート', kind: 'tool', cost: 4, t: '今夜 1つだけ 値くずれなしの 6で売る' },
    pupil: { n: '見習い', kind: 'staff', cost: 6, t: '毎朝 カードを1枚多く引く' }, clerk: { n: '帳簿係', kind: 'staff', cost: 5, t: '薬を売るたび +1' }, spy: { n: '情報屋', kind: 'staff', cost: 4, t: '明日のうわさを 先に見られる' }, cellar: { n: '熟成係', kind: 'staff', cost: 4, t: '眠りの薬の熟成が 倍になる' },
  };
  const BASIC = ['S', 'Q', 'L', 'M', 'D', 'G', 'c2', 'c3'], POOL = ['mortar', 'still', 'crucible', 'vent', 'corner', 'rumor', 'back', 'pupil', 'clerk', 'spy', 'cellar'];
  const RUMORS = [['heal', 3, '港で熱病がはやっている'], ['fire', 3, '冬が来て 火の薬が足りない'], ['water', 3, '日照りで 井戸がかれた'], ['sleep', 3, '王様が ねむれないらしい'], ['morph', 3, '仮面舞踏会が ひらかれる'], ['gold', 3, '王宮が 金を買い集めている'],
    ['fire', -2, '火事さわぎで 火の薬が禁止に'], ['water', -2, '大雨で 水の薬があまっている'], ['heal', -2, '旅の僧が 病を治して回っている'], ['sleep', -2, '夜祭りで だれも眠らない'], ['morph', -2, '変身の薬に にせものが出回る'], ['gold', -3, '金の鉱脈が 見つかった'], ['heal', 2, '騎士団が 遠征に出る']];
  const ORDERS = [['港の診療所', ['heal', 'heal'], 6], ['酒場', ['fire', 'water'], 5], ['宿屋', ['sleep', 'heal'], 6], ['鍛冶屋', ['fire', 'fire'], 4], ['水車小屋', ['water', 'water'], 5], ['騎士団', ['fire', 'morph'], 8], ['旅の一座', ['morph', 'sleep'], 9], ['魔女の森', ['morph', 'heal'], 9], ['図書館', ['sleep', 'sleep'], 6], ['灯台守', ['water', 'heal', 'fire'], 8], ['大商人', ['gold', 'water'], 11], ['王様', ['gold', 'sleep', 'water'], 13], ['お妃さま', ['gold', 'morph'], 14], ['町長', ['morph', 'morph'], 12]];
  const isNpc = id => /^npc\d/.test(id);
  const shuffled = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const seeded = p => { p.rs = (p.rs + 0x6D2B79F5) | 0; let t = p.rs; t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function draw(p, n) {
    for (let i = 0; i < n; i++) {
      if (!p.deck.length) { if (!p.disc.length) return; p.deck = shuffled(p.disc, () => seeded(p)); p.disc = []; }
      p.hand.push(p.deck.pop());
    }
  }
  const handSize = p => HAND + p.staff.filter(x => x === 'pupil').length;
  function freshDay(p) { p.acts = 1; p.buys = 1; p.bonus = 0; p.dbl = 0; p.back = 0; p.moves = []; p.plan = null; }
  function make(humans, rnd = Math.random) {
    const seats = humans.slice(0, SEATS); for (let i = 1; seats.length < SEATS; i++) seats.push('npc' + i);
    const kingdom = shuffled(POOL, rnd).slice(0, KINGDOM), rum = shuffled(RUMORS.map((_, i) => i), rnd), ord = shuffled(ORDERS.map((_, i) => i), rnd);
    const p = seats.map(() => { const q = { deck: shuffled(['c1', 'c1', 'c1', 'c1', 'S', 'S', 'Q', 'L', 'L', 'M', 'M'].slice(0, 11), rnd), disc: [], hand: [], used: [], shelf: [], gold: 0, fame: 0, rec: ['fire', 'water', 'heal', 'sleep'], staff: [], sold: 0, filled: 0, rs: Math.floor(rnd() * 2 ** 31) }; freshDay(q); draw(q, HAND); return q; });
    const m = {}; PK.forEach(k => m[k] = POT[k].base);
    const b = { gid: Math.floor(rnd() * 2 ** 31), seats, day: 1, seq: 0, m, p, shop: BASIC.concat(kingdom), rum, ord, orders: [], done: {}, rumor: null, next: null, last: null, result: null };
    morning(b);
    return { v: 6, status: 'playing', game: 'alchemy', players: humans.slice(0, SEATS), b };
  }
  function morning(b) {
    while (b.orders.length < 3 && b.ord.length) b.orders.push(b.ord.shift());
    b.rumor = b.next != null ? b.next : b.rum.shift(); b.next = b.rum.length ? b.rum.shift() : null;
    const [k, d] = RUMORS[b.rumor]; b.m[k] = clamp(b.m[k] + d); b.done = {};
  }
  const clamp = v => Math.max(1, Math.min(PMAX, v));
  const money = p => p.bonus + p.gold + p.hand.reduce((x, c) => x + (C[c].kind === 'coin' ? C[c].v : 0), 0);
  function pay(p, cost) {
    let n = Math.min(p.bonus, cost); p.bonus -= n; cost -= n;
    const coins = p.hand.filter(c => C[c].kind === 'coin').sort((x, y) => C[y].v - C[x].v);
    for (const c of coins) { if (cost <= 0) break; p.hand.splice(p.hand.indexOf(c), 1); p.used.push(c); cost -= C[c].v; }
    if (cost > 0) p.gold -= cost;
  }
  // 薬に使う手札の場所（足りなければ null）。蒸留器は足りない材料の代わり
  function findCards(p, k) {
    const out = [], rest = [];
    for (const m of POT[k].need) { const i = p.hand.findIndex((c, j) => c === m && !out.includes(j)); if (i >= 0) out.push(i); else rest.push(m); }
    for (const m of rest) { const i = p.hand.findIndex((c, j) => c === 'still' && !out.includes(j)); if (i < 0) return null; out.push(i); }
    return out;
  }
  function step(b, s, a) {
    const p = b.p[s];
    if (a.t === 'brew') {
      if (!p.rec.includes(a.k)) throw new Error('まだ知らないレシピです');
      if (p.shelf.length >= SHELF) throw new Error('棚がいっぱいです');
      const idx = findCards(p, a.k); if (!idx) throw new Error('材料が足りません');
      idx.slice().sort((x, y) => y - x).forEach(i => p.used.push(p.hand.splice(i, 1)[0]));
      const n = p.dbl ? 2 : 1; p.dbl = 0;
      for (let i = 0; i < n && p.shelf.length < SHELF; i++) p.shelf.push({ k: a.k, age: 0 });
      for (let i = 0; i < (POT[a.k].soot || 0); i++) p.disc.push('soot');
      return;
    }
    if (a.t === 'tool') {
      const c = p.hand[a.i]; if (!c || C[c].kind !== 'tool') throw new Error('使えるカードではありません');
      if (p.acts < 1) throw new Error('道具は1日1枚までです');
      if (c === 'vent' && (a.x == null || a.x === a.i || !p.hand[a.x])) throw new Error('消すカードをえらんでください');
      if (C[c].pick === 'pot' && !POT[a.k]) throw new Error('薬をえらんでください');
      const gone = c === 'vent' ? p.hand[a.x] : null;
      p.used.push(c); p.hand.splice(a.i, 1); p.acts--;
      if (c === 'mortar') draw(p, 2);
      if (c === 'crucible') p.dbl = 1;
      if (c === 'back') p.back = 1;
      if (c === 'vent') { p.hand.splice(p.hand.indexOf(gone), 1); p.bonus += 1; }
      if (C[c].pick === 'pot') p.moves.push({ k: a.k, d: C[c].d });
      return;
    }
    if (a.t === 'buy') {
      if (p.buys < 1) throw new Error('買えるのは1日1回です');
      if (!b.shop.includes(a.id)) throw new Error('店にありません');
      const c = C[a.id]; if (money(p) < c.cost) throw new Error('お金が足りません');
      if (c.kind === 'staff') { if (p.staff.length >= STAFF_MAX) throw new Error(`弟子は${STAFF_MAX}人までです`); if (p.staff.includes(a.id)) throw new Error('もうやとっています'); }
      pay(p, c.cost); p.buys--;
      if (c.kind === 'staff') p.staff.push(a.id); else p.disc.push(a.id);
      return;
    }
    if (a.t === 'learn') {
      if (p.buys < 1) throw new Error('買えるのは1日1回です');
      const k = POT[a.k]; if (!k || !k.learn || p.rec.includes(a.k)) throw new Error('習えません');
      if (money(p) < k.learn) throw new Error('お金が足りません');
      pay(p, k.learn); p.buys--; p.rec.push(a.k);
      return;
    }
    if (a.t === 'donate') { // 町に寄付して名声をもらう（買いものの代わり）
      if (p.buys < 1) throw new Error('買えるのは1日1回です');
      if (money(p) < DONATE) throw new Error('お金が足りません');
      pay(p, DONATE); p.buys--; p.fame += DONATE_F;
      return;
    }
    if (a.t === 'plan') { p.plan = { sell: (a.sell || []).filter(i => p.shelf[i]), ord: a.ord != null ? a.ord : null }; return; }
    throw new Error('できない操作です');
  }
  // 注文に使う棚の場所（売る薬はのぞく）。そろわなければ null
  function orderUse(p, oid, sell = []) {
    const out = [];
    for (const k of ORDERS[oid][1]) { const i = p.shelf.findIndex((x, j) => x.k === k && !out.includes(j) && !sell.includes(j)); if (i < 0) return null; out.push(i); }
    return out;
  }
  const unit = (m, n) => Math.max(1, m - (n - 1));
  const ageBonus = (p, x) => POT[x.k].age ? x.age * (p.staff.includes('cellar') ? 2 : 1) : 0;
  function resolve(g) {
    const b = g.b, N = b.seats.length, from = { ...b.m }, night = { day: b.day, sold: [], quiet: [], orders: [], moves: [], gain: b.p.map(() => ({ gold: 0, fame: 0, aged: 0 })) };
    b.p.forEach((p, s) => p.moves.forEach(mv => { b.m[mv.k] = clamp(b.m[mv.k] + mv.d); night.moves.push({ s, k: mv.k, d: mv.d }); }));
    // 注文：同じ注文なら、名声の少ない人が勝つ
    const gone = b.p.map(() => []), claim = {};
    b.p.forEach((p, s) => { const o = p.plan && p.plan.ord; if (o == null || !b.orders.includes(o)) return; const use = orderUse(p, o, p.plan.sell); if (!use) return; (claim[o] = claim[o] || []).push({ s, use }); });
    Object.keys(claim).forEach(o => {
      const c = claim[o].sort((x, y) => b.p[x.s].fame - b.p[y.s].fame)[0], id = +o, f = ORDERS[id][2];
      b.p[c.s].fame += f; b.p[c.s].filled++; gone[c.s].push(...c.use); b.orders = b.orders.filter(x => x !== id);
      night.orders.push({ s: c.s, id, f, lost: claim[o].length - 1 }); night.gain[c.s].fame += f;
    });
    // 売る：同じ薬の合計の数だけ、みんな安くなる
    const list = {}; PK.forEach(k => list[k] = []);
    b.p.forEach((p, s) => (p.plan ? p.plan.sell : []).forEach(i => { if (!gone[s].includes(i)) list[p.shelf[i].k].push({ s, i }); }));
    PK.forEach(k => {
      const L = list[k].slice(), route = [];
      b.p.forEach((p, s) => { if (p.back) { const j = L.findIndex(x => x.s === s); if (j >= 0) { route.push(L.splice(j, 1)[0]); p.back = 0; } } });
      const n = L.length, pr = unit(b.m[k], n);
      L.concat(route).forEach(x => { const p = b.p[x.s], r = route.includes(x), v = (r ? 6 : pr) + ageBonus(p, p.shelf[x.i]) + (p.staff.includes('clerk') ? 1 : 0); p.gold += v; p.sold++; gone[x.s].push(x.i); night.gain[x.s].gold += v; });
      if (L.length + route.length) { const to = clamp(b.m[k] - n); night.sold.push({ k, n: L.length + route.length, price: pr, from: b.m[k], to, who: L.concat(route).map(x => x.s) }); b.m[k] = to; }
      else { night.quiet.push(k); if (b.m[k] < POT[k].base + 3) b.m[k] = clamp(b.m[k] + 1); }
    });
    b.p.forEach((p, s) => {
      p.shelf = p.shelf.filter((_, i) => !gone[s].includes(i)); p.shelf.forEach(x => { x.age++; if (POT[x.k].age) night.gain[s].aged++; });
      p.disc.push(...p.hand, ...p.used); p.hand = []; p.used = []; freshDay(p); draw(p, handSize(p));
    });
    night.market = from; b.last = night; b.seq++;
    if (b.day >= DAYS) { finish(g); return g; }
    b.day++; morning(b);
    return g;
  }
  function finish(g) {
    const b = g.b, bonus = b.p.map(() => []);
    const top = (f, name) => { const v = Math.max(...b.p.map(f)); if (v > 0) b.p.forEach((p, s) => { if (f(p) === v) bonus[s].push(name); }); };
    top(p => p.sold, '大商人'); top(p => p.filled, '王室御用達');
    const score = b.p.map((p, s) => p.fame + (p.rec.length - 4) * 2 + bonus[s].length * 3 + Math.floor(p.gold / 10));
    const best = Math.max(...score);
    g.status = 'over'; b.result = { score, titles: bonus, win: score.map((v, s) => v === best ? s : -1).filter(s => s >= 0) };
  }
  function act(g0, id, a, rnd = Math.random) {
    const g = JSON.parse(JSON.stringify(g0)), b = g.b, s = b.seats.indexOf(id);
    if (a.t === 'skip') { b.seats.forEach((x, i) => { if (!isNpc(x)) b.done[i] = 1; }); }
    else {
      if (s < 0) throw new Error('このゲームの参加者ではありません');
      if (a.t !== 'day') throw new Error('できない操作です');
      if (b.done[s]) throw new Error('もう夜を待っています');
      (a.steps || []).forEach(x => step(b, s, x)); b.done[s] = 1;
    }
    if (b.seats.every((x, i) => isNpc(x) || b.done[i])) { b.seats.forEach((x, i) => { if (isNpc(x)) npcDay(b, i, rnd); }); return resolve(g); }
    return g;
  }
  /* ---- コンピュータ：席ごとに性格がちがう（0 注文 / 1 相場 / 2 手広く） ---- */
  const rivals = (b, s, k) => b.p.reduce((n, p, i) => n + (i !== s && p.shelf.some(x => x.k === k) ? 1 : 0), 0);
  const worth = (b, k) => b.m[k] + b.orders.reduce((n, o) => n + (ORDERS[o][1].includes(k) ? 3 : 0), 0);
  function npcDay(b, s, rnd, style) {
    const p = b.p[s], me = style != null ? style : s % 3, tryStep = a => { try { step(b, s, a); return true; } catch (e) { return false; } };
    // 道具
    const ti = p.hand.findIndex(c => C[c].kind === 'tool');
    if (ti >= 0) {
      const c = p.hand[ti];
      if (c === 'vent') { const x = p.hand.findIndex((h, j) => j !== ti && (h === 'soot' || h === 'c1')); if (x >= 0) tryStep({ t: 'tool', i: ti, x }); }
      else if (c === 'corner') { const mine = p.shelf.slice().sort((x, y) => b.m[y.k] - b.m[x.k])[0]; if (mine) tryStep({ t: 'tool', i: ti, k: mine.k }); }
      else if (c === 'rumor') { const k = PK.filter(q => rivals(b, s, q) && !p.shelf.some(x => x.k === q)).sort((x, y) => b.m[y] - b.m[x])[0]; if (k) tryStep({ t: 'tool', i: ti, k }); }
      else if (c === 'back') { if (p.shelf.length) tryStep({ t: 'tool', i: ti }); }
      else tryStep({ t: 'tool', i: ti });
    }
    // つくる
    for (let n = 0; n < 4; n++) {
      const k = p.rec.filter(q => findCards(p, q)).sort((x, y) => worth(b, y) - worth(b, x) + (rnd() - .5) * 2)[0];
      if (!k || !tryStep({ t: 'brew', k })) break;
    }
    // かう
    const want = [];
    const lack = PK.filter(k => p.rec.includes(k)).flatMap(k => POT[k].need).filter(m => !p.deck.concat(p.disc, p.hand, p.used).includes(m));
    if (me === 0) want.push(['learn', 'morph'], ['learn', 'gold'], ['buy', 'c3'], ['buy', 'pupil'], ['buy', 'still']);
    if (me === 1) want.push(['buy', 'clerk'], ['buy', 'c3'], ['learn', 'morph'], ['buy', 'cellar'], ['buy', 'corner'], ['buy', 'rumor']);
    if (me === 2) want.push(['buy', 'pupil'], ['buy', 'spy'], ['buy', 'mortar'], ['learn', 'morph'], ['buy', 'c3'], ['buy', 'crucible']);
    if (p.rec.includes('morph')) want.push(['buy', 'D']); if (p.rec.includes('gold')) want.push(['buy', 'G']);
    lack.forEach(m => want.push(['buy', m])); want.push(['buy', 'c2'], ['buy', ['S', 'Q', 'L', 'M'][Math.floor(rnd() * 4)]]);
    if (b.day >= (me === 1 ? 6 : 8)) want.unshift(['donate']);
    for (const [t, v] of want) if (tryStep(t === 'donate' ? { t } : t === 'learn' ? { t, k: v } : { t, id: v })) break;
    // 夜の予定
    const ord = b.orders.map(o => ({ o, f: ORDERS[o][2], use: orderUse(p, o) })).filter(x => x.use).sort((x, y) => y.f - x.f)[0];
    const hold = ord ? ord.use : [], wanted = b.orders.flatMap(o => ORDERS[o][1]), sell = [];
    p.shelf.forEach((x, i) => {
      if (hold.includes(i)) return;
      const est = b.m[x.k] - rivals(b, s, x.k) * .6 + ageBonus(p, x), part = wanted.includes(x.k) && p.shelf.length < SHELF && (me === 0 || rnd() < .5);
      if (POT[x.k].age && x.age < 3 && p.shelf.length < SHELF) return;
      if (!part && (est >= 3 + rnd() * 2 || p.shelf.length >= SHELF)) sell.push(i);
    });
    tryStep({ t: 'plan', sell, ord: ord ? ord.o : null });
  }
  return { DAYS, HAND, SHELF, SEATS, PMAX, DONATE, DONATE_F, POT, PK, C, RUMORS, ORDERS, make, act, step, money, findCards, orderUse, npcDay, resolve, isNpc, unit, ageBonus };
})();
