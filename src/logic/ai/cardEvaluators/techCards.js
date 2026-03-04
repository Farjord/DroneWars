// ========================================
// TECH CARD EVALUATORS
// ========================================
// Evaluates DESTROY_TECH card effects for AI decision-making

import { SCORING_WEIGHTS } from '../aiConstants.js';

// Tech impact values — higher = more valuable to destroy
const TECH_IMPACT = {
  'Jammer': 50,        // Blocks all card targeting in lane — highest priority
  'Proximity Mine': 30, // Deals 4 damage on lane entry
  'Jitter Mine': 25,    // -4 attack on lane attack
  'Inhibitor Mine': 20, // Exhausts deployed drone
  'Rally Beacon': 15,   // Go again on movement — lowest threat
};

const BASE_TECH_REMOVAL_SCORE = 10;

/**
 * Evaluate a DESTROY_TECH card
 * @param {Object} card - The card being played
 * @param {Object} target - The target tech { id, name, lane, owner }
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDestroyTechCard = (card, target, context) => {
  const logic = [];
  let score = 0;

  if (!target) {
    return { score: 0, logic: ['No tech target'] };
  }

  score += BASE_TECH_REMOVAL_SCORE;
  logic.push(`Base tech removal: +${BASE_TECH_REMOVAL_SCORE}`);

  const impactScore = TECH_IMPACT[target.name] || 15;
  score += impactScore;
  logic.push(`${target.name} impact: +${impactScore}`);

  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`Cost: -${costPenalty}`);

  return { score, logic };
};
