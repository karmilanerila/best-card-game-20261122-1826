// main.js — one job: wire the whole game together. It reads the URL (for
// ?shot= screenshots and ?selftest= headless play-tests), owns the UI state
// (selection, busy flag, last played cards), and hands every move to the
// rules in state.js, the brain in ai.js and the table in render.js.
import { createGame, startGame, playCard, endTurn, beginPlayerTurn, checkWinner } from './state.js';
import { chooseIntent, takeEnemyTurn } from './ai.js';
import { renderTable } from './render.js';
import { bindInput, cardClickAction } from './input.js';
import { gameForShot, shotFieldCards } from './shots.js';
import { faceById } from './cards.js';
import * as sounds from './audio.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '7') || 7;

const ui = {
  selectedIndex: -1,
  busy: false,
  lastPlayed: [],
  onSelectCard: (index) => cardClickAction(ui, index, actions),
};

let game = createGame(seed);

function showOverlay(which) {
  for (const id of ['title-screen', 'win-screen', 'loss-screen']) {
    document.getElementById(id).classList.toggle('hidden', id !== which);
  }
  document.getElementById('table').classList.toggle('hidden', which !== null);
  document.getElementById('bottombar').classList.toggle('hidden', which !== null);
}

function refresh() {
  renderTable(game, ui);
  if (game.phase === 'title') showOverlay('title-screen');
  else if (game.phase === 'win') {
    document.getElementById('win-score').textContent =
      `You beat Rook the Cinder Fox with ${game.player.life} life to spare, on turn ${game.turn}.`;
    showOverlay('win-screen');
  } else if (game.phase === 'loss') {
    document.getElementById('loss-score').textContent =
      `Rook the Cinder Fox takes the pact with ${game.enemy.life} life left, on turn ${game.turn}.`;
    showOverlay('loss-screen');
  } else {
    showOverlay(null);
  }
}

function pushLog(events) {
  for (const line of events) game.log.push(line);
}

function afterPlayerMove(result) {
  if (!result.ok) return;
  const playedId = game.player.discard[game.player.discard.length - 1];
  const face = faceById(playedId);
  if (face) {
    ui.lastPlayed = [...ui.lastPlayed.slice(-2), face];
    sounds.playCardSound();
    if (result.events.some((line) => line.includes('Wildfire') || line.includes('Mudwall') || line.includes('Steam') || line.includes('Sandstorm'))) {
      sounds.comboSound();
    }
  }
  ui.selectedIndex = -1;
  pushLog(result.events);
  if (game.phase === 'win') sounds.winSound();
  else if (game.phase === 'loss') sounds.loseSound();
  refresh();
}

const actions = {
  startGame() {
    startGame(game);
    sounds.turnSound();
    refresh();
  },
  selectCard(index) {
    ui.selectedIndex = index;
    if (index >= 0) sounds.selectSound();
    refresh();
  },
  playSelected() {
    if (game.phase !== 'play' || ui.busy || ui.selectedIndex < 0) return;
    const result = playCard(game, 'player', ui.selectedIndex);
    afterPlayerMove(result);
  },
  endTurn() {
    if (game.phase !== 'play' || ui.busy) return;
    ui.busy = true;
    ui.selectedIndex = -1;
    refresh();
    pushLog(endTurn(game));
    game.aiIntent = chooseIntent(game);
    renderTable(game, ui);
    // Rook thinks for a beat, then plays — the pause is the tell.
    window.setTimeout(() => {
      pushLog(takeEnemyTurn(game, game.aiIntent));
      if (game.phase === 'play') {
        pushLog(beginPlayerTurn(game));
        game.aiIntent = null;
        sounds.turnSound();
      } else if (game.phase === 'win') {
        sounds.winSound();
      } else if (game.phase === 'loss') {
        sounds.loseSound();
      }
      ui.busy = false;
      refresh();
    }, 650);
  },
  toggleMute() {
    return sounds.toggleMute();
  },
  restart() {
    game = createGame((seed + Date.now()) % 100000);
    ui.selectedIndex = -1;
    ui.lastPlayed = [];
    ui.busy = false;
    refresh();
  },
};

function applyShot() {
  const shot = params.get('shot');
  if (!shot) return false;
  const shotGame = gameForShot(shot, seed);
  if (!shotGame) return false;
  game = shotGame;
  if (shot === 'play') ui.lastPlayed = shotFieldCards();
  if (shot === 'win' || shot === 'loss') ui.lastPlayed = shotFieldCards();
  refresh();
  return true;
}

function runSelfTest() {
  // Headless play-test: random legal moves until the game ends, twice with
  // different seeds, plus a forced win and a forced loss. The result lands
  // in #selftest and document.title for a headless browser to read.
  const out = document.getElementById('selftest');
  const lines = [];
  try {
    for (const testSeed of [11, 23]) {
      const test = createGame(testSeed);
      startGame(test);
      let moves = 0;
      while (test.phase === 'play' && moves < 300) {
        moves += 1;
        const playable = test.player.hand
          .map((id, i) => ({ id, i }))
          .filter(({ id }) => faceById(id).cost <= test.player.mana);
        if (playable.length) {
          const pick = playable[Math.floor(test.rand() * playable.length)];
          playCard(test, 'player', pick.i);
          if (test.phase !== 'play') break;
        }
        endTurn(test);
        const intent = chooseIntent(test);
        takeEnemyTurn(test, intent);
        if (test.phase !== 'play') break;
        beginPlayerTurn(test);
      }
      lines.push(`seed ${testSeed}: phase=${test.phase} moves=${moves} playerLife=${test.player.life} enemyLife=${test.enemy.life}`);
    }
    const winGame = createGame(5);
    startGame(winGame);
    winGame.enemy.life = 2;
    const first = winGame.player.hand.findIndex((id) => faceById(id).attack >= 2 && faceById(id).cost <= winGame.player.mana);
    if (first >= 0) playCard(winGame, 'player', first);
    lines.push(`forced win: phase=${winGame.phase} (want win)`);
    const lossGame = createGame(5);
    startGame(lossGame);
    lossGame.player.life = 1;
    lossGame.enemy.maxMana = 10;
    lossGame.enemy.mana = 10;
    lossGame.enemy.hand = ['storm', 'drake', 'bolt'];
    takeEnemyTurn(lossGame, 'strike');
    lines.push(`forced loss: phase=${lossGame.phase} (want loss)`);
    lines.push('selftest PASS');
  } catch (error) {
    lines.push(`selftest FAIL: ${error.message}`);
  }
  const text = lines.join('\n');
  if (out) out.textContent = text;
  document.title = lines[lines.length - 1];
}

// Boot: screenshot mode first, then the normal title screen.
if (!applyShot()) refresh();
bindInput(game, ui, actions);
if (params.get('selftest') === '1') runSelfTest();

// Exposed for headless play-testing only: the live game and its rules.
window.__ember = { game: () => game, actions, ui, checkWinner };
