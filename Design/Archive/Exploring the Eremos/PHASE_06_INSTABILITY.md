# Phase 6: Threat & Encounter System

## Overview

Implements the core threat tracking and encounter mechanics. **Key design change:** Threat level affects encounter SEVERITY (which AI you fight), not encounter CHANCE (which is fixed per hex type).

**Duration:** 2 days | **Dependencies:** Phase 5 | **Status:** 🔄 In Progress

---

## Files Created

1. `src/logic/detection/DetectionManager.js` ✅ (renamed from InstabilityManager)
2. `src/logic/encounters/EncounterController.js` ✅
3. `src/components/modals/POIEncounterModal.jsx` ✅

### Additional Files (not in original plan)
4. `src/components/ui/InstabilityMeter.css` ✅ - Meter styling (UI shows "Threat Level")

---

## Key Implementations

### DetectionManager.js (UI: "Threat Level")

```javascript
class DetectionManager {
  addDetection(amount, reason) {
    const current = gameStateManager.state.currentRunState?.detection || 0;
    const newValue = Math.min(100, current + amount);

    gameStateManager.setState({
      currentRunState: {
        ...gameStateManager.state.currentRunState,
        detection: newValue
      }
    });

    console.log(`[Detection] +${amount}% (${reason}): ${newValue}%`);

    if (newValue >= 100) {
      this.triggerMIA();
    }
  }

  // Zone-based threat cost calculation
  getThreatCostForHex(hex, mapRadius) {
    const distance = Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(-hex.q - hex.r));
    const perimeter = mapRadius;
    const mid = Math.floor(mapRadius * 0.6);

    if (distance <= mid) return 2.5;        // Core zone
    if (distance <= perimeter - 1) return 1.5;  // Mid zone
    return 0.5;                              // Perimeter zone
  }
}

export default new DetectionManager();
```

### EncounterController.js (UPDATED)

**Key change:** Encounter chance is FIXED per hex type. Threat level only affects AI severity.

```javascript
class EncounterController {
  // Get fixed encounter chance based on hex type (NOT threat-based)
  getEncounterChance(hex, tierConfig) {
    if (hex.type === 'poi') return hex.poiData?.encounterChance || 15;
    if (hex.type === 'gate') return tierConfig?.encounterChance?.gate || 0;
    return tierConfig?.encounterChance?.empty || 5;
  }

  // Check for encounter during movement
  checkMovementEncounter(hex, tierConfig) {
    const detection = DetectionManager.getCurrentDetection();
    const encounterChance = this.getEncounterChance(hex, tierConfig);
    const roll = Math.random() * 100;

    if (roll < encounterChance) {
      // Encounter triggered - threat determines AI severity
      const aiId = this.getAIForThreat(tierConfig, detection);
      return { outcome: 'combat', aiId, detection };
    }
    return null;
  }

  // Threat determines AI severity (low/medium/high)
  getAIForThreat(tierConfig, detection) {
    let level = 'low';
    if (detection >= 80) level = 'high';
    else if (detection >= 50) level = 'medium';

    const table = tierConfig.threatTables?.[level] || ['AI_SCOUT_1'];
    return table[Math.floor(Math.random() * table.length)];
  }

  // Complete encounter - adds threat for looting (NOT for combat)
  completeEncounter(encounter) {
    const { poi, outcome } = encounter;

    // Add looting threat (POI-specific)
    const threatIncrease = poi?.poiData?.threatIncrease || 10;
    if (poi?.type === 'poi') {
      DetectionManager.addDetection(threatIncrease, `Looting ${poi.poiData?.name}`);
    }

    // Combat does NOT increase threat (removed +20%)
    if (outcome === 'combat') {
      // Combat happens but no additional threat penalty
    }
  }
}

export default new EncounterController();
```

### POIEncounterModal.jsx

```jsx
function POIEncounterModal({ poi, outcome, onProceed }) {
  return (
    <Modal>
      <h2>{poi.poiData.name}</h2>
      <p>{poi.poiData.flavourText}</p>

      {outcome === 'combat' && (
        <>
          <p className="text-red-400">Hostile signatures detected</p>
          <button onClick={onProceed}>Engage</button>
        </>
      )}

      {outcome === 'loot' && (
        <>
          <p className="text-green-400">Area secured</p>
          <button onClick={onProceed}>Salvage</button>
        </>
      )}
    </Modal>
  );
}
```

---

## Triggers (UPDATED)

| Event | Threat Increase | Encounter Chance | Notes |
|-------|-----------------|------------------|-------|
| Movement | Zone-based (0.5-2.5%) | 5% per empty hex | Core +2.5%, Mid +1.5%, Perimeter +0.5% |
| Looting PoI | POI-specific (5-25%) | POI-specific (5-20%) | Defined in `pointsOfInterestData.js` |
| Combat End | **None (REMOVED)** | N/A | Fighting does not attract more attention |
| Gate Entry | None | 0% | Safe zones |

### Zone-Based Threat Costs
Movement threat is calculated per-hex based on distance from map center:
- **Core Zone** (inner 60% of radius): +2.5% per hex
- **Mid Zone** (60-90% of radius): +1.5% per hex
- **Perimeter Zone** (outer 10%): +0.5% per hex

---

## Encounter System (REDESIGNED)

### Key Design Principle
**Threat affects SEVERITY, not CHANCE.**
- Encounter chance is FIXED per hex type (determined by map/POI data)
- Threat level determines which AI you fight IF an encounter triggers

### Encounter Chance by Hex Type
| Hex Type | Encounter Chance | Source |
|----------|------------------|--------|
| Empty | 5% | `mapData.js` tierConfig |
| Gate | 0% | Safe zones |
| POI | 5-20% | `pointsOfInterestData.js` per-POI |

### Threat → AI Severity

- **0-49% (Low)**: Scout/Patrol AI (easy)
- **50-79% (Medium)**: Cruiser/Hunter AI (medium)
- **80-99% (High)**: Blockade AI (hard)
- **100%**: MIA (mission failure)

---

## Validation Checklist

### Core Threat System
- [x] Threat increases on movement (zone-based)
- [x] Threat increases on looting (POI-specific)
- [x] Threat does NOT increase after combat (removed)
- [x] Threat meter updates visually
- [ ] 100% threat triggers MIA
- [x] Color-coded meter (green/yellow/red)
- [x] Threat cost preview in Hex Info panel
- [x] Cumulative threat shown in Waypoint List

### Encounter System
- [x] Fixed encounter chance per hex type
- [x] EncounterController.js created and working
- [x] POIEncounterModal.jsx created and working
- [x] Threat level determines enemy AI severity
- [x] Movement encounter checks implemented
- [x] POI encounter checks implemented

### Encounter Risk Display
- [x] Segment encounter risk calculated
- [x] Cumulative encounter risk (probability math)
- [x] Encounter risk shown in Hex Info panel
- [x] Encounter risk shown in Waypoint List (⚔ icon)
- [x] Next hex encounter risk shown during movement

---

**Phase Status:** 🔄 In Progress (mostly complete)
**Last Updated:** 2025-11-26
