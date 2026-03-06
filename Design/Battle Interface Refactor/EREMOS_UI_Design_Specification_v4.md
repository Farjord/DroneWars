# EREMOS UI Redesign — Design Specification v4

**Date**: 1 March 2026
**Reference Mockup**: `eremos_mockup_v10.jsx` (React artifact — visual reference only, not production code)

---

## CRITICAL RULES

1. **No functional changes.** Every existing game feature — state management, event handlers, props, drag-and-drop, modals, networking — must remain exactly as-is. This is a visual reskin only.
2. **All sizing must use responsive units.** Percentages (%), vw, vh, or clamp(). No fixed pixel values except as minimums inside clamp(). The current codebase likely does NOT follow this — every component will need its sizing reviewed and converted.
3. **The existing background image feature must not be altered.** It stays as-is.

---

## NEW FEATURES (requires new logic, not just reskinning)

### Lane Effects
Lane Effects are a **new concept** not present in the current codebase. These are circular token slots at the centre-facing edge of each drone lane that represent effects active in that lane — both hostile (e.g. mines placed by the opponent) and friendly buffs (e.g. shields placed by the lane owner). This feature will need new components, new data structures, and new UI — it is not a reskin of anything existing. See Section 7 for full visual specification. The game logic and data model for Lane Effects is out of scope for this document — only the UI layout and visual design is specified here.

### 5-Drone Lane Limit
The game now has a maximum of **5 drones per lane**. This is a game rule change, not a UI change. The UI should accommodate up to 5 tokens per lane. **Implementing the enforcement of this limit in game logic is out of scope for this redesign** — it will be handled separately.

---

## 1. Objectives & Constraints

### What IS Being Redesigned (visual reskin)
- Overall page layout ratios and responsive scaling
- Header bar (phase banner, resource areas)
- Ship sections (opponent and player)
- Drone lanes (opponent and player)
- Drone tokens
- Overall atmosphere and visual treatment

### What is NOT Being Redesigned
- Footer / Hand area content (tabs, card display, drone list, log) — however, its container must scale to 25% of total height, and any issues arising from this will be resolved as they come up
- Game logic, state management, networking
- Modal dialogs, overlays, phase announcements
- Card artwork or drone artwork
- The existing background image feature

### Important Note on Existing File Mapping
Claude Code must review the existing codebase and map each section of this specification to the corresponding existing files/components before beginning work. This mapping should be confirmed before any changes are made, so that it is clear which files correspond to which sections of this document.

---

## 2. 16:9 Enforcement

The entire game UI must sit within a 16:9 container. If the viewport is a different ratio, the game area should be centred with black bars.

```
Container sizing:
  width:  min(100vw, 177.78vh)    // 16:9 = 1.7778
  height: min(100vh, 56.25vw)     // 9:16 = 0.5625
  centred with flexbox
  background: #000 (black bars)
```

---

## 3. Page Layout — Vertical Sections

The game container is divided into three vertical sections using flex column:

| Section    | Height | Description |
|------------|--------|-------------|
| Header     | 15%    | Phase banner, resource displays |
| Game Area  | 60%    | Battlefield — ship sections, drone lanes, lane effects |
| Hand/Footer| 25%    | Card hand, drone list, game log tabs |

All panel backgrounds should be **translucent** (rgba with alpha < 1). The background should be visible through panels, creating a holographic HUD feel. Use `backdropFilter: blur()` for frosted glass effect.

---

## 4. Game Area — Grid Layout

The game area uses a CSS grid with three equal columns:

```
Grid:
  gridTemplateColumns: "1fr 1fr 1fr"
  gridTemplateRows: "1fr"
  columnGap: 1%
  pagePadding: 1.2% (left and right)
```

Each column contains (top to bottom):

1. **Opponent Ship Section** — 30% of column height
2. **Opponent Drone Lane** — 29% of column height, overlaps ship by 10%
3. **Centre Gap** — 5% spacing between opposing lanes (mine/buff zone)
4. **Player Drone Lane** — 29% of column height
5. **Player Ship Section** — 30% of column height, overlapped by lane by 10%

### Lane/Ship Overlap
Drone lanes overlap into ship sections by `10%`. The lane has `zIndex: 5`, the ship section has `zIndex: 1`, so the lane renders on top.

```
Overlap implementation:
  Opponent lane:  marginTop: -10%
  Player ship:    marginTop: -10%
```

---

## 5. Ship Sections

### Shape
Chevron/hexagonal shape using CSS `clip-path polygon()`.

**Opponent** (wide at top, narrows at bottom):
```
polygon(5% 0%, 95% 0%, [RIGHT_WING]% 45%, 93% 100%, 7% 100%, [LEFT_WING]% 45%)
```

**Player** (narrows at top, wide at bottom):
```
polygon(7% 0%, 93% 0%, [RIGHT_WING]% 55%, 95% 100%, 5% 100%, [LEFT_WING]% 55%)
```

### Wing Point Cutouts
Ship sections on inner edges (facing adjacent columns) have their wing points pulled inward by 1.5% to create a subtle gap. Outer edges remain at 0%/100%.

- **Column 0 (Bridge)**: left wing = 0%, right wing = 98.5%
- **Column 1 (Drone Control Hub)**: left wing = 1.5%, right wing = 98.5%
- **Column 2 (Power Cell)**: left wing = 1.5%, right wing = 100%

### Visual Layers (bottom to top)
1. **Outer glow bloom** — slightly oversized clip, faction glow colour, drop-shadow filter
2. **Bright outer border** — slightly oversized clip, faction primary with gradient
3. **Panel body** — translucent faction background gradient, `backdropFilter: blur(4px)`
4. **Inner border** — inset 0.3%, thin border in faction primary
5. **Glassy sheen** — diagonal linear-gradient with subtle white highlights
6. **Edge highlights** — thin bright lines on top/bottom and left/right edges
7. **Inner glow** — inset box-shadow in faction primary
8. **Diagonal hatch pattern** — very subtle 45° repeating lines for texture
9. **Scan lines** — horizontal 2px repeating lines, very low opacity
10. **Corner brackets** — SVG L-shaped markers at corners (opponent: top corners, player: bottom corners)
11. **Edge tick marks** — small perpendicular lines along the outer edge

### Content Safe Zone
Content (name, shields, HP) sits within a safe zone to avoid clip-path edges:
- **Opponent**: top 10%, bottom 42%, left 15%, right 15%
- **Player**: top 42%, bottom 10%, left 15%, right 15%

### Content Layout (within safe zone)
1. **Ship Name** — centred, uppercase, bold, letter-spacing 0.14em, white with faction glow text-shadow
2. **Shields + Action Button** — shields centred (flex, justify-center), action button absolute-positioned to the right. Shields are SVG hexagons with inner highlight when active
3. **HP Bar** — row of small squares, gradient fill when active, dim outline when depleted

---

## 6. Drone Lanes

### Shape
Trapezoid using CSS `clip-path polygon()`.

**Opponent** (narrow at top, wide at bottom):
```
polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)
```

**Player** (wide at top, narrow at bottom):
```
polygon(0% 0%, 100% 0%, 88% 100%, 12% 100%)
```

### Visual Layers
1. **Glow behind** — faction glow, drop-shadow
2. **Outer border** — gradient in faction primary
3. **Main trapezoid body** — translucent faction background, `backdropFilter: blur(3px)`
4. **Inner border** — thin inset border
5. **Edge highlight** — bright line along the wide end
6. **Grid pattern** — subtle horizontal/vertical grid lines
7. **Glassy sheen** — diagonal highlight sweep
8. **Scan lines** — very subtle
9. **Chevron arrows** — small decorative arrows at the centre-line edge

### Drone Token Positioning
- Tokens are vertically centred within the lane
- Distributed horizontally using `justify-content: space-evenly`
- Maximum 5 drones per lane
- Token width: 15% of lane column
- Aspect ratio: 90/115 (portrait)
- `flexShrink: 0` — tokens do not shrink
- Overflow visible to allow stat hexagons to extend beyond card bounds

### Drone Token Visual
- Translucent faction background gradient with `backdropFilter: blur(2px)`
- Faction border (0.1vw solid, faction primary at 55% opacity)
- Top edge highlight — thin bright line
- Corner accent dots — top left and right
- Inner gradient overlay
- Name: bold, uppercase, faction text glow
- Stats: attack and speed in SVG hexagons overlapping the top-left and top-right card edges
- Ability button (lightning bolt circle) overlapping right edge, player-only
- Special ability icons (Rapid "R", Assault "A" circles) overlapping left edge
- Shields row: small hexagon pips (cyan when active, grey outline when depleted)
- Hull pips: small squares (cyan/white when active, grey when damaged)
- Exhausted state: grayscale filter + reduced opacity

---

## 7. Lane Effects (NEW FEATURE)

Lane Effects are circular token slots positioned at the centre-facing edge of each drone lane. They straddle the lane border using absolute positioning with `translateY(50%)` (opponent lanes, bottom edge) or `translateY(-50%)` (player lanes, top edge).

### Purpose
These slots display effects that are active in the lane — both hostile effects placed by the opponent (e.g. mines) and friendly buffs placed by the lane owner. The colour of each active slot reflects who placed the effect.

### Layout
- 5 slots per lane (matching max drones per lane)
- Centred horizontally with `gap: 0.5vw`
- `zIndex: 15` (above lane visuals)

### Slot Sizing
- Width/height: `1.4vw` (min: 14px)
- Border-radius: 50% (circular)

### Empty Slots
- Background: `rgba(40,40,50,0.5)` (dark grey fill)
- Border: `0.08vw solid rgba(100,100,120,0.35)` (grey outline)
- Non-interactive (`cursor: default`)

### Active Effect Slots
- Background: Faction-tinted dark fill based on who placed the effect
  - Placed by opponent: dark red tint
  - Placed by player: dark blue tint
- Border: faction-coloured (of the placer) at medium opacity
- Subtle glow box-shadow
- Contains icon/artwork representing the effect type
- Interactive: `cursor: pointer`, click opens detail modal
- Hover: border brightens, shadow intensifies, `scale(1.2)`

### Centre Gap
The 5% gap between opponent and player lane halves provides clear separation between the two rows of lane effects, preventing overlap.

---

## 8. Header Bar

### Background
- Simple transparent black: `rgba(2, 2, 6, 0.7)`
- `backdropFilter: blur(12px)` — distorts the background behind it
- No gradients, no sheens on the background itself

### Centre Light Pillar
- Subtle vertical cyan glow in the centre ~12% width
- Very low opacity radial gradient + thin central line
- Sits behind the text content

### Faction Colour Accents
- **Left side**: Red wash (opponent) — `linear-gradient` from opponentPrimary at 5% opacity to transparent, covering left 30%
- **Right side**: Blue wash (player) — same approach, right 30%

### Bottom Border (THE STAR FEATURE)
The bottom border is the most distinctive visual element of the header. It is a **single continuous SVG polyline** that runs across the full width but **dips down into angular notch shapes** at three points:

- ~30% from left (small dip)
- Centre (largest dip)
- ~70% from right (small dip)

The stroke uses a **gradient**: red (opponentPrimary) on the left, fading through neutral grey in the centre, to blue (playerPrimary) on the right.

A second blurred copy of the same polyline sits behind for glow effect.

### Top Border
- Very subtle thin line with the same red-left, blue-right gradient

### Phase Banner (centre column)
Three-tier trapezoid stack:
1. **Tier 1** — Phase name (100% column width), trapezoid clip-path `polygon(0% 0%, 100% 0%, 93% 100%, 7% 100%)`, translucent dark background with faction border accents
2. **Tier 2** — Action context (75% width), same clip-path, narrower, connected to tier 1 (marginTop: -1px)
3. **Gap** — 0.6vh spacing
4. **Button** — Separate distinct element, same trapezoid clip, hover effect, NOT connected to tiers above

---

## 9. Font & Typography

- Use existing fonts. 

---

## 10. Footer / Hand Area

- Must scale to **25% of total height**
- Translucent dark background with backdrop blur
- Top border with subtle glow line
- Tab bar (Hand, Drones, Log) at top
- **Content is NOT being redesigned** — only the container sizing/styling changes
- Existing content may not work perfectly with the new percentage-based scaling — any issues will be resolved as they arise

---

## 11. Reference Files

| File | Purpose |
|------|---------|
| `eremos_mockup_v10.jsx` | Final visual reference mockup (React artifact) |
| This document | Design specification for implementation |

---

*End of specification*
