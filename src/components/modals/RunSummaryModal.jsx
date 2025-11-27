/**
 * RunSummaryModal.jsx
 * Displays comprehensive run summary when player returns to hangar
 * Shows stats, credits, and full-size cards collected during the run
 */

import fullCardCollection from '../../data/cardData.js';
import ActionCard from '../ui/ActionCard.jsx';
import './RunSummaryModal.css';

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
    creditsEarned,
    combatsWon,
    combatsLost,
    damageDealtToEnemies,
    hullDamageTaken,
    finalHull,
    maxHull,
    runDuration,
    finalDetection,
  } = summary;

  // Format run duration as MM:SS
  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get hull status class
  const getHullStatusClass = () => {
    if (!maxHull || maxHull === 0) return '';
    const hullPercent = (finalHull / maxHull) * 100;
    if (hullPercent <= 25) return 'critical';
    if (hullPercent <= 50) return 'warning';
    return '';
  };

  // Get full card data for rendering
  const cards = (cardsCollected || []).map(card => {
    const fullCard = fullCardCollection.find(c => c.id === card.cardId);
    return fullCard || card;
  });

  return (
    <div className={`run-summary-overlay ${success ? 'success' : 'failure'}`}>
      <div className={`run-summary-modal ${success ? 'success' : 'failure'}`}>
        {/* Header */}
        <div className="run-summary-header">
          <div className="run-summary-header-icon">
            {success ? '✓' : '✕'}
          </div>
          <div className="run-summary-header-info">
            <h2 className="run-summary-title">
              {success ? 'EXTRACTION SUCCESSFUL' : 'MISSION FAILED'}
            </h2>
            <p className="run-summary-subtitle">
              {mapName || 'Unknown Sector'} (Tier {mapTier || 1})
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="run-summary-stats-container">
          {/* Exploration Column */}
          <div className="run-summary-stats-column">
            <h3 className="stats-column-header">EXPLORATION</h3>
            <div className="run-summary-stat">
              <span className="stat-label">Hexes Moved</span>
              <span className="stat-value">{hexesMoved || 0}</span>
            </div>
            <div className="run-summary-stat">
              <span className="stat-label">Map Explored</span>
              <span className="stat-value">{mapCompletionPercent || 0}%</span>
            </div>
            <div className="run-summary-stat">
              <span className="stat-label">POIs Visited</span>
              <span className="stat-value">{poisVisited || 0}/{totalPois || 0}</span>
            </div>
          </div>

          {/* Combat Column */}
          <div className="run-summary-stats-column">
            <h3 className="stats-column-header">COMBAT</h3>
            <div className="run-summary-stat">
              <span className="stat-label">Combats Won</span>
              <span className="stat-value combat-won">{combatsWon || 0}</span>
            </div>
            <div className="run-summary-stat">
              <span className="stat-label">Combats Lost</span>
              <span className="stat-value combat-lost">{combatsLost || 0}</span>
            </div>
            <div className="run-summary-stat">
              <span className="stat-label">Damage Dealt</span>
              <span className="stat-value">{damageDealtToEnemies || 0}</span>
            </div>
          </div>

          {/* Ship Status Column */}
          <div className="run-summary-stats-column">
            <h3 className="stats-column-header">SHIP STATUS</h3>
            <div className="run-summary-stat">
              <span className="stat-label">Hull Damage</span>
              <span className={`stat-value ${getHullStatusClass()}`}>{hullDamageTaken || 0}</span>
            </div>
            <div className="run-summary-stat">
              <span className="stat-label">Final Hull</span>
              <span className={`stat-value ${getHullStatusClass()}`}>{finalHull || 0}/{maxHull || 0}</span>
            </div>
            <div className="run-summary-stat">
              <span className="stat-label">Run Time</span>
              <span className="stat-value">{formatDuration(runDuration || 0)}</span>
            </div>
          </div>
        </div>

        {/* Credits Earned */}
        <div className="run-summary-credits">
          <span className="credits-label">CREDITS EARNED</span>
          <span className="credits-value">{creditsEarned || 0}</span>
        </div>

        {/* Cards Section */}
        <div className="run-summary-cards-section">
          <h3 className="cards-section-header">
            CARDS ACQUIRED ({cards.length})
          </h3>
          <div className="cards-scroll-container">
            {cards.length > 0 ? (
              cards.map((card, idx) => (
                <div key={idx} className="card-wrapper">
                  <ActionCard card={card} />
                </div>
              ))
            ) : (
              <p className="no-cards-message">No cards acquired this run</p>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <div className="run-summary-actions">
          <button
            className={`run-summary-btn ${success ? 'success' : 'failure'}`}
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
