// GameServerFactory — Creates Transport + GameClient for the current game mode.

import GameClient from '../client/GameClient.js';
import LocalTransport from '../transport/LocalTransport.js';
import P2PTransport from '../transport/P2PTransport.js';
import HostGameServer from './HostGameServer.js';
import GameEngine from './GameEngine.js';

const GameServerFactory = {
  create(gameMode, { gameStateManager, actionProcessor, gameFlowManager, clientStateStore, p2pManager, phaseAnimationQueue }) {
    if (gameMode === 'local') {
      const gameEngine = new GameEngine(gameStateManager, actionProcessor, gameFlowManager);
      const transport = new LocalTransport(gameEngine, { playerId: 'player1' });
      return new GameClient(transport, { clientStateStore, playerId: 'player1' });
    }

    if (gameMode === 'host') {
      const gameEngine = new GameEngine(gameStateManager, actionProcessor, gameFlowManager);
      const hostServer = new HostGameServer(gameEngine, actionProcessor.broadcastService, { p2pManager });
      p2pManager.hostGameServer = hostServer;
      const transport = new LocalTransport(hostServer, { playerId: 'player1' });
      return new GameClient(transport, {
        clientStateStore, playerId: 'player1',
        isMultiplayer: true, phaseAnimationQueue,
      });
    }

    if (gameMode === 'guest') {
      const transport = new P2PTransport(p2pManager);
      return new GameClient(transport, {
        clientStateStore, playerId: 'player2',
        isMultiplayer: true, phaseAnimationQueue,
      });
    }

    throw new Error(`GameServerFactory: unknown game mode "${gameMode}"`);
  },
};

export default GameServerFactory;
