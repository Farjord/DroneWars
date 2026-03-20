/**
 * FilterTagInput.jsx
 * Tag-style input with keyword chips and filter chips for inline search filtering.
 * All active filter chips render inside the same bar as keyword chips and the text input.
 */

import { useState, useRef } from 'react';
import { X } from 'lucide-react';

function FilterTagInput({ keywords, onKeywordsChange, chips = [], onRemoveChip, placeholder = 'Search...', className = '' }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (keywords.some(kw => kw.toLowerCase() === lower)) return;
      onKeywordsChange([...keywords, trimmed]);
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && keywords.length > 0) {
      onKeywordsChange(keywords.slice(0, -1));
    }
  };

  const handleRemoveKeyword = (index) => {
    onKeywordsChange(keywords.filter((_, i) => i !== index));
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={`dw-filter-tag-input ${className}`}
      onClick={focusInput}
    >
      {chips.map((chip, index) => (
        <span key={`${chip.filterType}-${chip.filterValue || index}`} className="dw-filter-chip">
          <span className="dw-filter-chip__label">{chip.label}</span>
          <button
            className="dw-filter-chip__remove"
            onClick={(e) => { e.stopPropagation(); onRemoveChip(chip.filterType, chip.filterValue); }}
            aria-label={`Remove filter: ${chip.label}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {keywords.map((keyword, index) => (
        <span key={keyword} className="dw-filter-chip">
          <span className="dw-filter-chip__label">{keyword}</span>
          <button
            className="dw-filter-chip__remove"
            onClick={(e) => { e.stopPropagation(); handleRemoveKeyword(index); }}
            aria-label={`Remove ${keyword}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={keywords.length === 0 && chips.length === 0 ? placeholder : ''}
      />
    </div>
  );
}

export default FilterTagInput;
