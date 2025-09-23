// ========================================
// ICON MAPPING FOR UI COMPONENTS
// ========================================
// Centralized mapping of icon names to Lucide React icon components
// Allows for easy icon lookup and usage throughout the application

import {
  Shield,
  Bolt,
  Wrench,
  Sprout,
  Hand,
  ShipWheel,
  Settings,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sword,
  Search,
  Gavel,
  Bomb,
  Rocket,
  Skull,
  Bug,
  Cpu,
  Target,
  View,
  Zap,
  Heart,
  ChevronUp,
  ChevronDown,
  Loader2
} from 'lucide-react';

/**
 * Icon mapping object for easy access to Lucide React icons
 * Usage: iconMap.Shield, iconMap.Bolt, etc.
 */
export const iconMap = {
  Shield,
  Bolt,
  Wrench,
  Sprout,
  Hand,
  ShipWheel,
  Settings,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sword,
  Search,
  Gavel,
  Bomb,
  Rocket,
  Skull,
  Bug,
  Cpu,
  Target,
  View,
  Zap,
  Heart,
  ChevronUp,
  ChevronDown,
  Loader2
};

/**
 * Get an icon component by name
 * @param {string} iconName - The name of the icon
 * @returns {React.Component|null} The icon component or null if not found
 */
export const getIcon = (iconName) => {
  return iconMap[iconName] || null;
};

/**
 * Get all available icon names
 * @returns {string[]} Array of available icon names
 */
export const getAvailableIcons = () => {
  return Object.keys(iconMap);
};

export default iconMap;