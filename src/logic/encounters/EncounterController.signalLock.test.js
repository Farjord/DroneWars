import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import EncounterController from './EncounterController.js'
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js'
import gameStateManager from '../../managers/GameStateManager.js'

// ========================================
// ENCOUNTER CONTROLLER - SIGNAL LOCK TESTS
// ========================================
// TDD tests for the Signal Lock (encounter detection) system
// These tests define expected behavior for:
// - increaseEncounterDetection(): increase signal lock per move
// - resetEncounterDetection(): reset on combat victory
// - getEncounterDetectionChance(): get current signal lock %
// - Two-roll mechanic in checkMovementEncounter()

// Mock the managers
vi.mock('../../managers/TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn()
  }
}))

vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn()
  }
}))

// Mock debugLogger to avoid console noise
vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

describe('EncounterController - Signal Lock System', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock state - run is active with 0% signal lock
    tacticalMapStateManager.getState.mockReturnValue({
      encounterDetectionChance: 0,
      mapData: { encounterByZone: { perimeter: 5, mid: 10, core: 15 } }
    })
    tacticalMapStateManager.isRunActive.mockReturnValue(true)

    // Default game state with seed for deterministic RNG
    gameStateManager.getState.mockReturnValue({
      gameSeed: 12345
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ========================================
  // METHOD EXISTENCE TESTS
  // ========================================

  describe('method existence', () => {
    it('increaseEncounterDetection method exists', () => {
      // EXPLANATION: The method should exist on the controller
      expect(typeof EncounterController.increaseEncounterDetection).toBe('function')
    })

    it('resetEncounterDetection method exists', () => {
      // EXPLANATION: The method should exist on the controller
      expect(typeof EncounterController.resetEncounterDetection).toBe('function')
    })

    it('getEncounterDetectionChance method exists', () => {
      // EXPLANATION: The method should exist on the controller
      expect(typeof EncounterController.getEncounterDetectionChance).toBe('function')
    })
  })

  // ========================================
  // increaseEncounterDetection TESTS
  // ========================================

  describe('increaseEncounterDetection', () => {
    it('increases detection within configured range (min-max)', () => {
      // EXPLANATION: When called with tierConfig containing encounterDetectionRate,
      // it should increase encounterDetectionChance by a random value within that range

      const tierConfig = {
        encounterDetectionRate: { min: 5, max: 15 }
      }

      EncounterController.increaseEncounterDetection(tierConfig, 0)

      // Check that setState was called with an increase
      expect(tacticalMapStateManager.setState).toHaveBeenCalled()
      const call = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(call.encounterDetectionChance).toBeGreaterThanOrEqual(5)
      expect(call.encounterDetectionChance).toBeLessThanOrEqual(15)
    })

    it('accumulates detection across multiple calls', () => {
      // EXPLANATION: Each call should add to the existing value

      const tierConfig = {
        encounterDetectionRate: { min: 10, max: 10 } // Fixed for predictability
      }

      // First call - starts at 0
      EncounterController.increaseEncounterDetection(tierConfig, 0)
      const firstCall = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(firstCall.encounterDetectionChance).toBe(10)

      // Simulate state update
      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 10,
        mapData: {}
      })

      // Second call - should add to existing 10%
      EncounterController.increaseEncounterDetection(tierConfig, 1)
      const secondCall = tacticalMapStateManager.setState.mock.calls[1][0]
      expect(secondCall.encounterDetectionChance).toBe(20)
    })

    it('caps detection at 100%', () => {
      // EXPLANATION: Detection should never exceed 100%

      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 95,
        mapData: {}
      })

      const tierConfig = {
        encounterDetectionRate: { min: 10, max: 10 }
      }

      EncounterController.increaseEncounterDetection(tierConfig, 0)

      const call = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(call.encounterDetectionChance).toBe(100) // Capped, not 105
    })

    it('uses default range if tierConfig has no encounterDetectionRate', () => {
      // EXPLANATION: Should use sensible defaults (5-15%) if not configured

      const tierConfig = {} // No encounterDetectionRate

      EncounterController.increaseEncounterDetection(tierConfig, 0)

      expect(tacticalMapStateManager.setState).toHaveBeenCalled()
      const call = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(call.encounterDetectionChance).toBeGreaterThanOrEqual(5)
      expect(call.encounterDetectionChance).toBeLessThanOrEqual(15)
    })

    it('uses seeded RNG for determinism', () => {
      // EXPLANATION: Same inputs should produce same output (for replays)

      const tierConfig = {
        encounterDetectionRate: { min: 5, max: 15 }
      }

      // Call twice with same moveIndex - should get same result
      EncounterController.increaseEncounterDetection(tierConfig, 42)
      const firstResult = tacticalMapStateManager.setState.mock.calls[0][0].encounterDetectionChance

      vi.clearAllMocks()
      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 0,
        mapData: {}
      })

      EncounterController.increaseEncounterDetection(tierConfig, 42)
      const secondResult = tacticalMapStateManager.setState.mock.calls[0][0].encounterDetectionChance

      expect(firstResult).toBe(secondResult)
    })

    it('does nothing if run is not active', () => {
      // EXPLANATION: Should not update state if no run is active

      tacticalMapStateManager.isRunActive.mockReturnValue(false)

      const tierConfig = {
        encounterDetectionRate: { min: 5, max: 15 }
      }

      EncounterController.increaseEncounterDetection(tierConfig, 0)

      expect(tacticalMapStateManager.setState).not.toHaveBeenCalled()
    })
  })

  // ========================================
  // resetEncounterDetection TESTS
  // ========================================

  describe('resetEncounterDetection', () => {
    it('sets encounterDetectionChance to 0', () => {
      // EXPLANATION: Should reset detection to 0 (combat victory disrupts tracking)

      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 75,
        mapData: {}
      })

      EncounterController.resetEncounterDetection()

      expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
        encounterDetectionChance: 0
      })
    })

    it('only resets when run is active', () => {
      // EXPLANATION: Should not update state if no run is active

      tacticalMapStateManager.isRunActive.mockReturnValue(false)

      EncounterController.resetEncounterDetection()

      expect(tacticalMapStateManager.setState).not.toHaveBeenCalled()
    })
  })

  // ========================================
  // getEncounterDetectionChance TESTS
  // ========================================

  describe('getEncounterDetectionChance', () => {
    it('returns current encounterDetectionChance from state', () => {
      // EXPLANATION: Should return the current signal lock percentage

      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 42
      })

      const result = EncounterController.getEncounterDetectionChance()

      expect(result).toBe(42)
    })

    it('returns 0 if state is null', () => {
      // EXPLANATION: Should handle missing state gracefully

      tacticalMapStateManager.getState.mockReturnValue(null)

      const result = EncounterController.getEncounterDetectionChance()

      expect(result).toBe(0)
    })

    it('returns 0 if encounterDetectionChance is undefined', () => {
      // EXPLANATION: Should handle missing property gracefully

      tacticalMapStateManager.getState.mockReturnValue({})

      const result = EncounterController.getEncounterDetectionChance()

      expect(result).toBe(0)
    })
  })

  // ========================================
  // TWO-ROLL MECHANIC TESTS
  // ========================================

  describe('two-roll mechanic in checkMovementEncounter', () => {
    it('returns null when detection at 0% (first roll always fails)', () => {
      // EXPLANATION: At 0% signal lock, the first roll should always fail,
      // meaning no encounter is possible regardless of hex encounter chance

      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 0,
        mapData: { encounterByZone: { perimeter: 100 } } // 100% hex chance
      })

      const hex = { type: 'empty', q: 0, r: 0, zone: 'perimeter' }
      const tierConfig = { encounterChance: { empty: 100 } }

      // Run multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const result = EncounterController.checkMovementEncounter(hex, tierConfig)
        expect(result).toBeNull()
      }
    })

    it('always passes first roll when detection at 100%', () => {
      // EXPLANATION: At 100% signal lock, the first roll should always pass,
      // then the hex encounter chance determines if combat occurs

      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 100,
        mapData: { encounterByZone: { perimeter: 100 } } // 100% hex chance
      })

      const hex = { type: 'empty', q: 5, r: 5, zone: 'perimeter' }
      const tierConfig = {
        encounterChance: { empty: 100 },
        threatTables: { low: ['Rogue Scout Pattern'] }
      }

      // With 100% detection and 100% hex chance, should always trigger
      const result = EncounterController.checkMovementEncounter(hex, tierConfig)
      expect(result).not.toBeNull()
      expect(result.outcome).toBe('combat')
    })

    it('rolls against hex encounter chance only after detection succeeds', () => {
      // EXPLANATION: The two-roll mechanic requires both rolls to succeed.
      // If detection is 100% but hex chance is 0%, no encounter should trigger.

      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 100, // Always detected
        mapData: { encounterByZone: { perimeter: 0 } } // But 0% hex encounter chance
      })

      const hex = { type: 'gate', q: 0, r: 0 } // Gates have 0% encounter
      const tierConfig = { encounterChance: { gate: 0 } }

      const result = EncounterController.checkMovementEncounter(hex, tierConfig)
      expect(result).toBeNull()
    })

    it('intermediate detection values have proportional encounter chance', () => {
      // EXPLANATION: At 50% detection, roughly half the detection rolls should pass.
      // This is probabilistic but should show variation from 0% and 100%.

      tacticalMapStateManager.getState.mockReturnValue({
        encounterDetectionChance: 50,
        mapData: { encounterByZone: { perimeter: 100 } } // 100% hex chance after detection
      })

      const tierConfig = {
        encounterChance: { empty: 100 },
        threatTables: { low: ['Rogue Scout Pattern'] }
      }

      // Run multiple times with different hex positions
      let encounters = 0
      for (let i = 0; i < 20; i++) {
        const hex = { type: 'empty', q: i * 10, r: i * 7, zone: 'perimeter' }
        const result = EncounterController.checkMovementEncounter(hex, tierConfig)
        if (result) encounters++
      }

      // With 50% detection and 100% hex chance, expect roughly 10 encounters
      // Allow wide range for random variation
      expect(encounters).toBeGreaterThan(0)
      expect(encounters).toBeLessThan(20)
    })
  })
})
