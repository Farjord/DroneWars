import React, { useState, useRef } from 'react';
import { useGameState } from '../../hooks/useGameState';
import SaveGameService from '../../services/SaveGameService';

/**
 * SaveLoadModal Component
 * Handles save file download/upload for single-player mode
 */
const SaveLoadModal = ({ onClose }) => {
  const { gameState, gameStateManager } = useGameState();
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message: string }
  const fileInputRef = useRef(null);

  /**
   * Handle download save file
   */
  const handleDownload = () => {
    try {
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
        saveData.currentRunState
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Save / Load</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          {/* Download Save Button */}
          <div>
            <button
              onClick={handleDownload}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors"
            >
              Download Save File
            </button>
            <p className="mt-2 text-sm text-gray-400">
              Save your progress to a file on your computer
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-600"></div>

          {/* Upload Save Button */}
          <div>
            <button
              onClick={handleUploadClick}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors"
            >
              Load Save File
            </button>
            <p className="mt-2 text-sm text-gray-400">
              Load a previously saved game from a file
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleUpload}
              className="hidden"
            />
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded">
            <p className="text-sm text-yellow-200">
              <strong>Warning:</strong> Loading a save file will overwrite your current progress.
            </p>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className={`
            p-3 rounded mb-4
            ${feedback.type === 'success' ? 'bg-green-900 bg-opacity-30 border border-green-700 text-green-200' : ''}
            ${feedback.type === 'error' ? 'bg-red-900 bg-opacity-30 border border-red-700 text-red-200' : ''}
            ${feedback.type === 'info' ? 'bg-blue-900 bg-opacity-30 border border-blue-700 text-blue-200' : ''}
          `}>
            {feedback.message}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SaveLoadModal;
