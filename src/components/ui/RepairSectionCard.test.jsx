/**
 * RepairSectionCard.test.jsx
 * TDD tests for the Repair Bay ship section card component
 *
 * This component displays ship sections in the Repair Bay without
 * requiring a gameEngine instance (unlike ShipSectionCompact).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RepairSectionCard from './RepairSectionCard.jsx';

// Mock component data
const mockComponent = {
  id: 'BRIDGE_001',
  name: 'Standard Command Bridge',
  type: 'Bridge',
  image: '/images/sections/bridge.png',
  stats: { hull: 8 }
};

const mockEmptyProps = {
  component: null,
  hull: { current: 0, max: 0 },
  isDamaged: false,
  isDestroyed: false,
  onRepair: vi.fn(),
  repairCost: 0,
  canAfford: true,
  lane: 'm'
};

const mockHealthyProps = {
  component: mockComponent,
  hull: { current: 8, max: 8 },
  isDamaged: false,
  isDestroyed: false,
  onRepair: vi.fn(),
  repairCost: 0,
  canAfford: true,
  lane: 'm'
};

const mockDamagedProps = {
  component: mockComponent,
  hull: { current: 5, max: 8 },
  isDamaged: true,
  isDestroyed: false,
  onRepair: vi.fn(),
  repairCost: 600,
  canAfford: true,
  lane: 'm'
};

const mockDestroyedProps = {
  component: mockComponent,
  hull: { current: 0, max: 8 },
  isDamaged: true,
  isDestroyed: true,
  onRepair: vi.fn(),
  repairCost: 1600,
  canAfford: true,
  lane: 'm'
};

const mockCannotAffordProps = {
  component: mockComponent,
  hull: { current: 5, max: 8 },
  isDamaged: true,
  isDestroyed: false,
  onRepair: vi.fn(),
  repairCost: 600,
  canAfford: false,
  lane: 'm'
};

describe('RepairSectionCard', () => {
  // ========================================
  // RENDERING TESTS
  // ========================================
  describe('Rendering', () => {
    it('should render component name', () => {
      render(<RepairSectionCard {...mockHealthyProps} />);
      expect(screen.getByText('Standard Command Bridge')).toBeInTheDocument();
    });

    it('should render component type', () => {
      render(<RepairSectionCard {...mockHealthyProps} />);
      expect(screen.getByText('Bridge')).toBeInTheDocument();
    });

    it('should render lane label for left lane', () => {
      render(<RepairSectionCard {...mockHealthyProps} lane="l" />);
      expect(screen.getByText(/left/i)).toBeInTheDocument();
    });

    it('should render lane label for middle lane', () => {
      render(<RepairSectionCard {...mockHealthyProps} lane="m" />);
      expect(screen.getByText(/middle/i)).toBeInTheDocument();
    });

    it('should render lane label for right lane', () => {
      render(<RepairSectionCard {...mockHealthyProps} lane="r" />);
      expect(screen.getByText(/right/i)).toBeInTheDocument();
    });

    it('should render empty state when no component', () => {
      render(<RepairSectionCard {...mockEmptyProps} />);
      expect(screen.getByText(/empty/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // HULL DISPLAY TESTS
  // ========================================
  describe('Hull Display', () => {
    it('should display hull text with current/max values', () => {
      render(<RepairSectionCard {...mockHealthyProps} />);
      expect(screen.getByText('8/8 HP')).toBeInTheDocument();
    });

    it('should display damaged hull values correctly', () => {
      render(<RepairSectionCard {...mockDamagedProps} />);
      expect(screen.getByText('5/8 HP')).toBeInTheDocument();
    });

    it('should display destroyed hull values correctly', () => {
      render(<RepairSectionCard {...mockDestroyedProps} />);
      expect(screen.getByText('0/8 HP')).toBeInTheDocument();
    });

    it('should render hull bar element', () => {
      render(<RepairSectionCard {...mockHealthyProps} />);
      // Hull bar should be present (test by data-testid or class)
      const container = screen.getByText('8/8 HP').closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  // ========================================
  // STATUS INDICATOR TESTS
  // ========================================
  describe('Status Indicators', () => {
    it('should show destroyed indicator when hull is 0', () => {
      render(<RepairSectionCard {...mockDestroyedProps} />);
      expect(screen.getByText(/destroyed/i)).toBeInTheDocument();
    });

    it('should NOT show destroyed indicator when hull > 0', () => {
      render(<RepairSectionCard {...mockDamagedProps} />);
      expect(screen.queryByText(/destroyed/i)).toBeNull();
    });
  });

  // ========================================
  // REPAIR BUTTON TESTS
  // ========================================
  describe('Repair Button', () => {
    it('should show repair button when damaged', () => {
      render(<RepairSectionCard {...mockDamagedProps} />);
      expect(screen.getByRole('button', { name: /repair/i })).toBeInTheDocument();
    });

    it('should NOT show repair button when not damaged', () => {
      render(<RepairSectionCard {...mockHealthyProps} />);
      expect(screen.queryByRole('button', { name: /repair/i })).toBeNull();
    });

    it('should show repair cost on button', () => {
      render(<RepairSectionCard {...mockDamagedProps} />);
      expect(screen.getByText(/600/)).toBeInTheDocument();
    });

    it('should enable repair button when can afford', () => {
      render(<RepairSectionCard {...mockDamagedProps} />);
      const button = screen.getByRole('button', { name: /repair/i });
      expect(button).not.toBeDisabled();
    });

    it('should disable repair button when cannot afford', () => {
      render(<RepairSectionCard {...mockCannotAffordProps} />);
      const button = screen.getByRole('button', { name: /repair/i });
      expect(button).toBeDisabled();
    });

    it('should call onRepair when repair button clicked', () => {
      const onRepair = vi.fn();
      render(<RepairSectionCard {...mockDamagedProps} onRepair={onRepair} />);

      fireEvent.click(screen.getByRole('button', { name: /repair/i }));

      expect(onRepair).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onRepair when button disabled and clicked', () => {
      const onRepair = vi.fn();
      render(<RepairSectionCard {...mockCannotAffordProps} onRepair={onRepair} />);

      const button = screen.getByRole('button', { name: /repair/i });
      fireEvent.click(button);

      expect(onRepair).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // VISUAL STATE TESTS
  // ========================================
  describe('Visual States', () => {
    it('should have healthy visual state when undamaged', () => {
      const { container } = render(<RepairSectionCard {...mockHealthyProps} />);
      // Check for healthy-related class or style
      expect(container.firstChild).not.toHaveClass('repair-section-card--damaged');
      expect(container.firstChild).not.toHaveClass('repair-section-card--destroyed');
    });

    it('should have damaged visual state when damaged', () => {
      const { container } = render(<RepairSectionCard {...mockDamagedProps} />);
      expect(container.firstChild).toHaveClass('repair-section-card--damaged');
    });

    it('should have destroyed visual state when destroyed', () => {
      const { container } = render(<RepairSectionCard {...mockDestroyedProps} />);
      expect(container.firstChild).toHaveClass('repair-section-card--destroyed');
    });
  });

  // ========================================
  // SECTION IMAGE RESOLUTION TESTS
  // ========================================
  describe('Section Image Resolution', () => {
    it('should use sectionImage prop when provided', () => {
      const shipSpecificImage = '/DroneWars/Ships/Corvette/Bridge.png';
      const { container } = render(
        <RepairSectionCard
          {...mockHealthyProps}
          sectionImage={shipSpecificImage}
        />
      );
      const bg = container.querySelector('.repair-section-card__bg');
      expect(bg).toBeInTheDocument();
      expect(bg.style.backgroundImage).toContain('Corvette/Bridge.png');
    });

    it('should fallback to component.image when sectionImage not provided', () => {
      const { container } = render(<RepairSectionCard {...mockHealthyProps} />);
      const bg = container.querySelector('.repair-section-card__bg');
      expect(bg).toBeInTheDocument();
      expect(bg.style.backgroundImage).toContain(mockComponent.image);
    });

    it('should prefer sectionImage over component.image when both provided', () => {
      const shipSpecificImage = '/DroneWars/Ships/Carrier/Power_Cell.png';
      const { container } = render(
        <RepairSectionCard
          {...mockHealthyProps}
          sectionImage={shipSpecificImage}
        />
      );
      const bg = container.querySelector('.repair-section-card__bg');
      expect(bg.style.backgroundImage).toContain('Carrier/Power_Cell.png');
      expect(bg.style.backgroundImage).not.toContain(mockComponent.image);
    });

    it('should handle null sectionImage and use component.image', () => {
      const { container } = render(
        <RepairSectionCard
          {...mockHealthyProps}
          sectionImage={null}
        />
      );
      const bg = container.querySelector('.repair-section-card__bg');
      expect(bg).toBeInTheDocument();
      expect(bg.style.backgroundImage).toContain(mockComponent.image);
    });
  });
});
