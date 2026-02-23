// --- TargetingArrowLayer ---
// Renders all targeting arrows and interception lines as an overlay.
// Pure render component — no state or effects.

import React from 'react';
import TargetingArrow from './TargetingArrow.jsx';
import InterceptionTargetLine from './InterceptionTargetLine.jsx';
import InterceptionSelectionLine from './InterceptionSelectionLine.jsx';

const TargetingArrowLayer = ({
  arrowState,
  cardDragArrowState,
  droneDragArrowState,
  actionCardDragArrowState,
  costReminderArrowState,
  arrowLineRef,
  cardDragArrowRef,
  droneDragArrowRef,
  actionCardDragArrowRef,
  costReminderArrowRef,
  playerInterceptionChoice,
  interceptionModeActive,
  selectedInterceptor,
  droneRefs,
  sectionRefs,
  gameAreaRef,
}) => (
  <>
    <TargetingArrow visible={arrowState.visible} start={arrowState.start} end={arrowState.end} lineRef={arrowLineRef} />
    <TargetingArrow visible={cardDragArrowState.visible} start={cardDragArrowState.start} end={cardDragArrowState.end} lineRef={cardDragArrowRef} color="#22d3ee" />
    <TargetingArrow visible={droneDragArrowState.visible} start={droneDragArrowState.start} end={droneDragArrowState.end} lineRef={droneDragArrowRef} color="#ff0055" showPulses={false} />
    <TargetingArrow visible={actionCardDragArrowState.visible} start={actionCardDragArrowState.start} end={actionCardDragArrowState.end} lineRef={actionCardDragArrowRef} color="#22d3ee" />
    <TargetingArrow visible={costReminderArrowState.visible} start={costReminderArrowState.start} end={costReminderArrowState.end} lineRef={costReminderArrowRef} color="#22d3ee" showPulses={false} zIndex={15} />
    <InterceptionTargetLine
      visible={!!playerInterceptionChoice}
      attackDetails={playerInterceptionChoice?.attackDetails}
      droneRefs={droneRefs}
      shipSectionRefs={sectionRefs}
      gameAreaRef={gameAreaRef}
    />
    <InterceptionSelectionLine
      visible={!!(interceptionModeActive && selectedInterceptor)}
      interceptor={selectedInterceptor}
      attacker={playerInterceptionChoice?.attackDetails?.attacker}
      droneRefs={droneRefs}
      gameAreaRef={gameAreaRef}
    />
  </>
);

export default React.memo(TargetingArrowLayer);
