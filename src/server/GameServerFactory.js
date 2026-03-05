// GameServerFactory — Creates the appropriate GameServer for the current game mode.

import LocalGameServer from './LocalGameServer.js';
import RemoteGameServer from './RemoteGameServer.js';

const GameServerFactory = {
  create(gameMode, { gameStateManager, p2pManager, phaseAnimationQueue }) {
    if (gameMode === 'local' || gameMode === 'host') {
      return new LocalGameServer(gameStateManager, { isMultiplayer: gameMode === 'host' });
    }
    if (gameMode === 'guest') {
      return new RemoteGameServer(gameStateManager, p2pManager, { phaseAnimationQueue });
    }
    return null;
  },
};

export default GameServerFactory;
