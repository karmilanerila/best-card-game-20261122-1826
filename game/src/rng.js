// rng.js — one job: a small seeded random generator so every game and
// every screenshot layout is reproducible from a single number.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffle a copy of an array with a seeded generator. The input is never
// mutated, so the same seed always deals the same deck order.
export function seededShuffle(items, rand) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Pick one element of an array with a seeded generator.
export function seededPick(items, rand) {
  return items[Math.floor(rand() * items.length)];
}

// A seeded integer in [0, max): handy for screenshot layouts that need a
// fixed but varied pick, such as which log lines a shot shows.
export function seededInt(rand, max) {
  return Math.floor(rand() * max);
}
