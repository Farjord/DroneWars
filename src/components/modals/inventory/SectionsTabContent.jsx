// ========================================
// SECTIONS TAB CONTENT COMPONENT
// ========================================
// Ship Sections category: stats bar and component grid

import React from 'react';
import HiddenShipSectionCard from '../../ui/HiddenShipSectionCard';
import ShipSectionCard from '../../ui/ShipSectionCard';
import { getRarityColor } from './inventoryUtils';
import RarityStatsBar from './RarityStatsBar';

/**
 * SectionsTabContent Component
 * Renders the ship sections inventory tab with rarity stats and component grid.
 */
const SectionsTabContent = ({ enrichedComponents, componentStats }) => {
  return (
    <>
      {/* Fixed Stats Header */}
      <RarityStatsBar byRarity={componentStats.byRarity} />

      {/* Scrollable Grid */}
      <div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: '10px',
          justifyItems: 'center'
        }}>
          {enrichedComponents.map(comp => {
            const textColor = comp.isStarterComponent
              ? 'var(--modal-action)'
              : 'var(--modal-success)';

            return (
              <div
                key={comp.id}
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
                {comp.discoveryState === 'undiscovered' ? (
                  /* Undiscovered - Use HiddenShipSectionCard placeholder */
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
                        <HiddenShipSectionCard
                          rarity={comp.rarity}
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
                        color: getRarityColor(comp.rarity),
                        fontWeight: '600',
                        fontSize: '15px',
                        textAlign: 'center'
                      }}
                    >
                      {comp.rarity}
                    </div>
                  </>
                ) : (
                  /* Owned - Show full ShipSectionCard (scaled down) */
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
                        <ShipSectionCard section={comp} isSelectable={false} />
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
                      {comp.isStarterComponent ? (
                        <>Starter Section - ∞</>
                      ) : (
                        <>×{comp.ownedCount} in Inventory</>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SectionsTabContent;
