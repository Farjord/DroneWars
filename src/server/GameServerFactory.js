// GameServerFactory — Creates the appropriate GameServer for the current game mode.

import LocalGameServer from './LocalGameServer.js';
import RemoteGameServer from './RemoteGameServer.js';
import GameEngine from './GameEngine.js';

const GameServerFactory = {
  create(gameMode, { gameStateManager, actionProcessor, gameFlowManager, p2pManager, phaseAnimationQueue }) {
    if (gameMode === 'local' || gameMode === 'host') {
      const gameEngine = new GameEngine(gameStateManager, actionProcessor, gameFlowManager);
      return new LocalGameServer(gameStateManager, { isMultiplayer: gameMode === 'host', gameEngine });
    }
    if (gameMode === 'guest') {
      return new RemoteGameServer(gameStateManager, p2pManager, { phaseAnimationQueue });
    }
    return null;
  },
};

export default GameServerFactory;
