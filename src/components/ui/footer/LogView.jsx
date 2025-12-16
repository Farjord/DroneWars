// ========================================
// LOG VIEW COMPONENT - CLEAN VERSION
// ========================================
// Game log display with table format and CSV download

import React from 'react';
import styles from '../GameFooter.module.css';
import DEV_CONFIG from '../../../config/devConfig.js';

function LogView({
  gameLog,
  downloadLogAsCSV,
  setAiDecisionLogToShow,
  onCardInfoClick
}) {
  return (
    <div className={styles.logContainer}>
      <div className={styles.logHeader}>
        <h3 className={styles.logTitle}>Game Log</h3>
        <button onClick={downloadLogAsCSV} className="dw-btn dw-btn-secondary text-xs py-1 px-3">
          Download CSV
        </button>
      </div>
      
      <div className={styles.logTableWrapper}>
        <table className={styles.logTable}>
          <thead className={styles.logTableHeader}>
            <tr>
              <th className={styles.logTableHeaderCell}>Rnd</th>
              <th className={styles.logTableHeaderCell}>Timestamp (UTC)</th>
              <th className={styles.logTableHeaderCell}>Player</th>
              <th className={styles.logTableHeaderCell}>Action</th>
              <th className={styles.logTableHeaderCell}>Source</th>
              <th className={styles.logTableHeaderCell}>Target</th>
              <th className={styles.logTableHeaderCell}>Outcome</th>
              {DEV_CONFIG.features.logDebugSource && (
                <th className={styles.logTableDebugHeader}>Debug Source</th>
              )}
              {DEV_CONFIG.features.aiDecisionDrillDown && (
                <th className={styles.logTableHeaderCell}></th>
              )}
            </tr>
          </thead>
          <tbody>
            {gameLog.map((entry, index) => (
              <tr key={index} className={styles.logTableRow}>
                <td className={styles.logTableCellBold}>{entry.round}</td>
                <td className={styles.logTableCellGray}>
                  {new Date(entry.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC' })}
                </td>
                <td className={styles.logTableCellCyan}>{entry.player}</td>
                <td className={styles.logTableCellYellow}>{entry.actionType}</td>
                <td className={styles.logTableCell}>
                  {entry.source}
                  {entry.actionType === 'PLAY_CARD' && onCardInfoClick && (
                    <button
                      onClick={() => onCardInfoClick(entry.source)}
                      className={styles.cardInfoButton}
                      title="View Card Details"
                    >
                      ℹ️
                    </button>
                  )}
                </td>
                <td className={styles.logTableCell}>{entry.target}</td>
                <td className={styles.logTableCellGrayText}>{entry.outcome}</td>
                {DEV_CONFIG.features.logDebugSource && (
                  <td className={styles.logTableCellDebug}>{entry.debugSource}</td>
                )}
                {DEV_CONFIG.features.aiDecisionDrillDown && (
                  <td className={styles.logTableCellCenter}>
                    {entry.aiDecisionContext && (
                      <button
                        onClick={() => setAiDecisionLogToShow(entry.aiDecisionContext)}
                        className={styles.aiDecisionButton}
                        title="Show AI Decision Logic"
                      >
                        ℹ️
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )).reverse()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LogView;