# Phase 7: Combat Integration

## Overview

Integrates single-player combat by skipping pre-game phases and using pre-configured decks.

**Duration:** 2 days | **Dependencies:** Phase 6

---

## Files to Create

1. `src/logic/singlePlayer/SinglePlayerCombatInitializer.js`
2. `src/logic/singlePlayer/CombatOutcomeProcessor.js`

---

## Key Implementations

### SinglePlayerCombatInitializer.js

```javascript
class SinglePlayerCombatInitializer {
  async initiate(aiId) {
    const runState = gameStateManager.state.currentRunState;
    const shipSlot = gameStateManager.state.singlePlayerShipSlots.find(
      s => s.id === runState.shipSlotId
    );
    const aiData = fullAICollection.find(ai => ai.id === aiId);

    // Build player state
    const player1State = {
      name: 'Player',
      deck: this.convertDecklistToArray(shipSlot.decklist),
      drones: shipSlot.drones.map(d => d.name),
      shipComponents: shipSlot.shipComponents,
      energy: 10,
      hull: runState.currentHull,
    };

    // Build AI state
    const player2State = {
      name: aiData.name,
      deck: this.convertDecklistToArray(aiData.deck),
      drones: aiData.drones,
      shipComponents: aiData.shipComponents,
      energy: 10,
      hull: 30,  // From ship blueprint
    };

    // Start game with 'singlePlayer' mode
    gameStateManager.startGame('singlePlayer', player1State, player2State);

    // Skip to action phase (bypass drone/deck selection)
    gameStateManager.setState({
      turnPhase: 'action',
      appState: 'inGame',
    });
  }

  convertDecklistToArray(decklist) {
    // Convert { CARD001: 2, CARD002: 4 } to ['CARD001', 'CARD001', 'CARD002', ...]
    const array = [];
    for (const [cardId, qty] of Object.entries(decklist)) {
      for (let i = 0; i < qty; i++) {
        array.push(cardId);
      }
    }
    return array;
  }
}

export default new SinglePlayerCombatInitializer();
```

### CombatOutcomeProcessor.js

```javascript
class CombatOutcomeProcessor {
  processCombatEnd(gameState) {
    const winner = gameState.winner;  // 'player1' or 'player2'

    if (winner === 'player1') {
      // Player wins
      const loot = this.generateSalvageLoot(gameState.player2.deck);

      gameState.currentRunState.collectedLoot.push(...loot);
      gameState.currentRunState.currentHull = gameState.player1.hull;

      // NOTE: Combat does NOT increase threat (per design decision)
      // Threat only increases from movement and looting POIs

      // Return to tactical map
      gameStateManager.setState({
        appState: 'tacticalMap',
        gameActive: false,
      });

      console.log('Combat won, salvage collected');
    } else {
      // Player loses - MIA
      console.log('Combat lost - MIA triggered');
      gameStateManager.endRun(false);
      gameStateManager.setState({ appState: 'hangar' });
    }
  }

  generateSalvageLoot(enemyDeck) {
    // Select 3 random cards
    const cards = [];
    for (let i = 0; i < 3; i++) {
      const randomCard = enemyDeck[Math.floor(Math.random() * enemyDeck.length)];
      cards.push({ type: 'card', cardId: randomCard });
    }

    // 1% chance for blueprint
    const blueprintDrop = Math.random() < 0.01;
    if (blueprintDrop) {
      const randomBlueprint = ['BLUEPRINT_GUNSHIP', 'BLUEPRINT_SCOUT'][Math.floor(Math.random() * 2)];
      cards.push({ type: 'blueprint', blueprintId: randomBlueprint });
    }

    return cards;
  }
}

export default new CombatOutcomeProcessor();
```

---

## Files to Modify

### `src/managers/GameStateManager.js`

Add to `startGame()` method:

```javascript
startGame(gameMode, player1, player2) {
  // ... existing code ...

  if (gameMode === 'singlePlayer') {
    // Skip commitment phases
    this.setState({
      'commitments.droneSelection.player1': { completed: true, drones: player1.drones },
      'commitments.droneSelection.player2': { completed: true, drones: player2.drones },
      'commitments.deckSelection.player1': { completed: true, deck: player1.deck },
      'commitments.deckSelection.player2': { completed: true, deck: player2.deck },
    });
  }

  // ... rest of existing code ...
}
```

---

## Combat Flow

```
PoI Encounter (Combat) or Movement Intercept
  ↓
SinglePlayerCombatInitializer.initiate(aiId)
  ↓
GameStateManager.startGame('singlePlayer', player, ai)
  ↓
Skip drone/deck selection phases
  ↓
Combat Screen (existing App.jsx)
  ↓
Player wins or loses
  ↓
CombatOutcomeProcessor.processCombatEnd()
  ↓
Win: LootGenerator.generateCombatSalvage() → LootRevealModal → Return to tactical map
Loss: MIA → Hangar

NOTE: Combat does NOT increase threat level
```

---

## Validation Checklist

- [x] Combat initiates without drone selection
- [x] Combat initiates without deck selection
- [x] Player deck loaded from ship slot
- [x] AI deck loaded from aiData
- [x] Combat plays normally
- [x] Win: Returns to tactical map
- [x] Win: Salvage loot displayed in LootRevealModal
- [x] Win: Loot added to currentRunState.collectedLoot
- [x] Combat does NOT increase threat (design decision)
- [x] Loss: Triggers MIA
- [x] Loss: Returns to hangar

---

**Phase Status:** ✅ Implemented
