/**
 * TacticalItemsPanel Component
 * Quick-use panel for tactical items on the tactical map
 * Position: Bottom-right of hex grid (left of HexInfoPanel)
 */

import React from 'react';
import { getTacticalItemById } from '../../data/tacticalItemData.js';

// Get item data with images
const evadeItem = getTacticalItemById('ITEM_EVADE');
const extractItem = getTacticalItemById('ITEM_EXTRACT');
const threatReduceItem = getTacticalItemById('ITEM_THREAT_REDUCE');

/**
 * TacticalItemsPanel Component
 * Shows tactical items with quantities and usage states
 *
 * @param {number} evadeCount - Number of Emergency Jammer items
 * @param {number} extractCount - Number of Clearance Override items
 * @param {number} threatReduceCount - Number of Signal Dampener items
 * @param {number} currentDetection - Current detection level (0-100)
 * @param {Function} onUseThreatReduce - Callback when threat reduce is used
 */
const TacticalItemsPanel = ({
  evadeCount = 0,
  extractCount = 0,
  threatReduceCount = 0,
  currentDetection = 0,
  onUseThreatReduce
}) => {
  // Threat reduce is only usable when we have items AND detection > 0
  const canUseThreatReduce = threatReduceCount > 0 && currentDetection > 0;

  const handleThreatReduceClick = () => {
    if (canUseThreatReduce && onUseThreatReduce) {
      onUseThreatReduce();
    }
  };

  // Common item slot style with background image
  const getItemSlotStyle = (imageUrl, isActive, isClickable = false) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '60px',
    height: '60px',
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: '6px',
    border: '1px solid rgba(6, 182, 212, 0.5)',
    opacity: isActive ? 1 : 0.5,
    cursor: isClickable ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease',
    position: 'relative'
  });

  // Quantity badge style
  const quantityBadgeStyle = {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    background: 'rgba(0, 0, 0, 0.8)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#06b6d4',
    border: '1px solid rgba(6, 182, 212, 0.4)'
  };

  return (
    <div
      className="font-orbitron"
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '336px', // 320px HexInfoPanel + 16px spacing
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        borderRadius: '8px',
        padding: '12px',
        zIndex: 115
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#06b6d4',
          marginBottom: '10px',
          borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
          paddingBottom: '6px',
          textAlign: 'center'
        }}
      >
        Tactical Items
      </div>

      {/* Items Grid */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Evade Slot - Context locked (use in encounter modal) */}
        <div
          data-testid="tactical-item-evade"
          data-locked="true"
          title="Emergency Jammer - Use during encounters to skip combat"
          style={getItemSlotStyle(evadeItem?.image, evadeCount > 0, false)}
        >
          <span style={quantityBadgeStyle}>x{evadeCount}</span>
        </div>

        {/* Extract Slot - Context locked (use at extraction gates) */}
        <div
          data-testid="tactical-item-extract"
          data-locked="true"
          title="Clearance Override - Use at extraction gates to bypass blockade"
          style={getItemSlotStyle(extractItem?.image, extractCount > 0, false)}
        >
          <span style={quantityBadgeStyle}>x{extractCount}</span>
        </div>

        {/* Threat Reduce Slot - Usable anytime when detection > 0 */}
        <div
          data-testid="tactical-item-threat"
          data-disabled={!canUseThreatReduce ? 'true' : undefined}
          onClick={handleThreatReduceClick}
          title="Signal Dampener - Reduce detection level by 20%"
          style={getItemSlotStyle(threatReduceItem?.image, threatReduceCount > 0, canUseThreatReduce)}
          onMouseEnter={(e) => {
            if (canUseThreatReduce) {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(6, 182, 212, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (canUseThreatReduce) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <span style={quantityBadgeStyle}>x{threatReduceCount}</span>
        </div>
      </div>

      {/* Context hint */}
      <div
        style={{
          fontSize: '9px',
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: '8px',
          textAlign: 'center'
        }}
      >
        Click Signal Dampener to reduce detection
      </div>
    </div>
  );
};

export default TacticalItemsPanel;
