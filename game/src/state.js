// state.js — the rules engine of Scrapheap Showdown. Pure logic, no DOM.
// A game is a plain object; every function below takes it and returns a list
// of log lines describing what happened, so the renderer and the self-test
// both read the same truth. The AI lives in ai.js and calls these same
// functions, so a human and the rival play by identical rules.
//
// Core rules:
//   - Both bots start at 30 Hull. Hull at 0 ends the game.
//   - Each turn you gain Scrap: 3 on turn 1, +1 a turn, capped at 10.
//   - You draw 2 cards at the start of your turn (hand cap 7).
//   - Block soaks damage, then fades when your next turn starts.
//   - WELD: play cards of 2+ different suits in one turn and the second suit
//     lands a bonus +3 damage on the rival, once per turn.
//   - HEAT: bolt cards add Heat. At 4+ Heat your bolts deal +1. At 6 Heat
//     the bot overheats: it takes 3 damage and Heat resets to 0.
//   - JUNK YARD: 3 face-up cards sit in the middle. Once per turn you may
//     take one into your hand by paying its cost; the row refills from deck.

import { makeRng, shuffle } from './rng.js';
import { buildDeck } from './cards.js';

export const MAX_HULL = 30;
export const MAX_SCRAP = 10;
export const HAND_CAP = 7;
export const WELD_BONUS = 3;
export const HEAT_BOOST_AT = 4;
export const HEAT_OVERHEAT_AT = 6;
export const OVERHEAT_DAMAGE = 3;

/** One side of the duel: hull, block, scrap, heat, hand, deck, discard. */
function makeSide(deck) {
  return { hull: MAX_HULL, block: 0, scrap: 0, heat: 0, hand: [], deck, discard: [], suits: [], weldFired: false };
}

/** A fresh game. `seed` drives every shuffle and AI pick. */
export function createGame(seed = 7) {
  const rng = makeRng(seed);
  const player = makeSide(shuffle(rng, buildDeck()));
  const rival = makeSide(shuffle(rng, buildDeck()));
  const game = {
    seed,
    rng,
    turn: 1,
    phase: 'title', // title | play | won | lost
    player,
    rival,
    junk: [],
    log: [],
    intent: null, // the rival's announced plan for its next turn
    junkTaken: false,
    stats: { turns: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0, welds: 0, junkTaken: 0 },
  };
  // Deal the opening hands and the junk row, then open turn 1.
  drawCards(game, player, 4);
  drawCards(game, rival, 4);
  for (let i = 0; i < 3; i++) refillJunk(game);
  startPlayerTurn(game);
  game.phase = 'play';
  return game;
}

/** The scrap a side gains on `turn`: 3 on turn 1, +1 a turn, capped at 10. */
export function scrapForTurn(turn) {
  return Math.min(MAX_SCRAP, 2 + turn);
}

/** Move cards from a side's deck into its hand, reshuffling the discard pile. */
export function drawCards(game, side, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (side.hand.length >= HAND_CAP) break;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(game.rng, side.discard);
      side.discard = [];
    }
    const card = side.deck.pop();
    side.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

/** Fill an empty junk slot from the player's deck (the junk row is shared). */
export function refillJunk(game) {
  if (game.junk.length >= 3) return;
  const deck = game.player.deck;
  if (deck.length === 0) {
    if (game.player.discard.length === 0) return;
    game.player.deck = shuffle(game.rng, game.player.discard);
    game.player.discard = [];
  }
  game.junk.push(game.player.deck.pop());
}

/** Open the player's turn: fresh block, fresh scrap, draw 2, reset trackers. */
export function startPlayerTurn(game) {
  const p = game.player;
  p.block = 0;
  p.scrap = scrapForTurn(game.turn);
  p.suits = [];
  p.weldFired = false;
  game.junkTaken = false;
  drawCards(game, p, 2);
  game.stats.turns = game.turn;
}

/** Deal damage to a side, soaked by block first; returns the hull lost. */
export function dealDamage(game, side, amount) {
  if (amount <= 0) return 0;
  const soaked = Math.min(side.block, amount);
  side.block -= soaked;
  const hullHit = amount - soaked;
  side.hull = Math.max(0, side.hull - hullHit);
  return hullHit;
}

/** The damage a bolt card deals right now (heat boosts it at 4+). */
export function boltDamage(game, side, card) {
  const boost = side.heat >= HEAT_BOOST_AT ? 1 : 0;
  return card.dmg + boost;
}

/** Apply a card's effect. `side` plays it, `foe` receives the damage. */
export function applyCard(game, side, foe, card) {
  const lines = [];
  side.scrap -= card.cost;
  if (card.block) {
    side.block += card.block;
    lines.push(`${side === game.player ? 'RUSTY' : 'SCRAPJAW'} gains ${card.block} Block.`);
  }
  if (card.heal) {
    const before = side.hull;
    side.hull = Math.min(MAX_HULL, side.hull + card.heal);
    lines.push(`${side === game.player ? 'RUSTY' : 'SCRAPJAW'} repairs ${side.hull - before} Hull.`);
  }
  if (card.vent) {
    side.heat = Math.max(0, side.heat - card.vent);
    lines.push(`Heat vented to ${side.heat}.`);
  }
  if (card.draw) {
    const drawn = drawCards(game, side, card.draw);
    lines.push(`${side === game.player ? 'RUSTY' : 'SCRAPJAW'} draws ${drawn.length}.`);
  }
  if (card.scrap) {
    side.scrap = Math.min(MAX_SCRAP, side.scrap + card.scrap);
    lines.push(`+${card.scrap} Scrap.`);
  }
  if (card.dmg) {
    const amount = card.suit === 'bolt' ? boltDamage(game, side, card) : card.dmg;
    const hit = dealDamage(game, foe, amount);
    if (side === game.player) game.stats.damageDealt += hit;
    else game.stats.damageTaken += hit;
    lines.push(`${card.name} hits for ${amount} (${hit} through).`);
  }
  if (card.heat) {
    side.heat += card.heat;
    lines.push(`Heat rises to ${side.heat}.`);
    if (side.heat >= HEAT_OVERHEAT_AT) {
      const hit = dealDamage(game, side, OVERHEAT_DAMAGE);
      side.heat = 0;
      lines.push(`OVERHEAT! ${side === game.player ? 'RUSTY' : 'SCRAPJAW'} takes ${hit} damage. Heat reset.`);
    }
  }
  return lines;
}

/** Play the card at `handIndex` from `side`'s hand. Returns log lines, or null if illegal. */
export function playCard(game, side, foe, handIndex) {
  if (game.phase !== 'play') return null;
  const card = side.hand[handIndex];
  if (!card || card.cost > side.scrap) return null;
  side.hand.splice(handIndex, 1);
  side.discard.push(card);
  const lines = [`${side === game.player ? 'RUSTY' : 'SCRAPJAW'} plays ${card.name}.`];
  lines.push(...applyCard(game, side, foe, card));
  // WELD: a second suit in one turn lands a bonus hit, once per turn.
  // Both sides weld — the rule is symmetric, so the rival is as dangerous
  // with it as you are, and reading its suits matters as much as yours.
  if (side === game.player) game.stats.cardsPlayed++;
  if (!side.suits.includes(card.suit)) side.suits.push(card.suit);
  if (!side.weldFired && side.suits.length >= 2) {
    side.weldFired = true;
    const hit = dealDamage(game, foe, WELD_BONUS);
    const who = side === game.player ? 'RUSTY' : 'SCRAPJAW';
    if (side === game.player) {
      game.stats.welds++;
      game.stats.damageDealt += hit;
    } else {
      game.stats.damageTaken += hit;
    }
    lines.push(`${who} WELDS! Two suits in one turn — +${WELD_BONUS} damage (${hit} through).`);
  }
  checkEnd(game);
  return lines;
}

/** Take a junk card into the player's hand by paying its cost (once a turn). */
export function takeJunk(game, junkIndex) {
  if (game.phase !== 'play') return null;
  if (game.junkTaken) return null;
  const card = game.junk[junkIndex];
  if (!card || card.cost > game.player.scrap) return null;
  if (game.player.hand.length >= HAND_CAP) return null;
  game.player.scrap -= card.cost;
  game.player.hand.push(card);
  game.junk.splice(junkIndex, 1);
  game.junkTaken = true;
  game.stats.junkTaken++;
  refillJunk(game);
  return [`RUSTY salvages ${card.name} from the Junk Yard.`];
}

/** Settle the game when a hull hits zero. */
export function checkEnd(game) {
  if (game.phase !== 'play') return;
  if (game.rival.hull <= 0) {
    game.phase = 'won';
    game.log.push('SCRAPJAW is scrap! RUSTY wins the duel.');
  } else if (game.player.hull <= 0) {
    game.phase = 'lost';
    game.log.push('RUSTY is scrap! SCRAPJAW wins the duel.');
  }
}

/** A snapshot of the duel for the renderer and the screenshots. */
export function summary(game) {
  return {
    turn: game.turn,
    phase: game.phase,
    playerHull: game.player.hull,
    rivalHull: game.rival.hull,
    playerBlock: game.player.block,
    rivalBlock: game.rival.block,
    scrap: game.player.scrap,
    heat: game.player.heat,
    handSize: game.player.hand.length,
    rivalHandSize: game.rival.hand.length,
    deckSize: game.player.deck.length,
    junkSize: game.junk.length,
    intent: game.intent,
    stats: { ...game.stats },
  };
}
