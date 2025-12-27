// ========================================
// BLUEPRINT ENCOUNTER MODAL TESTS
// ========================================
// Tests for Quick Deploy functionality in blueprint encounters

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BlueprintEncounterModal from './BlueprintEncounterModal';

describe('BlueprintEncounterModal - Quick Deploy', () => {
  const mockEncounter = {
    poi: {
      poiData: {
        name: 'Test Blueprint Facility',
        description: 'Test description',
        color: '#3b82f6',
        rewardType: 'DRONE_BLUEPRINT_MEDIUM'
      }
    },
    aiData: {
      name: 'Guardian AI',
      shipClass: 'Frigate',
      difficulty: 'Medium'
    }
  };

  it('shows single ENGAGE button when no quick deployments available', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const onQuickDeploy = vi.fn();

    render(
      <BlueprintEncounterModal
        encounter={mockEncounter}
        show={true}
        onAccept={onAccept}
        onDecline={onDecline}
        onQuickDeploy={onQuickDeploy}
        validQuickDeployments={[]}
      />
    );

    // Should show ENGAGE button
    expect(screen.getByText('ENGAGE')).toBeInTheDocument();

    // Should NOT show Standard Deploy or Quick Deploy
    expect(screen.queryByText('STANDARD DEPLOY')).not.toBeInTheDocument();
    expect(screen.queryByText('QUICK DEPLOY')).not.toBeInTheDocument();
  });

  it('shows STANDARD DEPLOY and QUICK DEPLOY buttons when quick deployments available', () => {
    const validDeployments = [
      { id: 'qd1', name: 'Alpha Strike' },
      { id: 'qd2', name: 'Defensive Wall' }
    ];

    render(
      <BlueprintEncounterModal
        encounter={mockEncounter}
        show={true}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onQuickDeploy={vi.fn()}
        validQuickDeployments={validDeployments}
      />
    );

    // Should show both deploy options
    expect(screen.getByText('STANDARD DEPLOY')).toBeInTheDocument();
    expect(screen.getByText('QUICK DEPLOY')).toBeInTheDocument();

    // Should NOT show single ENGAGE button
    expect(screen.queryByText('ENGAGE')).not.toBeInTheDocument();
  });

  it('calls onQuickDeploy when QUICK DEPLOY button clicked', () => {
    const onQuickDeploy = vi.fn();
    const validDeployments = [{ id: 'qd1', name: 'Test' }];

    render(
      <BlueprintEncounterModal
        encounter={mockEncounter}
        show={true}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onQuickDeploy={onQuickDeploy}
        validQuickDeployments={validDeployments}
      />
    );

    fireEvent.click(screen.getByText('QUICK DEPLOY'));
    expect(onQuickDeploy).toHaveBeenCalledTimes(1);
  });

  it('calls onAccept when STANDARD DEPLOY button clicked', () => {
    const onAccept = vi.fn();
    const validDeployments = [{ id: 'qd1', name: 'Test' }];

    render(
      <BlueprintEncounterModal
        encounter={mockEncounter}
        show={true}
        onAccept={onAccept}
        onDecline={vi.fn()}
        onQuickDeploy={vi.fn()}
        validQuickDeployments={validDeployments}
      />
    );

    fireEvent.click(screen.getByText('STANDARD DEPLOY'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onAccept when single ENGAGE button clicked', () => {
    const onAccept = vi.fn();

    render(
      <BlueprintEncounterModal
        encounter={mockEncounter}
        show={true}
        onAccept={onAccept}
        onDecline={vi.fn()}
        onQuickDeploy={vi.fn()}
        validQuickDeployments={[]}
      />
    );

    fireEvent.click(screen.getByText('ENGAGE'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
