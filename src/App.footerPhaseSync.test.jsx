import { describe, it, expect } from 'vitest';
import React, { useState, useEffect, useRef } from 'react';
import { render, screen } from '@testing-library/react';

// ========================================
// FOOTER PHASE SYNC TESTS
// ========================================
// Tests for automatic footer tab switching based on game phase.
// When entering certain phases, the footer should auto-switch to the relevant tab:
// - Deployment phase → Drones tab (to select drones to deploy)
// - Discard phases (mandatory/optional) → Hand tab (to select cards to discard)
//
// This follows the same testing pattern as App.hooks.test.jsx:
// We create a minimal reproduction component that mirrors the useEffect logic in App.jsx
// rather than testing the full App component (which causes memory issues).

/**
 * Minimal component that reproduces the footer phase sync useEffect logic from App.jsx.
 * This mirrors the behavior at App.jsx lines 1877-1906.
 */
const FooterPhaseSyncComponent = ({ turnPhase }) => {
  const [footerView, setFooterView] = useState('hand');
  const [isFooterOpen, setIsFooterOpen] = useState(false);
  const previousPhaseRef = useRef(turnPhase);

  useEffect(() => {
    const prevPhase = previousPhaseRef.current;

    // Deployment → Drones tab
    const enteredDeployment = turnPhase === 'deployment' && prevPhase !== 'deployment';
    if (enteredDeployment) {
      setFooterView('drones');
      setIsFooterOpen(true);
    }

    // Discard phases → Hand tab
    const enteredMandatoryDiscard = turnPhase === 'mandatoryDiscard' && prevPhase !== 'mandatoryDiscard';
    const enteredOptionalDiscard = turnPhase === 'optionalDiscard' && prevPhase !== 'optionalDiscard';

    if (enteredMandatoryDiscard || enteredOptionalDiscard) {
      setFooterView('hand');
      setIsFooterOpen(true);
    }

    previousPhaseRef.current = turnPhase;
  }, [turnPhase]);

  return (
    <div>
      <span data-testid="footer-view">{footerView}</span>
      <span data-testid="footer-open">{isFooterOpen ? 'open' : 'closed'}</span>
    </div>
  );
};

describe('Footer phase-based tab switching (App.jsx footer sync)', () => {
  describe('Deployment phase', () => {
    it('switches to drones tab when entering deployment phase', () => {
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="action" />);

      // Initially should be 'hand' (default)
      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');
      expect(screen.getByTestId('footer-open')).toHaveTextContent('closed');

      // Transition to deployment phase
      rerender(<FooterPhaseSyncComponent turnPhase="deployment" />);

      // Should switch to drones tab and open footer
      expect(screen.getByTestId('footer-view')).toHaveTextContent('drones');
      expect(screen.getByTestId('footer-open')).toHaveTextContent('open');
    });

    it('switches to drones tab when transitioning from mandatoryDiscard to deployment', () => {
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="mandatoryDiscard" />);

      // Transition to deployment
      rerender(<FooterPhaseSyncComponent turnPhase="deployment" />);

      expect(screen.getByTestId('footer-view')).toHaveTextContent('drones');
      expect(screen.getByTestId('footer-open')).toHaveTextContent('open');
    });
  });

  describe('Mandatory discard phase', () => {
    it('switches to hand tab when entering mandatoryDiscard phase', () => {
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="action" />);

      // Transition to mandatoryDiscard phase
      rerender(<FooterPhaseSyncComponent turnPhase="mandatoryDiscard" />);

      // Should switch to hand tab and open footer
      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');
      expect(screen.getByTestId('footer-open')).toHaveTextContent('open');
    });

    it('switches to hand tab when transitioning from deployment to mandatoryDiscard', () => {
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="deployment" />);

      // First switch to deployment (sets to drones)
      rerender(<FooterPhaseSyncComponent turnPhase="deployment" />);

      // Then to mandatoryDiscard
      rerender(<FooterPhaseSyncComponent turnPhase="mandatoryDiscard" />);

      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');
    });
  });

  describe('Optional discard phase', () => {
    it('switches to hand tab when entering optionalDiscard phase', () => {
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="action" />);

      // Transition to optionalDiscard phase
      rerender(<FooterPhaseSyncComponent turnPhase="optionalDiscard" />);

      // Should switch to hand tab and open footer
      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');
      expect(screen.getByTestId('footer-open')).toHaveTextContent('open');
    });

    it('switches to hand tab when transitioning from deployment to optionalDiscard', () => {
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="action" />);

      // First to deployment (sets to drones)
      rerender(<FooterPhaseSyncComponent turnPhase="deployment" />);
      expect(screen.getByTestId('footer-view')).toHaveTextContent('drones');

      // Then to optionalDiscard
      rerender(<FooterPhaseSyncComponent turnPhase="optionalDiscard" />);
      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');
    });
  });

  describe('No-op transitions', () => {
    it('does not re-trigger when phase stays the same', () => {
      // Start in deployment (footer closed by default)
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="deployment" />);

      // Footer should still be closed because we started in deployment (no transition)
      expect(screen.getByTestId('footer-open')).toHaveTextContent('closed');

      // Re-render with same phase
      rerender(<FooterPhaseSyncComponent turnPhase="deployment" />);

      // Should still be closed - no transition occurred
      expect(screen.getByTestId('footer-open')).toHaveTextContent('closed');
    });

    it('does not switch when transitioning between non-target phases', () => {
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="action" />);

      // Transition to placement (not a target phase for auto-switch)
      rerender(<FooterPhaseSyncComponent turnPhase="placement" />);

      // Should remain on hand (default), footer closed
      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');
      expect(screen.getByTestId('footer-open')).toHaveTextContent('closed');
    });
  });

  describe('Full phase cycle', () => {
    it('handles a full round of phase transitions correctly', () => {
      const { rerender } = render(<FooterPhaseSyncComponent turnPhase="action" />);

      // 1. Enter mandatoryDiscard → hand
      rerender(<FooterPhaseSyncComponent turnPhase="mandatoryDiscard" />);
      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');

      // 2. Enter optionalDiscard → hand (stays hand)
      rerender(<FooterPhaseSyncComponent turnPhase="optionalDiscard" />);
      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');

      // 3. Enter deployment → drones
      rerender(<FooterPhaseSyncComponent turnPhase="deployment" />);
      expect(screen.getByTestId('footer-view')).toHaveTextContent('drones');

      // 4. Enter action → no change (stays drones)
      rerender(<FooterPhaseSyncComponent turnPhase="action" />);
      expect(screen.getByTestId('footer-view')).toHaveTextContent('drones');

      // 5. Back to mandatoryDiscard → hand
      rerender(<FooterPhaseSyncComponent turnPhase="mandatoryDiscard" />);
      expect(screen.getByTestId('footer-view')).toHaveTextContent('hand');
    });
  });
});
