import { describe, it, expect } from 'vitest';
import fullCardCollection from '../cardData.js';
import fullTechCollection from '../techData.js';

describe('Tech card placement configuration', () => {
  const techCards = fullCardCollection.filter(c =>
    c.effects?.some(e => e.type === 'CREATE_TECH')
  );

  it('all CREATE_TECH cards should NOT have targetOwner: OPPONENT', () => {
    for (const card of techCards) {
      for (const effect of card.effects) {
        if (effect.type === 'CREATE_TECH') {
          expect(effect.targetOwner, `${card.id} should not have targetOwner: OPPONENT`).not.toBe('OPPONENT');
        }
      }
    }
  });

  it('all CREATE_TECH cards should use affinity: FRIENDLY', () => {
    for (const card of techCards) {
      for (const effect of card.effects) {
        if (effect.type === 'CREATE_TECH' && effect.targeting) {
          expect(effect.targeting.affinity, `${card.id} should use affinity: FRIENDLY`).toBe('FRIENDLY');
        }
      }
    }
  });

  it('mine tech should use triggerOwner: LANE_ENEMY (not LANE_OWNER)', () => {
    const mineNames = ['Proximity Mine', 'Inhibitor Mine', 'Jitter Mine'];
    for (const mineName of mineNames) {
      const tech = fullTechCollection.find(t => t.name === mineName);
      expect(tech, `${mineName} should exist in tech collection`).toBeDefined();
      for (const ability of tech.abilities) {
        if (ability.trigger && ability.triggerOwner) {
          expect(ability.triggerOwner, `${mineName} ability "${ability.name}" should use LANE_ENEMY`).toBe('LANE_ENEMY');
        }
      }
    }
  });

  it('support tech should retain triggerOwner: LANE_OWNER', () => {
    const supportNames = ['Rally Beacon', 'Jammer', 'Repair Relay'];
    for (const name of supportNames) {
      const tech = fullTechCollection.find(t => t.name === name);
      expect(tech, `${name} should exist in tech collection`).toBeDefined();
      for (const ability of tech.abilities) {
        if (ability.trigger && ability.triggerOwner) {
          expect(ability.triggerOwner, `${name} ability "${ability.name}" should use LANE_OWNER`).toBe('LANE_OWNER');
        }
      }
    }
  });
});
