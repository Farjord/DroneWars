// ========================================
// ENHANCER MODAL COMPONENT
// ========================================
// Upgrade cards to enhanced versions by consuming copies + credits

import React, { useState, useMemo } from 'react';
import { Zap, Package, HelpCircle, Filter, ChevronRight } from 'lucide-react';
import { getCardDiffs } from '../../utils/cardDiffUtils.jsx';
import { useGameState } from '../../hooks/useGameState';
import enhancerService from '../../logic/economy/EnhancerService.js';
import MissionService from '../../logic/missions/MissionService.js';
import ActionCard from '../ui/ActionCard.jsx';
import FilterChip from '../ui/FilterChip.jsx';
import EnhancerFilterModal from './ReplicatorFilterModal.jsx';

const EnhancerModal = ({ onClose, onShowHelp }) => {
  const { gameState } = useGameState();
  const [feedback, setFeedback] = useState(null);
  const [selectedTab, setSelectedTab] = useState('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    searchText: '',
    rarity: [],
    copiesLessThan: null
  });

  const { singlePlayerProfile } = gameState;
  const credits = singlePlayerProfile?.credits || 0;

  const enhanceableCards = useMemo(() => {
    try {
      return enhancerService.getEnhanceableCards();
    } catch (e) {
      console.debug('EnhancerModal: Service not available in preview mode');
      return [];
    }
  }, [gameState?.singlePlayerInventory, gameState?.singlePlayerShipSlots]);

  const applyFilters = (cards) => {
    return cards.filter(item => {
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (!item.card.name?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (filters.rarity.length > 0 && !filters.rarity.includes(item.card.rarity)) {
        return false;
      }
      if (filters.copiesLessThan !== null && item.quantity >= filters.copiesLessThan) {
        return false;
      }
      return true;
    });
  };

  const filteredCards = useMemo(() => {
    let result = enhanceableCards;
    if (selectedTab !== 'All') {
      result = result.filter(item => item.card.type === selectedTab);
    }
    result = applyFilters(result);
    return result;
  }, [enhanceableCards, selectedTab, filters]);

  const filteredCardsWithDiffs = useMemo(() => {
    return filteredCards.map(item => ({
      ...item,
      diffs: getCardDiffs(item.card, item.enhancedCard),
    }));
  }, [filteredCards]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchText) count++;
    count += filters.rarity.length;
    if (filters.copiesLessThan !== null) count++;
    return count;
  }, [filters]);

  const generateFilterChips = () => {
    const chips = [];
    if (filters.searchText) {
      chips.push({ label: `"${filters.searchText}"`, filterType: 'searchText', filterValue: filters.searchText });
    }
    filters.rarity.forEach(r => {
      chips.push({ label: r, filterType: 'rarity', filterValue: r });
    });
    if (filters.copiesLessThan !== null) {
      chips.push({ label: `< ${filters.copiesLessThan} copies`, filterType: 'copiesLessThan', filterValue: filters.copiesLessThan });
    }
    return chips;
  };

  const handleRemoveFilterChip = (filterType, filterValue) => {
    setFilters(prev => {
      if (filterType === 'searchText') return { ...prev, searchText: '' };
      if (filterType === 'rarity') return { ...prev, rarity: prev.rarity.filter(r => r !== filterValue) };
      if (filterType === 'copiesLessThan') return { ...prev, copiesLessThan: null };
      return prev;
    });
  };

  const handleEnhance = (item) => {
    const result = enhancerService.enhance(item.card.id);

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    MissionService.recordProgress('ITEM_CRAFTED', { itemType: 'enhancement' });

    let message = `Enhanced ${item.card.name} for ${result.cost.toLocaleString()} credits`;
    if (result.deckWarnings && result.deckWarnings.length > 0) {
      message += ` — Deck adjusted: ${result.deckWarnings.map(w => `${w.slotName} (${w.previousQuantity} → ${w.newQuantity})`).join(', ')}`;
    }

    setFeedback({ type: 'success', message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const tabs = ['All', 'Ordnance', 'Tactic', 'Support', 'Upgrade'];

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div className="dw-modal-header" style={{ position: 'relative' }}>
          <div className="dw-modal-header-icon">
            <Zap size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Enhancer</h2>
            <p className="dw-modal-header-subtitle">Upgrade cards to enhanced versions</p>
          </div>
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="dw-modal-help-btn"
              title="Show help"
              style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '4px', borderRadius: '4px', color: '#06b6d4',
                opacity: 0.7, transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              <HelpCircle size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Credits Display */}
          <div className="dw-modal-credits">
            <span className="dw-modal-credits-label">Available Credits</span>
            <span className="dw-modal-credits-value">{credits.toLocaleString()}</span>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`dw-modal-feedback dw-modal-feedback--${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* Filter Header */}
          {enhanceableCards.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <button
                onClick={() => setShowFilterModal(true)}
                className="dw-filter-btn"
                aria-label="Filters"
              >
                <Filter size={16} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="dw-filter-btn__count">{activeFilterCount}</span>
                )}
              </button>
              {generateFilterChips().map((chip, index) => (
                <FilterChip
                  key={`${chip.filterType}-${chip.filterValue || index}`}
                  label={chip.label}
                  filterType={chip.filterType}
                  filterValue={chip.filterValue}
                  onRemove={handleRemoveFilterChip}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {enhanceableCards.length === 0 ? (
            <div className="dw-modal-empty">
              <div className="dw-modal-empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <Package size={48} style={{ color: 'var(--modal-text-muted)', opacity: 0.5 }} />
              </div>
              <p className="dw-modal-empty-text">No Cards to Enhance</p>
              <p style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginTop: '8px' }}>
                Collect multiple copies of cards through extraction to enhance them.
              </p>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="dw-modal-tabs">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`dw-modal-tab ${selectedTab === tab ? 'dw-modal-tab--active' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              <div className="dw-modal-scroll" style={{ maxHeight: '500px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                  gap: '16px'
                }}>
                  {filteredCardsWithDiffs.map(item => (
                    <div
                      key={item.card.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.35)',
                        borderRadius: '4px',
                        padding: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {/* Two-Card Layout: [Base] -> [Enhanced+] */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div className="flex flex-col items-center">
                          <ActionCard card={item.card} isPlayable={true} />
                          <span className="text-xs font-orbitron text-cyan-300 mt-1">
                            Owned: {item.isStarterCard ? '∞' : item.quantity}
                          </span>
                        </div>
                        <ChevronRight size={24} style={{ color: '#06b6d4', flexShrink: 0, alignSelf: 'center' }} />
                        <div className="flex flex-col items-center">
                          <ActionCard card={item.enhancedCard} isPlayable={true} diffHighlights={item.diffs} />
                          <span className="text-xs font-orbitron text-cyan-300 mt-1">
                            Owned: {item.enhancedQuantity}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-col items-center gap-2 mt-3 w-full">
                        {/* Cost + Copies Required */}
                        <div className="flex items-center justify-center gap-2">
                          {!item.isStarterCard && item.copiesRequired > 0 && (
                            <span className="text-sm text-cyan-300">
                              {item.copiesRequired} copies +
                            </span>
                          )}
                          <span className="font-orbitron text-lg font-bold text-yellow-400">
                            {item.cost.toLocaleString()}
                          </span>
                          <span className="text-sm text-yellow-400/80">cr</span>
                        </div>

                        {/* Enhance Button */}
                        <button
                          onClick={() => handleEnhance(item)}
                          disabled={!item.canEnhance}
                          className={`
                            px-6 py-1.5 text-xs font-orbitron uppercase tracking-wide rounded
                            transition-all duration-200 w-full max-w-[200px]
                            ${!item.canEnhance
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                            }
                          `}
                        >
                          Enhance
                        </button>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn-hud dw-btn-hud-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Filter Modal */}
      <EnhancerFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
};

export default EnhancerModal;
