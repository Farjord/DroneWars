/**
 * StarterDeckWarningModal Component Tests
 * TDD: Tests for starter deck warning modal
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StarterDeckWarningModal from './StarterDeckWarningModal.jsx';

describe('StarterDeckWarningModal', () => {
  const mockOnCancel = vi.fn();
  const mockOnDeployAnyway = vi.fn();
  const mockOnSwitchDeck = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with correct title and subtitle', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={3}
        />
      );

      expect(screen.getByText('Deploying with Starter Deck')).toBeInTheDocument();
      expect(screen.getByText('You have 3 custom decks available')).toBeInTheDocument();
    });

    it('should show singular text when customDeckCount is 1', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={1}
        />
      );

      expect(screen.getByText('You have 1 custom deck available')).toBeInTheDocument();
    });

    it('should show educational subtitle when customDeckCount is 0', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={0}
        />
      );

      expect(screen.getByText('Build a custom deck to unlock full potential!')).toBeInTheDocument();
    });

    it('should render limitations section', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={2}
        />
      );

      expect(screen.getByText(/Starter Deck Limitations/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero reputation earned per run/i)).toBeInTheDocument();
      expect(screen.getByText(/3-item extraction limit/i)).toBeInTheDocument();
    });

    it('should render list of custom deck benefits', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={2}
        />
      );

      expect(screen.getByText(/Earn reputation for progression/i)).toBeInTheDocument();
      expect(screen.getByText(/Access to advanced cards and abilities/i)).toBeInTheDocument();
      expect(screen.getByText(/Customized strategies and loadouts/i)).toBeInTheDocument();
      expect(screen.getByText(/Higher potential rewards/i)).toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onCancel when Cancel button clicked', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={2}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onDeployAnyway when Deploy Anyway button clicked', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={2}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /deploy anyway/i }));
      expect(mockOnDeployAnyway).toHaveBeenCalledTimes(1);
    });

    it('should render Switch Deck button when onSwitchDeck provided', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          onSwitchDeck={mockOnSwitchDeck}
          customDeckCount={2}
        />
      );

      expect(screen.getByRole('button', { name: /switch deck/i })).toBeInTheDocument();
    });

    it('should NOT render Switch Deck button when onSwitchDeck not provided', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={2}
        />
      );

      expect(screen.queryByRole('button', { name: /switch deck/i })).not.toBeInTheDocument();
    });

    it('should NOT render Switch Deck button when customDeckCount is 0', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          onSwitchDeck={mockOnSwitchDeck}
          customDeckCount={0}
        />
      );

      expect(screen.queryByRole('button', { name: /switch deck/i })).not.toBeInTheDocument();
    });

    it('should call onSwitchDeck when Switch Deck button clicked', () => {
      render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          onSwitchDeck={mockOnSwitchDeck}
          customDeckCount={2}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /switch deck/i }));
      expect(mockOnSwitchDeck).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when modal overlay clicked', () => {
      const { container } = render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={2}
        />
      );

      const overlay = container.querySelector('.dw-modal-overlay');
      fireEvent.click(overlay);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onCancel when modal content clicked', () => {
      const { container } = render(
        <StarterDeckWarningModal
          onCancel={mockOnCancel}
          onDeployAnyway={mockOnDeployAnyway}
          customDeckCount={2}
        />
      );

      const content = container.querySelector('.dw-modal-content');
      fireEvent.click(content);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });
});
