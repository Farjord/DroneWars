// ========================================
// DECK BUILDING MODAL
// ========================================
// Visual grid-based deck building interface matching Deck Builder style
// Used in Testing Mode for deck configuration

import { useState, useMemo, useEffect } from 'react';
import { X, Search, Upload, Download, Copy, Check, AlertCircle } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';
import {
  parseJSObjectLiteral,
  generateJSObjectLiteral,
  downloadDeckFile
} from '../../logic/cards/deckExportUtils.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * DeckBuildingModal - Grid-based deck building interface
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {function} onConfirm - Confirm handler receiving deckComposition object
 * @param {object} initialSelection - Initial deck composition {cardId: quantity}
 * @param {array} allCards - Full card collection to choose from
 * @param {string} title - Modal title
 * @param {number} minCards - Minimum cards required (default: 40)
 */
function DeckBuildingModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelection = {},
  allCards = [],
  title = 'Build Deck',
  minCards = 40
}) {
  // Local deck composition state
  const [deckComposition, setDeckComposition] = useState({ ...initialSelection });

  // Sync internal state when modal opens or initialSelection changes
  useEffect(() => {
    if (isOpen) {
      setDeckComposition({ ...initialSelection });
    }
  }, [isOpen, initialSelection]);

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'cost', 'type'
  const [filterType, setFilterType] = useState('all'); // 'all', 'DRONE', 'SHIP', 'ACTION'

  // Detailed card view state
  const [detailedCard, setDetailedCard] = useState(null);

  // Import/Export modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Calculate total cards in deck
  const totalCards = useMemo(() => {
    return Object.values(deckComposition).reduce((sum, count) => sum + count, 0);
  }, [deckComposition]);

  // Filter and sort cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = allCards;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(card =>
        card.name.toLowerCase().includes(term) ||
        (card.description && card.description.toLowerCase().includes(term))
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(card => card.type === filterType);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'cost') {
        return (a.cost || 0) - (b.cost || 0);
      } else if (sortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });

    return sorted;
  }, [allCards, searchTerm, filterType, sortBy]);

  // Handle card quantity increment
  const incrementCard = (cardId) => {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    const currentCount = deckComposition[cardId] || 0;
    const maxInDeck = card.maxInDeck || 4;

    if (currentCount < maxInDeck) {
      setDeckComposition(prev => ({
        ...prev,
        [cardId]: currentCount + 1
      }));
    }
  };

  // Handle card quantity decrement
  const decrementCard = (cardId) => {
    const currentCount = deckComposition[cardId] || 0;

    if (currentCount > 0) {
      const newComposition = { ...deckComposition };
      if (currentCount === 1) {
        delete newComposition[cardId]; // Remove card if count reaches 0
      } else {
        newComposition[cardId] = currentCount - 1;
      }
      setDeckComposition(newComposition);
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    if (totalCards >= minCards) {
      onConfirm(deckComposition);
      onClose();
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setDeckComposition({ ...initialSelection }); // Reset to initial
    onClose();
  };

  // Generate export code in JS object literal format
  const exportCode = useMemo(() => {
    const decklist = Object.entries(deckComposition)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({ id, quantity }));

    const data = {
      name: 'Test Deck',
      decklist
    };

    return generateJSObjectLiteral(data);
  }, [deckComposition]);

  // Handle copy to clipboard
  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      debugLog('DECK_BUILDER', 'Failed to copy:', err);
    }
  };

  // Handle download file
  const handleDownloadExport = () => {
    downloadDeckFile(exportCode, 'test-deck.js');
  };

  // Handle import
  const handleImport = () => {
    setImportError('');

    // Parse the JS object literal
    const parseResult = parseJSObjectLiteral(importText);
    if (!parseResult.success) {
      setImportError(parseResult.error);
      return;
    }

    const data = parseResult.data;

    // Convert decklist array to deck object
    const newDeck = {};
    (data.decklist || []).forEach(card => {
      if (card.quantity > 0) {
        // Validate card exists
        const cardData = allCards.find(c => c.id === card.id);
        if (!cardData) {
          setImportError(`Card ${card.id} not found in collection.`);
          return;
        }
        newDeck[card.id] = card.quantity;
      }
    });

    // Check if we had an error during validation
    if (importError) return;

    // Apply the imported deck
    setDeckComposition(newDeck);
    setShowImportModal(false);
    setImportText('');
  };

  if (!isOpen) return null;

  const isValidDeck = totalCards >= minCards;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-cyan-500 shadow-2xl flex flex-col max-w-7xl w-full max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white heading-font">{title}</h2>
            <p className="text-sm text-gray-400 mt-1">
              Cards: <span className={totalCards >= minCards ? 'text-green-400' : 'text-red-400'}>{totalCards}</span> / {minCards} minimum
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-700 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-grow min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Types</option>
            <option value="DRONE">Drones</option>
            <option value="SHIP">Ship Sections</option>
            <option value="ACTION">Action Cards</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="name">Sort by Name</option>
            <option value="cost">Sort by Cost</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>

        {/* Card Grid */}
        <div className="flex-grow overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedCards.map((card) => {
              const currentCount = deckComposition[card.id] || 0;
              const maxInDeck = card.maxInDeck || 4;
              const isAtMax = currentCount >= maxInDeck;

              return (
                <div key={card.id} className="flex flex-col items-center gap-2">
                  {/* Card Component */}
                  <ActionCard
                    card={card}
                    onClick={() => setDetailedCard(card)}
                    isPlayable={true}
                    scale={1.0}
                  />

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 bg-slate-800/70 px-3 py-1 rounded-lg border border-gray-600">
                    <button
                      onClick={() => decrementCard(card.id)}
                      disabled={currentCount === 0}
                      className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                        currentCount === 0
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      -
                    </button>
                    <span className="font-bold text-base min-w-[50px] text-center text-white">
                      {currentCount}/{maxInDeck}
                    </span>
                    <button
                      onClick={() => incrementCard(card.id)}
                      disabled={isAtMax}
                      className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                        isAtMax
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between">
          {/* Import/Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setImportText('');
                setImportError('');
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
              <Upload size={16} />
              Import
            </button>
            <button
              onClick={() => {
                setCopySuccess(false);
                setShowExportModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            >
              <Download size={16} />
              Export
            </button>
          </div>

          {/* Cancel/Confirm buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="dw-btn dw-btn-cancel px-6 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValidDeck}
              className={`px-6 py-2 rounded transition-all ${
                isValidDeck
                  ? 'dw-btn dw-btn-confirm'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Card Modal */}
      {detailedCard && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
          onClick={() => setDetailedCard(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ActionCard
              card={detailedCard}
              onClick={() => setDetailedCard(null)}
              isPlayable={true}
              scale={2.0}
            />
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
          <div className="bg-slate-800 rounded-lg border border-cyan-500 p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Import Deck</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Paste deck code in JS object format:\n{\n  name: 'My Deck',\n  decklist: [\n    { id: 'CARD001', quantity: 4 },\n    { id: 'CARD002', quantity: 3 }\n  ]\n}`}
              className="w-full h-64 bg-slate-900 text-white font-mono text-sm p-3 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none resize-none dw-modal-scroll"
            />

            {importError && (
              <div className="mt-3 p-3 bg-red-900/50 border border-red-500 rounded flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-300 text-sm">{importError}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className={`px-4 py-2 rounded transition-colors ${
                  importText.trim()
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
          <div className="bg-slate-800 rounded-lg border border-cyan-500 p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Export Deck</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={exportCode}
              readOnly
              className="w-full h-64 bg-slate-900 text-white font-mono text-sm p-3 rounded border border-slate-600 resize-none dw-modal-scroll"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleDownloadExport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
              >
                <Download size={16} />
                Download File
              </button>
              <button
                onClick={handleCopyExport}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                  copySuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                {copySuccess ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeckBuildingModal;
