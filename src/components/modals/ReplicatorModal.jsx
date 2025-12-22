// ========================================
// REPLICATOR MODAL COMPONENT
// ========================================
// Duplicate owned cards for credits

import React, { useState, useMemo } from 'react';
import { Copy, Package, HelpCircle, Filter } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import replicatorService from '../../logic/economy/ReplicatorService.js';
import MissionService from '../../logic/missions/MissionService.js';
import ActionCard from '../ui/ActionCard.jsx';
import FilterChip from '../ui/FilterChip.jsx';
import ReplicatorFilterModal from './ReplicatorFilterModal.jsx';

/**
 * ReplicatorModal Component
 * Duplicate owned cards for credits
 * Uses ReplicatorService for cost calculations and replication operations
 */
const ReplicatorModal = ({ onClose, onShowHelp }) => {
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

  // Get costs from service for display (with fallback for showcase mode)
  let REPLICATE_COSTS = { Common: 100, Uncommon: 250, Rare: 600, Mythic: 1500 };
  try {
    const costs = replicatorService.getAllCosts();
    if (costs) REPLICATE_COSTS = costs;
  } catch (e) {
    console.debug('ReplicatorModal: Service costs not available in preview mode');
  }

  /**
   * Get replicatable cards (owned non-starter cards)
   */
  const ownedCards = useMemo(() => {
    try {
      return replicatorService.getReplicatableCards().map(({ card, quantity, replicationCost, isStarterCard }) => ({
        ...card,
        quantity,
        replicateCost: replicationCost,
        isStarterCard: isStarterCard || false
      }));
    } catch (e) {
      console.debug('ReplicatorModal: Service not available in preview mode');
      return [];
    }
  }, [gameState?.singlePlayerInventory, gameState?.singlePlayerShipSlots]);

  /**
   * Apply filters to cards
   */
  const applyFilters = (cards) => {
    return cards.filter(card => {
      // Search text (name match)
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (!card.name?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Rarity filter (OR logic)
      if (filters.rarity.length > 0 && !filters.rarity.includes(card.rarity)) {
        return false;
      }

      // Copies owned filter (less than X)
      if (filters.copiesLessThan !== null && card.quantity >= filters.copiesLessThan) {
        return false;
      }

      return true;
    });
  };

  /**
   * Filter by tab and modal filters
   */
  const filteredCards = useMemo(() => {
    let result = ownedCards;

    // Apply tab filter (type)
    if (selectedTab !== 'All') {
      result = result.filter(card => card.type === selectedTab);
    }

    // Apply modal filters
    result = applyFilters(result);

    return result;
  }, [ownedCards, selectedTab, filters]);

  /**
   * Count active filters
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchText) count++;
    count += filters.rarity.length;
    if (filters.copiesLessThan !== null) count++;
    return count;
  }, [filters]);

  /**
   * Generate filter chips for display
   */
  const generateFilterChips = () => {
    const chips = [];

    if (filters.searchText) {
      chips.push({
        label: `"${filters.searchText}"`,
        filterType: 'searchText',
        filterValue: filters.searchText
      });
    }

    filters.rarity.forEach(r => {
      chips.push({
        label: r,
        filterType: 'rarity',
        filterValue: r
      });
    });

    if (filters.copiesLessThan !== null) {
      chips.push({
        label: `< ${filters.copiesLessThan} copies`,
        filterType: 'copiesLessThan',
        filterValue: filters.copiesLessThan
      });
    }

    return chips;
  };

  /**
   * Handle chip removal
   */
  const handleRemoveFilterChip = (filterType, filterValue) => {
    setFilters(prev => {
      if (filterType === 'searchText') {
        return { ...prev, searchText: '' };
      }
      if (filterType === 'rarity') {
        return { ...prev, rarity: prev.rarity.filter(r => r !== filterValue) };
      }
      if (filterType === 'copiesLessThan') {
        return { ...prev, copiesLessThan: null };
      }
      return prev;
    });
  };

  /**
   * Handle replicate button click
   */
  const handleReplicate = (card) => {
    const result = replicatorService.replicate(card.id);

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    // Record mission progress for crafting
    MissionService.recordProgress('CRAFT_ITEM', {});

    setFeedback({
      type: 'success',
      message: `Replicated ${card.name} for ${result.cost} credits`
    });

    setTimeout(() => setFeedback(null), 2000);
  };

  const tabs = ['All', 'Ordnance', 'Tactic', 'Support', 'Upgrade'];

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div className="dw-modal-header" style={{ position: 'relative' }}>
          <div className="dw-modal-header-icon">
            <Copy size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Replicator</h2>
            <p className="dw-modal-header-subtitle">Duplicate owned cards for credits</p>
          </div>
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="dw-modal-help-btn"
              title="Show help"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                color: '#06b6d4',
                opacity: 0.7,
                transition: 'opacity 0.2s ease'
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
            <span className="dw-modal-credits-value">{credits}</span>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`dw-modal-feedback dw-modal-feedback--${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* Filter Header */}
          {ownedCards.length > 0 && (
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

              {/* Active Filter Chips */}
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
          {ownedCards.length === 0 ? (
            <div className="dw-modal-empty">
              <div className="dw-modal-empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <Package size={48} style={{ color: 'var(--modal-text-muted)', opacity: 0.5 }} />
              </div>
              <p className="dw-modal-empty-text">No Cards to Replicate</p>
              <p style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginTop: '8px' }}>
                You don't own any cards yet. Acquire cards through gameplay or crafting.
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
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  justifyItems: 'center'
                }}>
                  {filteredCards.map(card => {
                    const canAfford = credits >= card.replicateCost;

                    return (
                      <div
                        key={card.id}
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
                        {/* Full Card */}
                        <ActionCard card={card} isPlayable={true} />

                        {/* Controls Below Card */}
                        <div className="flex flex-col items-center gap-2 mt-3 w-full">
                          {/* Cost */}
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-orbitron text-lg font-bold text-yellow-400">
                              {card.replicateCost.toLocaleString()}
                            </span>
                            <span className="text-sm text-yellow-400/80">cr</span>
                          </div>

                          {/* Replicate Button */}
                          <button
                            onClick={() => handleReplicate(card)}
                            disabled={!canAfford}
                            className={`
                              px-6 py-1.5 text-xs font-orbitron uppercase tracking-wide rounded
                              transition-all duration-200 w-full max-w-[160px]
                              ${!canAfford
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                              }
                            `}
                          >
                            Replicate
                          </button>

                          {/* Owned Quantity */}
                          <div className="text-sm font-orbitron text-center">
                            <span className="text-cyan-300">
                              Owned: {card.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info Box */}
              <div className="dw-modal-info-box" style={{ marginTop: '16px', background: 'rgba(147, 51, 234, 0.1)', borderColor: 'rgba(147, 51, 234, 0.3)' }}>
                <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0 }}>
                  <strong style={{ color: '#a855f7' }}>Costs:</strong>{' '}
                  Common {REPLICATE_COSTS.Common}, Uncommon {REPLICATE_COSTS.Uncommon}, Rare {REPLICATE_COSTS.Rare}, Mythic {REPLICATE_COSTS.Mythic}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Filter Modal */}
      <ReplicatorFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
};

export default ReplicatorModal;
