/**
 * FilterChip.test.jsx
 * TDD tests for the FilterChip component
 *
 * FilterChip is a removable pill-style chip that displays an active filter.
 * Used in DeckBuilder to show currently applied filters.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterChip from '../FilterChip.jsx';

describe('FilterChip', () => {
  // ========================================
  // RENDERING TESTS
  // ========================================
  describe('Rendering', () => {
    it('should render label text', () => {
      render(<FilterChip label="Common" onRemove={() => {}} />);
      expect(screen.getByText('Common')).toBeInTheDocument();
    });

    it('should render label with prefix', () => {
      render(<FilterChip label="Type: Ordnance" onRemove={() => {}} />);
      expect(screen.getByText('Type: Ordnance')).toBeInTheDocument();
    });

    it('should render remove button', () => {
      render(<FilterChip label="Test" onRemove={() => {}} />);
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should render X icon in remove button', () => {
      render(<FilterChip label="Test" onRemove={() => {}} />);
      const button = screen.getByRole('button', { name: /remove/i });
      expect(button).toBeInTheDocument();
      // X icon should be present (either as text or icon)
      expect(button.textContent || button.querySelector('svg')).toBeTruthy();
    });
  });

  // ========================================
  // INTERACTION TESTS
  // ========================================
  describe('Interactions', () => {
    it('should call onRemove when X clicked', () => {
      const onRemove = vi.fn();
      render(<FilterChip label="Test" onRemove={onRemove} />);

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('should call onRemove with correct filter info when provided', () => {
      const onRemove = vi.fn();
      render(
        <FilterChip
          label="Common"
          filterType="rarity"
          filterValue="Common"
          onRemove={onRemove}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      expect(onRemove).toHaveBeenCalledWith('rarity', 'Common');
    });

    it('should not propagate click event from remove button', () => {
      const onRemove = vi.fn();
      const onClick = vi.fn();
      render(
        <div onClick={onClick}>
          <FilterChip label="Test" onRemove={onRemove} />
        </div>
      );

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      expect(onRemove).toHaveBeenCalled();
      // Click should not propagate to parent
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================
  describe('Accessibility', () => {
    it('should have accessible remove button with aria-label', () => {
      render(<FilterChip label="Common" onRemove={() => {}} />);
      const button = screen.getByRole('button', { name: /remove/i });
      expect(button).toHaveAttribute('aria-label');
    });

    it('should include filter label in aria-label for context', () => {
      render(<FilterChip label="Type: Ordnance" onRemove={() => {}} />);
      const button = screen.getByRole('button', { name: /remove/i });
      expect(button.getAttribute('aria-label')).toContain('Ordnance');
    });
  });

  // ========================================
  // STYLING TESTS
  // ========================================
  describe('Styling', () => {
    it('should have chip styling class', () => {
      const { container } = render(<FilterChip label="Test" onRemove={() => {}} />);
      expect(container.firstChild).toHaveClass('dw-filter-chip');
    });

    it('should apply custom className when provided', () => {
      const { container } = render(
        <FilterChip label="Test" onRemove={() => {}} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
