/**
 * RunInventoryModal.jsx
 * Shows all loot collected during the current extraction run
 * Accessible via inventory button on TacticalMapHUD
 */

import React from 'react';
import fullCardCollection from '../../data/cardData';
import { RARITY_COLORS } from '../../data/cardPackData';
import { ECONOMY } from '../../data/economyData.js';
import { EXTRACTION_LIMIT_BONUS_RANKS } from '../../data/reputationRewardsData.js';
import { useGameState } from '../../hooks/useGameState';
import ActionCard from '../ui/ActionCard.jsx';
import ResourceCard from '../ui/ResourceCard.jsx';
import DroneCard from '../ui/DroneCard.jsx';
import { Package, Cpu, Key } from 'lucide-react';

const RunInventoryModal = ({ currentRunState, onClose }) => {
  const { gameState } = useGameState();

  if (!currentRunState) return null;

  const { collectedLoot = [] } = currentRunState;

  // Calculate extraction limit (same logic as TacticalMapScreen)
  const isStarterDeck = currentRunState.shipSlotId === 0;
  const baseLimit = isStarterDeck
    ? (ECONOMY.STARTER_DECK_EXTRACTION_LIMIT || 3)
    : (ECONOMY.CUSTOM_DECK_EXTRACTION_LIMIT || 6);

  // Calculate reputation bonus
  const reputation = gameState?.singlePlayerProfile?.reputation || {};
  const currentLevel = reputation.level || 1;
  const reputationBonus = EXTRACTION_LIMIT_BONUS_RANKS.filter(rank => currentLevel >= rank).length;

  // Calculate damaged sections penalty
  const shipSections = currentRunState.shipSections || {};
  const damagedCount = ['bridge', 'powerCell', 'droneControlHub'].filter(
    section => (shipSections[section]?.hull || 0) <= 0
  ).length;

  const extractionLimit = Math.max(0, baseLimit + reputationBonus - damagedCount);

  // Extract different item types from collectedLoot
  const cardLoot = collectedLoot.filter(item => item.type === 'card');
  const salvageItems = collectedLoot.filter(item => item.type === 'salvageItem');
  const aiCoresItems = collectedLoot.filter(item => item.type === 'aiCores');
  const tokenItems = collectedLoot.filter(item => item.type === 'token');
  const blueprints = collectedLoot.filter(item => item.type === 'blueprint');

  // Calculate totals
  const salvageCredits = salvageItems.reduce((sum, item) => sum + (item.creditValue || 0), 0);
  const totalAiCores = aiCoresItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalTokens = tokenItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Group cards by rarity for display
  const cardsByRarity = {
    Common: cardLoot.filter(c => c.rarity === 'Common'),
    Uncommon: cardLoot.filter(c => c.rarity === 'Uncommon'),
    Rare: cardLoot.filter(c => c.rarity === 'Rare'),
    Mythic: cardLoot.filter(c => c.rarity === 'Mythic'),
  };

  // Separate drone blueprints from card blueprints
  const droneBlueprints = blueprints.filter(bp => bp.blueprintType === 'drone' && bp.droneData);

  const getRarityColor = (rarity) => RARITY_COLORS[rarity] || '#808080';

  // Check if we have any loot at all
  const hasAnyLoot = cardLoot.length > 0 || salvageItems.length > 0 || totalAiCores > 0 || totalTokens > 0 || blueprints.length > 0;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Package size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">RUN INVENTORY</h2>
            <p className="dw-modal-header-subtitle">Items collected this run - added to collection upon extraction</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body dw-modal-scroll" style={{ maxHeight: '65vh' }}>
          {/* Stats Bar - Grid with equal-width boxes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <div className="dw-stat-box" style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--modal-text-primary)' }}>{cardLoot.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', textTransform: 'uppercase' }}>Cards</div>
            </div>
            <div className="dw-stat-box" style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#eab308' }}>{salvageItems.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', textTransform: 'uppercase' }}>Salvage</div>
              <div style={{ fontSize: '10px', color: '#eab308', opacity: 0.8 }}>worth {salvageCredits} cr</div>
            </div>
            <div className="dw-stat-box" style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#a855f7' }}>{totalAiCores}</div>
              <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', textTransform: 'uppercase' }}>AI Cores</div>
            </div>
            <div className="dw-stat-box" style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#06b6d4' }}>{totalTokens}</div>
              <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', textTransform: 'uppercase' }}>Tokens</div>
            </div>
            <div className="dw-stat-box" style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>{blueprints.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', textTransform: 'uppercase' }}>Blueprints</div>
            </div>
          </div>

          {/* Extraction Limit Info */}
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
            padding: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            <span style={{ color: 'var(--modal-text-muted)' }}>Extraction Limit: </span>
            <span style={{
              fontWeight: 700,
              color: collectedLoot.length > extractionLimit ? '#ef4444' : '#22c55e'
            }}>
              {collectedLoot.length}/{extractionLimit}
            </span>
            {collectedLoot.length > extractionLimit && (
              <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '11px' }}>
                (Must select items before extraction)
              </span>
            )}
          </div>

          {/* Empty State */}
          {!hasAnyLoot && (
            <div className="dw-modal-info-box" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--modal-text-primary)' }}>No items collected yet</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--modal-text-muted)' }}>
                Win combat encounters or loot POIs to collect items
              </p>
            </div>
          )}

          {/* Cards by Rarity */}
          {cardLoot.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--modal-text-primary)',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Cards</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {['Common', 'Uncommon', 'Rare', 'Mythic'].map(rarity => {
                  const cards = cardsByRarity[rarity];
                  if (cards.length === 0) return null;

                  return (
                    <div key={rarity}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: `2px solid ${getRarityColor(rarity)}`,
                        paddingBottom: '8px',
                        marginBottom: '12px'
                      }}>
                        <span style={{ fontWeight: 700, color: getRarityColor(rarity), fontSize: '13px' }}>
                          {rarity}
                        </span>
                        <span style={{ color: 'var(--modal-text-secondary)', fontSize: '12px' }}>×{cards.length}</span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))',
                        gap: '16px',
                        justifyItems: 'center'
                      }}>
                        {cards.map((item, index) => {
                          const cardData = fullCardCollection.find(c => c.id === item.cardId);

                          return cardData ? (
                            <div key={`${item.cardId}-${index}`}>
                              <ActionCard card={cardData} isPlayable={true} />
                            </div>
                          ) : (
                            <div
                              key={`${item.cardId}-${index}`}
                              style={{
                                padding: '12px',
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: '6px',
                                border: `1px solid ${getRarityColor(rarity)}`,
                                textAlign: 'center'
                              }}
                            >
                              <p style={{ margin: 0, fontSize: '13px', color: 'var(--modal-text-primary)' }}>
                                {item.cardName || 'Unknown Card'}
                              </p>
                              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--modal-text-muted)' }}>
                                {item.cardType || 'Unknown'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Salvage Items */}
          {salvageItems.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#eab308',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Salvage Items</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))',
                gap: '16px',
                justifyItems: 'center'
              }}>
                {salvageItems.map((item, index) => (
                  <div key={`salvage-${index}`}>
                    <ResourceCard
                      resourceType="salvageItem"
                      salvageItem={{
                        name: item.name,
                        creditValue: item.creditValue,
                        image: item.image,
                        description: item.description
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Cores & Tokens */}
          {(totalAiCores > 0 || totalTokens > 0) && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--modal-text-primary)',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Resources</h3>
              <div style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                {totalAiCores > 0 && (
                  <div>
                    <ResourceCard
                      resourceType="aiCores"
                      amount={totalAiCores}
                    />
                  </div>
                )}
                {totalTokens > 0 && (
                  <div>
                    <ResourceCard
                      resourceType="token"
                      amount={totalTokens}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Blueprints */}
          {blueprints.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#22c55e',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Blueprints</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))',
                gap: '16px',
                justifyItems: 'center'
              }}>
                {droneBlueprints.map((bp, index) => (
                  <div key={`drone-bp-${index}`}>
                    <DroneCard drone={bp.droneData} />
                  </div>
                ))}
                {/* Non-drone blueprints (legacy format) */}
                {blueprints.filter(bp => !bp.droneData).map((bp, index) => (
                  <div
                    key={`bp-${index}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '16px',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      width: '160px'
                    }}
                  >
                    <Cpu size={32} style={{ color: '#22c55e' }} />
                    <span style={{ fontSize: '13px', color: 'var(--modal-text-primary)', textAlign: 'center' }}>
                      {bp.blueprintId}
                    </span>
                    {bp.rarity && (
                      <span style={{ fontSize: '11px', color: getRarityColor(bp.rarity) }}>
                        {bp.rarity}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-confirm dw-btn--full">
            Return to Map
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunInventoryModal;
