// ========================================
// STATE REDACTOR
// ========================================
// Strips private information (hand, deck, discard) from game state
// before broadcasting to the opponent. Replaces card arrays with
// counts so the UI can still display totals.

class StateRedactor {
  /**
   * Returns a redacted copy of gameState for the given viewer.
   * The viewer's own private data is preserved; the opponent's is replaced with counts.
   */
  static redactForPlayer(state, viewerPlayerId) {
    const opponentId = viewerPlayerId === 'player1' ? 'player2' : 'player1';
    return {
      ...state,
      [opponentId]: this.redactPlayerState(state[opponentId]),
    };
  }

  static redactPlayerState(playerState) {
    const { hand = [], deck = [], discardPile = [], ...publicState } = playerState;
    return {
      ...publicState,
      hand: [],
      deck: [],
      discardPile: [],
      handCount: hand.length,
      deckCount: deck.length,
      discardCount: discardPile.length,
    };
  }
}

export default StateRedactor;
