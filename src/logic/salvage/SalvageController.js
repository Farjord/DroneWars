/**
 * SalvageController.js
 * Manages POI salvage operations for Exploring the Eremos mode
 * Handles progressive slot-based salvaging with escalating encounter risk
 */

import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';
import gameStateManager from '../../managers/GameStateManager.js';
import HighAlertManager from './HighAlertManager.js';

/**
 * SalvageController - Manages POI salvage state and operations
 *
 * Salvage flow:
 * 1. Player arrives at POI, initializeSalvage creates state with 1-5 slots
 * 2. Player clicks "Salvage" to attempt next slot
 * 3. Encounter roll determines if combat triggers
 * 4. If safe: slot revealed, encounter chance increases
 * 5. If encounter: slot revealed, combat starts
 * 6. Player can leave anytime after first salvage (POI marked looted)
 */
export class SalvageController {
  /**
   * Initialize salvage state for a POI
   * Creates slot contents upfront but keeps them hidden
   * @param {Object} poi - POI data with encounterChance, rewardType
   * @param {Object} tierConfig - Tier configuration with salvage settings
   * @param {string} zone - Map zone (perimeter, mid, core)
   * @param {Object} lootGenerator - LootGenerator instance
   * @param {number} tier - Map tier (1, 2, or 3), defaults to 1
   * @returns {Object} Initial salvage state
   */
  initializeSalvage(poi, tierConfig, zone, lootGenerator, tier = 1) {
    // Handle both hex objects (with nested poiData) and direct POI objects
    const poiData = poi.poiData || poi

    // Generate slots using loot generator
    const slots = lootGenerator.generateSalvageSlots(
      poiData.rewardType,
      tier,
      zone,
      tierConfig
    )

    return {
      poi,
      zone,
      totalSlots: slots.length,
      slots,
      currentSlotIndex: 0,
      currentEncounterChance: poiData.encounterChance || 15,
      encounterTriggered: false,
      scanningInProgress: false
    }
  }

  /**
   * Attempt to salvage the next slot
   * Performs encounter roll and reveals slot content
   * @param {Object} salvageState - Current salvage state
   * @param {Object} tierConfig - Tier configuration
   * @returns {Object} { salvageState, slotContent, encounterTriggered }
   */
  attemptSalvage(salvageState, tierConfig) {
    const { currentSlotIndex, currentEncounterChance, slots, poi } = salvageState

    // Check for encounter (pass slot index for deterministic seeding, and POI for high alert check)
    const encounterTriggered = this._rollEncounter(currentEncounterChance, currentSlotIndex, poi)

    // Reveal the current slot regardless of encounter
    const updatedSlots = [...slots]
    updatedSlots[currentSlotIndex] = {
      ...updatedSlots[currentSlotIndex],
      revealed: true
    }

    // Get slot content for return
    const currentSlot = slots[currentSlotIndex]
    const slotContent = {
      type: currentSlot.type,
      content: currentSlot.content
    }

    // Calculate new state
    let newEncounterChance = currentEncounterChance
    let newSlotIndex = currentSlotIndex

    if (!encounterTriggered) {
      // Increase encounter chance for next salvage (pass slot index for deterministic seeding)
      newEncounterChance += this.rollEncounterIncrease(tierConfig, currentSlotIndex)
      // Move to next slot
      newSlotIndex = currentSlotIndex + 1
    }

    const updatedState = {
      ...salvageState,
      slots: updatedSlots,
      currentSlotIndex: newSlotIndex,
      currentEncounterChance: newEncounterChance,
      encounterTriggered
    }

    return {
      salvageState: updatedState,
      slotContent,
      encounterTriggered
    }
  }

  /**
   * Roll to determine if encounter occurs
   * @param {number} encounterChance - Current encounter chance (0-100)
   * @param {number} slotIndex - Current slot index for deterministic offset
   * @param {Object} poi - POI object with q, r coordinates (for high alert check)
   * @returns {boolean} True if encounter triggered
   */
  _rollEncounter(encounterChance, slotIndex = 0, poi = null) {
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    // Use slot index as offset for unique roll per slot (deterministic)
    const slotOffset = slotIndex * 1337;
    const rng = new SeededRandom(baseRng.seed + slotOffset);
    const roll = rng.random() * 100;

    // Add high alert bonus if POI is in high alert state
    let totalEncounterChance = encounterChance;
    if (poi && poi.q !== undefined && poi.r !== undefined) {
      const runState = gameState?.currentRunState;
      const alertBonus = HighAlertManager.getAlertBonus(runState, { q: poi.q, r: poi.r });
      if (alertBonus > 0) {
        // Convert bonus (0.05-0.15) to percentage (5-15)
        const alertBonusPercent = alertBonus * 100;
        totalEncounterChance += alertBonusPercent;
        debugLog('SALVAGE_ENCOUNTER', `High Alert bonus: +${alertBonusPercent.toFixed(1)}%`);
      }
    }

    const triggered = roll < totalEncounterChance
    debugLog('SALVAGE_ENCOUNTER', `Encounter roll: ${roll.toFixed(1)} vs ${totalEncounterChance.toFixed(1)}% chance - ${triggered ? 'TRIGGERED!' : 'safe'}`)
    return triggered
  }

  /**
   * Roll random encounter increase from tier's range
   * @param {Object} tierConfig - Tier configuration with salvageEncounterIncreaseRange
   * @param {number} slotIndex - Current slot index for deterministic offset
   * @returns {number} Encounter increase amount
   */
  rollEncounterIncrease(tierConfig, slotIndex = 0) {
    const range = tierConfig?.salvageEncounterIncreaseRange || { min: 5, max: 10 }
    const { min, max } = range
    const gameState = gameStateManager.getState();
    const baseRng = SeededRandom.fromGameState(gameState || {});
    // Use slot index + offset to differentiate from encounter roll
    const increaseOffset = (slotIndex * 1337) + 7919;
    const rng = new SeededRandom(baseRng.seed + increaseOffset);
    const increase = min + rng.random() * (max - min)
    debugLog('SALVAGE_ENCOUNTER', `Encounter chance increase: +${increase.toFixed(1)}% (range: ${min}-${max})`)
    return increase
  }

  /**
   * Collect all revealed loot from salvage state
   * @param {Object} salvageState - Current salvage state
   * @returns {Object} { cards: [...], salvageItems: [...], tokens: [...] }
   */
  collectRevealedLoot(salvageState) {
    const { slots } = salvageState
    const revealedSlots = slots.filter(slot => slot.revealed)

    const cards = revealedSlots
      .filter(slot => slot.type === 'card' && slot.content)
      .map(slot => slot.content)

    // Collect salvage items (replaces flat credits)
    const salvageItems = revealedSlots
      .filter(slot => slot.type === 'salvageItem' && slot.content)
      .map(slot => slot.content)

    // Collect tokens
    const tokens = revealedSlots
      .filter(slot => slot.type === 'token' && slot.content)
      .map(slot => slot.content)

    return { cards, salvageItems, tokens }
  }

  /**
   * Check if player can continue salvaging
   * @param {Object} salvageState - Current salvage state
   * @returns {boolean} True if more slots available and no encounter triggered
   */
  canContinueSalvage(salvageState) {
    const { totalSlots, currentSlotIndex, encounterTriggered } = salvageState
    return currentSlotIndex < totalSlots && !encounterTriggered
  }

  /**
   * Check if any slots have been revealed (for determining if POI should be marked looted)
   * @param {Object} salvageState - Current salvage state
   * @returns {boolean} True if at least one slot revealed
   */
  hasRevealedAnySlots(salvageState) {
    return salvageState.slots.some(slot => slot.revealed)
  }

  /**
   * Check if all slots have been revealed (POI fully looted)
   * Used to determine if POI should go to High Alert vs Looted after combat
   * @param {Object} salvageState - Current salvage state
   * @returns {boolean} True if all slots have been revealed
   */
  isFullyLooted(salvageState) {
    return salvageState.currentSlotIndex >= salvageState.totalSlots
  }

  /**
   * Reset salvage state after combat victory
   * Clears encounterTriggered flag and optionally applies high alert bonus
   * Used to restore salvage screen after winning a combat triggered during salvage
   * @param {Object} salvageState - Current salvage state (with encounterTriggered: true)
   * @param {number} highAlertBonus - Optional high alert bonus to add to encounter chance (0-15)
   * @returns {Object} Updated salvage state ready for continued salvaging
   */
  resetAfterCombat(salvageState, highAlertBonus = 0) {
    return {
      ...salvageState,
      encounterTriggered: false,
      currentEncounterChance: salvageState.currentEncounterChance + highAlertBonus
    }
  }
}

export default new SalvageController()
