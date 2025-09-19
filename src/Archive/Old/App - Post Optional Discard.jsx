import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Shield, Bolt, Wrench, Sprout, Hand, ShipWheel, Settings, X, ChevronRight, ChevronLeft, Plus, RotateCcw, ShieldCheck, Sword, Search, Gavel, Bomb, Rocket, Skull, Bug, Cpu, Target, View, Zap, Heart, ChevronUp, ChevronDown } from 'lucide-react';
import './App.css';


// --- THEME & STYLING ---
const theme = {
  colors: {
    background: 'bg-slate-950',
    primary: 'blue',
    accent: 'cyan',
    hull: {
      healthy: 'bg-green-400',
      damaged: 'bg-red-500',
    },
    shields: 'text-cyan-300',
    energy: 'text-yellow-300',
    deployment: 'text-purple-400',
  },
  font: {
    heading: 'font-orbitron',
    body: 'font-exo',
  }
};

// --- ICON MAP ---
const iconMap = {
  Shield, Bolt, Wrench, Sprout, Hand, ShipWheel, Settings, X, ChevronRight, ChevronLeft, Plus, RotateCcw, ShieldCheck, Sword, Search, Gavel, Bomb, Rocket, Skull, Bug, Cpu, Target, View, Zap, Heart, ChevronUp, ChevronDown
};

// --- DATA ---
const fullDroneCollection = [
  { name: 'Scout Drone', class: 1, limit: 3, attack: 1, hull: 1, shields: 1, speed: 5, image: 'https://placehold.co/128x128/0ff/000?text=Scout', abilities: [] },
  { name: 'Standard Fighter', class: 2, limit: 3, attack: 3, hull: 2, shields: 1, speed: 4, image: 'https://placehold.co/128x128/f0f/000?text=Fighter', abilities: [] },
  { name: 'Heavy Fighter', class: 3, limit: 2, attack: 4, hull: 3, shields: 2, speed: 3, image: 'https://placehold.co/128x128/ff0/000?text=Heavy', abilities: [] },
  { name: 'Guardian Drone', class: 3, limit: 2, attack: 2, hull: 5, shields: 3, speed: 1, image: 'https://placehold.co/128x128/00f/fff?text=Guardian', abilities: [] },
  { name: 'Stealth Bomber', class: 3, limit: 1, attack: 5, hull: 2, shields: 1, speed: 3, image: 'https://placehold.co/128x128/f00/fff?text=Stealth', abilities: [] },
  { 
    name: 'Repair Drone', 
    class: 2, limit: 2, attack: 0, hull: 2, shields: 1, speed: 2, 
    image: 'https://placehold.co/128x128/0f0/000?text=Repair', 
    abilities: [{
        name: 'Nano Repair',
        description: 'Pay 1 Energy and exhaust to restore 2 hull to a damaged friendly drone in the same lane.',
        type: 'ACTIVE',
        icon: Wrench,
        targeting: {
            type: 'DRONE',
            affinity: 'FRIENDLY',
            location: 'SAME_LANE',
            custom: ['DAMAGED_HULL']
        },
        effect: { type: 'HEAL', value: 2 },
        cost: { energy: 1, exhausts: true }
    }]
  },
  { 
    name: 'Interceptor', 
    class: 3, limit: 3, attack: 3, hull: 2, shields: 1, speed: 2, 
    image: 'https://placehold.co/128x128/fff/000?text=Interceptor',
    abilities: [{
        name: 'Vigilant',
        description: 'Can always intercept attacks in this lane, regardless of speed.',
        type: 'PASSIVE',
        icon: ShieldCheck,
        effect: { type: 'GRANT_KEYWORD', keyword: 'ALWAYS_INTERCEPTS' }
    }] 
  },
  { 
    name: 'Aegis Drone', 
    class: 3, limit: 2, attack: 1, hull: 2, shields: 2, speed: 2, 
    image: 'https://placehold.co/128x128/ccc/000?text=Aegis',
    abilities: [{
        name: 'Shield Harmonizer',
        description: 'Other friendly drones in this lane gain +1 max shields.',
        type: 'PASSIVE',
        icon: Shield,
        scope: 'FRIENDLY_IN_LANE',
        effect: { type: 'MODIFY_STAT', stat: 'shields', value: 1 }
    }]
  },
  { name: 'Kamikaze Drone', class: 2, limit: 1, attack: 6, hull: 1, shields: 0, speed: 4, image: 'https://placehold.co/128x128/f80/000?text=Kamikaze', abilities: [] },
  { name: 'Swarm Drone', class: 0, limit: 3, attack: 1, hull: 1, shields: 0, speed: 3, image: 'https://placehold.co/128x128/80f/fff?text=Swarm', abilities: [] },
  { 
    name: 'Sniper Drone', 
    class: 4, limit: 1, attack: 1, hull: 1, shields: 0, speed: 2, 
    image: 'https://placehold.co/128x128/aaa/000?text=Sniper', 
    abilities: [{
        name: 'Long-Range Shot',
        description: 'Pay 2 Energy and exhaust to deal 2 damage to an enemy drone in any lane.',
        type: 'ACTIVE',
        icon: Target,
        targeting: {
            type: 'DRONE',
            affinity: 'ENEMY',
            location: 'ANY_LANE'
        },
        effect: { type: 'DAMAGE', value: 2 },
        cost: { energy: 2, exhausts: true }
    }]
  },
];

// --- NEW: CARD DATA ---
const fullCardCollection = [
  {
    id: 'CARD001',
    name: 'Laser Blast',
    type: 'Action',
    cost: 2,
    image: 'https://placehold.co/128x128/f43f5e/ffffff?text=Blast',
    description: 'Deal 3 damage to any drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY', 
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 3
    }
  },
    {
    id: 'CARD002',
    name: 'System Reboot',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/22d3ee/ffffff?text=Draw',
    description: 'Draw 2 cards from your deck.',
    // No targeting key is needed for this card
    effect: {
      type: 'DRAW',
      value: 2
    }
  },
   {
    id: 'CARD003',
    name: 'Quick Maneuver',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/a855f7/ffffff?text=Go+Again',
    description: 'Draw 1 card. You may perform another action this turn.',
    // No targeting is needed
    effect: {
      type: 'DRAW',
      value: 1,
      goAgain: true // This is the new flag for our mechanic
    }
  },
    {
    id: 'CARD004',
    name: 'Energy Surge',
    type: 'Action',
    cost: 0,
    image: 'https://placehold.co/128x128/facc15/000000?text=Energy',
    description: 'Gain 2 Energy.',
    // No targeting is needed for this effect
    effect: {
      type: 'GAIN_ENERGY',
      value: 2
    }
  },
    {
    id: 'CARD005',
    name: 'Adrenaline Rush',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/10b981/ffffff?text=Ready',
    description: 'Ready an exhausted friendly drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE',
      custom: ['EXHAUSTED'] // This new rule will filter for exhausted drones
    },
    effect: {
      type: 'READY_DRONE' // This is our new effect type
    }
  },
    {
    id: 'CARD006',
    name: 'Shield Battery',
    type: 'Action',
    cost: 0,
    image: 'https://placehold.co/128x128/60a5fa/ffffff?text=Shield+',
    description: 'Restore 3 shields to a friendly drone. Cannot exceed its maximum shields.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'HEAL_SHIELDS', // New effect type
      value: 3
    }
  },
  {
    id: 'CARD007',
    name: 'Emergency Patch',
    type: 'Action',
    cost: 0,
    image: 'https://placehold.co/128x128/34d399/ffffff?text=Patch',
    description: 'Restore 4 hull to one of your ship sections.',
    targeting: {
      type: 'SHIP_SECTION', // Targets a ship section
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_HULL', // New effect type
      value: 4
    }
  },
  {
    id: 'CARD008',
    name: 'Repair Wave',
    type: 'Action',
    cost: 0,
    image: 'https://placehold.co/128x128/4ade80/000000?text=Wave',
    description: 'Restore 1 hull to all friendly drones in a target lane.',
    targeting: {
      type: 'LANE', // New targeting type
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_HULL',
      value: 1
    }
  },
  // NEW CARD: Single-target destroy
  {
    id: 'CARD009',
    name: 'Target Lock',
    type: 'Action',
    cost: 0, // High cost for a powerful effect
    image: 'https://placehold.co/128x128/f87171/ffffff?text=Target',
    description: 'Destroy a single target drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DESTROY',
      scope: 'SINGLE' // Our new 'scope' for single targets
    }
  },

  // NEW CARD: Filtered-target destroy
  {
    id: 'CARD010',
    name: 'EMP Burst',
    type: 'Action',
    cost: 0,
    image: 'https://placehold.co/128x128/60a5fa/ffffff?text=EMP',
    description: 'Destroy all enemy drones with a speed of 5 or higher in a selected lane.',
    targeting: {
      type: 'LANE',
      affinity: 'ENEMY' // This card can only target enemy lanes
    },
    effect: {
      type: 'DESTROY',
      scope: 'FILTERED', // Our new 'scope' for conditional effects
      filter: { stat: 'speed', comparison: 'GTE', value: 5 }
    }
  },

  // NUKE card
  {
    id: 'CARD011',
    name: 'Nuke',
    type: 'Action',
    cost: 0, // Increased cost to reflect its power
    image: 'https://placehold.co/128x128/ef4444/ffffff?text=Nuke',
    description: 'Destroy ALL drones in a selected lane (both sides).',
    targeting: {
      type: 'LANE',
      affinity: 'ANY'
    },
    effect: {
      type: 'DESTROY',
      scope: 'LANE' // This scope remains the same
    }
  },
];

// --- HELPER FUNCTIONS ---
const getRandomDrones = (collection, count) => {
  const shuffled = [...collection].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// --- MODIFIED ---
const createCard = (cardTemplate, instanceId) => {
  return { ...cardTemplate, instanceId };
};

// --- NEW: DECKLIST DEFINITION ---
// This list defines the contents of the starting deck.
const startingDecklist = [
    { id: 'CARD001', quantity: 0 },
    { id: 'CARD002', quantity: 0 },
    { id: 'CARD003', quantity: 0 },
    { id: 'CARD004', quantity: 0 },
    { id: 'CARD005', quantity: 0 },
    { id: 'CARD006', quantity: 0 },
    { id: 'CARD007', quantity: 0 },
    { id: 'CARD008', quantity: 0 },
    { id: 'CARD009', quantity: 1 },
    { id: 'CARD010', quantity: 1 },
    { id: 'CARD011', quantity: 1 },
];


// --- NEW: UPDATED FUNCTION ---
const createStartingDeck = () => {
  const deck = [];
  let instanceCounter = 0;

  startingDecklist.forEach(item => {
    // Find the full card data using the id from the decklist
    const cardTemplate = fullCardCollection.find(c => c.id === item.id);
    if (cardTemplate) {
      // Add the specified quantity of that card
      for (let i = 0; i < item.quantity; i++) {
        deck.push(createCard(cardTemplate, `card-${instanceCounter++}`));
      }
    }
  });

  // Shuffle the final deck so the cards are in a random order
  return deck.sort(() => 0.5 - Math.random());
};

const getShipStatus = (section) => {
    if (section.hull <= section.thresholds.critical) {
      return 'critical';
    }
    if (section.hull <= section.thresholds.damaged) {
      return 'damaged';
    }
    return 'healthy';
};

const calculateEffectiveShipStats = (playerState) => {
    const stats = {};
    if (!playerState || !playerState.shipSections) {
        return { handLimit: 0, discardLimit: 0, energyPerTurn: 0, maxEnergy: 0, shieldsPerTurn: 0, initialDeployment: 0, cpuLimit: 0 };
    }
    for (const sectionName in playerState.shipSections) {
      const section = playerState.shipSections[sectionName];
      const status = getShipStatus(section);
      stats[sectionName] = section.stats[status];
    }
    return {
      handLimit: stats.bridge['Draw'],
      discardLimit: stats.bridge['Discard'],
      energyPerTurn: stats.powerCell['Energy Per Turn'],
      maxEnergy: stats.powerCell['Max Energy'],
      shieldsPerTurn: stats.powerCell['Shields Per Turn'],
      initialDeployment: stats.droneControlHub['Initial Deployment'],
      cpuLimit: stats.droneControlHub['CPU Control Value'],
    };
};

// --- INITIAL STATE ---
const initialPlayerState = (name) => {
  const shipSections = {
    bridge: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'The command center of your ship.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Draw': 5, 'Discard': 2 },
        damaged: { 'Draw': 4, 'Discard': 1 }, 
        critical: { 'Draw': 3, 'Discard': 1 },
      },
      image: '/img/Bridge.png'
    },

    powerCell: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'Generates energy to power your abilities.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Energy Per Turn': 10, 'Max Energy': 10, 'Shields Per Turn': 4 },
        damaged: { 'Energy Per Turn': 8, 'Max Energy': 8, 'Shields Per Turn': 3 },
        critical: { 'Energy Per Turn': 6, 'Max Energy': 6, 'Shields Per Turn': 2 },
      },
      image: '/img/Power_Cell.png'
    },

    droneControlHub: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'Controls your drone fleet.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Initial Deployment': 6, 'CPU Control Value': 10 },
        damaged: { 'Initial Deployment': 5, 'CPU Control Value': 8 },
        critical: { 'Initial Deployment': 4, 'CPU Control Value': 6 },
      },
      image: '/img/Drone_Control_Hub.png'
    }
  };

  const healthyStats = calculateEffectiveShipStats({ shipSections });

  return {
    name: name,
    shipSections: shipSections,
    energy: healthyStats.energyPerTurn,
    initialDeploymentBudget: healthyStats.initialDeployment,
    hand: [],
    deck: createStartingDeck(),
    discardPile: [],
    activeDronePool: [],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    deployedDroneCounts: {},
  };
};

const onDroneDestroyed = (playerState, destroyedDrone) => {
    if (!playerState.deployedDroneCounts.hasOwnProperty(destroyedDrone.name)) {
        return {};
    }
    const newDeployedCounts = { ...playerState.deployedDroneCounts };
    const droneName = destroyedDrone.name;
    if (newDeployedCounts[droneName] > 0) {
        newDeployedCounts[droneName] -= 1;
    }
    return { deployedDroneCounts: newDeployedCounts };
};


// --- MAIN APP COMPONENT ---
const App = () => {
  const [modalContent, setModalContent] = useState(null);
  const [deploymentConfirmation, setDeploymentConfirmation] = useState(null);
  const [moveConfirmation, setMoveConfirmation] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [turnPhase, setTurnPhase] = useState('preGame');
  const [turn, setTurn] = useState(1);
  const [placedSections, setPlacedSections] = useState([]);
  const [opponentPlacedSections, setOpponentPlacedSections] = useState([]);
  const [shieldsToAllocate, setShieldsToAllocate] = useState(0);
  const [player1, setPlayer1] = useState(initialPlayerState('Player 1'));
  const [player2, setPlayer2] = useState(initialPlayerState('Player 2'));
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [firstPlayerOfRound, setFirstPlayerOfRound] = useState(null);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [passInfo, setPassInfo] = useState({ firstPasser: null, player1Passed: false, player2Passed: false });
  const [aiActionCount, setAiActionCount] = useState(0);
  const [footerView, setFooterView] = useState('drones');
  const sectionsToPlace = ['bridge', 'powerCell', 'droneControlHub'];
  const [showFirstPlayerModal, setShowFirstPlayerModal] = useState(false);
  const [pendingAttack, setPendingAttack] = useState(null);
  const [interceptionModal, setInterceptionModal] = useState(null);
  const [firstPasserOfPreviousRound, setFirstPasserOfPreviousRound] = useState(null);
  const [firstPlayerOverride, setFirstPlayerOverride] = useState(null); // For future card effects
  const [playerInterceptionChoice, setPlayerInterceptionChoice] = useState(null);
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [potentialInterceptors, setPotentialInterceptors] = useState([]);
  const [aiActionReport, setAiActionReport] = useState(null);
  const [tempSelectedDrones, setTempSelectedDrones] = useState([]);
  const [droneSelectionPool, setDroneSelectionPool] = useState([]);
  const [droneSelectionPair, setDroneSelectionPair] = useState([]);
  const [recentlyHitDrones, setRecentlyHitDrones] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [arrowState, setArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const droneRefs = useRef({});
  const gameAreaRef = useRef(null);
  const [winner, setWinner] = useState(null);
  const [showActionPhaseStartModal, setShowActionPhaseStartModal] = useState(false);
  const [showRoundEndModal, setShowRoundEndModal] = useState(false);
  const [isFooterOpen, setIsFooterOpen] = useState(true);
  const triggerExplosion = useCallback((targetId) => {
    const pos = getElementCenter(droneRefs.current[targetId]);
    if (pos) {
      const explosionId = `${Date.now()}-${Math.random()}`;
      setExplosions(prev => [...prev, { id: explosionId, top: pos.y, left: pos.x }]);
      setTimeout(() => {
        setExplosions(prev => prev.filter(ex => ex.id !== explosionId));
      }, 1000);
    }
  }, 
  
[]);
  // --- ABILITY STATE ---
  const [abilityMode, setAbilityMode] = useState(null); // { drone, ability }
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);
  
  // --- NEW: CARD PLAYING STATE ---
  const [selectedCard, setSelectedCard] = useState(null); // { card data }
  const [validCardTargets, setValidCardTargets] = useState([]); // [id1, id2, ...]
  const [cardConfirmation, setCardConfirmation] = useState(null); // { card, target }
  
  // --- MANDATORY ACTION STATE ---
  const [mandatoryAction, setMandatoryAction] = useState(null); // e.g., { type: 'discard'/'destroy', player: 'player1', count: X }
  const [showMandatoryActionModal, setShowMandatoryActionModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(null); // For confirm/cancel popups
  const [initialShieldAllocation, setInitialShieldAllocation] = useState(null); // For shield allocation reset
  const [optionalDiscardCount, setOptionalDiscardCount] = useState(0); // For optional discard phase

  // Memoize effective stats for performance and easy access
  const player1EffectiveStats = useMemo(() => calculateEffectiveShipStats(player1), [player1.shipSections]);
  const player2EffectiveStats = useMemo(() => calculateEffectiveShipStats(player2), [player2.shipSections]);

  const totalPlayer1Drones = useMemo(() => Object.values(player1.dronesOnBoard).flat().length, [player1.dronesOnBoard]);
  const totalPlayer2Drones = useMemo(() => Object.values(player2.dronesOnBoard).flat().length, [player2.dronesOnBoard]);


  // --- ABILITY & GAME LOGIC (ORDER MATTERS HERE) ---

  const calculateEffectiveStats = useCallback((drone, lane, playerState) => {
    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
    if (!baseDrone) return { ...drone, maxShields: 0, keywords: new Set() };

    let effectiveStats = { ...drone, maxShields: baseDrone.shields, keywords: new Set() };

    // Apply self passives
    baseDrone.abilities?.forEach(ability => {
        if (ability.type === 'PASSIVE' && ability.effect.type === 'GRANT_KEYWORD') {
            effectiveStats.keywords.add(ability.effect.keyword);
        }
    });
    
    // Apply auras from other friendly drones in the same lane
    playerState.dronesOnBoard[lane]?.forEach(otherDrone => {
        if (otherDrone.id === drone.id) return;
        const otherBaseDrone = fullDroneCollection.find(d => d.name === otherDrone.name);
        otherBaseDrone?.abilities?.forEach(ability => {
            if (ability.type === 'PASSIVE' && ability.scope === 'FRIENDLY_IN_LANE' && ability.effect.type === 'MODIFY_STAT') {
                if (ability.effect.stat === 'shields') {
                    effectiveStats.maxShields += ability.effect.value;
                }
                // Can be expanded for other stats
            }
        });
    });

    return effectiveStats;
  }, []);

  const updateAuras = useCallback((playerState) => {
    const newDronesOnBoard = JSON.parse(JSON.stringify(playerState.dronesOnBoard));
    
    for(const lane in newDronesOnBoard) {
     newDronesOnBoard[lane].forEach(drone => {
        const oldMaxShields = drone.currentMaxShields;
        const { maxShields: newMaxShields } = calculateEffectiveStats(drone, lane, playerState);

        if (newMaxShields > oldMaxShields) {
          drone.currentShields += (newMaxShields - oldMaxShields);
        }
        drone.currentMaxShields = newMaxShields;
        drone.currentShields = Math.min(drone.currentShields, newMaxShields);
      });
    }
    return newDronesOnBoard;
  }, [calculateEffectiveStats]);

  const endActionPhase = useCallback(() => {
    setShowRoundEndModal(true);
  }, []);

  const endDeploymentPhase = () => {
    setShowActionPhaseStartModal(true);
  };

  const endTurn = useCallback((actingPlayer) => {
    const nextPlayer = actingPlayer === 'player1' ? 'player2' : 'player1';
    
    if (passInfo.player1Passed && passInfo.player2Passed) {
        if (turnPhase === 'deployment') endDeploymentPhase();
        if (turnPhase === 'action') endActionPhase();
        return;
    }

    const nextPlayerHasPassed = (nextPlayer === 'player1' && passInfo.player1Passed) || (nextPlayer === 'player2' && passInfo.player2Passed);
    if (nextPlayerHasPassed) {
        setCurrentPlayer(actingPlayer);
        if (actingPlayer === 'player1') {
            setModalContent({ title: "Opponent Has Passed", text: "It's your turn again." });
        }
        return; 
    }

    setCurrentPlayer(nextPlayer);
    if (nextPlayer === 'player1') {
        setModalContent({ title: "Your Turn", text: "It's your turn to act." });
    } else {
        setModalContent({ title: "Opponent's Turn", text: "The AI is taking its turn." });
    }
  }, [passInfo, turnPhase, endActionPhase]);
  
  const getLaneOfDrone = useCallback((droneId, playerState) => {
      for (const [lane, drones] of Object.entries(playerState.dronesOnBoard)) {
          if (drones.some(d => d.id === droneId)) {
              return lane;
          }
      }
      return null;
  }, []);
  
  const getValidTargets = useCallback((source, definition) => {
    const targets = [];
    const isCard = typeof definition.cost === 'number';
    const isAbility = !isCard;

    const { type, affinity, location, custom } = definition.targeting;
    
    let userLane = null;
    if (isAbility) {
        userLane = getLaneOfDrone(source.id, player1);
        if (!userLane) return [];
    }
    
    const processPlayerDrones = (playerState, playerType) => {
      Object.entries(playerState.dronesOnBoard).forEach(([lane, drones]) => {
        let isValidLocation = false;
        if (location === 'ANY_LANE') isValidLocation = true;
        if (isAbility && location === 'SAME_LANE') isValidLocation = lane === userLane;
        
        if (isValidLocation) {
          drones.forEach(targetDrone => {
            let meetsCustomCriteria = true;
            if (custom?.includes('DAMAGED_HULL')) {
              const baseDrone = fullDroneCollection.find(d => d.name === targetDrone.name);
              if (!baseDrone || targetDrone.hull >= baseDrone.hull) {
                meetsCustomCriteria = false;
              }
            }
            if (custom?.includes('EXHAUSTED')) {
                if (!targetDrone.isExhausted) {
                    meetsCustomCriteria = false;
                }
            }

            if (meetsCustomCriteria) {
              targets.push({ ...targetDrone, lane, owner: playerType });
            }
          });
        }
      });
    };
    
    // --- NEW LOGIC for Ship Sections and Lanes ---
    const processPlayerSections = (playerState, playerType) => {
        Object.keys(playerState.shipSections).forEach(sectionName => {
            // Give the section an 'id' property for consistency with drone targets
            targets.push({ id: sectionName, owner: playerType, ...playerState.shipSections[sectionName] });
        });
    };

    if (type === 'DRONE') {
      if (affinity === 'FRIENDLY' || affinity === 'ANY') {
        processPlayerDrones(player1, 'player1');
      }
      if (affinity === 'ENEMY' || affinity === 'ANY') {
        processPlayerDrones(player2, 'player2');
      }
    } else if (type === 'SHIP_SECTION') {
      if (affinity === 'FRIENDLY' || affinity === 'ANY') {
        processPlayerSections(player1, 'player1');
      }
      if (affinity === 'ENEMY' || affinity === 'ANY') {
        processPlayerSections(player2, 'player2');
      }
    } else if (type === 'LANE') {
      // Per your request, any lane-targeting card should make all lanes clickable.
      // The card's affinity will be checked during the effect resolution.
      ['lane1', 'lane2', 'lane3'].forEach(laneId => {
        targets.push({ id: laneId, owner: 'player1' }); // Player's lanes
        targets.push({ id: laneId, owner: 'player2' }); // Opponent's lanes
      });
    }
    return targets;
  }, [player1, player2, getLaneOfDrone]);


useEffect(() => {
    if (abilityMode) {
      const targets = getValidTargets(abilityMode.drone, abilityMode.ability);
      setValidAbilityTargets(targets);
      setValidCardTargets([]);
      setSelectedCard(null);
    } else if (selectedCard) {
      const targets = getValidTargets(player1, selectedCard);
      setValidCardTargets(targets);
      setValidAbilityTargets([]);
    }
    else {
      setValidAbilityTargets([]);
      setValidCardTargets([]);
    }
  }, [abilityMode, selectedCard, getValidTargets, player1]);

  const cancelAbilityMode = () => {
    if (abilityMode) {
     setAbilityMode(null);
     setSelectedDrone(null);
    }
  };

  // --- NEW --- Function to cancel card selection
  const cancelCardSelection = () => {
    setSelectedCard(null);
  };
  
  const resolveAttack = useCallback((attackDetails, isAbilityOrCard = false) => {
    const { attacker, target, targetType, interceptor, attackingPlayer, abilityDamage, goAgain } = attackDetails;
    const finalTarget = interceptor || target;
    const finalTargetType = interceptor ? 'drone' : targetType;
    let damage = abilityDamage ?? attacker.attack;

    const triggerHitAnimation = (targetId) => {
        setRecentlyHitDrones(prev => [...prev, targetId]);
        setTimeout(() => {
            setRecentlyHitDrones(prev => prev.filter(id => id !== targetId));
        }, 500);
    };

    const defenderUpdater = (target.owner && target.owner === 'player1') ? setPlayer1 : (attackingPlayer === 'player1' ? setPlayer2 : setPlayer1);
    const attackerUpdater = attackingPlayer === 'player1' ? setPlayer1 : setPlayer2;

    defenderUpdater(prev => {
        let newPlayerState = { ...prev };
        if (finalTargetType === 'drone') {
            const newDronesOnBoard = JSON.parse(JSON.stringify(newPlayerState.dronesOnBoard));
            let droneDestroyed = false;
            for (const lane in newDronesOnBoard) {
                const targetIndex = newDronesOnBoard[lane].findIndex(d => d.id === finalTarget.id);
                if (targetIndex !== -1) {
                    const originalTarget = newDronesOnBoard[lane][targetIndex];
                    const shieldDamage = Math.min(damage, originalTarget.currentShields);
                    const newShields = originalTarget.currentShields - shieldDamage;
                    let remainingDamage = damage - shieldDamage;
                    const hullDamage = Math.min(remainingDamage, originalTarget.hull);
                    const newHull = originalTarget.hull - hullDamage;

                    if (attackingPlayer === 'player2') {
                        setModalContent(null);
                        const report = {
                            attackerName: attacker.name,
                            lane: attackDetails.lane,
                            targetName: finalTarget.name,
                            targetType: finalTargetType,
                            interceptorName: interceptor ? interceptor.name : null,
                            shieldDamage: shieldDamage,
                            hullDamage: hullDamage,
                            wasDestroyed: newHull <= 0,
                            remainingShields: newShields,
                            remainingHull: newHull <= 0 ? 0 : newHull,
                        };
                        setAiActionReport(report);
                    }

                    if (newHull <= 0) {
                        droneDestroyed = true;
                        triggerExplosion(finalTarget.id);
                        newDronesOnBoard[lane] = newDronesOnBoard[lane].filter(d => d.id !== finalTarget.id);
                        const onDestroyUpdates = onDroneDestroyed(newPlayerState, finalTarget);
                        Object.assign(newPlayerState, onDestroyUpdates);
                    } else {
                        triggerHitAnimation(finalTarget.id);
                        newDronesOnBoard[lane][targetIndex] = { ...originalTarget, currentShields: newShields, hull: newHull };
                    }
                    break;
                }
            }
            newPlayerState.dronesOnBoard = newDronesOnBoard;
           if(droneDestroyed){
                newPlayerState.dronesOnBoard = updateAuras(newPlayerState);
            }
        } else if (finalTargetType === 'section') {
            const newShipSections = { ...newPlayerState.shipSections };
            const originalTarget = newShipSections[finalTarget.name];
            const shieldDamage = Math.min(damage, originalTarget.allocatedShields);
            const newShields = originalTarget.allocatedShields - shieldDamage;
            let remainingDamage = damage - shieldDamage;
            const hullDamage = Math.min(remainingDamage, originalTarget.hull);
            const newHull = originalTarget.hull - hullDamage;
            
            newShipSections[finalTarget.name] = { ...originalTarget, allocatedShields: newShields, hull: newHull };
            
            const newEffectiveStats = calculateEffectiveShipStats({ ...newPlayerState, shipSections: newShipSections });
            let newEnergy = newPlayerState.energy;
            if (newEnergy > newEffectiveStats.maxEnergy) {
                newEnergy = newEffectiveStats.maxEnergy;
            }

            if (attackingPlayer === 'player2') {
                setModalContent(null);
                const report = {
                    attackerName: attacker.name,
                    lane: attackDetails.lane,
                    targetName: finalTarget.name,
                    targetType: finalTargetType,
                    interceptorName: interceptor ? interceptor.name : null,
                    shieldDamage: shieldDamage,
                    hullDamage: hullDamage,
                    wasDestroyed: newHull <= 0,
                    remainingShields: newShields,
                    remainingHull: newHull <= 0 ? 0 : newHull,
                };
                setAiActionReport(report);
            }

            newPlayerState.shipSections = newShipSections;
            newPlayerState.energy = newEnergy;
        }
        return newPlayerState;
    });

    if (!isAbilityOrCard) { // Standard drone attack exhausts the attacker
        attackerUpdater(prev => {
            let newPlayerState = { ...prev };
            const newDronesOnBoard = JSON.parse(JSON.stringify(newPlayerState.dronesOnBoard));
            for (const lane in newDronesOnBoard) {
                const attackerIndex = newDronesOnBoard[lane].findIndex(d => d.id === attacker.id);
                if (attackerIndex !== -1) {
                    newDronesOnBoard[lane][attackerIndex].isExhausted = true;
                    break;
                }
            }
            if (interceptor) {
                const interceptorUpdater = attackingPlayer === 'player1' ? setPlayer2 : setPlayer1;
                interceptorUpdater(prevInterceptorPlayer => {
                    let newInterceptorPlayerState = { ...prevInterceptorPlayer };
                    const newInterceptorDronesOnBoard = JSON.parse(JSON.stringify(newInterceptorPlayerState.dronesOnBoard));
                    let droneDestroyed = false;
                    for (const lane in newInterceptorDronesOnBoard) {
                        const interceptorIndex = newInterceptorDronesOnBoard[lane].findIndex(d => d.id === interceptor.id);
                        if (interceptorIndex !== -1) {
                            newInterceptorDronesOnBoard[lane][interceptorIndex].isExhausted = true;
                            break;
                        }
                    }
                    newInterceptorPlayerState.dronesOnBoard = newInterceptorDronesOnBoard;
                    if(droneDestroyed){
                         newInterceptorPlayerState.dronesOnBoard = updateAuras(newInterceptorPlayerState);
                     }
                    return newInterceptorPlayerState;
                });
            }
            newPlayerState.dronesOnBoard = newDronesOnBoard;
            return newPlayerState;
        });
    }

    setSelectedDrone(null);
    setPendingAttack(null);

    if (attackingPlayer === 'player1' && !goAgain) { 
        endTurn('player1');
    }
  }, [endTurn, updateAuras]);
  
  const resolveAbility = useCallback((ability, userDrone, targetDrone) => {
    const { effect, cost } = ability;

    // 1. Pay costs
    setPlayer1(prev => {
        let newEnergy = prev.energy;
        if (cost.energy) {
            newEnergy -= cost.energy;
        }

        const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard)); // Deep copy
        if (cost.exhausts) {
            for (const lane in newDronesOnBoard) {
                const droneIndex = newDronesOnBoard[lane].findIndex(d => d.id === userDrone.id);
                if (droneIndex !== -1) {
                    newDronesOnBoard[lane][droneIndex].isExhausted = true;
                    break;
                }
            }
        }
        return { ...prev, energy: newEnergy, dronesOnBoard: newDronesOnBoard };
    });
    
    // 2. Apply effects
    if (effect.type === 'HEAL') {
        setPlayer1(prev => {
            const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));
            const baseTarget = fullDroneCollection.find(d => d.name === targetDrone.name);
            for (const lane in newDronesOnBoard) {
                const droneIndex = newDronesOnBoard[lane].findIndex(d => d.id === targetDrone.id);
                if (droneIndex !== -1) {
                    newDronesOnBoard[lane][droneIndex].hull = Math.min(baseTarget.hull, newDronesOnBoard[lane][droneIndex].hull + effect.value);
                    break;
                }
            }
            return { ...prev, dronesOnBoard: newDronesOnBoard };
        });
    } else if (effect.type === 'DAMAGE') {
        const targetLane = getLaneOfDrone(targetDrone.id, player2);
        if (targetLane) {
            resolveAttack({
                attacker: userDrone,
                target: targetDrone,
                targetType: 'drone',
                attackingPlayer: 'player1',
                abilityDamage: effect.value,
                lane: targetLane,
            }, true); 
        }
    } else if (effect.type === 'GAIN_ENERGY') {
        setPlayer1(prev => {
            const effectiveStatsP1 = calculateEffectiveShipStats(prev);
            if (prev.energy >= effectiveStatsP1.maxEnergy) return prev; // Check against current max
            const newEnergy = Math.min(effectiveStatsP1.maxEnergy, prev.energy + effect.value);
            return {...prev, energy: newEnergy };
        });
    }

    cancelAbilityMode();
    if (effect.type !== 'DAMAGE' && !effect.goAgain) { 
        endTurn('player1');
    }
  }, [endTurn, player2, getLaneOfDrone, resolveAttack]); 

// --- NEW: LOGIC TO RESOLVE A CARD ---
const resolveCardPlay = useCallback((card, target) => {
    const { cost, effect } = card;

    // 1) Apply immediate player1-side changes (pay cost, move card to discard, apply effects that affect player1)
    setPlayer1(prev => {
        let newState = {
            ...prev,
            energy: prev.energy - (cost || 0),
            hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
            discardPile: [...prev.discardPile, card],
        };

        // DRAW
        if (effect.type === 'DRAW') {
            let newDeck = [...newState.deck];
            let newHand = [...newState.hand];
            let newDiscard = [...newState.discardPile];

            for (let i = 0; i < effect.value; i++) {
                if (newDeck.length === 0) {
                    if (newDiscard.length > 0) {
                        newDeck = [...newDiscard].sort(() => 0.5 - Math.random());
                        newDiscard = [];
                    } else {
                        break;
                    }
                }
                const drawn = newDeck.pop();
                newHand.push(drawn);
            }
            newState = { ...newState, deck: newDeck, hand: newHand, discardPile: newDiscard };
        }
        // GAIN_ENERGY
        else if (effect.type === 'GAIN_ENERGY') {
            const effectiveStatsP1 = calculateEffectiveShipStats(newState);
            const newEnergy = Math.min(effectiveStatsP1.maxEnergy, newState.energy + effect.value);
            newState = { ...newState, energy: newEnergy };
        }
        // READY_DRONE
        else if (effect.type === 'READY_DRONE') {
            const newDronesOnBoard = JSON.parse(JSON.stringify(newState.dronesOnBoard));
            for (const lane in newDronesOnBoard) {
                const idx = newDronesOnBoard[lane].findIndex(d => d.id === (target && target.id));
                if (idx !== -1) {
                    newDronesOnBoard[lane][idx].isExhausted = false;
                    break;
                }
            }
            newState = { ...newState, dronesOnBoard: newDronesOnBoard };
        }
        // HEAL (HULL or SHIELDS)
        else if (effect.type === 'HEAL_HULL' || effect.type === 'HEAL_SHIELDS') {
            const isHull = effect.type === 'HEAL_HULL';
            const healAmount = effect.value;

            if (card.targeting?.type === 'DRONE') {
                const targetLaneKey = Object.keys(newState.dronesOnBoard).find(lane => 
                    newState.dronesOnBoard[lane].some(drone => drone.id === (target && target.id))
                );

                if (targetLaneKey) {
                    const newDronesOnBoard = {
                        ...newState.dronesOnBoard,
                        [targetLaneKey]: newState.dronesOnBoard[targetLaneKey].map(drone => {
                            if (drone.id === (target && target.id)) {
                                if (isHull) {
                                    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
                                    return { ...drone, hull: Math.min(baseDrone.hull, drone.hull + healAmount) };
                                } else {
                                    return { ...drone, currentShields: Math.min(drone.currentMaxShields, drone.currentShields + healAmount) };
                                }
                            }
                            return drone;
                        })
                    };
                    newState = { ...newState, dronesOnBoard: newDronesOnBoard };
                }
            } else if (card.targeting?.type === 'SHIP_SECTION') {
                const newShipSections = JSON.parse(JSON.stringify(newState.shipSections));
                const sectionToUpdate = newShipSections[(target && target.id)];
                if (sectionToUpdate) {
                    if (isHull) {
                        sectionToUpdate.hull = Math.min(sectionToUpdate.maxHull, sectionToUpdate.hull + healAmount);
                    } else {
                        sectionToUpdate.allocatedShields = Math.min(sectionToUpdate.shields, sectionToUpdate.allocatedShields + healAmount);
                    }
                    newState = { ...newState, shipSections: newShipSections };
                }
            } else if (card.targeting?.type === 'LANE') {
                const newDronesOnBoard = JSON.parse(JSON.stringify(newState.dronesOnBoard));
                const laneToUpdate = newDronesOnBoard[(target && target.id)];
                if (laneToUpdate) {
                    laneToUpdate.forEach(droneToUpdate => {
                        if (isHull) {
                            const baseDrone = fullDroneCollection.find(d => d.name === droneToUpdate.name);
                            droneToUpdate.hull = Math.min(baseDrone.hull, droneToUpdate.hull + healAmount);
                        } else {
                            droneToUpdate.currentShields = Math.min(droneToUpdate.currentMaxShields, droneToUpdate.currentShields + healAmount);
                        }
                    });
                    newState = { ...newState, dronesOnBoard: newDronesOnBoard };
                }
            }
        }
        // --- NEW, MODIFIED DESTROY LOGIC for PLAYER 1 ---
        else if (effect.type === 'DESTROY') {
            const newDronesOnBoard = JSON.parse(JSON.stringify(newState.dronesOnBoard));
            let dronesWereDestroyed = false;

            if (effect.scope === 'LANE' && target.id) {
                const laneId = target.id;
                const destroyed = newDronesOnBoard[laneId] || [];
                if (destroyed.length > 0) dronesWereDestroyed = true;
                destroyed.forEach(d => {
                    triggerExplosion(d.id);
                    const updates = onDroneDestroyed(newState, d);
                    newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                });
                newDronesOnBoard[laneId] = [];
            }
            else if (effect.scope === 'SINGLE' && target && target.owner === 'player1') {
                const laneId = getLaneOfDrone(target.id, newState);
                if (laneId) {
                    const droneToDestroy = newDronesOnBoard[laneId].find(d => d.id === target.id);
                    if(droneToDestroy) {
                        dronesWereDestroyed = true;
                        triggerExplosion(droneToDestroy.id);
                        const updates = onDroneDestroyed(newState, droneToDestroy);
                        newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                        newDronesOnBoard[laneId] = newDronesOnBoard[laneId].filter(d => d.id !== target.id);
                    }
                }
            }
            // Note: FILTERED logic is handled in the opponent section below, as our current card only targets enemies.
            
            newState.dronesOnBoard = newDronesOnBoard;
            if (dronesWereDestroyed) {
                newState.dronesOnBoard = updateAuras(newState);
            }
        }
        return newState;
    });

    // 2) Handle effects that target the opponent or need additional actions
    if (effect.type === 'DAMAGE') {
        const targetPlayerState = target.owner === 'player1' ? player1 : player2;
        const targetLane = getLaneOfDrone((target && target.id), targetPlayerState);
        if (targetLane) {
            resolveAttack({
                attacker: { name: card.name },
                target: target,
                targetType: 'drone',
                attackingPlayer: 'player1',
                abilityDamage: effect.value,
                lane: targetLane,
                goAgain: effect.goAgain || false,
            }, true);
        }
    }
    // --- NEW, MODIFIED DESTROY LOGIC for OPPONENT (Player 2) ---
    else if (effect.type === 'DESTROY') {
        setPlayer2(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            let dronesWereDestroyed = false;

            if (effect.scope === 'LANE' && target.id) {
                const laneId = target.id;
                const destroyed = newState.dronesOnBoard[laneId] || [];
                if (destroyed.length > 0) dronesWereDestroyed = true;
                destroyed.forEach(d => {
                    triggerExplosion(d.id);
                    const updates = onDroneDestroyed(newState, d);
                    newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                });
                newState.dronesOnBoard[laneId] = [];
            }
            else if (effect.scope === 'SINGLE' && target && target.owner === 'player2') {
                const laneId = getLaneOfDrone(target.id, newState);
                if (laneId) {
                    const droneToDestroy = newState.dronesOnBoard[laneId].find(d => d.id === target.id);
                     if(droneToDestroy) {
                        dronesWereDestroyed = true;
                        triggerExplosion(droneToDestroy.id);
                        const updates = onDroneDestroyed(newState, droneToDestroy);
                        newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                        newState.dronesOnBoard[laneId] = newState.dronesOnBoard[laneId].filter(d => d.id !== target.id);
                    }
                }
            }
            else if (effect.scope === 'FILTERED' && target.id && effect.filter) {
                const laneId = target.id;
                const { stat, comparison, value } = effect.filter;
                
                const dronesToKeep = [];
                const dronesToDestroy = [];

                newState.dronesOnBoard[laneId].forEach(drone => {
                    let shouldBeDestroyed = false;
                    if (comparison === 'GTE' && drone[stat] >= value) {
                        shouldBeDestroyed = true;
                    }
                    // Future comparisons like 'LT' (less than) or 'EQ' (equal) could be added here
                    
                    if (shouldBeDestroyed) {
                        dronesToDestroy.push(drone);
                    } else {
                        dronesToKeep.push(drone);
                    }
                });

                if (dronesToDestroy.length > 0) {
                    dronesWereDestroyed = true;
                    dronesToDestroy.forEach(d => {
                        triggerExplosion(d.id);
                        const updates = onDroneDestroyed(newState, d);
                        newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                    });
                    newState.dronesOnBoard[laneId] = dronesToKeep;
                }
            }
            
            if (dronesWereDestroyed) {
                newState.dronesOnBoard = updateAuras(newState);
            }
            return newState;
        });
    }

    // 3) Cleanup and end turn
    cancelCardSelection();
    setCardConfirmation(null);

    if (effect.type !== 'DAMAGE' && !effect.goAgain) {
        endTurn('player1');
    }
}, [player1, player2, getLaneOfDrone, resolveAttack, endTurn, calculateEffectiveShipStats, triggerExplosion, updateAuras]);

 
  //--- END ABILITY/CARD LOGIC ---

const startOptionalDiscardPhase = () => {
    const p1Stats = player1EffectiveStats; // Use the memoized stats
    setOptionalDiscardCount(0);
    setTurnPhase('optionalDiscard');
    setModalContent({
        title: 'Optional Discard Phase',
        text: `You may discard up to ${p1Stats.discardLimit} cards from your hand. Click a card to discard it, then press "Finish Discarding" when you are done.`
    });
  };

  const handleFinishOptionalDiscard = () => {
    setTurnPhase('initialDraw');
    setModalContent({
        title: 'Start of Turn: Draw Cards',
        text: 'You can now draw cards to fill your hand. Click the "Draw to Hand" button to begin your turn.'
    });
  };

  const handleConfirmOptionalDiscard = (card) => {
    setPlayer1(prev => ({
        ...prev,
        hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
        discardPile: [...prev.discardPile, card]
    }));
    setOptionalDiscardCount(prev => prev + 1);
    setConfirmationModal(null);
  };

  const handleOptionalDiscardClick = (card) => {
    if (optionalDiscardCount >= player1EffectiveStats.discardLimit) {
        setModalContent({
            title: "Discard Limit Reached",
            text: `You cannot discard any more cards this turn. Your limit is ${player1EffectiveStats.discardLimit}.`
        });
        return;
    }
    setConfirmationModal({
        type: 'discard',
        target: card,
        onConfirm: () => handleConfirmOptionalDiscard(card),
        onCancel: () => setConfirmationModal(null),
        text: `Are you sure you want to discard ${card.name}?`
    });
  };


  const handleFooterButtonClick = (view) => {
    if (!isFooterOpen) {
     setIsFooterOpen(true);
     setFooterView(view);
    } else {
      if (footerView === view) {
       setIsFooterOpen(false);
      } else {
       setFooterView(view);
      }
    }
  };

  // =========================================================================
  // ==                         WIN CONDITION LOGIC                         ==
  // =========================================================================
  useEffect(() => {
    if (winner) return;

    // New function to check for the win conditions based on ship section status
    const checkWinCondition = (opponentPlayerState) => {
      if (!opponentPlayerState || !opponentPlayerState.shipSections) {
        return false;
      }
      
      const sectionStatuses = Object.values(opponentPlayerState.shipSections).map(
        (section) => getShipStatus(section)
      );

      // Win if two or more opponent sections are 'critical'
      const criticalCount = sectionStatuses.filter(
        (status) => status === 'critical'
      ).length;
      if (criticalCount >= 2) {
        return true;
      }

      // OR Win if all three opponent sections are at least 'damaged'
      const damagedOrWorseCount = sectionStatuses.filter(
        (status) => status === 'damaged' || status === 'critical'
      ).length;
      if (damagedOrWorseCount >= 3) {
        return true;
      }

      return false;
    };

    // Check if Player 1 has met the win condition against Player 2
    if (checkWinCondition(player2)) {
     setWinner('Player 1');
    // Check if Player 2 has met the win condition against Player 1
    } else if (checkWinCondition(player1)) {
     setWinner('Player 2');
    }
  }, [player1.shipSections, player2.shipSections, winner]);
  // =========================================================================

  const getElementCenter = (element) => {
    if (!element || !gameAreaRef.current) return null;
    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();
    return {
      x: elemRect.left + elemRect.width / 2 - gameAreaRect.left,
      y: elemRect.top + elemRect.height / 2 - gameAreaRect.top,
    };
  };

  useEffect(() => {
    if (selectedDrone && hoveredTarget && hoveredTarget.lane) {
        const effectiveHoveredTarget = calculateEffectiveStats(hoveredTarget.target, hoveredTarget.lane, player2);
        const potential = player2.dronesOnBoard[hoveredTarget.lane]
            .filter(d => {
                const effectiveInterceptor = calculateEffectiveStats(d, hoveredTarget.lane, player2);
                return d.id !== effectiveHoveredTarget.id &&
                       !d.isExhausted &&
                       (effectiveInterceptor.speed > selectedDrone.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS'));
            })
            .map(d => d.id);
        setPotentialInterceptors(potential);
    } else {
        setPotentialInterceptors([]);
    }
  }, [hoveredTarget, selectedDrone, player2.dronesOnBoard, calculateEffectiveStats]);

  useEffect(() => {
   setHoveredTarget(null);
   setPotentialInterceptors([]);
  }, [selectedDrone]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (selectedDrone && !abilityMode && turnPhase === 'action') {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const startPos = getElementCenter(droneRefs.current[selectedDrone.id]);
        if (startPos) {
         setArrowState({
            visible: true,
            start: startPos,
            end: { x: e.clientX - gameAreaRect.left, y: e.clientY - gameAreaRect.top }
          });
        }
      } else if (arrowState.visible) {
       setArrowState(prev => ({ ...prev, visible: false }));
      }
    };
    const gameArea = gameAreaRef.current;
   gameArea?.addEventListener('mousemove', handleMouseMove);
    return () => gameArea?.removeEventListener('mousemove', handleMouseMove);
  }, [selectedDrone, turnPhase, arrowState.visible, abilityMode]); 

  const handleOpponentTurn = useCallback(() => {
   setPlayer2(prevPlayer2 => {
        if (passInfo.player2Passed) {
            endTurn('player2');
            return prevPlayer2;
        }

        const effectiveStats = calculateEffectiveShipStats(prevPlayer2);
        const totalDrones = Object.values(prevPlayer2.dronesOnBoard).flat().length;
        
        const deployableDrones = prevPlayer2.activeDronePool.filter(drone => {
            const cost = drone.class;
            let canAfford = false;
            if (turn === 1) {
                const effectiveResource = prevPlayer2.initialDeploymentBudget + prevPlayer2.energy;
                canAfford = cost <= effectiveResource;
            } else {
                canAfford = cost <= prevPlayer2.energy;
            }
            return canAfford &&
                   (prevPlayer2.deployedDroneCounts[drone.name] || 0) < drone.limit &&
                   totalDrones < effectiveStats.cpuLimit;
        }).sort((a, b) => a.class - b.class);

        const availableLanes = ['lane1', 'lane2', 'lane3'].filter(lane => prevPlayer2.dronesOnBoard[lane].length < 3);
        const canDeploy = deployableDrones.length > 0 && availableLanes.length > 0;
        
        const willPass = !canDeploy; 

        if (willPass) {
            setPassInfo(prev => {
                const wasFirstToPass = !prev.player1Passed;
                const newPassInfo = {
                    ...prev,
                    player2Passed: true,
                    firstPasser: prev.firstPasser || (wasFirstToPass ? 'player2' : null)
                };
                if (newPassInfo.player1Passed) {
                    endDeploymentPhase();
                } else {
                    endTurn('player2');
                }
                return newPassInfo;
            });
            return prevPlayer2;
        } else {
            const droneToDeploy = deployableDrones[0];
            const targetLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            
            const droneCost = droneToDeploy.class;
            let energyCost = 0;
            let budgetCost = 0;
            if (turn === 1) {
                budgetCost = Math.min(prevPlayer2.initialDeploymentBudget, droneCost);
                energyCost = droneCost - budgetCost;
            } else {
                energyCost = droneCost;
            }
            const baseDrone = fullDroneCollection.find(d => d.name === droneToDeploy.name);
            const newDrone = { 
                ...droneToDeploy, 
                id: Date.now(),
                currentShields: baseDrone.shields,
                currentMaxShields: baseDrone.shields,
                hull: baseDrone.hull,
                isExhausted: false,
            };
            let newPlayerState = { 
                ...prevPlayer2, 
                dronesOnBoard: {...prevPlayer2.dronesOnBoard, [targetLane]: [...prevPlayer2.dronesOnBoard[targetLane], newDrone]}, 
                deployedDroneCounts: {...prevPlayer2.deployedDroneCounts, [droneToDeploy.name]: (prevPlayer2.deployedDroneCounts[droneToDeploy.name] || 0) + 1},
                initialDeploymentBudget: prevPlayer2.initialDeploymentBudget - budgetCost,
                energy: prevPlayer2.energy - energyCost
            };
            newPlayerState.dronesOnBoard = updateAuras(newPlayerState);
            
            endTurn('player2');
            
            return newPlayerState;
        }
    });
  }, [passInfo, turn, endTurn, updateAuras]);

  const handleStartNewRound = () => {
   setShowRoundEndModal(false);

    // Save who passed first for the next round's determination
   setFirstPasserOfPreviousRound(passInfo.firstPasser);

   setTurn(prev => prev + 1);
    // Reset the pass info for the new round
   setPassInfo({ firstPasser: null, player1Passed: false, player2Passed: false });
    
    const p1Stats = calculateEffectiveShipStats(player1);
    const p2Stats = calculateEffectiveShipStats(player2);

    const readyDronesAndRestoreShields = (playerState) => {
        const newDronesOnBoard = { ...playerState.dronesOnBoard };
        for (const lane in newDronesOnBoard) {
           newDronesOnBoard[lane] = newDronesOnBoard[lane].map(drone => {
                const effectiveStats = calculateEffectiveStats(drone, lane, playerState);
                return {
                    ...drone,
                    isExhausted: false,
                    currentShields: effectiveStats.maxShields,
                    currentMaxShields: effectiveStats.maxShields,
                };
            });
        }
        return { ...playerState, dronesOnBoard: newDronesOnBoard };
    };

   setPlayer1(prev => readyDronesAndRestoreShields({
      ...prev,
      energy: p1Stats.energyPerTurn,
     initialDeploymentBudget: 0
    }));

   setPlayer2(prev => readyDronesAndRestoreShields({
      ...prev,
      energy: p2Stats.energyPerTurn,
     initialDeploymentBudget: 0
    }));

    if (player1.hand.length > p1Stats.handLimit) {
       setMandatoryAction({ type: 'discard', player: 'player1', count: player1.hand.length - p1Stats.handLimit });
       setShowMandatoryActionModal(true);
} else {
    if (player2.hand.length > p2Stats.handLimit) {
       setPlayer2(prev => {
            let newHand = [...prev.hand];
            const newDiscardPile = [...prev.discardPile];
            const discardCount = newHand.length - p2Stats.handLimit;
            for (let i = 0; i < discardCount; i++) {
                const cardToDiscard = newHand.splice(Math.floor(Math.random() * newHand.length), 1)[0];
                newDiscardPile.push(cardToDiscard);
            }
            return { ...prev, hand: newHand, discardPile: newDiscardPile };
        });
    }
   startOptionalDiscardPhase();
}

   setAiActionCount(0);
  };

  const handlePostDiscardAction = () => {
    const p2Stats = calculateEffectiveShipStats(player2);
    if (player2.hand.length > p2Stats.handLimit) {
       setPlayer2(prev => {
            let newHand = [...prev.hand];
            const newDiscardPile = [...prev.discardPile];
            const discardCount = newHand.length - p2Stats.handLimit;
            for (let i = 0; i < discardCount; i++) {
                const cardToDiscard = newHand.splice(Math.floor(Math.random() * newHand.length), 1)[0];
                newDiscardPile.push(cardToDiscard);
            }
            return { ...prev, hand: newHand, discardPile: newDiscardPile };
        });
    }
    startOptionalDiscardPhase();
  };

  const startDeploymentComplianceCheck = () => {
   setShowFirstPlayerModal(false);

    const firstPlayerIsOverLimit = totalPlayer1Drones > player1EffectiveStats.cpuLimit;
    const secondPlayerIsOverLimit = totalPlayer2Drones > player2EffectiveStats.cpuLimit;
    
    const checkOrder = firstPlayerOfRound === 'player1' ? ['player1', 'player2'] : ['player2', 'player1'];

    const resolvePlayerCompliance = (player) => {
      if (player === 'player1') {
        if (firstPlayerIsOverLimit) {
         setMandatoryAction({
            type: 'destroy',
            player: 'player1',
            count: totalPlayer1Drones - player1EffectiveStats.cpuLimit,
          });
         setShowMandatoryActionModal(true);
          return true;
        }
      } else {
        if (secondPlayerIsOverLimit) {
           setPlayer2(p2 => {
                let newP2 = {...p2};
                let dronesToDestroyCount = Object.values(p2.dronesOnBoard).flat().length - player2EffectiveStats.cpuLimit;
                for (let i = 0; i < dronesToDestroyCount; i++) {
                    const allDrones = Object.entries(newP2.dronesOnBoard).flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));
                    if (allDrones.length === 0) break;

                    const lowestClass = Math.min(...allDrones.map(d => d.class));
                    const candidates = allDrones.filter(d => d.class === lowestClass);
                    const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];
                    
                    newP2.dronesOnBoard[droneToDestroy.lane] = newP2.dronesOnBoard[droneToDestroy.lane].filter(d => d.id !== droneToDestroy.id);
                    const onDestroyUpdates = onDroneDestroyed(newP2, droneToDestroy);
                    Object.assign(newP2, onDestroyUpdates);
                }
                newP2.dronesOnBoard = updateAuras(newP2);
                return newP2;
            });
        }
      }
      return false; 
    };
    
    if (!resolvePlayerCompliance(checkOrder[0])) {
      if (!resolvePlayerCompliance(checkOrder[1])) {
       handleStartDeploymentPhase();
      }
    }
  };


  const handleOpponentAction = useCallback(() => {
    if (passInfo.player2Passed) {
     endTurn('player2');
      return;
    }
    const readyAiDrones = Object.entries(player2.dronesOnBoard).flatMap(([lane, drones]) => 
       drones.filter(d => !d.isExhausted).map(d => ({ ...d, lane }))
    );

    let bestAttack = null;
    let bestAttackScore = -1;

    for (const attacker of readyAiDrones) {
        const { lane } = attacker;
        const possibleTargets = player1.dronesOnBoard[lane];
        const shipTarget = { name: placedSections[parseInt(lane.slice(-1)) - 1], ...player1.shipSections[placedSections[parseInt(lane.slice(-1)) - 1]] };
        
        const activeKillableTargets = possibleTargets.filter(t => !t.isExhausted && attacker.attack >= (t.currentShields + t.hull));
        if (activeKillableTargets.length > 0) {
            const target = activeKillableTargets.sort((a,b) => b.class - a.class)[0];
            const score = 100 + target.class;
            if (score > bestAttackScore) {
                bestAttack = { attacker, target, targetType: 'drone', lane, attackingPlayer: 'player2' };
                bestAttackScore = score;
            }
        }
        
        if (possibleTargets.length === 0) {
            const score = 90;
             if (score > bestAttackScore) {
                bestAttack = { attacker, target: shipTarget, targetType: 'section', lane, attackingPlayer: 'player2' };
                bestAttackScore = score;
             }
        }

        const favorableTrades = possibleTargets.filter(t => t.class > attacker.class);
        if (favorableTrades.length > 0) {
            const target = favorableTrades.sort((a,b) => b.class - a.class)[0];
            const score = 80 + (target.class - attacker.class);
            if (score > bestAttackScore) {
                bestAttack = { attacker, target, targetType: 'drone', lane, attackingPlayer: 'player2' };
                bestAttackScore = score;
            }
        }
        
        const anyKillableTargets = possibleTargets.filter(t => attacker.attack >= (t.currentShields + t.hull));
        if (anyKillableTargets.length > 0) {
            const target = anyKillableTargets.sort((a,b) => b.class - a.class)[0];
            const score = 70 + target.class;
            if (score > bestAttackScore) {
                bestAttack = { attacker, target, targetType: 'drone', lane, attackingPlayer: 'player2' };
                bestAttackScore = score;
            }
        }
        
        const weakestTargets = [...possibleTargets].sort((a,b) => a.hull - b.hull);
       if(weakestTargets.length > 0) {
            const target = weakestTargets[0];
            const score = 60 - target.hull;
             if (score > bestAttackScore) {
                bestAttack = { attacker, target, targetType: 'drone', lane, attackingPlayer: 'player2' };
                bestAttackScore = score;
             }
        }

        if (possibleTargets.length > 0) {
            const score = 50;
            if (score > bestAttackScore) {
                bestAttack = { attacker, target: shipTarget, targetType: 'section', lane, attackingPlayer: 'player2' };
                bestAttackScore = score;
            }
        }
    }

    if (bestAttack) {
       setPendingAttack(bestAttack);
    } else {
       setPassInfo(prev => {
            const wasFirstToPass = !prev.player1Passed;
            const newPassInfo = {
                ...prev,
                player2Passed: true,
                firstPasser: prev.firstPasser || (wasFirstToPass ? 'player2' : null)
            };

            if (newPassInfo.player1Passed) {
                endActionPhase();
            } else {
                endTurn('player2');
            }
            return newPassInfo;
        });
    }
  }, [player1, player2, passInfo, placedSections, endActionPhase, endTurn]);

  useEffect(() => {
    const isAiTurn = currentPlayer === 'player2' && !winner && !aiActionReport && !pendingAttack && !playerInterceptionChoice && !mandatoryAction;
    if (!isAiTurn) return;

    if (turnPhase === 'deployment' && !passInfo.player2Passed) {
     setTimeout(handleOpponentTurn, 1500);
    } else if (turnPhase === 'action' && !passInfo.player2Passed) {
     setTimeout(handleOpponentAction, 1500);
    }
  }, [currentPlayer, turnPhase, passInfo, winner, handleOpponentTurn, handleOpponentAction, aiActionReport, pendingAttack, playerInterceptionChoice, mandatoryAction]);


  const handleReset = () => {
   setTurnPhase('preGame');
   setTurn(1);
   setPlacedSections([]);
   setOpponentPlacedSections([]);
   setPlayer1(initialPlayerState('Player 1'));
   setPlayer2(initialPlayerState('Player 2'));
   setCurrentPlayer(null);
   setFirstPlayerOfRound(null);
   setSelectedDrone(null);
   setPassInfo({ firstPasser: null, player1Passed: false, player2Passed: false });
   setFirstPasserOfPreviousRound(null);
   setFirstPlayerOverride(null);
   setAiActionCount(0);
   setModalContent(null);
   setAiActionReport(null);
   setWinner(null);
   setAbilityMode(null);
   setValidAbilityTargets([]);
   setMandatoryAction(null);
   setShowMandatoryActionModal(false);
   setConfirmationModal(null);
    // --- NEW --- Reset card state
   setSelectedCard(null);
   setValidCardTargets([]);
   setCardConfirmation(null);
  };

  const handleStartGame = () => {
   setTurnPhase('placement');
    const sections = Object.keys(player2.shipSections);
    const shuffledSections = sections.sort(() => 0.5 - Math.random());
   setOpponentPlacedSections(shuffledSections);
   setModalContent({
        title: 'Phase 1: Place Your Ship Sections',
        text: 'To begin, select a lane below to place your first ship section, the Bridge. The sections must be placed in a specific order: Bridge, then Power Cell, then Drone Control Hub.'
    });
  };

  const handleStartActionPhase = () => {
   setShowActionPhaseStartModal(false);
   setPassInfo({ firstPasser: null, player1Passed: false, player2Passed: false });
    const firstActor = firstPlayerOfRound;
   setCurrentPlayer(firstActor);
   setAiActionCount(0);
   setTurnPhase('action');
    
    if (firstActor === 'player1') {
     setModalContent({
            title: "Action Phase Begins",
            text: "It's your turn to act. Select a drone to move or attack, play a card, or use an ability."
        });
    } else {
     setModalContent({
            title: "Opponent's Turn",
            text: "The AI is taking its turn."
        });
    }
  };
  
  const handleDrawToHand = () => {
   setPlayer1(prev => {
      let newDeck = [...prev.deck];
      let newHand = [...prev.hand];
      let newDiscardPile = [...prev.discardPile];
      const handSize = player1EffectiveStats.handLimit;

      // Continue drawing as long as the hand isn't full
      while (newHand.length < handSize) {
        // If the deck is empty...
        if (newDeck.length === 0) {
          // ...but the discard pile has cards, reshuffle it into the deck.
          if (newDiscardPile.length > 0) {
            newDeck = [...newDiscardPile].sort(() => 0.5 - Math.random());
            newDiscardPile = []; // Clear the discard pile
          } else {
            // If both are empty, we can't draw anymore, so stop.
            break;
          }
        }
        // Draw the top card from the deck.
        const drawnCard = newDeck.pop();
        newHand.push(drawnCard);
      }
      // Return the updated state for the deck, hand, and discard pile.
      return { ...prev, deck: newDeck, hand: newHand, discardPile: newDiscardPile };
    });
    
    if (turn > 1) {
      const shieldsPerTurn = player1EffectiveStats.shieldsPerTurn;
     setShieldsToAllocate(shieldsPerTurn);
     setInitialShieldAllocation(JSON.parse(JSON.stringify(player1.shipSections))); // Deep copy for reset
     setTurnPhase('allocateShields');
     setModalContent({
            title: 'Phase: Restore Shields',
            text: `You have ${shieldsPerTurn} shields to restore. Click on any of your damaged ship sections to add a shield. When finished, click "End Allocation" to continue.`
        });
    } else {
        const determineFirstPlayer = () => {
            // Priority 1: A card/ability effect overrides the normal rules.
            if (firstPlayerOverride) {
               setFirstPlayerOverride(null); // Clear the override after using it
                return firstPlayerOverride;
            }
            // Priority 2: For the very first round, it's random.
            if (turn === 1) {
                return Math.random() < 0.5 ? 'player1' : 'player2';
            }
            // Priority 3: The player who passed first in the previous round goes first.
            // If for some reason no one passed first (e.g. simultaneous pass), default to player1.
            return firstPasserOfPreviousRound || 'player1';
        };

        const firstPlayer = determineFirstPlayer();
       setCurrentPlayer(firstPlayer);
       setFirstPlayerOfRound(firstPlayer);
       setShowFirstPlayerModal(true);
    }
  };

  const handlePlaceSection = (laneIndex) => {
    if (placedSections[laneIndex]) return;
    const nextSectionIndex = placedSections.filter(s => s !== undefined).length;
    if (nextSectionIndex >= sectionsToPlace.length) return;
    const nextSection = sectionsToPlace[nextSectionIndex];
    const newPlacedSections = [...placedSections];
   newPlacedSections[laneIndex] = nextSection;
   setPlacedSections(newPlacedSections);
    if (nextSectionIndex === 2) {
     setTurnPhase('droneSelection');
     setModalContent({
            title: 'Phase 3: Choose Your Drones',
            text: 'Select 5 drones from your full collection to add to your Active Drone Pool. These are the drones you can launch during the game. Once you have made your selection, click "Confirm Selection".'
        });
      const initialPool = [...fullDroneCollection].sort(() => 0.5 - Math.random());
      const firstPair = initialPool.slice(0, 2);
      const remaining = initialPool.slice(2);
      
     setDroneSelectionPair(firstPair);
     setDroneSelectionPool(remaining);
     setTempSelectedDrones([]);
    }
  };

  const handleAllocateShield = (sectionName) => {
    const section = player1.shipSections[sectionName];
    if (shieldsToAllocate > 0 && section.allocatedShields < section.shields) {
     setPlayer1(prev => {
        const newShipSections = {
          ...prev.shipSections,
          [sectionName]: {
            ...prev.shipSections[sectionName],
            allocatedShields: prev.shipSections[sectionName].allocatedShields + 1,
          }
        };
        return { ...prev, shipSections: newShipSections };
      });
     setShieldsToAllocate(prev => prev - 1);
    }
  };
  
  const handleResetShieldAllocation = () => {
   setPlayer1(prev => ({ ...prev, shipSections: initialShieldAllocation }));
   setShieldsToAllocate(player1EffectiveStats.shieldsPerTurn);
  };

  const handleEndAllocation = () => {
    const shieldsToAllocateAI = player2EffectiveStats.shieldsPerTurn;
    const aiSections = Object.keys(player2.shipSections);
   setPlayer2(prev => {
      let remainingAIShields = shieldsToAllocateAI;
      // Use a deep copy to safely mutate within this function's scope before setting state
      const newSections = JSON.parse(JSON.stringify(prev.shipSections));
      let i = 0;
      let failsafe = 0;
      while (remainingAIShields > 0 && failsafe < 100) {
        const sectionName = aiSections[i % aiSections.length];
        if (newSections[sectionName].allocatedShields < newSections[sectionName].shields) {
         newSections[sectionName].allocatedShields++;
          remainingAIShields--;
        }
        i++;
        failsafe++;
      }
      return { ...prev, shipSections: newSections };
    });

    const determineFirstPlayer = () => {
        // Priority 1: A card/ability effect overrides the normal rules.
        if (firstPlayerOverride) {
           setFirstPlayerOverride(null); // Clear the override after using it
            return firstPlayerOverride;
        }
        // Priority 2: For the very first round, it's random.
        if (turn === 1) {
            return Math.random() < 0.5 ? 'player1' : 'player2';
        }
        // Priority 3: The player who passed first in the previous round goes first.
        // If for some reason no one passed first (e.g. simultaneous pass), default to player1.
        return firstPasserOfPreviousRound || 'player1';
    };

    const firstPlayer = determineFirstPlayer();
   setCurrentPlayer(firstPlayer);
   setFirstPlayerOfRound(firstPlayer);
   setShowFirstPlayerModal(true);
  };

  const handleStartDeploymentPhase = () => {
   setPassInfo({ firstPasser: null, player1Passed: false, player2Passed: false });
   setTurnPhase('deployment');
    const deploymentResource = turn === 1 ? 'Initial Deployment Points' : 'Energy';
    if (firstPlayerOfRound === 'player1') {
     setModalContent({
            title: "Your Turn to Deploy",
            text: `Select a drone and a lane to deploy it. Drones cost ${deploymentResource} this turn. Or, click "Pass" to end your deployment for this phase.`
        });
    } else {
     setModalContent({
            title: "Opponent's Turn",
            text: "The AI is deploying a drone. Wait for its turn to complete."
        });
    }
  };

  const handleConfirmDroneSelection = (selectedDrones) => {
    const initialCounts = {};
   selectedDrones.forEach(drone => {
     initialCounts[drone.name] = 0;
    });
   setPlayer1(prev => ({ ...prev, activeDronePool: selectedDrones, deployedDroneCounts: initialCounts }));
    
    const aiDrones = getRandomDrones(fullDroneCollection, 5);
    const aiInitialCounts = {};
   aiDrones.forEach(drone => {
     aiInitialCounts[drone.name] = 0;
    });
   setPlayer2(prev => ({
        ...prev,
       activeDronePool: aiDrones,
       deployedDroneCounts: aiInitialCounts,
    }));
   setTurnPhase('initialDraw');
   setModalContent({
        title: 'Start of Turn: Draw Cards',
        text: 'You can now draw cards to fill your hand. Click the "Draw to Hand" button to begin your turn.'
    });
  };

  const handleChooseDroneForSelection = (chosenDrone) => {
    const newSelection = [...tempSelectedDrones, chosenDrone];
    if (newSelection.length >= 5) {
     handleConfirmDroneSelection(newSelection);
    } else {
     setTempSelectedDrones(newSelection);
      const newPair = droneSelectionPool.slice(0, 2);
      const remaining = droneSelectionPool.slice(2);
      
     setDroneSelectionPair(newPair);
     setDroneSelectionPool(remaining);
    }
  };

  const handleToggleDroneSelection = (drone) => {
    if (passInfo.player1Passed) return;
    if (selectedDrone && selectedDrone.name === drone.name) {
     setSelectedDrone(null);
    } else {
     setSelectedDrone(drone);
     setAbilityMode(null);
     cancelCardSelection();
    }
  };

  const executeDeployment = (lane, budgetCost, energyCost) => {
   setPlayer1(prev => {
        const tempDronesOnBoard = { ...prev.dronesOnBoard, [lane]: [...prev.dronesOnBoard[lane], { ...selectedDrone, id: 0 }] };
        const tempPlayerState = {...prev, dronesOnBoard: tempDronesOnBoard};
        const effectiveStats = calculateEffectiveStats(selectedDrone, lane, tempPlayerState);

        const newDrone = { 
            ...selectedDrone, 
            id: Date.now(),
            currentShields: effectiveStats.maxShields,
            currentMaxShields: effectiveStats.maxShields,
            hull: selectedDrone.hull,
            isExhausted: false,
        };

        const finalDronesOnBoard = { ...prev.dronesOnBoard, [lane]: [...prev.dronesOnBoard[lane], newDrone] };
        
        let finalPlayerState = { 
            ...prev, 
            dronesOnBoard: finalDronesOnBoard, 
            deployedDroneCounts: { ...prev.deployedDroneCounts, [selectedDrone.name]: (prev.deployedDroneCounts[selectedDrone.name] || 0) + 1 },
            initialDeploymentBudget: prev.initialDeploymentBudget - budgetCost,
            energy: prev.energy - energyCost
        };

        finalPlayerState.dronesOnBoard = updateAuras(finalPlayerState);

        return finalPlayerState;
    });
   setSelectedDrone(null);
   endTurn('player1');
  };

  const handleDeployDrone = (lane) => {
    if (!selectedDrone || currentPlayer !== 'player1' || passInfo.player1Passed) return;

    if (totalPlayer1Drones >= player1EffectiveStats.cpuLimit) {
     setModalContent({ title: "CPU Limit Reached", text: "You cannot deploy more drones than your CPU Control Value." });
      return;
    }

    if ((player1.deployedDroneCounts[selectedDrone.name] || 0) >= selectedDrone.limit) {
     setModalContent({ title: "Deployment Limit Reached", text: `You have already deployed the maximum number of ${selectedDrone.name} drones.` });
      return;
    }

    const droneCost = selectedDrone.class;
    let energyCost = 0;
    let budgetCost = 0;

    if (turn === 1) {
        budgetCost = Math.min(player1.initialDeploymentBudget, droneCost);
        energyCost = droneCost - budgetCost;
    } else {
        energyCost = droneCost;
    }

    if (player1.energy < energyCost) {
     setModalContent({ title: "Not Enough Energy", text: `This action requires ${energyCost} energy, but you only have ${player1.energy}.` });
      return;
    }

    if (turn === 1 && energyCost > 0) {
       setDeploymentConfirmation({ lane, budgetCost, energyCost });
    } else {
       executeDeployment(lane, budgetCost, energyCost);
    }
  };

  const handleConfirmDeployment = () => {
    if (!deploymentConfirmation) return;
    const { lane, budgetCost, energyCost } = deploymentConfirmation;
   executeDeployment(lane, budgetCost, energyCost);
   setDeploymentConfirmation(null);
  };

  const handlePlayerPass = () => {
    if (passInfo.player1Passed) return;
   setPassInfo(prev => {
        const wasFirstToPass = !prev.player2Passed;
        const newPassInfo = {
            ...prev,
            player1Passed: true,
            firstPasser: prev.firstPasser || (wasFirstToPass ? 'player1' : null)
        };

        if (newPassInfo.player2Passed) {
            if (turnPhase === 'deployment') endDeploymentPhase();
            if (turnPhase === 'action') endActionPhase();
        } else {
            endTurn('player1');
        }
        return newPassInfo;
    });
  };

  useEffect(() => {
    if (!pendingAttack) return;
  
    const { attacker, target, targetType, lane, attackingPlayer } = pendingAttack;
  
    if (attackingPlayer === 'player1') {
      const potentialInterceptors = player2.dronesOnBoard[lane]
        .filter(d => {
            const effectiveInterceptor = calculateEffectiveStats(d, lane, player2);
            return !d.isExhausted &&
                   (effectiveInterceptor.speed > attacker.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS')) &&
                   (targetType !== 'drone' || d.id !== target.id)
        })
        .sort((a, b) => a.class - b.class);
  
      let interceptor = null;
      if (potentialInterceptors.length > 0) {
        if (targetType === 'section' || target.class === undefined || potentialInterceptors[0].class < target.class) {
          interceptor = potentialInterceptors[0];
        }
      }
  
      if (interceptor) {
       setInterceptionModal({
          interceptor,
         originalTarget: target,
          onClose: () => {
           resolveAttack({ ...pendingAttack, interceptor });
           setInterceptionModal(null);
          },
        });
      } else {
       resolveAttack(pendingAttack);
      }
    } else if (attackingPlayer === 'player2') {
      const potentialInterceptors = player1.dronesOnBoard[lane]
        .filter(d => {
            const effectiveInterceptor = calculateEffectiveStats(d, lane, player1);
            return !d.isExhausted &&
                   (effectiveInterceptor.speed > attacker.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS')) &&
                   (targetType !== 'drone' || d.id !== target.id)
        });
  
      if (potentialInterceptors.length > 0) {
       setPlayerInterceptionChoice({
          attackDetails: pendingAttack,
         interceptors: potentialInterceptors,
        });
      } else {
       resolveAttack(pendingAttack);
      }
    }
  }, [pendingAttack, resolveAttack, player1, player2.dronesOnBoard, calculateEffectiveStats]);

  // --- MODIFIED --- to handle targeting for cards
  const handleTargetClick = (target, targetType, isPlayer) => {
    if (abilityMode && validAbilityTargets.some(t => t.id === target.id)) {
      resolveAbility(abilityMode.ability, abilityMode.drone, target);
      return;
    }
    
    // --- NEW --- Card Targeting Logic
if (selectedCard && validCardTargets.some(t => t.id === target.id)) {
  const owner = isPlayer ? 'player1' : 'player2';
  setCardConfirmation({ card: selectedCard, target: { ...target, owner } });
  return;
    }

    if (turnPhase === 'action' && currentPlayer === 'player1' && selectedDrone && !selectedDrone.isExhausted && !isPlayer) {
        const [attackerLane] = Object.entries(player1.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];
        
        let targetLane;
        if (targetType === 'drone') {
          [targetLane] = Object.entries(player2.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === target.id)) || [];
        } else if (targetType === 'section') {
            const laneIndex = opponentPlacedSections.findIndex(name => name === target.name);
            if (laneIndex !== -1) {
                targetLane = `lane${laneIndex + 1}`;
            }
        }

        if (attackerLane && targetLane && attackerLane === targetLane) {
           setPendingAttack({ attacker: selectedDrone, target, targetType, lane: attackerLane, attackingPlayer: 'player1' });
        } else {
           setModalContent({ title: "Invalid Target", text: "You can only attack targets in the same lane." });
        }
    } else {
        if (targetType === 'drone') {
         setDetailedDrone(target);
        }
    }
  };
  
  const handleAbilityIconClick = (e, drone, ability) => {
   e.stopPropagation();
    if (turnPhase !== 'action' || currentPlayer !== 'player1' || passInfo.player1Passed) return;

    const cost = ability.cost || {};
    if (drone.isExhausted && cost.exhausts !== false) {
       setModalContent({ title: "Drone Exhausted", text: "This drone cannot perform any more actions this turn."});
        return;
    }
    if (cost.energy && player1.energy < cost.energy) {
       setModalContent({ title: "Not Enough Energy", text: `This ability costs ${cost.energy} energy, but you only have ${player1.energy}.`});
        return;
    }

    if (abilityMode && abilityMode.drone.id === drone.id) {
       cancelAbilityMode();
    } else {
       setAbilityMode({ drone, ability });
       setSelectedDrone(drone);
       cancelCardSelection();
    }
  };

  const handleTokenClick = (e, token, isPlayer) => {
      if (mandatoryAction && mandatoryAction.type === 'destroy' && isPlayer) {
          setConfirmationModal({
              type: 'destroy',
              target: token,
              onConfirm: () => handleConfirmMandatoryDestroy(token),
              onCancel: () => setConfirmationModal(null),
              text: `Are you sure you want to destroy your ${token.name}?`
          });
          return;
      }
      
      if (isPlayer) {
          e.stopPropagation();
      }

      if ((abilityMode && validAbilityTargets.some(t => t.id === token.id)) || (selectedCard && validCardTargets.some(t => t.id === token.id))) {
       handleTargetClick(token, 'drone', isPlayer);
        return;
      }
  
      if (turnPhase !== 'action' && !isPlayer) {
          setDetailedDrone(token);
          return;
      }
  
      if (isPlayer) {
          if (currentPlayer === 'player1' && !passInfo.player1Passed) {
              if (token.isExhausted) return;
              if (selectedDrone && selectedDrone.id === token.id) {
                  setSelectedDrone(null);
                  cancelAbilityMode();
              } else {
                  setSelectedDrone(token);
                  cancelAbilityMode();
                  cancelCardSelection();
              }
          } else {
              setDetailedDrone(token);
          }
      } else {
          handleTargetClick(token, 'drone', false);
      }
  };


const handleLaneClick = (e, lane, isPlayer) => {
    // Stop the click from bubbling up to the main game area div
    e.stopPropagation();

    if (selectedCard && selectedCard.targeting.type === 'LANE') {
        const owner = isPlayer ? 'player1' : 'player2';
        if (validCardTargets.some(t => t.id === lane && t.owner === owner)) {
            setCardConfirmation({ card: selectedCard, target: { id: lane, owner }});
            return; 
        }
    }

    if (selectedCard) {
      cancelCardSelection();
      return;
    }
    
    if (abilityMode) {
     cancelAbilityMode();
      return;
    }

    if (turnPhase === 'deployment' && isPlayer) {
     handleDeployDrone(lane);
    } else if (turnPhase === 'action' && isPlayer && selectedDrone) {
        const [sourceLaneName] = Object.entries(player1.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];
        if (!sourceLaneName) return;

        const sourceLaneIndex = parseInt(sourceLaneName.replace('lane', ''), 10);
        const targetLaneIndex = parseInt(lane.replace('lane', ''), 10);

        if (Math.abs(sourceLaneIndex - targetLaneIndex) === 1) {
           setMoveConfirmation({ drone: selectedDrone, from: sourceLaneName, to: lane });
        } else {
           setModalContent({ title: "Invalid Move", text: "Drones can only move to adjacent lanes." });
        }
    }
  };

  // --- NEW --- Click handler for cards in hand
  const handleCardClick = (card) => {
    if (turnPhase !== 'action' || currentPlayer !== 'player1' || passInfo.player1Passed) return;
    if (player1.energy < card.cost) {
      // Potentially show a "not enough energy" message
      return;
    }

    if (selectedCard?.instanceId === card.instanceId) {
      cancelCardSelection();
    } else {
 if (!card.targeting) {
        setCardConfirmation({ card, target: null });
        setSelectedCard(null);
        setAbilityMode(null);
        setSelectedDrone(null);
      } else {
        setSelectedCard(card);
        // Clear other selections
        setSelectedDrone(null);
        setAbilityMode(null);
    }
  }
  };

  const executeMove = () => {
    if (!moveConfirmation) return;
    const { drone, from, to } = moveConfirmation;

   setPlayer1(prev => {
        let newDronesOnBoard = { ...prev.dronesOnBoard };
       newDronesOnBoard[from] = newDronesOnBoard[from].filter(d => d.id !== drone.id);
        const movedDrone = { ...drone, isExhausted: true };
       newDronesOnBoard[to] = [...newDronesOnBoard[to], movedDrone];
        
        let newPlayerState = { ...prev, dronesOnBoard: newDronesOnBoard };
        newPlayerState.dronesOnBoard = updateAuras(newPlayerState);
        return newPlayerState;
    });

   setMoveConfirmation(null);
   setSelectedDrone(null);
    
   endTurn('player1');
  };
  
  const handleConfirmMandatoryDiscard = (card) => {
   setPlayer1(prev => {
        return {
            ...prev,
            hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
            discardPile: [...prev.discardPile, card]
        };
    });
   setMandatoryAction(prev => {
        const newCount = prev.count - 1;
        if (newCount <= 0) {
            handlePostDiscardAction();
            return null;
        }
        return { ...prev, count: newCount };
    });
   setConfirmationModal(null);
  };
  
  const handleConfirmMandatoryDestroy = (drone) => {
   setPlayer1(prev => {
        let newPlayerState = {...prev};
        const lane = getLaneOfDrone(drone.id, newPlayerState);
        if (lane) {
            newPlayerState.dronesOnBoard[lane] = newPlayerState.dronesOnBoard[lane].filter(d => d.id !== drone.id);
            const onDestroyUpdates = onDroneDestroyed(newPlayerState, drone);
            Object.assign(newPlayerState, onDestroyUpdates);
            newPlayerState.dronesOnBoard = updateAuras(newPlayerState);
        }
        return newPlayerState;
    });

   setMandatoryAction(prev => {
        const newCount = prev.count - 1;
        if (newCount <= 0) {
            const p2IsOver = totalPlayer2Drones > player2EffectiveStats.cpuLimit;
            if (p2IsOver) {
               setPlayer2(p2 => {
                    let newP2 = {...p2};
                    let dronesToDestroyCount = Object.values(p2.dronesOnBoard).flat().length - calculateEffectiveShipStats(p2).cpuLimit;
                    for (let i = 0; i < dronesToDestroyCount; i++) {
                        const allDrones = Object.entries(newP2.dronesOnBoard).flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));
                        if (allDrones.length === 0) break;

                        const lowestClass = Math.min(...allDrones.map(d => d.class));
                        const candidates = allDrones.filter(d => d.class === lowestClass);
                        const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];
                        
                        newP2.dronesOnBoard[droneToDestroy.lane] = newP2.dronesOnBoard[droneToDestroy.lane].filter(d => d.id !== droneToDestroy.id);
                        const onDestroyUpdates = onDroneDestroyed(newP2, droneToDestroy);
                        Object.assign(newP2, onDestroyUpdates);
                    }
                    newP2.dronesOnBoard = updateAuras(newP2);
                    return newP2;
                });
            }
           handleStartDeploymentPhase();
            return null;
        }
        return { ...prev, count: newCount };
    });
   setConfirmationModal(null);
  };


  const getPhaseDisplayName = (phase) => {
    const names = {
      preGame: "Pre-Game Setup",
      placement: "Placement Phase",
      droneSelection: "Drone Selection",
      initialDraw: "Draw Phase",
      optionalDiscard: "Discard Phase",
      allocateShields: "Shield Allocation",
      deployment: "Deployment Phase",
      action: "Action Phase",
      combatPending: "Combat Phase Pending",
      roundEnd: "Round Over"
    };
    return names[phase] || "Unknown Phase";
  };

    const handleCloseAiReport = useCallback(() => {
        setAiActionReport(null);
        endTurn('player2');
    }, [endTurn]);

  const sortedPlayer1ActivePool = useMemo(() => {
    return [...player1.activeDronePool].sort((a, b) => {
      if (a.class !== b.class) {
        return a.class - b.class;
      }
      return a.name.localeCompare(b.name);
    });
  }, [player1.activeDronePool]);

  const canAllocateMoreShields = useMemo(() => {
    if (!player1) return false;
    return Object.values(player1.shipSections).some(section => section.allocatedShields < section.shields);
  }, [player1.shipSections]);

  const getFirstPlayerReasonText = () => {
    if (turn === 1) {
      return "The first player is determined randomly for the first round.";
    }
    const passerName = firstPasserOfPreviousRound === 'player1' ? player1.name : player2.name;
    return `${passerName} passed first in the previous round, securing the initiative.`;
  };

  // --- UI COMPONENTS ---
  const TargetingArrow = ({ visible, start, end }) => {
    if (!visible) return null;
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-40">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
          refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ff0055" />
          </marker>
        </defs>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#ff0055" strokeWidth="4" markerEnd="url(#arrowhead)" strokeDasharray="10, 5" />
      </svg>
    );
  };

  const Explosion = ({ top, left }) => (
    <div className="explosion" style={{ top: `${top}px`, left: `${left}px` }}></div>
  );

  const DroneToken = ({ drone, onClick, isPlayer, isSelected, isHit, isPotentialInterceptor, onMouseEnter, onMouseLeave, effectiveStats, onAbilityClick, isActionTarget }) => { // MODIFIED PROP
    const borderColor = isPlayer ? 'border-cyan-400' : 'border-pink-500';
    const exhaustEffect = drone.isExhausted ? 'grayscale opacity-60' : '';
    const selectedEffect = isSelected ? 'ring-4 ring-cyan-400 scale-110' : '';
    const hitEffect = isHit ? 'animate-shake' : '';
    const interceptorEffect = isPotentialInterceptor ? 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50' : '';
    const actionTargetEffect = isActionTarget ? 'ring-4 ring-purple-400 shadow-lg shadow-purple-400/50 animate-pulse' : ''; // MODIFIED
    const mandatoryDestroyEffect = mandatoryAction?.type === 'destroy' && isPlayer ? 'ring-4 ring-red-500 animate-pulse' : '';
    const baseDrone = useMemo(() => fullDroneCollection.find(d => d.name === drone.name), [drone.name]);
    const maxHull = baseDrone ? baseDrone.hull : 1;
    const { maxShields, keywords } = effectiveStats;
    const currentShields = drone.currentShields ?? maxShields;
    const activeAbilities = baseDrone.abilities.filter(a => a.type === 'ACTIVE');
    
    const isAbilityUsable = (ability) => {
        if (drone.isExhausted && ability.cost.exhausts !== false) return false;
        if (ability.cost.energy && player1.energy < ability.cost.energy) return false;
        return true;
    };
    
    return (
      <div
        ref={el => droneRefs.current[drone.id] = el}
        onClick={(e) => onClick && onClick(e, drone, isPlayer)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`relative w-24 bg-gray-900/80 rounded-lg flex flex-col p-2 shadow-lg border-2 ${borderColor} cursor-pointer transition-transform duration-200 hover:scale-110 ${exhaustEffect} ${selectedEffect} ${hitEffect} ${interceptorEffect} ${actionTargetEffect} ${mandatoryDestroyEffect} shadow-black`}
      >
        <div className="flex justify-between items-center w-full text-base font-bold">
          <span className="flex items-center gap-1 text-white bg-slate-800/70 px-2 py-0.5 rounded-full"><Sword size={12} /> {drone.attack}</span>
          <span className="flex items-center gap-1 text-white bg-slate-800/70 px-2 py-0.5 rounded-full"><Rocket size={12} /> {drone.speed}</span>
        </div>
        <div className="flex flex-col items-center my-1 relative">
          <img src={drone.image} alt={drone.name} className="w-14 h-14 rounded-md object-cover border-2 border-black/50" />
            {isPlayer && activeAbilities.length > 0 && (
                <div className="absolute -bottom-2 -right-2 flex flex-col gap-1">
                {activeAbilities.map((ability, index) => (
                    <button key={index} onClick={(e) => onAbilityClick && onAbilityClick(e, drone, ability)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-black
                            ${isAbilityUsable(ability) ? 'bg-purple-600 text-yellow-300 hover:bg-purple-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                        `}
                        title={ability.name}
                    >
                        <Zap size={14} />
                    </button>
                 ))}
                </div>
            )}
        </div>
        <div className="w-full flex flex-col gap-1.5 mt-auto">
              <div className="flex w-full justify-center gap-1.5 min-h-[12px]">
                  {maxShields > 0 && Array.from({ length: maxShields }).map((_, i) => (
                      <div key={`shield-${i}`}>
                          {i < currentShields ? <ShieldCheck size={12} className="text-cyan-300" /> : <Shield size={12} className="text-gray-600" />}
                      </div>
                   ))}
              </div>
              <div className="flex w-full justify-center gap-1">
                  {Array.from({ length: maxHull }).map((_, i) => (
                      <div key={`hull-${i}`} className={`h-3 w-3 rounded-sm ${i < drone.hull ? 'bg-green-500' : 'bg-red-500'}`}></div>
                   ))}
              </div>
        </div>
      </div>
    );
  };

  const renderDronesOnBoard = (drones, isPlayer, lane) => {
    return (
      <div className="flex flex-wrap gap-2 p-1 min-h-[100px] justify-center items-center">
       {drones.map((drone) => {
            const playerState = isPlayer ? player1 : player2;
            const effectiveStats = calculateEffectiveStats(drone, lane, playerState);
            return (
                <DroneToken
                key={drone.id}
                drone={drone}
                effectiveStats={effectiveStats}
                isPlayer={isPlayer}
                onClick={handleTokenClick}
                onAbilityClick={handleAbilityIconClick}
                isSelected={selectedDrone && selectedDrone.id === drone.id}
                isHit={recentlyHitDrones.includes(drone.id)}
                isPotentialInterceptor={potentialInterceptors.includes(drone.id)}
                isActionTarget={validAbilityTargets.some(t => t.id === drone.id) || validCardTargets.some(t => t.id === drone.id)}
                onMouseEnter={() => !isPlayer && setHoveredTarget({ target: drone, type: 'drone', lane })}
                onMouseLeave={() => !isPlayer && setHoveredTarget(null)}
                 />
            );
        })}
      </div>
    );
  };

  const GamePhaseModal = ({ title, text, onClose, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full max-w-lg relative">
        {onClose && <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>}
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 text-center mb-4">{title}</h2>
        <p className="text-center text-gray-400">{text}</p>
        {children}
      </div>
    </div>
  );

  const AIActionReportModal = ({ report, onClose }) => {
    if (!report) return null;

    const {
        attackerName,
        lane,
        targetName,
        targetType,
       interceptorName,
        shieldDamage,
        hullDamage,
        wasDestroyed,
       remainingShields,
        remainingHull
    } = report;

    const targetDisplayName = targetType === 'section'
    ? targetName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    : targetName;

    return (
     <GamePhaseModal title="AI Action Report" text="" onClose={onClose}>
             <div className="text-left text-gray-300 space-y-3 mt-4 text-center">
                     <p><strong className="text-pink-400">{attackerName}</strong> attacked in <strong>{lane.replace('lane', 'Lane ')}</strong>.</p>
                  {interceptorName ? (
                       <p>Your <strong className="text-yellow-400">{interceptorName}</strong> intercepted the attack, which was targeting your <strong className="text-cyan-400">{targetDisplayName}</strong>!</p>
                    ) : (
                       <p>It targeted your <strong className="text-cyan-400">{targetDisplayName}</strong>.</p>
                    )}
                     <p>The attack dealt <strong className="text-cyan-300">{shieldDamage}</strong> damage to shields and <strong className="text-red-400">{hullDamage}</strong> damage to the hull.</p>
                  {wasDestroyed ? (
                       <p className="font-bold text-red-500 text-lg">The target was destroyed!</p>
                    ) : (
                       <p>The target has <strong className="text-cyan-300">{remainingShields}</strong> shields and <strong className="text-green-400">{remainingHull}</strong> hull remaining.</p>
                    )}
          </div>
             <div className="flex justify-center mt-6">
                 <button onClick={onClose} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
                     Continue
                 </button>
          </div>
     </GamePhaseModal>
    );
  };

  const PlayerInterceptionModal = ({ choiceData, onIntercept, onDecline }) => {
    const { attackDetails, interceptors } = choiceData;
    const { attacker, target, targetType, lane } = attackDetails;
  
    return (
     <GamePhaseModal
     title="Interception Opportunity!"
     text={`Combat in ${lane.replace('lane', 'Lane ')}`}
     onClose={onDecline}
      >
        <div className="flex justify-around items-center my-4 p-4 bg-black/20 rounded-lg">
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-pink-400 mb-2">Attacker</h4>
           <DroneToken drone={attacker} isPlayer={false} effectiveStats={calculateEffectiveStats(attacker, lane, player2)}/>
          </div>
          <div className="text-4xl font-bold text-gray-500">VS</div>
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-cyan-400 mb-2">Target</h4>
           {targetType === 'drone' ? (
             <DroneToken drone={target} isPlayer={true} effectiveStats={calculateEffectiveStats(target, lane, player1)} />
           ) : (
             <div className="transform scale-75">
               <ShipSection
                 section={target.name}
                 stats={player1.shipSections[target.name]}
                 isPlayer={true}
                 isInteractive={false}
                 />
             </div>
           )}
          </div>
        </div>
  
        <h3 className="text-center text-white text-xl font-semibold mt-6 mb-2">Choose an Interceptor</h3>
        <p className="text-center text-gray-400 mb-4">Drones with higher speed or special abilities can intercept the attack.</p>
        <div className="flex flex-wrap justify-center gap-4 my-4">
         {interceptors.map(drone => (
           <DroneToken
             key={drone.id}
             drone={drone}
             isPlayer={true}
             onClick={() => onIntercept(drone)}
               effectiveStats={calculateEffectiveStats(drone, lane, player1)}
               />
          ))}
        </div>
  
        <div className="flex justify-center mt-6">
          <button
           onClick={onDecline}
           className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors"
          >
            Decline Interception
        </button>
        </div>
     </GamePhaseModal>
    );
  };

  const DetailedDroneModal = ({ drone, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 text-center mb-4">{drone.name}</h2>
        <div className="flex justify-center">
            <DroneCard drone={drone} isSelectable={false} deployedCount={0}/>
        </div>
      </div>
    </div>
  );

  // --- COMPONENT FOR AUTO-SCALING TEXT ---
  const ScalingText = ({ text, className }) => {
    const containerRef = useRef(null);
    const textRef = useRef(null);

    useEffect(() => {
            const container = containerRef.current;
            const textEl = textRef.current;
            if (!container || !textEl || container.clientHeight === 0) return;

            const resizeText = () => {
                let min, max;
               if(className.includes("font-orbitron")){
                    min = 8; max = 16;
                } else {
                    min = 8; max = 12; 
                }
                
                let fontSize = max;
                
               textEl.style.fontSize = `${fontSize}px`;
                
                while ((textEl.scrollHeight > container.clientHeight || textEl.scrollWidth > container.clientWidth) && fontSize > min) {
                    fontSize -= 0.5;
                   textEl.style.fontSize = `${fontSize}px`;
                }
            };
            
            const observer = new ResizeObserver(resizeText);
           observer.observe(container);

           resizeText();

            return () => observer.disconnect();
    }, [text, className]);

    return (
        <div ref={containerRef} className="h-full w-full flex items-center justify-center">
            <span ref={textRef} className={className}>{text}</span>
        </div>
    );
  };

  const DroneCard = ({ drone, onClick, isSelectable, isSelected, deployedCount, ignoreDeployLimit = false }) => {
    const atLimit = deployedCount >= drone.limit;
    const isInteractive = isSelectable && (!atLimit || ignoreDeployLimit);
    const deploymentCost = drone.class;
    
    const { name, image, attack, hull, shields, speed, abilities } = drone;
    const ability = abilities && abilities.length > 0 ? abilities[0] : null;

    return (
      <div
      onClick={isInteractive ? () => onClick(drone) : undefined}
      className={`
        w-52 h-[320px] rounded-lg p-[2px] relative group
        transition-all duration-200
       ${isInteractive ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isSelected ? 'bg-cyan-400' : 'bg-cyan-800/80'}
       ${!isInteractive ? 'opacity-60' : ''}
      `}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
      >
        <div
          className={`
            w-full h-full bg-black flex flex-col font-orbitron text-cyan-300 overflow-hidden
           transition-all duration-200
            ${isInteractive && !isSelected ? 'group-hover:bg-gray-900' : ''}
          `}
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
        >
          <div className="absolute inset-0 bg-grid-cyan opacity-10"></div>
          
          <div className="text-center py-1 px-3 bg-cyan-900/50 flex-shrink-0 h-8 flex items-center justify-center">
           <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap" />
          </div>

          <div className="p-1 flex-shrink-0 h-14">
            <div className="relative h-full" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
              <img src={image} alt={name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-cyan-400/50"></div>
           </div>
          </div>

            <div className="flex flex-col gap-1 px-2 flex-shrink-0 h-[50px] mt-2">
              <div className="flex justify-between gap-2 text-xs">
               <div className="flex items-center justify-center gap-1 bg-cyan-900/50 p-1 rounded w-1/2"><Sword size={12} /> {attack}</div>
               <div className="flex items-center justify-center gap-1 bg-cyan-900/50 p-1 rounded w-1/2"><Rocket size={12} /> {speed}</div>
              </div>
              <div className="flex flex-col items-center gap-1">
               <div className="flex w-full justify-center gap-1.5 min-h-[12px]">
                   {shields > 0 && Array.from({ length: shields }).map((_, i) => (
                     <ShieldCheck key={`shield-${i}`} size={12} className="text-cyan-300" />
                   ))}
               </div>
               <div className="flex w-full justify-center gap-1">
                   {Array.from({ length: hull }).map((_, i) => (
                     <div key={`hull-${i}`} className="h-2 w-2 rounded-sm bg-green-500 border border-green-300/50"></div>
                   ))}
               </div>
              </div>
            </div>

          <div className="flex-grow mx-2 mt-1 bg-black/50 border border-cyan-800/70 p-1 flex flex-col min-h-0">
            {ability ? (
                <>
                  <h4 className="text-xs text-purple-400 tracking-wider flex-shrink-0">{ability.name}</h4>
                  <div className="flex-grow relative font-exo font-normal text-cyan-200">
                      <ScalingText text={ability.description} className="text-gray-400 text-xs leading-tight" />
                  </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-cyan-700 italic opacity-70">[ No Signal ]</p>
                </div>
            )}
          </div>

            <div className="flex items-center justify-between p-1 border-t border-cyan-800/70 flex-shrink-0 h-12">
              <div className="flex flex-col items-center">
               <span className="text-[10px] text-gray-400">Cost</span>
                <div className="flex items-center">
                    <Bolt size={14} className="text-yellow-300"/>
                    <span className="text-white font-bold text-base ml-1">{deploymentCost}</span>
               </div>
              </div>
              <div className="flex flex-col items-center">
               <span className="text-[10px] text-gray-400">Deployed</span>
                <div className="flex items-center">
                    <span className={`font-bold text-base ml-1 ${atLimit ? 'text-pink-500' : 'text-white'}`}>
                        {deployedCount}/{drone.limit}
                    </span>
               </div>
              </div>
            </div>
        </div>
      </div>
    );
  };


const ShipSection = ({ section, stats, isPlayer, isPlaceholder, onClick, isInteractive, isOpponent, isHovered, onMouseEnter, onMouseLeave, isCardTarget }) => {
    if (isPlaceholder) {
      return (
        <div
          className="bg-black/30 rounded-lg border-2 border-dashed border-purple-500/50 flex items-center justify-center text-purple-300/70 p-4 min-h-[160px] h-full transition-colors duration-300 cursor-pointer hover:border-purple-500 hover:text-purple-300"
          onClick={onClick}
        >
          <span className="text-center">Click to place section</span>
        </div>
      );
    }
    
    const status = getShipStatus(stats);
    const effectiveStats = stats.stats[status];
    
    // The background color is now used for the overlay, giving a nice tint based on damage
    const overlayColor = status === 'critical' ? 'bg-red-900/60' : status === 'damaged' ? 'bg-yellow-900/50' : 'bg-black/60';
    const borderColor = status === 'critical' ? 'border-red-500' : status === 'damaged' ? 'border-yellow-500' : (isOpponent ? 'border-pink-500' : 'border-cyan-500');
    const shadowColor = isOpponent ? 'shadow-pink-500/20' : 'shadow-cyan-500/20';
    const hoverEffect = isHovered ? 'scale-105 shadow-xl' : 'hover:scale-105';

    const cardTargetEffect = isCardTarget ? 'ring-4 ring-purple-400 shadow-lg shadow-purple-400/50 animate-pulse' : '';
    const sectionName = section === 'droneControlHub' ? 'Drone Control Hub' : section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    // This creates the style needed to apply the background image
    const backgroundImageStyle = {
      backgroundImage: `url(${stats.image})`,
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover', // Ensures the image fills the component area
    };

    return (
      <div
        className={`
          relative rounded-xl shadow-lg ${shadowColor} border-2 h-full
          transition-all duration-300 overflow-hidden
          ${borderColor}
          ${isInteractive ? `cursor-pointer ${hoverEffect}` : ''}
          ${cardTargetEffect}
        `}
        style={backgroundImageStyle} // The background image is applied here
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* An overlay is added to ensure the text on top is easy to read */}
        <div className={`absolute inset-0 ${overlayColor}`}></div>
        
        {/* A new wrapper to place all the content on top of the image and overlay */}
        <div className="relative z-10 flex flex-col items-center justify-between p-4 h-full">
          <div className={`absolute top-2 right-2 flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${status === 'healthy' ? 'bg-green-500/20 text-green-300' : status === 'damaged' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-bold text-lg text-white">{sectionName}</p>
            <p className="text-xs text-gray-400 italic max-w-[200px]">{stats.description}</p>
          </div>
          {effectiveStats && (
            <div className="flex flex-col items-start w-full mt-2 text-sm text-gray-300">
              {Object.entries(effectiveStats).map(([key, value]) => (
                <span key={key} className="flex items-center"><span className="font-bold mr-1">{key}:</span> {value}</span>
              ))}
            </div>
          )}
          <div className="flex flex-col items-center w-full mt-2">
            <div className="flex gap-1 items-center mb-2">
              {Array(stats.shields).fill(0).map((_, i) => (
                <div key={i}>
                  {i < stats.allocatedShields ? <ShieldCheck size={16} className="text-cyan-300" /> : <Shield size={16} className="text-gray-600" />}
                </div>
              ))}
            </div>
            <div className="flex w-full justify-center gap-1">
              {Array.from({ length: stats.maxHull }).map((_, i) => (
                <div key={i} className={`h-3 w-3 rounded-sm ${i < stats.hull ? 'bg-green-500' : 'bg-red-500'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ShipSectionsDisplay = ({ player, isPlayer, placedSections, onSectionClick, isInteractive, onTargetClick, selectedCard, validCardTargets }) => {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-row gap-4 w-full">
            {Array.from({ length: 3 }).map((_, index) => {
                const sectionName = placedSections[index];
                const laneName = `lane${index + 1}`;
                const isHovered = hoveredTarget && hoveredTarget.type === 'section' && hoveredTarget.target.name === sectionName;
                const isCardTarget = !!selectedCard && validCardTargets.some(t => t.id === sectionName);
                   return (
                    <div key={index} className="flex-1">
                        {sectionName ? (
                            <ShipSection
                                section={sectionName}
                                stats={player.shipSections[sectionName]}
                                isPlayer={isPlayer}
                                isInteractive={isInteractive}
                                isCardTarget={isCardTarget} 
                                onClick={() => {

                                    // Create the data object for the clicked section
                                    const targetData = { 
                                        id: sectionName, // This adds the required ID for target validation
                                        name: sectionName,
                                        owner: isPlayer ? 'player1' : 'player2'
                                    };

                                    // First, check if the click is meant for a selected card
                                    if (isCardTarget) {
                                        onTargetClick(targetData, 'section', isPlayer);
                                        return; // Stop here to prevent other actions
                                    }

                                    // If not a card target, perform the original actions
                                    if (isPlayer && isInteractive) {
                                        onSectionClick(sectionName); // Handle shield allocation
                                    } else if (!isPlayer) {
                                        onTargetClick(targetData, 'section', isPlayer); // Handle attacks on the opponent
                                    }
                                }}
                                isOpponent={!isPlayer} // Corrected prop name
                                isHovered={isHovered}
                                onMouseEnter={() => !isPlayer && setHoveredTarget({ target: {name: sectionName}, type: 'section', lane: laneName })}
                                onMouseLeave={() => !isPlayer && setHoveredTarget(null)}
                            />
                        ) : <div className="min-h-[220px]"></div>}
                    </div>
                );
            })}
        </div>
      </div>
    );
  };

const DroneLanesDisplay = ({ player, isPlayer, placedSections, onLaneClick, selectedDrone, selectedCard, validCardTargets }) => {
      const isDeployable = (laneIndex) => {
          if (turnPhase !== 'deployment' || !isPlayer || !selectedDrone || !placedSections[laneIndex]) return false;
          if (turn === 1) return (player.initialDeploymentBudget + player.energy) >= selectedDrone.class;
          return player.energy >= selectedDrone.class;
      };

      const isMoveTarget = (lane) => {
          if (turnPhase !== 'action' || !selectedDrone) return false;
          const [sourceLaneName] = Object.entries(player1.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];
          if (!sourceLaneName) return false;
          
          const sourceLaneIndex = parseInt(sourceLaneName.replace('lane', ''), 10);
          const targetLaneIndex = parseInt(lane.replace('lane', ''), 10);
          return Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
      };

      return (
            <div className="flex justify-center w-full">
                <div className="flex flex-row gap-4 w-full">
                    {['lane1', 'lane2', 'lane3'].map((lane, index) => {
                        const owner = isPlayer ? 'player1' : 'player2';
                        const isCardTarget = !!selectedCard && 
                                             selectedCard.targeting.type === 'LANE' && 
                                             validCardTargets.some(t => t.id === lane && t.owner === owner);

                        return (
                            <div key={lane}
                                className={`lane-background flex-1 min-h-[140px] h-auto rounded-lg border-2 p-2 transition-all duration-200
                                 ${isPlayer ? 'bg-black/30 border-cyan-500/50' : 'bg-black/30 border-pink-500/50'}
                                 ${isDeployable(index) ? 'cursor-pointer hover:bg-cyan-900/50 hover:border-cyan-400' : ''}
                                 ${isPlayer && isMoveTarget(lane) ? 'cursor-pointer bg-yellow-900/50 border-yellow-400' : ''}
                                 ${isCardTarget ? 'cursor-pointer bg-purple-900/50 border-purple-400 ring-2 ring-purple-400 animate-pulse' : ''}
                               `}
                                onClick={(e) => onLaneClick(e, lane, isPlayer)} // MODIFIED LINE
                            >
                               {renderDronesOnBoard(player.dronesOnBoard[lane], isPlayer, lane)}
                                 <p className={`text-center text-sm mt-2 ${isPlayer ? 'text-cyan-300' : 'text-pink-300'}`}>
                                     {isPlayer ? `Lane ${index + 1}` : `Opponent Lane ${index + 1}`}
                                 </p>
                            </div>
                        );
                    })}
                </div>
            </div>
      );
  };
  
  // --- NEW: ActionCard COMPONENT ---
  const ActionCard = ({ card, onClick, isPlayable, isSelected, isMandatoryTarget }) => {
    const { name, cost, image, description } = card;
  
    return (
<div
  onClick={(e) => {
    e.stopPropagation();
    if (isPlayable || isMandatoryTarget) {
      onClick(card);
    }
  }}
  className={`
    w-48 h-64 rounded-lg p-1 relative group transition-all duration-200
          ${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed'}
          ${isSelected ? 'bg-purple-400' : 'bg-purple-800/80'}
          ${!isPlayable && !isMandatoryTarget ? 'opacity-50 grayscale' : ''}
          ${isMandatoryTarget ? 'cursor-pointer ring-2 ring-red-500 animate-pulse' : ''}
        `}
      >
        <div
          className={`
            w-full h-full bg-slate-900 flex flex-col font-orbitron text-purple-300 overflow-hidden rounded-md
            transition-all duration-200
            ${isPlayable && !isSelected ? 'group-hover:bg-slate-800' : ''}
          `}
        >
          {/* Header */}
          <div className="text-center py-1 px-2 bg-purple-900/50 flex justify-between items-center">
            <span className="font-bold text-sm uppercase tracking-wider truncate">{name}</span>
            <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
              <Bolt size={12} className="text-yellow-300" />
              <span className="text-white font-bold text-sm ml-1">{cost}</span>
            </div>
          </div>
  
          {/* Image */}
          <div className="p-1">
            <div className="relative h-24">
              <img src={image} alt={name} className="w-full h-full object-cover rounded" />
              <div className="absolute inset-0 border border-purple-400/50 rounded"></div>
            </div>
          </div>
  
          {/* Description */}
          <div className="flex-grow mx-2 my-1 bg-black/50 border border-purple-800/70 p-2 flex flex-col min-h-0">
            <div className="flex-grow relative font-exo font-normal text-purple-200">
              <p className="text-sm leading-tight text-center">{description}</p>
            </div>
          </div>
  
          {/* Type Footer */}
          <div className="text-center text-xs py-1 bg-purple-900/50 uppercase font-semibold tracking-widest">
            {card.type} Card
          </div>
        </div>
      </div>
    );
  };

  const DroneSelectionScreen = ({ onChooseDrone, currentPair, selectedDrones }) => {
    return (
      <div className="flex flex-col items-center w-full p-4">
        <h2 className="text-3xl font-bold mb-2 text-white text-center">
          Choose Your Drones
        </h2>
        <p className="text-center text-gray-400 mb-6">Choice {selectedDrones.length + 1} of 5: Select one drone to add to your Active Drone Pool.</p>
        
       {currentPair.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8 mb-8">
           {currentPair.map((drone, index) => (
             <DroneCard key={drone.name || index} drone={drone} onClick={() => onChooseDrone(drone)} isSelectable={true} deployedCount={0}/>
            ))}
          </div>
        )}

        <div className="w-full mt-8 pt-8 border-t border-gray-700">
          <h3 className="text-2xl font-bold text-white text-center mb-4">Your Selection ({selectedDrones.length}/5)</h3>
         {selectedDrones.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-6">
             {selectedDrones.map((drone, index) => (
               <DroneCard key={index} drone={drone} isSelectable={false} deployedCount={0}/>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No drones selected yet.</p>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-screen bg-gray-950 text-white font-sans overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-indigo-950 to-black relative" ref={gameAreaRef} onClick={() => { cancelAbilityMode(); cancelCardSelection(); }}>
      <style>
        {`
            @import url('https://fonts.googleapis.com/css2?family=Exo:wght@400;700&family=Orbitron:wght@400;700;900&display=swap');
           .font-orbitron { font-family: 'Orbitron', sans-serif; }
            .font-exo { font-family: 'Exo', sans-serif; }
            
            @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
           .animate-shake { animation: shake 0.5s ease-in-out; }
            .explosion { position: absolute; width: 100px; height: 100px; background-image: radial-gradient(circle, rgba(255,159,64,1) 0%, rgba(255,87,34,0.8) 40%, rgba(255,255,255,0) 70%); border-radius: 50%; transform: translate(-50%, -50%) scale(0); animation: explode 1s ease-out forwards; pointer-events: none; z-index: 50; }
            @keyframes explode { 0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
           .bg-grid-cyan { background-image: linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px); background-size: 20px 20px; }
            `}
        </style>
     <TargetingArrow visible={arrowState.visible} start={arrowState.start} end={arrowState.end} />
     {explosions.map(exp => <Explosion key={exp.id} top={exp.top} left={exp.left} />)}

      <header className="w-full flex justify-between items-center mb-2 flex-shrink-0 px-5 pt-8">
          {turnPhase !== 'preGame' && (
              <div className="flex flex-col items-start gap-2">
                  <h2 className="text-lg font-bold text-pink-300 flex items-center">
                  Opponent Resources
                  {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === 'player2' && <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
                  {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo.player2Passed && <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
                  </h2>
                  <div className="flex items-center gap-4">
                      <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${player2.energy > player2EffectiveStats.maxEnergy ? 'text-red-400' : ''}`}><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{player2.energy} / {player2EffectiveStats.maxEnergy}</span></div>
                      {turn === 1 && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{player2.initialDeploymentBudget}</span></div>}
                      <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${totalPlayer2Drones > player2EffectiveStats.cpuLimit ? 'text-red-400' : ''}`}><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{totalPlayer2Drones} / {player2EffectiveStats.cpuLimit}</span></div>
                  </div>
              </div>
          )}
          <div className="text-center">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-xl font-orbitron" style={{textShadow: '0 0 15px rgba(236, 72, 153, 0.5), 0 0 5px rgba(255, 255, 255, 0.5)'}}>Drone Wars</h1>
             {turnPhase !== 'preGame' && <h2 className="text-2xl font-bold text-gray-300 mt-2 tracking-widest font-exo">{getPhaseDisplayName(turnPhase)}</h2>}
          </div>
          {turnPhase !== 'preGame' && (
              <div className="flex flex-col items-end gap-2">
                  <h2 className="text-lg font-bold text-cyan-300 flex items-center">
                      Your Resources
                  {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === 'player1' && <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
                  {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo.player1Passed && <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
                  </h2>
                  <div className="flex items-center gap-6">
                      <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${player1.energy > player1EffectiveStats.maxEnergy ? 'text-red-400' : ''}`}><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{player1.energy} / {player1EffectiveStats.maxEnergy}</span></div>
                      {turn === 1 && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{player1.initialDeploymentBudget}</span></div>}
                      <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${totalPlayer1Drones > player1EffectiveStats.cpuLimit ? 'text-red-400' : ''}`}><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{totalPlayer1Drones} / {player1EffectiveStats.cpuLimit}</span></div>
                      {turnPhase === 'allocateShields' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><ShieldCheck className="text-cyan-300 mr-2" /> <span className="font-bold text-lg">{shieldsToAllocate}</span></div>}
                      <button onClick={handleReset} className="bg-pink-700 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-colors duration-200" aria-label="Reset Game"><RotateCcw /></button>
                      <button className="bg-slate-700 text-white p-3 rounded-full shadow-lg hover:bg-slate-600 transition-colors duration-200"><Settings /></button>
                  </div>
              </div>
          )}
         </header>
      
      <main className="flex-grow min-h-0 w-full flex flex-col items-center overflow-y-auto px-5 pb-4">
        {turnPhase === 'preGame' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <button onClick={handleStartGame} className="bg-pink-600 text-white text-2xl font-bold px-8 py-4 rounded-full shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-colors duration-200 transform hover:scale-105 font-orbitron">Start Game</button>
            </div>
        ) : (
            <>
                {turnPhase === 'placement' ? (
                    <div className="flex flex-col items-center w-full">
                        <h2 className="text-3xl font-bold mb-4 text-white text-center">Preview & Place Your Section</h2>
                        <div className="mb-8 w-64">
                         <ShipSection section={sectionsToPlace[placedSections.filter(s => s !== undefined).length] || 'bridge'} stats={player1.shipSections[sectionsToPlace[placedSections.filter(s => s !== undefined).length] || 'bridge']} isPlayer={true} isOpponent={false} />
                        </div>
                        <h3 className="text-2xl font-bold mb-4 text-white">Choose a lane to place your section:</h3>
                        <div className="flex flex-row gap-8 w-full">
                            {[0, 1, 2].map((laneIndex) => (
                                <div key={laneIndex} className="flex-1" onClick={() => handlePlaceSection(laneIndex)}>
                                    {placedSections[laneIndex] ? <ShipSection section={placedSections[laneIndex]} stats={player1.shipSections[placedSections[laneIndex]]} isPlayer={true} isOpponent={false} /> : <ShipSection isPlaceholder={true} onClick={() => { handlePlaceSection(laneIndex); setModalContent(null); }}/>}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : turnPhase === 'droneSelection' ? (
                  <DroneSelectionScreen 
                    onChooseDrone={handleChooseDroneForSelection}
                    currentPair={droneSelectionPair}
                    selectedDrones={tempSelectedDrones}
                    />
                ) : (
                  <div className="flex flex-col items-center w-full space-y-2">
                      <ShipSectionsDisplay player={player2} isPlayer={false} placedSections={opponentPlacedSections} onTargetClick={handleTargetClick} isInteractive={false} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <DroneLanesDisplay player={player2} isPlayer={false} placedSections={opponentPlacedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} />
                      <DroneLanesDisplay player={player1} isPlayer={true} placedSections={placedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} />
                      <ShipSectionsDisplay player={player1} isPlayer={true} placedSections={placedSections} onSectionClick={handleAllocateShield} onTargetClick={handleTargetClick} isInteractive={turnPhase === 'allocateShields'} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                  </div>
                )}
            </>
        )}
      </main>

      {turnPhase !== 'preGame' && turnPhase !== 'placement' && turnPhase !== 'droneSelection' && (
        <footer className="w-full flex flex-col items-center flex-shrink-0">
          <div className="flex justify-center">
             <button onClick={() => handleFooterButtonClick('hand')} 
                  className={`px-8 py-2 rounded-t-lg font-bold transition-colors ${ isFooterOpen && footerView === 'hand' ? 'bg-slate-800 text-cyan-300' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
             >
                  Hand ({player1.hand.length}/{player1EffectiveStats.handLimit})
             </button>
             <button onClick={() => handleFooterButtonClick('drones')} 
                  className={`px-8 py-2 rounded-t-lg font-bold transition-colors ${ isFooterOpen && footerView === 'drones' ? 'bg-slate-800 text-cyan-300' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
             >
                  Active Drones
             </button>
          </div>

          <div className={`relative w-full bg-slate-800/80 backdrop-blur-sm transition-all duration-500 ease-in-out overflow-hidden ${isFooterOpen ? 'max-h-[500px] opacity-100 p-4' : 'max-h-0 opacity-0'}`}>
              {(turnPhase === 'deployment' || turnPhase === 'action') && currentPlayer === 'player1' && !mandatoryAction && (
                  <button
                      onClick={handlePlayerPass}
                      disabled={passInfo.player1Passed}
                      className={`absolute top-4 right-4 z-10 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 ${
                          passInfo.player1Passed ? 'bg-gray-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
                      }`}
                  >
                      Pass
                  </button>
              )}
           {footerView === 'hand' ? (
              <div className="flex flex-row justify-between w-full">
               <div className="flex flex-col items-center w-32 min-w-32">
                 <div className="w-24 h-32 bg-gray-900/80 rounded-lg border-2 border-gray-700 flex items-center justify-center shadow-md"><p className="font-bold text-sm text-gray-400">{player1.discardPile.length}</p></div>
                  <p className="mt-2 text-xs text-gray-400 font-semibold">Discard Pile</p>
               </div>
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-4 mb-4">
                   <h3 className={`text-lg font-semibold ${player1.hand.length > player1EffectiveStats.handLimit ? 'text-red-400' : 'text-white'}`}>Your Hand ({player1.hand.length}/{player1EffectiveStats.handLimit})</h3>
                 </div>
                 <div className="flex flex-wrap justify-center gap-4">{player1.hand.map((card) => 
                   <ActionCard 
                     key={card.instanceId} 
                     card={card} 
                      isPlayable={
                          (turnPhase === 'action' && 
                          currentPlayer === 'player1' && 
                          !passInfo.player1Passed && 
                          player1.energy >= card.cost &&
                          (!card.targeting || getValidTargets(player1, card).length > 0)) ||
                          (turnPhase === 'optionalDiscard' && optionalDiscardCount < player1EffectiveStats.discardLimit)
                      }
                      onClick={
                          mandatoryAction?.type === 'discard' 
                          ? (c) => setConfirmationModal({type: 'discard', target: c, onConfirm: () => handleConfirmMandatoryDiscard(c), onCancel: () => setConfirmationModal(null), text: `Are you sure you want to discard ${c.name}?`})
                          : turnPhase === 'optionalDiscard'
                          ? handleOptionalDiscardClick
                          : handleCardClick
                      }
                   />)}
                 </div>
               </div>
               <div className="flex flex-col items-center w-32 min-w-32">
                 <div className="w-24 h-32 bg-indigo-900/50 rounded-lg border-2 border-purple-500 flex items-center justify-center shadow-md cursor-pointer hover:bg-indigo-800/50 transition-colors duration-200"><p className="font-bold text-sm text-white">{player1.deck.length}</p></div>
                  <p className="mt-2 text-xs text-gray-400 font-semibold">Deck</p>
                 {turnPhase === 'initialDraw' && !mandatoryAction && <button onClick={handleDrawToHand} className={`mt-4 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20`}>Draw to Hand</button>}
               {turnPhase === 'optionalDiscard' && (
                   <div className="flex flex-col items-center">
                     <p className="text-sm text-gray-400 mb-2">Discarded: {optionalDiscardCount} / {player1EffectiveStats.discardLimit}</p>
                     <button onClick={handleFinishOptionalDiscard} className={`mt-4 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20`}>
                       Finish Discarding
                     </button>
                   </div>
                 )}
               </div>
              </div>
            ) : ( 
              <div className="flex flex-col items-center mb-4 w-full">
               <div className="flex flex-wrap justify-center gap-4">
                   {sortedPlayer1ActivePool.map((drone, index) => {
                       const totalResource = turn === 1 ? player1.initialDeploymentBudget + player1.energy : player1.energy;
                       const canAfford = totalResource >= drone.class;
                       return <DroneCard key={index} drone={drone} onClick={handleToggleDroneSelection} isSelected={selectedDrone && selectedDrone.name === drone.name} isSelectable={turnPhase === 'deployment' && currentPlayer === 'player1' && !passInfo.player1Passed && canAfford && !mandatoryAction} deployedCount={player1.deployedDroneCounts[drone.name] || 0} />;
                     })}
               </div>
              </div>
            )}
            {turnPhase === 'allocateShields' && 
                <div className="flex justify-center items-center gap-4 mt-8">
                    <button onClick={handleResetShieldAllocation} className={`text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-500/30`}>Reset Allocation</button>
                    <button onClick={handleEndAllocation} disabled={shieldsToAllocate > 0 && canAllocateMoreShields} className={`text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 ${shieldsToAllocate > 0 && canAllocateMoreShields ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30'}`}>End Allocation</button>
                </div>
            }
          </div>
        </footer>
      )}

      {/* Modals are unaffected and remain at the end */}
      {modalContent && <GamePhaseModal title={modalContent.title} text={modalContent.text} onClose={() => setModalContent(null)} />}
     {showFirstPlayerModal && (
       <GamePhaseModal title="First Player Determined" text={`${currentPlayer === 'player1' ? player1.name : player2.name} will go first this round. ${getFirstPlayerReasonText()}`} onClose={startDeploymentComplianceCheck}>
         <div className="flex justify-center mt-6"><button onClick={startDeploymentComplianceCheck} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">Continue</button></div>
       </GamePhaseModal>
        )}
        {showActionPhaseStartModal && (
            <GamePhaseModal title="Action Phase" text="Deployment has ended. Prepare for action!" onClose={handleStartActionPhase}>
              <div className="flex justify-center mt-6"><button onClick={handleStartActionPhase} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">Continue</button></div>
            </GamePhaseModal>
            )}
                    {showRoundEndModal && (
                    <GamePhaseModal
                        title="Round Over"
                        text="Both players have passed. The action phase has ended."
                        onClose={handleStartNewRound}
                        >
                      <div className="flex justify-center mt-6">
                          <button onClick={handleStartNewRound} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
                              Begin Next Round
                          </button>
                      </div>
                    </GamePhaseModal>
                    )}
                   {deploymentConfirmation && (
                           <GamePhaseModal title="Confirm Deployment" text={`This deployment will use ${deploymentConfirmation.budgetCost} Initial Deployment points and cost ${deploymentConfirmation.energyCost} Energy. Proceed?`} onClose={() => setDeploymentConfirmation(null)}>
                               <div className="flex justify-center gap-4 mt-6">
                                   <button onClick={() => setDeploymentConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
                                   <button onClick={handleConfirmDeployment} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
                               </div>
                           </GamePhaseModal>
                       )}
        {moveConfirmation && (
            <GamePhaseModal title="Confirm Move" text={`Move ${moveConfirmation.drone.name} from ${moveConfirmation.from} to ${moveConfirmation.to}? The drone will be exhausted.`} onClose={() => setMoveConfirmation(null)}>
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={() => setMoveConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
                    <button onClick={executeMove} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
                </div>
            </GamePhaseModal>
           )}
                    {interceptionModal && (
                    <GamePhaseModal 
                    title="Attack Intercepted!" 
                    text={`The AI used its ${interceptionModal.interceptor.name} to protect ${interceptionModal.originalTarget.name}!`}
                    onClose={interceptionModal.onClose}
                      >
      <div className="flex justify-center mt-6">
      <button onClick={interceptionModal.onClose} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">Continue</button>
      </div>
                    </GamePhaseModal>
                    )}
 {playerInterceptionChoice && (
  <PlayerInterceptionModal
   choiceData={playerInterceptionChoice}
   onIntercept={(interceptor) => {
      resolveAttack({ ...playerInterceptionChoice.attackDetails, interceptor });
     setPlayerInterceptionChoice(null);
      }}
    onDecline={() => {
       resolveAttack(playerInterceptionChoice.attackDetails);
      setPlayerInterceptionChoice(null);
       }}
    />
 )}
      {detailedDrone && <DetailedDroneModal drone={detailedDrone} onClose={() => setDetailedDrone(null)} />}
      {aiActionReport && <AIActionReportModal report={aiActionReport} onClose={handleCloseAiReport} />}
 {winner && (
        <GamePhaseModal
            title={`${winner} is Victorious!`}
            text={winner === 'Player 1' ? "You have crippled the enemy command ship." : "Your command ship has been crippled."}
            onClose={handleReset}
            >
      <div className="flex justify-center mt-6">
      <button onClick={handleReset} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
       Play Again
      </button>
      </div>
        </GamePhaseModal>
       )}
 {mandatoryAction && showMandatoryActionModal && (
    <GamePhaseModal
       title={mandatoryAction.type === 'discard' ? "Hand Limit Exceeded" : "CPU Limit Exceeded"}
       text={mandatoryAction.type === 'discard' 
          ? `Your hand limit is now ${player1EffectiveStats.handLimit}. Please select ${mandatoryAction.count} card(s) to discard.`
          : `Your drone limit is now ${player1EffectiveStats.cpuLimit}. Please select ${mandatoryAction.count} drone(s) to destroy.`
       }
       onClose={() => setShowMandatoryActionModal(false)}
    />
 )}
 {confirmationModal && (
    <GamePhaseModal
       title={`Confirm ${confirmationModal.type === 'discard' ? 'Discard' : 'Destruction'}`}
       text={confirmationModal.text}
       onClose={confirmationModal.onCancel}
    >
        <div className="flex justify-center gap-4 mt-6">
            <button onClick={confirmationModal.onCancel} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={confirmationModal.onConfirm} className="bg-red-600 text-white font-bold py-2 px-6 rounded-full hover:bg-red-700 transition-colors">Confirm</button>
        </div>
   </GamePhaseModal>
 )}
{/* --- NEW --- Card Confirmation Modal */}
  {cardConfirmation && (() => {
    let targetDisplayName = '';
    if (cardConfirmation.target) {
      // Drones have a .name property
      if (cardConfirmation.target.name) {
        targetDisplayName = cardConfirmation.target.name;
      // Lanes have an id like 'lane1', 'lane2', etc.
      } else if (cardConfirmation.target.id.startsWith('lane')) {
        targetDisplayName = `Lane ${cardConfirmation.target.id.slice(-1)}`;
      // Ship sections have an id like 'droneControlHub'
      } else {
        targetDisplayName = cardConfirmation.target.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      }
    }

    return (
      <GamePhaseModal
        title={`Confirm Action: ${cardConfirmation.card.name}`}
        text={`Use ${cardConfirmation.card.name}${targetDisplayName ? ` on ${targetDisplayName}` : ''}? This will cost ${cardConfirmation.card.cost} energy.`}
        onClose={() => setCardConfirmation(null)}
      >
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={() => setCardConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
          <button onClick={() => resolveCardPlay(cardConfirmation.card, cardConfirmation.target)} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
        </div>
      </GamePhaseModal>
    );
  })()}

    </div>
  );
};
export default App;