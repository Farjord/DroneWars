// ========================================
// SAVE/LOAD MODAL COMPONENT
// ========================================
// Handles save file download/upload for single-player mode

import React, { useState, useRef } from 'react';
import { Save } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import SaveGameService from '../../services/SaveGameService';

/**
 * SaveLoadModal Component
 * Handles save file download/upload for single-player mode
 */
const SaveLoadModal = ({ onClose }) => {
  const { gameState, gameStateManager } = useGameState();
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'info', message: string }
  const fileInputRef = useRef(null);

  /**
   * Handle download save file
   */
  const handleDownload = () => {
    try {
      // Guard for showcase mode where gameStateManager may not be available
      if (!gameStateManager?.getSaveData) {
        setFeedback({ type: 'error', message: 'Save not available in preview mode' });
        return;
      }
      // Get current save data from GameStateManager
      const saveData = gameStateManager.getSaveData();

      // Serialize using SaveGameService
      const serialized = SaveGameService.serialize(
        saveData.playerProfile,
        saveData.inventory,
        saveData.droneInstances,
        saveData.shipComponentInstances,
        saveData.discoveredCards,
        saveData.shipSlots,
        saveData.currentRunState,
        saveData.quickDeployments
      );

      // Download file
      const result = SaveGameService.download(serialized);

      if (result.success) {
        setFeedback({ type: 'success', message: 'Save file downloaded successfully!' });
      } else {
        setFeedback({ type: 'error', message: `Download failed: ${result.error}` });
      }
    } catch (error) {
      console.error('Download error:', error);
      setFeedback({ type: 'error', message: `Download failed: ${error.message}` });
    }
  };

  /**
   * Handle upload save file
   */
  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setFeedback({ type: 'info', message: 'Loading save file...' });

      // Load and deserialize using SaveGameService
      const gameStateData = await SaveGameService.load(file);

      // Guard for showcase mode
      if (!gameStateManager?.loadSinglePlayerSave) {
        setFeedback({ type: 'error', message: 'Load not available in preview mode' });
        return;
      }
      // Load into GameStateManager
      gameStateManager.loadSinglePlayerSave(gameStateData);

      setFeedback({ type: 'success', message: 'Save file loaded successfully!' });

      // Auto-close after successful load
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      setFeedback({ type: 'error', message: `Load failed: ${error.message}` });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Trigger file input click
   */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Save size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Save / Load</h2>
            <p className="dw-modal-header-subtitle">Manage your game progress</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Download Save Button */}
          <div style={{ marginBottom: '16px' }}>
            <button className="dw-btn dw-btn-confirm dw-btn--full" onClick={handleDownload}>
              Download Save File
            </button>
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
              Save your progress to a file on your computer
            </p>
          </div>

          {/* Divider */}
          <div className="dw-modal-divider" />

          {/* Upload Save Button */}
          <div style={{ marginBottom: '16px' }}>
            <button className="dw-btn dw-btn-success dw-btn--full" onClick={handleUploadClick}>
              Load Save File
            </button>
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
              Load a previously saved game from a file
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Warning */}
          <div className="dw-modal-warning">
            <p>
              <strong>Warning:</strong> Loading a save file will overwrite your current progress.
            </p>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`dw-modal-feedback dw-modal-feedback--${feedback.type}`}>
              {feedback.message}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveLoadModal;
