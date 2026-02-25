// ========================================
// ACTION PHASE BUTTONS COMPONENT
// ========================================
// Button groups shown during deployment/action phases
// Extracted from GameHeader.jsx

import React from 'react';

/**
 * ActionPhaseButtons - Renders all action-phase button groups:
 * Pass, Shield Reallocation, Multi-Move, Interception, Single Move, Additional Cost
 */
function ActionPhaseButtons({
  isMyTurn,
  mandatoryAction,
  reallocationPhase,
  passInfo,
  getLocalPlayerId,
  handlePlayerPass,
  handleCancelReallocation,
  handleResetReallocation,
  handleContinueToAddPhase,
  handleConfirmReallocation,
  interceptionModeActive,
  handleShowInterceptionDialog,
  handleResetInterception,
  handleConfirmInterception,
  // Effect chain multi-target props
  effectChainState,
  handleConfirmChainMultiSelect,
  handleCancelEffectChain
}) {
  return (
    <>
      {/* Pass Button - Hide during reallocation */}
      {isMyTurn() && !mandatoryAction && !reallocationPhase && !effectChainState && (
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

      {/* Effect Chain Multi-Target Controls */}
      {effectChainState?.subPhase === 'multi-target' && (
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

    </>
  );
}

export default ActionPhaseButtons;
