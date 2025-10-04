// ========================================
// ACTION CARD COMPONENT - CLEAN VERSION
// ========================================
// Base size: 240px × 320px (default footer size)
// Accepts optional scale prop for enlargement in modals

import React from 'react';
import { Bolt, RefreshCw } from 'lucide-react';

/**
 * ACTION CARD COMPONENT
 * @param {Object} card - Card data
 * @param {Function} onClick - Click handler
 * @param {boolean} isPlayable - Whether card can be played
 * @param {boolean} isSelected - Whether card is selected
 * @param {boolean} isMandatoryTarget - Whether card is mandatory target
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 */
const ActionCard = ({ 
  card, 
  onClick, 
  isPlayable, 
  isSelected, 
  isMandatoryTarget,
  scale = 1.0 
}) => {
  const { name, cost, image, description, type, effect } = card;
  const goAgain = effect?.goAgain;

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isPlayable || isMandatoryTarget) {
          onClick(card);
        }
      }}
      className={`
        w-[225px] h-[275px] rounded-lg p-[2px] relative group
        transition-all duration-200
        ${isPlayable || isMandatoryTarget ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isSelected ? 'bg-purple-400' : 'bg-purple-800/80'}
        ${!isPlayable && !isMandatoryTarget ? 'opacity-60' : ''}
        ${isMandatoryTarget ? 'ring-4 ring-red-500 animate-pulse' : ''}
      `}
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
        ...scaleStyle
      }}
    >
      <div
        className="w-full h-full relative flex flex-col font-orbitron text-purple-300 overflow-hidden"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-slate-900" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header with Cost */}
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

          {/* Image Section - REDUCED SIZE */}
          <div className="p-1 flex-shrink-0">
            <div className="relative h-20 rounded border border-purple-400/50 overflow-hidden">
              <img 
                src={image} 
                alt={name} 
                className="w-full h-full object-cover object-center"
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Description Section - MAXIMIZED SIZE */}
          <div className="mx-1 mb-1 flex-grow bg-black/60 backdrop-blur-sm border border-purple-800/70 p-2 overflow-y-auto rounded-md">
            <p className="text-sm text-gray-400 leading-tight text-center font-exo font-normal">{description}</p>
          </div>

          {/* Footer - REDUCED HEIGHT */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center px-2 border-t border-purple-800/70 flex-shrink-0 h-6 mt-auto">
            <div className="w-4"></div>
            
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold">
                {type} Card
              </span>
            </div>
            
            <div className="w-4 flex items-center justify-center">
              {goAgain && (
                <RefreshCw size={14} className="text-cyan-400" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionCard;