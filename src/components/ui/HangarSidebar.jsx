import React from 'react';
import { Star, Trash2, AlertTriangle } from 'lucide-react';
import SoundManager from '../../managers/SoundManager.js';
import { validateDeckForDeployment } from '../../logic/singlePlayer/singlePlayerDeckUtils.js';
import { validateShipSlot } from '../../logic/combat/shipSlotUtils.js';
import { getShipById } from '../../data/shipData.js';

// Hangar button images
const hangarImages = {
  inventory: new URL('/Hanger/Inventory.png', import.meta.url).href,
  enhancer: new URL('/Hanger/Replicator.png', import.meta.url).href,
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
          className={`dw-btn-hud ${sidebarMode === 'options' ? 'dw-btn-hud-cyan' : 'dw-btn-hud-ghost'}`}
          style={{ flex: 1 }}
        >
          OPTIONS
        </button>
        <button
          onClick={() => onModeToggle('ships')}
          className={`dw-btn-hud ${sidebarMode === 'ships' ? 'dw-btn-hud-cyan' : 'dw-btn-hud-ghost'}`}
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
                { key: 'enhancer', label: 'ENHANCER', image: hangarImages.enhancer },
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
              className="dw-btn-hud dw-btn-hud-ghost dw-btn--full"
            >
              SAVE / LOAD
            </button>
            <button
              onClick={() => onActionClick('exit')}
              className="dw-btn-hud dw-btn--full"
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

              const cardCount = isActive ? (slot.decklist || []).reduce((sum, c) => sum + c.quantity, 0) : 0;
              const droneCount = isActive ? (slot.droneSlots || []).filter(s => s.assignedDrone).length : 0;

              const ship = isActive ? getShipById(slot.shipId) : null;
              const deckLimit = ship?.deckLimits?.totalCards ?? 40;

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
                  onClick={() => onSlotClick(slot)}
                  style={shipImage ? {
                    backgroundImage: `url(${shipImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                    <div className={shipImage ? 'dw-deck-slot-content' : undefined}>
                      {/* Header Row: Slot name/id + Star + Delete */}
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
                        {isActive ? (slot.name || 'Unnamed Deck') : 'Empty Slot'}
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

                      {isEmpty && (
                        <div className="text-xs text-gray-500 mt-1">
                          Click to create
                        </div>
                      )}
                    </div>
                </div>
              );
            })}

            <button
              onClick={onQuickDeploy}
              className="dw-btn-hud dw-btn-hud-ghost dw-btn--full"
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
