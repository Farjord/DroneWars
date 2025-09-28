// ========================================
// AI ACTION REPORT MODAL COMPONENT
// ========================================
// Modal that displays detailed information about AI attacks and their results

import React from 'react';
import { X } from 'lucide-react';

/**
 * AI ACTION REPORT MODAL COMPONENT
 * Displays detailed combat report when AI performs attacks.
 * Shows attacker, target, damage dealt, and remaining stats.
 * @param {Object} report - Combat report with damage details
 * @param {Function} onClose - Callback when modal is closed
 */
const AIActionReportModal = ({ report, onClose }) => {
  if (!report) return null;

  const {
    attackerName,
    lane,
    targetName,
    targetType,
    interceptorName,
    shieldDamage,
    hullDamage,
    wasDestroyed,
    remainingShields,
    remainingHull
  } = report;

  const targetDisplayName = targetType === 'section'
    ? targetName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    : targetName;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {onClose && (
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">AI Action Report</h2>
        <div className="text-left text-gray-300 space-y-3 mt-4 text-center">
          <p>
            <strong className="text-pink-400">{attackerName}</strong> attacked in{' '}
            <strong>{lane?.replace('lane', 'Lane ') || 'Unknown Lane'}</strong>.
          </p>
          {interceptorName ? (
            <p>
              Your <strong className="text-yellow-400">{interceptorName}</strong> intercepted the attack,
              which was targeting your <strong className="text-cyan-400">{targetDisplayName}</strong>!
            </p>
          ) : (
            <p>
              It targeted your <strong className="text-cyan-400">{targetDisplayName}</strong>.
            </p>
          )}
          <p>
            The attack dealt <strong className="text-cyan-300">{shieldDamage}</strong> damage to shields
            and <strong className="text-red-400">{hullDamage}</strong> damage to the hull.
          </p>
          {wasDestroyed ? (
            <p className="font-bold text-red-500 text-lg">The target was destroyed!</p>
          ) : (
            <p>
              The target has <strong className="text-cyan-300">{remainingShields}</strong> shields
              and <strong className="text-green-400">{remainingHull}</strong> hull remaining.
            </p>
          )}
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="btn-continue">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIActionReportModal;