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
      <HeaderPanel side="opponent" label="OPPONENT" factionColors={testColors} isFirst={false} hasPassed={false} />
    );
    expect(screen.getByText('OPPONENT')).toBeTruthy();
  });

  it('renders label text correctly for player side', () => {
    render(
      <HeaderPanel side="player" label="PLAYER" factionColors={testColors} isFirst={false} hasPassed={false} />
    );
    expect(screen.getByText('PLAYER')).toBeTruthy();
  });

  it('SVG polygon points are correct for opponent side', () => {
    const { container } = render(
      <HeaderPanel side="opponent" label="OPPONENT" factionColors={testColors} isFirst={false} hasPassed={false} />
    );
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(2);
    expect(polygons[0].getAttribute('points')).toBe('20,0 460,0 460,64 20,64 0,32');
    expect(polygons[1].getAttribute('points')).toBe('20,0 460,0 460,64 20,64 0,32');
  });

  it('SVG polygon points are correct for player side', () => {
    const { container } = render(
      <HeaderPanel side="player" label="PLAYER" factionColors={testColors} isFirst={false} hasPassed={false} />
    );
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(2);
    expect(polygons[0].getAttribute('points')).toBe('0,0 440,0 460,32 440,64 0,64');
    expect(polygons[1].getAttribute('points')).toBe('0,0 440,0 460,32 440,64 0,64');
  });

  it('renders first badge when isFirst is true', () => {
    render(
      <HeaderPanel side="opponent" label="OPPONENT" factionColors={testColors} isFirst={true} hasPassed={false} />
    );
    expect(screen.getByTestId('first-badge')).toBeTruthy();
    expect(screen.getByTestId('first-badge').textContent).toBe('(1st)');
  });

  it('does not render first badge when isFirst is false', () => {
    render(
      <HeaderPanel side="opponent" label="OPPONENT" factionColors={testColors} isFirst={false} hasPassed={false} />
    );
    expect(screen.queryByTestId('first-badge')).toBeNull();
  });

  it('renders passed badge when hasPassed is true', () => {
    render(
      <HeaderPanel side="player" label="PLAYER" factionColors={testColors} isFirst={false} hasPassed={true} />
    );
    expect(screen.getByTestId('passed-badge')).toBeTruthy();
    expect(screen.getByTestId('passed-badge').textContent).toBe('(Passed)');
  });

  it('does not render passed badge when hasPassed is false', () => {
    render(
      <HeaderPanel side="player" label="PLAYER" factionColors={testColors} isFirst={false} hasPassed={false} />
    );
    expect(screen.queryByTestId('passed-badge')).toBeNull();
  });

  it('renders children inside the bar content', () => {
    render(
      <HeaderPanel side="player" label="PLAYER" factionColors={testColors} isFirst={false} hasPassed={false}>
        <div data-testid="child-content">Hello</div>
      </HeaderPanel>
    );
    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});
