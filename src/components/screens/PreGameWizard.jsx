// ========================================
// PRE-GAME WIZARD
// ========================================
// Local wizard that manages client-side progression through the two
// pre-game setup steps: deck selection → drone selection.
// The server stays in a single 'preGameSetup' phase; this component
// handles which screen to show based on local step progression.

import React, { useState } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import DeckSelectionScreen from './DeckSelectionScreen.jsx';
import DroneSelectionScreen from './DroneSelectionScreen.jsx';
import WaitingForOpponentScreen from './WaitingForOpponentScreen.jsx';
import { debugLog } from '../../utils/debugLogger.js';

const STEPS = ['deckSelection', 'droneSelection'];

function PreGameWizard() {
  const [localStepIndex, setLocalStepIndex] = useState(0);
  const { isMultiplayer } = useGameState();

  const handleStepComplete = () => {
    const nextIndex = localStepIndex + 1;
    debugLog('PHASE_TRANSITIONS', `PreGameWizard: Step ${STEPS[localStepIndex]} complete, advancing to index ${nextIndex}`);
    setLocalStepIndex(nextIndex);
  };

  // All 3 steps done — show waiting screen in multiplayer, or nothing
  // (server will transition to roundInitialization when both players finish)
  if (localStepIndex >= STEPS.length) {
    if (isMultiplayer()) {
      return <WaitingForOpponentScreen phase="placement" localPlayerStatus="All selections submitted. Waiting for game to start..." />;
    }
    // Single-player: server processes AI instantly, so this is a brief flash at most
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-3xl font-bold text-white mb-4">Game Starting...</h2>
          <p className="text-gray-400 text-lg">Preparing the battlefield</p>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[localStepIndex];

  switch (currentStep) {
    case 'deckSelection':
      return <DeckSelectionScreen onStepComplete={handleStepComplete} />;
    case 'droneSelection':
      return <DroneSelectionScreen onStepComplete={handleStepComplete} />;
    default:
      return null;
  }
}

export default PreGameWizard;
