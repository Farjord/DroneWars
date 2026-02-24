// ========================================
// GAME LOGIC PUBLIC API FACADE
// ========================================
// Single import point for all game logic operations.
//
// PURPOSE:
// This file serves as the public API facade for the game logic layer. It provides
// a stable, organized interface that re-exports functionality from 38 specialized
// processors without exposing internal implementation details.
//
// BENEFITS OF THIS PATTERN:
// 1. Stable Imports - Consumers use one import instead of tracking 38+ processor files
// 2. Clear Organization - Functions grouped by category (State, Combat, Turns, etc.)
// 3. Backward Compatibility - Refactoring internals doesn't break consumer code
// 4. Single Responsibility - This file ONLY routes to processors, contains minimal logic
//
// WHAT'S IN THIS FILE:
// 1. gameEngine export - Facade re-exporting from all processors
// 2. Named exports - startingDecklist, startingDroneList, utility functions
//
// WHAT'S NOT IN THIS FILE (extracted to specialized processors):
// - State initialization → StateInitializer
// - Combat logic → 8 combat processors
// - Card effects → 15 effect processors
// - Deployment → 4 deployment processors
// - Turn management → TurnTransitionManager
// - Ability resolution → AbilityResolver
// - Win conditions → WinConditionChecker
// - Hand limits → HandLimitManager
// - See Design/REFACTORING_ROADMAP.md for complete architecture
//

// --- IMPORTS ---
import { getShipStatus } from './statsCalculator.js';
import { applyOnMoveEffects } from './utils/abilityHelpers.js';
import StateInitializer, { startingDecklist, startingDroneList } from './state/StateInitializer.js';
import TurnTransitionManager from './turn/TurnTransitionManager.js';
import HandLimitManager from './cards/HandLimitManager.js';
import CardPlayManager from './cards/CardPlayManager.js';
import WinConditionChecker from './game/WinConditionChecker.js';
import AbilityResolver from './abilities/AbilityResolver.js';
import { updateAuras } from './utils/auraManager.js';
import { getLaneOfDrone } from './utils/gameEngineUtils.js';
import { onDroneDestroyed, onDroneRecalled } from './utils/droneStateUtils.js';
import DeploymentProcessor from './deployment/DeploymentProcessor.js';
import { resolveAttack } from './combat/AttackProcessor.js';
import { calculatePotentialInterceptors, calculateAiInterception } from './combat/InterceptionProcessor.js';
import RoundManager from './round/RoundManager.js';
import ShieldManager from './shields/ShieldManager.js';
import MovementEffectProcessor from './effects/MovementEffectProcessor.js';

// ========================================
// PROCESSOR SINGLETON INSTANCES
// ========================================
// Create singleton instances for class-based processors to ensure
// consistent state and avoid creating new instances on each method call.

const deploymentProcessor = new DeploymentProcessor();
const movementProcessor = new MovementEffectProcessor();

// ========================================
// GAME ENGINE EXPORT - PUBLIC API FACADE
// ========================================
// Organized by responsibility area for easy navigation.
// All processor methods are bound to maintain correct 'this' context.

export const gameEngine = {
  // --- STATE MANAGEMENT ---
  // Initial state creation and card generation (StateInitializer)
  initialPlayerState: StateInitializer.initialPlayerState.bind(StateInitializer),
  buildDeckFromList: StateInitializer.buildDeckFromList.bind(StateInitializer),
  createCard: StateInitializer.createCard.bind(StateInitializer),

  // --- SHIP & DRONE STATE ---
  // Ship status and drone lifecycle utilities
  getShipStatus,           // Calculate ship damage/destruction state
  onDroneDestroyed,        // Handle drone destruction effects
  onDroneRecalled,         // Handle drone recall effects
  applyOnMoveEffects,      // Apply effects when drones move
  updateAuras,             // Recalculate aura effects
  getLaneOfDrone,          // Get lane containing specific drone

  // --- ABILITY SYSTEM ---
  // Drone and ship ability resolution (AbilityResolver)
  resolveAbility: AbilityResolver.resolveAbility.bind(AbilityResolver),
  resolveShipAbility: AbilityResolver.resolveShipAbility.bind(AbilityResolver),
  resolveDroneAbilityEffect: AbilityResolver.resolveDroneAbilityEffect.bind(AbilityResolver),
  resolveShipAbilityEffect: AbilityResolver.resolveShipAbilityEffect.bind(AbilityResolver),

  // --- COMBAT SYSTEM ---
  // Attack resolution and interception (AttackProcessor, InterceptionProcessor)
  resolveAttack,
  calculatePotentialInterceptors,
  calculateAiInterception,

  // --- DEPLOYMENT SYSTEM ---
  // Drone deployment validation and execution (DeploymentProcessor)
  validateDeployment: deploymentProcessor.validateDeployment.bind(deploymentProcessor),
  executeDeployment: deploymentProcessor.executeDeployment.bind(deploymentProcessor),

  // --- CARD PLAY SYSTEM ---
  // Card play validation and execution (CardPlayManager)
  resolveCardPlay: CardPlayManager.resolveCardPlay.bind(CardPlayManager),
  payCardCosts: CardPlayManager.payCardCosts.bind(CardPlayManager),
  finishCardPlay: CardPlayManager.finishCardPlay.bind(CardPlayManager),

  // --- WIN CONDITIONS ---
  // Game end detection (WinConditionChecker)
  checkWinCondition: WinConditionChecker.checkWinCondition.bind(WinConditionChecker),
  checkGameStateForWinner: WinConditionChecker.checkGameStateForWinner.bind(WinConditionChecker),

  // --- TURN & PHASE MANAGEMENT ---
  // Turn transitions and phase changes (TurnTransitionManager)
  calculateTurnTransition: TurnTransitionManager.calculateTurnTransition.bind(TurnTransitionManager),
  calculatePassTransition: TurnTransitionManager.calculatePassTransition.bind(TurnTransitionManager),
  processTurnTransition: TurnTransitionManager.processTurnTransition.bind(TurnTransitionManager),
  processPhaseChange: TurnTransitionManager.processPhaseChange.bind(TurnTransitionManager),
  createTurnEndEffects: TurnTransitionManager.createTurnEndEffects.bind(TurnTransitionManager),

  // --- ROUND MANAGEMENT ---
  // Round start/end lifecycle (RoundManager)
  readyDronesAndRestoreShields: RoundManager.readyDronesAndRestoreShields.bind(RoundManager),
  calculateNewRoundPlayerState: RoundManager.calculateNewRoundPlayerState.bind(RoundManager),
  drawToHandLimit: RoundManager.drawToHandLimit.bind(RoundManager),
  processRoundStart: RoundManager.processRoundStart.bind(RoundManager),

  // --- HAND LIMIT MANAGEMENT ---
  // Hand size enforcement and discard phase (HandLimitManager)
  checkHandLimitViolations: HandLimitManager.checkHandLimitViolations.bind(HandLimitManager),
  enforceHandLimits: HandLimitManager.enforceHandLimits.bind(HandLimitManager),
  processDiscardPhase: HandLimitManager.processDiscardPhase.bind(HandLimitManager),

  // --- SHIELD MANAGEMENT ---
  // Shield allocation and reallocation (ShieldManager)
  getEffectiveSectionMaxShields: ShieldManager.getEffectiveSectionMaxShields.bind(ShieldManager),
  validateShieldRemoval: ShieldManager.validateShieldRemoval.bind(ShieldManager),
  validateShieldAddition: ShieldManager.validateShieldAddition.bind(ShieldManager),
  executeShieldReallocation: ShieldManager.executeShieldReallocation.bind(ShieldManager),
  getValidShieldReallocationTargets: ShieldManager.getValidShieldReallocationTargets.bind(ShieldManager),
  processShieldAllocation: ShieldManager.processShieldAllocation.bind(ShieldManager),
  processResetShieldAllocation: ShieldManager.processResetShieldAllocation.bind(ShieldManager),
  processEndShieldAllocation: ShieldManager.processEndShieldAllocation.bind(ShieldManager),

  // --- MOVEMENT EFFECTS ---
  // Movement completion handlers (MovementEffectProcessor)
  executeSingleMove: movementProcessor.executeSingleMove.bind(movementProcessor),
  executeMultiMove: movementProcessor.executeMultiMove.bind(movementProcessor)
};

// Named exports for combat processors
export { onDroneDestroyed, updateAuras, getLaneOfDrone };

// Re-export default configurations from StateInitializer
export { startingDecklist, startingDroneList };