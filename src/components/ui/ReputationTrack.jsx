// ========================================
// REPUTATION TRACK
// ========================================
// Progress bar showing reputation level and progress to next level
// Displays notification badge when unclaimed rewards are available

import React from 'react';
import './ReputationTrack.css';

/**
 * ReputationTrack - Displays reputation progress and level
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
  level = 1,
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

  return (
    <div
      className={`reputation-track ${hasUnclaimed ? 'has-rewards' : ''}`}
      onClick={hasUnclaimed ? onClick : undefined}
      style={{ cursor: hasUnclaimed ? 'pointer' : 'default' }}
      title={hasUnclaimed ? 'Click to claim rewards!' : `${formatNumber(current)} reputation`}
    >
      {/* Label */}
      <div className="reputation-label">REPUTATION</div>

      {/* Level badge */}
      <div className="reputation-level">
        <span className="level-number">{level}</span>
      </div>

      {/* Progress bar */}
      <div className="reputation-bar-container">
        <div
          className="reputation-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Progress text */}
        <div className="reputation-bar-text">
          {isMaxLevel ? (
            'MAX'
          ) : (
            `${formatNumber(currentInLevel)} / ${formatNumber(requiredForNext)}`
          )}
        </div>
      </div>

      {/* Notification badge for unclaimed rewards */}
      {hasUnclaimed && (
        <div className="reputation-notification">
          {unclaimedCount}
        </div>
      )}
    </div>
  );
}

export default ReputationTrack;
