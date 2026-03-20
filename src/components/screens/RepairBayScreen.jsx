/**
 * RepairBayScreen Component
 * Full-screen management UI for ship configuration and repairs
 *
 * Features:
 * - Ship slot selector (sidebar)
 * - Drone slots display with DroneCard components (drag-to-reorder)
 * - Ship sections display with hull/damage status
 * - Repair buttons for damaged items
 */

import React, { useState, useMemo } from 'react';
import { Wrench, AlertTriangle, CheckCircle, Star, Trash2, Cpu, HelpCircle } from 'lucide-react';
import { RepairBayTutorialModal } from '../modals/tutorials';
import { useGameState } from '../../hooks/useGameState';
import RepairSectionCard from '../ui/RepairSectionCard';
import { getShipById } from '../../data/shipData';
import { resolveShipSectionImage } from '../../logic/cards/shipSectionImageResolver';
import { validateDeckForDeployment } from '../../logic/singlePlayer/singlePlayerDeckUtils.js';
import { validateShipSlot } from '../../logic/combat/shipSlotUtils.js';
import { ECONOMY } from '../../data/economyData.js';
import ReputationService from '../../logic/reputation/ReputationService';
import ReputationTrack from '../ui/ReputationTrack';
import {
  getComponentById,
  resolveComponentIdForLane,
  calculateSectionHull,
  countDamage,
} from '../../logic/singlePlayer/repairHelpers.js';

// Re-export resolveComponentIdForLane for consumers that imported it from here
export { resolveComponentIdForLane } from '../../logic/singlePlayer/repairHelpers.js';

/**
 * RepairBayScreen Component
 */
const RepairBayScreen = () => {
  const { gameState, gameStateManager } = useGameState();

  // Get data from game state (matching Hangar pattern)
  const singlePlayerProfile = gameState.singlePlayerProfile;
  const singlePlayerShipSlots = gameState.singlePlayerShipSlots || [];
  const credits = singlePlayerProfile?.credits || 0;
  const initialSlotId = gameState.repairBaySlotId ?? 1;

  // Local state
  const [selectedSlotId, setSelectedSlotId] = useState(initialSlotId);
  const [feedback, setFeedback] = useState(null);
  const [showReputationProgress, setShowReputationProgress] = useState(false);
  const [showTutorial, setShowTutorial] = useState(null);

  // Get active slots only (for main content display), excluding Slot 0 (starter deck never persists damage)
  const activeSlots = useMemo(() => {
    return singlePlayerShipSlots.filter(slot => slot.status === 'active' && slot.id !== 0);
  }, [singlePlayerShipSlots]);

  // Get selected slot
  const selectedSlot = singlePlayerShipSlots.find(s => s.id === selectedSlotId) || activeSlots[0];

  // Handle back/exit navigation
  const handleBack = () => {
    gameStateManager.setState({ appState: 'hangar' });
  };

  // Handle star toggle (matching Hangar)
  const handleStarToggle = (e, slotId) => {
    e.stopPropagation();
    const currentDefault = singlePlayerProfile?.defaultShipSlotId;
    gameStateManager.setDefaultShipSlot(currentDefault === slotId ? null : slotId);
  };

  // Handle slot selection
  const handleSelectSlot = (slotId) => {
    setSelectedSlotId(slotId);
    setFeedback(null);
  };

  // Handle section repair (full)
  const handleRepairSection = (lane) => {
    try {
      const result = gameStateManager.repairSectionSlot(selectedSlotId, lane);

      if (result.success) {
        setFeedback({ type: 'success', message: `Section repaired for ${result.cost} credits` });
      } else {
        setFeedback({ type: 'error', message: result.reason || 'Repair failed' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Repair failed' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  // Handle partial section repair (+1 HP)
  const handleRepairSectionPartial = (lane) => {
    try {
      const result = gameStateManager.repairSectionSlotPartial(selectedSlotId, lane, 1);

      if (result.success) {
        const msg = result.remainingDamage > 0
          ? `Repaired 1 HP for ${result.cost} credits (${result.remainingDamage} damage remaining)`
          : `Repaired 1 HP for ${result.cost} credits (fully repaired)`;
        setFeedback({ type: 'success', message: msg });
      } else {
        setFeedback({ type: 'error', message: result.reason || 'Repair failed' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Repair failed' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="repair-bay-screen heading-font">
      {/* Header - Exact Hangar style */}
      <header style={{
        background: 'linear-gradient(45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(-45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(20, 28, 42, 0.95) 0%, rgba(10, 14, 22, 0.95) 100%)',
        backgroundSize: '10px 10px, 10px 10px, 100% 100%',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
        zIndex: 10
      }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{
            fontSize: '1.5rem',
            color: '#e5e7eb',
            letterSpacing: '0.1em'
          }}>REPAIR BAY</h1>
          <button
            onClick={() => setShowTutorial('repairBay')}
            title="Show help"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#06b6d4',
              opacity: 0.7,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <HelpCircle size={18} />
          </button>
        </div>

        {/* Right: Stats (matching Hangar) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[
            { label: 'CREDITS', value: singlePlayerProfile?.credits || 0, color: '#fbbf24' },
            { label: 'AI CORES', value: singlePlayerProfile?.aiCores || 0, color: '#f97316' },
            { label: 'TOKENS', value: singlePlayerProfile?.securityTokens || 0, color: '#06b6d4' },
            { label: 'MAP KEYS', value: 0, color: '#60a5fa' },
            { label: 'RUNS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#e5e7eb' },
            { label: 'EXTRACTIONS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#22c55e' },
            { label: 'COMBATS WON', value: singlePlayerProfile?.stats?.totalCombatsWon || 0, color: '#10b981' },
            { label: 'MAX TIER', value: singlePlayerProfile?.stats?.highestTierCompleted || 1, color: '#a855f7' }
          ].map(({ label, value, color }) => (
            <div key={label} className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
              <span className="dw-stat-box-label">{label}</span>
              <span className="dw-stat-box-value" style={{ color }}>{value}</span>
            </div>
          ))}

          {/* Reputation Track */}
          {(() => {
            const repData = ReputationService.getLevelData();
            const unclaimed = ReputationService.getUnclaimedRewards();
            return (
              <ReputationTrack
                current={repData.currentRep}
                level={repData.level}
                progress={repData.progress}
                currentInLevel={repData.currentInLevel}
                requiredForNext={repData.requiredForNext}
                unclaimedCount={unclaimed.length}
                isMaxLevel={repData.isMaxLevel}
                onClick={() => setShowReputationProgress(true)}
              />
            );
          })()}
        </div>
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`repair-bay-feedback ${feedback.type === 'success' ? 'repair-bay-feedback--success' : 'repair-bay-feedback--error'}`}>
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {feedback.message}
        </div>
      )}

      <div className="repair-bay-content" style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '3fr 1fr',
        overflow: 'hidden'
      }}>
        {/* Main Content - LEFT side */}
        <main className="repair-bay-main">
          {selectedSlot ? (
            <>
              {/* Ship Sections */}
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  Ship Sections
                </h2>
                <div className="repair-bay-sections-grid">
                  {['l', 'm', 'r'].map(lane => {
                    const sectionSlot = selectedSlot.sectionSlots?.[lane];
                    const componentId = resolveComponentIdForLane(selectedSlot, lane);
                    const component = componentId ? getComponentById(componentId) : null;
                    const hull = calculateSectionHull(selectedSlot, lane);
                    const damageDealt = sectionSlot?.damageDealt || 0;
                    const repairCost = damageDealt * (ECONOMY.SECTION_DAMAGE_REPAIR_COST || 200);
                    const canAfford = credits >= repairCost;
                    const isDestroyed = hull.current <= 0;
                    const isDamaged = damageDealt > 0;

                    // Resolve ship-specific image based on ship type and section type
                    const sectionImage = component
                      ? resolveShipSectionImage(selectedSlot.shipId, component.type, true)
                      : null;

                    const repairOneCost = ECONOMY.SECTION_DAMAGE_REPAIR_COST || 200;
                    const canAffordOne = credits >= repairOneCost;

                    return (
                      <RepairSectionCard
                        key={lane}
                        component={component}
                        sectionImage={sectionImage}
                        hull={hull}
                        isDamaged={isDamaged}
                        isDestroyed={isDestroyed}
                        onRepair={() => handleRepairSection(lane)}
                        repairCost={repairCost}
                        canAfford={canAfford}
                        onRepairOne={() => handleRepairSectionPartial(lane)}
                        repairOneCost={repairOneCost}
                        canAffordOne={canAffordOne}
                        lane={lane}
                      />
                    );
                  })}
                </div>
              </section>

            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              Select a ship slot to manage
            </div>
          )}
        </main>

        {/* Sidebar - RIGHT side (exact Hangar ships panel) */}
        <aside
          className="flex flex-col p-6"
          style={{
            borderLeft: '2px solid rgba(6, 182, 212, 0.3)',
            background: 'rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* Toggle section header - matches Hangar */}
          <div className="flex gap-2" style={{ marginBottom: '0.5rem' }}>
            <button className="dw-btn-hud dw-btn-hud-cyan" style={{ flex: 1 }}>
              SHIPS
            </button>
          </div>

          <div className="flex flex-col panel-scrollable" style={{ flex: 1, gap: '0.75rem' }}>
            {singlePlayerShipSlots.filter(slot => slot.id !== 0).map((slot) => {
              const isDefault = singlePlayerProfile?.defaultShipSlotId === slot.id;
              const isActive = slot.status === 'active';
              const isEmpty = slot.status === 'empty';
              const isSelected = slot.id === selectedSlotId;
              const isSlot0 = slot.id === 0;

              // Get card/drone counts for active slots
              const cardCount = isActive ? (slot.decklist || []).reduce((sum, c) => sum + c.quantity, 0) : 0;
              const droneCount = isActive ? (slot.droneSlots || []).filter(s => s.assignedDrone).length : 0;

              // Get ship and deck limit for active slots
              const ship = isActive ? getShipById(slot.shipId) : null;
              const deckLimit = ship?.deckLimits?.totalCards ?? 40;

              // Check if deck is valid (for active slots)
              const deckValidation = isActive ? (() => {
                const deckObj = {};
                (slot.decklist || []).forEach(card => {
                  deckObj[card.id] = card.quantity;
                });
                const dronesObj = {};
                (slot.droneSlots || []).forEach(s => {
                  if (s.assignedDrone) dronesObj[s.assignedDrone] = 1;
                });
                return validateDeckForDeployment(deckObj, dronesObj, slot.shipComponents, deckLimit);
              })() : { valid: true };
              const isValidDeck = deckValidation.valid;

              // Check if ship is undeployable (all sections destroyed)
              const slotValidation = isActive ? validateShipSlot(slot) : { isUndeployable: false };
              const isUndeployable = slotValidation.isUndeployable;

              // Damage count for repair bay
              const damage = countDamage(slot);
              const hasDamage = damage.total > 0;

              // Determine slot state class
              const getSlotClass = () => {
                if (isEmpty) return 'dw-deck-slot--empty';
                if (isUndeployable) return 'dw-deck-slot--undeployable';
                if (isSelected) return 'dw-deck-slot--active';
                if (isDefault) return 'dw-deck-slot--default';
                return '';
              };

              // Get ship image for active slots background
              const shipImage = ship?.image || null;

              return (
                <div
                  key={slot.id}
                  className={`dw-deck-slot ${getSlotClass()}`}
                  onClick={() => isActive && handleSelectSlot(slot.id)}
                  style={shipImage ? {
                    backgroundImage: `url(${shipImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: isActive ? 'pointer' : 'default'
                  } : { cursor: isActive ? 'pointer' : 'default' }}
                >
                    <div className={shipImage ? 'dw-deck-slot-content' : undefined}>
                      {/* Header Row: Slot name/id + Star */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-orbitron text-sm flex items-center gap-1 ${isUndeployable ? 'text-red-400' : 'text-cyan-400'}`}>
                          {isSlot0 ? 'STARTER' : `SLOT ${slot.id}`}
                          {isActive && isUndeployable && (
                            <AlertTriangle size={14} className="text-red-400" title="Ship undeployable - all sections destroyed" />
                          )}
                          {isActive && !isValidDeck && !isUndeployable && (
                            <AlertTriangle size={14} className="text-orange-400" title="Incomplete deck" />
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Star button (only for active slots) */}
                          {isActive && (
                            <button
                              onClick={(e) => handleStarToggle(e, slot.id)}
                              className={`p-1 rounded transition-colors ${
                                isDefault
                                  ? 'text-yellow-400 hover:text-yellow-300'
                                  : 'text-gray-500 hover:text-gray-400'
                              }`}
                              title={isDefault ? 'Default ship for deployment' : 'Set as default'}
                            >
                              <Star size={16} fill={isDefault ? 'currentColor' : 'none'} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Deck Name */}
                      <div className="font-medium text-white text-sm truncate">
                        {isActive ? (slot.name || 'Unnamed Deck') : 'Empty Slot'}
                      </div>

                      {/* Stats for active slots */}
                      {isActive && (
                        <div className={`text-xs mt-1 ${isUndeployable ? 'text-red-400' : isValidDeck ? 'text-gray-400' : 'text-orange-400'}`}>
                          {isUndeployable
                            ? 'UNDEPLOYABLE - All sections destroyed'
                            : <>
                                {cardCount}/{deckLimit} cards • {droneCount}/5 drones
                                {!isValidDeck && ' (incomplete)'}
                              </>
                          }
                        </div>
                      )}

                      {/* Damage Status - Repair Bay specific */}
                      {isActive && (
                        hasDamage ? (
                          <div className="flex items-center gap-1 mt-2 text-yellow-400 text-xs">
                            <AlertTriangle size={12} />
                            {damage.total} section{damage.sections !== 1 ? 's' : ''} damaged
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-2 text-green-400 text-xs">
                            <CheckCircle size={12} />
                            No damage
                          </div>
                        )
                      )}

                      {/* Empty slot indicator */}
                      {isEmpty && (
                        <div className="text-xs text-gray-500 mt-1">
                          Create in Hangar
                        </div>
                      )}
                    </div>
                </div>
              );
            })}
          </div>

          {/* Exit button - matches Hangar exactly */}
          <button
            onClick={handleBack}
            className="dw-btn-hud dw-btn--full"
            style={{ marginTop: 'auto' }}
          >
            EXIT
          </button>
        </aside>
      </div>

      {/* Tutorial Modal */}
      {showTutorial === 'repairBay' && (
        <RepairBayTutorialModal
          onDismiss={() => setShowTutorial(null)}
        />
      )}
    </div>
  );
};

export default RepairBayScreen;
