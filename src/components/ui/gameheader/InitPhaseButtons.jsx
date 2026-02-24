// ========================================
// INIT PHASE BUTTONS COMPONENT
// ========================================
// Button groups shown during initialisation phases
// (shield allocation, optional/mandatory discard, drone removal)
// Extracted from GameHeader.jsx

import React from 'react';

/**
 * InitPhaseButtons - Renders buttons for initialisation-phase actions:
 * Shield Allocation, Optional Discard, Mandatory Discard, Mandatory Drone Removal
 */
function InitPhaseButtons({
  turnPhase,
  excessCards,
  excessDrones,
  handleResetShields,
  handleConfirmShields,
  handleRoundStartDraw,
  handleMandatoryDiscardContinue,
  handleMandatoryDroneRemovalContinue
}) {
  return (
    <>
      {/* Shield Allocation Controls - Show during allocateShields phase */}
      {turnPhase === 'allocateShields' && (
        <>
          <button
            onClick={handleResetShields}
            className="dw-btn dw-btn-warning dw-btn--sm"
          >
            Reset
          </button>

          <button
            onClick={handleConfirmShields}
            className="dw-btn dw-btn-confirm dw-btn--sm"
          >
            Confirm
          </button>
        </>
      )}

      {/* Optional Discard Controls - Show during optionalDiscard phase */}
      {turnPhase === 'optionalDiscard' && (
        <button
          onClick={handleRoundStartDraw}
          className="dw-btn dw-btn-confirm dw-btn--sm"
        >
          Confirm
        </button>
      )}

      {/* Mandatory Discard Controls - Show during mandatoryDiscard phase */}
      {turnPhase === 'mandatoryDiscard' && (
        <button
          onClick={handleMandatoryDiscardContinue}
          disabled={excessCards > 0}
          className="dw-btn dw-btn-confirm dw-btn--sm"
        >
          Continue
        </button>
      )}

      {/* Mandatory Drone Removal Controls - Show during mandatoryDroneRemoval phase */}
      {turnPhase === 'mandatoryDroneRemoval' && (
        <button
          onClick={handleMandatoryDroneRemovalContinue}
          disabled={excessDrones > 0}
          className="dw-btn dw-btn-confirm dw-btn--sm"
        >
          Continue
        </button>
      )}
    </>
  );
}

export default InitPhaseButtons;
