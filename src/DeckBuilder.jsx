import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Eye, Bolt, Upload, Download, Copy, X, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';


// (The CardDetailPopup component remains the same as before)
const CardDetailPopup = ({ card, onClose }) => {
  if (!card) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-52 h-72 rounded-lg p-1 bg-purple-800/80 transform scale-150" onClick={e => e.stopPropagation()}>
        <div className="w-full h-full bg-slate-900 flex flex-col font-orbitron text-purple-300 overflow-hidden rounded-md">
          <div className="text-center py-1 px-2 bg-purple-900/50 flex justify-between items-center">
            <span className="font-bold text-sm uppercase tracking-wider truncate">{card.name}</span>
            <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
              <Bolt size={12} className="text-yellow-300" />
              <span className="text-white font-bold text-sm ml-1">{card.cost}</span>
            </div>
          </div>
          <div className="p-1">
            <div className="relative h-24">
              <img src={card.image} alt={card.name} className="w-full h-full object-cover rounded" />
              <div className="absolute inset-0 border border-purple-400/50 rounded"></div>
            </div>
          </div>
          <div className="flex-grow mx-2 my-1 bg-black/50 border border-purple-800/70 p-2 flex flex-col min-h-0">
            <div className="flex-grow relative font-exo font-normal text-purple-200">
              <p className="text-sm leading-tight text-center">{card.description}</p>
            </div>
          </div>
          <div className="text-center text-xs py-1 bg-purple-900/50 uppercase font-semibold tracking-widest">
            {card.type} Card
          </div>
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
  onConfirmDeck,
  onImportDeck
}) => {
  const [detailedCard, setDetailedCard] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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

  // --- NEW: Handler for sorting ---
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
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

  const resetDeck = () => {
    // Clear all cards from the deck by setting each to 0
    Object.keys(deck).forEach(cardId => {
      if (deck[cardId] > 0) {
        onDeckChange(cardId, 0);
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
    const deckCode = useMemo(() => Object.entries(deck).map(([id, q]) => `${id}:${q}`).join(','), [deck]);

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
        <h2 className="text-xl font-orbitron mb-4">Export Deck Code</h2> {/* Corrected font size */}
        <p className="text-gray-400 mb-4">Copy the code below to save or share your deck.</p>
        <textarea
          ref={textAreaRef}
          readOnly
          value={deckCode}
          className="w-full h-32 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 font-mono"
        />
        <div className="flex justify-end gap-4 mt-4">
          <span className="text-green-400 self-center">{copySuccess}</span>
          <button onClick={copyToClipboard} className="flex items-center gap-2 bg-cyan-600 text-white font-bold py-2 px-4 rounded hover:bg-cyan-700">
            <Copy size={16} /> Copy to Clipboard
          </button>
          <button onClick={() => setShowExportModal(false)} className="flex items-center gap-2 bg-pink-600 text-white font-bold py-2 px-4 rounded hover:bg-pink-700">
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
          <p className="text-gray-400 mb-4">Paste a deck code below to load it into the builder.</p>
          <textarea
            value={deckCode}
            onChange={(e) => setDeckCode(e.target.value)}
            className="w-full h-32 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 font-mono"
            placeholder="CARD001:4,CARD002:2,..."
          />
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <div className="flex justify-end gap-4 mt-4">
            <button onClick={() => setShowImportModal(false)} className="bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-700">Cancel</button>
            <button onClick={handleImport} className="bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700">Load Deck</button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="w-full h-full flex flex-col text-white font-exo mt-8 text-sm">
      {detailedCard && <CardDetailPopup card={detailedCard} onClose={() => setDetailedCard(null)} />}
      {showExportModal && <ExportModal />}
      {showImportModal && <ImportModal />}

      <div className="flex justify-center items-center mb-4">
        <h1 className="text-3xl font-orbitron font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Deck Builder</h1>
        {/* --- NEW: Import/Export Buttons --- */}
        <div className="flex gap-4 ml-8">
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-slate-700 text-white font-bold py-2 px-4 rounded hover:bg-slate-600">
            <Upload size={16} /> Import
          </button>
          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 bg-slate-700 text-white font-bold py-2 px-4 rounded hover:bg-slate-600">
            <Download size={16} /> Export
          </button>
        </div>
      </div>
      
      <div className="flex-grow flex gap-6 min-h-0">

        {/* Left Side: Available Cards Collection */}
        <div className="w-2/3 flex flex-col bg-slate-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-orbitron">Available Cards</h2>
            <button
              onClick={resetFilters}
              className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Reset Filters
            </button>
          </div>
          {/* --- NEW: Filter Input --- */}
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
        </div>

        {/* Right Side: Your Deck */}
        <div className="w-1/3 flex flex-col bg-slate-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-orbitron transition-colors ${isDeckValid ? 'text-green-400' : 'text-white'}`}>
              Your Deck ({cardCount}/40)
            </h2>
            <button
              onClick={resetDeck}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Reset Deck
            </button>
          </div>
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

{/* --- NEW: Deck Statistics Section --- */}
          {cardCount > 0 && (
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
                  <button onClick={() => setActiveChartView('cost')} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${activeChartView === 'cost' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                    Cost
                  </button>
                  <button onClick={() => setActiveChartView('type')} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${activeChartView === 'type' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                    Type
                  </button>
                  <button onClick={() => setActiveChartView('ability')} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${activeChartView === 'ability' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
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

                    <button onClick={onConfirmDeck} disabled={!isDeckValid} className="w-full p-4 mt-4 text-lg font-bold font-orbitron rounded-lg bg-purple-600 text-white transition-all duration-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-purple-500">Confirm Deck</button>
        </div>
      </div>
     </div>
  );
};

export default DeckBuilder;