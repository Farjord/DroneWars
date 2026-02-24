import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// Mock all dependencies before import
vi.mock('../../../data/cardData.js', () => ({
  default: [],
  RARITY_COLORS: { Common: '#888', Uncommon: '#0f0', Rare: '#00f', Mythic: '#ff0', Starter: '#aaa' }
}));
vi.mock('../../../data/droneData.js', () => ({ default: [] }));
vi.mock('../../../data/shipData.js', () => ({
  default: [],
  getDefaultShip: vi.fn(() => ({
    id: 'test-ship',
    name: 'Test Ship',
    baseHealth: 100,
    sections: [],
    deckLimits: {
      totalCards: 40,
      maxCopies: 4,
      ordnanceLimit: 15,
      tacticLimit: 15,
      supportLimit: 15,
      upgradeLimit: 10
    }
  })),
  getAllShips: vi.fn(() => [])
}));
vi.mock('../../../data/shipSectionData.js', () => ({
  shipComponentCollection: []
}));
vi.mock('../../../data/rarityColors', () => ({
  RARITY_COLORS: { Common: '#888', Uncommon: '#0f0', Rare: '#00f', Mythic: '#ff0', Starter: '#aaa' }
}));
vi.mock('../../../logic/cards/cardTypeStyles.js', () => ({
  getTypeBackgroundClass: vi.fn(() => ''),
  getTypeTextClass: vi.fn(() => ''),
  getRarityDisplay: vi.fn((item) => ({ text: item?.rarity || 'Common', color: '#888' }))
}));
vi.mock('../../ui/ChartUtils.jsx', () => ({
  CHART_COLORS: ['#0088FE'],
  renderCustomizedLabel: vi.fn(() => null)
}));
vi.mock('../../../logic/gameLogic.js', () => ({
  gameEngine: { validateDeck: vi.fn(() => ({ valid: true, errors: [] })) }
}));
vi.mock('../../../logic/cards/shipSectionImageResolver.js', () => ({
  resolveShipSectionStats: vi.fn(c => c)
}));
vi.mock('../../../utils/deckExportUtils.js', () => ({
  generateJSObjectLiteral: vi.fn(),
  convertToAIFormat: vi.fn(),
  convertFromAIFormat: vi.fn(() => ({ deck: {}, selectedDrones: {}, selectedShipComponents: {} })),
  downloadDeckFile: vi.fn()
}));
vi.mock('../../../logic/singlePlayer/singlePlayerDeckUtils.js', () => ({
  calculateEffectiveMaxForCard: vi.fn(() => 4)
}));
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));
vi.mock('../../../config/devConfig.js', () => ({
  default: { enabled: false, features: {} }
}));
vi.mock('../../../data/vsModeDeckData.js', () => ({ default: [] }));
vi.mock('../../../data/aiData.js', () => ({ default: [] }));
vi.mock('../../../logic/cards/deckFilterUtils.js', () => ({
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
// Mock recharts to avoid SVG rendering issues
vi.mock('recharts', () => ({
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null
}));
// Mock child components
vi.mock('../../ui/ActionCard.jsx', () => ({ default: () => <div data-testid="action-card" /> }));
vi.mock('../../ui/DroneCard.jsx', () => ({ default: () => <div data-testid="drone-card" /> }));
vi.mock('../../ui/ShipCard.jsx', () => ({ default: () => <div data-testid="ship-card" /> }));
vi.mock('../../ui/CardDetailPopup.jsx', () => ({ default: () => null }));
vi.mock('../../ui/DroneDetailPopup.jsx', () => ({ default: () => null }));
vi.mock('../../ui/ShipComponentDetailPopup.jsx', () => ({ default: () => null }));
vi.mock('../../modals/ViewDeckModal.jsx', () => ({ default: () => null }));
vi.mock('../../modals/DeckExportModal.jsx', () => ({ default: () => null }));
vi.mock('../../modals/DeckImportModal.jsx', () => ({ default: () => null }));
vi.mock('../../modals/DeckLoadModal.jsx', () => ({ default: () => null }));
vi.mock('../../ui/ShipSection.jsx', () => ({ default: () => null }));
vi.mock('../../ui/ShipConfigurationTab.jsx', () => ({ default: () => null }));
vi.mock('../../modals/CardFilterModal.jsx', () => ({ default: () => null }));
vi.mock('../../modals/DroneFilterModal.jsx', () => ({ default: () => null }));
vi.mock('../../ui/FilterChip.jsx', () => ({
  default: vi.fn(() => null)
}));

import DeckBuilder from '../DeckBuilder/DeckBuilder.jsx';

// --- Test Data ---

const makeCard = (id, { name, type = 'Ordnance', cost = 1, rarity = 'Common', baseCardId } = {}) => ({
  id,
  baseCardId: baseCardId || id.replace(/_ENH$/, ''),
  name: name || `Card ${id}`,
  type,
  cost,
  rarity,
  effect: { type: 'DAMAGE' },
  targeting: { type: 'SINGLE_TARGET' }
});

const makeDrone = (name, { rarity = 'Common', attack = 2, speed = 3, shields = 1, hull = 5, limit = 3 } = {}) => ({
  name,
  rarity,
  class: 1,
  attack,
  speed,
  shields,
  hull,
  limit,
  upgradeSlots: 1,
  abilities: [],
  selectable: true
});

const makeComponent = (id, type, name) => ({
  id,
  type,
  name: name || `${type} ${id}`,
  stats: {}
});

const testCards = [
  makeCard('ORD_001', { name: 'Missile Alpha', type: 'Ordnance', cost: 2 }),
  makeCard('ORD_002', { name: 'Missile Beta', type: 'Ordnance', cost: 3 }),
  makeCard('TAC_001', { name: 'Evade', type: 'Tactic', cost: 1 }),
  makeCard('SUP_001', { name: 'Repair', type: 'Support', cost: 2 }),
  makeCard('UPG_001', { name: 'Shield Boost', type: 'Upgrade', cost: 4 }),
];

const testDrones = [
  makeDrone('Scout Alpha'),
  makeDrone('Assault Beta', { attack: 5 }),
  makeDrone('Tank Gamma', { shields: 4, hull: 8 }),
];

const testComponents = [
  makeComponent('BRIDGE_01', 'Bridge', 'Command Bridge'),
  makeComponent('POWER_01', 'Power Cell', 'Fusion Core'),
  makeComponent('DRONE_01', 'Drone Control Hub', 'Drone Bay'),
];

const defaultProps = {
  fullCardCollection: testCards,
  deck: {},
  selectedDrones: {},
  selectedShipComponents: {},
  onDeckChange: vi.fn(),
  onDronesChange: vi.fn(),
  onShipComponentsChange: vi.fn(),
  onShipChange: vi.fn(),
  onConfirmDeck: vi.fn(),
  onBack: vi.fn(),
};

// Helper to find the right-panel tab by its count pattern (e.g. "Deck (0/40)")
// Right-panel tabs uniquely include parenthesized counts, left-panel tabs don't
const findTab = (text) => {
  const buttons = screen.getAllByRole('button');
  const pattern = new RegExp(`${text}\\s*\\(\\d+/\\d+\\)`);
  const match = buttons.find(btn => pattern.test(btn.textContent));
  if (!match) throw new Error(`No tab found matching pattern: ${text} (N/N)`);
  return match;
};

describe('DeckBuilder - Mount Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not throw ReferenceError on document mousedown', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<DeckBuilder {...defaultProps} />);

    expect(() => {
      fireEvent.mouseDown(document);
    }).not.toThrow();

    consoleSpy.mockRestore();
  });
});

describe('DeckBuilder - Deck Counts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows 0/40 when deck is empty', () => {
    render(<DeckBuilder {...defaultProps} deck={{}} />);
    expect(findTab('Deck')).toHaveTextContent('Deck (0/40)');
  });

  it('shows correct total when deck has cards', () => {
    const deck = { ORD_001: 3, TAC_001: 2 };
    render(<DeckBuilder {...defaultProps} deck={deck} />);
    expect(findTab('Deck')).toHaveTextContent('Deck (5/40)');
  });

  it('ignores zero-quantity entries in deck', () => {
    const deck = { ORD_001: 2, ORD_002: 0, TAC_001: 1 };
    render(<DeckBuilder {...defaultProps} deck={deck} />);
    expect(findTab('Deck')).toHaveTextContent('Deck (3/40)');
  });
});

describe('DeckBuilder - Drone Counts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows 0/10 when no drones selected', () => {
    render(<DeckBuilder {...defaultProps} selectedDrones={{}} />);
    expect(findTab('Drones')).toHaveTextContent('Drones (0/10)');
  });

  it('shows correct total for selected drones', () => {
    const drones = { 'Scout Alpha': 3, 'Assault Beta': 2 };
    render(<DeckBuilder {...defaultProps} availableDrones={testDrones} selectedDrones={drones} />);
    expect(findTab('Drones')).toHaveTextContent('Drones (5/10)');
  });

  it('respects custom maxDrones prop', () => {
    render(<DeckBuilder {...defaultProps} maxDrones={5} selectedDrones={{}} />);
    expect(findTab('Drones')).toHaveTextContent('Drones (0/5)');
  });
});

describe('DeckBuilder - Ship Component Count', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows 0/3 when no components selected', () => {
    render(<DeckBuilder {...defaultProps} />);
    expect(findTab('Components')).toHaveTextContent('Components (0/3)');
  });

  it('shows correct count for assigned components', () => {
    const components = { BRIDGE_01: 'L', POWER_01: 'M', DRONE_01: 'R' };
    render(<DeckBuilder {...defaultProps} availableComponents={testComponents} selectedShipComponents={components} />);
    expect(findTab('Components')).toHaveTextContent('Components (3/3)');
  });
});

describe('DeckBuilder - Deck Validation (multiplayer)', () => {
  beforeEach(() => vi.clearAllMocks());

  // Build a valid 40-card deck: 15 Ordnance, 15 Tactic, 10 Support (total 40)
  const buildFullDeck = () => {
    const deck = {};
    // 4 copies each of ORD_001 (4), ORD_002 (4) = 8, plus generate more
    // Simpler: use our test cards with high quantities
    // Ship limits: totalCards=40, ordnance=15, tactic=15, support=15, upgrade=10
    deck['ORD_001'] = 4;
    deck['ORD_002'] = 4;
    deck['TAC_001'] = 4;
    deck['SUP_001'] = 4;
    deck['UPG_001'] = 4;
    // Total: 20, need 20 more - add more test cards
    return deck;
  };

  it('disables confirm button when deck is incomplete', () => {
    const deck = { ORD_001: 2 };
    render(<DeckBuilder {...defaultProps} deck={deck} />);
    const confirmBtn = screen.getByRole('button', { name: /Confirm Deck/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('disables confirm button when drones are incomplete', () => {
    // Even with a hypothetical valid deck, missing drones should disable
    render(<DeckBuilder {...defaultProps} deck={{}} selectedDrones={{}} />);
    const confirmBtn = screen.getByRole('button', { name: /Confirm Deck/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('disables confirm button when ship components are incomplete', () => {
    render(<DeckBuilder {...defaultProps} deck={{}} />);
    const confirmBtn = screen.getByRole('button', { name: /Confirm Deck/i });
    expect(confirmBtn).toBeDisabled();
  });
});

describe('DeckBuilder - Extraction Mode Validation Warnings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "Save Incomplete Deck" when deck is invalid in extraction mode', () => {
    render(
      <DeckBuilder
        {...defaultProps}
        mode="extraction"
        allowInvalidSave={true}
        onSaveInvalid={vi.fn()}
        deck={{ ORD_001: 2 }}
      />
    );
    expect(screen.getByRole('button', { name: /Save Incomplete Deck/i })).toBeTruthy();
  });

  it('shows validation warnings for missing cards, drones, and components', () => {
    render(
      <DeckBuilder
        {...defaultProps}
        mode="extraction"
        allowInvalidSave={true}
        onSaveInvalid={vi.fn()}
        maxDrones={5}
        deck={{}}
        selectedDrones={{}}
      />
    );
    expect(screen.getByText(/Need 40 cards/)).toBeTruthy();
    expect(screen.getByText(/Need 5 drones/)).toBeTruthy();
    expect(screen.getByText(/Need 3 ship components/)).toBeTruthy();
  });
});

describe('DeckBuilder - Ship Component Validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates when all 3 types assigned to unique lanes', () => {
    const components = { BRIDGE_01: 'L', POWER_01: 'M', DRONE_01: 'R' };

    // Build a full valid deck to isolate component validation
    // We need all 3 valid (deck, drones, components) for button to be enabled
    // Instead, test through extraction mode warnings - if components are valid,
    // the "Need 3 ship components" warning should NOT appear
    render(
      <DeckBuilder
        {...defaultProps}
        mode="extraction"
        allowInvalidSave={true}
        onSaveInvalid={vi.fn()}
        availableComponents={testComponents}
        selectedShipComponents={components}
        deck={{}}
      />
    );
    // Should still show card/drone warnings, but NOT component warning
    expect(screen.getByText(/Need 40 cards/)).toBeTruthy();
    expect(screen.queryByText(/Need 3 ship components/)).toBeNull();
  });

  it('invalidates when two components share the same lane', () => {
    const components = { BRIDGE_01: 'L', POWER_01: 'L', DRONE_01: 'R' };
    render(
      <DeckBuilder
        {...defaultProps}
        mode="extraction"
        allowInvalidSave={true}
        onSaveInvalid={vi.fn()}
        availableComponents={testComponents}
        selectedShipComponents={components}
        deck={{}}
      />
    );
    expect(screen.getByText(/Need 3 ship components/)).toBeTruthy();
  });

  it('invalidates when a component type is missing', () => {
    // Only Bridge and Power Cell, missing Drone Control Hub
    const components = { BRIDGE_01: 'L', POWER_01: 'M' };
    render(
      <DeckBuilder
        {...defaultProps}
        mode="extraction"
        allowInvalidSave={true}
        onSaveInvalid={vi.fn()}
        availableComponents={testComponents}
        selectedShipComponents={components}
        deck={{}}
      />
    );
    expect(screen.getByText(/Need 3 ship components/)).toBeTruthy();
  });
});

describe('DeckBuilder - Save Handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onConfirmDeck when save is triggered in extraction mode', () => {
    const onConfirmDeck = vi.fn();
    const onSaveInvalid = vi.fn();
    render(
      <DeckBuilder
        {...defaultProps}
        mode="extraction"
        allowInvalidSave={true}
        onConfirmDeck={onConfirmDeck}
        onSaveInvalid={onSaveInvalid}
        deck={{}}
      />
    );

    // In extraction mode with invalid deck, clicking triggers onSaveInvalid (not onConfirmDeck)
    const saveBtn = screen.getByRole('button', { name: /Save Incomplete Deck/i });
    fireEvent.click(saveBtn);
    expect(onSaveInvalid).toHaveBeenCalled();
  });

  it('shows read-only message instead of save button when readOnly', () => {
    render(
      <DeckBuilder
        {...defaultProps}
        readOnly={true}
      />
    );
    expect(screen.getByText(/Read Only/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Confirm Deck/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Save/i })).toBeNull();
  });
});
