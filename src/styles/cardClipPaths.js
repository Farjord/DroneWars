/**
 * Shared clip-path polygon for all card components (225x275px).
 *
 * Three corners are rounded (~8px radius via 4-point arc approximation
 * at 0/30/60/90 degrees). Bottom-right keeps the 20px chamfer cut.
 */
export const CARD_CLIP_PATH = 'polygon('
  // Top-left rounded corner (clockwise arc)
  + '0px 8px, 1.07px 4px, 4px 1.07px, 8px 0px, '
  // Top-right rounded corner
  + 'calc(100% - 8px) 0px, calc(100% - 4px) 1.07px, calc(100% - 1.07px) 4px, 100% 8px, '
  // Bottom-right chamfer (design feature)
  + '100% calc(100% - 20px), '
  + 'calc(100% - 20px) 100%, '
  // Bottom-left rounded corner (clockwise arc from bottom to left)
  + '8px 100%, 4px calc(100% - 1.07px), 1.07px calc(100% - 4px), 0px calc(100% - 8px)'
  + ')';
