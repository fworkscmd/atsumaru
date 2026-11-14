/* いっちょあがり！のルール（DOMなし）。町中華の材料を冷蔵庫にためて、3つそろえば料理
   4席（足りない席はコンピュータ）・10ターンで閉店。点は料理ごとに2〜4点、同点なら料理の数
   1ターン：市場（表5つ）から2つ（山でもいい）を全員こっそり選ぶ → せーので公開。かぶったら順番が先の人（毎ターン交代）が取り、ほかの人は山から1つ
   取った材料は冷蔵庫（4×3マス、材料の大きさは1・2・4マス）へ。3つそろうと自動で料理（万能スープは最後に使う）
   入らなければ、入るようになるまで冷蔵庫から市場へ出す（'fix'）。市場の空きは、出された材料 → 山の順でうめる
   シミュレーションは tools/chuka-sim.mjs（icho） */
const ICH = (() => {
  // 材料：k は絵の名前、s は冷蔵庫のマス数（1・2・4）
  const ING = [
    { k: 'rice', n: 'ライス', s: 4 }, { k: 'egg', n: '卵', s: 1 }, { k: 'negi', n: 'ネギ', s: 2 }, { k: 'noodle', n: '麺', s: 2 }, { k: 'soup', n: 'スープ', s: 4 },
    { k: 'pork', n: '豚肉', s: 2 }, { k: 'skin', n: '皮', s: 2 }, { k: 'nira', n: 'ニラ', s: 2 }, { k: 'crab', n: 'カニ', s: 4 }, { k: 'tofu', n: '豆腐', s: 2 },
    { k: 'shrimp', n: 'エビ', s: 2 }, { k: 'cabbage', n: 'キャベツ', s: 4 }, { k: 'pepper', n: 'ピーマン', s: 1 }, { k: 'bamboo', n: 'たけのこ', s: 2 }, { k: 'sprout', n: 'もやし', s: 2 },
    { k: 'chicken', n: '鶏肉', s: 2 }, { k: 'shiitake', n: 'しいたけ', s: 1 }, { k: 'carrot', n: 'にんじん', s: 1 },
    { k: 'banno', n: '万能スープ', s: 1, wild: true },
  ];
  const W = ING.length - 1, I = Object.fromEntries(ING.map((x, i) => [x.n, i]));
  // 料理：材料3つ。p は点（作られにくいほど高い）、c はジャンル
  const RC = [
    ['chahan', 'チャーハン', ['ライス', '卵', 'ネギ'], 3, 'ご飯'], ['tenshin', '天津飯', ['ライス', '卵', 'カニ'], 2, 'ご飯'], ['chukadon', '中華丼', ['ライス', 'エビ', 'キャベツ'], 4, 'ご飯'],
    ['ramen', 'ラーメン', ['麺', 'スープ', '豚肉'], 2, '麺'], ['yakisoba', '焼きそば', ['麺', 'キャベツ', 'もやし'], 3, '麺'], ['tanmen', 'タンメン', ['麺', 'スープ', 'キャベツ'], 4, '麺'],
    ['gyoza', '餃子', ['皮', '豚肉', 'ニラ'], 2, '点心'], ['shumai', '焼売', ['皮', '豚肉', 'しいたけ'], 4, '点心'], ['harumaki', '春巻き', ['皮', 'たけのこ', 'もやし'], 2, '点心'],
    ['mabo', '麻婆豆腐', ['豆腐', '豚肉', 'ネギ'], 3, '炒め'], ['ebichili', 'エビチリ', ['エビ', 'ネギ', '卵'], 3, '炒め'], ['hoikoro', '回鍋肉', ['豚肉', 'キャベツ', 'ピーマン'], 4, '炒め'],
    ['chinjao', '青椒肉絲', ['豚肉', 'ピーマン', 'たけのこ'], 3, '炒め'], ['happosai', '八宝菜', ['エビ', 'キャベツ', 'しいたけ'], 2, '炒め'], ['kanitama', 'かに玉', ['カニ', '卵', 'ネギ'], 4, '炒め'],
    ['niratama', 'ニラ玉', ['ニラ', '卵', 'もやし'], 3, '炒め'], ['subuta', '酢豚', ['豚肉', 'ピーマン', 'にんじん'], 4, '炒め'], ['yurinchi', '油淋鶏', ['鶏肉', 'ネギ', 'スープ'], 2, '鶏'],
    ['banbanji', '棒棒鶏', ['鶏肉', 'もやし', 'にんじん'], 2, '鶏'], ['soupc', '中華スープ', ['スープ', '卵', '豆腐'], 3, 'スープ'],
  ].map(([k, n, ing, p, c]) => ({ k, n, i: ing.map(x => I[x]), p, c }));
  const SEATS = 4, TURNS = 10, MARKET = 5, START = 5, COPIES = 6, WILDS = 4, FW = 4, FH = 3;
  const rint = (n, rnd) => Math.floor(rnd() * n);
  const isNpc = id => /^npc\d/.test(id);
  const mix = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1, rnd); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---- 冷蔵庫に入るか ---- */
  // 形ごとの数（1マス・2マス・4マス）だけで決まるので覚えておく
  const FIT = new Map();
  function fitsCount(c1, c2, c4) {
    const key = c1 + ',' + c2 + ',' + c4; if (FIT.has(key)) return FIT.get(key);
    let ok = false;
    if (c1 + 2 * c2 + 4 * c4 <= FW * FH) {
      const g = new Uint8Array(FW * FH), cc = [c1, c2, c4], SH = [[[1, 1]], [[2, 1], [1, 2]], [[2, 2]]];
      const dfs = (from, left) => {
        if (!left) return true; let p = from; while (p < g.length && g[p]) p++; if (p >= g.length) return false;
        if (left > g.length - p - g.slice(p).reduce((a, b) => a + (b ? 1 : 0), 0)) return false;
        const x = p % FW, y = p / FW | 0;
        for (let s = 2; s >= 0; s--) { if (!cc[s]) continue; for (const [w, h] of SH[s]) {
          if (x + w > FW || y + h > FH) continue; let free = true; for (let i = 0; i < w && free; i++) for (let j = 0; j < h; j++) if (g[p + i + j * FW]) { free = false; break; } if (!free) continue;
          for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) g[p + i + j * FW] = 1; cc[s]--;
          const r = dfs(p + 1, left - w * h); cc[s]++; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) g[p + i + j * FW] = 0; if (r) return true; } }
        g[p] = 2; const r = dfs(p + 1, left); g[p] = 0; return r; // このマスは空けておく
      };
      ok = dfs(0, c1 + 2 * c2 + 4 * c4);
    }
    FIT.set(key, ok); return ok;
  }
  const canFit = list => { const c = [0, 0, 0]; for (const x of list) c[[0, 0, 1, 0, 2][ING[x].s]]++; return fitsCount(c[0], c[1], c[2]); };
  // 画面用：どこに置くか（大きいものから左上へ）。入らないものは out へ
  function pack(list) {
    // 入るかは前から順に（あとから来たものが入りきらない側になる）。置き場所は大きいものから
    const keep = []; for (const o of list.map((x, i) => ({ x, i }))) if (canFit(keep.map(k => k.x).concat(o.x))) keep.push(o);
    keep.sort((a, b) => ING[b.x].s - ING[a.x].s || a.x - b.x || a.i - b.i);
    const g = new Uint8Array(FW * FH), pos = [];
    const place = k => {
      if (k >= keep.length) return true; const s = ING[keep[k].x].s, shapes = s === 4 ? [[2, 2]] : s === 2 ? [[2, 1], [1, 2]] : [[1, 1]];
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) for (const [w, h] of shapes) {
        if (x + w > FW || y + h > FH) continue; let free = true; for (let i = 0; i < w && free; i++) for (let j = 0; j < h; j++) if (g[x + i + (y + j) * FW]) { free = false; break; } if (!free) continue;
        for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) g[x + i + (y + j) * FW] = 1; pos[k] = { i: keep[k].i, x: keep[k].x, c: x, r: y, w, h };
        if (place(k + 1)) return true; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) g[x + i + (y + j) * FW] = 0; }
      return false;
    };
    place(0);
    const kept = new Set(keep.map(k => k.i));
    return { items: pos.filter(Boolean), out: list.map((x, i) => ({ x, i })).filter(o => !kept.has(o.i)), free: FW * FH - list.filter((_, i) => kept.has(i)).reduce((a, x) => a + ING[x].s, 0) };
  }

  /* ---- 料理 ---- */
  const counts = list => { const c = new Map(); let w = 0; for (const x of list) { if (x === W) w++; else c.set(x, (c.get(x) || 0) + 1); } return [c, w]; };
  const missOf = (r, c) => r.i.filter(x => !c.get(x)).length;
  // 作れるものを作る。万能スープは最後に使う（本物がそろうものを先に）。点が高いもの、冷蔵庫が空くものから
  function cookAll(list) {
    const made = [];
    for (;;) {
      const [c, w] = counts(list); let best = -1, bk = null;
      RC.forEach((r, i) => { const m = missOf(r, c); if (m > w) return; const key = [m, -r.p, -r.i.reduce((a, x) => a + ING[x].s, 0)]; if (!bk || key[0] < bk[0] || (key[0] === bk[0] && (key[1] < bk[1] || (key[1] === bk[1] && key[2] < bk[2])))) { bk = key; best = i; } });
      if (best < 0) return made;
      for (const x of RC[best].i) { const j = list.indexOf(x); list.splice(j >= 0 ? j : list.indexOf(W), 1); }
      made.push(best);
    }
  }
  // いちばん近い料理（画面のヒント）：[{ r, need:[材料] }]
  function nearest(list, n = 3) {
    const [c, w] = counts(list);
    return RC.map((r, i) => ({ r: i, need: r.i.filter(x => !c.get(x)), p: r.p })).map(o => ({ ...o, left: Math.max(0, o.need.length - w) }))
      .filter(o => o.need.length < 3).sort((a, b) => a.left - b.left || b.p - a.p).slice(0, n);
  }
  // この材料が入ると、何か料理ができるか
  const completes = (list, x) => { const [c, w] = counts(list.concat(x)); return RC.some(r => missOf(r, c) <= w); };
  const recipesWith = x => RC.map((r, i) => r.i.includes(x) ? i : -1).filter(i => i >= 0);

  /* ---- コンピュータ ---- */
  const G = [1, .45, .18, .06, .02];
  function value(list) {
    const [c, w] = counts(list), vs = RC.map(r => G[Math.min(4, Math.max(0, missOf(r, c) - w))] * r.p).sort((a, b) => b - a);
    return vs[0] + .5 * vs[1] + .25 * vs[2] + .1 * vs[3] + w * .3;
  }
  // 入らないときに出すもの（残りがいちばんよくなるもの）
  function worst(list) {
    let bi = 0, bv = -Infinity;
    list.forEach((_, j) => { const rest = list.slice(0, j).concat(list.slice(j + 1)); const v = value(rest) + (canFit(rest) ? .3 : 0); if (v > bv) { bv = v; bi = j; } });
    return bi;
  }
  // 取ったあとのよさ：できた料理の点＋残った冷蔵庫のよさ（入らないぶんは出したとして）
  function after(list, add) { const t = list.concat(add), c = cookAll(t); let n = 0; while (!canFit(t) && n++ < 8) t.splice(worst(t), 1); return c.reduce((a, r) => a + RC[r].p * 1.3, 0) + value(t); }
  // この材料でほかの人の料理ができてしまうなら、その点（じゃまするよさ）
  const denyOf = (b, s, x) => { let best = 0; b.fridge.forEach((f, o) => { if (o === s) return; const [c, w] = counts(f.concat(x)); RC.forEach(r => { if (r.i.includes(x) && missOf(r, c) <= w) best = Math.max(best, r.p); }); }); return best; };
  // deny：ほかの人の冷蔵庫を見て、じゃまもするか（0＝しない）
  function npcPicks(b, s, deny = 0) {
    const list = b.fridge[s], m = b.market, dk = new Map(); for (const x of b.deck) dk.set(x, (dk.get(x) || 0) + 1);
    const deckEV = known => { if (!b.deck.length) return after(list, known); let ev = 0; for (const [x, n] of dk) ev += n / b.deck.length * after(list, known.concat(x)); return ev; };
    const opts = [...m.keys(), -1]; let best = [-1, -1], bv = -Infinity;
    for (let i = 0; i < opts.length; i++) for (let j = i; j < opts.length; j++) {
      const a = opts[i], c = opts[j]; if (a === c && a !== -1) continue;
      const known = [a, c].filter(x => x >= 0).map(x => m[x]), nd = [a, c].filter(x => x < 0).length;
      let v = nd ? deckEV(known) - (nd === 2 ? .02 : 0) : after(list, known);
      if (deny) v += deny * known.reduce((t, x) => t + denyOf(b, s, x), 0);
      if (v > bv) { bv = v; best = [a, c]; }
    }
    return best;
  }
  // いま作れる料理と、「どっちを作る？」を聞くか（1つ作るとほかが作れなくなるとき）
  const cookable = list => { const [c, w] = counts(list); return RC.map((r, i) => missOf(r, c) <= w ? i : -1).filter(i => i >= 0); };
  function cookOne(list, ri) { for (const x of RC[ri].i) { const j = list.indexOf(x); list.splice(j >= 0 ? j : list.indexOf(W), 1); } }
  function needChoice(list) {
    const os = cookable(list); if (os.length < 2) return null;
    const clash = os.some(a => { const t = list.slice(); cookOne(t, a); const left = cookable(t); return os.some(o => o !== a && !left.includes(o)); });
    return clash ? os : null;
  }

  /* ---- 1ゲーム ---- */
  function make(humans, rnd = Math.random) {
    const hs = humans.slice(0, SEATS), seats = hs.slice(); let k = 1; while (seats.length < SEATS) seats.push('npc' + (k++));
    const deck = []; ING.forEach((x, i) => { for (let j = 0; j < (x.wild ? WILDS : COPIES); j++) deck.push(i); });
    const b = { gid: rint(2 ** 31, rnd), seats, turn: 1, T: TURNS, deck: mix(deck, rnd), market: [], fridge: seats.map(() => []), made: seats.map(() => []), picks: seats.map(() => null),
      fixing: [], thrown: [], log: null, phase: 'pick', seq: 0,
      st: seats.map(() => ({ cl: 0, th: 0, dk: 0, f1: 0 })) }; // 称号のための記録：かぶった・出した・山から取った回数、最初の料理のターン
    // 最初の冷蔵庫は5つ。まず「あと1つで料理」になる2つを入れる（最初のうちに1回「いっちょあがり！」できるように）
    // 入らないもの・いきなり料理になるものは山の下へもどす
    seats.forEach((_, s) => {
      const r = RC[rint(RC.length, rnd)], two = mix(r.i, rnd).slice(0, 2);
      for (const x of two) { const j = b.deck.lastIndexOf(x); if (j >= 0 && canFit(b.fridge[s].concat(x))) { b.deck.splice(j, 1); b.fridge[s].push(x); } }
      let n = 0; while (b.fridge[s].length < START && n++ < 60) { const x = b.deck.pop(), t = b.fridge[s].concat(x); if (canFit(t) && !completes(b.fridge[s], x) && x !== W) b.fridge[s].push(x); else b.deck.unshift(x); } });
    while (b.market.length < MARKET && b.deck.length) b.market.push(b.deck.pop());
    return { v: 6, status: 'playing', game: 'icho', players: hs, b };
  }
  const order = b => b.seats.map((_, i) => (i + b.turn - 1) % b.seats.length); // かぶったときの順番（毎ターン1つずれる）
  function resolve(b, rnd) {
    const ord = order(b), takenBy = b.market.map(() => -1), got = b.seats.map(() => []), clash = [], from = b.seats.map(() => []);
    for (const s of ord) for (const x of b.picks[s]) {
      if (x < 0) { if (b.deck.length) { got[s].push(b.deck.pop()); from[s].push('deck'); } continue; }
      if (takenBy[x] < 0) { takenBy[x] = s; got[s].push(b.market[x]); from[s].push('m'); }
      else { clash.push({ s, by: takenBy[x], m: x }); if (b.deck.length) { got[s].push(b.deck.pop()); from[s].push('clash'); } }
    }
    const cooked = b.seats.map(() => []); b.choosing = [];
    // 1つの材料で2つの料理ができるとき、人には「どっちを作る？」を聞く（コンピュータは自動）
    for (const s of ord) { b.fridge[s].push(...got[s]); if (!isNpc(b.seats[s]) && needChoice(b.fridge[s])) { b.choosing.push(s); continue; } const c = cookAll(b.fridge[s]); cooked[s] = c; b.made[s].push(...c); }
    b.log = { turn: b.turn, order: ord, picks: b.picks.map(p => p.slice()), market: b.market.slice(), got, from, clash, cooked };
    if (b.st) { clash.forEach(c => { b.st[c.s].cl++; b.st[c.by].cl++; }); b.picks.forEach((p, s) => b.st[s].dk += p.filter(x => x < 0).length); cooked.forEach((c, s) => { if (c.length && !b.st[s].f1) b.st[s].f1 = b.turn; }); }
    b.market = b.market.filter((_, i) => takenBy[i] < 0);
    if (b.choosing.length) { b.phase = 'cook'; return; }
    afterCook(b);
  }
  function afterCook(b) {
    // あふれた冷蔵庫：コンピュータはその場で片付け、人は選ぶ
    b.fixing = [];
    b.seats.forEach((id, s) => { if (canFit(b.fridge[s])) return; if (isNpc(id)) autoFix(b, s); else b.fixing.push(s); });
    if (b.fixing.length) { b.phase = 'fix'; return; }
    endTurn(b);
  }
  function autoFix(b, s) { let n = 0; while (!canFit(b.fridge[s]) && n++ < 12) { b.thrown.push(b.fridge[s].splice(worst(b.fridge[s]), 1)[0]); if (b.st) b.st[s].th++; } }
  const firstCook = (b, s) => { if (b.st && !b.st[s].f1 && b.made[s].length) b.st[s].f1 = b.turn; };
  // 閉店のときの称号（ひとり1つ、同じ称号は1人だけ）。記録のない古い卓は料理だけで決める
  function titles(b) {
    const N = b.seats.length, st = b.st || b.seats.map(() => ({ cl: 0, th: -1, dk: 0, f1: 0 })), out = Array(N).fill(null);
    const n = s => b.made[s].length, pts = s => score(b, s);
    const best = (f, ok) => { const c = b.seats.map((_, s) => s).filter(s => out[s] == null && ok(s)); if (!c.length) return -1; const m = Math.max(...c.map(f)); const w = c.filter(s => f(s) === m); return w.length === 1 ? w[0] : -1; };
    const rules = [
      ['品数王', s => n(s), s => n(s) >= 4],
      ['一番乗り', s => -st[s].f1 * 100 + n(s) * 10 + pts(s) / 10, s => st[s].f1 > 0], // 同じターンなら料理の多い人
      ['かぶり王', s => st[s].cl, s => st[s].cl >= 3],
      ['高級店', s => pts(s) / n(s), s => n(s) >= 2 && pts(s) / n(s) >= 3],
      ['冷蔵庫の達人', s => -st[s].th * 10 + n(s), s => st[s].th >= 0 && st[s].th <= 2 && n(s) >= 2],
      ['山の勝負師', s => st[s].dk, s => st[s].dk >= 5],
    ];
    for (const [t, f, ok] of rules) { const s = best(f, ok); if (s >= 0) out[s] = t; }
    return out.map((t, s) => {
      if (t) return t;
      if (!n(s)) return '明日に期待';
      const c = {}; b.made[s].forEach(r => c[r] = (c[r] || 0) + 1);
      const r = Object.keys(c).map(Number).sort((x, y) => c[y] - c[x] || RC[y].p - RC[x].p)[0];
      return '看板料理 ' + RC[r].n;
    });
  }
  function endTurn(b) {
    while (b.market.length < MARKET && b.thrown.length) b.market.push(b.thrown.shift());
    b.deck.unshift(...b.thrown); b.thrown = [];
    while (b.market.length < MARKET && b.deck.length) b.market.push(b.deck.pop());
    b.picks = b.seats.map(() => null); b.fixing = [];
    if (b.turn >= b.T) { b.phase = 'over'; return; }
    b.turn++; b.phase = 'pick';
  }
  const score = (b, s) => b.made[s].reduce((a, r) => a + RC[r].p, 0);
  // 順位：点、同じなら料理の数
  const ranking = b => b.seats.map((id, s) => ({ id, s, pts: score(b, s), n: b.made[s].length })).sort((a, c) => c.pts - a.pts || c.n - a.n);
  function act(g0, id, a, rnd = Math.random) {
    const g = JSON.parse(JSON.stringify(g0)), b = g.b;
    if (g.status !== 'playing') throw new Error('もう閉店しました');
    const done = () => { if (b.phase === 'over') g.status = 'over'; b.seq++; return g; };
    if (a.t === 'force') { // 部屋主：来ていない人のぶんを進める
      if (b.phase === 'pick') { b.seats.forEach((_, s) => { if (!b.picks[s]) b.picks[s] = npcPicks(b, s); }); resolve(b, rnd); return done(); }
      if (b.phase === 'cook') { b.choosing.forEach(s => { const c = cookAll(b.fridge[s]); b.log.cooked[s] = c; b.made[s].push(...c); firstCook(b, s); }); b.choosing = []; afterCook(b); return done(); }
      if (b.phase === 'fix') { b.fixing.forEach(s => autoFix(b, s)); endTurn(b); return done(); }
      throw new Error('いまは進められません');
    }
    const s = b.seats.indexOf(id); if (s < 0) throw new Error('この席にはいません');
    if (a.t === 'pick') {
      if (b.phase !== 'pick') throw new Error('いまは選べません');
      if (b.picks[s]) throw new Error('もう選びました');
      const p = a.p; if (!Array.isArray(p) || p.length !== 2) throw new Error('2つ選んでください');
      if (p.some(x => x !== -1 && !(x >= 0 && x < b.market.length))) throw new Error('その材料はありません');
      if (p[0] === p[1] && p[0] !== -1) throw new Error('同じ材料は1つまで');
      b.picks[s] = [p[0], p[1]];
      if (b.seats.every((x, i) => b.picks[i] || isNpc(x))) { b.seats.forEach((x, i) => { if (!b.picks[i]) b.picks[i] = npcPicks(b, i); }); resolve(b, rnd); }
      return done();
    }
    if (a.t === 'cook') { // どっちを作る？
      if (b.phase !== 'cook' || !(b.choosing || []).includes(s)) throw new Error('いまは選べません');
      if (!cookable(b.fridge[s]).includes(a.r)) throw new Error('その料理は作れません');
      cookOne(b.fridge[s], a.r); const c = [a.r].concat(cookAll(b.fridge[s])); b.log.cooked[s] = c; b.made[s].push(...c); firstCook(b, s);
      b.choosing = b.choosing.filter(x => x !== s);
      if (!b.choosing.length) afterCook(b);
      return done();
    }
    if (a.t === 'throw') {
      if (b.phase !== 'fix' || !b.fixing.includes(s)) throw new Error('いまは出せません');
      const i = a.i; if (!(i >= 0 && i < b.fridge[s].length)) throw new Error('その材料はありません');
      b.thrown.push(b.fridge[s].splice(i, 1)[0]); if (b.st) b.st[s].th++;
      if (canFit(b.fridge[s])) b.fixing = b.fixing.filter(x => x !== s);
      if (!b.fixing.length) endTurn(b);
      return done();
    }
    throw new Error('できない操作です');
  }
  return { ING, RC, W, SEATS, TURNS, MARKET, FW, FH, make, act, isNpc, canFit, pack, cookAll, nearest, completes, recipesWith, npcPicks, score, ranking, order, cookable, needChoice, cookOne, titles, worst };
})();
