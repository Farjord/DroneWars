// ========================================
// MINE WARNING HOOK
// ========================================
// Detects when a player action (drag/click) would trigger an opponent's mine,
// providing visual glow and audio warning feedback.
//
// Two exports:
//   getThreatenedMines — pure resolver (exported for unit testing)
//   useMineWarning     — React hook (state + sound lifecycle)

import { useEffect, useRef, useMemo } from 'react';
import { TRIGGER_TYPES } from '../logic/triggers/triggerConstants.js';
import fullTechCollection from '../data/techData.js';
import { getLaneOfDrone } from '../logic/utils/gameEngineUtils.js';
import { debugLog } from '../utils/debugLogger.js';
import SoundManager from '../managers/SoundManager.js';

// Maps player action types to the trigger type that would fire
const ACTION_TO_TRIGGER = {
  deployment: TRIGGER_TYPES.ON_LANE_DEPLOYMENT,
  movement: TRIGGER_TYPES.ON_LANE_MOVEMENT_IN,
  attack: TRIGGER_TYPES.ON_LANE_ATTACK,
};

// Pre-index tech definitions by name for O(1) lookup
const techDefByName = Object.fromEntries(
  fullTechCollection.map(t => [t.name, t])
);

/**
 * Pure resolver — given an action type, target lane, and opponent techSlots,
 * returns an array of tech drone IDs that would trigger (i.e. threatened mines).
 *
 * @param {string} actionType - 'deployment' | 'movement' | 'attack'
 * @param {string} targetLaneId - Lane ID to check ('lane1', 'lane2', 'lane3')
 * @param {Object} opponentTechSlots - Opponent's techSlots map { laneId: [techDrone, ...] }
 * @returns {string[]} Array of threatened tech drone IDs
 */
export function getThreatenedMines(actionType, targetLaneId, opponentTechSlots) {
  if (!opponentTechSlots) return [];

  const triggerType = ACTION_TO_TRIGGER[actionType];
  if (!triggerType) return [];

  const laneTechs = opponentTechSlots[targetLaneId];
  if (!laneTechs || laneTechs.length === 0) return [];

  const threatened = [];

  for (const tech of laneTechs) {
    const baseTech = techDefByName[tech.name];
    if (!baseTech) continue;

    // Stage 1 — mine identity: only warn for mines
    if (baseTech.subType !== 'mine') continue;

    // Stage 2 — trigger match: does this mine's trigger fire for the action?
    const ability = baseTech.abilities?.find(
      a => a.type === 'TRIGGERED' && a.trigger === triggerType
    );
    if (!ability) continue;

    // Skip OWN_TURN_ONLY triggers (no current mines use this, but guard for future)
    if (ability.triggerTiming === 'OWN_TURN_ONLY') continue;

    // usesPerRound exhaustion guard
    if (ability.usesPerRound != null) {
      const uses = tech.triggerUsesMap?.[ability.name] ?? tech.triggerUsesThisRound ?? 0;
      if (uses >= ability.usesPerRound) continue;
    }

    // triggerFilter intentionally skipped — UI lacks context for stat-based filters

    threatened.push(tech.id);
  }

  return threatened;
}

/**
 * Detects the current action type and target lane from drag/click state.
 * Returns { actionType, targetLaneId } or nulls when no warning-eligible action is active.
 */
function detectAction(draggedCard, draggedDrone, insertionPreview, selectedDrone, hoveredTarget, turnPhase, localPlayerState) {
  // Deployment: dragging a card with an insertion preview
  if (draggedCard && insertionPreview) {
    return { actionType: 'deployment', targetLaneId: insertionPreview.laneId };
  }

  // Movement: dragging an existing drone to a different lane
  if (draggedDrone && insertionPreview && insertionPreview.laneId !== draggedDrone.sourceLane) {
    return { actionType: 'movement', targetLaneId: insertionPreview.laneId };
  }

  // Attack (drag): dragging a drone over an opponent drone target
  if (draggedDrone && hoveredTarget?.type === 'drone' && hoveredTarget?.isOpponent) {
    return { actionType: 'attack', targetLaneId: draggedDrone.sourceLane };
  }

  // Attack (click): selected drone + hovering an opponent drone during action phase
  if (selectedDrone && hoveredTarget?.type === 'drone' && hoveredTarget?.isOpponent && turnPhase === 'action') {
    const attackerLane = getLaneOfDrone(selectedDrone.id, localPlayerState);
    if (attackerLane) {
      return { actionType: 'attack', targetLaneId: attackerLane };
    }
  }

  return { actionType: null, targetLaneId: null };
}

/**
 * React hook — resolves threatened mines from current UI state and manages
 * warning sound lifecycle.
 *
 * @param {Object} params - All required state from GameBattlefield props
 * @returns {{ warnedMineIds: string[] }}
 */
export default function useMineWarning({
  draggedCard,
  draggedDrone,
  insertionPreview,
  selectedDrone,
  hoveredTarget,
  turnPhase,
  localPlayerState,
  opponentPlayerState,
}) {
  const { actionType, targetLaneId } = detectAction(
    draggedCard, draggedDrone, insertionPreview,
    selectedDrone, hoveredTarget, turnPhase, localPlayerState
  );

  const warnedMineIds = useMemo(() => {
    if (!actionType || !targetLaneId) return [];
    return getThreatenedMines(actionType, targetLaneId, opponentPlayerState?.techSlots);
  }, [actionType, targetLaneId, opponentPlayerState?.techSlots]);

  // Sound lifecycle — play looping warning when mines are threatened
  const isPlayingRef = useRef(false);
  const isWarning = warnedMineIds.length > 0;

  useEffect(() => {
    if (isWarning && !isPlayingRef.current) {
      SoundManager.getInstance().play('mine_warning', { loop: true });
      isPlayingRef.current = true;
      debugLog('MINE_WARNING', `Warning sound started (${actionType} → ${targetLaneId})`, warnedMineIds);
    } else if (!isWarning && isPlayingRef.current) {
      SoundManager.getInstance().stop('mine_warning');
      isPlayingRef.current = false;
      debugLog('MINE_WARNING', 'Warning sound stopped');
    }

    return () => {
      if (isPlayingRef.current) {
        SoundManager.getInstance().stop('mine_warning');
        isPlayingRef.current = false;
      }
    };
  }, [isWarning]);

  return { warnedMineIds };
}
