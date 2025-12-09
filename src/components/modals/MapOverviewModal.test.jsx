/**
 * MapOverviewModal.test.jsx
 * TDD tests for MapOverviewModal layout improvements
 *
 * Changes being tested:
 * 1. Top-align map preview (flex-start instead of flex-end)
 * 2. Drone blueprints as regular POI row (no purple box)
 * 3. Consolidated REQUIREMENTS section (security token + extraction limit)
 * 4. Reduced spacing (12px gaps instead of 16px)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

// Mock dependencies BEFORE importing the component
vi.mock('../../hooks/useGameState.js', () => ({
  useGameState: vi.fn()
}));

vi.mock('../../data/economyData.js', () => ({
  ECONOMY: { STARTER_DECK_EXTRACTION_LIMIT: 3 }
}));

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../utils/singlePlayerDeckUtils.js', () => ({
  validateDeckForDeployment: vi.fn(() => ({ valid: true, errors: [] }))
}));

vi.mock('../ui/MapPreviewRenderer', () => ({
  default: ({ hexes }) => <div data-testid="map-preview">Map Preview</div>
}));

// Import after mocks
import { useGameState } from '../../hooks/useGameState.js';
import MapOverviewModal from './MapOverviewModal.jsx';

// Helper to create mock game state
const createMockGameState = (overrides = {}) => ({
  singlePlayerShipSlots: [
    {
      id: 0,
      status: 'active',
      name: 'Starter Deck',
      decklist: Array(40).fill({ id: 'card1', quantity: 1 }),
      droneSlots: [
        { slotIndex: 0, assignedDrone: 'Scout Drone' },
        { slotIndex: 1, assignedDrone: 'Fighter Drone' },
        { slotIndex: 2, assignedDrone: 'Heavy Fighter' },
        { slotIndex: 3, assignedDrone: 'Guardian Drone' },
        { slotIndex: 4, assignedDrone: 'Repair Drone' },
      ],
      shipComponents: { left: 'COMP1', middle: 'COMP2', right: 'COMP3' }
    },
    {
      id: 1,
      status: 'active',
      name: 'Custom Ship',
      decklist: Array(40).fill({ id: 'card1', quantity: 1 }),
      droneSlots: [
        { slotIndex: 0, assignedDrone: 'Scout Drone' },
        { slotIndex: 1, assignedDrone: 'Fighter Drone' },
        { slotIndex: 2, assignedDrone: 'Heavy Fighter' },
        { slotIndex: 3, assignedDrone: 'Guardian Drone' },
        { slotIndex: 4, assignedDrone: 'Repair Drone' },
      ],
      shipComponents: { left: 'COMP1', middle: 'COMP2', right: 'COMP3' }
    }
  ],
  singlePlayerShipComponentInstances: [],
  singlePlayerDroneInstances: [],
  singlePlayerProfile: {
    credits: 1000,
    securityTokens: 0,
    ...overrides.profile
  },
  ...overrides
});

// Helper to create mock map
const createMockMap = (overrides = {}) => ({
  name: 'Test Sector',
  tier: 1,
  radius: 5,
  hexes: [{ q: 0, r: 0, zone: 'core' }],
  gates: [{ id: 0, q: 0, r: 5 }],
  pois: [],
  poiTypeBreakdown: { Ordnance: 1, Support: 0, Tactic: 2, Upgrade: 0, Resource: 4 },
  poiCount: 8,
  gateCount: 3,
  baseDetection: 29,
  baseEncounterChance: 3,
  requiresToken: false,
  hasDroneBlueprints: false,
  dronePoiCount: 0,
  ...overrides
});

const defaultProps = {
  selectedSlotId: 0,
  selectedCoordinate: 'K-15',
  activeSectors: [{ coordinate: 'K-15' }],
  onNavigate: vi.fn(),
  onDeploy: vi.fn(),
  onClose: vi.fn()
};

describe('MapOverviewModal - Drone Blueprints Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display drone blueprints as a regular POI row without special styling', () => {
    // Setup: Map with drone blueprints
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapWithBlueprints = createMockMap({
      hasDroneBlueprints: true,
      dronePoiCount: 1,
      poiTypeBreakdown: { Ordnance: 1, Support: 0, Tactic: 0, Upgrade: 0, Resource: 4 }
    });

    render(<MapOverviewModal {...defaultProps} selectedMap={mapWithBlueprints} />);

    // Assert: Blueprints text appears (in OTHER column)
    expect(screen.getByText('Blueprints:')).toBeInTheDocument();

    // Assert: No purple background/border on drone blueprints row
    // The drone blueprints row should NOT have rgba(168, 85, 247, 0.15) background
    const droneBlueprintsLabel = screen.getByText('Blueprints:');
    const droneBlueprintsRow = droneBlueprintsLabel.closest('div');

    // Check that the row doesn't have the old purple box styling
    expect(droneBlueprintsRow).not.toHaveStyle({ backgroundColor: 'rgba(168, 85, 247, 0.15)' });
    expect(droneBlueprintsRow).not.toHaveStyle({ border: '1px solid rgba(168, 85, 247, 0.4)' });
    expect(droneBlueprintsRow).not.toHaveStyle({ padding: '8px 12px' });
  });

  it('should style drone blueprints consistently with other POI types', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapWithBlueprints = createMockMap({
      hasDroneBlueprints: true,
      dronePoiCount: 7,
      poiTypeBreakdown: { Ordnance: 2, Support: 0, Tactic: 0, Upgrade: 0, Resource: 4 }
    });

    render(<MapOverviewModal {...defaultProps} selectedMap={mapWithBlueprints} />);

    // Find the blueprints row and check the value styling
    const droneBlueprintsLabel = screen.getByText('Blueprints:');
    const row = droneBlueprintsLabel.closest('div');
    const valueInRow = within(row).getByText('7');

    // Assert: Value uses purple (#a855f7) color
    expect(valueInRow).toHaveStyle({ color: '#a855f7' });
  });
});

describe('MapOverviewModal - Requirements Section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show REQUIREMENTS section when map requires security token', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapWithToken = createMockMap({ requiresToken: true });

    render(<MapOverviewModal {...defaultProps} selectedSlotId={1} selectedMap={mapWithToken} />);

    // Assert: "REQUIREMENTS" heading appears
    expect(screen.getByText('REQUIREMENTS')).toBeInTheDocument();

    // Assert: Security token requirement is displayed (new format)
    expect(screen.getByText('Entry Requirements:')).toBeInTheDocument();
    expect(screen.getByText(/1 Token/i)).toBeInTheDocument();
  });

  it('should show REQUIREMENTS section when Starter Deck (slot 0) is selected', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapNoToken = createMockMap({ requiresToken: false });

    render(<MapOverviewModal {...defaultProps} selectedSlotId={0} selectedMap={mapNoToken} />);

    // Assert: "REQUIREMENTS" heading appears
    expect(screen.getByText('REQUIREMENTS')).toBeInTheDocument();

    // Assert: Extraction limit is displayed
    expect(screen.getByText(/Extraction Limit/i)).toBeInTheDocument();
    expect(screen.getByText(/3 items/i)).toBeInTheDocument();
  });

  it('should show both security token and extraction limit when both apply', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapWithToken = createMockMap({ requiresToken: true });

    // Slot 0 (Starter Deck) + requiresToken = both conditions
    render(<MapOverviewModal {...defaultProps} selectedSlotId={0} selectedMap={mapWithToken} />);

    // Assert: Both requirements appear in same section
    expect(screen.getByText('REQUIREMENTS')).toBeInTheDocument();
    expect(screen.getByText('Entry Requirements:')).toBeInTheDocument();
    expect(screen.getByText(/1 Token/i)).toBeInTheDocument();
    expect(screen.getByText('Extraction Limit:')).toBeInTheDocument();
    expect(screen.getByText(/3 items/i)).toBeInTheDocument();
  });

  // Note: This test is replaced by Phase 2 "Requirements Always Visible" tests
  // The REQUIREMENTS section is now always visible, showing "None" when no requirements
  it('should show REQUIREMENTS section with "None" values when no requirements exist', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapNoToken = createMockMap({ requiresToken: false });

    // Slot 1 (not Starter Deck) + no token requirement = no requirements
    render(<MapOverviewModal {...defaultProps} selectedSlotId={1} selectedMap={mapNoToken} />);

    // Assert: "REQUIREMENTS" heading appears (always visible now)
    expect(screen.getByText('REQUIREMENTS')).toBeInTheDocument();
  });

  it('should NOT render separate security token box outside requirements section', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapWithToken = createMockMap({ requiresToken: true });

    render(<MapOverviewModal {...defaultProps} selectedSlotId={1} selectedMap={mapWithToken} />);

    // The security token info should be in the REQUIREMENTS section, not as a separate standalone box
    const requirementsSection = screen.getByText('REQUIREMENTS').closest('.dw-modal-info-box');
    expect(requirementsSection).toBeInTheDocument();

    // Verify the security token text is within the requirements section (new format)
    expect(within(requirementsSection).getByText('Entry Requirements:')).toBeInTheDocument();
    expect(within(requirementsSection).getByText(/1 Token/i)).toBeInTheDocument();
  });

  it('should NOT render separate extraction limit box in ship selection area', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapNoToken = createMockMap({ requiresToken: false });

    render(<MapOverviewModal {...defaultProps} selectedSlotId={0} selectedMap={mapNoToken} />);

    // The extraction limit info should be in the REQUIREMENTS section (new format)
    const requirementsSection = screen.getByText('REQUIREMENTS').closest('.dw-modal-info-box');
    expect(within(requirementsSection).getByText('Extraction Limit:')).toBeInTheDocument();
    expect(within(requirementsSection).getByText(/3 items/i)).toBeInTheDocument();

    // There should NOT be a separate amber-themed box below DEPLOY SHIP
    const deploySection = screen.getByText('DEPLOY SHIP').closest('.dw-modal-info-box');
    expect(within(deploySection).queryByText('Extraction Limit:')).toBeNull();
  });
});

describe('MapOverviewModal - Map Preview Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render map preview in a flex column layout', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mockMap = createMockMap();

    render(<MapOverviewModal {...defaultProps} selectedMap={mockMap} />);

    // Find the map preview container
    const mapPreview = screen.getByTestId('map-preview');
    const mapContainer = mapPreview.parentElement;

    // Assert: Map container uses flex column layout (map naturally at top)
    expect(mapContainer).toHaveStyle({ flexDirection: 'column' });
  });
});

describe('MapOverviewModal - Layout Compactness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use 12px gap between grid sections instead of 16px', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mockMap = createMockMap();

    render(<MapOverviewModal {...defaultProps} selectedMap={mockMap} />);

    // Find the main grid container (parent of map preview container)
    const mapPreview = screen.getByTestId('map-preview');
    const mapContainer = mapPreview.parentElement;
    const gridContainer = mapContainer.parentElement;

    // Assert: Grid uses 12px vertical gap
    expect(gridContainer).toHaveStyle({ gap: '12px 24px' });
  });

  it('should use 12px gap in intel column instead of 16px', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mockMap = createMockMap();

    render(<MapOverviewModal {...defaultProps} selectedMap={mockMap} />);

    // Find the SECTOR INTEL section header to locate intel column
    const sectorIntel = screen.getByText('SECTOR INTEL');
    const intelColumn = sectorIntel.closest('div[style*="flex-direction: column"]');

    // Assert: Intel column uses 12px gap
    expect(intelColumn).toHaveStyle({ gap: '12px' });
  });
});

// ============================================
// Phase 3 Tests - Single Column POI Layout
// ============================================

describe('MapOverviewModal - POI Single-Column Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });
  });

  it('should display POI BREAKDOWN header', () => {
    const mockMap = createMockMap();
    render(<MapOverviewModal {...defaultProps} selectedMap={mockMap} />);

    expect(screen.getByText('POI BREAKDOWN')).toBeInTheDocument();
  });

  it('should show all POI types in single column', () => {
    const mockMap = createMockMap({
      hasDroneBlueprints: true,
      dronePoiCount: 2,
      poiTypeBreakdown: { Ordnance: 2, Support: 1, Tactic: 3, Upgrade: 1, Resource: 4 }
    });
    render(<MapOverviewModal {...defaultProps} selectedMap={mockMap} />);

    // All POI types should be present
    expect(screen.getByText('Ordnance:')).toBeInTheDocument();
    expect(screen.getByText('Support:')).toBeInTheDocument();
    expect(screen.getByText('Tactic:')).toBeInTheDocument();
    expect(screen.getByText('Upgrade:')).toBeInTheDocument();
    expect(screen.getByText('Resource:')).toBeInTheDocument();
    expect(screen.getByText('Blueprints:')).toBeInTheDocument();
  });

  it('should NOT have CARDS or OTHER column headers', () => {
    const mockMap = createMockMap();
    render(<MapOverviewModal {...defaultProps} selectedMap={mockMap} />);

    // These headers should not exist in single-column layout
    expect(screen.queryByText('CARDS')).toBeNull();
    expect(screen.queryByText('OTHER')).toBeNull();
  });
});

describe('MapOverviewModal - Requirements Always Visible', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should always show REQUIREMENTS section even when no requirements', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapNoToken = createMockMap({ requiresToken: false });

    // Slot 1 (not Starter Deck) + no token requirement = no actual requirements
    render(<MapOverviewModal {...defaultProps} selectedSlotId={1} selectedMap={mapNoToken} />);

    // REQUIREMENTS section should still appear
    expect(screen.getByText('REQUIREMENTS')).toBeInTheDocument();
  });

  it('should show "None" for Entry Requirements when no token required', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mapNoToken = createMockMap({ requiresToken: false });

    render(<MapOverviewModal {...defaultProps} selectedSlotId={1} selectedMap={mapNoToken} />);

    // Find Entry Requirements row and check for "None"
    expect(screen.getByText('Entry Requirements:')).toBeInTheDocument();
    const entryRow = screen.getByText('Entry Requirements:').closest('div');
    expect(within(entryRow).getByText('None')).toBeInTheDocument();
  });

  it('should show "None" for Extraction Limit when not Starter Deck', () => {
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });

    const mockMap = createMockMap();

    render(<MapOverviewModal {...defaultProps} selectedSlotId={1} selectedMap={mockMap} />);

    // Find Extraction Limit row and check for "None"
    expect(screen.getByText('Extraction Limit:')).toBeInTheDocument();
    const limitRow = screen.getByText('Extraction Limit:').closest('div');
    expect(within(limitRow).getByText('None')).toBeInTheDocument();
  });
});

describe('MapOverviewModal - Gate Selection Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameState.mockReturnValue({
      gameState: createMockGameState(),
      gameStateManager: { setState: vi.fn() }
    });
  });

  it('should render gate selection in same column as map preview', () => {
    const mockMap = createMockMap();
    render(<MapOverviewModal {...defaultProps} selectedMap={mockMap} />);

    // Find map preview and gate selection
    const mapPreview = screen.getByTestId('map-preview');
    const gateSelectionText = screen.getByText(/Entry Point: Gate/i);

    // Both should be children of the same grid container (different grid cells in the same column)
    const mapColumnContainer = mapPreview.parentElement;  // The flex column containing map
    const gateBox = gateSelectionText.closest('.dw-modal-info-box');
    const gridContainer = mapColumnContainer.parentElement;  // The grid container

    // The gate box should also be a child of the same grid container
    expect(gateBox.parentElement).toBe(gridContainer);
  });
});
