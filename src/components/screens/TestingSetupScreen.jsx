// ========================================
// TESTING SETUP SCREEN
// ========================================
// Configure test game scenarios - bypass normal game flow
// Set up exact game state for testing purposes

import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState.js';
import fullDroneCollection from '../../data/droneData.js';
import fullCardCollection from '../../data/cardData.js';
import { initializeTestGame, createDefaultTestConfig } from '../../services/testGameInitializer.js';
import { startingDecklist } from '../../logic/gameLogic.js';
import { debugLog } from '../../utils/debugLogger.js';
import DroneSelectionModal from '../modals/DroneSelectionModal.jsx';
import DeckBuildingModal from '../modals/DeckBuildingModal.jsx';

/**
 * TestingSetupScreen - Configure test scenarios
 * Allows direct setup of game state to start at action phase
 */
function TestingSetupScreen() {
  const { gameStateManager } = useGameState();

  // Initialize with default config
  const [config, setConfig] = useState(createDefaultTestConfig());

  // Modal state - tracks which player's drone selection modal is open
  const [showDroneModal, setShowDroneModal] = useState(null); // 'player1' | 'player2' | null
  const [showCardModal, setShowCardModal] = useState(null); // 'player1' | 'player2' | null
  const [showHandCardModal, setShowHandCardModal] = useState(null); // 'player1' | 'player2' | null
  const [showImportModal, setShowImportModal] = useState(null); // 'player1' | 'player2' | null

  const handleBackToMenu = () => {
    debugLog('TESTING', '🔙 Returning to main menu from testing setup');
    gameStateManager.setState({ appState: 'menu' });
  };

  const handleStartTestGame = () => {
    debugLog('TESTING', '🧪 Starting test game with configuration:', config);

    // Initialize test game
    const success = initializeTestGame(config, gameStateManager);

    if (!success) {
      console.error('Failed to initialize test game');
      // Error already shown in initializeTestGame
    }
    // If successful, game state will be updated and AppRouter will route to game screen
  };

  // Helper to update player config
  const updatePlayerConfig = (player, field, value) => {
    setConfig(prev => ({
      ...prev,
      [player]: {
        ...prev[player],
        [field]: value
      }
    }));
  };

  // Helper to add a new instance of a drone to a lane
  const addDroneInstanceToLane = (player, droneName, lane) => {
    // Find the base drone from selected drones
    const baseDrone = config[player].selectedDrones.find(d => d.name === droneName);
    if (!baseDrone) return;

    // Create a new instance with unique ID
    const newInstance = {
      ...baseDrone,
      id: `${player}-${droneName}-${lane}-${Date.now()}-${Math.random()}`,
      currentHealth: baseDrone.health,
      currentShields: 0,
      currentMaxShields: baseDrone.maxShields || 0
    };

    const currentLanes = config[player].laneAssignments;
    const newLanes = {
      ...currentLanes,
      [lane]: [...currentLanes[lane], newInstance]
    };

    updatePlayerConfig(player, 'laneAssignments', newLanes);
  };

  // Helper to remove one instance of a drone from a lane
  const removeDroneInstanceFromLane = (player, droneName, lane) => {
    const currentLanes = config[player].laneAssignments;
    const laneArray = currentLanes[lane];

    // Find the last instance of this drone in the lane
    const lastIndex = laneArray.map(d => d.name).lastIndexOf(droneName);
    if (lastIndex === -1) return; // Drone not found in lane

    // Remove that instance
    const newLaneArray = [
      ...laneArray.slice(0, lastIndex),
      ...laneArray.slice(lastIndex + 1)
    ];

    const newLanes = {
      ...currentLanes,
      [lane]: newLaneArray
    };

    updatePlayerConfig(player, 'laneAssignments', newLanes);
  };

  // Open drone selection modal for a player
  const handleOpenDroneSelection = (player) => {
    setShowDroneModal(player);
  };

  // Handle drone selection confirmation from modal
  const handleDroneSelectionConfirm = (player, selectedDrones) => {
    // Add unique IDs to each drone
    const dronesWithIds = selectedDrones.map(drone => ({
      ...drone,
      id: `${player}-${drone.name}-${Date.now()}-${Math.random()}`,
      currentHealth: drone.health,
      currentShields: 0,
      currentMaxShields: drone.maxShields || 0
    }));

    updatePlayerConfig(player, 'selectedDrones', dronesWithIds);
    setShowDroneModal(null);
  };

  // Open card selection modal for a player
  const handleOpenCardSelection = (player) => {
    setShowCardModal(player);
  };

  // Handle card selection confirmation from modal
  const handleCardSelectionConfirm = (player, selectedCards) => {
    updatePlayerConfig(player, 'deckComposition', selectedCards);
    setShowCardModal(null);
  };

  // Open hand card selection modal for a player
  const handleOpenHandCardSelection = (player) => {
    setShowHandCardModal(player);
  };

  // Handle hand card selection confirmation from modal
  const handleHandCardSelectionConfirm = (player, selectedCards) => {
    // Convert selectedCards object {cardId: quantity} to array of card IDs
    const handCardIds = [];
    Object.entries(selectedCards).forEach(([cardId, quantity]) => {
      for (let i = 0; i < quantity; i++) {
        handCardIds.push(cardId);
      }
    });

    updatePlayerConfig(player, 'handCards', handCardIds);
    setShowHandCardModal(null);
  };

  // Clear hand cards for a player
  const handleClearHandCards = (player) => {
    updatePlayerConfig(player, 'handCards', []);
  };

  // Helper to convert handCards array to composition object for modal
  const convertHandArrayToComposition = (handCards) => {
    const composition = {};
    handCards.forEach(cardId => {
      composition[cardId] = (composition[cardId] || 0) + 1;
    });
    return composition;
  };

  // Open import deck modal for a player
  const handleOpenImportDeck = (player) => {
    setShowImportModal(player);
  };

  // Handle deck import
  const handleImportDeck = (player, deckCode) => {
    try {
      const sections = deckCode.split('|');
      const importedDeck = {};
      const importedDrones = [];

      for (const section of sections) {
        const [type, ...data] = section.split(':');
        const dataStr = data.join(':');

        if (type === 'cards') {
          const pairs = dataStr.split(',');
          for (const pair of pairs) {
            const [cardId, quantity] = pair.split(':');
            const qty = parseInt(quantity, 10);

            if (!cardId || isNaN(qty)) {
              alert('Invalid card format in deck code.');
              return;
            }

            // Verify card exists
            const card = fullCardCollection.find(c => c.id === cardId);
            if (!card) {
              alert(`Card ${cardId} not found.`);
              return;
            }

            importedDeck[cardId] = qty;
          }
        } else if (type === 'drones') {
          const pairs = dataStr.split(',');
          for (const pair of pairs) {
            const parts = pair.split(':');
            const quantity = parts.pop();
            const droneName = parts.join(':');
            const qty = parseInt(quantity, 10);

            if (!droneName || isNaN(qty) || qty <= 0) {
              continue; // Skip invalid entries
            }

            // Find drone in collection
            const drone = fullDroneCollection.find(d => d.name === droneName);
            if (drone) {
              importedDrones.push(drone);
            }
          }
        }
      }

      // Update deck composition
      updatePlayerConfig(player, 'deckComposition', importedDeck);

      // Update drones if any were found (limited to 5)
      if (importedDrones.length > 0) {
        const dronesUpTo5 = importedDrones.slice(0, 5);
        handleDroneSelectionConfirm(player, dronesUpTo5);
      }

      debugLog('TESTING', `📥 Imported deck for ${player}: ${Object.values(importedDeck).reduce((a, b) => a + b, 0)} cards, ${importedDrones.length} drones`);
      alert(`Deck imported successfully!\n${Object.values(importedDeck).reduce((a, b) => a + b, 0)} cards${importedDrones.length > 0 ? ` and ${Math.min(importedDrones.length, 5)} drones` : ''}`);
    } catch (error) {
      console.error('Error importing deck:', error);
      alert('Failed to parse deck code. Please check the format.');
    }
  };

  // Copy complete player configuration to other player
  const handleCopyToOtherPlayer = (fromPlayer) => {
    const toPlayer = fromPlayer === 'player1' ? 'player2' : 'player1';
    const fromConfig = config[fromPlayer];

    // Deep copy drones with new IDs for the target player
    const copiedDrones = fromConfig.selectedDrones.map(drone => ({
      ...drone,
      id: `${toPlayer}-${drone.name}-${Date.now()}-${Math.random()}`
    }));

    // Deep copy lane assignments with updated drone IDs
    const createLaneCopy = (lane) => {
      return lane.map(drone => {
        const copiedDrone = copiedDrones.find(d => d.name === drone.name);
        return copiedDrone || drone;
      });
    };

    const copiedLanes = {
      lane1: createLaneCopy(fromConfig.laneAssignments.lane1),
      lane2: createLaneCopy(fromConfig.laneAssignments.lane2),
      lane3: createLaneCopy(fromConfig.laneAssignments.lane3)
    };

    // Copy deck composition
    const copiedDeck = { ...fromConfig.deckComposition };

    // Copy hand cards
    const copiedHandCards = [...fromConfig.handCards];

    // Copy resources
    const copiedEnergy = fromConfig.energy;
    const copiedDeploymentBudget = fromConfig.deploymentBudget;
    const copiedInitialDeploymentBudget = fromConfig.initialDeploymentBudget;

    // Copy ship sections
    const copiedShipSections = [...fromConfig.shipSections];

    // Update all player configuration
    updatePlayerConfig(toPlayer, 'selectedDrones', copiedDrones);
    updatePlayerConfig(toPlayer, 'laneAssignments', copiedLanes);
    updatePlayerConfig(toPlayer, 'deckComposition', copiedDeck);
    updatePlayerConfig(toPlayer, 'handCards', copiedHandCards);
    updatePlayerConfig(toPlayer, 'energy', copiedEnergy);
    updatePlayerConfig(toPlayer, 'deploymentBudget', copiedDeploymentBudget);
    updatePlayerConfig(toPlayer, 'initialDeploymentBudget', copiedInitialDeploymentBudget);
    updatePlayerConfig(toPlayer, 'shipSections', copiedShipSections);

    debugLog('TESTING', `📋 Copied complete configuration from ${fromPlayer} to ${toPlayer}`);
  };

  // Set player's deck to standard deck
  const handleSetStandardDeck = (player) => {
    // Convert startingDecklist array to deckComposition object format
    const deckComposition = {};
    startingDecklist.forEach(item => {
      deckComposition[item.id] = item.quantity;
    });

    updatePlayerConfig(player, 'deckComposition', deckComposition);
    debugLog('TESTING', `📋 Set standard deck for ${player}`);
  };

  return (
    <div className="body-font" style={{
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      color: '#ffffff',
      padding: '20px',
      boxSizing: 'border-box',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h1 className="heading-font" style={{
          fontSize: '2.5rem',
          color: '#ffb74d',
          marginBottom: '0.5rem'
        }}>
          🧪 TESTING MODE
        </h1>
        <p style={{ color: '#aaaaaa', fontSize: '1rem' }}>
          Configure game scenario - Start directly at action phase
        </p>
      </div>

      {/* Dual Panel Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Player 1 Config */}
        <PlayerConfigPanel
          player="player1"
          playerLabel="Player 1"
          config={config.player1}
          updateConfig={(field, value) => updatePlayerConfig('player1', field, value)}
          addDroneInstanceToLane={(droneName, lane) => addDroneInstanceToLane('player1', droneName, lane)}
          removeDroneInstanceFromLane={(droneName, lane) => removeDroneInstanceFromLane('player1', droneName, lane)}
          onOpenDroneSelection={() => handleOpenDroneSelection('player1')}
          onOpenCardSelection={() => handleOpenCardSelection('player1')}
          onOpenHandCardSelection={() => handleOpenHandCardSelection('player1')}
          onClearHandCards={() => handleClearHandCards('player1')}
          onOpenImportDeck={() => handleOpenImportDeck('player1')}
          onCopyToOtherPlayer={() => handleCopyToOtherPlayer('player1')}
          onSetStandardDeck={() => handleSetStandardDeck('player1')}
        />

        {/* Player 2 Config */}
        <PlayerConfigPanel
          player="player2"
          playerLabel="Player 2"
          config={config.player2}
          updateConfig={(field, value) => updatePlayerConfig('player2', field, value)}
          addDroneInstanceToLane={(droneName, lane) => addDroneInstanceToLane('player2', droneName, lane)}
          removeDroneInstanceFromLane={(droneName, lane) => removeDroneInstanceFromLane('player2', droneName, lane)}
          onOpenDroneSelection={() => handleOpenDroneSelection('player2')}
          onOpenCardSelection={() => handleOpenCardSelection('player2')}
          onOpenHandCardSelection={() => handleOpenHandCardSelection('player2')}
          onClearHandCards={() => handleClearHandCards('player2')}
          onOpenImportDeck={() => handleOpenImportDeck('player2')}
          onCopyToOtherPlayer={() => handleCopyToOtherPlayer('player2')}
          onSetStandardDeck={() => handleSetStandardDeck('player2')}
        />
      </div>

      {/* Global Settings */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 className="heading-font" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          Global Settings
        </h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span>First Player:</span>
            <select
              value={config.firstPlayer}
              onChange={(e) => setConfig(prev => ({ ...prev, firstPlayer: e.target.value }))}
              style={{
                padding: '8px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px'
              }}
            >
              <option value="player1">Player 1</option>
              <option value="player2">Player 2</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span>Round Number:</span>
            <input
              type="number"
              min="1"
              max="99"
              value={config.roundNumber}
              onChange={(e) => setConfig(prev => ({ ...prev, roundNumber: parseInt(e.target.value) || 1 }))}
              style={{
                padding: '8px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                width: '100px'
              }}
            />
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center'
      }}>
        <button onClick={handleBackToMenu} className="btn-cancel">
          BACK TO MENU
        </button>
        <button onClick={handleStartTestGame} className="btn-confirm">
          START TEST GAME
        </button>
      </div>

      {/* Drone Selection Modals */}
      <DroneSelectionModal
        isOpen={showDroneModal === 'player1'}
        onClose={() => setShowDroneModal(null)}
        onConfirm={(selectedDrones) => handleDroneSelectionConfirm('player1', selectedDrones)}
        initialSelection={config.player1.selectedDrones}
        allDrones={fullDroneCollection}
        title="Select Drones for Player 1"
      />

      <DroneSelectionModal
        isOpen={showDroneModal === 'player2'}
        onClose={() => setShowDroneModal(null)}
        onConfirm={(selectedDrones) => handleDroneSelectionConfirm('player2', selectedDrones)}
        initialSelection={config.player2.selectedDrones}
        allDrones={fullDroneCollection}
        title="Select Drones for Player 2"
      />

      {/* Deck Building Modals */}
      <DeckBuildingModal
        isOpen={showCardModal === 'player1'}
        onClose={() => setShowCardModal(null)}
        onConfirm={(selectedCards) => handleCardSelectionConfirm('player1', selectedCards)}
        initialSelection={config.player1.deckComposition}
        allCards={fullCardCollection}
        title="Build Deck for Player 1"
        minCards={40}
      />

      <DeckBuildingModal
        isOpen={showCardModal === 'player2'}
        onClose={() => setShowCardModal(null)}
        onConfirm={(selectedCards) => handleCardSelectionConfirm('player2', selectedCards)}
        initialSelection={config.player2.deckComposition}
        allCards={fullCardCollection}
        title="Build Deck for Player 2"
        minCards={40}
      />

      {/* Hand Card Selection Modals */}
      <DeckBuildingModal
        isOpen={showHandCardModal === 'player1'}
        onClose={() => setShowHandCardModal(null)}
        onConfirm={(selectedCards) => handleHandCardSelectionConfirm('player1', selectedCards)}
        initialSelection={convertHandArrayToComposition(config.player1.handCards)}
        allCards={fullCardCollection}
        title="Select Starting Hand for Player 1"
        minCards={0}
      />

      <DeckBuildingModal
        isOpen={showHandCardModal === 'player2'}
        onClose={() => setShowHandCardModal(null)}
        onConfirm={(selectedCards) => handleHandCardSelectionConfirm('player2', selectedCards)}
        initialSelection={convertHandArrayToComposition(config.player2.handCards)}
        allCards={fullCardCollection}
        title="Select Starting Hand for Player 2"
        minCards={0}
      />

      {/* Import Deck Modal */}
      {showImportModal && (
        <ImportDeckModal
          isOpen={true}
          onClose={() => setShowImportModal(null)}
          onImport={(deckCode) => {
            handleImportDeck(showImportModal, deckCode);
            setShowImportModal(null);
          }}
          playerLabel={showImportModal === 'player1' ? 'Player 1' : 'Player 2'}
        />
      )}
    </div>
  );
}

/**
 * Player Configuration Panel
 * Simplified UI for configuring a single player's state
 */
function PlayerConfigPanel({
  player,
  playerLabel,
  config,
  updateConfig,
  addDroneInstanceToLane,
  removeDroneInstanceFromLane,
  onOpenDroneSelection,
  onOpenCardSelection,
  onOpenHandCardSelection,
  onClearHandCards,
  onOpenImportDeck,
  onCopyToOtherPlayer,
  onSetStandardDeck
}) {
  const otherPlayerLabel = player === 'player1' ? 'Player 2' : 'Player 1';
  const totalCards = Object.values(config.deckComposition || {}).reduce((sum, qty) => sum + qty, 0);
  const handCardCount = (config.handCards || []).length;

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      padding: '1.5rem',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      {/* Header with Import and Copy Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="heading-font" style={{ fontSize: '1.5rem', color: '#6dd5fa', margin: 0 }}>
          {playerLabel}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onOpenImportDeck}
            className="btn-utility"
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📥 Import Deck
          </button>
          <button
            onClick={onCopyToOtherPlayer}
            className="btn-utility"
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {player === 'player2' && <ArrowLeft size={14} />}
            📋 Copy to {otherPlayerLabel}
            {player === 'player1' && <ArrowRight size={14} />}
          </button>
        </div>
      </div>

      {/* Deck / Cards Section */}
      <div>
        <h3 style={{ fontSize: '1rem', margin: 0, marginBottom: '0.5rem', color: '#aaa' }}>
          Deck ({totalCards} cards)
        </h3>
        <button
          onClick={onOpenCardSelection}
          className="btn-confirm"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>🃏</span>
          <span>SELECT CARDS ({totalCards} total, {Object.keys(config.deckComposition || {}).length} unique)</span>
        </button>
        <button
          onClick={onSetStandardDeck}
          className="btn-utility"
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '0.9rem',
            marginTop: '8px'
          }}
        >
          Set Standard Deck
        </button>
      </div>

      {/* Starting Hand Section */}
      <div>
        <h3 style={{ fontSize: '1rem', margin: 0, marginBottom: '0.5rem', color: '#aaa' }}>
          Starting Hand ({handCardCount} cards)
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onOpenHandCardSelection}
            className="btn-confirm"
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>✋</span>
            <span>SELECT HAND ({handCardCount} cards)</span>
          </button>
          {handCardCount > 0 && (
            <button
              onClick={onClearHandCards}
              className="btn-cancel"
              style={{
                padding: '12px',
                fontSize: '0.9rem'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Drone Pool */}
      <div>
        <h3 style={{ fontSize: '1rem', margin: 0, marginBottom: '0.5rem', color: '#aaa' }}>
          Drone Pool ({config.selectedDrones.length}/5)
        </h3>
        <button
          onClick={onOpenDroneSelection}
          className="btn-confirm"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>🎯</span>
          <span>SELECT DRONES ({config.selectedDrones.length}/5)</span>
        </button>
      </div>

      {/* Lane Assignments */}
      <div>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#aaa' }}>
          Lane Assignments
        </h3>
        <LaneAssignmentGrid
          selectedDrones={config.selectedDrones}
          laneAssignments={config.laneAssignments}
          addDroneInstanceToLane={addDroneInstanceToLane}
          removeDroneInstanceFromLane={removeDroneInstanceFromLane}
        />
      </div>

      {/* Resources */}
      <div>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#aaa' }}>
          Resources
        </h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
            <span style={{ fontSize: '0.9rem' }}>Energy:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={config.energy}
              onChange={(e) => updateConfig('energy', parseInt(e.target.value) || 0)}
              style={{
                padding: '6px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px'
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
            <span style={{ fontSize: '0.9rem' }}>Deployment Budget:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={config.deploymentBudget}
              onChange={(e) => updateConfig('deploymentBudget', parseInt(e.target.value) || 0)}
              style={{
                padding: '6px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px'
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

/**
 * Lane Assignment Grid Component
 * Columnar grid UI for assigning drones to all three lanes at once
 */
function LaneAssignmentGrid({
  selectedDrones,
  laneAssignments,
  addDroneInstanceToLane,
  removeDroneInstanceFromLane
}) {
  // Helper to get drone count in specific lane
  const getDroneCount = (droneName, lane) => {
    return laneAssignments[lane].filter(d => d.name === droneName).length;
  };

  // Calculate totals for each lane
  const laneTotals = {
    lane1: laneAssignments.lane1.length,
    lane2: laneAssignments.lane2.length,
    lane3: laneAssignments.lane3.length
  };

  // Empty state
  if (selectedDrones.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        color: '#666',
        fontSize: '0.8rem',
        padding: '1rem',
        fontStyle: 'italic',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px'
      }}>
        Select drones first to assign them to lanes
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '4px',
      padding: '0.5rem',
      overflow: 'auto'
    }}>
      {/* Grid Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(140px, 1fr) repeat(3, minmax(100px, 1fr))',
        gap: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
      }}>
        {/* Header Row */}
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(109, 213, 250, 0.15)',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          color: '#6dd5fa',
          textAlign: 'left'
        }}>
          Drone Name
        </div>
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(109, 213, 250, 0.15)',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          color: '#6dd5fa',
          textAlign: 'center'
        }}>
          Lane 1
        </div>
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(109, 213, 250, 0.15)',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          color: '#6dd5fa',
          textAlign: 'center'
        }}>
          Lane 2 (Center)
        </div>
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(109, 213, 250, 0.15)',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          color: '#6dd5fa',
          textAlign: 'center'
        }}>
          Lane 3
        </div>

        {/* Data Rows - one per selected drone */}
        {selectedDrones.map((drone, index) => {
          const isEvenRow = index % 2 === 0;
          const rowBg = isEvenRow ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.03)';

          return (
            <React.Fragment key={drone.id}>
              {/* Drone Name Cell */}
              <div
                style={{
                  padding: '6px 8px',
                  backgroundColor: rowBg,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {drone.name}
              </div>

              {/* Lane 1 Controls */}
              <div
                key={`${drone.id}-lane1`}
                style={{
                  padding: '6px 8px',
                  backgroundColor: rowBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <button
                  onClick={() => removeDroneInstanceFromLane(drone.name, 'lane1')}
                  disabled={getDroneCount(drone.name, 'lane1') === 0}
                  className="btn-cancel"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    minWidth: '24px',
                    opacity: getDroneCount(drone.name, 'lane1') === 0 ? 0.3 : 1,
                    cursor: getDroneCount(drone.name, 'lane1') === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  −
                </button>
                <span style={{
                  minWidth: '20px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  color: getDroneCount(drone.name, 'lane1') > 0 ? '#6dd5fa' : '#666'
                }}>
                  {getDroneCount(drone.name, 'lane1')}
                </span>
                <button
                  onClick={() => addDroneInstanceToLane(drone.name, 'lane1')}
                  className="btn-confirm"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    minWidth: '24px'
                  }}
                >
                  +
                </button>
              </div>

              {/* Lane 2 Controls */}
              <div
                key={`${drone.id}-lane2`}
                style={{
                  padding: '6px 8px',
                  backgroundColor: rowBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <button
                  onClick={() => removeDroneInstanceFromLane(drone.name, 'lane2')}
                  disabled={getDroneCount(drone.name, 'lane2') === 0}
                  className="btn-cancel"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    minWidth: '24px',
                    opacity: getDroneCount(drone.name, 'lane2') === 0 ? 0.3 : 1,
                    cursor: getDroneCount(drone.name, 'lane2') === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  −
                </button>
                <span style={{
                  minWidth: '20px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  color: getDroneCount(drone.name, 'lane2') > 0 ? '#6dd5fa' : '#666'
                }}>
                  {getDroneCount(drone.name, 'lane2')}
                </span>
                <button
                  onClick={() => addDroneInstanceToLane(drone.name, 'lane2')}
                  className="btn-confirm"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    minWidth: '24px'
                  }}
                >
                  +
                </button>
              </div>

              {/* Lane 3 Controls */}
              <div
                key={`${drone.id}-lane3`}
                style={{
                  padding: '6px 8px',
                  backgroundColor: rowBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <button
                  onClick={() => removeDroneInstanceFromLane(drone.name, 'lane3')}
                  disabled={getDroneCount(drone.name, 'lane3') === 0}
                  className="btn-cancel"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    minWidth: '24px',
                    opacity: getDroneCount(drone.name, 'lane3') === 0 ? 0.3 : 1,
                    cursor: getDroneCount(drone.name, 'lane3') === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  −
                </button>
                <span style={{
                  minWidth: '20px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  color: getDroneCount(drone.name, 'lane3') > 0 ? '#6dd5fa' : '#666'
                }}>
                  {getDroneCount(drone.name, 'lane3')}
                </span>
                <button
                  onClick={() => addDroneInstanceToLane(drone.name, 'lane3')}
                  className="btn-confirm"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    minWidth: '24px'
                  }}
                >
                  +
                </button>
              </div>
            </React.Fragment>
          );
        })}

        {/* Footer Row - Totals */}
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(109, 213, 250, 0.1)',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          color: '#aaa',
          textAlign: 'left',
          borderTop: '2px solid rgba(109, 213, 250, 0.3)'
        }}>
          Total:
        </div>
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(109, 213, 250, 0.1)',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          color: laneTotals.lane1 > 0 ? '#6dd5fa' : '#666',
          textAlign: 'center',
          borderTop: '2px solid rgba(109, 213, 250, 0.3)'
        }}>
          {laneTotals.lane1}
        </div>
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(109, 213, 250, 0.1)',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          color: laneTotals.lane2 > 0 ? '#6dd5fa' : '#666',
          textAlign: 'center',
          borderTop: '2px solid rgba(109, 213, 250, 0.3)'
        }}>
          {laneTotals.lane2}
        </div>
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(109, 213, 250, 0.1)',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          color: laneTotals.lane3 > 0 ? '#6dd5fa' : '#666',
          textAlign: 'center',
          borderTop: '2px solid rgba(109, 213, 250, 0.3)'
        }}>
          {laneTotals.lane3}
        </div>
      </div>
    </div>
  );
}

/**
 * Import Deck Modal Component
 * Simple modal for pasting deck codes
 */
function ImportDeckModal({ isOpen, onClose, onImport, playerLabel }) {
  const [deckCode, setDeckCode] = useState('');

  if (!isOpen) return null;

  const handleImport = () => {
    if (deckCode.trim()) {
      onImport(deckCode);
      setDeckCode('');
    } else {
      alert('Please enter a deck code');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-orbitron font-bold text-purple-400 mb-4">
          Import Deck for {playerLabel}
        </h2>
        <p className="text-gray-400 mb-4">
          Paste a deck code below. The deck will be imported with both cards and drones (if included).
        </p>
        <textarea
          value={deckCode}
          onChange={(e) => setDeckCode(e.target.value)}
          className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded text-gray-300 font-mono text-sm"
          placeholder="cards:CARD001:4,CARD002:2|drones:Scout Drone:1,Heavy Fighter:1"
        />
        <div className="flex justify-end gap-4 mt-4">
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button onClick={handleImport} className="btn-confirm">
            Import Deck
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestingSetupScreen;
