// ========================================
// FLOATING CARD CONTROLS COMPONENT
// ========================================
// Button group for switching between Hand/Drones views and accessing Log
// Positioned below the card fan with no container background

import React from 'react';
import styles from './FloatingCardControls.module.css';

function FloatingCardControls({
  view,
  onToggle,
  onOpenLog,
  handCount,
  handLimit,
  logCount
}) {
  return (
    <div className={styles.controlsContainer}>
      <div className={styles.buttonGroup}>
        <button
          onClick={() => onToggle('hand')}
          className={`${styles.button} ${
            view === 'hand' ? styles.buttonActive : styles.buttonInactive
          }`}
        >
          Hand ({handCount}/{handLimit})
        </button>

        <button
          onClick={() => onToggle('drones')}
          className={`${styles.button} ${
            view === 'drones' ? styles.buttonActive : styles.buttonInactive
          }`}
        >
          Drones
        </button>

        <button
          onClick={onOpenLog}
          className={styles.logButton}
          title="View Game Log"
        >
          📋 Log ({logCount})
        </button>
      </div>
    </div>
  );
}

export default FloatingCardControls;
