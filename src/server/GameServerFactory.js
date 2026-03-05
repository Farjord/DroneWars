// GameServerFactory — Creates the appropriate GameServer for the current game mode.

import LocalGameServer from './LocalGameServer.js';

const GameServerFactory = {
  create(gameMode, { gameStateManager }) {
    if (gameMode === 'local' || gameMode === 'host') {
      return new LocalGameServer(gameStateManager);
    }
    return null; // guest (Phase 3)
  },
};

export default GameServerFactory;
