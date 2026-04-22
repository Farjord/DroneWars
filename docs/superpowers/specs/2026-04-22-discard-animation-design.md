# Discard Announcement Animation — Design Spec

## Problem
No visual feedback when cards are discarded during action phase or round-start discard phases.

## Solution
Full-screen shatter-card overlay. Cards split into 6 CSS clip-path polygon shards that fly apart. Auto-dismisses after ~1.7s.

## Scope
- Action phase: forced discard (DiscardEffectProcessor), player-chosen discard (EffectChainProcessor.executeChainDiscard), AI draw-then-discard (DrawThenDiscardProcessor)
- Round-start: mandatory and optional discard phases, shown post-sync

## Event Shape
{ type: 'CARD_DISCARD', cards: [{ ...fullCardObject }], discardingPlayerId: 'player1' | 'player2' }

## Overlay
- Header: "You Discarded" / "Opponent Discarded"
- Cards: side-by-side ActionCard components inside ShatterCard wrappers
- All shards fly simultaneously
- Timing: appear 300ms, shatter 600ms, hold 500ms, fade 300ms = 1700ms total

## Pipeline
animationEvents[] → mapAnimationEvents → AnimationManager (CARD_DISCARD_EFFECT handler) → discardAnnouncements channel → DiscardAnnouncementOverlay

## Round-Start
After both players commit discard phase: show local player's discards first, then opponent's. Both shown sequentially via two CARD_DISCARD events emitted in CommitmentStrategy.
