import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeaderPanel from '../HeaderPanel';

const testColors = {
  primary: '#cc3333',
  glow: 'rgba(200, 50, 50, 0.35)',
  border: 'rgba(200, 50, 50, 0.5)',
  borderStrong: 'rgba(200, 50, 50, 0.65)',
};

describe('HeaderPanel', () => {
  it('renders label text correctly for opponent side', () => {
    render(
      <HeaderPanel side="opponent" label="OPPONENT" factionColors={testColors} />
    );
    expect(screen.getByText('OPPONENT')).toBeTruthy();
  });

  it('renders label text correctly for player side', () => {
    render(
      <HeaderPanel side="player" label="PLAYER" factionColors={testColors} />
    );
    expect(screen.getByText('PLAYER')).toBeTruthy();
  });

  it('uses CSS clipPath trapezoid for opponent side', () => {
    const { container } = render(
      <HeaderPanel side="opponent" label="OPPONENT" factionColors={testColors}>
        <div>KPI</div>
      </HeaderPanel>
    );
    const clippedEls = Array.from(container.querySelectorAll('*')).filter(
      el => el.style.clipPath && el.style.clipPath.includes('polygon')
    );
    expect(clippedEls.length).toBeGreaterThanOrEqual(1);
  });

  it('uses CSS clipPath trapezoid for player side', () => {
    const { container } = render(
      <HeaderPanel side="player" label="PLAYER" factionColors={testColors}>
        <div>KPI</div>
      </HeaderPanel>
    );
    const clippedEls = Array.from(container.querySelectorAll('*')).filter(
      el => el.style.clipPath && el.style.clipPath.includes('polygon')
    );
    expect(clippedEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders children inside the bar content', () => {
    render(
      <HeaderPanel side="player" label="PLAYER" factionColors={testColors}>
        <div data-testid="child-content">Hello</div>
      </HeaderPanel>
    );
    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});
