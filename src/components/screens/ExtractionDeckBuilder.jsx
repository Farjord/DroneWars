// ========================================
// EXTRACTION DECK BUILDER SCREEN
// ========================================
// Full-screen deck editor for single-player extraction mode
// Handles card/drone availability filtering and instance management

import React, { useState, useEffect, useMemo } from 'react';
import DeckBuilder from './DeckBuilder/DeckBuilder.jsx';
import { useGameState } from '../../hooks/useGameState';
import {
  calculateAvailableCards,
  calculateAvailableDrones,
  calculateAvailableComponents,
  calculateAvailableShips
} from '../../logic/singlePlayer/singlePlayerDeckUtils.js';
import { getShipById, getDefaultShip } from '../../data/shipData.js';
import { updateDeckState } from '../../utils/deckStateUtils.js';
import {
  createEmptyDroneSlots,
  migrateDroneSlotsToNewFormat
} from '../../logic/migration/saveGameMigrations.js';
import {
  addDroneToSlots,
  removeDroneFromSlots
} from '../../logic/combat/slotDamageUtils.js';
import { parseJSObjectLiteral, convertFromAIFormat } from '../../utils/deckExportUtils.js';
import { debugLog } from '../../utils/debugLogger.js';

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
  const [droneSlots, setDroneSlots] = useState(createEmptyDroneSlots());
  const [selectedShipComponents, setSelectedShipComponents] = useState({});
  const [selectedShip, setSelectedShip] = useState(null);
  // Preserved fields for import/export round-trip
  const [preservedFields, setPreservedFields] = useState({});

  // Derive selectedDrones object from droneSlots for DeckBuilder compatibility
  const selectedDrones = useMemo(() => {
    const dronesObj = {};
    droneSlots.forEach(slot => {
      if (slot.assignedDrone) {
        dronesObj[slot.assignedDrone] = (dronesObj[slot.assignedDrone] || 0) + 1;
      }
    });
    return dronesObj;
  }, [droneSlots]);

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

          // Use droneSlots with migration for field name consistency
          setDroneSlots(migrateDroneSlotsToNewFormat(starterSlot.droneSlots));

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
        setDroneSlots(createEmptyDroneSlots());
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

      // Use droneSlots with migration for field name consistency
      setDroneSlots(migrateDroneSlotsToNewFormat(slot.droneSlots));

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

  // Handle drones change - add/remove from slots
  const handleDronesChange = (droneName, quantity) => {
    if (isReadOnly) return;

    // quantity 0 = remove drone, quantity 1 = add drone
    if (quantity === 0) {
      setDroneSlots(prev => removeDroneFromSlots(prev, droneName));
    } else if (quantity === 1) {
      // Check if drone is already in a slot
      const existingSlot = droneSlots.find(s => s.assignedDrone === droneName);
      if (!existingSlot) {
        setDroneSlots(prev => addDroneToSlots(prev, droneName));
      }
    }
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

  // Handle save deck (toast is now handled by DeckBuilder component)
  const handleConfirmDeck = () => {
    if (isReadOnly) {
      navigateBack();
      return;
    }

    // Convert to slot format
    const decklist = Object.entries(deck)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({ id, quantity }));

    // Derive legacy drones array from droneSlots for backward compatibility
    const drones = droneSlots
      .filter(slot => slot.assignedDrone)
      .map(slot => ({ name: slot.assignedDrone }));

    const deckData = {
      name: deckName || `Ship Slot ${slotId}`,
      decklist,
      droneSlots,  // Pass the new format
      drones,       // Also include legacy format for backward compat
      shipComponents: selectedShipComponents,
      shipId: selectedShip?.id || null
    };

    // Save using GameStateManager (DeckBuilder shows toast)
    gameStateManager.saveShipSlotDeck(slotId, deckData);
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

  // Handle import deck - parse JS object literal format (aiData.js style)
  const handleImportDeck = (deckCode) => {
    if (isReadOnly) {
      return { success: false, message: 'Cannot import to read-only deck.' };
    }

    try {
      // Parse the JS object literal
      const parseResult = parseJSObjectLiteral(deckCode);
      if (!parseResult.success) {
        return { success: false, message: parseResult.error };
      }

      const aiData = parseResult.data;

      // Convert from AI format to internal state
      const converted = convertFromAIFormat(aiData);

      // Validate cards exist in available cards
      for (const cardId of Object.keys(converted.deck)) {
        const card = availableCards.find(c => c.id === cardId);
        if (!card) {
          return { success: false, message: `Card ${cardId} not available in extraction mode.` };
        }
      }

      // Validate drones exist in available drones
      for (const droneName of Object.keys(converted.selectedDrones)) {
        const drone = availableDrones.find(d => d.name === droneName);
        if (!drone) {
          return { success: false, message: `Drone "${droneName}" not available in extraction mode.` };
        }
      }

      // Validate ship exists if specified
      if (converted.shipId) {
        const ship = availableShips.find(s => s.id === converted.shipId);
        if (!ship) {
          return { success: false, message: `Ship ${converted.shipId} not available in extraction mode.` };
        }
        setSelectedShip(ship);
      }

      // Apply the imported data
      setDeck(converted.deck);
      setSelectedShipComponents(converted.selectedShipComponents);
      setPreservedFields(converted.preservedFields);

      // Convert drones to drone slots
      const newDroneSlots = createEmptyDroneSlots();
      let slotIndex = 0;
      Object.entries(converted.selectedDrones).forEach(([droneName, qty]) => {
        for (let i = 0; i < qty && slotIndex < newDroneSlots.length; i++) {
          newDroneSlots[slotIndex].assignedDrone = droneName;
          slotIndex++;
        }
      });
      setDroneSlots(newDroneSlots);

      // Update deck name if preserved
      if (converted.preservedFields.name) {
        setDeckName(converted.preservedFields.name);
      }

      return { success: true };
    } catch (error) {
      debugLog('DECK_BUILDER', 'Error importing deck:', error);
      return { success: false, message: 'Failed to parse deck code. Ensure it is valid JS object format.' };
    }
  };

  // Handle drone slot repair
  const handleRepairDroneSlot = (position) => {
    if (isReadOnly || !slotId) return;
    const result = gameStateManager.repairDroneSlot(slotId, position);
    if (!result.success) {
      debugLog('DECK_BUILDER', 'Failed to repair drone slot:', result.reason);
    }
  };

  // Handle section slot repair
  const handleRepairSectionSlot = (lane) => {
    if (isReadOnly || !slotId) return;
    const result = gameStateManager.repairSectionSlot(slotId, lane);
    if (!result.success) {
      debugLog('DECK_BUILDER', 'Failed to repair section slot:', result.reason);
    }
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
          onImportDeck={handleImportDeck}
          onBack={handleBack}
          // Preserved fields for import/export round-trip
          preservedFields={preservedFields}
          onPreservedFieldsChange={setPreservedFields}
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
          // Ship Configuration Tab props
          shipSlot={slot}
          droneSlots={droneSlots}
          credits={singlePlayerProfile?.credits || 0}
          onRepairDroneSlot={handleRepairDroneSlot}
          onRepairSectionSlot={handleRepairSectionSlot}
        />
      </div>
    </div>
  );
};

export default ExtractionDeckBuilder;
