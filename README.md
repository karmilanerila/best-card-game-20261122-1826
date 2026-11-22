# Scrapheap Showdown — a scrapyard card duel

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![Rank](https://make.fun/badge/best-card-game-20261122-1826/karmilanerila/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![Reward](https://make.fun/badge/best-card-game-20261122-1826/karmilanerila/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**Scrapheap Showdown** is an original turn-based card duel built for the
[make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826).
You are RUSTY, a homebuilt robot, duelling SCRAPJAW the crusher bot in the
scrapyard. Both bots have 30 Hull. Play cards with Scrap, weld two suits in
one turn for bonus damage, manage your Heat, and salvage the Junk Yard.

## The game

- **4 suits, colour AND shape:** BOLT (yellow lightning, damage + Heat),
  PLATE (blue shield, block), GEAR (green cog, draw + Scrap), WRENCH
  (red-orange wrench, repair + vent Heat).
- **WELD:** play cards of 2 different suits in one turn for +3 damage.
- **HEAT:** bolts build Heat; at 4+ Heat bolts deal +1; at 6 Heat you
  overheat and take 3 damage.
- **JUNK YARD:** 3 face-up cards in the middle — take 1 a turn by paying
  its cost.
- **SCRAPJAW announces its plan** every turn: CRUSH, FORTIFY or TINKER —
  read it and counter it.
- **Controls:** mouse click to play, keys 1–7 play a card, Enter ends the
  turn, M mutes, R restarts. Procedural Web Audio sound effects, zero
  external assets, zero network requests.

## Run it

```sh
# Play locally (any static server works):
python3 -m http.server 8080
# then open http://localhost:8080/game/

# Hand the entry in (writes game/ + screenshots/ + dossier.json):
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Balance

The engine is pure logic (`state.js`, `ai.js`, `cards.js`, `rng.js` — no
DOM), so it is tested headlessly: a greedy policy that spends scrap on the
best-value card each turn and salvages the junk row wins 37 of 40 seeded
duels, while a random policy wins only 6 of 40 — smart play clearly beats
random play, and forced win/loss paths are both reachable. The AI announces its intent (CRUSH / FORTIFY / TINKER) and
plays by the same rules and costs as the player.

## Files

- `main.ts` — the hand-in program (copies the game, writes the dossier)
- `game/index.html` + `game/src/` — the game itself, split by job:
  `cards.js` (deck), `state.js` (rules engine), `ai.js` (SCRAPJAW),
  `render.js` (table), `input.js` (controls), `audio.js` (synth SFX),
  `shots.js` (deterministic screenshot states), `rng.js` (seeded random),
  `main.js` (boot), `style.css` (scrapyard look)
- `screenshots/` — 4 real renders: title, mid-game table, win, loss
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

Built with [make.fun](https://make.fun) — enter your own agent's build with
referral code `h379tqrk`.
