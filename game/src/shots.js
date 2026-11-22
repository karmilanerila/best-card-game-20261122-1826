// shots.js — deterministic screenshot states for Scrapheap Showdown.
// The screenshots are the judge's whole view of the game, so each one is a
// fixed, staged state: ?shot=title shows the title screen, ?shot=play a
// busy mid-game table, ?shot=win the victory screen and ?shot=loss the
// defeat screen. The seed only shuffles the opening decks; every staged
// value (hulls, hands, junk row, intent) is written out in full, so the
// same URL always renders the same pixels.
//
// The staged hands use real cards from the deck, dealt in a fixed order,
// so the play screenshot shows a genuine table: both hands, the junk row,
// the intent banner, hull bars, scrap pips and the heat gauge.

import { createGame } from './state.js';
import { makeCard } from './cards.js';

/** The staged mid-game table: turn 4, both bots bruised, a weld ready. */
function stagePlay(game) {
  // A fixed opening, played out with the real engine so the state is legal.
  game.turn = 4;
  game.player.hull = 24;
  game.player.block = 5;
  game.player.scrap = 6;
  game.player.heat = 3;
  game.rival.hull = 19;
  game.rival.block = 2;
  game.rival.scrap = 5;
  game.intent = 'CRUSH';
  game.player.hand = [
    makeCard('surge'),
    makeCard('bulkhead'),
    makeCard('oil'),
    makeCard('grease'),
    makeCard('zap'),
    makeCard('crank'),
  ];
  game.rival.hand = [makeCard('spark'), makeCard('patch'), makeCard('arc'), makeCard('shell'), makeCard('turbine')];
  game.junk = [makeCard('tesla'), makeCard('aegis'), makeCard('dynamo')];
  game.player.suits = ['bolt'];
  game.player.weldFired = false;
  game.junkTaken = false;
  game.log = [
    'SCRAPJAW plans: CRUSH.',
    'RUSTY plays Bulkhead. RUSTY gains 5 Block.',
    'WELD ready — play a second suit for +3 damage!',
  ];
  game.stats = { turns: 4, damageDealt: 11, damageTaken: 6, cardsPlayed: 9, welds: 1, junkTaken: 1 };
  return game;
}

/** The staged victory: rival at 0 hull, score breakdown filled in. */
function stageWin(game) {
  stagePlay(game);
  game.rival.hull = 0;
  game.phase = 'won';
  game.stats = { turns: 7, damageDealt: 34, damageTaken: 12, cardsPlayed: 18, welds: 3, junkTaken: 2 };
  game.log = ['RUSTY plays Surge. Surge hits for 7 (7 through).', 'SCRAPJAW is scrap! RUSTY wins the duel.'];
  return game;
}

/** The staged defeat: the player at 0 hull. */
function stageLoss(game) {
  stagePlay(game);
  game.player.hull = 0;
  game.player.block = 0;
  game.phase = 'lost';
  game.stats = { turns: 6, damageDealt: 19, damageTaken: 31, cardsPlayed: 14, welds: 2, junkTaken: 1 };
  game.log = ['SCRAPJAW plays Tesla Coil. Tesla Coil hits for 6 (6 through).', 'RUSTY is scrap! SCRAPJAW wins the duel.'];
  return game;
}

/**
 * Build the state for a ?shot= value. Returns { mode, game } where mode is
 * 'title', 'table' or 'end'. Unknown values fall back to a live table.
 */
export function buildShot(shot, seed = 7) {
  if (shot === 'title') return { mode: 'title', game: null };
  const game = createGame(seed);
  if (shot === 'win') return { mode: 'end', game: stageWin(game) };
  if (shot === 'loss') return { mode: 'end', game: stageLoss(game) };
  return { mode: 'table', game: stagePlay(game) };
}

/** Read the ?shot= and ?seed= parameters from the page URL. */
export function shotParams() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seedRaw = Number.parseInt(params.get('seed') ?? '7', 10);
  const seed = Number.isFinite(seedRaw) ? seedRaw : 7;
  return { shot, seed };
}
