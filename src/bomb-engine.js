/* ばくだんパスのルール（DOMなし）。導火線の残りは「持っていた時間」を手もとの端末で測って引く（端末の時計を比べない） */
const BMB = (() => {
  const SEATS = 8, MIN = 3, FUSE = [25000, 35000];
  const TOPICS = ['赤いもの', '丸いもの', '夏といえば', '冬といえば', '動物の名前', '果物の名前', '野菜の名前', '国の名前', '色の名前', '「あ」で始まる言葉', '「か」で始まる言葉', '「さ」で始まる言葉', '「た」で始まる言葉', '「ま」で始まる言葉', 'お寿司のネタ', 'コンビニにあるもの', '学校にあるもの', '台所にあるもの', '海にいるもの', '空にあるもの', '空を飛ぶもの', '甘いもの', 'からいもの', '冷たいもの', '四角いもの', '乗りもの', 'スポーツの名前', '楽器の名前', '都道府県', 'お菓子の名前', 'おにぎりの具', '朝ごはんに食べるもの', '黄色いもの', '長いもの', '小さいもの', '重いもの', '虫の名前', '鳥の名前', '花の名前', 'お祭りにあるもの'];
  const isNpc = id => /^npc\d/.test(id);
  const rint = (n, rnd) => Math.floor(rnd() * n);
  const fuse = rnd => FUSE[0] + rnd() * (FUSE[1] - FUSE[0]);
  // 回す順番は爆弾ごとにまぜる
  const mixed = (n, rnd) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = rint(i + 1, rnd); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function make(humans, rnd = Math.random) {
    const seats = humans.slice(0, SEATS); for (let i = 1; seats.length < MIN; i++) seats.push('npc' + i);
    const lives = seats.map(() => seats.length > 4 ? 2 : 3), holder = rint(seats.length, rnd);
    const b = { gid: rint(2 ** 31, rnd), seats, lives, holder, fuse: fuse(rnd), order: mixed(seats.length, rnd), topic: rint(TOPICS.length, rnd), phase: 'play', round: 1, seq: 0, passes: 0, lap: seats.length, last: null, result: null };
    return { v: 6, status: 'playing', game: 'bomb', players: humans.slice(0, SEATS), b };
  }
  const nextAlive = (b, s) => { const o = b.order, k = o.indexOf(s); for (let i = 1; i <= o.length; i++) { const n = o[(k + i) % o.length]; if (b.lives[n] > 0) return n; } return s; };
  function boom(g, s) {
    const b = g.b; b.lives[s]--; b.phase = 'boom'; b.last = { kind: 'boom', s, passes: b.passes }; b.seq++;
    const left = b.lives.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
    if (left.length <= 1) { g.status = 'over'; b.result = { win: left[0] != null ? left[0] : s }; }
    return g;
  }
  function act(g0, id, a, rnd = Math.random) {
    const g = JSON.parse(JSON.stringify(g0)), b = g.b, s = b.seats.indexOf(id);
    if (g.status !== 'playing') throw new Error('ゲームは終わっています');
    if (a.t === 'next') {
      if (b.phase !== 'boom') throw new Error('まだ爆発していません');
      b.round++; b.phase = 'play'; b.fuse = fuse(rnd); b.passes = 0; b.lap = b.lives.filter(v => v > 0).length; b.topic = rint(TOPICS.length, rnd); b.order = mixed(b.seats.length, rnd); const alive = b.order.filter(i => b.lives[i] > 0); b.holder = alive[rint(alive.length, rnd)]; b.seq++;
      return g;
    }
    if (b.phase !== 'play') throw new Error('いまは渡せません');
    if (a.t === 'force') return boom(g, b.holder); // 持っている人の通信が切れたとき
    if (s !== b.holder) throw new Error('爆弾を持っていません');
    if (a.t === 'boom') return boom(g, s);
    if (a.t === 'pass') {
      b.fuse -= Math.max(0, a.used || 0);
      if (b.fuse <= 0) return boom(g, s);
      b.holder = nextAlive(b, s); b.passes++; b.topic = rint(TOPICS.length, rnd); b.last = { kind: 'pass', s }; b.seq++;
      return g;
    }
    throw new Error('できない操作です');
  }
  // 1周目（生きている全員に1回ずつ回るまで）は残り時間が見える
  const shown = b => b.passes < b.lap;
  return { TOPICS, make, act, isNpc, nextAlive, shown };
})();
