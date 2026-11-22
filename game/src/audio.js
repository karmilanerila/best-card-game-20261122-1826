// audio.js — procedural sound effects for Scrapheap Showdown.
// Every sound is synthesized with the Web Audio API: no audio files, no
// network, zero assets. Sounds only start after a user gesture (the Audio
// context is created lazily on first play), so headless runs stay silent
// and error-free. Mute is a single flag the UI toggles.

let ctx = null;
let muted = false;

/** The shared AudioContext, created on first use (needs a user gesture). */
function audioCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

/** One blip: a sine/triangle tone with a quick decay. */
function blip(freq, dur, type = 'sine', gain = 0.12, when = 0) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Audio is decoration: a failure here must never break the game.
  }
}

/** A two-tone sweep, for hits and wins. */
function sweep(from, to, dur, type = 'sawtooth', gain = 0.08) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  try {
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Audio is decoration: a failure here must never break the game.
  }
}

export const sfx = {
  click() { blip(660, 0.06, 'triangle', 0.08); },
  select() { blip(880, 0.05, 'sine', 0.05); },
  draw() { blip(520, 0.08, 'sine', 0.09); blip(780, 0.08, 'sine', 0.07, 0.06); },
  play() { blip(440, 0.09, 'triangle', 0.1); blip(660, 0.1, 'triangle', 0.09, 0.07); },
  hit() { sweep(300, 90, 0.18, 'sawtooth', 0.12); },
  block() { blip(220, 0.12, 'square', 0.06); },
  heal() { blip(523, 0.12, 'sine', 0.09); blip(784, 0.16, 'sine', 0.08, 0.09); },
  weld() { blip(880, 0.08, 'square', 0.08); blip(1174, 0.14, 'square', 0.08, 0.07); },
  junk() { blip(392, 0.07, 'triangle', 0.09); blip(523, 0.09, 'triangle', 0.08, 0.06); },
  turn() { blip(330, 0.1, 'triangle', 0.08); },
  win() { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.22, 'triangle', 0.1, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => blip(f, 0.25, 'sawtooth', 0.07, i * 0.14)); },
};

/** Mute or unmute every sound. Returns the new muted state. */
export function setMuted(value) {
  muted = !!value;
  return muted;
}

export function isMuted() {
  return muted;
}
