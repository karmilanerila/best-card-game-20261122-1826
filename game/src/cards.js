// cards.js — the deck of Scrapheap Showdown.
// Four suits, told apart by colour AND shape, never by text alone: each suit
// has its own colour, its own icon shape and its own job in a duel.
//   BOLT   (yellow, lightning)  — damage, and it builds HEAT
//   PLATE  (blue, shield)       — block that soaks damage
//   GEAR   (green, cog)         — draw cards and mint scrap
//   WRENCH (red-orange, wrench) — repair hull and vent heat
// A card's effect is one plain object: damage, block, draw, scrap, heal,
// vent and heat are all numbers, so the engine and the AI read cards the
// same way and no card needs special-case code.

export const SUITS = {
  bolt: { id: 'bolt', name: 'BOLT', color: '#ffd23f', dark: '#8a6d00', job: 'Damage' },
  plate: { id: 'plate', name: 'PLATE', color: '#4da6ff', dark: '#0b3d91', job: 'Block' },
  gear: { id: 'gear', name: 'GEAR', color: '#4ade80', dark: '#14532d', job: 'Draw + Scrap' },
  wrench: { id: 'wrench', name: 'WRENCH', color: '#ff6b4a', dark: '#7f1d0d', job: 'Repair' },
};

export const SUIT_IDS = ['bolt', 'plate', 'gear', 'wrench'];

/** One face of the deck: id, suit, name, cost and the effect numbers. */
const FACES = [
  // BOLT — damage. Every bolt adds 1 heat; Overload and Tesla add more.
  { id: 'spark', suit: 'bolt', name: 'Spark', cost: 1, dmg: 2, heat: 1, text: 'Deal 2 damage. +1 Heat.' },
  { id: 'arc', suit: 'bolt', name: 'Arc Jump', cost: 2, dmg: 2, draw: 1, heat: 1, text: 'Deal 2 damage. Draw 1. +1 Heat.' },
  { id: 'zap', suit: 'bolt', name: 'Zap', cost: 2, dmg: 4, heat: 1, text: 'Deal 4 damage. +1 Heat.' },
  { id: 'overload', suit: 'bolt', name: 'Overload', cost: 2, dmg: 3, heat: 2, text: 'Deal 3 damage. +2 Heat.' },
  { id: 'surge', suit: 'bolt', name: 'Surge', cost: 3, dmg: 6, heat: 1, text: 'Deal 6 damage. +1 Heat.' },
  { id: 'tesla', suit: 'bolt', name: 'Tesla Coil', cost: 3, dmg: 5, heat: 2, text: 'Deal 5 damage. +2 Heat.' },
  // PLATE — block. Block soaks damage, then fades when your next turn starts.
  { id: 'rivet', suit: 'plate', name: 'Rivet', cost: 1, block: 2, draw: 1, text: 'Gain 2 Block. Draw 1.' },
  { id: 'patch', suit: 'plate', name: 'Patch Plate', cost: 1, block: 3, text: 'Gain 3 Block.' },
  { id: 'bulkhead', suit: 'plate', name: 'Bulkhead', cost: 2, block: 5, text: 'Gain 5 Block.' },
  { id: 'fortify', suit: 'plate', name: 'Fortify', cost: 2, block: 4, heal: 1, text: 'Gain 4 Block. Repair 1.' },
  { id: 'shell', suit: 'plate', name: 'Shell', cost: 2, block: 6, text: 'Gain 6 Block.' },
  { id: 'aegis', suit: 'plate', name: 'Aegis', cost: 3, block: 8, text: 'Gain 8 Block.' },
  // GEAR — the engine: draw cards and mint scrap.
  { id: 'crank', suit: 'gear', name: 'Crank', cost: 1, scrap: 2, text: 'Gain 2 Scrap.' },
  { id: 'oil', suit: 'gear', name: 'Oil Can', cost: 1, draw: 2, text: 'Draw 2 cards.' },
  { id: 'cogwork', suit: 'gear', name: 'Cogwork', cost: 1, draw: 1, scrap: 1, text: 'Draw 1. Gain 1 Scrap.' },
  { id: 'sprocket', suit: 'gear', name: 'Sprocket', cost: 2, draw: 2, scrap: 1, text: 'Draw 2. Gain 1 Scrap.' },
  { id: 'turbine', suit: 'gear', name: 'Turbine', cost: 2, draw: 1, scrap: 2, text: 'Draw 1. Gain 2 Scrap.' },
  { id: 'dynamo', suit: 'gear', name: 'Dynamo', cost: 3, draw: 3, text: 'Draw 3 cards.' },
  // WRENCH — repair hull and vent heat.
  { id: 'coolant', suit: 'wrench', name: 'Coolant', cost: 1, vent: 3, heal: 1, text: 'Vent 3 Heat. Repair 1.' },
  { id: 'grease', suit: 'wrench', name: 'Grease', cost: 1, heal: 3, text: 'Repair 3 Hull.' },
  { id: 'tuneup', suit: 'wrench', name: 'Tune-Up', cost: 2, heal: 3, draw: 1, text: 'Repair 3. Draw 1.' },
  { id: 'repair', suit: 'wrench', name: 'Repair', cost: 2, heal: 5, text: 'Repair 5 Hull.' },
  { id: 'weldtorch', suit: 'wrench', name: 'Weld Torch', cost: 2, heal: 4, text: 'Repair 4 Hull.' },
  { id: 'rebuild', suit: 'wrench', name: 'Rebuild', cost: 3, heal: 8, text: 'Repair 8 Hull.' },
];

/** A fresh copy of one face, so hands never share card objects. */
export function makeCard(faceId) {
  const face = FACES.find((f) => f.id === faceId);
  if (!face) throw new Error(`unknown card face ${faceId}`);
  return {
    id: face.id,
    suit: face.suit,
    name: face.name,
    cost: face.cost,
    text: face.text,
    dmg: face.dmg ?? 0,
    block: face.block ?? 0,
    draw: face.draw ?? 0,
    scrap: face.scrap ?? 0,
    heal: face.heal ?? 0,
    vent: face.vent ?? 0,
    heat: face.heat ?? 0,
  };
}

/** The full 24-card deck, in face order (shuffle it before dealing). */
export function buildDeck() {
  return FACES.map((f) => makeCard(f.id));
}

/** A face's suit record, for colours and labels. */
export function suitOf(card) {
  return SUITS[card.suit];
}

/** The short effect line shown under a card's power number. */
export function effectLine(card) {
  const parts = [];
  if (card.dmg) parts.push(`${card.dmg} DMG`);
  if (card.block) parts.push(`${card.block} BLOCK`);
  if (card.draw) parts.push(`DRAW ${card.draw}`);
  if (card.scrap) parts.push(`+${card.scrap} SCRAP`);
  if (card.heal) parts.push(`HEAL ${card.heal}`);
  if (card.vent) parts.push(`VENT ${card.vent}`);
  return parts.join(' · ');
}

/** The deck has 24 cards: 6 faces in each of the 4 suits. */
export const DECK_SIZE = FACES.length;

/** All faces of one suit, in deck order. */
export function facesOfSuit(suitId) {
  return FACES.filter((f) => f.suit === suitId).map((f) => makeCard(f.id));
}
