import { selectTargets, hashString } from '../TargetSelector.js';
import { SeededRandom } from '../../../utils/seededRandom.js';

const makeDrone = (id, overrides = {}) => ({
  id, name: `Drone-${id}`,
  speed: 3, attack: 2, class: 1, hull: 4, shields: 1,
  ...overrides
});

const makeRng = (seed = 42) => new SeededRandom(seed);

describe('selectTargets', () => {
  const droneA = makeDrone('a', { speed: 5, attack: 3, class: 2 });
  const droneB = makeDrone('b', { speed: 3, attack: 1, class: 1 });
  const droneC = makeDrone('c', { speed: 4, attack: 3, class: 3 });

  // --- RANDOM ---

  it('RANDOM count=1 returns exactly 1 drone, deterministic with same seed', () => {
    const result1 = selectTargets([droneA, droneB, droneC], { method: 'RANDOM', count: 1 }, makeRng(42));
    const result2 = selectTargets([droneA, droneB, droneC], { method: 'RANDOM', count: 1 }, makeRng(42));
    expect(result1).toHaveLength(1);
    expect(result1[0].id).toBe(result2[0].id);
  });

  it('RANDOM count=2 returns 2 distinct drones', () => {
    const result = selectTargets([droneA, droneB, droneC], { method: 'RANDOM', count: 2 }, makeRng(42));
    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('RANDOM count > pool size returns all drones', () => {
    const result = selectTargets([droneA, droneB], { method: 'RANDOM', count: 5 }, makeRng(42));
    expect(result).toHaveLength(2);
  });

  // --- HIGHEST ---

  it('HIGHEST stat=speed returns drone with highest speed', () => {
    const result = selectTargets([droneA, droneB, droneC], { method: 'HIGHEST', stat: 'speed', count: 1 }, makeRng(42));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a'); // speed 5
  });

  it('HIGHEST with 3-way tie uses deterministic tiebreak via seed', () => {
    const d1 = makeDrone('d1', { attack: 3 });
    const d2 = makeDrone('d2', { attack: 3 });
    const d3 = makeDrone('d3', { attack: 3 });
    const result1 = selectTargets([d1, d2, d3], { method: 'HIGHEST', stat: 'attack', count: 1 }, makeRng(99));
    const result2 = selectTargets([d1, d2, d3], { method: 'HIGHEST', stat: 'attack', count: 1 }, makeRng(99));
    expect(result1).toHaveLength(1);
    expect(result1[0].id).toBe(result2[0].id);
  });

  // --- LOWEST ---

  it('LOWEST stat=class count=2 returns 2 lowest class drones', () => {
    const result = selectTargets([droneA, droneB, droneC], { method: 'LOWEST', stat: 'class', count: 2 }, makeRng(42));
    expect(result).toHaveLength(2);
    // class values: A=2, B=1, C=3 → lowest 2 are B(1) and A(2)
    const ids = result.map(d => d.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  // --- Edge cases ---

  it('empty input returns []', () => {
    expect(selectTargets([], { method: 'RANDOM', count: 1 }, makeRng())).toEqual([]);
  });

  it('no criteria (null) returns all drones unchanged', () => {
    const result = selectTargets([droneA, droneB], null, makeRng());
    expect(result).toHaveLength(2);
    expect(result).toEqual([droneA, droneB]);
  });

  it('no criteria (undefined) returns all drones unchanged', () => {
    const result = selectTargets([droneA, droneB], undefined, makeRng());
    expect(result).toHaveLength(2);
  });

  it('count=0 returns []', () => {
    expect(selectTargets([droneA], { method: 'RANDOM', count: 0 }, makeRng())).toEqual([]);
  });

  // --- getStatValue function ---

  it('unknown method returns all drones', () => {
    const result = selectTargets([droneA, droneB], { method: 'INVALID', count: 1 }, makeRng());
    expect(result).toEqual([droneA, droneB]);
  });

  // --- getStatValue function ---

  it('uses getStatValue function when provided', () => {
    // Override: droneB has effective speed 10 (highest)
    const getStatValue = (drone) => drone.id === 'b' ? 10 : drone.speed;
    const result = selectTargets(
      [droneA, droneB, droneC],
      { method: 'HIGHEST', stat: 'speed', count: 1 },
      makeRng(42),
      getStatValue
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });
});

describe('hashString', () => {
  it('produces different hashes for same-length strings', () => {
    expect(hashString('inst_1')).not.toBe(hashString('inst_2'));
  });

  it('is deterministic', () => {
    expect(hashString('test')).toBe(hashString('test'));
  });

  it('returns a non-negative integer', () => {
    const result = hashString('anything');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('handles empty string', () => {
    expect(hashString('')).toBe(5381);
  });
});
