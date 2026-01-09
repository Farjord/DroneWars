/**
 * RunSummaryModal.jsx
 * Displays comprehensive run summary when player returns to hangar
 * Shows stats, credits, and full-size cards collected during the run
 */

import fullCardCollection from '../../data/cardData.js';
import ActionCard from '../ui/ActionCard.jsx';
import { CheckCircle, XCircle } from 'lucide-react';

function RunSummaryModal({ summary, onClose }) {
  if (!summary) return null;

  const {
    success,
    mapName,
    mapTier,
    hexesMoved,
    hexesExplored,
    totalHexes,
    mapCompletionPercent,
    poisVisited,
    totalPois,
    cardsCollected,
    blueprintsCollected,
    creditsEarned,
    combatsWon,
    combatsLost,
    damageDealtToEnemies,
    hullDamageTaken,
    finalHull,
    maxHull,
    runDuration,
    finalDetection,
    reputation,
  } = summary;

  // Format run duration as MM:SS
  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get hull color based on percentage
  const getHullColor = () => {
    if (!maxHull || maxHull === 0) return 'var(--modal-text-primary)';
    const hullPercent = (finalHull / maxHull) * 100;
    if (hullPercent <= 25) return 'var(--modal-danger)';
    if (hullPercent <= 50) return '#eab308';
    return 'var(--modal-success)';
  };

  // Get full card data for rendering
  const cards = (cardsCollected || []).map(card => {
    const fullCard = fullCardCollection.find(c => c.id === card.cardId);
    return fullCard || card;
  });

  // Get blueprints for rendering
  const blueprints = blueprintsCollected || [];

  // Get rarity color for blueprint badges
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Common': return '#9ca3af';
      case 'Uncommon': return '#22c55e';
      case 'Rare': return '#3b82f6';
      case 'Mythic': return '#a855f7';
      default: return '#9ca3af';
    }
  };

  const themeClass = success ? 'dw-modal--success' : 'dw-modal--danger';

  return (
    <div className="dw-modal-overlay">
      <div
        className={`dw-modal-content dw-modal--xxl ${themeClass}`}
        style={{ maxWidth: '1000px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: success ? 'var(--modal-success)' : 'var(--modal-danger)' }}>
            {success ? <CheckCircle size={32} /> : <XCircle size={32} />}
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">
              {success ? 'EXTRACTION SUCCESSFUL' : 'MISSION FAILED'}
            </h2>
            <p className="dw-modal-header-subtitle">
              {mapName || 'Unknown Sector'} (Tier {mapTier || 1})
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body dw-modal-scroll" style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {/* Stats Grid - 3 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
            {/* Exploration Column */}
            <div style={{ background: 'var(--modal-surface)', borderRadius: '8px', padding: '16px', border: '1px solid var(--modal-border)' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--modal-theme)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exploration</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Hexes Moved</span>
                  <span style={{ color: 'var(--modal-text-primary)', fontWeight: 600 }}>{hexesMoved || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Map Explored</span>
                  <span style={{ color: 'var(--modal-text-primary)', fontWeight: 600 }}>{mapCompletionPercent || 0}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>POIs Visited</span>
                  <span style={{ color: 'var(--modal-text-primary)', fontWeight: 600 }}>{poisVisited || 0}/{totalPois || 0}</span>
                </div>
              </div>
            </div>

            {/* Combat Column */}
            <div style={{ background: 'var(--modal-surface)', borderRadius: '8px', padding: '16px', border: '1px solid var(--modal-border)' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--modal-theme)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Combat</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Combats Won</span>
                  <span style={{ color: 'var(--modal-success)', fontWeight: 600 }}>{combatsWon || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Combats Lost</span>
                  <span style={{ color: 'var(--modal-danger)', fontWeight: 600 }}>{combatsLost || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Damage Dealt</span>
                  <span style={{ color: 'var(--modal-text-primary)', fontWeight: 600 }}>{damageDealtToEnemies || 0}</span>
                </div>
              </div>
            </div>

            {/* Ship Status Column */}
            <div style={{ background: 'var(--modal-surface)', borderRadius: '8px', padding: '16px', border: '1px solid var(--modal-border)' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--modal-theme)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ship Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Hull Damage</span>
                  <span style={{ color: getHullColor(), fontWeight: 600 }}>{hullDamageTaken || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Final Hull</span>
                  <span style={{ color: getHullColor(), fontWeight: 600 }}>{finalHull || 0}/{maxHull || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Run Time</span>
                  <span style={{ color: 'var(--modal-text-primary)', fontWeight: 600 }}>{formatDuration(runDuration || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Credits Earned */}
          <div className="dw-modal-info-box" style={{ marginBottom: '24px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credits Earned</p>
            <p style={{ margin: '4px 0 0', fontSize: '32px', fontWeight: 700, color: '#eab308' }}>{creditsEarned || 0}</p>
          </div>

          {/* Blueprints Acquired Section */}
          {blueprints.length > 0 && (
            <div className="dw-modal-info-box" style={{
              marginBottom: '24px',
              background: 'rgba(59, 130, 246, 0.08)',
              borderColor: 'rgba(59, 130, 246, 0.4)'
            }}>
              <h3 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#3b82f6',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textAlign: 'center'
              }}>
                Blueprints Acquired ({blueprints.length})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {blueprints.map((blueprint, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--modal-surface)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${getRarityColor(blueprint.rarity)}40`
                    }}
                  >
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--modal-text-primary)'
                    }}>
                      {blueprint.droneData?.name || blueprint.blueprintId}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: `${getRarityColor(blueprint.rarity)}20`,
                      color: getRarityColor(blueprint.rarity),
                      textTransform: 'uppercase'
                    }}>
                      {blueprint.rarity}
                    </span>
                  </div>
                ))}
              </div>
              <p style={{
                margin: '10px 0 0',
                fontSize: '11px',
                color: 'var(--modal-text-secondary)',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                Visit Blueprints to craft copies for your fleet
              </p>
            </div>
          )}

          {/* Reputation Earned Section - NEW */}
          {reputation && !reputation.isStarterDeck && (
            <div className="dw-modal-info-box" style={{
              marginBottom: '24px',
              background: 'rgba(168, 85, 247, 0.08)',
              borderColor: 'rgba(168, 85, 247, 0.4)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)',
                             textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Reputation Earned
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '32px', fontWeight: 700, color: '#a855f7' }}>
                  +{reputation.repGained.toLocaleString()}
                </p>
              </div>

              {/* Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px',
                               background: 'var(--modal-surface)', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--modal-text-secondary)' }}>Combat Rep</span>
                  <span style={{ color: '#a855f7', fontWeight: 600 }}>
                    +{(reputation.combatRepGained || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px',
                               background: 'var(--modal-surface)', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--modal-text-secondary)' }}>Loadout Rep</span>
                  <span style={{ color: '#a855f7', fontWeight: 600 }}>
                    +{(reputation.loadoutRepGained || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* MIA Penalty Notice */}
              {!success && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)',
                               borderRadius: '4px', fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>
                  MIA Penalty Applied: 75% reputation lost
                </div>
              )}

              {/* Level Up Notice */}
              {reputation.leveledUp && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(34, 197, 94, 0.1)',
                               borderRadius: '4px', fontSize: '13px', color: '#22c55e',
                               textAlign: 'center', fontWeight: 600 }}>
                  Level Up! {reputation.previousLevel} → {reputation.newLevel}
                </div>
              )}
            </div>
          )}

          {/* Starter Deck Notice */}
          {reputation?.isStarterDeck && (
            <div className="dw-modal-info-box" style={{ marginBottom: '24px',
                                                          background: 'rgba(107, 114, 128, 0.1)',
                                                          borderColor: 'rgba(107, 114, 128, 0.3)' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--modal-text-secondary)', textAlign: 'center' }}>
                Starter deck used - no reputation earned
              </p>
            </div>
          )}

          {/* Cards Section */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--modal-theme)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cards Acquired ({cards.length})
            </h3>
            {cards.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                {cards.map((card, idx) => (
                  <div key={idx}>
                    <ActionCard card={card} isPlayable={true} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="dw-modal-info-box" style={{ textAlign: 'center', padding: '32px' }}>
                <p style={{ margin: 0, color: 'var(--modal-text-secondary)', fontStyle: 'italic' }}>No cards acquired this run</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button
            className={success ? 'dw-btn dw-btn-success dw-btn--full' : 'dw-btn dw-btn-danger dw-btn--full'}
            onClick={onClose}
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}

export default RunSummaryModal;
