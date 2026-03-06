# EREMOS Header UI Redesign — Implementation Spec

## Overview

This document describes a complete redesign of the game header. The current header displays opponent stats on the left, phase info in the center, and player resources on the right as flat text readouts. The new design wraps each side in a structured, framed panel with a ship portrait hexagon, unified KPIs, and a dedicated health bar strip.

**Reference mockup file:** `opponent-panel-mockup.jsx` (included alongside this spec — a React component showing the exact visual target with the component structure, styling, and layout).

---

## Layout Structure

The header occupies **15% of the viewport height** (please confirm and check) (`15vh`, min `90px`, max `130px`). It is split into three columns:

| Column | Width | Content |
|--------|-------|---------|
| Left | 33% | Opponent panel |
| Center | 33% | Phase info (existing) |
| Right | 33% | Player panel |

This three-column layout already exists. The center phase area is unchanged in this work — it keeps its current pointed-end container shape and content (phase name, action context, pass/end turn button).

---

## Side Panel Structure (Opponent & Player)

Each side panel contains three distinct elements:

### 1. The Bar Container

A horizontal bar with an **SVG polygon shape**. The bar has a pointed arrow end on the outer edge (toward the screen edge) and a flat end on the inner edge (toward center).

**Opponent (left panel):** Point faces left.
```
SVG polygon points: "20,0 460,0 460,64 20,64 0,32"
```

**Player (right panel):** Point faces right (mirrored).
```
SVG polygon points: "0,0 440,0 460,32 440,64 0,64"
```

The SVG uses `preserveAspectRatio="none"` so the shape stretches to fill its container. Two polygon layers: one for the dark background fill, one for the border stroke.

**Border colours are faction-specific:**
- Opponent borders: Use the existing opponent/red faction colour
- Player borders: Use the existing player/cyan faction colour

The bar background fill should use the same dark background as the rest of the header panels.

### 2. The Double-Layer Hexagon

A hexagonal ship portrait that **overlaps the bar container** — it is taller than the bar and positioned at the outer edge, breaking out of the bar's boundaries. This is achieved with absolute positioning and a higher z-index.

The hexagon has **two layers:**
- **Outer hex** with a visible border (stroke-width 2) and dark fill
- **Inner hex** inset inside the outer, with its own border (stroke-width 1.5) and fill

The **background fill of both hex layers** should use the same background styling as the center phase container (the pointed bar in the middle that shows "Action Phase / Play an Action"). This ties the hex visually to the HUD aesthetic.

**Hex borders are faction-coloured** (red for opponent, cyan for player).

**SVG coordinates:**
```
Outer hex: points="39,0 78,22 78,66 39,88 0,66 0,22"
Inner hex: points="39,8 70,26 70,62 39,80 8,62 8,26"
```

**Ship image:** The inner hex displays the **main artwork/image of the player's or opponent's selected Ship** (not ship sections — the ship itself). Each ship already has a main image asset. This image should be displayed within the inner hex, clipped to the hex shape.

**Player hex is clickable** — it functions as the menu/settings button. It has:
- A small **cog badge** icon positioned at the bottom-right corner of the hex
- The cog is subtle at rest (low opacity, muted colour)
- On hover, the hex borders brighten and the cog becomes more prominent
- Clicking opens the existing settings/menu modal

**Opponent hex is NOT clickable** — no cog badge, no hover state.

### 3. The Floating Label

The text "OPPONENT" or "PLAYER" sits **above and outside the bar container** — it is not enclosed within the bar frame. It uses absolute positioning above the bar.

The label has a **subtle glow effect** behind it using `text-shadow` in the faction colour:
- Opponent: red glow
- Player: cyan glow

Example: `text-shadow: 0 0 10px [faction-glow-colour], 0 0 20px [faction-glow-colour-faint]`

---

## Bar Content

Inside each bar, the content is split into two vertical sections:

### Top Section: KPI Row

A horizontal row of stat boxes. **Both players show the same KPIs in the same order:**

| Position | KPI | Description |
|----------|-----|-------------|
| 1 | Deployment Budget | Now always visible (was previously conditional) |
| 2 | Energy | Current / Max |
| 3 | Momentum | Current value |
| 4 | Cards in Hand | Current / Max or just current |
| 5 | Drone Limit | Current / Max |

Each KPI is displayed as a small bordered box containing an icon and a value. The existing icon styling and KPI component styling can remain as-is for now — specific icon and styling refinements will be done separately with Claude Code.

**On the opponent side**, KPIs align to the left (after the hex space).
**On the player side**, KPIs align to the right (before the hex space).

The KPI row sits in the upper portion of the bar, with padding to avoid overlapping the hex area. The bar content has margin on the hex side (~17%) to leave room for the overlapping hexagon.

### Bottom Section: Health Strip

A distinct **sub-container strip** along the bottom of the bar. It is visually separated from the KPIs above by:
- A darker background (`rgba(0, 0, 0, 0.3)`)
- A `border-top` line

The health strip contains:
- **Health number** (e.g., "22/30") — the existing calculated ship health value, now moved here
- **Segmented health bar** — individual segments representing each health point

**Health bar scaling:** The bar must support **up to 30 segments**. Segments use `flex: 1` with `min-width: 2px` and `max-width: 10px` so they scale proportionally to fit the available space regardless of the total number.

- **Filled segments** use a gradient in the faction colour with a subtle box-shadow glow
- **Empty segments** use a dark, muted background with a faint border

**Opponent side:** Health number on the left, segments on the right.
**Player side:** Segments on the left, health number on the right.

The health value is an existing game calculation that is already displayed as a KPI in the current header. This work moves it out of the KPI row and into its own dedicated health strip. The calculation logic should be reused, not duplicated.

---

## Sizing & Responsiveness

All sizing should use **percentage-based and viewport-relative units** to scale correctly:

- Header height: `15vh` with `min-height: 90px` and `max-height: 130px`
- Side panel widths: `38%`
- Center width: `24%`
- **Side panel content should use a maximum of ~90% of its allotted column space.** The bar and hex should not stretch edge-to-edge within the column — leave breathing room so the panels don't feel cramped against the center or screen edges.
- Bar content margins (hex space): `~17%` on the hex side
- Font sizes: Use `clamp()` for responsive scaling, e.g., `clamp(8px, 0.9vw, 11px)`
- Hex dimensions: Use `clamp()`, e.g., `width: clamp(60px, 6.5vw, 82px)`

The components must fit within the existing 15vh header space without overflow.

---

## Colour System

All colours must use the **existing faction colour variables** from the codebase. Do not hardcode new colour values. The mockup uses these approximate values as reference:

- Opponent (red faction): `#cc3333` for text, with dimmer variants for borders and glows
- Player (cyan faction): `#33aacc` for text, with dimmer variants for borders and glows

Find and use the existing CSS variables or colour constants already defined in the project.

---

## What Changes vs What Stays

### Changes (this work):
- Replace the flat opponent stat readout (left column) with the new framed panel
- Replace the flat player resource readout (right column) with the new framed panel
- Move the health calculation out of the KPI row and into the dedicated health strip
- Make Deployment Budget always visible (remove any conditional display logic)
- Add ship portrait hexagons with the selected ship's main artwork
- Add the menu/settings trigger to the player hex
- Standardise KPI order to be identical on both sides
- Remove the existing standalone settings cog from the header (it moves into the player hex)

### Stays the same (do NOT change):
- Center phase area content and behaviour
- Phase name / action context / pass button logic
- All game state calculations (health, energy, momentum, etc.)
- The three-column layout structure
- The overall 15vh header height allocation

---

## Implementation Approach

### TDD Method
1. Run existing tests and note any current failures
2. Write tests for the new header components:
   - Panel renders with correct structure (bar, hex, label)
   - KPIs display in correct order for both sides
   - Health bar renders correct number of filled/empty segments
   - Player hex click triggers menu/settings
   - Ship image loads from selected ship data
   - Deployment Budget is always visible
3. Confirm new tests fail
4. Implement the components
5. Confirm new tests pass
6. Confirm no existing tests have broken

### Suggested component breakdown:
- `HeaderPanel` — the framed bar with SVG shape (reusable for both sides, accepts `side="opponent"|"player"` prop)
- `ShipHexPortrait` — the double-layer hex with ship image (accepts ship data, optional `isClickable` prop for menu)
- `HealthBar` — the segmented health strip (accepts `current`, `max`, `side` props)
- Existing KPI components can be reused/reorganised within the new layout

### Key data connections:
- Ship image: Sourced from the selected ship's data (the Ship object, not ship sections)
- Health value: Reuse the existing calculated health KPI — do not create a new calculation
- KPI values: Same data sources as current header, just reorganised into unified order
- Menu trigger: Connect player hex click to the existing settings/menu modal handler

---

## Files

| File | Purpose |
|------|---------|
| This spec (`header-redesign-spec.md`) | Implementation requirements |
| `opponent-panel-mockup.jsx` | Visual reference mockup — React component showing target layout, structure, and styling |
