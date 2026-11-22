// rng.js — deterministic randomness for Scrapheap Showdown.
// Every random choice in the game flows through one seeded generator, so a
// given seed always deals the same hands, the same junk row and the same AI
// picks. Nothing here touches the DOM: the logic modules stay testable from
// plain Node, which the self-test harness relies on.

/** A small, fast, seedable PRNG (mulberry32). `seed` is any 32-bit integer. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max] inclusive, from the given generator. */
export function rollInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** A random element of a non-empty array, from the given generator. */
export function pickOne(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** A Fisher-Yates shuffle that returns a new array and never mutates its input. */
export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** A deterministic seed from a short string, for named test scenarios. */
export function seedFromText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** True with probability `p` (0 to 1), from the given generator. */
export function chance(rng, p) {
  return rng() < p;
}
