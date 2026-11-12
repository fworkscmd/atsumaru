/* ボクシングのルール（DOMなし）。勝ち抜きのトーナメント
   1試合は2人。毎ラウンド、こっそり「攻撃の方向」と「ガードの方向」を右・左・下から1つずつ選び、いっせいに見せる
   攻撃した方向を相手がガードしていなければ当たり。4回連続で当てたらKO勝ち。8ラウンドで決まらなければ当たった数で判定、同じならサドンデス
   トーナメント：人が4人までなら4人、5人からは8人の山。足りない席はコンピュータ（ひとりでもコンピュータ3人と戦う） */
const BOX = (() => {
  const DIRS = ['right', 'left', 'body'], DIR_N = { right: '右', left: '左', body: '下' };
  const ROUNDS = 8, KO = 4, MAX = 8, CHEERS = ['ナイス！', 'いけー', 'おしい', 'がんばれ'];
  const rint = (n, rnd) => Math.floor(rnd() * n);
  const isNpc = id => /^npc\d/.test(id);
  const npcPick = (rnd = Math.random) => ({ atk: DIRS[rint(3, rnd)], grd: DIRS[rint(3, rnd)] });
  const mix = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1, rnd); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const newMatch = (seats) => ({ seats, round: 1, picks: [null, null], hits: [0, 0], streak: [0, 0], log: [], sudden: false, result: null });
  // 1試合：2人とも選んだら結果を出す。終わったら m.result = { win: 0|1, how }
  function resolve(m) {
    const [p0, p1] = m.picks, hit = [p0.atk !== p1.grd, p1.atk !== p0.grd];
    hit.forEach((h, i) => { if (h) { m.hits[i]++; m.streak[i]++; } else m.streak[i] = 0; });
    m.log.push({ round: m.round, picks: [p0, p1], hit, sudden: m.sudden }); m.picks = [null, null];
    const ko = m.streak.map(s => s >= KO);
    if (ko[0] && ko[1]) { m.streak = [0, 0]; m.sudden = true; m.round++; return; } // 両者ダウン：サドンデスへ
    if (ko[0] || ko[1]) { m.result = { win: ko[0] ? 0 : 1, how: 'ko' }; return; }
    if (m.sudden) { if (hit[0] !== hit[1]) m.result = { win: hit[0] ? 0 : 1, how: 'sudden' }; else m.round++; return; }
    if (m.round >= ROUNDS) { if (m.hits[0] !== m.hits[1]) m.result = { win: m.hits[0] > m.hits[1] ? 0 : 1, how: 'points' }; else { m.sudden = true; m.round++; } return; }
    m.round++;
  }
  function simulate(m, rnd) { let n = 0; while (!m.result && n++ < 500) { m.picks = [npcPick(rnd), npcPick(rnd)]; resolve(m); } if (!m.result) m.result = { win: rint(2, rnd), how: 'sudden' }; return m; }
  // 人が別々の山に入るように並べる（なるべく決勝で会えるように）
  function seed(humans, size, rnd) {
    const hs = mix(humans, rnd), slots = Array(size).fill(null), order = size === 4 ? [0, 2, 1, 3] : [0, 4, 2, 6, 1, 5, 3, 7];
    hs.forEach((h, i) => slots[order[i]] = h);
    let k = 1; return slots.map(s => s || 'npc' + (k++));
  }
  function make(humans, rnd = Math.random) {
    const hs = humans.slice(0, MAX), size = hs.length > 4 ? 8 : 4, entrants = seed(hs, size, rnd);
    const b = { gid: rint(2 ** 31, rnd), entrants, size, tier: 0, alive: entrants.slice(), games: [], mi: 0, m: null, phase: 'pick', champion: null, seq: 0 };
    const g = { v: 6, status: 'playing', game: 'boxing', players: hs, b };
    startNext(g, rnd); return g;
  }
  // 次の試合へ。コンピュータどうしの試合はその場で決める（結果は games に残る）
  function startNext(g, rnd) {
    const b = g.b;
    for (;;) {
      const pairs = b.alive.length / 2;
      if (b.mi >= pairs) { // この回戦が終わった：勝った人で次の回戦
        b.alive = b.games.filter(x => x.tier === b.tier).map(x => x.seats[x.result.win]); b.tier++; b.mi = 0;
        if (b.alive.length === 1) { b.champion = b.alive[0]; b.m = null; b.phase = 'over'; g.status = 'over'; return g; }
        continue;
      }
      const seats = [b.alive[b.mi * 2], b.alive[b.mi * 2 + 1]];
      if (isNpc(seats[0]) && isNpc(seats[1])) { const m = simulate(newMatch(seats), rnd); b.games.push({ tier: b.tier, seats, result: m.result, hits: m.hits, rounds: m.log.length, auto: true }); b.mi++; continue; }
      b.m = newMatch(seats); b.phase = 'pick'; return g;
    }
  }
  function act(g0, id, a, rnd = Math.random) {
    const g = JSON.parse(JSON.stringify(g0)), b = g.b, m = b.m;
    if (g.status !== 'playing') throw new Error('トーナメントは終わっています');
    if (a.t === 'next') {
      if (b.phase !== 'matchover') throw new Error('まだ試合中です');
      b.games.push({ tier: b.tier, seats: m.seats, result: m.result, hits: m.hits, rounds: m.log.length });
      b.mi++; startNext(g, rnd); b.seq++; return g;
    }
    // 声援：だれでも（リングにいない人も）。数字 n で新しい声援を見分ける。最後の6つだけ残す
    if (a.t === 'cheer') {
      if (!CHEERS.includes(a.w)) throw new Error('その声援はありません');
      b.cn = (b.cn || 0) + 1; b.cheers = (b.cheers || []).concat({ id, w: a.w, n: b.cn }).slice(-6); return g;
    }
    // 待たずに進める（部屋主）：まだ選んでいない人の分を、でたらめに選んで進める
    if (a.t === 'force') {
      if (b.phase !== 'pick' || !m) throw new Error('いまは進められません');
      for (let i = 0; i < 2; i++) if (!m.picks[i]) m.picks[i] = npcPick(rnd);
      resolve(m); if (m.result) b.phase = 'matchover'; b.seq++; return g;
    }
    const s = m ? m.seats.indexOf(id) : -1;
    if (b.phase !== 'pick' || s < 0) throw new Error('いまはリングにいません');
    if (a.t === 'pick') {
      if (!DIRS.includes(a.atk) || !DIRS.includes(a.grd)) throw new Error('方向を選んでください');
      if (m.picks[s]) throw new Error('もう選びました');
      m.picks[s] = { atk: a.atk, grd: a.grd };
      const o = 1 - s; if (!m.picks[o] && isNpc(m.seats[o])) m.picks[o] = npcPick(rnd);
      if (m.picks[0] && m.picks[1]) { resolve(m); if (m.result) b.phase = 'matchover'; }
      b.seq++; return g;
    }
    if (a.t === 'resign') { m.result = { win: 1 - s, how: 'resign' }; b.phase = 'matchover'; b.seq++; return g; }
    throw new Error('できない操作です');
  }
  const tierName = (b, t) => { const n = b.size >> t; return n === 2 ? '決勝' : n === 4 ? '準決勝' : '1回戦'; };
  return { DIRS, DIR_N, ROUNDS, KO, CHEERS, make, act, npcPick, isNpc, tierName, resolve, newMatch };
})();
