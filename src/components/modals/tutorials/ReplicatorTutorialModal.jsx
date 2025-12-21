/**
 * ReplicatorTutorialModal.jsx
 * Tutorial for the Replicator screen
 */

import React from 'react';
import TutorialModalBase from './TutorialModalBase.jsx';
import { getTutorialByScreen, TUTORIAL_SCREENS } from '../../../data/tutorialData.js';

function ReplicatorTutorialModal({ onDismiss }) {
  const tutorial = getTutorialByScreen(TUTORIAL_SCREENS.REPLICATOR);

  return (
    <TutorialModalBase
      title={tutorial.title}
      subtitle={tutorial.subtitle}
      sections={tutorial.sections}
      onDismiss={onDismiss}
    />
  );
}

export default ReplicatorTutorialModal;
