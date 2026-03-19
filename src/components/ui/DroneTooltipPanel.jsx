// ========================================
// DRONE TOOLTIP PANEL
// ========================================
// Slay the Spire-style tooltip toasts that appear on drone hover.
// Contains: buildTooltipItems() utility + DroneTooltipPanel component.
// Visibility is CSS-driven (no React state) via parent :hover selector.

import React from 'react';
import {
  Swords, Move, Shield, Link2, ShieldOff, CirclePause,
  Feather, Anchor, ShieldCheck, RadioTower, Zap,
  ShieldAlert, ZapOff, Anvil, Sparkles, ArrowBigUp,
} from 'lucide-react';
import { NoEntryIcon } from './RightSideIcons.jsx';
import TargetLockIcon from './TargetLockIcon.jsx';
import droneTooltipDescriptions from '../../data/descriptions/droneTooltipDescriptions.js';

// ========================================
// TOOLTIP ITEM BUILDER (pure function)
// ========================================

/** Maps ability type to accent color and icon */
const ABILITY_TYPE_CONFIG = {
  PASSIVE:   { accentColor: 'border-emerald-400', icon: Feather, iconColor: 'text-emerald-400' },
  TRIGGERED: { accentColor: 'border-amber-400',   icon: Sparkles, iconColor: 'text-amber-400' },
  ACTIVE:    { accentColor: 'border-sky-400',      icon: Zap, iconColor: 'text-sky-400' },
};

/** Maps upgrade stat to human-readable label */
const UPGRADE_STAT_LABELS = {
  attack: 'Attack', speed: 'Speed', shields: 'Shields',
  cost: 'Cost', limit: 'Deploy Limit', hull: 'Hull',
};

/** Describes what an upgrade does in a short string */
function describeUpgradeMod(upgrade) {
  const { mod } = upgrade;
  if (mod.stat === 'ability' && mod.abilityToAdd) return `Grants ${mod.abilityToAdd.name}`;
  const label = UPGRADE_STAT_LABELS[mod.stat] || mod.stat;
  const sign = mod.value > 0 ? '+' : '';
  return `${sign}${mod.value} ${label}`;
}

/** Maps damage type string to tooltip key (skipping PIERCING if keyword handles it) */
const DAMAGE_TYPE_MAP = {
  SHIELD_BREAKER: { key: 'shield-breaker', icon: <ShieldAlert size={16} className="text-cyan-400" /> },
  ION: { key: 'ion', icon: <ZapOff size={16} className="text-indigo-400" /> },
  KINETIC: { key: 'kinetic', icon: <Anvil size={16} className="text-orange-500" /> },
};

/**
 * Builds an array of tooltip items from drone state.
 * Pure function — no hooks, no side effects.
 *
 * @param {Object} drone - Live drone state (flags, damageType, triggerUsesMap)
 * @param {Object} effectiveStats - Computed stats with keywords Set
 * @param {Object} baseDrone - Base drone definition from droneData (abilities array)
 * @param {Array} appliedUpgrades - Upgrade records from playerState.appliedUpgrades[droneName]
 * @returns {Array<{ key, icon, label, description, accentColor }>}
 */
export function buildTooltipItems(drone, effectiveStats, baseDrone, appliedUpgrades = []) {
  const items = [];
  const keywords = effectiveStats?.keywords ?? new Set();

  // --- Status effects (temporary) ---
  if (drone.cannotAttack) {
    items.push({
      key: 'cannot-attack',
      icon: <NoEntryIcon baseIcon={<Swords />} size={10} />,
    });
  }
  if (drone.cannotMove) {
    items.push({
      key: 'cannot-move',
      icon: <NoEntryIcon baseIcon={<Move />} size={10} />,
    });
  }
  if (drone.cannotIntercept) {
    items.push({
      key: 'cannot-intercept',
      icon: <NoEntryIcon baseIcon={<Shield />} size={10} />,
    });
  }
  if (drone.isSnared) {
    items.push({
      key: 'snared',
      icon: <Link2 size={16} className="text-orange-400" />,
    });
  }
  if (drone.isSuppressed) {
    items.push({
      key: 'suppressed',
      icon: <ShieldOff size={16} className="text-violet-400" />,
    });
  }
  if (drone.doesNotReady) {
    items.push({
      key: 'does-not-ready',
      icon: <CirclePause size={16} className="text-amber-400" />,
    });
  }

  // --- Traits ---
  if (drone.isMarked) {
    items.push({
      key: 'marked',
      icon: <TargetLockIcon size={16} />,
    });
  }
  if (keywords.has('PASSIVE')) {
    items.push({
      key: 'passive',
      icon: <Feather size={16} className="text-emerald-400" />,
    });
  }
  if (keywords.has('INERT')) {
    items.push({
      key: 'inert',
      icon: <Anchor size={16} className="text-amber-400" />,
    });
  }

  // --- Keywords (permanent) ---
  if (keywords.has('GUARDIAN')) {
    items.push({
      key: 'guardian',
      icon: <ShieldCheck size={16} className="text-sky-400" />,
    });
  }
  if (keywords.has('JAMMER')) {
    items.push({
      key: 'jammer',
      icon: <RadioTower size={16} className="text-purple-400" />,
    });
  }
  if (keywords.has('PIERCING')) {
    items.push({
      key: 'piercing',
      icon: <Zap size={16} className="text-yellow-400" />,
    });
  }

  // --- Abilities (generic) ---
  for (const ability of (baseDrone?.abilities ?? [])) {
    const config = ABILITY_TYPE_CONFIG[ability.type] || ABILITY_TYPE_CONFIG.PASSIVE;
    const IconComponent = config.icon;
    items.push({
      key: `ability-${ability.name.toLowerCase().replace(/\s+/g, '-')}`,
      icon: <IconComponent size={16} className={config.iconColor} />,
      label: ability.name,
      description: ability.description,
      accentColor: config.accentColor,
    });
  }

  // --- Applied upgrades ---
  for (const upgrade of appliedUpgrades) {
    items.push({
      key: `upgrade-${upgrade.instanceId}`,
      icon: <ArrowBigUp size={16} className="text-purple-400" />,
      label: upgrade.cardName || 'Upgrade',
      description: describeUpgradeMod(upgrade),
      accentColor: 'border-purple-500',
    });
  }

  // --- Damage types (skip PIERCING if keyword already added) ---
  const hasPiercingKeyword = keywords.has('PIERCING');
  if (drone.damageType && drone.damageType !== 'PIERCING') {
    const mapping = DAMAGE_TYPE_MAP[drone.damageType];
    if (mapping) {
      items.push({ key: mapping.key, icon: mapping.icon });
    }
  }
  if (drone.damageType === 'PIERCING' && !hasPiercingKeyword) {
    items.push({
      key: 'piercing',
      icon: <Zap size={16} className="text-yellow-400" />,
    });
  }

  // Merge description data into each item (item-level values take precedence)
  return items.map(item => {
    const desc = droneTooltipDescriptions[item.key] || {};
    return {
      ...item,
      label: item.label ?? desc.label ?? item.key,
      description: item.description ?? desc.description ?? '',
      accentColor: item.accentColor ?? desc.accentColor ?? 'border-slate-400',
    };
  });
}

// ========================================
// DRONE TOOLTIP PANEL COMPONENT
// ========================================

/**
 * Renders a vertical stack of individual toast boxes for tooltip display.
 * Visibility is controlled by CSS hover on the parent element.
 *
 * @param {Array} items - Array of tooltip items from buildTooltipItems()
 * @param {'left'|'right'} position - Which side of the token to show toasts
 */
const DroneTooltipPanel = ({ items, position = 'right' }) => {
  if (!items || items.length === 0) return null;

  const positionClasses = position === 'left'
    ? 'right-full mr-2'
    : 'left-full ml-2';

  return (
    <div
      className={`drone-tooltip-container absolute ${positionClasses} top-0 z-[45] pointer-events-none flex flex-col gap-1`}
    >
      {items.map(item => (
        <div
          key={item.key}
          className={`flex items-start gap-2 bg-slate-900/95 border-l-2 ${item.accentColor} rounded px-2 py-1.5 min-w-[180px] max-w-[220px]`}
        >
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
            {item.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold leading-tight">{item.label}</span>
            <span className="text-slate-400 text-[10px] leading-tight">{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ========================================
// TECH TOOLTIP ITEM BUILDER (pure function)
// ========================================

/**
 * Builds tooltip items from a tech definition.
 * Simpler than buildTooltipItems — tech has only abilities, no statuses/keywords/upgrades.
 *
 * @param {Object} techDef - Tech definition from techData (with abilities array)
 * @returns {Array<{ key, icon, label, description, accentColor }>}
 */
export function buildTechTooltipItems(techDef) {
  if (!techDef?.abilities?.length) return [];
  return techDef.abilities.map(ability => {
    const config = ABILITY_TYPE_CONFIG[ability.type] || ABILITY_TYPE_CONFIG.PASSIVE;
    const IconComponent = config.icon;
    return {
      key: `tech-ability-${ability.name.toLowerCase().replace(/\s+/g, '-')}`,
      icon: <IconComponent size={16} className={config.iconColor} />,
      label: ability.name,
      description: ability.description,
      accentColor: config.accentColor,
    };
  });
}

export default DroneTooltipPanel;
