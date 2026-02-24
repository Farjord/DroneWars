// ========================================
// SETTINGS DROPDOWN COMPONENT
// ========================================
// Settings gear dropdown with background submenu, dev tools, and navigation
// Extracted from GameHeader.jsx

import React, { useState } from 'react';
import { Settings, ChevronDown, BookOpen, Brain, Plus, Image, ChevronRight, Check, Zap, RotateCcw } from 'lucide-react';
import DEV_CONFIG from '../../../config/devConfig.js';
import { BACKGROUNDS } from '../../../config/backgrounds.js';

/**
 * SettingsDropdown - Gear icon button with a dropdown menu for settings,
 * background selection, dev tools, glossary, AI strategy, and exit.
 */
function SettingsDropdown({
  showSettingsDropdown,
  setShowSettingsDropdown,
  dropdownRef,
  selectedBackground,
  onBackgroundChange,
  onShowDebugModal,
  onShowAddCardModal,
  onForceWin,
  onShowGlossary,
  onShowAIStrategy,
  handleExitGame
}) {
  const [showBackgroundSubmenu, setShowBackgroundSubmenu] = useState(false);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
        className="relative"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 28, 0.95) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '2px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(6, 182, 212, 0.1)',
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)'
        }}
        aria-label="Settings"
      >
        {/* Angular corner accent */}
        <div
          className="absolute top-0 left-0 w-2 h-2 z-10 pointer-events-none"
          style={{
            borderTop: '1px solid rgba(6, 182, 212, 0.5)',
            borderLeft: '1px solid rgba(6, 182, 212, 0.5)'
          }}
        />
        <div className="px-2 py-1.5 flex items-center gap-1">
          <Settings size={20} className="text-cyan-400" />
          <ChevronDown size={16} className="text-cyan-400" />
        </div>
      </button>

      {showSettingsDropdown && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl border border-gray-700 z-50"
          style={{ background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 15, 28, 0.98) 100%)' }}
        >
          {DEV_CONFIG.features.debugView && (
            <button
              onClick={() => {
                onShowDebugModal && onShowDebugModal();
                setShowSettingsDropdown(false);
              }}
              className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
            >
              <Settings size={16} />
              Debug View
            </button>
          )}

          {/* Background Submenu */}
          <div
            className="relative"
            onMouseEnter={() => setShowBackgroundSubmenu(true)}
            onMouseLeave={() => setShowBackgroundSubmenu(false)}
          >
            <button
              className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center justify-between gap-2 border-b border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Image size={16} />
                Background
              </div>
              <ChevronRight size={16} />
            </button>

            {showBackgroundSubmenu && (
              <div
                className="absolute right-full top-0 w-48 rounded-lg shadow-xl border border-gray-700 z-50"
                style={{ background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 15, 28, 0.98) 100%)' }}
              >
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => {
                      onBackgroundChange && onBackgroundChange(bg.id);
                      setShowSettingsDropdown(false);
                      setShowBackgroundSubmenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center justify-between gap-2 ${
                      bg.id === BACKGROUNDS[BACKGROUNDS.length - 1].id ? 'rounded-b-lg' : 'border-b border-gray-700'
                    } ${
                      bg.id === BACKGROUNDS[0].id ? 'rounded-t-lg' : ''
                    }`}
                  >
                    <span>{bg.name}</span>
                    {selectedBackground === bg.id && <Check size={16} className="text-green-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {DEV_CONFIG.features.addCardToHand && (
            <button
              onClick={() => {
                onShowAddCardModal && onShowAddCardModal();
                setShowSettingsDropdown(false);
              }}
              className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
            >
              <Plus size={16} />
              Add Card to Hand
            </button>
          )}
          {DEV_CONFIG.features.forceWin && (
            <button
              onClick={() => {
                onForceWin && onForceWin();
                setShowSettingsDropdown(false);
              }}
              className="w-full text-left px-4 py-3 text-yellow-400 hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
            >
              <Zap size={16} />
              Force Win (DEV)
            </button>
          )}
          <button
            onClick={() => {
              onShowGlossary && onShowGlossary();
              setShowSettingsDropdown(false);
            }}
            className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
          >
            <BookOpen size={16} />
            Mechanics Glossary
          </button>
          <button
            onClick={() => {
              onShowAIStrategy && onShowAIStrategy();
              setShowSettingsDropdown(false);
            }}
            className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
          >
            <Brain size={16} />
            AI Strategy Guide
          </button>
          <button
            onClick={() => {
              handleExitGame();
              setShowSettingsDropdown(false);
            }}
            className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors rounded-b-lg flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Exit
          </button>
        </div>
      )}
    </div>
  );
}

export default SettingsDropdown;
