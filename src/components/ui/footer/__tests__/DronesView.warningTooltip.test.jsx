// ========================================
// DRONES VIEW WARNING TOOLTIP TESTS
// ========================================
// Tests for inline warning tooltips on drone cards in the footer.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DronesView from '../DronesView.jsx';

// Mock dependencies
vi.mock('../../DroneCard.jsx', () => ({
  default: ({ drone, isSelectable }) => (
    <div
      data-testid={`drone-card-${drone.name}`}
      data-selectable={isSelectable}
    >
      {drone.name}
    </div>
  )
}));

vi.mock('../../ActionCard.jsx', () => ({
  default: ({ card }) => <div data-testid="action-card">{card.name}</div>
}));

vi.mock('../../ActionCardTooltipPanel.jsx', () => ({
  TOOLTIP_EFFECTIVE_WIDTH: 300,
  default: ({ items, visible, position }) => (
    items && items.length > 0
      ? <div
          data-testid="tooltip-panel"
          data-visible={visible}
          data-position={position}
        >
          {items.map(item => (
            <span key={item.key} data-testid={`tooltip-${item.key}`}>{item.label}</span>
          ))}
        </div>
      : null
  )
}));

vi.mock('../../CardBackPlaceholder.jsx', () => ({
  default: () => <div data-testid="card-back-placeholder" />
}));

vi.mock('../../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../../managers/SoundManager.js', () => ({
  default: { getInstance: () => ({ play: vi.fn() }) }
}));

vi.mock('../../../../data/droneData.js', () => ({
  default: []
}));

vi.mock('../../../../utils/cardAnimationUtils.js', () => ({
  calculateCardFanRotation: () => 0,
  getHoverTransform: () => 'none',
  getCardTransition: () => 'none',
  calculateCardArcOffset: () => 0,
  CARD_FAN_CONFIG: {
    cardOverlapPx: -30,
    zIndex: { hovered: 100, normal: (i) => i },
    transformOrigin: 'bottom center'
  }
}));

const mockDrone = {
  name: 'Dart',
  class: 2,
  attack: 1,
  speed: 3,
  hull: 2,
  shields: 0,
  limit: 3,
  abilities: []
};

const defaultProps = {
  localPlayerState: {
    energy: 5,
    initialDeploymentBudget: 10,
    deploymentBudget: 10,
    deployedDroneCounts: {},
    appliedUpgrades: {},
    discardPile: [],
    deck: [],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
  },
  localPlayerEffectiveStats: {
    totals: { cpuLimit: 10 }
  },
  sortedLocalActivePool: [mockDrone],
  selectedCard: null,
  turnPhase: 'deployment',
  mandatoryAction: null,
  handleToggleDroneSelection: vi.fn(),
  selectedDrone: null,
  setViewUpgradesModal: vi.fn(),
  getLocalPlayerId: () => 'player1',
  isMyTurn: () => true,
  turn: 1,
  roundNumber: 1,
  passInfo: { player1Passed: false, player2Passed: false },
  validCardTargets: [],
  setIsViewDiscardModalOpen: vi.fn(),
  setIsViewDeckModalOpen: vi.fn(),
  onToggleView: vi.fn(),
};

describe('DronesView warning tooltips', () => {
  it('shows wrong-phase warning when hovering during action phase', () => {
    render(<DronesView {...defaultProps} turnPhase="action" />);

    const wrapper = screen.getByTestId('drone-card-Dart').parentElement;
    fireEvent.mouseEnter(wrapper);

    const tooltip = screen.getByTestId('tooltip-panel');
    expect(tooltip).toBeTruthy();
    expect(tooltip.getAttribute('data-visible')).toBe('true');
    expect(screen.getByTestId('tooltip-wrong-phase')).toBeTruthy();
  });

  it('shows not-enough-resources warning when drone is too expensive', () => {
    render(
      <DronesView
        {...defaultProps}
        localPlayerState={{
          ...defaultProps.localPlayerState,
          energy: 0,
          initialDeploymentBudget: 1, // Total 1, drone costs 2
        }}
      />
    );

    const wrapper = screen.getByTestId('drone-card-Dart').parentElement;
    fireEvent.mouseEnter(wrapper);

    expect(screen.getByTestId('tooltip-not-enough-resources')).toBeTruthy();
  });

  it('shows cpu-limit-reached warning when at CPU limit', () => {
    render(
      <DronesView
        {...defaultProps}
        localPlayerEffectiveStats={{ totals: { cpuLimit: 0 } }}
      />
    );

    const wrapper = screen.getByTestId('drone-card-Dart').parentElement;
    fireEvent.mouseEnter(wrapper);

    expect(screen.getByTestId('tooltip-cpu-limit-reached')).toBeTruthy();
  });

  it('shows no tooltip when drone is selectable', () => {
    render(<DronesView {...defaultProps} />);

    const wrapper = screen.getByTestId('drone-card-Dart').parentElement;
    fireEvent.mouseEnter(wrapper);

    expect(screen.queryByTestId('tooltip-panel')).toBeNull();
  });

  it('hides tooltip on mouse leave', () => {
    render(<DronesView {...defaultProps} turnPhase="action" />);

    const wrapper = screen.getByTestId('drone-card-Dart').parentElement;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByTestId('tooltip-panel')).toBeTruthy();

    fireEvent.mouseLeave(wrapper);
    // After mouse leave, hoveredDroneId resets so items array is empty → panel not rendered
    expect(screen.queryByTestId('tooltip-panel')).toBeNull();
  });

  it('shows not-your-turn warning when it is not the player turn', () => {
    render(<DronesView {...defaultProps} isMyTurn={() => false} />);

    const wrapper = screen.getByTestId('drone-card-Dart').parentElement;
    fireEvent.mouseEnter(wrapper);

    expect(screen.getByTestId('tooltip-not-your-turn')).toBeTruthy();
  });

  it('shows player-passed warning when player has passed', () => {
    render(
      <DronesView
        {...defaultProps}
        passInfo={{ player1Passed: true, player2Passed: false }}
      />
    );

    const wrapper = screen.getByTestId('drone-card-Dart').parentElement;
    fireEvent.mouseEnter(wrapper);

    expect(screen.getByTestId('tooltip-player-passed')).toBeTruthy();
  });
});
