---
name: tech-debt-review
description: Use when auditing codebase health, checking technical debt, or before planning refactoring work. Scans source files for size violations, misplaced tests, data file impurity, and naming issues.
---

# Tech Debt Review

Run a comprehensive audit of the codebase against the standards in `Design/Technical Debt Refactor/CODE_STANDARDS.md`.

## Audit Steps

Execute ALL of these checks using subagents where possible for parallelism. Final response under 2000 characters per subagent. List outcomes, not process.

### 1. File Size Analysis

Use `wc -l` on all `.js`, `.jsx`, `.ts`, `.tsx` files under `src/`. Report files exceeding thresholds:

```bash
find src/ -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn
```

Group results:
- **800+ lines** (strong smell)
- **400-799 lines** (review trigger)

### 2. Test Placement Check

Find all test files (`*.test.js`, `*.test.jsx`, `*.test.ts`, `*.test.tsx`) under `src/`. Flag any NOT inside a `__tests__/` directory.

```bash
find src/ -name "*.test.*" | grep -v "__tests__"
```

### 3. Data File Purity

For each file in `src/data/`, scan for function declarations and exports that indicate logic (not pure data):
- `function` declarations
- Arrow functions assigned to exports
- `export const ... = (` patterns

Flag files containing logic functions alongside data definitions.

### 4. File Type Purity Spot-Check

Check for common violations:
- Components (`.jsx` in `src/components/`) containing data arrays/objects (look for large array literals that aren't JSX)
- Utils (`src/utils/`) containing React imports
- Logic files (`src/logic/`) containing React imports

### 5. Naming Convention Check

Flag violations:
- `.jsx` files not in PascalCase
- Hook files not starting with `use`
- Files in `src/data/` not in camelCase

### 6. Test Coverage Gaps

For each source file in `src/`, check if a corresponding `.test.*` file exists anywhere in the tree. Report source files with no test file.

## Output Format

```markdown
# Tech Debt Audit — [DATE]

## Summary
- Files over 800 lines: X
- Files 400-799 lines: X
- Tests outside __tests__/: X
- Data files with logic: X
- Naming violations: X
- Source files without tests: X/Y (Z%)

## Critical (800+ lines)
| File | Lines | Notes |
|-|-|-|

## Warning (400-799 lines)
| File | Lines | Notes |
|-|-|-|

## Misplaced Tests
| Test file | Should be in |
|-|-|

## Data File Impurity
| File | Functions found |
|-|-|

## Naming Violations
| File | Issue |
|-|-|

## Missing Test Coverage
[List by directory, showing coverage percentage per directory]
```

Report ONLY actual findings — omit empty sections.
