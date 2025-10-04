// ========================================
// ACTION CARD COMPONENT (REDESIGNED)
// ========================================
// Renders individual action/spell cards matching DroneCard styling
// Same dimensions, borders, and fonts as DroneCard

import React from 'react';
import { Bolt, RefreshCw } from 'lucide-react';

/**
 * ACTION CARD COMPONENT
 * Renders a card with interactive states for gameplay.
 * Redesigned to match DroneCard dimensions and styling.
 * @param {Object} card - Card data object with name, cost, image, description, type, goAgain
 * @param {Function} onClick - Callback when card is clicked
 * @param {boolean} isPlayable - Whether the card can be played
 * @param {boolean} isSelected - Whether the card is currently selected
 * @param {boolean} isMandatoryTarget - Whether this card is a mandatory target
 */
const ActionCard = ({ card, onClick, isPlayable, isSelected, isMandatoryTarget }) => {
const { name, cost, image, description, type, effect } = card;
const goAgain = effect?.goAgain;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isPlayable || isMandatoryTarget) {
          onClick(card);
        }
      }}
      className={`
        w-60 h-[320px] rounded-lg p-[2px] relative group
        transition-all duration-200
        ${isPlayable || isMandatoryTarget ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isSelected ? 'bg-purple-400' : 'bg-purple-800/80'}
        ${!isPlayable && !isMandatoryTarget ? 'opacity-60' : ''}
        ${isMandatoryTarget ? 'ring-4 ring-red-500 animate-pulse' : ''}
      `}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
    >
      <div
        className={`
          w-full h-full relative flex flex-col font-orbitron text-purple-300 overflow-hidden
        `}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
      >
        {/* Background - solid color instead of full background image */}
        <div className="absolute inset-0 bg-slate-900" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header with Cost - using grid for fixed column widths */}
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center py-1 px-3 bg-black/40 flex-shrink-0 h-8">
            <div className="overflow-hidden text-center min-w-0">
              <span className="font-orbitron text-sm uppercase tracking-widest text-white inline-block truncate max-w-full">
                {name}
              </span>
            </div>
            <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full flex-shrink-0">
              <Bolt size={12} className="text-yellow-300" />
              <span className="text-white font-bold text-sm ml-1">{cost}</span>
            </div>
          </div>

          {/* Image Section - contained like before, not full background */}
          <div className="p-2 flex-shrink-0">
            <div className="relative h-32 rounded border border-purple-400/50 overflow-hidden">
              <img src={image} alt={name} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Description Section - fixed height, top-aligned text */}
          <div className="mx-2 mb-2 h-32 bg-black/60 backdrop-blur-sm border border-purple-800/70 p-2 overflow-y-auto rounded-md">
            <p className="text-sm text-gray-400 leading-tight text-center font-exo font-normal">{description}</p>
          </div>

          {/* Footer - card type with optional goAgain spiral */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center px-2 border-t border-purple-800/70 flex-shrink-0 h-12 mt-auto">
            {/* Left spacer - only visible if goAgain is true */}
            <div className="w-5">
              {/* Empty spacer for symmetry */}
            </div>
            
            {/* Center - card type (always centered) */}
            <div className="flex items-center justify-center">
              <span className="text-xs text-purple-400 uppercase tracking-widest font-semibold">
                {type} Card
              </span>
            </div>
            
            {/* Right - spiral icon if goAgain */}
            <div className="w-5 flex items-center justify-center">
              {goAgain && (
                <RefreshCw size={16} className="text-cyan-400" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionCard;