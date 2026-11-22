// ai.js — SCRAPJAW, the rival bot. It announces its intent, then plays by
// the same rules as the player (same engine, same card costs), so its
// choices can be read and countered: block when it says CRUSH, hit hard
// when it says FORTIFY, and grab the junk row when it says TINKER.
//
// Intents:
//   CRUSH    — play damage cards (bolt first, highest damage per scrap)
//   FORTIFY  — play block and repair cards
//   TINKER   — play draw/scrap cards, then take a junk card if it can
// The pick is weighted by the state: a hurt rival fortifies, a rich rival
// tinkers, and a rival staring at a weak player crushes.

import { pickOne } from './rng.js';
import { playCard, drawCards } from './state.js';

export const INTENTS = ['CRUSH', 'FORTIFY', 'TINKER'];

/** Pick the rival's intent for its next turn, from the state of the duel. */
export function chooseIntent(game) {
  const rival = game.rival;
  const player = game.player;
  // A rival on the ropes turtles up.
  if (rival.hull <= 10) return pickOne(game.rng, ['FORTIFY', 'FORTIFY', 'CRUSH']);
  // A rival facing a nearly-dead player goes for the kill.
  if (player.hull <= 8) return pickOne(game.rng, ['CRUSH', 'CRUSH', 'TINKER']);
  // A rival with a fat hand tinkers into more options.
  if (rival.hand.length >= 6) return pickOne(game.rng, ['TINKER', 'CRUSH', 'FORTIFY']);
  return pickOne(game.rng, INTENTS);
}

/** Rank the rival's playable cards for an intent: best value first. */
function rankForIntent(hand, scrap, intent) {
  const playable = hand
    .map((card, index) => ({ card, index }))
    .filter((entry) => entry.card.cost <= scrap);
  const valueOf = (card) => {
    if (intent === 'CRUSH') return card.dmg * 2 + card.draw * 0.5 - card.cost;
    if (intent === 'FORTIFY') return card.block * 2 + card.heal * 2 - card.cost;
    return card.draw * 2 + card.scrap * 2 + card.heal - card.cost;
  };
  return playable.sort((a, b) => valueOf(b.card) - valueOf(a.card));
}

/** The rival's whole turn: announce, play up to 3 cards, maybe salvage. */
export function takeRivalTurn(game) {
  const lines = [];
  const rival = game.rival;
  rival.block = 0;
  rival.scrap = Math.min(10, 2 + game.turn);
  rival.suits = [];
  rival.weldFired = false;
  const drawn = drawCards(game, rival, 2);
  if (drawn.length) lines.push(`SCRAPJAW draws ${drawn.length}.`);
  game.intent = chooseIntent(game);
  lines.push(`SCRAPJAW plans: ${game.intent}.`);
  // Play up to 4 cards that fit the intent, best value first.
  let played = 0;
  while (played < 4 && game.phase === 'play') {
    const ranked = rankForIntent(rival.hand, rival.scrap, game.intent);
    if (ranked.length === 0) break;
    const entry = ranked[0];
    const result = playCard(game, rival, game.player, entry.index);
    if (!result) break;
    lines.push(...result);
    played++;
  }
  // TINKER rivals also salvage from the junk yard when they can afford it.
  if (game.intent === 'TINKER' && game.phase === 'play') {
    const affordable = game.junk.findIndex((card) => card.cost <= rival.scrap);
    if (affordable >= 0 && rival.hand.length < 7) {
      const card = game.junk[affordable];
      rival.scrap -= card.cost;
      rival.hand.push(card);
      game.junk.splice(affordable, 1);
      lines.push(`SCRAPJAW salvages ${card.name} from the Junk Yard.`);
    }
  }
  if (played === 0) lines.push('SCRAPJAW passes, holding its scrap.');
  return lines;
}

/** How many cards the rival would play this turn, for the self-test. */
export function rivalPlaysAtLeast(game) {
  return rankForIntent(game.rival.hand, game.rival.scrap, game.intent ?? 'CRUSH').length > 0;
}
