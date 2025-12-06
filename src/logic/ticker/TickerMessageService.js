/**
 * TickerMessageService
 * Core service that aggregates messages from all generators
 * and provides them to the NewsTicker component
 */

import { getAllGenerators } from './generators';
import { TICKER_CONFIG } from './tickerConfig';
import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';

/**
 * Shuffles an array using SeededRandom for deterministic shuffling
 */
function shuffleArray(array) {
  const rng = new SeededRandom(Date.now());
  return rng.shuffle(array);
}

/**
 * Generates a stable ID for a message based on its content
 * This ensures React keys remain stable across re-renders
 */
function generateStableId(message) {
  // Hash based on text content for stability across regenerations
  const text = message.text || '';
  const hash = text.split('').reduce((acc, char) =>
    ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return `msg_${Math.abs(hash)}_${message.type || 'info'}`;
}

/**
 * Main service class for ticker messages
 */
class TickerMessageService {
  constructor() {
    this.cachedMessages = null;
    this.lastMapHash = null;
  }

  /**
   * Generate a simple hash of maps to detect changes
   */
  generateMapHash(maps) {
    if (!maps || maps.length === 0) return null;
    return maps.map(m => `${m.name}-${m.seed}`).join('|');
  }

  /**
   * Generate all messages for the given maps
   * @param {Array} maps - Array of generated map objects
   * @param {Object} options - Optional configuration
   * @returns {Array} Array of message objects
   */
  generateMessages(maps, options = {}) {
    if (!maps || maps.length === 0) {
      return this.getDefaultMessages();
    }

    // Check cache
    const mapHash = this.generateMapHash(maps);
    debugLog('TICKER', 'generateMessages called', { mapHash, cachedHash: this.lastMapHash, hasCachedMessages: !!this.cachedMessages });

    if (this.cachedMessages && this.lastMapHash === mapHash && !options.forceRefresh) {
      debugLog('TICKER', 'Cache HIT - returning cached messages', { count: this.cachedMessages.length });
      return this.cachedMessages;
    }

    debugLog('TICKER', 'Cache MISS - regenerating messages');

    // Get all registered generators
    const generators = getAllGenerators();

    // Collect messages from all generators
    let allMessages = [];

    for (const generator of generators) {
      try {
        const messages = generator.generate(maps);
        allMessages = allMessages.concat(messages);
      } catch (error) {
        console.warn(`Ticker generator error:`, error);
      }
    }

    // Add stable IDs to messages that don't have them (based on content for React key stability)
    allMessages = allMessages.map(msg => ({
      ...msg,
      id: msg.id || generateStableId(msg)
    }));

    // Deduplicate by text content
    const seen = new Set();
    allMessages = allMessages.filter(msg => {
      if (seen.has(msg.text)) return false;
      seen.add(msg.text);
      return true;
    });

    // Sort by priority (higher priority first), then shuffle within same priority
    allMessages.sort((a, b) => (b.priority || 5) - (a.priority || 5));

    // Group by priority and shuffle within groups
    const priorityGroups = {};
    allMessages.forEach(msg => {
      const priority = msg.priority || 5;
      if (!priorityGroups[priority]) priorityGroups[priority] = [];
      priorityGroups[priority].push(msg);
    });

    // Shuffle within each group and recombine
    let shuffledMessages = [];
    Object.keys(priorityGroups)
      .sort((a, b) => b - a)
      .forEach(priority => {
        shuffledMessages = shuffledMessages.concat(shuffleArray(priorityGroups[priority]));
      });

    // Curate selection: limit to ~12 messages for reasonable loop time
    // Pick top messages from each type to ensure variety
    const MAX_MESSAGES = 12;
    const MESSAGES_PER_TYPE = {
      danger: 2,    // High priority alerts
      warning: 2,   // Threat warnings
      priority: 2,  // Priority targets
      rumor: 3,     // Pack concentration rumors (the interesting finds!)
      info: 3       // General intel
    };

    // Group by type
    const byType = {};
    shuffledMessages.forEach(msg => {
      const type = msg.type || 'info';
      if (!byType[type]) byType[type] = [];
      byType[type].push(msg);
    });

    // Select top N from each type
    let selectedMessages = [];
    Object.entries(MESSAGES_PER_TYPE).forEach(([type, limit]) => {
      if (byType[type]) {
        selectedMessages.push(...byType[type].slice(0, limit));
      }
    });

    // If we have room, fill with remaining high-priority messages
    if (selectedMessages.length < MAX_MESSAGES) {
      const selectedSet = new Set(selectedMessages.map(m => m.id));
      const remaining = shuffledMessages.filter(m => !selectedSet.has(m.id));
      selectedMessages.push(...remaining.slice(0, MAX_MESSAGES - selectedMessages.length));
    }

    // Final shuffle to mix up the types
    selectedMessages = shuffleArray(selectedMessages);

    debugLog('TICKER', 'Curated messages', {
      total: shuffledMessages.length,
      selected: selectedMessages.length,
      byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length]))
    });

    // Cache results
    this.cachedMessages = selectedMessages;
    this.lastMapHash = mapHash;

    debugLog('TICKER', 'Messages generated and cached', { count: selectedMessages.length, ids: selectedMessages.map(m => m.id) });

    return selectedMessages;
  }

  /**
   * Get default messages when no maps are available
   */
  getDefaultMessages() {
    return [
      {
        id: 'default_1',
        text: 'Scanning for available sectors...',
        type: 'info',
        priority: 5
      },
      {
        id: 'default_2',
        text: 'Long-range sensors initializing...',
        type: 'info',
        priority: 5
      },
      {
        id: 'default_3',
        text: 'Awaiting sector data...',
        type: 'info',
        priority: 5
      }
    ];
  }

  /**
   * Clear the message cache
   */
  clearCache() {
    this.cachedMessages = null;
    this.lastMapHash = null;
  }

  /**
   * Get message styling for a given type
   */
  getMessageStyle(type) {
    return TICKER_CONFIG.messageTypes[type] || TICKER_CONFIG.messageTypes.info;
  }
}

// Export singleton instance
export const tickerMessageService = new TickerMessageService();

// Also export class for testing
export { TickerMessageService };
