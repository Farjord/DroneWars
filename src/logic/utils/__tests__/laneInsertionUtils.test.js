import { describe, it, expect } from 'vitest';
import { insertDroneInLane } from '../laneInsertionUtils.js';

describe('insertDroneInLane', () => {
  const makeDrone = (id) => ({ id, name: `Drone${id}` });

  it('appends to end when insertionIndex is null', () => {
    const lane = [makeDrone('a'), makeDrone('b')];
    insertDroneInLane(lane, makeDrone('c'), null);
    expect(lane.map(d => d.id)).toEqual(['a', 'b', 'c']);
  });

  it('appends to end when insertionIndex is undefined', () => {
    const lane = [makeDrone('a')];
    insertDroneInLane(lane, makeDrone('b'), undefined);
    expect(lane.map(d => d.id)).toEqual(['a', 'b']);
  });

  it('inserts at index 0 (front)', () => {
    const lane = [makeDrone('a'), makeDrone('b')];
    insertDroneInLane(lane, makeDrone('c'), 0);
    expect(lane.map(d => d.id)).toEqual(['c', 'a', 'b']);
  });

  it('inserts at middle index', () => {
    const lane = [makeDrone('a'), makeDrone('b'), makeDrone('c')];
    insertDroneInLane(lane, makeDrone('x'), 1);
    expect(lane.map(d => d.id)).toEqual(['a', 'x', 'b', 'c']);
  });

  it('inserts at end index (equal to length)', () => {
    const lane = [makeDrone('a'), makeDrone('b')];
    insertDroneInLane(lane, makeDrone('c'), 2);
    expect(lane.map(d => d.id)).toEqual(['a', 'b', 'c']);
  });

  it('appends when insertionIndex exceeds lane length', () => {
    const lane = [makeDrone('a')];
    insertDroneInLane(lane, makeDrone('b'), 99);
    expect(lane.map(d => d.id)).toEqual(['a', 'b']);
  });

  it('inserts into empty lane at index 0', () => {
    const lane = [];
    insertDroneInLane(lane, makeDrone('a'), 0);
    expect(lane.map(d => d.id)).toEqual(['a']);
  });

  describe('same-lane reorder (filtered-index semantics)', () => {
    it('inserts at filtered index when drone moved from front to end', () => {
      // [A, B, C] → drag A to after C → filtered midpoints [B, C] → insertionIndex = 2
      // After removal: [B, C], splice at 2 → [B, C, A]
      const lane = [makeDrone('b'), makeDrone('c')]; // 'a' already removed
      insertDroneInLane(lane, makeDrone('a'), 2);
      expect(lane.map(d => d.id)).toEqual(['b', 'c', 'a']);
    });

    it('inserts at filtered index when drone moved from end to front', () => {
      // [A, B, C] → drag C to before A → filtered midpoints [A, B] → insertionIndex = 0
      // After removal: [A, B], splice at 0 → [C, A, B]
      const lane = [makeDrone('a'), makeDrone('b')]; // 'c' already removed
      insertDroneInLane(lane, makeDrone('c'), 0);
      expect(lane.map(d => d.id)).toEqual(['c', 'a', 'b']);
    });

    it('inserts at filtered index for same position', () => {
      // [A, B] → drag A to after A's original spot → filtered [B] → insertionIndex = 1
      // After removal: [B], splice at 1 → [B, A]
      const lane = [makeDrone('b')]; // 'a' already removed
      insertDroneInLane(lane, makeDrone('a'), 1);
      expect(lane.map(d => d.id)).toEqual(['b', 'a']);
    });
  });
});
