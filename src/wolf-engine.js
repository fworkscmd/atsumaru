/* ===== 人狼（短い版） ENGINE (pure; no DOM) ===== */
// 4〜8人、人間だけ。役：人狼・占い師・騎士・村人（6人以上は人狼2人と霊媒師）。司会はスマホがする
// 流れ：役の確認 → 1日目の夜（だれも襲われない。占いはできる）→ 朝 → 話し合い（3分。部屋主がのばせる）→ 投票 → 夕方（処刑の結果）→ 夜 → …
// 夜は全員がスマホをさわって「眠る」を押す（役がある人は行動してから）。だれが行動しているか、まわりにわからないように
const WLF = (() => {
  const ROLE = { wolf: '人狼', seer: '占い師', knight: '騎士', medium: '霊媒師', villager: '村人' };
  const TALK_MS = 180000, MORE_MS = 60000;
  const castFor = n => n >= 6 ? ['wolf', 'wolf', 'seer', 'knight', 'medium'] : ['wolf', 'seer', 'knight'];
  const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const alive = b => b.seats.filter(id => b.alive[id]);
  const freshNight = () => ({ bite: {}, see: null, guard: null, done: {} });
  function make(humans, host, rnd = Math.random, now = Date.now()) {
    const seats = humans.slice(0, 8), cast = castFor(seats.length); while (cast.length < seats.length) cast.push('villager'); shuffle(cast, rnd);
    const b = { seats, host, roles: {}, alive: {}, phase: 'role', day: 1, ok: {}, night: freshNight(), seen: {}, medium: [], votes: {}, runoff: null, endsAt: 0, killed: null, executed: null, seq: 0, last: null, result: null };
    seats.forEach((id, i) => { b.roles[id] = cast[i]; b.alive[id] = true; });
    return { v: 6, status: 'playing', game: 'werewolf', players: seats.slice(), b };
  }
  // 夜に、その人がしないといけない行動（終わっていれば null）
  function todo(b, id) {
    if (!b.alive[id] || b.phase !== 'night') return null;
    const r = b.roles[id], n = b.night;
    if (r === 'wolf' && b.day > 1 && !n.bite[id]) return 'bite';
    if (r === 'seer' && !n.see) return 'see';
    if (r === 'knight' && b.day > 1 && !n.guard) return 'guard';
    return null;
  }
  function winner(b) { const a = alive(b), w = a.filter(id => b.roles[id] === 'wolf').length; return !w ? 'village' : w >= a.length - w ? 'wolf' : null; }
  function finish(g, win) { g.status = 'over'; g.b.result = { win }; g.b.phase = 'over'; return g; }
  const mark = (b, last) => { b.seq++; b.last = { seq: b.seq, ...last }; };
  // 夜が明ける：人狼が選んだ人をおそう（騎士が守っていたら助かる）
  function dawn(g) {
    const b = g.b, n = b.night, picks = Object.values(n.bite), victim = picks.length ? picks[picks.length - 1] : null; // 人狼が2人なら、あとから選んだほう
    b.killed = victim && victim !== n.guard && b.alive[victim] ? victim : null; b.saved = !!victim && victim === n.guard;
    if (b.killed) b.alive[b.killed] = false;
    b.day++; b.phase = 'morning'; mark(b, { kind: 'morning', killed: b.killed });
    const w = winner(b); return w ? finish(g, w) : g;
  }
  function tally(g, now) {
    const b = g.b, cnt = {}; Object.values(b.votes).forEach(t => cnt[t] = (cnt[t] || 0) + 1);
    const top = Math.max(...Object.values(cnt)), tied = Object.keys(cnt).filter(t => cnt[t] === top);
    if (tied.length > 1 && !b.runoff) { b.runoff = tied; b.tally = cnt; b.votes = {}; mark(b, { kind: 'runoff', tied }); return g; } // 同じ票数なら、その人たちだけで決選投票
    b.executed = tied.length === 1 ? tied[0] : null; b.tally = cnt; b.runoff = null;
    if (b.executed) { b.alive[b.executed] = false; b.medium.push({ day: b.day, target: b.executed, wolf: b.roles[b.executed] === 'wolf' }); }
    b.phase = 'evening'; mark(b, { kind: 'evening', executed: b.executed });
    const w = winner(b); return w ? finish(g, w) : g;
  }
  function act(g0, id, a, rnd = Math.random, now = Date.now()) {
    if (g0.status !== 'playing') throw new Error('ゲームは終わっています');
    const g = JSON.parse(JSON.stringify(g0)), b = g.b, me = b.seats.includes(id), host = id === b.host, ph = b.phase;
    if (!me) throw new Error('このゲームには参加していません');
    const target = t => { if (!b.seats.includes(t) || !b.alive[t]) throw new Error('生きている人をえらんでください'); return t; };
    if (ph === 'role') { if (a.t !== 'ok') throw new Error('まず役をたしかめてください'); b.ok[id] = true; if (b.seats.every(x => b.ok[x])) { b.phase = 'night'; b.night = freshNight(); mark(b, { kind: 'night' }); } return g; }
    if (ph === 'night') {
      if (!b.alive[id]) throw new Error('もう退場しています');
      const r = b.roles[id], n = b.night;
      if (a.t === 'bite') { if (r !== 'wolf' || b.day === 1) throw new Error('いまはおそえません'); const t = target(a.target); if (b.roles[t] === 'wolf') throw new Error('仲間はおそえません'); n.bite[id] = t; return g; }
      if (a.t === 'see') { if (r !== 'seer' || n.see) throw new Error('今夜はもう占いました'); const t = target(a.target); if (t === id) throw new Error('自分は占えません'); n.see = t; (b.seen[id] = b.seen[id] || []).push({ day: b.day, target: t, wolf: b.roles[t] === 'wolf' }); return g; }
      if (a.t === 'guard') { if (r !== 'knight' || b.day === 1 || n.guard) throw new Error('今夜はもう守っています'); const t = target(a.target); if (t === id) throw new Error('自分は守れません'); n.guard = t; return g; }
      if (a.t === 'sleep') {
        const left = todo(b, id); if (left) throw new Error(left === 'bite' ? 'おそう人をえらんでください' : left === 'see' ? '占う人をえらんでください' : '守る人をえらんでください');
        n.done[id] = true; if (alive(b).every(x => n.done[x])) return dawn(g); return g;
      }
      throw new Error('いまは夜です');
    }
    if (ph === 'morning' || ph === 'evening') {
      if (a.t !== 'next' || !host) throw new Error('部屋主が次へ進めます');
      if (ph === 'morning') { b.phase = 'day'; b.endsAt = now + TALK_MS; b.votes = {}; b.executed = null; mark(b, { kind: 'day' }); }
      else { b.phase = 'night'; b.night = freshNight(); b.killed = null; b.saved = false; mark(b, { kind: 'night' }); }
      return g;
    }
    if (ph === 'day') {
      if (a.t === 'extend') { if (!host) throw new Error('のばせるのは部屋主です'); b.endsAt = Math.max(b.endsAt, now) + MORE_MS; mark(b, { kind: 'extend' }); return g; }
      if (a.t === 'tovote' || (a.t === 'tick' && now >= b.endsAt)) { if (a.t === 'tovote' && !host) throw new Error('部屋主が投票に進めます'); b.phase = 'vote'; b.votes = {}; b.runoff = null; mark(b, { kind: 'vote' }); return g; }
      if (a.t === 'tick') return g0;
      throw new Error('いまは話し合いの時間です');
    }
    if (ph === 'vote') {
      if (a.t !== 'vote') throw new Error('いまは投票の時間です');
      if (!b.alive[id]) throw new Error('もう退場しています');
      const t = target(a.target); if (t === id) throw new Error('自分には投票できません'); if (b.runoff && !b.runoff.includes(t)) throw new Error('決選投票の人からえらんでください');
      b.votes[id] = t; if (alive(b).every(x => b.votes[x])) return tally(g, now); return g;
    }
    throw new Error('知らない操作です');
  }
  return { ROLE, TALK_MS, castFor, make, act, todo, alive, winner };
})();
