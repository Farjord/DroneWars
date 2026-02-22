import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';

const DeckImportModal = ({ onImportDeck, onClose }) => {
  const [deckCode, setDeckCode] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    setError('');
    const result = onImportDeck(deckCode);
    if (result.success) {
      onClose();
    } else {
      setError(result.message || 'Invalid deck format.');
    }
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Upload size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Import Deck</h2>
            <p className="dw-modal-header-subtitle">Load a saved configuration</p>
          </div>
          <button onClick={onClose} className="dw-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="dw-modal-body">
          <p className="dw-modal-text dw-modal-text--left">
            Paste a deck configuration in JavaScript object format (matching aiData.js style).
          </p>
          <textarea
            value={deckCode}
            onChange={(e) => setDeckCode(e.target.value)}
            className="w-full p-3 rounded font-mono text-sm dw-modal-scroll"
            style={{
              background: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid var(--modal-action-border)',
              color: 'var(--modal-text-primary)',
              resize: 'vertical',
              minHeight: '200px',
              maxHeight: '400px'
            }}
            placeholder="Paste your deck code here"
          />
          {error && (
            <div className="dw-modal-feedback dw-modal-feedback--error" style={{ marginTop: '12px' }}>
              {error}
            </div>
          )}
        </div>

        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-cancel">
            Cancel
          </button>
          <button onClick={handleImport} className="dw-btn dw-btn-confirm">
            Load Deck
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckImportModal;
