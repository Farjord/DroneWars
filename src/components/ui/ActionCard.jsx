// ========================================
// ACTION CARD COMPONENT - CLEAN VERSION
// ========================================
// Base size: 225px × 275px (default footer size)
// Accepts optional scale prop for enlargement in modals

import React from 'react';
import { Bolt, RefreshCw } from 'lucide-react';
import ScalingText from './ScalingText.jsx';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * ACTION CARD COMPONENT
 * @param {Object} card - Card data
 * @param {Function} onClick - Click handler
 * @param {boolean} isPlayable - Whether card can be played
 * @param {boolean} isSelected - Whether card is selected
 * @param {boolean} isDimmed - Whether card should be greyscale (when another card is selected)
 * @param {boolean} isMandatoryTarget - Whether card is mandatory target
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 */
const ActionCard = ({
  card,
  onClick,
  isPlayable,
  isSelected,
  isDimmed,
  isMandatoryTarget,
  scale = 1.0
}) => {
  const { name, cost, image, description, type, effect } = card;
  const goAgain = effect?.goAgain;
  const isEnhanced = card.id?.includes('_ENHANCED');

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();

        debugLog('CARD_PLAY', `🖱️ ActionCard clicked: ${card.name}`, {
          cardId: card.id,
          cardName: card.name,
          isPlayable,
          isMandatoryTarget,
          willCallOnClick: isPlayable || isMandatoryTarget
        });

        if (isPlayable || isMandatoryTarget) {
          onClick(card);
        } else {
          debugLog('CARD_PLAY', `🚫 Card click blocked - not playable: ${card.name}`, {
            isPlayable,
            isMandatoryTarget
          });
        }
      }}
      className={`
        rounded-lg p-[4px] relative group
        transition-all duration-200
        ${isPlayable || isMandatoryTarget ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isEnhanced ? 'card-border-shimmer-silver' : 'card-border-rotate-purple'}
        ${!isPlayable && !isMandatoryTarget ? 'saturate-50' : ''}
        ${isMandatoryTarget ? 'ring-4 ring-red-500 animate-pulse' : ''}
        ${isDimmed ? 'grayscale' : ''}
      `}
      style={{
        width: '225px',
        height: '275px',
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
            <div className="text-center min-w-0">
              <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap text-white" />
            </div>
            <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full flex-shrink-0">
              <Bolt size={14} className="text-yellow-300" />
              <span className="text-white font-bold text-sm ml-1">{cost}</span>
            </div>
          </div>

          {/* Image Section - REDUCED SIZE */}
          <div className="p-1 flex-shrink-0">
            <div className={`relative h-[80px] rounded border overflow-hidden ${
              isEnhanced ? 'border-slate-400/50' : 'border-purple-400/50'
            }`}>
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover object-center"
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Description Section - MAXIMIZED SIZE */}
          <div className={`mx-1 mb-1 flex-grow bg-black/60 backdrop-blur-sm border p-2 overflow-y-auto rounded-md ${
            isEnhanced ? 'border-slate-600/70' : 'border-purple-800/70'
          }`}>
            <p className="text-sm text-white leading-tight text-center font-exo font-normal">{description}</p>
          </div>

          {/* Footer - REDUCED HEIGHT */}
          <div className={`grid grid-cols-[auto_1fr_auto] gap-2 items-center px-2 border-t flex-shrink-0 h-6 mt-auto ${
            isEnhanced ? 'border-slate-600/70' : 'border-purple-800/70'
          }`}>
            <div className="w-4"></div>

            <div className="flex items-center justify-center">
              <span className={`text-[10px] uppercase tracking-widest font-semibold ${
                isEnhanced ? 'text-slate-400' : 'text-purple-400'
              }`}>
                {type} Card
              </span>
            </div>

            <div className="w-4 flex items-center justify-center">
              {goAgain && (
                <RefreshCw size={14} className="text-cyan-400" style={{ marginLeft: '-20px' }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionCard;