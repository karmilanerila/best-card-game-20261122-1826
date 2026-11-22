// input.js — one job: every way a human drives the game. Mouse clicks on
// cards and buttons, and the keyboard: 1–7 select a card, Enter plays it,
// E ends the turn, R restarts after a win or a loss, M mutes the sound.
export function bindInput(game, ui, actions) {
  const endButton = document.getElementById('end-turn');
  if (endButton) endButton.addEventListener('click', () => actions.endTurn());
  const playButton = document.getElementById('play-card');
  if (playButton) playButton.addEventListener('click', () => actions.playSelected());
  const muteButton = document.getElementById('mute');
  if (muteButton) {
    muteButton.addEventListener('click', () => {
      const nowMuted = actions.toggleMute();
      muteButton.textContent = nowMuted ? '🔇 Sound off' : '🔊 Sound on';
    });
  }
  const startButton = document.getElementById('start-button');
  if (startButton) startButton.addEventListener('click', () => actions.startGame());
  const againWin = document.getElementById('again-win');
  if (againWin) againWin.addEventListener('click', () => actions.restart());
  const againLoss = document.getElementById('again-loss');
  if (againLoss) againLoss.addEventListener('click', () => actions.restart());

  document.addEventListener('keydown', (event) => {
    if (game.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      actions.startGame();
      return;
    }
    if ((game.phase === 'win' || game.phase === 'loss') && (event.key === 'r' || event.key === 'R' || event.key === 'Enter')) {
      actions.restart();
      return;
    }
    if (game.phase !== 'play' || ui.busy) return;
    if (event.key >= '1' && event.key <= '7') {
      const index = Number(event.key) - 1;
      if (index < game.player.hand.length) actions.selectCard(index);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // Walk the selection along the hand with the arrow keys.
      const step = event.key === 'ArrowLeft' ? -1 : 1;
      const current = ui.selectedIndex < 0 ? (step > 0 ? -1 : 0) : ui.selectedIndex;
      const next = (current + step + game.player.hand.length) % Math.max(1, game.player.hand.length);
      if (game.player.hand.length) actions.selectCard(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      actions.playSelected();
    } else if (event.key === 'e' || event.key === 'E') {
      actions.endTurn();
    } else if (event.key === 'm' || event.key === 'M') {
      actions.toggleMute();
    } else if (event.key === 'Escape') {
      actions.selectCard(-1);
    }
  });
}

// Clicking a card selects it; clicking the selected card again plays it.
export function cardClickAction(ui, index, actions) {
  if (ui.selectedIndex === index) {
    actions.playSelected();
  } else {
    actions.selectCard(index);
  }
}
