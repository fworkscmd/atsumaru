/* ===== ドワーフ：深掘りチキンレース ENGINE (pure; no DOM) ===== */
const EXPEDITIONS = 5;
const LIMIT_MS = 45000;
const NPC = 'npc';
const cur = g => g.phase; // 互換用（使わない）
const clone = g => JSON.parse(JSON.stringify(g));

// 深さごとのマグマ率（熱さメーター）と、鉱石の量
const magmaRate = depth => Math.min(0.6, 0.04 * depth);
function oreAt(depth, rnd) { return Math.max(1, Math.round((2 + depth * 1.5) * (0.6 + rnd() * 0.8))); }
// 大鉱脈（鉱石3倍）の出やすさ：探検を重ねるほど上がる
const JACKPOT = [0.04, 0.07, 0.11, 0.16, 0.24];
const jackpotRate = exp => JACKPOT[Math.min(JACKPOT.length, Math.max(1, exp)) - 1];
// 次に掘る段の結果を前もって決めておく（レーダーで見るため）
function planNext(g, rnd) {
  const d = g.depth + 1;
  const fork = d >= 3 && !g.forkAt && rnd() < 0.22 ? true : (g.forkAt === d);
  const one = () => { const jp = rnd() < jackpotRate(g.exp); return { magma: rnd() < magmaRate(d), ore: oreAt(d, rnd) * (jp ? 3 : 1), jackpot: jp }; };
  g.next = fork ? { fork: true, left: one(), right: one() } : { fork: false, main: one() };
  if (fork) g.forkAt = d;
}
function addLog(g, text) { g.log = (g.log || []).concat(text).slice(-6); }

function newGame(humans, rnd = Math.random, now = Date.now()) {
  const players = humans.slice(0, 4); if (players.length < 2) players.push(NPC);
  const g = { v: 6, status: 'playing', players, bank: {}, radar: {}, gone: {}, exp: 0, log: [], history: [], startedAt: now };
  players.forEach(id => { g.bank[id] = 0; g.radar[id] = 1; });
  return startExpedition(g, rnd, now);
}
function startExpedition(g, rnd, now) {
  g.exp++; g.depth = 0; g.pot = 0; g.forkAt = 0; g.phase = 'choose'; g.lastAt = now;
  g.inside = g.players.filter(id => !g.gone[id]);
  g.bag = {}; g.inside.forEach(id => g.bag[id] = 0);
  g.choice = {}; g.radarSeen = {}; g.reveal = null; g.out = {};
  planNext(g, rnd);
  addLog(g, `${g.exp}回目の探検に出発！`);
  return g;
}
const needChoice = g => g.inside.filter(id => !g.gone[id]);
const allChosen = g => needChoice(g).every(id => g.choice[id]);
const options = g => g.next.fork ? ['left', 'right', 'back'] : ['go', 'back'];

function act(g0, id, a, rnd = Math.random, now = Date.now()) {
  if (g0.status !== 'playing') throw new Error('ゲームは終わっています');
  const g = clone(g0);
  if (a.t === 'next') { if (g.phase !== 'summary') throw new Error('まだ探検中です'); return g.exp >= EXPEDITIONS ? finish(g) : startExpedition(g, rnd, now); }
  if (a.t === 'timeout') {
    needChoice(g).forEach(p => { if (!g.choice[p]) { g.choice[p] = 'back'; g.gone[p] = true; addLog(g, '応答がない人は帰還扱いになった'); } });
    return resolve(g, rnd, now);
  }
  if (g.phase !== 'choose') throw new Error('今は選べません');
  if (!g.inside.includes(id)) throw new Error('坑道の中にいません');
  if (a.t === 'radar') {
    if (!g.radar[id]) throw new Error('レーダーはもう使いました');
    g.radar[id] = 0; g.radarSeen[id] = g.depth + 1;
    return g;
  }
  if (a.t === 'choose') {
    if (!options(g).includes(a.c)) throw new Error('その道は選べません');
    g.choice[id] = a.c; g.lastAt = now;
    return g;
  }
  throw new Error('知らない操作です');
}
// 全員の選択がそろったら一斉に公開して、掘る
function resolve(g, rnd = Math.random, now = Date.now()) {
  if (g.phase !== 'choose' || !allChosen(g)) return g;
  const picks = { ...g.choice }, leavers = g.inside.filter(p => picks[p] === 'back'), stay = g.inside.filter(p => picks[p] !== 'back');
  const rv = { depth: g.depth + 1, picks, leavers, fork: g.next.fork, sides: {}, potTaken: 0 };
  // 帰る人：リュックを換金し、床に残った鉱石を山分け
  if (leavers.length) {
    const share = Math.floor(g.pot / leavers.length); rv.potTaken = share;
    g.pot -= share * leavers.length;
    leavers.forEach(p => { g.bank[p] += g.bag[p] + share; g.out[p] = { result: 'home', got: g.bag[p] + share, depth: g.depth }; g.bag[p] = 0; });
  }
  g.inside = stay;
  if (!stay.length) { rv.end = 'allhome'; g.reveal = rv; return endExpedition(g, now); }
  g.depth++;
  const sides = g.next.fork ? { left: stay.filter(p => picks[p] === 'left'), right: stay.filter(p => picks[p] === 'right') } : { main: stay };
  for (const s in sides) {
    const who = sides[s]; if (!who.length) continue;
    const r = g.next[s];
    if (r.magma) {
      who.forEach(p => { g.out[p] = { result: 'magma', lost: g.bag[p], depth: g.depth }; g.bag[p] = 0; });
      g.inside = g.inside.filter(p => !who.includes(p));
      rv.sides[s] = { who, magma: true };
      addLog(g, `深さ${g.depth}でマグマ！ ${who.length}人が稼ぎを失った`);
    } else {
      const each = Math.floor(r.ore / who.length); who.forEach(p => g.bag[p] += each); g.pot += r.ore - each * who.length;
      rv.sides[s] = { who, magma: false, ore: r.ore, each, jackpot: !!r.jackpot };
      if (r.jackpot) addLog(g, `深さ${g.depth}で大鉱脈！ 鉱石${r.ore}個`);
    }
  }
  g.reveal = rv;
  g.choice = {}; g.radarSeen = {};
  if (!g.inside.length) { rv.end = 'magma'; return endExpedition(g, now); }
  g.lastAt = now;
  planNext(g, rnd);
  return g;
}
function endExpedition(g, now) {
  g.phase = 'summary'; g.lastAt = now; g.choice = {};
  g.history = (g.history || []).concat({ exp: g.exp, depth: g.depth, out: g.out });
  return g;
}
function finish(g) { g.status = 'over'; g.phase = 'over'; return g; }
const score = (g, id) => g.bank[id] || 0;

/* ---- ゴーレム（NPC）の考え方 ---- */
function npcChoice(g, rnd = Math.random) {
  const id = NPC, bag = g.bag[id] || 0, d = g.depth + 1, p = magmaRate(d);
  const n = Math.max(1, g.inside.length), gain = (2 + d * 1.5) / n;
  if (g.radarSeen[id] === d) {
    const danger = g.next.fork ? null : g.next.main.magma;
    if (danger === true) return { t: 'choose', c: 'back' };
    if (danger === false) return { t: 'choose', c: 'go' };
  }
  if (g.radar[id] && bag >= 8 && p > .15 && !g.next.fork) return { t: 'radar' };
  const risk = p * (bag + gain), reward = (1 - p) * gain;
  const back = bag > 0 && (risk > reward * 1.1 || (g.exp === EXPEDITIONS && bag >= 12 && rnd() < .5));
  if (back) return { t: 'choose', c: 'back' };
  if (g.next.fork) return { t: 'choose', c: rnd() < .5 ? 'left' : 'right' };
  return { t: 'choose', c: 'go' };
}
/* ===== END ENGINE ===== */
