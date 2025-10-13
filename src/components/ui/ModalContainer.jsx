import React from 'react';
import ViewUpgradesModal from '../modals/ViewUpgradesModal.jsx';
import DestroyUpgradeModal from '../modals/DestroyUpgradeModal.jsx';
import UpgradeSelectionModal from '../modals/UpgradeSelectionModal.jsx';

/**
 * ModalContainer Component
 *
 * Handles the conditional rendering of upgrade-related modals to reduce
 * repetitive code in App.jsx. This component consolidates the three main
 * upgrade modals into a single reusable component.
 */
const ModalContainer = ({
  // ViewUpgradesModal props
  viewUpgradesModal,
  setViewUpgradesModal,

  // DestroyUpgradeModal props
  destroyUpgradeModal,
  setDestroyUpgradeModal,

  // UpgradeSelectionModal props
  upgradeSelectionModal,
  setUpgradeSelectionModal,

  // Shared functionality
  resolveCardPlay,
  getLocalPlayerId,
  cancelCardSelection
}) => {
  return (
    <>
      {/* View Upgrades Modal */}
      {viewUpgradesModal && (
        <ViewUpgradesModal
          modalData={viewUpgradesModal}
          onClose={() => setViewUpgradesModal(null)}
        />
      )}

      {/* Destroy Upgrade Modal */}
      {destroyUpgradeModal && (
        <DestroyUpgradeModal
          selectionData={destroyUpgradeModal}
          onConfirm={async (card, target) => {
            // Store data before closing modal
            const storedCard = card;
            const storedTarget = target;
            const playerId = getLocalPlayerId();

            // Close modal immediately
            setDestroyUpgradeModal(null);

            // Wait for modal to unmount before playing animations
            setTimeout(async () => {
              await resolveCardPlay(storedCard, storedTarget, playerId);
            }, 400);
          }}
          onCancel={() => {
            setDestroyUpgradeModal(null);
            cancelCardSelection();
          }}
        />
      )}

      {/* Upgrade Selection Modal */}
      {upgradeSelectionModal && (
        <UpgradeSelectionModal
          selectionData={upgradeSelectionModal}
          onConfirm={async (card, target) => {
            // Store data before closing modal
            const storedCard = card;
            const storedTarget = target;
            const playerId = getLocalPlayerId();

            // Close modal immediately
            setUpgradeSelectionModal(null);

            // Wait for modal to unmount before playing animations
            setTimeout(async () => {
              await resolveCardPlay(storedCard, storedTarget, playerId);
            }, 400);
          }}
          onCancel={() => {
            setUpgradeSelectionModal(null);
            cancelCardSelection();
          }}
        />
      )}
    </>
  );
};

export default ModalContainer;