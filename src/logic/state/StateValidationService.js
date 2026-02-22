// ========================================
// STATE VALIDATION SERVICE
// ========================================
// Validates state updates for consistency, race conditions,
// ownership boundaries, and architecture violations.
// Extracted from GameStateManager — receives GSM via constructor injection.

import { debugLog } from '../../utils/debugLogger.js';

class StateValidationService {
  constructor(gsm) {
    this.gsm = gsm;
  }

  // --- Core Orchestrator ---

  validateStateUpdate(updates, prevState, context = null) {
    const stack = new Error().stack;
    const isFromActionProcessor = this.gsm._updateContext === 'ActionProcessor' || (stack && stack.includes('ActionProcessor'));

    // Check for concurrent action processing — only warn about external updates
    if (this.gsm.actionProcessor.isActionInProgress() && Object.keys(updates).length > 0) {
      if (!isFromActionProcessor) {
        const dangerousUpdates = ['player1', 'player2', 'turnPhase', 'currentPlayer'];
        const hasDangerousUpdate = dangerousUpdates.some(key => key in updates);

        const isFromGameFlowManager = this.gsm._updateContext === 'GameFlowManager' || (stack && stack.includes('GameFlowManager'));
        const isPhaseTransition = context === 'phaseTransition' || (updates.turnPhase && isFromGameFlowManager);
        const isLegitimateManagerUpdate = isPhaseTransition && isFromGameFlowManager;

        if (hasDangerousUpdate && !isLegitimateManagerUpdate) {
          debugLog('VALIDATION', '⚠️ Race condition detected: External state update during action processing', {
            updates: Object.keys(updates),
            actionInProgress: true,
            queueLength: this.gsm.actionProcessor.getQueueLength(),
            context: context,
            isFromGameFlowManager: isFromGameFlowManager,
            isPhaseTransition: isPhaseTransition,
            stack: stack?.split('\n').slice(0, 5)
          });
        }
      }
    }

    // Check for ActionProcessor bypass during active gameplay phases
    this.validateActionProcessorUsage(updates, prevState, isFromActionProcessor, stack);

    // Validate player state consistency
    if (updates.player1 || updates.player2) {
      this.validatePlayerStates(updates.player1 || prevState.player1, updates.player2 || prevState.player2);
    }

    // Validate turn phase transitions
    if (updates.turnPhase && updates.turnPhase !== prevState.turnPhase) {
      this.validateTurnPhaseTransition(prevState.turnPhase, updates.turnPhase);
    }
  }

  // --- Player State Validation ---

  validatePlayerStates(player1, player2) {
    if (!player1 || !player2) return;

    const validatePlayerValues = (player, playerId) => {
      if (!player) return;
      if (typeof player.energy === 'number' && player.energy < 0) {
        debugLog('VALIDATION', `🚨 Invalid state: ${playerId} has negative energy: ${player.energy}`);
      }
      if (typeof player.deploymentBudget === 'number' && player.deploymentBudget < 0) {
        debugLog('VALIDATION', `🚨 Invalid state: ${playerId} has negative deployment budget: ${player.deploymentBudget}`);
      }
    };

    validatePlayerValues(player1, 'player1');
    validatePlayerValues(player2, 'player2');

    // Check for duplicate drone IDs
    const allDroneIds = new Set();
    [player1, player2].forEach((player, playerIndex) => {
      if (player?.dronesOnBoard) {
        Object.values(player.dronesOnBoard).forEach(lane => {
          lane.forEach(drone => {
            if (allDroneIds.has(drone.id)) {
              debugLog('VALIDATION', `🚨 Duplicate drone ID detected: ${drone.id} in player${playerIndex + 1}`);
            }
            allDroneIds.add(drone.id);
          });
        });
      }
    });
  }

  // --- Phase Transition Validation ---

  validateTurnPhaseTransition(fromPhase, toPhase) {
    if (this.gsm.state.testMode) {
      return;
    }

    const validTransitions = {
      null: ['deckSelection', 'preGame', 'roundInitialization'],
      'preGame': ['deckSelection', 'droneSelection'],
      'deckSelection': ['droneSelection'],
      'droneSelection': ['placement'],
      'placement': ['gameInitializing', 'roundInitialization', 'roundAnnouncement'],
      'gameInitializing': ['determineFirstPlayer'],
      'roundInitialization': ['mandatoryDiscard', 'optionalDiscard', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'roundAnnouncement': ['roundInitialization', 'deployment'],
      'energyReset': ['mandatoryDiscard', 'optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'initialDraw': ['mandatoryDiscard', 'optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'mandatoryDiscard': ['optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'optionalDiscard': ['draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'draw': ['allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'determineFirstPlayer': ['energyReset'],
      'allocateShields': ['mandatoryDroneRemoval', 'deployment'],
      'mandatoryDroneRemoval': ['deployment'],
      'deployment': ['action', 'roundEnd'],
      'action': ['deployment', 'roundEnd', 'determineFirstPlayer', 'gameEnd', 'actionComplete'],
      'actionComplete': ['roundAnnouncement'],
      'roundEnd': ['determineFirstPlayer', 'deployment', 'gameEnd'],
      'gameEnd': []
    };

    if (!validTransitions[fromPhase]?.includes(toPhase)) {
      debugLog('VALIDATION', `⚠️ Invalid turn phase transition: ${fromPhase} -> ${toPhase}`);
    }
  }

  // --- ActionProcessor Usage Validation ---

  validateActionProcessorUsage(updates, prevState, isFromActionProcessor, stack) {
    if (isFromActionProcessor) {
      return;
    }

    if (this.isInitializationPhase(prevState.turnPhase)) {
      return;
    }

    debugLog('STATE_SYNC', '🔍 Checking automatic phase flag:', {
      hasGameFlowManager: !!this.gsm.gameFlowManager,
      isProcessingAutomaticPhase: this.gsm.gameFlowManager?.isProcessingAutomaticPhase,
      currentPhase: prevState.turnPhase,
      updatingFields: Object.keys(updates)
    });

    if (this.gsm.gameFlowManager && this.gsm.gameFlowManager.isProcessingAutomaticPhase) {
      debugLog('STATE_SYNC', '✅ Skipping validation - automatic phase processing active');
      return;
    }

    const simultaneousPhases = ['droneSelection', 'deckSelection', 'placement', 'gameInitializing', 'mandatoryDiscard', 'allocateShields', 'mandatoryDroneRemoval'];
    if (simultaneousPhases.includes(prevState.turnPhase)) {
      return;
    }

    const automaticPhases = ['energyReset', 'draw', 'determineFirstPlayer', 'roundInitialization'];
    if (automaticPhases.includes(prevState.turnPhase) || automaticPhases.includes(updates.turnPhase)) {
      return;
    }

    const criticalGameStateUpdates = [
      'player1', 'player2', 'currentPlayer', 'turnPhase', 'turn',
      'passInfo', 'winner', 'firstPlayerOfRound', 'firstPasserOfPreviousRound'
    ];

    const allowedUIStateUpdates = [
      'gameLog', 'shieldsToAllocate', 'placedSections', 'opponentPlacedSections',
      'unplacedSections', 'droneSelectionPool', 'droneSelectionTrio'
    ];

    const criticalUpdates = Object.keys(updates).filter(key =>
      criticalGameStateUpdates.includes(key)
    );

    const allowedUpdates = Object.keys(updates).filter(key =>
      allowedUIStateUpdates.includes(key)
    );

    const isGameFlowManagerUpdate = this.gsm._updateContext === 'GameFlowManager' || (stack && stack.includes('GameFlowManager'));
    const isAutomaticPhaseUpdate = ['energyReset', 'draw', 'determineFirstPlayer'].includes(prevState.turnPhase) ||
                                    ['deployment', 'action'].includes(prevState.turnPhase);
    const isPlayerStateUpdate = criticalUpdates.every(update =>
      ['player1', 'player2'].includes(update)
    );

    const isPhaseTransitionUpdate = criticalUpdates.every(update =>
      ['turnPhase', 'gameStage', 'roundNumber', 'turn', 'firstPlayerOfRound', 'firstPasserOfPreviousRound'].includes(update)
    );

    if (isGameFlowManagerUpdate && (isPlayerStateUpdate || isPhaseTransitionUpdate)) {
      return;
    }

    const isSequentialPhaseManagerUpdate = stack && stack.includes('SequentialPhaseManager');
    const isSequentialPhase = ['deployment', 'action'].includes(prevState.turnPhase);
    const isPassInfoUpdate = criticalUpdates.length === 1 && criticalUpdates[0] === 'passInfo';

    if (isSequentialPhaseManagerUpdate && isSequentialPhase && isPassInfoUpdate) {
      return;
    }

    if (criticalUpdates.length > 0 && !isFromActionProcessor) {
      const stackLines = stack?.split('\n') || [];
      const callerLine = stackLines.find(line =>
        line.includes('.jsx') && !line.includes('GameStateManager')
      ) || stackLines[2] || 'Unknown';

      debugLog('VALIDATION', '⚠️ ActionProcessor bypass detected: Critical game state updated directly', {
        updates: criticalUpdates,
        turnPhase: prevState.turnPhase,
        caller: callerLine.trim(),
        allUpdates: Object.keys(updates),
        actionInProgress: this.gsm.actionProcessor.isActionInProgress(),
        recommendation: 'Use processAction() instead of direct state updates'
      });

      debugLog('VALIDATION', '🐛 ActionProcessor bypass debug info', {
        stackTrace: stackLines.slice(0, 8),
        currentState: {
          turnPhase: prevState.turnPhase,
          currentPlayer: prevState.currentPlayer,
          turn: prevState.turn
        },
        updateDetails: updates
      });
    }

    if (allowedUpdates.length > 0 && !isFromActionProcessor && process.env.NODE_ENV === 'development') {
      debugLog('VALIDATION', 'ℹ️ UI state update (allowed)', {
        updates: allowedUpdates,
        turnPhase: prevState.turnPhase
      });
    }

    this.validateFunctionAppropriateForStateUpdate(updates, prevState, isFromActionProcessor, stack);
    this.validateOwnershipBoundaries(updates, stack);
  }

  // --- Caller Info Extraction ---

  extractCallerInfo(stackLines) {
    const functions = [];
    const files = [];

    for (const line of stackLines) {
      const functionMatch = line.match(/at\s+([\w.$]+)\s*\(/);
      if (functionMatch) {
        const funcName = functionMatch[1];
        if (funcName !== 'Object' && funcName !== 'anonymous' && !funcName.startsWith('eval')) {
          functions.push(funcName);
        }
      }

      const fileMatch = line.match(/\/([^\/]+\.(jsx?|ts|tsx)):\d+/);
      if (fileMatch) {
        files.push(fileMatch[1]);
      }
    }

    return {
      functions: [...new Set(functions)],
      files: [...new Set(files)],
      primaryCaller: functions[0] || 'Unknown',
      primaryFile: files[0] || 'Unknown'
    };
  }

  // --- Player State Change Logging ---

  logPlayerStateChanges(updates, prevState, caller, eventType) {
    ['player1', 'player2'].forEach(playerId => {
      if (updates[playerId]) {
        const oldPlayer = prevState[playerId];
        const newPlayer = updates[playerId];

        debugLog('STATE_SYNC', `🚨 PLAYER STATE CHANGE [${playerId}] [${eventType}] from ${caller}:`);

        const criticalProps = ['energy', 'activeDronePool', 'hand', 'deck', 'dronesOnBoard', 'deploymentBudget', 'initialDeploymentBudget'];

        criticalProps.forEach(prop => {
          const oldValue = oldPlayer ? oldPlayer[prop] : undefined;
          const newValue = newPlayer ? newPlayer[prop] : undefined;

          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            if (prop === 'energy' || prop === 'deploymentBudget' || prop === 'initialDeploymentBudget') {
              debugLog('STATE_SYNC', `  💰 ${prop}: ${oldValue} → ${newValue}`);
              if (newValue === undefined || newValue === null || isNaN(newValue)) {
                debugLog('VALIDATION', `🚨 WARNING: ${prop} became ${newValue}!`);
              }
            } else if (prop === 'activeDronePool') {
              const oldCount = Array.isArray(oldValue) ? oldValue.length : 'undefined';
              const newCount = Array.isArray(newValue) ? newValue.length : 'undefined';

              let oldNames, newNames;

              if (Array.isArray(oldValue)) {
                try {
                  oldNames = oldValue.map(d => d?.name || 'UNNAMED').join(',');
                } catch (e) {
                  oldNames = `ERROR_MAPPING_OLD: ${e.message}`;
                }
              } else {
                oldNames = 'undefined';
              }

              if (Array.isArray(newValue)) {
                try {
                  newNames = newValue.map(d => d?.name || 'UNNAMED').join(',');
                } catch (e) {
                  newNames = `ERROR_MAPPING_NEW: ${e.message}`;
                }
              } else {
                newNames = 'undefined';
              }

              debugLog('STATE_SYNC', `  🤖 ${prop}: [${oldCount} drones] → [${newCount} drones]`);
              debugLog('STATE_SYNC', `    Old drones: ${oldNames}`);
              debugLog('STATE_SYNC', `    New drones: ${newNames}`);

              if (newNames.includes('ERROR') || newNames === 'undefined') {
                debugLog('STATE_SYNC', `    🔍 Debug newValue:`, newValue);
                if (Array.isArray(newValue) && newValue.length > 0) {
                  debugLog('STATE_SYNC', `    🔍 First drone object:`, newValue[0]);
                }
              }

              if (oldCount !== newCount || oldNames !== newNames) {
                const stack = new Error().stack?.split('\n').slice(1, 4).join('\n') || 'No stack trace';
                debugLog('STATE_SYNC', `    📍 Update source:\n${stack}`);
              }
            } else if (prop === 'hand' || prop === 'deck') {
              const oldCount = Array.isArray(oldValue) ? oldValue.length : 'undefined';
              const newCount = Array.isArray(newValue) ? newValue.length : 'undefined';
              debugLog('STATE_SYNC', `  🃏 ${prop}: [${oldCount} cards] → [${newCount} cards]`);
            } else if (prop === 'dronesOnBoard') {
              const oldLaneCounts = oldValue ? `L1:${oldValue.lane1?.length || 0} L2:${oldValue.lane2?.length || 0} L3:${oldValue.lane3?.length || 0}` : 'undefined';
              const newLaneCounts = newValue ? `L1:${newValue.lane1?.length || 0} L2:${newValue.lane2?.length || 0} L3:${newValue.lane3?.length || 0}` : 'undefined';
              debugLog('STATE_SYNC', `  🛸 ${prop}: ${oldLaneCounts} → ${newLaneCounts}`);
            } else {
              debugLog('STATE_SYNC', `  📝 ${prop}:`, { before: oldValue, after: newValue });
            }
          }
        });

        debugLog('STATE_SYNC', `🔍 Full ${playerId} state:`, newPlayer);
      }
    });
  }

  // --- Initialization Phase Check ---

  isInitializationPhase(turnPhase) {
    const initPhases = [
      null, 'preGame', 'droneSelection', 'deckSelection',
      'deckBuilding', 'placement', 'gameInitializing', 'initialDraw'
    ];
    return initPhases.includes(turnPhase);
  }

  // --- Function Appropriateness Validation ---

  validateFunctionAppropriateForStateUpdate(updates, prevState, isFromActionProcessor, stack) {
    if (this.isInitializationPhase(prevState.turnPhase)) {
      return;
    }

    if (isFromActionProcessor) {
      return;
    }

    const stackLines = stack?.split('\n') || [];
    const callerInfo = this.extractCallerInfo(stackLines);

    const inappropriateFunctions = [
      'handle', 'onClick', 'onSubmit', 'onSelect', 'onConfirm', 'onComplete',
      'render', 'component', 'modal', 'display', 'show', 'hide',
      'setModal', 'setSelected', 'setActive', 'setVisible',
      'calculate', 'format', 'validate', 'transform',
    ];

    const appropriateFunctions = [
      'GameStateManager', 'ActionProcessor', 'gameLogic', 'gameEngine',
      'reset', 'initialize', 'setup', 'init',
      'setState', 'updateState', 'syncState',
      'p2p', 'network', 'sync',
    ];

    const inappropriateCallers = callerInfo.functions.filter(func =>
      inappropriateFunctions.some(inappropriate =>
        func.toLowerCase().includes(inappropriate.toLowerCase())
      )
    );

    const appropriateCallers = callerInfo.functions.filter(func =>
      appropriateFunctions.some(appropriate =>
        func.toLowerCase().includes(appropriate.toLowerCase())
      )
    );

    if (inappropriateCallers.length > 0 && appropriateCallers.length === 0) {
      debugLog('VALIDATION', '🚨 Inappropriate function updating game state', {
        inappropriateFunctions: inappropriateCallers,
        updates: Object.keys(updates),
        turnPhase: prevState.turnPhase,
        callerInfo: callerInfo,
        recommendation: 'UI functions should use processAction() instead of direct state updates',
        architecture: 'UI → ActionProcessor → gameLogic.js → GameStateManager'
      });

      debugLog('VALIDATION', '🔍 Function validation debug info', {
        allFunctionsInStack: callerInfo.functions,
        inappropriateFound: inappropriateCallers,
        appropriateFound: appropriateCallers,
        updateDetails: updates,
        stackTrace: stackLines.slice(0, 10)
      });
    }
  }

  // --- Ownership Boundary Validation ---

  validateOwnershipBoundaries(updates, stack) {
    if (!stack) return;

    const updateKeys = Object.keys(updates);
    if (updateKeys.length === 0) return;

    const isGameFlowManager = this.gsm._updateContext === 'GameFlowManager' || stack.includes('GameFlowManager');
    const isSequentialPhaseManager = this.gsm._updateContext === 'SequentialPhaseManager' || stack.includes('SequentialPhaseManager');
    const isActionProcessor = this.gsm._updateContext === 'ActionProcessor' || stack.includes('ActionProcessor');

    const ownershipRules = {
      'turnPhase': 'GameFlowManager',
      'gameStage': 'GameFlowManager',
      'roundNumber': 'GameFlowManager',
      'gameActive': 'GameFlowManager',
      'passInfo': ['SequentialPhaseManager', 'GameFlowManager'],
      'currentPlayer': ['ActionProcessor', 'GameFlowManager'],
      'firstPlayerOfRound': ['ActionProcessor', 'GameFlowManager'],
      'firstPlayerOverride': ['ActionProcessor', 'GameFlowManager']
    };

    for (const updateKey of updateKeys) {
      const allowedOwners = ownershipRules[updateKey];
      if (!allowedOwners) continue;

      const allowedOwnersList = Array.isArray(allowedOwners) ? allowedOwners : [allowedOwners];

      let hasPermission = false;
      for (const allowedOwner of allowedOwnersList) {
        if (allowedOwner === 'GameFlowManager' && isGameFlowManager) hasPermission = true;
        else if (allowedOwner === 'SequentialPhaseManager' && isSequentialPhaseManager) hasPermission = true;
        else if (allowedOwner === 'ActionProcessor' && isActionProcessor) hasPermission = true;
      }

      if (!hasPermission) {
        const currentManager = isGameFlowManager ? 'GameFlowManager' :
                             isSequentialPhaseManager ? 'SequentialPhaseManager' :
                             isActionProcessor ? 'ActionProcessor' : 'Unknown';

        debugLog('VALIDATION', `🚨 OWNERSHIP VIOLATION: ${currentManager} cannot update '${updateKey}'`, {
          updateKey,
          currentManager,
          allowedOwners: allowedOwnersList,
          updates: updateKeys,
          recommendation: `Only ${allowedOwnersList.join(' or ')} should update '${updateKey}'`
        });
      }
    }
  }
}

export default StateValidationService;
