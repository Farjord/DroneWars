import { useState } from "react";

const C = {
  playerPrimary: "#00D4FF",
  playerGlow: "#00B8FF",
  playerBright: "#40E8FF",
  playerBg: "rgba(11, 46, 66, 0.7)",
  playerBgDark: "rgba(6, 26, 40, 0.75)",
  opponentPrimary: "#FF2A2A",
  opponentGlow: "#FF4444",
  opponentBright: "#FF6666",
  opponentBg: "rgba(90, 16, 21, 0.7)",
  opponentBgDark: "rgba(42, 5, 8, 0.75)",
  bg: "#030308",
  bannerBg: "rgba(12, 30, 48, 0.85)",
  oppLaneBg: "rgba(15, 8, 25, 0.55)",
  plLaneBg: "rgba(6, 15, 28, 0.55)",
};

// LOCKED layout
const LAYOUT = {
  gridColumns: "1fr 1fr 1fr",
  columnGap: "1%",
  pagePadding: "1.2%",
  shipHeight: "30%",
  laneHeight: "29%",
  overlap: "10%",
  tokenWidth: "15%",
  tokenAspect: "90/115",
  tokenGap: "2%",
};

// ─── SVG Corner Bracket ───
const CornerBracket = ({ position, color, size = "1.2vw" }) => {
  const rotations = { tl: 0, tr: 90, bl: -90, br: 180 };
  const positions = {
    tl: { top: "3%", left: "9%" },
    tr: { top: "3%", right: "9%" },
    bl: { bottom: "3%", left: "9%" },
    br: { bottom: "3%", right: "9%" },
  };
  return (
    <svg viewBox="0 0 20 20" style={{
      position: "absolute", ...positions[position],
      width: size, height: size,
      transform: `rotate(${rotations[position]}deg)`,
      opacity: 0.6, filter: `drop-shadow(0 0 3px ${color}66)`, zIndex: 4,
    }}>
      <path d="M0,10 L0,0 L10,0" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="0" cy="0" r="2" fill={color} opacity="0.9" />
    </svg>
  );
};

// ─── Diamond arrow marker (sits in the gap between columns) ───
const DiamondMarker = ({ color }) => (
  <svg viewBox="0 0 12 16" style={{ width: "0.6vw", height: "0.8vw", filter: `drop-shadow(0 0 2px ${color}44)` }}>
    <polygon points="6,0 12,8 6,16 0,8" fill={`${color}15`} stroke={color} strokeWidth="0.8" opacity="0.45" />
  </svg>
);

// ─── Small arrow (sits between lanes at centre) ───
const SmallArrow = ({ color, direction = "down" }) => (
  <svg viewBox="0 0 10 6" style={{ width: "0.5vw", height: "0.3vw", opacity: 0.35 }}>
    {direction === "down" ? (
      <polygon points="0,0 10,0 5,6" fill={color} opacity="0.4" />
    ) : (
      <polygon points="5,0 10,6 0,6" fill={color} opacity="0.4" />
    )}
  </svg>
);

// ─── Small chevron arrows (decorative, between lanes) ───
const ChevronArrows = ({ color, direction = "down" }) => (
  <div style={{
    display: "flex", justifyContent: "center", gap: "2vw",
    position: "absolute", left: 0, right: 0,
    ...(direction === "down" ? { bottom: "-0.3vw" } : { top: "-0.3vw" }),
    zIndex: 6, pointerEvents: "none",
  }}>
    {[0,1,2].map(i => (
      <svg key={i} viewBox="0 0 12 8" style={{ width: "0.8vw", height: "0.5vw", opacity: i === 1 ? 0.6 : 0.3 }}>
        {direction === "down" ? (
          <polyline points="0,0 6,8 12,0" fill="none" stroke={color} strokeWidth="1.5" />
        ) : (
          <polyline points="0,8 6,0 12,8" fill="none" stroke={color} strokeWidth="1.5" />
        )}
      </svg>
    ))}
  </div>
);

// ─── Scan lines ───
const ScanLines = ({ opacity = 0.03 }) => (
  <div style={{
    position: "absolute", inset: 0,
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,${opacity}) 2px, rgba(255,255,255,${opacity}) 3px)`,
    pointerEvents: "none", zIndex: 2,
  }} />
);

// ─── Edge Ticks ───
const EdgeTicks = ({ orientation, color, count = 5 }) => (
  <div style={{
    position: "absolute",
    ...(orientation === "top" ? { top: "1%", left: "20%", right: "20%" } : {}),
    ...(orientation === "bottom" ? { bottom: "1%", left: "20%", right: "20%" } : {}),
    display: "flex", justifyContent: "space-between",
    pointerEvents: "none", zIndex: 4,
  }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        width: "0.12vw", height: "0.5vw",
        background: `linear-gradient(${orientation === "top" ? "180deg" : "0deg"}, ${color}55, transparent)`,
      }} />
    ))}
  </div>
);

// ─── Ship Section ───
const ShipSection = ({ faction, name, shields = 3, maxShields = 3, hp = 10, maxHp = 10, laneIndex = 0 }) => {
  const isOpp = faction === "opponent";
  const pri = isOpp ? C.opponentPrimary : C.playerPrimary;
  const glow = isOpp ? C.opponentGlow : C.playerGlow;
  const bright = isOpp ? C.opponentBright : C.playerBright;
  const bgA = isOpp ? C.opponentBg : C.playerBg;
  const bgB = isOpp ? C.opponentBgDark : C.playerBgDark;

  // cutLeft: lanes 1, 2 have left inner edge cutout
  // cutRight: lanes 0, 1 have right inner edge cutout
  const cutLeft = laneIndex > 0;
  const cutRight = laneIndex < 2;

  // Wing point positions — pull inward slightly on inner edges for cutout effect
  const lWing = cutLeft ? "1.5%" : "0%";
  const rWing = cutRight ? "98.5%" : "100%";

  const clip = isOpp
    ? `polygon(5% 0%, 95% 0%, ${rWing} 45%, 93% 100%, 7% 100%, ${lWing} 45%)`
    : `polygon(7% 0%, 93% 0%, ${rWing} 55%, 95% 100%, 5% 100%, ${lWing} 55%)`;
  const clipInner = clip;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Outer glow bloom */}
      <div style={{
        position: "absolute", inset: "-0.6%",
        clipPath: clip,
        background: `${glow}10`,
        filter: `drop-shadow(0 0 1.2vw ${glow}30) drop-shadow(0 0 2.5vw ${glow}15)`,
      }} />

      {/* Bright outer border */}
      <div style={{
        position: "absolute", inset: "-0.2%",
        clipPath: clip,
        background: `linear-gradient(${isOpp ? "180deg" : "0deg"}, ${pri}88, ${pri}44, ${pri}88)`,
      }} />

      {/* Panel body — translucent */}
      <div style={{
        position: "relative", width: "100%", height: "100%",
        clipPath: clip,
        background: `linear-gradient(${isOpp ? "170deg" : "190deg"}, ${bgA} 0%, ${bgB} 60%, rgba(0,0,0,0.3) 100%)`,
        boxSizing: "border-box", overflow: "hidden",
        backdropFilter: "blur(4px)",
      }}>
        {/* Inner border line */}
        <div style={{
          position: "absolute", inset: "0.3%",
          border: `0.06vw solid ${pri}20`,
          pointerEvents: "none", zIndex: 3,
        }} />

        {/* Glassy sheen — diagonal highlight sweep */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(${isOpp ? "135deg" : "225deg"},
            rgba(255,255,255,0.06) 0%,
            rgba(255,255,255,0.02) 20%,
            transparent 40%,
            transparent 60%,
            rgba(255,255,255,0.01) 80%,
            rgba(255,255,255,0.03) 100%
          )`,
          pointerEvents: "none", zIndex: 2,
        }} />

        {/* Top/bottom edge highlight */}
        <div style={{
          position: "absolute",
          left: "8%", right: "8%",
          ...(isOpp ? { top: 0, height: "0.15vw" } : { bottom: 0, height: "0.15vw" }),
          background: `linear-gradient(90deg, transparent, ${bright}66, ${bright}aa, ${bright}66, transparent)`,
          zIndex: 4, pointerEvents: "none",
        }} />

        {/* Side edge highlights */}
        <div style={{ position: "absolute", left: 0, top: "10%", bottom: "10%", width: "0.1vw", background: `linear-gradient(180deg, transparent, ${pri}40, ${pri}55, ${pri}40, transparent)`, zIndex: 4, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: "10%", bottom: "10%", width: "0.1vw", background: `linear-gradient(180deg, transparent, ${pri}40, ${pri}55, ${pri}40, transparent)`, zIndex: 4, pointerEvents: "none" }} />

        {/* Inner glow */}
        <div style={{
          position: "absolute", inset: 0,
          boxShadow: `inset 0 0 2vw ${pri}15, inset 0 ${isOpp ? "0.4vw" : "-0.4vw"} 1.2vw ${pri}10`,
          pointerEvents: "none", zIndex: 2,
        }} />

        {/* Diagonal hatch */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${pri}02 10px, ${pri}02 11px)`,
          pointerEvents: "none", zIndex: 1, opacity: 0.4,
        }} />

        <ScanLines opacity={0.018} />

        {/* Corner brackets */}
        {isOpp ? (
          <><CornerBracket position="tl" color={pri} /><CornerBracket position="tr" color={pri} /></>
        ) : (
          <><CornerBracket position="bl" color={pri} /><CornerBracket position="br" color={pri} /></>
        )}

        <EdgeTicks orientation={isOpp ? "top" : "bottom"} color={pri} count={7} />

        {/* Content */}
        <div style={{
          position: "absolute",
          top: isOpp ? "10%" : "42%", bottom: isOpp ? "42%" : "10%",
          left: "15%", right: "15%",
          display: "flex", flexDirection: "column", justifyContent: "center",
          gap: "0.3vh", zIndex: 5,
        }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <span style={{
              color: "#fff", fontWeight: 800,
              fontSize: "clamp(0.5rem, 1vw, 1rem)",
              textTransform: "uppercase", letterSpacing: "0.14em",
              textShadow: `0 0 0.8vw ${pri}aa, 0 0 1.5vw ${pri}44, 0 1px 3px rgba(0,0,0,0.9)`,
              textAlign: "center",
            }}>
              {name}
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.4vw", justifyContent: "center", alignItems: "center", position: "relative" }}>
            {Array.from({ length: maxShields }).map((_, i) => (
              <svg key={i} style={{ width: "1.2vw", height: "1.4vw", minWidth: "10px", minHeight: "12px", filter: i < shields ? `drop-shadow(0 0 0.4vw ${pri}88)` : "none" }} viewBox="0 0 20 23">
                <polygon points="10,1 19,6 19,17 10,22 1,17 1,6" fill={i < shields ? pri : "transparent"} stroke={pri} strokeWidth="1.5" opacity={i < shields ? 0.95 : 0.15} />
                {i < shields && <polygon points="10,4 16,7.5 16,15 10,19 4,15 4,7.5" fill={bright} opacity="0.25" />}
              </svg>
            ))}
            <div style={{
              position: "absolute", right: 0,
              width: "1.5vw", height: "1.5vw", minWidth: "14px", minHeight: "14px",
              borderRadius: "50%",
              border: `0.12vw solid ${pri}88`,
              background: `radial-gradient(circle, ${pri}20 0%, transparent 70%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7vw", color: pri,
              opacity: isOpp ? 0.45 : 0.9,
              boxShadow: `0 0 0.5vw ${pri}44, inset 0 0 0.3vw ${pri}22`,
            }}>
              ⚡
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.12vw", justifyContent: "center" }}>
            {Array.from({ length: maxHp }).map((_, i) => (
              <div key={i} style={{
                width: "0.65vw", height: "0.7vw", minWidth: "5px", minHeight: "5px",
                background: i < hp ? `linear-gradient(180deg, ${bright}, ${pri})` : "rgba(255,255,255,0.03)",
                borderRadius: "1px",
                boxShadow: i < hp ? `0 0 0.3vw ${pri}88, 0 0 0.6vw ${pri}33` : `inset 0 0 0.1vw rgba(255,255,255,0.03)`,
                border: i < hp ? "none" : `0.03vw solid rgba(255,255,255,0.05)`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Drone Lane Half ───
const DroneLaneHalf = ({ faction, drones = [], effects = [], effectsPlacedBy = "opponent" }) => {
  const isOpp = faction === "opponent";
  const pri = isOpp ? C.opponentPrimary : C.playerPrimary;
  const glow = isOpp ? C.opponentGlow : C.playerGlow;
  const bright = isOpp ? C.opponentBright : C.playerBright;
  const bg = isOpp ? C.oppLaneBg : C.plLaneBg;

  // Effect colours based on who placed them
  const effectPri = effectsPlacedBy === "opponent" ? C.opponentPrimary : C.playerPrimary;
  const effectGlow = effectsPlacedBy === "opponent" ? C.opponentGlow : C.playerGlow;
  const effectBgDark = effectsPlacedBy === "opponent" ? "rgba(60,10,15,0.9)" : "rgba(6,30,50,0.9)";

  const maxEffectSlots = 5;
  const effectSlots = Array.from({ length: maxEffectSlots }, (_, i) => effects[i] || null);

  const clip = isOpp
    ? "polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)"
    : "polygon(0% 0%, 100% 0%, 88% 100%, 12% 100%)";

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "visible" }}>
      {/* Glow behind */}
      <div style={{
        position: "absolute", inset: "-0.2%",
        clipPath: clip,
        background: `${pri}08`,
        filter: `drop-shadow(0 0 0.8vw ${glow}15)`,
      }} />

      {/* Outer border */}
      <div style={{
        position: "absolute", inset: "-0.1%",
        clipPath: clip,
        background: `linear-gradient(${isOpp ? "180deg" : "0deg"}, ${pri}44, ${pri}15)`,
      }} />

      {/* Main trapezoid — translucent */}
      <div style={{
        position: "absolute", inset: 0,
        clipPath: clip, background: bg,
        backdropFilter: "blur(3px)",
      }}>
        {/* Inner border */}
        <div style={{ position: "absolute", inset: "0.4%", border: `0.05vw solid ${pri}12`, pointerEvents: "none" }} />

        {/* Edge highlight */}
        <div style={{
          position: "absolute", left: "2%", right: "2%",
          ...(isOpp ? { bottom: 0, height: "0.1vw" } : { top: 0, height: "0.1vw" }),
          background: `linear-gradient(90deg, transparent, ${pri}44, ${pri}66, ${pri}44, transparent)`,
          pointerEvents: "none", zIndex: 3,
        }} />

        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(0deg, ${pri}03 1px, transparent 1px), linear-gradient(90deg, ${pri}02 1px, transparent 1px)`,
          backgroundSize: "8% 20%", pointerEvents: "none", opacity: 0.5,
        }} />

        {/* Glassy sheen */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(${isOpp ? "160deg" : "200deg"}, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.02) 100%)`,
          pointerEvents: "none",
        }} />

        <ScanLines opacity={0.01} />

        {/* Chevron arrows at centre edge */}
        <ChevronArrows color={pri} direction={isOpp ? "down" : "up"} />
      </div>

      {/* Drone tokens */}
      <div style={{
        position: "absolute", left: "2%", right: "2%",
        top: 0, bottom: 0,
        display: "flex", flexDirection: "row", flexWrap: "wrap",
        gap: "0", justifyContent: "space-evenly",
        alignItems: "center",
        alignContent: "center",
        zIndex: 10,
      }}>
        {drones.map((d, i) => {
          const dPri = isOpp ? C.opponentPrimary : C.playerPrimary;
          const dBright = isOpp ? C.opponentBright : C.playerBright;
          const dGlow = isOpp ? C.opponentGlow : C.playerGlow;
          const exhaustFilter = d.exhausted ? "grayscale(1) opacity(0.85)" : "none";

          return (
            <div key={i} style={{
              width: LAYOUT.tokenWidth, aspectRatio: "90/115",
              flexShrink: 0, minWidth: "8%",
              position: "relative",
              filter: exhaustFilter,
            }}>
              {/* Attack stat hexagon — top left, overlapping */}
              <div style={{
                position: "absolute", top: "-0.6vw", left: "-0.3vw",
                width: "1.5vw", height: "1.7vw", minWidth: "14px", minHeight: "16px",
                zIndex: 20,
              }}>
                <svg viewBox="0 0 20 23" style={{ width: "100%", height: "100%" }}>
                  <polygon points="10,1 19,6 19,17 10,22 1,17 1,6" fill={isOpp ? C.opponentBgDark : C.playerBgDark} stroke={dPri} strokeWidth="1.5" />
                  <text x="10" y="15" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{d.atk}</text>
                </svg>
              </div>

              {/* Speed stat hexagon — top right, overlapping (flat hex) */}
              <div style={{
                position: "absolute", top: "-0.6vw", right: "-0.3vw",
                width: "1.7vw", height: "1.5vw", minWidth: "16px", minHeight: "14px",
                zIndex: 20,
              }}>
                <svg viewBox="0 0 23 20" style={{ width: "100%", height: "100%" }}>
                  <polygon points="6,1 17,1 22,10 17,19 6,19 1,10" fill={isOpp ? C.opponentBgDark : C.playerBgDark} stroke={dPri} strokeWidth="1.5" />
                  <text x="11.5" y="14" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{d.spd}</text>
                </svg>
              </div>

              {/* Ability button — top right below speed hex, player only */}
              {!isOpp && d.hasAbility && (
                <div style={{
                  position: "absolute", top: "1.4vw", right: "-0.5vw",
                  width: "1.4vw", height: "1.4vw", minWidth: "12px", minHeight: "12px",
                  borderRadius: "50%",
                  background: "rgba(15,23,42,0.9)",
                  border: `0.1vw solid ${dPri}88`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 20,
                  boxShadow: `0 0 0.3vw ${dPri}44`,
                }}>
                  <svg viewBox="0 0 24 24" style={{ width: "60%", height: "60%" }}>
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="none" stroke={dPri} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Special ability icons — left side */}
              {(d.hasRapid || d.hasAssault) && (
                <div style={{
                  position: "absolute", top: "1.4vw", left: "-0.5vw",
                  display: "flex", flexDirection: "column", gap: "0.2vw",
                  zIndex: 20,
                }}>
                  {d.hasRapid && (
                    <div style={{
                      width: "1.2vw", height: "1.2vw", minWidth: "11px", minHeight: "11px",
                      borderRadius: "50%",
                      background: isOpp ? "rgba(127,29,29,0.9)" : "rgba(8,47,73,0.9)",
                      border: `0.08vw solid ${dPri}88`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 0 0.3vw ${dPri}33`,
                    }}>
                      <span style={{ fontSize: "0.5vw", color: "#60A5FA" }}>R</span>
                    </div>
                  )}
                  {d.hasAssault && (
                    <div style={{
                      width: "1.2vw", height: "1.2vw", minWidth: "11px", minHeight: "11px",
                      borderRadius: "50%",
                      background: isOpp ? "rgba(127,29,29,0.9)" : "rgba(8,47,73,0.9)",
                      border: `0.08vw solid ${dPri}88`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 0 0.3vw ${dPri}33`,
                    }}>
                      <span style={{ fontSize: "0.5vw", color: "#F87171" }}>A</span>
                    </div>
                  )}
                </div>
              )}

              {/* Main card body */}
              <div style={{
                width: "100%", height: "100%",
                borderRadius: "0.25vw",
                border: `0.1vw solid ${dPri}66`,
                overflow: "hidden",
                position: "relative",
                boxShadow: `0 0.15vw 0.5vw rgba(0,0,0,0.6), 0 0 0.6vw ${dPri}15`,
              }}>
                {/* Artwork area — gradient placeholder */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: isOpp
                    ? `linear-gradient(150deg, rgba(80,20,30,0.9) 0%, rgba(45,10,15,0.95) 50%, rgba(30,5,10,0.98) 100%)`
                    : `linear-gradient(150deg, rgba(15,50,75,0.9) 0%, rgba(8,30,50,0.95) 50%, rgba(5,18,35,0.98) 100%)`,
                }} />
                {/* Subtle diagonal texture */}
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, ${dPri}04 3px, ${dPri}04 4px)`,
                  pointerEvents: "none",
                }} />
                {/* Dark overlay */}
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)" }} />

                {/* Content area — bottom portion */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "0.15vw", paddingBottom: 0,
                  zIndex: 10,
                }}>
                  {/* Shields row */}
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.15vw", minHeight: "0.7vw" }}>
                    {Array.from({ length: d.maxShields }).map((_, si) => (
                      <svg key={si} viewBox="0 0 24 24" style={{
                        width: "0.7vw", height: "0.7vw", minWidth: "7px", minHeight: "7px",
                      }}>
                        <path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z"
                          fill={si < d.shields ? "#22d3ee" : "none"}
                          stroke={si < d.shields ? "rgba(0,0,0,0.5)" : "#94a3b8"}
                          strokeWidth="2"
                          opacity={si < d.shields ? 1 : 0.4}
                        />
                      </svg>
                    ))}
                  </div>

                  {/* Hull pips row */}
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.1vw" }}>
                    {Array.from({ length: d.maxHull }).map((_, hi) => (
                      <div key={hi} style={{
                        width: "0.5vw", height: "0.5vw", minWidth: "4px", minHeight: "4px",
                        borderRadius: "1px",
                        background: hi < d.hull
                          ? (d.exhausted ? "#fff" : "#22d3ee")
                          : (d.exhausted ? "#6b7280" : "#9ca3af"),
                        border: "0.5px solid rgba(0,0,0,0.5)",
                      }} />
                    ))}
                  </div>

                  {/* Name bar */}
                  <div style={{
                    width: "100%",
                    background: isOpp
                      ? (d.exhausted ? "rgba(68,51,51,0.9)" : "rgba(127,29,29,0.9)")
                      : (d.exhausted ? "rgba(51,65,68,0.9)" : "rgba(8,47,73,0.9)"),
                    borderTop: `0.05vw solid ${dPri}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0.15vw 0.2vw",
                  }}>
                    <span style={{
                      fontWeight: 700, textTransform: "uppercase",
                      fontSize: "clamp(0.3rem, 0.5vw, 0.55rem)",
                      letterSpacing: "0.05em",
                      color: isOpp ? "#fecaca" : "#cffafe",
                      textAlign: "center",
                      lineHeight: 1,
                    }}>{d.name}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lane Effect slots — straddling the centre-facing edge */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        ...(isOpp ? { bottom: 0, transform: "translateY(50%)" } : { top: 0, transform: "translateY(-50%)" }),
        display: "flex", justifyContent: "center", gap: "0.5vw",
        zIndex: 15,
      }}>
        {effectSlots.map((effect, i) => (
          <div key={i} style={{
            width: "1.4vw", height: "1.4vw", minWidth: "14px", minHeight: "14px",
            borderRadius: "50%",
            background: effect ? effectBgDark : "rgba(40,40,50,0.5)",
            border: `0.08vw solid ${effect ? `${effectPri}88` : "rgba(100,100,120,0.35)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: effect ? "pointer" : "default",
            boxShadow: effect ? `0 0 0.4vw ${effectGlow}33, inset 0 0 0.2vw ${effectPri}15` : "none",
            transition: "all 0.2s",
          }}
            title={effect ? `${effect.name} Effect (click for details)` : "Empty slot"}
            onMouseEnter={(e) => {
              if (!effect) return;
              e.currentTarget.style.borderColor = `${effectPri}cc`;
              e.currentTarget.style.boxShadow = `0 0 0.6vw ${effectGlow}55, inset 0 0 0.4vw ${effectPri}25`;
              e.currentTarget.style.transform = "scale(1.2)";
            }}
            onMouseLeave={(e) => {
              if (!effect) return;
              e.currentTarget.style.borderColor = `${effectPri}88`;
              e.currentTarget.style.boxShadow = `0 0 0.4vw ${effectGlow}33, inset 0 0 0.2vw ${effectPri}15`;
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {effect && <span style={{ fontSize: "0.6vw", lineHeight: 1 }}>{effect.icon}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Lane Effect Slots (standalone, unused but kept for reference) ───
const LaneEffectSlots = ({ effects = [], placedByFaction, maxSlots = 5 }) => {
  const isPlacedByOpp = placedByFaction === "opponent";
  const pri = isPlacedByOpp ? C.opponentPrimary : C.playerPrimary;
  const glow = isPlacedByOpp ? C.opponentGlow : C.playerGlow;
  const bgDark = isPlacedByOpp ? "rgba(60,10,15,0.9)" : "rgba(6,30,50,0.9)";

  const slots = Array.from({ length: maxSlots }, (_, i) => effects[i] || null);

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", justifyContent: "center", alignItems: "center",
      gap: "0.5vw",
    }}>
      {slots.map((effect, i) => (
        <div key={i} style={{
          width: "1.4vw", height: "1.4vw", minWidth: "14px", minHeight: "14px",
          borderRadius: "50%",
          background: effect ? bgDark : "rgba(40,40,50,0.5)",
          border: `0.08vw solid ${effect ? `${pri}88` : "rgba(100,100,120,0.35)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: effect ? "pointer" : "default",
          boxShadow: effect ? `0 0 0.4vw ${glow}33, inset 0 0 0.2vw ${pri}15` : "none",
          transition: "all 0.2s",
        }}
          title={effect ? `${effect.name} Effect (click for details)` : "Empty slot"}
          onMouseEnter={(e) => {
            if (!effect) return;
            e.currentTarget.style.borderColor = `${pri}cc`;
            e.currentTarget.style.boxShadow = `0 0 0.6vw ${glow}55, inset 0 0 0.4vw ${pri}25`;
            e.currentTarget.style.transform = "scale(1.2)";
          }}
          onMouseLeave={(e) => {
            if (!effect) return;
            e.currentTarget.style.borderColor = `${pri}88`;
            e.currentTarget.style.boxShadow = `0 0 0.4vw ${glow}33, inset 0 0 0.2vw ${pri}15`;
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {effect && <span style={{ fontSize: "0.6vw", lineHeight: 1 }}>{effect.icon}</span>}
        </div>
      ))}
    </div>
  );
};

// ─── MAIN BOARD ───
export default function EremosBoard() {
  const sections = ["BRIDGE", "DRONE CONTROL HUB", "POWER CELL"];
  const oppDrones = [
    [{ name: "Behemoth", atk: 3, spd: 2, shields: 1, maxShields: 2, hull: 4, maxHull: 5, exhausted: false }],
    [{ name: "Mammoth", atk: 4, spd: 3, shields: 2, maxShields: 2, hull: 3, maxHull: 3, exhausted: false }],
    [{ name: "Skirmisher", atk: 2, spd: 3, shields: 0, maxShields: 1, hull: 2, maxHull: 3, exhausted: true }],
  ];
  const plDrones = [
    [{ name: "Blitz", atk: 2, spd: 3, shields: 2, maxShields: 2, hull: 3, maxHull: 3, exhausted: false, hasAbility: true }],
    [
      { name: "Blitz", atk: 2, spd: 3, shields: 1, maxShields: 2, hull: 3, maxHull: 3, exhausted: false, hasAbility: true },
      { name: "Bastion", atk: 1, spd: 3, shields: 3, maxShields: 3, hull: 4, maxHull: 4, exhausted: false, hasAbility: false, hasRapid: true },
      { name: "Mammoth", atk: 4, spd: 3, shields: 2, maxShields: 2, hull: 5, maxHull: 5, exhausted: false, hasAbility: true },
      { name: "Tempest", atk: 3, spd: 4, shields: 1, maxShields: 2, hull: 2, maxHull: 3, exhausted: true, hasAbility: false },
      { name: "Repair", atk: 0, spd: 3, shields: 1, maxShields: 1, hull: 3, maxHull: 3, exhausted: false, hasAbility: true, hasAssault: true },
    ],
    [{ name: "Behemoth", atk: 3, spd: 2, shields: 2, maxShields: 2, hull: 5, maxHull: 5, exhausted: false, hasAbility: true }],
  ];

  // Effects placed BY opponent INTO player's lanes (shown in red at front of player lanes)
  const oppEffectsInPlayerLanes = [
    [],
    [{ name: "Proximity", icon: "💥" }, { name: "EMP", icon: "⚡" }],
    [{ name: "Gravity", icon: "🌀" }],
  ];
  // Effects placed BY player INTO opponent's lanes (shown in cyan at front of opponent lanes)
  const plEffectsInOppLanes = [
    [{ name: "Scrambler", icon: "📡" }],
    [],
    [{ name: "Proximity", icon: "💥" }, { name: "Siphon", icon: "🔋" }, { name: "EMP", icon: "⚡" }],
  ];

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#000",
      fontFamily: "'Rajdhani', 'Segoe UI', Helvetica, Arial, sans-serif",
      overflow: "hidden",
    }}>
      <div style={{
        width: "min(100vw, 177.78vh)", height: "min(100vh, 56.25vw)",
        position: "relative", overflow: "hidden", background: C.bg,
        display: "flex", flexDirection: "column",
      }}>
        {/* Rich space background */}
        <div style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse at 50% 105%, rgba(20,70,140,0.3) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 115%, rgba(80,150,220,0.12) 0%, transparent 25%),
            radial-gradient(ellipse at 10% 15%, rgba(100,30,120,0.08) 0%, transparent 25%),
            radial-gradient(ellipse at 90% 20%, rgba(20,50,100,0.08) 0%, transparent 25%),
            radial-gradient(ellipse at 30% 60%, rgba(10,30,60,0.1) 0%, transparent 30%),
            radial-gradient(ellipse at 70% 40%, rgba(15,25,50,0.08) 0%, transparent 25%),
            radial-gradient(ellipse at 50% 50%, rgba(8,15,30,1) 0%, rgba(3,3,8,1) 100%)
          `,
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* Star field */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 40% 8%, rgba(200,220,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 45%, rgba(255,255,255,0.25) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 18%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 85% 52%, rgba(200,200,255,0.55) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 62%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 72%, rgba(255,255,255,0.2) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 28%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 92% 38%, rgba(255,255,255,0.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 5% 82%, rgba(255,255,255,0.25) 0%, transparent 100%),
            radial-gradient(2px 2px at 78% 78%, rgba(180,200,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 48% 88%, rgba(255,255,255,0.2) 0%, transparent 100%),
            radial-gradient(1px 1px at 18% 92%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 95% 8%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 8% 42%, rgba(255,255,255,0.15) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 32% 52%, rgba(255,255,255,0.12) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 65% 65%, rgba(255,255,255,0.1) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 82% 22%, rgba(255,255,255,0.15) 0%, transparent 100%),
            radial-gradient(0.5px 0.5px at 45% 32%, rgba(255,255,255,0.12) 0%, transparent 100%)
          `,
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* Centre light beam */}
        <div style={{
          position: "absolute", left: "49%", width: "2%", top: 0, bottom: 0,
          background: `linear-gradient(180deg,
            transparent 0%, rgba(0,180,255,0.02) 10%,
            rgba(0,180,255,0.05) 35%, rgba(0,200,255,0.09) 48%,
            rgba(0,200,255,0.12) 50%, rgba(0,200,255,0.09) 52%,
            rgba(0,180,255,0.05) 65%, rgba(0,180,255,0.02) 90%,
            transparent 100%
          )`,
          filter: "blur(5px)", pointerEvents: "none", zIndex: 0,
        }} />

        {/* ═══ HEADER ═══ */}

        <div style={{
          height: "15%",
          flexShrink: 0,
          /* Transparent black with blur distortion */
          background: "rgba(2, 2, 6, 0.7)",
          backdropFilter: "blur(12px)",
          position: "relative", zIndex: 20,
          display: "grid", gridTemplateColumns: LAYOUT.gridColumns,
          gap: LAYOUT.columnGap, padding: `0 ${LAYOUT.pagePadding}`,
          alignItems: "start",
        }}>
          {/* Centre light pillar — very subtle vertical glow */}
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: "44%", right: "44%",
            background: `radial-gradient(ellipse at 50% 60%, rgba(0,200,255,0.06) 0%, transparent 70%)`,
            pointerEvents: "none", zIndex: 1,
          }} />
          <div style={{
            position: "absolute", top: "20%", bottom: "20%",
            left: "49%", right: "49%",
            background: `rgba(0,200,255,0.06)`,
            filter: "blur(3px)",
            pointerEvents: "none", zIndex: 1,
          }} />

          {/* Red accent wash — LEFT side (opponent resources) */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: "30%",
            background: `linear-gradient(90deg, ${C.opponentPrimary}0c 0%, transparent 100%)`,
            pointerEvents: "none", zIndex: 1,
          }} />
          {/* Blue accent wash — RIGHT side (player resources) */}
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: "30%",
            background: `linear-gradient(270deg, ${C.playerPrimary}0c 0%, transparent 100%)`,
            pointerEvents: "none", zIndex: 1,
          }} />

          {/* ═══ BOTTOM BORDER — angular line with integrated notches ═══ */}
          {/* This is one continuous SVG line that dips down at key points */}
          <svg viewBox="0 0 1000 20" preserveAspectRatio="none" style={{
            position: "absolute", bottom: "-0.4vw", left: 0, right: 0,
            width: "100%", height: "1.2vw",
            pointerEvents: "none", zIndex: 5,
            filter: "drop-shadow(0 0 3px rgba(0,180,255,0.3))",
          }}>
            <defs>
              <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={C.opponentPrimary} stopOpacity="0.7" />
                <stop offset="25%" stopColor={C.opponentPrimary} stopOpacity="0.4" />
                <stop offset="40%" stopColor="rgba(120,150,200,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(150,180,220,0.4)" stopOpacity="1" />
                <stop offset="60%" stopColor="rgba(120,150,200,0.3)" stopOpacity="1" />
                <stop offset="75%" stopColor={C.playerPrimary} stopOpacity="0.4" />
                <stop offset="100%" stopColor={C.playerPrimary} stopOpacity="0.7" />
              </linearGradient>
            </defs>
            {/* The border line: straight, then dips at ~30%, centre, and ~70% */}
            <polyline
              points="
                0,2
                280,2
                295,2
                305,10
                315,10
                325,2
                335,2
                460,2
                475,2
                488,12
                500,16
                512,12
                525,2
                540,2
                665,2
                675,2
                685,10
                695,10
                705,2
                715,2
                1000,2
              "
              fill="none"
              stroke="url(#borderGrad)"
              strokeWidth="1.8"
            />
          </svg>
          {/* Soft glow behind the border — wider, blurred */}
          <svg viewBox="0 0 1000 20" preserveAspectRatio="none" style={{
            position: "absolute", bottom: "-0.4vw", left: 0, right: 0,
            width: "100%", height: "1.2vw",
            pointerEvents: "none", zIndex: 4,
            filter: "blur(3px)",
            opacity: 0.6,
          }}>
            <polyline
              points="
                0,2  280,2  295,2  305,10  315,10  325,2  335,2
                460,2  475,2  488,12  500,16  512,12  525,2  540,2
                665,2  675,2  685,10  695,10  705,2  715,2  1000,2
              "
              fill="none"
              stroke="url(#borderGrad)"
              strokeWidth="4"
            />
          </svg>

          {/* TOP BORDER — subtle matching angular line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "0.05vw",
            background: `linear-gradient(90deg,
              ${C.opponentPrimary}25 0%, ${C.opponentPrimary}10 30%,
              rgba(150,170,200,0.08) 50%,
              ${C.playerPrimary}10 70%, ${C.playerPrimary}25 100%
            )`,
            pointerEvents: "none", zIndex: 3,
          }} />

          <div style={{ padding: "1.5% 1%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: "clamp(0.5rem, 0.8vw, 0.75rem)", position: "relative", zIndex: 3 }}>
            [ Opponent Resources — not being redesigned ]
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.8% 0", position: "relative", zIndex: 3 }}>
            {/* Phase banner tier 1 */}
            <div style={{
              width: "100%", clipPath: "polygon(0% 0%, 100% 0%, 93% 100%, 7% 100%)",
              background: `linear-gradient(180deg, rgba(12,30,48,0.9), rgba(8,20,32,0.95))`,
              padding: "1.5% 2%", textAlign: "center", position: "relative",
              border: `0.06vw solid ${C.playerPrimary}22`,
            }}>
              <div style={{ position: "absolute", top: 0, left: "3%", right: "3%", height: "0.1vw", background: `linear-gradient(90deg, transparent, ${C.playerPrimary}44, ${C.playerPrimary}66, ${C.playerPrimary}44, transparent)` }} />
              <div style={{ position: "absolute", bottom: 0, left: "8%", right: "8%", height: "0.06vw", background: `linear-gradient(90deg, transparent, ${C.playerPrimary}22, transparent)` }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, rgba(255,255,255,0.03), transparent 50%, rgba(255,255,255,0.01))`, pointerEvents: "none" }} />
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(0.75rem, 1.5vw, 1.4rem)", textTransform: "uppercase", letterSpacing: "0.18em", textShadow: `0 0 1vw rgba(255,255,255,0.3), 0 0 2.5vw ${C.playerPrimary}25, 0 1px 3px rgba(0,0,0,0.9)` }}>DEPLOYMENT PHASE</div>
            </div>
            {/* Phase banner tier 2 */}
            <div style={{
              width: "75%", clipPath: "polygon(0% 0%, 100% 0%, 93% 100%, 7% 100%)",
              background: `linear-gradient(180deg, rgba(8,20,32,0.9), rgba(12,30,48,0.85))`,
              padding: "0.8% 2%", textAlign: "center", marginTop: "-1px", position: "relative",
              border: `0.05vw solid ${C.playerPrimary}15`,
            }}>
              <div style={{ position: "absolute", bottom: 0, left: "6%", right: "6%", height: "0.05vw", background: `linear-gradient(90deg, transparent, ${C.playerPrimary}20, transparent)` }} />
              <div style={{ color: C.playerPrimary, fontWeight: 700, fontSize: "clamp(0.55rem, 0.95vw, 0.95rem)", textTransform: "uppercase", letterSpacing: "0.1em", textShadow: `0 0 0.7vw ${C.playerPrimary}77, 0 0 1.5vw ${C.playerPrimary}33` }}>YOUR TURN</div>
            </div>
            <div style={{ height: "0.6vh" }} />
            {/* Button */}
            <div style={{ display: "flex", gap: "1%" }}>
              <div
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 93% 100%, 7% 100%)",
                  background: `linear-gradient(180deg, rgba(26,48,72,0.9), rgba(14,32,48,0.9))`,
                  padding: "0.6% 3%", textAlign: "center", cursor: "pointer",
                  border: `0.1vw solid ${C.playerPrimary}55`,
                  color: "#fff", fontWeight: 700,
                  fontSize: "clamp(0.5rem, 0.85vw, 0.85rem)",
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  boxShadow: `0 0 0.6vw ${C.playerPrimary}20, inset 0 0 0.4vw ${C.playerPrimary}08`,
                  textShadow: "0 0 0.4vw rgba(255,255,255,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(180deg, rgba(36,60,85,0.95), rgba(20,40,56,0.95))";
                  e.currentTarget.style.borderColor = `${C.playerPrimary}aa`;
                  e.currentTarget.style.boxShadow = `0 0 1.5vw ${C.playerPrimary}35, inset 0 0 0.8vw ${C.playerPrimary}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(180deg, rgba(26,48,72,0.9), rgba(14,32,48,0.9))";
                  e.currentTarget.style.borderColor = `${C.playerPrimary}55`;
                  e.currentTarget.style.boxShadow = `0 0 0.6vw ${C.playerPrimary}20, inset 0 0 0.4vw ${C.playerPrimary}08`;
                }}
              >
                PASS
              </div>
            </div>
          </div>

          <div style={{ padding: "1.5% 1%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: "clamp(0.5rem, 0.8vw, 0.75rem)", position: "relative", zIndex: 3 }}>
            [ Player Resources — not being redesigned ]
          </div>
        </div>

        {/* ═══ BATTLEFIELD ═══ */}
        <div style={{
          height: "60%", display: "grid", gridTemplateColumns: LAYOUT.gridColumns,
          gridTemplateRows: "1fr",
          gap: LAYOUT.columnGap, padding: `0.5% ${LAYOUT.pagePadding}`,
          position: "relative", zIndex: 1, overflow: "visible",
        }}>
          {sections.map((section, li) => (
            <div key={li} style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "visible" }}>
              <div style={{ height: LAYOUT.shipHeight, position: "relative", zIndex: 1 }}>
                <ShipSection faction="opponent" name={section} shields={li === 2 ? 3 : li === 1 ? 2 : 3} maxShields={3} hp={li === 0 ? 10 : li === 1 ? 8 : 6} maxHp={10} laneIndex={li} />
              </div>
              <div style={{ height: LAYOUT.laneHeight, marginTop: `-${LAYOUT.overlap}`, position: "relative", zIndex: 5 }}>
                <DroneLaneHalf faction="opponent" drones={oppDrones[li]} effects={plEffectsInOppLanes[li]} effectsPlacedBy="player" />
              </div>
              {/* Centre gap */}
              <div style={{ height: "5%" }} />
              <div style={{ height: LAYOUT.laneHeight, position: "relative", zIndex: 5 }}>
                <DroneLaneHalf faction="player" drones={plDrones[li]} effects={oppEffectsInPlayerLanes[li]} effectsPlacedBy="opponent" />
              </div>
              <div style={{ height: LAYOUT.shipHeight, marginTop: `-${LAYOUT.overlap}`, position: "relative", zIndex: 1 }}>
                <ShipSection faction="player" name={section} shields={li === 2 ? 0 : 3} maxShields={3} hp={10} maxHp={10} laneIndex={li} />
              </div>
            </div>
          ))}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{
          height: "25%",
          background: "linear-gradient(180deg, rgba(8,12,24,0.88), rgba(5,5,16,0.92))",
          borderTop: `0.12vw solid rgba(0,212,255,0.2)`,
          boxShadow: "0 -0.3vw 2vw rgba(0,0,0,0.5), 0 -0.1vw 0.5vw rgba(0,180,255,0.06)",
          backdropFilter: "blur(6px)",
          display: "flex", flexDirection: "column",
          position: "relative", zIndex: 20, flexShrink: 0,
        }}>
          <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: "0.1vw", background: `linear-gradient(90deg, transparent, ${C.playerPrimary}25, ${C.playerPrimary}40, ${C.playerPrimary}25, transparent)`, filter: "blur(1px)" }} />
          <ScanLines opacity={0.01} />
          <div style={{ display: "flex", justifyContent: "center", gap: "0.3%", padding: "0.5% 0", position: "relative", zIndex: 3 }}>
            {["Hand (4/5)", "Drones", "Log (42)"].map((tab, i) => (
              <div key={i} style={{ padding: "0.3% 1.2%", fontSize: "clamp(0.5rem, 0.8vw, 0.75rem)", fontWeight: 700, color: i === 0 ? "#fff" : "#777", background: i === 0 ? `${C.playerPrimary}15` : "transparent", border: `0.05vw solid ${i === 0 ? `${C.playerPrimary}40` : "rgba(255,255,255,0.08)"}`, borderRadius: "0.2vw", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>{tab}</div>
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: "clamp(0.5rem, 0.8vw, 0.75rem)", position: "relative", zIndex: 3 }}>
            [ Footer / Hand area — not being redesigned ]
          </div>
        </div>
      </div>
    </div>
  );
}
