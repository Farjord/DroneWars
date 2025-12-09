# Exploring the Eremos - Implementation Overview

## Executive Summary

This document provides a master roadmap for implementing "Exploring the Eremos," an extraction-based single-player TCG mode for Drone Wars. The implementation follows an MVP-first approach, focusing on delivering a complete core gameplay loop before adding advanced features.

**Project Scope:**
- Single-player extraction gameplay with risk/reward mechanics
- Tier 1 maps only (The Shallows) for MVP
- Reuse existing combat system with AI opponents
- File-based save/load system
- Clean, minimal UI design
- No impact on existing multiplayer functionality

**Timeline:** 18-20 days (4-6 hours/day)

**Deliverables:**
- 37 new files (data, logic, UI components)
- 4 modified files (deck validation, menu, routing, state manager)
- Complete gameplay loop: Hangar → Deploy → Navigate → Loot/Combat → Extract → Return

---

## Key Design Decisions

### 1. Mode Separation
**Decision:** Single-player is a completely separate mode from multiplayer
**Rationale:** Prevents breaking existing multiplayer while allowing SP-specific mechanics
**Implementation:** Use `gameMode === 'singlePlayer'` flag for branching logic

### 2. Deck Size Change
**Decision:** Both modes use 40-card decks (up from 30)
**Rationale:** Single-player requires 40 per PRD; changing both modes for consistency
**Impact:** Minimal - existing deck already has 40 cards in StateInitializer.js

### 3. Drone Selection
**Decision:** Single-player skips drone selection phase entirely
**Rationale:** SP uses exactly 5 pre-configured drones; no selection needed
**Impact:** Multiplayer keeps 10→5 selection, SP jumps straight to combat

### 4. Combat Reuse
**Decision:** Reuse existing multiplayer combat system with AI opponent
**Rationale:** Proven system, reduces development time, consistent mechanics
**Implementation:** Skip pre-game phases for SP, use preset deck/drones/ship

### 5. Save System
**Decision:** File download/upload with JSON format
**Rationale:** Per PRD specification, no backend required for MVP
**Future:** Can add cloud sync or backend storage post-MVP

### 6. MVP Scope
**Decision:** Tier 1 only, basic blueprints (2-3 ships), placeholder economy values
**Rationale:** Validate core loop before scaling to all 3 tiers
**Post-MVP:** Hunter AI, narrative system, Tiers 2-3, economy tuning

---

## Implementation Phases

| Phase | Name | Duration | Dependencies | Status |
|-------|------|----------|--------------|--------|
| 1 | Foundation & Data Layer | 2 days | None | ✅ Complete |
| 2 | Persistence System | 1 day | Phase 1 | ✅ Complete |
| 3 | Hangar UI | 2 days | Phase 2 | ✅ Complete |
| 4 | Map Generation | 2 days | Phase 1 | ✅ Complete |
| 5 | Tactical Map Screen | 2 days | Phase 4 | ✅ Complete |
| 6 | Instability & Encounters | 2 days | Phase 5 | ✅ Complete |
| 7 | Combat Integration | 2 days | Phase 6 | ✅ Complete |
| 8 | Loot & Rewards | 1 day | Phase 7 | ✅ Complete |
| 9 | Extraction & Completion | 1 day | Phase 8 | ✅ Complete |
| 10 | MIA System | 1 day | Phase 2, 9 | ✅ Complete |
| 11 | Economy Services | 1 day | Phase 3 | ✅ Complete |
| 12 | Routing & Navigation | 1 day | All phases | ✅ Complete |
| 13 | Testing & Polish | 2-3 days | All phases | 🔄 Ongoing |
| 14 | Ship Cards | 1 day | Phase 11 | ✅ Complete |

**Critical Path:** 1 → 4 → 5 → 6 → 7 → 8 → 9 → 12 → 13
**Parallel Tracks:** Phases 2-3 and 11 can develop alongside critical path

---

## File Inventory

### New Files (37 total)

#### Data Files (10)
1. `src/data/playerDeckData.js` - Starter deck extraction
2. `src/data/shipBlueprintData.js` - 3 ship types for MVP
3. `src/data/pointsOfInterestData.js` - 7 PoI definitions
4. `src/data/cardPackData.js` - Pack generation rules
5. `src/data/mapData.js` - Tier configurations (radius, PoI counts, costs)
6. `src/data/mapMetaData.js` - Map type definitions with PoI distributions
7. `src/data/saveGameSchema.js` - Save file structure (includes starterPoolShipIds)
8. `src/data/aiData.js` - Extended with 5 new AI opponents
9. `src/data/shipData.js` - Ship card definitions with baseHull, baseShields, deckLimits
10. `src/data/economyData.js` - Centralized economy values

#### Services (6)
9. `src/services/SaveGameService.js` - File download/upload
10. `src/logic/economy/CreditManager.js` - Credit transactions
11. `src/logic/economy/RepairService.js` - Hull & drone repairs
12. `src/logic/economy/ReplicatorService.js` - Card duplication
13. `src/logic/extraction/mapExtraction.js` - Utility functions for map metadata
14. `src/logic/extraction/poiUtils.js` - PoI selection with weighted randomness (getRandomPoIType)

#### Map & Generation (4)
15. `src/utils/hexGrid.js` - Axial coordinate utilities
16. `src/utils/mapGenerator.js` - Procedural generation with two-layer architecture (Tier + Type)
17. `src/logic/map/PathValidator.js` - A* validation (IMPLEMENTED)
18. `src/logic/map/MovementController.js` - Player movement (future phase)

#### Deck Utilities (1)
19. `src/utils/singlePlayerDeckUtils.js` - Card/drone/component/ship availability calculations

#### Single-Player Logic (8)
19. `src/logic/instability/InstabilityManager.js` - Core timer
20. `src/logic/encounters/EncounterController.js` - Ambush rolls
21. `src/logic/singlePlayer/SinglePlayerCombatInitializer.js` - Combat setup
22. `src/logic/singlePlayer/CombatOutcomeProcessor.js` - Win/loss handling
23. `src/logic/singlePlayer/ExtractionController.js` - Extraction flow
24. `src/logic/singlePlayer/DroneDamageProcessor.js` - Damage protocol
25. `src/logic/singlePlayer/MIARecoveryService.js` - MIA resolution
26. `src/logic/loot/LootGenerator.js` - Pack opening & combat salvage (tier rarity limits, starter exclusion) ✅

#### Screens (2)
27. `src/components/screens/HangarScreen.jsx` - Main hub
28. `src/components/screens/TacticalMapScreen.jsx` - Hex map view

#### Modals (8)
29. `src/components/modals/MapOverviewModal.jsx` - Map preview (opens directly from map icon)
30. `src/components/modals/SinglePlayerDeckEditorModal.jsx` - Deck builder wrapper
31. `src/components/modals/ReplicatorModal.jsx` - Card duplication
32. `src/components/modals/RepairBayModal.jsx` - Repairs
33. `src/components/modals/POIEncounterModal.jsx` - PoI interaction
34. `src/components/modals/LootRevealModal.jsx` - Loot card flip reveal ✅
35. `src/components/modals/LootRevealModal.css` - Reveal animation styles ✅
36. `src/components/modals/RunInventoryModal.jsx` - View collected loot during run ✅
37. `src/components/modals/RunInventoryModal.css` - Inventory modal styles ✅
38. `src/components/modals/ExtractionSummaryModal.jsx` - Mission results
39. `src/components/modals/MIARecoveryModal.jsx` - MIA resolution

> **Note:** `WaypointConfirmationModal.jsx` was redesigned as `HexInfoPanel.jsx` (see UI Components)

#### UI Components (10)
37. `src/components/ui/ShipSlotCard.jsx` - Slot display
38. `src/components/ui/HexGridRenderer.jsx` - SVG hex grid ✅
39. `src/components/ui/HexGridRenderer.css` - Hex grid styles ✅ (NEW)
40. `src/components/ui/InstabilityMeter.jsx` - Color-coded meter ✅
41. `src/components/ui/InstabilityMeter.css` - Meter styles ✅ (NEW)
42. `src/components/ui/TacticalMapHUD.jsx` - Map overlay ✅
43. `src/components/ui/TacticalMapHUD.css` - HUD styles ✅ (NEW)
44. `src/components/ui/HexInfoPanel.jsx` - Two-view panel (Waypoint List + Hex Info) ✅ (REPLACES WaypointConfirmationModal)
45. `src/components/ui/HexInfoPanel.css` - Panel styles ✅ (NEW)

### Modified Files (4)

1. **`src/components/screens/DeckBuilder.jsx`**
   - Line 458: Change `cardCount === 30` → `cardCount === 40`
   - Impact: Both SP and MP now require 40 cards

2. **`src/components/screens/MenuScreen.jsx`**
   - Add "Explore The Eremos" button at top
   - onClick: Navigate to hangar with `gameMode: 'singlePlayer'`

3. **`src/managers/GameStateManager.js`**
   - Add state properties: `singlePlayerProfile`, `singlePlayerInventory`, `singlePlayerShipSlots`, `currentRunState`
   - Add methods: `loadSinglePlayerSave()`, `createNewSinglePlayerProfile()`

4. **`src/AppRouter.jsx`**
   - Add routing for `appState === 'hangar'` → HangarScreen
   - Add routing for `appState === 'tacticalMap'` → TacticalMapScreen
   - Modify `appState === 'inGame'` to skip phases when `gameMode === 'singlePlayer'`

---

## Architecture Overview

### State Flow
```
GameStateManager (Singleton)
    ├─ Multiplayer State (existing)
    │   ├─ player1, player2
    │   ├─ gameMode: 'local' | 'host' | 'guest'
    │   └─ turnPhase, commitments
    │
    └─ Single-Player State (new)
        ├─ singlePlayerProfile { credits, tokens, blueprints }
        ├─ singlePlayerInventory { cardId: quantity }
        ├─ singlePlayerShipSlots [6 slots with decks]
        └─ currentRunState { instability, loot, position, mapData }
```

### Navigation Flow
```
Main Menu
    ├─ [Explore The Eremos] → Hangar (SP mode)
    ├─ [Single Player] → Lobby (MP local mode)
    └─ [Multiplayer] → Lobby (MP host/guest mode)

Hangar
    ├─ Select Map Tier → Map Overview Modal → Deploy → Tactical Map
    ├─ Deck Editor → SinglePlayerDeckEditorModal
    ├─ Replicator → ReplicatorModal
    ├─ Repair Bay → RepairBayModal
    └─ Save/Load → SaveGameService

Tactical Map
    ├─ Move to Hex → Encounter Check → Combat or Loot
    ├─ Move to Gate → Extraction Check → Combat or Safe Extract
    └─ Instability 100% → Auto MIA → Hangar
```

### Data Flow
```
Map Generation:
  mapData.js → MapGenerator → PathValidator → TacticalMapScreen

Encounter:
  PoI Click → EncounterController → Ambush Roll
    ├─ Combat → SinglePlayerCombatInitializer → Combat Screen
    └─ Loot → LootGenerator → LootModal

Extraction:
  Gate Click → ExtractionController → Blockade Check
    ├─ Combat → Blockade AI → Combat Screen
    └─ Safe → DroneDamageProcessor → ExtractionSummaryModal → Hangar

Persistence:
  Save: GameStateManager → SaveGameService → JSON file download
  Load: File upload → SaveGameService → GameStateManager
```

---

## Key Systems

### 1. Threat System
**Purpose:** Core tension mechanic, tracks enemy awareness
**Range:** 0-100%
**UI Label:** "Threat Level" (code still uses `detection` variable names)

**Threat Triggers:**
- Movement: Zone-based (+0.5% perimeter, +1.5% mid, +2.5% core)
- Looting PoI: POI-specific value (5-25%, defined in `pointsOfInterestData.js`)
- ~~Combat End: +20%~~ (REMOVED - combat does not increase threat)

**Encounter Chance (FIXED per hex type - independent of threat level):**
- Empty hexes: 5%
- Gate hexes: 0%
- POI hexes: 5-20% (per-POI, defined in `pointsOfInterestData.js`)

**Threat Thresholds (affect AI severity, not encounter chance):**
- 0-49%: Low threat → Scout/Patrol AI - Green
- 50-79%: Medium threat → Cruiser/Hunter AI - Yellow
- 80-99%: High threat → Blockade AI - Red
- 100%: MIA (mission failure)

### 2. MIA Protocol
**Trigger Conditions:**
- Player ship destroyed in combat
- Instability reaches 100%
- Unexpected application exit during run

**Consequences:**
- All run loot wiped
- Deck locked in ship slot
- Slot marked as MIA

**Resolution:**
- Pay Salvage: Recover ship (cost TBD, placeholder: 500 credits)
- Scrap: Delete deck, free slot, lose all cards

### 3. Drone Damage Protocol
**Trigger:** Hull < 50% at extraction
**Effect:** Random drone marked as "Damaged"
**Consequence:** Cannot deploy until repair fee paid
**Cost:** Rarity-based (Common: 50, Uncommon: 100, Rare: 200, Mythic: 500)
**Purpose:** Economic friction to prevent runaway progression

### 4. Blueprint System (MVP)
**Ships Available:**
1. Standard Corvette (starter, 30 HP)
2. Heavy Gunship (40 HP, tanky)
3. Scout Frigate (20 HP, fast - placeholder for future mechanic)

**Acquisition:** 1% chance from combat salvage (Fleet Command boss: guaranteed)
**Usage:** Select blueprint when creating new ship slot deck

### 5. Economy System
**Currency:** Credits (high volatility)
**Starting Balance:** 1000 credits
**Income:** Loot packs (10-100 credits), combat salvage
**Expenses:**
- Map entry: Free (Tier 1)
- Hull repair: 10 credits/HP (placeholder)
- Drone repair: 50-500 credits (rarity-based)
- MIA salvage: 500 credits (placeholder)
- Card replication: 50-1000 credits (rarity-based)
- Blueprint crafting: 100-1500 credits (rarity-based)

### 6. Ship Cards System
**Purpose:** Define baseline combat stats and deck composition limits
**Properties:**
- baseHull, baseShields, baseThresholds
- deckLimits (ordnance, tactic, support, upgrade)

**Instance Tracking:** Like drones, ships are tracked in inventory
- Starter pool ship (SHIP_001) is unlimited
- Crafted ships limited to one deck slot at a time
- Ships lost on MIA scrap (removed from inventory)

---

## Development Guidelines

### Code Style
- Follow existing patterns in GameStateManager (event-driven, singleton)
- Use JSDoc comments for public methods
- Extract magic numbers to constants
- Prefer functional over imperative where possible

### Testing Strategy
- Unit test critical algorithms (map generation, pathfinding)
- Integration test full gameplay loops
- Manual testing for UI/UX flows
- Save/load testing with corruption scenarios

### Performance Considerations
- Map generation must complete in <1 second
- Hex grid rendering should support up to 200 hexes (Tier 3)
- Save files should be <500KB
- No blocking operations on main thread

### Compatibility
- Multiplayer must remain fully functional
- Existing saves/decks should not break
- Graceful degradation if save file version mismatches

---

## Risk Assessment

### High Risk
1. **Map generation complexity** - A* validation might reject too many maps
   - Mitigation: Tuned generation parameters, fallback to simpler layouts
2. **Combat phase skipping** - May break existing combat initialization
   - Mitigation: Isolated SinglePlayerCombatInitializer, thorough testing

### Medium Risk
3. **Save file corruption** - User may lose progress
   - Mitigation: Schema validation, error handling, backup prompts
4. **Instability balance** - Too punishing or too easy
   - Mitigation: Placeholder values, extensive playtesting, tuning in Phase 13

### Low Risk
5. **UI responsiveness** - Hex grid rendering performance
   - Mitigation: SVG optimization, lazy rendering, zoom levels
6. **Economy exploits** - Player may find infinite money loops
   - Mitigation: Balance testing, cost/reward analysis

---

## Success Criteria

### MVP Complete When:
- [ ] Player can create/save/load single-player profile
- [ ] Player can build 40-card deck in hangar
- [ ] Player can deploy to Tier 1 map
- [ ] Hex grid generates and validates correctly
- [ ] Player can navigate map with instability tracking
- [ ] PoI encounters trigger (combat or loot)
- [ ] Combat works with AI opponent
- [ ] Loot is generated and awarded
- [ ] Extraction returns to hangar with loot
- [ ] Drone damage triggers if hull < 50%
- [ ] MIA protocol triggers on loss/crash
- [ ] MIA recovery works (salvage or scrap)
- [ ] Repairs deduct credits correctly
- [ ] Replicator duplicates cards correctly
- [ ] Multiplayer still works with 40-card decks
- [ ] No game-breaking bugs in full loop

### Quality Bars:
- No crashes during normal gameplay
- Save/load works 100% of the time
- UI is readable and navigable
- Combat feels fair (not random deaths)
- Economy feels balanced (progress without grinding)

---

## Post-MVP Roadmap

### Phase 14: Tier 2 & 3 Maps
- Implement higher difficulty tiers
- Security Bypass Token system
- Increased PoI counts and spacing

### Phase 15: Hunter AI
- Roaming enemy patrols on map
- Interception mechanics
- Dynamic threat escalation

### Phase 16: Narrative System
- Terminal logs at PoIs
- Flavour text for all encounters
- Lore discovery progression

### Phase 17: Advanced Economy
- Tune all placeholder values based on data
- Additional currency types
- Ship slot purchases
- Hidden cache maps

### Phase 18: Progression Systems
- Blueprint crafting
- Card enhancement system
- Achievements/milestones
- Leaderboards (optional)

---

## Quick Reference

### Development Order
1. Start with Phase 1 (Foundation) - blocks everything
2. Develop Phases 2-3 (Persistence + Hangar) in parallel with Phase 4
3. Critical path: 4 → 5 → 6 → 7 → 8 → 9
4. Phase 11 (Economy) can develop anytime after Phase 3
5. Phase 10 (MIA) requires Phases 2 and 9
6. Phase 12 (Routing) integrates everything
7. Phase 13 (Testing) validates entire system

### Key Files to Understand First
- `src/managers/GameStateManager.js` - State management pattern
- `src/logic/state/StateInitializer.js` - Current deck/drone initialization
- `src/components/screens/DeckBuilder.jsx` - Deck validation logic
- `src/AppRouter.jsx` - Screen routing system
- `src/managers/AIPhaseProcessor.js` - AI decision-making

### Common Patterns
**State Update:**
```javascript
gameStateManager.setState({ property: newValue });
```

**Mode Detection:**
```javascript
if (gameState.gameMode === 'singlePlayer') {
  // SP-specific logic
}
```

**Credit Transaction:**
```javascript
const result = creditManager.deduct(playerProfile, cost, 'Hull Repair');
if (!result.success) {
  // Handle insufficient funds
}
```

**Threat Update:**
```javascript
DetectionManager.addDetection(15, 'Movement');
```

---

## Contact & Support

**Documentation:**
- PRD: `EXPLORING_THE_EREMOS_PRD.md`
- Acceptance Criteria: `EXPLORING_THE_EREMOS_ACCEPTANCE_CRITERIA.md`
- Phase Details: `PHASE_01_*.md` through `PHASE_13_*.md`

**For Questions:**
- Architecture decisions: Review IMPLEMENTATION_OVERVIEW.md
- Feature specifications: Review EXPLORING_THE_EREMOS_PRD.md
- Phase details: Review specific PHASE_*.md file

---

**Document Version:** 1.3
**Last Updated:** 2025-11-29
**Status:** Complete (Phases 1-14 implemented, Phase 13 ongoing)
