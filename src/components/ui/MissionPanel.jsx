/**
 * MissionPanel.jsx
 * Header stat-box component for mission tracking
 *
 * Displays:
 * - Count of active missions
 * - Count of claimable rewards (with notification badge)
 * - Clickable to open MissionTrackerModal
 *
 * Similar pattern to ReputationTrack.jsx
 */

import React from 'react';

/**
 * MissionPanel - Header stat-box for mission status
 *
 * @param {Object} props
 * @param {number} props.activeCount - Number of active (non-claimable) missions
 * @param {number} props.claimableCount - Number of missions with unclaimed rewards
 * @param {Function} props.onClick - Handler for clicking the panel
 */
function MissionPanel({
  activeCount = 0,
  claimableCount = 0,
  onClick,
}) {
  const hasClaimable = claimableCount > 0;

  return (
    <div
      className={`dw-stat-box dw-stat-box--missions ${hasClaimable ? 'has-rewards' : ''}`}
      onClick={onClick}
      style={{ minWidth: '140px', padding: '6px 10px', cursor: 'pointer' }}
      title={hasClaimable ? `Click to claim ${claimableCount} reward(s)!` : 'Click to view missions'}
    >
      {/* Label - matches other stat boxes */}
      <span className="dw-stat-box-label">MISSIONS</span>

      {/* Value row: Active count + Claimable indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Target icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>

        {/* Active count */}
        <span className="dw-stat-box-value" style={{ color: '#22c55e', whiteSpace: 'nowrap' }}>
          {activeCount} Active
        </span>
      </div>

      {/* Notification badge for unclaimed rewards */}
      {hasClaimable && (
        <div className="dw-notification-badge" style={{ background: '#22c55e', top: '2px' }}>
          {claimableCount}
        </div>
      )}
    </div>
  );
}

export default MissionPanel;
