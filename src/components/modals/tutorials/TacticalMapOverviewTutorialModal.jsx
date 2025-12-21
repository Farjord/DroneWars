/**
 * TacticalMapOverviewTutorialModal.jsx
 * Tutorial for the Tactical Map Overview (sector selection)
 */

import React from 'react';
import TutorialModalBase from './TutorialModalBase.jsx';
import { getTutorialByScreen, TUTORIAL_SCREENS } from '../../../data/tutorialData.js';

function TacticalMapOverviewTutorialModal({ onDismiss }) {
  const tutorial = getTutorialByScreen(TUTORIAL_SCREENS.TACTICAL_MAP_OVERVIEW);

  return (
    <TutorialModalBase
      title={tutorial.title}
      subtitle={tutorial.subtitle}
      sections={tutorial.sections}
      onDismiss={onDismiss}
    />
  );
}

export default TacticalMapOverviewTutorialModal;
