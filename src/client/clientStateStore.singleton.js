// Singleton ClientStateStore instance wrapping the GameStateManager singleton.
// Import this in hooks/components that need reactive state access.

import gameStateManager from '../managers/GameStateManager.js';
import ClientStateStore from './ClientStateStore.js';
import { debugLog } from '../utils/debugLogger.js';

const clientStateStore = new ClientStateStore(gameStateManager);

debugLog('INIT_TRACE', '[1/8] ClientStateStore singleton created', {
  hasGSM: !!gameStateManager,
});

export default clientStateStore;
