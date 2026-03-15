// ========================================
// FACTION COLOUR TOKENS
// ========================================
// Single source of truth for player/opponent colour palettes.
// CSS custom properties in animations.css must stay in sync — see :root block there.

export const FACTION_COLORS = {
  player: {
    primary: '#00D4FF',
    glow: '#00B8FF',
    bright: '#40E8FF',
    accent: '#22d3ee',
    accentLight: '#67e8f9',
    accentMid: '#06b6d4',
    accentDark: '#0891b2',
    bg: 'rgba(11, 46, 66, 0.7)',
    bgDark: 'rgba(6, 26, 40, 0.75)',
  },
  // Opponent palette intentionally omits accentLight/accentMid/accentDark —
  // those shades are only needed for player-side semantic indicators (shields, hull bars).
  // If dynamic `fc[key]` access is needed, guard with a fallback or use FACTION_COLORS.player directly.
  opponent: {
    primary: '#FF2A2A',
    glow: '#FF4444',
    bright: '#FF6666',
    accent: '#ef4444',
    bg: 'rgba(90, 16, 21, 0.7)',
    bgDark: 'rgba(42, 5, 8, 0.75)',
  },
};
