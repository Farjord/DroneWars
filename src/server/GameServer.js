// GameServer — Abstract interface for game action routing.
// Subclasses: GameClient (all modes via Transport injection).

class GameServer {
  async submitAction(_type, _payload) { throw new Error('Not implemented'); }
  onStateUpdate(_callback) { throw new Error('Not implemented'); }
  getState() { throw new Error('Not implemented'); }
  getPlayerView(_playerId) { throw new Error('Not implemented'); }
  getLocalPlayerId() { throw new Error('Not implemented'); }
  isPlayerAI(_playerId) { throw new Error('Not implemented'); }
  isMultiplayer() { throw new Error('Not implemented'); }
}

export default GameServer;
