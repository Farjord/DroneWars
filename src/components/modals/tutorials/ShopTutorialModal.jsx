/**
 * ShopTutorialModal.jsx
 * Tutorial for the Shop screen
 */

import React from 'react';
import TutorialModalBase from './TutorialModalBase.jsx';
import { getTutorialByScreen, TUTORIAL_SCREENS } from '../../../data/tutorialData.js';

function ShopTutorialModal({ onDismiss }) {
  const tutorial = getTutorialByScreen(TUTORIAL_SCREENS.SHOP);

  return (
    <TutorialModalBase
      title={tutorial.title}
      subtitle={tutorial.subtitle}
      sections={tutorial.sections}
      onDismiss={onDismiss}
    />
  );
}

export default ShopTutorialModal;
