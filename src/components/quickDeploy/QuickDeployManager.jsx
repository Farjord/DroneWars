/**
 * QuickDeployManager Component
 * Main modal for managing quick deployment templates
 * Lists saved deployments and provides create/edit/delete functionality
 */

import React, { useState, useMemo } from 'react';
import { Zap, Plus, Edit2, Trash2 } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import QuickDeployService, { MAX_QUICK_DEPLOYMENTS } from '../../logic/quickDeploy/QuickDeployService';
import { calculateTotalCost, validateAgainstDeck } from '../../logic/quickDeploy/QuickDeployValidator';
import shipSectionData from '../../data/shipSectionData';
import { getAllShips } from '../../data/shipData';
import { calculateSectionBaseStats } from '../../logic/statsCalculator';

/**
 * QuickDeployManager Component
 * @param {Object} props
 * @param {Function} props.onClose - Close modal callback
 */
const QuickDeployManager = ({ onClose }) => {
  const { gameState, gameStateManager } = useGameState();
  const [deleteConfirm, setDeleteConfirm] = useState(null); // deployment ID to confirm deletion

  // Get saved quick deployments from game state
  const quickDeployments = gameState.quickDeployments || [];
  const service = useMemo(() => new QuickDeployService(gameStateManager), [gameStateManager]);

  // Get ship slots for validation display
  const shipSlots = gameState.singlePlayerShipSlots || [];
  const playerProfile = gameState.singlePlayerProfile || {};

  // Calculate validation status for each deployment against all active decks
  const deploymentsWithValidation = useMemo(() => {
    return quickDeployments.map(qd => {
      const validFor = [];
      const invalidFor = [];

      shipSlots.forEach(slot => {
        if (slot.status !== 'active' || !slot.drones || slot.drones.length === 0) return;

        // Get ship card for stats calculation
        const shipCard = getAllShips().find(s => s.id === slot.shipId);
        if (!shipCard) return;

        // Get placed sections for the slot
        const placedSections = Object.keys(slot.shipComponents || {});

        // Build proper ship sections with hull/thresholds
        const shipSections = {};
        for (const sectionId of placedSections) {
          const sectionTemplate = shipSectionData[sectionId];
          if (sectionTemplate) {
            const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
            shipSections[sectionId] = {
              ...JSON.parse(JSON.stringify(sectionTemplate)),
              hull: baseStats.hull,
              maxHull: baseStats.maxHull,
              thresholds: baseStats.thresholds
            };
          }
        }

        const mockPlayerState = { shipSections };
        const result = validateAgainstDeck(qd, slot, mockPlayerState, placedSections);

        if (result.valid) {
          validFor.push(slot.name || `Slot ${slot.id}`);
        } else {
          invalidFor.push({
            name: slot.name || `Slot ${slot.id}`,
            reasons: result.reasons
          });
        }
      });

      return {
        ...qd,
        validFor,
        invalidFor,
        cost: calculateTotalCost(qd.placements)
      };
    });
  }, [quickDeployments, shipSlots]);

  const remainingSlots = MAX_QUICK_DEPLOYMENTS - quickDeployments.length;
  const canCreate = remainingSlots > 0;

  // Handle creating a new deployment - navigate to full-page editor
  const handleCreate = () => {
    gameStateManager.setState({
      appState: 'quickDeployEditor',
      quickDeployEditorData: {
        isCreating: true,
        deployment: {
          id: null,
          name: '',
          droneRoster: [],
          placements: []
        }
      }
    });
  };

  // Handle editing an existing deployment - navigate to full-page editor
  const handleEdit = (deployment) => {
    gameStateManager.setState({
      appState: 'quickDeployEditor',
      quickDeployEditorData: {
        isCreating: false,
        deployment: {
          id: deployment.id,
          name: deployment.name,
          droneRoster: [...deployment.droneRoster],
          placements: [...deployment.placements]
        }
      }
    });
  };

  // Handle delete
  const handleDelete = (id) => {
    try {
      service.delete(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete quick deployment:', error);
    }
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Zap size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Quick Deployments</h2>
            <p className="dw-modal-header-subtitle">
              {quickDeployments.length}/{MAX_QUICK_DEPLOYMENTS} saved
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Description */}
          <div className="dw-modal-info-box" style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0 }}>
              Create pre-configured drone placements for quick turn-1 deployment.
              Each template specifies 5 drones and their lane assignments.
            </p>
          </div>

          {/* Deployments Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Existing Deployments */}
            {deploymentsWithValidation.map(deployment => (
              <div
                key={deployment.id}
                className="dw-blueprint-card"
                style={{
                  padding: '16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => handleEdit(deployment)}
              >
                <div className="dw-blueprint-card-scanline" />
                <div className="dw-blueprint-card-inner" style={{ position: 'relative', zIndex: 1 }}>
                  {/* Name */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '8px'
                  }}>
                    {deployment.name}
                  </div>

                  {/* Drone count and cost */}
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--modal-text-secondary)',
                    marginBottom: '8px'
                  }}>
                    {deployment.placements.length} drone{deployment.placements.length !== 1 ? 's' : ''} placed
                    {deployment.placements.length > 0 && (
                      <span style={{ color: '#fbbf24' }}> • {deployment.cost} cost</span>
                    )}
                  </div>

                  {/* Lane preview - compact */}
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '10px'
                  }}>
                    {[0, 1, 2].map(lane => {
                      const dronesInLane = deployment.placements.filter(p => p.lane === lane);
                      return (
                        <div
                          key={lane}
                          style={{
                            flex: 1,
                            height: '24px',
                            background: 'rgba(6, 182, 212, 0.1)',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            borderRadius: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: dronesInLane.length > 0 ? '#06b6d4' : 'rgba(255,255,255,0.3)'
                          }}
                        >
                          {dronesInLane.length > 0 ? dronesInLane.length : '-'}
                        </div>
                      );
                    })}
                  </div>

                  {/* Validity indicator */}
                  <div style={{
                    fontSize: '11px',
                    color: deployment.validFor.length > 0 ? 'var(--modal-success)' : 'var(--modal-text-muted)'
                  }}>
                    {deployment.validFor.length > 0 ? (
                      <>Valid for {deployment.validFor.length} deck{deployment.validFor.length !== 1 ? 's' : ''}</>
                    ) : (
                      <>No matching decks</>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '12px'
                  }}>
                    <button
                      className="dw-btn dw-btn-secondary"
                      style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(deployment);
                      }}
                    >
                      <Edit2 size={14} style={{ marginRight: '4px' }} />
                      Edit
                    </button>
                    <button
                      className="dw-btn dw-btn-danger"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(deployment.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Create New Card */}
            {canCreate && (
              <div
                className="dw-blueprint-card"
                style={{
                  padding: '16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '160px',
                  borderStyle: 'dashed'
                }}
                onClick={handleCreate}
              >
                <Plus size={32} style={{ color: 'var(--modal-theme)', marginBottom: '8px' }} />
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--modal-theme)'
                }}>
                  Create New
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--modal-text-muted)',
                  marginTop: '4px'
                }}>
                  {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {quickDeployments.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: 'var(--modal-text-muted)'
            }}>
              <Zap size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                No quick deployments yet
              </div>
              <div style={{ fontSize: '12px' }}>
                Create a template to speed up turn-1 deployment
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div
            className="dw-modal-overlay"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="dw-modal-content dw-modal--sm dw-modal--action"
              onClick={e => e.stopPropagation()}
            >
              <div className="dw-modal-header">
                <div className="dw-modal-header-info">
                  <h2 className="dw-modal-header-title">Delete Deployment?</h2>
                </div>
              </div>
              <div className="dw-modal-body">
                <p className="dw-modal-text">
                  This action cannot be undone.
                </p>
              </div>
              <div className="dw-modal-actions">
                <button
                  className="dw-btn dw-btn-cancel"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="dw-btn dw-btn-danger"
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickDeployManager;
