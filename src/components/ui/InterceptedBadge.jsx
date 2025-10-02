// ========================================
// INTERCEPTED BADGE
// ========================================
// Visual badge that appears on a drone that has intercepted an attack
// Shows bright glowing red "Intercepted!" text for 2 seconds

import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

/**
 * InterceptedBadge - Visual indicator for intercepting drones
 * @param {number|string} droneId - ID of the drone that intercepted
 * @param {number} timestamp - Timestamp of the interception event
 * @param {number} duration - How long to show the badge (default: 2000ms)
 */
const InterceptedBadge = ({ droneId, timestamp, duration = 2000 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after duration
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [timestamp, duration]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="bg-red-600/90 rounded-lg px-4 py-2 shadow-2xl border-2 border-red-400 animate-pulse">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-lg tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
            Intercepted!
          </span>
        </div>
      </div>
    </div>
  );
};

export default InterceptedBadge;
