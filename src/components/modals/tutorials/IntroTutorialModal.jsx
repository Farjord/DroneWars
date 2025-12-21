/**
 * IntroTutorialModal.jsx
 * First-time game introduction modal
 *
 * Shows when a new game starts, explains the Eremos setting,
 * player role, and hangar overview. Includes option to skip all tutorials.
 */

import React from 'react';
import TutorialModalBase from './TutorialModalBase.jsx';
import { getTutorialByScreen, TUTORIAL_SCREENS } from '../../../data/tutorialData.js';

function IntroTutorialModal({ onDismiss, onSkipAll }) {
  const tutorial = getTutorialByScreen(TUTORIAL_SCREENS.INTRO);

  return (
    <TutorialModalBase
      title={tutorial.title}
      subtitle={tutorial.subtitle}
      sections={tutorial.sections}
      onDismiss={onDismiss}
      onSkipAll={onSkipAll}
      showSkipAll={!!onSkipAll}
    />
  );
}

export default IntroTutorialModal;
