/**
 * ReputationRewardModal.jsx
 * Displays unclaimed reputation rewards and allows claiming
 */

import { useState } from 'react';
import { Award, Gift, Star, ChevronRight } from 'lucide-react';
import ReputationService from '../../logic/reputation/ReputationService';
import rewardManager from '../../managers/RewardManager';
import LootRevealModal from './LootRevealModal';
import gameStateManager from '../../managers/GameStateManager';
import { packTypes, RARITY_COLORS } from '../../data/cardPackData';
import { getLevelData } from '../../data/reputationRewardsData';

function ReputationRewardModal({ onClose }) {
  const [claimingReward, setClaimingReward] = useState(null); // Current reward being claimed
  const [generatedLoot, setGeneratedLoot] = useState(null); // Loot from opened pack
  const [showLootReveal, setShowLootReveal] = useState(false);

  // Get unclaimed rewards
  const unclaimedRewards = ReputationService.getUnclaimedRewards();
  const levelData = ReputationService.getLevelData();

  // Handle claiming a single reward
  const handleClaimReward = (reward) => {
    // Mark as currently claiming
    setClaimingReward(reward);

    // Claim from service (removes from unclaimed list)
    const result = ReputationService.claimReward(reward.level);

    if (result.success && result.reward) {
      // Generate loot from pack
      if (result.reward.type === 'pack') {
        const loot = rewardManager.generateReputationReward({
          packType: result.reward.packType,
          tier: result.reward.tier,
          level: reward.level
        });

        setGeneratedLoot(loot);
        setShowLootReveal(true);
      }
    }
  };

  // Handle collecting loot (after reveal)
  const handleCollectLoot = (loot) => {
    // Add cards to inventory
    const state = gameStateManager.getState();

    loot.cards.forEach(item => {
      if (item.type === 'card') {
        state.singlePlayerInventory[item.cardId] =
          (state.singlePlayerInventory[item.cardId] || 0) + 1;
      }
    });

    // Add credits
    if (loot.credits > 0) {
      state.singlePlayerProfile.credits += loot.credits;
    }

    gameStateManager.setState({
      singlePlayerInventory: { ...state.singlePlayerInventory },
      singlePlayerProfile: { ...state.singlePlayerProfile }
    });

    // Reset state
    setShowLootReveal(false);
    setGeneratedLoot(null);
    setClaimingReward(null);

    // If no more rewards, close modal
    const remaining = ReputationService.getUnclaimedRewards();
    if (remaining.length === 0) {
      onClose();
    }
  };

  // Get pack display info
  const getPackInfo = (reward) => {
    if (!reward || reward.type !== 'pack') return null;
    const pack = packTypes[reward.packType];
    return pack ? {
      name: pack.name,
      color: pack.color,
      tier: reward.tier
    } : null;
  };

  // If showing loot reveal, render that instead
  if (showLootReveal && generatedLoot) {
    return (
      <LootRevealModal
        loot={generatedLoot}
        onCollect={handleCollectLoot}
        show={true}
      />
    );
  }

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--md dw-modal--action"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: '#a855f7' }}>
            <Award size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">REPUTATION REWARDS</h2>
            <p className="dw-modal-header-subtitle">
              Level {levelData.level} - {levelData.currentRep.toLocaleString()} Rep
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body" style={{ padding: '20px' }}>
          {unclaimedRewards.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--modal-text-secondary)'
            }}>
              <Star size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>No unclaimed rewards</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                Keep playing to earn more reputation!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {unclaimedRewards.map((item) => {
                const packInfo = getPackInfo(item.reward);
                const isClaiming = claimingReward?.level === item.level;

                return (
                  <div
                    key={item.level}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: 'var(--modal-surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--modal-border)',
                      cursor: isClaiming ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isClaiming ? 0.6 : 1,
                    }}
                    onClick={() => !isClaiming && handleClaimReward(item)}
                    onMouseEnter={(e) => {
                      if (!isClaiming) {
                        e.currentTarget.style.borderColor = '#a855f7';
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--modal-border)';
                      e.currentTarget.style.background = 'var(--modal-surface)';
                    }}
                  >
                    {/* Level Badge */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: 'white',
                      }}>
                        {item.level}
                      </span>
                    </div>

                    {/* Reward Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--modal-text-primary)',
                        marginBottom: '4px',
                      }}>
                        Level {item.level} Reward
                      </div>
                      {packInfo && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          color: 'var(--modal-text-secondary)',
                        }}>
                          <Gift size={14} style={{ color: packInfo.color }} />
                          <span>{packInfo.name}</span>
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(168, 85, 247, 0.2)',
                            color: '#a855f7',
                          }}>
                            Tier {packInfo.tier}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Claim Arrow */}
                    <ChevronRight
                      size={20}
                      style={{ color: '#a855f7', opacity: isClaiming ? 0 : 0.7 }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button
            onClick={onClose}
            className="dw-btn dw-btn-cancel"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReputationRewardModal;
