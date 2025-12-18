import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock all dependencies before import
vi.mock('../../hooks/useGameState', () => ({
  useGameState: vi.fn(() => ({
    gameState: {
      quickDeployEditorData: {
        deployment: {
          id: null,
          name: '',
          droneRoster: ['Talon', 'Mammoth', 'Dart', 'Bastion', 'Seraph'],
          placements: []
        },
        isCreating: true
      },
      singlePlayerProfile: {
        unlockedBlueprints: []
      },
      shipSlots: []
    },
    gameStateManager: {
      getState: vi.fn(() => ({})),
      setState: vi.fn()
    }
  }))
}));

vi.mock('../../data/droneData', () => ({
  default: [
    { name: 'Talon', type: 'Fighter', cost: 2, limit: 3, image: '/test.png', baseHealth: 10, baseAttack: 5 },
    { name: 'Mammoth', type: 'Heavy', cost: 4, limit: 2, image: '/test.png', baseHealth: 20, baseAttack: 3 },
    { name: 'Dart', type: 'Scout', cost: 1, limit: 4, image: '/test.png', baseHealth: 5, baseAttack: 2 },
    { name: 'Bastion', type: 'Guardian', cost: 3, limit: 2, image: '/test.png', baseHealth: 15, baseAttack: 4 },
    { name: 'Seraph', type: 'Support', cost: 3, limit: 2, image: '/test.png', baseHealth: 8, baseAttack: 1 }
  ]
}));

vi.mock('../../data/saveGameSchema', () => ({
  starterPoolDroneNames: ['Talon', 'Mammoth', 'Dart', 'Bastion', 'Seraph']
}));

vi.mock('../../logic/quickDeploy/QuickDeployValidator', () => ({
  calculateTotalCost: vi.fn(() => 0),
  getDroneByName: vi.fn((name) => ({
    name, type: 'Fighter', cost: 2, limit: 3, image: '/test.png', baseHealth: 10, baseAttack: 5
  })),
  validateAgainstDeck: vi.fn(() => ({ valid: true, reasons: [] }))
}));

vi.mock('../../logic/statsCalculator', () => ({
  calculateEffectiveStats: vi.fn((drone) => drone),
  calculateSectionBaseStats: vi.fn(() => ({}))
}));

vi.mock('../../data/shipSectionData', () => ({
  shipComponentCollection: []
}));

vi.mock('../../data/shipData', () => ({
  getAllShips: vi.fn(() => [])
}));

vi.mock('../../logic/quickDeploy/QuickDeployService', () => ({
  default: class MockQuickDeployService {
    constructor() {}
    create = vi.fn();
    update = vi.fn();
  }
}));

// Mock TargetingArrow to render with data-testid
vi.mock('../ui/TargetingArrow', () => ({
  default: ({ visible }) => visible ? <div data-testid="targeting-arrow">Arrow</div> : null,
  calculatePolygonPoints: vi.fn(() => '0,0 10,0 10,10 0,10')
}));

// Mock UI components
vi.mock('../ui/DroneLanesDisplay', () => ({
  default: ({ onLaneClick, handleDroneDragEnd, draggedDrone }) => (
    <div data-testid="drone-lanes-display">
      {['left', 'middle', 'right'].map(lane => (
        <div
          key={lane}
          data-testid={`lane-drop-zone-${lane}`}
          onClick={(e) => onLaneClick?.(e, `lane${lane === 'left' ? 1 : lane === 'middle' ? 2 : 3}`, true)}
          onMouseUp={() => {
            if (draggedDrone && handleDroneDragEnd) {
              handleDroneDragEnd(null, `lane${lane === 'left' ? 1 : lane === 'middle' ? 2 : 3}`, false);
            }
          }}
        >
          Lane {lane}
        </div>
      ))}
    </div>
  )
}));

vi.mock('../ui/DroneCard', () => ({
  default: ({ drone, onClick, isSelected }) => (
    <div
      data-testid={`drone-card-${drone.name}`}
      onClick={() => onClick?.(drone)}
      data-selected={isSelected}
    >
      {drone.name}
    </div>
  )
}));

vi.mock('../quickDeploy/DronePicker', () => ({
  default: () => null
}));

vi.mock('../quickDeploy/DeploymentOrderQueue', () => ({
  default: () => <div data-testid="deployment-order-queue" />
}));

vi.mock('../../contexts/EditorStatsContext', () => ({
  EditorStatsProvider: ({ children }) => <div>{children}</div>
}));

import QuickDeployEditorScreen from './QuickDeployEditorScreen.jsx';

describe('QuickDeployEditorScreen - Drag and Drop with Movement Threshold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT show TargetingArrow on mouseDown alone (click behavior)', () => {
    render(<QuickDeployEditorScreen />);

    const talonRoster = screen.getByTestId('roster-drone-Talon');

    // mouseDown without movement should not start drag
    fireEvent.mouseDown(talonRoster, { clientX: 100, clientY: 100 });

    // TargetingArrow should NOT be visible (movement threshold not exceeded)
    expect(screen.queryByTestId('targeting-arrow')).not.toBeInTheDocument();
  });

  it('should show TargetingArrow after movement threshold is exceeded', async () => {
    render(<QuickDeployEditorScreen />);

    const talonRoster = screen.getByTestId('roster-drone-Talon');

    // mouseDown to start potential drag
    fireEvent.mouseDown(talonRoster, { clientX: 100, clientY: 100 });

    // No arrow yet
    expect(screen.queryByTestId('targeting-arrow')).not.toBeInTheDocument();

    // Move mouse beyond threshold (5 pixels)
    fireEvent.mouseMove(document, { clientX: 110, clientY: 100 });

    // TargetingArrow should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('targeting-arrow')).toBeInTheDocument();
    });
  });

  it('should hide TargetingArrow on mouseUp after drag started', async () => {
    render(<QuickDeployEditorScreen />);

    const talonRoster = screen.getByTestId('roster-drone-Talon');

    // Start drag with movement
    fireEvent.mouseDown(talonRoster, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 110, clientY: 100 });

    // Verify arrow is visible
    await waitFor(() => {
      expect(screen.getByTestId('targeting-arrow')).toBeInTheDocument();
    });

    // mouseUp cancels drag
    fireEvent.mouseUp(document);

    // Arrow should be hidden (with setTimeout defer)
    await waitFor(() => {
      expect(screen.queryByTestId('targeting-arrow')).not.toBeInTheDocument();
    });
  });

  it('should allow click without drag interference', async () => {
    render(<QuickDeployEditorScreen />);

    const talonRoster = screen.getByTestId('roster-drone-Talon');

    // Click (mouseDown + mouseUp without significant movement)
    fireEvent.mouseDown(talonRoster, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(talonRoster);

    // No drag should have started
    expect(screen.queryByTestId('targeting-arrow')).not.toBeInTheDocument();
  });

  it('should have drop zones on lanes', () => {
    render(<QuickDeployEditorScreen />);

    // Verify all three lane drop zones exist
    expect(screen.getByTestId('lane-drop-zone-left')).toBeInTheDocument();
    expect(screen.getByTestId('lane-drop-zone-middle')).toBeInTheDocument();
    expect(screen.getByTestId('lane-drop-zone-right')).toBeInTheDocument();
  });

  it('should not show TargetingArrow when no drag is active', () => {
    render(<QuickDeployEditorScreen />);

    // Initially no arrow should be visible
    expect(screen.queryByTestId('targeting-arrow')).not.toBeInTheDocument();
  });

  it('roster drones should have cursor grab style', () => {
    render(<QuickDeployEditorScreen />);

    const talonRoster = screen.getByTestId('roster-drone-Talon');
    expect(talonRoster).toHaveStyle({ cursor: 'grab' });
  });
});

describe('QuickDeployEditorScreen - Text Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT have userSelect: none on the root container', () => {
    render(<QuickDeployEditorScreen />);

    // The root container should allow text selection (not have userSelect: none)
    const rootContainer = document.querySelector('.heading-font');
    expect(rootContainer).not.toHaveStyle({ userSelect: 'none' });
  });

  it('should have userSelect: none only on draggable roster drones', () => {
    render(<QuickDeployEditorScreen />);

    const talonRoster = screen.getByTestId('roster-drone-Talon');
    expect(talonRoster).toHaveStyle({ userSelect: 'none' });
  });
});
