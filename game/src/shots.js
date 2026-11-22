// shots.js — one job: deterministic screenshot states. ?shot=title|play|
// win|loss with a seed jumps straight to a fixed, seeded layout of that
// screen, so every screenshot is reproducible and shows the game at its
// best: the title, a mid-game table, the win flourish, the loss screen.
import { createGame, startGame } from './state.js';
import { faceById } from './cards.js';

function fixedPlayState(seed) {
  const game = createGame(seed);
  startGame(game);
  // A mid-game table: both sides hurt, hands full, mana to spend, a
  // combo already fired once so the log tells the story.
  game.player.life = 22;
  game.enemy.life = 19;
  game.player.shield = 3;
  game.enemy.shield = 0;
  game.player.maxMana = 6;
  game.player.mana = 5;
  game.enemy.maxMana = 5;
  game.enemy.mana = 2;
  game.turn = 5;
  game.player.hand = ['drake', 'hawk', 'rain', 'golem', 'bolt', 'sprite'];
  game.enemy.hand = ['imp', 'bolt', 'wall', 'fox', 'storm'];
  game.player.deck = game.player.deck.slice(0, 12);
  game.enemy.deck = game.enemy.deck.slice(0, 12);
  game.aiIntent = 'strike';
  game.log = [
    'The pact is sealed. Your move — play a card, then end your turn.',
    'You played Ember Imp.',
    'Ember Imp deals 2 (2 through shield).',
    'Rook played Stone Wall.',
    'Rook gains 6 shield.',
    'Wildfire! +3 damage.',
    'You played Cinder Bolt.',
    'Cinder Bolt deals 3 (3 through shield).',
  ];
  return game;
}

function fixedEndState(seed, win) {
  const game = fixedPlayState(seed);
  if (win) {
    game.enemy.life = 0;
    game.player.life = 14;
    game.phase = 'win';
    game.winner = 'player';
  } else {
    game.player.life = 0;
    game.enemy.life = 9;
    game.phase = 'loss';
    game.winner = 'enemy';
  }
  return game;
}

// Build the game for a ?shot= value. Returns null for an unknown shot so
// the normal title screen shows instead.
export function gameForShot(shot, seed) {
  if (shot === 'title') return createGame(seed);
  if (shot === 'play') return fixedPlayState(seed);
  if (shot === 'win') return fixedEndState(seed, true);
  if (shot === 'loss') return fixedEndState(seed, false);
  return null;
}

// The cards shown on the table for the play shot, so the field is never
// empty in the screenshot.
export function shotFieldCards() {
  return [faceById('drake'), faceById('hawk')].filter(Boolean);
}
