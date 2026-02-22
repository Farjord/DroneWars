import React, { useState, useRef, useMemo } from 'react';
import { Download, Copy, X } from 'lucide-react';
import { generateJSObjectLiteral, convertToAIFormat, downloadDeckFile } from '../../utils/deckExportUtils.js';

const DeckExportModal = ({ deck, selectedDrones, selectedShipComponents, activeShip, preservedFields, onClose }) => {
  const [copySuccess, setCopySuccess] = useState('');
  const textAreaRef = useRef(null);

  const deckCode = useMemo(() => {
    const aiFormat = convertToAIFormat(
      deck,
      selectedDrones,
      selectedShipComponents,
      activeShip,
      preservedFields
    );
    return generateJSObjectLiteral(aiFormat);
  }, [deck, selectedDrones, selectedShipComponents, activeShip, preservedFields]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(deckCode);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const handleDownload = () => {
    const exportName = preservedFields.name || 'deck-export';
    const safeName = exportName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadDeckFile(deckCode, `${safeName}.js`);
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Download size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Export Deck</h2>
            <p className="dw-modal-header-subtitle">Save or share your configuration</p>
          </div>
          <button onClick={onClose} className="dw-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="dw-modal-body">
          <p className="dw-modal-text dw-modal-text--left">
            Copy or download your deck configuration in JavaScript format.
          </p>
          <textarea
            ref={textAreaRef}
            readOnly
            value={deckCode}
            className="w-full p-3 rounded font-mono text-sm dw-modal-scroll"
            style={{
              background: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid var(--modal-action-border)',
              color: 'var(--modal-text-primary)',
              resize: 'vertical',
              minHeight: '200px',
              maxHeight: '400px'
            }}
          />
          {copySuccess && (
            <div className="dw-modal-feedback dw-modal-feedback--success" style={{ marginTop: '12px' }}>
              {copySuccess}
            </div>
          )}
        </div>

        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-cancel">
            Close
          </button>
          <button onClick={handleDownload} className="dw-btn dw-btn-confirm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Download File
          </button>
          <button onClick={copyToClipboard} className="dw-btn dw-btn-confirm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={16} /> Copy
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckExportModal;
