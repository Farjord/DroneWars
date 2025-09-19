import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Shield, Bolt, Wrench, Sprout, Hand, ShipWheel, Settings, X, ChevronRight, ChevronLeft, Plus, RotateCcw, ShieldCheck, Sword, Search, Gavel, Bomb, Rocket, Skull, Bug, Cpu, Target, View, Zap, Heart, ChevronUp, ChevronDown } from 'lucide-react';

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
  Shield, Bolt, Wrench, Sprout, Hand, ShipWheel, Settings, X, ChevronRight, ChevronLeft, Plus, RotateCcw, ShieldCheck, Sword, Search, Gavel, Bomb, Rocket, Skull, Bug, Target
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
    class: 3, limit: 3, attack: 3, hull: 2, shields: 1, speed: 5, 
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
    class: 3, limit: 2, attack: 1, hull: 4, shields: 4, speed: 2, 
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
    class: 4, limit: 1, attack: 3, hull: 2, shields: 1, speed: 2, 
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

// --- HELPER FUNCTIONS ---
const getRandomDrones = (collection, count) => {
  const shuffled = [...collection].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const createStartingDeck = () => {
  const deck = [];
  for (let i = 0; i < 40; i++) {
    deck.push({ type: 'Action', name: `Action Card ${i + 1}`, cost: Math.floor(Math.random() * 5) + 1 });
  }
  return deck;
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


// --- INITIAL STATE ---
const initialPlayerState = (name) => {
  const shipSections = {
    bridge: { hull: 10, shields: 3, allocatedShields: 3, description: 'The command center of your ship.', stats: { 'Draw': 5, 'Discard': 2 } },
    powerCell: { hull: 10, shields: 3, allocatedShields: 3, description: 'Generates energy to power your abilities.', stats: { 'Energy Per Turn': 10, 'Shields Per Turn': 4 } },
    droneControlHub: { hull: 10, shields: 3, allocatedShields: 3, description: 'Controls your drone fleet.', stats: { 'Initial Deployment': 6, 'CPU Control Value': 10 } }
  };

  return {
    name: name,
    shipSections: shipSections,
    energy: shipSections.powerCell.stats['Energy Per Turn'],
    initialDeploymentBudget: shipSections.droneControlHub.stats['Initial Deployment'],
    hand: [],
    deck: createStartingDeck(),
    discardPile: [],
    activeDronePool: [],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    deployedDroneCounts: {},
  };
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
  const [playerPassState, setPlayerPassState] = useState({ player1: false, player2: false });
  const [aiActionCount, setAiActionCount] = useState(0);
  const [footerView, setFooterView] = useState('drones');
  const sectionsToPlace = ['bridge', 'powerCell', 'droneControlHub'];
  const [showFirstPlayerModal, setShowFirstPlayerModal] = useState(false);
  const [pendingAttack, setPendingAttack] = useState(null);
  const [interceptionModal, setInterceptionModal] = useState(null);
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

  // --- NEW ABILITY STATE ---
  const [abilityMode, setAbilityMode] = useState(null); // { drone, ability }
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);


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
    
    if (playerPassState.player1 && playerPassState.player2) {
        if (turnPhase === 'deployment') endDeploymentPhase();
        if (turnPhase === 'action') endActionPhase();
        return;
    }

    const nextPlayerHasPassed = (nextPlayer === 'player1' && playerPassState.player1) || (nextPlayer === 'player2' && playerPassState.player2);
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
  }, [playerPassState, turnPhase, endActionPhase]);
  
  const getLaneOfDrone = useCallback((droneId, playerState) => {
      for (const [lane, drones] of Object.entries(playerState.dronesOnBoard)) {
          if (drones.some(d => d.id === droneId)) {
              return lane;
          }
      }
      return null;
  }, []);
  
  const getValidTargets = useCallback((userDrone, ability) => {
    const targets = [];
    const userLane = getLaneOfDrone(userDrone.id, player1);
    if (!userLane) return [];

    const { type, affinity, location, custom } = ability.targeting;
    const targetPlayerState = affinity === 'FRIENDLY' ? player1 : player2;
    const targetPlacedSections = affinity === 'FRIENDLY' ? placedSections : opponentPlacedSections;

    if (type === 'DRONE') {
        Object.entries(targetPlayerState.dronesOnBoard).forEach(([lane, drones]) => {
            let isValidLocation = false;
            if (location === 'SAME_LANE') isValidLocation = lane === userLane;
            if (location === 'ANY_LANE') isValidLocation = true;
            // Add 'ADJACENT_LANES' logic here if needed
            
            if (isValidLocation) {
                drones.forEach(targetDrone => {
                    let meetsCustomCriteria = true;
                    if (custom?.includes('DAMAGED_HULL')) {
                        const baseDrone = fullDroneCollection.find(d => d.name === targetDrone.name);
                        if (!baseDrone || targetDrone.hull >= baseDrone.hull) {
                            meetsCustomCriteria = false;
                        }
                    }
                    if (meetsCustomCriteria) {
                        targets.push({ ...targetDrone, lane });
                    }
                });
            }
        });
    } else if (type === 'SHIP_SECTION') {
        // Implement ship section targeting if needed
    }
    return targets;
  }, [player1, player2, placedSections, opponentPlacedSections, getLaneOfDrone]);


  useEffect(() => {
    if (abilityMode) {
      const targets = getValidTargets(abilityMode.drone, abilityMode.ability);
      setValidAbilityTargets(targets.map(t => t.id));
    } else {
      setValidAbilityTargets([]);
    }
  }, [abilityMode, getValidTargets]);


  const cancelAbilityMode = () => {
    if (abilityMode) {
      setAbilityMode(null);
      setSelectedDrone(null);
    }
  };
  
  const resolveAttack = useCallback((attackDetails, isAbility = false) => {
    const { attacker, target, targetType, interceptor, attackingPlayer, abilityDamage } = attackDetails;
    const finalTarget = interceptor || target;
    const finalTargetType = interceptor ? 'drone' : targetType;
    let damage = abilityDamage ?? attacker.attack;

    const triggerHitAnimation = (targetId) => {
        setRecentlyHitDrones(prev => [...prev, targetId]);
        setTimeout(() => {
            setRecentlyHitDrones(prev => prev.filter(id => id !== targetId));
        }, 500);
    };

    const triggerExplosion = (targetId) => {
        const pos = getElementCenter(droneRefs.current[targetId]);
        if (pos) {
            const explosionId = Date.now();
            setExplosions(prev => [...prev, { id: explosionId, top: pos.y, left: pos.x }]);
            setTimeout(() => {
                setExplosions(prev => prev.filter(ex => ex.id !== explosionId));
            }, 1000);
        }
    };

    const defenderUpdater = attackingPlayer === 'player1' ? setPlayer2 : setPlayer1;

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

           newShipSections[finalTarget.name] = { ...originalTarget, allocatedShields: newShields, hull: newHull };
            newPlayerState.shipSections = newShipSections;
        }
        return newPlayerState;
    });

    if (!isAbility) {
        const attackerUpdater = attackingPlayer === 'player1' ? setPlayer1 : setPlayer2;

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

    if (attackingPlayer === 'player1') {
        endTurn('player1');
    }
}, [endTurn, calculateEffectiveStats, updateAuras]);
  
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
    }

    cancelAbilityMode();
    if (effect.type !== 'DAMAGE') { 
        endTurn('player1');
    }
  }, [endTurn, player2, getLaneOfDrone, resolveAttack]); 

  //--- END ABILITY LOGIC ---

  useEffect(() => {
    if (winner) return;
    const checkPlayerLoss = (player) => {
      const destroyedSections = Object.values(player.shipSections).filter(section => section.hull <= 0).length;
      return destroyedSections >= 2;
    };
    if (checkPlayerLoss(player1)) {
     setWinner('Player 2');
    } else if (checkPlayerLoss(player2)) {
     setWinner('Player 1');
    }
  }, [player1.shipSections, player2.shipSections, winner]);

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
        if (playerPassState.player2) {
            endTurn('player2');
            return prevPlayer2;
        }

        const totalDronesOnBoard = Object.values(prevPlayer2.dronesOnBoard).flat().length;
        
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
                   totalDronesOnBoard < prevPlayer2.shipSections.droneControlHub.stats['CPU Control Value'];
        }).sort((a, b) => a.class - b.class);

        const availableLanes = ['lane1', 'lane2', 'lane3'].filter(lane => prevPlayer2.dronesOnBoard[lane].length < 3);
        const canDeploy = deployableDrones.length > 0 && availableLanes.length > 0;
        
        const willPass = !canDeploy; 

        if (willPass) {
            setPlayerPassState(prev => ({ ...prev, player2: true }));
             if (playerPassState.player1) {
                  endDeploymentPhase();
             } else {
                  endTurn('player2');
             }
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
  }, [playerPassState, turn, endTurn, updateAuras]);

  const handleStartNewRound = () => {
    setShowRoundEndModal(false);
    setTurn(prev => prev + 1);
    setPlayerPassState({ player1: false, player2: false });

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
      energy: prev.shipSections.powerCell.stats['Energy Per Turn'],
     initialDeploymentBudget: 0
    }));

    setPlayer2(prev => readyDronesAndRestoreShields({
      ...prev,
      energy: prev.shipSections.powerCell.stats['Energy Per Turn'],
     initialDeploymentBudget: 0
    }));

   setAiActionCount(0);
   setTurnPhase('initialDraw');
   setModalContent({
        title: `Round ${turn + 1} Begins`,
        text: 'Draw cards to begin the new round.'
   });
  };


  const handleOpponentAction = useCallback(() => {
    if (playerPassState.player2) {
     endTurn('player2');
      return;
    }
    // AI does not use abilities yet, only attacks
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
        setPlayerPassState(prev => ({ ...prev, player2: true }));
        setPlayerPassState(newPassState => {
            if (newPassState.player1) {
                endActionPhase();
            } else {
                endTurn('player2');
            }
            return newPassState;
        });
    }
  }, [player1, player2, playerPassState, placedSections, endActionPhase, endTurn]);

  useEffect(() => {
    const isAiTurn = currentPlayer === 'player2' && !winner && !aiActionReport && !pendingAttack && !playerInterceptionChoice;
    if (!isAiTurn) return;

    if (turnPhase === 'deployment' && !playerPassState.player2) {
     setTimeout(handleOpponentTurn, 1500);
    } else if (turnPhase === 'action' && !playerPassState.player2) {
     setTimeout(handleOpponentAction, 1500);
    }
  }, [currentPlayer, turnPhase, playerPassState, winner, handleOpponentTurn, handleOpponentAction, aiActionReport, pendingAttack, playerInterceptionChoice]);


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
   setPlayerPassState({ player1: false, player2: false });
   setAiActionCount(0);
   setModalContent(null);
   setAiActionReport(null);
    setWinner(null);
    setAbilityMode(null);
    setValidAbilityTargets([]);
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
   setPlayerPassState({ player1: false, player2: false });
    const firstActor = firstPlayerOfRound;
   setCurrentPlayer(firstActor);
   setAiActionCount(0);
   setTurnPhase('action');
    
    if (firstActor === 'player1') {
      setModalContent({
          title: "Action Phase Begins",
          text: "It's your turn to act. Select a drone to move or attack, or use an ability."
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
      const newDeck = [...prev.deck];
      const newHand = [...prev.hand];
      const handSize = prev.shipSections.bridge.stats['Draw'];
      while (newHand.length < handSize && newDeck.length > 0) {
        const drawnCard = newDeck.pop();
       newHand.push(drawnCard);
      }
      return { ...prev, deck: newDeck, hand: newHand };
    });

    if (turn > 1) {
      const shieldsPerTurn = player1.shipSections.powerCell.stats['Shields Per Turn'];
      setShieldsToAllocate(shieldsPerTurn);
      setTurnPhase('allocateShields');
      setModalContent({
          title: 'Phase: Restore Shields',
          text: `You have ${player1.shipSections.powerCell.stats['Shields Per Turn']} shields to restore. Click on any of your damaged ship sections to add a shield. When finished, click "End Allocation" to continue.`
      });
    } else {
      const firstPlayer = Math.random() < 0.5 ? 'player1' : 'player2';
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
   setModalContent(null);
    setPlayer1(prev => {
        const currentSection = prev.shipSections[sectionName];
        if (shieldsToAllocate > 0) {
          if (currentSection.allocatedShields < currentSection.shields) {
           setShieldsToAllocate(prevCount => prevCount - 1);
            return {
              ...prev,
             shipSections: {
               ...prev.shipSections,
               [sectionName]: { ...currentSection, allocatedShields: currentSection.allocatedShields + 1 }
              }
            };
          }
        } else if (currentSection.allocatedShields > 0) {
         setShieldsToAllocate(prevCount => prevCount + 1);
          return {
            ...prev,
           shipSections: {
             ...prev.shipSections,
             [sectionName]: { ...currentSection, allocatedShields: currentSection.allocatedShields - 1 }
            }
          };
        }
        return prev;
    });
   };

  const handleEndAllocation = () => {
    const shieldsToAllocateAI = player2.shipSections.powerCell.stats['Shields Per Turn'];
    let remainingAIShields = shieldsToAllocateAI;
    const aiSections = Object.keys(player2.shipSections);
    setPlayer2(prev => {
      const newSections = { ...prev.shipSections };
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
    const firstPlayer = Math.random() < 0.5 ? 'player1' : 'player2';
   setCurrentPlayer(firstPlayer);
   setFirstPlayerOfRound(firstPlayer);
   setShowFirstPlayerModal(true);
  };

  const handleStartDeploymentPhase = () => {
   setShowFirstPlayerModal(false);
   setPlayerPassState({ player1: false, player2: false });
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
    if (playerPassState.player1) return;
    if (selectedDrone && selectedDrone.name === drone.name) {
     setSelectedDrone(null);
    } else {
     setSelectedDrone(drone);
     setAbilityMode(null); // Cancel ability mode if selecting a new drone
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
    if (!selectedDrone || currentPlayer !== 'player1' || playerPassState.player1) return;

    const totalDronesOnBoard = Object.values(player1.dronesOnBoard).flat().length;
    if (totalDronesOnBoard >= player1.shipSections.droneControlHub.stats['CPU Control Value']) {
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
    if (playerPassState.player1) return;
    setPlayerPassState(prev => {
        const newPassState = { ...prev, player1: true };
        if (newPassState.player2) {
            if (turnPhase === 'deployment') endDeploymentPhase();
            if (turnPhase === 'action') endActionPhase();
        } else {
            endTurn('player1');
        }
        return newPassState;
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
        if (targetType === 'section' || potentialInterceptors[0].class < target.class) {
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
  }, [pendingAttack, resolveAttack, player1.dronesOnBoard, player2.dronesOnBoard, calculateEffectiveStats]);

  const handleTargetClick = (target, targetType, isPlayer) => {
    // If we're in ability mode, and we clicked a valid target
    if (abilityMode && validAbilityTargets.includes(target.id)) {
        if (isPlayer) {
            resolveAbility(abilityMode.ability, abilityMode.drone, target);
        } else {
            resolveAbility(abilityMode.ability, abilityMode.drone, target);
        }
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
    if (turnPhase !== 'action' || currentPlayer !== 'player1' || playerPassState.player1) return;

    // Cost validation
    const cost = ability.cost || {};
    if (drone.isExhausted && cost.exhausts !== false) { // Default exhaust is true
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
    }
  };

  const handleTokenClick = (e, token, isPlayer) => {
      if (isPlayer) {
          e.stopPropagation();
      }

      if (abilityMode && validAbilityTargets.includes(token.id)) {
        handleTargetClick(token, 'drone', isPlayer);
        return;
      }
  
      if (turnPhase !== 'action' && !isPlayer) {
          setDetailedDrone(token);
          return;
      }
  
      if (isPlayer) {
          if (currentPlayer === 'player1' && !playerPassState.player1) {
              if (token.isExhausted) return;
              if (selectedDrone && selectedDrone.id === token.id) {
                  setSelectedDrone(null);
                  cancelAbilityMode();
              } else {
                  setSelectedDrone(token);
                  cancelAbilityMode();
              }
          } else {
              setDetailedDrone(token);
          }
      } else {
         handleTargetClick(token, 'drone', false);
      }
  };


  const handleLaneClick = (lane, isPlayer) => {
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

  const getPhaseDisplayName = (phase) => {
    const names = {
      preGame: "Pre-Game Setup",
      placement: "Placement Phase",
      droneSelection: "Drone Selection",
      initialDraw: "Draw Phase",
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

  const DroneToken = ({ drone, onClick, isPlayer, isSelected, isHit, isPotentialInterceptor, onMouseEnter, onMouseLeave, effectiveStats, onAbilityClick, isAbilityTarget }) => {
    const borderColor = isPlayer ? 'border-cyan-400' : 'border-pink-500';
    const exhaustEffect = drone.isExhausted ? 'grayscale opacity-60' : '';
    const selectedEffect = isSelected ? 'ring-4 ring-cyan-400 scale-110' : '';
    const hitEffect = isHit ? 'animate-shake' : '';
    const interceptorEffect = isPotentialInterceptor ? 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50' : '';
    const abilityTargetEffect = isAbilityTarget ? 'ring-4 ring-purple-400 shadow-lg shadow-purple-400/50 animate-pulse' : '';
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
        className={`relative w-24 bg-gray-900/80 rounded-lg flex flex-col p-2 shadow-lg border-2 ${borderColor} cursor-pointer transition-transform duration-200 hover:scale-110 ${exhaustEffect} ${selectedEffect} ${hitEffect} ${interceptorEffect} ${abilityTargetEffect} shadow-black`}
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
                isAbilityTarget={validAbilityTargets.includes(drone.id)}
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
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
       </button>
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
            // A bit of a hack to differentiate, but works for this case
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
          w-40 h-[240px] rounded-lg p-[2px] relative group
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
          
          {/* Header */}
          <div className="text-center py-1 px-3 bg-cyan-900/50 flex-shrink-0 h-8 flex items-center justify-center">
              <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap" />
          </div>

          {/* Image */}
          <div className="p-1 flex-shrink-0 h-20">
              <div className="relative h-full" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
                  <img src={image} alt={name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-cyan-400/50"></div>
              </div>
          </div>

          {/* Stats */}
           <div className="flex flex-col gap-1 px-2 flex-shrink-0 h-[50px]">
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

          {/* Abilities Box */}
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

          {/* Footer */}
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


  const ShipSection = ({ section, stats, isPlayer, isPlaceholder, onClick, isInteractive, isOpponent, isHovered, onMouseEnter, onMouseLeave }) => {
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
    const isDamaged = stats.hull < 10;
    const bgColor = isDamaged ? 'bg-red-900/40' : (isOpponent ? 'bg-black/30' : 'bg-black/30');
    const borderColor = isDamaged ? 'border-red-600' : (isOpponent ? 'border-pink-500' : 'border-cyan-500');
    const shadowColor = isOpponent ? 'shadow-pink-500/20' : 'shadow-cyan-500/20';
    const hoverEffect = isHovered ? 'scale-105 shadow-xl' : 'hover:scale-105';
    const sectionName = section === 'droneControlHub' ? 'Drone Control Hub' : section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    return (
      <div
        className={`
          ${bgColor}
          ${borderColor}
           relative flex flex-col items-center justify-between p-4 rounded-xl shadow-lg ${shadowColor} border-2 h-full
          transition-all duration-300
         ${isInteractive ? `cursor-pointer ${hoverEffect}` : ''}
        `}
       onClick={onClick}
       onMouseEnter={onMouseEnter}
       onMouseLeave={onMouseLeave}
      >
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isDamaged ? <span className="text-red-400 font-semibold text-xs">Damaged</span> : <span className="text-green-400 font-semibold text-xs">Undamaged</span>}
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-bold text-lg text-white">{sectionName}</p>
          <p className="text-xs text-gray-400 italic max-w-[200px]">{stats.description}</p>
        </div>
        {stats.stats && (
          <div className="flex flex-col items-start w-full mt-2 text-sm text-gray-300">
           {Object.entries(stats.stats).map(([key, value]) => (
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
                  {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={`h-3 w-3 rounded-sm ${i < stats.hull ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  ))}
              </div>
        </div>
      </div>
    );
  };

  const ShipSectionsDisplay = ({ player, isPlayer, placedSections, onSectionClick, isInteractive, firstPlayerOfRound, turnPhase, playerPassState, onTargetClick }) => {
    const isDesignatedFirstPlayer = (player.name === 'Player 1' && firstPlayerOfRound === 'player1') || (player.name === 'Player 2' && firstPlayerOfRound === 'player2');
    const showFirstPlayerIndicator = turnPhase === 'deployment' || turnPhase === 'action' || turnPhase === 'combatPending';
    const hasPassed = (player.name === 'Player 1' && playerPassState.player1) || (player.name === 'Player 2' && playerPassState.player2);
    
    return (
        <div className="flex flex-col items-center w-full">
            <h2 className="text-xl font-bold mb-2 text-white">
                {player.name}'s Ship
                {showFirstPlayerIndicator && isDesignatedFirstPlayer && <span className="text-base text-yellow-300 ml-2">(First Player)</span>}
                {(turnPhase === 'deployment' || turnPhase === 'action') && hasPassed && <span className="text-base text-red-400 ml-2">(Passed)</span>}
           </h2>
        {/* CHANGE: Switched from grid to flex and removed max-width */}
            <div className="flex flex-row gap-4 w-full">
                {Array.from({ length: 3 }).map((_, index) => {
                    const sectionName = placedSections[index];
                    const laneName = `lane${index + 1}`;
                    const isHovered = hoveredTarget && hoveredTarget.type === 'section' && hoveredTarget.target.name === sectionName;
                    
                    return (
                  // CHANGE: Added flex-1 to make each section grow to fill space
                        <div key={index} className="flex-1">
                            {sectionName ? (
                                <ShipSection
                                    section={sectionName}
                                    stats={player.shipSections[sectionName]}
                                    isPlayer={isPlayer}
                                    isInteractive={isInteractive}
                                     onClick={
                                          isPlayer
                                            ? isInteractive ? () => onSectionClick(sectionName) : undefined
                                            : () => onTargetClick({name: sectionName, ...player.shipSections[sectionName]}, 'section')
                                     }
                                    isOpponent={!isPlayer}
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

  const DroneLanesDisplay = ({ player, isPlayer, placedSections, onLaneClick, selectedDrone }) => {
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
        // CHANGE: Removed max-width from this container
            <div className="flex justify-center w-full">
          {/* CHANGE: Switched from grid to flex */}
                <div className="flex flex-row gap-4 w-full">
                    {['lane1', 'lane2', 'lane3'].map((lane, index) => (
                  // CHANGE: Added flex-1 to make each lane grow to fill space
                        <div key={lane}
                             className={`flex-1 min-h-[140px] h-auto rounded-lg border-2 p-2 transition-all duration-200
                              ${isPlayer ? 'bg-black/30 border-cyan-500/50' : 'bg-black/30 border-pink-500/50'}
                              ${isDeployable(index) ? 'cursor-pointer hover:bg-cyan-900/50 hover:border-cyan-400' : ''}
                               ${isPlayer && isMoveTarget(lane) ? 'cursor-pointer bg-yellow-900/50 border-yellow-400' : ''}
                             `}
                             onClick={() => onLaneClick(lane, isPlayer)}
                        >
                           {renderDronesOnBoard(player.dronesOnBoard[lane], isPlayer, lane)}
                            <p className={`text-center text-sm mt-2 ${isPlayer ? 'text-cyan-300' : 'text-pink-300'}`}>
                                {isPlayer ? `Lane ${index + 1}` : `Opponent Lane ${index + 1}`}
                            </p>
                        </div>
                       ))}
                </div>
            </div>
      );
  };

  const CardInHand = ({ card }) => {
    const IconComponent = iconMap[card.type === 'Action' ? 'Sprout' : 'Wrench'];
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm text-white rounded-lg p-3 w-32 flex flex-col items-center justify-between shadow-lg border border-gray-600 hover:border-purple-500 hover:shadow-purple-500/30 transition-all duration-200 cursor-pointer">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 mb-2">
         {IconComponent && <IconComponent size={16} />}
        </div>
        <h3 className="font-bold text-sm text-center truncate w-full">{card.name}</h3>
        <div className="flex items-center gap-1 mt-2">
          {card.cost && (
            <div className="flex items-center text-xs"><Bolt size={12} className="text-yellow-300 mr-1" /> <span className="font-semibold">{card.cost}</span></div>
          )}
          {card.class && (
            <div className="flex items-center text-xs"><Wrench size={12} className="text-green-400 mr-1" /> <span className="font-semibold">{card.class}</span></div>
          )}
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
    <div className="h-screen bg-gray-950 text-white font-sans overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-indigo-950 to-black relative" ref={gameAreaRef} onClick={cancelAbilityMode}>
      <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Exo:wght@400;700&family=Orbitron:wght@400;700;900&display=swap');
            .font-orbitron { font-family: 'Orbitron', sans-serif; }
            .font-exo { font-family: 'Exo', sans-serif; }
            
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
              20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            .animate-shake {
              animation: shake 0.5s ease-in-out;
            }

            .explosion {
              position: absolute;
              width: 100px;
              height: 100px;
              background-image: radial-gradient(circle, rgba(255,159,64,1) 0%, rgba(255,87,34,0.8) 40%, rgba(255,255,255,0) 70%);
              border-radius: 50%;
              transform: translate(-50%, -50%) scale(0);
              animation: explode 1s ease-out forwards;
              pointer-events: none;
              z-index: 50;
            }

            @keyframes explode {
              0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
              50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; }
              100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
            }
            .bg-grid-cyan {
              background-image: linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px);
              background-size: 20px 20px;
            }
          `}
        </style>
      <TargetingArrow visible={arrowState.visible} start={arrowState.start} end={arrowState.end} />
      {explosions.map(exp => <Explosion key={exp.id} top={exp.top} left={exp.left} />)}

      <header className="w-full flex justify-between items-center mb-2 flex-shrink-0 px-5 pt-8">
          {turnPhase !== 'preGame' && (
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-lg font-bold text-pink-300">Opponent Resources</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50"><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{player2.energy}</span></div>
                {turn === 1 && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{player2.initialDeploymentBudget}</span></div>}
                <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50"><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{Object.values(player2.dronesOnBoard).flat().length} / {player2.shipSections.droneControlHub.stats['CPU Control Value']}</span></div>
              </div>
            </div>
          )}
          <div className="text-center">
              <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-xl font-orbitron" style={{textShadow: '0 0 15px rgba(236, 72, 153, 0.5), 0 0 5px rgba(255, 255, 255, 0.5)'}}>Drone Wars</h1>
              {turnPhase !== 'preGame' && <h2 className="text-2xl font-bold text-gray-300 mt-2 tracking-widest font-exo">{getPhaseDisplayName(turnPhase)}</h2>}
          </div>
          {turnPhase !== 'preGame' && (
            <div className="flex flex-col items-end gap-2">
              <h2 className="text-lg font-bold text-cyan-300">Your Resources</h2>
              <div className="flex items-center gap-6">
                <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{player1.energy}</span></div>
                {turn === 1 && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{player1.initialDeploymentBudget}</span></div>}
                <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{Object.values(player1.dronesOnBoard).flat().length} / {player1.shipSections.droneControlHub.stats['CPU Control Value']}</span></div>
              {turnPhase === 'allocateShields' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><ShieldCheck className="text-cyan-300 mr-2" /> <span className="font-bold text-lg">{shieldsToAllocate}</span></div>}
              <button onClick={handleReset} className="bg-pink-700 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-colors duration-200" aria-label="Reset Game"><RotateCcw /></button>
              <button className="bg-slate-700 text-white p-3 rounded-full shadow-lg hover:bg-slate-600 transition-colors duration-200"><Settings /></button>
              </div>
            </div>
          )}
        </header>
      
      {/* CHANGE: Main content area now has px-5 (20px) margin */}
      <main className="flex-grow min-h-0 w-full flex flex-col items-center overflow-y-auto px-20 pb-4">
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
              // This is the main battlefield view
              <div className="flex flex-col items-center w-full space-y-2">
                <ShipSectionsDisplay player={player2} isPlayer={false} placedSections={opponentPlacedSections} onTargetClick={handleTargetClick} isInteractive={false} firstPlayerOfRound={firstPlayerOfRound} turnPhase={turnPhase} playerPassState={playerPassState} />
                <DroneLanesDisplay player={player2} isPlayer={false} placedSections={opponentPlacedSections} onLaneClick={() => {}} selectedDrone={selectedDrone} />
                <DroneLanesDisplay player={player1} isPlayer={true} placedSections={placedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} />
                <ShipSectionsDisplay player={player1} isPlayer={true} placedSections={placedSections} onSectionClick={handleAllocateShield} isInteractive={turnPhase === 'allocateShields'} firstPlayerOfRound={firstPlayerOfRound} turnPhase={turnPhase} playerPassState={playerPassState} />
              </div>
            )}
          </>
        )}
      </main>

      {turnPhase !== 'preGame' && turnPhase !== 'placement' && turnPhase !== 'droneSelection' && (
        <footer className="w-full flex flex-col items-center flex-shrink-0 transition-all duration-500 ease-in-out">
          {/* --- TOGGLE BUTTON --- */}
          <div className="w-full flex justify-center">
            <button
              onClick={() => setIsFooterOpen(!isFooterOpen)}
              className="bg-slate-700 hover:bg-slate-600 text-cyan-300 rounded-t-lg px-8 py-1 transition-colors"
              title={isFooterOpen ? "Collapse Panel" : "Expand Panel"}
            >
              {isFooterOpen ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
            </button>
          </div>

          {/* --- COLLAPSIBLE CONTENT --- */}
          <div className={`w-full bg-slate-900/60 backdrop-blur-sm rounded-b-lg rounded-tr-lg transition-all duration-500 ease-in-out overflow-hidden ${isFooterOpen ? 'max-h-[500px] opacity-100 p-4' : 'max-h-0 opacity-0'}`}>
            {turnPhase !== 'placement' && turnPhase !== 'droneSelection' && (
              <div className="flex justify-center gap-4 mb-4">
              <button onClick={() => setFooterView('hand')} className={`px-6 py-2 rounded-full font-bold transition-all ${footerView === 'hand' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Hand</button>
              <button onClick={() => setFooterView('drones')} className={`px-6 py-2 rounded-full font-bold transition-all ${footerView === 'drones' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Active Drones</button>
              </div>
            )}
            {footerView === 'hand' && turnPhase !== 'droneSelection' && (
              <div className="flex flex-row justify-between w-full">
                <div className="flex flex-col items-center w-32 min-w-32">
                  <div className="w-24 h-32 bg-gray-900/80 rounded-lg border-2 border-gray-700 flex items-center justify-center shadow-md"><p className="font-bold text-sm text-gray-400">{player1.discardPile.length}</p></div>
                  <p className="mt-2 text-xs text-gray-400 font-semibold">Discard Pile</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-4 mb-4"><ChevronLeft className="text-gray-500" /><h3 className="text-lg font-semibold text-white">Your Hand</h3><ChevronRight className="text-gray-500" /></div>
                  <div className="flex flex-wrap justify-center gap-4">{player1.hand.map((card, index) => <CardInHand key={index} card={card} />)}</div>
                </div>
                <div className="flex flex-col items-center w-32 min-w-32">
                  <div className="w-24 h-32 bg-indigo-900/50 rounded-lg border-2 border-purple-500 flex items-center justify-center shadow-md cursor-pointer hover:bg-indigo-800/50 transition-colors duration-200"><p className="font-bold text-sm text-white">{player1.deck.length}</p></div>
                  <p className="mt-2 text-xs text-gray-400 font-semibold">Deck</p>
                  {turnPhase === 'initialDraw' && <button onClick={handleDrawToHand} className={`mt-4 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20`}>Draw to Hand</button>}
                  {(turnPhase === 'deployment' || turnPhase === 'action') && currentPlayer === 'player1' && <button onClick={handlePlayerPass} disabled={playerPassState.player1} className={`mt-4 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 ${playerPassState.player1 ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-500'}`}>Pass</button>}
                </div>
              </div>
            )}
            {footerView === 'drones' && turnPhase !== 'droneSelection' && (
              <div className="flex flex-col items-center mb-4 w-full">
                <div className="flex flex-wrap justify-center gap-4">
                    {sortedPlayer1ActivePool.map((drone, index) => {
                        const totalResource = turn === 1 ? player1.initialDeploymentBudget + player1.energy : player1.energy;
                        const canAfford = totalResource >= drone.class;
                        return <DroneCard key={index} drone={drone} onClick={handleToggleDroneSelection} isSelected={selectedDrone && selectedDrone.name === drone.name} isSelectable={turnPhase === 'deployment' && currentPlayer === 'player1' && !playerPassState.player1 && canAfford} deployedCount={player1.deployedDroneCounts[drone.name] || 0} />;
                    })}
                </div>
                {(turnPhase === 'deployment' || turnPhase === 'action') && currentPlayer === 'player1' && <button onClick={handlePlayerPass} disabled={playerPassState.player1} className={`mt-4 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 ${playerPassState.player1 ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-500'}`}>Pass</button>}
              </div>
            )}
            {turnPhase === 'allocateShields' && <button onClick={handleEndAllocation} disabled={shieldsToAllocate > 0 && canAllocateMoreShields} className={`mt-8 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 ${shieldsToAllocate > 0 && canAllocateMoreShields ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30'}`}>End Allocation</button>}
          </div>
        </footer>
      )}

      {/* Modals are unaffected and remain at the end */}
      {modalContent && <GamePhaseModal title={modalContent.title} text={modalContent.text} onClose={() => setModalContent(null)} />}
     {showFirstPlayerModal && (
       <GamePhaseModal title="First Player Determined" text={`The first player is determined randomly. ${currentPlayer === 'player1' ? player1.name : player2.name} will go first this round.`} onClose={handleStartDeploymentPhase}>
        <div className="flex justify-center mt-6"><button onClick={handleStartDeploymentPhase} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">Continue</button></div>
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
         text={winner === 'Player 1' ? "You have destroyed the enemy command ship." : "Your command ship has been destroyed."}
         onClose={handleReset}
        >
       <div className="flex justify-center mt-6">
        <button onClick={handleReset} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
            Play Again
        </button>
    </div>
       </GamePhaseModal>
      )}
    </div>
  );
};
export default App;