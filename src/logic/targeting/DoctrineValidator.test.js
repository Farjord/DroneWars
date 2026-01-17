// ========================================
// DOCTRINE VALIDATOR TESTS
// ========================================
// Tests for Doctrine card playability validation
// Following TDD - these tests are written BEFORE implementation

import { isDoctrineCardPlayable } from './DoctrineValidator.js';

describe('isDoctrineCardPlayable', () => {
  describe('Non-Doctrine cards', () => {
    it('should return true for Ordnance cards', () => {
      const card = { type: 'Ordnance', name: 'Laser Blast' };
      const playerStates = {};

      expect(isDoctrineCardPlayable(card, 'player1', playerStates)).toBe(true);
    });

    it('should return true for Support cards', () => {
      const card = { type: 'Support', name: 'System Reboot' };
      const playerStates = {};

      expect(isDoctrineCardPlayable(card, 'player1', playerStates)).toBe(true);
    });

    it('should return true for any non-Doctrine card type', () => {
      const card = { type: 'Tactic', name: 'EMP Burst' };
      const playerStates = {};

      expect(isDoctrineCardPlayable(card, 'player1', playerStates)).toBe(true);
    });
  });

  describe('Crossfire Pattern (CONTROL_LANES: lane1 + lane3)', () => {
    const crossfireCard = {
      type: 'Doctrine',
      name: 'Crossfire Pattern',
      effect: {
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane3'],
          operator: 'ALL'
        }
      }
    };

    it('should return true when player controls both flank lanes', () => {
      const playerStates = {
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
          }
        }
      };

      expect(isDoctrineCardPlayable(crossfireCard, 'player1', playerStates)).toBe(true);
    });

    it('should return false when player controls only one flank', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [{id: 'd1'}, {id: 'd2'}],  // Controls lane1
            lane2: [],
            lane3: []                          // Doesn't control lane3
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [{id: 'd5'}],
            lane2: [],
            lane3: [{id: 'd6'}, {id: 'd7'}]   // player2 controls lane3
          }
        }
      };

      expect(isDoctrineCardPlayable(crossfireCard, 'player1', playerStates)).toBe(false);
    });

    it('should return false when player controls neither flank', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [],                         // Doesn't control lane1
            lane2: [{id: 'd1'}],
            lane3: []                          // Doesn't control lane3
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [{id: 'd2'}],
            lane2: [],
            lane3: [{id: 'd3'}]
          }
        }
      };

      expect(isDoctrineCardPlayable(crossfireCard, 'player1', playerStates)).toBe(false);
    });

    it('should return false when lanes are tied (no control)', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [{id: 'd1'}],  // Tie (1 vs 1)
            lane2: [],
            lane3: [{id: 'd2'}]   // Tie (1 vs 1)
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [{id: 'd3'}],
            lane2: [],
            lane3: [{id: 'd4'}]
          }
        }
      };

      expect(isDoctrineCardPlayable(crossfireCard, 'player1', playerStates)).toBe(false);
    });
  });

  describe('Breach the Line (CONTROL_LANES: lane2)', () => {
    const breachCard = {
      type: 'Doctrine',
      name: 'Breach the Line',
      effect: {
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane2'],
          operator: 'ALL'
        }
      }
    };

    it('should return true when player controls middle lane', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [],
            lane2: [{id: 'd1'}, {id: 'd2'}],  // Controls middle
            lane3: []
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [],
            lane2: [{id: 'd3'}],
            lane3: []
          }
        }
      };

      expect(isDoctrineCardPlayable(breachCard, 'player1', playerStates)).toBe(true);
    });

    it('should return false when player does not control middle lane', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [],
            lane2: [{id: 'd1'}],               // Tied or losing
            lane3: []
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [],
            lane2: [{id: 'd2'}, {id: 'd3'}],   // player2 controls
            lane3: []
          }
        }
      };

      expect(isDoctrineCardPlayable(breachCard, 'player1', playerStates)).toBe(false);
    });
  });

  describe('Overrun (CONTROL_LANE_EMPTY)', () => {
    const overrunCard = {
      type: 'Doctrine',
      name: 'Overrun',
      effect: {
        condition: {
          type: 'CONTROL_LANE_EMPTY'
        }
      }
    };

    it('should return true when player controls ANY lane with no enemy drones', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [{id: 'd1'}, {id: 'd2'}],  // Controls lane1
            lane2: [],
            lane3: []
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [],                         // No enemy drones in lane1
            lane2: [],
            lane3: []
          }
        }
      };

      expect(isDoctrineCardPlayable(overrunCard, 'player1', playerStates)).toBe(true);
    });

    it('should return false when no lane is both controlled AND empty', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [{id: 'd1'}, {id: 'd2'}],  // Controls lane1
            lane2: [{id: 'd3'}],               // Controls lane2
            lane3: []
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [{id: 'd4'}],               // Enemy in lane1 (not empty)
            lane2: [{id: 'd5'}],               // Enemy in lane2 (not empty)
            lane3: [{id: 'd6'}]                // player2 controls lane3
          }
        }
      };

      expect(isDoctrineCardPlayable(overrunCard, 'player1', playerStates)).toBe(false);
    });

    it('should return true when multiple lanes meet condition (any is sufficient)', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [{id: 'd1'}],
            lane2: [{id: 'd2'}],
            lane3: [{id: 'd3'}]
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [],  // Empty
            lane2: [],  // Empty
            lane3: []   // Empty
          }
        }
      };

      // All three lanes meet the condition
      expect(isDoctrineCardPlayable(overrunCard, 'player1', playerStates)).toBe(true);
    });
  });

  describe('Encirclement (CONTROL_LANES: all lanes)', () => {
    const encirclementCard = {
      type: 'Doctrine',
      name: 'Encirclement',
      effect: {
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane2', 'lane3'],
          operator: 'ALL'
        }
      }
    };

    it('should return true when player controls all three lanes', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [{id: 'd1'}, {id: 'd2'}],
            lane2: [{id: 'd3'}],
            lane3: [{id: 'd4'}, {id: 'd5'}]
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [{id: 'd6'}],   // player1 controls all lanes
            lane2: [],
            lane3: []
          }
        }
      };

      expect(isDoctrineCardPlayable(encirclementCard, 'player1', playerStates)).toBe(true);
    });

    it('should return false when player controls only two lanes', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [{id: 'd1'}],
            lane2: [{id: 'd2'}],
            lane3: []                          // Doesn't control lane3
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [],
            lane2: [],
            lane3: [{id: 'd3'}, {id: 'd4'}]   // player2 controls lane3
          }
        }
      };

      expect(isDoctrineCardPlayable(encirclementCard, 'player1', playerStates)).toBe(false);
    });

    it('should return false when all lanes are empty (no control)', () => {
      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [],
            lane2: [],
            lane3: []
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [],
            lane2: [],
            lane3: []
          }
        }
      };

      expect(isDoctrineCardPlayable(encirclementCard, 'player1', playerStates)).toBe(false);
    });
  });

  describe('Player 2 perspective', () => {
    it('should work correctly for player2 as acting player', () => {
      const crossfireCard = {
        type: 'Doctrine',
        effect: {
          condition: {
            type: 'CONTROL_LANES',
            lanes: ['lane1', 'lane3'],
            operator: 'ALL'
          }
        }
      };

      const playerStates = {
        player1: {
          dronesOnBoard: {
            lane1: [{id: 'd1'}],
            lane2: [],
            lane3: [{id: 'd2'}]
          }
        },
        player2: {
          dronesOnBoard: {
            lane1: [{id: 'd3'}, {id: 'd4'}],  // player2 has more
            lane2: [],
            lane3: [{id: 'd5'}, {id: 'd6'}]   // player2 has more
          }
        }
      };

      expect(isDoctrineCardPlayable(crossfireCard, 'player2', playerStates)).toBe(true);
    });
  });

  describe('Unknown condition types', () => {
    it('should return false for unknown condition types', () => {
      const unknownCard = {
        type: 'Doctrine',
        effect: {
          condition: {
            type: 'UNKNOWN_CONDITION'
          }
        }
      };

      const playerStates = {
        player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        player2: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      };

      expect(isDoctrineCardPlayable(unknownCard, 'player1', playerStates)).toBe(false);
    });
  });
});
