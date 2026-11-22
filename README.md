# Ember Pact

An original turn-based card duel: four elements — Ember, Tide, Gale and
Stone — bound in one pact. Spend mana, play creature and spell cards from
your hand, chain two elements into combos (Wildfire, Mudwall, Steam,
Sandstorm), and take Rook the Cinder Fox's thirty life before it takes
yours. Rook announces its intent each turn — STRIKE, GUARD or SURGE — so
you can read it and counter.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server). No network, no build step, no dependencies.

- Mouse: click a card to select it, click again to play. Keyboard:
  `1`–`7` or arrow keys select, `Enter` plays, `E` ends the turn,
  `M` mutes, `R` plays again after a win or loss.
- Deterministic screenshots: `game/index.html?shot=title|play|win|loss&seed=7`.

## Layout

- `game/index.html` — the table, title, win and loss screens.
- `game/src/cards.js` — the elements, the twelve card faces, combos, decks.
- `game/src/state.js` — the pure rules: turns, mana, damage, combos.
- `game/src/ai.js` — Rook's readable intents and turn play.
- `game/src/render.js` — the table, cards, life bars, log.
- `game/src/input.js` — mouse and keyboard controls.
- `game/src/audio.js` — sounds synthesized live with WebAudio.
- `game/src/shots.js` — fixed seeded layouts for the screenshots.
- `game/src/rng.js` — the seeded random generator.
- `game/src/style.css` — the whole look of the game.
- `game/src/main.js` — wiring, plus a headless `?selftest=1` play-test.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json`.

MIT licensed. Built for the make.fun best-card-game bounty.
