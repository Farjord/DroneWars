import React, { useState, useMemo } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { debugLog } from '../../utils/debugLogger.js';
import { validateDeckForDeployment } from '../../utils/singlePlayerDeckUtils.js';
import aiPersonalities from '../../data/aiData.js';
import { Skull, AlertTriangle, Trophy, Coins, Cpu, Star } from 'lucide-react';

/**
 * BossEncounterModal Component
 * Shows boss details, rewards preview, and ship selection for boss challenges
 */
const BossEncounterModal = ({ bossId, selectedSlotId, onChallenge, onClose }) => {
  const { gameState } = useGameState();
  const [currentSlotId, setCurrentSlotId] = useState(selectedSlotId || 0);

  const {
    singlePlayerShipSlots,
    singlePlayerProfile
  } = gameState;

  // Find boss AI configuration
  const bossAI = useMemo(() => {
    return aiPersonalities.find(ai => ai.bossId === bossId);
  }, [bossId]);

  // Check if boss has been defeated before
  const bossProgress = singlePlayerProfile?.bossProgress || {
    defeatedBosses: [],
    totalBossVictories: 0,
    totalBossAttempts: 0
  };
  const isFirstVictory = !bossProgress.defeatedBosses.includes(bossId);

  // Get appropriate rewards based on victory status
  const rewards = isFirstVictory
    ? bossAI?.bossConfig?.firstTimeReward
    : bossAI?.bossConfig?.repeatReward;

  // Compute all active slots with validity info
  const allActiveSlots = useMemo(() => {
    if (!singlePlayerShipSlots) return [];

    return singlePlayerShipSlots
      .filter(slot => slot.status === 'active')
      .map(slot => {
        const deckObj = {};
        (slot.decklist || []).forEach(card => {
          deckObj[card.id] = card.quantity;
        });
        const dronesObj = {};
        (slot.droneSlots || []).forEach(s => {
          if (s.assignedDrone) dronesObj[s.assignedDrone] = 1;
        });

        const validation = validateDeckForDeployment(deckObj, dronesObj, slot.shipComponents);
        return { ...slot, isValid: validation.valid };
      });
  }, [singlePlayerShipSlots]);

  // Check if current slot is invalid
  const isCurrentSlotInvalid = useMemo(() => {
    const current = allActiveSlots.find(s => s.id === currentSlotId);
    return current && !current.isValid;
  }, [allActiveSlots, currentSlotId]);

  // Handle challenge button click
  const handleChallengeClick = () => {
    debugLog('BOSS', 'Challenge boss clicked', { bossId, slotId: currentSlotId });
    onChallenge(currentSlotId, bossId);
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  // Error state: Boss not found
  if (!bossAI) {
    return (
      <div className="dw-modal-overlay" onClick={onClose}>
        <div className="dw-modal-content dw-modal--sm dw-modal--danger" onClick={e => e.stopPropagation()}>
          <div className="dw-modal-header">
            <div className="dw-modal-header-icon">
              <AlertTriangle size={28} />
            </div>
            <div className="dw-modal-header-info">
              <h2 className="dw-modal-header-title">Boss not found</h2>
              <p className="dw-modal-header-subtitle">Unable to load boss data</p>
            </div>
          </div>
          <div className="dw-modal-body">
            <p className="dw-modal-text">
              The requested boss encounter could not be found.
            </p>
          </div>
          <div className="dw-modal-actions">
            <button onClick={onClose} className="dw-btn dw-btn-cancel dw-btn--full">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const bossConfig = bossAI.bossConfig || {};

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--lg dw-modal--danger" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Skull size={32} style={{ color: '#ef4444' }} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title" style={{ color: '#ef4444' }}>
              {bossConfig.displayName || bossAI.name}
            </h2>
            <p className="dw-modal-header-subtitle">
              {bossConfig.subtitle || 'Boss Encounter'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Rewards Section */}
          <div className="dw-modal-info-box" style={{ marginBottom: '16px' }}>
            <p className="dw-modal-info-title" style={{
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: isFirstVictory ? '#22c55e' : '#f59e0b'
            }}>
              <Trophy size={18} />
              {isFirstVictory ? 'FIRST VICTORY REWARDS' : 'REPEAT VICTORY REWARDS'}
            </p>

            <div className="dw-modal-grid dw-modal-grid--3">
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Coins size={14} style={{ color: '#f59e0b' }} />
                  Credits
                </div>
                <div className="dw-modal-stat-value" style={{ color: '#f59e0b' }}>
                  {formatNumber(rewards?.credits)}
                </div>
              </div>
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Cpu size={14} style={{ color: '#3b82f6' }} />
                  AI Cores
                </div>
                <div className="dw-modal-stat-value" style={{ color: '#3b82f6' }}>
                  {rewards?.aiCores || 0}
                </div>
              </div>
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={14} style={{ color: '#a855f7' }} />
                  Reputation
                </div>
                <div className="dw-modal-stat-value" style={{ color: '#a855f7' }}>
                  {rewards?.reputation || 0}
                </div>
              </div>
            </div>
          </div>

          {/* MIA Warning */}
          <div className="dw-modal-info-box" style={{
            marginBottom: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ color: '#ef4444', fontWeight: 700, margin: '0 0 4px 0' }}>
                  WARNING: MIA RISK
                </p>
                <p style={{ color: 'var(--modal-text-secondary)', margin: 0, fontSize: '13px' }}>
                  Ship will be lost if defeated or if you abandon the fight. Custom loadouts will be marked MIA. Starter Deck can always be reused.
                </p>
              </div>
            </div>
          </div>

          {/* Ship Selection */}
          <div className="dw-modal-info-box">
            <p className="dw-modal-info-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              SELECT SHIP
              {isCurrentSlotInvalid && (
                <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} />
                  INVALID
                </span>
              )}
            </p>
            {allActiveSlots.length > 0 ? (
              <select
                value={currentSlotId}
                onChange={(e) => setCurrentSlotId(Number(e.target.value))}
                className="w-full bg-slate-700 border border-cyan-500/50 rounded px-3 py-2 text-white font-orbitron focus:outline-none focus:border-cyan-400"
              >
                {allActiveSlots.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {!slot.isValid ? '⚠ ' : ''}{slot.id === 0 ? 'Starter Deck' : (slot.name || `Ship Slot ${slot.id}`)}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ color: 'var(--modal-danger)', fontSize: '13px' }}>
                <p style={{ margin: 0 }}>No ships available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-cancel">
            Back
          </button>
          <button
            onClick={handleChallengeClick}
            className="dw-btn dw-btn-danger"
            disabled={allActiveSlots.length === 0 || isCurrentSlotInvalid}
          >
            Challenge Boss
          </button>
        </div>
      </div>
    </div>
  );
};

export default BossEncounterModal;
