// ========================================
// ACTION CARD TOOLTIP PANEL
// ========================================
// Tooltip toasts that appear on action card hover in the hand.
// Contains: buildActionCardTooltipItems() utility + ActionCardTooltipPanel component.
// Visibility is React-state-driven (.visible class toggle) via HandView's hoveredCardId.

import React from 'react';
import {
  AlertTriangle, RotateCcw, Zap, Map, TrendingUp,
} from 'lucide-react';
import actionCardTooltipDescriptions from '../../data/descriptions/actionCardTooltipDescriptions.js';

/** Effective rendered width of the tooltip panel: max-w-[368px] * scale(0.8) + ml-1(4px) */
export const TOOLTIP_EFFECTIVE_WIDTH = 368 * 0.8 + 4;

// ========================================
// REASON STRING -> TOOLTIP KEY MAPPING
// ========================================

/** Maps reason strings from getUnplayableReasons() to tooltip keys */
const REASON_TO_KEY = {
  'Not your turn': 'not-your-turn',
  'You have passed': 'player-passed',
  'No valid targets': 'no-valid-targets',
  'Lane control requirement not met': 'lane-control-not-met',
  'Play condition not met': 'play-condition-not-met',
  'Not in the Action Phase': 'wrong-phase',
};

/** Maps reason strings that start with a prefix (partial matches) */
const REASON_PREFIX_TO_KEY = [
  { prefix: 'Not enough energy', key: 'not-enough-energy' },
  { prefix: 'Not enough momentum', key: 'not-enough-momentum' },
];

/** Warning icon lookup by tooltip key (keys not listed fall back to AlertTriangle) */
const WARNING_ICONS = {
  'not-enough-energy': <Zap size={18} className="text-amber-400" />,
  'not-enough-momentum': <TrendingUp size={18} className="text-amber-400" />,
  'lane-control-not-met': <Map size={18} className="text-amber-400" />,
};

const DEFAULT_WARNING_ICON = <AlertTriangle size={18} className="text-amber-400" />;

/** Property icon lookup by tooltip key */
const PROPERTY_ICONS = {
  'go-again': <RotateCcw size={18} className="text-cyan-400" />,
  'momentum-cost': <TrendingUp size={18} className="text-blue-400" />,
  'lanes-controlled': <Map size={18} className="text-cyan-400" />,
  'momentum-bonus': <TrendingUp size={18} className="text-blue-400" />,
};

// ========================================
// TOOLTIP ITEM BUILDER (pure function)
// ========================================

/**
 * Resolves a reason string to a tooltip key.
 * Tries exact match first, then prefix match.
 */
function resolveReasonKey(reason) {
  if (REASON_TO_KEY[reason]) return REASON_TO_KEY[reason];
  for (const { prefix, key } of REASON_PREFIX_TO_KEY) {
    if (reason.startsWith(prefix)) return key;
  }
  return null;
}

/** Creates a tooltip item from a key and icon lookup map, returning null if the key has no description. */
function createTooltipItem(key, iconMap, fallbackIcon) {
  const desc = actionCardTooltipDescriptions[key];
  if (!desc) return null;
  return {
    key,
    icon: iconMap[key] || fallbackIcon,
    label: desc.label,
    description: desc.description,
    accentColor: desc.accentColor,
  };
}

/**
 * Builds an array of tooltip items from action card state.
 * Pure function — no hooks, no side effects.
 *
 * @param {Object} card - The action card definition
 * @param {string[]} unplayableReasons - Reason strings from getUnplayableReasons()
 * @param {Object} contextData - { lanesControlled, actionsTakenThisTurn }
 * @returns {Array<{ key, icon, label, description, accentColor }>}
 */
export function buildActionCardTooltipItems(card, unplayableReasons = [], contextData = {}) {
  const warningItems = [];
  const propertyItems = [];

  // --- Warning items from unplayable reasons ---
  for (const reason of unplayableReasons) {
    const key = resolveReasonKey(reason);
    if (!key) continue;
    const item = createTooltipItem(key, WARNING_ICONS, DEFAULT_WARNING_ICON);
    if (item) warningItems.push(item);
  }

  // --- Property items from card data ---
  const firstEffect = card.effects?.[0];

  if (firstEffect?.goAgain) {
    propertyItems.push(createTooltipItem('go-again', PROPERTY_ICONS));
  }

  if (card.momentumCost) {
    propertyItems.push(createTooltipItem('momentum-cost', PROPERTY_ICONS));
  }

  if (firstEffect?.repeat?.type === 'LANES_CONTROLLED') {
    propertyItems.push(createTooltipItem('lanes-controlled', PROPERTY_ICONS));
  }

  // Momentum bonus: only show when bonus is active (not first action)
  const hasMomentumConditional = firstEffect?.conditionals?.some(
    c => c.condition?.type === 'NOT_FIRST_ACTION'
  );
  if (hasMomentumConditional && (contextData.actionsTakenThisTurn ?? 0) >= 1) {
    propertyItems.push(createTooltipItem('momentum-bonus', PROPERTY_ICONS));
  }

  return [...warningItems, ...propertyItems];
}

// ========================================
// ACTION CARD TOOLTIP PANEL COMPONENT
// ========================================

/**
 * Renders a vertical stack of individual toast boxes for action card tooltips.
 * Visibility is controlled by React state (.visible class toggle).
 *
 * @param {Array} items - Array of tooltip items from buildActionCardTooltipItems()
 * @param {'left'|'right'} position - Which side of the card to render the tooltip
 * @param {boolean} visible - Whether the tooltip panel is visible
 */
function ActionCardTooltipPanel({ items, position = 'right', visible = false }) {
  if (!items || items.length === 0) return null;

  const isLeft = position === 'left';

  return (
    <div
      className={`action-card-tooltip-container absolute ${isLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 z-[45] pointer-events-none flex flex-col gap-1${visible ? ' visible' : ''}`}
      style={{
        transform: 'scale(0.8) translateZ(0)',
        transformOrigin: isLeft ? 'top right' : 'top left',
        backfaceVisibility: 'hidden',
      }}
    >
      {items.map(item => (
        <div
          key={item.key}
          className={`flex items-start gap-2 bg-slate-900 border-l-2 ${item.accentColor} rounded px-3.5 py-2.5 min-w-[300px] max-w-[368px]`}
        >
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mt-0.5">
            {item.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-white text-base font-bold leading-tight">{item.label}</span>
            <span className="text-slate-400 text-sm leading-tight">{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActionCardTooltipPanel;
