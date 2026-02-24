// ========================================
// TACTICAL TAB CONTENT COMPONENT
// ========================================
// Tactical Items category: item grid and info box

import React from 'react';
import TacticalItemCard from '../../ui/TacticalItemCard';
import { tacticalItemCollection } from '../../../data/tacticalItemData';

/**
 * TacticalTabContent Component
 * Renders the tactical items inventory tab with item grid and info box.
 */
const TacticalTabContent = ({ singlePlayerProfile }) => {
  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '10px',
        justifyItems: 'center'
      }}>
        {tacticalItemCollection.map(item => {
          const owned = singlePlayerProfile?.tacticalItems?.[item.id] || 0;
          const isAtMax = owned >= item.maxCapacity;

          return (
            <div
              key={item.id}
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
                  <TacticalItemCard item={item} />
                </div>
              </div>

              {/* Quantity Display Below Card */}
              <div
                style={{
                  marginTop: '8px',
                  padding: '4px 0',
                  color: isAtMax ? 'var(--modal-success)' : 'var(--modal-text-primary)',
                  fontWeight: '600',
                  fontSize: '15px',
                  textAlign: 'center'
                }}
              >
                <span className="font-orbitron">{owned} / {item.maxCapacity}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="dw-modal-info-box" style={{ marginTop: '16px', background: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
        <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0 }}>
          <strong style={{ color: '#06b6d4' }}>Tactical Items</strong> can be purchased in the Shop and used during tactical map runs.
          Visit the <strong>Shop</strong> to buy more items.
        </p>
      </div>
    </div>
  );
};

export default TacticalTabContent;
