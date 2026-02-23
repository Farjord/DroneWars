// ========================================
// CONDITIONAL SECTION DAMAGE PROCESSOR TESTS
// ========================================
// Tests for lane-control card effect processor

import { describe, it, expect, beforeEach } from 'vitest';
import ConditionalSectionDamageProcessor from '../ConditionalSectionDamageProcessor.js';

describe('ConditionalSectionDamageProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new ConditionalSectionDamageProcessor();
  });

  describe('Crossfire Pattern (FLANK_SECTIONS target)', () => {
    it('should deal damage to both flank sections when player controls both flanks', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane3'],
          operator: 'ALL'
        },
        damage: 3,
        targets: 'FLANK_SECTIONS',
        damageType: 'NORMAL'
      };

      const context = {
        actingPlayerId: 'player1',
        playerStates: {
          player1: {
            dronesOnBoard: {
              lane1: [{id: 'd1'}, {id: 'd2'}],  // player1 has 2
              lane2: [],
              lane3: [{id: 'd3'}, {id: 'd4'}]   // player1 has 2
            }
          },
          player2: {
            dronesOnBoard: {
              lane1: [{id: 'd5'}],               // player2 has 1
              lane2: [],
              lane3: [{id: 'd6'}]                // player2 has 1
            },
            shipSections: {
              LEFT_SECTION: { hull: 10, allocatedShields: 2 },
              MIDDLE_SECTION: { hull: 10, allocatedShields: 2 },
              RIGHT_SECTION: { hull: 10, allocatedShields: 2 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Crossfire Pattern' }
      };

      const result = processor.process(effect, context);

      // Left section: shields 2 -> 0, hull 10 -> 9 (3 damage: 2 to shields, 1 to hull)
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.allocatedShields).toBe(0);
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.hull).toBe(9);

      // Right section: same damage pattern
      expect(result.newPlayerStates.player2.shipSections.RIGHT_SECTION.allocatedShields).toBe(0);
      expect(result.newPlayerStates.player2.shipSections.RIGHT_SECTION.hull).toBe(9);

      // Middle section: unchanged
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.allocatedShields).toBe(2);
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.hull).toBe(10);

      // Should generate 6 animation events total (3 per section)
      expect(result.animationEvents).toHaveLength(6);
      expect(result.animationEvents.filter(e => e.targetId === 'LEFT_SECTION')).toHaveLength(3);
      expect(result.animationEvents.filter(e => e.targetId === 'RIGHT_SECTION')).toHaveLength(3);
    });

    it('should NOT deal damage when player does not control both flanks', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane3'],
          operator: 'ALL'
        },
        damage: 3,
        targets: 'FLANK_SECTIONS'
      };

      const context = {
        actingPlayerId: 'player1',
        playerStates: {
          player1: {
            dronesOnBoard: {
              lane1: [{id: 'd1'}, {id: 'd2'}],  // player1 controls
              lane2: [],
              lane3: []                          // player2 controls (tie - no control)
            }
          },
          player2: {
            dronesOnBoard: {
              lane1: [{id: 'd5'}],
              lane2: [],
              lane3: [{id: 'd6'}, {id: 'd7'}]   // player2 has more
            },
            shipSections: {
              LEFT_SECTION: { hull: 10, allocatedShields: 2 },
              RIGHT_SECTION: { hull: 10, allocatedShields: 2 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Crossfire Pattern' }
      };

      const result = processor.process(effect, context);

      // No damage should be applied
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.hull).toBe(10);
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.allocatedShields).toBe(2);
      expect(result.newPlayerStates.player2.shipSections.RIGHT_SECTION.hull).toBe(10);
      expect(result.newPlayerStates.player2.shipSections.RIGHT_SECTION.allocatedShields).toBe(2);

      // No animation events
      expect(result.animationEvents).toHaveLength(0);
    });
  });

  describe('Breach the Line (MIDDLE_SECTION target)', () => {
    it('should deal 6 damage to middle section when player controls middle lane', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane2'],
          operator: 'ALL'
        },
        damage: 6,
        targets: 'MIDDLE_SECTION',
        damageType: 'NORMAL'
      };

      const context = {
        actingPlayerId: 'player1',
        playerStates: {
          player1: {
            dronesOnBoard: {
              lane1: [],
              lane2: [{id: 'd1'}, {id: 'd2'}, {id: 'd3'}],  // player1 controls middle
              lane3: []
            }
          },
          player2: {
            dronesOnBoard: {
              lane1: [],
              lane2: [{id: 'd4'}],                           // player2 has fewer
              lane3: []
            },
            shipSections: {
              LEFT_SECTION: { hull: 10, allocatedShields: 2 },
              MIDDLE_SECTION: { hull: 10, allocatedShields: 2 },
              RIGHT_SECTION: { hull: 10, allocatedShields: 2 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Breach the Line' }
      };

      const result = processor.process(effect, context);

      // Middle section: 6 damage (2 to shields, 4 to hull)
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.allocatedShields).toBe(0);
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.hull).toBe(6);

      // Other sections unchanged
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.hull).toBe(10);
      expect(result.newPlayerStates.player2.shipSections.RIGHT_SECTION.hull).toBe(10);

      // 6 animation events (1 per damage)
      expect(result.animationEvents).toHaveLength(6);
    });
  });

  describe('Overrun (CORRESPONDING_SECTION target)', () => {
    it('should deal 2 damage when player controls lane with no enemy drones', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANE_EMPTY',
          lane: 'TARGET'
        },
        damage: 2,
        targets: 'CORRESPONDING_SECTION',
        damageType: 'NORMAL'
      };

      const context = {
        actingPlayerId: 'player1',
        target: { id: 'left' },  // Targeting left section (corresponds to lane1)
        playerStates: {
          player1: {
            dronesOnBoard: {
              lane1: [{id: 'd1'}, {id: 'd2'}],  // player1 has drones
              lane2: [],
              lane3: []
            }
          },
          player2: {
            dronesOnBoard: {
              lane1: [],                         // NO enemy drones (key condition)
              lane2: [],
              lane3: []
            },
            shipSections: {
              LEFT_SECTION: { hull: 10, allocatedShields: 2 },
              MIDDLE_SECTION: { hull: 10, allocatedShields: 2 },
              RIGHT_SECTION: { hull: 10, allocatedShields: 2 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Overrun' }
      };

      const result = processor.process(effect, context);

      // Left section (corresponds to lane1): 2 damage to shields
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.allocatedShields).toBe(0);
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.hull).toBe(10);

      // Other sections unchanged
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.hull).toBe(10);

      // 2 animation events
      expect(result.animationEvents).toHaveLength(2);
    });

    it('should NOT deal damage when enemy drones present in lane', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANE_EMPTY',
          lane: 'TARGET'
        },
        damage: 2,
        targets: 'CORRESPONDING_SECTION'
      };

      const context = {
        actingPlayerId: 'player1',
        target: { id: 'left' },
        playerStates: {
          player1: {
            dronesOnBoard: {
              lane1: [{id: 'd1'}, {id: 'd2'}],
              lane2: [],
              lane3: []
            }
          },
          player2: {
            dronesOnBoard: {
              lane1: [{id: 'd3'}],               // Enemy drones PRESENT - condition not met
              lane2: [],
              lane3: []
            },
            shipSections: {
              LEFT_SECTION: { hull: 10, allocatedShields: 2 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Overrun' }
      };

      const result = processor.process(effect, context);

      // No damage
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.hull).toBe(10);
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.allocatedShields).toBe(2);
      expect(result.animationEvents).toHaveLength(0);
    });
  });

  describe('Encirclement (ALL_SECTIONS target)', () => {
    it('should deal 3 damage to all sections when player controls all lanes', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane2', 'lane3'],
          operator: 'ALL'
        },
        damage: 3,
        targets: 'ALL_SECTIONS',
        damageType: 'NORMAL'
      };

      const context = {
        actingPlayerId: 'player1',
        playerStates: {
          player1: {
            dronesOnBoard: {
              lane1: [{id: 'd1'}, {id: 'd2'}],
              lane2: [{id: 'd3'}],
              lane3: [{id: 'd4'}, {id: 'd5'}]
            }
          },
          player2: {
            dronesOnBoard: {
              lane1: [{id: 'd6'}],        // player1 controls all lanes
              lane2: [],
              lane3: []
            },
            shipSections: {
              LEFT_SECTION: { hull: 10, allocatedShields: 2 },
              MIDDLE_SECTION: { hull: 10, allocatedShields: 2 },
              RIGHT_SECTION: { hull: 10, allocatedShields: 2 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Encirclement' }
      };

      const result = processor.process(effect, context);

      // All sections take 3 damage (2 to shields, 1 to hull)
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.allocatedShields).toBe(0);
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.hull).toBe(9);
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.allocatedShields).toBe(0);
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.hull).toBe(9);
      expect(result.newPlayerStates.player2.shipSections.RIGHT_SECTION.allocatedShields).toBe(0);
      expect(result.newPlayerStates.player2.shipSections.RIGHT_SECTION.hull).toBe(9);

      // 9 animation events total (3 per section)
      expect(result.animationEvents).toHaveLength(9);
    });

    it('should NOT deal damage when player does not control all lanes', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane2', 'lane3'],
          operator: 'ALL'
        },
        damage: 3,
        targets: 'ALL_SECTIONS'
      };

      const context = {
        actingPlayerId: 'player1',
        playerStates: {
          player1: {
            dronesOnBoard: {
              lane1: [{id: 'd1'}],
              lane2: [{id: 'd2'}],
              lane3: []                    // Doesn't control lane3
            }
          },
          player2: {
            dronesOnBoard: {
              lane1: [],
              lane2: [],
              lane3: [{id: 'd3'}, {id: 'd4'}]  // player2 controls lane3
            },
            shipSections: {
              LEFT_SECTION: { hull: 10, allocatedShields: 2 },
              MIDDLE_SECTION: { hull: 10, allocatedShields: 2 },
              RIGHT_SECTION: { hull: 10, allocatedShields: 2 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Encirclement' }
      };

      const result = processor.process(effect, context);

      // No damage
      expect(result.newPlayerStates.player2.shipSections.LEFT_SECTION.hull).toBe(10);
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.hull).toBe(10);
      expect(result.newPlayerStates.player2.shipSections.RIGHT_SECTION.hull).toBe(10);
      expect(result.animationEvents).toHaveLength(0);
    });
  });

  describe('Animation Event Properties', () => {
    it('should generate animation events with correct properties', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: { type: 'CONTROL_LANES', lanes: ['lane1'], operator: 'ALL' },
        damage: 2,
        targets: 'FLANK_SECTIONS'
      };

      const context = {
        actingPlayerId: 'player1',
        playerStates: {
          player1: { dronesOnBoard: { lane1: [{id: 'd1'}], lane2: [], lane3: [{id: 'd2'}] } },
          player2: {
            dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
            shipSections: {
              LEFT_SECTION: { hull: 10, allocatedShields: 2 },
              RIGHT_SECTION: { hull: 10, allocatedShields: 2 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Test Card' }
      };

      const result = processor.process(effect, context);

      // Check animation event structure
      expect(result.animationEvents[0]).toHaveProperty('type', 'SECTION_DAMAGED');
      expect(result.animationEvents[0]).toHaveProperty('targetPlayer', 'player2');
      expect(result.animationEvents[0]).toHaveProperty('targetId');
      expect(result.animationEvents[0]).toHaveProperty('delay');

      // Delays should be staggered
      expect(result.animationEvents[0].delay).toBe(0);
      expect(result.animationEvents[1].delay).toBe(200);
    });
  });

  describe('Damage Type Handling', () => {
    it('should apply PIERCING damage (bypassing shields)', () => {
      const effect = {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: { type: 'CONTROL_LANES', lanes: ['lane1'], operator: 'ALL' },
        damage: 3,
        targets: 'MIDDLE_SECTION',
        damageType: 'PIERCING'
      };

      const context = {
        actingPlayerId: 'player1',
        playerStates: {
          player1: { dronesOnBoard: { lane1: [{id: 'd1'}], lane2: [], lane3: [] } },
          player2: {
            dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
            shipSections: {
              MIDDLE_SECTION: { hull: 10, allocatedShields: 5 }
            }
          }
        },
        placedSections: {
          player1: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION'],
          player2: ['LEFT_SECTION', 'MIDDLE_SECTION', 'RIGHT_SECTION']
        },
        card: { name: 'Test Card' }
      };

      const result = processor.process(effect, context);

      // PIERCING bypasses shields, damages hull directly
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.allocatedShields).toBe(5);  // Unchanged
      expect(result.newPlayerStates.player2.shipSections.MIDDLE_SECTION.hull).toBe(7);              // 10 - 3
    });
  });
});
