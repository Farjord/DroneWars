// ========================================
// EXTRACTION DECK BUILDER SCREEN
// ========================================
// Full-screen deck editor for single-player extraction mode
// Handles card/drone availability filtering and instance management

import React, { useState, useEffect, useMemo } from 'react';
import DeckBuilder from './DeckBuilder.jsx';
import { useGameState } from '../../hooks/useGameState';
import {
  calculateAvailableCards,
  calculateAvailableDrones,
  calculateAvailableComponents,
  calculateAvailableShips
} from '../../utils/singlePlayerDeckUtils.js';
import { getShipById, getDefaultShip } from '../../data/shipData.js';
import { updateDeckState, updateDroneState } from '../../utils/deckStateUtils.js';

/**
 * ExtractionDeckBuilder
 * Full-screen deck editor for single-player extraction mode
 * Reads slotId and newDeckOption from gameState
 */
const ExtractionDeckBuilder = () => {
  const { gameState, gameStateManager } = useGameState();
  const {
    singlePlayerInventory,
    singlePlayerShipSlots,
    singlePlayerDroneInstances,
    singlePlayerShipComponentInstances,
    singlePlayerProfile,
    extractionDeckSlotId,
    extractionNewDeckOption
  } = gameState;

  // Get navigation context
  const slotId = extractionDeckSlotId;
  const newDeckOption = extractionNewDeckOption;

  // Get the slot being edited
  const slot = singlePlayerShipSlots?.find(s => s.id === slotId);
  const isReadOnly = slotId === 0;
  const isNewDeck = newDeckOption !== null;

  // Local state for deck editing
  const [deckName, setDeckName] = useState('');
  const [deck, setDeck] = useState({});
  const [selectedDrones, setSelectedDrones] = useState({});
  const [selectedShipComponents, setSelectedShipComponents] = useState({});
  const [selectedShip, setSelectedShip] = useState(null);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Initialize state based on slot data or newDeckOption
  useEffect(() => {
    if (isNewDeck) {
      // Creating a new deck
      if (newDeckOption === 'copyFromSlot0') {
        // Copy from starter deck (slot 0)
        const starterSlot = singlePlayerShipSlots?.find(s => s.id === 0);
        if (starterSlot) {
          // Convert decklist array to object format
          const deckObj = {};
          (starterSlot.decklist || []).forEach(card => {
            deckObj[card.id] = card.quantity;
          });
          setDeck(deckObj);

          // Convert drones array to object format
          const dronesObj = {};
          (starterSlot.drones || []).forEach(drone => {
            dronesObj[drone.name] = 1;
          });
          setSelectedDrones(dronesObj);

          // Copy ship components
          setSelectedShipComponents({ ...starterSlot.shipComponents });

          // Copy ship card
          const shipCard = getShipById(starterSlot.shipId) || getDefaultShip();
          setSelectedShip(shipCard);
        }
        setDeckName('New Ship');
      } else {
        // Start with empty deck
        setDeck({});
        setSelectedDrones({});
        setSelectedShipComponents({});
        setSelectedShip(getDefaultShip());
        setDeckName('New Ship');
      }
    } else if (slot) {
      // Editing existing slot
      setDeckName(slot.name || `Ship Slot ${slotId}`);

      // Convert decklist array to object format
      const deckObj = {};
      (slot.decklist || []).forEach(card => {
        deckObj[card.id] = card.quantity;
      });
      setDeck(deckObj);

      // Convert drones array to object format
      const dronesObj = {};
      (slot.drones || []).forEach(drone => {
        dronesObj[drone.name] = 1;
      });
      setSelectedDrones(dronesObj);

      // Copy ship components
      setSelectedShipComponents({ ...slot.shipComponents });

      // Load ship card
      const shipCard = getShipById(slot.shipId) || getDefaultShip();
      setSelectedShip(shipCard);
    }
  }, [slotId, newDeckOption, slot, singlePlayerShipSlots, isNewDeck]);

  // Calculate available cards/drones/components using helper functions
  const availableCards = useMemo(() => {
    return calculateAvailableCards(
      slotId,
      singlePlayerShipSlots || [],
      singlePlayerInventory || {}
    );
  }, [slotId, singlePlayerShipSlots, singlePlayerInventory]);

  const availableDrones = useMemo(() => {
    return calculateAvailableDrones(
      slotId,
      singlePlayerShipSlots || [],
      singlePlayerDroneInstances || []
    );
  }, [slotId, singlePlayerShipSlots, singlePlayerDroneInstances]);

  const availableComponents = useMemo(() => {
    return calculateAvailableComponents(
      slotId,
      singlePlayerShipSlots || [],
      singlePlayerShipComponentInstances || []
    );
  }, [slotId, singlePlayerShipSlots, singlePlayerShipComponentInstances]);

  // Calculate available ships (filtered by inventory and slot usage)
  const availableShips = useMemo(() => {
    return calculateAvailableShips(
      slotId,
      singlePlayerShipSlots || [],
      singlePlayerInventory || {}
    );
  }, [slotId, singlePlayerShipSlots, singlePlayerInventory]);

  // Get drone instances for damage display
  const droneInstances = useMemo(() => {
    return singlePlayerDroneInstances?.filter(inst =>
      selectedDrones[inst.droneName]
    ) || [];
  }, [singlePlayerDroneInstances, selectedDrones]);

  // Get component instances for hull display
  const componentInstances = useMemo(() => {
    return singlePlayerShipComponentInstances?.filter(inst =>
      selectedShipComponents[inst.componentId]
    ) || [];
  }, [singlePlayerShipComponentInstances, selectedShipComponents]);

  // Handle deck change - removes entry when quantity is 0
  const handleDeckChange = (cardId, quantity) => {
    if (isReadOnly) return;
    setDeck(prev => updateDeckState(prev, cardId, quantity));
  };

  // Handle drones change - removes entry when quantity is 0
  const handleDronesChange = (droneName, quantity) => {
    if (isReadOnly) return;
    setSelectedDrones(prev => updateDroneState(prev, droneName, quantity));
  };

  // Handle ship components change
  const handleShipComponentsChange = (componentId, lane) => {
    if (isReadOnly) return;

    if (componentId === null && lane === null) {
      setSelectedShipComponents({});
      return;
    }

    setSelectedShipComponents(prev => ({
      ...prev,
      [componentId]: lane
    }));
  };

  // Handle ship card change
  const handleShipChange = (ship) => {
    if (isReadOnly) return;
    setSelectedShip(ship);
  };

  // Navigate back to hangar
  const navigateBack = () => {
    gameStateManager.setState({
      appState: 'hangar',
      extractionDeckSlotId: null,
      extractionNewDeckOption: null
    });
  };

  // Handle save deck
  const handleConfirmDeck = () => {
    if (isReadOnly) {
      navigateBack();
      return;
    }

    // Convert to slot format
    const decklist = Object.entries(deck)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({ id, quantity }));

    const drones = Object.entries(selectedDrones)
      .filter(([, qty]) => qty > 0)
      .map(([name]) => ({ name }));

    const deckData = {
      name: deckName || `Ship Slot ${slotId}`,
      decklist,
      drones,
      shipComponents: selectedShipComponents,
      shipId: selectedShip?.id || null
    };

    // Save using GameStateManager
    gameStateManager.saveShipSlotDeck(slotId, deckData);

    // Show toast, then hide after delay (stay in editor - do NOT navigate away)
    setShowSaveToast(true);
    setTimeout(() => {
      setShowSaveToast(false);
    }, 1500);
  };

  // Handle save invalid deck (incomplete but save anyway)
  const handleSaveInvalid = () => {
    // Same as handleConfirmDeck but called when deck is invalid
    handleConfirmDeck();
  };

  // Handle back button
  const handleBack = () => {
    navigateBack();
  };

  // Handle case where slotId is not set (shouldn't happen normally)
  if (slotId === null || slotId === undefined) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">No slot selected</p>
          <button
            onClick={navigateBack}
            className="dw-btn dw-btn-confirm"
          >
            Return to Hangar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col">
      {/* DeckBuilder Component (takes full screen) */}
      <div className="flex-grow overflow-hidden">
        <DeckBuilder
          selectedDrones={selectedDrones}
          fullCardCollection={availableCards}
          deck={deck}
          onDeckChange={handleDeckChange}
          onDronesChange={handleDronesChange}
          selectedShipComponents={selectedShipComponents}
          onShipComponentsChange={handleShipComponentsChange}
          onConfirmDeck={handleConfirmDeck}
          onBack={handleBack}
          // Extraction mode props
          maxDrones={5}
          mode="extraction"
          readOnly={isReadOnly}
          allowInvalidSave={!isReadOnly}
          onSaveInvalid={handleSaveInvalid}
          droneInstances={droneInstances}
          componentInstances={componentInstances}
          deckName={deckName}
          onDeckNameChange={setDeckName}
          // Pass available drones/components/ships collections for filtering
          availableDrones={availableDrones}
          availableComponents={availableComponents}
          availableShips={availableShips}
          // Ship card selection
          selectedShip={selectedShip}
          onShipChange={handleShipChange}
        />
      </div>

      {/* Save Toast Notification */}
      {showSaveToast && (
        <div className="save-toast">
          <span className="save-toast-icon">✓</span>
          <span className="save-toast-text">Deck Saved!</span>
        </div>
      )}
    </div>
  );
};

export default ExtractionDeckBuilder;
