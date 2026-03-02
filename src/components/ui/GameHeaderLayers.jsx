// ========================================
// GAME HEADER DECORATIVE LAYERS
// ========================================
// Pure presentational component for the header reskin.
// All layers are visual-only with pointer-events: none.
// No game logic or state — imported by GameHeader.

import React from 'react';
import { FACTION_COLORS } from './ShipSectionLayers.jsx';

const playerPri = FACTION_COLORS.player.primary;
const opponentPri = FACTION_COLORS.opponent.primary;

// ─── SVG border polyline points (shared by crisp line + glow copy) ───
const BORDER_POINTS = `
  0,2  280,2  295,2  305,10  315,10  325,2  335,2
  460,2  475,2  488,12  500,16  512,12  525,2  540,2
  665,2  675,2  685,10  695,10  705,2  715,2  1000,2
`;

/**
 * GameHeaderLayers — all decorative overlays for the header bar.
 * Renders: centre light pillar, faction accent washes,
 * SVG polyline bottom border + glow, and top border.
 */
function GameHeaderLayers() {
  return (
    <>
      {/* ─── Centre light pillar — wide subtle glow ─── */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: '44%', right: '44%',
        background: 'radial-gradient(ellipse at 50% 60%, rgba(0,200,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      {/* ─── Centre light pillar — narrow core line ─── */}
      <div style={{
        position: 'absolute', top: '20%', bottom: '20%',
        left: '49%', right: '49%',
        background: 'rgba(0,200,255,0.06)',
        filter: 'blur(3px)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* ─── Red accent wash — left side (opponent) ─── */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%',
        background: `linear-gradient(90deg, ${opponentPri}0c 0%, transparent 100%)`,
        pointerEvents: 'none', zIndex: 1,
      }} />
      {/* ─── Blue accent wash — right side (player) ─── */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%',
        background: `linear-gradient(270deg, ${playerPri}0c 0%, transparent 100%)`,
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* ─── Bottom border SVG — angular polyline with dips ─── */}
      <svg viewBox="0 0 1000 20" preserveAspectRatio="none" style={{
        position: 'absolute', bottom: '-0.4vw', left: 0, right: 0,
        width: '100%', height: '1.2vw',
        pointerEvents: 'none', zIndex: 5,
        filter: 'drop-shadow(0 0 3px rgba(0,180,255,0.3))',
      }}>
        <defs>
          <linearGradient id="headerBorderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={opponentPri} stopOpacity="0.7" />
            <stop offset="25%" stopColor={opponentPri} stopOpacity="0.4" />
            <stop offset="40%" stopColor="rgba(120,150,200,0.3)" stopOpacity="1" />
            <stop offset="50%" stopColor="rgba(150,180,220,0.4)" stopOpacity="1" />
            <stop offset="60%" stopColor="rgba(120,150,200,0.3)" stopOpacity="1" />
            <stop offset="75%" stopColor={playerPri} stopOpacity="0.4" />
            <stop offset="100%" stopColor={playerPri} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <polyline
          points={BORDER_POINTS}
          fill="none"
          stroke="url(#headerBorderGrad)"
          strokeWidth="1.8"
        />
      </svg>

      {/* ─── Bottom border glow copy — blurred behind the crisp line ─── */}
      <svg viewBox="0 0 1000 20" preserveAspectRatio="none" style={{
        position: 'absolute', bottom: '-0.4vw', left: 0, right: 0,
        width: '100%', height: '1.2vw',
        pointerEvents: 'none', zIndex: 4,
        filter: 'blur(3px)',
        opacity: 0.6,
      }}>
        <defs>
          <linearGradient id="headerBorderGradGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={opponentPri} stopOpacity="0.7" />
            <stop offset="25%" stopColor={opponentPri} stopOpacity="0.4" />
            <stop offset="40%" stopColor="rgba(120,150,200,0.3)" stopOpacity="1" />
            <stop offset="50%" stopColor="rgba(150,180,220,0.4)" stopOpacity="1" />
            <stop offset="60%" stopColor="rgba(120,150,200,0.3)" stopOpacity="1" />
            <stop offset="75%" stopColor={playerPri} stopOpacity="0.4" />
            <stop offset="100%" stopColor={playerPri} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <polyline
          points={BORDER_POINTS}
          fill="none"
          stroke="url(#headerBorderGradGlow)"
          strokeWidth="4"
        />
      </svg>

      {/* ─── Top border — thin gradient line ─── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '0.05vw',
        background: `linear-gradient(90deg,
          ${opponentPri}25 0%, ${opponentPri}10 30%,
          rgba(150,170,200,0.08) 50%,
          ${playerPri}10 70%, ${playerPri}25 100%
        )`,
        pointerEvents: 'none', zIndex: 3,
      }} />
    </>
  );
}

export default GameHeaderLayers;
