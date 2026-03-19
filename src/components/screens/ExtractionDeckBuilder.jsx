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
} from '../../logic/combat/shipSlotUtils.js';
import { parseJSObjectLiteral, convertFromAIFormat } from '../../logic/cards/deckExportUtils.js';
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
  // Preserved fields for import/export round-trip
  const [preservedFields, setPreservedFields] = useState({});

  // Ship is locked in at the slot level (assigned in Hangar before entering deck builder)
  const selectedShip = slot ? (getShipById(slot.shipId) || getDefaultShip()) : getDefaultShip();

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
          const deckObj = {};
          (starterSlot.decklist || []).forEach(card => {
            deckObj[card.id] = card.quantity;
          });
          setDeck(deckObj);
          setDroneSlots(migrateDroneSlotsToNewFormat(starterSlot.droneSlots));
          setSelectedShipComponents({ ...starterSlot.shipComponents });
        }
        setDeckName('New Ship');
      } else {
        // Start with empty deck
        setDeck({});
        setDroneSlots(createEmptyDroneSlots());
        setSelectedShipComponents({});
        setDeckName('New Ship');
      }
    } else if (slot) {
      // Editing existing slot
      setDeckName(slot.name || `Ship Slot ${slotId}`);
      const deckObj = {};
      (slot.decklist || []).forEach(card => {
        deckObj[card.id] = card.quantity;
      });
      setDeck(deckObj);
      setDroneSlots(migrateDroneSlotsToNewFormat(slot.droneSlots));
      setSelectedShipComponents({ ...slot.shipComponents });
    }
  }, [slotId, newDeckOption, slot, singlePlayerShipSlots, isNewDeck]);

  // Calculate available cards/drones/components using shared model
  const unlockedBlueprints = singlePlayerProfile?.unlockedBlueprints || [];

  const availableCards = useMemo(() => {
    return calculateAvailableCards(singlePlayerInventory || {});
  }, [singlePlayerInventory]);

  const availableDrones = useMemo(() => {
    return calculateAvailableDrones(unlockedBlueprints);
  }, [unlockedBlueprints]);

  const availableComponents = useMemo(() => {
    return calculateAvailableComponents(unlockedBlueprints);
  }, [unlockedBlueprints]);

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

      // Ship is locked in at the slot level — ignore imported shipId

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
            className="dw-btn-hud dw-btn-hud-cyan"
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
          deckName={deckName}
          onDeckNameChange={setDeckName}
          // Pass available drones/components collections for filtering
          availableDrones={availableDrones}
          availableComponents={availableComponents}
          // Ship is locked in from Hangar — read-only display
          selectedShip={selectedShip}
          // Ship Configuration Tab props
          shipSlot={slot}
          droneSlots={droneSlots}
          credits={singlePlayerProfile?.credits || 0}
          onRepairSectionSlot={handleRepairSectionSlot}
        />
      </div>
    </div>
  );
};

export default ExtractionDeckBuilder;
