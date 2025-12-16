/**
 * FilterChip.jsx
 * Removable pill-style chip that displays an active filter
 *
 * Used in DeckBuilder to show currently applied filters.
 * Each chip has a label and an X button to remove the filter.
 */

import { X } from 'lucide-react';

/**
 * FilterChip - A removable filter pill component
 *
 * @param {string} label - Display text for the chip
 * @param {function} onRemove - Callback when X is clicked. Called with (filterType, filterValue) if provided
 * @param {string} filterType - Optional filter type identifier for removal
 * @param {string|number} filterValue - Optional filter value for removal
 * @param {string} className - Optional additional CSS class
 */
function FilterChip({
  label,
  onRemove,
  filterType,
  filterValue,
  className = '',
}) {
  const handleRemove = (e) => {
    e.stopPropagation(); // Prevent click from propagating to parent
    if (filterType !== undefined && filterValue !== undefined) {
      onRemove(filterType, filterValue);
    } else {
      onRemove();
    }
  };

  return (
    <div className={`dw-filter-chip ${className}`}>
      <span className="dw-filter-chip__label">{label}</span>
      <button
        type="button"
        className="dw-filter-chip__remove"
        onClick={handleRemove}
        aria-label={`Remove filter: ${label}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default FilterChip;
