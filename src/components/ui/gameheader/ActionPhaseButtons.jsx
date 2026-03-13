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
  // Effect chain props
  effectChainState,
  handleConfirmChainMultiSelect,
  handleConfirmChainTarget,
  handleCancelEffectChain
}) {
  return (
    <>
      {/* Pass Button - Hide during reallocation */}
      {!mandatoryAction && !reallocationPhase && !effectChainState && (
        <button
          onClick={handlePlayerPass}
          disabled={!isMyTurn() || passInfo[`${getLocalPlayerId()}Passed`]}
          className="dw-btn-hud dw-btn--sm"
        >
          Pass
        </button>
      )}

      {/* Shield Reallocation Controls - Removing Phase */}
      {reallocationPhase === 'removing' && (
        <>
          <button
            onClick={handleCancelReallocation}
            className="dw-btn-hud dw-btn--sm"
          >
            Cancel
          </button>

          <button
            onClick={handleResetReallocation}
            className="dw-btn-hud dw-btn-hud-yellow dw-btn--sm"
          >
            Reset
          </button>

          <button
            onClick={handleContinueToAddPhase}
            className="dw-btn-hud dw-btn-hud-cyan dw-btn--sm"
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
            className="dw-btn-hud dw-btn--sm"
          >
            Cancel
          </button>

          <button
            onClick={handleResetReallocation}
            className="dw-btn-hud dw-btn-hud-yellow dw-btn--sm"
          >
            Reset
          </button>

          <button
            onClick={handleConfirmReallocation}
            className="dw-btn-hud dw-btn-hud-cyan dw-btn--sm"
          >
            Confirm
          </button>
        </>
      )}

      {/* Effect Chain Controls — Cancel available for all subPhases */}
      {effectChainState && !effectChainState.complete && (
        <>
          <button
            onClick={handleCancelEffectChain}
            className="dw-btn-hud dw-btn--sm"
          >
            Cancel
          </button>

          {effectChainState.subPhase === 'target' && effectChainState.pendingTarget && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmChainTarget();
              }}
              className="dw-btn-hud dw-btn-hud-cyan dw-btn--sm"
            >
              Confirm
            </button>
          )}

          {effectChainState.subPhase === 'multi-target' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmChainMultiSelect();
              }}
              disabled={!effectChainState.pendingMultiTargets?.length}
              className="dw-btn-hud dw-btn-hud-cyan dw-btn--sm"
            >
              Confirm Drones
            </button>
          )}
        </>
      )}

      {/* Interception Mode Controls */}
      {interceptionModeActive && (
        <>
          <button
            onClick={handleShowInterceptionDialog}
            className="dw-btn-hud dw-btn-hud-cyan dw-btn--sm"
          >
            Show Dialog
          </button>

          <button
            onClick={handleResetInterception}
            className="dw-btn-hud dw-btn-hud-yellow dw-btn--sm"
          >
            Reset
          </button>

          <button
            onClick={handleConfirmInterception}
            className="dw-btn-hud dw-btn-hud-cyan dw-btn--sm"
          >
            Confirm
          </button>
        </>
      )}

    </>
  );
}

export default ActionPhaseButtons;
