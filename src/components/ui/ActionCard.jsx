// ========================================
// ACTION CARD COMPONENT
// ========================================
// Renders individual action/spell cards in the player's hand
// Shows card image, name, cost, description, and handles click interactions

import React from 'react';
import { Bolt } from 'lucide-react';

/**
 * ACTION CARD COMPONENT
 * Renders a card with interactive states for gameplay.
 * Supports selection, playability, and mandatory targeting states.
 * @param {Object} card - Card data object with name, cost, image, description, type
 * @param {Function} onClick - Callback when card is clicked
 * @param {boolean} isPlayable - Whether the card can be played
 * @param {boolean} isSelected - Whether the card is currently selected
 * @param {boolean} isMandatoryTarget - Whether this card is a mandatory target
 */
const ActionCard = ({ card, onClick, isPlayable, isSelected, isMandatoryTarget }) => {
  const { name, cost, image, description } = card;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isPlayable || isMandatoryTarget) {
          onClick(card);
        }
      }}
      className={`
        w-52 h-72 rounded-lg p-1 relative group transition-all duration-200 flex-shrink-0
        ${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isSelected ? 'bg-purple-400' : 'bg-purple-800/80'}
        ${!isPlayable && !isMandatoryTarget ? 'grayscale' : ''}
        ${isMandatoryTarget ? 'cursor-pointer ring-2 ring-red-500 animate-pulse' : ''}
      `}
    >
      <div
        className={`
          w-full h-full bg-slate-900 flex flex-col font-orbitron text-purple-300 overflow-hidden rounded-md
          transition-all duration-200
          ${isPlayable && !isSelected ? 'group-hover:bg-slate-800' : ''}
        `}
      >
        {/* Header */}
        <div className="text-center py-1 px-2 bg-purple-900/50 flex justify-between items-center">
          <span className="font-bold text-sm uppercase tracking-wider truncate">{name}</span>
          <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
            <Bolt size={12} className="text-yellow-300" />
            <span className="text-white font-bold text-sm ml-1">{cost}</span>
          </div>
        </div>

        {/* Image */}
        <div className="p-1">
          <div className="relative h-24">
            <img src={image} alt={name} className="w-full h-full object-cover rounded" />
            <div className="absolute inset-0 border border-purple-400/50 rounded"></div>
          </div>
        </div>

        {/* Description */}
        <div className="flex-grow mx-2 my-1 bg-black/50 border border-purple-800/70 p-2 flex flex-col min-h-0">
          <div className="flex-grow relative font-exo font-normal text-purple-200">
            <p className="text-sm leading-tight text-center">{description}</p>
          </div>
        </div>

        {/* Type Footer */}
        <div className="text-center text-xs py-1 bg-purple-900/50 uppercase font-semibold tracking-widest">
          {card.type} Card
        </div>
      </div>
    </div>
  );
};

export default ActionCard;