/* ===== チェス ENGINE (pure; no DOM) ===== */
// 盤は64文字（白は大文字 KQRBNP、黒は小文字、'.' 空き）。0番が a8、63番が h1。席0が白で先手
// cr：キャスリングできる権利（KQkq）、ep：アンパッサンで取れるマス、hm：50手ルールの手数
const CHS = (() => {
  const NN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const K8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const RO = [[-1, 0], [1, 0], [0, -1], [0, 1]], BI = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const side = p => p === '.' ? -1 : p < 'a' ? 0 : 1;
  const own = (s, t) => s === 0 ? t : t.toLowerCase();
  function attacked(bd, sq, by) {
    if (sq < 0) return false;
    const r = sq >> 3, c = sq & 7, pr = by === 0 ? r + 1 : r - 1;
    for (const dc of [-1, 1]) if (on(pr, c + dc) && bd[pr * 8 + c + dc] === own(by, 'P')) return true;
    for (const [dr, dc] of NN) if (on(r + dr, c + dc) && bd[(r + dr) * 8 + c + dc] === own(by, 'N')) return true;
    for (const [dr, dc] of K8) if (on(r + dr, c + dc) && bd[(r + dr) * 8 + c + dc] === own(by, 'K')) return true;
    const ray = (dirs, a, q) => dirs.some(([dr, dc]) => {
      let rr = r + dr, cc = c + dc;
      while (on(rr, cc)) { const x = bd[rr * 8 + cc]; if (x !== '.') return x === own(by, a) || x === own(by, q); rr += dr; cc += dc; }
      return false;
    });
    return ray(RO, 'R', 'Q') || ray(BI, 'B', 'Q');
  }
  const kingAt = (bd, s) => bd.indexOf(own(s, 'K'));
  // 自分のキングが取られるかは見ない手の一覧
  function pseudo(b) {
    const s = b.turn, bd = b.bd, out = [];
    for (let i = 0; i < 64; i++) {
      if (side(bd[i]) !== s) continue;
      const t = bd[i].toUpperCase(), r = i >> 3, c = i & 7;
      if (t === 'P') {
        const dir = s === 0 ? -1 : 1, last = s === 0 ? 0 : 7;
        const add = to => { if ((to >> 3) === last) for (const x of 'QRBN') out.push({ f: i, t: to, pr: x }); else out.push({ f: i, t: to }); };
        const one = i + dir * 8;
        if (bd[one] === '.') { add(one); if (r === (s === 0 ? 6 : 1) && bd[one + dir * 8] === '.') add(one + dir * 8); }
        for (const dc of [-1, 1]) { if (!on(r + dir, c + dc)) continue; const to = (r + dir) * 8 + c + dc; if (side(bd[to]) === 1 - s || to === b.ep) add(to); }
        continue;
      }
      if (t === 'N' || t === 'K') {
        for (const [dr, dc] of t === 'N' ? NN : K8) if (on(r + dr, c + dc) && side(bd[(r + dr) * 8 + c + dc]) !== s) out.push({ f: i, t: (r + dr) * 8 + c + dc });
        const home = s === 0 ? 60 : 4, R = own(s, 'R');
        if (t === 'K' && i === home && !attacked(bd, home, 1 - s)) {
          if (b.cr.includes(own(s, 'K')) && bd[home + 1] === '.' && bd[home + 2] === '.' && bd[home + 3] === R && !attacked(bd, home + 1, 1 - s) && !attacked(bd, home + 2, 1 - s)) out.push({ f: i, t: home + 2 });
          if (b.cr.includes(own(s, 'Q')) && bd[home - 1] === '.' && bd[home - 2] === '.' && bd[home - 3] === '.' && bd[home - 4] === R && !attacked(bd, home - 1, 1 - s) && !attacked(bd, home - 2, 1 - s)) out.push({ f: i, t: home - 2 });
        }
        continue;
      }
      for (const [dr, dc] of t === 'R' ? RO : t === 'B' ? BI : K8) {
        let rr = r + dr, cc = c + dc;
        while (on(rr, cc)) { const x = bd[rr * 8 + cc]; if (side(x) === s) break; out.push({ f: i, t: rr * 8 + cc }); if (x !== '.') break; rr += dr; cc += dc; }
      }
    }
    return out;
  }
  function apply(b, m) {
    const bd = b.bd.split(''), p = bd[m.f], t = p.toUpperCase(), s = side(p);
    let cap = bd[m.t] !== '.' ? bd[m.t] : null, castle = null;
    if (t === 'P' && m.t === b.ep && !cap) { const ci = m.t + (s === 0 ? 8 : -8); cap = bd[ci]; bd[ci] = '.'; }
    bd[m.t] = m.pr ? own(s, m.pr) : p; bd[m.f] = '.';
    if (t === 'K' && Math.abs(m.t - m.f) === 2) { const k = m.t > m.f, rf = k ? m.f + 3 : m.f - 4, rt = k ? m.f + 1 : m.f - 1; bd[rt] = bd[rf]; bd[rf] = '.'; castle = k ? 'k' : 'q'; }
    let cr = b.cr;
    if (t === 'K') cr = cr.replace(own(s, 'K'), '').replace(own(s, 'Q'), '');
    for (const [sq, ch] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.f === sq || m.t === sq) cr = cr.replace(ch, '');
    b.cr = cr; b.ep = t === 'P' && Math.abs(m.t - m.f) === 16 ? (m.f + m.t) / 2 : -1;
    b.hm = t === 'P' || cap ? 0 : b.hm + 1; b.bd = bd.join(''); b.turn = 1 - s;
    return { cap, castle };
  }
  const key = b => b.bd + b.turn + b.cr + b.ep;
  function legal(b) {
    const s = b.turn;
    return pseudo(b).filter(m => { const n = { bd: b.bd, cr: b.cr, ep: b.ep, hm: b.hm, turn: s }; apply(n, m); return !attacked(n.bd, kingAt(n.bd, s), 1 - s); });
  }
  const check = b => attacked(b.bd, kingAt(b.bd, b.turn), 1 - b.turn);
  // キング同士、またはキング＋ナイト1つ／ビショップ1つだけ
  const lowMaterial = bd => { const left = bd.replace(/[.Kk]/g, ''); return left === '' || (left.length === 1 && /[NBnb]/.test(left)); };
  // NPC：1手指してみて、駒の損得＋相手のいちばん得な取り返しを引いて選ぶ（詰みは逃さない）
  const VAL = { P: 1, N: 3, B: 3.2, R: 5, Q: 9, K: 0 };
  function score(bd, s) {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = bd[i]; if (p === '.') continue;
      const t = p.toUpperCase(), r = i >> 3, c = i & 7, mine = side(p) === s ? 1 : -1;
      let x = VAL[t];
      if (t === 'N' || t === 'B') x += .1 * (3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5))); // まん中ほど少し得
      if (t === 'P') x += .04 * (side(p) === 0 ? 6 - r : r - 1);
      v += x * mine;
    }
    return v;
  }
  function npc(b, rnd = Math.random) {
    const s = b.turn; let best = null, bv = -Infinity;
    for (const m of legal(b)) {
      const n = { bd: b.bd, cr: b.cr, ep: b.ep, hm: b.hm, turn: s }; apply(n, m);
      const opp = legal(n), chk = attacked(n.bd, kingAt(n.bd, 1 - s), s);
      let v = score(n.bd, s);
      if (!opp.length) v = chk ? 1e6 : v > 2 ? -50 : 0; // 勝っているときに引き分けにはしない
      else {
        let worst = 0;
        for (const o of opp) {
          const cap = n.bd[o.t]; if (cap === '.' && !o.pr) continue;
          const gain = (cap !== '.' ? VAL[cap.toUpperCase()] : 0) + (o.pr ? VAL[o.pr] - 1 : 0) - (attacked(n.bd, o.t, s) ? VAL[n.bd[o.f].toUpperCase()] : 0);
          worst = Math.max(worst, gain);
        }
        v -= worst;
        if (chk) v += .2;
        if (b.bd[m.f].toUpperCase() === 'K' && Math.abs(m.t - m.f) === 2) v += .4;
      }
      v += rnd() * .25;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  return {
    npc,
    LABEL: ['白', '黒'], side, kingAt,
    init() { const b = { bd: 'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR', cr: 'KQkq', ep: -1, hm: 0, turn: 0 }; return { bd: b.bd, cr: b.cr, ep: b.ep, hm: b.hm, hist: [key(b)] }; },
    moves: b => legal(b), check,
    play(b, m) {
      const info = apply(b, m);
      // ポーンが動くか駒を取ったら、それより前の局面にはもう戻れない
      b.hist = b.hm === 0 ? [key(b)] : (b.hist || []).concat(key(b));
      if (check(b)) info.check = true;
      return info;
    },
    over(b) {
      if (!legal(b).length) return check(b) ? { win: 1 - b.turn, why: 'mate' } : { win: null, why: 'stalemate' };
      if (b.hm >= 100) return { win: null, why: 'fifty' };
      const k = key(b); if (b.hist.filter(x => x === k).length >= 3) return { win: null, why: 'repeat' };
      if (lowMaterial(b.bd)) return { win: null, why: 'material' };
      return null;
    },
    perft(b, d) { if (!d) return 1; let n = 0; for (const m of legal(b)) { const c = { ...b }; apply(c, m); n += CHS.perft(c, d - 1); } return n; },
  };
})();
