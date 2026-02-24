// ========================================
// PHASE STATUS TEXT COMPONENT
// ========================================
// Displays current phase name and contextual status information
// Extracted from GameHeader.jsx

import React from 'react';
import { getPhaseDisplayName } from '../../../logic/phase/phaseDisplayUtils.js';
import { extractDroneNameFromId } from '../../../logic/droneUtils.js';

/**
 * PhaseStatusText - Shows the current phase display name with contextual
 * annotations for shields, discards, multi-move, interception, etc.
 */
function PhaseStatusText({
  turnPhase,
  shieldsToAllocate,
  pendingShieldsRemaining,
  reallocationPhase,
  shieldsToRemove,
  shieldsToAdd,
  mandatoryAction,
  excessCards,
  excessDrones,
  optionalDiscardCount,
  localPlayerEffectiveStats,
  multiSelectState,
  interceptionModeActive,
  singleMoveMode,
  additionalCostState
}) {
  return (
    <h2
      className="text-base font-bold uppercase tracking-widest text-white"
      style={{
        WebkitTextStroke: '1px black'
      }}
    >
      {getPhaseDisplayName(turnPhase)}
      {turnPhase === 'allocateShields' && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          ({pendingShieldsRemaining !== null ? pendingShieldsRemaining : shieldsToAllocate} shields to assign)
        </span>
      )}
      {reallocationPhase === 'removing' && (
        <span className="text-base font-semibold text-orange-300 ml-2">
          ({shieldsToRemove} shields to remove)
        </span>
      )}
      {reallocationPhase === 'adding' && (
        <span className="text-base font-semibold text-green-300 ml-2">
          ({shieldsToAdd} shields to add)
        </span>
      )}
      {(turnPhase === 'mandatoryDiscard' || mandatoryAction?.type === 'discard') && (mandatoryAction?.type === 'discard' || excessCards > 0) && (
        <span className="text-base font-semibold text-orange-300 ml-2">
          ({(mandatoryAction?.count || excessCards)} {(mandatoryAction?.count || excessCards) === 1 ? 'card' : 'cards'} to discard)
        </span>
      )}
      {turnPhase === 'mandatoryDroneRemoval' && (mandatoryAction?.type === 'destroy' || excessDrones > 0) && (
        <span className="text-base font-semibold text-orange-300 ml-2">
          ({(mandatoryAction?.count || excessDrones)} {(mandatoryAction?.count || excessDrones) === 1 ? 'drone' : 'drones'} to remove)
        </span>
      )}
      {turnPhase === 'optionalDiscard' && (
        <span className="text-base font-semibold text-yellow-300 ml-2">
          ({localPlayerEffectiveStats.totals.discardLimit - optionalDiscardCount} {(localPlayerEffectiveStats.totals.discardLimit - optionalDiscardCount) === 1 ? 'card' : 'cards'} to discard)
        </span>
      )}
      {/* MULTI_MOVE Status Text */}
      {multiSelectState?.phase === 'select_source_lane' && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          (Select source lane)
        </span>
      )}
      {multiSelectState?.phase === 'select_drone' && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          (Select drone to move)
        </span>
      )}
      {multiSelectState?.phase === 'select_drones' && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          ({multiSelectState.selectedDrones.length} / {multiSelectState.maxDrones} drones selected)
        </span>
      )}
      {multiSelectState?.phase === 'select_destination_lane' && (
        <span className="text-base font-semibold text-green-300 ml-2">
          (Select destination lane)
        </span>
      )}
      {/* Interception Mode Status Text */}
      {interceptionModeActive && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          (Intercepting - select interceptor)
        </span>
      )}
      {/* Single Move Mode Status Text */}
      {singleMoveMode && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          (Moving {extractDroneNameFromId(singleMoveMode.droneId)} - drag to adjacent lane)
        </span>
      )}
      {/* Additional Cost Mode Status Text */}
      {additionalCostState && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          {additionalCostState.phase === 'select_cost' && `(Select ${additionalCostState.card.additionalCost.description || 'cost'})`}
          {additionalCostState.phase === 'select_cost_movement_destination' && `(Moving ${extractDroneNameFromId(additionalCostState.costSelection.drone.id)} - select destination)`}
          {additionalCostState.phase === 'select_effect' && `(Select target for ${additionalCostState.card.name})`}
        </span>
      )}
    </h2>
  );
}

export default PhaseStatusText;
