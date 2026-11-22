// state.js — one job: the rules of Ember Pact, with no DOM in it at all.
// A pure state object in, a list of events out, so the logic can be
// play-tested headlessly as well as in the browser.
import { buildDeck, comboFor, faceById } from './cards.js';
import { mulberry32 } from './rng.js';

export const START_LIFE = 30;
export const START_HAND = 4;
export const MAX_MANA = 10;
export const MAX_HAND = 8;

function newSide(deck) {
  return {
    life: START_LIFE,
    mana: 0,
    maxMana: 0,
    shield: 0,
    deck: deck.slice(),
    hand: [],
    discard: [],
    playedThisTurn: [],
  };
}

// Create a fresh game. seed drives the deck order and the AI's rolls.
export function createGame(seed) {
  const rand = mulberry32(seed);
  const game = {
    seed,
    turn: 1,
    phase: 'title',
    player: newSide(buildDeck(rand)),
    enemy: newSide(buildDeck(rand)),
    log: [],
    aiIntent: null,
    winner: null,
    rand,
  };
  drawCards(game.player, START_HAND);
  drawCards(game.enemy, START_HAND);
  return game;
}

export function drawCards(side, count) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (side.hand.length >= MAX_HAND) break;
    const id = side.deck.shift();
    if (id === undefined) break;
    side.hand.push(id);
    drawn.push(id);
  }
  return drawn;
}

function otherSide(game, side) {
  return side === 'player' ? game.enemy : game.player;
}

function sideName(side) {
  return side === 'player' ? 'You' : 'Rook';
}

// Damage first eats shield, then life. Returns the life actually lost.
export function dealDamage(game, side, amount) {
  const target = side === 'player' ? game.player : game.enemy;
  let left = amount;
  if (target.shield > 0) {
    const blocked = Math.min(target.shield, left);
    target.shield -= blocked;
    left -= blocked;
  }
  target.life = Math.max(0, target.life - left);
  return left;
}

export function healLife(game, side, amount) {
  const target = side === 'player' ? game.player : game.enemy;
  target.life = Math.min(START_LIFE, target.life + amount);
}

export function checkWinner(game) {
  if (game.player.life <= 0 && game.enemy.life <= 0) {
    game.phase = 'loss';
    game.winner = 'enemy';
  } else if (game.enemy.life <= 0) {
    game.phase = 'win';
    game.winner = 'player';
  } else if (game.player.life <= 0) {
    game.phase = 'loss';
    game.winner = 'enemy';
  }
  return game.phase;
}

// Begin a side's turn: mana grows by one (up to the cap), refills, one
// card is drawn, shield from last turn fades, combo memory clears.
export function startTurn(game, side) {
  const me = side === 'player' ? game.player : game.enemy;
  me.maxMana = Math.min(MAX_MANA, me.maxMana + 1);
  me.mana = me.maxMana;
  me.shield = 0;
  me.playedThisTurn = [];
  me.comboFired = false;
  const drawn = drawCards(me, 1);
  return drawn;
}

// Play one card from a side's hand. Returns { ok, events } where events
// are short strings for the battle log. Illegal plays return ok: false.
export function playCard(game, side, handIndex) {
  const me = side === 'player' ? game.player : game.enemy;
  const face = faceById(me.hand[handIndex]);
  if (!face) return { ok: false, events: ['No such card.'] };
  if (me.mana < face.cost) return { ok: false, events: [`Not enough mana for ${face.name}.`] };
  me.mana -= face.cost;
  me.hand.splice(handIndex, 1);
  me.discard.push(face.id);
  me.playedThisTurn.push(face.element);
  const events = [`${sideName(side)} played ${face.name}.`];
  if (face.attack) {
    const lost = dealDamage(game, side === 'player' ? 'enemy' : 'player', face.attack);
    events.push(`${face.name} deals ${face.attack} (${lost} through shield).`);
  }
  if (face.shield) {
    me.shield += face.shield;
    events.push(`${sideName(side)} gains ${face.shield} shield.`);
  }
  if (face.heal) {
    healLife(game, side, face.heal);
    events.push(`${sideName(side)} mends ${face.heal} life.`);
  }
  if (face.draw) {
    const drawn = drawCards(me, face.draw);
    events.push(`${sideName(side)} draws ${drawn.length} card${drawn.length === 1 ? '' : 's'}.`);
  }
  // Combos fire once per turn, the moment the second element lands. The
  // comboFired flag resets in startTurn, so a new turn can combo again.
  const combo = comboFor(me.playedThisTurn);
  if (combo && !me.comboFired) {
    me.comboFired = true;
    events.push(combo.text);
    if (combo.bonusAttack) {
      const lost = dealDamage(game, side === 'player' ? 'enemy' : 'player', combo.bonusAttack);
      events.push(`Combo deals ${combo.bonusAttack} (${lost} through shield).`);
    }
    if (combo.bonusShield) {
      me.shield += combo.bonusShield;
      events.push(`${sideName(side)} gains ${combo.bonusShield} shield.`);
    }
    if (combo.bonusHeal) healLife(game, side, combo.bonusHeal);
    if (combo.bonusDraw) {
      const drawn = drawCards(me, combo.bonusDraw);
      events.push(`${sideName(side)} draws ${drawn.length} from the combo.`);
    }
  }
  checkWinner(game);
  return { ok: true, events };
}

export function startGame(game) {
  game.phase = 'play';
  game.log = ['The pact is sealed. Your move — play a card, then end your turn.'];
  startTurn(game, 'player');
  return game;
}

// A side may keep playing while it has mana and cards; the AI and the
// end-turn button both call this to hand the turn over.
export function endTurn(game) {
  if (game.phase !== 'play') return [];
  const events = [];
  const drawn = startTurn(game, 'enemy');
  if (drawn.length) events.push('Rook draws a card.');
  return events;
}

export function beginPlayerTurn(game) {
  const drawn = startTurn(game, 'player');
  game.turn += 1;
  if (drawn.length) return ['You draw a card.'];
  return ['Your deck is empty — no card drawn.'];
}
