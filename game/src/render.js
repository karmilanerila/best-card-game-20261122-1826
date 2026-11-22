// render.js — one job: turn a game state into the table you see, and animate
// it. It builds every card, life bar, mana crystal and log line, and it is
// the only file that touches the DOM for the table itself.
import { ELEMENTS, faceById } from './cards.js';
import { INTENTS } from './ai.js';

const $ = (id) => document.getElementById(id);

export function elementColor(element) {
  return ELEMENTS[element].color;
}

// One card face as a DOM node. face-down cards show the pact's card back.
export function cardNode(face, options = {}) {
  const card = document.createElement('div');
  card.className = 'card';
  if (options.back) {
    card.classList.add('back');
    card.textContent = '✦';
    card.setAttribute('aria-label', 'Face-down card');
    return card;
  }
  const element = ELEMENTS[face.element];
  card.style.setProperty('--el', element.color);
  card.dataset.cardId = face.id;
  const cost = document.createElement('span');
  cost.className = 'cost';
  cost.textContent = face.cost;
  const glyph = document.createElement('div');
  glyph.className = 'glyph';
  glyph.textContent = element.glyph;
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = face.name;
  const stats = document.createElement('div');
  stats.className = 'stats';
  // Attack, shield, heal and draw each get their own symbol, so a card's
  // job is readable even before its rule text is read.
  const bits = [];
  if (face.attack) bits.push(`⚔ ${face.attack}`);
  if (face.shield) bits.push(`⛨ ${face.shield}`);
  if (face.heal) bits.push(`✚ ${face.heal}`);
  if (face.draw) bits.push(`▤ ${face.draw}`);
  stats.textContent = bits.join('  ') || '—';
  const rule = document.createElement('div');
  rule.className = 'rule';
  rule.textContent = face.text;
  const elementLine = document.createElement('div');
  elementLine.className = 'rule';
  elementLine.textContent = `${element.glyph} ${element.name}`;
  card.append(cost, glyph, name, stats, rule, elementLine);
  if (options.playable) card.classList.add('playable');
  if (options.selected) card.classList.add('selected');
  if (options.unaffordable) card.classList.add('unaffordable');
  if (options.dealt) card.classList.add('dealt');
  if (options.played) card.classList.add('played');
  return card;
}

// A life bar plus the big number, for one side of the table.
export function renderLife(side, life, shield) {
  const bar = $(side === 'player' ? 'player-life-bar' : 'enemy-life-bar');
  const num = $(side === 'player' ? 'player-life-num' : 'enemy-life-num');
  const shieldLine = $(side === 'player' ? 'player-shield' : 'enemy-shield');
  if (bar) bar.style.width = `${Math.max(0, (life / 30) * 100)}%`;
  if (num) num.innerHTML = `${life}<small> / 30</small>`;
  if (shieldLine) shieldLine.textContent = shield > 0 ? `⛨ Shield ${shield}` : '';
}

// Mana as a row of crystals: filled for mana left, dark for spent.
export function renderMana(mana, maxMana) {
  const box = $('mana');
  if (!box) return;
  box.querySelectorAll('.crystal').forEach((node) => node.remove());
  const label = box.querySelector('.mana-label');
  for (let i = 0; i < maxMana; i += 1) {
    const crystal = document.createElement('span');
    crystal.className = 'crystal' + (i < mana ? '' : ' spent');
    box.insertBefore(crystal, label);
  }
  if (label) label.textContent = `${mana} / ${maxMana} mana`;
}

// The opponent's hand is always face-down: card backs plus a count.
export function renderEnemyHand(count) {
  const hand = $('enemy-hand');
  const countLabel = $('enemy-count');
  if (countLabel) countLabel.textContent = `${count} card${count === 1 ? '' : 's'} in hand`;
  if (!hand) return;
  hand.innerHTML = '';
  const shown = Math.min(count, 7);
  for (let i = 0; i < shown; i += 1) hand.append(cardNode(null, { back: true }));
  if (count > shown) {
    const more = document.createElement('div');
    more.className = 'side-label';
    more.textContent = `+${count - shown} more`;
    hand.append(more);
  }
}

// The player's hand, fanned left to right, with hover lift and selection.
export function renderPlayerHand(game, selectedIndex, onSelect) {
  const hand = $('player-hand');
  if (!hand) return;
  hand.innerHTML = '';
  game.player.hand.forEach((id, index) => {
    const face = faceById(id);
    if (!face) return;
    const node = cardNode(face, {
      playable: face.cost <= game.player.mana && game.phase === 'play',
      selected: index === selectedIndex,
      unaffordable: face.cost > game.player.mana,
      dealt: index === game.player.hand.length - 1,
    });
    node.addEventListener('click', () => onSelect(index));
    hand.append(node);
  });
}

// The middle of the table: the last cards played, or a hint when empty.
export function renderField(lastPlayed) {
  const field = $('field');
  if (!field) return;
  field.innerHTML = '';
  if (!lastPlayed || lastPlayed.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'No cards on the table yet — play a card and watch it land here.';
    field.append(hint);
    return;
  }
  for (const face of lastPlayed.slice(-3)) {
    const node = cardNode(face, { played: true });
    node.classList.add('played-card');
    field.append(node);
  }
}

// The battle log, newest at the bottom, combo lines highlighted.
export function renderLog(lines) {
  const log = $('log');
  if (!log) return;
  log.innerHTML = '';
  for (const line of lines.slice(-14)) {
    const row = document.createElement('div');
    if (line.includes('!') && (line.includes('Wildfire') || line.includes('Mudwall') || line.includes('Steam') || line.includes('Sandstorm'))) {
      row.className = 'combo';
    }
    row.textContent = line;
    log.append(row);
  }
  log.scrollTop = log.scrollHeight;
}

// Rook's announced intent, so the player can read and counter it.
export function renderIntent(intentKey) {
  const box = $('intent');
  if (!box) return;
  if (!intentKey) {
    box.innerHTML = 'Rook is watching you. Play a card.';
    return;
  }
  const intent = INTENTS[intentKey];
  box.innerHTML = `Rook intends to <b>${intent.name}</b> — ${intent.hint}`;
}

// One full repaint of the table from the state. Cheap enough to call after
// every move; animations come from the card classes, not from diffing.
export function renderTable(game, ui) {
  renderLife('player', game.player.life, game.player.shield);
  renderLife('enemy', game.enemy.life, game.enemy.shield);
  renderMana(game.player.mana, game.player.maxMana);
  renderEnemyHand(game.enemy.hand.length);
  renderPlayerHand(game, ui.selectedIndex, ui.onSelectCard);
  renderField(ui.lastPlayed);
  renderLog(game.log);
  renderIntent(game.aiIntent);
  const turnLabel = $('turn-label');
  if (turnLabel) turnLabel.textContent = `Turn ${game.turn} — ${game.player.deck.length} cards left in your deck`;
  const endButton = $('end-turn');
  if (endButton) endButton.disabled = game.phase !== 'play' || ui.busy;
  const status = $('status');
  if (status) status.textContent = `You have ${game.player.life} life, Rook has ${game.enemy.life}. Mana ${game.player.mana} of ${game.player.maxMana}.`;
}
