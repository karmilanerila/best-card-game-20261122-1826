// input.js — mouse and keyboard controls for Scrapheap Showdown.
// Click a card to play it, click a junk card to salvage it, click END TURN
// (or press Enter) to hand over to SCRAPJAW. Keys 1-7 play the cards in
// your hand left to right. M toggles sound, R restarts from an end screen,
// Esc closes the rules modal. Every handler funnels through the UI object
// in main.js, so input never touches game state directly.

/** The keyboard keys that play hand cards, left to right. */
export const PLAY_KEYS = ['1', '2', '3', '4', '5', '6', '7'];

/** Wire the keyboard. `ui` is the controller from main.js. */
export function bindKeyboard(ui) {
  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'm') {
      ui.toggleMute();
      return;
    }
    if (key === 'r') {
      ui.restart();
      return;
    }
    if (key === 'escape') {
      const modal = document.querySelector('.rules-modal');
      if (modal) modal.remove();
      return;
    }
    if (key === 'enter') {
      ui.endTurn();
      return;
    }
    if (PLAY_KEYS.includes(key)) {
      ui.playCard(PLAY_KEYS.indexOf(key));
    }
  });
}
