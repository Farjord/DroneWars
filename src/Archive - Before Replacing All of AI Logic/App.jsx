import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Shield, Bolt, Wrench, Sprout, Hand, ShipWheel, Settings, X, ChevronRight, ChevronLeft, Plus, RotateCcw, ShieldCheck, Sword, Search, Gavel, Bomb, Rocket, Skull, Bug, Cpu, Target, View, Zap, Heart, ChevronUp, ChevronDown } from 'lucide-react';
import './App.css';
import DeckBuilder from './DeckBuilder';
import CardViewerModal from './CardViewerModal';
import fullDroneCollection from './data/droneData.js'; 
import fullCardCollection from './data/cardData.js';
import shipSectionData from './data/shipData.js';
import aiPersonalities from './data/aiData.js'; 
import { aiBrain } from './logic/aiLogic.js';
import { gameEngine, startingDecklist } from './logic/gameLogic.js';

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


// --- HELPER FUNCTIONS ---
const getRandomDrones = (collection, count) => {
  const shuffled = [...collection].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};


// --- MAIN APP COMPONENT ---
const App = () => {
  const AI_HAND_DEBUG_MODE = true; // Set to false to disable clicking to see the AI's hand
  const [showAiHandModal, setShowAiHandModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [deploymentConfirmation, setDeploymentConfirmation] = useState(null);
  const [moveConfirmation, setMoveConfirmation] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [turnPhase, setTurnPhase] = useState('preGame');
  const [turn, setTurn] = useState(1);
  const [placedSections, setPlacedSections] = useState([]);
  const [opponentPlacedSections, setOpponentPlacedSections] = useState([]);
  const [shieldsToAllocate, setShieldsToAllocate] = useState(0);
  const [player1, setPlayer1] = useState(gameEngine.initialPlayerState('Player 1', startingDecklist));
  const [player2, setPlayer2] = useState(gameEngine.initialPlayerState('Player 2', startingDecklist));
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [firstPlayerOfRound, setFirstPlayerOfRound] = useState(null);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [passInfo, setPassInfo] = useState({ firstPasser: null, player1Passed: false, player2Passed: false });
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
  const [aiCardPlayReport, setAiCardPlayReport] = useState(null);
  const [aiActionTrigger, setAiActionTrigger] = useState(0);
  const [tempSelectedDrones, setTempSelectedDrones] = useState([]);
  const [droneSelectionPool, setDroneSelectionPool] = useState([]);
  const [droneSelectionPair, setDroneSelectionPair] = useState([]);
  const [recentlyHitDrones, setRecentlyHitDrones] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [arrowState, setArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const arrowLineRef = useRef(null);
  const droneRefs = useRef({});
  const gameAreaRef = useRef(null);

  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [winner, setWinner] = useState(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showActionPhaseStartModal, setShowActionPhaseStartModal] = useState(false);
  const [showRoundEndModal, setShowRoundEndModal] = useState(false);
  const [gameLog, setGameLog] = useState([]);
  const [isFooterOpen, setIsFooterOpen] = useState(true);
  const [aiDecisionLogToShow, setAiDecisionLogToShow] = useState(null);
  const [deck, setDeck] = useState({});
  const [isViewDeckModalOpen, setIsViewDeckModalOpen] = useState(false);
  const [isViewDiscardModalOpen, setIsViewDiscardModalOpen] = useState(false);
  const player1Ref = useRef(player1);
  const player2Ref = useRef(player2);
   useEffect(() => {
    player1Ref.current = player1;
  }, [player1]);
  useEffect(() => {
    player2Ref.current = player2;
  }, [player2]);
  const passInfoRef = useRef(passInfo);
const turnPhaseRef = useRef(turnPhase);
 useEffect(() => {
  passInfoRef.current = passInfo;
}, [passInfo]);
useEffect(() => {
  turnPhaseRef.current = turnPhase;
}, [turnPhase]);

const isResolvingAttackRef = useRef(false);

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

  const addLogEntry = useCallback((entry, debugSource, aiContext = null) => {
    const timestamp = new Date().toISOString(); // Add the timestamp here
    setGameLog(prevLog => [...prevLog, { round: turn, timestamp, debugSource, ...entry, aiDecisionContext: aiContext }]);
  }, [turn]);

  // --- ABILITY STATE ---
  const [abilityMode, setAbilityMode] = useState(null); // { drone, ability }
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);
  const [shipAbilityMode, setShipAbilityMode] = useState(null); // { sectionName, ability }
  const [shipAbilityConfirmation, setShipAbilityConfirmation] = useState(null);

  // --- NEW: CARD PLAYING STATE ---
  const [selectedCard, setSelectedCard] = useState(null); // { card data }
  const [validCardTargets, setValidCardTargets] = useState([]); // [id1, id2, ...]
  const [cardConfirmation, setCardConfirmation] = useState(null); // { card, target }
  const [abilityConfirmation, setAbilityConfirmation] = useState(null);
  const [multiSelectState, setMultiSelectState] = useState(null); // To manage multi-step card effects
  const [destroyUpgradeModal, setDestroyUpgradeModal] = useState(null); // For targeting specific upgrades to destroy
  const [upgradeSelectionModal, setUpgradeSelectionModal] = useState(null); // For the new upgrade target selection modal
  const [viewUpgradesModal, setViewUpgradesModal] = useState(null); // To view applied upgrades on a drone card

  
  // --- MANDATORY ACTION STATE ---
  const [mandatoryAction, setMandatoryAction] = useState(null); // e.g., { type: 'discard'/'destroy', player: 'player1', count: X }
  const [showMandatoryActionModal, setShowMandatoryActionModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(null); // For confirm/cancel popups
  const [initialShieldAllocation, setInitialShieldAllocation] = useState(null); // For shield allocation reset
   const [optionalDiscardCount, setOptionalDiscardCount] = useState(0); // For optional discard phase

  // Memoize effective stats for performance and easy access
  const player1EffectiveStats = useMemo(() => gameEngine.calculateEffectiveShipStats(player1, placedSections), [player1.shipSections, placedSections]);
  const player2EffectiveStats = useMemo(() => gameEngine.calculateEffectiveShipStats(player2, opponentPlacedSections), [player2.shipSections, opponentPlacedSections]);

  const totalPlayer1Drones = useMemo(() => Object.values(player1.dronesOnBoard).flat().length, [player1.dronesOnBoard]);
  const totalPlayer2Drones = useMemo(() => Object.values(player2.dronesOnBoard).flat().length, [player2.dronesOnBoard]);

  // --- ABILITY & GAME LOGIC (ORDER MATTERS HERE) ---

  const endActionPhase = useCallback(() => {
    setShowRoundEndModal(true);
  }, []);

  const endDeploymentPhase = () => {
    setShowActionPhaseStartModal(true);
  };

const endTurn = useCallback((actingPlayer) => {
  const nextPlayer = actingPlayer === 'player1' ? 'player2' : 'player1';

  if (passInfoRef.current.player1Passed && passInfoRef.current.player2Passed) {
      if (turnPhaseRef.current === 'deployment') endDeploymentPhase();
      if (turnPhaseRef.current === 'action') endActionPhase();
      return;
  }

  const nextPlayerHasPassed = (nextPlayer === 'player1' && passInfoRef.current.player1Passed) || (nextPlayer === 'player2' && passInfoRef.current.player2Passed);

  if (nextPlayerHasPassed) {
    // If the opponent has passed, it's the current player's turn again.
    // We increment the trigger to force the useEffect to run again for the AI.
    if (actingPlayer === 'player2') {
      setAiActionTrigger(prev => prev + 1);
    }
    setCurrentPlayer(actingPlayer);
    return;
  }

  // If the next player has NOT passed, proceed as normal.
  setCurrentPlayer(nextPlayer);
  if (nextPlayer === 'player1') {
      setModalContent(null);
  } else {
      setModalContent({ 
        title: "Opponent's Turn", 
        text: "The AI is taking its turn.", 
        isBlocking: false,
        onClose: null
      });
  }
}, [endActionPhase]);
  

  useEffect(() => {
    if (abilityMode) {
      const targets = gameEngine.getValidTargets('player1', abilityMode.drone, abilityMode.ability);
      setValidAbilityTargets(targets);
      setValidCardTargets([]);
      setSelectedCard(null);
      setShipAbilityMode(null);
    } else if (shipAbilityMode) {
    const targets = gameEngine.getValidTargets('player1', { id: shipAbilityMode.sectionName }, shipAbilityMode.ability, player1, player2);
    setValidAbilityTargets(targets);
    setValidCardTargets([]);
    setSelectedCard(null);
    setAbilityMode(null);
    } else if (multiSelectState) {  // --- Check for multiSelectState first
      let targets = [];
      const { phase, sourceLane, selectedDrones } = multiSelectState;
      if (card.effect.type === 'SINGLE_MOVE') {
        if (phase === 'select_drone') {
            // Target all friendly, non-exhausted drones
            Object.values(player1.dronesOnBoard).flat().forEach(drone => {
                if (!drone.isExhausted) {
                    targets.push({ ...drone, owner: 'player1' });
                }
            });
        } else if (phase === 'select_destination') {
            // Target adjacent lanes
            const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);
            ['lane1', 'lane2', 'lane3'].forEach(laneId => {
              const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
              const isAdjacent = Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
              if (isAdjacent) {
                targets.push({ id: laneId, owner: 'player1' });
              }
            });
        }
      } 
       else if (phase === 'select_source_lane') {
        // Target friendly lanes that have at least one drone
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
          if (player1.dronesOnBoard[laneId].length > 0) {
            targets.push({ id: laneId, owner: 'player1' });
          }
        });
      } else if (phase === 'select_drones') {
        // Target non-exhausted drones within the selected source lane
        player1.dronesOnBoard[sourceLane]
          .filter(drone => !drone.isExhausted) // Filter out any drones that are already exhausted
          .forEach(drone => {
            targets.push({ ...drone, owner: 'player1' });
          });
      } else if (phase === 'select_destination_lane') {
        // Target ADJACENT friendly lanes
        const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
          const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
          const isAdjacent = Math.abs(sourceLaneIndex - targetLaneIndex) === 1;

          if (isAdjacent) {
            targets.push({ id: laneId, owner: 'player1' });
          }
        });
      }
      setValidCardTargets(targets);
      setValidAbilityTargets([]);

    } else if (selectedCard) {
      // --- LOGIC FOR UPGRADE & MULTI-MOVE CARDS ---
      if (selectedCard.type === 'Upgrade') {
          const droneCardsAsTargets = player1.activeDronePool.map(drone => {
              const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
              const applied = player1.appliedUpgrades[drone.name] || [];
              const alreadyHasThisUpgrade = applied.filter(upg => upg.id === selectedCard.id).length;
              const maxApps = selectedCard.maxApplications === undefined ? 1 : selectedCard.maxApplications;

              // A drone is a valid target if its slots aren't full AND it hasn't hit the limit for this specific upgrade
              if (baseDrone && applied.length < baseDrone.upgradeSlots && alreadyHasThisUpgrade < maxApps) {
                  return { ...drone, id: drone.name }; // Use name as ID for targeting
              }
              return null;
          }).filter(Boolean); // Remove nulls
          setValidCardTargets(droneCardsAsTargets);
          setValidAbilityTargets([]);
      } else if (selectedCard.effect.type === 'MULTI_MOVE') {
          // This reuses the logic from your multiSelectState handler, keeping it in one place
          let targets = [];
          const { phase, sourceLane } = multiSelectState || { phase: 'select_source_lane' };
          
          if (phase === 'select_source_lane') {
              ['lane1', 'lane2', 'lane3'].forEach(laneId => {
                  if (player1.dronesOnBoard[laneId].length > 0) targets.push({ id: laneId, owner: 'player1' });
              });
          } else if (phase === 'select_drones') {
              player1.dronesOnBoard[sourceLane]?.forEach(drone => targets.push({ ...drone, owner: 'player1' }));
          } else if (phase === 'select_destination_lane') {
              ['lane1', 'lane2', 'lane3'].forEach(laneId => {
                  if (laneId !== sourceLane) targets.push({ id: laneId, owner: 'player1' });
              });
          }
          setValidCardTargets(targets);
          setValidAbilityTargets([]);
      } else {
          const targets = gameEngine.getValidTargets('player1', null, selectedCard, player1, player2);
          setValidCardTargets(targets);
          setValidAbilityTargets([]);
      }
    }
    else {
      setValidAbilityTargets([]);
      setValidCardTargets([]);
    }
  }, [abilityMode, selectedCard, player1, player2, multiSelectState]);

  const cancelAbilityMode = () => {
    if (abilityMode) {
     setAbilityMode(null);
     setSelectedDrone(null);
    }
  };

  // Function to cancel card selection
  const cancelCardSelection = () => {
    setSelectedCard(null);
    setMultiSelectState(null);
  };

const resolveAttack = useCallback((attackDetails, isAbilityOrCard = false) => {
    const { attacker, target, targetType, interceptor, attackingPlayer, abilityDamage, goAgain, aiContext } = attackDetails;
    const finalTarget = interceptor || target;
    const finalTargetType = interceptor ? 'drone' : targetType;

    const attackingPlayerId = attackingPlayer;
    const defendingPlayerId = finalTarget.owner || (attackingPlayerId === 'player1' ? 'player2' : 'player1');

    const attackerPlayerState = attackingPlayerId === 'player1' ? player1Ref.current : player2Ref.current;
    const defenderPlayerState = defendingPlayerId === 'player1' ? player1Ref.current : player2Ref.current;

    const attackerStateSetter = attackingPlayerId === 'player1' ? setPlayer1 : setPlayer2;
    const defenderStateSetter = defendingPlayerId === 'player1' ? setPlayer1 : setPlayer2;
    
    const attackerLane = gameEngine.getLaneOfDrone(attacker.id, attackerPlayerState);
    const effectiveAttacker = gameEngine.calculateEffectiveStats(attacker, attackerLane, attackerPlayerState, defenderPlayerState, { player1: placedSections, player2: opponentPlacedSections });
    
    let damage = abilityDamage ?? Math.max(0, effectiveAttacker.attack);
    let damageType = attackDetails.damageType || attacker.damageType;
    if (effectiveAttacker.keywords.has('PIERCING')) {
        damageType = 'PIERCING';
    }

    if (finalTargetType === 'section' && !abilityDamage) {
        const baseAttacker = fullDroneCollection.find(d => d.name === attacker.name);
        baseAttacker?.abilities?.forEach(ability => {
            if (ability.type === 'PASSIVE' && ability.effect.type === 'BONUS_DAMAGE_VS_SHIP') {
                damage += ability.effect.value;
            }
        });
    }

    const triggerHitAnimation = (targetId) => {
        setRecentlyHitDrones(prev => [...prev, targetId]);
        setTimeout(() => setRecentlyHitDrones(prev => prev.filter(id => id !== targetId)), 500);
    };
    
    let outcome = '';
    let shieldDamage = 0;
    let hullDamage = 0;
    let wasDestroyed = false;
    let remainingShields = 0;
    let remainingHull = 0;

    if (finalTargetType === 'drone') {
        let targetInState = null;
        for (const lane in defenderPlayerState.dronesOnBoard) {
            targetInState = defenderPlayerState.dronesOnBoard[lane].find(d => d.id === finalTarget.id);
            if (targetInState) break;
        }
        if (targetInState) {
            let remainingDamage = damage;
            if (damageType !== 'PIERCING') {
                shieldDamage = Math.min(damage, targetInState.currentShields);
                remainingDamage -= shieldDamage;
            }
            hullDamage = Math.min(remainingDamage, targetInState.hull);
            wasDestroyed = (targetInState.hull - hullDamage) <= 0;
            remainingShields = targetInState.currentShields - shieldDamage;
            remainingHull = wasDestroyed ? 0 : targetInState.hull - hullDamage;
        }
    } else { 
        const sectionInState = defenderPlayerState.shipSections[finalTarget.name];
        if (sectionInState) {
            let remainingDamage = damage;
            if (damageType !== 'PIERCING') {
                shieldDamage = Math.min(damage, sectionInState.allocatedShields);
                remainingDamage -= shieldDamage;
            }
            hullDamage = Math.min(remainingDamage, sectionInState.hull);
            wasDestroyed = (sectionInState.hull - hullDamage) <= 0;
            remainingShields = sectionInState.allocatedShields - shieldDamage;
            remainingHull = wasDestroyed ? 0 : sectionInState.hull - hullDamage;
        }
    }

    outcome = `Dealt ${shieldDamage} shield and ${hullDamage} hull damage to ${finalTarget.name}.`;
    if (finalTargetType === 'drone') {
        if (wasDestroyed) {
            outcome += ` ${finalTarget.name} Destroyed.`;
        } else {
            outcome += ` ${finalTarget.name} has ${remainingShields} shields and ${remainingHull} hull left.`;
        }
    }
    const targetForLog = finalTargetType === 'drone' ? `${finalTarget.name} (${attackerLane})` : finalTarget.name;
    const sourceForLog = `${attacker.name} (${attackerLane})`;

    addLogEntry({
        player: attackingPlayerId === 'player1' ? player1Ref.current.name : player2Ref.current.name,
        actionType: 'ATTACK',
        source: sourceForLog,
        target: targetForLog,
        outcome: outcome
    }, 'resolveAttack', attackingPlayerId === 'player2' ? aiContext : null);

    if (attackingPlayerId === 'player2') {
        setAiActionReport({
            attackerName: attacker.name, lane: attackerLane, targetName: finalTarget.name,
            targetType: finalTargetType, interceptorName: interceptor ? interceptor.name : null,
            shieldDamage, hullDamage, wasDestroyed, remainingShields, remainingHull, isBlocking: true
        });
    }

    defenderStateSetter(prev => {
        let newPlayerState = JSON.parse(JSON.stringify(prev));
        if (finalTargetType === 'drone') {
            let droneDestroyed = false;
            for (const lane in newPlayerState.dronesOnBoard) {
                const targetIndex = newPlayerState.dronesOnBoard[lane].findIndex(d => d.id === finalTarget.id);
                if (targetIndex !== -1) {
                    if ((newPlayerState.dronesOnBoard[lane][targetIndex].hull - hullDamage) <= 0) {
                        droneDestroyed = true;
                        triggerExplosion(finalTarget.id);
                        const destroyedDrone = newPlayerState.dronesOnBoard[lane][targetIndex];
                        newPlayerState.dronesOnBoard[lane] = newPlayerState.dronesOnBoard[lane].filter(d => d.id !== finalTarget.id);
                        Object.assign(newPlayerState, gameEngine.onDroneDestroyed(newPlayerState, destroyedDrone));
                    } else {
                        triggerHitAnimation(finalTarget.id);
                        newPlayerState.dronesOnBoard[lane][targetIndex].hull -= hullDamage;
                        newPlayerState.dronesOnBoard[lane][targetIndex].currentShields -= shieldDamage;
                    }
                    break;
                }
            }
            if (droneDestroyed) {
                const opponentState = defendingPlayerId === 'player1' ? player2Ref.current : player1Ref.current;
                // --- THIS IS THE CORRECTED CALL ---
                newPlayerState.dronesOnBoard = gameEngine.updateAuras(newPlayerState, opponentState, { player1: placedSections, player2: opponentPlacedSections });
            }
        } else {
            newPlayerState.shipSections[finalTarget.name].hull -= hullDamage;
            newPlayerState.shipSections[finalTarget.name].allocatedShields -= shieldDamage;
            const defenderSections = defendingPlayerId === 'player1' ? placedSections : opponentPlacedSections;
            const newEffectiveStats = gameEngine.calculateEffectiveShipStats(newPlayerState, defenderSections).totals;
            if (newPlayerState.energy > newEffectiveStats.maxEnergy) {
                newPlayerState.energy = newEffectiveStats.maxEnergy;
            }
        }
        return newPlayerState;
    });

    if (!isAbilityOrCard) {
        const attackerPlayerState = attackingPlayerId === 'player1' ? player1Ref.current : player2Ref.current;
        let tempState = JSON.parse(JSON.stringify(attackerPlayerState));
        let droneWasOnBoard = false;
        for (const lane in tempState.dronesOnBoard) {
            const attackerIndex = tempState.dronesOnBoard[lane].findIndex(d => d.id === attacker.id);
            if (attackerIndex !== -1) {
                tempState.dronesOnBoard[lane][attackerIndex].isExhausted = true;
                droneWasOnBoard = true;
                break;
            }
        }

        let finalState = tempState;
        let afterAttackEffects = [];
        if (droneWasOnBoard) {
            const result = gameEngine.calculateAfterAttackStateAndEffects(tempState, attacker);
            finalState = result.newState;
            afterAttackEffects = result.effects;
        }
        attackerStateSetter(finalState);

        afterAttackEffects.forEach(effect => {
            if (effect.type === 'LOG') addLogEntry(effect.payload, 'resolveAfterAttackEffects');
            else if (effect.type === 'EXPLOSION') triggerExplosion(effect.payload.targetId);
        });

        if (interceptor) {
            const interceptorUpdater = attackingPlayerId === 'player1' ? setPlayer2 : setPlayer1;
            interceptorUpdater(prev => {
                const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));
                for (const lane in newDronesOnBoard) {
                    const interceptorIndex = newDronesOnBoard[lane].findIndex(d => d.id === interceptor.id);
                    if (interceptorIndex !== -1) {
                        const effectiveStats = gameEngine.calculateEffectiveStats(newDronesOnBoard[lane][interceptorIndex], lane, prev, attackerPlayerState, { player1: placedSections, player2: opponentPlacedSections });
                        if (!effectiveStats.keywords.has('DEFENDER')) {
                            newDronesOnBoard[lane][interceptorIndex].isExhausted = true;
                        }
                        break;
                    }
                }
                return { ...prev, dronesOnBoard: newDronesOnBoard };
            });
        }

        setSelectedDrone(null);
        setPendingAttack(null);
        setTimeout(() => { isResolvingAttackRef.current = false; }, 0);
        if (attackingPlayerId === 'player1' && !goAgain) {
            endTurn('player1');
        }
    }
}, [endTurn, triggerExplosion, addLogEntry]);


const resolveAbility = useCallback((ability, userDrone, targetDrone) => {
    const { effect, cost } = ability;

    // --- NEW: Add Logging ---
    let targetName = '';
    let outcome = 'Ability effect applied.';
    
    if (ability.targeting?.type === 'LANE') {
        targetName = `Lane ${targetDrone.id.slice(-1)}`;
    } else if (targetDrone) {
        targetName = targetDrone.name;
    }

    if (effect.type === 'HEAL') {
        outcome = `Healed ${effect.value} hull on targets in ${targetName}.`;
        if (effect.scope !== 'LANE') {
            outcome = `Healed ${effect.value} hull on ${targetName}.`;
        }
    } else if (effect.type === 'DAMAGE') {
        outcome = `Dealt ${effect.value} damage to ${targetName}.`;
    }

    addLogEntry({
        player: player1.name,
        actionType: 'ABILITY',
        source: `${userDrone.name}'s ${ability.name}`,
        target: targetName,
        outcome: outcome
    }, 'resolveAbility');
    // --- END LOGGING ---

    // 1. Pay costs
    setPlayer1(prev => {
        let newEnergy = prev.energy;
        if (cost.energy) {
            newEnergy -= cost.energy;
        }

        const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));
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
            
            if (effect.scope === 'LANE') {
                const targetLaneId = targetDrone.id;
                if (newDronesOnBoard[targetLaneId]) {
                    newDronesOnBoard[targetLaneId].forEach(droneInLane => {
                        const baseDrone = fullDroneCollection.find(d => d.name === droneInLane.name);
                        if (baseDrone && droneInLane.hull < baseDrone.hull) {
                            droneInLane.hull = Math.min(baseDrone.hull, droneInLane.hull + effect.value);
                        }
                    });
                }
            } else {
                const baseTarget = fullDroneCollection.find(d => d.name === targetDrone.name);
                const targetLaneId = gameEngine.getLaneOfDrone(targetDrone.id, prev);
                if (targetLaneId) {
                    const droneIndex = newDronesOnBoard[targetLaneId].findIndex(d => d.id === targetDrone.id);
                    if (droneIndex !== -1) {
                        newDronesOnBoard[targetLaneId][droneIndex].hull = Math.min(baseTarget.hull, newDronesOnBoard[targetLaneId][droneIndex].hull + effect.value);
                    }
                }
            }
            return { ...prev, dronesOnBoard: newDronesOnBoard };
        });
    } else if (effect.type === 'DAMAGE') {
        const targetLane = gameEngine.getLaneOfDrone(targetDrone.id, player2);
        if (targetLane) {
          resolveAttack({
            attacker: userDrone,
            target: targetDrone,
            targetType: 'drone',
            attackingPlayer: 'player1',
            abilityDamage: effect.value,
            lane: targetLane,
            damageType: effect.damageType,
        }, true);
        }
        } else if (effect.type === 'GAIN_ENERGY') {
            setPlayer1(prev => {
                const effectiveStatsP1 = gameEngine.calculateEffectiveShipStats(prev, placedSections).totals;
                if (prev.energy >= effectiveStatsP1.maxEnergy) return prev; // Corrected to use totals
                const newEnergy = Math.min(effectiveStatsP1.maxEnergy, prev.energy + effect.value);
                return {...prev, energy: newEnergy };
            });
        }

    cancelAbilityMode();
    if (!effect.goAgain) { 
        endTurn('player1');
    }
  }, [endTurn, player2, gameEngine.getLaneOfDrone, resolveAttack, player1.name, addLogEntry]);


// ---  LOGIC TO RESOLVE A SHIP ABILITY ---
const resolveShipAbility = useCallback((ability, sectionName, target) => {
const { cost, effect } = ability;

addLogEntry({
    player: player1.name,
    actionType: 'SHIP_ABILITY',
    source: `${sectionName}'s ${ability.name}`,
    target: target?.name || 'N/A',
    outcome: `Activated ${ability.name}.`
}, 'resolveShipAbility');

// 1. Pay costs
setPlayer1(prev => ({ ...prev, energy: prev.energy - cost.energy }));

// 2. Apply effects
if (effect.type === 'DAMAGE') {
    resolveAttack({
        attacker: { name: sectionName },
        target: target,
        targetType: 'drone',
        attackingPlayer: 'player1',
        abilityDamage: effect.value,
        lane: gameEngine.getLaneOfDrone(target.id, player2),
        damageType: effect.damageType,
    }, true);
} else if (effect.type === 'RECALL_DRONE') {
    setPlayer1(prev => {
        let newState = JSON.parse(JSON.stringify(prev));
        const lane = gameEngine.getLaneOfDrone(target.id, newState);
        if (lane) {
            newState.dronesOnBoard[lane] = newState.dronesOnBoard[lane].filter(d => d.id !== target.id);
            Object.assign(newState, gameEngine.onDroneRecalled(newState, target));
            newState.dronesOnBoard = gameEngine.updateAuras(newState, player2Ref.current, { player1: placedSections, player2: opponentPlacedSections });
        }
        return newState;
    });
} else if (effect.type === 'DRAW_THEN_DISCARD') {
    setPlayer1(prev => {
        let newDeck = [...prev.deck];
            let newHand = [...prev.hand];
            let newDiscard = [...prev.discardPile];

            for (let i = 0; i < effect.value.draw; i++) {
                if (newDeck.length === 0 && newDiscard.length > 0) {
                    newDeck = [...newDiscard].sort(() => 0.5 - Math.random());
                    newDiscard = [];
                }
                if (newDeck.length > 0) {
                    newHand.push(newDeck.pop());
                }
            }
            return { ...prev, deck: newDeck, hand: newHand, discardPile: newDiscard };
        });
        setMandatoryAction({ type: 'discard', player: 'player1', count: effect.value.discard });
        setShowMandatoryActionModal(true);
    }
    
setShipAbilityMode(null);
setShipAbilityConfirmation(null);
endTurn('player1');
}, [endTurn, resolveAttack, addLogEntry, placedSections, opponentPlacedSections]);


// ---  LOGIC TO RESOLVE A CARD ---
    const resolveCardPlay = useCallback((card, target, actingPlayerId, aiContext = null) => { 
    const { cost, effect } = card;
    const actingPlayerName = actingPlayerId === 'player1' ? player1.name : player2.name;
    const targetName = target ? (target.name || target.id) : 'N/A';
    let outcome = 'Card effect applied.';

    if (effect.type === 'DRAW') outcome = `Drew ${effect.value} card(s).`;
    if (effect.type === 'GAIN_ENERGY') outcome = `Gained ${effect.value} energy.`;
    if (effect.type === 'HEAL_HULL') outcome = `Healed ${effect.value} hull on ${targetName}.`;
    if (effect.type === 'HEAL_SHIELDS') outcome = `Healed ${effect.value} shields on ${targetName}.`;
    if (effect.type === 'READY_DRONE') outcome = `Readied ${targetName}.`;
    if (effect.type === 'DAMAGE') {
      if (effect.scope === 'FILTERED') {
        outcome = `Dealt ${effect.value} damage to filtered targets in ${targetName}.`;
      } else {
        outcome = `Dealt ${effect.value} damage to ${targetName}.`;
      }
    }
    if (effect.type === 'DESTROY') outcome = `Destroyed target(s) in ${targetName}.`;
    if (effect.type === 'MODIFY_STAT') {
        const mod = effect.mod;
        const durationText = mod.type === 'temporary' ? ' until the end of the turn' : ' permanently';
        outcome = `Gave ${targetName} a ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat} bonus${durationText}.`;
    }

    if (effect.type === 'REPEATING_EFFECT') {
        const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
        let repeatCount = 1; // Base effect
        if (effect.condition === 'OWN_DAMAGED_SECTIONS') {
            for (const sectionName in actingPlayerState.shipSections) {
                const section = actingPlayerState.shipSections[sectionName];
                const status = gameEngine.getShipStatus(section);
                if (status === 'damaged' || status === 'critical') {
                    repeatCount++;
                }
            }
        }
        outcome = `Drew ${repeatCount} card(s) and gained ${repeatCount} energy based on damaged sections.`;
    }

   addLogEntry({
      player: actingPlayerName,
      actionType: 'PLAY_CARD',
      source: card.name,
      target: targetName,
      outcome: outcome
    }, 'resolveCardPlay', actingPlayerId === 'player2' ? aiContext : null);

  
    // --- If AI is playing, set up the report modal ---
    if (actingPlayerId === 'player2') {
        let targetDisplayName = '';
        if (target) {
            if (target.name) {
                targetDisplayName = target.name;
            } else if (target.id.startsWith('lane')) {
                targetDisplayName = `Lane ${target.id.slice(-1)}`;
            } else {
                targetDisplayName = target.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            }
        }
        setAiCardPlayReport({ card, targetName: targetDisplayName });
    }
    const actingPlayerUpdater = actingPlayerId === 'player1' ? setPlayer1 : setPlayer2;
    const opponentUpdater = actingPlayerId === 'player1' ? setPlayer2 : setPlayer1;

// What your new code should look like:
    // --- NEW: UPGRADE CARD LOGIC ---
    if (effect.type === 'MODIFY_DRONE_BASE') {
        actingPlayerUpdater(prev => {
            const droneName = target.name; // Target is the drone card object from the UI
            const existingUpgrades = prev.appliedUpgrades[droneName] || [];
            
            const newUpgrade = {
                ...card,
                instanceId: `upgrade-${Date.now()}-${Math.random()}`,
                mod: effect.mod
            };

            return {
                ...prev,
                energy: prev.energy - (cost || 0),
                hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
                discardPile: [...prev.discardPile, card],
                appliedUpgrades: {
                    ...prev.appliedUpgrades,
                    [droneName]: [...existingUpgrades, newUpgrade]
                }
            };
        });
    } else if (effect.type === 'DESTROY_UPGRADE') {
        // This affects the opponent
        opponentUpdater(prev => {
            // Target here will be { droneName, instanceId } from the selection modal
            const { droneName, instanceId } = target;
            if (!prev.appliedUpgrades[droneName]) return prev; // Safety check

            const newUpgradesForDrone = prev.appliedUpgrades[droneName].filter(upg => upg.instanceId !== instanceId);

            const newAppliedUpgrades = { ...prev.appliedUpgrades };
            if (newUpgradesForDrone.length > 0) {
                newAppliedUpgrades[droneName] = newUpgradesForDrone;
            } else {
                delete newAppliedUpgrades[droneName];
            }

            return { ...prev, appliedUpgrades: newAppliedUpgrades };
        });
        
        // The acting player still pays the cost and discards the card
        actingPlayerUpdater(prev => ({
            ...prev,
            energy: prev.energy - (cost || 0),
            hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
            discardPile: [...prev.discardPile, card],
        }));
    } 
    // --- REFACTORED LOGIC (now an "else if") ---
    else if (effect.type === 'MODIFY_STAT' && target) {
        const updater = target.owner === actingPlayerId ? actingPlayerUpdater : opponentUpdater;
        
        updater(prev => {
            const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));

            // NEW: Check if the target is a lane
            if (card.targeting?.type === 'LANE') {
                const laneId = target.id;
                if (newDronesOnBoard[laneId]) {
                    newDronesOnBoard[laneId].forEach(drone => {
                        if (!drone.statMods) {
                            drone.statMods = [];
                        }
                        drone.statMods.push(effect.mod);
                    });
                }
            } else {
                // Original logic for single-drone targets
                for (const lane in newDronesOnBoard) {
                    const idx = newDronesOnBoard[lane].findIndex(d => d.id === target.id);
                    if (idx !== -1) {
                        if (!newDronesOnBoard[lane][idx].statMods) {
                            newDronesOnBoard[lane][idx].statMods = [];
                        }
                        newDronesOnBoard[lane][idx].statMods.push(effect.mod);
                        break;
                    }
                }
            }
            return { ...prev, dronesOnBoard: newDronesOnBoard };
        });

        // Pay cost and discard for the acting player
        actingPlayerUpdater(prev => ({
            ...prev,
            energy: prev.energy - (cost || 0),
            hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
            discardPile: [...prev.discardPile, card],
        }));

    } else {
        // 1) Apply immediate changes for all other card types that affect the acting player
            actingPlayerUpdater(prev => {
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
                const effectiveStatsP1 = gameEngine.calculateEffectiveShipStats(newState, actingPlayerId === 'player1' ? placedSections : opponentPlacedSections).totals;
                const newEnergy = Math.min(effectiveStatsP1.maxEnergy, newState.energy + effect.value);
                newState = { ...newState, energy: newEnergy };
            }
            // REPEATING_EFFECT
            else if (effect.type === 'REPEATING_EFFECT') {
                let repeatCount = 1; // Base effect always happens once
                if (effect.condition === 'OWN_DAMAGED_SECTIONS') {
                    for (const sectionName in newState.shipSections) {
                        const section = newState.shipSections[sectionName];
                        const status = gameEngine.getShipStatus(section);
                        if (status === 'damaged' || status === 'critical') {
                            repeatCount++;
                        }
                    }
                }

                // Apply the sub-effects `repeatCount` times
                for (let i = 0; i < repeatCount; i++) {
                    effect.effects.forEach(subEffect => {
                        if (subEffect.type === 'DRAW') {
                            if (newState.deck.length === 0 && newState.discardPile.length > 0) {
                                newState.deck = [...newState.discardPile].sort(() => 0.5 - Math.random());
                                newState.discardPile = [];
                            }
                            if (newState.deck.length > 0) {
                                newState.hand.push(newState.deck.pop());
                            }
                        } else if (subEffect.type === 'GAIN_ENERGY') {
                            const effectiveStats = gameEngine.calculateEffectiveShipStats(newState, actingPlayerId === 'player1' ? placedSections : opponentPlacedSections).totals;
                            newState.energy = Math.min(effectiveStats.maxEnergy, newState.energy + subEffect.value);
                        }
                    });
                }
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
            // DESTROY LOGIC for PLAYER 1
            else if (effect.type === 'DESTROY') {
                const newDronesOnBoard = JSON.parse(JSON.stringify(newState.dronesOnBoard));
                let dronesWereDestroyed = false;

                if (effect.scope === 'LANE' && target.id) {
                    const laneId = target.id;
                    const destroyed = newDronesOnBoard[laneId] || [];
                    if (destroyed.length > 0) dronesWereDestroyed = true;
                    destroyed.forEach(d => {
                        triggerExplosion(d.id);
                        const updates = gameEngine.onDroneDestroyed(newState, d);
                        newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                    });
                    newDronesOnBoard[laneId] = [];
                }
                else if (effect.scope === 'SINGLE' && target && target.owner === actingPlayerId) {
                    const laneId = gameEngine.getLaneOfDrone(target.id, newState);
                    if (laneId) {
                        const droneToDestroy = newDronesOnBoard[laneId].find(d => d.id === target.id);
                        if(droneToDestroy) {
                            dronesWereDestroyed = true;
                            triggerExplosion(droneToDestroy.id);
                            const updates = gameEngine.onDroneDestroyed(newState, droneToDestroy);
                            newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                            newDronesOnBoard[laneId] = newDronesOnBoard[laneId].filter(d => d.id !== target.id);
                        }
                    }
                }
                
                newState.dronesOnBoard = newDronesOnBoard;
                if (dronesWereDestroyed) {
                    const opponentState = actingPlayerId === 'player1' ? player2Ref.current : player1Ref.current;
                    newState.dronesOnBoard = gameEngine.updateAuras(newState, opponentState, { player1: placedSections, player2: opponentPlacedSections });
                }
            }
            return newState;
        });
    }

    // 2) Handle effects that target the other player or need additional actions
    if (effect.type === 'DAMAGE') {
      if (effect.scope === 'FILTERED' && target.id.startsWith('lane') && effect.filter) {
        const laneId = target.id;
        // Determine the target player based on card affinity, not the owner of the clicked lane.
        const targetPlayer = card.targeting?.affinity === 'ENEMY' 
          ? (actingPlayerId === 'player1' ? 'player2' : 'player1') 
          : actingPlayerId;
        const targetPlayerState = targetPlayer === 'player1' ? player1 : player2;
        const dronesInLane = targetPlayerState.dronesOnBoard[laneId] || [];

        const { stat, comparison, value } = effect.filter;
        
        dronesInLane.forEach(droneInLane => {
            let meetsCondition = false;
            if (comparison === 'GTE' && droneInLane[stat] >= value) {
                meetsCondition = true;
            }
            if (comparison === 'LTE' && droneInLane[stat] <= value) {
                meetsCondition = true;
            }

            if (meetsCondition) {
                resolveAttack({
                    attacker: { name: card.name },
                    target: droneInLane,
                    targetType: 'drone',
                    attackingPlayer: actingPlayerId,
                    abilityDamage: effect.value,
                    lane: laneId,
                    goAgain: false,
                    damageType: effect.damageType,
                }, true);
            }
        });
      }
      else {
        const targetPlayerState = target.owner === 'player1' ? player1 : player2;
        const targetLane = gameEngine.getLaneOfDrone((target && target.id), targetPlayerState);

        if (targetLane) {
          resolveAttack({
            attacker: { name: card.name },
            target: target,
            targetType: 'drone',
            attackingPlayer: actingPlayerId,
            abilityDamage: effect.value,
            lane: targetLane,
            goAgain: effect.goAgain || false,
            damageType: effect.damageType,
          }, true);
        }
      }
    }
    else if (effect.type === 'DESTROY') {
      opponentUpdater(prev => {
        const newState = JSON.parse(JSON.stringify(prev));
        let dronesWereDestroyed = false;

        if (effect.scope === 'LANE' && target.id) {
          const laneId = target.id;
          const destroyed = newState.dronesOnBoard[laneId] || [];
          if (destroyed.length > 0) dronesWereDestroyed = true;
          destroyed.forEach(d => {
            triggerExplosion(d.id);
            const updates = gameEngine.onDroneDestroyed(newState, d);
            newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
          });
          newState.dronesOnBoard[laneId] = [];
        }
        else if (effect.scope === 'SINGLE' && target && target.owner !== actingPlayerId) {
          const laneId = gameEngine.getLaneOfDrone(target.id, newState);
          if (laneId) {
            const droneToDestroy = newState.dronesOnBoard[laneId].find(d => d.id === target.id);
            if (droneToDestroy) {
              dronesWereDestroyed = true;
              triggerExplosion(droneToDestroy.id);
              const updates = gameEngine.onDroneDestroyed(newState, droneToDestroy);
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
            else if (comparison === 'LTE' && drone[stat] <= value) {
              shouldBeDestroyed = true;
            }

            if (shouldBeDestroyed) {
              dronesToDestroy.push(drone);
            } else {
              dronesToKeep.push(drone);
            }
          });

          if (dronesToDestroy.length > 0) {
            dronesWereDestroyed = true;
            dronesToDestroy.forEach(d => {
              addLogEntry({
                player: actingPlayerName,
                actionType: 'EFFECT',
                source: card.name,
                target: d.name,
                outcome: `Destroyed by ${card.name}.`
              }, 'resolveCardPlay_filteredDestroy');
              triggerExplosion(d.id);
              const updates = gameEngine.onDroneDestroyed(newState, d);
              newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
            });
            newState.dronesOnBoard[laneId] = dronesToKeep;
          }
        }

        if (dronesWereDestroyed) {
          const opponentState = actingPlayerId === 'player1' ? player1Ref.current : player2Ref.current;
          newState.dronesOnBoard = gameEngine.updateAuras(newState, opponentState, { player1: placedSections, player2: opponentPlacedSections });
        }
        return newState;
      });
    }

    if (actingPlayerId === 'player1') {
        cancelCardSelection();
        setCardConfirmation(null);
    }
    
    if (!effect.goAgain) {
      if (actingPlayerId === 'player1') {
        endTurn('player1');
      }
    }
}, [player1, player2, resolveAttack, endTurn, triggerExplosion, addLogEntry]);

const resolveMultiMove = useCallback((card, dronesToMove, fromLane, toLane) => {
    const { cost, effect } = card;

    let tempState = JSON.parse(JSON.stringify(player1));
    tempState.energy -= cost;
    tempState.hand = tempState.hand.filter(c => c.instanceId !== card.instanceId);
    tempState.discardPile.push(card);

    const dronesBeingMovedIds = new Set(dronesToMove.map(d => d.id));
    tempState.dronesOnBoard[fromLane] = tempState.dronesOnBoard[fromLane].filter(d => !dronesBeingMovedIds.has(d.id));

    const movedDrones = dronesToMove.map(d => ({
        ...d,
        isExhausted: d.isExhausted || !effect.properties?.includes('DO_NOT_EXHAUST')
    }));
    tempState.dronesOnBoard[toLane].push(...movedDrones);

    addLogEntry({
        player: player1.name, actionType: 'MULTI_MOVE', source: card.name,
        target: `${dronesToMove.map(d => d.name).join(', ')}`,
        outcome: `Moved ${dronesToMove.length} drone(s) from ${fromLane} to ${toLane}.`
    }, 'resolveMultiMove');

    let finalPlayerState = tempState;
    movedDrones.forEach(movedDrone => {
        const { newState } = gameEngine.applyOnMoveEffects(finalPlayerState, movedDrone, fromLane, toLane, addLogEntry);
        finalPlayerState = newState;
    });

    finalPlayerState.dronesOnBoard = gameEngine.updateAuras(finalPlayerState, player2Ref.current, { player1: placedSections, player2: opponentPlacedSections });
    setPlayer1(finalPlayerState);

    setMultiSelectState(null);
    cancelCardSelection();
    endTurn('player1');
}, [player1, endTurn, gameEngine.updateAuras, addLogEntry, placedSections]);


// ---  FUNCTION for SINGLE_MOVE ---
const resolveSingleMove = useCallback((card, droneToMove, fromLane, toLane) => {
    const { cost, effect } = card;

    let tempState = JSON.parse(JSON.stringify(player1));
    tempState.energy -= cost;
    tempState.hand = tempState.hand.filter(c => c.instanceId !== card.instanceId);
    tempState.discardPile.push(card);

    tempState.dronesOnBoard[fromLane] = tempState.dronesOnBoard[fromLane].filter(d => d.id !== droneToMove.id);
    
    const movedDrone = {
        ...droneToMove,
        isExhausted: effect.properties?.includes('DO_NOT_EXHAUST') ? droneToMove.isExhausted : true
    };
    tempState.dronesOnBoard[toLane].push(movedDrone);

    addLogEntry({
        player: player1.name, actionType: 'MOVE', source: card.name,
        target: droneToMove.name,
        outcome: `Moved from ${fromLane} to ${toLane}.`
    }, 'resolveSingleMove');

    const { newState } = gameEngine.applyOnMoveEffects(tempState, movedDrone, fromLane, toLane, addLogEntry);
    newState.dronesOnBoard = gameEngine.updateAuras(newState, player2Ref.current, { player1: placedSections, player2: opponentPlacedSections });
    
    setPlayer1(newState);

    setMultiSelectState(null);
    cancelCardSelection();
    
    // This card has "goAgain: true", so we do NOT call endTurn()
}, [player1, addLogEntry, gameEngine.applyOnMoveEffects, gameEngine.updateAuras, placedSections, opponentPlacedSections]);


//--- END ABILITY/CARD LOGIC ---

const startOptionalDiscardPhase = () => {
    const p1Stats = player1EffectiveStats; // Use the memoized stats
    setOptionalDiscardCount(0);
    setTurnPhase('optionalDiscard');
    setModalContent({
        title: 'Optional Discard Phase',
        text: `You may discard up to ${p1Stats.totals.discardLimit} cards from your hand. Click a card to discard it, then press "Finish Discarding" when you are done.`,
        isBlocking: true
    });
  };

const handleFinishOptionalDiscard = () => {
    setModalContent(null);
    drawPlayerHand();
    proceedToShieldAllocation();
  };

  const handleConfirmOptionalDiscard = (card) => {
    addLogEntry({
        player: player1.name,
        actionType: 'DISCARD_OPTIONAL',
        source: card.name,
        target: 'N/A',
        outcome: `Optionally discarded ${card.name}.`
    }, 'handleConfirmOptionalDiscard');

    setPlayer1(prev => ({
        ...prev,
        hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
        discardPile: [...prev.discardPile, card]
    }));
    setOptionalDiscardCount(prev => prev + 1);
    setConfirmationModal(null);
  };

  const handleOptionalDiscardClick = (card) => {
    if (optionalDiscardCount >= player1EffectiveStats.totals.discardLimit) {
        setModalContent({
            title: "Discard Limit Reached",
            text: `You cannot discard any more cards this turn. Your limit is ${player1EffectiveStats.totals.discardLimit}.`,
            isBlocking: true
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
  // ==                         WIN CONDITION CHECK                         ==
  // =========================================================================
  useEffect(() => {
    if (winner) return;

    // Check if Player 1 has met the win condition against Player 2
    if (gameEngine.checkWinCondition(player2)) {
     setWinner('Player 1');
     setShowWinnerModal(true);
        addLogEntry({ player: 'SYSTEM', actionType: 'GAME_END', source: 'N/A', target: 'N/A', outcome: 'Player 1 wins!' }, 'winConditionEffect');
    // Check if Player 2 has met the win condition against Player 1
    } else if (gameEngine.checkWinCondition(player1)) {
     setWinner('Player 2');
     setShowWinnerModal(true);
        addLogEntry({ player: 'SYSTEM', actionType: 'GAME_END', source: 'N/A', target: 'N/A', outcome: `${player2.name} wins!` }, 'winConditionEffect');
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
    if (turnPhase === 'action' && selectedDrone && !selectedDrone.isExhausted) {
        const attackerLane = gameEngine.getLaneOfDrone(selectedDrone.id, player1);

        if (attackerLane) {
            const effectiveAttacker = gameEngine.calculateEffectiveStats(selectedDrone, attackerLane, player1, player2, { player1: placedSections, player2: opponentPlacedSections });
            
            const opponentsInLane = player2.dronesOnBoard[attackerLane] || [];
            
            const potential = opponentsInLane.filter(opponentDrone => {
                const effectiveInterceptor = gameEngine.calculateEffectiveStats(opponentDrone, attackerLane, player2, player1, { player1: placedSections, player2: opponentPlacedSections });
                return !opponentDrone.isExhausted &&
                       (effectiveInterceptor.speed > effectiveAttacker.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS'));
            }).map(d => d.id);
            
            setPotentialInterceptors(potential);
        } else {
            setPotentialInterceptors([]);
        }
    } else {
        setPotentialInterceptors([]);
    }
}, [selectedDrone, turnPhase, player1, player2, gameEngine.getLaneOfDrone, placedSections, opponentPlacedSections]);
 
  useEffect(() => {
   setHoveredTarget(null);
  }, [selectedDrone]);

  // This hook now ONLY handles showing/hiding the arrow and setting its start point.
  // It only runs when the selected drone changes, not on every mouse move.
  useEffect(() => {
    if (selectedDrone && !abilityMode && turnPhase === 'action') {
        const startPos = getElementCenter(droneRefs.current[selectedDrone.id]);
        if(startPos) {
            // Set state once to make the arrow visible and position its start point.
            setArrowState({ visible: true, start: startPos, end: { x: startPos.x, y: startPos.y } });
        }
    } else {
        // Set state once to hide the arrow.
        setArrowState(prev => ({ ...prev, visible: false }));
    }
  }, [selectedDrone, turnPhase, abilityMode]);

  // This hook handles updating the arrow's end position on every mouse move.
  // It does NOT set state, so it will not cause re-renders, fixing the animation bug.
  useEffect(() => {
    const handleMouseMove = (e) => {
        if (arrowState.visible && arrowLineRef.current && gameAreaRef.current) {
            const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
            const endX = e.clientX - gameAreaRect.left;
            const endY = e.clientY - gameAreaRect.top;

            // Directly update the line's end point attributes without causing a re-render
            arrowLineRef.current.setAttribute('x2', endX);
            arrowLineRef.current.setAttribute('y2', endY);
        }
    };

    const gameArea = gameAreaRef.current;
    gameArea?.addEventListener('mousemove', handleMouseMove);

    return () => {
        gameArea?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [arrowState.visible]); // This effect only re-runs when the arrow's visibility changes.

  // --- UI COMPONENTS ---
  const TargetingArrow = ({ visible, start, end, lineRef }) => {
    if (!visible) return null;
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-40">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
          refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ff0055" />
          </marker>
        </defs>
        <line ref={lineRef} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#ff0055" strokeWidth="4" markerEnd="url(#arrowhead)" strokeDasharray="10, 5" />
      </svg>
    );
  };

  const Explosion = ({ top, left }) => (
    <div className="explosion" style={{ top: `${top}px`, left: `${left}px` }}></div>
  );

  const StatHexagon = ({ value, isFlat, bgColor, textColor }) => (
    <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-black flex items-center justify-center`}>
      <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-[calc(100%-2px)] h-[calc(100%-2px)] ${bgColor} flex items-center justify-center text-xs font-bold font-orbitron ${textColor}`}>
        {value}
      </div>
    </div>
  );

  const CardStatHexagon = ({ value, isFlat, icon: Icon, iconColor, textColor = 'text-white' }) => (
    <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-black/60 flex items-center justify-center p-0.5`}>
        <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-slate-900/80 flex items-center justify-center`}>
            <div className={`flex items-center justify-center gap-1 font-bold ${textColor}`}>
                {Icon && <Icon size={12} className={iconColor} />}
                <span className="font-orbitron text-base">{value}</span>
            </div>
        </div>
    </div>
);

  const AbilityIcon = ({ onClick }) => (
    <button onClick={onClick} className="absolute top-5 -right-3.5 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center border-2 border-black/50 z-20 hover:bg-purple-500 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
    </button>
  );

const ShipAbilityIcon = ({ onClick, ability, isUsable }) => (
<button
onClick={onClick}
disabled={!isUsable}
className={`absolute top-1/2 -right-3.5 -translate-y-1/2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center border-2 border-black/50 z-20 transition-colors ${isUsable ? 'hover:bg-purple-500' : 'bg-gray-700 opacity-60 cursor-not-allowed'}`}
title={`${ability.name} - Cost: ${ability.cost.energy} Energy`}
>
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
</button>
);

  const DroneToken = ({ drone, onClick, isPlayer, isSelected, isSelectedForMove, isHit, isPotentialInterceptor, onMouseEnter, onMouseLeave, effectiveStats, onAbilityClick, isActionTarget }) => {
    const baseDrone = useMemo(() => fullDroneCollection.find(d => d.name === drone.name), [drone.name]);
    const { maxShields } = effectiveStats;
    const currentShields = drone.currentShields ?? maxShields;
    const activeAbilities = baseDrone.abilities.filter(a => a.type === 'ACTIVE');

    // --- Dynamic Class Calculation ---
    const borderColor = isPlayer ? 'border-cyan-400' : 'border-pink-500';
    const nameBgColor = isPlayer ? 'bg-cyan-900' : 'bg-pink-950';
    const nameTextColor = isPlayer ? 'text-cyan-100' : 'text-pink-100';
    const statBgColor = isPlayer ? 'bg-cyan-900' : 'bg-pink-950';
    const shieldColor = isPlayer ? 'text-cyan-400' : 'text-pink-500';
    const emptyShieldColor = isPlayer ? 'text-cyan-300 opacity-50' : 'text-pink-400 opacity-60';

    const isAttackBuffed = effectiveStats.attack > effectiveStats.baseAttack;
    const isAttackDebuffed = effectiveStats.attack < effectiveStats.baseAttack;
    const attackTextColor = isAttackBuffed ? 'text-green-400' : isAttackDebuffed ? 'text-red-400' : 'text-white';
    
    const isSpeedBuffed = effectiveStats.speed > effectiveStats.baseSpeed;
    const isSpeedDebuffed = effectiveStats.speed < effectiveStats.baseSpeed;
    const speedTextColor = isSpeedBuffed ? 'text-green-400' : isSpeedDebuffed ? 'text-red-400' : 'text-white';

    // --- State Effects ---
    const exhaustEffect = drone.isExhausted ? 'grayscale opacity-60' : '';
    const hitEffect = isHit ? 'animate-shake' : '';
    const selectedEffect = (isSelected || isSelectedForMove) ? 'scale-105 ring-2 ring-cyan-400 shadow-xl shadow-cyan-400/50' : '';
    const actionTargetEffect = isActionTarget ? 'scale-105 ring-2 ring-purple-400 shadow-xl shadow-purple-500/50 animate-pulse' : '';
    const mandatoryDestroyEffect = mandatoryAction?.type === 'destroy' && isPlayer ? 'ring-2 ring-red-500 animate-pulse' : '';

    const isAbilityUsable = (ability) => {
      if (drone.isExhausted && ability.cost.exhausts !== false) return false;
      if (ability.cost.energy && player1.energy < ability.cost.energy) return false;
      return true;
    };

    return (
      <div ref={el => droneRefs.current[drone.id] = el}
        onClick={(e) => onClick && onClick(e, drone, isPlayer)}
        onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
        className={`relative w-[90px] h-[135px] transition-all duration-200 ${exhaustEffect} ${hitEffect} ${selectedEffect} ${actionTargetEffect} ${mandatoryDestroyEffect}`}
      >
        {/* Main Token Body */}
        <div className={`relative w-full h-full rounded-lg shadow-lg border ${borderColor} cursor-pointer shadow-black overflow-hidden`}>
          <img src={drone.image} alt={drone.name} className="absolute inset-0 w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 h-full">
            <div className="absolute bottom-6 left-0 right-0 w-full flex flex-col gap-1 px-2">
              <div className="flex w-full justify-center gap-1 min-h-[12px]">
                {Array.from({ length: maxShields }).map((_, i) => (
                  i < currentShields 
                    ? <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={shieldColor}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                    : <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={emptyShieldColor}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                ))}
              </div>
              <div className="flex w-full justify-center gap-0.5">
                {Array.from({ length: baseDrone.hull }).map((_, i) => (
                  <div key={i} className={`h-2 w-2 rounded-sm ${i < drone.hull ? 'bg-green-500' : 'bg-gray-400'} border border-black/50`}></div>
                ))}
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-5 ${nameBgColor} flex items-center justify-center border-t ${borderColor}`}>
              <span className={`font-orbitron text-[8px] uppercase ${nameTextColor} tracking-wider w-full text-center`}>{drone.name}</span>
            </div>
          </div>
        </div>

        {/* Overlapping Hexagons */}
        <div className="absolute -top-3 left-[-14px] w-6 h-7 z-20">
            <StatHexagon value={effectiveStats.attack} isFlat={false} bgColor={statBgColor} textColor={attackTextColor} />
        </div>
        <div className={`absolute -top-3 right-[-14px] w-7 h-7 z-20 ${isPotentialInterceptor ? 'interceptor-glow' : ''}`}>
            <StatHexagon value={effectiveStats.speed} isFlat={true} bgColor={statBgColor} textColor={speedTextColor} />
        </div>

        {/* Overlapping Ability Icon */}
        {isPlayer && activeAbilities.length > 0 && isAbilityUsable(activeAbilities[0]) && (
            <AbilityIcon onClick={(e) => onAbilityClick && onAbilityClick(e, drone, activeAbilities[0])} />
        )}
      </div>
    );
  };

// --- MODAL FOR SELECTING UPGRADE TARGETS ---
const UpgradeSelectionModal = ({ selectionData, onConfirm, onCancel }) => {
    const { card, targets } = selectionData;
    const [selectedTarget, setSelectedTarget] = useState(null);

    return (
        <GamePhaseModal
            title={`Apply Upgrade: ${card.name}`}
            text="Select a drone type from your active pool to apply this permanent upgrade to."
            onClose={onCancel}
            maxWidthClass="max-w-4xl"
        >
            <div className="flex justify-center my-4">
                <ActionCard card={card} isPlayable={false} />
            </div>
            
            <div className="my-4 p-4 bg-black/20 rounded-lg max-h-64 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {targets.map(drone => (
                        <div
                            key={drone.id}
                            onClick={() => setSelectedTarget(drone)}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-4
                                ${selectedTarget?.id === drone.id ? 'bg-purple-700 border-purple-400' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}
                            `}
                        >
                            <img src={drone.image} alt={drone.name} className="w-12 h-12 rounded-md object-cover" />
                            <span className="font-semibold text-white">{drone.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
                <button 
                    onClick={onCancel} 
                    className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(card, selectedTarget)}
                    disabled={!selectedTarget}
                    className="bg-green-600 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed enabled:hover:bg-green-700"
                >
                    Confirm Upgrade
                </button>
            </div>
        </GamePhaseModal>
    );
};

// --- MODAL TO VIEW APPLIED UPGRADES ---
const ViewUpgradesModal = ({ modalData, onClose }) => {
    const { droneName, upgrades } = modalData;

    return (
        <GamePhaseModal
            title={`Applied Upgrades: ${droneName}`}
            text="The following permanent upgrades have been applied to this drone type."
            onClose={onClose}
        >
            <div className="my-4 p-2 bg-black/20 rounded-lg max-h-80 overflow-y-auto space-y-3">
                {upgrades.length > 0 ? (
                    upgrades.map(upgrade => (
                        <div key={upgrade.instanceId} className="bg-slate-800/70 p-3 rounded-lg border border-purple-500/50">
                            <h4 className="font-bold text-purple-300">{upgrade.name}</h4>
                            <p className="text-sm text-gray-400 mt-1">{upgrade.description}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 italic">No upgrades applied.</p>
                )}
            </div>
            <div className="flex justify-center mt-6">
                <button 
                    onClick={onClose} 
                    className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors"
                >
                    Close
                </button>
            </div>
        </GamePhaseModal>
    );
};

const DestroyUpgradeModal = ({ selectionData, onConfirm, onCancel }) => {
    const { card, targets: upgradedDrones, opponentState } = selectionData;
    const [selectedUpgrade, setSelectedUpgrade] = useState(null); // e.g., { droneName: 'Scout Drone', instanceId: '...' }

    return (
        <GamePhaseModal
            title={`System Sabotage`}
            text="Select an enemy upgrade to destroy. The upgrade will be permanently removed."
            onClose={onCancel}
            maxWidthClass="max-w-4xl"
        >
            <div className="my-4 p-2 bg-black/20 rounded-lg max-h-[60vh] overflow-y-auto space-y-4">
                {upgradedDrones.length > 0 ? (
                    upgradedDrones.map(drone => {
                        const upgradesOnThisDrone = opponentState.appliedUpgrades[drone.name] || [];
                        return (
                            <div key={drone.id} className="bg-slate-800/70 p-3 rounded-lg border border-pink-500/50">
                                <h4 className="font-bold text-pink-300 mb-2">Enemy: {drone.name}</h4>
                                <div className="space-y-2">
                                    {upgradesOnThisDrone.map(upgrade => (
                                        <div
                                            key={upgrade.instanceId}
                                            onClick={() => setSelectedUpgrade({ droneName: drone.name, instanceId: upgrade.instanceId })}
                                            className={`p-2 rounded-md border-2 transition-all cursor-pointer 
                                                ${selectedUpgrade?.instanceId === upgrade.instanceId 
                                                    ? 'bg-red-700 border-red-400' 
                                                    : 'bg-slate-900/50 border-slate-600 hover:bg-slate-700'}`
                                            }
                                        >
                                            <p className="font-semibold text-white">{upgrade.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-gray-500 italic">The opponent has no active upgrades to destroy.</p>
                )}
            </div>

            <div className="flex justify-center gap-4 mt-6">
                <button 
                    onClick={onCancel} 
                    className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:bg-gray-700 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(card, selectedUpgrade)}
                    disabled={!selectedUpgrade}
                    className="bg-red-600 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed enabled:hover:bg-red-700"
                >
                    Destroy Upgrade
                </button>
            </div>
        </GamePhaseModal>
    );
};

  const ShipSectionsDisplay = ({ player, playerEffectiveStats, isPlayer, placedSections, onSectionClick, onAbilityClick, onTargetClick, isInteractive, validCardTargets }) => {
    return (
      <div className="flex w-full justify-between gap-8">
        {[0, 1, 2].map((laneIndex) => {
          const sectionName = placedSections[laneIndex];
          if (!sectionName) {
            return <div key={laneIndex} className="flex-1 min-w-0 h-full bg-black/20 rounded-lg border-2 border-dashed border-gray-700"></div>;
          }
          
          const sectionStats = player.shipSections[sectionName];
          const isCardTarget = validCardTargets.some(t => t.id === sectionName);
          
          return (
            <div key={laneIndex} className="flex-1 min-w-0">
              <ShipSection
                section={sectionName}
                stats={sectionStats}
                effectiveStatsForDisplay={playerEffectiveStats.bySection[sectionName]}
                isPlayer={isPlayer}
                isOpponent={!isPlayer}
                onClick={() => {
                  if (isInteractive && onSectionClick) { // Specifically for shield allocation
                    onSectionClick(sectionName);
                  } else if (onTargetClick) { // For attacks and card/ability targeting
                    onTargetClick({ name: sectionName, ...sectionStats }, 'section', isPlayer);
                  }
                }}
                onAbilityClick={onAbilityClick}
                isInteractive={isInteractive || (turnPhase === 'action' && isPlayer && sectionStats.ability && player1.energy >= sectionStats.ability.cost.energy)}
                isCardTarget={isCardTarget}
                isInMiddleLane={laneIndex === 1}
                isHovered={hoveredTarget?.type === 'section' && hoveredTarget?.target.name === sectionName}
                onMouseEnter={() => !isPlayer && setHoveredTarget({ target: { name: sectionName, ...sectionStats }, type: 'section' })}
                onMouseLeave={() => !isPlayer && setHoveredTarget(null)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const DroneLanesDisplay = ({ player, isPlayer, onLaneClick }) => {
    return (
      <div className="flex w-full justify-between gap-8 h-[160px]">
        {['lane1', 'lane2', 'lane3'].map((lane) => {
          const owner = isPlayer ? 'player1' : 'player2';
          const isTargetable = (abilityMode && validAbilityTargets.some(t => t.id === lane && t.owner === owner)) ||
                               (selectedCard && validCardTargets.some(t => t.id === lane && t.owner === owner)) ||
                               (multiSelectState && validCardTargets.some(t => t.id === lane && t.owner === owner));
          
          const isInteractivePlayerLane = isPlayer && (turnPhase === 'deployment' || turnPhase === 'action');

          return (
            <div 
              key={lane} 
              onClick={(e) => onLaneClick(e, lane, isPlayer)}
              className={`flex-1 rounded-lg border-2 transition-all duration-200 p-2
                ${isTargetable ? 'border-purple-500 bg-purple-900/40 ring-2 ring-purple-400 animate-pulse' : 'border-gray-700/50 bg-black/20'} 
                ${isInteractivePlayerLane ? 'cursor-pointer hover:bg-cyan-900/50' : ''}
              `}
            >
              {renderDronesOnBoard(player.dronesOnBoard[lane], isPlayer, lane)}
            </div>
          );
        })}
      </div>
    );
  };


  const renderDronesOnBoard = (drones, isPlayer, lane) => {
    return (
      <div className="flex flex-wrap gap-8 pt-2 min-h-[100px] justify-center items-center">
       {drones.map((drone) => {
            const player = isPlayer ? player1 : player2;
            const opponent = isPlayer ? player2 : player1;
            const sections = isPlayer ? placedSections : opponentPlacedSections;
            const effectiveStats = gameEngine.calculateEffectiveStats(drone, lane, player, opponent, { player1: placedSections, player2: opponentPlacedSections });
            return (
                <DroneToken
                key={drone.id}
                drone={drone}
                effectiveStats={effectiveStats}
                isPlayer={isPlayer}
                onClick={handleTokenClick}
                onAbilityClick={handleAbilityIconClick}
                isSelected={selectedDrone && selectedDrone.id === drone.id}
                isSelectedForMove={multiSelectState?.phase === 'select_drones' && multiSelectState.selectedDrones.some(d => d.id === drone.id)}
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

  const GamePhaseModal = ({ title, text, onClose, children, maxWidthClass = 'max-w-lg' }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full ${maxWidthClass} relative`}>
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

  // MODAL FOR AI CARD PLAY ---
  const AICardPlayReportModal = ({ report, onClose }) => {
    if (!report) return null;
    const { card, targetName } = report;
  
    return (
      <GamePhaseModal title="AI Action: Card Played" text="" onClose={onClose}>
        <div className="flex flex-col items-center gap-4 mt-4">
            <p className="text-center text-lg text-gray-300">
                The opponent played <strong className="text-purple-400">{card.name}</strong>
                {targetName && <> on <strong className="text-cyan-400">{targetName}</strong></>}!
            </p>
            {/* Display the card that was played */}
            <div className="transform scale-75">
                <ActionCard card={card} isPlayable={false} />
            </div>
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
     maxWidthClass="max-w-3xl"
      >
        <div className="flex justify-around items-center my-4 p-4 bg-black/20 rounded-lg">
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-pink-400 mb-2">Attacker</h4>
           <DroneToken drone={attacker} isPlayer={false} effectiveStats={gameEngine.calculateEffectiveStats(attacker, lane, player2, player1, opponentPlacedSections)}/>
          </div>
          <div className="text-4xl font-bold text-gray-500">VS</div>
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-cyan-400 mb-2">Target</h4>
           {targetType === 'drone' ? (
             <DroneToken drone={target} isPlayer={true} effectiveStats={gameEngine.calculateEffectiveStats(target, lane, player1, player2, placedSections)} />

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
        <div className="flex flex-wrap justify-center gap-8 my-4">
         {interceptors.map(drone => (
           <DroneToken
             key={drone.id}
             drone={drone}
             isPlayer={true}
             onClick={() => onIntercept(drone)}
               effectiveStats={gameEngine.calculateEffectiveStats(drone, lane, player1, player2, placedSections)}
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

  const DroneCard = ({ drone, onClick, isSelectable, isSelected, deployedCount, ignoreDeployLimit = false, appliedUpgrades = [], isUpgradeTarget = false, onViewUpgrades }) => {
    // We need to recalculate the limit here for the UI display
    let effectiveLimit = drone.limit;
    appliedUpgrades.forEach(upg => { if (upg.mod.stat === 'limit') effectiveLimit += upg.mod.value; });

    const atLimit = deployedCount >= effectiveLimit;
    const isInteractive = isSelectable && (!atLimit || ignoreDeployLimit);
    const deploymentCost = drone.class;

    // --- Calculate effective stats and determine colors ---
    const effectiveCardStats = useMemo(() => {
        const stats = { attack: drone.attack, speed: drone.speed };
        appliedUpgrades.forEach(upg => {
            if (stats.hasOwnProperty(upg.mod.stat)) {
                stats[upg.mod.stat] += upg.mod.value;
            }
        });
        return stats;
    }, [drone, appliedUpgrades]);
    
    const isAttackBuffed = effectiveCardStats.attack > drone.attack;
    const isAttackDebuffed = effectiveCardStats.attack < drone.attack;
    const attackTextColor = isAttackBuffed ? 'text-green-400' : isAttackDebuffed ? 'text-red-400' : 'text-white';
    const isSpeedBuffed = effectiveCardStats.speed > drone.speed;
    const isSpeedDebuffed = effectiveCardStats.speed < drone.speed;
    const speedTextColor = isSpeedBuffed ? 'text-green-400' : isSpeedDebuffed ? 'text-red-400' : 'text-white';
    const isLimitBuffed = effectiveLimit > drone.limit;
    const limitTextColor = isLimitBuffed ? 'text-green-400' : 'text-white';
    const { name, image, attack, hull, shields, speed, abilities } = drone;
    
    return (
      <div
      onClick={isInteractive ? () => onClick(drone) : undefined}
      className={`
        w-60 h-[320px] rounded-lg p-[2px] relative group
        transition-all duration-200
       ${isInteractive ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isSelected ? 'bg-cyan-400' : 'bg-cyan-800/80'}
       ${!isInteractive ? 'opacity-60' : ''}
       ${isUpgradeTarget ? 'ring-4 ring-purple-500 animate-pulse' : ''}
      `}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
      >
    <div
        className={`
            w-full h-full relative flex flex-col font-orbitron text-cyan-300 overflow-hidden
        `}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
    >
        {/* 1. Image takes up all of the background */}
        <img src={image} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Wrapper for all content on top of the image */}
        <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="text-center py-1 px-3 bg-black/40 flex-shrink-0 h-8 flex items-center justify-center">
                <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap text-white" />
            </div>

            {/* Repositioned Stats */}
            <div className="flex justify-between items-center px-2 flex-shrink-0 mt-2 h-12">
                {/* Attack Hexagon */}
                <div className="w-10 h-12">
                    <CardStatHexagon value={effectiveCardStats.attack} isFlat={false} icon={Sword} iconColor="text-red-400" textColor={attackTextColor} />
                </div>

                {/* Center Hull and Shields */}
                <div className="flex flex-col items-center gap-1">
                    <div className="flex w-full justify-center gap-1.5 min-h-[12px]">
                        {shields > 0 && Array.from({ length: shields }).map((_, i) => (
                            <svg key={`shield-${i}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-300"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                        ))}
                    </div>
                    <div className="flex w-full justify-center gap-1">
                        {Array.from({ length: hull }).map((_, i) => (
                            <div key={`hull-${i}`} className="h-3 w-3 rounded-sm bg-green-500 border border-black/50"></div>
                        ))}
                    </div>
                </div>

                {/* Speed Hexagon */}
                <div className="w-12 h-12">
                    <CardStatHexagon value={effectiveCardStats.speed} isFlat={true} icon={Rocket} iconColor="text-blue-400" textColor={speedTextColor} />
                </div>
            </div>

            {/* Resized, semi-transparent abilities box */}
            <div className="mx-2 mt-auto mb-2 max-h-40 bg-black/60 backdrop-blur-sm border border-cyan-800/70 p-2 flex flex-col space-y-2 overflow-y-auto rounded-md">
                {abilities && abilities.length > 0 ? (
                    abilities.map((ability, index) => (
                        <div key={index}>
                            <h4 className="text-xs text-purple-400 tracking-wider font-bold">{ability.name}</h4>
                            <p className="text-gray-400 text-xs leading-tight font-exo">{ability.description}</p>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-cyan-700 italic opacity-70">[ No Abilities ]</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="grid grid-cols-3 items-center p-1 border-t border-cyan-800/70 flex-shrink-0 h-12">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-400">Cost</span>
                    <div className="flex items-center">
                        <Bolt size={14} className="text-yellow-300"/>
                        <span className="text-white font-bold text-base ml-1">{deploymentCost}</span>
                    </div>
                </div>

                {/* --- NEW UPGRADE COUNTER --- */}
                  {drone.upgradeSlots > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevents the main card onClick from firing
                            if (onViewUpgrades) onViewUpgrades(drone, appliedUpgrades);
                        }}
                        className="flex flex-col items-center cursor-pointer group"
                    >
                        <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors">Upgrades</span>
                        <div className="flex items-center">
                            <span className="font-bold text-base text-purple-400">
                                {appliedUpgrades.length}/{drone.upgradeSlots}
                            </span>
                        </div>
                    </button>
                )}

                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-400">Deployed</span>
                    <div className="flex items-center">
                        <span className={`font-bold text-base ${atLimit ? 'text-pink-500' : limitTextColor}`}>
                            {deployedCount}/{effectiveLimit}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
);
  };

  const ShipSection = ({ section, stats, effectiveStatsForDisplay, isPlayer, isPlaceholder, onClick, onAbilityClick, isInteractive, isOpponent, isHovered, onMouseEnter, onMouseLeave, isCardTarget, isInMiddleLane }) => {
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
    
    const sectionStatus = gameEngine.getShipStatus(stats);
    
    const overlayColor = sectionStatus === 'critical' ? 'bg-red-900/60' : sectionStatus === 'damaged' ? 'bg-yellow-900/50' : 'bg-black/60';
    const borderColor = sectionStatus === 'critical' ? 'border-red-500' : sectionStatus === 'damaged' ? 'border-yellow-500' : (isOpponent ? 'border-pink-500' : 'border-cyan-500');
    const shadowColor = isOpponent ? 'shadow-pink-500/20' : 'shadow-cyan-500/20';
    const hoverEffect = isHovered ? 'scale-105 shadow-xl' : 'hover:scale-105';

    const cardTargetEffect = isCardTarget ? 'ring-4 ring-purple-400 shadow-lg shadow-purple-400/50 animate-pulse' : '';
    const sectionName = section === 'droneControlHub' ? 'Drone Control Hub' : section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    const backgroundImageStyle = {
      backgroundImage: `url(${stats.image})`,
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
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
        style={backgroundImageStyle}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className={`absolute inset-0 ${overlayColor}`}></div>
        
        <div className="relative z-10 flex flex-col items-center p-4 h-full">
            <div className={`absolute top-2 right-2 flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${sectionStatus === 'healthy' ? 'bg-green-500/20 text-green-300' : sectionStatus === 'damaged' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                {sectionStatus.charAt(0).toUpperCase() + sectionStatus.slice(1)}
            </div>
          
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="font-bold text-lg text-white">{sectionName}</p>
              <p className="text-xs text-gray-400 italic max-w-[200px]">{stats.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full items-center mt-auto">
              <div className="flex flex-col items-start text-sm text-gray-300">
                {effectiveStatsForDisplay && Object.entries(effectiveStatsForDisplay).map(([key, value]) => {
                  const isBoosted = isInMiddleLane && stats.middleLaneBonus && stats.middleLaneBonus[key];
                  return (
                      <span key={key} className="flex items-center text-xs">
                          <span className="font-semibold mr-1">{key}:</span>
                          <span className={isBoosted ? 'text-green-400 font-bold' : ''}>{value}</span>
                      </span>
                  );
                })}
              </div>

              <div className="flex flex-col items-center">
                <div className="flex gap-1 items-center mb-2">
                  {Array(stats.shields).fill(0).map((_, i) => (
                    <div key={i}>
                      {i < stats.allocatedShields 
                        ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-300"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                      }
                    </div>
                  ))}
                </div>
                <div className="flex w-full justify-center gap-1">
                  {Array.from({ length: stats.maxHull }).map((_, i) => {
                      const hullPoint = i + 1;
                      const { critical, damaged } = stats.thresholds;
                      let thresholdColor;
                      if (hullPoint <= critical) {
                          thresholdColor = 'bg-red-500';
                      } else if (hullPoint <= damaged) {
                          thresholdColor = 'bg-orange-500';
                      } else {
                          thresholdColor = 'bg-green-500';
                      }
                      const isFilled = i < stats.hull;
                      return (
                        <div key={i} className={`h-4 w-4 rounded-sm ${isFilled ? thresholdColor : 'bg-gray-400'} border border-black/50`}></div>
                      );
                  })}
                </div>
              </div>
              
              {/* --- THIS IS THE UPDATED SECTION --- */}
              <div className="relative flex flex-col items-center justify-center h-full pl-4 text-center">
                {isPlayer && stats.ability && (
                  <>
                    <h4 className="font-bold text-sm text-purple-300 leading-tight">{stats.ability.name}</h4>
                    <p className="text-xs text-gray-400 leading-tight mt-1">{stats.ability.description}</p>
                    <ShipAbilityIcon 
                      ability={stats.ability}
                      isUsable={
                        turnPhase === 'action' && 
                        currentPlayer === 'player1' && 
                        !passInfo.player1Passed &&
                        player1.energy >= stats.ability.cost.energy
                      }
                      onClick={(e) => onAbilityClick(e, {name: section, ...stats}, stats.ability)}
                    />
                  </>
                )}
              </div>
            </div>
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
    w-52 h-72 rounded-lg p-1 relative group transition-all duration-200 flex-shrink-0
          ${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed'}
          ${isSelected ? 'bg-purple-400' : 'bg-purple-800/80'}
            ${!isPlayable && !isMandatoryTarget ? 'grayscale' : ''}
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

  const AIDecisionLogModal = ({ decisionLog, onClose }) => {
    if (!decisionLog) return null;

    // Helper to format the target display
    const formatTarget = (action) => {
      // Handle new, simpler deployment logs
      if (action.type === 'deploy' || !action.target) {
        return action.targetName;
      }

      // Handle attack display format
      if (action.type === 'attack') {
        const formattedName = action.target.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `${formattedName} (Lane ${action.attacker.lane.slice(-1)})`;
      }
      
      // Handle existing action logs
      const ownerPrefix = action.target.owner === 'player1' ? 'Player' : 'AI';
      if (String(action.target.id).startsWith('lane')) {
        return `${ownerPrefix} Lane ${action.target.id.slice(-1)}`;
      }
      return `${ownerPrefix}: ${action.targetName}`;
    };

    return (
      <GamePhaseModal
        title="AI Decision Matrix"
        text="This log shows all actions the AI considered for its turn, the score it assigned, and the logic behind that score."
        onClose={onClose}
        maxWidthClass="max-w-7xl" // Make the modal wider
      >
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="p-2">Type</th>
                <th className="p-2">Instigator</th>
                <th className="p-2">Target</th>
                <th className="p-2 w-1/3">Logic Breakdown</th>
                <th className="p-2">Score</th>
                <th className="p-2">Chosen</th>
              </tr>
            </thead>
            <tbody>
              {decisionLog.sort((a,b) => b.score - a.score).map((action, index) => (
                <tr key={index} className={`border-b border-gray-700/50 ${action.isChosen ? 'bg-purple-900/50' : 'hover:bg-slate-700/50'}`}>
                  <td className="p-2 capitalize">{action.type ? action.type.replace('_', ' ') : 'Deploy'}</td>
                  <td className="p-2 text-purple-300">{action.instigator}</td>
                  <td className="p-2 text-cyan-300">{formatTarget(action)}</td>
                  <td className="p-2 text-gray-400 text-xs">{action.logic.join(' -> ')}</td>
                  <td className="p-2 font-bold text-lg">{action.score}</td>
                  <td className="p-2 text-center">{action.isChosen && <span className="text-yellow-400">✔</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
            Close
          </button>
        </div>
      </GamePhaseModal>
    );
  };
  
const beginTurnProcedures = () => {
    setModalContent(null); // Close the 'Start of Turn' modal
    const p1Stats = player1EffectiveStats.totals;
    const p2Stats = player2EffectiveStats.totals;

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
  };

  const handleStartNewRound = () => {
    setShowRoundEndModal(false);
    addLogEntry({ player: 'SYSTEM', actionType: 'NEW_ROUND', source: `Round ${turn + 1}`, target: 'N/A', outcome: 'New round begins.' }, 'startNewRound');
    setSelectedCard(null);
    setSelectedDrone(null);
    setAbilityMode(null);
    setMultiSelectState(null);
    setFirstPasserOfPreviousRound(passInfo.firstPasser);
    setTurn(prev => prev + 1);
    setPassInfo({ firstPasser: null, player1Passed: false, player2Passed: false });
    
    const readyDronesAndRestoreShields = (playerState) => {
        const newDronesOnBoard = { ...playerState.dronesOnBoard };
        for (const lane in newDronesOnBoard) {
           newDronesOnBoard[lane] = newDronesOnBoard[lane].map(drone => {
                // IMPORTANT: Pass all required arguments to calculate stats correctly
                const player = playerState.name === 'Player 1' ? player1Ref.current : player2Ref.current;
                const opponent = playerState.name === 'Player 1' ? player2Ref.current : player1Ref.current;
                const sections = playerState.name === 'Player 1' ? placedSections : opponentPlacedSections;
                const effectiveStats = gameEngine.calculateEffectiveStats(drone, lane, player, opponent, { player1: placedSections, player2: opponentPlacedSections });

                return {
                    ...drone,
                    // Filter statMods to remove temporary effects
                    statMods: drone.statMods ? drone.statMods.filter(mod => mod.type === 'permanent') : [],
                    isExhausted: false,
                    currentShields: effectiveStats.maxShields,
                };
            });
        }
        return { ...playerState, dronesOnBoard: newDronesOnBoard };
    };

    // --- FIX: Use the correct variable names for stats ---
    setPlayer1(prev => readyDronesAndRestoreShields({
      ...prev,
      energy: player1EffectiveStats.totals.energyPerTurn,
      initialDeploymentBudget: 0,
      deploymentBudget: player1EffectiveStats.totals.deploymentBudget
    }));

    setPlayer2(prev => {
        const readiedState = readyDronesAndRestoreShields({
           ...prev,
           energy: player2EffectiveStats.totals.energyPerTurn,
           initialDeploymentBudget: 0,
           deploymentBudget: player2EffectiveStats.totals.deploymentBudget
        });

        let newDeck = [...readiedState.deck];
        let newHand = [...readiedState.hand];
        let newDiscard = [...readiedState.discardPile];
        const handSize = player2EffectiveStats.totals.handLimit;

        while (newHand.length < handSize) {
            if (newDeck.length === 0) {
                if (newDiscard.length > 0) {
                    newDeck = [...newDiscard].sort(() => 0.5 - Math.random());
                    newDiscard = [];
                } else {
                    break;
                }
            }
            newHand.push(newDeck.pop());
        }
        return { ...readiedState, deck: newDeck, hand: newHand, discardPile: newDiscard };
    });

    // --- MODIFIED: Show a modal before starting the discard phases ---
    setModalContent({
        title: 'Start of a New Round',
        text: 'The new round has begun. You will now resolve any mandatory discards, followed by an optional discard phase. Afterwards, you will automatically draw cards to your hand limit.', 
        onClose: beginTurnProcedures,
        isBlocking: true,
        children: (
          <div className="flex justify-center mt-6">
            <button onClick={beginTurnProcedures} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
              Begin
            </button>
          </div>
        )
    });
    setAiActionCount(0);
  };

  const handlePostDiscardAction = () => {
    const p2Stats = gameEngine.calculateEffectiveShipStats(player2, opponentPlacedSections).totals;
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

    const firstPlayerIsOverLimit = totalPlayer1Drones > player1EffectiveStats.totals.cpuLimit;
    const secondPlayerIsOverLimit = totalPlayer2Drones > player2EffectiveStats.totals.cpuLimit;
    const checkOrder = firstPlayerOfRound === 'player1' ? ['player1', 'player2'] : ['player2', 'player1'];
//

    const resolvePlayerCompliance = (player) => {
      if (player === 'player1') {
        if (firstPlayerIsOverLimit) {
         setMandatoryAction({
            type: 'destroy',
            player: 'player1',
            count: totalPlayer1Drones - player1EffectiveStats.totals.cpuLimit,
          });
         setShowMandatoryActionModal(true);
          return true;
        }
      } else {
        if (secondPlayerIsOverLimit) {
           setPlayer2(p2 => {
                let newP2 = {...p2};
                let dronesToDestroyCount = Object.values(p2.dronesOnBoard).flat().length - player2EffectiveStats.totals.cpuLimit;
                for (let i = 0; i < dronesToDestroyCount; i++) {
                    const allDrones = Object.entries(newP2.dronesOnBoard).flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));
                    if (allDrones.length === 0) break;

                    const lowestClass = Math.min(...allDrones.map(d => d.class));
                    const candidates = allDrones.filter(d => d.class === lowestClass);
                    const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];
                    
                    newP2.dronesOnBoard[droneToDestroy.lane] = newP2.dronesOnBoard[droneToDestroy.lane].filter(d => d.id !== droneToDestroy.id);
                    const onDestroyUpdates = gameEngine.onDroneDestroyed(newP2, droneToDestroy);
                    Object.assign(newP2, onDestroyUpdates);
                }
                newP2.dronesOnBoard = gameEngine.updateAuras(newP2, player1Ref.current, opponentPlacedSections);
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

useEffect(() => {
    const isAiTurn = currentPlayer === 'player2' && (!modalContent || !modalContent.isBlocking) && !winner && !aiActionReport && !aiCardPlayReport && !pendingAttack && !playerInterceptionChoice && !mandatoryAction && !showFirstPlayerModal && !showActionPhaseStartModal && !showRoundEndModal;
    if (!isAiTurn) return;

    let aiTurnTimer;

    const executeAiTurn = () => {
      let result;
if (turnPhase === 'deployment' && !passInfo.player2Passed) {
  result = aiBrain.handleOpponentTurn({
    player1, 
    player2, 
    turn, 
    opponentPlacedSections, 
    placedSections,
    getShipStatus: gameEngine.getShipStatus,
    calculateEffectiveShipStats: gameEngine.calculateEffectiveShipStats,
    calculateEffectiveStats: gameEngine.calculateEffectiveStats,
    addLogEntry
    
  });
} else if (turnPhase === 'action' && !passInfo.player2Passed) {
    result = aiBrain.handleOpponentAction({
    player1, player2, placedSections, opponentPlacedSections,
    getShipStatus: gameEngine.getShipStatus, 
    getLaneOfDrone: gameEngine.getLaneOfDrone, 
    getValidTargets: gameEngine.getValidTargets,
    calculateEffectiveStats: gameEngine.calculateEffectiveStats,
    addLogEntry
  });
}

      if (!result) return; // Exit if no action was decided

      if (result.type === 'pass') {
        setPassInfo(prev => {
          const wasFirstToPass = !prev.player1Passed;
          const newPassInfo = { ...prev, player2Passed: true, firstPasser: prev.firstPasser || (wasFirstToPass ? 'player2' : null) };
          if (newPassInfo.player1Passed) {
            if (turnPhase === 'deployment') endDeploymentPhase();
            else if (turnPhase === 'action') endActionPhase();
          } else {
            endTurn('player2');
          }
          return newPassInfo;
        });
      } else if (result.type === 'deploy') {
        const { droneToDeploy, targetLane, logContext } = result.payload;
        addLogEntry({ player: player2.name, actionType: 'DEPLOY', source: droneToDeploy.name, target: targetLane, outcome: `Deployed to ${targetLane}.` }, 'aiDeploymentDeploy', logContext);

        const droneCost = droneToDeploy.class;
        let budgetCost = 0;
        if (turn === 1) {
          budgetCost = Math.min(player2.initialDeploymentBudget, droneCost);
        } else {
          budgetCost = Math.min(player2.deploymentBudget, droneCost);
        }
        const energyCost = droneCost - budgetCost;

        setPlayer2(prev => {
          const baseDrone = fullDroneCollection.find(d => d.name === droneToDeploy.name);
          const newDrone = {
            ...droneToDeploy, id: Date.now(), statMods: [],
            currentShields: baseDrone.shields, currentMaxShields: baseDrone.shields,
            hull: baseDrone.hull, isExhausted: false,
          };
          let newPlayerState = {
            ...prev,
            dronesOnBoard: { ...prev.dronesOnBoard, [targetLane]: [...prev.dronesOnBoard[targetLane], newDrone] },
            deployedDroneCounts: { ...prev.deployedDroneCounts, [droneToDeploy.name]: (prev.deployedDroneCounts[droneToDeploy.name] || 0) + 1 },
            initialDeploymentBudget: turn === 1 ? prev.initialDeploymentBudget - budgetCost : prev.initialDeploymentBudget,
            deploymentBudget: turn > 1 ? prev.deploymentBudget - budgetCost : prev.deploymentBudget,
            energy: prev.energy - energyCost
          };
          newPlayerState.dronesOnBoard = gameEngine.updateAuras(newPlayerState, player1Ref.current, { player1: placedSections, player2: opponentPlacedSections });
          return newPlayerState;
        });
        endTurn('player2');

      } else if (result.type === 'action') {
        const chosenAction = result.payload;
        const { logContext } = result;
        switch (chosenAction.type) {
          case 'play_card':
            resolveCardPlay(chosenAction.card, chosenAction.target, 'player2', logContext);
            break;
          case 'attack':
            setPendingAttack({
              attacker: chosenAction.attacker,
              target: chosenAction.target,
              targetType: chosenAction.targetType,
              lane: chosenAction.attacker.lane,
              attackingPlayer: 'player2',
              aiContext: logContext,
            });
            break;
          case 'move': {
            const { drone, fromLane, toLane } = chosenAction;
            addLogEntry({ player: player2.name, actionType: 'MOVE', source: drone.name, target: toLane, outcome: `Moved from ${fromLane} to ${toLane}.` }, 'aiActionMove', logContext);
            let tempState = JSON.parse(JSON.stringify(player2));
            tempState.dronesOnBoard[fromLane] = tempState.dronesOnBoard[fromLane].filter(d => d.id !== drone.id);
            const movedDrone = { ...drone, isExhausted: true };
            tempState.dronesOnBoard[toLane].push(movedDrone);
            const { newState: stateAfterMove } = gameEngine.applyOnMoveEffects(tempState, movedDrone, fromLane, toLane, addLogEntry);
            stateAfterMove.dronesOnBoard = gameEngine.updateAuras(stateAfterMove, player1Ref.current, { player1: placedSections, player2: opponentPlacedSections });
            setPlayer2(stateAfterMove);
            break;
          }
          default:
            endTurn('player2');
            break;
        }
      }
    };

    aiTurnTimer = setTimeout(executeAiTurn, 1500);

    return () => {
      clearTimeout(aiTurnTimer);
    };
  }, [currentPlayer, turnPhase, passInfo, winner, aiActionTrigger, aiActionReport, aiCardPlayReport, pendingAttack, playerInterceptionChoice, mandatoryAction, modalContent, showFirstPlayerModal, showActionPhaseStartModal, showRoundEndModal]);

  const handleReset = () => {
   setTurnPhase('preGame');
   setTurn(1);
   setPlacedSections([]);
   setOpponentPlacedSections([]);
   setPlayer1(gameEngine.initialPlayerState('Player 1', startingDecklist));
   setPlayer2(gameEngine.initialPlayerState('Player 2', startingDecklist));
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
   setSelectedCard(null);
   setValidCardTargets([]);
   setCardConfirmation(null);
   setGameLog([]);
   setShowWinnerModal(false);
  };

 const handleSelectOpponent = (selectedAI) => {
    // 1. Set up the opponent (Player 2) with the selected AI's data
    setPlayer2(prev => {
      // Find the full drone objects from the collection based on the names in the AI's pool
      const aiDrones = fullDroneCollection.filter(d => selectedAI.dronePool.includes(d.name));
      
      // Initialize the drone counts for the AI's specific pool
      const aiInitialCounts = {};
      aiDrones.forEach(drone => {
        aiInitialCounts[drone.name] = 0;
      });

      // Return a new state for Player 2, keeping the base state but overriding the key parts
      return {
        ...gameEngine.initialPlayerState(selectedAI.name, selectedAI.decklist), // Use AI's name and decklist
        activeDronePool: aiDrones,
        deployedDroneCounts: aiInitialCounts,
      };
 });
    // 2. Standard game start procedure
    setTurnPhase('droneSelection'); // CHANGED: This now sends you to drone selection.
    // Randomly place the opponent's ship sections
    const sections = Object.keys(player2.shipSections);
    const shuffledSections = sections.sort(() => 0.5 - Math.random());
    setOpponentPlacedSections(shuffledSections);
    
    // 3. Set the initial modal message for the player
    setModalContent({
        title: 'Phase 2: Choose Your Drones', // CHANGED: Updated title for the modal.
        text: 'Select 5 drones from your full collection to add to your Active Drone Pool. These are the drones you can launch during the game. Once you have made your selection, click "Confirm Selection".', // CHANGED: Updated instructions.
        isBlocking: true
    });
    
    // ADDED: This code prepares the drones for the selection screen. It was previously in handlePlaceSection.
    const initialPool = [...fullDroneCollection].sort(() => 0.5 - Math.random());
    const firstPair = initialPool.slice(0, 2);
    const remaining = initialPool.slice(2);
    
    setDroneSelectionPair(firstPair);
    setDroneSelectionPool(remaining);
    setTempSelectedDrones([]);
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
            text: "It's your turn to act. Select a drone to move or attack, play a card, or use an ability.",
            isBlocking: true
        });
} else {
 setModalContent({
        title: "Opponent's Turn",
        text: "The AI is taking its turn.",
        isBlocking: false
    });
}
  };
  
 // Helper function to draw cards for the player ---
  const drawPlayerHand = () => {
    setPlayer1(prev => {
      const effectiveStats = gameEngine.calculateEffectiveShipStats(prev, placedSections).totals;
      let newDeck = [...prev.deck];
      let newHand = [...prev.hand];
      let newDiscardPile = [...prev.discardPile];
      const handSize = effectiveStats.handLimit;

      while (newHand.length < handSize) {
        if (newDeck.length === 0) {
          if (newDiscardPile.length > 0) {
            newDeck = [...newDiscardPile].sort(() => 0.5 - Math.random());
            newDiscardPile = [];
          } else {
            break;
          }
        }
        const drawnCard = newDeck.pop();
        newHand.push(drawnCard);
      }
      return { ...prev, deck: newDeck, hand: newHand, discardPile: newDiscardPile };
    });
  };

  // Helper function to proceed to the first turn of the game ---
  const proceedToFirstTurn = () => {
    const determineFirstPlayer = () => {
        if (firstPlayerOverride) {
           setFirstPlayerOverride(null);
            return firstPlayerOverride;
        }
        if (turn === 1) {
            return Math.random() < 0.5 ? 'player1' : 'player2';
        }
        return firstPasserOfPreviousRound || 'player1';
    };

    const firstPlayer = determineFirstPlayer();
    setCurrentPlayer(firstPlayer);
    setFirstPlayerOfRound(firstPlayer);
    setShowFirstPlayerModal(true);
  };

  // Helper function to proceed to the shield allocation phase ---
  const proceedToShieldAllocation = () => {
    setSelectedCard(null);
    setSelectedDrone(null);
    setAbilityMode(null);
    const shieldsPerTurn = player1EffectiveStats.totals.shieldsPerTurn;
    setShieldsToAllocate(shieldsPerTurn);
    setInitialShieldAllocation(JSON.parse(JSON.stringify(player1.shipSections)));
    setTurnPhase('allocateShields');
    setModalContent({
        title: 'Phase: Restore Shields',
        text: `You have ${shieldsPerTurn} shields to restore. Click on any of your damaged ship sections to add a shield. When finished, click "End Allocation" to continue.`,
        isBlocking: true
    });
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
      // This is the final placement. Now we start the game.
      // 1. Draw the opponent's starting hand.
      setPlayer2(prev => {
      let newDeck = [...prev.deck];
      let newHand = [];
      const handSize = gameEngine.calculateEffectiveShipStats(prev, opponentPlacedSections).totals.handLimit;

      for (let i = 0; i < handSize; i++) {
          if (newDeck.length > 0) {
            newHand.push(newDeck.pop());
          } else {
              break;
          }
        }
        return { ...prev, deck: newDeck, hand: newHand };
      });
  
      // 2. Draw the player's starting hand.
      drawPlayerHand();
      setTurnPhase('initialDraw');
      
      // 3. Show a modal and then determine the first player.
      const proceed = () => {
          setModalContent(null);
          proceedToFirstTurn();
      };
  
      setModalContent({
          title: 'Start of Turn: Cards Drawn',
          text: 'You have automatically drawn up to your hand limit. The first player will now be determined.',
          onClose: proceed,
          isBlocking: true, 
          children: (
            <div className="flex justify-center mt-6">
              <button onClick={proceed} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
                Continue
              </button>
            </div>
          )
      });
    } else {
        // If it's not the last section, clear the modal so the next one can appear.
        setModalContent(null);
    }
  };

    const handleAllocateShield = (sectionName) => {
    const section = player1.shipSections[sectionName];
    const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, player1, placedSections);
    if (shieldsToAllocate > 0 && section.allocatedShields < effectiveMaxShields) {
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
   setShieldsToAllocate(player1EffectiveStats.totals.shieldsPerTurn);
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
            text: `Select a drone and a lane to deploy it. Drones cost ${deploymentResource} this turn. Or, click "Pass" to end your deployment for this phase.`,
            isBlocking: true
        });
} else {
 setModalContent({
        title: "Opponent's Turn",
        text: "The AI is deploying a drone. Wait for its turn to complete.",
        isBlocking: false
    });
}
  };

  const handleConfirmDroneSelection = (selectedDrones) => {
        const droneNames = selectedDrones.map(d => d.name).join(', ');
    addLogEntry({
        player: 'SYSTEM',
        actionType: 'DRONE_SELECTION',
        source: 'Player Setup',
        target: 'N/A',
        outcome: `Player selected drones: ${droneNames}.`
    }, 'handleConfirmDroneSelection');
    const initialCounts = {};
    selectedDrones.forEach(drone => {
        initialCounts[drone.name] = 0;
    });
    setPlayer1(prev => ({ ...prev, activeDronePool: selectedDrones, deployedDroneCounts: initialCounts }));

    // REMOVED: All the logic that starts the game (drawing hands, etc.) has been taken out.
    // We will move this logic to a later step.

    // CHANGED: Transition to the new deck selection phase instead of starting the game.
    setTurnPhase('deckSelection');
    setModalContent(null); // Close the drone selection modal
  };

   const handleDeckChoice = (choice) => {
    if (choice === 'standard') {
        addLogEntry({ player: 'SYSTEM', actionType: 'DECK_SELECTION', source: 'Player Setup', target: 'N/A', outcome: 'Player selected the Standard Deck.' }, 'handleDeckChoice');
      // The player's deck is already the standard deck by default.
      // We just transition to the next phase: ship placement.
      setTurnPhase('placement');
      setModalContent({
        title: 'Phase 3: Place Your Ship Sections',
        text: 'Now, place your ship sections in order: Bridge, Power Cell, then Drone Control Hub. The middle lane provides a strategic bonus to whichever section is placed there.',
        isBlocking: true,
      });
    } else if (choice === 'custom') {
      // This will now switch to the deck builder screen.
      setTurnPhase('deckBuilding');
    }
  };

    const handleDeckChange = (cardId, quantity) => {
    setDeck(prevDeck => {
      const newDeck = { ...prevDeck };
      if (quantity === 0) {
        // If the quantity is set to 0, remove the card from the deck object
        delete newDeck[cardId];
      } else {
        newDeck[cardId] = quantity;
      }
      return newDeck;
    });
  };

  const handleConfirmDeck = () => {
    // ADD THIS BLOCK
    const deckContents = Object.entries(deck)
      .map(([cardId, quantity]) => {
          const cardName = fullCardCollection.find(c => c.id === cardId)?.name || cardId;
          return `${cardName} x${quantity}`;
      })
      .join(', ');

    addLogEntry({
        player: 'SYSTEM',
        actionType: 'DECK_SELECTION',
        source: 'Player Setup',
        target: 'N/A',
        outcome: `Custom deck confirmed with cards: ${deckContents}.`
    }, 'handleConfirmDeck');
    // The 'deck' state has been updated by handleDeckChange, so we can use it directly
    const decklist = Object.entries(deck).map(([id, quantity]) => ({ id, quantity }));

    // Use our existing helper to build the final, shuffled deck
    const newPlayerDeck = gameEngine.buildDeckFromList(decklist);

    // Update Player 1's state with the new custom deck
    setPlayer1(prev => ({
      ...prev,
      deck: newPlayerDeck
    }));

    // Proceed to the next phase: ship placement
    setTurnPhase('placement');
    setModalContent({
      title: 'Phase 4: Place Your Ship Sections',
      text: 'Your custom deck is ready. Now, place your ship sections to begin. The middle lane will grant an additional bonus to the section you place there.',
      isBlocking: true,
    });
  };

  // --- ADD THIS NEW FUNCTION ---
  const handleImportDeck = (deckCode) => {
    try {
      const newDeck = {};
      const baseCardCounts = {};
      
      // 1. Parse the deck code string
      const entries = deckCode.split(',').filter(Boolean);
      for (const entry of entries) {
        const [cardId, quantityStr] = entry.split(':');
        const quantity = parseInt(quantityStr, 10);

        // 2. Validate the entry
        const cardTemplate = fullCardCollection.find(c => c.id === cardId);
        if (!cardTemplate || isNaN(quantity) || quantity <= 0 || quantity > cardTemplate.maxInDeck) {
          throw new Error(`Invalid entry for card "${cardId}".`);
        }
        
        // 3. Store the card and quantity
        newDeck[cardId] = quantity;

        // 4. Track counts for variants
        const baseId = cardTemplate.baseCardId;
        baseCardCounts[baseId] = (baseCardCounts[baseId] || 0) + quantity;
      }

      // 5. Final validation for shared limits (e.g., Laser Blast variants)
      for (const baseId in baseCardCounts) {
        const totalQuantity = baseCardCounts[baseId];
        const baseCard = fullCardCollection.find(c => c.baseCardId === baseId);
        if (totalQuantity > baseCard.maxInDeck) {
          throw new Error(`Exceeded max limit for "${baseCard.name}". Total is ${totalQuantity}, max is ${baseCard.maxInDeck}.`);
        }
      }

      // 6. If all checks pass, update the deck state
      setDeck(newDeck);
      return { success: true };

    } catch (error) {
      console.error("Deck import failed:", error);
      return { success: false, message: error.message };
    }
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
  addLogEntry({ player: player1.name, actionType: 'DEPLOY', source: selectedDrone.name, target: lane, outcome: `Deployed to ${lane}.` });

   setPlayer1(prev => {
        const tempDronesOnBoard = { ...prev.dronesOnBoard, [lane]: [...prev.dronesOnBoard[lane], { ...selectedDrone, id: 0 }] };
        const tempPlayerState = {...prev, dronesOnBoard: tempDronesOnBoard};
        const effectiveStats = gameEngine.calculateEffectiveStats(selectedDrone, lane, tempPlayerState, player2Ref.current, { player1: placedSections, player2: opponentPlacedSections });

        const newDrone = { 
            ...selectedDrone, 
            id: Date.now(),
            statMods: [],
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
            initialDeploymentBudget: turn === 1 ? prev.initialDeploymentBudget - budgetCost : prev.initialDeploymentBudget,
            deploymentBudget: turn > 1 ? prev.deploymentBudget - budgetCost : prev.deploymentBudget,
            energy: prev.energy - energyCost
        };

        finalPlayerState.dronesOnBoard = gameEngine.updateAuras(finalPlayerState, player2Ref.current, placedSections);

        return finalPlayerState;
    });
   setSelectedDrone(null);
   endTurn('player1');
  };

  const handleDeployDrone = (lane) => {
    if (!selectedDrone || currentPlayer !== 'player1' || passInfo.player1Passed) return;

    if (totalPlayer1Drones >= player1EffectiveStats.totals.cpuLimit) {
     setModalContent({ title: "CPU Limit Reached", text: "You cannot deploy more drones than your CPU Control Value.", isBlocking: true });
      return;
    }

    const baseDroneInfo = fullDroneCollection.find(d => d.name === selectedDrone.name);
    const upgrades = player1.appliedUpgrades[selectedDrone.name] || [];
    let effectiveLimit = baseDroneInfo.limit;
    upgrades.forEach(upgrade => {
        if (upgrade.mod.stat === 'limit') {
            effectiveLimit += upgrade.mod.value;
        }
    });

    if ((player1.deployedDroneCounts[selectedDrone.name] || 0) >= effectiveLimit) {
     setModalContent({ title: "Deployment Limit Reached", text: `The deployment limit for ${selectedDrone.name} is currently ${effectiveLimit}.`, isBlocking: true });
      return;
    }

    const droneCost = selectedDrone.class;
    let energyCost = 0;
    let budgetCost = 0;

    if (turn === 1) {
        budgetCost = Math.min(player1.initialDeploymentBudget, droneCost);
        energyCost = droneCost - budgetCost;
    } else {
        budgetCost = Math.min(player1.deploymentBudget, droneCost);
        energyCost = droneCost - budgetCost;
    }

    if (player1.energy < energyCost) {
     setModalContent({ title: "Not Enough Energy", text: `This action requires ${energyCost} energy, but you only have ${player1.energy}.`, isBlocking: true });
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
     addLogEntry({ player: player1.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during ${turnPhase} phase.` }, 'playerPass');
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
    if (isResolvingAttackRef.current) return;
    if (!pendingAttack) return;
    isResolvingAttackRef.current = true;
    const { attacker, target, targetType, lane, attackingPlayer } = pendingAttack;
    
    const attackerPlayer = attackingPlayer === 'player1' ? player1Ref.current : player2Ref.current;
    const attackerOpponent = attackingPlayer === 'player1' ? player2Ref.current : player1Ref.current;
    
    // --- FIX 1 ---
    const effectiveAttacker = gameEngine.calculateEffectiveStats(attacker, lane, attackerPlayer, attackerOpponent, { player1: placedSections, player2: opponentPlacedSections });

    if (attackingPlayer === 'player1') {
      const potentialInterceptors = player2Ref.current.dronesOnBoard[lane]
        .filter(d => {
            // --- FIX 2 ---
            const effectiveInterceptor = gameEngine.calculateEffectiveStats(d, lane, player2Ref.current, player1Ref.current, { player1: placedSections, player2: opponentPlacedSections });
            return !d.isExhausted &&
                   (effectiveInterceptor.speed > effectiveAttacker.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS')) &&
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
      const potentialInterceptors = player1Ref.current.dronesOnBoard[lane]
        .filter(d => {
            // --- FIX 3 ---
            const effectiveInterceptor = gameEngine.calculateEffectiveStats(d, lane, player1Ref.current, player2Ref.current, { player1: placedSections, player2: opponentPlacedSections });
            return !d.isExhausted &&
                   (effectiveInterceptor.speed > effectiveAttacker.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS')) &&
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
  // --- FIX 4: Clean up the dependency array ---
  }, [pendingAttack, resolveAttack]);

  // --- MODIFIED --- to handle targeting for cards
const handleTargetClick = (target, targetType, isPlayer) => {
if (shipAbilityMode && validAbilityTargets.some(t => t.id === target.id)) {
setShipAbilityConfirmation({
ability: shipAbilityMode.ability,
sectionName: shipAbilityMode.sectionName,
target: target
});
return;
}
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
                
                // --- NEW GUARDIAN CHECK ---
                const opponentDronesInLane = player2.dronesOnBoard[targetLane];
                const hasGuardian = opponentDronesInLane.some(drone => {
                    const effectiveStats = gameEngine.calculateEffectiveStats(drone, targetLane, player2, player1, { player1: placedSections, player2: opponentPlacedSections });
                    return effectiveStats.keywords.has('GUARDIAN');
                });
        
                if (hasGuardian) {
                    setModalContent({ title: "Invalid Target", text: "This ship section is protected by a Guardian drone and cannot be targeted.", isBlocking: true });
                    return; // Stop the attack
                }
                // --- END GUARDIAN CHECK ---
            }
        }

        if (attackerLane && targetLane && attackerLane === targetLane) {
           setPendingAttack({ attacker: selectedDrone, target, targetType, lane: attackerLane, attackingPlayer: 'player1' });
        } else {
           setModalContent({ title: "Invalid Target", text: "You can only attack targets in the same lane.", isBlocking: true });
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
       setModalContent({ title: "Drone Exhausted", text: "This drone cannot perform any more actions this turn.", isBlocking: true});
        return;
    }
    if (cost.energy && player1.energy < cost.energy) {
       setModalContent({ title: "Not Enough Energy", text: `This ability costs ${cost.energy} energy, but you only have ${player1.energy}.`, isBlocking: true});
        return;
    }

    // Check for self-targeting lane abilities ---
    if (ability.targeting?.type === 'LANE' && ability.targeting?.location === 'SAME_LANE') {
        const laneId = gameEngine.getLaneOfDrone(drone.id, player1);
        if (laneId) {
            // Immediately open the confirmation modal since the target is known
            setAbilityConfirmation({
                ability: ability,
                drone: drone,
                target: { id: laneId, owner: 'player1' }
            });
            // Skip the manual target selection phase
            return;
        }
    }
    
    // This code will now only run for abilities that require manual targeting
    if (abilityMode && abilityMode.drone.id === drone.id) {
       cancelAbilityMode();
    } else {
       setAbilityMode({ drone, ability });
       setSelectedDrone(drone);
       cancelCardSelection();
    }
  };
  
const handleShipAbilityClick = (e, section, ability) => {
e.stopPropagation();
if (turnPhase !== 'action' || currentPlayer !== 'player1' || passInfo.player1Passed) return;

if (player1.energy < ability.cost.energy) {
   setModalContent({ title: "Not Enough Energy", text: `This ability costs ${ability.cost.energy} energy, but you only have ${player1.energy}.`, isBlocking: true});
    return;
}

if (!ability.targeting) {
    setShipAbilityConfirmation({ ability, sectionName: section.name, target: null });
} else {
    if (shipAbilityMode?.ability.id === ability.id) {
        setShipAbilityMode(null);
    } else {
        setShipAbilityMode({ sectionName: section.name, ability });
        setSelectedDrone(null);
        cancelAbilityMode();
        cancelCardSelection();
    }
}
};

  const handleTokenClick = (e, token, isPlayer) => {

      // Handle SINGLE_MOVE drone selection ---
      if (multiSelectState && multiSelectState.card.effect.type === 'SINGLE_MOVE' && multiSelectState.phase === 'select_drone' && isPlayer) {
          e.stopPropagation();
          const lane = gameEngine.getLaneOfDrone(token.id, player1);
          if (lane && validCardTargets.some(t => t.id === token.id)) {
              setMultiSelectState(prev => ({
                  ...prev,
                  phase: 'select_destination',
                  selectedDrone: token,
                  sourceLane: lane
              }));
          }
          return;
      }    
      
      // Handle multi-select drone selection
            if (multiSelectState && multiSelectState.phase === 'select_drones' && isPlayer && validCardTargets.some(t => t.id === token.id)) {
          e.stopPropagation();
          const { selectedDrones, maxSelection } = multiSelectState;
          const isAlreadySelected = selectedDrones.some(d => d.id === token.id);
          
          if (isAlreadySelected) {
              // Deselect the drone
              setMultiSelectState(prev => ({
                  ...prev,
                  selectedDrones: prev.selectedDrones.filter(d => d.id !== token.id)
              }));
          } else if (selectedDrones.length < maxSelection) {
              // Select the drone if under the limit
              setMultiSelectState(prev => ({
                  ...prev,
                  selectedDrones: [...prev.selectedDrones, token]
              }));
          }
          return;
      }

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

    // --- NEW: Handle Ability Targeting ---
    if (abilityMode && abilityMode.ability.targeting.type === 'LANE') {
        const owner = isPlayer ? 'player1' : 'player2';
        if (validAbilityTargets.some(t => t.id === lane && t.owner === owner)) {
            setAbilityConfirmation({
                ability: abilityMode.ability,
                drone: abilityMode.drone,
                target: { id: lane, owner: owner }
            });
            return;
        }
    }

    if (multiSelectState && isPlayer && validCardTargets.some(t => t.id === lane)) {
        const { phase, sourceLane, selectedDrones } = multiSelectState;
        
        if (phase === 'select_source_lane') {
            setMultiSelectState(prev => ({ ...prev, phase: 'select_drones', sourceLane: lane }));
            return;
        }

        if (phase === 'select_destination_lane') {
            resolveMultiMove(multiSelectState.card, selectedDrones, sourceLane, lane);
            return;
        }
    }

    if (multiSelectState && multiSelectState.card.effect.type === 'SINGLE_MOVE' && multiSelectState.phase === 'select_destination' && isPlayer) {
        if (validCardTargets.some(t => t.id === lane)) {
            resolveSingleMove(
                multiSelectState.card,
                multiSelectState.selectedDrone,
                multiSelectState.sourceLane,
                lane
            );
        }
        return;
    }

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
           setModalContent({ title: "Invalid Move", text: "Drones can only move to adjacent lanes.", isBlocking: true });
        }
    }
  };

  // --- NEW --- Click handler for cards in hand
  const handleCardClick = (card) => {
    if (turnPhase !== 'action' || currentPlayer !== 'player1' || passInfo.player1Passed) return;
    if (player1.energy < card.cost) {
      return;
    }

    if (card.effect.type === 'MULTI_MOVE') {
      if (multiSelectState && multiSelectState.card.instanceId === card.instanceId) {
        cancelCardSelection();
      } else {
        setMultiSelectState({
          card: card,
          phase: 'select_source_lane',
          sourceLane: null,
          selectedDrones: [],
          maxSelection: card.effect.count,
        });
        setSelectedCard(card); 
        setSelectedDrone(null);
        setAbilityMode(null);
      }
      return;
    }

    if (card.effect.type === 'SINGLE_MOVE') {
      if (multiSelectState && multiSelectState.card.instanceId === card.instanceId) {
        cancelCardSelection();
      } else {
        setMultiSelectState({
          card: card,
          phase: 'select_drone',
          selectedDrone: null,
          sourceLane: null,
        });
        setSelectedCard(card);
        setSelectedDrone(null);
        setAbilityMode(null);
      }
      return;
    }
    if (selectedCard?.instanceId === card.instanceId) {
      cancelCardSelection();
    } else if (card.name === 'System Sabotage') {
        const validTargets = gameEngine.getValidTargets('player1', null, card, player1, player2);
        setDestroyUpgradeModal({ card, targets: validTargets, opponentState: player2 });
        setSelectedCard(null);
        setAbilityMode(null);
        setSelectedDrone(null);
    } else if (card.type === 'Upgrade') {
        const validTargets = gameEngine.getValidTargets('player1', null, card, player1, player2);
        if (validTargets.length > 0) {
            setUpgradeSelectionModal({ card, targets: validTargets });
            setSelectedCard(null);
            setAbilityMode(null);
            setSelectedDrone(null);
        } else {
            setModalContent({ title: "No Valid Targets", text: `There are no drone types that can accept the '${card.name}' upgrade right now.`, isBlocking: true });
        }
    } else {
        if (!card.targeting) {
            setCardConfirmation({ card, target: null });
            setSelectedCard(null);
            setAbilityMode(null);
            setSelectedDrone(null);
        } else {
            setSelectedCard(card);
            setSelectedDrone(null);
            setAbilityMode(null);
        }
    }
  };

  const executeMove = () => {
    if (!moveConfirmation) return;
    const { drone, from, to } = moveConfirmation;

    addLogEntry({ player: player1.name, actionType: 'MOVE', source: drone.name, target: to, outcome: `Moved from ${from} to ${to}.` }, 'playerMove');

    let tempState = JSON.parse(JSON.stringify(player1));
    tempState.dronesOnBoard[from] = tempState.dronesOnBoard[from].filter(d => d.id !== drone.id);
    const movedDrone = { ...drone, isExhausted: true };
    tempState.dronesOnBoard[to].push(movedDrone);

    const { newState: stateAfterMove } = gameEngine.applyOnMoveEffects(tempState, movedDrone, from, to, addLogEntry);

    stateAfterMove.dronesOnBoard = gameEngine.updateAuras(stateAfterMove, player2Ref.current, { player1: placedSections, player2: opponentPlacedSections });

    setPlayer1(stateAfterMove);

    setMoveConfirmation(null);
    setSelectedDrone(null);
    endTurn('player1');
  };
  
  const handleConfirmMandatoryDiscard = (card) => {
    addLogEntry({
        player: player1.name,
        actionType: 'DISCARD_MANDATORY',
        source: card.name,
        target: 'N/A',
        outcome: `Discarded ${card.name} due to hand size limit.`
    }, 'handleConfirmMandatoryDiscard');

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
        const lane = gameEngine.getLaneOfDrone(drone.id, newPlayerState);
        if (lane) {
            newPlayerState.dronesOnBoard[lane] = newPlayerState.dronesOnBoard[lane].filter(d => d.id !== drone.id);
            const onDestroyUpdates = gameEngine.onDroneDestroyed(newPlayerState, drone);
            Object.assign(newPlayerState, onDestroyUpdates);
            newPlayerState.dronesOnBoard = gameEngine.updateAuras(newPlayerState, player2Ref.current, { player1: placedSections, player2: opponentPlacedSections });
        }
        return newPlayerState;
    });

   setMandatoryAction(prev => {
        const newCount = prev.count - 1;
        if (newCount <= 0) {
            const p2IsOver = totalPlayer2Drones > player2EffectiveStats.totals.cpuLimit;
            if (p2IsOver) {
               setPlayer2(p2 => {
                    let newP2 = {...p2};
                    let dronesToDestroyCount = Object.values(p2.dronesOnBoard).flat().length - gameEngine.calculateEffectiveShipStats(p2, opponentPlacedSections).totals.cpuLimit;
                    for (let i = 0; i < dronesToDestroyCount; i++) {
                        const allDrones = Object.entries(newP2.dronesOnBoard).flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));
                        if (allDrones.length === 0) break;

                        const lowestClass = Math.min(...allDrones.map(d => d.class));
                        const candidates = allDrones.filter(d => d.class === lowestClass);
                        const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];
                        
                        newP2.dronesOnBoard[droneToDestroy.lane] = newP2.dronesOnBoard[droneToDestroy.lane].filter(d => d.id !== droneToDestroy.id);
                        const onDestroyUpdates = gameEngine.onDroneDestroyed(newP2, droneToDestroy);
                        Object.assign(newP2, onDestroyUpdates);
                    }
                    newP2.dronesOnBoard = gameEngine.updateAuras(newP2, player1Ref.current, { player1: placedSections, player2: opponentPlacedSections });
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
    const downloadLogAsCSV = () => {
      if (gameLog.length === 0) {
        alert("The game log is empty.");
        return;
      }
  
      const headers = ['Round', 'TimestampUTC', 'Player', 'Action', 'Source', 'Target', 'Outcome', 'DebugSource'];
      
      const csvRows = gameLog.map(log => {
        const row = [
          log.round,
          log.player,
          log.actionType,
          log.source,
          log.target,
          log.outcome,
          log.debugSource || 'N/A'
        ];
        return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
      });
  
      const csvContent = [headers.join(','), ...csvRows].join('\n');
  
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `drone-wars-log-${new Date().toISOString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    const handleCloseAiReport = useCallback(() => {
        setAiActionReport(null);
        endTurn('player2');
    }, [endTurn]);

    const handleCloseAiCardReport = useCallback(() => {
        // The turn ends only if the card doesn't grant another action.
        if (aiCardPlayReport && !aiCardPlayReport.card.effect.goAgain) {
            endTurn('player2');
        } else if (aiCardPlayReport && aiCardPlayReport.card.effect.goAgain) {
             // If AI can go again, we just close the modal and the AI's turn continues.
             setCurrentPlayer('player2');
             setModalContent({ title: "Opponent's Turn", text: "The AI takes another action!", isBlocking: false });
        }
        setAiCardPlayReport(null);
    }, [endTurn, aiCardPlayReport]);

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
    return Object.keys(player1.shipSections).some(sectionName => 
        player1.shipSections[sectionName].allocatedShields < gameEngine.getEffectiveSectionMaxShields(sectionName, player1, placedSections)
    );
  }, [player1.shipSections, placedSections]);

  const getFirstPlayerReasonText = () => {
    if (turn === 1) {
      return "The first player is determined randomly for the first round.";
    }
    const passerName = firstPasserOfPreviousRound === 'player1' ? player1.name : player2.name;
    return `${passerName} passed first in the previous round, securing the initiative.`;
  };

 
  return (
    <div className="h-screen bg-gray-950 text-white font-sans overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-indigo-950 to-black relative" ref={gameAreaRef} onClick={() => { cancelAbilityMode(); cancelCardSelection(); }}>
      <style>
        {`
            @import url('https://fonts.googleapis.com/css2?family=Exo:wght@400;700&family=Orbitron:wght@400;700;900&display=swap');
           .font-orbitron { font-family: 'Orbitron', sans-serif; }
            .font-exo { font-family: 'Exo', sans-serif; }
            .hexagon { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
            .hexagon-flat { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
            @keyframes pulse-glow {
                0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 255, 0, 0.7)) drop-shadow(0 0 3px rgba(255, 0, 0, 0.6)); }
                50% { filter: drop-shadow(0 0 4px rgba(255, 255, 0, 1)) drop-shadow(0 0 7px rgba(255, 0, 0, 0.8)); }
            }
            .interceptor-glow { animation: pulse-glow 2s infinite ease-in-out; }
            @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
           .animate-shake { animation: shake 0.5s ease-in-out; }
            .explosion { position: absolute; width: 100px; height: 100px; background-image: radial-gradient(circle, rgba(255,159,64,1) 0%, rgba(255,87,34,0.8) 40%, rgba(255,255,255,0) 70%); border-radius: 50%; transform: translate(-50%, -50%) scale(0); animation: explode 1s ease-out forwards; pointer-events: none; z-index: 50; }
            @keyframes explode { 0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
           .bg-grid-cyan { background-image: linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px); background-size: 20px 20px;             .bg-grid-cyan { background-image: linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px); background-size: 20px 20px; }
            
            /* --- ADD THESE STYLES --- */
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;  /* IE and Edge */
              scrollbar-width: none;  /* Firefox */}
            `}
        </style>
     <TargetingArrow visible={arrowState.visible} start={arrowState.start} end={arrowState.end} lineRef={arrowLineRef} />
     {explosions.map(exp => <Explosion key={exp.id} top={exp.top} left={exp.left} />)}

      {!['preGame', 'placement', 'droneSelection', 'deckSelection', 'deckBuilding'].includes(turnPhase) && (
        <header className="w-full flex justify-between items-center mb-2 flex-shrink-0 px-5 pt-8">
          <div className="flex flex-col items-start gap-2">
            <h2 className="text-lg font-bold text-pink-300 flex items-center">
              Opponent Resources
              {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === 'player2' && <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
              {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo.player2Passed && <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
            </h2>
            <div className="flex items-center gap-4">
              <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${player2.energy > player2EffectiveStats.totals.maxEnergy ? 'text-red-400' : ''}`}><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{player2.energy} / {player2EffectiveStats.totals.maxEnergy}</span></div>
              <div
                onClick={() => AI_HAND_DEBUG_MODE && setShowAiHandModal(true)}
                className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${AI_HAND_DEBUG_MODE ? 'cursor-pointer hover:bg-gray-800' : ''} ${player2.hand.length > player2EffectiveStats.totals.handLimit ? 'text-red-400' : ''}`}
              >
                <Hand className="text-gray-400 mr-2" />
                <span className="font-bold text-lg">{player2.hand.length} / {player2EffectiveStats.totals.handLimit}</span>
                </div>
                {turnPhase === 'deployment' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{turn === 1 ? player2.initialDeploymentBudget : player2.deploymentBudget}</span></div>}
                <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${totalPlayer2Drones > player2EffectiveStats.totals.cpuLimit ? 'text-red-400' : ''}`}><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{totalPlayer2Drones} / {player2EffectiveStats.totals.cpuLimit}</span></div>
                </div>
          </div>
          <div className="text-center flex flex-col items-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-xl font-orbitron" style={{ textShadow: '0 0 15px rgba(236, 72, 153, 0.5), 0 0 5px rgba(255, 255, 255, 0.5)' }}>Drone Wars</h1>
            <div className="flex items-center gap-4 mt-2">
              {turnPhase !== 'preGame' && <h2 className="text-2xl font-bold text-gray-300 tracking-widest font-exo">{getPhaseDisplayName(turnPhase)}</h2>}
              
              {/* --- NEW BUTTON LOCATION --- */}
              {(turnPhase === 'deployment' || turnPhase === 'action') && currentPlayer === 'player1' && !mandatoryAction && !multiSelectState && (
                <button
                    onClick={handlePlayerPass}
                    disabled={passInfo.player1Passed}
                    className={`text-white font-bold py-2 px-6 rounded-full transition-colors duration-200 ${
                        passInfo.player1Passed ? 'bg-gray-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
                    }`}
                >
                    Pass
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <h2 className="text-lg font-bold text-cyan-300 flex items-center">
              Your Resources
              {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === 'player1' && <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
              {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo.player1Passed && <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
</h2>
<div className="flex items-center gap-6">
  <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${player1.energy > player1EffectiveStats.totals.maxEnergy ? 'text-red-400' : ''}`}><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{player1.energy} / {player1EffectiveStats.totals.maxEnergy}</span></div>
        {turnPhase === 'deployment' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{turn === 1 ? player1.initialDeploymentBudget : player1.deploymentBudget}</span></div>}
        <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${totalPlayer1Drones > player1EffectiveStats.totals.cpuLimit ? 'text-red-400' : ''}`}><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{totalPlayer1Drones} / {player1EffectiveStats.totals.cpuLimit}</span></div>
        {turnPhase === 'allocateShields' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><ShieldCheck className="text-cyan-300 mr-2" /> <span className="font-bold text-lg">{shieldsToAllocate}</span></div>}
              <button onClick={handleReset} className="bg-pink-700 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-colors duration-200" aria-label="Reset Game"><RotateCcw /></button>
              <button className="bg-slate-700 text-white p-3 rounded-full shadow-lg hover:bg-slate-600 transition-colors duration-200"><Settings /></button>
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-grow min-h-0 w-full flex flex-col items-center overflow-y-auto px-5 pb-4">
        {turnPhase === 'preGame' ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <h1 className="text-3xl font-orbitron font-bold text-white mb-2">Select Your Opponent</h1>
                      <p className="text-gray-400 mb-8">Choose which AI commander you want to face.</p>
                      <div className="flex flex-wrap justify-center gap-8">
                        {aiPersonalities.map((ai) => (
                          <div 
                            key={ai.name} 
                            onClick={() => handleSelectOpponent(ai)}
                            className="w-72 bg-gray-900 border-2 border-pink-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-pink-500 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20"
                          >
                            <h2 className="text-2xl font-orbitron font-bold text-pink-400 mb-3">{ai.name}</h2>
                            <p className="font-exo text-gray-300 flex-grow">{ai.description}</p>
                            <button className="mt-6 bg-pink-600 text-white font-bold px-6 py-2 rounded-full hover:bg-pink-700 transition-colors duration-200">
                              Engage
                            </button>
                          </div>
                        ))}
                      </div>
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
                ) : turnPhase === 'deckSelection' ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <h1 className="text-3xl font-orbitron font-bold text-white mb-2">Select Your Deck</h1>
                    <p className="text-gray-400 mb-8">Choose a pre-defined deck or build your own.</p>
                    <div className="flex flex-wrap justify-center gap-8">
                      <div 
                        onClick={() => handleDeckChoice('standard')}
                        className="w-72 bg-gray-900 border-2 border-cyan-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-cyan-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20"
                      >
                        <h2 className="text-2xl font-orbitron font-bold text-cyan-400 mb-3">Use Standard Deck</h2>
                        <p className="font-exo text-gray-300 flex-grow">Play with the balanced, pre-built starter deck.</p>
                        <button className="mt-6 bg-cyan-600 text-white font-bold px-6 py-2 rounded-full hover:bg-cyan-700 transition-colors duration-200">
                          Select
                        </button>
                      </div>
                      <div 
                        onClick={() => handleDeckChoice('custom')}
                        className="w-72 bg-gray-900 border-2 border-purple-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-purple-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
                      >
                        <h2 className="text-2xl font-orbitron font-bold text-purple-400 mb-3">Build Custom Deck</h2>
                        <p className="font-exo text-gray-300 flex-grow">Create your own deck from your card collection.</p>
                        <button className="mt-6 bg-purple-600 text-white font-bold px-6 py-2 rounded-full hover:bg-purple-700 transition-colors duration-200">
                          Select
                        </button>
                      </div>
                    </div>
                  </div>
                ) : turnPhase === 'deckBuilding' ? (
                  <DeckBuilder 
                    selectedDrones={player1.activeDronePool}
                    fullCardCollection={fullCardCollection}
                    deck={deck}
                    onDeckChange={handleDeckChange}
                    onConfirmDeck={handleConfirmDeck}
                    onImportDeck={handleImportDeck}
                  />
                ) : (
                  <div className="flex flex-col items-center w-full space-y-2">
                      <ShipSectionsDisplay player={player2} playerEffectiveStats={player2EffectiveStats} isPlayer={false} placedSections={opponentPlacedSections} onTargetClick={handleTargetClick} isInteractive={false} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <DroneLanesDisplay player={player2} isPlayer={false} placedSections={opponentPlacedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <DroneLanesDisplay player={player1} isPlayer={true} placedSections={placedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <ShipSectionsDisplay player={player1} playerEffectiveStats={player1EffectiveStats} isPlayer={true} placedSections={placedSections} onSectionClick={handleAllocateShield} onAbilityClick={handleShipAbilityClick} onTargetClick={handleTargetClick} isInteractive={turnPhase === 'allocateShields'} selectedCard={selectedCard} validCardTargets={validCardTargets} />
              </div>
            )}
        </>
        )}
      </main>

       {turnPhase !== 'preGame' && turnPhase !== 'placement' && turnPhase !== 'droneSelection' && (
        <footer className="w-full flex flex-col items-center flex-shrink-0">
          <div className="flex justify-center">
              <button onClick={() => handleFooterButtonClick('hand')} 
                   className={`px-8 py-2 rounded-t-lg font-bold transition-colors ${ isFooterOpen && footerView === 'hand' ? 'bg-slate-800 text-white' : 'bg-slate-900 hover:bg-slate-800 text-cyan-300'}`}
              >
             <span className="flex items-center gap-2">
                     {isFooterOpen && footerView === 'hand' && <ChevronUp size={20} />}
                     Hand ({player1.hand.length}/{player1EffectiveStats.totals.handLimit})
                   </span>
              </button> 
             <button onClick={() => handleFooterButtonClick('drones')} 
                  className={`px-8 py-2 rounded-t-lg font-bold transition-colors ${ isFooterOpen && footerView === 'drones' ? 'bg-slate-800 text-white' : 'bg-slate-900 hover:bg-slate-800 text-cyan-300'}`}
             >
                  <span className="flex items-center gap-2">
                    {isFooterOpen && footerView === 'drones' && <ChevronUp size={20} />}
                    Drones
                  </span>
             </button>

             <button onClick={() => handleFooterButtonClick('log')} 
                  className={`px-8 py-2 rounded-t-lg font-bold transition-colors ${ isFooterOpen && footerView === 'log' ? 'bg-slate-800 text-white' : 'bg-slate-900 hover:bg-slate-800 text-cyan-300'}`}
             >
                  <span className="flex items-center gap-2">
                    {isFooterOpen && footerView === 'log' && <ChevronUp size={20} />}
                    Log ({gameLog.length})
                  </span>
             </button> 
             </div> 

          <div className={`relative w-full bg-slate-800/80 backdrop-blur-sm transition-all duration-500 ease-in-out overflow-hidden ${isFooterOpen ? 'max-h-[500px] opacity-100 p-4' : 'max-h-0 opacity-0'}`}>
              {multiSelectState && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-4 bg-slate-900/80 p-2 rounded-lg border border-purple-500/50">
                      <span className="text-white font-semibold text-sm w-48 text-center">
                          {multiSelectState.phase === 'select_source_lane' && 'Reposition: Select a source lane'}
                          {multiSelectState.phase === 'select_drones' && `Select Drones (${multiSelectState.selectedDrones.length} / ${multiSelectState.maxSelection})`}
                          {multiSelectState.phase === 'select_destination_lane' && 'Reposition: Select a destination lane'}
                      </span>

                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              cancelCardSelection();
                          }}
                          className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200"
                      >
                          Cancel
                      </button>

                      {multiSelectState.phase === 'select_drones' && (
                          <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  if (multiSelectState.selectedDrones.length > 0) {
                                      setMultiSelectState(prev => ({...prev, phase: 'select_destination_lane'}));
                                  }
                              }}
                              disabled={multiSelectState.selectedDrones.length === 0}
                              className={`text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 ${
                                  multiSelectState.selectedDrones.length === 0 ? 'bg-gray-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'
                              }`}
                          >
                              Confirm Drones
                          </button>
                      )}
                  </div>
              )}
            {footerView === 'hand' ? (
              (() => {
                // --- NEW DYNAMIC LAYOUT LOGIC ---
                const cardWidthPx = 208;
                const gapPx = 16;
                const maxCardsBeforeFan = 7;
                const applyFanEffect = player1.hand.length > maxCardsBeforeFan;
               // The target width is the space needed for 7 cards with a standard gap.
                const targetHandWidthPx = (maxCardsBeforeFan * cardWidthPx) + ((maxCardsBeforeFan - 1) * gapPx);
                const numCards = player1.hand.length;

                let marginLeftPx = 0;
                if (numCards > 1) {
                  // This dynamically calculates the margin (positive or negative) to fit the cards into the target width.
                  const spaceBetweenCards = (targetHandWidthPx - cardWidthPx) / (numCards - 1);
                  marginLeftPx = spaceBetweenCards - cardWidthPx;
                }

                return (
                  <div className="flex flex-row justify-between w-full items-center">
                    <div className="flex flex-col items-center w-32 min-w-32">
                      <div onClick={() => setIsViewDiscardModalOpen(true)} className="w-24 h-32 bg-gray-900/80 rounded-lg border-2 border-gray-700 flex items-center justify-center shadow-md cursor-pointer hover:bg-gray-800/80 transition-colors duration-200"><p className="font-bold text-sm text-gray-400">{player1.discardPile.length}</p></div>
                      <p className="mt-2 text-xs text-gray-400 font-semibold">Discard Pile</p>
                    </div>

                    <div className="flex flex-col items-center flex-grow min-w-0">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className={`text-lg font-semibold ${player1.hand.length > player1EffectiveStats.totals.handLimit ? 'text-red-400' : 'text-white'}`}>Your Hand ({player1.hand.length}/{player1EffectiveStats.totals.handLimit})</h3>
                      </div>
                      
                      <div 
                        className="relative flex justify-center items-center h-[350px]" 
                        style={ applyFanEffect ? { width: `${targetHandWidthPx}px` } : {} }
                      >
                        <div className={`flex justify-center items-center ${!applyFanEffect && 'gap-2'}`}>
                          {player1.hand.map((card, index) => {
                            const hoveredIndex = hoveredCardId ? player1.hand.findIndex(c => c.instanceId === hoveredCardId) : -1;
                            let transformClass = '';
                            let style = { zIndex: index };

                            if (applyFanEffect && hoveredIndex !== -1) {
                              if (index < hoveredIndex) {
                                transformClass = 'transform -translate-x-12';
                              } else if (index > hoveredIndex) {
                                transformClass = 'transform translate-x-12';
                              } else {
                                transformClass = 'transform -translate-y-8 scale-105';
                                style.zIndex = 50;
                              }
                            }
                            
                            if (applyFanEffect && index > 0) {
                              style.marginLeft = `${marginLeftPx}px`;
                            }

                            return (
                              <div
                                key={card.instanceId}
                                className={`transition-all duration-300 ease-in-out ${transformClass}`}
                                style={style}
                                onMouseEnter={() => setHoveredCardId(card.instanceId)}
                                onMouseLeave={() => setHoveredCardId(null)}
                              >
                                <ActionCard
                                  card={card}
                                  isPlayable={
                                    (turnPhase === 'action' &&
                                      currentPlayer === 'player1' &&
                                      !passInfo.player1Passed &&
                                      player1.energy >= card.cost &&
                                      (!card.targeting || gameEngine.getValidTargets('player1', null, card, player1, player2).length > 0)) ||
                                    (turnPhase === 'optionalDiscard' && optionalDiscardCount < player1EffectiveStats.totals.discardLimit)
                                  }
                                  isMandatoryTarget={mandatoryAction?.type === 'discard'}
                                  onClick={
                                    mandatoryAction?.type === 'discard'
                                      ? (c) => setConfirmationModal({ type: 'discard', target: c, onConfirm: () => handleConfirmMandatoryDiscard(c), onCancel: () => setConfirmationModal(null), text: `Are you sure you want to discard ${c.name}?` })
                                      : turnPhase === 'optionalDiscard'
                                        ? handleOptionalDiscardClick
                                        : handleCardClick
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center w-32 min-w-32">
                      <div onClick={() => setIsViewDeckModalOpen(true)} className="w-24 h-32 bg-indigo-900/50 rounded-lg border-2 border-purple-500 flex items-center justify-center shadow-md cursor-pointer hover:bg-indigo-800/50 transition-colors duration-200"><p className="font-bold text-sm text-white">{player1.deck.length}</p></div>
                      <p className="mt-2 text-xs text-gray-400 font-semibold">Deck</p>
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
                );
              })()
            ) : footerView === 'drones' ? (
              <div className="flex flex-col items-center mb-4 w-full">
               <div className="flex flex-wrap justify-center gap-4">
                   {sortedPlayer1ActivePool.map((drone, index) => {
                       const totalResource = turn === 1 ? player1.initialDeploymentBudget + player1.energy : player1.energy;
                       const canAfford = totalResource >= drone.class;
                       const isUpgradeTarget = selectedCard?.type === 'Upgrade' && validCardTargets.some(t => t.id === drone.name);
                       
                       return (
                           <DroneCard 
                               key={index} 
                               drone={drone} 
                               onClick={handleToggleDroneSelection} 
                               isSelected={selectedDrone && selectedDrone.name === drone.name} 
                               isSelectable={(turnPhase === 'deployment' && currentPlayer === 'player1' && !passInfo.player1Passed && canAfford && !mandatoryAction) || isUpgradeTarget}
                               deployedCount={player1.deployedDroneCounts[drone.name] || 0}
                               appliedUpgrades={player1.appliedUpgrades[drone.name] || []}
                               isUpgradeTarget={isUpgradeTarget}
                               onViewUpgrades={(d, upgrades) => setViewUpgradesModal({ droneName: d.name, upgrades })}
                         />
                           
                       );
                     })}
               </div>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full h-full max-h-[350px]">
                <div className="flex justify-between items-center w-full mb-2 px-4">
                  <h3 className="text-lg font-semibold text-white">Game Log</h3>
                  <button 
                    onClick={downloadLogAsCSV} 
                    className="bg-purple-600 text-white font-bold py-2 px-4 rounded-full hover:bg-purple-700 transition-colors"
                  >
                    Download CSV
                  </button>
                </div>
                <div className="w-full flex-grow bg-black/30 rounded-lg p-2 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr>
                        <th className="p-2">Rnd</th>
                        <th className="p-2">Timestamp (UTC)</th>
                        <th className="p-2">Player</th>
                        <th className="p-2">Action</th>
                        <th className="p-2">Source</th>
                        <th className="p-2">Target</th>
                        <th className="p-2">Outcome</th>
                        <th className="p-2 text-xs text-gray-500">Debug Source</th>
                        <th className="p-2"></th> 
                      </tr>
                    </thead>
                    <tbody>
                      {gameLog.map((entry, index) => (
                        <tr key={index} className={`border-b border-gray-700/50 hover:bg-slate-700/50`}>
                          <td className="p-2 font-bold">{entry.round}</td>
                          <td className="p-2 text-gray-500">{new Date(entry.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC' })}</td>
                          <td className="p-2 text-cyan-300">{entry.player}</td>
                          <td className="p-2 text-yellow-300">{entry.actionType}</td>
                          <td className="p-2">{entry.source}</td>
                          <td className="p-2">{entry.target}</td>
                          <td className="p-2 text-gray-400">{entry.outcome}</td>
                          <td className="p-2 text-xs text-gray-500">{entry.debugSource}</td>
                          <td className="p-2 text-center">
                            {entry.aiDecisionContext && (
                              <button 
                                onClick={() => setAiDecisionLogToShow(entry.aiDecisionContext)} 
                                className="text-gray-400 hover:text-white"
                                title="Show AI Decision Logic"
                              >
                                ℹ️
                              </button>
                            )}
                          </td>
                        </tr>
                      )).reverse()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {turnPhase === 'allocateShields' && 
    <div className="flex justify-center items-center gap-4 mt-8">
        <button onClick={handleResetShieldAllocation} className={`text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-500/30`}>Reset Allocation</button>
        
        <div className="flex items-center gap-3 text-white bg-slate-900/80 border border-cyan-500/50 px-6 py-2 rounded-full shadow-lg">
            <ShieldCheck size={20} className="text-cyan-300" />
            <span className="font-bold text-lg font-orbitron tracking-wider">
                {shieldsToAllocate} / {player1EffectiveStats.totals.shieldsPerTurn}
            </span>
            <span className="text-sm text-gray-400">Shields to Allocate</span>
        </div>
        
        <button onClick={handleEndAllocation} disabled={shieldsToAllocate > 0 && canAllocateMoreShields} className={`text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 ${shieldsToAllocate > 0 && canAllocateMoreShields ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30'}`}>End Allocation</button>
    </div>
}
          </div>
        </footer>
      )}

      {/* Modals are unaffected and remain at the end */}
      {modalContent && <GamePhaseModal title={modalContent.title} text={modalContent.text} onClose={modalContent.onClose === null ? null : (modalContent.onClose || (() => setModalContent(null)))}>{modalContent.children}</GamePhaseModal>}
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
      {aiCardPlayReport && <AICardPlayReportModal report={aiCardPlayReport} onClose={handleCloseAiCardReport} />}
      {aiDecisionLogToShow && <AIDecisionLogModal decisionLog={aiDecisionLogToShow} onClose={() => setAiDecisionLogToShow(null)} />}

 {winner && showWinnerModal && (
        <GamePhaseModal
            title={`${winner} is Victorious!`}
            text={winner === 'Player 1' ? "You have crippled the enemy command ship." : "Your command ship has been crippled."}
            onClose={() => setShowWinnerModal(false)}
            >
      <div className="flex justify-center mt-6">
      <button onClick={() => setShowWinnerModal(false)} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
       View Final Board
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

{viewUpgradesModal && (
    <ViewUpgradesModal 
        modalData={viewUpgradesModal}
        onClose={() => setViewUpgradesModal(null)}
    />
)}


{destroyUpgradeModal && (
    <DestroyUpgradeModal 
        selectionData={destroyUpgradeModal}
        onConfirm={(card, target) => {
            resolveCardPlay(card, target, 'player1');
            setDestroyUpgradeModal(null);
        }}
        onCancel={() => {
            setDestroyUpgradeModal(null);
            cancelCardSelection();
        }}
    />
)}

{/* --- NEW --- Card Confirmation Modal */}

{upgradeSelectionModal && (
    <UpgradeSelectionModal 
        selectionData={upgradeSelectionModal}
        onConfirm={(card, target) => {
            resolveCardPlay(card, target, 'player1');
            setUpgradeSelectionModal(null);
        }}
        onCancel={() => {
            setUpgradeSelectionModal(null);
            cancelCardSelection();
        }}
    />
)}

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
<button onClick={() => resolveCardPlay(cardConfirmation.card, cardConfirmation.target, 'player1')} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
        </div>
      </GamePhaseModal>
    );
  })()}

      {abilityConfirmation && (() => {
          const { ability, drone, target } = abilityConfirmation;
          const targetDisplayName = `Lane ${target.id.slice(-1)}`;

          return (
            <GamePhaseModal
              title={`Confirm Ability: ${ability.name}`}
              text={`Use ${drone.name}'s ability on ${targetDisplayName}? This will cost ${ability.cost.energy || 0} energy and exhaust the drone.`}
              onClose={() => setAbilityConfirmation(null)}
            >
              <div className="flex justify-center gap-4 mt-6">
                <button onClick={() => setAbilityConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
                <button onClick={() => {
                  resolveAbility(ability, drone, target);
                  setAbilityConfirmation(null);
                }} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
              </div>
            </GamePhaseModal>
          );
      })()}

          {shipAbilityConfirmation && (() => {
              const { ability, sectionName, target } = shipAbilityConfirmation;
              const sectionDisplayName = sectionName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              let targetDisplayName = '';
              if (target) {
                  targetDisplayName = target.name;
              }

              return (
                <GamePhaseModal
                  title={`Confirm Ability: ${ability.name}`}
                  text={`Use ${sectionDisplayName}'s ability${target ? ` on ${targetDisplayName}`: ''}? This will cost ${ability.cost.energy} energy.`}
                  onClose={() => setShipAbilityConfirmation(null)}
                >
                  <div className="flex justify-center gap-4 mt-6">
                    <button onClick={() => setShipAbilityConfirmation(null)} className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors">Cancel</button>
                    <button onClick={() => resolveShipAbility(ability, sectionName, target)} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors">Confirm</button>
                  </div>
                </GamePhaseModal>
              );
          })()}

        {showAiHandModal && AI_HAND_DEBUG_MODE && (
          <GamePhaseModal
            title="Opponent's Hand (Debug View)"
            text={`The opponent is holding ${player2.hand.length} card(s). This view is for debug purposes only.`}
            onClose={() => setShowAiHandModal(false)}
            maxWidthClass="max-w-6xl"
          >
            <div className="flex flex-nowrap items-center gap-4 my-4 p-4 overflow-x-auto bg-black/20 rounded">  
              {player2.hand.length > 0 ? (
                player2.hand.map(card => (
                  <ActionCard 
                    key={card.instanceId} 
                    card={card} 
                    isPlayable={false}
                  />
                ))
              ) : (
                <p className="text-gray-500 italic">The opponent's hand is empty.</p>
              )}
            </div>
            <div className="flex justify-center mt-6">
              <button onClick={() => setShowAiHandModal(false)} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
                Close
              </button>
            </div>
          </GamePhaseModal>
        )}

      {/* Renders the modal for viewing the deck */}
      <CardViewerModal 
        isOpen={isViewDeckModalOpen} 
        onClose={() => setIsViewDeckModalOpen(false)} 
        cards={player1.deck}
        title="Remaining Cards in Deck"
        shouldSort={true}
      />

      {/* Renders the modal for viewing the discard pile */}
      <CardViewerModal
        isOpen={isViewDiscardModalOpen}
        onClose={() => setIsViewDiscardModalOpen(false)}
        cards={player1.discardPile}
        title="Discard Pile"
        shouldSort={false}
      />
    </div>
  );
};

export default App;