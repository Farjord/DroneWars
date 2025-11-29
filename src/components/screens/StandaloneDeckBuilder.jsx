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
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Load saved deck from localStorage on mount
  useEffect(() => {
    try {
      const savedDeck = localStorage.getItem('customDeck');
      const savedDrones = localStorage.getItem('customDrones');
      const savedShipComponents = localStorage.getItem('customShipComponents');
      const savedShipId = localStorage.getItem('customShipId');

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
    } catch (error) {
      console.error('Error loading saved deck:', error);
    }
  }, []);

  /**
   * Handle deck change - update card quantities
   */
  const handleDeckChange = (cardId, quantity) => {
    setDeck(prev => ({
      ...prev,
      [cardId]: quantity
    }));
  };

  /**
   * Handle drones change - update drone quantities
   */
  const handleDronesChange = (droneName, quantity) => {
    setSelectedDrones(prev => ({
      ...prev,
      [droneName]: quantity
    }));
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
   */
  const handleConfirmDeck = () => {
    try {
      // Save to localStorage
      localStorage.setItem('customDeck', JSON.stringify(deck));
      localStorage.setItem('customDrones', JSON.stringify(selectedDrones));
      localStorage.setItem('customShipComponents', JSON.stringify(selectedShipComponents));
      localStorage.setItem('customShipId', selectedShip?.id || 'SHIP_001');

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);

      console.log('✅ Deck saved successfully to localStorage');
    } catch (error) {
      console.error('❌ Error saving deck:', error);
    }
  };

  /**
   * Handle import deck - parse and load deck code
   */
  const handleImportDeck = (deckCode) => {
    try {
      const importedDeck = {};
      const importedDrones = {};
      const importedShipComponents = {};

      // Split into cards, drones, and ship sections
      const sections = deckCode.split('|');

      for (const section of sections) {
        const [type, ...data] = section.split(':');
        const dataStr = data.join(':'); // Rejoin in case drone names have colons

        if (type === 'cards') {
          const pairs = dataStr.split(',');
          for (const pair of pairs) {
            const [cardId, quantity] = pair.split(':');
            const qty = parseInt(quantity, 10);

            if (!cardId || isNaN(qty)) {
              return { success: false, message: 'Invalid card format in deck code.' };
            }

            // Verify card exists
            const card = fullCardCollection.find(c => c.id === cardId);
            if (!card) {
              return { success: false, message: `Card ${cardId} not found.` };
            }

            importedDeck[cardId] = qty;
          }
        } else if (type === 'drones') {
          const pairs = dataStr.split(',');
          for (const pair of pairs) {
            const parts = pair.split(':');
            const quantity = parts.pop(); // Last element is quantity
            const droneName = parts.join(':'); // Everything else is the drone name
            const qty = parseInt(quantity, 10);

            if (!droneName || isNaN(qty)) {
              return { success: false, message: 'Invalid drone format in deck code.' };
            }

            // Verify drone exists and is selectable
            const baseDrone = fullDroneCollection.find(d => d.name === droneName);
            if (!baseDrone) {
              return { success: false, message: `Drone ${droneName} not found.` };
            }
            if (baseDrone.selectable === false) {
              return { success: false, message: `Drone ${droneName} cannot be imported (non-selectable token).` };
            }

            importedDrones[droneName] = qty;
          }
        } else if (type === 'ship') {
          const pairs = dataStr.split(',');
          for (const pair of pairs) {
            const [componentId, lane] = pair.split(':');

            if (!componentId || !lane || !['l', 'm', 'r'].includes(lane)) {
              return { success: false, message: 'Invalid ship component format in deck code.' };
            }

            importedShipComponents[componentId] = lane;
          }
        }
      }

      setDeck(importedDeck);
      setSelectedDrones(importedDrones);
      setSelectedShipComponents(importedShipComponents);
      return { success: true };
    } catch (error) {
      console.error('Error importing deck:', error);
      return { success: false, message: 'Failed to parse deck code.' };
    }
  };

  /**
   * Handle back button - return to menu
   */
  const handleBack = () => {
    gameStateManager.setState({ appState: 'menu' });
  };

  return (
    <>
      {/* Success Message */}
      {showSuccessMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '16px 32px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          ✅ Deck Saved Successfully!
        </div>
      )}

      {/* Render DeckBuilder with all required props */}
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
      />
    </>
  );
}

export default StandaloneDeckBuilder;
