// ========================================
// GHOST SIDE SCOPING TESTS
// ========================================
// Verifies that insertion preview ghosts and chain ghosts render only on the correct side
// (player vs opponent) based on drone ownership, not mouse position.

import { describe, it, expect } from 'vitest';
import { computeGhostIsPlayer, shouldRenderChainGhost } from '../ghostSideHelpers.js';

// --- Unit tests for the ghost rendering condition ---
// Extracted logic: ghost renders when laneId matches AND isPlayer matches

const shouldRenderGhost = (insertionPreview, lane, isPlayer) => {
  return insertionPreview?.laneId === lane && insertionPreview?.isPlayer === isPlayer;
};

describe('Ghost side scoping', () => {
  describe('shouldRenderGhost condition', () => {
    const basePrev = { laneId: 'lane1', index: 0, drone: { id: 'd1', name: 'Scout' } };

    it('renders ghost on player side when preview.isPlayer is true and lane isPlayer is true', () => {
      const preview = { ...basePrev, isPlayer: true };
      expect(shouldRenderGhost(preview, 'lane1', true)).toBe(true);
    });

    it('does NOT render ghost on opponent side when preview.isPlayer is true', () => {
      const preview = { ...basePrev, isPlayer: true };
      expect(shouldRenderGhost(preview, 'lane1', false)).toBe(false);
    });

    it('renders ghost on opponent side when preview.isPlayer is false and lane isPlayer is false', () => {
      const preview = { ...basePrev, isPlayer: false };
      expect(shouldRenderGhost(preview, 'lane1', false)).toBe(true);
    });

    it('does NOT render ghost on player side when preview.isPlayer is false', () => {
      const preview = { ...basePrev, isPlayer: false };
      expect(shouldRenderGhost(preview, 'lane1', true)).toBe(false);
    });

    it('does NOT render ghost when laneId does not match', () => {
      const preview = { ...basePrev, isPlayer: true };
      expect(shouldRenderGhost(preview, 'lane2', true)).toBe(false);
    });

    it('does NOT render ghost when preview is null', () => {
      expect(shouldRenderGhost(null, 'lane1', true)).toBe(false);
    });
  });

  describe('computeGhostIsPlayer — ownership-based side computation', () => {
    const localPlayerState = {
      dronesOnBoard: {
        lane1: [{ id: 'p1-drone1' }, { id: 'p1-drone2' }],
        lane2: [{ id: 'p1-drone3' }],
        lane3: [],
      }
    };

    it('returns true for deployment card (draggedCard truthy)', () => {
      const result = computeGhostIsPlayer({ id: 'card1', name: 'Scout' }, null, localPlayerState);
      expect(result).toBe(true);
    });

    it('returns true when drone ID is found in localPlayerState.dronesOnBoard', () => {
      const result = computeGhostIsPlayer(null, { id: 'p1-drone1' }, localPlayerState);
      expect(result).toBe(true);
    });

    it('returns true for drone in a different lane of localPlayerState', () => {
      const result = computeGhostIsPlayer(null, { id: 'p1-drone3' }, localPlayerState);
      expect(result).toBe(true);
    });

    it('returns false when drone ID is NOT found in localPlayerState.dronesOnBoard', () => {
      const result = computeGhostIsPlayer(null, { id: 'enemy-drone1' }, localPlayerState);
      expect(result).toBe(false);
    });

    it('returns false when both draggedCard and drone are null', () => {
      const result = computeGhostIsPlayer(null, null, localPlayerState);
      expect(result).toBe(false);
    });
  });

  describe('shouldRenderChainGhost — ownership-based chain ghost filter', () => {
    const localPlayerId = 'player1';

    it('renders when sel.target.owner matches localPlayerId and isPlayer is true', () => {
      const sel = { target: { id: 'd1', owner: 'player1' }, destination: 'lane1' };
      expect(shouldRenderChainGhost(sel, 'lane1', true, localPlayerId)).toBe(true);
    });

    it('does NOT render when sel.target.owner matches localPlayerId and isPlayer is false', () => {
      const sel = { target: { id: 'd1', owner: 'player1' }, destination: 'lane1' };
      expect(shouldRenderChainGhost(sel, 'lane1', false, localPlayerId)).toBe(false);
    });

    it('renders when sel.target.owner does NOT match localPlayerId and isPlayer is false', () => {
      const sel = { target: { id: 'd1', owner: 'player2' }, destination: 'lane1' };
      expect(shouldRenderChainGhost(sel, 'lane1', false, localPlayerId)).toBe(true);
    });

    it('does NOT render when sel.target.owner does NOT match localPlayerId and isPlayer is true', () => {
      const sel = { target: { id: 'd1', owner: 'player2' }, destination: 'lane1' };
      expect(shouldRenderChainGhost(sel, 'lane1', true, localPlayerId)).toBe(false);
    });

    it('does NOT render for skipped selections', () => {
      const sel = { skipped: true, target: { id: 'd1', owner: 'player1' }, destination: 'lane1' };
      expect(shouldRenderChainGhost(sel, 'lane1', true, localPlayerId)).toBe(false);
    });

    it('does NOT render when destination is a different lane', () => {
      const sel = { target: { id: 'd1', owner: 'player1' }, destination: 'lane2' };
      expect(shouldRenderChainGhost(sel, 'lane1', true, localPlayerId)).toBe(false);
    });

    it('does NOT render when sel is null', () => {
      expect(shouldRenderChainGhost(null, 'lane1', true, localPlayerId)).toBe(false);
    });

    it('does NOT render when target has no id', () => {
      const sel = { target: { owner: 'player1' }, destination: 'lane1' };
      expect(shouldRenderChainGhost(sel, 'lane1', true, localPlayerId)).toBe(false);
    });
  });

  describe('handleLaneMouseMove stores isPlayer in preview', () => {
    it('sets isPlayer: true when called from player lane', () => {
      let captured = null;
      const setInsertionPreview = (val) => { captured = val; };

      // Simulate the core logic of handleLaneMouseMove
      const simulateMouseMove = (laneId, isPlayer, drone) => {
        setInsertionPreview({ laneId, index: 0, drone, isPlayer });
      };

      simulateMouseMove('lane1', true, { id: 'd1', name: 'Scout' });
      expect(captured.isPlayer).toBe(true);
      expect(captured.laneId).toBe('lane1');
    });

    it('sets isPlayer: false when called from opponent lane', () => {
      let captured = null;
      const setInsertionPreview = (val) => { captured = val; };

      const simulateMouseMove = (laneId, isPlayer, drone) => {
        setInsertionPreview({ laneId, index: 0, drone, isPlayer });
      };

      simulateMouseMove('lane1', false, { id: 'd1', name: 'Scout' });
      expect(captured.isPlayer).toBe(false);
      expect(captured.laneId).toBe('lane1');
    });
  });

  describe('confirmationGhosts — null insertionIndex filter', () => {
    // Mirrors the filter in App.jsx confirmationGhosts computation.
    // When a chain effect's destination is auto-resolved (no drag), insertionIndex is absent.
    const confirmationGhostsFilter = sel => sel.destination != null;

    it('includes a selection with a destination and no insertionIndex', () => {
      const sel = { target: { id: 'd1', owner: 'player2' }, lane: 'lane1', destination: 'lane2' };
      expect(confirmationGhostsFilter(sel)).toBe(true);
    });

    it('includes a selection with a destination and insertionIndex = 0', () => {
      const sel = { target: { id: 'd1', owner: 'player1' }, lane: 'lane1', destination: 'lane2', insertionIndex: 0 };
      expect(confirmationGhostsFilter(sel)).toBe(true);
    });

    it('excludes a selection with no destination', () => {
      const sel = { target: { id: 'd1', owner: 'player1' }, lane: 'lane1' };
      expect(confirmationGhostsFilter(sel)).toBe(false);
    });

    it('excludes a selection with destination = null', () => {
      const sel = { target: { id: 'd1', owner: 'player1' }, lane: 'lane1', destination: null };
      expect(confirmationGhostsFilter(sel)).toBe(false);
    });
  });

  describe('onMouseMove guard — shouldFireLaneMouseMove', () => {
    // Extracted condition from SingleLaneView onMouseMove handler:
    // fires when: isPlayer || isDestinationPhase || draggedDrone?.isChainTargetDrag
    const shouldFireLaneMouseMove = (isPlayer, isDestinationPhase, isChainTargetDrag) =>
      isPlayer || isDestinationPhase || !!isChainTargetDrag;

    it('fires on player side (normal deployment drag)', () => {
      expect(shouldFireLaneMouseMove(true, false, false)).toBe(true);
    });

    it('fires on opponent side during destination phase', () => {
      expect(shouldFireLaneMouseMove(false, true, false)).toBe(true);
    });

    it('fires on opponent side during chain target drag (forced repositioning fix)', () => {
      expect(shouldFireLaneMouseMove(false, false, true)).toBe(true);
    });

    it('does NOT fire on opponent side with no drag and target phase', () => {
      expect(shouldFireLaneMouseMove(false, false, false)).toBe(false);
    });
  });
});
