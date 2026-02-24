// ========================================
// ACTION CARD COMPONENT - CLEAN VERSION
// ========================================
// Base size: 225px × 275px (default footer size)
// Accepts optional scale prop for enlargement in modals

import React from 'react';
import { Power, RefreshCw, Cpu, ChevronsUp } from 'lucide-react';
import ScalingText from './ScalingText.jsx';
import RaritySymbol from './RaritySymbol.jsx';
import { debugLog } from '../../utils/debugLogger.js';
import { getCardBorderClasses, getTypeInnerColors } from '../../logic/cards/cardBorderUtils.js';

// Helper function to get type-based colors with rarity-based border
const getTypeColors = (type, rarity, isDisabled) => {
  return {
    border: getCardBorderClasses(type, rarity, isDisabled),
    ...getTypeInnerColors(type)
  };
};

// Helper function to get effect label for LANES_CONTROLLED cards
const getEffectLabel = (card) => {
  const effectType = card.effect?.effects?.[0]?.type;
  if (effectType === 'GAIN_ENERGY') return 'energy';
  if (effectType === 'DRAW_CARDS' || effectType === 'DRAW') return 'cards';
  return 'effect';
};

/**
 * ACTION CARD COMPONENT
 * @param {Object} card - Card data
 * @param {Function} onClick - Click handler
 * @param {boolean} isPlayable - Whether card can be played
 * @param {boolean} isSelected - Whether card is selected
 * @param {boolean} isDimmed - Whether card should be greyscale (when another card is selected)
 * @param {Object} mandatoryAction - Mandatory action object (for discard/destroy highlighting)
 * @param {number} excessCards - Number of excess cards (for phase-based discard)
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 */
const ActionCard = ({
  card,
  onClick,
  isPlayable,
  isSelected,
  isDimmed,
  isDragging = false,
  isCostSelectionTarget = false,
  hasMomentumGlow = false,
  mandatoryAction = null,
  excessCards = 0,
  scale = 1.0,
  lanesControlled
}) => {
  const { name, cost, image, description, type, effect, rarity } = card;
  const goAgain = effect?.goAgain;

  // Calculate if this card is a mandatory target for discard/destroy
  const isMandatoryTarget = mandatoryAction?.type === 'discard' &&
    (!mandatoryAction.fromAbility ? excessCards > 0 : true);

  // Determine if card is disabled (not playable and not a mandatory target)
  const isDisabled = !isPlayable && !isMandatoryTarget;

  // Get type-based colors with rarity-based border effects
  const colors = getTypeColors(type, rarity, isDisabled);

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
    backfaceVisibility: 'hidden',
    WebkitFontSmoothing: 'antialiased'
  } : {};

  // Debug logging for ALL renders to diagnose re-rendering issue
  debugLog('CARD_PLAY', `🎨 ActionCard rendering - ${card.name}:`, {
    cardName: card.name,
    isPlayable,
    isMandatoryTarget,
    hasExpectedClasses: isMandatoryTarget,
    timestamp: Date.now()
  });

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();

        debugLog('CARD_PLAY', `🖱️ ActionCard clicked: ${card.name}`, {
          cardId: card.id,
          cardName: card.name,
          isPlayable,
          isMandatoryTarget,
          isCostSelectionTarget,
          willCallOnClick: isPlayable || isMandatoryTarget || isCostSelectionTarget
        });

        if ((isPlayable || isMandatoryTarget || isCostSelectionTarget) && onClick && !isDragging) {
          onClick(card);
        } else if (!onClick || isDragging) {
          debugLog('CARD_PLAY', `🚫 Card click blocked - ${!onClick ? 'onClick is null' : 'drag in progress'}: ${card.name}`, {
            isPlayable,
            isDragging,
            hasOnClick: !!onClick
          });
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
        ${colors.border}
        ${isDisabled ? 'saturate-50' : ''}
        ${isDimmed ? 'grayscale' : ''}
        ${isDragging ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/50' : ''}
        ${isCostSelectionTarget ? 'ring-2 ring-cyan-400' : ''}
      `}
      style={{
        width: '225px',
        height: '275px',
        flexShrink: 0,
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
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center py-1 pl-3 pr-1 bg-black/40 flex-shrink-0 h-8">
            <div className="text-center min-w-0">
              <ScalingText
                text={name}
                className={`font-orbitron text-sm uppercase tracking-widest whitespace-nowrap ${hasMomentumGlow ? 'momentum-title-glow' : 'text-white'}`}
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Momentum Cost Chip (if applicable) */}
              {card.momentumCost && (
                <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
                  <ChevronsUp size={14} className="text-blue-400" />
                  <span className="text-white font-bold text-sm ml-1">{card.momentumCost}</span>
                </div>
              )}
              {/* Energy Cost Chip */}
              <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
                <Power size={14} className="text-yellow-300" />
                <span className="text-white font-bold text-sm ml-1">{cost}</span>
              </div>
            </div>
          </div>

          {/* Image Section - REDUCED SIZE */}
          <div className="p-1 flex-shrink-0">
            <div className={`relative h-[80px] rounded border overflow-hidden ${colors.imageBorder}`}>
              <img
                src={image}
                alt={name}
                className={`w-full h-full object-cover object-center ${!isPlayable && !isMandatoryTarget ? 'grayscale' : ''}`}
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Description Section - MAXIMIZED SIZE */}
          <div className={`mx-1 mb-1 flex-grow bg-black/60 backdrop-blur-sm border p-2 rounded-md flex flex-col ${colors.descBorder}`}>
            <div className="flex-grow">
              <ScalingText text={description} className="text-sm text-white leading-tight text-center font-exo font-normal" />
            </div>
            {/* Slot Cost - moved from footer */}
            {type === 'Upgrade' && card.slots && (
              <div className="mt-auto pt-1 border-t border-slate-700/50 flex items-center justify-center gap-1">
                <Cpu size={12} className="text-purple-400" />
                <span className="text-[10px] text-purple-400 font-bold">Slot Cost: {card.slots}</span>
              </div>
            )}
            {/* Dynamic Helper Text for lane control cards */}
            {effect?.condition === 'LANES_CONTROLLED' && lanesControlled !== undefined && (
              <div className="text-[10px] text-cyan-300 text-center mt-1">
                (Currently {lanesControlled * (effect.effects?.[0]?.value || 1)} {getEffectLabel(card)})
              </div>
            )}
          </div>

          {/* Footer - REDUCED HEIGHT */}
          <div className={`grid grid-cols-[auto_1fr_auto] gap-2 items-center px-2 border-t flex-shrink-0 h-6 mt-auto ${colors.footerBorder}`}>
            {/* Left: Rarity Symbol */}
            <div className="w-8 flex items-center justify-start">
              <RaritySymbol rarity={card.rarity || 'Common'} size={14} />
            </div>

            {/* Center: Type Label */}
            <div className="flex items-center justify-center">
              <span className={`text-[10px] uppercase tracking-widest font-semibold ${colors.typeText}`}>
                {type} Card
              </span>
            </div>

            {/* Right: Go Again Indicator */}
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