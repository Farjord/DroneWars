/**
 * ReplicatorFilterModal Component
 * Filter modal for the Replicator - search, rarity, and copies owned filters
 */

import React from 'react';
import { Filter, X } from 'lucide-react';

const ReplicatorFilterModal = ({ isOpen, onClose, filters, onFiltersChange }) => {
  if (!isOpen) return null;

  const rarities = ['Common', 'Uncommon', 'Rare', 'Mythic'];
  const copiesOptions = [
    { value: null, label: 'Any' },
    { value: 2, label: 'Less than 2' },
    { value: 3, label: 'Less than 3' },
    { value: 5, label: 'Less than 5' },
    { value: 10, label: 'Less than 10' },
  ];

  const handleReset = () => {
    onFiltersChange({
      searchText: '',
      rarity: [],
      copiesLessThan: null
    });
  };

  const toggleRarity = (rarity) => {
    const newRarity = filters.rarity.includes(rarity)
      ? filters.rarity.filter(r => r !== rarity)
      : [...filters.rarity, rarity];
    onFiltersChange({ ...filters, rarity: newRarity });
  };

  return (
    <div className="dw-modal-overlay" style={{ zIndex: 1001 }} onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--sm"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '400px' }}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Filter size={24} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Filter Cards</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--modal-text-secondary)',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '6px' }}>
              Search by Name
            </label>
            <input
              type="text"
              value={filters.searchText}
              onChange={e => onFiltersChange({ ...filters, searchText: e.target.value })}
              placeholder="Search cards..."
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--modal-border)',
                borderRadius: '4px',
                color: 'white',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Rarity Checkboxes */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '8px' }}>
              Rarity
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {rarities.map(rarity => (
                <label
                  key={rarity}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    background: filters.rarity.includes(rarity) ? 'rgba(147, 51, 234, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                    border: `1px solid ${filters.rarity.includes(rarity) ? '#9333ea' : 'var(--modal-border)'}`,
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filters.rarity.includes(rarity)}
                    onChange={() => toggleRarity(rarity)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '13px', color: filters.rarity.includes(rarity) ? '#a855f7' : 'var(--modal-text-primary)' }}>
                    {rarity}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Copies Owned Dropdown */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '6px' }}>
              Copies Owned
            </label>
            <select
              value={filters.copiesLessThan ?? ''}
              onChange={e => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                onFiltersChange({ ...filters, copiesLessThan: val });
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--modal-border)',
                borderRadius: '4px',
                color: 'white',
                fontSize: '14px'
              }}
            >
              {copiesOptions.map(opt => (
                <option key={opt.label} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button
            className="dw-btn dw-btn-cancel"
            onClick={handleReset}
          >
            Reset All
          </button>
          <button
            className="dw-btn dw-btn-confirm"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplicatorFilterModal;
