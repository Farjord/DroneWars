# Phase 9: Extraction & Run Completion

## Overview

Implements extraction flow, drone damage protocol, and loot transfer to inventory.

**Duration:** 1 day | **Dependencies:** Phase 8

---

## Files to Create

1. `src/logic/singlePlayer/ExtractionController.js`
2. `src/logic/singlePlayer/DroneDamageProcessor.js`
3. `src/components/modals/ExtractionSummaryModal.jsx`

---

## Key Implementations

### ExtractionController.js

```javascript
class ExtractionController {
  initiateExtraction(currentRunState, mapData) {
    const playerPos = currentRunState.playerPosition;
    const gates = mapData.gates;

    // Check if at gate
    const atGate = gates.some(g => g.q === playerPos.q && g.r === playerPos.r);
    if (!atGate) {
      return { error: 'Not at extraction point' };
    }

    // Blockade check
    const encounterType = encounterController.checkExtractionEncounter(
      currentRunState.instability
    );

    if (encounterType === 'blockade') {
      // Trigger combat vs blockade fleet
      const tierConfig = getMapTier(currentRunState.mapTier);
      const aiId = tierConfig.threatTables.high[0];  // Blockade AI
      return { action: 'combat', aiId };
    } else {
      // Safe extraction
      return { action: 'extract' };
    }
  }

  completeExtraction(currentRunState, shipSlot, playerProfile, inventory) {
    // 1. Process drone damage
    const dronesDamaged = droneDamageProcessor.process(shipSlot, currentRunState);

    // 2. Transfer loot to inventory
    currentRunState.collectedLoot.forEach(item => {
      if (item.type === 'card') {
        inventory[item.cardId] = (inventory[item.cardId] || 0) + 1;
      } else if (item.type === 'blueprint') {
        if (!playerProfile.unlockedBlueprints.includes(item.blueprintId)) {
          playerProfile.unlockedBlueprints.push(item.blueprintId);
        }
      }
    });

    // 3. Add credits
    playerProfile.credits += currentRunState.creditsEarned;

    // 4. Update ship hull
    shipSlot.currentHull = currentRunState.currentHull;

    // 5. Update stats
    playerProfile.stats.runsCompleted++;
    playerProfile.stats.totalCreditsEarned += currentRunState.creditsEarned;

    // 6. Clear run state
    gameStateManager.setState({ currentRunState: null });

    // 7. Return to hangar
    gameStateManager.setState({ appState: 'hangar' });

    return {
      success: true,
      dronesDamaged,
      creditsEarned: currentRunState.creditsEarned,
      cardsAcquired: currentRunState.collectedLoot.length,
    };
  }
}

export default new ExtractionController();
```

### DroneDamageProcessor.js

```javascript
class DroneDamageProcessor {
  process(shipSlot, currentRunState) {
    const hullPercent = (currentRunState.currentHull / shipSlot.maxHull) * 100;

    if (hullPercent >= 50) {
      return [];  // No damage
    }

    // Damage random drone
    const damagedDrones = [];
    const operationalDrones = shipSlot.drones.filter(d => !d.isDamaged);

    if (operationalDrones.length > 0) {
      const randomIndex = Math.floor(Math.random() * operationalDrones.length);
      const drone = operationalDrones[randomIndex];
      drone.isDamaged = true;
      damagedDrones.push(drone.name);

      console.log(`Drone damaged: ${drone.name}`);
    }

    return damagedDrones;
  }
}

export default new DroneDamageProcessor();
```

### ExtractionSummaryModal.jsx

```jsx
function ExtractionSummaryModal({ summary, onContinue }) {
  return (
    <Modal>
      <h2>Extraction Complete</h2>

      <div className="mission-summary">
        <div className="stat-row">
          <span>Cards Acquired:</span>
          <span>{summary.cardsAcquired}</span>
        </div>
        <div className="stat-row">
          <span>Credits Earned:</span>
          <span className="text-green-400">+{summary.creditsEarned}</span>
        </div>
        {summary.dronesDamaged.length > 0 && (
          <div className="stat-row">
            <span className="text-red-400">Drones Damaged:</span>
            <span>{summary.dronesDamaged.join(', ')}</span>
          </div>
        )}
      </div>

      {summary.dronesDamaged.length > 0 && (
        <p className="warning">
          ⚠ Damaged drones cannot deploy until repaired in the Repair Bay
        </p>
      )}

      <button onClick={onContinue}>Return to Hangar</button>
    </Modal>
  );
}

export default ExtractionSummaryModal;
```

---

## Extraction Flow

```
Player at Gate Hex
  ↓
Click "Extract" button
  ↓
ExtractionController.initiateExtraction()
  ↓
Roll blockade check: Random(0-100) vs Instability
  ↓
├─ Roll < Instability → Combat (Blockade AI)
│    ↓
│    Combat Victory → Proceed to extraction
│    Combat Loss → MIA
│
└─ Roll >= Instability → Safe Extraction
     ↓
     DroneDamageProcessor.process()
     ├─ Hull >= 50%: No damage
     └─ Hull < 50%: Random drone marked damaged
     ↓
     Transfer loot to inventory
     Add credits to profile
     Update ship hull
     ↓
     ExtractionSummaryModal displays results
     ↓
     Return to Hangar
```

---

## Drone Damage Protocol

**Trigger:** `currentHull < maxHull * 0.5` at extraction

**Process:**
1. Filter drones to find operational (not already damaged)
2. Select one random operational drone
3. Set `drone.isDamaged = true`
4. Drone cannot deploy until repaired

**Cost to Repair (from Phase 11):**
- Common: 50 credits
- Uncommon: 100 credits
- Rare: 200 credits
- Mythic: 500 credits

---

## Validation Checklist

- [ ] Extract button only appears at gates
- [ ] Blockade check rolls correctly
- [ ] Blockade combat triggers on fail
- [ ] Safe extraction proceeds immediately
- [ ] Drone damage triggers if hull < 50%
- [ ] Damaged drone flagged correctly
- [ ] Loot transferred to inventory
- [ ] Credits added to profile
- [ ] Ship hull updated in slot
- [ ] Run state cleared
- [ ] Extraction summary shows correct stats
- [ ] Returns to hangar after extraction

---

**Phase Status:** ✅ Implemented
