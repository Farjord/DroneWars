import React from 'react';
import ActionCard from './ActionCard.jsx';

const CardDetailPopup = ({ card, onClose }) => {
  if (!card) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        <ActionCard
          card={card}
          onClick={() => {}}
          isPlayable={true}
          isSelected={false}
          mandatoryAction={null}
          excessCards={0}
          scale={1.5}
        />
      </div>
    </div>
  );
};

export default CardDetailPopup;
