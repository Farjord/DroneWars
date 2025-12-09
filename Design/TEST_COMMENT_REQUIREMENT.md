# Test Comment Requirement
## Mandatory Explanatory Comments for All Unit Tests

**Date:** 2025-12-03
**Status:** MANDATORY REQUIREMENT

---

## Requirement

**Every single unit test MUST include clear explanatory comments** that explain:

1. **What** the test is checking
2. **Why** it matters (what game behavior depends on it)
3. **What** the expected behavior is

---

## Format

```javascript
it('test description', () => {
  // EXPLANATION: This test verifies that [what we're testing] because [why it matters].
  // Expected: [what should happen in plain English]

  // Arrange - Setup test data
  const data = setupTestData()

  // Act - Execute the function
  const result = functionUnderTest(data)

  // Assert - Verify the outcome
  expect(result).toBe(expectedValue)
})
```

---

## Why This Matters

### For Review
- Allows non-developers to review and understand tests
- Makes it clear what each test is validating
- Enables verification that tests match requirements

### For Maintenance
- Future developers understand the test's purpose
- Makes it easier to update tests when code changes
- Documents game behavior alongside implementation

### For Debugging
- When tests fail, comments explain what broke
- Helps identify if test or code needs fixing
- Clarifies expected vs actual behavior

---

## Good Example

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

**What this comment tells us:**
- ✅ What's being tested: Ship status determination with high hull
- ✅ Why it matters: Status determines which stats are active
- ✅ Expected result: Section returns "healthy" status
- ✅ The logic: hull=10 is above threshold of 6

---

## Bad Example

```javascript
it('returns "healthy" when hull is above damaged threshold', () => {
  const section = {
    hull: 10,
    thresholds: { damaged: 6, critical: 3 }
  }

  expect(getShipStatus(section)).toBe('healthy')
})
```

**Problems:**
- ❌ No explanation of what's being tested
- ❌ No context for why this matters
- ❌ No clear expected outcome
- ❌ Reviewer must read code to understand test

---

## Comment Template

Copy this template for each new test:

```javascript
it('describe what the test does', () => {
  // EXPLANATION: This test verifies that [specific functionality] because [reason it matters].
  // Expected: [clear description of expected behavior]

  // Test code here...
})
```

---

## Enforcement

- **Code reviews:** All tests without proper comments will be rejected
- **Implementation:** Claude will add these comments to all tests created
- **Updates:** When modifying tests, ensure comments stay accurate

---

## Examples by Test Type

### Pure Logic Test
```javascript
it('generates deterministic sequence with same seed', () => {
  // EXPLANATION: This test verifies that the seeded random number generator produces
  // identical sequences when given the same seed. This is CRITICAL for multiplayer
  // synchronization - both players must generate the same "random" numbers.
  // Expected: Two RNGs with seed 12345 should produce identical 3-number sequences

  const rng1 = new SeededRandom(12345)
  const rng2 = new SeededRandom(12345)

  const sequence1 = [rng1.random(), rng1.random(), rng1.random()]
  const sequence2 = [rng2.random(), rng2.random(), rng2.random()]

  expect(sequence1).toEqual(sequence2)
})
```

### Combat Logic Test
```javascript
it('returns empty array if attacker is exhausted', () => {
  // EXPLANATION: This test verifies that exhausted drones cannot attack and therefore
  // no interception calculation is needed. This prevents bugs where exhausted drones
  // could trigger attacks.
  // Expected: calculatePotentialInterceptors returns empty array when attacker.isExhausted = true

  const attacker = { id: 'drone1', name: 'Fighter', isExhausted: true }
  const player1 = { dronesOnBoard: { lane1: [attacker], lane2: [], lane3: [] } }
  const player2 = { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }

  const interceptors = calculatePotentialInterceptors(attacker, player1, player2, [])

  expect(interceptors).toEqual([])
})
```

### Edge Case Test
```javascript
it('enforces minimum cost of 0', () => {
  // EXPLANATION: This test verifies that drone costs cannot go negative, even with
  // cost reduction abilities or modifiers. Negative costs would break the energy system
  // and allow infinite drone deployment.
  // Expected: Drone with many cost reductions should have cost clamped to minimum of 0

  const cheapDrone = {
    ...mockDrone,
    name: 'Cheap Drone' // Cost 1 in data
  }

  const stats = calculateEffectiveStats(cheapDrone, 'lane1', mockPlayerSelf, mockPlayerOpponent, [])

  expect(stats.cost).toBeGreaterThanOrEqual(0)
})
```

---

## Summary

**Every test needs:**
1. Clear EXPLANATION comment
2. Expected outcome stated
3. Context for why it matters

**No exceptions** - this requirement applies to ALL tests.
