/**
 * TacticalItemsPanel Component Tests
 * TDD: Tests for the quick-use tactical items panel on the tactical map
 */

import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TacticalItemsPanel from '../TacticalItemsPanel.jsx';

describe('TacticalItemsPanel', () => {
  const mockOnRequestThreatReduce = vi.fn();

  const defaultProps = {
    evadeCount: 2,
    extractCount: 1,
    threatReduceCount: 3,
    currentDetection: 50,
    onRequestThreatReduce: mockOnRequestThreatReduce
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders panel with 3 item slots', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      // Should have 3 item slots
      expect(screen.getByTestId('tactical-item-evade')).toBeInTheDocument();
      expect(screen.getByTestId('tactical-item-extract')).toBeInTheDocument();
      expect(screen.getByTestId('tactical-item-threat')).toBeInTheDocument();
    });

    test('displays item quantities for each slot', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      expect(screen.getByText('x2')).toBeInTheDocument(); // evade
      expect(screen.getByText('x1')).toBeInTheDocument(); // extract
      expect(screen.getByText('x3')).toBeInTheDocument(); // threat reduce
    });

    test('renders panel header', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      expect(screen.getByText(/tactical items/i)).toBeInTheDocument();
    });
  });

  describe('Slot States', () => {
    test('evade slot shows as context-locked (not usable from panel)', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const evadeSlot = screen.getByTestId('tactical-item-evade');
      // Evade can only be used in encounter modal, not from panel
      expect(evadeSlot).toHaveAttribute('data-locked', 'true');
    });

    test('extract slot shows as context-locked (not usable from panel)', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const extractSlot = screen.getByTestId('tactical-item-extract');
      // Extract can only be used at extraction gates
      expect(extractSlot).toHaveAttribute('data-locked', 'true');
    });

    test('threat reduce slot is clickable when quantity > 0 and detection > 0', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const threatSlot = screen.getByTestId('tactical-item-threat');
      expect(threatSlot).not.toHaveAttribute('data-disabled');
    });

    test('threat reduce slot is disabled when quantity is 0', () => {
      render(<TacticalItemsPanel {...defaultProps} threatReduceCount={0} />);

      const threatSlot = screen.getByTestId('tactical-item-threat');
      expect(threatSlot).toHaveAttribute('data-disabled', 'true');
    });

    test('threat reduce slot is disabled when detection is 0', () => {
      render(<TacticalItemsPanel {...defaultProps} currentDetection={0} />);

      const threatSlot = screen.getByTestId('tactical-item-threat');
      expect(threatSlot).toHaveAttribute('data-disabled', 'true');
    });

    test('all slots show quantity 0 as grayed', () => {
      render(
        <TacticalItemsPanel
          evadeCount={0}
          extractCount={0}
          threatReduceCount={0}
          currentDetection={50}
          onRequestThreatReduce={mockOnRequestThreatReduce}
        />
      );

      // All slots should show x0
      const zeroLabels = screen.getAllByText('x0');
      expect(zeroLabels.length).toBe(3);
    });
  });

  describe('Interactions', () => {
    test('calls onRequestThreatReduce when threat reduce slot clicked', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const threatSlot = screen.getByTestId('tactical-item-threat');
      fireEvent.click(threatSlot);

      expect(mockOnRequestThreatReduce).toHaveBeenCalledTimes(1);
    });

    test('does not call onRequestThreatReduce when disabled', () => {
      render(<TacticalItemsPanel {...defaultProps} threatReduceCount={0} />);

      const threatSlot = screen.getByTestId('tactical-item-threat');
      fireEvent.click(threatSlot);

      expect(mockOnRequestThreatReduce).not.toHaveBeenCalled();
    });

    test('evade slot click does nothing (context-locked)', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const evadeSlot = screen.getByTestId('tactical-item-evade');
      fireEvent.click(evadeSlot);

      // No action should be triggered
      expect(mockOnRequestThreatReduce).not.toHaveBeenCalled();
    });

    test('extract slot click does nothing (context-locked)', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const extractSlot = screen.getByTestId('tactical-item-extract');
      fireEvent.click(extractSlot);

      // No action should be triggered
      expect(mockOnRequestThreatReduce).not.toHaveBeenCalled();
    });
  });

  describe('Tooltips', () => {
    test('evade slot has tooltip text', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const evadeSlot = screen.getByTestId('tactical-item-evade');
      expect(evadeSlot).toHaveAttribute('title');
      expect(evadeSlot.getAttribute('title')).toContain('Emergency Jammer');
    });

    test('extract slot has tooltip text', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const extractSlot = screen.getByTestId('tactical-item-extract');
      expect(extractSlot).toHaveAttribute('title');
      expect(extractSlot.getAttribute('title')).toContain('Clearance Override');
    });

    test('threat reduce slot has tooltip text', () => {
      render(<TacticalItemsPanel {...defaultProps} />);

      const threatSlot = screen.getByTestId('tactical-item-threat');
      expect(threatSlot).toHaveAttribute('title');
      expect(threatSlot.getAttribute('title')).toContain('Signal Dampener');
    });
  });
});
