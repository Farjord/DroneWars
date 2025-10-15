// ========================================
// ADD CARD TO HAND MODAL (DEBUG FEATURE)
// ========================================
// Debug modal for adding cards to either player's hand during gameplay
// Uses DeckBuildingModal for card selection with tab interface

import { useState } from 'react';
import { X } from 'lucide-react';
import DeckBuildingModal from './DeckBuildingModal.jsx';
import fullCardCollection from '../../data/cardData.js';

/**
 * AddCardToHandModal - Debug feature for adding cards to hands
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {function} onConfirm - Confirm handler receiving {playerId, selectedCards}
 * @param {string} gameMode - Game mode ('local', 'host', 'guest')
 */
function AddCardToHandModal({ isOpen, onClose, onConfirm, gameMode }) {
  // Tab state: 'local' or 'opponent'
  const [selectedTab, setSelectedTab] = useState('local');

  // Show deck building modal for card selection
  const [showCardSelection, setShowCardSelection] = useState(false);

  if (!isOpen) return null;

  // Determine player labels based on game mode
  const getLocalPlayerLabel = () => {
    if (gameMode === 'local') return 'Player 1 (You)';
    if (gameMode === 'host') return 'Player 1 (You)';
    if (gameMode === 'guest') return 'Player 2 (You)';
    return 'Your Hand';
  };

  const getOpponentPlayerLabel = () => {
    if (gameMode === 'local') return 'Player 2 (AI)';
    return 'Opponent';
  };

  // Determine actual player ID based on tab and game mode
  const getTargetPlayerId = (tab) => {
    if (tab === 'local') {
      // Local player
      if (gameMode === 'guest') return 'player2';
      return 'player1';
    } else {
      // Opponent
      if (gameMode === 'guest') return 'player1';
      return 'player2';
    }
  };

  const handleOpenCardSelection = (tab) => {
    setSelectedTab(tab);
    setShowCardSelection(true);
  };

  const handleCardSelectionConfirm = (selectedCards) => {
    const targetPlayerId = getTargetPlayerId(selectedTab);
    onConfirm({ playerId: targetPlayerId, selectedCards });
    setShowCardSelection(false);
    onClose();
  };

  return (
    <>
      {/* Main Modal */}
      {!showCardSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-cyan-500 shadow-2xl max-w-2xl w-full p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white heading-font">Add Card to Hand</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Description */}
            <p className="text-gray-400 mb-6">
              Select which player's hand you want to add cards to, then choose the cards.
            </p>

            {/* Tab Buttons */}
            <div className="grid grid-cols-2 gap-4">
              {/* Local Player Tab */}
              <button
                onClick={() => handleOpenCardSelection('local')}
                className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 hover:from-cyan-800/50 hover:to-blue-800/50 border-2 border-cyan-500/50 hover:border-cyan-400 rounded-lg transition-all"
              >
                <div className="text-4xl">🙋</div>
                <div className="text-lg font-bold text-cyan-400">
                  {getLocalPlayerLabel()}
                </div>
                <div className="text-sm text-gray-400">
                  Add cards to your hand
                </div>
              </button>

              {/* Opponent Tab */}
              <button
                onClick={() => handleOpenCardSelection('opponent')}
                className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-pink-900/40 to-red-900/40 hover:from-pink-800/50 hover:to-red-800/50 border-2 border-pink-500/50 hover:border-pink-400 rounded-lg transition-all"
              >
                <div className="text-4xl">🤖</div>
                <div className="text-lg font-bold text-pink-400">
                  {getOpponentPlayerLabel()}
                </div>
                <div className="text-sm text-gray-400">
                  Add cards to opponent's hand
                </div>
              </button>
            </div>

            {/* Debug Warning */}
            <div className="mt-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-lg">
              <p className="text-orange-400 text-sm">
                ⚠️ <strong>Debug Feature:</strong> This is a development tool. Added cards will appear in the selected player's hand immediately.
              </p>
            </div>

            {/* Cancel Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={onClose}
                className="btn-cancel px-6 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Selection Modal */}
      <DeckBuildingModal
        isOpen={showCardSelection}
        onClose={() => setShowCardSelection(false)}
        onConfirm={handleCardSelectionConfirm}
        initialSelection={{}}
        allCards={fullCardCollection}
        title={`Select Cards for ${selectedTab === 'local' ? getLocalPlayerLabel() : getOpponentPlayerLabel()}`}
        minCards={0}
      />
    </>
  );
}

export default AddCardToHandModal;
