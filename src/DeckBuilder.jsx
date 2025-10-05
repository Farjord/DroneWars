import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Eye, Bolt, Upload, Download, Copy, X, ChevronUp, Sword, Rocket, Shield, Grid } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import ActionCard from './components/ui/ActionCard.jsx';
import DroneCard from './components/ui/DroneCard.jsx';
import ViewDeckModal from './components/modals/ViewDeckModal.jsx';
import fullDroneCollection from './data/droneData.js';

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
          isMandatoryTarget={false}
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
        />
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
  onConfirmDeck,
  onImportDeck
}) => {
  const [detailedCard, setDetailedCard] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewDeckModal, setShowViewDeckModal] = useState(false);

  // Panel view toggles
  const [leftPanelView, setLeftPanelView] = useState('cards'); // 'cards' or 'drones'
  const [rightPanelView, setRightPanelView] = useState('deck'); // 'deck' or 'drones'

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
    return fullDroneCollection.map(drone => {
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
  }, []);

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
  const { cardCount, deckListForDisplay, baseCardCounts } = useMemo(() => {
    const counts = {};
    let total = 0;
    
    // Iterate over the deck object, which is { cardId: quantity }
    Object.entries(deck).forEach(([cardId, quantity]) => {
      if (quantity > 0) {
        total += quantity;
        const card = processedCardCollection.find(c => c.id === cardId);
        if (card) {
          const baseId = card.baseCardId;
          counts[baseId] = (counts[baseId] || 0) + quantity;
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

    return { cardCount: total, deckListForDisplay: displayList, baseCardCounts: counts };
  }, [deck, processedCardCollection]);

  const isDeckValid = cardCount >= 40;

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

  const isDronesValid = droneCount === 10;

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
    const deckCode = useMemo(() => {
      const cardsStr = Object.entries(deck).map(([id, q]) => `${id}:${q}`).join(',');
      const dronesStr = Object.entries(selectedDrones || {}).map(([name, q]) => `${name}:${q}`).join(',');
      return `cards:${cardsStr}|drones:${dronesStr}`;
    }, [deck, selectedDrones]);

    const copyToClipboard = () => {
      textAreaRef.current.select();
      document.execCommand('copy');
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
      {/* This is the re-added content panel div */}
      <div className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-orbitron mb-4">Export Deck Code</h2>
        <p className="text-gray-400 mb-4">Copy the code below to save or share your deck and drones.</p>
        <textarea
          ref={textAreaRef}
          readOnly
          value={deckCode}
          className="w-full h-32 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 font-mono"
        />
        <div className="flex justify-end gap-4 mt-4">
          <span className="text-green-400 self-center">{copySuccess}</span>
          <button onClick={copyToClipboard} className="btn-confirm flex items-center gap-2">
            <Copy size={16} /> Copy to Clipboard
          </button>
          <button onClick={() => setShowExportModal(false)} className="btn-cancel flex items-center gap-2">
            <X size={16} /> Close
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
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
        <div className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-orbitron mb-4">Import Deck Code</h2>
          <p className="text-gray-400 mb-4">Paste a deck code below to load both cards and drones into the builder.</p>
          <textarea
            value={deckCode}
            onChange={(e) => setDeckCode(e.target.value)}
            className="w-full h-32 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 font-mono"
            placeholder="cards:CARD001:4,CARD002:2|drones:Scout Drone:1,Heavy Fighter:1"
          />
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <div className="flex justify-end gap-4 mt-4">
            <button onClick={() => setShowImportModal(false)} className="btn-cancel">Cancel</button>
            <button onClick={handleImport} className="btn-confirm">Load Deck</button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="w-full flex flex-col text-white font-exo mt-8 text-sm">
      {detailedCard && <CardDetailPopup card={detailedCard} onClose={() => setDetailedCard(null)} />}
      {detailedDrone && <DroneDetailPopup drone={detailedDrone} onClose={() => setDetailedDrone(null)} />}
      {showExportModal && <ExportModal />}
      {showImportModal && <ImportModal />}
      <ViewDeckModal
        isOpen={showViewDeckModal}
        onClose={() => setShowViewDeckModal(false)}
        title="Your Deck & Drones"
        drones={viewDeckData.drones}
        cards={viewDeckData.cards}
      />

      <div className="flex justify-center items-center mb-4">
        <h1 className="text-3xl font-orbitron font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Deck Builder</h1>
        {/* --- NEW: Import/Export Buttons --- */}
        <div className="flex gap-4 ml-8">
          <button onClick={() => setShowImportModal(true)} className="btn-utility flex items-center gap-2">
            <Upload size={16} /> Import
          </button>
          <button onClick={() => setShowExportModal(true)} className="btn-utility flex items-center gap-2">
            <Download size={16} /> Export
          </button>
        </div>
      </div>
      
      <div className="flex-grow flex gap-6 min-h-0 mb-[10px]">

        {/* Left Side: Available Items */}
        <div className="w-2/3 flex flex-col bg-slate-900/50 rounded-lg p-4 border border-gray-700 h-[calc(100vh-99px)] ml-[10px]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLeftPanelView('cards');
                  setRightPanelView('deck');
                }}
                className={`btn-utility ${leftPanelView === 'cards' ? 'opacity-100' : 'opacity-60'}`}
              >
                Cards
              </button>
              <button
                onClick={() => {
                  setLeftPanelView('drones');
                  setRightPanelView('drones');
                }}
                className={`btn-utility ${leftPanelView === 'drones' ? 'opacity-100' : 'opacity-60'}`}
              >
                Drones
              </button>
              <button
                onClick={() => setShowViewDeckModal(true)}
                className="btn-utility flex items-center gap-2"
              >
                <Grid size={16} />
                View All
              </button>
            </div>
            <button
              onClick={leftPanelView === 'cards' ? resetFilters : resetDroneFilters}
              className="btn-reset"
            >
              Reset Filters
            </button>
          </div>

          {/* CARDS VIEW */}
          {leftPanelView === 'cards' && (
          <>
          {/* --- Filter Input --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Cost Range Filter */}
            <div className="filter-select flex flex-col justify-center">
                <label className="text-center text-gray-400 mb-1">Cost Range: {filters.cost.min} - {filters.cost.max}</label>
                <div className="flex gap-2">
                    <input
                        type="range"
                        min={filterOptions.minCost}
                        max={filterOptions.maxCost}
                        value={filters.cost.min}
                        onChange={(e) => handleFilterChange('cost', { ...filters.cost, min: Math.min(parseInt(e.target.value), filters.cost.max) })}
                        className="w-1/2"
                    />
                    <input
                        type="range"
                        min={filterOptions.minCost}
                        max={filterOptions.maxCost}
                        value={filters.cost.max}
                        onChange={(e) => handleFilterChange('cost', { ...filters.cost, max: Math.max(parseInt(e.target.value), filters.cost.min) })}
                        className="w-1/2"
                    />
                </div>
            </div>
            
            {/* Ability Multi-Select Filter */}
            <div className="relative" ref={abilityFilterRef}>
                <button onClick={() => setIsAbilityDropdownOpen(!isAbilityDropdownOpen)} className="filter-select w-full text-left h-full">
                    {filters.abilities.length === 0 ? 'Select Abilities' : `${filters.abilities.length} Abilities Selected`}
                </button>
                {isAbilityDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 bg-slate-800 border border-gray-600 mt-1 rounded-md z-10 max-h-60 overflow-y-auto">
                        {filterOptions.abilities.map(ability => (
                            <label key={ability} className="flex items-center p-2 hover:bg-slate-700 cursor-pointer">
                                <input type="checkbox" checked={filters.abilities.includes(ability)} onChange={() => handleAbilityToggle(ability)} className="mr-2" />
                                {ability}
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Type Filter */}
            <select onChange={(e) => handleFilterChange('type', e.target.value)} value={filters.type} className="filter-select h-full">
                <option value="all">All Types</option>
                <option value="Action">Action Cards</option>
                <option value="Upgrade">Upgrade Cards</option>
            </select>

            {/* Enhanced Cards Filter */}
            <div className="filter-select flex items-center justify-center h-full">
                <label className="flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={filters.hideEnhanced}
                        onChange={(e) => handleFilterChange('hideEnhanced', e.target.checked)}
                        className="mr-2"
                    />
                    <span className="text-gray-300">Hide Enhanced Cards</span>
                </label>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto pr-2">
            <table className="w-full text-left deck-builder-table">
              {/* --- MODIFIED: Sortable Headers --- */}
              <thead>
                <tr>
                  <th>Info</th>
                  <th><button onClick={() => requestSort('name')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'name' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Name{sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
                  <th><button onClick={() => requestSort('type')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'type' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Type{sortConfig.key === 'type' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
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
                    <tr key={`${card.id}-${index}`} className={card.type === 'Upgrade' ? 'bg-purple-900/10' : ''}>
                      <td><button onClick={() => setDetailedCard(card)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                      <td className="font-bold">{card.name}</td>
                      <td className={`font-semibold ${card.type === 'Upgrade' ? 'text-purple-400' : 'text-cyan-400'}`}>{card.type}</td>
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
                            return (<button key={i} onClick={() => onDeckChange(card.id, i)} className={`quantity-btn ${isSelected ? 'selected' : ''}`} disabled={isDisabled}>{i}</button>);
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
          )}

          {/* DRONES VIEW */}
          {leftPanelView === 'drones' && (
          <>
          {/* --- Drone Filter Input --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Ability Multi-Select Filter */}
            <div className="relative" ref={abilityFilterRef}>
              <button onClick={() => setIsAbilityDropdownOpen(!isAbilityDropdownOpen)} className="filter-select w-full text-left h-full">
                {droneFilters.abilities.length === 0 ? 'Select Abilities' : `${droneFilters.abilities.length} Abilities Selected`}
              </button>
              {isAbilityDropdownOpen && (
                <div className="absolute top-full left-0 right-0 bg-slate-800 border border-gray-600 mt-1 rounded-md z-10 max-h-60 overflow-y-auto">
                  {droneFilterOptions.abilities.map(ability => (
                    <label key={ability} className="flex items-center p-2 hover:bg-slate-700 cursor-pointer">
                      <input type="checkbox" checked={droneFilters.abilities.includes(ability)} onChange={() => handleDroneAbilityToggle(ability)} className="mr-2" />
                      {ability}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-grow overflow-y-auto pr-2">
            <table className="w-full text-left deck-builder-table">
              <thead>
                <tr>
                  <th>Info</th>
                  <th><button onClick={() => requestDroneSort('name')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'name' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Name{droneSortConfig.key === 'name' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
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
                          <button onClick={() => onDronesChange(drone.name, 0)} className={`quantity-btn ${currentQuantity === 0 ? 'selected' : ''}`}>0</button>
                          <button onClick={() => onDronesChange(drone.name, 1)} className={`quantity-btn ${currentQuantity === 1 ? 'selected' : ''}`}>1</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
          )}
        </div>

        {/* Right Side: Your Items */}
        <div className="w-1/3 flex flex-col bg-slate-900/50 rounded-lg p-4 border border-gray-700 h-[calc(100vh-99px)] mr-[10px]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setRightPanelView('deck')}
                className={`btn-utility ${rightPanelView === 'deck' ? 'opacity-100' : 'opacity-60'}`}
              >
                Your Deck ({cardCount}/40)
              </button>
              <button
                onClick={() => setRightPanelView('drones')}
                className={`btn-utility ${rightPanelView === 'drones' ? 'opacity-100' : 'opacity-60'}`}
              >
                Your Drones ({droneCount}/10)
              </button>
            </div>
            <button
              onClick={rightPanelView === 'deck' ? resetDeck : resetDrones}
              className="btn-reset"
            >
              Reset {rightPanelView === 'deck' ? 'Deck' : 'Drones'}
            </button>
          </div>

          {/* DECK LIST VIEW */}
          {rightPanelView === 'deck' && (
          <div className="flex-grow overflow-y-auto pr-2 deck-list">
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
                        onClick={() => onDeckChange(card.id, card.quantity - 1)}
                        className="deck-edit-btn"
                      >
                        -
                      </button>
                      <span className="font-bold w-8 text-center">x {card.quantity}</span>
                      <button
                        onClick={() => onDeckChange(card.id, card.quantity + 1)}
                        disabled={isAtMax}
                        className="deck-edit-btn"
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

          {/* DRONE LIST VIEW */}
          {rightPanelView === 'drones' && (
          <div className="flex-grow overflow-y-auto pr-2 deck-list">
            {droneListForDisplay.length > 0 ? (
              droneListForDisplay.map(drone => {
                return (
                  <div key={drone.name} className="deck-list-item">
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
                        className="deck-edit-btn"
                      >
                        -
                      </button>
                      <span className="font-bold w-8 text-center">x {drone.quantity}</span>
                      <button
                        onClick={() => onDronesChange(drone.name, 1)}
                        disabled={droneCount >= 10}
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

{/* --- Statistics Section --- */}
          {/* DECK STATISTICS */}
          {rightPanelView === 'deck' && cardCount > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-slate-700">
              <button
                onClick={() => setIsStatsVisible(!isStatsVisible)}
                className="w-full flex justify-center items-center gap-2 text-lg font-orbitron mb-2 text-center text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                Deck Statistics
                <ChevronUp size={20} className={`transition-transform duration-300 ${isStatsVisible ? 'rotate-0' : 'rotate-180'}`} />
              </button>

              <div className={`transition-all ease-in-out duration-500 overflow-hidden ${isStatsVisible ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex justify-center gap-2 mb-2">
                  <button onClick={() => setActiveChartView('cost')} className={`btn-info text-xs ${activeChartView === 'cost' ? 'opacity-100' : 'opacity-60'}`}>
                    Cost
                  </button>
                  <button onClick={() => setActiveChartView('type')} className={`btn-info text-xs ${activeChartView === 'type' ? 'opacity-100' : 'opacity-60'}`}>
                    Type
                  </button>
                  <button onClick={() => setActiveChartView('ability')} className={`btn-info text-xs ${activeChartView === 'ability' ? 'opacity-100' : 'opacity-60'}`}>
                    Abilities
                  </button>
                </div>
                <div className="text-xs" style={{ height: '280px' }}>
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
                              { name: 'Action Cards', value: deckListForDisplay.filter(card => card.type === 'Action').reduce((sum, card) => sum + card.quantity, 0), color: '#22d3ee' },
                              { name: 'Upgrade Cards', value: deckListForDisplay.filter(card => card.type === 'Upgrade').reduce((sum, card) => sum + card.quantity, 0), color: '#c084fc' }
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
                              { name: 'Action Cards', value: deckListForDisplay.filter(card => card.type === 'Action').reduce((sum, card) => sum + card.quantity, 0), color: '#22d3ee' },
                              { name: 'Upgrade Cards', value: deckListForDisplay.filter(card => card.type === 'Upgrade').reduce((sum, card) => sum + card.quantity, 0), color: '#c084fc' }
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
            <div className="mt-4 pt-4 border-t-2 border-slate-700">
              <button
                onClick={() => setIsStatsVisible(!isStatsVisible)}
                className="w-full flex justify-center items-center gap-2 text-lg font-orbitron mb-2 text-center text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                Drone Statistics
                <ChevronUp size={20} className={`transition-transform duration-300 ${isStatsVisible ? 'rotate-0' : 'rotate-180'}`} />
              </button>

              <div className={`transition-all ease-in-out duration-500 overflow-hidden ${isStatsVisible ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex justify-center gap-2 mb-2 flex-wrap">
                  <button onClick={() => setActiveChartView('cost')} className={`btn-info text-xs ${activeChartView === 'cost' ? 'opacity-100' : 'opacity-60'}`}>Cost</button>
                  <button onClick={() => setActiveChartView('attack')} className={`btn-info text-xs ${activeChartView === 'attack' ? 'opacity-100' : 'opacity-60'}`}>Attack</button>
                  <button onClick={() => setActiveChartView('speed')} className={`btn-info text-xs ${activeChartView === 'speed' ? 'opacity-100' : 'opacity-60'}`}>Speed</button>
                  <button onClick={() => setActiveChartView('shields')} className={`btn-info text-xs ${activeChartView === 'shields' ? 'opacity-100' : 'opacity-60'}`}>Shields</button>
                  <button onClick={() => setActiveChartView('hull')} className={`btn-info text-xs ${activeChartView === 'hull' ? 'opacity-100' : 'opacity-60'}`}>Hull</button>
                  <button onClick={() => setActiveChartView('limit')} className={`btn-info text-xs ${activeChartView === 'limit' ? 'opacity-100' : 'opacity-60'}`}>Limit</button>
                  <button onClick={() => setActiveChartView('upgrades')} className={`btn-info text-xs ${activeChartView === 'upgrades' ? 'opacity-100' : 'opacity-60'}`}>Upgrades</button>
                  <button onClick={() => setActiveChartView('ability')} className={`btn-info text-xs ${activeChartView === 'ability' ? 'opacity-100' : 'opacity-60'}`}>Abilities</button>
                </div>
                <div className="text-xs" style={{ height: '280px' }}>
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

                    <button onClick={onConfirmDeck} disabled={!isDeckValid || !isDronesValid} className="btn-confirm w-full p-4 mt-4 text-lg font-bold font-orbitron">Confirm Deck & Drones</button>
        </div>
      </div>
     </div>
  );
};

export default DeckBuilder;