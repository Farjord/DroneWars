# Phase 3: Hangar UI

## Overview

Phase 3 creates the Hangar screen - the central hub for Extraction Mode. Players access all pre-run functionality here: map selection, deck building, ship management, repairs, card replication, and save/load. This is the primary interface between runs.

**What This Phase Accomplishes:**
- Main hangar screen with galaxy map showing available procedurally generated maps
- Ship slot selection and management (6 slots)
- Map tier selection → Individual map selection → Deployment flow
- Integration with NEW SinglePlayerDeckEditor (separate from multiplayer DeckBuilder)
- Card discovery system (owned, discovered, undiscovered states)
- INVENTORY modal: Full card glossary showing all cards (owned + unowned) with collection progress
- BLUEPRINTS modal: View/craft from unlocked ship/drone blueprints, see collection progress
- REPLICATOR modal: Duplicate owned cards only
- REPAIR BAY modal: Repair ship section hull damage + repair damaged drones
- SAVE/LOAD modal: File download/upload with discoveredCards tracking
- Clean, minimal design aesthetic matching existing UI patterns

---

## Estimated Time

**2 days** (8-12 hours total)

---

## Dependencies

**Requires:**
- Phase 1 (Foundation) - playerDeckData, ship data with rarity, card/drone rarity
- Phase 2 (Persistence) - save/load functionality, save schema

**Blocks:**
- All gameplay phases (hangar is the entry point)

---

## Files to Create

### Screens (1)
`src/components/screens/HangarScreen.jsx` - Main hub interface

### Modals (6) - All separate modals
`src/components/modals/MapOverviewModal.jsx` - Preview specific generated map before deployment (opens from map icon)
`src/components/modals/SinglePlayerDeckEditorModal.jsx` - Deck builder wrapper (5 drones, owned cards only)
`src/components/modals/InventoryModal.jsx` - Full card glossary (all cards, shows collection progress)
`src/components/modals/BlueprintsModal.jsx` - View/craft unlocked blueprints, see locked blueprints
`src/components/modals/ReplicatorModal.jsx` - Duplicate owned cards for credits
`src/components/modals/RepairBayModal.jsx` - Repair ship section hull + damaged drones
`src/components/modals/SaveLoadModal.jsx` - File upload/download UI

### UI Components (1)
`src/components/ui/ShipSlotCard.jsx` - Ship slot display component

---

## Implementation Guide

### 1. HangarScreen.jsx

**Layout Structure:**
```jsx
<div className="hangar-screen">
  <header>
    <h1>Exploring the Eremos</h1>
    <div className="resources">
      <span>{credits} Credits</span>
      <span>{tokens} Tokens</span>
    </div>
  </header>

  <main className="hangar-content">
    {/* Central visual - Map Icon Grid */}
    <section className="galaxy-map">
      {/* 6 octagonal map icons with random positioning */}
      {/* See "Map Icon Grid" section below for full implementation */}
      {/* Icons render directly here, no modal-based selection */}
    </section>

    {/* Ship Slots Grid */}
    <section className="ship-slots">
      <h2>Ship Bays</h2>
      <div className="slot-grid">
        {shipSlots.map(slot => (
          <ShipSlotCard
            key={slot.id}
            slot={slot}
            isActive={activeSlot === slot.id}
            onClick={() => setActiveSlot(slot.id)}
          />
        ))}
      </div>
    </section>

    {/* Action Buttons */}
    <section className="hangar-actions">
      <button onClick={openDeckEditor}>Deck Builder</button>
      <button onClick={openRepairBay}>Repair Bay</button>
      <button onClick={openReplicator}>Replicator</button>
      <button onClick={openSaveLoad}>Save / Load</button>
      <button onClick={returnToMenu}>Exit to Menu</button>
    </section>
  </main>
</div>
```

**State Management:**
```javascript
const [activeSlot, setActiveSlot] = useState(0);
const [showMapModal, setShowMapModal] = useState(false);
const [showDeckModal, setShowDeckModal] = useState(false);
const [showRepairModal, setShowRepairModal] = useState(false);
const [showReplicatorModal, setShowReplicatorModal] = useState(false);
const [showSaveLoadModal, setShowSaveLoadModal] = useState(false);

// Subscribe to GameStateManager
const gameState = useGameState();
const { singlePlayerProfile, singlePlayerShipSlots, singlePlayerInventory } = gameState;
```

---

### 2. ShipSlotCard.jsx

**Visual States:**
```jsx
function ShipSlotCard({ slot, isActive, onClick }) {
  // Helper functions to fetch hull from shipComponentInstances
  const getShipInstancesForSlot = () => {
    if (slot.id === 0) return [];  // Starter deck never damaged
    const instanceIds = Object.values(slot.shipComponents).map(comp => comp.instanceId);
    return gameStateManager.state.singlePlayerShipComponentInstances.filter(
      inst => instanceIds.includes(inst.instanceId)
    );
  };

  const shipInstances = getShipInstancesForSlot();
  const hasLowHull = shipInstances.some(inst => inst.currentHull < inst.maxHull * 0.5);

  const getStatusColor = () => {
    if (slot.status === 'mia') return 'bg-red-900 border-red-500';
    if (slot.status === 'empty') return 'bg-gray-800 border-gray-600';
    if (hasLowHull) return 'bg-yellow-900 border-yellow-600';
    return 'bg-blue-900 border-blue-600';
  };

  return (
    <div
      className={`ship-slot-card ${getStatusColor()} ${isActive ? 'ring-2 ring-white' : ''}`}
      onClick={onClick}
    >
      <div className="slot-header">
        <span className="slot-id">#{slot.id}</span>
        {slot.isImmutable && <Badge>Starter</Badge>}
      </div>

      <h3>{slot.name}</h3>

      {slot.status === 'active' && (
        <>
          {/* Ship component health summary */}
          <div className="ship-health-summary">
            {shipInstances.map(inst => (
              <div key={inst.instanceId} className="component-health">
                <span className="component-name">{inst.id}</span>
                <span className="hull-text">{inst.currentHull}/{inst.maxHull}</span>
              </div>
            ))}
          </div>

          <div className="drones-status">
            {slot.drones.map((d, idx) => (
              <span key={idx} className={d.isDamaged ? 'text-red-400' : 'text-green-400'}>
                {d.isDamaged ? '✗' : '✓'}
              </span>
            ))}
          </div>
        </>
      )}

      {slot.status === 'empty' && <p className="text-gray-400">Empty Bay</p>}
      {slot.status === 'mia' && <p className="text-red-400">MIA - Recover or Scrap</p>}
    </div>
  );
}
```

---

### 3. Map Icon Grid (HangarScreen.jsx)

**Visual Design:**
- 6 octagonal icons displayed directly on hangar screen (no modal)
- Uses CSS clip-path polygons for octagon shape
- Dimensions: 140px × 160px containers, 120px × 138px octagons
- Random positioning with collision detection to prevent overlap
- Tier-based colored borders using RARITY_COLORS (Grey/Green/Blue/Purple)
- Overlapping circle badge at bottom with type icon

**Octagon Clip-Path:**
```javascript
// Balanced octagon with equal edge lengths
clipPath: 'polygon(28% 0%, 72% 0%, 100% 31%, 100% 69%, 72% 100%, 28% 100%, 0% 69%, 0% 31%)'
```

**Position Generation:**
```javascript
// Constants for collision detection
const nodeWidth = 140;   // Container width
const nodeHeight = 160;  // Container height
const minSpacing = 30;   // Minimum distance between icons
const padding = 40;      // Padding from container edges

// Random placement with collision detection (max 50 attempts)
// Falls back to grid layout if random placement fails
```

**State Management:**
```javascript
const [generatedMaps, setGeneratedMaps] = useState([]);
const [mapNodePositions, setMapNodePositions] = useState([]);

useEffect(() => {
  if (!singlePlayerProfile?.gameSeed) return;

  const generateMapsForSession = () => {
    const maps = [];
    const { gameSeed } = singlePlayerProfile;

    // Generate 6 maps using gameSeed + index for deterministic generation
    for (let i = 0; i < 6; i++) {
      const mapSeed = gameSeed + i;
      const mapType = 'GENERIC';  // MVP: all maps are GENERIC type
      const mapData = generateMapData(mapSeed, 1, mapType);  // Tier 1 for MVP
      maps.push({
        id: i + 1,
        ...mapData
      });
    }

    setGeneratedMaps(maps);
  };

  generateMapsForSession();
}, [singlePlayerProfile]);
```

**Click Handler:**
```javascript
const handleMapIconClick = (mapIndex) => {
  const map = generatedMaps[mapIndex];
  if (!map) {
    console.error('Map data not generated yet');
    return;
  }

  // Find active ship slot
  const activeSlot = singlePlayerShipSlots.find(slot => slot.status === 'active');
  if (!activeSlot) {
    console.error('No active ship available for deployment');
    return;
  }

  // Open MapOverviewModal with selected map
  setSelectedSlotId(activeSlot.id);
  setSelectedMap(map);
  setActiveModal('mapOverview');
};
```

**Rendering Structure:**
```jsx
{/* Map Icon Grid */}
{mapNodePositions.map((pos, index) => {
  const map = generatedMaps[index];
  const isGenerated = !!map;

  // Get tier-based border color
  const getTierColor = (tier) => {
    const tierToRarity = {
      1: 'Common',    // Grey
      2: 'Uncommon',  // Green
      3: 'Rare',      // Blue
      4: 'Mythic'     // Purple
    };
    return RARITY_COLORS[tierToRarity[tier]] || '#808080';
  };

  const borderColor = map ? getTierColor(map.tier) : '#334155';
  const mapType = map ? getMapType(map.type) : null;

  return (
    <div
      key={pos.id}
      style={{
        position: 'absolute',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '140px',
        height: '160px'
      }}
    >
      {/* Octagon Button with 3-layer structure */}
      <button onClick={() => handleMapIconClick(index)}>
        {/* Outer hexagon shape */}
        {/* Colored border layer */}
        {/* Inner content with map name */}
      </button>

      {/* Overlapping Circle Icon */}
      <div style={{
        position: 'absolute',
        top: '118px',  // Extends 20px below hexagon
        left: '50px',  // Centered horizontally
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#1a1a1a',
        border: `3px solid ${borderColor}`,
        zIndex: 10,
        pointerEvents: 'none'  // Don't block hexagon clicks
      }}>
        {mapType?.icon}
      </div>
    </div>
  );
})}
```

**Visual Features:**
- Circle extends 20px below hexagon's bottom edge for overlapping effect
- Type icon (from mapMetaData: '?' for GENERIC, '💣' for MUNITIONS_FACTORY)
- Border color matches tier using RARITY_COLORS system
- Hover effects: scale(1.05) + brightness(1.2)
- Disabled state for ungenerated maps (opacity 0.5)

---

### 4. MapOverviewModal.jsx

**Purpose:** Preview map tier before deployment

```jsx
function MapOverviewModal({ tier, onClose, onDeploy }) {
  const mapTier = getMapTier(tier);
  const activeSlot = gameStateManager.state.singlePlayerShipSlots.find(/* active */);

  // Check deployment requirements
  const canDeploy = () => {
    if (!activeSlot || activeSlot.status !== 'active') return false;

    // Check all ship sections have > 0 hull
    const getShipInstancesForSlot = (slotId) => {
      if (slotId === 0) return [];
      const instanceIds = Object.values(activeSlot.shipComponents).map(comp => comp.instanceId);
      return gameStateManager.state.singlePlayerShipComponentInstances.filter(
        inst => instanceIds.includes(inst.instanceId)
      );
    };
    const shipInstances = getShipInstancesForSlot(activeSlot.id);
    if (shipInstances.some(inst => inst.currentHull <= 0)) return false;

    // Check no damaged drones
    if (activeSlot.drones.some(d => d.isDamaged)) return false;

    // Check entry cost
    if (profile.credits < mapTier.entryCost.amount) return false;

    return true;
  };

  return (
    <Modal onClose={onClose}>
      <h2>{mapTier.name}</h2>
      <p>{mapTier.description}</p>

      <div className="map-stats">
        <StatRow label="Radius" value={`${mapTier.radius} hexes`} />
        <StatRow label="Gates" value={mapTier.gateCount} />
        <StatRow label="Points of Interest" value={`${mapTier.poiCount.min}-${mapTier.poiCount.max}`} />
        <StatRow label="Entry Cost" value={`${mapTier.entryCost.amount} Credits`} />
      </div>

      {/* Preview hex grid (simplified) */}
      <div className="map-preview">
        <svg viewBox="0 0 200 200">
          {/* Simplified hex grid visualization */}
        </svg>
      </div>

      <div className="deploy-section">
        <p>Current Ship: {activeSlot?.name}</p>

        {/* Show ship component health */}
        <div className="ship-health-summary">
          {getShipInstancesForSlot(activeSlot.id).map(inst => (
            <p key={inst.instanceId}>
              {inst.id}: {inst.currentHull}/{inst.maxHull} HP
            </p>
          ))}
        </div>

        {!canDeploy() && (
          <p className="text-red-400">
            {activeSlot?.status === 'mia' && "Ship is MIA"}
            {activeSlot?.drones.some(d => d.isDamaged) && "Repair damaged drones first"}
            {shipInstances.some(inst => inst.currentHull <= 0) && "Repair destroyed ship components first"}
            {profile.credits < mapTier.entryCost.amount && "Insufficient credits"}
          </p>
        )}

        <button
          disabled={!canDeploy()}
          onClick={onDeploy}
          className="btn-deploy"
        >
          Deploy Ship
        </button>
      </div>
    </Modal>
  );
}
```

---

### 4. SinglePlayerDeckEditorModal.jsx

**Purpose:** Wrapper around existing DeckBuilder for SP mode

```jsx
function SinglePlayerDeckEditorModal({ shipSlotId, onClose }) {
  const shipSlot = gameStateManager.state.singlePlayerShipSlots.find(s => s.id === shipSlotId);
  const inventory = gameStateManager.state.singlePlayerInventory;

  const [currentDeck, setCurrentDeck] = useState(shipSlot.decklist);
  const [currentDrones, setCurrentDrones] = useState(shipSlot.drones);

  const saveDeck = () => {
    // Validate 40 cards
    const totalCards = Object.values(currentDeck).reduce((sum, qty) => sum + qty, 0);
    if (totalCards !== 40) {
      alert('Deck must contain exactly 40 cards');
      return;
    }

    // Validate drone count (5)
    if (currentDrones.length !== 5) {
      alert('Must select exactly 5 drones');
      return;
    }

    // Check card ownership
    for (const [cardId, qty] of Object.entries(currentDeck)) {
      if ((inventory[cardId] || 0) < qty) {
        alert(`Insufficient cards: ${cardId}`);
        return;
      }
    }

    // Save to slot
    shipSlot.decklist = currentDeck;
    shipSlot.drones = currentDrones;
    gameStateManager.setState({ singlePlayerShipSlots: [...gameStateManager.state.singlePlayerShipSlots] });

    onClose();
  };

  if (shipSlot.isImmutable) {
    return (
      <Modal onClose={onClose}>
        <p>Starter deck cannot be modified.</p>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} fullScreen>
      <DeckBuilder
        mode="extraction"  // Enables card discovery filtering
        deck={currentDeck}
        drones={currentDrones}
        inventory={inventory}
        discoveredCards={gameStateManager.state.discoveredCards}
        onDeckChange={setCurrentDeck}
        onDronesChange={setCurrentDrones}
        maxCards={40}  // Changed from 30
        maxDrones={5}  // SP: 5 drones
      />
      <button onClick={saveDeck}>Save Deck</button>
    </Modal>
  );
}

// Card Discovery System:
// When mode === 'extraction', DeckBuilder will filter cards into three states:
//   1. Owned (inventory[cardId] > 0): Normal display, selectable
//   2. Discovered (discoveredCards.includes(cardId) && inventory[cardId] === 0): Greyed out, show "0 owned"
//   3. Undiscovered (!discoveredCards.includes(cardId)): Show "???" placeholder card
// This allows players to see what cards exist without revealing undiscovered ones.
```

---

### 5. ReplicatorModal.jsx

**Purpose:** Duplicate owned cards for credits

```javascript
function ReplicatorModal({ onClose }) {
  const inventory = gameStateManager.state.singlePlayerInventory;
  const profile = gameStateManager.state.singlePlayerProfile;

  const [selectedCard, setSelectedCard] = useState(null);

  const replicateCosts = {
    Common: 50,
    Uncommon: 150,
    Rare: 400,
    Mythic: 1000
  };

  const replicateCard = (cardId) => {
    const card = fullCardCollection.find(c => c.id === cardId);
    const rarity = card.rarity;  // Get rarity from cardData (added in Phase 1)
    const cost = replicateCosts[rarity];

    if (profile.credits < cost) {
      alert('Insufficient credits');
      return;
    }

    // Deduct credits
    profile.credits -= cost;

    // Add card
    inventory[cardId] = (inventory[cardId] || 0) + 1;

    gameStateManager.setState({
      singlePlayerProfile: profile,
      singlePlayerInventory: inventory
    });

    alert(`Replicated ${card.name} for ${cost} credits`);
  };

  return (
    <Modal onClose={onClose}>
      <h2>Replicator</h2>
      <p>Duplicate owned cards for credits</p>

      <div className="card-list">
        {Object.keys(inventory).map(cardId => {
          const card = fullCardCollection.find(c => c.id === cardId);
          const rarity = card.rarity;  // Get rarity from cardData (added in Phase 1)
          const cost = replicateCosts[rarity];

          return (
            <div key={cardId} className="card-row">
              <span>{card.name}</span>
              <span>Owned: {inventory[cardId]}</span>
              <span>{rarity}</span>
              <button
                onClick={() => replicateCard(cardId)}
                disabled={profile.credits < cost}
              >
                Replicate ({cost} Cr)
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
```

---

### 6. RepairBayModal.jsx

**Purpose:** Repair hull and drones

```javascript
function RepairBayModal({ shipSlotId, onClose }) {
  const shipSlot = gameStateManager.state.singlePlayerShipSlots.find(s => s.id === shipSlotId);
  const profile = gameStateManager.state.singlePlayerProfile;

  const HULL_REPAIR_COST_PER_HP = 10;  // Placeholder
  const DRONE_REPAIR_COSTS = {
    Common: 50,
    Uncommon: 100,
    Rare: 200,
    Mythic: 500
  };

  const hullDamage = shipSlot.maxHull - shipSlot.currentHull;
  const hullRepairCost = hullDamage * HULL_REPAIR_COST_PER_HP;

  const repairHull = () => {
    if (profile.credits < hullRepairCost) {
      alert('Insufficient credits');
      return;
    }

    profile.credits -= hullRepairCost;
    shipSlot.currentHull = shipSlot.maxHull;

    gameStateManager.setState({
      singlePlayerProfile: profile,
      singlePlayerShipSlots: [...gameStateManager.state.singlePlayerShipSlots]
    });

    alert(`Hull repaired for ${hullRepairCost} credits`);
  };

  const repairDrone = (droneIndex) => {
    const drone = shipSlot.drones[droneIndex];
    const droneData = fullDroneCollection.find(d => d.name === drone.name);
    const rarity = droneData.rarity;  // Get rarity from droneData (added in Phase 1)
    const cost = DRONE_REPAIR_COSTS[rarity];

    if (profile.credits < cost) {
      alert('Insufficient credits');
      return;
    }

    profile.credits -= cost;
    drone.isDamaged = false;

    gameStateManager.setState({
      singlePlayerProfile: profile,
      singlePlayerShipSlots: [...gameStateManager.state.singlePlayerShipSlots]
    });

    alert(`${drone.name} repaired for ${cost} credits`);
  };

  return (
    <Modal onClose={onClose}>
      <h2>Repair Bay</h2>

      <section className="hull-repair">
        <h3>Hull Repair</h3>
        <div className="hull-bar">
          <div style={{ width: `${(shipSlot.currentHull / shipSlot.maxHull) * 100}%` }} />
        </div>
        <p>{shipSlot.currentHull} / {shipSlot.maxHull} HP</p>
        {hullDamage > 0 && (
          <button onClick={repairHull}>
            Repair Hull ({hullRepairCost} Cr)
          </button>
        )}
      </section>

      <section className="drone-repair">
        <h3>Drone Repair</h3>
        {shipSlot.drones.map((drone, i) => (
          <div key={i} className={drone.isDamaged ? 'damaged' : 'operational'}>
            <span>{drone.name}</span>
            <span>{drone.isDamaged ? 'DAMAGED' : 'Operational'}</span>
            {drone.isDamaged && (
              <button onClick={() => repairDrone(i)}>
                Repair ({DRONE_REPAIR_COSTS.Common} Cr)
              </button>
            )}
          </div>
        ))}
      </section>
    </Modal>
  );
}
```

---

### 7. SaveLoadModal.jsx

```javascript
function SaveLoadModal({ onClose }) {
  const saveGameService = useMemo(() => saveGameServiceInstance, []);

  const handleSave = () => {
    const saveData = gameStateManager.getSaveData();
    const serialized = saveGameService.serialize(
      saveData.playerProfile,
      saveData.inventory,
      saveData.shipSlots,
      saveData.currentRunState
    );

    const filename = `eremos_save_${Date.now()}.json`;
    saveGameService.download(serialized, filename);
  };

  const handleLoad = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const gameState = await saveGameService.load(file);
      gameStateManager.loadSinglePlayerSave(gameState);
      alert('Save loaded successfully!');
      onClose();
    } catch (error) {
      alert('Failed to load save: ' + error.message);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>Save / Load</h2>

      <section>
        <h3>Save Game</h3>
        <button onClick={handleSave}>Download Save File</button>
      </section>

      <section>
        <h3>Load Game</h3>
        <input type="file" accept=".json" onChange={handleLoad} />
      </section>

      <section>
        <h3>Quick Save (LocalStorage)</h3>
        <button onClick={() => {
          const data = gameStateManager.getSaveData();
          saveGameService.quickSave(saveGameService.serialize(data.playerProfile, data.inventory, data.shipSlots));
        }}>
          Quick Save
        </button>
        <button onClick={() => {
          const gameState = saveGameService.quickLoad();
          gameStateManager.loadSinglePlayerSave(gameState);
        }}>
          Quick Load
        </button>
      </section>
    </Modal>
  );
}
```

---

## Validation Checklist

- [ ] Hangar screen displays ship slots correctly
- [ ] Active slot selection works
- [ ] Map overview modal shows tier information
- [ ] Deploy button validates requirements
- [ ] Deck editor opens with 40-card validation
- [ ] Deck editor shows inventory-based card selection
- [ ] Card discovery system shows three states correctly (owned/discovered/undiscovered)
- [ ] Discovered cards appear greyed out with "0 owned" text
- [ ] Undiscovered cards show as "???" placeholders
- [ ] Replicator lists all owned cards
- [ ] Replicator deducts correct credits
- [ ] Repair bay shows hull damage
- [ ] Repair bay shows damaged drones
- [ ] Repair costs calculated correctly
- [ ] Save download works
- [ ] Save upload works
- [ ] MIA ships displayed correctly
- [ ] Empty slots displayed correctly

---

## Next Steps

After Phase 3, proceed to Phase 4 (Map Generation) to enable deployment functionality.

---

**Phase Status:** Ready for Implementation
**Estimated Completion:** Day 5 of development
