/**
 * GameManualModal.jsx
 *
 * Player-facing Game Manual modal with a sidebar navigation, tabbed category
 * browsing, and rich content rendering for tips, warnings, and item lists.
 * Content is driven entirely by the manualCategories data structure.
 */

import React, { useState, useMemo } from 'react';
import { BookOpen, Shield, Swords, Zap, Info, Crosshair, Heart, Move, Battery, Cpu, Target, AlertTriangle } from 'lucide-react';
import { manualCategories } from '../../data/gameManualContent.js';

const iconMap = { BookOpen, Shield, Swords, Zap, Info, Crosshair, Heart, Move, Battery, Cpu, Target, AlertTriangle };

const GameManualModal = ({ onClose }) => {
  const [activeCategoryId, setActiveCategoryId] = useState(manualCategories[0]?.id);
  const [activeTopicId, setActiveTopicId] = useState(manualCategories[0]?.topics[0]?.id);

  const activeCategory = useMemo(
    () => manualCategories.find(c => c.id === activeCategoryId),
    [activeCategoryId]
  );

  const findActiveTopic = () => {
    for (const category of manualCategories) {
      const topic = category.topics.find(t => t.id === activeTopicId);
      if (topic) return topic;
    }
    return null;
  };

  const CategoryIcon = activeCategory ? iconMap[activeCategory.icon] : null;

  const renderContent = () => {
    const topic = findActiveTopic();
    if (!topic) return null;

    return (
      <div className="space-y-6">
        {topic.sections.map((section, idx) => (
          <div key={idx}>
            {section.heading && (
              <h3 className="text-lg font-bold text-cyan-400 mb-3">{section.heading}</h3>
            )}

            {section.body && (
              <p className="text-gray-300 leading-relaxed mb-3">{section.body}</p>
            )}

            {section.tip && (
              <div className="bg-cyan-900 bg-opacity-20 border border-cyan-700 rounded p-3 mb-3">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <p className="text-cyan-300 text-sm">{section.tip}</p>
                </div>
              </div>
            )}

            {section.warning && (
              <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{section.warning}</p>
                </div>
              </div>
            )}

            {section.items && section.items.length > 0 && (
              <div className="space-y-2 mb-3">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="bg-gray-800 rounded p-3 border border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                      {item.color && (
                        <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      )}
                      <span className="font-semibold text-white">{item.name}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div
            style={{ width: '220px', minWidth: '220px', borderRight: '1px solid #374151', overflowY: 'auto', padding: '8px 0' }}
            className="dw-modal-scroll"
          >
            {manualCategories.map(category => (
              <div key={category.id}>
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  {category.title}
                </div>
                {category.topics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => { setActiveCategoryId(category.id); setActiveTopicId(topic.id); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTopicId === topic.id
                        ? 'bg-cyan-900 bg-opacity-30 text-cyan-400 border-l-2 border-cyan-400'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white border-l-2 border-transparent'
                    }`}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Main content area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div className="dw-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="dw-modal-header-icon">
                  {CategoryIcon && <CategoryIcon size={28} />}
                </div>
                <div className="dw-modal-header-info">
                  <h2 className="dw-modal-header-title">Game Manual</h2>
                  <p className="dw-modal-header-subtitle">{activeCategory?.title}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-700 px-4">
              <div className="flex space-x-1 overflow-x-auto">
                {activeCategory?.topics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => setActiveTopicId(topic.id)}
                    className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap text-sm ${
                      activeTopicId === topic.id
                        ? 'text-cyan-400 border-b-2 border-cyan-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 dw-modal-scroll">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameManualModal;
