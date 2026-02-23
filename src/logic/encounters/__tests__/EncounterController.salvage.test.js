import { describe, it, expect, beforeEach, vi } from 'vitest'
import EncounterController from '../EncounterController.js'

// ========================================
// ENCOUNTER CONTROLLER SALVAGE TESTS
// ========================================
// Tests for the new checkSalvageEncounter method

describe('EncounterController - checkSalvageEncounter', () => {
  // ========================================
  // BASIC ENCOUNTER CHECK TESTS
  // ========================================

  describe('basic encounter check', () => {
    it('method exists on controller', () => {
      // EXPLANATION: checkSalvageEncounter should be a method on the controller

      expect(typeof EncounterController.checkSalvageEncounter).toBe('function')
    })

    it('returns boolean', () => {
      // EXPLANATION: The method should return true or false

      const result = EncounterController.checkSalvageEncounter(50)

      expect(typeof result).toBe('boolean')
    })
  })

  // ========================================
  // EDGE CASE TESTS
  // ========================================

  describe('edge cases', () => {
    it('returns true when encounter chance is 100', () => {
      // EXPLANATION: 100% encounter chance should always trigger.
      // Run multiple times to verify consistency.

      let allTriggered = true
      for (let i = 0; i < 10; i++) {
        if (!EncounterController.checkSalvageEncounter(100)) {
          allTriggered = false
          break
        }
      }

      expect(allTriggered).toBe(true)
    })

    it('returns false when encounter chance is 0', () => {
      // EXPLANATION: 0% encounter chance should never trigger.

      let anyTriggered = false
      for (let i = 0; i < 10; i++) {
        if (EncounterController.checkSalvageEncounter(0)) {
          anyTriggered = true
          break
        }
      }

      expect(anyTriggered).toBe(false)
    })

    it('handles encounter chance above 100 (guaranteed)', () => {
      // EXPLANATION: If encounter chance exceeds 100 (shouldn't happen normally),
      // it should still work (always trigger).

      const result = EncounterController.checkSalvageEncounter(150)

      expect(result).toBe(true)
    })

    it('handles negative encounter chance', () => {
      // EXPLANATION: Negative chance (shouldn't happen) should never trigger.

      const result = EncounterController.checkSalvageEncounter(-10)

      expect(result).toBe(false)
    })
  })

  // ========================================
  // PROBABILISTIC BEHAVIOR TESTS
  // ========================================

  describe('probabilistic behavior', () => {
    it('encounter triggers at varying rates for different chances', () => {
      // EXPLANATION: Different encounter chances should produce different results.
      // Due to seeded RNG, we can't test exact percentages, but we can test
      // that 100% always triggers and 0% never triggers (tested in edge cases).
      // This test verifies the method works with various inputs.

      // Just verify it doesn't throw for various inputs
      const chances = [5, 10, 25, 50, 75, 90]
      for (const chance of chances) {
        const result = EncounterController.checkSalvageEncounter(chance)
        expect(typeof result).toBe('boolean')
      }
    })

    it('higher encounter chance triggers more frequently', () => {
      // EXPLANATION: A 60% chance should trigger more than a 20% chance.

      let lowChanceTriggered = 0
      let highChanceTriggered = 0
      const samples = 200

      for (let i = 0; i < samples; i++) {
        if (EncounterController.checkSalvageEncounter(20)) lowChanceTriggered++
        if (EncounterController.checkSalvageEncounter(60)) highChanceTriggered++
      }

      expect(highChanceTriggered).toBeGreaterThan(lowChanceTriggered)
    })
  })
})

// ========================================
// ROLL SALVAGE ENCOUNTER INCREASE TESTS
// ========================================

describe('EncounterController - rollSalvageEncounterIncrease', () => {
  describe('method availability', () => {
    it('method exists on controller', () => {
      // EXPLANATION: rollSalvageEncounterIncrease should exist

      expect(typeof EncounterController.rollSalvageEncounterIncrease).toBe('function')
    })
  })

  describe('encounter increase calculation', () => {
    it('returns value within tier range', () => {
      // EXPLANATION: The encounter increase should be a random value
      // between min and max from the tier config.

      const tierConfig = {
        salvageEncounterIncreaseRange: { min: 5, max: 15 }
      }

      for (let i = 0; i < 50; i++) {
        const increase = EncounterController.rollSalvageEncounterIncrease(tierConfig)

        expect(increase).toBeGreaterThanOrEqual(5)
        expect(increase).toBeLessThanOrEqual(15)
      }
    })

    it('uses default range if tier config missing salvageEncounterIncreaseRange', () => {
      // EXPLANATION: If the tier config is missing the range,
      // use a sensible default (5-10).

      const configWithoutRange = {}

      const increase = EncounterController.rollSalvageEncounterIncrease(configWithoutRange)

      expect(increase).toBeGreaterThanOrEqual(5)
      expect(increase).toBeLessThanOrEqual(10)
    })

    it('returns number type', () => {
      // EXPLANATION: The result should be a number.

      const tierConfig = {
        salvageEncounterIncreaseRange: { min: 5, max: 15 }
      }

      const increase = EncounterController.rollSalvageEncounterIncrease(tierConfig)

      expect(typeof increase).toBe('number')
    })
  })
})
