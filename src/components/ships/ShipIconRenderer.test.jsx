// ========================================
// SHIP ICON RENDERER TESTS
// ========================================
// TDD tests for the ShipIconRenderer component.
// This component selects the appropriate ship icon based on shipId,
// applies faction coloring, and handles rotation/positioning.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShipIconRenderer from './ShipIconRenderer.jsx';

describe('ShipIconRenderer', () => {
  describe('Ship icon selection', () => {
    // Test: Renders CorvetteIcon for SHIP_001 (Reconnaissance Corvette)
    it('should render ship icon for SHIP_001', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={0}
            faction="player"
          />
        </svg>
      );
      expect(screen.getByTestId('ship-icon')).toBeInTheDocument();
    });

    // Test: Falls back to default icon for unknown shipId
    it('should render default icon for unknown shipId', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="UNKNOWN_SHIP"
            x={100}
            y={100}
            heading={0}
            faction="player"
          />
        </svg>
      );
      expect(screen.getByTestId('ship-icon')).toBeInTheDocument();
    });

    // Test: Renders with null shipId (uses default)
    it('should use default icon when shipId is null', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId={null}
            x={100}
            y={100}
            heading={0}
            faction="player"
          />
        </svg>
      );
      expect(screen.getByTestId('ship-icon')).toBeInTheDocument();
    });

    // Test: Renders for SHIP_002 (Heavy Assault Carrier - uses Corvette as placeholder)
    it('should render icon for SHIP_002', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_002"
            x={100}
            y={100}
            heading={0}
            faction="player"
          />
        </svg>
      );
      expect(screen.getByTestId('ship-icon')).toBeInTheDocument();
    });

    // Test: Renders for SHIP_003 (Scout - uses Corvette as placeholder)
    it('should render icon for SHIP_003', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_003"
            x={100}
            y={100}
            heading={0}
            faction="player"
          />
        </svg>
      );
      expect(screen.getByTestId('ship-icon')).toBeInTheDocument();
    });
  });

  describe('Faction coloring', () => {
    // Test: Player faction uses blue color
    it('should use blue color for player faction', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={0}
            faction="player"
          />
        </svg>
      );
      const wrapper = screen.getByTestId('ship-icon-wrapper');
      // Check that the data-faction attribute is set correctly
      expect(wrapper).toHaveAttribute('data-faction', 'player');
    });

    // Test: Enemy faction uses red color
    it('should use red color for enemy faction', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={0}
            faction="enemy"
          />
        </svg>
      );
      const wrapper = screen.getByTestId('ship-icon-wrapper');
      expect(wrapper).toHaveAttribute('data-faction', 'enemy');
    });

    // Test: Neutral faction uses white color
    it('should use white color for neutral faction', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={0}
            faction="neutral"
          />
        </svg>
      );
      const wrapper = screen.getByTestId('ship-icon-wrapper');
      expect(wrapper).toHaveAttribute('data-faction', 'neutral');
    });

    // Test: Default to neutral when faction not specified
    it('should default to neutral when faction not specified', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={0}
          />
        </svg>
      );
      const wrapper = screen.getByTestId('ship-icon-wrapper');
      expect(wrapper).toHaveAttribute('data-faction', 'neutral');
    });
  });

  describe('Rotation/heading', () => {
    // Test: Applies rotation transform based on heading
    it('should apply rotation transform matching heading', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={90}
            faction="player"
          />
        </svg>
      );
      const wrapper = screen.getByTestId('ship-icon-wrapper');
      // +180 offset applied for icon orientation: 90 + 180 = 270
      expect(wrapper.style.transform).toContain('rotate(270deg)');
    });

    // Test: Handles negative rotation
    it('should handle negative heading', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={-45}
            faction="player"
          />
        </svg>
      );
      const wrapper = screen.getByTestId('ship-icon-wrapper');
      // +180 offset applied for icon orientation: -45 + 180 = 135
      expect(wrapper.style.transform).toContain('rotate(135deg)');
    });

    // Test: Zero heading (default)
    it('should handle zero heading', () => {
      render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={0}
            faction="player"
          />
        </svg>
      );
      const wrapper = screen.getByTestId('ship-icon-wrapper');
      // +180 offset applied for icon orientation: 0 + 180 = 180
      expect(wrapper.style.transform).toContain('rotate(180deg)');
    });
  });

  describe('Positioning (SVG integration)', () => {
    // Test: Uses foreignObject for HTML-in-SVG rendering
    it('should render inside foreignObject', () => {
      const { container } = render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={150}
            y={200}
            heading={0}
            faction="player"
            size={50}
          />
        </svg>
      );
      const foreignObject = container.querySelector('foreignObject');
      expect(foreignObject).toBeInTheDocument();
    });

    // Test: foreignObject positioned correctly (centered on x, y)
    it('should center foreignObject on provided coordinates', () => {
      const { container } = render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={150}
            y={200}
            heading={0}
            faction="player"
            size={50}
          />
        </svg>
      );
      const foreignObject = container.querySelector('foreignObject');
      // x should be 150 - 25 = 125, y should be 200 - 25 = 175
      expect(foreignObject).toHaveAttribute('x', '125');
      expect(foreignObject).toHaveAttribute('y', '175');
    });

    // Test: Size prop affects dimensions
    it('should apply size to foreignObject dimensions', () => {
      const { container } = render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={0}
            faction="player"
            size={80}
          />
        </svg>
      );
      const foreignObject = container.querySelector('foreignObject');
      expect(foreignObject).toHaveAttribute('width', '80');
      expect(foreignObject).toHaveAttribute('height', '80');
    });

    // Test: Default size is 40
    it('should use default size of 40 when not specified', () => {
      const { container } = render(
        <svg>
          <ShipIconRenderer
            shipId="SHIP_001"
            x={100}
            y={100}
            heading={0}
            faction="player"
          />
        </svg>
      );
      const foreignObject = container.querySelector('foreignObject');
      expect(foreignObject).toHaveAttribute('width', '40');
      expect(foreignObject).toHaveAttribute('height', '40');
    });
  });
});
