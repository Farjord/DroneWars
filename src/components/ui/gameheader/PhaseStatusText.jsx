// ========================================
// PHASE STATUS TEXT COMPONENT
// ========================================
// Displays current phase name and contextual status information
// Extracted from GameHeader.jsx

import React from 'react';
import { getPhaseDisplayName } from '../../../logic/phase/phaseDisplayUtils.js';

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
  interceptionModeActive,
  effectChainState
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
      {/* Interception Mode Status Text */}
      {interceptionModeActive && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          (Intercepting - select interceptor)
        </span>
      )}
      {/* Effect Chain Status Text */}
      {effectChainState && !effectChainState.complete && (
        <span className="text-base font-semibold text-cyan-300 ml-2">
          {effectChainState.prompt
            ? `(${effectChainState.prompt})`
            : effectChainState.subPhase === 'multi-target'
              ? `(${effectChainState.pendingMultiTargets?.length || 0} drones selected)`
              : effectChainState.subPhase === 'destination'
                ? '(Select destination lane)'
                : `(Step ${effectChainState.currentIndex + 1} of ${effectChainState.effects.length})`
          }
        </span>
      )}
    </h2>
  );
}

export default PhaseStatusText;
