# Refactoring Workflow

> Archived from CLAUDE.md 2026-02-23. Governed the 10-file technical debt refactoring project (29,243 → 8,071 lines, 72% reduction). Reactivate for future large-scale refactoring.

## Refactoring Process

- **Understand before changing.** Before modifying any code during a refactor:
  1. Read and understand every function/block being touched
  2. Document its current behavior, intent, contracts, and edge cases in a `## Behavioral Baseline` section of the refactor plan doc
  3. Describe what the code does, what it depends on, what depends on it, and any non-obvious design decisions
  4. This baseline is **immutable** — once written, it must not be edited or removed, even after the refactor is complete. It is the permanent "before" record.
- **State changes explicitly.** For every change, clearly state: what is being changed, why, what behavior is preserved, and what behavior (if any) is intentionally altered.
- **Small, verifiable steps.** Each commit must be independently testable. If a step breaks something, we must be able to identify exactly which change caused it by referencing the behavioral baseline.
- **When in doubt, ask.** If the intent behind existing code is unclear, flag it for discussion rather than guessing. Many patterns exist for good reasons that aren't obvious.

## Mandatory Refactoring Workflow

Every file refactor MUST follow these phases. Skills listed are mandatory, not optional.

**Phase 0 — Pre-flight:**
1. Run `tech-debt-review` skill to capture the "before" state
2. **Audit existing tests**: Search for `*.test.*` files in the target file's directory that are NOT inside `__tests__/`. If misplaced tests exist, migrate them to `__tests__/` as part of this refactoring — not deferred to a cross-cutting concern.

**Phase 1 — Understand:**
2. Use `Explore` agents to map the file's dependencies, consumers, and patterns
3. Populate the `## Behavioral Baseline` in the REFACTOR_*.md (immutable once written)
4. Use `superpowers:brainstorming` if the extraction strategy isn't obvious

**Phase 2 — Test First:**
5. Use `superpowers:test-driven-development` — write or verify tests for existing behavior BEFORE changing anything
6. Run tests to confirm green baseline

**Phase 3 — Extract (iterative):**
7. Use `superpowers:writing-plans` or `superpowers:executing-plans` for multi-step extractions
8. Each extraction step: make one small change → run tests (`superpowers:verification-before-completion`) → if broken, use `superpowers:systematic-debugging` → checkpoint commit
9. Use `superpowers:dispatching-parallel-agents` for independent extractions when safe

**Phase 4 — Review:**
10. Use `superpowers:requesting-code-review` → triggers `superpowers:code-reviewer` architect agent
11. Address feedback using `superpowers:receiving-code-review`
12. Update the `## Change Log` in the REFACTOR_*.md

**Phase 5 — Complete:**
13. Run `tech-debt-review` again — compare before/after metrics
14. Update REFACTOR_PLAN.md — mark file as [x] Complete with date and summary in Notes
15. Update the `## Change Log` in the REFACTOR_*.md with all completed steps
16. Final commit on master (no push — user pushes manually)

## REFACTOR_*.md Document Template

Every REFACTOR_*.md must use this three-section structure:

**## BEFORE** — Populated before any changes. Immutable once written.
- `### Current State` — line count, location, responsibilities, section map, existing tests
- `### Behavioral Baseline` — IMMUTABLE after initial writing. Must include:
  - **Exports / public API** — every exported function, constant, class, and its contract (params, return, side effects)
  - **State mutations and their triggers** — what state is changed, by which methods, and what triggers them
  - **Side effects** — animations fired, events emitted, network calls, localStorage writes
  - **Known edge cases** — race conditions, null guards, fallback behaviors, timing dependencies

**## TO DO** — Plan for what needs to change. Written during planning phase.
- `### Problems`, `### Extraction Plan`, `### Dead Code Removal`, `### Logging Improvements`, `### Comment Cleanup`, `### Testing Requirements`, `### Execution Order`, `### Risk Assessment`
- Import Direction Diagrams go here
- Not all subsections required — only include what's relevant

**## NOW** — Populated during/after implementation. Records what actually happened.
- `### Final State` — resulting file line counts, test counts, new file locations
- `### Change Log` — step-by-step table (date, change, behavior preserved/altered, deviations)

## Minimum Viable Test Coverage

Phase 2 (Test First) requires at minimum:
- All exported functions / public API methods must have at least one test
- Internal helpers tested indirectly through public API (not directly)
- For untested god objects: test the top-level orchestration paths first, not every internal branch

## Integration Smoke Test Checklist

After each extraction step in Phase 3, verify:
- [ ] App loads without console errors
- [ ] Deploy a drone to the board
- [ ] Play a card from hand
- [ ] Complete one combat round
- [ ] Save and load a game

## Refactoring Order

Mandatory bottom-up sequence — earlier files have no dependencies on later files:

| Order | File | Reason |
|-|-|-|
| 1 | cardData.js | No dependencies on other 10 files |
| 2 | saveGameSchema.js | Depends only on cardData |
| 3 | AIPhaseProcessor.js | No dependencies on other 10 files |
| 4 | ActionProcessor.js | Depends on AIPhaseProcessor |
| 5 | GameStateManager.js | Depends on cardData, saveGameSchema, ActionProcessor |
| 6 | GameFlowManager.js | Depends on GameStateManager, AIPhaseProcessor |
| 7 | DeckBuilder.jsx | Depends on cardData only |
| 8 | HangarScreen.jsx | Depends on cardData only |
| 9 | TacticalMapScreen.jsx | Depends on GameStateManager, GameFlowManager |
| 10 | App.jsx | Depends on most files — must be last |

## Refactoring Documentation (Non-Negotiable)

Every REFACTOR_*.md MUST use the BEFORE / TO DO / NOW structure (see Document Template above).

Every refactoring task MUST update these docs before the final commit:
- **REFACTOR_*.md** — BEFORE section immutable; TO DO populated during planning; NOW populated during/after implementation with Final State and Change Log
- **REFACTOR_PLAN.md** — mark the file's status as [x] Complete with date and summary in Notes column
- **Implementation plan** — save the session's plan to `Design/Technical Debt Refactor/Plans/PLAN_<FILE>.md` before starting work. Update with actual outcomes in an `## Actual Outcomes` section at the end. This is the permanent record of intent vs. reality.
- These updates are part of the deliverable. Incomplete docs = incomplete work.

## Parallel Extraction Safety Rule

- Only use `superpowers:dispatching-parallel-agents` for extractions from pure data files or files with no shared mutable state
- For god objects with shared state (App.jsx, ActionProcessor, GameStateManager), extractions must be sequential
