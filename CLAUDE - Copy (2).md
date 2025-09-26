# Drone Wars - Claude Code Development Guide

## Project Architecture

### Core Principle: Strict Separation of Concerns
- **App.jsx**: UI only, reads from GameStateManager
- **GameStateManager**: Single source of truth for all game state  
- **ActionProcessor**: Prevents race conditions, serializes all actions
- **gameLogic.js**: Pure functions, ONLY file that updates game state
- **aiLogic.js**: Decision making only, never executes actions

### Data Flow
```
UI Action → ActionProcessor → gameLogic.js → GameStateManager → UI Update
```

### Multiplayer: Distributed P2P Architecture
Both players run identical game engines, sync via WebRTC actions (not state).

## Key Files & Responsibilities

### `/src/App.jsx`
- **Role**: UI controller
- **Rule**: NEVER directly update game state
- **Pattern**: Uses `useGameState()` hook for all game data

### `/src/state/GameStateManager.js`
- **Role**: Centralized state management
- **Rule**: Only source of truth
- **Pattern**: Event-driven updates, validates all changes

### `/src/state/ActionProcessor.js`
- **Role**: Action serialization
- **Rule**: ALL state changes go through here
- **Pattern**: Queue-based processing prevents race conditions

### `/src/logic/gameLogic.js`
- **Role**: Game rules implementation
- **Rule**: Pure functions only, no side effects
- **Pattern**: Takes state, returns new state + effects

### `/src/logic/aiLogic.js`
- **Role**: AI decision making
- **Rule**: NEVER executes actions
- **Pattern**: Returns decision objects for ActionProcessor

### `/src/hooks/useGameState.js`
- **Role**: React bridge
- **Rule**: Only way components access game state
- **Pattern**: Reactive updates via GameStateManager events

## Critical Development Rules

### ✅ DO:
- Use `await processAction(type, payload)` for ALL state changes
- Keep UI state separate from game state
- Use perspective-aware getters (`getLocalPlayerState()`)
- Process actions through ActionProcessor queue
- Use pure functions in gameLogic.js

### ❌ DON'T:
- Update GameStateManager directly from UI
- Mix decision-making with execution in AI
- Allow concurrent state modifications
- Store UI state in GameStateManager
- Bypass ActionProcessor for any state change

## Action Processing Pattern

### Correct Way:
```javascript
// In components
const { processAction } = useGameState();
await processAction('attack', { attackDetails });

// ActionProcessor routes to gameLogic.js
// gameLogic.js returns new state
// GameStateManager updates and notifies React
```

### Wrong Way:
```javascript
// NEVER DO THIS
gameStateManager.setState({ currentPlayer: 'player2' });
```

## Adding New Features

### New Game Action:
1. Add action type to ActionProcessor
2. Implement pure logic in gameLogic.js  
3. Add UI handling in App.jsx
4. Test through ActionProcessor queue

### New AI Behavior:
1. Add decision logic to aiLogic.js
2. Return decision object (don't execute)
3. ActionProcessor handles execution
4. Log decisions for debugging

### New Card/Ability:
1. Add effect handler to gameLogic.js `resolveSingleEffect()`
2. Update targeting in `getValidTargets()` if needed
3. Add UI components for selection/targeting
4. Test via ActionProcessor

## Multiplayer Integration

### P2P Actions:
```javascript
// Same code works for local and multiplayer
await processAction('attack', payload);
// ActionProcessor automatically syncs to peer
```

### Phase Sync:
```javascript
// UI-level synchronization only
p2pManager.sendData({ type: 'PHASE_COMPLETED', data: { phase } });
```

## Common Patterns

### State Updates:
```javascript
// Get current state
const { gameState, getLocalPlayerState } = useGameState();

// Process action (triggers update)
await processAction('cardPlay', { card, target });

// UI automatically re-renders via hook
```

### AI Integration:
```javascript
// AI makes decision
const decision = aiBrain.handleOpponentAction(gameState);

// ActionProcessor executes decision  
await processAction('aiTurn', { decision });
```

### Error Handling:
```javascript
try {
  await processAction('attack', payload);
} catch (error) {
  // State remains consistent
  // Show error to user
}
```

## Performance Notes

- Use `useCallback` in components for stable references
- ActionProcessor queue prevents action spam
- GameStateManager validates all state transitions
- Race condition monitoring available in debug mode

## Debugging Tools

- Set `RACE_CONDITION_DEBUG = true` for monitoring
- Use `gameStateManager.getActionQueueLength()` to check queue
- AI decision logs available in game log
- P2P connection status in `p2pStatus`

---

**Key Reminder**: Always use ActionProcessor for state changes. Your architecture prevents race conditions, but only if you follow the data flow pattern consistently.