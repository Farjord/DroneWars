/**
 * DroneFilterModal.jsx
 * Popup modal for filtering drones in DeckBuilder
 *
 * Provides filter options for:
 * - Rarity (OR logic, includes Starter in extraction mode)
 * - Class 1-5 (OR logic)
 * - Damage type (OR logic)
 * - Abilities (AND logic)
 * - Include AI Only toggle (dev mode only)
 */

import { useState, useRef, useEffect } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';

/**
 * DroneFilterModal - Drone filter popup
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {Object} filters - Current filter state
 * @param {function} onFiltersChange - Callback when filters change
 * @param {Object} filterOptions - Available filter options
 * @param {string} mode - 'standalone' or 'extraction'
 * @param {boolean} devMode - Whether to show dev mode options
 */
function DroneFilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  filterOptions,
  mode = 'standalone',
  devMode = false,
}) {
  const [isAbilityDropdownOpen, setIsAbilityDropdownOpen] = useState(false);
  const abilityDropdownRef = useRef(null);

  // Close ability dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (abilityDropdownRef.current && !abilityDropdownRef.current.contains(event.target)) {
        setIsAbilityDropdownOpen(false);
      }
    };

    if (isAbilityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAbilityDropdownOpen]);

  if (!isOpen) return null;

  // Helper to toggle array filter values
  const toggleArrayFilter = (filterType, value) => {
    const current = filters[filterType] || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [filterType]: newValues });
  };

  // Helper to update filter value
  const updateFilter = (filterType, value) => {
    onFiltersChange({ ...filters, [filterType]: value });
  };

  // Reset all filters to defaults
  const handleResetAll = () => {
    onFiltersChange({
      searchText: '',
      rarity: [],
      class: [],
      abilities: [],
      damageType: [],
      includeAIOnly: false,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-cyan-500/50 shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Drone Filters</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 dw-modal-scroll">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => updateFilter('searchText', e.target.value)}
                placeholder="Search drones by name or description..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Rarity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rarity</label>
            <div className="flex flex-wrap gap-3">
              {filterOptions.rarities.map(rarity => (
                <label key={rarity} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.rarity.includes(rarity)}
                    onChange={() => toggleArrayFilter('rarity', rarity)}
                    className="w-4 h-4 accent-cyan-500"
                    aria-label={rarity}
                  />
                  <span className="text-sm text-gray-200">{rarity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Class</label>
            <div className="flex flex-wrap gap-3">
              {filterOptions.classes.map(classNum => (
                <label key={classNum} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.class.includes(classNum)}
                    onChange={() => toggleArrayFilter('class', classNum)}
                    className="w-4 h-4 accent-cyan-500"
                    aria-label={`Class ${classNum}`}
                  />
                  <span className="text-sm text-gray-200">Class {classNum}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Damage Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Damage Type</label>
            <div className="flex flex-wrap gap-3">
              {filterOptions.damageTypes.map(damageType => (
                <label key={damageType} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.damageType.includes(damageType)}
                    onChange={() => toggleArrayFilter('damageType', damageType)}
                    className="w-4 h-4 accent-cyan-500"
                    aria-label={damageType}
                  />
                  <span className="text-sm text-gray-200">{damageType}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Abilities Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Abilities</label>
            <div className="relative" ref={abilityDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAbilityDropdownOpen(!isAbilityDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-cyan-500"
                role="button"
              >
                <span>
                  {filters.abilities.length === 0
                    ? 'Select abilities...'
                    : `${filters.abilities.length} abilities selected`}
                </span>
                <ChevronDown size={18} className={`transition-transform ${isAbilityDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAbilityDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-600 rounded max-h-48 overflow-y-auto z-10 dw-modal-scroll">
                  {filterOptions.abilities.map(ability => (
                    <label
                      key={ability}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.abilities.includes(ability)}
                        onChange={() => toggleArrayFilter('abilities', ability)}
                        className="w-4 h-4 accent-cyan-500"
                      />
                      <span className="text-sm text-gray-200">{ability}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dev Mode Toggle */}
          {devMode && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeAIOnly}
                  onChange={(e) => updateFilter('includeAIOnly', e.target.checked)}
                  className="w-4 h-4 accent-cyan-500"
                  aria-label="Include AI Only Drones"
                />
                <span className="text-sm text-gray-200">Include AI Only Drones</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <button
            onClick={handleResetAll}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            aria-label="Reset all filters"
          >
            Reset All
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
            aria-label="Close"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DroneFilterModal;
