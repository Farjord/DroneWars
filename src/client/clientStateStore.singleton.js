// Singleton ClientStateStore instance wrapping the GameStateManager singleton.
// Import this in hooks/components that need reactive state access.

import gameStateManager from '../managers/GameStateManager.js';
import ClientStateStore from './ClientStateStore.js';

const clientStateStore = new ClientStateStore(gameStateManager);

export default clientStateStore;
