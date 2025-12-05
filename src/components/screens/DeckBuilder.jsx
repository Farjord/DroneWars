import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Eye, Bolt, Upload, Download, Copy, X, ChevronUp, Sword, Rocket, Shield, Grid, ArrowLeft, LayoutGrid, List, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import ActionCard from '../ui/ActionCard.jsx';
import DroneCard from '../ui/DroneCard.jsx';
import ShipCard from '../ui/ShipCard.jsx';
import ViewDeckModal from '../modals/ViewDeckModal.jsx';
import ShipSection from '../ui/ShipSection.jsx';
import fullDroneCollection from '../../data/droneData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { getAllShips, getDefaultShip } from '../../data/shipData.js';
import { gameEngine } from '../../logic/gameLogic.js';
import { RARITY_COLORS } from '../../data/cardData.js';
import { generateDeckCode } from '../../utils/deckExportUtils.js';

// Helper functions to get type-based colors for table styling
const getTypeBackgroundClass = (type) => {
  switch (type) {
    case 'Ordnance':
      return 'bg-red-900/10';
    case 'Tactic':
      return 'bg-cyan-900/10';
    case 'Support':
      return 'bg-emerald-900/10';
    case 'Upgrade':
      return 'bg-purple-900/10';
    default:
      return '';
  }
};

const getTypeTextClass = (type) => {
  switch (type) {
    case 'Ordnance':
      return 'text-red-400';
    case 'Tactic':
      return 'text-cyan-400';
    case 'Support':
      return 'text-emerald-400';
    case 'Upgrade':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
};

// Card detail popup using the actual ActionCard component
const CardDetailPopup = ({ card, onClose }) => {
  if (!card) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        <ActionCard
          card={card}
          onClick={() => {}}
          isPlayable={true}
          isSelected={false}
          mandatoryAction={null}
          excessCards={0}
          scale={1.5}
        />
      </div>
    </div>
  );
};

// Drone detail popup using the actual DroneCard component
const DroneDetailPopup = ({ drone, onClose }) => {
  if (!drone) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        <DroneCard
          drone={drone}
          onClick={() => {}}
          isSelectable={false}
          isSelected={false}
          deployedCount={0}
          ignoreDeployLimit={true}
          appliedUpgrades={[]}
          scale={1.5}
          isViewOnly={true}
        />
      </div>
    </div>
  );
};

// Ship component detail popup showing the component in all three lane positions
const ShipComponentDetailPopup = ({ component, onClose }) => {
  if (!component) return null;

  // Helper function to calculate middle lane bonus stats
  const calculateMiddleLaneBonusStats = (comp, applyBonus) => {
    const baseStats = comp.stats.healthy;
    const bonus = comp.middleLaneBonus || {};
    const effectiveStats = {};

    Object.keys(baseStats).forEach(stat => {
      effectiveStats[stat] = baseStats[stat] + (applyBonus ? (bonus[stat] || 0) : 0);
    });

    return effectiveStats;
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-info" style={{ flex: 1 }}>
            <h2 className="dw-modal-header-title">{component.name}</h2>
            <p className="dw-modal-header-subtitle">{component.description}</p>
          </div>
          <button onClick={onClose} className="dw-modal-close">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Lane Comparison Notice */}
          <div className="dw-modal-info-box" style={{ marginBottom: '20px', textAlign: 'center', '--modal-theme': '#eab308', '--modal-theme-bg': 'rgba(234, 179, 8, 0.08)', '--modal-theme-border': 'rgba(234, 179, 8, 0.3)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#fde047', fontWeight: 600 }}>
              Compare standard lane stats with middle lane bonus stats. The middle lane provides enhanced performance!
            </p>
          </div>

          {/* Two Columns showing standard and bonus lanes */}
          <div className="grid grid-cols-2 gap-8">
            {/* Left/Right Lane */}
            <div>
              <h3 className="text-center font-orbitron text-lg mb-3" style={{ color: 'var(--modal-text-secondary)' }}>
                LEFT / RIGHT LANE
              </h3>
              <div className="h-[250px]">
                <ShipSection
                  section={component.key}
                  stats={component}
                  effectiveStatsForDisplay={calculateMiddleLaneBonusStats(component, false)}
                  isPlayer={true}
                  isInMiddleLane={false}
                  gameEngine={gameEngine}
                  isInteractive={false}
                  turnPhase="placement"
                  isMyTurn={() => false}
                  passInfo={{}}
                  getLocalPlayerId={() => 'player1'}
                  localPlayerState={{}}
                  shipAbilityMode={null}
                />
              </div>
            </div>

            {/* Middle Lane (Bonus) */}
            <div className="relative">
              <div className="absolute -top-2 -left-2 -right-2 -bottom-2 rounded-lg animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%)' }}></div>
              <div className="relative">
                <h3 className="text-center font-orbitron text-lg mb-3 font-bold" style={{ color: '#eab308' }}>
                  MIDDLE LANE (BONUS)
                </h3>
                <div className="h-[250px]">
                  <ShipSection
                    section={component.key}
                    stats={component}
                    effectiveStatsForDisplay={calculateMiddleLaneBonusStats(component, true)}
                    isPlayer={true}
                    isInMiddleLane={true}
                    gameEngine={gameEngine}
                    isInteractive={false}
                    turnPhase="placement"
                    isMyTurn={() => false}
                    passInfo={{}}
                    getLocalPlayerId={() => 'player1'}
                    localPlayerState={{}}
                    shipAbilityMode={null}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ability Info */}
          {component.ability && (
            <div className="dw-modal-info-box" style={{ marginTop: '20px', '--modal-theme': '#a855f7', '--modal-theme-bg': 'rgba(168, 85, 247, 0.1)', '--modal-theme-border': 'rgba(168, 85, 247, 0.4)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontFamily: 'Orbitron, sans-serif', color: '#a855f7', fontWeight: 700 }}>
                Ship Ability: {component.ability.name}
              </h4>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--modal-text-primary)' }}>
                {component.ability.description}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                Cost: {component.ability.cost.energy} Energy
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-cancel">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


const DeckBuilder = ({
  selectedDrones,
  fullCardCollection,
  deck,
  onDeckChange,
  onDronesChange,
  selectedShipComponents,
  onShipComponentsChange,
  selectedShip = null,         // Selected ship card (null = use default)
  onShipChange,                // Callback when ship selection changes
  onConfirmDeck,
  onImportDeck,
  onBack,
  // Extraction mode props
  maxDrones = 10,              // 5 for extraction, 10 for multiplayer
  droneInstances = [],         // For damage display (yellow triangle)
  componentInstances = [],     // For hull display (health bar)
  readOnly = false,            // For Slot 0 view-only mode
  allowInvalidSave = false,    // Allow save with invalid deck
  mode = 'multiplayer',        // 'multiplayer' | 'extraction'
  onSaveInvalid,               // Callback for saving invalid deck
  deckName = '',               // Current deck name (extraction mode)
  onDeckNameChange,            // Callback for name change
  availableDrones = null,      // Filtered drone collection (extraction mode)
  availableComponents = null,  // Filtered component collection (extraction mode)
  availableShips = null        // Filtered ship collection (extraction mode)
}) => {
  // Use provided ship or default
  const activeShip = selectedShip || getDefaultShip();
  // In extraction mode, use filtered ships; otherwise show all
  const allShips = availableShips || getAllShips();
  const [detailedCard, setDetailedCard] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [detailedShipComponent, setDetailedShipComponent] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewDeckModal, setShowViewDeckModal] = useState(false);

  // Panel view toggles
  const [leftPanelView, setLeftPanelView] = useState('shipCard'); // 'shipCard', 'cards', 'drones', or 'ship'
  const [rightPanelView, setRightPanelView] = useState('shipCard'); // 'shipCard', 'deck', 'drones', or 'ship'

  // Mobile responsive: which panel is visible on small screens
  const [mobileActivePanel, setMobileActivePanel] = useState('left'); // 'left' or 'right'

  const [filters, setFilters] = useState({
    cost: { min: 0, max: 99 }, // Temporary values
    target: 'all',
    type: 'all',
    abilities: [],
    hideEnhanced: false,
  });
  const [isAbilityDropdownOpen, setIsAbilityDropdownOpen] = useState(false);
  const abilityFilterRef = useRef(null);
  
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  // Drone-specific filters and sort
  const [droneFilters, setDroneFilters] = useState({
    abilities: []
  });
  const [droneSortConfig, setDroneSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const [activeChartView, setActiveChartView] = useState('cost');
  const [isStatsVisible, setIsStatsVisible] = useState(true);

  // View mode toggles for cards and drones (table or grid)
  const [cardsViewMode, setCardsViewMode] = useState('table'); // 'table' or 'grid'
  const [dronesViewMode, setDronesViewMode] = useState('table'); // 'table' or 'grid'

  // --- Memoize a processed card collection with keywords for efficient filtering/sorting ---
  const processedCardCollection = useMemo(() => {
    const formatKeyword = (type) => {
        if (!type) return '';
        const formatted = type.replace(/_/g, ' ').toLowerCase();
        return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    return fullCardCollection.map(card => {
        const keywords = [];
        const effect = card.effect;

        if (effect.type === 'REPEATING_EFFECT') {
            keywords.push(formatKeyword(effect.type));
            if (effect.effects && Array.isArray(effect.effects)) {
                effect.effects.forEach(subEffect => {
                    if (subEffect.type) keywords.push(formatKeyword(subEffect.type));
                });
            }
        } else if (effect.type === 'MODIFY_DRONE_BASE' && effect.mod) {
            // Create specific modification keywords
            const stat = effect.mod.stat;
            const value = effect.mod.value;

            if (stat === 'attack') {
                keywords.push(value > 0 ? 'Attack Buff' : 'Attack Debuff');
            } else if (stat === 'speed') {
                keywords.push(value > 0 ? 'Speed Buff' : 'Speed Debuff');
            } else if (stat === 'shields') {
                keywords.push(value > 0 ? 'Shield Buff' : 'Shield Debuff');
            } else if (stat === 'cost') {
                keywords.push(value < 0 ? 'Cost Reduction' : 'Cost Increase');
            } else if (stat === 'limit') {
                keywords.push(value > 0 ? 'Limit Buff' : 'Limit Debuff');
            } else if (stat === 'ability') {
                keywords.push('Ability Grant');
                // Also add the specific ability being granted
                if (effect.mod.abilityToAdd && effect.mod.abilityToAdd.name) {
                    keywords.push(effect.mod.abilityToAdd.name);
                }
            } else {
                keywords.push(formatKeyword(`${stat} Modification`));
            }
        } else if (effect.type === 'MODIFY_STAT' && effect.mod) {
            // Create specific stat modification keywords
            const stat = effect.mod.stat;
            const value = effect.mod.value;
            const type = effect.mod.type; // temporary or permanent

            if (stat === 'attack') {
                keywords.push(value > 0 ? 'Attack Buff' : 'Attack Debuff');
            } else if (stat === 'speed') {
                keywords.push(value > 0 ? 'Speed Buff' : 'Speed Debuff');
            } else if (stat === 'shields') {
                keywords.push(value > 0 ? 'Shield Buff' : 'Shield Debuff');
            } else {
                keywords.push(value > 0 ? `${stat} Buff` : `${stat} Debuff`);
            }
        } else if (effect.type === 'SEARCH_AND_DRAW') {
            // Add both Search and Draw keywords for better filtering
            keywords.push(formatKeyword(effect.type)); // "Search And Draw"
            keywords.push('Draw'); // Also include the draw keyword
        } else if (effect.type) {
            keywords.push(formatKeyword(effect.type));
        }
        if (effect.goAgain) keywords.push('Go Again');
        if (effect.damageType === 'PIERCING') keywords.push('Piercing');
        if (effect.mod?.type) keywords.push(formatKeyword(effect.mod.type));
        
        const targetingText = (() => {
            if (card.targeting) {
                const t = formatKeyword(card.targeting.type);
                if (card.targeting.affinity) {
                    const a = card.targeting.affinity.charAt(0) + card.targeting.affinity.slice(1).toLowerCase();
                    return `${t} (${a})`;
                }
                return t;
            } else if (effect.type === 'MULTI_MOVE' && effect.source) {
                // Handle MULTI_MOVE cards that have targeting in the effect
                const sourceLocation = effect.source.location || 'Any';
                const sourceAffinity = effect.source.affinity || 'Any';
                const formattedAffinity = sourceAffinity.charAt(0).toUpperCase() + sourceAffinity.slice(1).toLowerCase();
                return `${formatKeyword(sourceLocation)} (${formattedAffinity})`;
            } else if (effect.type === 'SINGLE_MOVE') {
                // Handle SINGLE_MOVE cards - they typically target friendly drones
                return 'Drone (Friendly)';
            }
            return 'N/A';
        })();

        return { ...card, keywords, targetingText };
    });
  }, [fullCardCollection]);

  // --- Memoize a processed drone collection with keywords for efficient filtering/sorting ---
  const processedDroneCollection = useMemo(() => {
    // Use availableDrones if provided (extraction mode), otherwise use full collection
    const droneSource = availableDrones || fullDroneCollection;
    return droneSource
      .filter(drone => drone.selectable !== false) // Filter out non-selectable drones (tokens)
      .map(drone => {
      const keywords = [];

      // Extract ability names as keywords
      if (drone.abilities && drone.abilities.length > 0) {
        drone.abilities.forEach(ability => {
          if (ability.name) keywords.push(ability.name);

          // Add ability type keywords
          if (ability.type) {
            keywords.push(ability.type === 'ACTIVE' ? 'Active' : ability.type === 'PASSIVE' ? 'Passive' : 'Triggered');
          }

          // Add effect type keywords
          if (ability.effect?.keyword) {
            keywords.push(ability.effect.keyword);
          }
        });
      }

      // Concatenate all ability descriptions (without ability names)
      const description = drone.abilities && drone.abilities.length > 0
        ? drone.abilities.map(a => a.description).join(' | ')
        : 'No abilities';

      return { ...drone, keywords, description };
    });
  }, [availableDrones]);

  // --- Use availableComponents if provided, otherwise use full collection ---
  const activeComponentCollection = useMemo(() => {
    return availableComponents || shipComponentCollection;
  }, [availableComponents]);

  const filterOptions = useMemo(() => {
    const costs = new Set();
    const targets = new Set();
    const abilities = new Set();
    processedCardCollection.forEach(card => {
        costs.add(card.cost);
        targets.add(card.targetingText);
        card.keywords.forEach(k => abilities.add(k));
    });

    const costValues = Array.from(costs);
    
    return {
        minCost: Math.min(...costValues),
        maxCost: Math.max(...costValues),
        targets: ['all', ...Array.from(targets).sort()],
        abilities: Array.from(abilities).sort(),
    };
  }, [processedCardCollection]);

  const droneFilterOptions = useMemo(() => {
    const abilities = new Set();
    processedDroneCollection.forEach(drone => {
      drone.keywords.forEach(k => abilities.add(k));
    });

    return {
      abilities: Array.from(abilities).sort()
    };
  }, [processedDroneCollection]);

  // This effect initializes the cost filter range once the options are calculated
  useEffect(() => {
    if (filterOptions.minCost !== Infinity && filterOptions.maxCost !== -Infinity) {
      setFilters(prev => ({
        ...prev,
        cost: { min: filterOptions.minCost, max: filterOptions.maxCost }
      }));
    }
  }, [filterOptions.minCost, filterOptions.maxCost]);

  // --- MODIFIED: Memoize calculations for performance, now using processedCardCollection ---
  const { cardCount, deckListForDisplay, baseCardCounts, typeCounts } = useMemo(() => {
    const counts = {};
    const types = { Ordnance: 0, Tactic: 0, Support: 0, Upgrade: 0 };
    let total = 0;

    // Iterate over the deck object, which is { cardId: quantity }
    Object.entries(deck).forEach(([cardId, quantity]) => {
      if (quantity > 0) {
        total += quantity;
        const card = processedCardCollection.find(c => c.id === cardId);
        if (card) {
          const baseId = card.baseCardId;
          counts[baseId] = (counts[baseId] || 0) + quantity;

          // Track type counts
          if (card.type) {
            types[card.type] = (types[card.type] || 0) + quantity;
          }
        }
      }
    });

    const displayList = Object.entries(deck)
      .filter(([, quantity]) => quantity > 0)
      .map(([cardId, quantity]) => {
        const card = processedCardCollection.find(c => c.id === cardId);
        return { ...card, quantity };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { cardCount: total, deckListForDisplay: displayList, baseCardCounts: counts, typeCounts: types };
  }, [deck, processedCardCollection]);

  // Type limits derived from selected ship card
  const typeLimits = {
    Ordnance: activeShip?.deckLimits?.ordnanceLimit ?? 15,
    Tactic: activeShip?.deckLimits?.tacticLimit ?? 15,
    Support: activeShip?.deckLimits?.supportLimit ?? 15,
    Upgrade: activeShip?.deckLimits?.upgradeLimit ?? 10
  };
  const totalCardLimit = activeShip?.deckLimits?.totalCards ?? 40;

  // Validate type limits
  const typeValid = Object.keys(typeLimits).every(
    type => typeCounts[type] <= typeLimits[type]
  );

  // Deck is valid if it has exactly the required card count and respects type limits
  const isDeckValid = cardCount === totalCardLimit && typeValid;

  // --- Drone counts and display list ---
  const { droneCount, droneListForDisplay } = useMemo(() => {
    let total = 0;
    const displayList = [];

    Object.entries(selectedDrones || {}).forEach(([droneName, quantity]) => {
      if (quantity > 0) {
        total += quantity;
        const drone = processedDroneCollection.find(d => d.name === droneName);
        if (drone) {
          displayList.push({ ...drone, quantity });
        }
      }
    });

    displayList.sort((a, b) => a.name.localeCompare(b.name));

    return { droneCount: total, droneListForDisplay: displayList };
  }, [selectedDrones, processedDroneCollection]);

  const isDronesValid = droneCount === maxDrones;

  // --- Ship component counts and validation ---
  const { shipComponentCount, shipComponentsValid } = useMemo(() => {
    const components = selectedShipComponents || {};
    const count = Object.keys(components).filter(key => components[key]).length;

    // Check that we have one of each type
    const hasBridge = Object.keys(components).some(key => {
      const comp = activeComponentCollection.find(c => c.id === key);
      return comp && comp.type === 'Bridge' && components[key];
    });
    const hasPowerCell = Object.keys(components).some(key => {
      const comp = activeComponentCollection.find(c => c.id === key);
      return comp && comp.type === 'Power Cell' && components[key];
    });
    const hasDroneControl = Object.keys(components).some(key => {
      const comp = activeComponentCollection.find(c => c.id === key);
      return comp && comp.type === 'Drone Control Hub' && components[key];
    });

    // Check that all components have lane assignments and no conflicts
    const lanes = Object.values(components).filter(l => l);
    const uniqueLanes = new Set(lanes);
    const allAssigned = lanes.length === 3;
    const noConflicts = uniqueLanes.size === 3;

    const isValid = hasBridge && hasPowerCell && hasDroneControl && allAssigned && noConflicts;

    return { shipComponentCount: count, shipComponentsValid: isValid };
  }, [selectedShipComponents, activeComponentCollection]);

  // --- NEW: Define colors for the Pie Chart ---
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#A45D5D', '#8C5DA4'];

  // --- NEW: Memoize statistics for the charts ---
  const deckStats = useMemo(() => {
    // Bar chart data (cost distribution)
    const costDistribution = {};
    deckListForDisplay.forEach(card => {
      const cost = card.cost || 0;
      costDistribution[cost] = (costDistribution[cost] || 0) + card.quantity;
    });
    const barChartData = Object.entries(costDistribution)
      .map(([cost, count]) => ({ name: `${cost}`, count }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));

    // Pie chart data (ability distribution)
    const abilityDistribution = {};
    deckListForDisplay.forEach(card => {
      // The card might not be found if the collection is loading, so check for keywords
      if (card.keywords) {
        card.keywords.forEach(keyword => {
          abilityDistribution[keyword] = (abilityDistribution[keyword] || 0) + card.quantity;
        });
      }
    });
    const pieChartData = Object.entries(abilityDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { barChartData, pieChartData };
  }, [deckListForDisplay]);

  // --- Drone statistics for charts ---
  const droneStats = useMemo(() => {
    const createDistribution = (statName) => {
      const distribution = {};
      droneListForDisplay.forEach(drone => {
        const value = drone[statName] || 0;
        distribution[value] = (distribution[value] || 0) + drone.quantity;
      });
      return Object.entries(distribution)
        .map(([value, count]) => ({ name: `${value}`, count }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));
    };

    const costData = createDistribution('class'); // 'class' is the cost field in drones
    const attackData = createDistribution('attack');
    const speedData = createDistribution('speed');
    const shieldsData = createDistribution('shields');
    const hullData = createDistribution('hull');
    const limitData = createDistribution('limit');
    const upgradesData = createDistribution('upgradeSlots');

    // Ability distribution (pie chart)
    const abilityDistribution = {};
    droneListForDisplay.forEach(drone => {
      if (drone.keywords) {
        drone.keywords.forEach(keyword => {
          abilityDistribution[keyword] = (abilityDistribution[keyword] || 0) + drone.quantity;
        });
      }
    });
    const abilityData = Object.entries(abilityDistribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      costData,
      attackData,
      speedData,
      shieldsData,
      hullData,
      limitData,
      upgradesData,
      abilityData
    };
  }, [droneListForDisplay]);

  // --- Process data for ViewDeckModal ---
  const viewDeckData = useMemo(() => {
    // Process drones: filter selected drones (quantity > 0)
    const selectedDronesList = [];
    Object.entries(selectedDrones || {}).forEach(([droneName, quantity]) => {
      if (quantity > 0) {
        const drone = processedDroneCollection.find(d => d.name === droneName);
        if (drone) {
          selectedDronesList.push(drone);
        }
      }
    });

    // Process cards: convert deck object to {card, quantity} array
    const deckCardsList = [];
    Object.entries(deck).forEach(([cardId, quantity]) => {
      if (quantity > 0) {
        const card = processedCardCollection.find(c => c.id === cardId);
        if (card) {
          deckCardsList.push({ card, quantity });
        }
      }
    });

    return {
      drones: selectedDronesList,
      cards: deckCardsList
    };
  }, [selectedDrones, deck, processedDroneCollection, processedCardCollection]);

 // --- NEW: Memoize the filtered and sorted list for display ---
  const filteredAndSortedCards = useMemo(() => {
    let sortableItems = [...processedCardCollection]
      .filter(card => {
        // Cost filter
        if (card.cost < filters.cost.min || card.cost > filters.cost.max) {
            return false;
        }
        // Target filter
        if (filters.target !== 'all' && card.targetingText !== filters.target) {
          return false;
        }
        // Type filter
        if (filters.type !== 'all' && card.type !== filters.type) {
          return false;
        }
        // Abilities filter (must have ALL selected abilities)
        if (filters.abilities.length > 0) {
          return filters.abilities.every(ability => card.keywords.includes(ability));
        }
        // Enhanced cards filter
        if (filters.hideEnhanced && card.id.endsWith('_ENHANCED')) {
          return false;
        }
        return true;
      });

    // Sort logic
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Convert to string for consistent comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (aStr < bStr) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        // Secondary sort by ID for stability
        return a.id.localeCompare(b.id);
      });
    }

    return sortableItems;
  }, [processedCardCollection, filters, sortConfig]);

  // --- Filtered and sorted drones list ---
  const filteredAndSortedDrones = useMemo(() => {
    let sortableItems = [...processedDroneCollection]
      .filter(drone => {
        // Abilities filter (must have ALL selected abilities)
        if (droneFilters.abilities.length > 0) {
          return droneFilters.abilities.every(ability => drone.keywords.includes(ability));
        }
        return true;
      });

    // Sort logic
    if (droneSortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[droneSortConfig.key];
        const bVal = b[droneSortConfig.key];

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Convert to string for consistent comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (aStr < bStr) {
          return droneSortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aStr > bStr) {
          return droneSortConfig.direction === 'ascending' ? 1 : -1;
        }
        // Secondary sort by name for stability
        return a.name.localeCompare(b.name);
      });
    }

    return sortableItems;
  }, [processedDroneCollection, droneFilters, droneSortConfig]);

  // --- NEW: Handler for sorting ---
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const requestDroneSort = (key) => {
    let direction = 'ascending';
    if (droneSortConfig.key === key && droneSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setDroneSortConfig({ key, direction });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handleAbilityToggle = (ability) => {
    setFilters(prev => {
        const abilities = prev.abilities.includes(ability)
            ? prev.abilities.filter(a => a !== ability)
            : [...prev.abilities, ability];
        return { ...prev, abilities };
    });
  };

  const handleDroneAbilityToggle = (ability) => {
    setDroneFilters(prev => {
      const abilities = prev.abilities.includes(ability)
        ? prev.abilities.filter(a => a !== ability)
        : [...prev.abilities, ability];
      return { ...prev, abilities };
    });
  };

  const resetFilters = () => {
    setFilters({
      cost: { min: filterOptions.minCost, max: filterOptions.maxCost },
      target: 'all',
      type: 'all',
      abilities: [],
      hideEnhanced: false,
    });
    setIsAbilityDropdownOpen(false);
  };

  const resetDroneFilters = () => {
    setDroneFilters({
      abilities: []
    });
  };

  const resetDeck = () => {
    // Clear all cards from the deck by setting each to 0
    Object.keys(deck).forEach(cardId => {
      if (deck[cardId] > 0) {
        onDeckChange(cardId, 0);
      }
    });
  };

  const resetDrones = () => {
    // Clear all drones from the selection by setting each to 0
    Object.keys(selectedDrones || {}).forEach(droneName => {
      if (selectedDrones[droneName] > 0) {
        onDronesChange(droneName, 0);
      }
    });
  };

  // Effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (abilityFilterRef.current && !abilityFilterRef.current.contains(event.target)) {
            setIsAbilityDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // --- Custom renderer for Pie Chart labels with lines ---
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, fill, name, value }) => {
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={4} textAnchor={textAnchor} fill="#9CA3AF" fontSize="11px">
          {`${name} (${value})`}
        </text>
      </g>
    );
  };


  // --- Modal Components ---
    const ExportModal = () => {
    const [copySuccess, setCopySuccess] = useState('');
    const textAreaRef = useRef(null);
    // Use utility function with defensive filtering (excludes quantity 0)
    const deckCode = useMemo(() => {
      return generateDeckCode(deck, selectedDrones, selectedShipComponents);
    }, [deck, selectedDrones, selectedShipComponents]);

    const copyToClipboard = () => {
      textAreaRef.current.select();
      document.execCommand('copy');
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    };

  return (
    <div className="dw-modal-overlay" onClick={() => setShowExportModal(false)}>
      <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Download size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Export Deck Code</h2>
            <p className="dw-modal-header-subtitle">Save or share your configuration</p>
          </div>
          <button onClick={() => setShowExportModal(false)} className="dw-modal-close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text dw-modal-text--left">
            Copy the code below to save or share your deck and drones.
          </p>
          <textarea
            ref={textAreaRef}
            readOnly
            value={deckCode}
            className="w-full h-32 p-3 rounded font-mono text-sm"
            style={{
              background: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid var(--modal-action-border)',
              color: 'var(--modal-text-primary)',
              resize: 'none'
            }}
          />
          {copySuccess && (
            <div className="dw-modal-feedback dw-modal-feedback--success" style={{ marginTop: '12px' }}>
              {copySuccess}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={() => setShowExportModal(false)} className="dw-btn dw-btn-cancel">
            Close
          </button>
          <button onClick={copyToClipboard} className="dw-btn dw-btn-confirm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={16} /> Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
  };

  const ImportModal = () => {
    const [deckCode, setDeckCode] = useState('');
    const [error, setError] = useState('');

    const handleImport = () => {
      setError('');
      const result = onImportDeck(deckCode);
      if (result.success) {
        setShowImportModal(false);
      } else {
        setError(result.message || 'Invalid deck code format.');
      }
    };

    return (
      <div className="dw-modal-overlay" onClick={() => setShowImportModal(false)}>
        <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="dw-modal-header">
            <div className="dw-modal-header-icon">
              <Upload size={28} />
            </div>
            <div className="dw-modal-header-info">
              <h2 className="dw-modal-header-title">Import Deck Code</h2>
              <p className="dw-modal-header-subtitle">Load a saved configuration</p>
            </div>
            <button onClick={() => setShowImportModal(false)} className="dw-modal-close">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="dw-modal-body">
            <p className="dw-modal-text dw-modal-text--left">
              Paste a deck code below to load both cards and drones into the builder.
            </p>
            <textarea
              value={deckCode}
              onChange={(e) => setDeckCode(e.target.value)}
              className="w-full h-32 p-3 rounded font-mono text-sm"
              style={{
                background: 'rgba(17, 24, 39, 0.8)',
                border: '1px solid var(--modal-action-border)',
                color: 'var(--modal-text-primary)',
                resize: 'none'
              }}
              placeholder="cards:CARD001:4,CARD002:2|drones:Scout Drone:1,Heavy Fighter:1"
            />
            {error && (
              <div className="dw-modal-feedback dw-modal-feedback--error" style={{ marginTop: '12px' }}>
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="dw-modal-actions">
            <button onClick={() => setShowImportModal(false)} className="dw-btn dw-btn-cancel">
              Cancel
            </button>
            <button onClick={handleImport} className="dw-btn dw-btn-confirm">
              Load Deck
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="w-full flex flex-col text-white font-exo mt-8 text-sm">
      {detailedCard && <CardDetailPopup card={detailedCard} onClose={() => setDetailedCard(null)} />}
      {detailedDrone && <DroneDetailPopup drone={detailedDrone} onClose={() => setDetailedDrone(null)} />}
      {detailedShipComponent && <ShipComponentDetailPopup component={detailedShipComponent} onClose={() => setDetailedShipComponent(null)} />}
      {showExportModal && <ExportModal />}
      {showImportModal && <ImportModal />}
      <ViewDeckModal
        isOpen={showViewDeckModal}
        onClose={() => setShowViewDeckModal(false)}
        title="Your Deck & Drones"
        drones={viewDeckData.drones}
        cards={viewDeckData.cards}
        shipComponents={selectedShipComponents || {}}
      />

      <div className="flex justify-between items-center mb-4 px-4">
        {/* Left: Back button */}
        <div className="w-32">
          {onBack && (
            <button onClick={onBack} className="btn-cancel flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
          )}
        </div>

        {/* Center: Title or Deck Name Input */}
        {mode === 'extraction' && onDeckNameChange && !readOnly ? (
          <input
            type="text"
            value={deckName}
            onChange={(e) => onDeckNameChange(e.target.value)}
            className="bg-slate-700 border border-cyan-500/50 rounded px-4 py-2 text-white font-orbitron text-xl text-center w-80 focus:outline-none focus:border-cyan-400"
            placeholder="Enter deck name..."
          />
        ) : (
          <h1 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            {mode === 'extraction' && readOnly ? 'Starter Deck (Read-Only)' : 'Deck Builder'}
          </h1>
        )}

        {/* Right: Spacer to balance layout */}
        <div className="w-32" />
      </div>
      
      {/* Mobile Panel Toggle - visible only on small screens */}
      <div className="flex lg:hidden mb-2 mx-[10px] rounded-lg overflow-hidden border border-cyan-500/30">
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            mobileActivePanel === 'left'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setMobileActivePanel('left')}
        >
          Available
        </button>
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            mobileActivePanel === 'right'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setMobileActivePanel('right')}
        >
          Your Deck
        </button>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 mb-[10px]">

        {/* Left Side: Available Items */}
        <div className={`w-full lg:w-2/3 ${mobileActivePanel === 'right' ? 'hidden lg:flex' : 'flex'} flex-col dw-panel h-[calc(100vh-140px)] lg:h-[calc(100vh-99px)] mx-[10px] lg:ml-[10px] lg:mr-0`}>
          <div className="dw-panel-header">
            {/* Main navigation tabs */}
            <div className="dw-modal-tabs" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
              <button
                onClick={() => {
                  setLeftPanelView('shipCard');
                  setRightPanelView('shipCard');
                }}
                className={`dw-modal-tab ${leftPanelView === 'shipCard' ? 'dw-modal-tab--active' : ''}`}
              >
                Ship
              </button>
              <button
                onClick={() => {
                  setLeftPanelView('ship');
                  setRightPanelView('ship');
                }}
                className={`dw-modal-tab ${leftPanelView === 'ship' ? 'dw-modal-tab--active' : ''}`}
              >
                Ship Sections
              </button>
              <button
                onClick={() => {
                  setLeftPanelView('drones');
                  setRightPanelView('drones');
                }}
                className={`dw-modal-tab ${leftPanelView === 'drones' ? 'dw-modal-tab--active' : ''}`}
              >
                Drones
              </button>
              <button
                onClick={() => {
                  setLeftPanelView('cards');
                  setRightPanelView('deck');
                }}
                className={`dw-modal-tab ${leftPanelView === 'cards' ? 'dw-modal-tab--active' : ''}`}
              >
                Cards
              </button>
              {/* Utility buttons */}
              <button
                onClick={() => setShowViewDeckModal(true)}
                className="dw-modal-tab"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Grid size={14} />
                View Deck
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="dw-modal-tab"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} />
                Import
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="dw-modal-tab"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                Export
              </button>
            </div>
            {/* View mode and filter controls */}
            <div className="flex gap-2 items-center">
              {leftPanelView === 'cards' && (
                <>
                  <button
                    onClick={() => setCardsViewMode('table')}
                    className={`dw-modal-tab ${cardsViewMode === 'table' ? 'dw-modal-tab--active' : ''}`}
                    title="Table View"
                    style={{ padding: '6px 10px' }}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setCardsViewMode('grid')}
                    className={`dw-modal-tab ${cardsViewMode === 'grid' ? 'dw-modal-tab--active' : ''}`}
                    title="Grid View"
                    style={{ padding: '6px 10px' }}
                  >
                    <LayoutGrid size={16} />
                  </button>
                </>
              )}
              {leftPanelView === 'drones' && (
                <>
                  <button
                    onClick={() => setDronesViewMode('table')}
                    className={`dw-modal-tab ${dronesViewMode === 'table' ? 'dw-modal-tab--active' : ''}`}
                    title="Table View"
                    style={{ padding: '6px 10px' }}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setDronesViewMode('grid')}
                    className={`dw-modal-tab ${dronesViewMode === 'grid' ? 'dw-modal-tab--active' : ''}`}
                    title="Grid View"
                    style={{ padding: '6px 10px' }}
                  >
                    <LayoutGrid size={16} />
                  </button>
                </>
              )}
              <button
                onClick={leftPanelView === 'cards' ? resetFilters : resetDroneFilters}
                className="btn-reset"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* SHIP CARD VIEW */}
          {leftPanelView === 'shipCard' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-cyan-700/50">
                <h3 className="text-lg font-orbitron text-cyan-400 mb-2">Select Your Ship</h3>
                <p className="text-sm text-gray-400">
                  Choose a ship to define your deck composition limits. Each ship has different hull, shields, and thresholds,
                  as well as unique deck building constraints.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 justify-center">
                {allShips.map(ship => (
                  <ShipCard
                    key={ship.id}
                    ship={ship}
                    onClick={() => onShipChange && onShipChange(ship)}
                    isSelectable={!readOnly && !!onShipChange}
                    isSelected={activeShip?.id === ship.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* CARDS VIEW */}
          {leftPanelView === 'cards' && (
          <>
          {/* --- Filter Input (shown in both table and grid view) --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Cost Range Filter */}
            <div className="dw-filter-select flex flex-col justify-center">
                <label className="dw-filter-label">Cost Range: {filters.cost.min} - {filters.cost.max}</label>
                <div className="dw-filter-range">
                    <input
                        type="range"
                        min={filterOptions.minCost}
                        max={filterOptions.maxCost}
                        value={filters.cost.min}
                        onChange={(e) => handleFilterChange('cost', { ...filters.cost, min: Math.min(parseInt(e.target.value), filters.cost.max) })}
                    />
                    <input
                        type="range"
                        min={filterOptions.minCost}
                        max={filterOptions.maxCost}
                        value={filters.cost.max}
                        onChange={(e) => handleFilterChange('cost', { ...filters.cost, max: Math.max(parseInt(e.target.value), filters.cost.min) })}
                    />
                </div>
            </div>

            {/* Ability Multi-Select Filter */}
            <div className="relative" ref={abilityFilterRef}>
                <button onClick={() => setIsAbilityDropdownOpen(!isAbilityDropdownOpen)} className="dw-filter-select w-full text-left h-full">
                    {filters.abilities.length === 0 ? 'Select Abilities' : `${filters.abilities.length} Abilities Selected`}
                </button>
                {isAbilityDropdownOpen && (
                    <div className="dw-filter-dropdown">
                        {filterOptions.abilities.map(ability => (
                            <label key={ability} className="dw-filter-dropdown-item">
                                <input type="checkbox" checked={filters.abilities.includes(ability)} onChange={() => handleAbilityToggle(ability)} />
                                {ability}
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Type Filter */}
            <select onChange={(e) => handleFilterChange('type', e.target.value)} value={filters.type} className="dw-filter-select h-full">
                <option value="all">All Types</option>
                <option value="Ordnance">Ordnance</option>
                <option value="Tactic">Tactic</option>
                <option value="Support">Support</option>
                <option value="Upgrade">Upgrade</option>
            </select>

            {/* Enhanced Cards Filter */}
            <div className="dw-filter-select flex items-center justify-center h-full">
                <label className="dw-filter-checkbox">
                    <input
                        type="checkbox"
                        checked={filters.hideEnhanced}
                        onChange={(e) => handleFilterChange('hideEnhanced', e.target.checked)}
                    />
                    <span>Hide Enhanced Cards</span>
                </label>
            </div>
          </div>

          {/* TABLE VIEW */}
          {cardsViewMode === 'table' && (
          <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
            <table className="w-full text-left deck-builder-table">
              {/* --- MODIFIED: Sortable Headers --- */}
              <thead>
                <tr>
                  <th>Info</th>
                  <th><button onClick={() => requestSort('name')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'name' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Name{sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestSort('type')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'type' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Type{sortConfig.key === 'type' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestSort('rarity')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'rarity' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Rarity{sortConfig.key === 'rarity' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestSort('cost')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'cost' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Cost{sortConfig.key === 'cost' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestSort('description')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'description' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Description{sortConfig.key === 'description' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th>Abilities</th>
                  <th>Targeting</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedCards.map((card, index) => {
                  const currentCountForThisVariant = deck[card.id] || 0;
                  const totalCountForBaseCard = baseCardCounts[card.baseCardId] || 0;
                  const maxInDeck = card.maxInDeck;

                  return (
                    <tr key={`${card.id}-${index}`} className={getTypeBackgroundClass(card.type)}>
                      <td><button onClick={() => setDetailedCard(card)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                      <td className="font-bold">{card.name}</td>
                      <td className={`font-semibold ${getTypeTextClass(card.type)}`}>{card.type}</td>
                      <td style={{ color: RARITY_COLORS[card.rarity] || '#808080' }}>{card.rarity}</td>
                      <td>{card.cost}</td>
                      <td className="text-xs text-gray-400">{card.description}</td>
                      <td><div className="flex flex-wrap gap-2">{card.keywords.map(k => <span key={k} className="ability-chip">{k}</span>)}</div></td>
                      <td className="text-xs">{card.targetingText === 'N/A' ? <span className="text-gray-500">N/A</span> : card.targetingText}</td>
                      <td>
                        <div className="quantity-buttons">
                          {Array.from({ length: maxInDeck + 1 }).map((_, i) => {
                            const isSelected = i === currentCountForThisVariant;
                            const remainingForBase = maxInDeck - (totalCountForBaseCard - currentCountForThisVariant);
                            const isDisabled = i > remainingForBase;
                            return (<button key={i} onClick={() => !readOnly && onDeckChange(card.id, i)} className={`quantity-btn ${isSelected ? 'selected' : ''} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={readOnly || isDisabled}>{i}</button>);
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* GRID VIEW */}
          {cardsViewMode === 'grid' && (
          <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAndSortedCards.map((card, index) => {
                const currentCountForThisVariant = deck[card.id] || 0;
                const totalCountForBaseCard = baseCardCounts[card.baseCardId] || 0;
                const maxInDeck = card.maxInDeck;
                const remainingForBase = maxInDeck - (totalCountForBaseCard - currentCountForThisVariant);
                const isAtMax = remainingForBase <= currentCountForThisVariant;

                return (
                  <div key={`${card.id}-${index}`} className="flex flex-col items-center gap-2">
                    {/* Card Component */}
                    <ActionCard
                      card={card}
                      onClick={() => setDetailedCard(card)}
                      isPlayable={true}
                      isSelected={false}
                      mandatoryAction={null}
                      excessCards={0}
                      scale={1.0}
                    />
                    {/* Quantity Controls */}
                    <div className="dw-quantity-control">
                      <button
                        onClick={() => !readOnly && currentCountForThisVariant > 0 && onDeckChange(card.id, currentCountForThisVariant - 1)}
                        disabled={readOnly || currentCountForThisVariant === 0}
                        className={`dw-quantity-btn ${readOnly ? 'opacity-50' : ''}`}
                      >
                        -
                      </button>
                      <span className="dw-quantity-value">
                        {currentCountForThisVariant}/{maxInDeck}
                      </span>
                      <button
                        onClick={() => !readOnly && !isAtMax && onDeckChange(card.id, currentCountForThisVariant + 1)}
                        disabled={readOnly || isAtMax}
                        className={`dw-quantity-btn ${readOnly ? 'opacity-50' : ''}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
          </>
          )}

          {/* DRONES VIEW */}
          {leftPanelView === 'drones' && (
          <>
          {/* --- Drone Filter Input (shown in both table and grid view) --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Ability Multi-Select Filter */}
            <div className="relative" ref={abilityFilterRef}>
              <button onClick={() => setIsAbilityDropdownOpen(!isAbilityDropdownOpen)} className="dw-filter-select w-full text-left h-full">
                {droneFilters.abilities.length === 0 ? 'Select Abilities' : `${droneFilters.abilities.length} Abilities Selected`}
              </button>
              {isAbilityDropdownOpen && (
                <div className="dw-filter-dropdown">
                  {droneFilterOptions.abilities.map(ability => (
                    <label key={ability} className="dw-filter-dropdown-item">
                      <input type="checkbox" checked={droneFilters.abilities.includes(ability)} onChange={() => handleDroneAbilityToggle(ability)} />
                      {ability}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TABLE VIEW */}
          {dronesViewMode === 'table' && (
          <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
            <table className="w-full text-left deck-builder-table">
              <thead>
                <tr>
                  <th>Info</th>
                  <th><button onClick={() => requestDroneSort('name')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'name' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Name{droneSortConfig.key === 'name' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestDroneSort('rarity')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'rarity' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Rarity{droneSortConfig.key === 'rarity' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestDroneSort('class')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'class' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Cost{droneSortConfig.key === 'class' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestDroneSort('attack')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'attack' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Attack{droneSortConfig.key === 'attack' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestDroneSort('speed')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'speed' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Speed{droneSortConfig.key === 'speed' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestDroneSort('shields')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'shields' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Shields{droneSortConfig.key === 'shields' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestDroneSort('hull')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'hull' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Hull{droneSortConfig.key === 'hull' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th>Abilities</th>
                  <th>Description</th>
                  <th><button onClick={() => requestDroneSort('limit')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'limit' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Limit{droneSortConfig.key === 'limit' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestDroneSort('upgradeSlots')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'upgradeSlots' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Upgrades{droneSortConfig.key === 'upgradeSlots' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedDrones.map((drone, index) => {
                  const currentQuantity = (selectedDrones && selectedDrones[drone.name]) || 0;

                  return (
                    <tr key={`${drone.name}-${index}`}>
                      <td><button onClick={() => setDetailedDrone(drone)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                      <td className="font-bold">{drone.name}</td>
                      <td style={{ color: RARITY_COLORS[drone.rarity] || '#808080' }}>{drone.rarity}</td>
                      <td>{drone.class}</td>
                      <td>{drone.attack}</td>
                      <td>{drone.speed}</td>
                      <td>{drone.shields}</td>
                      <td>{drone.hull}</td>
                      <td><div className="flex flex-wrap gap-2">{drone.keywords.map(k => <span key={k} className="ability-chip">{k}</span>)}</div></td>
                      <td className="text-xs text-gray-400">{drone.description}</td>
                      <td>{drone.limit}</td>
                      <td>{drone.upgradeSlots}</td>
                      <td>
                        <div className="quantity-buttons">
                          <button onClick={() => !readOnly && onDronesChange(drone.name, 0)} disabled={readOnly} className={`quantity-btn ${currentQuantity === 0 ? 'selected' : ''} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>0</button>
                          <button onClick={() => !readOnly && onDronesChange(drone.name, 1)} disabled={readOnly} className={`quantity-btn ${currentQuantity === 1 ? 'selected' : ''} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>1</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* GRID VIEW */}
          {dronesViewMode === 'grid' && (
          <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAndSortedDrones.map((drone, index) => {
                const currentQuantity = (selectedDrones && selectedDrones[drone.name]) || 0;
                const maxQuantity = 1; // Drones can only be selected 0 or 1 times
                const isAtMax = currentQuantity >= maxQuantity;

                return (
                  <div key={`${drone.name}-${index}`} className="flex flex-col items-center gap-2">
                    {/* Drone Card Component */}
                    <DroneCard
                      drone={drone}
                      onClick={() => setDetailedDrone(drone)}
                      isSelectable={false}
                      isSelected={false}
                      deployedCount={0}
                      ignoreDeployLimit={true}
                      appliedUpgrades={[]}
                      scale={1.0}
                      isViewOnly={true}
                    />
                    {/* Quantity Controls */}
                    <div className="dw-quantity-control">
                      <button
                        onClick={() => !readOnly && currentQuantity > 0 && onDronesChange(drone.name, currentQuantity - 1)}
                        disabled={readOnly || currentQuantity === 0}
                        className={`dw-quantity-btn ${readOnly ? 'opacity-50' : ''}`}
                      >
                        -
                      </button>
                      <span className="dw-quantity-value">
                        {currentQuantity}/{maxQuantity}
                      </span>
                      <button
                        onClick={() => !readOnly && !isAtMax && onDronesChange(drone.name, currentQuantity + 1)}
                        disabled={readOnly || isAtMax}
                        className={`dw-quantity-btn ${readOnly ? 'opacity-50' : ''}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
          </>
          )}

          {/* SHIP COMPONENTS VIEW */}
          {leftPanelView === 'ship' && (
          <>
          <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
            <table className="w-full text-left deck-builder-table">
              <thead>
                <tr>
                  <th>Info</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Lane</th>
                </tr>
              </thead>
              <tbody>
                {/* Group by type */}
                {/* Bridge Section */}
                <tr className="bg-cyan-900/20">
                  <td colSpan="5" className="font-bold text-cyan-400 text-sm py-2">BRIDGE</td>
                </tr>
                {activeComponentCollection.filter(comp => comp.type === 'Bridge').map((component, index) => {
                  const selectedLane = selectedShipComponents?.[component.id] || null;
                  // Check which lanes are occupied by other components
                  const occupiedLanes = Object.entries(selectedShipComponents || {})
                    .filter(([id, lane]) => id !== component.id && lane)
                    .map(([id, lane]) => lane);

                  return (
                    <tr key={`${component.id}-${index}`}>
                      <td><button onClick={() => setDetailedShipComponent(component)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                      <td className="font-semibold text-cyan-400">{component.type}</td>
                      <td className="font-bold">{component.name}</td>
                      <td className="text-xs text-gray-400">{component.description}</td>
                      <td>
                        <div className="flex gap-2">
                          {['l', 'm', 'r'].map(lane => (
                            <button
                              key={lane}
                              onClick={() => !readOnly && onShipComponentsChange(component.id, selectedLane === lane ? null : lane)}
                              disabled={readOnly || (occupiedLanes.includes(lane) && selectedLane !== lane)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${readOnly ? 'opacity-50' : ''} ${
                                selectedLane === lane
                                  ? 'bg-cyan-500 text-white'
                                  : readOnly || occupiedLanes.includes(lane)
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-700 text-gray-300 hover:bg-cyan-600 hover:text-white'
                              }`}
                            >
                              {lane.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Power Cell Section */}
                <tr className="bg-purple-900/20">
                  <td colSpan="5" className="font-bold text-purple-400 text-sm py-2">POWER CELL</td>
                </tr>
                {activeComponentCollection.filter(comp => comp.type === 'Power Cell').map((component, index) => {
                  const selectedLane = selectedShipComponents?.[component.id] || null;
                  const occupiedLanes = Object.entries(selectedShipComponents || {})
                    .filter(([id, lane]) => id !== component.id && lane)
                    .map(([id, lane]) => lane);

                  return (
                    <tr key={`${component.id}-${index}`}>
                      <td><button onClick={() => setDetailedShipComponent(component)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                      <td className="font-semibold text-purple-400">{component.type}</td>
                      <td className="font-bold">{component.name}</td>
                      <td className="text-xs text-gray-400">{component.description}</td>
                      <td>
                        <div className="flex gap-2">
                          {['l', 'm', 'r'].map(lane => (
                            <button
                              key={lane}
                              onClick={() => !readOnly && onShipComponentsChange(component.id, selectedLane === lane ? null : lane)}
                              disabled={readOnly || (occupiedLanes.includes(lane) && selectedLane !== lane)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${readOnly ? 'opacity-50' : ''} ${
                                selectedLane === lane
                                  ? 'bg-purple-500 text-white'
                                  : readOnly || occupiedLanes.includes(lane)
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-700 text-gray-300 hover:bg-purple-600 hover:text-white'
                              }`}
                            >
                              {lane.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Drone Control Hub Section */}
                <tr className="bg-red-900/20">
                  <td colSpan="5" className="font-bold text-red-400 text-sm py-2">DRONE CONTROL HUB</td>
                </tr>
                {activeComponentCollection.filter(comp => comp.type === 'Drone Control Hub').map((component, index) => {
                  const selectedLane = selectedShipComponents?.[component.id] || null;
                  const occupiedLanes = Object.entries(selectedShipComponents || {})
                    .filter(([id, lane]) => id !== component.id && lane)
                    .map(([id, lane]) => lane);

                  return (
                    <tr key={`${component.id}-${index}`}>
                      <td><button onClick={() => setDetailedShipComponent(component)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                      <td className="font-semibold text-red-400">{component.type}</td>
                      <td className="font-bold">{component.name}</td>
                      <td className="text-xs text-gray-400">{component.description}</td>
                      <td>
                        <div className="flex gap-2">
                          {['l', 'm', 'r'].map(lane => (
                            <button
                              key={lane}
                              onClick={() => !readOnly && onShipComponentsChange(component.id, selectedLane === lane ? null : lane)}
                              disabled={readOnly || (occupiedLanes.includes(lane) && selectedLane !== lane)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${readOnly ? 'opacity-50' : ''} ${
                                selectedLane === lane
                                  ? 'bg-red-500 text-white'
                                  : readOnly || occupiedLanes.includes(lane)
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                              }`}
                            >
                              {lane.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
          )}
        </div>

        {/* Right Side: Your Items */}
        <div className={`w-full lg:w-1/3 ${mobileActivePanel === 'left' ? 'hidden lg:flex' : 'flex'} flex-col dw-panel h-[calc(100vh-140px)] lg:h-[calc(100vh-99px)] mx-[10px] lg:mr-[10px] lg:ml-0`}>
          <div className="dw-panel-header">
            <div className="dw-modal-tabs" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0, flexWrap: 'wrap' }}>
              <button
                onClick={() => setRightPanelView('shipCard')}
                className={`dw-modal-tab ${rightPanelView === 'shipCard' ? 'dw-modal-tab--active' : ''}`}
              >
                Ship
              </button>
              <button
                onClick={() => setRightPanelView('deck')}
                className={`dw-modal-tab ${rightPanelView === 'deck' ? 'dw-modal-tab--active' : ''}`}
              >
                Deck ({cardCount}/{totalCardLimit})
              </button>
              <button
                onClick={() => setRightPanelView('drones')}
                className={`dw-modal-tab ${rightPanelView === 'drones' ? 'dw-modal-tab--active' : ''}`}
              >
                Drones ({droneCount}/{maxDrones})
              </button>
              <button
                onClick={() => setRightPanelView('ship')}
                className={`dw-modal-tab ${rightPanelView === 'ship' ? 'dw-modal-tab--active' : ''}`}
              >
                Components ({shipComponentCount}/3)
              </button>
            </div>
            <button
              onClick={readOnly ? undefined : (rightPanelView === 'deck' ? resetDeck : rightPanelView === 'drones' ? resetDrones : () => onShipComponentsChange(null, null))}
              disabled={readOnly}
              className={`btn-reset ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Reset
            </button>
          </div>

          {/* SELECTED SHIP VIEW */}
          {rightPanelView === 'shipCard' && (
            <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
              {activeShip ? (
                <div className="flex flex-col items-center">
                  <ShipCard
                    ship={activeShip}
                    onClick={() => {}}
                    isSelectable={false}
                    isSelected={true}
                  />
                  <div className="dw-info-box mt-4 w-full">
                    <h4 className="dw-info-box-title">Deck Limits</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="dw-info-row">
                        <span className="dw-info-row-label">Total Cards:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.totalCards}</span>
                      </div>
                      <div className="dw-info-row">
                        <span className="dw-info-row-label dw-info-row-label--ordnance">Ordnance:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.ordnanceLimit}</span>
                      </div>
                      <div className="dw-info-row">
                        <span className="dw-info-row-label dw-info-row-label--tactic">Tactic:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.tacticLimit}</span>
                      </div>
                      <div className="dw-info-row">
                        <span className="dw-info-row-label dw-info-row-label--support">Support:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.supportLimit}</span>
                      </div>
                      <div className="dw-info-row">
                        <span className="dw-info-row-label dw-info-row-label--upgrade">Upgrade:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.upgradeLimit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dw-empty-state">
                  No ship selected. Go to the Ship tab to select one.
                </div>
              )}
            </div>
          )}

          {/* DECK LIST VIEW */}
          {rightPanelView === 'deck' && (
          <div className="flex-grow overflow-y-auto pr-2 deck-list dw-modal-scroll">
            {deckListForDisplay.length > 0 ? (
              deckListForDisplay.map(card => {
                const isAtMax = baseCardCounts[card.baseCardId] >= card.maxInDeck;
                return (
                  <div key={card.id} className="deck-list-item">
                    {/* --- NEW ICON BUTTON --- */}
                    <button
                      onClick={() => setDetailedCard(card)}
                      className="p-1 text-gray-400 hover:text-white flex-shrink-0 mr-3"
                      title="View Card Details"
                    >
                      <Eye size={18} />
                    </button>
                    <span className="flex-grow truncate" title={card.name}>{card.name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => !readOnly && onDeckChange(card.id, card.quantity - 1)}
                        disabled={readOnly}
                        className={`deck-edit-btn ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        -
                      </button>
                      <span className="font-bold w-8 text-center">x {card.quantity}</span>
                      <button
                        onClick={() => !readOnly && onDeckChange(card.id, card.quantity + 1)}
                        disabled={readOnly || isAtMax}
                        className={`deck-edit-btn ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 italic">Your deck is empty. Add cards from the left.</p>
            )}
          </div>
          )}

          {/* CARD TYPE COUNTS DISPLAY */}
          {rightPanelView === 'deck' && cardCount > 0 && (
            <div className="dw-type-stats">
              <h3 className="dw-type-stats-title">Card Types</h3>
              <div className="space-y-1">
                {Object.entries(typeLimits).map(([type, limit]) => {
                  const count = typeCounts[type] || 0;
                  const isOverLimit = count > limit;
                  const percentage = (count / limit) * 100;
                  const typeClass = type.toLowerCase();
                  return (
                    <div key={type} className="dw-type-stats-row">
                      <span className={`dw-type-stats-label ${isOverLimit ? 'dw-type-stats-label--danger' : `dw-type-stats-label--${typeClass}`}`}>
                        {type}:
                      </span>
                      <div className="dw-progress-bar">
                        <div
                          className={`dw-progress-bar-fill ${isOverLimit ? 'dw-progress-bar-fill--danger' : 'dw-progress-bar-fill--action'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                        <span className="dw-progress-bar-label">
                          {count}/{limit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DRONE LIST VIEW */}
          {rightPanelView === 'drones' && (
          <div className="flex-grow overflow-y-auto pr-2 deck-list dw-modal-scroll">
            {droneListForDisplay.length > 0 ? (
              droneListForDisplay.map(drone => {
                // Check for damage indicator (extraction mode only)
                const droneInstance = droneInstances.find(i => i.droneName === drone.name);
                const isDamaged = drone.hasDamagedInstance || droneInstance?.isDamaged;

                return (
                  <div key={drone.name} className={`deck-list-item ${isDamaged ? 'bg-yellow-900/20 border-l-2 border-yellow-500' : ''}`}>
                    {/* Damage indicator */}
                    {isDamaged && (
                      <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mr-2" title="Damaged - Cannot deploy until repaired" />
                    )}
                    {/* Eye icon to view drone details */}
                    <button
                      onClick={() => setDetailedDrone(drone)}
                      className="p-1 text-gray-400 hover:text-white flex-shrink-0 mr-3"
                      title="View Drone Details"
                    >
                      <Eye size={18} />
                    </button>
                    <span className="flex-grow truncate" title={drone.name}>{drone.name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => onDronesChange(drone.name, 0)}
                        disabled={readOnly}
                        className="deck-edit-btn"
                      >
                        -
                      </button>
                      <span className="font-bold w-8 text-center">x {drone.quantity}</span>
                      <button
                        onClick={() => onDronesChange(drone.name, 1)}
                        disabled={readOnly || droneCount >= maxDrones}
                        className="deck-edit-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 italic">Your drone pool is empty. Add drones from the left.</p>
            )}
          </div>
          )}

          {/* SHIP COMPONENTS VIEW */}
          {rightPanelView === 'ship' && (
          <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
            <div className="flex flex-col gap-4">
              {/* Display ship layout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['l', 'm', 'r'].map((lane, index) => {
                  const componentEntry = Object.entries(selectedShipComponents || {}).find(([id, l]) => l === lane);
                  const component = componentEntry ? activeComponentCollection.find(c => c.id === componentEntry[0]) : null;

                  return (
                    <div key={lane} className={`p-4 rounded-lg border-2 ${component ? 'border-cyan-500 bg-cyan-900/10' : 'border-dashed border-gray-600 bg-gray-800/30'}`}>
                      <div className="text-center mb-2">
                        <span className="font-bold text-sm text-cyan-400">
                          {index === 1 ? 'MIDDLE (Bonus)' : index === 0 ? 'LEFT' : 'RIGHT'}
                        </span>
                      </div>
                      {component ? (
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">{component.type}</div>
                          <div className="font-bold text-white mb-2">{component.name}</div>
                          <div className="text-xs text-gray-500 mb-2">{component.description}</div>
                          {index === 1 && (
                            <div className="text-xs text-cyan-300 font-semibold">
                              + Bonus Stats
                            </div>
                          )}
                          {/* Hull display for extraction mode */}
                          {mode === 'extraction' && componentInstances.length > 0 && (() => {
                            const inst = componentInstances.find(i => i.componentId === componentEntry[0]);
                            if (inst) {
                              const hullPercent = (inst.currentHull / inst.maxHull) * 100;
                              const isDamaged = inst.currentHull < inst.maxHull;
                              return (
                                <div className="mt-2 p-2 bg-gray-800/50 rounded">
                                  <div className="text-xs text-gray-400 mb-1">Hull</div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-grow bg-gray-700 rounded h-2 overflow-hidden">
                                      <div
                                        className={`h-full transition-all ${hullPercent < 50 ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${hullPercent}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold">{inst.currentHull}/{inst.maxHull}</span>
                                  </div>
                                  {isDamaged && (
                                    <div className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                      <AlertTriangle size={12} /> Repair Needed
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 italic text-xs py-4">
                          No component
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* List view of selected components */}
              {shipComponentCount > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-gray-400 mb-2">Selected Components</h4>
                  <div className="deck-list">
                    {Object.entries(selectedShipComponents || {})
                      .filter(([id, lane]) => lane)
                      .map(([id, lane]) => {
                        const component = activeComponentCollection.find(c => c.id === id);
                        if (!component) return null;

                        return (
                          <div key={id} className="deck-list-item">
                            <span className="flex-grow truncate" title={component.name}>
                              {component.name} ({component.type})
                            </span>
                            <span className="font-bold text-cyan-400">
                              Lane: {lane.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {shipComponentCount === 0 && (
                <p className="text-gray-500 italic text-center py-8">
                  No ship components selected. Select components from the left.
                </p>
              )}
            </div>
          </div>
          )}

{/* --- Statistics Section --- */}
          {/* DECK STATISTICS */}
          {rightPanelView === 'deck' && cardCount > 0 && (
            <div className="dw-stats-section">
              <button
                onClick={() => setIsStatsVisible(!isStatsVisible)}
                className="dw-stats-toggle"
              >
                Deck Statistics
                <ChevronUp size={18} className={`dw-stats-toggle-icon ${!isStatsVisible ? 'dw-stats-toggle-icon--collapsed' : ''}`} />
              </button>

              <div className={`dw-stats-content ${isStatsVisible ? 'dw-stats-content--visible' : 'dw-stats-content--hidden'}`}>
                <div className="dw-modal-tabs" style={{ justifyContent: 'center', borderBottom: 'none', marginBottom: '8px', paddingBottom: '8px' }}>
                  <button onClick={() => setActiveChartView('cost')} className={`dw-modal-tab ${activeChartView === 'cost' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Cost
                  </button>
                  <button onClick={() => setActiveChartView('type')} className={`dw-modal-tab ${activeChartView === 'type' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Type
                  </button>
                  <button onClick={() => setActiveChartView('ability')} className={`dw-modal-tab ${activeChartView === 'ability' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Abilities
                  </button>
                </div>
                <div className="text-xs h-48 sm:h-56 lg:h-72">
                  {activeChartView === 'cost' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Card Cost Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deckStats.barChartData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                          <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                          <Tooltip cursor={{fill: 'rgba(128, 90, 213, 0.2)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                          <Bar dataKey="count" fill="#8884d8" name="Card Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'type' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Card Type Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                          <Pie
                            data={[
                              { name: 'Ordnance', value: deckListForDisplay.filter(card => card.type === 'Ordnance').reduce((sum, card) => sum + card.quantity, 0), color: '#ef4444' },
                              { name: 'Tactic', value: deckListForDisplay.filter(card => card.type === 'Tactic').reduce((sum, card) => sum + card.quantity, 0), color: '#f59e0b' },
                              { name: 'Support', value: deckListForDisplay.filter(card => card.type === 'Support').reduce((sum, card) => sum + card.quantity, 0), color: '#10b981' },
                              { name: 'Upgrade', value: deckListForDisplay.filter(card => card.type === 'Upgrade').reduce((sum, card) => sum + card.quantity, 0), color: '#c084fc' }
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'Ordnance', value: deckListForDisplay.filter(card => card.type === 'Ordnance').reduce((sum, card) => sum + card.quantity, 0), color: '#ef4444' },
                              { name: 'Tactic', value: deckListForDisplay.filter(card => card.type === 'Tactic').reduce((sum, card) => sum + card.quantity, 0), color: '#f59e0b' },
                              { name: 'Support', value: deckListForDisplay.filter(card => card.type === 'Support').reduce((sum, card) => sum + card.quantity, 0), color: '#10b981' },
                              { name: 'Upgrade', value: deckListForDisplay.filter(card => card.type === 'Upgrade').reduce((sum, card) => sum + card.quantity, 0), color: '#c084fc' }
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'ability' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Ability Breakdown</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                          <Pie
                            data={deckStats.pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={60}
                            dataKey="value"
                          >
                            {deckStats.pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DRONE STATISTICS */}
          {rightPanelView === 'drones' && droneCount > 0 && (
            <div className="dw-stats-section">
              <button
                onClick={() => setIsStatsVisible(!isStatsVisible)}
                className="dw-stats-toggle"
              >
                Drone Statistics
                <ChevronUp size={18} className={`dw-stats-toggle-icon ${!isStatsVisible ? 'dw-stats-toggle-icon--collapsed' : ''}`} />
              </button>

              <div className={`dw-stats-content ${isStatsVisible ? 'dw-stats-content--visible' : 'dw-stats-content--hidden'}`}>
                <div className="dw-modal-tabs" style={{ justifyContent: 'center', borderBottom: 'none', marginBottom: '8px', paddingBottom: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => setActiveChartView('cost')} className={`dw-modal-tab ${activeChartView === 'cost' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '11px', padding: '5px 10px' }}>Cost</button>
                  <button onClick={() => setActiveChartView('attack')} className={`dw-modal-tab ${activeChartView === 'attack' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '11px', padding: '5px 10px' }}>Attack</button>
                  <button onClick={() => setActiveChartView('speed')} className={`dw-modal-tab ${activeChartView === 'speed' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '11px', padding: '5px 10px' }}>Speed</button>
                  <button onClick={() => setActiveChartView('shields')} className={`dw-modal-tab ${activeChartView === 'shields' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '11px', padding: '5px 10px' }}>Shields</button>
                  <button onClick={() => setActiveChartView('hull')} className={`dw-modal-tab ${activeChartView === 'hull' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '11px', padding: '5px 10px' }}>Hull</button>
                  <button onClick={() => setActiveChartView('limit')} className={`dw-modal-tab ${activeChartView === 'limit' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '11px', padding: '5px 10px' }}>Limit</button>
                  <button onClick={() => setActiveChartView('upgrades')} className={`dw-modal-tab ${activeChartView === 'upgrades' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '11px', padding: '5px 10px' }}>Upgrades</button>
                  <button onClick={() => setActiveChartView('ability')} className={`dw-modal-tab ${activeChartView === 'ability' ? 'dw-modal-tab--active' : ''}`} style={{ fontSize: '11px', padding: '5px 10px' }}>Abilities</button>
                </div>
                <div className="text-xs h-48 sm:h-56 lg:h-72">
                  {activeChartView === 'cost' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Drone Cost Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={droneStats.costData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                          <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                          <Tooltip cursor={{fill: 'rgba(128, 90, 213, 0.2)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                          <Bar dataKey="count" fill="#8884d8" name="Drone Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'attack' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Attack Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={droneStats.attackData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                          <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                          <Tooltip cursor={{fill: 'rgba(128, 90, 213, 0.2)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                          <Bar dataKey="count" fill="#ef4444" name="Drone Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'speed' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Speed Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={droneStats.speedData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                          <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                          <Tooltip cursor={{fill: 'rgba(128, 90, 213, 0.2)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                          <Bar dataKey="count" fill="#3b82f6" name="Drone Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'shields' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Shield Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={droneStats.shieldsData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                          <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                          <Tooltip cursor={{fill: 'rgba(128, 90, 213, 0.2)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                          <Bar dataKey="count" fill="#06b6d4" name="Drone Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'hull' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Hull Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={droneStats.hullData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                          <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                          <Tooltip cursor={{fill: 'rgba(128, 90, 213, 0.2)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                          <Bar dataKey="count" fill="#22c55e" name="Drone Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'limit' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Deployment Limit Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={droneStats.limitData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                          <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                          <Tooltip cursor={{fill: 'rgba(128, 90, 213, 0.2)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                          <Bar dataKey="count" fill="#f59e0b" name="Drone Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'upgrades' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Upgrade Slots Distribution</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={droneStats.upgradesData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                          <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                          <Tooltip cursor={{fill: 'rgba(128, 90, 213, 0.2)'}} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                          <Bar dataKey="count" fill="#a855f7" name="Drone Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {activeChartView === 'ability' && (
                    <div className="w-full h-full flex flex-col items-center">
                      <h4 className="font-semibold mb-1">Ability Breakdown</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                          <Pie
                            data={droneStats.abilityData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={60}
                            dataKey="value"
                          >
                            {droneStats.abilityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

                    {/* Save/Confirm Button - hidden in readOnly mode */}
                    {!readOnly && (
                      <>
                        {allowInvalidSave ? (
                          // Extraction mode: can save incomplete, but with warning
                          <button
                            onClick={isDeckValid && isDronesValid && shipComponentsValid ? onConfirmDeck : onSaveInvalid}
                            className={`w-full p-4 mt-4 text-lg font-bold font-orbitron ${
                              isDeckValid && isDronesValid && shipComponentsValid
                                ? 'btn-confirm'
                                : 'bg-yellow-600 hover:bg-yellow-500 text-black'
                            }`}
                            title={!shipComponentsValid ? 'You must select all 3 ship components with lanes assigned' : ''}
                          >
                            {isDeckValid && isDronesValid && shipComponentsValid
                              ? 'Save Deck'
                              : 'Save Incomplete Deck'}
                          </button>
                        ) : (
                          // Multiplayer mode: must be complete
                          <button
                            onClick={onConfirmDeck}
                            disabled={!isDeckValid || !isDronesValid || !shipComponentsValid}
                            className="btn-confirm w-full p-4 mt-4 text-lg font-bold font-orbitron disabled:opacity-50"
                            title={!shipComponentsValid ? 'You must select all 3 ship components with lanes assigned' : ''}
                          >
                            Confirm Deck, Drones & Ship
                          </button>
                        )}
                        {/* Validation warnings for extraction mode */}
                        {allowInvalidSave && (!isDeckValid || !isDronesValid || !shipComponentsValid) && (
                          <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded text-xs text-yellow-300">
                            <div className="flex items-center gap-1 font-semibold mb-1">
                              <AlertTriangle size={14} /> Deck Incomplete - Cannot Deploy
                            </div>
                            {!isDeckValid && <div>Need {totalCardLimit} cards (have {Object.values(deck || {}).reduce((sum, qty) => sum + qty, 0)})</div>}
                            {!isDronesValid && <div>Need {maxDrones} drones (have {droneCount})</div>}
                            {!shipComponentsValid && <div>Need 3 ship components with unique lanes</div>}
                          </div>
                        )}
                      </>
                    )}
                    {readOnly && (
                      <div className="text-center text-gray-500 italic mt-4 p-4 bg-gray-800/50 rounded">
                        Viewing Starter Deck (Read Only)
                      </div>
                    )}
        </div>
      </div>
     </div>
  );
};

export default DeckBuilder;