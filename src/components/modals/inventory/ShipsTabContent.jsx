// ========================================
// SHIPS TAB CONTENT COMPONENT
// ========================================
// Ships category: stats bar and ship grid

import React from 'react';
import { Rocket } from 'lucide-react';
import HiddenShipCard from '../../ui/HiddenShipCard';
import ShipCard from '../../ui/ShipCard';
import { getRarityColor } from './inventoryUtils';
import RarityStatsBar from './RarityStatsBar';

/**
 * ShipsTabContent Component
 * Renders the ships inventory tab with rarity stats and ship grid.
 */
const ShipsTabContent = ({ enrichedShips, shipStats }) => {
  return (
    <>
      {/* Fixed Stats Header */}
      <RarityStatsBar byRarity={shipStats.byRarity} />

      {/* Scrollable Grid */}
      <div>
        {enrichedShips.length === 0 ? (
          <div className="dw-modal-info-box" style={{ textAlign: 'center', padding: '40px' }}>
            <Rocket size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ color: 'var(--modal-text-secondary)' }}>No ships available in the collection</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: '10px',
            justifyItems: 'center'
          }}>
            {enrichedShips.map(ship => {
              const textColor = ship.isStarterShip
                ? 'var(--modal-action)'
                : 'var(--modal-success)';

              return (
                <div
                  key={ship.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderRadius: '4px',
                    padding: '16px',
                    paddingBottom: '10px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {ship.discoveryState === 'undiscovered' ? (
                    /* Undiscovered - Use HiddenShipCard placeholder */
                    <>
                      <div
                        style={{
                          width: '162px',
                          height: '198px',
                          overflow: 'visible'
                        }}
                      >
                        <div style={{
                          transform: 'scale(0.72)',
                          transformOrigin: 'top left'
                        }}>
                          <HiddenShipCard
                            rarity={ship.rarity || 'Common'}
                            size="full"
                            style={{ opacity: 0.8 }}
                          />
                        </div>
                      </div>
                      {/* Rarity label for hidden cards */}
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '4px 0',
                          color: getRarityColor(ship.rarity || 'Common'),
                          fontWeight: '600',
                          fontSize: '15px',
                          textAlign: 'center'
                        }}
                      >
                        {ship.rarity || 'Common'}
                      </div>
                    </>
                  ) : (
                    /* Owned - Show full ShipCard (scaled down) */
                    <>
                      <div
                        style={{
                          width: '162px',
                          height: '198px',
                          overflow: 'visible'
                        }}
                      >
                        <div style={{
                          transform: 'scale(0.72)',
                          transformOrigin: 'top left'
                        }}>
                          <ShipCard ship={ship} isSelectable={false} />
                        </div>
                      </div>

                      {/* Ownership Label */}
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '4px 0',
                          color: textColor,
                          fontWeight: '600',
                          fontSize: '15px',
                          textAlign: 'center'
                        }}
                      >
                        {ship.isStarterShip ? (
                          <>Starter Ship - ∞</>
                        ) : (
                          <>×{ship.ownedCount} Owned</>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default ShipsTabContent;
