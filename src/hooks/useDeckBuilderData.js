import { useMemo } from 'react';
import fullDroneCollection from '../data/droneData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import {
  filterCards,
  filterDrones,
  sortByRarity,
} from '../utils/deckFilterUtils.js';

// --- Keyword Processing ---

const formatKeyword = (type) => {
  if (!type) return '';
  const formatted = type.replace(/_/g, ' ').toLowerCase();
  return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const extractCardKeywords = (effect) => {
  const keywords = [];

  if (effect.type === 'REPEATING_EFFECT') {
    keywords.push(formatKeyword(effect.type));
    if (effect.effects && Array.isArray(effect.effects)) {
      effect.effects.forEach(subEffect => {
        if (subEffect.type) keywords.push(formatKeyword(subEffect.type));
      });
    }
  } else if (effect.type === 'MODIFY_DRONE_BASE' && effect.mod) {
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
      if (effect.mod.abilityToAdd && effect.mod.abilityToAdd.name) {
        keywords.push(effect.mod.abilityToAdd.name);
      }
    } else {
      keywords.push(formatKeyword(`${stat} Modification`));
    }
  } else if (effect.type === 'MODIFY_STAT' && effect.mod) {
    const stat = effect.mod.stat;
    const value = effect.mod.value;

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
    keywords.push(formatKeyword(effect.type));
    keywords.push('Draw');
  } else if (effect.type) {
    keywords.push(formatKeyword(effect.type));
  }

  if (effect.goAgain) keywords.push('Go Again');
  if (effect.damageType === 'PIERCING') keywords.push('Piercing');
  if (effect.mod?.type) keywords.push(formatKeyword(effect.mod.type));

  return keywords;
};

const extractTargetingText = (card, effect) => {
  if (card.targeting) {
    const t = formatKeyword(card.targeting.type);
    if (card.targeting.affinity) {
      const a = card.targeting.affinity.charAt(0) + card.targeting.affinity.slice(1).toLowerCase();
      return `${t} (${a})`;
    }
    return t;
  } else if (effect.type === 'MULTI_MOVE' && effect.source) {
    const sourceLocation = effect.source.location || 'Any';
    const sourceAffinity = effect.source.affinity || 'Any';
    const formattedAffinity = sourceAffinity.charAt(0).toUpperCase() + sourceAffinity.slice(1).toLowerCase();
    return `${formatKeyword(sourceLocation)} (${formattedAffinity})`;
  } else if (effect.type === 'SINGLE_MOVE') {
    return 'Drone (Friendly)';
  }
  return 'N/A';
};

// --- Generic Sort ---

const sortItems = (items, sortConfig, secondaryKey) => {
  if (sortConfig.key === null) return items;

  const sorted = [...items];
  sorted.sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (aStr < bStr) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aStr > bStr) return sortConfig.direction === 'ascending' ? 1 : -1;
    return a[secondaryKey].localeCompare(b[secondaryKey]);
  });
  return sorted;
};

// --- Distribution Helpers ---

const buildDistribution = (items, statName) => {
  const distribution = {};
  items.forEach(item => {
    const value = item[statName] || 0;
    distribution[value] = (distribution[value] || 0) + item.quantity;
  });
  return Object.entries(distribution)
    .map(([value, count]) => ({ name: `${value}`, count }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));
};

const buildKeywordDistribution = (items) => {
  const distribution = {};
  items.forEach(item => {
    if (item.keywords) {
      item.keywords.forEach(keyword => {
        distribution[keyword] = (distribution[keyword] || 0) + item.quantity;
      });
    }
  });
  return Object.entries(distribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

// --- Hook ---

const useDeckBuilderData = ({
  fullCardCollection,
  availableDrones,
  availableComponents,
  deck,
  selectedDrones,
  selectedShipComponents,
  mode,
  activeShip,
  maxDrones,
  filters,
  sortConfig,
  droneFilters,
  droneSortConfig,
}) => {
  // --- Processed Collections ---

  const processedCardCollection = useMemo(() => {
    return fullCardCollection.map(card => {
      const keywords = extractCardKeywords(card.effect);
      const targetingText = extractTargetingText(card, card.effect);
      return { ...card, keywords: [...new Set(keywords)], targetingText };
    });
  }, [fullCardCollection]);

  const processedDroneCollection = useMemo(() => {
    const droneSource = availableDrones || fullDroneCollection;
    return droneSource.map(drone => {
      const keywords = [];
      const isAiOnly = drone.selectable === false;

      if (drone.abilities && drone.abilities.length > 0) {
        drone.abilities.forEach(ability => {
          if (ability.name) keywords.push(ability.name);
          if (ability.type) {
            keywords.push(ability.type === 'ACTIVE' ? 'Active' : ability.type === 'PASSIVE' ? 'Passive' : 'Triggered');
          }
          if (ability.effect?.keyword) {
            keywords.push(ability.effect.keyword);
          }
        });
      }

      const description = drone.abilities && drone.abilities.length > 0
        ? drone.abilities.map(a => a.description).join(' | ')
        : 'No abilities';

      return { ...drone, keywords: [...new Set(keywords)], description, aiOnly: isAiOnly };
    });
  }, [availableDrones]);

  const activeComponentCollection = useMemo(() => {
    return availableComponents || shipComponentCollection;
  }, [availableComponents]);

  // --- Filter Options ---

  const filterOptions = useMemo(() => {
    const costs = new Set();
    const targets = new Set();
    const abilities = new Set();
    const damageTypes = new Set();
    processedCardCollection.forEach(card => {
      costs.add(card.cost);
      if (card.targetingText && card.targetingText !== 'N/A') {
        targets.add(card.targetingText);
      }
      card.keywords.forEach(k => abilities.add(k));
      if (card.effect?.damageType) {
        damageTypes.add(card.effect.damageType);
      }
    });

    const costValues = Array.from(costs);
    const rarities = mode === 'extraction'
      ? ['Starter', 'Common', 'Uncommon', 'Rare', 'Mythic']
      : ['Common', 'Uncommon', 'Rare', 'Mythic'];

    return {
      minCost: Math.min(...costValues),
      maxCost: Math.max(...costValues),
      rarities,
      types: ['Ordnance', 'Tactic', 'Support', 'Upgrade'],
      targets: Array.from(targets).sort(),
      damageTypes: Array.from(damageTypes).sort(),
      abilities: Array.from(abilities).sort(),
    };
  }, [processedCardCollection, mode]);

  const droneFilterOptions = useMemo(() => {
    const abilities = new Set();
    const damageTypes = new Set();
    processedDroneCollection.forEach(drone => {
      drone.keywords.forEach(k => abilities.add(k));
      if (drone.damageType) {
        damageTypes.add(drone.damageType);
      }
    });

    const rarities = mode === 'extraction'
      ? ['Starter', 'Common', 'Uncommon', 'Rare', 'Mythic']
      : ['Common', 'Uncommon', 'Rare', 'Mythic'];

    return {
      rarities,
      classes: [1, 2, 3, 4, 5],
      damageTypes: Array.from(damageTypes).sort(),
      abilities: Array.from(abilities).sort()
    };
  }, [processedDroneCollection, mode]);

  // --- Deck Counts & Validation ---

  const { cardCount, deckListForDisplay, baseCardCounts, typeCounts } = useMemo(() => {
    const counts = {};
    const types = { Ordnance: 0, Tactic: 0, Support: 0, Upgrade: 0 };
    let total = 0;

    Object.entries(deck).forEach(([cardId, quantity]) => {
      if (quantity > 0) {
        total += quantity;
        const card = processedCardCollection.find(c => c.id === cardId);
        if (card) {
          const baseId = card.baseCardId;
          counts[baseId] = (counts[baseId] || 0) + quantity;
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

  const typeLimits = {
    Ordnance: activeShip?.deckLimits?.ordnanceLimit ?? 15,
    Tactic: activeShip?.deckLimits?.tacticLimit ?? 15,
    Support: activeShip?.deckLimits?.supportLimit ?? 15,
    Upgrade: activeShip?.deckLimits?.upgradeLimit ?? 10
  };
  const totalCardLimit = activeShip?.deckLimits?.totalCards ?? 40;

  const typeValid = Object.keys(typeLimits).every(
    type => typeCounts[type] <= typeLimits[type]
  );

  const isDeckValid = cardCount === totalCardLimit && typeValid;

  // --- Drone Counts & Validation ---

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

  // --- Ship Component Validation ---

  const { shipComponentCount, shipComponentsValid } = useMemo(() => {
    const components = selectedShipComponents || {};
    const count = Object.keys(components).filter(key => components[key]).length;

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

    const lanes = Object.values(components).filter(l => l);
    const uniqueLanes = new Set(lanes);
    const allAssigned = lanes.length === 3;
    const noConflicts = uniqueLanes.size === 3;

    const isValid = hasBridge && hasPowerCell && hasDroneControl && allAssigned && noConflicts;
    return { shipComponentCount: count, shipComponentsValid: isValid };
  }, [selectedShipComponents, activeComponentCollection]);

  // --- Statistics ---

  const deckStats = useMemo(() => {
    const barChartData = buildDistribution(deckListForDisplay, 'cost');
    const pieChartData = buildKeywordDistribution(deckListForDisplay);
    return { barChartData, pieChartData };
  }, [deckListForDisplay]);

  const droneStats = useMemo(() => ({
    costData: buildDistribution(droneListForDisplay, 'class'),
    attackData: buildDistribution(droneListForDisplay, 'attack'),
    speedData: buildDistribution(droneListForDisplay, 'speed'),
    shieldsData: buildDistribution(droneListForDisplay, 'shields'),
    hullData: buildDistribution(droneListForDisplay, 'hull'),
    limitData: buildDistribution(droneListForDisplay, 'limit'),
    upgradesData: buildDistribution(droneListForDisplay, 'upgradeSlots'),
    abilityData: buildKeywordDistribution(droneListForDisplay),
  }), [droneListForDisplay]);

  const viewDeckData = useMemo(() => {
    const selectedDronesList = [];
    Object.entries(selectedDrones || {}).forEach(([droneName, quantity]) => {
      if (quantity > 0) {
        const drone = processedDroneCollection.find(d => d.name === droneName);
        if (drone) selectedDronesList.push(drone);
      }
    });

    const deckCardsList = [];
    Object.entries(deck).forEach(([cardId, quantity]) => {
      if (quantity > 0) {
        const card = processedCardCollection.find(c => c.id === cardId);
        if (card) deckCardsList.push({ card, quantity });
      }
    });

    return { drones: selectedDronesList, cards: deckCardsList };
  }, [selectedDrones, deck, processedDroneCollection, processedCardCollection]);

  // --- Filtered & Sorted Lists ---

  const filteredAndSortedCards = useMemo(() => {
    let items = filterCards(processedCardCollection, filters);

    if (sortConfig.key !== null) {
      if (sortConfig.key === 'rarity') {
        items = sortByRarity(items, mode === 'extraction');
        if (sortConfig.direction === 'descending') items.reverse();
      } else {
        items = sortItems(items, sortConfig, 'id');
      }
    }

    return items;
  }, [processedCardCollection, filters, sortConfig, mode]);

  const filteredAndSortedDrones = useMemo(() => {
    let items = filterDrones(processedDroneCollection, droneFilters);

    if (droneSortConfig.key !== null) {
      if (droneSortConfig.key === 'rarity') {
        items = sortByRarity(items, mode === 'extraction');
        if (droneSortConfig.direction === 'descending') items.reverse();
      } else {
        items = sortItems(items, droneSortConfig, 'name');
      }
    }

    return items;
  }, [processedDroneCollection, droneFilters, droneSortConfig, mode]);

  return {
    processedCardCollection,
    processedDroneCollection,
    activeComponentCollection,
    filterOptions,
    droneFilterOptions,
    cardCount,
    deckListForDisplay,
    baseCardCounts,
    typeCounts,
    typeLimits,
    totalCardLimit,
    typeValid,
    isDeckValid,
    droneCount,
    droneListForDisplay,
    isDronesValid,
    shipComponentCount,
    shipComponentsValid,
    deckStats,
    droneStats,
    viewDeckData,
    filteredAndSortedCards,
    filteredAndSortedDrones,
  };
};

export default useDeckBuilderData;
