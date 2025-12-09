# Phase 13: Testing & Polish

## Overview

Final phase for comprehensive testing, balance tuning, bug fixes, and polish.

**Duration:** 2-3 days | **Dependencies:** All phases

---

## Test Scenarios

### Scenario 1: New Game Flow
**Goal:** Verify complete new player experience

**Steps:**
1. Start app, click "Explore The Eremos"
2. Verify new profile created (1000 credits, 0 tokens)
3. Verify hangar loads with 6 ship slots
4. Verify slot 0 has starter deck (40 cards, 5 drones)
5. Verify slots 1-5 are empty
6. Click save/load → Download save file
7. Refresh page → Upload save file
8. Verify profile restored correctly

**Expected Results:**
- ✓ Profile creates successfully
- ✓ Hangar renders without errors
- ✓ Save/load cycle preserves all data
- ✓ No console errors

---

### Scenario 2: Complete Run (Success)
**Goal:** Test full gameplay loop from deployment to extraction

**Steps:**
1. Select Tier 1 map
2. Deploy ship (verify cost deducted if applicable)
3. Map generates with gates, PoIs
4. Move to PoI (instability increases)
5. Encounter: Loot outcome
6. Collect loot (instability +10%)
7. Move to another PoI
8. Encounter: Combat outcome
9. Win combat (instability +20%)
10. Collect salvage (3 cards)
11. Navigate to gate
12. Extract (pass blockade check)
13. Verify hull ≥ 50% (no drone damage)
14. Return to hangar
15. Verify loot in inventory
16. Verify credits increased
17. Save game

**Expected Results:**
- ✓ Map generates successfully
- ✓ Movement works
- ✓ Instability increases correctly
- ✓ Encounters trigger
- ✓ Loot awarded
- ✓ Combat works
- ✓ Extraction succeeds
- ✓ Inventory updated
- ✓ No crashes

---

### Scenario 3: Combat Loss (MIA)
**Goal:** Test MIA system via combat defeat

**Steps:**
1. Deploy ship
2. Find PoI with combat
3. Intentionally lose combat (surrender or depleted ship)
4. Verify MIA triggered
5. Return to hangar
6. Verify ship slot marked MIA
7. Verify loot NOT added to inventory
8. Click MIA slot → Recovery modal opens
9. Pay salvage fee
10. Verify ship restored
11. Verify hull at max
12. Verify drones repaired

**Expected Results:**
- ✓ MIA triggers on combat loss
- ✓ Loot wiped
- ✓ Ship slot marked MIA
- ✓ Recovery works
- ✓ Salvage cost deducted

---

### Scenario 4: Instability 100% (Auto MIA)
**Goal:** Test instability cap MIA trigger

**Steps:**
1. Deploy ship
2. Move excessively to build instability
3. Loot PoIs to increase instability
4. Continue until instability reaches 100%
5. Verify auto-MIA triggered
6. Verify returned to hangar
7. Verify ship marked MIA

**Expected Results:**
- ✓ Instability caps at 100%
- ✓ MIA auto-triggers
- ✓ Returns to hangar
- ✓ Ship marked MIA

---

### Scenario 5: Drone Damage Protocol
**Goal:** Test hull damage → drone damage

**Steps:**
1. Deploy ship
2. Take damage in combat (reduce hull to <50%)
3. Win combat
4. Extract successfully
5. Verify random drone marked damaged
6. Return to hangar
7. Click Repair Bay
8. Verify damaged drone shown
9. Pay repair cost
10. Verify drone repaired
11. Deploy again
12. Verify all 5 drones available

**Expected Results:**
- ✓ Drone damaged if hull < 50%
- ✓ Damaged drone flagged
- ✓ Repair bay shows damaged status
- ✓ Repair clears flag
- ✓ Repaired drone deployable

---

### Scenario 6: Replicator
**Goal:** Test card duplication

**Steps:**
1. Ensure inventory has at least 1 card
2. Open replicator modal
3. Select card
4. Verify cost displayed (based on rarity)
5. Click "Replicate"
6. Verify credits deducted
7. Verify inventory count increased
8. Try replicating with insufficient credits
9. Verify blocked

**Expected Results:**
- ✓ Replicator shows owned cards
- ✓ Cost calculated correctly
- ✓ Credits deducted
- ✓ Inventory increases
- ✓ Insufficient credits blocks action

---

### Scenario 7: MIA Save/Load Detection
**Goal:** Test unexpected exit MIA protocol

**Steps:**
1. Deploy ship
2. Move to PoI
3. Save game (while in-run)
4. Close app without extracting
5. Reload app
6. Load save file
7. Verify MIA protocol triggered
8. Verify ship marked MIA
9. Verify loot NOT in inventory

**Expected Results:**
- ✓ Save file has currentRunState
- ✓ Load detects active run
- ✓ MIA protocol triggers
- ✓ Ship marked MIA
- ✓ Loot wiped

---

### Scenario 8: Deck Editor (40 Cards)
**Goal:** Verify deck validation updated

**Steps:**
1. Open deck builder (existing standalone)
2. Try creating 30-card deck
3. Verify rejected
4. Create 40-card deck
5. Verify accepted
6. Test in multiplayer mode
7. Verify both SP and MP use 40 cards

**Expected Results:**
- ✓ 30-card deck rejected
- ✓ 40-card deck accepted
- ✓ Multiplayer still works
- ✓ No regressions

---

### Scenario 9: Ship Slots
**Goal:** Test ship slot management

**Steps:**
1. Verify slot 0 is immutable
2. Try editing slot 0 → Should be blocked
3. Create deck in slot 1
4. Verify deck saved
5. Mark slot 1 as MIA (via combat loss)
6. Try scrapping slot 1
7. Verify deck deleted, cards removed
8. Verify slot freed
9. Try scrapping slot 0 (MIA)
10. Verify blocked

**Expected Results:**
- ✓ Slot 0 immutable
- ✓ Other slots editable
- ✓ Scrap works on non-starter decks
- ✓ Scrap blocked on starter deck
- ✓ Cards removed from inventory

---

### Scenario 10: Map Generation
**Goal:** Stress test map generation

**Steps:**
1. Generate 100 Tier 1 maps
2. Verify all pass validation
3. Verify generation completes in <1s each
4. Check PoI distribution (70% core)
5. Check gate spacing (equidistant)
6. Verify no PoIs within 3 hexes of gates
7. Run A* on all PoI-gate pairs
8. Verify all paths < 70% instability

**Expected Results:**
- ✓ 100% success rate
- ✓ Fast generation
- ✓ Correct distribution
- ✓ Valid paths

---

## Balance Tuning

### Instability Costs (Tier 1)

**Current Placeholders:**
- Movement: +1.5% per hex
- Looting: +10%
- Combat: +20%
- Time: +5% per turn (optional)

**Tuning Goals:**
- Average run should reach 40-60% instability
- Player can loot 4-6 PoIs safely
- 2-3 combats should be manageable
- Extraction at 80%+ should feel risky

**Adjustments:**
```
If runs too easy (avg instability <40%):
  - Increase movement cost to 2%
  - Increase looting to 12%

If runs too hard (avg instability >80%):
  - Decrease movement cost to 1%
  - Decrease looting to 8%
```

---

### Economy Values

**Current Placeholders:**
- Starting credits: 1000
- Hull repair: 10 credits/HP
- Drone repair: 50-500 credits
- Replicator: 50-1000 credits
- MIA salvage: 500 credits

**Tuning Goals:**
- Player should profit ~200-400 credits per successful run
- Failed run should cost ~500 credits (salvage)
- Hull repair should cost ~10-20% of run profit
- Drone repair should be meaningful but not crippling

**Adjustments:**
```
If economy too generous:
  - Reduce pack credits to 5-50
  - Increase repair costs

If economy too punishing:
  - Increase pack credits to 20-150
  - Decrease MIA salvage to 300
```

---

### AI Difficulty

**Threat Levels:**
- Low (0-49%): Scout/Patrol (easy)
- Medium (50-79%): Cruiser/Hunter (medium)
- High (80-100%): Blockade (hard)

**Tuning:**
- Low threat should be ~70% win rate
- Medium threat should be ~50% win rate
- High threat should be ~30% win rate

---

## UI Polish Checklist

### Visual Feedback
- [ ] Instability meter color transitions smoothly
- [ ] Hull bars update visually
- [ ] Card animations on loot acquisition
- [ ] Loading states for map generation
- [ ] Hover states on all clickable elements

### Transitions
- [ ] Smooth fade between screens
- [ ] Modal open/close animations
- [ ] Hex grid zoom/pan (optional)

### Error Handling
- [ ] Insufficient credits shows clear message
- [ ] Invalid deck shows specific error
- [ ] Save file corruption handled gracefully
- [ ] Map generation failure shows retry option

### Accessibility
- [ ] All buttons keyboard accessible
- [ ] Tab order logical
- [ ] Color contrast sufficient
- [ ] Text readable at all sizes

---

## Bug Fix Priorities

### Critical (Blocks Gameplay)
1. Crashes during combat
2. Save file corruption
3. Infinite loops in map generation
4. Instability not increasing
5. Loot not transferring

### High (Degrades Experience)
6. Combat AI not making moves
7. Extraction always failing
8. MIA not triggering
9. Credits not deducting
10. Deck validation incorrect

### Medium (Inconvenient)
11. UI alignment issues
12. Missing tooltips
13. Performance lag on large maps
14. Animation glitches

### Low (Polish)
15. Typos in flavour text
16. Icon misalignment
17. Color inconsistencies

---

## Performance Benchmarks

| Operation | Target | Acceptable | Unacceptable |
|-----------|--------|------------|--------------|
| Map Generation | <500ms | <1s | >2s |
| Save File Download | <100ms | <500ms | >1s |
| Save File Load | <200ms | <1s | >2s |
| Hex Grid Render | 60fps | 30fps | <20fps |
| Combat Initialization | <500ms | <1s | >2s |

---

## Final Validation

### Must Pass Before Release:
- [ ] All 10 test scenarios pass
- [ ] No critical bugs
- [ ] No high-priority bugs
- [ ] Multiplayer regression test passes
- [ ] Save/load works 100% of time
- [ ] Performance benchmarks met
- [ ] UI polish complete
- [ ] Balance feels fair

### Nice to Have:
- [ ] All medium bugs fixed
- [ ] All low bugs fixed
- [ ] Flavour text reviewed
- [ ] Visual polish complete

---

## Code Cleanup

### Before Release:
1. Remove all `console.log` debugging statements
2. Add JSDoc comments to public methods
3. Extract magic numbers to constants
4. Consistent naming conventions
5. Remove commented-out code
6. Update inline TODOs
7. Format with Prettier

---

**Phase Status:** Ready for Implementation
**Estimated Completion:** Day 20 of development
