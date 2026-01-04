// ========================================
// WINNER MODAL COMPONENT
// ========================================
// Modal that displays when the game ends, showing victory or defeat message
// Provides options to view final board or exit to menu
// For single-player extraction mode, provides button to collect salvage loot

import React, { useState } from 'react';
import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import CombatOutcomeProcessor from '../../logic/singlePlayer/CombatOutcomeProcessor.js';
import LootRevealModal from './LootRevealModal.jsx';
import DroneBlueprintRewardModal from './DroneBlueprintRewardModal.jsx';

/**
 * WINNER MODAL COMPONENT
 * Shows dramatic victory or defeat animation when the game ends.
 * Provides buttons to view final board or exit to menu.
 * For single-player extraction mode:
 *   - Victory: Shows "Collect Salvage" which opens LootRevealModal
 *   - Defeat: Shows "Return to Hangar"
 * @param {string} winner - ID of the winning player
 * @param {string} localPlayerId - ID of the local player
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Callback when modal is closed (view board)
 */
const WinnerModal = ({ winner, localPlayerId, show, onClose }) => {
  const [lootToReveal, setLootToReveal] = useState(null);
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const isVictory = winner === localPlayerId;

  // Check if this is single-player extraction mode or boss combat
  // Note: gameMode is 'local' during extraction combat (for AI compatibility), so check singlePlayerEncounter instead
  const gameState = gameStateManager.getState();
  const isBossCombat = gameState.singlePlayerEncounter?.isBossCombat === true;
  const isSinglePlayerExtraction = gameState.singlePlayerEncounter && tacticalMapStateManager.isRunActive();

  // Show extraction-style buttons for both extraction runs and boss combat
  const showExtractionButtons = isSinglePlayerExtraction || isBossCombat;

  if (!show) return null;

  const handleViewBoard = () => {
    onClose();
  };

  const handleExitToMenu = () => {
    // Reset game state first to clear all combat state (player1, player2, etc.)
    gameStateManager.resetGameState();
    gameStateManager.setState({ appState: 'menu' });
  };

  /**
   * Handle collecting salvage after victory
   * Processes combat outcome and shows loot reveal modal
   */
  const handleCollectSalvage = () => {
    // Process combat outcome - returns loot for reveal
    const result = CombatOutcomeProcessor.processCombatEnd(gameStateManager.getState());
    if (result.success && result.outcome === 'victory' && result.loot) {
      setLootToReveal(result.loot);
    }
  };

  /**
   * Handle collecting rewards after boss victory
   * Boss loot is already stored in pendingLoot by processBossVictory
   */
  const handleBossCollectRewards = () => {
    // For boss combat, loot is already stored in pendingLoot (set by processBossVictory during combat end)
    // If not yet processed, process now
    const currentState = gameStateManager.getState();
    if (currentState.pendingLoot) {
      setLootToReveal(currentState.pendingLoot);
    } else {
      // Process combat outcome to get boss loot
      const result = CombatOutcomeProcessor.processCombatEnd(currentState);
      if (result.success && result.outcome === 'victory' && result.loot) {
        setLootToReveal(result.loot);
      }
    }
  };

  /**
   * Handle defeat - return to hangar
   */
  const handleDefeatContinue = () => {
    // Process combat outcome (will transition to hangar)
    CombatOutcomeProcessor.processCombatEnd(gameStateManager.getState());
  };

  /**
   * Handle loot collection complete
   * Called when user has revealed all cards and clicked Continue
   * If there's a pending drone blueprint, shows the special modal instead of returning
   */
  const handleLootCollected = (loot) => {
    // Finalize loot collection (this may set hasPendingDroneBlueprint flag)
    CombatOutcomeProcessor.finalizeLootCollection(loot);
    setLootToReveal(null);

    // Check if there's a pending drone blueprint to show special modal
    const updatedState = gameStateManager.getState();
    if (updatedState.hasPendingDroneBlueprint && updatedState.pendingDroneBlueprint) {
      setShowBlueprintModal(true);
    }
  };

  /**
   * Handle boss loot collection complete
   * Called when user has revealed boss rewards and clicked Continue
   * Returns to hangar after applying rewards to profile
   */
  const handleBossLootCollected = (loot) => {
    // Finalize boss loot collection - applies rewards and returns to hangar
    CombatOutcomeProcessor.finalizeBossLootCollection(loot);
    setLootToReveal(null);
  };

  /**
   * Handle blueprint acceptance
   * Called when user clicks Accept on the drone blueprint reward modal
   */
  const handleBlueprintAccept = (blueprint) => {
    // Finalize blueprint collection and return to tactical map
    CombatOutcomeProcessor.finalizeBlueprintCollection(blueprint);
    setShowBlueprintModal(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      {/* Decorative hex background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left hex cluster */}
        <svg className="absolute top-16 left-16 opacity-20" width="120" height="138" viewBox="0 0 80 92">
          <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="none" stroke={isVictory ? '#00ff88' : '#ff3232'} strokeWidth="1" />
          <polygon points="40,12 68,29 68,63 40,80 12,63 12,29" fill={isVictory ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 50, 50, 0.05)'} stroke={isVictory ? '#00ff88' : '#ff3232'} strokeWidth="0.5" />
        </svg>
        {/* Top-right hex cluster */}
        <svg className="absolute top-24 right-24 opacity-15" width="80" height="92" viewBox="0 0 80 92">
          <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="none" stroke={isVictory ? '#00ff88' : '#ff3232'} strokeWidth="1" />
        </svg>
        {/* Bottom-left hex */}
        <svg className="absolute bottom-24 left-32 opacity-15" width="60" height="69" viewBox="0 0 80 92">
          <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="none" stroke={isVictory ? '#00ff88' : '#ff3232'} strokeWidth="1" />
        </svg>
        {/* Bottom-right hex cluster */}
        <svg className="absolute bottom-16 right-16 opacity-20" width="100" height="115" viewBox="0 0 80 92">
          <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="none" stroke={isVictory ? '#00ff88' : '#ff3232'} strokeWidth="1" />
          <polygon points="40,12 68,29 68,63 40,80 12,63 12,29" fill={isVictory ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 50, 50, 0.05)'} stroke={isVictory ? '#00ff88' : '#ff3232'} strokeWidth="0.5" />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-12 relative z-10">
        {isVictory ? (
          // Victory Screen - Green shimmer gradient
          <h1
            className="text-8xl font-orbitron font-black uppercase tracking-widest text-center phase-announcement-shine"
            style={{
              background: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 136, 255, 0.3)',
              filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.4))'
            }}
          >
            VICTORY
          </h1>
        ) : (
          // Defeat Screen - Red glow with CPU shutdown effects
          <div className="relative w-full h-full flex items-center justify-center screen-flicker">
            {/* Main DEFEAT text */}
            <h1
              className="text-8xl font-orbitron font-black uppercase tracking-widest text-center defeat-glow screen-distort z-10"
              style={{
                color: '#ff3232',
                textShadow: '0 0 30px rgba(255, 50, 50, 1), 0 0 60px rgba(255, 50, 50, 0.8), 0 0 90px rgba(255, 50, 50, 0.6)',
                filter: 'drop-shadow(0 0 30px rgba(255, 50, 50, 0.6))'
              }}
            >
              DEFEAT
            </h1>

            {/* Scanline shutdown effect */}
            <div
              className="absolute w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent scanline-shutdown"
              style={{
                boxShadow: '0 0 10px rgba(255, 50, 50, 0.8)'
              }}
            />

            {/* Red overlay pulse */}
            <div
              className="absolute inset-0 bg-red-900/20 defeat-glow"
              style={{
                mixBlendMode: 'multiply'
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-6 z-20">
          {showExtractionButtons ? (
            // Single-player extraction mode or boss combat buttons
            <>
              <button
                onClick={handleViewBoard}
                className="btn-secondary text-xl px-8 py-4"
              >
                View Board
              </button>
              {isVictory ? (
                <button
                  onClick={isBossCombat ? handleBossCollectRewards : handleCollectSalvage}
                  className="dw-btn dw-btn-confirm text-xl px-8 py-4"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                  }}
                >
                  {isBossCombat ? 'Collect Rewards' : 'Collect Salvage'}
                </button>
              ) : (
                <button
                  onClick={handleDefeatContinue}
                  className="dw-btn dw-btn-cancel text-xl px-8 py-4"
                >
                  Return to Hangar
                </button>
              )}
            </>
          ) : (
            // Standard multiplayer/skirmish buttons
            <>
              <button
                onClick={handleViewBoard}
                className="dw-btn dw-btn-confirm text-xl px-8 py-4"
              >
                View Board
              </button>
              <button
                onClick={handleExitToMenu}
                className="dw-btn dw-btn-cancel text-xl px-8 py-4"
              >
                Exit to Menu
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loot Reveal Modal - shown after clicking Collect Salvage/Collect Rewards */}
      <LootRevealModal
        loot={lootToReveal}
        onCollect={isBossCombat ? handleBossLootCollected : handleLootCollected}
        show={!!lootToReveal}
      />

      {/* Drone Blueprint Reward Modal - shown after loot collection when blueprint POI */}
      <DroneBlueprintRewardModal
        blueprint={gameState.pendingDroneBlueprint}
        onAccept={handleBlueprintAccept}
        show={showBlueprintModal}
      />
    </div>
  );
};

export default WinnerModal;
