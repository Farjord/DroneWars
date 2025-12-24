import { describe, it, expect, beforeEach, vi } from 'vitest'
import EncounterController from './EncounterController.js'

// ========================================
// ENCOUNTER CONTROLLER - getEncounterChance TESTS
// ========================================
// Tests for POI encounter chance calculation with zone bonus

// Mock tier config (minimal required structure)
const mockTierConfig = {
  encounterChance: {
    empty: 5,
    gate: 0
  }
}

describe('EncounterController - getEncounterChance', () => {
  // ========================================
  // POI ENCOUNTER CHANCE WITH ZONE BONUS TESTS
  // ========================================

  describe('POI encounter chance with zone bonus', () => {
    it('method exists on controller', () => {
      // EXPLANATION: getEncounterChance should be a method on the controller

      expect(typeof EncounterController.getEncounterChance).toBe('function')
    })

    it('returns base POI encounter chance when no mapData provided', () => {
      // EXPLANATION: Without mapData, should return just the POI's base chance
      // This ensures backwards compatibility

      const hex = { type: 'poi', poiData: { encounterChance: 20 }, zone: 'core' }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, null)

      expect(result).toBe(20)
    })

    it('returns base POI encounter chance when mapData has no encounterByZone', () => {
      // EXPLANATION: If mapData exists but doesn't have encounterByZone,
      // should fall back to just base chance

      const hex = { type: 'poi', poiData: { encounterChance: 20 }, zone: 'core' }
      const mapData = {}

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, mapData)

      expect(result).toBe(20)
    })

    it('adds zone bonus to POI encounter chance when mapData has encounterByZone', () => {
      // EXPLANATION: This is the key test - POI encounter chance should include
      // the zone-based bonus from mapData.encounterByZone to match what the UI shows

      const hex = { type: 'poi', poiData: { encounterChance: 20 }, zone: 'core' }
      const mapData = { encounterByZone: { core: 10, mid: 5, perimeter: 2 } }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, mapData)

      expect(result).toBe(30) // 20 (base) + 10 (core zone bonus)
    })

    it('applies correct zone bonus for mid zone', () => {
      // EXPLANATION: Test that mid zone applies its specific bonus

      const hex = { type: 'poi', poiData: { encounterChance: 15 }, zone: 'mid' }
      const mapData = { encounterByZone: { core: 10, mid: 5, perimeter: 2 } }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, mapData)

      expect(result).toBe(20) // 15 (base) + 5 (mid zone bonus)
    })

    it('applies correct zone bonus for perimeter zone', () => {
      // EXPLANATION: Test that perimeter zone applies its specific bonus

      const hex = { type: 'poi', poiData: { encounterChance: 12 }, zone: 'perimeter' }
      const mapData = { encounterByZone: { core: 10, mid: 5, perimeter: 2 } }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, mapData)

      expect(result).toBe(14) // 12 (base) + 2 (perimeter zone bonus)
    })

    it('uses default 15 when POI has no encounterChance', () => {
      // EXPLANATION: If POI doesn't specify encounterChance, default to 15
      // and still add zone bonus

      const hex = { type: 'poi', poiData: {}, zone: 'mid' }
      const mapData = { encounterByZone: { core: 10, mid: 5, perimeter: 2 } }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, mapData)

      expect(result).toBe(20) // 15 (default) + 5 (mid zone bonus)
    })

    it('handles missing zone gracefully (no zone bonus)', () => {
      // EXPLANATION: If hex doesn't have a zone property, should still work
      // and just return base chance without zone bonus

      const hex = { type: 'poi', poiData: { encounterChance: 20 } }
      const mapData = { encounterByZone: { core: 10, mid: 5, perimeter: 2 } }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, mapData)

      expect(result).toBe(20) // Just base, no zone bonus
    })

    it('handles zone not in encounterByZone gracefully', () => {
      // EXPLANATION: If hex has a zone but it's not in the encounterByZone map,
      // should return 0 for zone bonus

      const hex = { type: 'poi', poiData: { encounterChance: 20 }, zone: 'unknown' }
      const mapData = { encounterByZone: { core: 10, mid: 5, perimeter: 2 } }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, mapData)

      expect(result).toBe(20) // Just base, unknown zone gives 0 bonus
    })
  })

  // ========================================
  // GATE AND EMPTY HEX TESTS (existing behavior)
  // ========================================

  describe('gate encounter chance', () => {
    it('returns 0 for gate hexes', () => {
      // EXPLANATION: Gates should always have 0 encounter chance

      const hex = { type: 'gate' }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, null)

      expect(result).toBe(0)
    })
  })

  describe('empty hex encounter chance', () => {
    it('uses zone-based chance for empty hexes when mapData provided', () => {
      // EXPLANATION: Empty hexes should use encounterByZone for their zone

      const hex = { type: 'empty', zone: 'core' }
      const mapData = { encounterByZone: { core: 8, mid: 4, perimeter: 2 } }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, mapData)

      expect(result).toBe(8)
    })

    it('falls back to tier config for empty hexes without mapData', () => {
      // EXPLANATION: Without mapData, use tierConfig.encounterChance.empty

      const hex = { type: 'empty' }

      const result = EncounterController.getEncounterChance(hex, mockTierConfig, null)

      expect(result).toBe(5)
    })
  })
})

// ========================================
// ENCOUNTER CONTROLLER - checkMovementEncounter TESTS
// ========================================
// Tests for movement encounter behavior with different hex types

describe('EncounterController - checkMovementEncounter', () => {
  // ========================================
  // POI HEX HANDLING - MOVEMENT ENCOUNTERS SHOULD NOT TRIGGER
  // ========================================

  describe('PoI hex handling', () => {
    it('should return null for POI hexes (POIs use salvage encounter system)', () => {
      // EXPLANATION: Movement encounters should NEVER trigger on POI hexes.
      // POIs have their own encounter system via salvage - when the player
      // clicks "Salvage", THAT is when encounters are rolled.
      // Movement encounters on POIs cause bugs:
      // 1. Premature encounters before salvage modal appears
      // 2. Double modal display after combat (AI loot + empty salvage)

      const poiHex = {
        type: 'poi',
        q: 2,
        r: -1,
        zone: 'mid',
        poiData: {
          name: 'Test POI',
          encounterChance: 100,  // 100% would guarantee trigger if checked
          rewardType: 'ORDNANCE_PACK'
        }
      }

      const result = EncounterController.checkMovementEncounter(poiHex, mockTierConfig)

      // Should return null - NO encounter on POI hex during movement
      expect(result).toBeNull()
    })

    it('should return null for POI hexes regardless of zone encounter rates', () => {
      // EXPLANATION: Even if the map has high zone encounter rates,
      // POI hexes should still return null for movement encounters.
      // The POI encounter chance is only used by the salvage system.

      const poiHex = {
        type: 'poi',
        q: 0,
        r: 0,
        zone: 'core',  // Core zone typically has highest encounter rates
        poiData: {
          name: 'Core POI',
          encounterChance: 50,
          rewardType: 'ORDNANCE_PACK'
        }
      }

      const result = EncounterController.checkMovementEncounter(poiHex, mockTierConfig)

      // Should still return null - POIs don't have movement encounters
      expect(result).toBeNull()
    })
  })
})
