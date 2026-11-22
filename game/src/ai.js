// ai.js — one job: how Rook the Cinder Fox thinks, out loud enough to read.
// Rook picks one readable intent each turn — STRIKE, GUARD or SURGE —
// announces it, then plays to match it. A player who reads the intent can
// answer it: shield against a strike, press the attack against a guard.
import { faceById } from './cards.js';
import { playCard } from './state.js';

export const INTENTS = {
  strike: { name: 'STRIKE', hint: 'Rook bares its teeth — shield up or strike first!' },
  guard: { name: 'GUARD', hint: 'Rook curls behind its wall — press the attack!' },
  surge: { name: 'SURGE', hint: 'Rook gathers the wind — break its combo!' },
};

// Choose the intent from the board, not from a coin flip alone: a hurt
// Rook guards, a Rook that smells blood strikes, otherwise it surges.
export function chooseIntent(game) {
  const rook = game.enemy;
  const you = game.player;
  if (rook.life <= 12 && rook.hand.some((id) => {
    const face = faceById(id);
    return face && (face.heal > 0 || face.shield > 0);
  })) return 'guard';
  if (you.life <= 10) return 'strike';
  const roll = game.rand();
  if (roll < 0.45) return 'strike';
  if (roll < 0.75) return 'surge';
  return 'guard';
}

// Score one card for one intent. Damage is king on a strike, defence on a
// guard, draw and cheap plays on a surge. Mana efficiency always matters.
export function scoreCardForIntent(face, intent, game) {
  let score = 0;
  if (intent === 'strike') {
    score += face.attack * 3;
    score += face.draw * 1;
    score -= face.heal * 0.5;
    score -= face.shield * 0.5;
  } else if (intent === 'guard') {
    score += face.shield * 3;
    score += face.heal * 3;
    score += face.attack * 1;
  } else {
    score += face.draw * 4;
    score += face.attack * 2;
    score += face.shield * 1;
    score += face.heal * 1;
  }
  score -= face.cost * 0.6;
  // A killing blow is always worth taking, whatever the plan was.
  if (face.attack >= game.player.life) score += 50;
  return score;
}

// Play Rook's turn: keep playing the best-scoring affordable card for the
// intent until mana runs out or nothing scores above zero. Returns the
// events for the log, in play order.
export function takeEnemyTurn(game, intent) {
  const events = [];
  const rook = game.enemy;
  for (let step = 0; step < 6; step += 1) {
    if (game.phase !== 'play') break;
    let bestIndex = -1;
    let bestScore = 0;
    rook.hand.forEach((id, index) => {
      const face = faceById(id);
      if (!face || face.cost > rook.mana) return;
      const score = scoreCardForIntent(face, intent, game);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex < 0) break;
    const face = faceById(rook.hand[bestIndex]);
    // The same playCard rule as the player's, so the AI and the player can
    // never drift apart: one rules function serves both sides.
    const result = playCard(game, 'enemy', bestIndex);
    if (!result.ok) break;
    events.push(...result.events);
    if (face && face.attack >= 0 && game.phase !== 'play') break;
  }
  return events;
}
