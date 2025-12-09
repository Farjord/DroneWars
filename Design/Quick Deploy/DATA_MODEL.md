# Quick Deploy - Data Model

## Save Game Schema

Quick deployments are stored at the **top level** of the save game, independent of any specific deck or ship slot. This design ensures:
- Deployments survive deck loss (MIA)
- Deployments can be reused across decks with matching drone rosters
- Simple validation at game start

### Schema Addition

```javascript
// In saveGameSchema.js - add to save game root
{
  // ... existing save game fields ...

  quickDeployments: [
    {
      id: string,           // UUID, e.g., 'qd_abc123'
      name: string,         // User-defined name, e.g., 'Aggressive Rush'
      createdAt: number,    // Timestamp of creation

      // The 5 drones this deployment is designed for
      droneRoster: [
        string,             // Drone name, e.g., 'Scout Drone'
        string,             // e.g., 'Standard Fighter'
        string,             // e.g., 'Heavy Fighter'
        string,             // e.g., 'Guardian Drone'
        string              // e.g., 'Repair Drone'
      ],

      // Lane placements (0-5 entries)
      placements: [
        {
          droneName: string,  // Must be from droneRoster
          lane: number        // 0=left, 1=middle, 2=right
        }
      ]
    }
  ]
}
```

### Example Quick Deployment

```javascript
{
  id: 'qd_a1b2c3d4',
  name: 'Aggressive Rush',
  createdAt: 1701234567890,
  droneRoster: [
    'Scout Drone',
    'Standard Fighter',
    'Heavy Fighter',
    'Guardian Drone',
    'Repair Drone'
  ],
  placements: [
    { droneName: 'Scout Drone', lane: 0 },
    { droneName: 'Standard Fighter', lane: 1 },
    { droneName: 'Heavy Fighter', lane: 1 }
  ]
}
```

---

## Drone Roster

### Available Drones for Quick Deploy
Players can select from:
1. **Starter Drones** - Always available (from `playerDeckData.js` starter deck)
2. **Blueprinted Drones** - Any drone with unlocked blueprint (from `playerProfile.unlockedBlueprints`)

This represents "what you could potentially field" rather than current inventory.

### Starter Drones (Reference)
```javascript
// From playerDeckData.js
[
  'Scout Drone',
  'Standard Fighter',
  'Heavy Fighter',
  'Guardian Drone',
  'Repair Drone'
]
```

### Getting Available Drones
```javascript
function getAvailableDronesForQuickDeploy(playerProfile) {
  const starterDrones = starterDeck.drones.map(d => d.name);
  const blueprintedDrones = playerProfile.unlockedBlueprints
    .filter(bp => isDroneBlueprint(bp));

  return [...new Set([...starterDrones, ...blueprintedDrones])];
}
```

---

## Validation Data Structures

### Validation Result
```javascript
{
  valid: boolean,
  reasons: [
    {
      type: 'roster_mismatch' | 'budget_exceeded' | 'cpu_exceeded' | 'limit_exceeded',
      message: string,
      details: object  // Type-specific details
    }
  ]
}
```

### Validation Examples

**Roster Mismatch:**
```javascript
{
  valid: false,
  reasons: [{
    type: 'roster_mismatch',
    message: 'Missing Heavy Fighter in deck',
    details: {
      missing: ['Heavy Fighter'],
      extra: ['Bomber']
    }
  }]
}
```

**Budget Exceeded:**
```javascript
{
  valid: false,
  reasons: [{
    type: 'budget_exceeded',
    message: 'Deployment cost (8) exceeds available budget (6)',
    details: {
      totalCost: 8,
      availableBudget: 6,
      initialDeploymentBudget: 4,
      startingEnergy: 2
    }
  }]
}
```

---

## Related Data Structures

### Deck Drone Roster (for comparison)
```javascript
// Ship slot structure (existing)
{
  drones: [
    { name: 'Scout Drone', isDamaged: false },
    { name: 'Standard Fighter', isDamaged: false },
    { name: 'Heavy Fighter', isDamaged: false },
    { name: 'Guardian Drone', isDamaged: false },
    { name: 'Repair Drone', isDamaged: false }
  ]
}
```

### Drone Data (for costs)
```javascript
// From droneData.js
{
  name: 'Scout Drone',
  class: 1,           // Deployment cost
  limit: 3,           // Max deployable (not relevant for quick deploy)
  maxPerLane: null,   // Optional lane restriction
  // ... other stats
}
```

### Ship Stats (for budget calculation)
```javascript
// From statsCalculator.js calculateEffectiveShipStats()
{
  totals: {
    initialDeployment: 6,   // Turn 1 deployment budget
    cpuControlValue: 10,    // Max concurrent drones
    energyPerTurn: 3,       // Starting energy
    // ... other stats
  }
}
```

---

## Lane Mapping

| Lane Index | Position | Description |
|------------|----------|-------------|
| 0 | Left | Left lane (flanking position) |
| 1 | Middle | Center lane |
| 2 | Right | Right lane (flanking position) |

This matches the existing game board lane structure.
