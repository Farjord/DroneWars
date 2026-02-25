// ========================================
// ACTION PHASE BUTTONS COMPONENT
// ========================================
// Button groups shown during deployment/action phases
// Extracted from GameHeader.jsx

import React from 'react';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * ActionPhaseButtons - Renders all action-phase button groups:
 * Pass, Shield Reallocation, Multi-Move, Interception, Single Move, Additional Cost
 */
function ActionPhaseButtons({
  isMyTurn,
  mandatoryAction,
  multiSelectState,
  secondaryTargetingState,
  additionalCostState,
  reallocationPhase,
  passInfo,
  getLocalPlayerId,
  handlePlayerPass,
  handleCancelReallocation,
  handleResetReallocation,
  handleContinueToAddPhase,
  handleConfirmReallocation,
  handleCancelMultiMove,
  handleConfirmMultiMoveDrones,
  interceptionModeActive,
  handleShowInterceptionDialog,
  handleResetInterception,
  handleConfirmInterception,
  handleCancelSecondaryTargeting,
  handleCancelAdditionalCost,
  // Effect chain multi-target props
  effectChainState,
  handleConfirmChainMultiSelect,
  handleCancelEffectChain
}) {
  return (
    <>
      {/* Pass Button - Hide during reallocation */}
      {isMyTurn() && !mandatoryAction && !multiSelectState && !secondaryTargetingState && !additionalCostState && !reallocationPhase && !effectChainState && (
        <button
          onClick={handlePlayerPass}
          disabled={passInfo[`${getLocalPlayerId()}Passed`]}
          className="dw-btn dw-btn-danger dw-btn--sm"
        >
          Pass
        </button>
      )}

      {/* Shield Reallocation Controls - Removing Phase */}
      {reallocationPhase === 'removing' && (
        <>
          <button
            onClick={handleCancelReallocation}
            className="dw-btn dw-btn-danger dw-btn--sm"
          >
            Cancel
          </button>

          <button
            onClick={handleResetReallocation}
            className="dw-btn dw-btn-warning dw-btn--sm"
          >
            Reset
          </button>

          <button
            onClick={handleContinueToAddPhase}
            className="dw-btn dw-btn-confirm dw-btn--sm"
          >
            Continue
          </button>
        </>
      )}

      {/* Shield Reallocation Controls - Adding Phase */}
      {reallocationPhase === 'adding' && (
        <>
          <button
            onClick={handleCancelReallocation}
            className="dw-btn dw-btn-danger dw-btn--sm"
          >
            Cancel
          </button>

          <button
            onClick={handleResetReallocation}
            className="dw-btn dw-btn-warning dw-btn--sm"
          >
            Reset
          </button>

          <button
            onClick={handleConfirmReallocation}
            className="dw-btn dw-btn-confirm dw-btn--sm"
          >
            Confirm
          </button>
        </>
      )}

      {/* MULTI_MOVE Controls */}
      {multiSelectState && (
        <>
          {/* Cancel button - visible for ALL phases */}
          <button
            onClick={handleCancelMultiMove}
            className="dw-btn dw-btn-danger dw-btn--sm"
          >
            Cancel
          </button>

          {/* Confirm button - only during select_drones phase */}
          {multiSelectState.phase === 'select_drones' && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent click from bubbling to game area div
                debugLog('BUTTON_CLICKS', '🖱️ CONFIRM DRONES button clicked', {
                  timestamp: performance.now(),
                  selectedDrones: multiSelectState.selectedDrones.length,
                  sourceLane: multiSelectState.sourceLane
                });
                handleConfirmMultiMoveDrones();
                debugLog('BUTTON_CLICKS', '✅ handleConfirmMultiMoveDrones returned', {
                  timestamp: performance.now()
                });
              }}
              disabled={multiSelectState.selectedDrones.length === 0}
              className="dw-btn dw-btn-confirm dw-btn--sm"
            >
              Confirm Drones
            </button>
          )}
        </>
      )}

      {/* Effect Chain Multi-Target Controls */}
      {effectChainState?.subPhase === 'multi-target' && !multiSelectState && (
        <>
          <button
            onClick={handleCancelEffectChain}
            className="dw-btn dw-btn-danger dw-btn--sm"
          >
            Cancel
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleConfirmChainMultiSelect();
            }}
            disabled={!effectChainState.pendingMultiTargets?.length}
            className="dw-btn dw-btn-confirm dw-btn--sm"
          >
            Confirm Drones
          </button>
        </>
      )}

      {/* Interception Mode Controls */}
      {interceptionModeActive && (
        <>
          <button
            onClick={handleShowInterceptionDialog}
            className="dw-btn dw-btn-confirm dw-btn--sm"
          >
            Show Dialog
          </button>

          <button
            onClick={handleResetInterception}
            className="dw-btn dw-btn-warning dw-btn--sm"
          >
            Reset
          </button>

          <button
            onClick={handleConfirmInterception}
            className="dw-btn dw-btn-confirm dw-btn--sm"
          >
            Confirm
          </button>
        </>
      )}

      {/* Secondary Targeting Mode Controls */}
      {secondaryTargetingState && (
        <button
          onClick={handleCancelSecondaryTargeting}
          className="dw-btn dw-btn-danger dw-btn--sm"
        >
          Cancel
        </button>
      )}

      {/* Additional Cost Mode Controls */}
      {additionalCostState && !multiSelectState && (
        <button
          onClick={handleCancelAdditionalCost}
          className="dw-btn dw-btn-danger dw-btn--sm"
        >
          Cancel
        </button>
      )}
    </>
  );
}

export default ActionPhaseButtons;
