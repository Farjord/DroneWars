import React from 'react';
import { Star, Trash2, AlertTriangle, Lock } from 'lucide-react';
import SoundManager from '../../managers/SoundManager.js';
import ReputationService from '../../logic/reputation/ReputationService';
import miaRecoveryService from '../../logic/singlePlayer/MIARecoveryService.js';
import { validateDeckForDeployment } from '../../logic/singlePlayer/singlePlayerDeckUtils.js';
import { validateShipSlot } from '../../logic/combat/slotDamageUtils.js';
import { ECONOMY } from '../../data/economyData.js';
import { getShipById } from '../../data/shipData.js';

// Hangar button images
const hangarImages = {
  inventory: new URL('/Hanger/Inventory.png', import.meta.url).href,
  replicator: new URL('/Hanger/Replicator.png', import.meta.url).href,
  blueprints: new URL('/Hanger/Blueprints.png', import.meta.url).href,
  shop: new URL('/Hanger/Shop.png', import.meta.url).href,
  repairBay: new URL('/Hanger/RepairBay.png', import.meta.url).href
};

const HangarSidebar = ({
  sidebarMode,
  hoveredButton,
  setHoveredButton,
  singlePlayerShipSlots,
  singlePlayerProfile,
  gameStateManager,
  onModeToggle,
  onActionClick,
  onSlotClick,
  onStarToggle,
  onDeleteClick,
  onUnlockSlot,
  onQuickDeploy
}) => {
  return (
    <div className="flex flex-col p-6" style={{
      borderRadius: 0,
      borderLeft: '2px solid rgba(6, 182, 212, 0.3)',
      background: 'rgba(0, 0, 0, 0.4)',
      gap: '1rem'
    }}>
      {/* Toggle Buttons */}
      <div className="flex gap-2" style={{ marginBottom: '0.5rem' }}>
        <button
          onClick={() => onModeToggle('options')}
          className={`dw-btn ${sidebarMode === 'options' ? 'dw-btn-confirm' : 'dw-btn-secondary'}`}
          style={{ flex: 1 }}
        >
          OPTIONS
        </button>
        <button
          onClick={() => onModeToggle('ships')}
          className={`dw-btn ${sidebarMode === 'ships' ? 'dw-btn-confirm' : 'dw-btn-secondary'}`}
          style={{ flex: 1 }}
        >
          SHIPS
        </button>
      </div>

      {/* Dynamic Panel */}
      <div className="flex flex-col panel-scrollable" style={{ flex: 1, gap: '0.75rem' }}>
        {sidebarMode === 'options' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
              {[
                { key: 'inventory', label: 'INVENTORY', image: hangarImages.inventory },
                { key: 'replicator', label: 'REPLICATOR', image: hangarImages.replicator },
                { key: 'blueprints', label: 'BLUEPRINTS', image: hangarImages.blueprints },
                { key: 'shop', label: 'SHOP', image: hangarImages.shop },
                { key: 'repairBay', label: 'REPAIR BAY', image: hangarImages.repairBay }
              ].map(({ key, label, image }) => {
                const isHovered = hoveredButton === key;
                return (
                  <button
                    key={key}
                    onClick={() => onActionClick(key)}
                    onMouseEnter={() => { SoundManager.getInstance().play('hover_over'); setHoveredButton(key); }}
                    onMouseLeave={() => setHoveredButton(null)}
                    style={{
                      backgroundImage: `url('${image}')`,
                      backgroundPosition: 'center',
                      backgroundSize: isHovered ? '115%' : '100%',
                      flex: 1,
                      minHeight: '100px',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      borderRadius: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: 0,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'background-size 0.3s ease'
                    }}
                  >
                    <div style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.7)',
                      padding: '8px 12px',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: '#fff'
                      }}>{label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onActionClick('saveLoad')}
              className="dw-btn dw-btn-secondary dw-btn--full"
            >
              SAVE / LOAD
            </button>
            <button
              onClick={() => onActionClick('exit')}
              className="dw-btn dw-btn-danger dw-btn--full"
              style={{ marginTop: 'auto' }}
            >
              EXIT
            </button>
          </>
        ) : (
          <>
            {singlePlayerShipSlots.map((slot) => {
              const isDefault = singlePlayerProfile?.defaultShipSlotId === slot.id;
              const isSlot0 = slot.id === 0;
              const isActive = slot.status === 'active';
              const isEmpty = slot.status === 'empty';
              const isMia = slot.status === 'mia';

              const isUnlocked = gameStateManager.isSlotUnlocked(slot.id);
              const highestUnlocked = singlePlayerProfile?.highestUnlockedSlot ?? 0;
              const isNextToUnlock = !isUnlocked && slot.id === highestUnlocked + 1;
              const unlockCost = isNextToUnlock ? ECONOMY.DECK_SLOT_UNLOCK_COSTS[slot.id] : null;
              const credits = singlePlayerProfile?.credits ?? 0;
              const canAfford = unlockCost !== null && credits >= unlockCost;

              const cardCount = isActive ? (slot.decklist || []).reduce((sum, c) => sum + c.quantity, 0) : 0;
              const droneCount = isActive ? (slot.droneSlots || []).filter(s => s.assignedDrone).length : 0;

              const ship = isActive ? getShipById(slot.shipId) : null;
              const deckLimit = ship?.deckLimits?.totalCards ?? 40;

              const loadoutValueData = isActive ? ReputationService.getLoadoutValue(slot) : null;

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

              const slotValidation = isActive ? validateShipSlot(slot) : { isUndeployable: false };
              const isUndeployable = slotValidation.isUndeployable;

              const getSlotClass = () => {
                if (!isUnlocked) return 'dw-deck-slot--locked';
                if (isMia) return 'dw-deck-slot--mia';
                if (isEmpty) return 'dw-deck-slot--empty';
                if (isUndeployable) return 'dw-deck-slot--undeployable';
                if (isDefault) return 'dw-deck-slot--default';
                return 'dw-deck-slot--active';
              };

              const shipImage = ship?.image || null;

              return (
                <div
                  key={slot.id}
                  className={`dw-deck-slot ${getSlotClass()}`}
                  onClick={() => isUnlocked && onSlotClick(slot)}
                  style={shipImage ? {
                    backgroundImage: `url(${shipImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {!isUnlocked ? (
                    <div className="dw-deck-slot-locked-content">
                      <Lock size={18} className="dw-deck-slot-lock-icon" />
                      <span className="dw-deck-slot-locked-label">SLOT {slot.id}</span>

                      {isNextToUnlock ? (
                        <button
                          className={`dw-btn dw-btn-confirm dw-btn--sm dw-btn--full ${!canAfford ? 'dw-btn--disabled' : ''}`}
                          onClick={onUnlockSlot}
                          disabled={!canAfford}
                        >
                          UNLOCK - {unlockCost?.toLocaleString()}
                        </button>
                      ) : (
                        <span className="dw-deck-slot-locked-hint">
                          Unlock Slot {slot.id - 1} first
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className={shipImage ? 'dw-deck-slot-content' : undefined}>
                      {/* Header Row: Slot name/id + Star + Delete */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-orbitron text-sm flex items-center gap-1 ${isMia ? 'text-red-400' : isUndeployable ? 'text-red-400' : 'text-cyan-400'}`}>
                          {isSlot0 ? 'STARTER' : `SLOT ${slot.id}`}
                          {isActive && isUndeployable && (
                            <AlertTriangle size={14} className="text-red-400" title="Ship undeployable - all sections destroyed" />
                          )}
                          {isActive && !isValidDeck && !isUndeployable && (
                            <AlertTriangle size={14} className="text-orange-400" title="Incomplete deck" />
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          {isActive && (
                            <button
                              onClick={(e) => onStarToggle(e, slot.id)}
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
                          {isActive && !isSlot0 && (
                            <button
                              onClick={(e) => onDeleteClick(e, slot)}
                              className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                              title="Delete deck"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="font-medium text-white text-sm truncate">
                        {isActive ? (slot.name || 'Unnamed Deck') : isMia ? 'MIA' : 'Empty Slot'}
                      </div>

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

                      {isActive && (
                        <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '4px' }}>
                          {loadoutValueData?.isStarterDeck
                            ? 'Loadout Value: None (Starter)'
                            : `Loadout Value: ${loadoutValueData?.totalValue?.toLocaleString() || 0}`}
                        </div>
                      )}

                      {isActive && !isSlot0 && (
                        <div style={{ fontSize: '11px', color: '#f97316', marginTop: '2px' }}>
                          MIA Recovery: {miaRecoveryService.calculateRecoveryCost(slot.id).toLocaleString()}
                        </div>
                      )}

                      {isMia && (
                        <div className="text-xs text-red-400 mt-1">
                          Click to recover
                        </div>
                      )}

                      {isEmpty && (
                        <div className="text-xs text-gray-500 mt-1">
                          Click to create
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={onQuickDeploy}
              className="dw-btn dw-btn-secondary dw-btn--full"
              style={{ marginTop: '0.5rem' }}
            >
              QUICK DEPLOYMENTS
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HangarSidebar;
