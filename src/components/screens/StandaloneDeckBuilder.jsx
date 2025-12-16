// ========================================
// STANDALONE DECK BUILDER
// ========================================
// Wrapper for DeckBuilder component when accessed from main menu
// Manages its own state and provides localStorage persistence

import React, { useState, useEffect } from 'react';
import DeckBuilder from './DeckBuilder.jsx';
import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import { getShipById, getDefaultShip } from '../../data/shipData.js';
import gameStateManager from '../../managers/GameStateManager.js';
import { updateDeckState, updateDroneState } from '../../utils/deckStateUtils.js';
import { parseJSObjectLiteral, convertFromAIFormat } from '../../utils/deckExportUtils.js';

/**
 * StandaloneDeckBuilder - Wrapper component for deck building from menu
 * Provides state management and handlers for the DeckBuilder component
 */
function StandaloneDeckBuilder() {
  // Local state for deck building
  const [deck, setDeck] = useState({});
  const [selectedDrones, setSelectedDrones] = useState({});
  const [selectedShipComponents, setSelectedShipComponents] = useState({});
  const [selectedShip, setSelectedShip] = useState(getDefaultShip());
  // Preserved fields for import/export round-trip (name, description, difficulty, etc.)
  const [preservedFields, setPreservedFields] = useState({});

  // Load saved deck from localStorage on mount
  useEffect(() => {
    try {
      const savedDeck = localStorage.getItem('customDeck');
      const savedDrones = localStorage.getItem('customDrones');
      const savedShipComponents = localStorage.getItem('customShipComponents');
      const savedShipId = localStorage.getItem('customShipId');
      const savedPreservedFields = localStorage.getItem('customPreservedFields');

      if (savedDeck) {
        setDeck(JSON.parse(savedDeck));
      }
      if (savedDrones) {
        setSelectedDrones(JSON.parse(savedDrones));
      }
      if (savedShipComponents) {
        setSelectedShipComponents(JSON.parse(savedShipComponents));
      }
      if (savedShipId) {
        const ship = getShipById(savedShipId);
        if (ship) {
          setSelectedShip(ship);
        }
      }
      if (savedPreservedFields) {
        setPreservedFields(JSON.parse(savedPreservedFields));
      }
    } catch (error) {
      console.error('Error loading saved deck:', error);
    }
  }, []);

  /**
   * Handle deck change - update card quantities
   * Removes entry when quantity is 0 (fixes export bug)
   */
  const handleDeckChange = (cardId, quantity) => {
    setDeck(prev => updateDeckState(prev, cardId, quantity));
  };

  /**
   * Handle drones change - update drone quantities
   * Removes entry when quantity is 0 (fixes export bug)
   */
  const handleDronesChange = (droneName, quantity) => {
    setSelectedDrones(prev => updateDroneState(prev, droneName, quantity));
  };

  /**
   * Handle ship components change - update component lane assignments
   */
  const handleShipComponentsChange = (componentId, lane) => {
    if (componentId === null && lane === null) {
      // Reset all ship components
      setSelectedShipComponents({});
      return;
    }

    setSelectedShipComponents(prev => ({
      ...prev,
      [componentId]: lane
    }));
  };

  /**
   * Handle ship change - update selected ship card
   */
  const handleShipChange = (ship) => {
    setSelectedShip(ship);
  };

  /**
   * Handle confirm deck - save to localStorage
   * Note: Toast notification is now handled by DeckBuilder component
   */
  const handleConfirmDeck = () => {
    try {
      // Save to localStorage
      localStorage.setItem('customDeck', JSON.stringify(deck));
      localStorage.setItem('customDrones', JSON.stringify(selectedDrones));
      localStorage.setItem('customShipComponents', JSON.stringify(selectedShipComponents));
      localStorage.setItem('customShipId', selectedShip?.id || 'SHIP_001');
      localStorage.setItem('customPreservedFields', JSON.stringify(preservedFields));

      console.log('✅ Deck saved successfully to localStorage');
    } catch (error) {
      console.error('❌ Error saving deck:', error);
    }
  };

  /**
   * Handle import deck - parse JS object literal format (aiData.js style)
   */
  const handleImportDeck = (deckCode) => {
    try {
      // Parse the JS object literal
      const parseResult = parseJSObjectLiteral(deckCode);
      if (!parseResult.success) {
        return { success: false, message: parseResult.error };
      }

      const aiData = parseResult.data;

      // Convert from AI format to internal state
      const converted = convertFromAIFormat(aiData);

      // Validate cards exist
      for (const cardId of Object.keys(converted.deck)) {
        const card = fullCardCollection.find(c => c.id === cardId);
        if (!card) {
          return { success: false, message: `Card ${cardId} not found in collection.` };
        }
      }

      // Validate drones exist and are selectable
      for (const droneName of Object.keys(converted.selectedDrones)) {
        const drone = fullDroneCollection.find(d => d.name === droneName);
        if (!drone) {
          return { success: false, message: `Drone "${droneName}" not found.` };
        }
        if (drone.selectable === false) {
          return { success: false, message: `Drone "${droneName}" cannot be selected (token).` };
        }
      }

      // Validate ship exists if specified
      if (converted.shipId) {
        const ship = getShipById(converted.shipId);
        if (!ship) {
          return { success: false, message: `Ship ${converted.shipId} not found.` };
        }
        setSelectedShip(ship);
      }

      // Apply the imported data
      setDeck(converted.deck);
      setSelectedDrones(converted.selectedDrones);
      setSelectedShipComponents(converted.selectedShipComponents);
      setPreservedFields(converted.preservedFields);

      return { success: true };
    } catch (error) {
      console.error('Error importing deck:', error);
      return { success: false, message: 'Failed to parse deck code. Ensure it is valid JS object format.' };
    }
  };

  /**
   * Handle back button - return to menu
   */
  const handleBack = () => {
    gameStateManager.setState({ appState: 'menu' });
  };

  return (
    <DeckBuilder
      selectedDrones={selectedDrones}
      fullCardCollection={fullCardCollection}
      deck={deck}
      onDeckChange={handleDeckChange}
      onDronesChange={handleDronesChange}
      selectedShipComponents={selectedShipComponents}
      onShipComponentsChange={handleShipComponentsChange}
      selectedShip={selectedShip}
      onShipChange={handleShipChange}
      onConfirmDeck={handleConfirmDeck}
      onImportDeck={handleImportDeck}
      onBack={handleBack}
      preservedFields={preservedFields}
      onPreservedFieldsChange={setPreservedFields}
    />
  );
}

export default StandaloneDeckBuilder;
