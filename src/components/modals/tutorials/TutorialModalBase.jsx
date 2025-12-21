/**
 * TutorialModalBase.jsx
 * Shared wrapper for all tutorial modals
 *
 * Provides consistent styling, dismiss functionality,
 * and optional "Skip All Tutorials" button.
 */

import React from 'react';

/**
 * TutorialModalBase - Reusable tutorial modal wrapper
 *
 * @param {Object} props
 * @param {string} props.title - Modal title
 * @param {string} props.subtitle - Modal subtitle
 * @param {Array} props.sections - Array of { heading, content } objects
 * @param {Function} props.onDismiss - Handler for dismissing the tutorial
 * @param {Function} props.onSkipAll - Optional handler for skipping all tutorials
 * @param {boolean} props.showSkipAll - Whether to show the Skip All button
 * @param {React.ReactNode} props.children - Optional custom content instead of sections
 */
function TutorialModalBase({
  title,
  subtitle,
  sections = [],
  onDismiss,
  onSkipAll,
  showSkipAll = false,
  children,
}) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onDismiss();
    }
  };

  return (
    <div className="dw-modal-overlay" onClick={handleOverlayClick}>
      <div
        className="dw-modal-content dw-modal--md"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: '#3b82f6' }}>
            {/* Help/Info icon */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{title}</h2>
            {subtitle && <p className="dw-modal-header-subtitle">{subtitle}</p>}
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body dw-modal-scroll">
          {children || (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sections.map((section, idx) => (
                <div key={idx}>
                  <h4
                    style={{
                      color: '#3b82f6',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {section.heading}
                  </h4>
                  <p
                    style={{
                      color: 'var(--modal-text-secondary)',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          {showSkipAll && onSkipAll && (
            <button className="dw-btn dw-btn-secondary" onClick={onSkipAll}>
              Skip All Tutorials
            </button>
          )}
          <button className="dw-btn dw-btn-confirm" onClick={onDismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default TutorialModalBase;
