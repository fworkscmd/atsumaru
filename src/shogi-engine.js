/* ===== 将棋 ENGINE (pure; no DOM) ===== */
// 盤は81文字（先手は大文字、後手は小文字、'.' 空き）。0番が後手側の左上（9一）、80番が先手側の右下（1九）。席0が先手
// 駒：K玉 R飛 B角 G金 S銀 N桂 L香 P歩／成り駒：D竜 H馬 Z成銀 M成桂 Y成香 Tと。hand：[先手の持ち駒, 後手の持ち駒]
const SHG = (() => {
  const PRO = { R: 'D', B: 'H', S: 'Z', N: 'M', L: 'Y', P: 'T' }, BASE = { D: 'R', H: 'B', Z: 'S', M: 'N', Y: 'L', T: 'P' };
  const K8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const RO = [[-1, 0], [1, 0], [0, -1], [0, 1]], BI = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const GOLD = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]];
  // 先手から見た動き（-1が前）。後手は上下を逆にする
  const STEP = { K: K8, G: GOLD, Z: GOLD, M: GOLD, Y: GOLD, T: GOLD, S: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]], N: [[-2, -1], [-2, 1]], P: [[-1, 0]], D: BI, H: RO };
  const SLIDE = { R: RO, D: RO, B: BI, H: BI, L: [[-1, 0]] };
  const HAND = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];
  const on = (r, c) => r >= 0 && r < 9 && c >= 0 && c < 9;
  const side = p => p === '.' ? -1 : p < 'a' ? 0 : 1;
  const own = (s, t) => s === 0 ? t : t.toLowerCase();
  const rowOf = i => (i / 9) | 0;
  // i の駒が利いているマス
  function targets(bd, i) {
    const p = bd[i], s = side(p), t = p.toUpperCase(), r = rowOf(i), c = i % 9, k = s === 0 ? 1 : -1, out = [];
    for (const [dr, dc] of STEP[t] || []) { const rr = r + dr * k, cc = c + dc; if (on(rr, cc) && side(bd[rr * 9 + cc]) !== s) out.push(rr * 9 + cc); }
    for (const [dr, dc] of SLIDE[t] || []) {
      let rr = r + dr * k, cc = c + dc;
      while (on(rr, cc)) { const x = bd[rr * 9 + cc]; if (side(x) === s) break; out.push(rr * 9 + cc); if (x !== '.') break; rr += dr * k; cc += dc; }
    }
    return out;
  }
  function attacked(bd, sq, by) {
    if (sq < 0) return false;
    for (let i = 0; i < 81; i++) if (side(bd[i]) === by && targets(bd, i).includes(sq)) return true;
    return false;
  }
  const kingAt = (bd, s) => bd.indexOf(own(s, 'K'));
  const zone = (s, r) => s === 0 ? r <= 2 : r >= 6;
  // 行き場のない駒（そこに着くと二度と動けない）
  const deadEnd = (s, t, r) => { const f = s === 0 ? r : 8 - r; return ((t === 'P' || t === 'L') && f === 0) || (t === 'N' && f <= 1); };
  function pseudo(b) {
    const s = b.turn, bd = b.bd, out = [];
    for (let i = 0; i < 81; i++) {
      if (side(bd[i]) !== s) continue;
      const t = bd[i].toUpperCase();
      for (const to of targets(bd, i)) {
        if (PRO[t] && (zone(s, rowOf(i)) || zone(s, rowOf(to)))) out.push({ f: i, t: to, pr: true });
        if (!deadEnd(s, t, rowOf(to))) out.push({ f: i, t: to });
      }
    }
    const hand = b.hand[s], pawnCols = new Set();
    for (let i = 0; i < 81; i++) if (bd[i] === own(s, 'P')) pawnCols.add(i % 9);
    for (const t of HAND) {
      if (!hand[t]) continue;
      for (let to = 0; to < 81; to++) {
        if (bd[to] !== '.' || deadEnd(s, t, rowOf(to))) continue;
        if (t === 'P' && pawnCols.has(to % 9)) continue; // 二歩
        out.push({ d: t, t: to });
      }
    }
    return out;
  }
  function apply(b, m) {
    const bd = b.bd.split(''), s = b.turn, hand = b.hand.map(x => ({ ...x }));
    let cap = null;
    if (m.d) { bd[m.t] = own(s, m.d); hand[s][m.d]--; }
    else {
      if (bd[m.t] !== '.') { cap = bd[m.t].toUpperCase(); const k = BASE[cap] || cap; hand[s][k] = (hand[s][k] || 0) + 1; }
      const t = bd[m.f].toUpperCase(); bd[m.t] = own(s, m.pr ? PRO[t] : t); bd[m.f] = '.';
    }
    b.bd = bd.join(''); b.hand = hand; b.turn = 1 - s;
    return { cap };
  }
  function legal(b, noUchi) {
    const s = b.turn;
    return pseudo(b).filter(m => {
      const n = { bd: b.bd, hand: b.hand, turn: s }; apply(n, m);
      if (attacked(n.bd, kingAt(n.bd, s), 1 - s)) return false;
      // 打ち歩詰め：歩を打って王手をかけ、相手に逃げ道がないなら打てない
      if (!noUchi && m.d === 'P' && kingAt(n.bd, 1 - s) === m.t + (s === 0 ? -9 : 9) && !legal(n, true).length) return false;
      return true;
    });
  }
  const check = b => attacked(b.bd, kingAt(b.bd, b.turn), 1 - b.turn);
  const key = b => b.bd + b.turn + b.hand.map(x => HAND.map(t => x[t] || 0).join('')).join('');
  const emptyHand = () => Object.fromEntries(HAND.map(t => [t, 0]));
  // NPC：1手指してみて、駒の損得＋相手のいちばん得な取りを引いて選ぶ。王手のときだけ詰んでいるか調べる
  const VAL = { P: 1, L: 3, N: 4, S: 5, G: 6, B: 8, R: 10, T: 6, Y: 6, M: 6, Z: 6, H: 10, D: 12, K: 0 };
  function score(b, s) {
    let v = 0;
    for (let i = 0; i < 81; i++) {
      const p = b.bd[i]; if (p === '.') continue;
      const t = p.toUpperCase(), q = side(p), adv = q === 0 ? 8 - rowOf(i) : rowOf(i);
      v += (VAL[t] + (t !== 'K' && t !== 'R' && t !== 'B' ? .03 * adv : 0)) * (q === s ? 1 : -1);
    }
    for (const t of HAND) v += 1.1 * VAL[t] * ((b.hand[s][t] || 0) - (b.hand[1 - s][t] || 0));
    return v;
  }
  function npc(b, rnd = Math.random) {
    const s = b.turn; let best = null, bv = -Infinity;
    for (const m of legal(b)) {
      const n = { bd: b.bd, hand: b.hand, turn: s }; apply(n, m);
      const chk = attacked(n.bd, kingAt(n.bd, 1 - s), s);
      let v = score(n, s);
      if (chk && !legal(n, true).length) v = 1e6;
      else {
        let worst = 0;
        for (let i = 0; i < 81; i++) {
          if (side(n.bd[i]) !== 1 - s) continue;
          for (const t of targets(n.bd, i)) {
            const cap = n.bd[t]; if (cap === '.' || side(cap) !== s) continue;
            const ct = cap.toUpperCase(); if (ct === 'K') continue;
            const gain = VAL[ct] + 1.1 * VAL[BASE[ct] || ct] - (attacked(n.bd, t, s) ? 2.1 * VAL[n.bd[i].toUpperCase()] : 0);
            worst = Math.max(worst, gain);
          }
        }
        v -= worst;
        if (chk) v += .3;
        if (m.d) v -= .2; // 持ち駒はむやみに打たない
      }
      v += rnd() * .3;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  return {
    npc,
    LABEL: ['先手', '後手'], HAND, PRO, BASE, side, kingAt,
    init() {
      const b = { bd: 'lnsgkgsnl' + '.r.....b.' + 'ppppppppp' + '.'.repeat(27) + 'PPPPPPPPP' + '.B.....R.' + 'LNSGKGSNL', hand: [emptyHand(), emptyHand()], turn: 0 };
      return { bd: b.bd, hand: b.hand, hist: [key(b)] };
    },
    moves: b => legal(b), check,
    play(b, m) {
      const info = apply(b, m);
      b.hist = (b.hist || []).concat(key(b));
      if (check(b)) info.check = true;
      return info;
    },
    over(b) {
      if (!legal(b).length) return { win: 1 - b.turn, why: 'mate' };
      const k = key(b); if (b.hist.filter(x => x === k).length >= 4) return { win: null, why: 'repeat' }; // 千日手
      return null;
    },
    perft(b, d) { if (!d) return 1; let n = 0; for (const m of legal(b)) { const c = { ...b }; apply(c, m); n += SHG.perft(c, d - 1); } return n; },
  };
})();
