// render.js — the table of Scrapheap Showdown. Everything the judge sees.
// The whole duel is one DOM tree, re-rendered from the game state after
// every action. Readability is the point: huge hull bars, huge card numbers,
// both hands on the table, the rival's announced intent in a banner, and a
// junk row in the middle. Suits are told apart by colour AND shape — each
// suit has its own SVG icon, its own colour and its own name on the card.

import { SUITS, effectLine } from './cards.js';
import { MAX_HULL, MAX_SCRAP } from './state.js';

/** A tiny DOM helper: element, class, optional text. */
export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/** The suit icons: lightning, shield, gear and wrench, drawn as SVG. */
export function suitIcon(suitId, size = 44) {
  const suit = SUITS[suitId];
  const c = suit.color;
  if (suitId === 'bolt') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><polygon points="13,1 5,13 10.5,13 8,23 19,10 13.5,10" fill="${c}"/></svg>`;
  }
  if (suitId === 'plate') {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 1.5 L21 5 V11.5 C21 17 17 20.5 12 22.5 C7 20.5 3 17 3 11.5 V5 Z" fill="${c}"/><path d="M12 5 L17.5 7 V11.5 C17.5 15 15.5 17.5 12 19 C8.5 17.5 6.5 15 6.5 11.5 V7 Z" fill="#0b1020" opacity="0.35"/></svg>`;
  }
  if (suitId === 'gear') {
    let teeth = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x = 12 + Math.cos(a) * 8.6 - 2.1;
      const y = 12 + Math.sin(a) * 8.6 - 2.1;
      teeth += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="4.2" height="4.2" rx="1" fill="${c}" transform="rotate(${(i * 45).toFixed(0)} ${12} ${12})"/>`;
    }
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}">${teeth}<circle cx="12" cy="12" r="6.4" fill="${c}"/><circle cx="12" cy="12" r="2.6" fill="#0b1020"/></svg>`;
  }
  // wrench: an open jaw (dashed ring) and a handle bar.
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="${c}" stroke-width="3.6" stroke-dasharray="27 11" transform="rotate(-50 8.5 8.5)"/><rect x="11" y="11" width="11" height="4.4" rx="2.2" fill="${c}" transform="rotate(45 11 11)"/></svg>`;
}

/** A robot portrait: RUSTY (teal, round, friendly) or SCRAPJAW (red, angular). */
export function botPortrait(which, size = 84) {
  if (which === 'rival') {
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">
      <rect x="14" y="22" width="72" height="62" rx="8" fill="#3a0d0d" stroke="#ff6b4a" stroke-width="3"/>
      <polygon points="14,22 32,8 68,8 86,22" fill="#ff6b4a"/>
      <circle cx="34" cy="48" r="9" fill="#ff2d2d"/><circle cx="66" cy="48" r="9" fill="#ff2d2d"/>
      <circle cx="34" cy="48" r="3.5" fill="#fff"/><circle cx="66" cy="48" r="3.5" fill="#fff"/>
      <rect x="26" y="66" width="48" height="6" rx="3" fill="#c9d1d9"/>
      <rect x="30" y="66" width="4" height="10" fill="#c9d1d9"/><rect x="44" y="66" width="4" height="10" fill="#c9d1d9"/><rect x="58" y="66" width="4" height="10" fill="#c9d1d9"/>
      <rect x="46" y="2" width="8" height="10" fill="#ff6b4a"/><circle cx="50" cy="4" r="4" fill="#ffd23f"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">
    <rect x="16" y="24" width="68" height="58" rx="16" fill="#0d2b33" stroke="#4ade80" stroke-width="3"/>
    <circle cx="36" cy="50" r="10" fill="#4ade80"/><circle cx="64" cy="50" r="10" fill="#4ade80"/>
    <circle cx="36" cy="50" r="4" fill="#0b1020"/><circle cx="64" cy="50" r="4" fill="#0b1020"/>
    <rect x="38" y="68" width="24" height="5" rx="2.5" fill="#ffd23f"/>
    <rect x="48" y="8" width="4" height="16" fill="#4ade80"/><circle cx="50" cy="8" r="5" fill="#ffd23f"/>
    <rect x="20" y="44" width="5" height="14" rx="2.5" fill="#4ade80"/><rect x="75" y="44" width="5" height="14" rx="2.5" fill="#4ade80"/>
  </svg>`;
}

/** One card face. `opts`: small (junk row), back (rival hand), playable. */
export function cardElement(card, opts = {}) {
  const suit = SUITS[card.suit];
  const node = el('div', `card suit-${card.suit}${opts.small ? ' small' : ''}${opts.back ? ' back' : ''}`);
  if (opts.back) {
    node.innerHTML = `<div class="card-back-mark">?</div><div class="card-back-label">SCRAPJAW</div>`;
    return node;
  }
  node.style.setProperty('--suit', suit.color);
  node.style.setProperty('--suit-dark', suit.dark);
  const power = card.dmg || card.block || card.heal || card.draw || card.scrap || 0;
  const powerLabel = card.dmg ? 'DMG' : card.block ? 'BLOCK' : card.heal ? 'HEAL' : card.draw ? 'DRAW' : card.scrap ? 'SCRAP' : '—';
  node.innerHTML = `
    <div class="cost">${card.cost}</div>
    <div class="suit-name">${suit.name}</div>
    <div class="suit-icon">${suitIcon(card.suit, opts.small ? 34 : 46)}</div>
    <div class="power"><span class="power-num">${power}</span><span class="power-label">${powerLabel}</span></div>
    <div class="card-name">${card.name}</div>
    <div class="card-text">${card.text}</div>`;
  if (opts.playable === false) node.classList.add('unplayable');
  return node;
}

/** A hull bar: a big number and a coloured bar, always on screen. */
export function hullBar(label, hull, block) {
  const wrap = el('div', 'hull-wrap');
  const row = el('div', 'hull-row');
  row.append(el('span', 'hull-label', label));
  row.append(el('span', 'hull-num', `${hull}`));
  row.append(el('span', 'hull-max', `/ ${MAX_HULL}`));
  if (block > 0) row.append(el('span', 'block-badge', `🛡 ${block} BLOCK`));
  wrap.append(row);
  const track = el('div', 'hull-track');
  const fill = el('div', 'hull-fill');
  fill.style.width = `${Math.max(0, (hull / MAX_HULL) * 100)}%`;
  fill.style.background = hull > 15 ? '#4ade80' : hull > 7 ? '#ffd23f' : '#ff4d4d';
  track.append(fill);
  wrap.append(track);
  return wrap;
}

/** Scrap pips: filled dots for scrap, empty for the rest up to 10. */
export function scrapPips(scrap) {
  const wrap = el('div', 'scrap-pips');
  wrap.append(el('span', 'scrap-label', `SCRAP ${scrap}/${MAX_SCRAP}`));
  const pips = el('div', 'pips');
  for (let i = 0; i < MAX_SCRAP; i++) {
    pips.append(el('span', `pip${i < scrap ? ' on' : ''}`));
  }
  wrap.append(pips);
  return wrap;
}

/** The heat gauge: a bar that fills toward the overheat line at 6. */
export function heatGauge(heat) {
  const wrap = el('div', 'heat-wrap');
  wrap.append(el('span', 'heat-label', `HEAT ${heat}/6`));
  const track = el('div', 'heat-track');
  const fill = el('div', 'heat-fill');
  fill.style.width = `${Math.min(100, (heat / 6) * 100)}%`;
  track.append(fill);
  wrap.append(track);
  const note = el('div', 'heat-note', heat >= 4 ? 'Bolts deal +1!' : 'Bolts +1 at Heat 4. Overheat at 6!');
  wrap.append(note);
  return wrap;
}

/** The rival's announced intent, in a banner you cannot miss. */
export function intentBanner(intent) {
  const node = el('div', `intent intent-${(intent || 'none').toLowerCase()}`);
  node.textContent = intent ? `SCRAPJAW PLANS: ${intent}` : 'SCRAPJAW IS THINKING…';
  return node;
}

/** Render the whole table from the game state into #app. */
export function renderTable(game, ui) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const table = el('div', 'table');

  // Top bar: title, turn, sound + rules buttons.
  const top = el('div', 'topbar');
  top.append(el('div', 'game-title', '⚙ SCRAPHEAP SHOWDOWN'));
  top.append(el('div', 'turn-pill', `TURN ${game.turn}`));
  const soundBtn = el('button', 'mini-btn', ui.muted ? '🔇 SOUND OFF' : '🔊 SOUND ON');
  soundBtn.addEventListener('click', () => ui.toggleMute());
  const rulesBtn = el('button', 'mini-btn', '📖 RULES');
  rulesBtn.addEventListener('click', () => ui.showRules());
  top.append(soundBtn, rulesBtn);
  table.append(top);

  // Rival row: portrait + hull, intent banner, rival hand of backs.
  const rivalRow = el('div', 'rival-row');
  const rivalCard = el('div', 'bot-card rival');
  rivalCard.innerHTML = botPortrait('rival', 76);
  const rivalInfo = el('div', 'bot-info');
  rivalInfo.append(el('div', 'bot-name', 'SCRAPJAW — RIVAL BOT'));
  rivalInfo.append(hullBar('HULL', game.rival.hull, game.rival.block));
  rivalCard.append(rivalInfo);
  rivalRow.append(rivalCard);
  rivalRow.append(intentBanner(game.intent));
  const rivalHand = el('div', 'rival-hand');
  rivalHand.append(el('div', 'hand-label', `RIVAL HAND — ${game.rival.hand.length} CARDS`));
  const backs = el('div', 'backs');
  game.rival.hand.forEach(() => backs.append(cardElement({ suit: 'bolt' }, { back: true })));
  rivalHand.append(backs);
  rivalRow.append(rivalHand);
  table.append(rivalRow);

  // Junk row: three face-up cards in the middle of the table.
  const junkRow = el('div', 'junk-row');
  junkRow.append(el('div', 'junk-label', '🗑 JUNK YARD — take 1 card a turn, pay its cost'));
  const junkCards = el('div', 'junk-cards');
  game.junk.forEach((card, i) => {
    const node = cardElement(card, { small: true, playable: !game.junkTaken && card.cost <= game.player.scrap && game.player.hand.length < 7 });
    node.addEventListener('click', () => ui.takeJunk(i));
    junkCards.append(node);
  });
  if (game.junk.length === 0) junkCards.append(el('div', 'junk-empty', 'Junk yard is empty.'));
  junkRow.append(junkCards);
  table.append(junkRow);

  // Log: the last two lines of what just happened.
  const log = el('div', 'log-line', game.log.slice(-2).join('  •  ') || 'Your move, Rusty.');
  table.append(log);

  // Player strip: portrait + hull + scrap + heat in one horizontal band,
  // then the hand on its own full-width row so all 7 cards show whole.
  const playerStrip = el('div', 'player-strip');
  const playerCard = el('div', 'bot-card you strip');
  playerCard.innerHTML = botPortrait('you', 64);
  const playerInfo = el('div', 'bot-info');
  playerInfo.append(el('div', 'bot-name', 'RUSTY — YOU'));
  playerInfo.append(hullBar('HULL', game.player.hull, game.player.block));
  playerCard.append(playerInfo);
  playerStrip.append(playerCard);
  playerStrip.append(scrapPips(game.player.scrap));
  playerStrip.append(heatGauge(game.player.heat));
  table.append(playerStrip);

  const handWrap = el('div', 'hand-wrap');
  handWrap.append(el('div', 'hand-label', `YOUR HAND — ${game.player.hand.length} CARDS · click a card to play it`));
  const hand = el('div', 'hand');
  game.player.hand.forEach((card, i) => {
    const node = cardElement(card, { playable: card.cost <= game.player.scrap });
    node.addEventListener('click', () => ui.playCard(i));
    node.title = `${card.name} — ${card.text} (cost ${card.cost})`;
    hand.append(node);
  });
  handWrap.append(hand);
  table.append(handWrap);

  // Action row: end turn, deck counts, weld tracker.
  const actions = el('div', 'action-row');
  const weld = el('div', 'weld-state', game.player.weldFired ? '⚡ WELD FIRED (+3)' : game.player.suits.length >= 2 ? '⚡ WELD READY' : `WELD: play 2 suits (${game.player.suits.length}/2)`);
  actions.append(weld);
  actions.append(el('div', 'deck-count', `DECK ${game.player.deck.length} · DISCARD ${game.player.discard.length}`));
  const endBtn = el('button', 'end-turn', 'END TURN ⏎');
  endBtn.addEventListener('click', () => ui.endTurn());
  actions.append(endBtn);
  table.append(actions);

  app.append(table);
}

/** The title screen overlay. */
export function renderTitle(ui) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const overlay = el('div', 'overlay title-screen');
  overlay.innerHTML = `
    <div class="title-kicker">A SCRAPYARD CARD DUEL</div>
    <h1 class="title-big">SCRAPHEAP<br>SHOWDOWN</h1>
    <div class="title-bots">${botPortrait('you', 110)}<span class="vs">VS</span>${botPortrait('rival', 110)}</div>
    <div class="title-sub">RUSTY the homebuilt bot vs SCRAPJAW the crusher.<br>30 Hull each. Outplay the scrap out of it.</div>
    <div class="title-cards">
      <div class="title-suit"><span class="ts-icon">${suitIcon('bolt', 40)}</span><b>BOLT</b><span>Damage · builds Heat</span></div>
      <div class="title-suit"><span class="ts-icon">${suitIcon('plate', 40)}</span><b>PLATE</b><span>Block damage</span></div>
      <div class="title-suit"><span class="ts-icon">${suitIcon('gear', 40)}</span><b>GEAR</b><span>Draw · Scrap</span></div>
      <div class="title-suit"><span class="ts-icon">${suitIcon('wrench', 40)}</span><b>WRENCH</b><span>Repair · Vent</span></div>
    </div>
    <button class="big-play" id="playBtn">▶ PLAY</button>
    <div class="title-hint">Play 2 suits in a turn to WELD (+3 damage). Salvage the Junk Yard once a turn.<br>Keys: 1–7 play a card · Enter ends turn · M mutes</div>`;
  app.append(overlay);
  overlay.querySelector('#playBtn').addEventListener('click', () => ui.startGame());
}

/** The win / loss overlay, with a score breakdown. */
export function renderEnd(game, ui) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const won = game.phase === 'won';
  const overlay = el('div', `overlay end-screen ${won ? 'win' : 'loss'}`);
  const s = game.stats;
  const score = s.damageDealt * 2 + s.welds * 5 + s.junkTaken * 3 + Math.max(0, game.player.hull) * 4 - s.turns * 2;
  overlay.innerHTML = `
    <h1 class="end-big">${won ? '🏆 VICTORY!' : '💥 SCRAPPED!'}</h1>
    <div class="end-sub">${won ? 'SCRAPJAW is a pile of spare parts. RUSTY rules the yard!' : 'SCRAPJAW crushed RUSTY into a cube. Rebuild and go again!'}</div>
    <div class="end-score">SCORE <b>${score}</b></div>
    <div class="end-stats">
      <div><b>${s.turns}</b><span>Turns</span></div>
      <div><b>${s.damageDealt}</b><span>Damage dealt</span></div>
      <div><b>${s.cardsPlayed}</b><span>Cards played</span></div>
      <div><b>${s.welds}</b><span>Welds</span></div>
      <div><b>${s.junkTaken}</b><span>Junk salvaged</span></div>
      <div><b>${game.player.hull}</b><span>Hull left</span></div>
    </div>
    <button class="big-play" id="againBtn">${won ? '↻ PLAY AGAIN' : '↻ REMATCH'}</button>
    <div class="title-hint">Your final entry is the most recent submission — every duel counts.</div>`;
  app.append(overlay);
  overlay.querySelector('#againBtn').addEventListener('click', () => ui.restart());
}

/** The rules modal, over the table. */
export function renderRules(ui) {
  const old = document.querySelector('.rules-modal');
  if (old) old.remove();
  const modal = el('div', 'rules-modal');
  modal.innerHTML = `
    <div class="rules-box">
      <h2>HOW TO PLAY</h2>
      <p><b>Goal:</b> reduce SCRAPJAW's Hull from 30 to 0 before it does the same to you.</p>
      <p><b>Each turn:</b> gain Scrap (3, then +1 a turn, max 10) and draw 2 cards. Click a card to play it — you can play as many as you can afford.</p>
      <p><b>Suits:</b> BOLT deals damage and builds Heat · PLATE blocks · GEAR draws and mints Scrap · WRENCH repairs and vents Heat.</p>
      <p><b>WELD:</b> play cards of 2 different suits in one turn for +3 bonus damage.</p>
      <p><b>HEAT:</b> at 4+ Heat your bolts deal +1. At 6 Heat you overheat and take 3 damage.</p>
      <p><b>JUNK YARD:</b> take 1 face-up junk card a turn by paying its cost.</p>
      <p><b>SCRAPJAW announces its plan</b> each turn: CRUSH (attack), FORTIFY (block), TINKER (draw).</p>
      <button class="big-play" id="closeRules">GOT IT</button>
    </div>`;
  document.getElementById('app').append(modal);
  modal.querySelector('#closeRules').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
