// ========================================
// AI MODULE - MAIN EXPORT
// ========================================
// Modular AI system for Drone Wars
//
// Structure:
// - aiConstants.js: All scoring weights and thresholds
// - helpers/: Utility functions (jammer, drone, keyword detection)
// - scoring/: Lane scoring, drone impact, interception analysis
// - cardEvaluators/: Card effect evaluation functions
// - attackEvaluators/: Attack scoring functions
// - moveEvaluator.js: Move action scoring
// - adjustmentPasses/: Post-scoring adjustments (Jammer, Interception)
// - decisions/: High-level decision functions

// Re-export aiBrain for backward compatibility
// This maintains the original API while allowing modular imports
export { aiBrain } from './aiLogic.js';

// Constants - centralized scoring weights and thresholds
export * from './aiConstants.js';

// Helpers - utility functions for common operations
export * from './helpers/index.js';

// Scoring - core evaluation algorithms
export * from './scoring/index.js';

// Card evaluators - per-effect-type evaluation functions
export * from './cardEvaluators/index.js';

// Attack evaluators - drone and ship attack scoring
export * from './attackEvaluators/index.js';

// Move evaluator - movement action scoring
export * from './moveEvaluator.js';

// Adjustment passes - post-scoring modifications
export * from './adjustmentPasses/index.js';

// Decisions - high-level decision orchestration
export * from './decisions/index.js';
