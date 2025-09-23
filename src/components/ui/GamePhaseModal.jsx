// ========================================
// GAME PHASE MODAL COMPONENT
// ========================================
// Generic modal wrapper for game phase transitions and notifications
// Provides consistent styling and behavior across all game modals

import React from 'react';
import { X } from 'lucide-react';

/**
 * GAME PHASE MODAL COMPONENT
 * Standardized modal for game phases, confirmations, and notifications.
 * @param {string} title - Modal title text
 * @param {string} text - Modal body text
 * @param {Function} onClose - Callback when modal is closed (null to hide close button)
 * @param {React.ReactNode} children - Additional modal content
 * @param {string} maxWidthClass - Tailwind max-width class for modal sizing
 */
const GamePhaseModal = ({ title, text, onClose, children, maxWidthClass = 'max-w-lg' }) => (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
    <div className={`bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full ${maxWidthClass} relative`}>
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
      )}
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 text-center mb-4">
        {title}
      </h2>
      <p className="text-center text-gray-400">{text}</p>
      {children}
    </div>
  </div>
);

export default GamePhaseModal;