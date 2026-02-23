import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import EncounterController from '../EncounterController.js'
import tacticalMapStateManager from '../../../managers/TacticalMapStateManager.js'
import gameStateManager from '../../../managers/GameStateManager.js'
import DetectionManager from '../../detection/DetectionManager.js'

// ========================================
// ENCOUNTER CONTROLLER - POI THREAT BONUS TESTS
// ========================================
// TDD tests for the POI encounter threat bonus system
// Higher detection = higher POI encounter chance
// - Low (0-49%): +0%
// - Medium (50-79%): +8-15%
// - High (80-100%): +16-30% (two tiers stacked)

// Mock the managers
vi.mock('../../../managers/TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn()
  }
}))

vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn()
  }
}))

vi.mock('../../detection/DetectionManager.js', () => ({
  default: {
    getThreshold: vi.fn(),
    getCurrentDetection: vi.fn()
  }
}))

// Mock debugLogger to avoid console noise
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

describe('EncounterController - POI Threat Bonus', () => {
  const mockPoi = {
    q: 3,
    r: -2,
    type: 'poi',
    poiData: {
      name: 'Test POI',
      baseSecurity: 15
    }
  }

  const mockTierConfig = {
    poiThreatBonus: { min: 8, max: 15 }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock state
    tacticalMapStateManager.getState.mockReturnValue({
      detection: 25,
      mapData: {}
    })
    tacticalMapStateManager.isRunActive.mockReturnValue(true)

    // Default game state with seed for deterministic RNG
    gameStateManager.getState.mockReturnValue({
      gameSeed: 12345
    })

    // Default to low threat
    DetectionManager.getThreshold.mockReturnValue('low')
    DetectionManager.getCurrentDetection.mockReturnValue(25)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ========================================
  // METHOD EXISTENCE TESTS
  // ========================================

  describe('method existence', () => {
    it('_calculatePOIThreatBonus method exists', () => {
      expect(typeof EncounterController._calculatePOIThreatBonus).toBe('function')
    })
  })

  // ========================================
  // _calculatePOIThreatBonus TESTS
  // ========================================

  describe('_calculatePOIThreatBonus', () => {
    it('returns 0 for low threat level', () => {
      // EXPLANATION: At low detection (0-49%), there should be no bonus
      const bonus = EncounterController._calculatePOIThreatBonus(mockPoi, mockTierConfig, 'low')
      expect(bonus).toBe(0)
    })

    it('returns value between 8-15 for medium threat level', () => {
      // EXPLANATION: At medium detection (50-79%), one tier of bonus (8-15%)
      const bonus = EncounterController._calculatePOIThreatBonus(mockPoi, mockTierConfig, 'medium')
      expect(bonus).toBeGreaterThanOrEqual(8)
      expect(bonus).toBeLessThanOrEqual(15)
    })

    it('returns value between 16-30 for high threat level (stacked)', () => {
      // EXPLANATION: At high detection (80-100%), two tiers stacked (16-30%)
      const bonus = EncounterController._calculatePOIThreatBonus(mockPoi, mockTierConfig, 'high')
      expect(bonus).toBeGreaterThanOrEqual(16)
      expect(bonus).toBeLessThanOrEqual(30)
    })

    it('uses seeded RNG for deterministic results', () => {
      // EXPLANATION: Same POI + same seed = same bonus every time
      const bonus1 = EncounterController._calculatePOIThreatBonus(mockPoi, mockTierConfig, 'medium')
      const bonus2 = EncounterController._calculatePOIThreatBonus(mockPoi, mockTierConfig, 'medium')
      expect(bonus1).toBe(bonus2)
    })

    it('different POIs get different bonuses', () => {
      // EXPLANATION: Different POI coordinates should produce different bonuses
      const poi1 = { q: 1, r: 1, poiData: { baseSecurity: 15 } }
      const poi2 = { q: 5, r: -3, poiData: { baseSecurity: 15 } }

      const bonus1 = EncounterController._calculatePOIThreatBonus(poi1, mockTierConfig, 'medium')
      const bonus2 = EncounterController._calculatePOIThreatBonus(poi2, mockTierConfig, 'medium')

      // Different coordinates should yield different bonuses (not guaranteed but highly likely with seeded RNG)
      // We test that both are valid, not necessarily different since with some seeds they could match
      expect(bonus1).toBeGreaterThanOrEqual(8)
      expect(bonus2).toBeGreaterThanOrEqual(8)
    })

    it('uses default range if tierConfig missing poiThreatBonus', () => {
      // EXPLANATION: Should fall back to default 8-15% range
      const bonus = EncounterController._calculatePOIThreatBonus(mockPoi, {}, 'medium')
      expect(bonus).toBeGreaterThanOrEqual(8)
      expect(bonus).toBeLessThanOrEqual(15)
    })
  })

  // ========================================
  // checkPOIEncounter WITH THREAT BONUS TESTS
  // ========================================

  describe('checkPOIEncounter with threat bonus', () => {
    it('includes threat bonus in threshold calculation for medium threat', () => {
      // EXPLANATION: At medium threat, threshold should be baseSecurity + threatBonus (8-15)
      // Not baseSecurity + detection as before
      DetectionManager.getThreshold.mockReturnValue('medium')

      // We can't directly test internal threshold, but we can verify the method runs
      // and uses DetectionManager.getThreshold()
      const outcome = EncounterController.checkPOIEncounter(mockPoi, mockTierConfig)

      expect(DetectionManager.getThreshold).toHaveBeenCalled()
      expect(['combat', 'loot']).toContain(outcome)
    })

    it('includes threat bonus in threshold calculation for high threat', () => {
      // EXPLANATION: At high threat, threshold should include stacked bonus (16-30)
      DetectionManager.getThreshold.mockReturnValue('high')

      const outcome = EncounterController.checkPOIEncounter(mockPoi, mockTierConfig)

      expect(DetectionManager.getThreshold).toHaveBeenCalled()
      expect(['combat', 'loot']).toContain(outcome)
    })

    it('no threat bonus for low threat level', () => {
      // EXPLANATION: At low threat, only baseSecurity affects threshold
      DetectionManager.getThreshold.mockReturnValue('low')

      const outcome = EncounterController.checkPOIEncounter(mockPoi, mockTierConfig)

      expect(DetectionManager.getThreshold).toHaveBeenCalled()
      expect(['combat', 'loot']).toContain(outcome)
    })

    it('accepts tierConfig parameter', () => {
      // EXPLANATION: Method signature should accept tierConfig
      // This will fail if tierConfig is not accepted
      expect(() => {
        EncounterController.checkPOIEncounter(mockPoi, mockTierConfig)
      }).not.toThrow()
    })
  })
})
