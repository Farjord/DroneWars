// ========================================
// AI LOGIC - ASSEMBLY MODULE
// ========================================
// Thin assembly file that imports decision functions from their
// dedicated modules and re-exports them as the aiBrain public API.

import { handleOpponentTurn } from './decisions/deploymentDecision.js';
import { handleOpponentAction } from './decisions/actionDecision.js';
import { makeInterceptionDecision } from './decisions/interceptionDecision.js';

export const aiBrain = {
  handleOpponentTurn,
  handleOpponentAction,
  makeInterceptionDecision,
};
