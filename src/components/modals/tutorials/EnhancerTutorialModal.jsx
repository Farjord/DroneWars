/**
 * EnhancerTutorialModal.jsx
 * Tutorial for the Enhancer screen
 */

import React from 'react';
import TutorialModalBase from './TutorialModalBase.jsx';
import { getTutorialByScreen, TUTORIAL_SCREENS } from '../../../data/tutorialData.js';

function EnhancerTutorialModal({ onDismiss }) {
  const tutorial = getTutorialByScreen(TUTORIAL_SCREENS.ENHANCER);

  return (
    <TutorialModalBase
      title={tutorial.title}
      subtitle={tutorial.subtitle}
      sections={tutorial.sections}
      onDismiss={onDismiss}
    />
  );
}

export default EnhancerTutorialModal;
