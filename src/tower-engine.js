/* ぐらぐらタワーのルール（DOMなし）。物理は番の人の端末が計算して、積み終わった位置だけをここへ渡す */
const TWR = (() => {
  const SEATS = 8, MIN = 3;
  const WORLDS = {
    house: { n: '引っ越しの家具', ids: ['sofa', 'fridge', 'table', 'tv', 'tansu', 'plant', 'bath', 'chair', 'wash'] },
    site: { n: '工事現場', ids: ['beam', 'beam2', 'conc', 'pipes', 'drum', 'crate'] },
    art: { n: '美術品', ids: ['vase', 'bust', 'frame', 'gold', 'urn'] },
  };
  const WK = Object.keys(WORLDS);
  const isNpc = id => /^npc\d/.test(id);
  const rint = (n, rnd) => Math.floor(rnd() * n);
  const nextAlive = (b, s) => { for (let i = 1; i <= b.seats.length; i++) { const n = (s + i) % b.seats.length; if (b.lives[n] > 0) return n; } return s; };
  const nextPiece = (b, rnd) => { const ids = WORLDS[b.world].ids; b.cur = ids[rint(ids.length, rnd)]; };
  function make(humans, rnd = Math.random) {
    const seats = humans.slice(0, SEATS); for (let i = 1; seats.length < MIN; i++) seats.push('npc' + i);
    const b = { gid: rint(2 ** 31, rnd), seats, lives: seats.map(() => seats.length > 4 ? 2 : 3), turn: rint(seats.length, rnd), world: WK[rint(WK.length, rnd)], cur: null, pieces: [], phase: 'play', tower: 1, seq: 0, last: null, result: null };
    nextPiece(b, rnd);
    return { v: 6, status: 'playing', game: 'tower', players: humans.slice(0, SEATS), b };
  }
  function act(g0, id, a, rnd = Math.random) {
    const g = JSON.parse(JSON.stringify(g0)), b = g.b, s = b.seats.indexOf(id);
    if (g.status !== 'playing') throw new Error('ゲームは終わっています');
    if (a.t === 'next') {
      if (b.phase !== 'crash') throw new Error('まだくずれていません');
      const others = WK.filter(k => k !== b.world); b.world = others[rint(others.length, rnd)];
      const alive = b.lives.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
      b.pieces = []; b.phase = 'play'; b.tower++; b.turn = alive[rint(alive.length, rnd)]; b.last = null; b.seq++; nextPiece(b, rnd);
      return g;
    }
    if (b.phase !== 'play') throw new Error('いまは積めません');
    if (a.t === 'skip') { b.turn = nextAlive(b, b.turn); b.seq++; return g; } // 番の人の通信が切れたとき
    if (s !== b.turn) throw new Error('いまはほかの人の番です');
    if (a.t !== 'drop') throw new Error('できない操作です');
    const was = b.cur; b.last = { kind: a.fell ? 'crash' : 'drop', s, id: was, x: a.x, from: b.pieces }; b.seq++;
    if (a.fell) {
      b.lives[s]--; b.phase = 'crash';
      const left = b.lives.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
      if (left.length <= 1) { g.status = 'over'; b.result = { win: left[0] != null ? left[0] : s, height: a.height || 0 }; }
      return g;
    }
    b.pieces = a.pieces || []; b.turn = nextAlive(b, s); nextPiece(b, rnd);
    return g;
  }
  return { WORLDS, make, act, isNpc, nextAlive };
})();
