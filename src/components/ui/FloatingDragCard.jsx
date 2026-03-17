import React from 'react';
import ActionCard from './ActionCard.jsx';

const FloatingDragCard = ({ card, floatingCardRef, renderCard }) => {
  if (!card) return null;
  return (
    <div
      ref={floatingCardRef}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 200,
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 12px rgba(34, 211, 238, 0.6)',
        opacity: 0.85,
      }}
    >
      {renderCard ? renderCard(card) : <ActionCard card={card} isPlayable={true} />}
    </div>
  );
};

export default FloatingDragCard;
