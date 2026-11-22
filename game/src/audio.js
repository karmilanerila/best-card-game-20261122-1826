// audio.js — one job: every sound Ember Pact makes, synthesized live with
// WebAudio. No audio files, no network, nothing to load. Sounds are short
// little chimes: a pluck when a card is played, a low thud on damage, a
// rising arpeggio on victory, a falling one on defeat.
let audioContext = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function context() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

// One note: a sine blip that slides from one pitch to another.
function blip(freqFrom, freqTo, seconds, delay, volume) {
  if (muted) return;
  const ctx = context();
  if (!ctx) return;
  const when = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqFrom, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), when + seconds);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + seconds + 0.05);
}

export function playCardSound() {
  blip(520, 780, 0.12, 0, 0.16);
  blip(780, 1040, 0.1, 0.05, 0.1);
}

export function damageSound() {
  blip(220, 90, 0.22, 0, 0.22);
}

export function healSound() {
  blip(440, 660, 0.18, 0, 0.12);
  blip(660, 880, 0.18, 0.08, 0.1);
}

export function drawSound() {
  blip(660, 520, 0.08, 0, 0.08);
}

export function comboSound() {
  blip(392, 392, 0.09, 0, 0.14);
  blip(523, 523, 0.09, 0.09, 0.14);
  blip(659, 659, 0.09, 0.18, 0.14);
  blip(784, 784, 0.16, 0.27, 0.16);
}

export function winSound() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => blip(freq, freq, 0.22, i * 0.13, 0.16));
}

export function loseSound() {
  const notes = [392, 330, 262, 196];
  notes.forEach((freq, i) => blip(freq, freq * 0.9, 0.25, i * 0.15, 0.14));
}

export function turnSound() {
  blip(330, 440, 0.1, 0, 0.1);
}

// A soft tick when a card is selected but not yet played.
export function selectSound() {
  blip(880, 880, 0.05, 0, 0.07);
}
