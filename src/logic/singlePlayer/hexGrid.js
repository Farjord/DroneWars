import { mapTiers } from '../../data/mapData';
import { RARITY_COLORS } from '../../data/rarityColors';
import { SeededRandom } from '../../utils/seededRandom.js';

export const GRID_COLS = 26;  // A-Z
export const GRID_ROWS = 18;  // 1-18

/**
 * Convert col/row to coordinate string (e.g., "A-1", "H-4", "P-8")
 */
export const getHexCoordinate = (col, row) => {
  const colLetter = String.fromCharCode(65 + col);
  return `${colLetter}-${row + 1}`;
};

/**
 * Generate hex grid with fixed dimensions and integrated map icons.
 * Grid is always 26x18, hex size scales to fit container.
 * totalDeployments varies positions on each return from tactical map.
 */
export const generateHexGrid = (containerWidth, containerHeight, gameSeed, activeCount = 6, totalDeployments = 0) => {
  const hexWidth = containerWidth / (GRID_COLS + 0.5);
  const hexHeight = hexWidth * 1.1547;
  const verticalSpacing = hexHeight * 0.75;

  const gridWidth = GRID_COLS * hexWidth + hexWidth / 2;
  const gridHeight = (GRID_ROWS - 1) * verticalSpacing + hexHeight;

  const offsetX = (containerWidth - gridWidth) / 2;
  const offsetY = (containerHeight - gridHeight) / 2;

  const centerCol = GRID_COLS / 2;
  const centerRow = GRID_ROWS / 2;

  const allCells = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    const isOddRow = row % 2 === 1;
    const xOffset = isOddRow ? hexWidth / 2 : 0;

    for (let col = 0; col < GRID_COLS; col++) {
      const distanceFromCenter = Math.sqrt(
        Math.pow((col - centerCol) / (GRID_COLS / 2), 2) +
        Math.pow((row - centerRow) / (GRID_ROWS / 2), 2)
      );

      allCells.push({
        col,
        row,
        coordinate: getHexCoordinate(col, row),
        x: offsetX + col * hexWidth + xOffset,
        y: offsetY + row * verticalSpacing,
        isActive: false,
        mapIndex: null,
        distanceFromCenter
      });
    }
  }

  // Avoid edge cells for active maps
  const validCells = allCells.filter(cell =>
    cell.col >= 2 && cell.col < GRID_COLS - 2 &&
    cell.row >= 1 && cell.row < GRID_ROWS - 1
  );

  const tier = 1;
  const tierConfig = mapTiers.find(t => t.tier === tier);
  const gridZone = tierConfig?.gridZone || { minDistance: 0, maxDistance: 1 };

  const zoneCells = validCells.filter(cell =>
    cell.distanceFromCenter >= gridZone.minDistance &&
    cell.distanceFromCenter <= gridZone.maxDistance
  );

  // Seeded random for deterministic placement; totalDeployments varies per session
  const rng = new SeededRandom((gameSeed || 12345) + (totalDeployments * 1000));
  const shuffled = rng.shuffle(zoneCells.length > 0 ? zoneCells : validCells);
  const selected = [];

  for (const cell of shuffled) {
    if (selected.length >= activeCount) break;

    // Ensure minimum 3 columns and 2 rows apart from other active cells
    const tooClose = selected.some(sel =>
      Math.abs(sel.col - cell.col) < 3 && Math.abs(sel.row - cell.row) < 2
    );

    if (!tooClose) {
      cell.isActive = true;
      cell.mapIndex = selected.length;
      selected.push(cell);
    }
  }

  return { allCells, hexWidth, hexHeight, offsetX, offsetY };
};

/**
 * Get tier-based border color mapped through rarity system.
 */
export const getTierColor = (tier) => {
  const tierToRarity = {
    1: 'Common',
    2: 'Uncommon',
    3: 'Rare',
    4: 'Mythic'
  };
  return RARITY_COLORS[tierToRarity[tier]] || '#808080';
};

/**
 * Detect active hex cells that are off-screen given current zoom/pan state.
 * Returns array of { cell, angle, screenX, screenY }.
 */
export const getOffScreenPOIs = (hexGridData, zoom, pan, containerWidth, containerHeight) => {
  if (!hexGridData || zoom <= 1) return [];

  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const padding = 50;
  const offScreen = [];

  hexGridData.allCells.filter(cell => cell.isActive).forEach(cell => {
    const cellCenterX = cell.x + hexGridData.hexWidth / 2;
    const cellCenterY = cell.y + hexGridData.hexHeight / 2;

    // Transform: scale(zoom) translate(pan.x/zoom, pan.y/zoom) with origin at center
    const screenX = (cellCenterX - centerX) * zoom + centerX + pan.x;
    const screenY = (cellCenterY - centerY) * zoom + centerY + pan.y;

    const isOffScreen =
      screenX < -padding ||
      screenX > containerWidth + padding ||
      screenY < -padding ||
      screenY > containerHeight + padding;

    if (isOffScreen) {
      const dx = screenX - centerX;
      const dy = screenY - centerY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      offScreen.push({ cell, angle, screenX, screenY });
    }
  });

  return offScreen;
};

/**
 * Calculate arrow position at screen edge pointing toward off-screen POI.
 */
export const getArrowEdgePosition = (angle, containerWidth, containerHeight) => {
  const radians = angle * (Math.PI / 180);
  const padding = 40;
  const halfW = containerWidth / 2 - padding;
  const halfH = containerHeight / 2 - padding;

  const tanAngle = Math.tan(radians);
  let x, y;

  if (Math.abs(Math.cos(radians)) * halfH > Math.abs(Math.sin(radians)) * halfW) {
    x = Math.cos(radians) > 0 ? halfW : -halfW;
    y = x * tanAngle;
  } else {
    y = Math.sin(radians) > 0 ? halfH : -halfH;
    x = y / tanAngle;
  }

  return {
    left: containerWidth / 2 + x - 12,
    top: containerHeight / 2 + y - 12
  };
};

/**
 * Clamp pan values to keep content visible at given zoom level.
 * Returns { x: 0, y: 0 } when zoom <= 1 (no panning at default zoom).
 */
export const clampPan = (panX, panY, zoomLevel, containerWidth, containerHeight) => {
  if (zoomLevel <= 1) return { x: 0, y: 0 };
  const maxPanX = (containerWidth * (zoomLevel - 1)) / 2;
  const maxPanY = (containerHeight * (zoomLevel - 1)) / 2;
  return {
    x: Math.max(-maxPanX, Math.min(maxPanX, panX)),
    y: Math.max(-maxPanY, Math.min(maxPanY, panY))
  };
};
