import React from 'react';
import { Rocket, X } from 'lucide-react';
import { generateJSObjectLiteral, convertFromAIFormat } from '../../logic/cards/deckExportUtils.js';
import vsDecks from '../../data/vsModeDeckData.js';
import aiPersonalities from '../../data/aiData.js';

const DeckLoadModal = ({ onImportDeck, onClose }) => {
  const vsAIs = aiPersonalities.filter(ai => ai.modes?.includes('vs'));

  const handleLoadDeck = (deckData) => {
    convertFromAIFormat(deckData);
    const importResult = onImportDeck(generateJSObjectLiteral({
      shipId: deckData.shipId,
      decklist: deckData.decklist,
      dronePool: deckData.dronePool,
      shipComponents: deckData.shipComponents || {}
    }));
    if (importResult.success) {
      onClose();
    }
  };

  const deckRow = (deck, index) => (
    <button
      key={index}
      onClick={() => handleLoadDeck(deck)}
      className="w-full text-left p-3 rounded border border-gray-600/50 hover:border-cyan-500/60 hover:bg-cyan-900/20 transition-colors"
      style={{ background: 'rgba(17, 24, 39, 0.5)' }}
    >
      <div className="font-medium text-cyan-300 text-sm">{deck.name}</div>
      {deck.description && (
        <div className="text-gray-400 text-xs mt-1">{deck.description}</div>
      )}
    </button>
  );

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Rocket size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Load Deck</h2>
            <p className="dw-modal-header-subtitle">Load a pre-existing deck configuration</p>
          </div>
          <button onClick={onClose} className="dw-modal-close">
            <X size={20} />
          </button>
        </div>
        <div className="dw-modal-body dw-modal-scroll" style={{ maxHeight: '60vh' }}>
          <div className="mb-4">
            <h3 className="text-cyan-400 font-medium text-sm mb-2 uppercase tracking-wider">VS Decks</h3>
            <div className="flex flex-col gap-2">
              {vsDecks.map((deck, i) => deckRow(deck, `vs-${i}`))}
            </div>
          </div>
          <div>
            <h3 className="text-cyan-400 font-medium text-sm mb-2 uppercase tracking-wider">AI Decks</h3>
            <div className="flex flex-col gap-2">
              {vsAIs.map((ai, i) => deckRow(ai, `ai-${i}`))}
            </div>
          </div>
        </div>
        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckLoadModal;
