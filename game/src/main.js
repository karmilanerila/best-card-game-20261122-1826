// main.js — boot and UI controller for Scrapheap Showdown.
// One controller owns the game object, renders after every action, and
// exposes the game on window for the self-test driver. The flow is:
//   title screen -> PLAY -> table -> END TURN -> rival turn -> your turn ...
//   ... until a hull hits zero -> win/loss overlay -> PLAY AGAIN.
// Screenshot mode (?shot=title|play|win|loss) renders a staged state
// instead of starting a live game, and never needs a click.

import { createGame, playCard, takeJunk, startPlayerTurn, checkEnd } from './state.js';
import { takeRivalTurn } from './ai.js';
import { renderTable, renderTitle, renderEnd, renderRules } from './render.js';
import { bindKeyboard } from './input.js';
import { sfx, setMuted } from './audio.js';
import { buildShot, shotParams } from './shots.js';

/** The UI controller: game state, rendering, sounds and turn flow. */
function makeUi(seed) {
  const ui = {
    game: null,
    muted: false,
    seed,

    /** Show the current state: table, title or end screen. */
    render() {
      const game = this.game;
      if (!game || game.phase === 'title') {
        renderTitle(this);
        return;
      }
      if (game.phase === 'won' || game.phase === 'lost') {
        renderEnd(game, this);
        return;
      }
      renderTable(game, this);
    },

    /** Start a fresh duel from the title screen. */
    startGame() {
      sfx.click();
      this.game = createGame(this.seed);
      this.game.phase = 'play';
      this.game.log.push('A new duel begins. RUSTY vs SCRAPJAW.');
      this.render();
    },

    /** Restart from anywhere: a new duel with the same seed. */
    restart() {
      sfx.click();
      this.game = createGame(this.seed);
      this.game.phase = 'play';
      this.render();
    },

    /** Play the card at `index` in the player's hand. */
    playCard(index) {
      const game = this.game;
      if (!game || game.phase !== 'play') return;
      const card = game.player.hand[index];
      if (!card) return;
      if (card.cost > game.player.scrap) {
        game.log.push(`Not enough Scrap for ${card.name} (needs ${card.cost}).`);
        this.render();
        return;
      }
      const lines = playCard(game, game.player, game.rival, index);
      if (!lines) return;
      game.log.push(...lines);
      if (card.suit === 'bolt') sfx.hit();
      else if (card.suit === 'plate') sfx.block();
      else if (card.suit === 'wrench') sfx.heal();
      else sfx.play();
      if (lines.some((l) => l.startsWith('WELD!'))) sfx.weld();
      if (game.phase === 'won') sfx.win();
      if (game.phase === 'lost') sfx.lose();
      this.render();
    },

    /** Salvage the junk card at `index` in the junk row. */
    takeJunk(index) {
      const game = this.game;
      if (!game || game.phase !== 'play') return;
      const lines = takeJunk(game, index);
      if (!lines) {
        game.log.push('You already salvaged this turn, or cannot afford it.');
        this.render();
        return;
      }
      game.log.push(...lines);
      sfx.junk();
      this.render();
    },

    /** End the player's turn: the rival plays, then a new turn opens. */
    endTurn() {
      const game = this.game;
      if (!game || game.phase !== 'play') return;
      sfx.turn();
      const lines = takeRivalTurn(game);
      game.log.push(...lines);
      if (game.phase === 'play') {
        game.turn += 1;
        startPlayerTurn(game);
        game.log.push(`Turn ${game.turn} — RUSTY gains ${game.player.scrap} Scrap and draws 2.`);
      }
      if (game.phase === 'won') sfx.win();
      if (game.phase === 'lost') sfx.lose();
      this.render();
    },

    /** Toggle sound on/off and re-render the top bar. */
    toggleMute() {
      this.muted = setMuted(!this.muted);
      this.render();
    },

    /** Show the rules modal over the table. */
    showRules() {
      renderRules(this);
    },
  };
  return ui;
}

/** Boot: screenshot mode renders a staged state; otherwise the title. */
function boot() {
  const { shot, seed } = shotParams();
  const ui = makeUi(seed);
  // The self-test driver and the CDP play-through read the game from here.
  window.SCRAP = { ui, get game() { return ui.game; } };
  bindKeyboard(ui);
  if (shot) {
    const staged = buildShot(shot, seed);
    if (staged.mode === 'title') {
      ui.game = null;
    } else {
      ui.game = staged.game;
    }
    ui.render();
    return;
  }
  ui.game = null;
  ui.render();
}

boot();
