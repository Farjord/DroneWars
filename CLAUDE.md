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

- **Auto-push after refactors**: After completing each refactoring task (tests pass, build clean), commit and push to origin with a descriptive title. Format: `Refactor: <file> — <what changed>`.
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

## Interaction Paradigm

- **Drag-and-drop is the canonical model for ACTION INITIATION only**: playing cards from hand, moving drones, attacking with drones. These are drag-initiated, not click-initiated.
- **Click-based interactions remain valid** for: sub-action selections (choosing targets after a card is played), drone token abilities, ship card abilities, UI buttons, modal interactions, and any secondary selection steps within a multi-step action flow.
- **Legacy click-to-initiate-action code** (clicking a card in hand to play it, clicking to initiate a drone move/attack) is dead code and should be removed when encountered.
- When in doubt about whether a click handler is legacy or active, check if it initiates an action (legacy) or responds to a sub-selection within an already-initiated action (active).