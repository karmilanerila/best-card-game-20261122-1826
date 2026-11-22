// cards.js — one job: everything a card IS. The four elements, the twelve
// card faces, the combo table, and the deck builder. No game flow lives here.
import { seededShuffle } from './rng.js';

// Each element is told apart by colour AND shape, never by text alone:
// Ember is a red triangle, Tide a blue circle, Gale a teal diamond,
// Stone an amber square. The glyph is drawn big on every card face.
export const ELEMENTS = {
  ember: { name: 'Ember', glyph: '▲', color: '#e8491d', dark: '#7a1e05', soft: '#ffd9c9' },
  tide: { name: 'Tide', glyph: '●', color: '#1d7fe8', dark: '#0a3d75', soft: '#cfe6ff' },
  gale: { name: 'Gale', glyph: '◆', color: '#0da37a', dark: '#06563f', soft: '#c8f5e6' },
  stone: { name: 'Stone', glyph: '■', color: '#c07f1d', dark: '#6b4305', soft: '#ffe9bf' },
};

// A card face: id, name, element, mana cost, and what it does when played.
// attack hurts the foe, shield blocks incoming damage, heal restores life,
// draw pulls extra cards. text is the one-line rule printed on the card.
export const CARD_FACES = [
  { id: 'imp', name: 'Ember Imp', element: 'ember', cost: 1, attack: 2, shield: 0, heal: 0, draw: 0, text: 'A spark with teeth. Deal 2.' },
  { id: 'bolt', name: 'Cinder Bolt', element: 'ember', cost: 2, attack: 3, shield: 0, heal: 0, draw: 0, text: 'A lance of live coal. Deal 3.' },
  { id: 'drake', name: 'Ember Drake', element: 'ember', cost: 4, attack: 6, shield: 0, heal: 0, draw: 0, text: 'The pact’s old dragon. Deal 6.' },
  { id: 'sprite', name: 'Tide Sprite', element: 'tide', cost: 1, attack: 2, shield: 0, heal: 1, draw: 0, text: 'Deal 2. Mend 1 life.' },
  { id: 'rain', name: 'Healing Rain', element: 'tide', cost: 2, attack: 0, shield: 0, heal: 5, draw: 0, text: 'Warm rain. Mend 5 life.' },
  { id: 'serpent', name: 'Tide Serpent', element: 'tide', cost: 4, attack: 5, shield: 0, heal: 2, draw: 0, text: 'Deal 5. Mend 2 life.' },
  { id: 'hawk', name: 'Gale Hawk', element: 'gale', cost: 2, attack: 3, shield: 0, heal: 0, draw: 1, text: 'Deal 3. Draw a card.' },
  { id: 'storm', name: 'Gale Storm', element: 'gale', cost: 5, attack: 7, shield: 0, heal: 0, draw: 0, text: 'The sky falls. Deal 7.' },
  { id: 'wall', name: 'Stone Wall', element: 'stone', cost: 2, attack: 0, shield: 6, heal: 0, draw: 0, text: 'Raise a wall. Shield 6.' },
  { id: 'golem', name: 'Stone Golem', element: 'stone', cost: 3, attack: 4, shield: 3, heal: 0, draw: 0, text: 'Deal 4. Shield 3.' },
  { id: 'fox', name: 'Cinder Fox', element: 'ember', cost: 3, attack: 4, shield: 0, heal: 0, draw: 1, text: 'Deal 4. Draw a card.' },
  { id: 'heron', name: 'Tide Heron', element: 'tide', cost: 3, attack: 3, shield: 2, heal: 2, draw: 0, text: 'Deal 3. Shield 2. Mend 2.' },
];

export function faceById(id) {
  return CARD_FACES.find((face) => face.id === id) || null;
}

// Combos: play two different elements on the same turn and the pact
// answers. The pair is order-free; each pair fires at most once a turn.
export const COMBOS = [
  { pair: ['ember', 'gale'], name: 'Wildfire', text: 'Wildfire! +3 damage.', bonusAttack: 3, bonusShield: 0, bonusHeal: 0, bonusDraw: 0 },
  { pair: ['tide', 'stone'], name: 'Mudwall', text: 'Mudwall! +4 shield.', bonusAttack: 0, bonusShield: 4, bonusHeal: 0, bonusDraw: 0 },
  { pair: ['ember', 'tide'], name: 'Steam', text: 'Steam! Draw a card.', bonusAttack: 0, bonusShield: 0, bonusHeal: 0, bonusDraw: 1 },
  { pair: ['gale', 'stone'], name: 'Sandstorm', text: 'Sandstorm! 2 damage.', bonusAttack: 2, bonusShield: 0, bonusHeal: 0, bonusDraw: 0 },
];

export function comboFor(elementsPlayed) {
  const have = new Set(elementsPlayed);
  return COMBOS.find((combo) => have.has(combo.pair[0]) && have.has(combo.pair[1])) || null;
}

// A deck is two copies of every face, shuffled by seed: 24 cards.
export function buildDeck(rand) {
  const ids = [];
  for (const face of CARD_FACES) ids.push(face.id, face.id);
  return seededShuffle(ids, rand);
}

// A readable one-line summary of a card, used by the log and the AI.
export function describeCard(face) {
  const bits = [];
  if (face.attack) bits.push(`${face.attack} dmg`);
  if (face.shield) bits.push(`shield ${face.shield}`);
  if (face.heal) bits.push(`heal ${face.heal}`);
  if (face.draw) bits.push(`draw ${face.draw}`);
  return `${face.name} (${face.cost} mana): ${bits.join(', ') || 'nothing'}`;
}

// The cards in a hand the side can afford right now, with their indices —
// the shortlist the AI scores and the keyboard hints highlight.
export function affordableHand(hand, mana) {
  return hand
    .map((id, index) => ({ face: faceById(id), index }))
    .filter((entry) => entry.face && entry.face.cost <= mana);
}
