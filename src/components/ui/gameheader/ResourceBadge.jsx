// ========================================
// RESOURCE BADGE COMPONENT
// ========================================
// Information panel styled resource display
// Matches the dw-stat-box aesthetic with angular corner accent

import React from 'react';

const ResourceBadge = React.forwardRef(({ icon: Icon, value, max, iconColor, isPlayer, compact = false }, ref) => {
  // Theme colors - cyan for player, red for opponent
  const borderColor = isPlayer ? 'rgba(6, 182, 212, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const accentColor = isPlayer ? 'rgba(6, 182, 212, 0.5)' : 'rgba(239, 68, 68, 0.5)';
  const glowColor = isPlayer ? 'rgba(6, 182, 212, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div
      ref={ref}
      className="relative"
      style={compact
        ? {
            background: 'none',
            border: 'none',
          }
        : {
            background: 'transparent',
            border: `1px solid ${borderColor}`,
            borderRadius: '2px',
            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 ${glowColor}`,
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
          }
      }
    >
      {/* Angular corner accent — non-compact only */}
      {!compact && (
        <div
          className="absolute top-0 left-0 w-2 h-2 z-10 pointer-events-none"
          style={{
            borderTop: `1px solid ${accentColor}`,
            borderLeft: `1px solid ${accentColor}`
          }}
        />
      )}
      <div style={compact
        ? { padding: '0 clamp(4px, 0.5vw, 8px)', display: 'flex', alignItems: 'center', gap: 'clamp(2px, 0.25vw, 4px)', width: '100%', height: '100%' }
        : { padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '8px' }
      }>
        <Icon
          size={compact ? 14 : 18}
          className={iconColor}
          style={compact ? { opacity: 0.7 } : undefined}
        />
        <span style={compact
          ? { fontWeight: 700, fontSize: 'clamp(11px, 1.1vw, 16px)', color: '#b8bcc8', whiteSpace: 'nowrap' }
          : { fontWeight: 700, fontSize: '1rem', color: 'white', whiteSpace: 'nowrap' }
        }>
          {value}{max !== undefined && ` / ${max}`}
        </span>
      </div>
    </div>
  );
});
ResourceBadge.displayName = 'ResourceBadge';

export default ResourceBadge;
