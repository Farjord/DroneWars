import { describe, it, expect } from 'vitest';
import fullCardCollection from '../../../data/cardData';

// --- Structural Tests: Every card produces valid effects[] ---

describe('effectsAdapter — structural validation', () => {
  it('every card has a non-empty effects array', () => {
    const failures = fullCardCollection
      .filter(c => !Array.isArray(c.effects) || c.effects.length === 0)
      .map(c => c.id);
    expect(failures).toEqual([]);
  });

  it('every effect has a type string', () => {
    const failures = [];
    for (const card of fullCardCollection) {
      for (let i = 0; i < card.effects.length; i++) {
        if (typeof card.effects[i].type !== 'string') {
          failures.push(`${card.id} effects[${i}] missing type`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('every effect has a targeting object with a type', () => {
    const failures = [];
    for (const card of fullCardCollection) {
      for (let i = 0; i < card.effects.length; i++) {
        const eff = card.effects[i];
        if (!eff.targeting || typeof eff.targeting.type !== 'string') {
          failures.push(`${card.id} effects[${i}] missing targeting.type`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('back-references are backward-only (ref < current index)', () => {
    const failures = [];
    for (const card of fullCardCollection) {
      for (let i = 0; i < card.effects.length; i++) {
        const refs = collectRefs(card.effects[i]);
        for (const ref of refs) {
          if (ref >= i) failures.push(`${card.id} effects[${i}] has forward ref=${ref}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('movement effects have a destination object', () => {
    const failures = [];
    for (const card of fullCardCollection) {
      for (let i = 0; i < card.effects.length; i++) {
        const eff = card.effects[i];
        if ((eff.type === 'SINGLE_MOVE' || eff.type === 'MULTI_MOVE') && !eff.destination) {
          failures.push(`${card.id} effects[${i}] SINGLE_MOVE/MULTI_MOVE missing destination`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

// --- Specific Card Pattern Tests ---

describe('effectsAdapter — simple cards', () => {
  it('Ion Pulse produces single DAMAGE effect with DRONE targeting', () => {
    const card = findCard('CARD_ION01');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('DAMAGE');
    expect(card.effects[0].value).toBe(3);
    expect(card.effects[0].targeting.type).toBe('DRONE');
    expect(card.effects[0].targeting.affinity).toBe('ENEMY');
  });

  it('System Reboot (draw card) produces single effect with NONE targeting', () => {
    const card = findCard('Superior_Intel');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('DRAW');
    expect(card.effects[0].targeting.type).toBe('NONE');
  });

  it('Deploy Jammers (no targeting field) produces NONE targeting', () => {
    const card = findCard('CARD030');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('CREATE_TOKENS');
    expect(card.effects[0].targeting.type).toBe('NONE');
  });

  it('Sidewinder Missiles (LANE targeting with filter) preserves affectedFilter', () => {
    const card = findCard('CARD013');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('DAMAGE');
    expect(card.effects[0].targeting.type).toBe('LANE');
    expect(card.effects[0].targeting.affectedFilter).toBeDefined();
  });

  it('cards with conditionalEffects attach them as conditionals', () => {
    const card = findCard('CARD051');
    expect(card.effects[0].conditionals).toBeDefined();
    expect(card.effects[0].conditionals).toHaveLength(1);
    expect(card.effects[0].conditionals[0].timing).toBe('PRE');
  });
});

describe('effectsAdapter — movement cards', () => {
  it('Maneuver produces single compound SINGLE_MOVE effect', () => {
    const card = findCard('CARD023');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('SINGLE_MOVE');
    expect(card.effects[0].targeting.type).toBe('DRONE');
    expect(card.effects[0].targeting.affinity).toBe('FRIENDLY');
    expect(card.effects[0].destination).toEqual({ type: 'LANE', location: 'ADJACENT_TO_PRIMARY' });
    expect(card.effects[0].properties).toContain('DO_NOT_EXHAUST');
  });

  it('Swift Maneuver preserves conditionalEffects on the movement effect', () => {
    const card = findCard('CARD060');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('SINGLE_MOVE');
    expect(card.effects[0].conditionals).toBeDefined();
    expect(card.effects[0].conditionals[0].grantedEffect.type).toBe('GO_AGAIN');
  });

  it('Tactical Repositioning (enemy move) produces compound SINGLE_MOVE', () => {
    const card = findCard('CARD_TACTICS_1');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('SINGLE_MOVE');
    expect(card.effects[0].targeting.affinity).toBe('ENEMY');
    expect(card.effects[0].destination.location).toBe('ADJACENT_TO_PRIMARY');
  });
});

describe('effectsAdapter — multi-step cards', () => {
  it('Feint produces 2-effect chain with back-references', () => {
    const card = findCard('EXHAUST_TO_DISABLE');
    expect(card.effects).toHaveLength(2);

    expect(card.effects[0].type).toBe('EXHAUST_DRONE');
    expect(card.effects[0].targeting.affinity).toBe('FRIENDLY');

    expect(card.effects[1].type).toBe('EXHAUST_DRONE');
    expect(card.effects[1].targeting.affinity).toBe('ENEMY');
    expect(card.effects[1].targeting.location).toEqual({ ref: 0, field: 'sourceLane' });
    expect(card.effects[1].targeting.restrictions[0].reference).toEqual({ ref: 0, field: 'target' });
  });

  it('Forced Repositioning produces 2-effect SINGLE_MOVE chain', () => {
    const card = findCard('FORCED_REPOSITION');
    expect(card.effects).toHaveLength(2);

    // Effect 0: move friendly drone
    expect(card.effects[0].type).toBe('SINGLE_MOVE');
    expect(card.effects[0].targeting.affinity).toBe('FRIENDLY');
    expect(card.effects[0].destination).toEqual({ type: 'LANE', location: 'ADJACENT_TO_PRIMARY' });
    expect(card.effects[0].properties).toContain('DO_NOT_EXHAUST');

    // Effect 1: move enemy drone (main effect with back-refs)
    expect(card.effects[1].type).toBe('SINGLE_MOVE');
    expect(card.effects[1].targeting.affinity).toBe('ENEMY');
    expect(card.effects[1].targeting.location).toEqual({ ref: 0, field: 'sourceLane' });
    expect(card.effects[1].targeting.restrictions[0].reference).toEqual({ ref: 0, field: 'target' });
    expect(card.effects[1].properties).toContain('DO_NOT_EXHAUST');
  });

  it('Sacrifice for Power produces DISCARD_CARD + MODIFY_STAT chain', () => {
    const card = findCard('SACRIFICE_FOR_POWER');
    expect(card.effects).toHaveLength(2);

    // Effect 0: discard a card
    expect(card.effects[0].type).toBe('DISCARD_CARD');
    expect(card.effects[0].targeting.type).toBe('CARD_IN_HAND');
    expect(card.effects[0].prompt).toBeDefined();

    // Effect 1: buff a drone (main effect with value back-ref)
    expect(card.effects[1].type).toBe('MODIFY_STAT');
    expect(card.effects[1].targeting.type).toBe('DRONE');
    expect(card.effects[1].mod.value).toEqual({ ref: 0, field: 'cardCost' });
  });
});

describe('effectsAdapter — composite and special effects', () => {
  it('Mainframe Breach (COMPOSITE_EFFECT) flattens into separate effects', () => {
    const card = findCard('Mainframe_Breach');
    expect(card.effects).toHaveLength(2);
    expect(card.effects[0].type).toBe('DISCARD');
    expect(card.effects[1].type).toBe('DRAIN_ENERGY');
  });

  it('MULTI_MOVE (Reposition) produces single effect with maxTargets', () => {
    const card = findCard('CARD019');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('MULTI_MOVE');
    expect(card.effects[0].targeting.maxTargets).toBe(3);
    expect(card.effects[0].destination).toBeDefined();
    expect(card.effects[0].properties).toContain('DO_NOT_EXHAUST');
  });

  it('REPEATING_EFFECT cards produce single effect entry', () => {
    const card = findCard('LANE_CONTROL_DRAW');
    expect(card.effects).toHaveLength(1);
    expect(card.effects[0].type).toBe('REPEATING_EFFECT');
    expect(card.effects[0].targeting.type).toBe('NONE');
  });
});

// --- Helpers ---

function findCard(id) {
  const card = fullCardCollection.find(c => c.id === id);
  if (!card) throw new Error(`Card ${id} not found`);
  return card;
}

function collectRefs(effect) {
  const refs = [];
  JSON.stringify(effect, (key, value) => {
    if (key === 'ref' && typeof value === 'number') refs.push(value);
    return value;
  });
  return refs;
}
