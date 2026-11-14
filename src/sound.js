/* =================== 効果音（SFX） =================== */
// 音のファイルは使わず、その場で Web Audio で組み立てて鳴らす。設定の「音」で消せる（localStorage atsumaru.sound）
// ブラウザは画面に一度さわるまで音を出せないので、最初のタップで音の準備をする
// どの音も「仮」。場面ごとの聞きくらべはあとでモックアップで決める
const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null, on = true;
  try { on = localStorage.getItem('atsumaru.sound') !== '0'; } catch (e) { }
  const last = {};
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => { }); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, init, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state === 'suspended') ctx.resume().catch(() => { }); });
  const env = (g, t, vol, atk, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, .0002), t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  // 音のかけら：tone（高さが f0 → f1 に動く音）と noise（ざらざらした音をフィルターで形にする）
  function tone(type, f0, f1, dur, vol, at = 0, atk = .006) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, vol, atk, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, vol, ft, f0, f1, q = 1, at = 0, atk = .004) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = ft; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, vol, atk, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  const bell = (f, at = 0, vol = .22, dur = .5) => { tone('sine', f, f, dur, vol, at, .004); tone('sine', f * 2.01, f * 2.01, dur * .6, vol * .35, at, .004); tone('sine', f * 3.02, f * 3.02, dur * .35, vol * .15, at, .004); };
  const notes = (fs, step, type = 'triangle', vol = .2, dur = .16, at = 0) => fs.forEach((f, i) => tone(type, f, f, i === fs.length - 1 ? dur * 2.2 : dur, vol, at + i * step));
  const S = {
    // ---- 共通 ----
    tap: () => tone('sine', 880, 660, .05, .09),
    pop: () => tone('sine', 520, 1150, .09, .22),
    unpop: () => tone('sine', 900, 480, .08, .15),
    confirm: () => { tone('triangle', 660, 660, .07, .18); tone('triangle', 990, 990, .12, .18, .07); },
    back: () => tone('triangle', 520, 300, .09, .14),
    tear: () => { noise(.22, .35, 'bandpass', 3200, 1100, 1.4); tone('sine', 160, 90, .12, .2, .02); },
    pi: () => { tone('sine', 1760, 1760, .09, .22); tone('sine', 2637, 2637, .07, .08, .01); },
    ok: () => notes([523, 659, 784], .08, 'triangle', .2, .1),
    knock: () => { noise(.06, .4, 'lowpass', 500, 300, 1); noise(.06, .4, 'lowpass', 500, 300, 1, .14); },
    start: () => { noise(.35, .18, 'bandpass', 400, 3000, .8); notes([392, 523, 659, 784], .07, 'triangle', .18, .1, .15); },
    win: () => { notes([523, 659, 784, 1047], .11, 'triangle', .2, .16); bell(1568, .5, .14, .9); },
    lose: () => notes([523, 440, 349], .16, 'triangle', .16, .18),
    whoosh: () => noise(.26, .3, 'bandpass', 500, 3200, .9),
    buzz: () => { tone('sawtooth', 150, 140, .22, .08); tone('square', 110, 105, .22, .05); },
    // ---- ドワーフ ----
    seeno: () => { noise(.09, .5, 'lowpass', 900, 200, 1); noise(.09, .5, 'lowpass', 900, 200, 1, .16); tone('triangle', 330, 660, .18, .14, .16); },
    dig: () => { tone('triangle', 1450, 1150, .06, .22); noise(.05, .25, 'bandpass', 4200, 3000, 2); },
    crack: () => { noise(.35, .45, 'lowpass', 900, 150, 1); tone('sine', 110, 60, .3, .25); },
    boom: () => { noise(1.3, .9, 'lowpass', 1600, 70, .9, 0, .003); tone('sine', 120, 38, .9, .5); },
    jackpot: () => { notes([784, 988, 1175, 1568], .07, 'triangle', .18, .1); [2093, 2637, 3136].forEach((f, i) => bell(f, .35 + i * .08, .07, .4)); },
    // ---- チュンチュン ----
    dice: () => { for (let i = 0; i < 6; i++) noise(.035, .35, 'bandpass', 2200 + i * 200, 1800, 3, i * .07 + Math.random() * .03); },
    trap: () => { tone('triangle', 240, 170, .1, .2); noise(.05, .3, 'lowpass', 1200, 600, 1); },
    snap: () => { noise(.06, .55, 'bandpass', 2400, 1600, 2); tone('triangle', 900, 200, .18, .2, .03); },
    eat: () => { tone('sine', 600, 1300, .1, .2); bell(1568, .12, .16, .35); },
    card: () => noise(.07, .3, 'bandpass', 2600, 4200, 1.2),
    // ---- 盤のゲーム ----
    stone: () => { tone('sine', 190, 140, .09, .3); noise(.03, .3, 'lowpass', 2000, 900, 1); },
    flip: () => tone('sine', 700, 980, .04, .1),
    capture: () => { tone('sine', 190, 140, .09, .3); tone('triangle', 420, 180, .16, .14, .05); },
    check: () => { tone('triangle', 880, 880, .12, .16); tone('triangle', 1175, 1175, .16, .14, .1); },
    ball: () => { noise(.45, .2, 'bandpass', 1200, 1800, 2); bell(1047, .42, .2, .45); },
    bingo: () => { notes([659, 784, 1047, 1319], .09, 'triangle', .22, .12); bell(2093, .45, .12, .8); },
    // ---- トランプ ----
    cardplay: () => { noise(.08, .32, 'bandpass', 2400, 3800, 1.2); tone('sine', 260, 200, .06, .12, .02); },
    pass: () => tone('sine', 420, 340, .1, .1),
    big: () => { noise(.3, .3, 'bandpass', 600, 3600, .8); notes([523, 784, 1047], .06, 'triangle', .18, .08, .1); },
    // ---- ばくだん・タワー ----
    tick: () => tone('sine', 1650, 1650, .025, .12),
    tock: () => tone('sine', 1250, 1250, .025, .1),
    creak: () => { tone('triangle', 190, 150, .2, .06); tone('triangle', 160, 120, .24, .05, .14); }, // タワーがミシミシ
    thud: () => { tone('sine', 130, 70, .16, .32); noise(.07, .3, 'lowpass', 700, 300, 1); },
    crash: () => { for (let i = 0; i < 5; i++) { tone('sine', 140 - i * 12, 60, .18, .25, i * .07); noise(.12, .35, 'lowpass', 1400, 300, 1, i * .07); } },
    // ---- ガツンとロボ ----
    punch: () => { noise(.13, .7, 'lowpass', 1800, 250, 1); tone('sine', 160, 55, .14, .45); },
    hurt: () => { noise(.16, .7, 'lowpass', 1200, 180, 1); tone('sine', 120, 45, .18, .5); tone('square', 90, 70, .12, .05, .02); },
    block: () => { tone('triangle', 320, 260, .06, .2); noise(.06, .4, 'bandpass', 1300, 900, 2); },
    ko: () => { tone('sine', 300, 900, .18, .2); tone('sine', 900, 250, .35, .18, .18); noise(.5, .4, 'lowpass', 1200, 120, 1, .1); },
    // ---- いっちょあがり！ ----
    clash: () => { tone('triangle', 400, 360, .14, .16); tone('triangle', 430, 380, .14, .16); noise(.05, .25, 'lowpass', 600, 400, 1, .02); },
    sizzle: () => noise(.7, .2, 'highpass', 3500, 5000, .7, 0, .02),
    dish: () => { bell(1047, 0, .2, .5); bell(1568, .14, .18, .7); },
  };
  function play(name, at = 0) {
    if (!on || !ctx || !S[name] || ctx.state !== 'running' || document.hidden) return;
    const now = performance.now(); if (now - (last[name] || 0) < 45) return; last[name] = now; SFX.lastAt = now;
    if (at > 0) { setTimeout(() => play(name), at); return; }
    try { S[name](); } catch (e) { }
  }
  const later = (name, ms) => setTimeout(() => play(name), ms);
  // ボタンをおしたら小さく「カチッ」（その場面の音が鳴ったときは鳴らさない）
  // （ボタン自身の処理が先に走るので、いま鳴ったばかりなら重ねない）
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('button'); if (!b || b.disabled) return; if (performance.now() - (SFX.lastAt || 0) < 40) return; play('tap'); });
  return { play, later, get on() { return on; }, set(v) { on = !!v; try { localStorage.setItem('atsumaru.sound', on ? '1' : '0'); } catch (e) { } if (on) { init(); play('pop'); } }, lastAt: 0 };
})();
