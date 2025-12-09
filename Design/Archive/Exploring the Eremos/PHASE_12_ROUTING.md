# Phase 12: Routing & Navigation

## Overview

Integrates all single-player screens into app navigation and adds menu entry point.

**Duration:** 1 day | **Dependencies:** All previous phases

---

## Files Created

1. `src/components/screens/EremosEntryScreen.jsx` - New Game / Load Game entry screen

## Files Modified

1. `src/AppRouter.jsx` - Added `eremosEntry` route
2. `src/components/screens/MenuScreen.jsx` - Renamed button, simplified to navigate to entry screen

---

## Key Implementation

### Navigation Flow

```
Main Menu
    │
    ├─ [INTO THE EREMOS] ────────┐
    │                            │
    │                            ▼
    │                    EremosEntryScreen
    │                    ┌──────────────────┐
    │                    │  NEW GAME        │ → createNewSinglePlayerProfile() → Hangar
    │                    │  LOAD GAME       │ → file picker → loadSinglePlayerSave() → Hangar
    │                    │  Back to Menu    │ → Main Menu
    │                    └──────────────────┘
    │
    ├─ [Single Player] → Lobby (vs AI)
    ├─ [Multiplayer] → Lobby (vs Human)
    └─ [Deck Builder] → Standalone Editor
```

### EremosEntryScreen.jsx

```javascript
function EremosEntryScreen() {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);

  const handleNewGame = () => {
    gameStateManager.createNewSinglePlayerProfile();
    gameStateManager.setState({ appState: 'hangar', gameMode: 'singlePlayer' });
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();  // Opens file picker
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    const gameState = await SaveGameService.load(file);
    gameStateManager.loadSinglePlayerSave(gameState);
    gameStateManager.setState({ appState: 'hangar', gameMode: 'singlePlayer' });
  };

  const handleBack = () => {
    gameStateManager.setState({ appState: 'menu' });
  };

  // Renders: NEW GAME, LOAD GAME (file picker), Back to Menu
  // Hidden file input for JSON save files
}
```

### AppRouter.jsx Addition

```javascript
case 'eremosEntry':
  currentScreen = <EremosEntryScreen />;
  break;
```

### MenuScreen.jsx Change

```javascript
const handleIntoTheEremos = () => {
  gameStateManager.setState({ appState: 'eremosEntry' });
};

// Button: "INTO THE EREMOS" → navigates to eremosEntry screen
```

---

## AppRouter Routes

| appState | Screen | Notes |
|----------|--------|-------|
| `menu` | MenuScreen | Main menu |
| `eremosEntry` | EremosEntryScreen | New Game / Load Game choice |
| `hangar` | HangarScreen | Single-player hub |
| `tacticalMap` | TacticalMapScreen | Map navigation |
| `inGame` | App.jsx | Combat screen |
| `lobby` | LobbyScreen | AI/multiplayer setup |
| `deckBuilder` | StandaloneDeckBuilder | Deck editor |

---

## State Transitions

| From | To | Trigger |
|------|----|---------|
| menu | eremosEntry | Click "INTO THE EREMOS" |
| eremosEntry | hangar | New Game or Load Game |
| eremosEntry | menu | Back to Menu |
| hangar | tacticalMap | Deploy ship |
| tacticalMap | inGame | Combat encounter |
| inGame | tacticalMap | Combat victory |
| inGame | hangar | Combat loss (MIA) |
| tacticalMap | hangar | Extraction |
| hangar | menu | Exit to Menu |

---

## Validation Checklist

- [x] "INTO THE EREMOS" button appears at top of main menu
- [x] Clicking navigates to EremosEntryScreen
- [x] EremosEntryScreen shows title and description
- [x] "NEW GAME" button creates profile and goes to hangar
- [x] "LOAD GAME" button always visible (opens file picker)
- [x] "LOAD GAME" loads save file and goes to hangar
- [x] Error message shown if load fails
- [x] "Back to Menu" returns to main menu
- [x] Other menu options still work (Single Player, Multiplayer, Deck Builder)

---

**Phase Status:** Implemented
