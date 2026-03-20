// ========================================
// PIXEL ROUNDING UTILITIES
// ========================================
// Snaps values to the physical pixel grid to eliminate GPU interpolation blur.
// Fractional pixel positions cause Chromium's compositor to interpolate bitmaps,
// producing blurry text on GPU-promoted layers (transforms, will-change, etc.).

/**
 * Round a CSS pixel value to the nearest physical device pixel.
 * On a 2x display, this snaps to 0.5px increments; on 1x, to whole pixels.
 * @param {number} value - CSS pixel value (potentially fractional)
 * @returns {number} Value snapped to the nearest device pixel boundary
 */
export const roundToDevicePixel = (value) => {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(value * dpr) / dpr;
};
