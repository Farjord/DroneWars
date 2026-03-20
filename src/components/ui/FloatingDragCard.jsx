import React, { useCallback } from 'react';
import ActionCard from './ActionCard.jsx';

const FloatingDragCard = ({ card, floatingCardRef, renderCard }) => {
  // Measure the card once mounted and apply negative margin to center it,
  // avoiding translate(-50%, -50%) which causes fractional-pixel GPU blur.
  const measureRef = useCallback((el) => {
    if (typeof floatingCardRef === 'object') floatingCardRef.current = el;
    if (typeof floatingCardRef === 'function') floatingCardRef(el);
    if (el) {
      // Use rAF to measure after the browser has laid out the element
      requestAnimationFrame(() => {
        el.style.marginLeft = `${-Math.round(el.offsetWidth / 2)}px`;
        el.style.marginTop = `${-Math.round(el.offsetHeight / 2)}px`;
      });
    }
  }, [floatingCardRef]);

  if (!card) return null;
  return (
    <div
      ref={measureRef}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 200,
        boxShadow: '0 0 12px rgba(34, 211, 238, 0.6)',
        opacity: 0.85,
      }}
    >
      {renderCard ? renderCard(card) : <ActionCard card={card} isPlayable={true} />}
    </div>
  );
};

export default FloatingDragCard;
