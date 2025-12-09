# Unit Testing Requirements
## Drone Wars Game - Combat Logic Testing Framework

**Date:** 2025-12-03
**Status:** Implementation Ready
**Priority:** High

---

## Objective

Implement comprehensive unit testing framework for Drone Wars game with focus on **combat logic and drone attack patterns**. Tests must be runnable via simple npm commands without requiring additional software installation.

---

## Testing Framework

**Selected:** Vitest + @vitest/ui

**Rationale:**
- Native Vite integration (no additional configuration needed)
- Simple npm commands for execution
- Free browser-based UI for test visualization
- ES Modules native support (matches project's `"type": "module"`)
- Fast execution with Hot Module Replacement
- Zero impact on production builds/deployment

**Dependencies Installed:**
```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

---

## Target Modules (Priority Order)

### Phase 1: Foundation Logic

#### 1. statsCalculator.js (HIGHEST PRIORITY)
**Path:** `src/logic/statsCalculator.js`

**Scope:**
- Pure calculation functions for drone and ship stats
- Zero side effects, perfect for testing
- Foundation for ALL combat mechanics

**Functions to Test:**
- `getShipStatus()` - Ship section status determination
- `calculateSectionBaseStats()` - Section stat computation with modifiers
- `calculateEffectiveStats()` - Drone stat calculation with upgrades, abilities, auras
- `calculateEffectiveShipStats()` - Ship stats aggregation

**Test Scenarios:**
- Basic stat calculations without modifiers
- Upgrade modifiers (+attack, +speed, +shields)
- Permanent stat mods (statMods array)
- Conditional abilities (FLANKING_BONUS, CONDITIONAL_MODIFY_STAT)
- Aura effects (FRIENDLY_IN_LANE)
- Ship section stats with status (healthy/damaged/critical)
- Middle lane bonuses
- Minimum value enforcement (cost ≥ 0, hull ≥ 1)
- Edge cases (null, undefined, empty arrays)

**Expected Coverage:** >90%

---

#### 2. InterceptionProcessor.js
**Path:** `src/logic/combat/InterceptionProcessor.js`

**Scope:**
- Interception determination logic
- Speed comparison mechanics
- Keyword handling (ALWAYS_INTERCEPTS)

**Functions to Test:**
- `calculatePotentialInterceptors()` - Player interception logic
- `calculateAiInterception()` - AI interception decisions

**Test Scenarios:**
- Speed-based interception (faster intercepts slower)
- ALWAYS_INTERCEPTS keyword bypass
- Exhausted drones cannot intercept
- Lane matching requirements
- Multiple potential interceptors
- Empty interceptor arrays for invalid cases
- AI-specific interception logic
- Target exclusion from interceptor list

**Expected Coverage:** >85%

---

#### 3. AttackProcessor.js
**Path:** `src/logic/combat/AttackProcessor.js`

**Scope:**
- Core combat resolution engine
- Most complex combat logic in codebase

**Functions to Test:**
- `resolveAttack()` - Main attack resolution
- `calculateAfterAttackStateAndEffects()` - Post-attack abilities

**Test Scenarios:**
- Basic drone vs drone attacks
- Shield absorption then hull damage
- Piercing damage bypassing shields
- Overkill damage handling
- Attacker exhaustion
- Drone destruction (hull ≤ 0)
- Interception mechanics integration
- After-attack abilities:
  - DESTROY_SELF (Kamikaze drones)
  - PERMANENT_STAT_MOD (stat gain after attack)
- Bonus damage vs ships (BONUS_DAMAGE_VS_SHIP)
- Animation event generation (7 event types)
- Aura updates after destruction
- State immutability verification

**Expected Coverage:** >75% (complex integration logic)

---

## Configuration Requirements

### 1. vite.config.js
Add test configuration block:

```javascript
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.js'],
  include: ['**/*.{test,spec}.{js,jsx}'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/',
      'src/test/',
      '**/*.config.js',
      '**/main.jsx'
    ]
  },
  globals: true,
}
```

### 2. package.json Scripts
Add test commands:

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

### 3. Test Setup File
**Path:** `src/test/setup.js` (NEW FILE)

Purpose: Global test configuration and utilities

---

## File Organization

**Convention:** Co-located tests (test files next to source)

**Structure:**
```
src/
├── logic/
│   ├── statsCalculator.js
│   ├── statsCalculator.test.js          ← NEW
│   └── combat/
│       ├── AttackProcessor.js
│       ├── AttackProcessor.test.js      ← NEW
│       ├── InterceptionProcessor.js
│       └── InterceptionProcessor.test.js ← NEW
└── test/
    └── setup.js                          ← NEW
```

**Naming Convention:**
- Logic tests: `*.test.js`
- Component tests: `*.test.jsx` (future)

---

## Testing Commands

| Command | Purpose | Use Case |
|---------|---------|----------|
| `npm test` | Watch mode (auto-rerun on changes) | Active development |
| `npm run test:ui` | Browser visual UI | Test exploration, debugging |
| `npm run test:run` | One-time execution | CI/CD, quick verification |
| `npm run test:coverage` | Generate coverage report | Pre-commit, coverage analysis |

---

## Success Metrics

### Initial Implementation (Phase 1)
- ✅ 3 test files created
- ✅ 20+ passing tests
- ✅ Coverage >80% for statsCalculator.js
- ✅ Coverage >75% for InterceptionProcessor.js
- ✅ Coverage >60% for AttackProcessor.js
- ✅ All tests runnable via npm commands
- ✅ Browser UI functional

### Long-term Goals
- **Critical logic:** >80% coverage
- **Combat system:** >75% coverage
- **Utilities:** >85% coverage
- **UI components:** >60% coverage (future)

---

## Future Expansion

### Phase 2: Advanced Combat Logic
- DroneTargetingProcessor.js (Jammer keyword)
- DamageEffectProcessor.js (Splash, overflow)
- BaseTargetingProcessor.js (Targeting utilities)

### Phase 3: Game Engine
- WinConditionChecker.js
- gameEngineUtils.js
- droneStateUtils.js
- auraManager.js

### Phase 4: UI Components
- CardStatHexagon.jsx (simple presentational)
- InterceptedBadge.jsx (state + effects)
- DroneToken.jsx (complex interactive)

### Phase 5: Integration Tests
- Full combat scenarios
- Multi-step ability chains
- Turn flow validation

---

## Testing Patterns

### CRITICAL REQUIREMENT: Explanatory Comments on Every Test

**MANDATORY:** Every single test MUST include clear explanatory comments that explain:
1. What the test is checking
2. Why this test matters (what game behavior depends on it)
3. What the expected behavior is

**Why This Matters:**
- Allows non-developers to review and verify tests
- Makes test failures easier to understand
- Documents game behavior alongside the code
- Enables confident test maintenance

**Format:**
```javascript
it('description', () => {
  // EXPLANATION: This test verifies that [what we're testing] because [why it matters].
  // Expected: [what should happen in plain English]

  // Arrange - Setup test data
  const drone = { id: 'drone1', name: 'Fighter' }

  // Act - Execute function
  const result = calculateStats(drone)

  // Assert - Verify outcome
  expect(result.attack).toBe(5)
})
```

**Good Example:**
```javascript
it('returns "healthy" when hull is above damaged threshold', () => {
  // EXPLANATION: This test verifies that ships with full or high hull are correctly
  // identified as "healthy" status. This is critical because ship status determines
  // which stats are active (healthy ships have full stats, damaged ships have reduced stats).
  // Expected: Ship section with hull=10 (above damaged threshold of 6) should return "healthy"

  const section = {
    hull: 10,
    thresholds: { damaged: 6, critical: 3 }
  }
  expect(getShipStatus(section)).toBe('healthy')
})
```

**Bad Example (Missing Explanation):**
```javascript
it('returns "healthy" when hull is above damaged threshold', () => {
  const section = {
    hull: 10,
    thresholds: { damaged: 6, critical: 3 }
  }
  expect(getShipStatus(section)).toBe('healthy')
})
// ❌ No explanation - reviewer doesn't understand what's being tested or why
```

### AAA Pattern (Arrange-Act-Assert)

All tests should follow this structure:

```javascript
it('description', () => {
  // EXPLANATION: [Clear explanation]
  // Expected: [Expected outcome]

  // Arrange - Setup test data
  const drone = { id: 'drone1', name: 'Fighter' }

  // Act - Execute function
  const result = calculateStats(drone)

  // Assert - Verify outcome
  expect(result.attack).toBe(5)
})
```

### Test Data Management
- Use minimal mock data (only required fields)
- Create test data builders for complex objects
- Mock external dependencies (droneData imports)
- Use consistent seed values for deterministic tests

### Naming Conventions
```javascript
describe('ModuleName', () => {
  describe('functionName()', () => {
    it('does X when Y', () => {
      // Test implementation
    })
  })
})
```

---

## Critical Files

### To Create
1. `src/test/setup.js` - Global test setup
2. `src/logic/statsCalculator.test.js` - Stats calculation tests
3. `src/logic/combat/InterceptionProcessor.test.js` - Interception tests
4. `src/logic/combat/AttackProcessor.test.js` - Attack resolution tests

### To Modify
1. `vite.config.js` - Add test configuration
2. `package.json` - Add test scripts

---

## Non-Functional Requirements

### Performance
- Test suite should run in <5 seconds
- Individual test files should complete in <1 second
- Watch mode should provide instant feedback

### Maintainability
- Tests should be self-documenting (clear descriptions)
- No test interdependencies (each test isolated)
- Mock only when necessary (prefer real data)

### CI/CD Integration
- Tests must pass before deployment
- Coverage reports generated automatically
- Failed tests block merges (future)

### Developer Experience
- Simple commands (no complex setup)
- Fast feedback loop (watch mode)
- Visual UI for exploration (test:ui)
- Clear error messages

---

## Deployment Impact

**Production Builds:**
- Test files excluded automatically (*.test.js pattern)
- No impact on bundle size
- Coverage folder not deployed
- Vitest dev dependency (not in production)

**Electron Packaging:**
- Test files not included in packaged app
- No runtime dependencies on test framework

**GitHub Actions:**
- `npm run test:run` in CI pipeline (future)
- Coverage reports uploaded to artifacts (future)

---

## Notes

- Tests focus on **combat logic** as requested
- Framework selected for **simplicity** (npm commands only)
- **Browser UI included** (free, no additional software)
- **Zero impact** on existing build/deploy process
- Foundation for **future expansion** to full codebase coverage

---

## Implementation Checklist

- [x] Dependencies installed (vitest, @vitest/ui, etc.)
- [ ] vite.config.js configured
- [ ] package.json scripts added
- [ ] src/test/setup.js created
- [ ] statsCalculator.test.js created (with explanatory comments on EVERY test)
- [ ] InterceptionProcessor.test.js created (with explanatory comments on EVERY test)
- [ ] AttackProcessor.test.js created (with explanatory comments on EVERY test)
- [ ] All tests passing
- [ ] Coverage >80% for priority modules
- [ ] Browser UI verified working
- [ ] All tests reviewed for clear explanatory comments

---

**Estimated Implementation Time:** 1-2 hours
**Complexity:** Medium
**Risk:** Low (isolated from production code)
