import { describe, it, expect, beforeEach } from 'vitest'
import {
  getShipStatus,
  calculateSectionBaseStats,
  calculateEffectiveStats,
  calculateEffectiveShipStats
} from './statsCalculator.js'

// ========================================
// SHIP STATUS TESTS
// ========================================

describe('statsCalculator', () => {
  describe('getShipStatus()', () => {
    it('returns "healthy" when hull is above damaged threshold', () => {
      // EXPLANATION: This test verifies that a ship section with high hull (above the
      // damaged threshold) correctly returns "healthy" status. This is important because
      // ship status affects available stats and ship capabilities during combat.
      // Expected: Section with hull=10 (above damaged threshold of 6) returns "healthy"

      const section = {
        hull: 10,
        thresholds: { damaged: 6, critical: 3 }
      }
      expect(getShipStatus(section)).toBe('healthy')
    })

    it('returns "damaged" when hull is at or below damaged threshold', () => {
      // EXPLANATION: This test verifies that a ship section at or below the damaged
      // threshold correctly returns "damaged" status. Damaged ships have reduced stats.
      // Expected: Section with hull=6 (exactly at damaged threshold) returns "damaged"

      const section = {
        hull: 6,
        thresholds: { damaged: 6, critical: 3 }
      }
      expect(getShipStatus(section)).toBe('damaged')
    })

    it('returns "critical" when hull is at or below critical threshold', () => {
      // EXPLANATION: This test verifies that a ship section at or below the critical
      // threshold returns "critical" status. Critical ships have severely reduced stats.
      // Expected: Section with hull=3 (exactly at critical threshold) returns "critical"

      const section = {
        hull: 3,
        thresholds: { damaged: 6, critical: 3 }
      }
      expect(getShipStatus(section)).toBe('critical')
    })

    it('returns "critical" when hull is 0', () => {
      // EXPLANATION: This test verifies that a completely destroyed ship section (hull=0)
      // is correctly identified as "critical" status, not as some undefined state.
      // Expected: Section with hull=0 returns "critical"

      const section = {
        hull: 0,
        thresholds: { damaged: 6, critical: 3 }
      }
      expect(getShipStatus(section)).toBe('critical')
    })
  })

  // ========================================
  // SECTION BASE STATS TESTS
  // ========================================

  describe('calculateSectionBaseStats()', () => {
    it('calculates base stats without modifiers', () => {
      // EXPLANATION: This test verifies that ship sections correctly use base ship card
      // stats when the section template has no modifiers (all zeros). This is the baseline
      // calculation that all other sections build upon.
      // Expected: Section stats should exactly match the ship card's base values

      const shipCard = {
        baseHull: 10,
        baseShields: 5,
        baseThresholds: { damaged: 6, critical: 3 }
      }
      const sectionTemplate = {
        hullModifier: 0,
        shieldsModifier: 0,
        thresholdModifiers: { damaged: 0, critical: 0 }
      }

      const stats = calculateSectionBaseStats(shipCard, sectionTemplate)

      expect(stats.hull).toBe(10)
      expect(stats.maxHull).toBe(10)
      expect(stats.shields).toBe(5)
      expect(stats.allocatedShields).toBe(5)
      expect(stats.thresholds.damaged).toBe(6)
      expect(stats.thresholds.critical).toBe(3)
    })

    it('applies positive hull modifier', () => {
      // EXPLANATION: This test verifies that ship sections can have MORE hull than the
      // base ship card value by applying positive hull modifiers. Some sections like
      // armored sections get bonus hull.
      // Expected: Section with +5 hull modifier should have 15 total hull (10 base + 5 modifier)

      const shipCard = {
        baseHull: 10,
        baseShields: 5,
        baseThresholds: { damaged: 6, critical: 3 }
      }
      const sectionTemplate = {
        hullModifier: 5,
        shieldsModifier: 0,
        thresholdModifiers: { damaged: 0, critical: 0 }
      }

      const stats = calculateSectionBaseStats(shipCard, sectionTemplate)
      expect(stats.hull).toBe(15)
      expect(stats.maxHull).toBe(15)
    })

    it('applies negative shield modifier', () => {
      // EXPLANATION: This test verifies that ship sections can have LESS shields than the
      // base ship card value by applying negative shield modifiers. Some sections sacrifice
      // shields for other benefits.
      // Expected: Section with -3 shield modifier should have 2 shields (5 base - 3 modifier)

      const shipCard = {
        baseHull: 10,
        baseShields: 5,
        baseThresholds: { damaged: 6, critical: 3 }
      }
      const sectionTemplate = {
        hullModifier: 0,
        shieldsModifier: -3,
        thresholdModifiers: { damaged: 0, critical: 0 }
      }

      const stats = calculateSectionBaseStats(shipCard, sectionTemplate)
      expect(stats.shields).toBe(2)
    })

    it('enforces minimum hull of 1', () => {
      // EXPLANATION: This test verifies that ship sections cannot have 0 or negative hull,
      // even with large negative modifiers. Every section must have at least 1 hull to exist.
      // This prevents game-breaking bugs where sections would be destroyed instantly.
      // Expected: Section with -10 hull modifier (would be -8) should be clamped to minimum of 1

      const shipCard = {
        baseHull: 2,
        baseShields: 5,
        baseThresholds: { damaged: 1, critical: 0 }
      }
      const sectionTemplate = {
        hullModifier: -10, // Would result in negative hull
        shieldsModifier: 0,
        thresholdModifiers: { damaged: 0, critical: 0 }
      }

      const stats = calculateSectionBaseStats(shipCard, sectionTemplate)
      expect(stats.hull).toBe(1) // Minimum enforced
    })

    it('enforces minimum shields of 0', () => {
      // EXPLANATION: This test verifies that ship sections cannot have negative shields,
      // even with large negative modifiers. Shields can be 0 (no shields) but not negative.
      // This prevents bugs in shield damage calculations.
      // Expected: Section with -10 shield modifier (would be -8) should be clamped to minimum of 0

      const shipCard = {
        baseHull: 10,
        baseShields: 2,
        baseThresholds: { damaged: 6, critical: 3 }
      }
      const sectionTemplate = {
        hullModifier: 0,
        shieldsModifier: -10, // Would result in negative shields
        thresholdModifiers: { damaged: 0, critical: 0 }
      }

      const stats = calculateSectionBaseStats(shipCard, sectionTemplate)
      expect(stats.shields).toBe(0) // Minimum enforced
    })

    it('handles legacy sections without modifiers', () => {
      // EXPLANATION: This test verifies backward compatibility with old ship sections that
      // don't have the modifier fields defined. The code should treat missing modifiers as 0.
      // This ensures old saved games and ship designs still work correctly.
      // Expected: Section with no modifier fields should use base ship card values (default to 0 modifiers)

      const shipCard = {
        baseHull: 10,
        baseShields: 5,
        baseThresholds: { damaged: 6, critical: 3 }
      }
      const sectionTemplate = {} // No modifiers

      const stats = calculateSectionBaseStats(shipCard, sectionTemplate)

      expect(stats.hull).toBe(10) // Uses base values
      expect(stats.shields).toBe(5)
    })

    it('applies threshold modifiers correctly', () => {
      // EXPLANATION: This test verifies that ship sections can modify their damage thresholds.
      // Some sections might have higher thresholds (stay healthy longer) or lower thresholds.
      // This affects when the ship transitions between healthy/damaged/critical states.
      // Expected: Section with +2 damaged threshold should have threshold of 8 (6 base + 2 modifier)

      const shipCard = {
        baseHull: 10,
        baseShields: 5,
        baseThresholds: { damaged: 6, critical: 3 }
      }
      const sectionTemplate = {
        hullModifier: 0,
        shieldsModifier: 0,
        thresholdModifiers: { damaged: 2, critical: 1 }
      }

      const stats = calculateSectionBaseStats(shipCard, sectionTemplate)

      expect(stats.thresholds.damaged).toBe(8) // 6 + 2
      expect(stats.thresholds.critical).toBe(4) // 3 + 1
    })

    it('enforces minimum threshold of 0', () => {
      // EXPLANATION: This test verifies that damage thresholds cannot go negative,
      // even with large negative modifiers. A threshold of 0 means instant transition
      // to that state, which is valid, but negative thresholds would cause bugs.
      // Expected: Threshold with -10 modifier (would be -7) should be clamped to 0

      const shipCard = {
        baseHull: 10,
        baseShields: 5,
        baseThresholds: { damaged: 3, critical: 1 }
      }
      const sectionTemplate = {
        hullModifier: 0,
        shieldsModifier: 0,
        thresholdModifiers: { damaged: -10, critical: -10 }
      }

      const stats = calculateSectionBaseStats(shipCard, sectionTemplate)

      expect(stats.thresholds.damaged).toBe(0)
      expect(stats.thresholds.critical).toBe(0)
    })
  })

  // ========================================
  // EFFECTIVE STATS TESTS
  // ========================================

  describe('calculateEffectiveStats()', () => {
    let mockDrone, mockPlayerSelf, mockPlayerOpponent, mockPlacedSections

    beforeEach(() => {
      // Basic drone with no special abilities
      mockDrone = {
        id: 'drone1',
        name: 'Dart', // Using actual drone from droneData.js
        hull: 1, // Scout Drone has 1 hull
        isExhausted: false,
        statMods: [],
        appliedUpgrades: []
      }

      // Minimal player states with required structure
      mockPlayerSelf = {
        name: 'Player 1',
        dronesOnBoard: {
          lane1: [mockDrone],
          lane2: [],
          lane3: []
        },
        appliedUpgrades: {}, // Required by calculateEffectiveStats
        shipSections: {}
      }

      mockPlayerOpponent = {
        name: 'Player 2',
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        appliedUpgrades: {},
        shipSections: {}
      }

      // allPlacedSections needs to be an object with player1/player2 properties
      mockPlacedSections = {
        player1: ['section1', 'section2', 'section3'],
        player2: ['section1', 'section2', 'section3']
      }
    })

    it('returns stats object with required properties', () => {
      // EXPLANATION: This test verifies that calculateEffectiveStats returns an object
      // with all the required stat properties. This is a basic sanity check to ensure
      // the function structure is correct before testing specific behaviors.
      // Expected: Stats object contains attack, speed, hull, shields, cost, and keywords properties

      const stats = calculateEffectiveStats(
        mockDrone,
        'lane1',
        mockPlayerSelf,
        mockPlayerOpponent,
        mockPlacedSections
      )

      expect(stats).toHaveProperty('attack')
      expect(stats).toHaveProperty('speed')
      expect(stats).toHaveProperty('maxShields') // Function returns maxShields, not shields
      expect(stats).toHaveProperty('cost')
      expect(stats).toHaveProperty('keywords')
      // hull is part of ...drone spread, so it's in stats
      expect(stats).toHaveProperty('hull')
    })

    it('applies permanent stat mods correctly', () => {
      // EXPLANATION: This test verifies that permanent stat modifications (gained through
      // abilities like "gain +1 attack after attacking") are correctly added to the drone's
      // base stats. These mods persist across turns until the drone is destroyed.
      // Expected: Drone with +2 attack and +1 speed mods should have those bonuses applied

      const droneWithMods = {
        ...mockDrone,
        statMods: [
          { stat: 'attack', value: 2 },
          { stat: 'speed', value: 1 }
        ]
      }

      const stats = calculateEffectiveStats(
        droneWithMods,
        'lane1',
        mockPlayerSelf,
        mockPlayerOpponent,
        mockPlacedSections
      )

      // Scout Drone has base attack of 1, so with +2 should be 3
      expect(stats.attack).toBe(3)
      // Scout Drone has base speed of 6, so with +1 should be 7
      expect(stats.speed).toBe(7)
    })

    it('enforces minimum cost of 0', () => {
      // EXPLANATION: This test verifies that drone costs cannot go negative, even with
      // cost reduction abilities or modifiers. Negative costs would break the energy system
      // and allow infinite drone deployment.
      // Expected: Drone cost should never be less than 0

      const cheapDrone = {
        ...mockDrone,
        name: 'Dart', // Cost 1
        statMods: [
          { stat: 'cost', value: -10 } // Huge cost reduction
        ]
      }

      const stats = calculateEffectiveStats(
        cheapDrone,
        'lane1',
        mockPlayerSelf,
        mockPlayerOpponent,
        mockPlacedSections
      )

      expect(stats.cost).toBeGreaterThanOrEqual(0)
    })

    it('keywords property is a Set', () => {
      // EXPLANATION: This test verifies that the keywords property is returned as a Set
      // data structure. Sets are used for keywords to prevent duplicates and provide
      // efficient has() checks during game logic (e.g., checking if drone has DEFENDER keyword).
      // Expected: stats.keywords should be an instance of Set

      const stats = calculateEffectiveStats(
        mockDrone,
        'lane1',
        mockPlayerSelf,
        mockPlayerOpponent,
        mockPlacedSections
      )

      expect(stats.keywords).toBeInstanceOf(Set)
    })

    it('returns numeric values for all stat properties', () => {
      // EXPLANATION: This test verifies that all stat calculations return actual numbers,
      // not NaN, undefined, or null. This catches edge cases where missing data or bad
      // calculations could result in non-numeric values that would crash the game.
      // Expected: All stats (attack, speed, hull, shields, cost) should be numbers

      const stats = calculateEffectiveStats(
        mockDrone,
        'lane1',
        mockPlayerSelf,
        mockPlayerOpponent,
        mockPlacedSections
      )

      expect(typeof stats.attack).toBe('number')
      expect(typeof stats.speed).toBe('number')
      expect(typeof stats.hull).toBe('number')
      expect(typeof stats.maxShields).toBe('number') // Function returns maxShields, not shields
      expect(typeof stats.cost).toBe('number')
      expect(isNaN(stats.attack)).toBe(false)
      expect(isNaN(stats.speed)).toBe(false)
      expect(isNaN(stats.hull)).toBe(false)
      expect(isNaN(stats.maxShields)).toBe(false)
      expect(isNaN(stats.cost)).toBe(false)
    })
  })

  // ========================================
  // SHIP STATS TESTS
  // ========================================

  describe('calculateEffectiveShipStats()', () => {
    it('returns default stats for null playerState', () => {
      // EXPLANATION: This test verifies that the function handles null/undefined player
      // states gracefully by returning safe default values. This prevents crashes when
      // the function is called during initialization or with invalid data.
      // Expected: Returns object with all stat totals set to 0 and empty bySection object

      const stats = calculateEffectiveShipStats(null, [])

      expect(stats.totals.handLimit).toBe(0)
      expect(stats.totals.energyPerTurn).toBe(0)
      expect(stats.totals.discardLimit).toBe(0)
      expect(stats.totals.maxEnergy).toBe(0)
      expect(stats.totals.shieldsPerTurn).toBe(0)
      expect(stats.totals.initialDeployment).toBe(0)
      expect(stats.totals.deploymentBudget).toBe(0)
      expect(stats.totals.cpuLimit).toBe(0)
      expect(stats.bySection).toEqual({})
    })

    it('returns default stats for empty placed sections', () => {
      // EXPLANATION: This test verifies that only placed (active) ship sections contribute
      // to the ship's total stats. Sections that exist but aren't placed shouldn't count.
      // This is important for game balance - players must choose which sections to deploy.
      // Expected: Returns zero totals when placedSections array is empty

      const playerState = {
        shipSections: {
          section1: {
            stats: {
              healthy: {
                'Draw': 5,
                'Energy Per Turn': 3,
                'Discard': 2,
                'Max Energy': 10,
                'Shields Per Turn': 1,
                'Initial Deployment': 5,
                'Deployment Budget': 15,
                'CPU Control Value': 20
              }
            },
            hull: 10,
            thresholds: { damaged: 6, critical: 3 }
          }
        }
      }

      const stats = calculateEffectiveShipStats(playerState, [])

      // No sections placed = no stats
      expect(stats.totals.handLimit).toBe(0)
      expect(stats.totals.energyPerTurn).toBe(0)
    })

    it('calculates totals from multiple placed sections', () => {
      // EXPLANATION: This test verifies that the function correctly aggregates stats from
      // multiple ship sections. Each section provides various stats, and the totals should
      // be the sum of all placed sections. This is core to the ship building system.
      // Expected: Totals should be sum of section1 stats + section2 stats

      const playerState = {
        shipSections: {
          section1: {
            stats: {
              healthy: {
                'Draw': 5,
                'Energy Per Turn': 3,
                'Discard': 2,
                'Max Energy': 10,
                'Shields Per Turn': 1,
                'Initial Deployment': 5,
                'Deployment Budget': 15,
                'CPU Control Value': 20
              }
            },
            hull: 10,
            thresholds: { damaged: 6, critical: 3 }
          },
          section2: {
            stats: {
              healthy: {
                'Draw': 3,
                'Energy Per Turn': 2,
                'Discard': 1,
                'Max Energy': 5,
                'Shields Per Turn': 0,
                'Initial Deployment': 3,
                'Deployment Budget': 10,
                'CPU Control Value': 15
              }
            },
            hull: 8,
            thresholds: { damaged: 5, critical: 2 }
          }
        }
      }

      const stats = calculateEffectiveShipStats(playerState, ['section1', 'section2'])

      expect(stats.totals.handLimit).toBe(8) // 5 + 3
      expect(stats.totals.energyPerTurn).toBe(5) // 3 + 2
      expect(stats.totals.discardLimit).toBe(3) // 2 + 1
      expect(stats.totals.maxEnergy).toBe(15) // 10 + 5
      expect(stats.totals.shieldsPerTurn).toBe(1) // 1 + 0
      expect(stats.totals.initialDeployment).toBe(8) // 5 + 3
      expect(stats.totals.deploymentBudget).toBe(25) // 15 + 10
      expect(stats.totals.cpuLimit).toBe(35) // 20 + 15
      expect(stats.bySection).toHaveProperty('section1')
      expect(stats.bySection).toHaveProperty('section2')
    })

    it('skips null entries in placedSections array', () => {
      // EXPLANATION: This test verifies that the function handles null/empty slots in the
      // placedSections array. In the 3-lane system, some lanes might be empty (null), and
      // the function should skip those without crashing or counting them.
      // Expected: Only non-null sections contribute to totals

      const playerState = {
        shipSections: {
          section1: {
            stats: {
              healthy: {
                'Draw': 5,
                'Energy Per Turn': 3,
                'Discard': 2,
                'Max Energy': 10,
                'Shields Per Turn': 1,
                'Initial Deployment': 5,
                'Deployment Budget': 15,
                'CPU Control Value': 20
              }
            },
            hull: 10,
            thresholds: { damaged: 6, critical: 3 }
          }
        }
      }

      const stats = calculateEffectiveShipStats(playerState, [null, 'section1', null])

      expect(stats.totals.handLimit).toBe(5) // Only section1 counted
    })

    it('uses section status (healthy/damaged/critical) to determine active stats', () => {
      // EXPLANATION: This test verifies that damaged ship sections use their reduced stats,
      // not their healthy stats. As sections take damage, they transition to damaged or
      // critical status, which reduces their contribution to the ship's total stats.
      // Expected: Section with hull at damaged threshold uses "damaged" stats, not "healthy" stats

      const playerState = {
        shipSections: {
          damagedSection: {
            stats: {
              healthy: {
                'Draw': 5,
                'Energy Per Turn': 3,
                'Discard': 2,
                'Max Energy': 10,
                'Shields Per Turn': 1,
                'Initial Deployment': 5,
                'Deployment Budget': 15,
                'CPU Control Value': 20
              },
              damaged: {
                'Draw': 3, // Reduced from 5
                'Energy Per Turn': 2, // Reduced from 3
                'Discard': 1,
                'Max Energy': 8,
                'Shields Per Turn': 0,
                'Initial Deployment': 3,
                'Deployment Budget': 10,
                'CPU Control Value': 15
              },
              critical: {
                'Draw': 1,
                'Energy Per Turn': 1,
                'Discard': 0,
                'Max Energy': 5,
                'Shields Per Turn': 0,
                'Initial Deployment': 1,
                'Deployment Budget': 5,
                'CPU Control Value': 10
              }
            },
            hull: 6, // At damaged threshold
            thresholds: { damaged: 6, critical: 3 }
          }
        }
      }

      const stats = calculateEffectiveShipStats(playerState, ['damagedSection'])

      // Should use "damaged" stats, not "healthy" stats
      expect(stats.totals.handLimit).toBe(3) // Not 5
      expect(stats.totals.energyPerTurn).toBe(2) // Not 3
    })

    it('provides individual section stats in bySection object', () => {
      // EXPLANATION: This test verifies that the function returns detailed stats for each
      // individual section in the bySection object. This is used by the UI to display
      // per-section information and by game logic that needs section-specific data.
      // Expected: bySection contains an entry for each placed section with its individual stats

      const playerState = {
        shipSections: {
          section1: {
            stats: {
              healthy: {
                'Draw': 5,
                'Energy Per Turn': 3,
                'Discard': 2,
                'Max Energy': 10,
                'Shields Per Turn': 1,
                'Initial Deployment': 5,
                'Deployment Budget': 15,
                'CPU Control Value': 20
              }
            },
            hull: 10,
            thresholds: { damaged: 6, critical: 3 }
          }
        }
      }

      const stats = calculateEffectiveShipStats(playerState, ['section1'])

      expect(stats.bySection).toHaveProperty('section1')
      expect(stats.bySection.section1['Draw']).toBe(5)
      expect(stats.bySection.section1['Energy Per Turn']).toBe(3)
    })
  })
})
