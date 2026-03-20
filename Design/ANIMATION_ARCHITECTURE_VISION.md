# Animation Architecture Vision

> Permanent reference capturing the agreed architectural design for the animation system.
> Created from collaborative design session — validated against Hearthstone, MTG Arena, Legends of Runeterra patterns.

---

## The Core Concept: Two Timelines

The animation system is built on a fundamental separation:

- **Game state (the brain)** updates immediately — always knows the truth
- **Visual state (the screen)** reveals results at controlled dramatic moments
- **Animations** are the storytelling layer bridging the two

This separation means the game logic never waits for animations. State is resolved first, then the visual layer dramatizes the result. The player experiences cause-and-effect through carefully sequenced visuals, even though the engine already knows the outcome.

---

## The Effect Pipeline

Every effect follows the same resolution pattern. Effects are strictly sequential — nothing overlaps.

```
EFFECT 1:
  Game state updates (brain knows the result)
  Instigation animation (player sees the cause)
  Visual state updates (player sees the result)
  Consequence animation (explosion, sparks, destruction)
  Death processing (anything at 0 health removed)
  TRIGGERS caused by Effect 1 (strictly sequential):
    Each trigger:
      Announcement -> Game state -> Instigation -> Visual state -> Consequence -> Death processing
    Triggers can cascade, each fully resolves before next

EFFECT 2:
  (same pattern, only begins once Effect 1 + all its triggers are done)
```

### Key Timing Rules

1. **State-before-animation**: Game state updates happen *before* the instigation animation plays. The engine already knows the result; the animation is revealing it to the player.
2. **Death processing phase**: Anything at 0 health is removed *after* each effect/trigger fully resolves. Nothing is removed mid-animation.
3. **AoE simultaneous resolution**: Area-of-effect hits all targets at once visually (single animation beat), then triggers process in order.
4. **Depth-first resolution**: This is industry-standard. Effect -> all its triggers (recursively) -> next effect. Confirmed as matching Hearthstone/MTG Arena/Runeterra patterns.

---

## Key Design Rules

### Effect Type = Default Animation
Each effect type (damage, heal, move, etc.) has a baked-in default animation. The effect *is* its own visual identity. This keeps the common case simple — most effects just play their default.

### Card Visual Overrides
Cards can override the default animation via a `visualEffect` property. This allows thematic cards to have unique visuals without changing the effect logic. The override is purely cosmetic — same game state change, different presentation.

### Strictly Sequential
No parallel effect resolution. The player must be able to follow the story: "this happened, then that happened, then this triggered." Parallel animations would make complex chains incomprehensible.

### Infinite Loop Protection
Already exists in the trigger system — a trigger can only fire once per source per chain. This prevents infinite cascades from recursive triggers.

---

## Self-Contained Animation Units

Each animation should be a self-contained folder:

```
src/animations/
  teleport/
    TeleportEffect.jsx    # React component
    teleport.css           # Scoped styles + keyframes
    index.js               # { type, duration, timing, sound }
```

**Adding a new animation = create a folder.** This is the key extensibility goal. No need to touch central registries, no need to modify orchestration code. The animation unit exports its metadata (duration, timing, sound cue) and the orchestration layer consumes it generically.

### Benefits
- **Isolation**: Each animation owns its styles, component, and metadata
- **Discoverability**: Browse `src/animations/` to see all available effects
- **Testability**: Each can be tested/previewed independently
- **Onboarding**: New contributors can add animations without understanding the full pipeline

---

## Game Flow Announcements

Phase banners, win/lose screens, and round transitions are a **separate, simpler system**. They are not part of the effect pipeline.

- **Boundary handshake**: The effect pipeline and game flow system wait for each other at transition points (e.g., combat phase ends -> all animations complete -> round-end banner)
- These are purely UI-driven, no game state implications
- Simpler timing requirements — just "show, wait, dismiss"

---

## Future Considerations

### Replacement Effects
"Instead of" mechanics (e.g., "instead of taking damage, gain shield") will need a hook point in the pipeline. The replacement would intercept between game state update and animation, substituting both the state change and the visual.

### Animation Speed Controls
Player-facing speed settings (1x, 2x, skip). The key constraint: **logic stays sequential**, only the visual layer compresses or speeds up. The game state timeline is never affected by animation speed.

### Animation Previews
Card hover or targeting could preview what animation will play, helping players understand cause-and-effect before committing.

---

## Validation Notes

This architecture was validated against three major digital card games:
- **Hearthstone**: Depth-first trigger resolution, sequential effect animation, death processing between steps
- **MTG Arena**: Stack-based resolution with visual dramatization, state-before-animation pattern
- **Legends of Runeterra**: Sequential spell resolution with trigger cascades, AoE simultaneous hit visuals

Key corrections applied during design:
- State-before-animation timing (not animation-then-state)
- Explicit death processing phase (not implicit removal)
- AoE simultaneous resolution (not sequential per-target)
