// ========================================
// MODAL SHOWCASE HELPERS
// ========================================
// Mock data generators and modal configuration for the Modal Showcase feature
// Provides realistic preview data for all modal components

import fullDroneCollection from '../../data/droneData.js';
import fullCardCollection from '../../data/cardData.js';
import { gameEngine } from '../../logic/gameLogic.js';

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
  all: { name: 'All', count: 47 },
  extraction: { name: 'Extraction', count: 8 },
  danger: { name: 'Danger', count: 2 },
  confirmation: { name: 'Confirmation', count: 5 },
  interception: { name: 'Interception', count: 2 },
  gamePhase: { name: 'Game Phase', count: 8 },
  aiDebug: { name: 'AI Debug', count: 3 },
  playerActions: { name: 'Player Actions', count: 3 },
  upgrades: { name: 'Upgrades', count: 3 },
  utility: { name: 'Utility', count: 7 },
  debug: { name: 'Debug', count: 3 },
  hangar: { name: 'Hangar', count: 5 }
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
    'WinnerModal (Defeat)': {
      category: 'gamePhase',
      props: {
        show: true,
        winner: 'player2',
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
    'PhaseAnnouncementOverlay': {
      category: 'gamePhase',
      props: {
        phaseText: 'DEPLOYMENT PHASE',
        subtitle: 'You Go First',
        onComplete: () => console.log('Phase announcement complete')
      }
    },
    'PhaseAnnouncementOverlay (Action)': {
      category: 'gamePhase',
      props: {
        phaseText: 'ACTION PHASE',
        subtitle: 'Your Turn',
        onComplete: () => console.log('Phase announcement complete')
      }
    },
    'PhaseAnnouncementOverlay (Combat)': {
      category: 'gamePhase',
      props: {
        phaseText: 'COMBAT PHASE',
        subtitle: null,
        onComplete: () => console.log('Phase announcement complete')
      }
    },

    // ========================================
    // AI DEBUG MODALS
    // ========================================
    'AICardPlayReportModal': {
      category: 'aiDebug',
      props: {
        report: {
          card: getMockCard('Energy Surge'),
          targetName: 'Scout Drone',
          targetLane: 'Lane 1'
        },
        onClose: () => console.log('Modal closed')
      }
    },
    'AIDecisionLogModal': {
      category: 'aiDebug',
      props: {
        show: true,
        decisionLog: [
          {
            type: 'attack',
            instigator: 'Heavy Fighter',
            targetName: 'Enemy Drone',
            attacker: { lane: 'lane1' },
            target: { name: 'ScoutDrone', id: 'drone1', owner: 'ai' },
            score: 85,
            logic: ['Target has low health', 'No shields', 'High damage potential'],
            isChosen: true
          },
          {
            type: 'deploy',
            instigator: 'Scout Drone',
            targetName: 'Lane 2',
            score: 60,
            logic: ['Empty lane', 'Strategic positioning'],
            isChosen: false
          }
        ],
        getLocalPlayerId: () => 'player1',
        onClose: () => console.log('Modal closed')
      }
    },
    'AIHandDebugModal': {
      category: 'aiDebug',
      props: {
        show: true,
        debugMode: true,
        opponentPlayerState: { hand: getMockCards(5) },
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
        confirmationModal: {
          type: 'discard',
          text: 'Are you sure you want to discard this card? This action cannot be undone.',
          onConfirm: () => console.log('Confirmed'),
          onCancel: () => console.log('Cancelled')
        }
      }
    },
    'OpponentDronesModal': {
      category: 'playerActions',
      props: {
        isOpen: true,
        drones: getMockDrones(5),
        appliedUpgrades: {},
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
        allCards: getMockCards(12),
        title: 'Remaining Cards in Deck',
        groupByType: true,
        onClose: () => console.log('Modal closed')
      }
    },
    'ViewDeckModal': {
      category: 'utility',
      props: {
        isOpen: true,
        title: "Player's Deck",
        drones: getMockDrones(5),
        cards: getMockCards(10).map(card => ({ card, quantity: 2 })),
        shipComponents: {},
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
        gameStateManager: {
          getState: () => mockGameState,
          getLocalPlayerId: () => 'player1'
        },
        gameDataService: null,
        onClose: () => console.log('Modal closed')
      }
    },
    'DetailedDroneModal': {
      category: 'debug',
      props: {
        isOpen: true,
        drone: getMockDrone('Heavy Fighter'),
        onClose: () => console.log('Modal closed')
      }
    },

    // ========================================
    // EXTRACTION / INTO THE EREMOS MODALS
    // ========================================
    'AbandonRunModal': {
      category: 'danger',
      props: {
        show: true,
        lootCount: 5,
        creditsEarned: 250,
        onCancel: () => console.log('Abandon cancelled'),
        onConfirm: () => console.log('Abandon confirmed')
      }
    },
    'MIARecoveryModal': {
      category: 'danger',
      props: {
        shipSlot: {
          id: 1,
          name: 'Ship Slot 1',
          status: 'mia',
          drones: [getMockDrone('Scout Drone'), getMockDrone('Heavy Fighter')],
          shipComponents: { left: 'comp1', middle: 'comp2', right: 'comp3' }
        },
        onClose: () => console.log('MIA Recovery closed')
      }
    },
    'MapOverviewModal': {
      category: 'extraction',
      props: {
        selectedSlotId: 1,
        selectedMap: {
          name: 'Sector A-1',
          tier: 1,
          radius: 3,
          hexes: [
            { q: 0, r: 0, type: 'empty' },
            { q: 1, r: 0, type: 'poi' },
            { q: -1, r: 1, type: 'gate' }
          ],
          gates: [{ id: 0, q: -1, r: 1 }],
          pois: [{ id: 'poi1', q: 1, r: 0, type: 'Ordnance' }],
          poiTypeBreakdown: { Ordnance: 2, Support: 1, Tactic: 1, Upgrade: 1 },
          poiCount: 5,
          gateCount: 3,
          baseDetection: 15,
          baseEncounterChance: 5
        },
        selectedCoordinate: 'A-1',
        activeSectors: [{ coordinate: 'A-1' }, { coordinate: 'B-2' }],
        onNavigate: (coord) => console.log('Navigate to:', coord),
        onDeploy: (slotId, map, gateId) => console.log('Deploy:', slotId, map.name, gateId),
        onClose: () => console.log('Map Overview closed')
      }
    },
    'WaypointConfirmationModal': {
      category: 'extraction',
      props: {
        targetHex: { q: 1, r: 0, type: 'poi' },
        currentPosition: { q: 0, r: 0 },
        mapData: {
          tier: 1,
          hexes: [
            { q: 0, r: 0, type: 'empty' },
            { q: 1, r: 0, type: 'poi' }
          ]
        },
        currentDetection: 15,
        onConfirm: () => console.log('Movement confirmed'),
        onCancel: () => console.log('Movement cancelled')
      }
    },
    'POIEncounterModal': {
      category: 'extraction',
      props: {
        encounter: {
          poi: {
            poiData: {
              name: 'Ordnance Cache',
              description: 'Military supplies detected',
              color: '#ef4444',
              flavourText: 'Sensors detecting military-grade hardware signatures...'
            }
          },
          outcome: 'combat',
          aiId: 'rogue_interceptor',
          reward: {
            credits: 50,
            rewardType: 'ordnance_cards',
            cards: getMockCards(2)
          },
          detection: 10,
          threatLevel: 'medium'
        },
        onProceed: () => console.log('POI encounter proceed'),
        onClose: () => console.log('POI encounter closed')
      }
    },
    'LootRevealModal': {
      category: 'extraction',
      props: {
        show: true,
        loot: {
          cards: [
            { cardId: 'CARD001', rarity: 'Common', cardName: 'Laser Blast', cardType: 'Ordnance' },
            { cardId: 'CARD002', rarity: 'Common', cardName: 'Shield Boost', cardType: 'Support' },
            { cardId: 'CARD003', rarity: 'Uncommon', cardName: 'Energy Surge', cardType: 'Tactic' },
            { cardId: 'CARD007', rarity: 'Rare', cardName: 'Overcharge', cardType: 'Tactic' },
            { cardId: 'CARD020', rarity: 'Mythic', cardName: 'Slimline Bodywork', cardType: 'Upgrade' }
          ],
          credits: 150,
          blueprint: null
        },
        onCollect: () => console.log('Loot collected')
      }
    },
    'RunInventoryModal': {
      category: 'extraction',
      props: {
        currentRunState: {
          collectedLoot: [getMockCard('Laser Blast'), getMockCard('Energy Surge')],
          creditsEarned: 150,
          poisVisited: 3,
          currentDetection: 25
        },
        onClose: () => console.log('Run Inventory closed')
      }
    },
    'ExtractionSummaryModal': {
      category: 'extraction',
      props: {
        show: true,
        summary: {
          success: true,
          lootCollected: [getMockCard('Laser Blast'), getMockCard('Energy Surge')],
          creditsEarned: 250,
          poisVisited: 5,
          totalPois: 8,
          detectionAtExtraction: 45,
          combatsWon: 2,
          combatsLost: 0
        },
        onContinue: () => console.log('Continue after extraction')
      }
    },
    'RunSummaryModal': {
      category: 'extraction',
      props: {
        summary: {
          success: true,
          mapName: 'Sector A-1',
          mapTier: 1,
          hexesMoved: 15,
          hexesExplored: 12,
          totalHexes: 25,
          mapCompletionPercent: 48,
          poisVisited: 5,
          totalPois: 8,
          cardsCollected: [{ cardId: 'CARD001' }, { cardId: 'CARD002' }],
          creditsEarned: 250,
          combatsWon: 2,
          combatsLost: 0,
          damageDealtToEnemies: 24,
          hullDamageTaken: 8,
          finalHull: 12,
          maxHull: 20,
          runDuration: 180000,
          finalDetection: 45
        },
        onClose: () => console.log('Run Summary closed')
      }
    },

    // ========================================
    // UTILITY MODALS (Additional)
    // ========================================
    'CardDetailModal': {
      category: 'utility',
      props: {
        isOpen: true,
        card: getMockCard('Energy Surge'),
        onClose: () => console.log('Card detail closed')
      }
    },
    'GlossaryModal': {
      category: 'utility',
      props: {
        onClose: () => console.log('Glossary closed')
      }
    },
    'AIStrategyModal': {
      category: 'utility',
      props: {
        onClose: () => console.log('AI Strategy closed')
      }
    },
    'ViewShipSectionModal': {
      category: 'utility',
      props: {
        isOpen: true,
        onClose: () => console.log('Ship section closed'),
        data: {
          sectionName: 'bridge',
          sectionStats: {
            name: 'Standard Bridge',
            stats: { healthy: { hull: 8, shields: 2 } },
            description: 'The command center of your ship. Houses critical navigation and communication systems.',
            ability: {
              id: 'bridge-ability',
              name: 'Emergency Protocols',
              description: 'Draw 2 cards from your deck.',
              cost: { energy: 2 }
            },
            middleLaneBonus: { hull: 2, shields: 1 },
            // Stats needed by ShipSection component
            hull: 8,
            maxHull: 10,
            shields: 2,
            allocatedShields: 2,
            thresholds: { critical: 3, damaged: 6 },
            image: ''
          },
          // Only renderable values (no objects)
          effectiveStats: {
            hull: 8,
            shields: 2
          },
          isInMiddleLane: true,
          isPlayer: true
        }
      }
    },
    'LogModal': {
      category: 'debug',
      props: {
        isOpen: true,
        onClose: () => console.log('Log closed'),
        gameLog: [
          { turn: 1, phase: 'deploy', action: 'Player deployed Scout Drone to Lane 1' },
          { turn: 1, phase: 'action', action: 'AI played Energy Surge' },
          { turn: 2, phase: 'combat', action: 'Scout Drone attacked AI Bridge for 2 damage' }
        ],
        downloadLogAsCSV: () => console.log('Download CSV'),
        setAiDecisionLogToShow: () => {},
        onCardInfoClick: () => {}
      }
    },
    // ========================================
    // HANGAR MODALS
    // ========================================
    'SaveLoadModal': {
      category: 'hangar',
      props: {
        onClose: () => console.log('SaveLoad closed')
      }
    },
    'InventoryModal': {
      category: 'hangar',
      props: {
        onClose: () => console.log('Inventory closed')
      }
    },
    'BlueprintsModal': {
      category: 'hangar',
      props: {
        onClose: () => console.log('Blueprints closed')
      }
    },
    'RepairBayModal': {
      category: 'hangar',
      props: {
        onClose: () => console.log('Repair Bay closed')
      }
    },
    'ReplicatorModal': {
      category: 'hangar',
      props: {
        onClose: () => console.log('Replicator closed')
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
  return {
    all: [
      // Extraction modals
      'MapOverviewModal', 'WaypointConfirmationModal', 'POIEncounterModal',
      'LootRevealModal', 'RunInventoryModal', 'ExtractionSummaryModal', 'RunSummaryModal',
      // Danger modals
      'AbandonRunModal', 'MIARecoveryModal',
      // Confirmation modals
      'DeploymentConfirmationModal', 'CardConfirmationModal', 'DroneAbilityConfirmationModal',
      'ShipAbilityConfirmationModal', 'MoveConfirmationModal',
      // Interception modals
      'InterceptionOpportunityModal', 'OpponentDecidingInterceptionModal',
      // Game phase modals
      'WinnerModal', 'WinnerModal (Defeat)', 'WaitingForPlayerModal', 'GamePhaseModal',
      'PhaseAnnouncementOverlay', 'PhaseAnnouncementOverlay (Action)', 'PhaseAnnouncementOverlay (Combat)',
      // AI debug modals
      'AICardPlayReportModal', 'AIDecisionLogModal', 'AIHandDebugModal',
      // Player action modals
      'MandatoryActionModal', 'ConfirmationModal', 'OpponentDronesModal',
      // Upgrade modals
      'ViewUpgradesModal', 'UpgradeSelectionModal', 'DestroyUpgradeModal',
      // Utility modals
      'CardSelectionModal', 'CardViewerModal', 'ViewDeckModal',
      'CardDetailModal', 'GlossaryModal', 'AIStrategyModal', 'ViewShipSectionModal',
      // Debug modals
      'GameDebugModal', 'DetailedDroneModal', 'LogModal',
      // Hangar modals
      'SaveLoadModal', 'InventoryModal', 'BlueprintsModal', 'RepairBayModal', 'ReplicatorModal'
    ],
    extraction: [
      'MapOverviewModal', 'WaypointConfirmationModal', 'POIEncounterModal',
      'LootRevealModal', 'RunInventoryModal', 'ExtractionSummaryModal', 'RunSummaryModal'
    ],
    danger: [
      'AbandonRunModal', 'MIARecoveryModal'
    ],
    confirmation: [
      'DeploymentConfirmationModal', 'CardConfirmationModal', 'DroneAbilityConfirmationModal',
      'ShipAbilityConfirmationModal', 'MoveConfirmationModal'
    ],
    interception: [
      'InterceptionOpportunityModal', 'OpponentDecidingInterceptionModal'
    ],
    gamePhase: [
      'WinnerModal', 'WinnerModal (Defeat)', 'WaitingForPlayerModal', 'GamePhaseModal',
      'PhaseAnnouncementOverlay', 'PhaseAnnouncementOverlay (Action)', 'PhaseAnnouncementOverlay (Combat)'
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
      'CardSelectionModal', 'CardViewerModal', 'ViewDeckModal',
      'CardDetailModal', 'GlossaryModal', 'AIStrategyModal', 'ViewShipSectionModal'
    ],
    debug: [
      'GameDebugModal', 'DetailedDroneModal', 'LogModal'
    ],
    hangar: [
      'SaveLoadModal', 'InventoryModal', 'BlueprintsModal', 'RepairBayModal', 'ReplicatorModal'
    ]
  };
};
