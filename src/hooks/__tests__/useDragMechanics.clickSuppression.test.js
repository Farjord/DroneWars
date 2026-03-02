import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock transitive imports to isolate the pure predicate under test
vi.mock('../../logic/targeting/uiTargetingHelpers.js', () => ({
  calculateAllValidTargets: vi.fn(),
  calculateAffectedDroneIds: vi.fn(),
}));
vi.mock('../../components/ui/TargetingArrow.jsx', () => ({
  calculatePolygonPoints: vi.fn(),
}));
vi.mock('../../utils/gameUtils.js', () => ({
  getElementCenter: vi.fn(),
}));
vi.mock('../../logic/gameLogic.js', () => ({}));

import { shouldSuppressClick } from '../useDragMechanics.js';

describe('shouldSuppressClick', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('returns true for a game-area element (should suppress)', () => {
    container.innerHTML = '<div class="game-area"><button id="target">Click</button></div>';
    const target = container.querySelector('#target');
    expect(shouldSuppressClick(target)).toBe(true);
  });

  test('returns false for an element inside .dw-modal-overlay (should NOT suppress)', () => {
    container.innerHTML = '<div class="game-area"><div class="dw-modal-overlay"><button id="modal-btn">OK</button></div></div>';
    const target = container.querySelector('#modal-btn');
    expect(shouldSuppressClick(target)).toBe(false);
  });

  test('returns false when target IS the .dw-modal-overlay itself', () => {
    container.innerHTML = '<div class="game-area"><div class="dw-modal-overlay" id="overlay"></div></div>';
    const target = container.querySelector('#overlay');
    expect(shouldSuppressClick(target)).toBe(false);
  });
});
