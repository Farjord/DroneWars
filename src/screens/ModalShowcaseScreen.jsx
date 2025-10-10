// ========================================
// MODAL SHOWCASE SCREEN
// ========================================
// Dev-only screen for previewing all modal components
// Accessible via MenuScreen button or Ctrl+M keyboard shortcut

import { useState, useEffect } from 'react';
import gameStateManager from '../state/GameStateManager.js';
import { getMockPropsForModal, getModalsByCategory, MODAL_CATEGORIES } from './modalShowcaseHelpers.js';

// Import all modal components
import WinnerModal from '../components/modals/WinnerModal.jsx';
import InterceptionOpportunityModal from '../components/modals/InterceptionOpportunityModal.jsx';
import OpponentDecidingInterceptionModal from '../components/modals/OpponentDecidingInterceptionModal.jsx';
import DeploymentConfirmationModal from '../components/modals/DeploymentConfirmationModal.jsx';
import CardConfirmationModal from '../components/modals/CardConfirmationModal.jsx';
import DroneAbilityConfirmationModal from '../components/modals/DroneAbilityConfirmationModal.jsx';
import ShipAbilityConfirmationModal from '../components/modals/ShipAbilityConfirmationModal.jsx';
import MoveConfirmationModal from '../components/modals/MoveConfirmationModal.jsx';
import MandatoryActionModal from '../components/modals/MandatoryActionModal.jsx';
import ConfirmationModal from '../components/modals/ConfirmationModal.jsx';
import AICardPlayReportModal from '../components/modals/AICardPlayReportModal.jsx';
import AIDecisionLogModal from '../components/modals/AIDecisionLogModal.jsx';
import AIHandDebugModal from '../components/modals/AIHandDebugModal.jsx';
import GameDebugModal from '../components/modals/GameDebugModal.jsx';
import WaitingForPlayerModal from '../components/modals/WaitingForPlayerModal.jsx';
import OpponentDronesModal from '../components/modals/OpponentDronesModal.jsx';
import ViewUpgradesModal from '../components/modals/ViewUpgradesModal.jsx';
import UpgradeSelectionModal from '../components/modals/UpgradeSelectionModal.jsx';
import DestroyUpgradeModal from '../components/modals/DestroyUpgradeModal.jsx';
import CardSelectionModal from '../CardSelectionModal.jsx';
import CardViewerModal from '../CardViewerModal.jsx';
import ViewDeckModal from '../components/modals/ViewDeckModal.jsx';
import GamePhaseModal from '../components/ui/GamePhaseModal.jsx';
import DetailedDroneModal from '../components/modals/debug/DetailedDroneModal.jsx';

/**
 * Modal Showcase Screen Component
 * Provides a dev-only interface to preview all modal components
 */
function ModalShowcaseScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedModal, setSelectedModal] = useState(null);
  const [selectedModalProps, setSelectedModalProps] = useState(null);

  const modalsByCategory = getModalsByCategory();

  // Filter modals based on search query
  const filteredModals = modalsByCategory[activeCategory].filter(modalName =>
    modalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle modal selection
  const handleModalClick = (modalName) => {
    const mockProps = getMockPropsForModal(modalName);
    if (mockProps) {
      setSelectedModal(modalName);
      setSelectedModalProps(mockProps.props);
    }
  };

  // Handle ESC key to close modal preview
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && selectedModal) {
        setSelectedModal(null);
        setSelectedModalProps(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedModal]);

  // Close modal preview
  const closeModalPreview = () => {
    setSelectedModal(null);
    setSelectedModalProps(null);
  };

  // Return to menu
  const handleCloseShowcase = () => {
    gameStateManager.setState({ appState: 'menu' });
  };

  // Render the currently selected modal
  const renderSelectedModal = () => {
    if (!selectedModal || !selectedModalProps) return null;

    // Override onClose/onCancel/onConfirm handlers to close preview instead
    const overrideProps = {
      ...selectedModalProps,
      onClose: closeModalPreview,
      onCancel: closeModalPreview,
      onConfirm: () => {
        console.log(`${selectedModal}: Confirmed`);
        closeModalPreview();
      },
      onIntercept: (drone) => {
        console.log(`${selectedModal}: Intercept with`, drone);
        closeModalPreview();
      },
      onDecline: () => {
        console.log(`${selectedModal}: Declined`);
        closeModalPreview();
      },
      onComplete: () => {
        console.log(`${selectedModal}: Completed`);
        closeModalPreview();
      },
      onSelect: (selection) => {
        console.log(`${selectedModal}: Selected`, selection);
        closeModalPreview();
      }
    };

    // Map modal names to components
    const modalComponents = {
      WinnerModal,
      InterceptionOpportunityModal,
      OpponentDecidingInterceptionModal,
      DeploymentConfirmationModal,
      CardConfirmationModal,
      DroneAbilityConfirmationModal,
      ShipAbilityConfirmationModal,
      MoveConfirmationModal,
      MandatoryActionModal,
      ConfirmationModal,
      AICardPlayReportModal,
      AIDecisionLogModal,
      AIHandDebugModal,
      GameDebugModal,
      WaitingForPlayerModal,
      OpponentDronesModal,
      ViewUpgradesModal,
      UpgradeSelectionModal,
      DestroyUpgradeModal,
      CardSelectionModal,
      CardViewerModal,
      ViewDeckModal,
      GamePhaseModal,
      DetailedDroneModal
    };

    const ModalComponent = modalComponents[selectedModal];
    if (!ModalComponent) {
      console.warn(`Modal component not found: ${selectedModal}`);
      return null;
    }

    return <ModalComponent {...overrideProps} />;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(2, 6, 23, 1)',
      overflow: 'auto',
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 20px rgba(0, 255, 136, 0.4)'
          }}>
            MODAL SHOWCASE
          </h1>
          <button
            onClick={handleCloseShowcase}
            className="btn-cancel"
            style={{ fontSize: '1rem' }}
          >
            Close Showcase
          </button>
        </div>

        <p style={{
          color: '#cccccc',
          fontSize: '1rem',
          marginBottom: '30px'
        }}>
          Preview all modal components with realistic mock data. Press ESC to close modal preview, Ctrl+M to toggle showcase.
        </p>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search modals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 20px',
            fontSize: '1rem',
            backgroundColor: '#1a1a1a',
            border: '2px solid #333',
            borderRadius: '8px',
            color: '#ffffff',
            outline: 'none',
            transition: 'border-color 0.3s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#00ff88'}
          onBlur={(e) => e.target.style.borderColor = '#333'}
        />
      </div>

      {/* Category Tabs */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {Object.entries(MODAL_CATEGORIES).map(([key, { name, count }]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              style={{
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: activeCategory === key ? 'bold' : 'normal',
                backgroundColor: activeCategory === key ? '#0088ff' : '#2a2a2a',
                color: activeCategory === key ? '#ffffff' : '#cccccc',
                border: `2px solid ${activeCategory === key ? '#00ff88' : '#444'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                if (activeCategory !== key) {
                  e.target.style.backgroundColor = '#333';
                  e.target.style.borderColor = '#666';
                }
              }}
              onMouseOut={(e) => {
                if (activeCategory !== key) {
                  e.target.style.backgroundColor = '#2a2a2a';
                  e.target.style.borderColor = '#444';
                }
              }}
            >
              {name} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Modal Grid */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {filteredModals.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666'
          }}>
            <p style={{ fontSize: '1.2rem' }}>No modals found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {filteredModals.map((modalName) => {
              const mockConfig = getMockPropsForModal(modalName);
              const category = mockConfig?.category || 'unknown';

              return (
                <button
                  key={modalName}
                  onClick={() => handleModalClick(modalName)}
                  style={{
                    padding: '20px',
                    backgroundColor: '#2a2a2a',
                    border: '2px solid #444',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#333';
                    e.currentTarget.style.borderColor = '#00ff88';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 255, 136, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                    e.currentTarget.style.borderColor = '#444';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px'
                  }}>
                    {category}
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: '#00ff88',
                    marginBottom: '4px'
                  }}>
                    {modalName.replace(/Modal$/, '')}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#999'
                  }}>
                    Click to preview
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Render Selected Modal */}
      {renderSelectedModal()}

      {/* Help Text */}
      <div style={{
        maxWidth: '1400px',
        margin: '40px auto 0',
        padding: '20px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#888'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#00ff88' }}>
          Keyboard Shortcuts:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '5px' }}>
            <strong style={{ color: '#ccc' }}>ESC:</strong> Close modal preview
          </li>
          <li style={{ marginBottom: '5px' }}>
            <strong style={{ color: '#ccc' }}>Ctrl+M:</strong> Toggle Modal Showcase from anywhere
          </li>
        </ul>
        <div style={{ marginTop: '15px', fontStyle: 'italic' }}>
          All modal interactions are logged to console. Buttons will close the preview instead of performing actual actions.
        </div>
      </div>
    </div>
  );
}

export default ModalShowcaseScreen;
