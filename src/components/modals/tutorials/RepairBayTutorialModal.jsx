/**
 * RepairBayTutorialModal.jsx
 * Tutorial for the Repair Bay screen
 */

import React from 'react';
import TutorialModalBase from './TutorialModalBase.jsx';
import { getTutorialByScreen, TUTORIAL_SCREENS } from '../../../data/tutorialData.js';

function RepairBayTutorialModal({ onDismiss }) {
  const tutorial = getTutorialByScreen(TUTORIAL_SCREENS.REPAIR_BAY);

  return (
    <TutorialModalBase
      title={tutorial.title}
      subtitle={tutorial.subtitle}
      sections={tutorial.sections}
      onDismiss={onDismiss}
    />
  );
}

export default RepairBayTutorialModal;
