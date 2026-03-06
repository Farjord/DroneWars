import { useState } from "react";

/**
 * EREMOS Header Redesign — Visual Reference Mockup
 * 
 * This is a REFERENCE MOCKUP for Claude Code to understand the target design.
 * It is NOT production code — it demonstrates layout, structure, and styling.
 * 
 * The actual implementation should:
 * - Use existing faction colour variables from the codebase
 * - Connect to real game state for KPIs and health
 * - Load actual ship artwork from ship data
 * - Wire the player hex click to the existing settings/menu modal
 * - Reuse existing KPI components where possible
 * 
 * See header-redesign-spec.md for full implementation requirements.
 */

// --- Faction colour tokens (replace with real project variables) ---
const COLORS = {
  opponent: {
    primary: "#cc3333",
    dim: "rgba(200, 50, 50, 0.5)",
    glow: "rgba(200, 50, 50, 0.35)",
    border: "rgba(200, 50, 50, 0.5)",
    borderStrong: "rgba(200, 50, 50, 0.65)",
    filledSeg: "linear-gradient(180deg, #cc2222 0%, #881111 100%)",
    filledGlow: "0 0 2px rgba(204, 34, 34, 0.3)",
    emptySeg: "rgba(40, 20, 20, 0.4)",
    emptyBorder: "rgba(100, 40, 40, 0.1)",
  },
  player: {
    primary: "#33aacc",
    dim: "rgba(50, 170, 200, 0.5)",
    glow: "rgba(50, 170, 200, 0.35)",
    border: "rgba(50, 170, 200, 0.5)",
    borderStrong: "rgba(50, 170, 200, 0.65)",
    filledSeg: "linear-gradient(180deg, #22aacc 0%, #116688 100%)",
    filledGlow: "0 0 2px rgba(34, 170, 204, 0.3)",
    emptySeg: "rgba(20, 30, 40, 0.4)",
    emptyBorder: "rgba(40, 80, 100, 0.1)",
  },
  bg: {
    panel: "rgba(10, 14, 24, 0.9)",
    center: "rgba(10, 14, 24, 0.9)",
    healthStrip: "rgba(0, 0, 0, 0.3)",
    healthStripBorder: "rgba(60, 80, 120, 0.2)",
    kpi: "rgba(8, 12, 24, 0.6)",
    kpiBorder: "rgba(60, 80, 110, 0.3)",
  },
};

// --- SVG Bar Shape ---
const BarShape = ({ side, colors }) => {
  const points =
    side === "opponent"
      ? "20,0 460,0 460,64 20,64 0,32"
      : "0,0 440,0 460,32 440,64 0,64";

  return (
    <svg
      viewBox="0 0 460 64"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <polygon points={points} fill={COLORS.bg.panel} />
      <polygon
        points={points}
        fill="none"
        stroke={colors.border}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
};

// --- Double-Layer Hexagon ---
const ShipHexPortrait = ({ side, colors, isClickable = false, shipLabel = "(SHIP)" }) => {
  const [hovered, setHovered] = useState(false);

  const outerBorder = hovered && isClickable
    ? "rgba(50, 200, 240, 0.85)"
    : colors.borderStrong;
  const innerBorder = hovered && isClickable
    ? "rgba(50, 200, 240, 0.65)"
    : colors.border;

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 4,
        width: "clamp(60px, 6.5vw, 82px)",
        height: "clamp(68px, 7.5vw, 92px)",
        top: "50%",
        transform: "translateY(-50%)",
        ...(side === "opponent" ? { left: "-1%" } : { right: "-1%" }),
        cursor: isClickable ? "pointer" : "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* SVG with double hex layers */}
      <svg
        viewBox="0 0 78 88"
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        {/* Outer hex */}
        <polygon points="39,0 78,22 78,66 39,88 0,66 0,22" fill={COLORS.bg.center} />
        <polygon
          points="39,0 78,22 78,66 39,88 0,66 0,22"
          fill="none"
          stroke={outerBorder}
          strokeWidth="2"
        />
        {/* Inner hex */}
        <polygon points="39,8 70,26 70,62 39,80 8,62 8,26" fill={COLORS.bg.center} />
        <polygon
          points="39,8 70,26 70,62 39,80 8,62 8,26"
          fill="none"
          stroke={innerBorder}
          strokeWidth="1.5"
        />
      </svg>

      {/* Ship image placeholder */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "clamp(7px, 0.7vw, 9px)",
          color: "#445",
          letterSpacing: "1px",
          zIndex: 5,
        }}
      >
        {shipLabel}
      </div>

      {/* Cog badge — player hex only */}
      {isClickable && (
        <div
          style={{
            position: "absolute",
            bottom: "3%",
            right: "3%",
            zIndex: 6,
            fontSize: "clamp(9px, 1vw, 13px)",
            color: hovered
              ? "rgba(80, 210, 250, 0.95)"
              : "rgba(130, 160, 200, 0.45)",
            opacity: hovered ? 1 : 0.65,
            transition: "all 0.2s",
            width: "clamp(14px, 1.4vw, 18px)",
            height: "clamp(14px, 1.4vw, 18px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(6, 8, 14, 0.8)",
            borderRadius: "50%",
          }}
        >
          ⚙
        </div>
      )}
    </div>
  );
};

// --- KPI Box ---
const KpiBox = ({ icon, value, colors }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "clamp(2px, 0.25vw, 4px)",
      background: COLORS.bg.kpi,
      border: `1px solid ${COLORS.bg.kpiBorder}`,
      padding: "clamp(1px, 0.2vh, 3px) clamp(4px, 0.5vw, 8px)",
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: "clamp(9px, 0.85vw, 12px)",
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ fontSize: "clamp(7px, 0.7vw, 10px)", opacity: 0.7, color: colors.primary }}>
      {icon}
    </span>
    <span style={{ color: "#b8bcc8" }}>{value}</span>
  </div>
);

// --- Health Bar Segment ---
const HealthSegment = ({ filled, colors }) => (
  <div
    style={{
      flex: 1,
      minWidth: "2px",
      maxWidth: "10px",
      height: "clamp(5px, 0.6vh, 8px)",
      background: filled ? colors.filledSeg : colors.emptySeg,
      boxShadow: filled ? colors.filledGlow : "none",
      border: filled ? "none" : `1px solid ${colors.emptyBorder}`,
    }}
  />
);

// --- Health Strip ---
const HealthStrip = ({ current, max, side, colors }) => {
  const segments = Array.from({ length: max }, (_, i) => i < current);

  const number = (
    <span
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "clamp(10px, 0.9vw, 13px)",
        fontWeight: 700,
        minWidth: "clamp(30px, 3vw, 45px)",
        color: colors.primary,
        textAlign: side === "player" ? "right" : "left",
        flexShrink: 0,
      }}
    >
      {current}/{max}
    </span>
  );

  const bar = (
    <div style={{ display: "flex", gap: "1px", alignItems: "center", flex: 1, minWidth: 0 }}>
      {segments.map((filled, i) => (
        <HealthSegment key={i} filled={filled} colors={colors} />
      ))}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(3px, 0.4vw, 6px)",
        padding: "clamp(2px, 0.3vh, 4px) 3%",
        background: COLORS.bg.healthStrip,
        borderTop: `1px solid ${COLORS.bg.healthStripBorder}`,
        justifyContent: side === "player" ? "flex-end" : "flex-start",
      }}
    >
      {side === "opponent" ? (
        <>
          {number}
          {bar}
        </>
      ) : (
        <>
          {bar}
          {number}
        </>
      )}
    </div>
  );
};

// --- KPI Row ---
const KpiRow = ({ side, colors }) => {
  // KPI order: Deployment Budget | Energy | Momentum | Cards in Hand | Drone Limit
  const kpis = [
    { icon: "◆", value: side === "opponent" ? "18/18" : "18/18" },
    { icon: "⏻", value: side === "opponent" ? "8/10" : "6/12" },
    { icon: "⇧", value: side === "opponent" ? "0" : "0" },
    { icon: "⏍", value: side === "opponent" ? "5/5" : "7/7" },
    { icon: "●", value: side === "opponent" ? "5/8" : "3/8" },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        padding: "0 3%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "clamp(2px, 0.3vw, 4px)",
          alignItems: "center",
          width: "100%",
          justifyContent: side === "player" ? "flex-end" : "flex-start",
        }}
      >
        {kpis.map((kpi, i) => (
          <KpiBox key={i} icon={kpi.icon} value={kpi.value} colors={colors} />
        ))}
      </div>
    </div>
  );
};

// --- Side Panel ---
const SidePanel = ({ side }) => {
  const colors = COLORS[side];
  const isPlayer = side === "player";

  return (
    <div style={{ position: "relative", width: "38%", height: "80%", display: "flex", alignItems: "center", justifyContent: isPlayer ? "flex-end" : "flex-start" }}>
      {/* Inner wrapper constrained to 90% of allotted space */}
      <div style={{ position: "relative", width: "90%", height: "100%", display: "flex", alignItems: "center" }}>
      {/* Floating label — OUTSIDE the bar */}
      <div
        style={{
          position: "absolute",
          top: "2%",
          ...(isPlayer ? { right: "18%" } : { left: "18%" }),
          fontFamily: "'Orbitron', monospace",
          fontSize: "clamp(8px, 0.9vw, 11px)",
          letterSpacing: "2.5px",
          textTransform: "uppercase",
          fontWeight: 700,
          color: colors.primary,
          textShadow: `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow.replace("0.35", "0.15")}`,
          zIndex: 5,
        }}
      >
        {isPlayer ? "Player" : "Opponent"}
      </div>

      {/* Bar container */}
      <div style={{ position: "relative", width: "100%", height: "68%" }}>
        <BarShape side={side} colors={colors} />

        {/* Bar content */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            ...(isPlayer
              ? { marginRight: "17%", marginLeft: "2%" }
              : { marginLeft: "17%", marginRight: "2%" }),
          }}
        >
          <KpiRow side={side} colors={colors} />
          <HealthStrip
            current={isPlayer ? 30 : 22}
            max={30}
            side={side}
            colors={colors}
          />
        </div>
      </div>

      {/* Double-layer hex — overlaps the bar */}
      <ShipHexPortrait
        side={side}
        colors={colors}
        isClickable={isPlayer}
      />
      </div>
    </div>
  );
};

// --- Center Phase ---
const CenterPhase = () => (
  <div
    style={{
      width: "24%",
      flexShrink: 0,
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1px",
      padding: "2% 3%",
      height: "55%",
    }}
  >
    <svg
      viewBox="0 0 280 60"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <polygon points="15,0 265,0 280,30 265,60 15,60 0,30" fill={COLORS.bg.center} />
      <polygon
        points="15,0 265,0 280,30 265,60 15,60 0,30"
        fill="none"
        stroke="rgba(80, 120, 150, 0.4)"
        strokeWidth="1.5"
      />
    </svg>
    <div
      style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1px",
      }}
    >
      <div
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "clamp(9px, 1vw, 13px)",
          letterSpacing: "3px",
          color: "#8899bb",
          textTransform: "uppercase",
        }}
      >
        Action Phase
      </div>
      <div
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "clamp(8px, 0.8vw, 11px)",
          letterSpacing: "2px",
          color: "#55ddff",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Play an Action
      </div>
      <button
        style={{
          marginTop: "2px",
          fontFamily: "'Orbitron', monospace",
          fontSize: "clamp(7px, 0.7vw, 10px)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          background: "linear-gradient(180deg, #882222 0%, #661111 100%)",
          color: "#ffcccc",
          border: "1px solid rgba(200, 50, 50, 0.4)",
          padding: "clamp(1px, 0.3vh, 3px) clamp(10px, 1.5vw, 20px)",
          cursor: "pointer",
        }}
      >
        Pass
      </button>
    </div>
  </div>
);

// --- Main Header Component ---
export default function HeaderMockup() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#06080f",
        fontFamily: "'Rajdhani', sans-serif",
        color: "#c8ccd8",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — 15vh */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "15vh",
          minHeight: "90px",
          maxHeight: "130px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0.8%",
          background: "linear-gradient(180deg, rgba(8, 12, 24, 0.98) 0%, rgba(6, 8, 16, 0.95) 100%)",
          borderBottom: "1px solid rgba(60, 80, 120, 0.15)",
        }}
      >
        <SidePanel side="opponent" />
        <CenterPhase />
        <SidePanel side="player" />
      </div>

      {/* Game area placeholder — 85vh */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "14px",
            color: "#223",
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          Game Area — 85vh
        </span>
      </div>
    </div>
  );
}