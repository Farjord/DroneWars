/**
 * MissionConditionEvaluator.js
 * Evaluates mission conditions and calculates progress
 *
 * Uses a handler registry pattern (similar to ConditionEvaluator.js)
 * to map condition types to evaluation functions.
 */

import { MISSION_CONDITIONS } from '../../data/missionData.js';

class MissionConditionEvaluator {
  constructor() {
    // Handler registry maps condition types to evaluation functions
    this.handlers = {
      [MISSION_CONDITIONS.VISIT_SCREEN]: this.evaluateVisitScreen.bind(this),
      [MISSION_CONDITIONS.WIN_COMBATS]: this.evaluateWinCombats.bind(this),
      [MISSION_CONDITIONS.DESTROY_DRONES]: this.evaluateDestroyDrones.bind(this),
      [MISSION_CONDITIONS.DEAL_DAMAGE]: this.evaluateDealDamage.bind(this),
      [MISSION_CONDITIONS.WIN_WITHOUT_LOSING_DRONE]: this.evaluateWinWithoutLosingDrone.bind(this),
      [MISSION_CONDITIONS.COMPLETE_EXTRACTIONS]: this.evaluateCompleteExtractions.bind(this),
      [MISSION_CONDITIONS.EXTRACT_WITH_FULL_LOOT]: this.evaluateExtractWithFullLoot.bind(this),
      [MISSION_CONDITIONS.VISIT_POI]: this.evaluateVisitPoi.bind(this),
      [MISSION_CONDITIONS.COLLECT_CARDS]: this.evaluateCollectCards.bind(this),
      [MISSION_CONDITIONS.COLLECT_CREDITS]: this.evaluateCollectCredits.bind(this),
      [MISSION_CONDITIONS.CRAFT_ITEM]: this.evaluateCraftItem.bind(this),
    };
  }

  /**
   * Evaluate progress delta for an event
   * Returns how much progress this event contributes (0 if not applicable)
   *
   * @param {Object} condition - Mission condition object { type, screen?, count?, ... }
   * @param {string} eventType - Event type string (e.g., 'SCREEN_VISIT', 'COMBAT_WIN')
   * @param {Object} eventData - Event-specific data (e.g., { screen: 'inventory' })
   * @returns {number} Progress delta (0 if event doesn't match condition)
   */
  evaluateProgress(condition, eventType, eventData) {
    const handler = this.handlers[condition.type];
    if (!handler) return 0;

    // Ensure eventData is an object
    const safeEventData = eventData || {};

    return handler(condition, eventType, safeEventData);
  }

  // ========================================
  // SCREEN VISIT CONDITIONS
  // ========================================

  evaluateVisitScreen(condition, eventType, eventData) {
    if (eventType !== 'SCREEN_VISIT') return 0;
    if (eventData.screen === condition.screen) return 1;
    return 0;
  }

  // ========================================
  // COMBAT CONDITIONS
  // ========================================

  evaluateWinCombats(condition, eventType, eventData) {
    if (eventType !== 'COMBAT_WIN') return 0;
    return 1;
  }

  evaluateDestroyDrones(condition, eventType, eventData) {
    if (eventType !== 'DRONE_DESTROYED') return 0;
    return eventData.count || 1;
  }

  evaluateDealDamage(condition, eventType, eventData) {
    if (eventType !== 'DAMAGE_DEALT') return 0;
    return eventData.amount || 0;
  }

  evaluateWinWithoutLosingDrone(condition, eventType, eventData) {
    if (eventType !== 'COMBAT_WIN') return 0;
    if (eventData.dronesLost === 0) return 1;
    return 0;
  }

  // ========================================
  // EXTRACTION CONDITIONS
  // ========================================

  evaluateCompleteExtractions(condition, eventType, eventData) {
    if (eventType !== 'EXTRACTION_COMPLETE') return 0;
    return 1;
  }

  evaluateExtractWithFullLoot(condition, eventType, eventData) {
    if (eventType !== 'EXTRACTION_COMPLETE') return 0;
    if (eventData.fullLoot === true) return 1;
    return 0;
  }

  evaluateVisitPoi(condition, eventType, eventData) {
    if (eventType !== 'POI_VISITED') return 0;
    return 1;
  }

  // ========================================
  // COLLECTION CONDITIONS
  // ========================================

  evaluateCollectCards(condition, eventType, eventData) {
    if (eventType !== 'CARDS_COLLECTED') return 0;
    return eventData.count || 1;
  }

  evaluateCollectCredits(condition, eventType, eventData) {
    if (eventType !== 'CREDITS_EARNED') return 0;
    return eventData.amount || 0;
  }

  evaluateCraftItem(condition, eventType, eventData) {
    if (eventType !== 'ITEM_CRAFTED') return 0;
    return 1;
  }
}

export default MissionConditionEvaluator;
