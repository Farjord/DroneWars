// GameServer — Abstract interface for game action routing.
// Subclasses: LocalGameServer (local/host), RemoteGameServer (guest).

class GameServer {
  async submitAction(_type, _payload) { throw new Error('Not implemented'); }
  onStateUpdate(_callback) { throw new Error('Not implemented'); }
  getState() { throw new Error('Not implemented'); }
  getPlayerView(_playerId) { throw new Error('Not implemented'); }
  getLocalPlayerId() { throw new Error('Not implemented'); }
  isPlayerAI(_playerId) { throw new Error('Not implemented'); }
}

export default GameServer;
