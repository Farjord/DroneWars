import { RARITY_COLORS } from '../data/rarityColors';

const STARTER_COLOR = '#06b6d4';
const DEFAULT_RARITY_COLOR = '#808080';

export const getTypeBackgroundClass = (type) => {
  switch (type) {
    case 'Ordnance':
      return 'bg-red-900/10';
    case 'Tactic':
      return 'bg-cyan-900/10';
    case 'Support':
      return 'bg-emerald-900/10';
    case 'Upgrade':
      return 'bg-purple-900/10';
    default:
      return '';
  }
};

export const getTypeTextClass = (type) => {
  switch (type) {
    case 'Ordnance':
      return 'text-red-400';
    case 'Tactic':
      return 'text-cyan-400';
    case 'Support':
      return 'text-emerald-400';
    case 'Upgrade':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
};

// Returns { text, color } for rarity display, handling extraction mode's "Starter" variant
export const getRarityDisplay = (item, mode) => {
  if (mode === 'extraction' && item.isStarterPool) {
    return { text: 'Starter', color: STARTER_COLOR };
  }
  return { text: item.rarity, color: RARITY_COLORS[item.rarity] || DEFAULT_RARITY_COLOR };
};
