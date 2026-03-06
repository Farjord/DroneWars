import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShipHexPortrait from '../ShipHexPortrait';

const defaultColors = {
  primary: '#06b6d4',
  border: 'rgba(6, 182, 212, 0.4)',
  borderStrong: 'rgba(6, 182, 212, 0.7)',
};

describe('ShipHexPortrait', () => {
  it('renders ship image with correct src', () => {
    const { container } = render(
      <ShipHexPortrait
        side="player"
        shipImageUrl="/ships/corvette.png"
        factionColors={defaultColors}
      />
    );
    const image = container.querySelector('image');
    expect(image).toBeTruthy();
    expect(image.getAttribute('href')).toBe('/ships/corvette.png');
  });

  it('fires onClick when isClickable is true', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ShipHexPortrait
        side="player"
        shipImageUrl="/ships/corvette.png"
        isClickable={true}
        onClick={handleClick}
        factionColors={defaultColors}
      />
    );
    fireEvent.click(container.firstChild);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when isClickable is false', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ShipHexPortrait
        side="opponent"
        shipImageUrl="/ships/enemy.png"
        isClickable={false}
        onClick={handleClick}
        factionColors={defaultColors}
      />
    );
    fireEvent.click(container.firstChild);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders cog badge only when isClickable is true', () => {
    const { container, rerender } = render(
      <ShipHexPortrait
        side="player"
        shipImageUrl="/ships/corvette.png"
        isClickable={true}
        factionColors={defaultColors}
      />
    );
    expect(container.querySelector('[data-testid="cog-badge"]')).toBeTruthy();

    rerender(
      <ShipHexPortrait
        side="opponent"
        shipImageUrl="/ships/enemy.png"
        isClickable={false}
        factionColors={defaultColors}
      />
    );
    expect(container.querySelector('[data-testid="cog-badge"]')).toBeNull();
  });

  it('renders children when provided', () => {
    render(
      <ShipHexPortrait
        side="player"
        shipImageUrl="/ships/corvette.png"
        factionColors={defaultColors}
      >
        <div data-testid="child-dropdown">Dropdown</div>
      </ShipHexPortrait>
    );
    expect(screen.getByTestId('child-dropdown')).toBeTruthy();
  });

  it('applies greyscale filter to ship image when hasPassed is true', () => {
    const { container } = render(
      <ShipHexPortrait
        side="player"
        shipImageUrl="/ships/corvette.png"
        factionColors={defaultColors}
        hasPassed={true}
      />
    );
    const image = container.querySelector('image');
    expect(image.getAttribute('filter')).toBe('url(#greyscale-player)');
    const filter = container.querySelector('#greyscale-player');
    expect(filter).toBeTruthy();
    const colorMatrix = filter.querySelector('feColorMatrix');
    expect(colorMatrix.getAttribute('type')).toBe('saturate');
    expect(colorMatrix.getAttribute('values')).toBe('0');
  });

  it('applies pulsing glow animation when isActiveTurn is true', () => {
    const { container } = render(
      <ShipHexPortrait
        side="opponent"
        shipImageUrl="/ships/enemy.png"
        factionColors={defaultColors}
        isActiveTurn={true}
      />
    );
    const style = container.querySelector('style');
    expect(style).toBeTruthy();
    expect(style.textContent).toContain('hex-pulse-opponent');
    expect(style.textContent).toContain('drop-shadow');
    const svg = container.querySelector('[data-testid="hex-svg"]');
    expect(svg.style.animation).toContain('hex-pulse-opponent');
  });

  it('has no visual effects when both isActiveTurn and hasPassed are false', () => {
    const { container } = render(
      <ShipHexPortrait
        side="player"
        shipImageUrl="/ships/corvette.png"
        factionColors={defaultColors}
        isActiveTurn={false}
        hasPassed={false}
      />
    );
    const style = container.querySelector('style');
    expect(style).toBeNull();
    const image = container.querySelector('image');
    expect(image.getAttribute('filter')).toBeNull();
    const svg = container.querySelector('[data-testid="hex-svg"]');
    expect(svg.style.animation).toBe('');
  });
});
