import { describe, it, expect } from 'vitest';
import {
  generateHexGrid,
  getHexCoordinate,
  getArrowEdgePosition,
  getTierColor,
  GRID_COLS,
  GRID_ROWS
} from '../hexGrid.js';

describe('getHexCoordinate', () => {
  it('maps col/row to letter-number format', () => {
    expect(getHexCoordinate(0, 0)).toBe('A-1');
    expect(getHexCoordinate(7, 3)).toBe('H-4');
    expect(getHexCoordinate(25, 17)).toBe('Z-18');
    expect(getHexCoordinate(15, 7)).toBe('P-8');
  });
});

describe('generateHexGrid', () => {
  const containerWidth = 1200;
  const containerHeight = 800;
  const seed = 42;

  it('returns deterministic output for same seed', () => {
    const a = generateHexGrid(containerWidth, containerHeight, seed, 6, 0);
    const b = generateHexGrid(containerWidth, containerHeight, seed, 6, 0);

    const activeCellsA = a.allCells.filter(c => c.isActive).map(c => c.coordinate);
    const activeCellsB = b.allCells.filter(c => c.isActive).map(c => c.coordinate);
    expect(activeCellsA).toEqual(activeCellsB);
  });

  it('produces correct total cell count', () => {
    const result = generateHexGrid(containerWidth, containerHeight, seed, 6, 0);
    expect(result.allCells).toHaveLength(GRID_COLS * GRID_ROWS);
  });

  it('marks requested number of active cells', () => {
    for (const count of [3, 6, 8]) {
      const result = generateHexGrid(containerWidth, containerHeight, seed, count, 0);
      const activeCells = result.allCells.filter(c => c.isActive);
      expect(activeCells.length).toBeLessThanOrEqual(count);
      expect(activeCells.length).toBeGreaterThan(0);
    }
  });

  it('enforces minimum spacing between active cells', () => {
    const result = generateHexGrid(containerWidth, containerHeight, seed, 6, 0);
    const activeCells = result.allCells.filter(c => c.isActive);

    for (let i = 0; i < activeCells.length; i++) {
      for (let j = i + 1; j < activeCells.length; j++) {
        const colDist = Math.abs(activeCells[i].col - activeCells[j].col);
        const rowDist = Math.abs(activeCells[i].row - activeCells[j].row);
        // At least 3 columns OR 2 rows apart
        expect(colDist >= 3 || rowDist >= 2).toBe(true);
      }
    }
  });

  it('keeps active cells away from edges', () => {
    const result = generateHexGrid(containerWidth, containerHeight, seed, 6, 0);
    const activeCells = result.allCells.filter(c => c.isActive);

    for (const cell of activeCells) {
      expect(cell.col).toBeGreaterThanOrEqual(2);
      expect(cell.col).toBeLessThan(GRID_COLS - 2);
      expect(cell.row).toBeGreaterThanOrEqual(1);
      expect(cell.row).toBeLessThan(GRID_ROWS - 1);
    }
  });

  it('varies placement with different totalDeployments', () => {
    const a = generateHexGrid(containerWidth, containerHeight, seed, 6, 0);
    const b = generateHexGrid(containerWidth, containerHeight, seed, 6, 3);

    const coordsA = a.allCells.filter(c => c.isActive).map(c => c.coordinate);
    const coordsB = b.allCells.filter(c => c.isActive).map(c => c.coordinate);
    expect(coordsA).not.toEqual(coordsB);
  });

  it('returns hex dimensions and offsets', () => {
    const result = generateHexGrid(containerWidth, containerHeight, seed, 6, 0);
    expect(result.hexWidth).toBeGreaterThan(0);
    expect(result.hexHeight).toBeGreaterThan(0);
    expect(typeof result.offsetX).toBe('number');
    expect(typeof result.offsetY).toBe('number');
  });
});

describe('getArrowEdgePosition', () => {
  const w = 1200;
  const h = 800;

  it('places arrow on right edge for angle 0', () => {
    const pos = getArrowEdgePosition(0, w, h);
    // Should be near right edge (x close to w - padding - 12)
    expect(pos.left).toBeGreaterThan(w / 2);
    expect(pos.top).toBeCloseTo(h / 2 - 12, 0);
  });

  it('places arrow on left edge for angle 180', () => {
    const pos = getArrowEdgePosition(180, w, h);
    expect(pos.left).toBeLessThan(w / 2);
  });

  it('places arrow on bottom edge for angle 90', () => {
    const pos = getArrowEdgePosition(90, w, h);
    expect(pos.top).toBeGreaterThan(h / 2);
  });

  it('places arrow on top edge for angle -90', () => {
    const pos = getArrowEdgePosition(-90, w, h);
    expect(pos.top).toBeLessThan(h / 2);
  });
});

describe('getTierColor', () => {
  it('returns a color string for valid tiers', () => {
    for (const tier of [1, 2, 3, 4]) {
      const color = getTierColor(tier);
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('returns fallback for unknown tier', () => {
    expect(getTierColor(99)).toBe('#808080');
  });
});

describe('grid constants', () => {
  it('has expected grid dimensions', () => {
    expect(GRID_COLS).toBe(26);
    expect(GRID_ROWS).toBe(18);
  });
});
