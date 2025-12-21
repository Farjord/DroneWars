/**
 * MissionTrackerModal.jsx
 * Full mission list modal with progress and claim functionality
 *
 * Displays all active missions organized by category,
 * shows progress for each, and allows claiming completed rewards.
 */

import React, { useState, useEffect } from 'react';
import MissionService from '../../logic/missions/MissionService.js';
import { MISSION_CATEGORIES } from '../../data/missionData.js';

/**
 * Get category display name
 */
function getCategoryName(category) {
  const names = {
    [MISSION_CATEGORIES.INTRO]: 'Introduction',
    [MISSION_CATEGORIES.COMBAT]: 'Combat',
    [MISSION_CATEGORIES.EXTRACTION]: 'Extraction',
    [MISSION_CATEGORIES.COLLECTION]: 'Collection',
  };
  return names[category] || category;
}

/**
 * Get category color
 */
function getCategoryColor(category) {
  const colors = {
    [MISSION_CATEGORIES.INTRO]: '#3b82f6', // blue
    [MISSION_CATEGORIES.COMBAT]: '#ef4444', // red
    [MISSION_CATEGORIES.EXTRACTION]: '#22c55e', // green
    [MISSION_CATEGORIES.COLLECTION]: '#f59e0b', // amber
  };
  return colors[category] || '#6b7280';
}

/**
 * MissionTrackerModal - Displays all active missions
 *
 * @param {Object} props
 * @param {Function} props.onClose - Handler to close the modal
 * @param {Function} props.onRewardClaimed - Optional callback when reward is claimed
 */
function MissionTrackerModal({ onClose, onRewardClaimed }) {
  const [missions, setMissions] = useState([]);
  const [claimedMission, setClaimedMission] = useState(null);

  useEffect(() => {
    setMissions(MissionService.getActiveMissions());
  }, []);

  const handleClaim = (missionId) => {
    const result = MissionService.claimReward(missionId);
    if (result.success) {
      setClaimedMission({ missionId, reward: result.reward });
      // Refresh missions list
      setMissions(MissionService.getActiveMissions());
      // Notify parent
      if (onRewardClaimed) {
        onRewardClaimed(missionId, result.reward);
      }
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Group missions by category
  const missionsByCategory = missions.reduce((acc, mission) => {
    const cat = mission.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(mission);
    return acc;
  }, {});

  // Sort categories for display
  const categoryOrder = [
    MISSION_CATEGORIES.INTRO,
    MISSION_CATEGORIES.COMBAT,
    MISSION_CATEGORIES.EXTRACTION,
    MISSION_CATEGORIES.COLLECTION,
  ];

  const sortedCategories = Object.keys(missionsByCategory).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return (
    <div className="dw-modal-overlay" onClick={handleOverlayClick}>
      <div
        className="dw-modal-content dw-modal--lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: '#22c55e' }}>
            {/* Target icon */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Missions</h2>
            <p className="dw-modal-header-subtitle">
              Complete missions to earn credits and rewards
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body dw-modal-scroll" style={{ overflowY: 'auto', maxHeight: '50vh' }}>
          {missions.length === 0 ? (
            <p style={{ color: 'var(--modal-text-secondary)', textAlign: 'center', padding: '20px' }}>
              No active missions available.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sortedCategories.map((category) => (
                <div key={category}>
                  {/* Category header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: `2px solid ${getCategoryColor(category)}40`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: getCategoryColor(category),
                      }}
                    >
                      {getCategoryName(category)}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                      ({missionsByCategory[category].length})
                    </span>
                  </div>

                  {/* Missions in category */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {missionsByCategory[category]
                      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                      .map((mission) => (
                        <MissionCard
                          key={mission.id}
                          mission={mission}
                          onClaim={handleClaim}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * MissionCard - Individual mission display
 */
function MissionCard({ mission, onClaim }) {
  const progressPercent = Math.min(
    100,
    (mission.progress.current / mission.progress.target) * 100
  );
  const isComplete = mission.progress.current >= mission.progress.target;

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: mission.isClaimable
          ? '1px solid rgba(34, 197, 94, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '12px 16px',
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: mission.isClaimable ? '#22c55e' : 'var(--modal-text-primary)',
          }}
        >
          {mission.title}
        </h4>

        {/* Reward badge */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: '#f59e0b',
            fontWeight: 600,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
          {mission.reward.credits}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          margin: '0 0 12px 0',
          fontSize: '12px',
          color: 'var(--modal-text-secondary)',
          lineHeight: 1.4,
        }}
      >
        {mission.description}
      </p>

      {/* Progress bar and claim button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Progress bar */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: isComplete
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              marginTop: '4px',
              fontSize: '10px',
              color: 'var(--modal-text-secondary)',
            }}
          >
            {mission.progress.current}/{mission.progress.target}
          </div>
        </div>

        {/* Claim button */}
        {mission.isClaimable && (
          <button
            className="dw-btn dw-btn-confirm"
            style={{ padding: '6px 16px', fontSize: '12px' }}
            onClick={() => onClaim(mission.id)}
          >
            Claim
          </button>
        )}
      </div>
    </div>
  );
}

export default MissionTrackerModal;
