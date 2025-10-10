// ========================================
// MODAL SHOWCASE HELPERS
// ========================================
// Mock data generators and modal configuration for the Modal Showcase feature
// Provides realistic preview data for all modal components

import fullDroneCollection from '../data/droneData.js';
import fullCardCollection from '../data/cardData.js';
import { gameEngine } from '../logic/gameLogic.js';

// ========================================
// MOCK DATA GENERATORS
// ========================================

/**
 * Get a sample drone from the drone collection
 * @param {string} name - Optional specific drone name
 * @returns {Object} Mock drone object with ID
 */
export const getMockDrone = (name = null) => {
  const drone = name
    ? fullDroneCollection.find(d => d.name === name)
    : fullDroneCollection[0]; // Default to Scout Drone

  return {
    ...drone,
    id: `mock-${Date.now()}-${Math.random()}`,
    isExhausted: false,
    temporaryMods: [],
    permanentMods: []
  };
};

/**
 * Get multiple mock drones
 * @param {number} count - Number of drones to return
 * @returns {Array} Array of mock drone objects
 */
export const getMockDrones = (count = 3) => {
  return fullDroneCollection.slice(0, count).map((drone, index) => ({
    ...drone,
    id: `mock-drone-${index}`,
    isExhausted: index % 2 === 0, // Alternate exhausted state
    temporaryMods: [],
    permanentMods: []
  }));
};

/**
 * Get a sample card from the card collection
 * @param {string} name - Optional specific card name
 * @returns {Object} Mock card object with instance ID
 */
export const getMockCard = (name = null) => {
  const card = name
    ? fullCardCollection.find(c => c.name === name)
    : fullCardCollection[0]; // Default to Laser Blast

  return {
    ...card,
    instanceId: `mock-card-${Date.now()}-${Math.random()}`
  };
};

/**
 * Get multiple mock cards
 * @param {number} count - Number of cards to return
 * @returns {Array} Array of mock card objects
 */
export const getMockCards = (count = 5) => {
  return fullCardCollection.slice(0, count).map((card, index) => ({
    ...card,
    instanceId: `mock-card-${index}`
  }));
};

/**
 * Get a mock ship section
 * @param {string} type - Type of ship section (bridge, powerCell, droneControlHub)
 * @returns {Object} Mock ship section object
 */
export const getMockShipSection = (type = 'bridge') => {
  const sections = {
    bridge: { name: 'bridge', health: 15, maxHealth: 20, shields: 2 },
    powerCell: { name: 'powerCell', health: 12, maxHealth: 15, shields: 1 },
    droneControlHub: { name: 'droneControlHub', health: 18, maxHealth: 20, shields: 3 }
  };

  return sections[type] || sections.bridge;
};

/**
 * Get minimal mock game state for modals
 * @returns {Object} Mock game state object
 */
export const getMockGameState = () => {
  return {
    gameMode: 'local',
    turnPhase: 'action',
    currentPlayer: 'player1',
    turn: 3,
    roundNumber: 3,
    player1: {
      name: 'Player 1',
      energy: 10,
      hand: getMockCards(5),
      deck: getMockCards(20),
      discardPile: getMockCards(5),
      dronesOnBoard: {
        lane1: [getMockDrone('Scout Drone')],
        lane2: [getMockDrone('Standard Fighter'), getMockDrone('Heavy Fighter')],
        lane3: []
      },
      shipSections: {
        bridge: getMockShipSection('bridge'),
        powerCell: getMockShipSection('powerCell'),
        droneControlHub: getMockShipSection('droneControlHub')
      },
      activeDronePool: getMockDrones(5),
      deployedDroneCounts: {},
      droneUpgrades: {}
    },
    player2: {
      name: 'AI Opponent',
      energy: 8,
      hand: getMockCards(4),
      deck: getMockCards(15),
      discardPile: getMockCards(3),
      dronesOnBoard: {
        lane1: [getMockDrone('Interceptor')],
        lane2: [getMockDrone('Guardian Drone')],
        lane3: [getMockDrone('Bomber')]
      },
      shipSections: {
        bridge: getMockShipSection('bridge'),
        powerCell: getMockShipSection('powerCell'),
        droneControlHub: getMockShipSection('droneControlHub')
      },
      activeDronePool: getMockDrones(5),
      deployedDroneCounts: {},
      droneUpgrades: {}
    },
    placedSections: [
      getMockShipSection('bridge'),
      getMockShipSection('powerCell'),
      getMockShipSection('droneControlHub')
    ],
    opponentPlacedSections: [
      getMockShipSection('bridge'),
      getMockShipSection('powerCell'),
      getMockShipSection('droneControlHub')
    ],
    passInfo: { player1Passed: false, player2Passed: false, firstPasser: null },
    gameLog: []
  };
};

// ========================================
// MODAL CATEGORIES
// ========================================

export const MODAL_CATEGORIES = {
  all: { name: 'All', count: 23 },
  confirmation: { name: 'Confirmation', count: 5 },
  interception: { name: 'Interception', count: 2 },
  gamePhase: { name: 'Game Phase', count: 3 },
  aiDebug: { name: 'AI Debug', count: 3 },
  playerActions: { name: 'Player Actions', count: 3 },
  upgrades: { name: 'Upgrades', count: 3 },
  utility: { name: 'Utility', count: 3 },
  debug: { name: 'Debug', count: 2 }
};

// ========================================
// MODAL CONFIGURATIONS
// ========================================

/**
 * Get mock props for a specific modal
 * @param {string} modalName - Name of the modal component
 * @returns {Object} Mock props object for the modal
 */
export const getMockPropsForModal = (modalName) => {
  const mockGameState = getMockGameState();
  const mockDrone = getMockDrone();
  const mockCard = getMockCard();
  const mockSection = getMockShipSection();

  const modalConfigs = {
    // ========================================
    // CONFIRMATION MODALS
    // ========================================
    'DeploymentConfirmationModal': {
      category: 'confirmation',
      props: {
        show: true,
        deploymentConfirmation: {
          budgetCost: 3,
          energyCost: 2
        },
        onConfirm: () => console.log('Deployment confirmed'),
        onCancel: () => console.log('Deployment cancelled')
      }
    },
    'CardConfirmationModal': {
      category: 'confirmation',
      props: {
        show: true,
        cardConfirmation: {
          card: getMockCard('Laser Blast'),
          target: mockDrone
        },
        onConfirm: () => console.log('Card play confirmed'),
        onCancel: () => console.log('Card play cancelled')
      }
    },
    'DroneAbilityConfirmationModal': {
      category: 'confirmation',
      props: {
        show: true,
        abilityConfirmation: {
          drone: getMockDrone('Repair Drone'),
          ability: {
            name: 'Hull Repair',
            description: 'Pay 1 Energy and exhaust to restore 3 hull to a damaged friendly drone in the same lane.',
            type: 'ACTIVE',
            cost: { energy: 1 }
          },
          target: { id: 'lane2' }
        },
        onConfirm: () => console.log('Ability confirmed'),
        onCancel: () => console.log('Ability cancelled')
      }
    },
    'ShipAbilityConfirmationModal': {
      category: 'confirmation',
      props: {
        show: true,
        shipAbilityConfirmation: {
          sectionName: 'bridge',
          ability: {
            name: 'Emergency Protocols',
            description: 'Draw 2 cards',
            type: 'ACTIVE',
            cost: { energy: 2 }
          },
          target: null
        },
        onConfirm: () => console.log('Ship ability confirmed'),
        onCancel: () => console.log('Ship ability cancelled')
      }
    },
    'MoveConfirmationModal': {
      category: 'confirmation',
      props: {
        show: true,
        moveConfirmation: {
          drone: mockDrone,
          from: 'lane1',
          to: 'lane2'
        },
        onConfirm: () => console.log('Move confirmed'),
        onCancel: () => console.log('Move cancelled')
      }
    },

    // ========================================
    // INTERCEPTION MODALS
    // ========================================
    'InterceptionOpportunityModal': {
      category: 'interception',
      props: {
        show: true,
        choiceData: {
          attackDetails: {
            attacker: getMockDrone('Standard Fighter'),
            target: getMockDrone('Scout Drone'),
            targetType: 'drone',
            lane: 'lane2'
          },
          interceptors: getMockDrones(3)
        },
        onIntercept: (drone) => console.log('Intercept with:', drone.name),
        onDecline: () => console.log('Declined interception'),
        gameEngine: gameEngine,
        turnPhase: 'action',
        isMyTurn: true,
        passInfo: { player1Passed: false, player2Passed: false },
        getLocalPlayerId: () => 'player1',
        localPlayerState: mockGameState.player1,
        shipAbilityMode: null,
        droneRefs: { current: {} },
        mandatoryAction: null
      }
    },
    'OpponentDecidingInterceptionModal': {
      category: 'interception',
      props: {
        show: true,
        attacker: mockDrone,
        target: getMockDrone('Heavy Fighter')
      }
    },

    // ========================================
    // GAME PHASE MODALS
    // ========================================
    'WinnerModal': {
      category: 'gamePhase',
      props: {
        show: true,
        winner: 'player1',
        localPlayerId: 'player1',
        onClose: () => console.log('View board')
      }
    },
    'WaitingForPlayerModal': {
      category: 'gamePhase',
      props: {
        show: true,
        message: 'Waiting for opponent to complete placement...',
        phase: 'placement'
      }
    },
    'GamePhaseModal': {
      category: 'gamePhase',
      props: {
        title: 'Deployment Phase',
        text: 'Deploy drones to lanes using your deployment budget',
        onClose: () => console.log('Modal closed'),
        children: null
      }
    },

    // ========================================
    // AI DEBUG MODALS
    // ========================================
    'AICardPlayReportModal': {
      category: 'aiDebug',
      props: {
        show: true,
        card: getMockCard('Energy Surge'),
        result: { success: true, energyGained: 2 },
        onClose: () => console.log('Modal closed')
      }
    },
    'AIDecisionLogModal': {
      category: 'aiDebug',
      props: {
        show: true,
        aiDecisionContext: {
          phase: 'action',
          decision: 'attack',
          reasoning: 'Target has low health and no shields',
          alternatives: ['pass', 'ability', 'card'],
          scores: { attack: 85, ability: 60, card: 45, pass: 20 }
        },
        onClose: () => console.log('Modal closed')
      }
    },
    'AIHandDebugModal': {
      category: 'aiDebug',
      props: {
        show: true,
        aiHand: getMockCards(5),
        onClose: () => console.log('Modal closed')
      }
    },

    // ========================================
    // PLAYER ACTION MODALS
    // ========================================
    'MandatoryActionModal': {
      category: 'playerActions',
      props: {
        show: true,
        mandatoryAction: {
          type: 'discard',
          count: 2
        },
        effectiveStats: {
          handLimit: 5,
          cpuLimit: 8
        },
        onClose: () => console.log('Modal closed')
      }
    },
    'ConfirmationModal': {
      category: 'playerActions',
      props: {
        show: true,
        title: 'Confirm Action',
        message: 'Are you sure you want to pass this phase?',
        onConfirm: () => console.log('Confirmed'),
        onCancel: () => console.log('Cancelled')
      }
    },
    'OpponentDronesModal': {
      category: 'playerActions',
      props: {
        show: true,
        drones: getMockDrones(5),
        lane: 'lane2',
        onClose: () => console.log('Modal closed')
      }
    },

    // ========================================
    // UPGRADE MODALS
    // ========================================
    'ViewUpgradesModal': {
      category: 'upgrades',
      props: {
        modalData: {
          droneName: 'Scout Drone',
          upgrades: [
            { instanceId: 'CARD020', name: 'Slimline Bodywork', description: '+1 to Deployment Limit', stat: 'limit', value: 1 },
            { instanceId: 'CARD021', name: 'Overclocked Thrusters', description: '+1 Speed', stat: 'speed', value: 1 }
          ]
        },
        onClose: () => console.log('Modal closed')
      }
    },
    'UpgradeSelectionModal': {
      category: 'upgrades',
      props: {
        selectionData: {
          card: getMockCard('Combat Enhancement'),
          targets: getMockDrones(5)
        },
        onConfirm: (card, drone) => console.log('Selected drone:', drone.name),
        onCancel: () => console.log('Cancelled')
      }
    },
    'DestroyUpgradeModal': {
      category: 'upgrades',
      props: {
        selectionData: {
          card: getMockCard('System Sabotage'),
          targets: [
            getMockDrone('Scout Drone'),
            getMockDrone('Heavy Fighter')
          ],
          opponentState: {
            appliedUpgrades: {
              'Scout Drone': [
                { instanceId: 'upgrade-1', name: 'Slimline Bodywork', stat: 'limit', value: 1 }
              ],
              'Heavy Fighter': [
                { instanceId: 'upgrade-2', name: 'Combat Enhancement', stat: 'attack', value: 1 },
                { instanceId: 'upgrade-3', name: 'Shield Amplifier', stat: 'shields', value: 1 }
              ]
            }
          }
        },
        onConfirm: (card, selectedUpgrade) => console.log('Destroying upgrade:', selectedUpgrade),
        onCancel: () => console.log('Cancelled')
      }
    },

    // ========================================
    // UTILITY MODALS
    // ========================================
    'CardSelectionModal': {
      category: 'utility',
      props: {
        isOpen: true,
        selectionData: {
          searchedCards: getMockCards(8),
          drawCount: 2,
          type: 'search_and_draw',
          filter: { type: 'upgrade' }
        },
        onConfirm: (selectedCards) => console.log('Selected:', selectedCards),
        onClose: () => console.log('Cancelled')
      }
    },
    'CardViewerModal': {
      category: 'utility',
      props: {
        isOpen: true,
        cards: getMockCards(5),
        title: 'Your Deck',
        shouldSort: true,
        onClose: () => console.log('Modal closed')
      }
    },
    'ViewDeckModal': {
      category: 'utility',
      props: {
        show: true,
        deck: getMockCards(20),
        discardPile: getMockCards(5),
        onClose: () => console.log('Modal closed')
      }
    },

    // ========================================
    // DEBUG MODALS
    // ========================================
    'GameDebugModal': {
      category: 'debug',
      props: {
        show: true,
        gameState: mockGameState,
        onClose: () => console.log('Modal closed')
      }
    },
    'DetailedDroneModal': {
      category: 'debug',
      props: {
        show: true,
        drone: getMockDrone('Heavy Fighter'),
        lane: 'lane2',
        effectiveStats: {
          attack: 4,
          hull: 4,
          shields: 1,
          speed: 3,
          power: 11
        },
        onClose: () => console.log('Modal closed')
      }
    }
  };

  return modalConfigs[modalName] || null;
};

/**
 * Get all modal names organized by category
 * @returns {Object} Object with category keys and array of modal names
 */
export const getModalsByCategory = () => {
  const allConfigs = Object.keys(getMockPropsForModal.name ? {} : {});

  return {
    all: [
      'DeploymentConfirmationModal', 'CardConfirmationModal', 'DroneAbilityConfirmationModal',
      'ShipAbilityConfirmationModal', 'MoveConfirmationModal', 'InterceptionOpportunityModal',
      'OpponentDecidingInterceptionModal', 'WinnerModal',
      'WaitingForPlayerModal', 'GamePhaseModal', 'AICardPlayReportModal',
      'AIDecisionLogModal', 'AIHandDebugModal', 'MandatoryActionModal', 'ConfirmationModal',
      'OpponentDronesModal', 'ViewUpgradesModal', 'UpgradeSelectionModal', 'DestroyUpgradeModal',
      'CardSelectionModal', 'CardViewerModal', 'ViewDeckModal', 'GameDebugModal', 'DetailedDroneModal'
    ],
    confirmation: [
      'DeploymentConfirmationModal', 'CardConfirmationModal', 'DroneAbilityConfirmationModal',
      'ShipAbilityConfirmationModal', 'MoveConfirmationModal'
    ],
    interception: [
      'InterceptionOpportunityModal', 'OpponentDecidingInterceptionModal'
    ],
    gamePhase: [
      'WinnerModal', 'WaitingForPlayerModal', 'GamePhaseModal'
    ],
    aiDebug: [
      'AICardPlayReportModal', 'AIDecisionLogModal', 'AIHandDebugModal'
    ],
    playerActions: [
      'MandatoryActionModal', 'ConfirmationModal', 'OpponentDronesModal'
    ],
    upgrades: [
      'ViewUpgradesModal', 'UpgradeSelectionModal', 'DestroyUpgradeModal'
    ],
    utility: [
      'CardSelectionModal', 'CardViewerModal', 'ViewDeckModal'
    ],
    debug: [
      'GameDebugModal', 'DetailedDroneModal'
    ]
  };
};
