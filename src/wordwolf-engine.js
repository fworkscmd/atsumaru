/* ワードウルフのルール（DOMなし）。3〜8人、人間だけ。お題 → 話し合い → 投票 → 開票 → 正体 →（当たったら）ウルフの逆転 */
const WW = (() => {
  const MIN = 3, MAX = 8, TALK = 180000, MORE = 60000;
  // [a, b, c, d]：a と b が配るお題（どちらが多い側かはランダム）。c と d は逆転のときの選択肢
  const WORDS = [
    ['うどん', 'そば', 'ラーメン', 'パスタ'], ['いぬ', 'ねこ', 'うさぎ', 'ハムスター'], ['海', 'プール', '川', '温泉'], ['夏', '冬', '春', '秋'], ['りんご', 'なし', 'もも', 'かき'],
    ['いちご', 'さくらんぼ', 'ぶどう', 'みかん'], ['カレー', 'シチュー', 'ハヤシライス', 'グラタン'], ['ハンバーガー', 'サンドイッチ', 'ホットドッグ', 'おにぎり'], ['すし', 'さしみ', '天ぷら', 'うなぎ'], ['たこ焼き', 'お好み焼き', 'もんじゃ焼き', 'やきそば'],
    ['コーヒー', '紅茶', '緑茶', 'ココア'], ['ケーキ', 'プリン', 'ゼリー', 'パフェ'], ['アイス', 'かき氷', 'シャーベット', 'ソフトクリーム'], ['チョコ', 'クッキー', 'キャンディ', 'ガム'], ['バス', '電車', 'タクシー', '飛行機'],
    ['自転車', 'バイク', 'スケボー', '一輪車'], ['サッカー', '野球', 'バスケ', 'テニス'], ['スキー', 'スノボ', 'スケート', 'そり'], ['ピアノ', 'ギター', 'バイオリン', 'ドラム'], ['えんぴつ', 'ボールペン', 'クレヨン', 'マーカー'],
    ['学校', '塾', '図書館', '保育園'], ['病院', '歯医者', '薬局', '保健室'], ['映画館', '水族館', '動物園', '美術館'], ['遊園地', 'ゲームセンター', 'カラオケ', 'ボウリング'], ['コンビニ', 'スーパー', 'デパート', '八百屋'],
    ['山', '森', '草原', '砂漠'], ['雨', '雪', 'くもり', '台風'], ['太陽', '月', '星', '虹'], ['朝', '夜', '昼', '夕方'], ['クリスマス', 'お正月', 'ハロウィン', 'バレンタイン'],
    ['お花見', '花火大会', '紅葉がり', '初もうで'], ['スマホ', 'パソコン', 'テレビ', 'ゲーム機'], ['まくら', 'ふとん', '毛布', 'パジャマ'], ['シャンプー', 'せっけん', '歯みがき粉', 'タオル'], ['ぼうし', 'マフラー', '手ぶくろ', 'サングラス'],
    ['スニーカー', 'サンダル', '長ぐつ', 'ブーツ'], ['ライオン', 'トラ', 'ヒョウ', 'チーター'], ['ゾウ', 'キリン', 'カバ', 'サイ'], ['イルカ', 'クジラ', 'シャチ', 'アザラシ'], ['ペンギン', 'フラミンゴ', 'ダチョウ', 'クジャク'],
    ['カブトムシ', 'クワガタ', 'セミ', 'バッタ'], ['たまご焼き', '目玉焼き', 'ゆでたまご', 'オムレツ'], ['からあげ', 'とんかつ', 'エビフライ', 'コロッケ'], ['にんじん', 'だいこん', 'ごぼう', 'かぶ'], ['トマト', 'きゅうり', 'なす', 'ピーマン'],
  ];
  const rint = (n, rnd) => Math.floor(rnd() * n);
  const mix = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1, rnd); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function make(humans, rnd = Math.random) {
    const seats = humans.slice(0, MAX), w = WORDS[rint(WORDS.length, rnd)], flip = rnd() < .5;
    const maj = w[flip ? 1 : 0], min = w[flip ? 0 : 1];
    const b = { gid: rint(2 ** 31, rnd), seats, wolf: rint(seats.length, rnd), maj, min, opts: mix([maj, w[2], w[3]], rnd), phase: 'words', seen: seats.map(() => 0), talk: TALK, votes: seats.map(() => -1), cand: null, runoff: 0, tally: null, top: [], accused: -1, result: null, seq: 0 };
    return { v: 6, status: 'playing', game: 'wordwolf', players: seats.slice(), b };
  }
  function finish(g, win, why, guess) { g.status = 'over'; g.b.phase = 'over'; g.b.result = { win, why, guess: guess == null ? null : guess }; g.b.seq++; return g; }
  function count(g) {
    const b = g.b, tally = b.seats.map(() => 0); b.votes.forEach(v => { if (v >= 0) tally[v]++; });
    const max = Math.max(...tally); b.tally = tally; b.top = max > 0 ? tally.map((v, i) => v === max ? i : -1).filter(i => i >= 0) : [];
    b.phase = 'open'; b.seq++; return g;
  }
  function act(g0, id, a) {
    const g = JSON.parse(JSON.stringify(g0)), b = g.b, s = b.seats.indexOf(id);
    if (g.status !== 'playing') throw new Error('ゲームは終わっています');
    switch (a.t) {
      case 'seen':
        if (b.phase !== 'words' || s < 0) throw new Error('いまは たしかめられません');
        b.seen[s] = 1; if (b.seen.every(Boolean)) b.phase = 'talk'; b.seq++; return g;
      case 'more':
        if (b.phase !== 'talk') throw new Error('話し合いは おわっています');
        b.talk += MORE; b.seq++; return g;
      case 'vote':
        if (b.phase !== 'talk') throw new Error('話し合いは おわっています');
        b.phase = 'vote'; b.seq++; return g;
      case 'cast': {
        if (b.phase !== 'vote' || s < 0) throw new Error('いまは 投票できません');
        if (a.to === s || !b.seats[a.to] || (b.cand && !b.cand.includes(a.to))) throw new Error('その人には 投票できません');
        if (b.votes[s] >= 0) throw new Error('もう 投票しました');
        b.votes[s] = a.to; b.seq++;
        return b.votes.every(v => v >= 0) ? count(g) : g;
      }
      case 'force': // 通信が切れた人がいるときに、部屋主が先へ進める
        if (b.phase === 'words') { b.phase = 'talk'; b.seq++; return g; }
        if (b.phase === 'vote') return count(g);
        if (b.phase === 'guess') return finish(g, 'sheep', 'caught');
        throw new Error('いまは 進められません');
      case 'next':
        if (b.phase === 'open') {
          if (b.top.length === 1) { b.accused = b.top[0]; b.phase = 'who'; b.seq++; return g; }
          if (b.top.length > 1 && !b.runoff) { b.runoff = 1; b.cand = b.top.slice(); b.votes = b.seats.map(() => -1); b.tally = null; b.top = []; b.phase = 'vote'; b.seq++; return g; }
          return finish(g, 'wolf', 'tie'); // 決選投票でも同じ票数
        }
        if (b.phase === 'who') { if (b.accused !== b.wolf) return finish(g, 'wolf', 'miss'); b.phase = 'guess'; b.seq++; return g; }
        throw new Error('いまは 進められません');
      case 'guess':
        if (b.phase !== 'guess' || s !== b.wolf) throw new Error('オオカミだけが 答えられます');
        return a.w === b.maj ? finish(g, 'wolf', 'guess', a.w) : finish(g, 'sheep', 'caught', a.w);
    }
    throw new Error('できない操作です');
  }
  return { MIN, MAX, TALK, WORDS, make, act };
})();
