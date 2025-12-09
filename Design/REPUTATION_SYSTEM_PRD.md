# Reputation System - Product Requirements Document

## Overview

The Reputation system rewards players for risking their custom loadouts over the safe Starter Deck. Players earn reputation based on the total "value" of their loadout when embarking on runs, with bonuses for successful extraction.

**Goal:** Encourage players to use custom decks with high-value cards, ships, drones, and components instead of always playing it safe with the Starter Deck.

---

## Core Design Decisions

| Aspect | Decision |
|--------|----------|
| **Starter Deck (Slot 0)** | Zero reputation - no risk, no reward |
| **MIA/Failure Ratio** | 25% of calculated rep (configurable) |
| **Loadout Value** | SUM of blueprint costs: cards + ship + drones + ship sections |
| **Scaling** | Linear with flat tier caps (prevents grinding easy maps) |
| **Tier Caps** | Configurable per tier (starting: T1=5000, T2=15000, T3=50000) |
| **Multi-Level-Up** | Supported - gain 20000 rep = pass multiple thresholds |
| **UI Location** | Progress bar + level, right of Max Tier in hangar |
| **Rewards** | Card packs (configurable per level) |
| **Claim Flow** | Badge/notification on track, click to claim when ready |

---

## Feature Specification

### 1. Loadout Value Calculation

The full loadout value includes ALL risked components: cards, ship, drones, and ship sections.

**Formula:**
```
loadoutValue = cardValue + shipValue + droneValue + componentValue

cardValue      = SUM(blueprintCost(card.rarity) * quantity) for all cards
shipValue      = blueprintCost(ship.rarity)
droneValue     = SUM(blueprintCost(drone.rarity)) for all drones in loadout
componentValue = SUM(blueprintCost(component.rarity)) for all 3 ship sections
```

**Blueprint Costs by Rarity:**
| Rarity | Cost |
|--------|------|
| Common | 100 |
| Uncommon | 250 |
| Rare | 600 |
| Mythic | 1500 |

**Data Sources:**
| Component | Ship Slot Field | Data File |
|-----------|----------------|-----------|
| Cards | `decklist[]` | `cardData.js` |
| Ship | `shipId` | `shipData.js` |
| Drones | `drones[]` | `droneData.js` |
| Ship Sections | `shipComponents{}` | `shipSectionData.js` |

**Rules:**
- Only loadouts from custom slots (1-5) count
- Slot 0 (Starter Deck) always returns loadoutValue = 0
- Enhanced card variants use same rarity cost as base card
- All 3 ship sections (Bridge, Power Cell, Drone Control) contribute to value

---

### 2. Reputation Gain Calculation

**Formula:**
```
tierCap = TIER_CAPS[mapTier]
cappedRep = MIN(loadoutValue, tierCap)
finalRep = cappedRep * (success ? 1.0 : MIA_MULTIPLIER)
```

Loadout value IS reputation directly (no rate multiplier). Tier caps prevent grinding easy maps.

**Configurable Values (`reputationData.js`):**
```javascript
REPUTATION: {
  MIA_MULTIPLIER: 0.25,          // 25% on failure
  TIER_CAPS: {
    1: 5000,                     // Tier 1 max 5000 rep
    2: 15000,                    // Tier 2 max 15000 rep
    3: 50000,                    // Tier 3 max 50000 rep
  }
}
```

*All values are starting points for tuning.*

---

### 3. Level Progression

**Multi-Level-Up Support:**
Players can gain multiple levels in a single run. If a player at 0 rep gains 20000, they pass through multiple thresholds and unlock all corresponding rewards.

**Level Thresholds (`reputationRewardsData.js`):**
```javascript
REPUTATION_LEVELS: [
  { level: 0,  threshold: 0,      reward: null },  // Starting level
  { level: 1,  threshold: 5000,   reward: { type: 'pack', packType: 'ORDNANCE_PACK', tier: 1 } },
  { level: 2,  threshold: 12000,  reward: { type: 'pack', packType: 'SUPPORT_PACK', tier: 1 } },
  { level: 3,  threshold: 22000,  reward: { type: 'pack', packType: 'TACTICAL_PACK', tier: 2 } },
  { level: 4,  threshold: 35000,  reward: { type: 'pack', packType: 'ORDNANCE_PACK', tier: 2 } },
  { level: 5,  threshold: 52000,  reward: { type: 'pack', packType: 'UPGRADE_PACK', tier: 2 } },
  { level: 6,  threshold: 75000,  reward: { type: 'pack', packType: 'ORDNANCE_PACK', tier: 3 } },
  { level: 7,  threshold: 100000, reward: { type: 'pack', packType: 'SUPPORT_PACK', tier: 3 } },
  { level: 8,  threshold: 130000, reward: { type: 'pack', packType: 'TACTICAL_PACK', tier: 3 } },
  { level: 9,  threshold: 165000, reward: { type: 'pack', packType: 'UPGRADE_PACK', tier: 3 } },
  // ... continues through level 14
]
```

*Note: Levels start at 0 (not 1). Players begin at Level 0 and work towards Level 1. Thresholds are starting points for tuning.*

---

### 4. Player Profile State

**New fields in `singlePlayerProfile`:**
```javascript
reputation: {
  current: 0,           // Current reputation points
  level: 0,             // Current level (starts at 0)
  unclaimedRewards: [], // Array of level numbers with unclaimed rewards
}
```

---

### 5. UI Components

**Hangar Header - Reputation Track:**
- Location: Right of "MAX TIER" stat panel
- Display: "REPUTATION" label + progress bar + level badge
- Progress bar shows: current XP / next level threshold
- Notification badge when rewards unclaimed
- Uses `dw-stat-box--reputation` styling (purple theme #a855f7)
- Minimum width: 180px for better progress visibility
- Always clickable to open progress modal

**Ship Slot - Loadout Value Display:**
- Location: Ship selection panel in hangar
- Shows "Loadout Value: X,XXX" for active custom slots (1-5)
- Starter Deck (Slot 0) shows "Loadout Value: None (Starter)"
- Purple color (#a855f7) to match reputation theme

**Reputation Progress Modal:**
- Triggered by clicking reputation track (always clickable)
- Shows upcoming levels only (completed/current levels hidden)
- First visible level marked as "TARGET" (what player is working towards)
- Uses CardPackBadge component for reward display with color-coded borders
- Claim button appears when rewards available
- Scrollable list with `dw-modal-scroll` styling

**Reward Claim Modal:**
- Triggered by clicking "Claim" button in progress modal
- Shows accumulated unclaimed rewards
- "Claim All" opens LootRevealModal for each pack
- Updates state after claiming

---

### 6. Run Completion Integration

**On extraction/MIA:**
1. Calculate loadout value from ship slot (cards + ship + drones + components)
2. Apply reputation formula with tier cap
3. Apply success/failure multiplier
4. Add to `singlePlayerProfile.reputation.current`
5. Check for level-ups, add to `unclaimedRewards`
6. Display rep gained in ExtractionSummaryModal

---

## Example Scenarios

### Scenario 1: Mid-tier custom loadout, Tier 2, Success
| Component | Breakdown | Value |
|-----------|-----------|-------|
| Cards | 30 Common + 8 Uncommon + 2 Rare | 6,200 |
| Ship | 1 Uncommon | 250 |
| Drones | 4 Common + 2 Uncommon | 900 |
| Components | 3 Common | 300 |
| **Total Loadout** | | **7,650** |

- Tier 2 cap: 15000 (not exceeded)
- **Final: +7,650 reputation**

---

### Scenario 2: High-value loadout, Tier 1, Success
| Component | Breakdown | Value |
|-----------|-----------|-------|
| Cards | 20 Common + 10 Uncommon + 5 Rare + 5 Mythic | 15,000 |
| Ship | 1 Rare | 600 |
| Drones | 2 Rare + 2 Uncommon | 1,700 |
| Components | 1 Uncommon + 2 Common | 450 |
| **Total Loadout** | | **17,750** |

- Tier 1 cap: 5000 (CAPPED)
- **Final: +5,000 reputation** (encourages playing higher tiers)

---

### Scenario 3: Custom loadout, Tier 3, MIA
- Loadout value: 12,000
- Tier 3 cap: 50,000 (not exceeded)
- MIA multiplier: 0.25
- **Final: +3,000 reputation** (still rewarded for risk)

---

### Scenario 4: Starter Deck, any outcome
- Loadout value: 0 (Slot 0)
- **Final: +0 reputation**

---

### Scenario 5: Multi-Level-Up
- Player at 0 rep (Level 0), gains 20,000 in one run
- Passes thresholds: 5000 (lvl 1), 12000 (lvl 2)
- **Final: Level 2 with 2 unclaimed rewards** (packs from levels 1 and 2)

---

## Implementation Summary

### New Files
| File | Purpose |
|------|---------|
| `src/data/reputationData.js` | Configurable constants (MIA multiplier, tier caps) |
| `src/data/reputationRewardsData.js` | Level thresholds and rewards (levels 0-14) |
| `src/logic/reputation/ReputationCalculator.js` | Value calculation logic |
| `src/logic/reputation/ReputationService.js` | Award and claim logic |
| `src/components/ui/ReputationTrack.jsx` | Progress bar UI (dw-stat-box styling) |
| `src/components/modals/ReputationRewardModal.jsx` | Reward claim modal |
| `src/components/modals/ReputationProgressModal.jsx` | Shows all upcoming levels and rewards |
| `src/components/ui/CardPackBadge.jsx` | Reusable card pack display component |

### Modified Files
| File | Changes |
|------|---------|
| `src/data/saveGameSchema.js` | Add reputation fields (default level 0) |
| `src/managers/GameStateManager.js` | Call reputation service in endRun |
| `src/components/screens/HangarScreen.jsx` | Add ReputationTrack, loadout value display, modal integration |
| `src/components/modals/ExtractionSummaryModal.jsx` | Show rep gained |
| `src/styles/modal-base.css` | Purple dw-stat-box variant, CardPackBadge styles |

---

## Future Considerations
- Seasonal reputation resets
- Prestige system (reset for permanent bonuses)
- Exclusive reputation-only rewards (unique cards, cosmetics)
- Leaderboards
