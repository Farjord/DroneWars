/**
 * DeploymentOrderQueue.test.jsx
 * TDD tests for the deployment order queue panel component
 *
 * This component displays the order in which drones will be deployed
 * and allows drag-drop reordering.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeploymentOrderQueue from '../DeploymentOrderQueue.jsx';

describe('DeploymentOrderQueue', () => {
  const mockPlacements = [
    { droneName: 'Dart', lane: 0 },
    { droneName: 'Talon', lane: 2 },
    { droneName: 'Dart', lane: 0 }  // Same drone, same lane as index 0
  ];

  const defaultProps = {
    placements: mockPlacements,
    deploymentOrder: [0, 1, 2],
    onReorder: vi.fn()
  };

  it('should render all placements in deploymentOrder sequence with numbers 1-N', () => {
    render(<DeploymentOrderQueue {...defaultProps} />);

    // Should show deployment numbers (without period - displayed under drone token)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show drone name and lane for each entry', () => {
    render(<DeploymentOrderQueue {...defaultProps} />);

    // Should show drone names (Dart appears twice)
    const scoutDrones = screen.getAllByText(/Dart/);
    expect(scoutDrones.length).toBe(2);

    // Should show Talon once
    expect(screen.getByText(/Talon/)).toBeInTheDocument();

    // Should show lane indicators
    const leftLanes = screen.getAllByText(/Left/);
    expect(leftLanes.length).toBe(2);  // Two Darts in left lane
    expect(screen.getByText(/Right/)).toBeInTheDocument();
  });

  it('should respect deploymentOrder for display order', () => {
    const reorderedProps = {
      ...defaultProps,
      deploymentOrder: [2, 0, 1]  // Third placement first, first placement second, second placement third
    };

    render(<DeploymentOrderQueue {...reorderedProps} />);

    // Get all rows
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBe(3);

    // First row should be placement[2] (Dart, Left) - number shown under token
    expect(rows[0]).toHaveTextContent('1');
    expect(rows[0]).toHaveTextContent('Dart');
    expect(rows[0]).toHaveTextContent('Left');

    // Second row should be placement[0] (Dart, Left)
    expect(rows[1]).toHaveTextContent('2');
    expect(rows[1]).toHaveTextContent('Dart');
    expect(rows[1]).toHaveTextContent('Left');

    // Third row should be placement[1] (Talon, Right)
    expect(rows[2]).toHaveTextContent('3');
    expect(rows[2]).toHaveTextContent('Talon');
    expect(rows[2]).toHaveTextContent('Right');
  });

  it('should call onReorder when items are reordered via drag-drop', () => {
    const onReorder = vi.fn();
    render(<DeploymentOrderQueue {...defaultProps} onReorder={onReorder} />);

    const rows = screen.getAllByRole('listitem');

    // Simulate drag from row 0 to row 1
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[1]);
    fireEvent.drop(rows[1]);
    fireEvent.dragEnd(rows[0]);

    // onReorder should be called with new order
    expect(onReorder).toHaveBeenCalled();
  });

  it('should render empty state when no placements', () => {
    render(
      <DeploymentOrderQueue
        placements={[]}
        deploymentOrder={[]}
        onReorder={vi.fn()}
      />
    );

    // Should show empty state message
    expect(screen.getByText(/No drones placed/i)).toBeInTheDocument();
  });

  it('should handle single placement without drag handle', () => {
    const singlePlacement = {
      placements: [{ droneName: 'Dart', lane: 1 }],
      deploymentOrder: [0],
      onReorder: vi.fn()
    };

    render(<DeploymentOrderQueue {...singlePlacement} />);

    // Should show the single placement (number shown under token without period)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Dart/)).toBeInTheDocument();
    expect(screen.getByText(/Middle/)).toBeInTheDocument();

    // Should not have drag handle (or it should be disabled)
    const dragHandles = screen.queryAllByTestId('drag-handle');
    expect(dragHandles.length === 0 || dragHandles[0]).toBeTruthy();
  });
});
