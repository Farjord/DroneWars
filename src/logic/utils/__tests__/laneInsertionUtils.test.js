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

  describe('same-lane reorder (originalIndex adjustment)', () => {
    it('adjusts index when drone removed from before insertion point', () => {
      // Drone was at index 0, moving to index 2
      // After removal: [b, c] — adjusted target is index 1
      const lane = [makeDrone('b'), makeDrone('c')]; // 'a' already removed
      insertDroneInLane(lane, makeDrone('a'), 2, 0);
      expect(lane.map(d => d.id)).toEqual(['b', 'a', 'c']);
    });

    it('does not adjust when drone removed from after insertion point', () => {
      // Drone was at index 2, moving to index 0
      // After removal: [a, b] — no adjustment needed
      const lane = [makeDrone('a'), makeDrone('b')]; // 'c' already removed
      insertDroneInLane(lane, makeDrone('c'), 0, 2);
      expect(lane.map(d => d.id)).toEqual(['c', 'a', 'b']);
    });

    it('does not adjust when originalIndex equals insertionIndex', () => {
      const lane = [makeDrone('b')]; // 'a' already removed
      insertDroneInLane(lane, makeDrone('a'), 1, 1);
      expect(lane.map(d => d.id)).toEqual(['b', 'a']);
    });
  });
});
