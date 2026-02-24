// ========================================
// DRONES TAB CONTENT COMPONENT
// ========================================
// Drones category: stats bar and drone grid

import React from 'react';
import HiddenCard from '../../ui/HiddenCard';
import DroneCard from '../../ui/DroneCard';
import { getRarityColor } from './inventoryUtils';
import RarityStatsBar from './RarityStatsBar';

/**
 * DronesTabContent Component
 * Renders the drones inventory tab with rarity stats and drone grid.
 */
const DronesTabContent = ({ enrichedDrones, droneStats }) => {
  return (
    <>
      {/* Fixed Stats Header */}
      <RarityStatsBar byRarity={droneStats.byRarity} />

      {/* Scrollable Grid */}
      <div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: '10px',
          justifyItems: 'center'
        }}>
          {enrichedDrones.map(drone => {
            const textColor = drone.isStarterDrone
              ? 'var(--modal-action)'
              : 'var(--modal-success)';

            return (
              <div
                key={drone.name || drone.id}
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
                {drone.discoveryState === 'undiscovered' ? (
                  /* Undiscovered - Use HiddenCard placeholder */
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
                        <HiddenCard
                          rarity={drone.rarity}
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
                        color: getRarityColor(drone.rarity),
                        fontWeight: '600',
                        fontSize: '15px',
                        textAlign: 'center'
                      }}
                    >
                      {drone.rarity}
                    </div>
                  </>
                ) : drone.discoveryState === 'discovered' ? (
                  /* Discovered (Blueprint Unlocked) - Show DroneCard with reduced opacity */
                  <>
                    <div
                      style={{
                        width: '162px',
                        height: '198px',
                        overflow: 'visible',
                        opacity: 0.7
                      }}
                    >
                      <div style={{
                        transform: 'scale(0.72)',
                        transformOrigin: 'top left'
                      }}>
                        <DroneCard drone={drone} isViewOnly={true} />
                      </div>
                    </div>

                    {/* Blueprint Unlocked Label */}
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        color: '#3b82f6',
                        fontWeight: '600',
                        fontSize: '13px',
                        textAlign: 'center',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '4px'
                      }}
                    >
                      Blueprint Unlocked
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        color: 'var(--modal-text-secondary)',
                        fontSize: '11px',
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}
                    >
                      Craft in Blueprints
                    </div>
                  </>
                ) : (
                  /* Owned - Show full DroneCard (scaled down) */
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
                        <DroneCard drone={drone} isViewOnly={true} />
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
                      {drone.isStarterDrone ? (
                        <>Starter Drone - ∞</>
                      ) : (
                        <>×{drone.ownedCount} in Inventory</>
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

export default DronesTabContent;
