## Master Plan

- **Start of session**: Read `Design/Technical Debt Refactor/MASTER_PLAN.md` to know current phase and progress.
- **End of session**: Update MASTER_PLAN.md with what was completed (check boxes, update phase status).
- Supporting documentation ecosystem:
  - `Design/Technical Debt Refactor/CODE_STANDARDS.md` — refer and update as standards evolve
  - `Design/Technical Debt Refactor/FUTURE_IMPROVEMENTS.md` — resolve items when fixed, add when deferred
  - `Design/CODEBASE_AUDIT.md` — mark findings `[FIXED]` as they're addressed
  - `Design/Technical Debt Refactor/CURRENT_STATE_AUDIT.md` — update metrics after each phase

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

Refer to `Design/Technical Debt Refactor/CODE_STANDARDS.md` for all project standards.

### Zero Test Failures

- **All tests must pass before committing.** No exceptions.
- If a test fails, stop and fix it before proceeding with any other work.
- Never commit with known test failures, even if they are "unrelated" to your change.

## Git Workflow

- **No feature branches**: Work directly on master.
- **Auto-commit after completing tasks** (tests pass, build clean). Do NOT push — the user will push manually.
- **Commit before risky changes**: Before changes that touch many imports or files, create a checkpoint commit.

## Code Review

- Changes to core files should pass review by a strict principal architect agent.
- Checks: best practices, clean architecture, no code smell, correct logging, no dead code.
- Use `superpowers:code-reviewer` agent after completing significant work.

## Deferred Improvements

- Track in `Design/Technical Debt Refactor/FUTURE_IMPROVEMENTS.md`.
- When deferring an improvement, write it down in the same commit — never just say "noted for later."
- When touching a file listed there, check for applicable items and resolve them.
- **When resolving items**: move them to the `## Resolved Items` table in the same commit as the fix. Never leave stale entries in the Active/Bugs tables.

## Audit Tracking

- **Audit doc**: `Design/CODEBASE_AUDIT.md`
- When fixing an issue listed in the audit, prefix the finding with `[FIXED]` in the audit doc in the same commit.
- The audit is a historical record — don't delete findings, just mark them resolved.

## Plan Mode

- **Plan mode is sacred.** Never edit files, run non-readonly commands, or commit while plan mode is active — regardless of how trivial the change appears.
- If instructed to implement while in plan mode, call `ExitPlanMode` first, get approval, then execute.
- "It's just one line" is never a valid reason to skip the workflow.

## Refactoring

- For large-scale refactoring projects, activate the workflow in `Design/Technical Debt Refactor/REFACTORING_WORKFLOW.md`.
