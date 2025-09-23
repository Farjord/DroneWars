// ========================================
// THEME UTILITIES
// ========================================
// Utilities for accessing CSS custom properties and theme values
// Provides a JavaScript interface to the CSS-based theme system

/**
 * Get a CSS custom property value from the document
 * @param {string} propertyName - The CSS custom property name (with or without --)
 * @returns {string} The property value
 */
export const getCSSCustomProperty = (propertyName) => {
  const name = propertyName.startsWith('--') ? propertyName : `--${propertyName}`;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

/**
 * Set a CSS custom property value on the document
 * @param {string} propertyName - The CSS custom property name (with or without --)
 * @param {string} value - The value to set
 */
export const setCSSCustomProperty = (propertyName, value) => {
  const name = propertyName.startsWith('--') ? propertyName : `--${propertyName}`;
  document.documentElement.style.setProperty(name, value);
};

/**
 * Theme utility object for easy access to theme values
 */
export const theme = {
  colors: {
    background: () => getCSSCustomProperty('color-background'),
    primary: () => getCSSCustomProperty('color-primary'),
    accent: () => getCSSCustomProperty('color-accent'),
    hull: {
      healthy: () => getCSSCustomProperty('color-hull-healthy'),
      damaged: () => getCSSCustomProperty('color-hull-damaged'),
    },
    shields: () => getCSSCustomProperty('color-shields'),
    energy: () => getCSSCustomProperty('color-energy'),
    deployment: () => getCSSCustomProperty('color-deployment'),
  },
  fonts: {
    heading: () => getCSSCustomProperty('font-heading'),
    body: () => getCSSCustomProperty('font-body'),
  },
};

/**
 * Tailwind CSS class mappings that correspond to theme colors
 * These maintain compatibility with existing Tailwind classes
 */
export const tailwindTheme = {
  colors: {
    background: 'bg-slate-950',
    primary: 'text-blue-500',
    accent: 'text-cyan-500',
    hull: {
      healthy: 'bg-green-400',
      damaged: 'bg-red-500',
    },
    shields: 'text-cyan-300',
    energy: 'text-yellow-300',
    deployment: 'text-purple-400',
  },
  fonts: {
    heading: 'font-orbitron',
    body: 'font-exo',
  },
};

export default theme;