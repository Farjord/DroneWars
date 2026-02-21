# Plan: Refactor ActionProcessor.js

## Intent

ActionProcessor.js is a 4,838-line god object with 44 process methods and a 35-case switch statement. Refactor into an orchestrator (~400 lines) + 9 strategy files + 1 network helper, using the strategy pattern mandated by CODE_STANDARDS.md.

## Execution Order

### Phase 0 — Pre-flight
1. Run tech-debt-review skill (capture before state)

### Phase 1 — Understand
2. Read entire file, map dependencies and consumers
3. Write Behavioral Baseline in REFACTOR_ACTION_PROCESSOR.md (immutable)

### Phase 2 — Test First
4. Write `src/managers/__tests__/ActionProcessor.test.js` — queue, locking, pass validation, turn validation, event emission, action counter (6 tests)
5. Write `src/managers/__tests__/ActionProcessor.combat.test.js` — attack go-again, move keywords, ability activation limit (3 tests)
6. Write `src/managers/__tests__/ActionProcessor.cards.test.js` — card target resolution, movement completion flow (2 tests)
7. Write `src/managers/__tests__/ActionProcessor.commitments.test.js` — commitment storage + AI auto-commit, applyPhaseCommitments (2 tests)
8. Confirm all tests green

### Phase 3a — Foundation Cleanup
9. Delete dead code (processAiDecision, debug console.error calls)
10. Convert 15 raw console calls to debugLog
11. Remove debug-era comments and decorative separators
12. Deduplicate processSnaredConsumption/processSuppressedConsumption into processStatusConsumption
13. Extract `_executeActionWithAnimations()` private helper
14. Extract `_withUpdateContext()` private helper
15. Commit after each step. Target: ~4,500 lines

### Phase 3b — Strategy Extractions (sequential — shared mutable state)
16. Extract CombatActionStrategy.js + CardActionStrategy.js (~1,100 lines)
17. Extract ShipAbilityStrategy.js + PhaseTransitionStrategy.js (~600 lines)
18. Extract CommitmentStrategy.js + StateUpdateStrategy.js (~660 lines)
19. Extract DroneActionStrategy.js + ShieldActionStrategy.js + MiscActionStrategy.js (~700 lines)
20. Extract NetworkBroadcastHelper.js (~150 lines)
21. Commit after each extraction step

### Phase 4 — Finalization
22. Replace 35-case switch with strategy registry map
23. Trim verbose logging (processEnergyReset, processAction finally block)
24. Code review via superpowers:code-reviewer
25. Update all refactor docs (REFACTOR_ACTION_PROCESSOR.md NOW section, REFACTOR_PLAN.md)
26. Final commit

## Target File Sizes

| File | Target |
|-|-|
| ActionProcessor.js (orchestrator) | <400 |
| CombatActionStrategy.js | ~400 |
| CardActionStrategy.js | ~400 |
| ShipAbilityStrategy.js | ~300 |
| PhaseTransitionStrategy.js | ~350 |
| CommitmentStrategy.js | ~400 |
| StateUpdateStrategy.js | ~200 |
| DroneActionStrategy.js | ~350 |
| ShieldActionStrategy.js | ~200 |
| MiscActionStrategy.js | ~150 |
| NetworkBroadcastHelper.js | ~150 |

## Risks

- Animation sequencing depends on pendingStateUpdate/pendingFinalState shared fields
- Action locks must still wrap strategy execution via processAction's try/finally
- processCommitment re-enters itself during AI auto-commit
- processGuestAction is fire-and-forget (non-blocking)

## Actual Outcomes

*To be completed after refactoring.*
