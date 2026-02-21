## Context Efficiency

### Subagent Discipline

*Context-aware delegation:*
 - Under ~50k context: prefer inline work for tasks under ~5 tool calls.
 - Over ~50k context: prefer subagents for self-contained tasks, even simple ones — the per-call token tax on large contexts adds up fast.

When using subagents, include output rules: "Final response under 2000 characters. List outcomes, not process."
Never call TaskOutput twice for the same subagent. If it times out, increase the timeout — don't re-read.

### File Reading
Read files with purpose. Before reading a file, know what you're looking for.
Use Grep to locate relevant sections before reading entire large files.
Never re-read a file you've already read in this session.
For files over 500 lines, use offset/limit to read only the relevant section.

### Responses
Don't echo back file contents you just read — the user can see them.
Don't narrate tool calls ("Let me read the file..." / "Now I'll edit..."). Just do it.
Keep explanations proportional to complexity. Simple changes need one sentence, not three paragraphs.

*Tables — STRICT RULES (apply everywhere, always):*
- Markdown tables: use minimum separator (|-|-|). Never pad with repeated hyphens (|---|---|).
- NEVER use box-drawing / ASCII-art tables with characters like ┌, ┬, ─, │, └, ┘, ├, ┤, ┼. These are completely banned.
- No exceptions. Not for "clarity", not for alignment, not for terminal output.

## Code Standards

Refer to `Design/Technical Debt Refactor/CODE_STANDARDS.md` for full standards.

### Quick Reference
- **Single responsibility**: Each file should own one clear concern.
- **File type purity**: Data files contain data only — no helpers, factories, or query functions. One modal per file. One animation per file. See CODE_STANDARDS.md for full type rules.
- **Size awareness**: Files over 400 lines warrant a cohesion review. Over 800 lines is a strong signal to split. These are guidelines — a cohesive file shouldn't be split just to hit a number.
- **Tests**: Place in `__tests__/` subfolder within the source directory. Name: `<Source>.test.js(x)`.
- **Before completing work**: Check that new/modified files follow naming conventions, tests are in `__tests__/`, file types are pure (no mixing concerns), and no file has grown unreasonably.

## Git Workflow

- **No feature branches**: Work directly on master. No worktrees, no feature branches for refactoring work.
- **Auto-commit after refactors**: After completing each refactoring task (tests pass, build clean), commit with a descriptive title. Do NOT push — the user will push manually. Format: `Refactor: <file> — <what changed>`.
- **Commit before risky changes**: Before starting a refactor that touches many imports, create a checkpoint commit.

## Testing Philosophy

- **Test intent, not implementation**: Tests verify *what* code does (behavior, outcomes, contracts), not *how*. Test public interfaces. Assert on observable results.
- **Refactoring safety net**: Before extracting code, ensure tests exist for the behaviors being moved. Write them first if missing. Tests must pass before and after.
- **No mocking internals**: Mock at boundaries (network, storage, timers), not between internal modules.

## Logging

- **All logging MUST use `debugLog()` from `src/utils/debugLogger.js`** — no raw `console.log` in source files.
- **Use existing categories** where applicable. Add new categories to `DEBUG_CONFIG.categories` only when genuinely new concerns arise.
- **Refine logging during refactors** — when touching a file, ensure its logging is consistent, categorized, and useful for debugging.
- **Fix noisy logs** — logs must fire exactly once when the relevant event occurs, not on every render cycle or useEffect update. If a debugLog is inside a useEffect, ensure it only triggers on the specific dependency change it's tracking, not on every re-render. Guard with condition checks where necessary.

## Comments

- **Comments must be useful for Claude (AI context), not decorative.** Only three types of comments are permitted:
  1. **Code explanation** — explains WHY something works the way it does, the pattern being used, or non-obvious implementation details. Not what the code does (that should be self-evident).
  2. **Section separators** — brief labels to delineate logical sections in longer files (e.g., `// --- Targeting Logic ---`). Keep minimal.
  3. **TODO comments** — `// TODO: <actionable description>` for work that still needs to be done.
- **Banned comment patterns**: `// NEW`, `// CHANGED`, `// ADDED`, `// MODIFIED`, `// Updated for X`, `// Refactored`, or any comment that describes *what changed* rather than *what the code does*. These are noise.
- **Remove stale comments** during refactoring — comments that describe code that no longer exists or behavior that has changed.

## Code Review Standard

- **Every refactored file must pass review by a strict principal technical architect agent** before being committed. The review checks: best practices, clean architecture, no code smell, proper patterns, intent-based tests, correct logging, useful comments only, and no dead code.
- Use `superpowers:code-reviewer` agent after completing each file refactor.

## Refactoring Process

- **Understand before changing.** Before modifying any code during a refactor:
  1. Read and understand every function/block being touched
  2. Document its current behavior, intent, contracts, and edge cases in a `## Behavioral Baseline` section of the refactor plan doc
  3. Describe what the code does, what it depends on, what depends on it, and any non-obvious design decisions
  4. This baseline is **immutable** — once written, it must not be edited or removed, even after the refactor is complete. It is the permanent "before" record.
- **State changes explicitly.** For every change, clearly state: what is being changed, why, what behavior is preserved, and what behavior (if any) is intentionally altered.
- **Small, verifiable steps.** Each commit must be independently testable. If a step breaks something, we must be able to identify exactly which change caused it by referencing the behavioral baseline.
- **When in doubt, ask.** If the intent behind existing code is unclear, flag it for discussion rather than guessing. Many patterns exist for good reasons that aren't obvious.

### Mandatory Refactoring Workflow

Every file refactor MUST follow these phases. Skills listed are mandatory, not optional.

**Phase 0 — Pre-flight:**
1. Run `tech-debt-review` skill to capture the "before" state

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

### Behavioral Baseline Template

Every `## Behavioral Baseline` section in a REFACTOR_*.md must include these subsections:

- **Exports / public API** — every exported function, constant, class, and its contract (params, return, side effects)
- **State mutations and their triggers** — what state is changed, by which methods, and what triggers them
- **Side effects** — animations fired, events emitted, network calls, localStorage writes
- **Known edge cases** — race conditions, null guards, fallback behaviors, timing dependencies

### Minimum Viable Test Coverage

Phase 2 (Test First) requires at minimum:
- All exported functions / public API methods must have at least one test
- Internal helpers tested indirectly through public API (not directly)
- For untested god objects: test the top-level orchestration paths first, not every internal branch

### Integration Smoke Test Checklist

After each extraction step in Phase 3, verify:
- [ ] App loads without console errors
- [ ] Deploy a drone to the board
- [ ] Play a card from hand
- [ ] Complete one combat round
- [ ] Save and load a game

### Refactoring Order

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

### Refactoring Documentation (Non-Negotiable)

Every refactoring task MUST update these docs before the final commit:
- **REFACTOR_*.md Change Log** — append a row per completed step (date, change, behavior preserved/altered, deviations)
- **REFACTOR_PLAN.md** — mark the file's status as [x] Complete with date and summary in Notes column
- **Implementation plan** — save the session's plan to `Design/Technical Debt Refactor/Plans/PLAN_<FILE>.md` before starting work. Update with actual outcomes in an `## Actual Outcomes` section at the end. This is the permanent record of intent vs. reality.
- These updates are part of the deliverable. Incomplete docs = incomplete work.

### Parallel Extraction Safety Rule

- Only use `superpowers:dispatching-parallel-agents` for extractions from pure data files or files with no shared mutable state
- For god objects with shared state (App.jsx, ActionProcessor, GameStateManager), extractions must be sequential

## Interaction Paradigm

- **Drag-and-drop is the canonical model for ACTION INITIATION only**: playing cards from hand, moving drones, attacking with drones. These are drag-initiated, not click-initiated.
- **Click-based interactions remain valid** for: sub-action selections (choosing targets after a card is played), drone token abilities, ship card abilities, UI buttons, modal interactions, and any secondary selection steps within a multi-step action flow.
- **Legacy click-to-initiate-action code** (clicking a card in hand to play it, clicking to initiate a drone move/attack) is dead code and should be removed when encountered.
- When in doubt about whether a click handler is legacy or active, check if it initiates an action (legacy) or responds to a sub-selection within an already-initiated action (active).