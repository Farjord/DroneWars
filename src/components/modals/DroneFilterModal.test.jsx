/**
 * DroneFilterModal.test.jsx
 * TDD tests for the DroneFilterModal component
 *
 * DroneFilterModal provides a popup interface for filtering drones in DeckBuilder.
 * Supports filtering by: rarity, class, abilities, and damage type.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DroneFilterModal from './DroneFilterModal.jsx';

// Mock filter options
const mockFilterOptions = {
  rarities: ['Common', 'Uncommon', 'Rare', 'Mythic'],
  classes: [1, 2, 3, 4, 5],
  damageTypes: ['Ion', 'Kinetic', 'Shield Breaker'],
  abilities: ['Guardian Protocol', 'Hull Repair', 'Signal Boost', 'Active', 'Passive', 'Triggered'],
};

const mockExtractionFilterOptions = {
  ...mockFilterOptions,
  rarities: ['Starter', 'Common', 'Uncommon', 'Rare', 'Mythic'],
};

const defaultFilters = {
  rarity: [],
  class: [],
  abilities: [],
  damageType: [],
  includeAIOnly: false,
};

describe('DroneFilterModal', () => {
  // ========================================
  // RENDERING TESTS
  // ========================================
  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );
      expect(screen.getByText(/drone filters/i)).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(
        <DroneFilterModal
          isOpen={false}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );
      expect(screen.queryByText(/drone filters/i)).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );
      // There are two close buttons - X in header and Close text button in footer
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should render Reset All button', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );
      expect(screen.getByRole('button', { name: /reset all/i })).toBeInTheDocument();
    });

    it('should render all filter sections', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      // Check for section labels
      expect(screen.getByText('Rarity')).toBeInTheDocument();
      expect(screen.getByText('Class')).toBeInTheDocument();
      expect(screen.getByText('Abilities')).toBeInTheDocument();
      expect(screen.getByText('Damage Type')).toBeInTheDocument();
    });
  });

  // ========================================
  // RARITY FILTER TESTS
  // ========================================
  describe('Rarity Filter', () => {
    // Helper to find checkbox by its aria-label
    const getCheckboxByAriaLabel = (label) => {
      return screen.getByRole('checkbox', { name: label });
    };

    it('should render all rarity options in standard mode', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
          mode="standalone"
        />
      );

      expect(getCheckboxByAriaLabel('Common')).toBeInTheDocument();
      expect(getCheckboxByAriaLabel('Uncommon')).toBeInTheDocument();
      expect(getCheckboxByAriaLabel('Rare')).toBeInTheDocument();
      expect(getCheckboxByAriaLabel('Mythic')).toBeInTheDocument();
    });

    it('should show Starter rarity option in extraction mode', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockExtractionFilterOptions}
          mode="extraction"
        />
      );

      expect(getCheckboxByAriaLabel('Starter')).toBeInTheDocument();
    });

    it('should NOT show Starter rarity option in standard mode', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
          mode="standalone"
        />
      );

      expect(screen.queryByRole('checkbox', { name: 'Starter' })).not.toBeInTheDocument();
    });

    it('should toggle rarity checkbox on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.click(getCheckboxByAriaLabel('Common'));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rarity: ['Common'],
        })
      );
    });
  });

  // ========================================
  // CLASS FILTER TESTS
  // ========================================
  describe('Class Filter', () => {
    it('should render all class options (1-5)', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByLabelText(/class 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/class 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/class 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/class 4/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/class 5/i)).toBeInTheDocument();
    });

    it('should toggle class checkbox on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.click(screen.getByLabelText(/class 1/i));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          class: [1],
        })
      );
    });

    it('should allow multiple classes to be selected', () => {
      const onFiltersChange = vi.fn();
      const filtersWithClass = { ...defaultFilters, class: [1] };

      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={filtersWithClass}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.click(screen.getByLabelText(/class 3/i));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          class: [1, 3],
        })
      );
    });
  });

  // ========================================
  // ABILITIES FILTER TESTS
  // ========================================
  describe('Abilities Filter', () => {
    it('should show ability dropdown with all available abilities', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      // Click to open abilities dropdown - find by "Select abilities..." text
      const dropdownButton = screen.getByText(/select abilities/i).closest('button');
      fireEvent.click(dropdownButton);

      expect(screen.getByText('Guardian Protocol')).toBeInTheDocument();
      expect(screen.getByText('Hull Repair')).toBeInTheDocument();
    });

    it('should toggle ability on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      // Open dropdown and click ability
      const dropdownButton = screen.getByText(/select abilities/i).closest('button');
      fireEvent.click(dropdownButton);

      // Find and click the ability label
      const abilityLabel = screen.getByText('Guardian Protocol');
      fireEvent.click(abilityLabel);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          abilities: ['Guardian Protocol'],
        })
      );
    });

    it('should show selected count in dropdown button', () => {
      const filtersWithAbilities = { ...defaultFilters, abilities: ['Active', 'Passive'] };

      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={filtersWithAbilities}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByText(/2 abilities selected/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // DAMAGE TYPE FILTER TESTS
  // ========================================
  describe('Damage Type Filter', () => {
    it('should render all damage type options', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByLabelText(/ion/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kinetic/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shield breaker/i)).toBeInTheDocument();
    });

    it('should toggle damage type on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.click(screen.getByLabelText(/kinetic/i));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          damageType: ['Kinetic'],
        })
      );
    });
  });

  // ========================================
  // DEV MODE TOGGLE TESTS
  // ========================================
  describe('Dev Mode Toggle', () => {
    it('should show Include AI Only toggle in dev mode', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
          devMode={true}
        />
      );

      expect(screen.getByLabelText(/include ai only/i)).toBeInTheDocument();
    });

    it('should hide Include AI Only toggle when not in dev mode', () => {
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
          devMode={false}
        />
      );

      expect(screen.queryByLabelText(/include ai only/i)).not.toBeInTheDocument();
    });

    it('should toggle includeAIOnly on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
          devMode={true}
        />
      );

      fireEvent.click(screen.getByLabelText(/include ai only/i));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          includeAIOnly: true,
        })
      );
    });
  });

  // ========================================
  // ACTION BUTTON TESTS
  // ========================================
  describe('Action Buttons', () => {
    it('should call onClose when Close button clicked', () => {
      const onClose = vi.fn();
      render(
        <DroneFilterModal
          isOpen={true}
          onClose={onClose}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      // Find the footer Close button (not the X icon button)
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const footerCloseButton = closeButtons.find(btn => btn.textContent === 'Close');
      fireEvent.click(footerCloseButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should reset all filters when Reset All clicked', () => {
      const onFiltersChange = vi.fn();
      const activeFilters = {
        ...defaultFilters,
        rarity: ['Common'],
        class: [1, 2],
        abilities: ['Active'],
      };

      render(
        <DroneFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={activeFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /reset all/i }));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rarity: [],
          class: [],
          abilities: [],
          damageType: [],
        })
      );
    });
  });
});
