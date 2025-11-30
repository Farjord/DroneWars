// ========================================
// REPUTATION TRACK
// ========================================
// Displays reputation level and progress using dw-stat-box styling
// Matches visual consistency with other hangar header stats

import React from 'react';

/**
 * ReputationTrack - Displays reputation progress and level
 * Uses dw-stat-box styling with purple theme variant
 *
 * @param {Object} props
 * @param {number} props.current - Current reputation points
 * @param {number} props.level - Current level
 * @param {number} props.progress - Progress to next level (0-1)
 * @param {number} props.currentInLevel - Points earned in current level
 * @param {number} props.requiredForNext - Points needed for next level
 * @param {number} props.unclaimedCount - Number of unclaimed rewards
 * @param {boolean} props.isMaxLevel - Whether player is at max level
 * @param {Function} props.onClick - Handler for clicking to claim rewards
 */
function ReputationTrack({
  current = 0,
  level = 0,
  progress = 0,
  currentInLevel = 0,
  requiredForNext = 0,
  unclaimedCount = 0,
  isMaxLevel = false,
  onClick,
}) {
  const hasUnclaimed = unclaimedCount > 0;
  const progressPercent = Math.min(100, Math.max(0, progress * 100));

  // Format large numbers with K suffix
  const formatNumber = (num) => {
    if (num >= 10000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Progress text
  const progressText = isMaxLevel
    ? 'MAX'
    : `${formatNumber(currentInLevel)}/${formatNumber(requiredForNext)}`;

  return (
    <div
      className={`dw-stat-box dw-stat-box--reputation ${hasUnclaimed ? 'has-rewards' : ''}`}
      onClick={onClick}
      style={{ minWidth: '180px', padding: '6px 10px', cursor: 'pointer' }}
      title={hasUnclaimed ? `Click to claim ${unclaimedCount} reward(s)!` : 'Click to view reputation progress'}
    >
      {/* Label - matches other stat boxes */}
      <span className="dw-stat-box-label">REPUTATION</span>

      {/* Value row: Level + Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Level display */}
        <span className="dw-stat-box-value" style={{ color: '#a855f7', whiteSpace: 'nowrap' }}>
          Lv.{level}
        </span>

        {/* Progress bar */}
        <div className="reputation-progress">
          <div
            className="reputation-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
          <span className="reputation-progress-text">
            {progressText}
          </span>
        </div>
      </div>

      {/* Notification badge for unclaimed rewards */}
      {hasUnclaimed && (
        <div className="dw-notification-badge">
          {unclaimedCount}
        </div>
      )}
    </div>
  );
}

export default ReputationTrack;
