/**
 * CardFilterModal.test.jsx
 * TDD tests for the CardFilterModal component
 *
 * CardFilterModal provides a popup interface for filtering cards in DeckBuilder.
 * Supports filtering by: cost range, rarity, type, target, damage type, abilities,
 * and toggle options (hideEnhanced, includeAIOnly).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CardFilterModal from '../CardFilterModal.jsx';

// Mock filter options
const mockFilterOptions = {
  minCost: 0,
  maxCost: 10,
  rarities: ['Common', 'Uncommon', 'Rare', 'Mythic'],
  types: ['Ordnance', 'Tactic', 'Support', 'Upgrade'],
  targets: ['Drone (Any)', 'Drone (Friendly)', 'Drone (Enemy)', 'Lane', 'Ship Section'],
  damageTypes: ['Ion', 'Kinetic', 'Shield Breaker'],
  abilities: ['Draw', 'Go Again', 'Damage', 'Attack Buff', 'Speed Buff'],
};

const mockExtractionFilterOptions = {
  ...mockFilterOptions,
  rarities: ['Starter', 'Common', 'Uncommon', 'Rare', 'Mythic'],
};

const defaultFilters = {
  searchText: '',
  cost: { min: 0, max: 10 },
  rarity: [],
  type: [],
  target: [],
  damageType: [],
  abilities: [],
  hideEnhanced: false,
  includeAIOnly: false,
};

describe('CardFilterModal', () => {
  // ========================================
  // RENDERING TESTS
  // ========================================
  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );
      expect(screen.getByText(/card filters/i)).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(
        <CardFilterModal
          isOpen={false}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );
      expect(screen.queryByText(/card filters/i)).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <CardFilterModal
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
        <CardFilterModal
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
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      // Check for each filter section label
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText(/Cost Range/i)).toBeInTheDocument();
      expect(screen.getByText('Rarity')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Target')).toBeInTheDocument();
      expect(screen.getByText('Damage Type')).toBeInTheDocument();
      expect(screen.getByText('Abilities')).toBeInTheDocument();
    });
  });

  // ========================================
  // RARITY FILTER TESTS
  // ========================================
  describe('Rarity Filter', () => {
    // Helper to find checkbox by its label text
    const getCheckboxByLabel = (text) => {
      const label = screen.getByText(text);
      return label.parentElement.querySelector('input[type="checkbox"]');
    };

    it('should render all rarity options in standard mode', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
          mode="standalone"
        />
      );

      expect(screen.getByText('Common')).toBeInTheDocument();
      expect(screen.getByText('Uncommon')).toBeInTheDocument();
      expect(screen.getByText('Rare')).toBeInTheDocument();
      expect(screen.getByText('Mythic')).toBeInTheDocument();
    });

    it('should show Starter rarity option in extraction mode', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockExtractionFilterOptions}
          mode="extraction"
        />
      );

      expect(screen.getByText('Starter')).toBeInTheDocument();
    });

    it('should NOT show Starter rarity option in standard mode', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
          mode="standalone"
        />
      );

      expect(screen.queryByText('Starter')).not.toBeInTheDocument();
    });

    it('should toggle rarity checkbox on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      const checkbox = getCheckboxByLabel('Common');
      fireEvent.click(checkbox);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rarity: ['Common'],
        })
      );
    });

    it('should uncheck rarity when already selected', () => {
      const onFiltersChange = vi.fn();
      const filtersWithRarity = { ...defaultFilters, rarity: ['Common', 'Rare'] };

      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={filtersWithRarity}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      const checkbox = getCheckboxByLabel('Common');
      fireEvent.click(checkbox);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rarity: ['Rare'], // Common removed
        })
      );
    });

    it('should show rarity checkboxes as checked when selected', () => {
      const filtersWithRarity = { ...defaultFilters, rarity: ['Common', 'Rare'] };

      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={filtersWithRarity}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(getCheckboxByLabel('Common')).toBeChecked();
      expect(getCheckboxByLabel('Rare')).toBeChecked();
      expect(getCheckboxByLabel('Uncommon')).not.toBeChecked();
    });
  });

  // ========================================
  // TYPE FILTER TESTS
  // ========================================
  describe('Type Filter', () => {
    it('should render all type options', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByLabelText(/ordnance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tactic/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/support/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/upgrade/i)).toBeInTheDocument();
    });

    it('should toggle type checkbox on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.click(screen.getByLabelText(/ordnance/i));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ['Ordnance'],
        })
      );
    });
  });

  // ========================================
  // COST RANGE FILTER TESTS
  // ========================================
  describe('Cost Range Filter', () => {
    it('should render cost range sliders', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThanOrEqual(2);
    });

    it('should display current cost range values', () => {
      const filtersWithCost = { ...defaultFilters, cost: { min: 2, max: 8 } };

      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={filtersWithCost}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByText(/2/)).toBeInTheDocument();
      expect(screen.getByText(/8/)).toBeInTheDocument();
    });

    it('should update cost range on slider change', () => {
      const onFiltersChange = vi.fn();
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '3' } });

      expect(onFiltersChange).toHaveBeenCalled();
    });
  });

  // ========================================
  // SEARCH TEXT FILTER TESTS
  // ========================================
  describe('Search Text Filter', () => {
    it('should render search input', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should update search text on input', () => {
      const onFiltersChange = vi.fn();
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/search/i), {
        target: { value: 'laser' },
      });

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          searchText: 'laser',
        })
      );
    });

    it('should display current search text', () => {
      const filtersWithSearch = { ...defaultFilters, searchText: 'blast' };

      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={filtersWithSearch}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByPlaceholderText(/search/i)).toHaveValue('blast');
    });
  });

  // ========================================
  // ABILITIES FILTER TESTS
  // ========================================
  describe('Abilities Filter', () => {
    it('should show ability dropdown with all available abilities', () => {
      render(
        <CardFilterModal
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

      // Check abilities are shown
      expect(screen.getByText('Draw')).toBeInTheDocument();
      expect(screen.getByText('Go Again')).toBeInTheDocument();
    });

    it('should toggle ability on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <CardFilterModal
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

      // Find the Draw checkbox in the dropdown and click it
      const drawLabel = screen.getByText('Draw');
      fireEvent.click(drawLabel);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          abilities: ['Draw'],
        })
      );
    });
  });

  // ========================================
  // TOGGLE FILTER TESTS
  // ========================================
  describe('Toggle Filters', () => {
    it('should render Hide Enhanced checkbox', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByLabelText(/hide enhanced/i)).toBeInTheDocument();
    });

    it('should toggle hideEnhanced on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.click(screen.getByLabelText(/hide enhanced/i));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hideEnhanced: true,
        })
      );
    });

    it('should show Include AI Only toggle only in dev mode', () => {
      render(
        <CardFilterModal
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
        <CardFilterModal
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
        <CardFilterModal
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
        <CardFilterModal
          isOpen={true}
          onClose={onClose}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      // Find the footer Close button (not the X icon button)
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      // The footer button with text "Close" is the second one
      const footerCloseButton = closeButtons.find(btn => btn.textContent === 'Close');
      fireEvent.click(footerCloseButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should reset all filters when Reset All clicked', () => {
      const onFiltersChange = vi.fn();
      const activeFilters = {
        ...defaultFilters,
        rarity: ['Common'],
        type: ['Ordnance'],
        searchText: 'test',
        hideEnhanced: true,
      };

      render(
        <CardFilterModal
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
          searchText: '',
          rarity: [],
          type: [],
          hideEnhanced: false,
        })
      );
    });
  });

  // ========================================
  // DAMAGE TYPE FILTER TESTS
  // ========================================
  describe('Damage Type Filter', () => {
    // Helper to find checkbox by its label text
    const getCheckboxByLabel = (text) => {
      const label = screen.getByText(text);
      return label.parentElement.querySelector('input[type="checkbox"]');
    };

    it('should render all damage type options', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByText('Ion')).toBeInTheDocument();
      expect(screen.getByText('Kinetic')).toBeInTheDocument();
      expect(screen.getByText('Shield Breaker')).toBeInTheDocument();
    });

    it('should toggle damage type on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      const ionCheckbox = getCheckboxByLabel('Ion');
      fireEvent.click(ionCheckbox);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          damageType: ['Ion'],
        })
      );
    });
  });

  // ========================================
  // TARGET FILTER TESTS
  // ========================================
  describe('Target Filter', () => {
    it('should render target options', () => {
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={() => {}}
          filterOptions={mockFilterOptions}
        />
      );

      expect(screen.getByLabelText(/drone \(any\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/lane/i)).toBeInTheDocument();
    });

    it('should toggle target on click', () => {
      const onFiltersChange = vi.fn();
      render(
        <CardFilterModal
          isOpen={true}
          onClose={() => {}}
          filters={defaultFilters}
          onFiltersChange={onFiltersChange}
          filterOptions={mockFilterOptions}
        />
      );

      fireEvent.click(screen.getByLabelText(/drone \(any\)/i));

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: ['Drone (Any)'],
        })
      );
    });
  });
});
