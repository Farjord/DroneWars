import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

// Mock all dependencies before import
vi.mock('../../../data/cardData.js', () => ({
  default: [],
  RARITY_COLORS: { Common: '#888', Uncommon: '#0f0', Rare: '#00f', Epic: '#a0f', Legendary: '#ff0' }
}));
vi.mock('../../../data/droneData.js', () => ({ default: [] }));
vi.mock('../../../data/shipData.js', () => ({
  default: [],
  getDefaultShip: vi.fn(() => ({
    id: 'test-ship',
    name: 'Test Ship',
    baseHealth: 100,
    sections: [],
    deckLimits: { totalCards: 40, maxCopies: 4 }
  })),
  getAllShips: vi.fn(() => [])
}));
vi.mock('../../../data/shipSectionData.js', () => ({
  shipComponentCollection: []
}));
vi.mock('../../../logic/gameLogic.js', () => ({
  gameEngine: { validateDeck: vi.fn(() => ({ valid: true, errors: [] })) }
}));
vi.mock('../../../utils/shipSectionImageResolver.js', () => ({
  resolveShipSectionStats: vi.fn(c => c)
}));
vi.mock('../../../utils/deckExportUtils.js', () => ({
  generateJSObjectLiteral: vi.fn(),
  convertToAIFormat: vi.fn(),
  convertFromAIFormat: vi.fn(() => ({ deck: {}, selectedDrones: {}, selectedShipComponents: {} })),
  downloadDeckFile: vi.fn()
}));
vi.mock('../../../utils/singlePlayerDeckUtils.js', () => ({
  calculateEffectiveMaxForCard: vi.fn(() => 4)
}));
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));
vi.mock('../../../config/devConfig.js', () => ({
  DEV_CONFIG: { FEATURES: {} }
}));
vi.mock('../../../utils/deckFilterUtils.js', () => ({
  filterCards: vi.fn(cards => cards),
  filterDrones: vi.fn(drones => drones),
  sortByRarity: vi.fn(items => items),
  countActiveFilters: vi.fn(() => 0),
  countActiveDroneFilters: vi.fn(() => 0),
  generateFilterChips: vi.fn(() => []),
  generateDroneFilterChips: vi.fn(() => []),
  createDefaultCardFilters: vi.fn(() => ({})),
  createDefaultDroneFilters: vi.fn(() => ({}))
}));
// Mock child components
vi.mock('../../ui/ActionCard.jsx', () => ({ default: () => <div data-testid="action-card" /> }));
vi.mock('../../ui/DroneCard.jsx', () => ({ default: () => <div data-testid="drone-card" /> }));
vi.mock('../../ui/ShipCard.jsx', () => ({ default: () => <div data-testid="ship-card" /> }));
vi.mock('../../modals/ViewDeckModal.jsx', () => ({ default: () => null }));
vi.mock('../../ui/ShipSection.jsx', () => ({ default: () => null }));
vi.mock('../../ui/ShipConfigurationTab.jsx', () => ({ default: () => null }));
vi.mock('../../modals/CardFilterModal.jsx', () => ({ default: () => null }));
vi.mock('../../modals/DroneFilterModal.jsx', () => ({ default: () => null }));
// FilterChip mock - will be configured in tests
vi.mock('../../ui/FilterChip.jsx', () => ({
  default: vi.fn(() => null)
}));

import DeckBuilder from '../DeckBuilder.jsx';

describe('DeckBuilder - Mount Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not throw ReferenceError on document mousedown', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <DeckBuilder
        fullCardCollection={[]}
        deck={{}}
        selectedDrones={{}}
        selectedShipComponents={{}}
        onDeckChange={() => {}}
        onDronesChange={() => {}}
        onShipComponentsChange={() => {}}
        onShipChange={() => {}}
        onConfirmDeck={() => {}}
        onBack={() => {}}
      />
    );

    // This should not throw ReferenceError: abilityFilterRef is not defined
    expect(() => {
      fireEvent.mouseDown(document);
    }).not.toThrow();

    consoleSpy.mockRestore();
  });
});
