import { useMemo } from 'react';
import fullDroneCollection from '../../../../data/droneData.js';
import { shipComponentCollection } from '../../../../data/shipSectionData.js';
import {
  filterCards,
  filterDrones,
  sortByRarity,
} from '../../../../logic/cards/deckFilterUtils.js';
import {
  extractCardKeywords,
  extractTargetingText,
  sortItems,
  buildDistribution,
  buildKeywordDistribution,
} from '../../../../logic/cards/deckBuilderHelpers.js';

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
      const keywords = extractCardKeywords(card.effects[0]);
      const targetingText = extractTargetingText(card, card.effects[0]);
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
      if (card.effects?.[0]?.damageType) {
        damageTypes.add(card.effects[0].damageType);
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

  const { typeLimits, totalCardLimit, typeValid, isDeckValid } = useMemo(() => {
    const limits = {
      Ordnance: activeShip?.deckLimits?.ordnanceLimit ?? 15,
      Tactic: activeShip?.deckLimits?.tacticLimit ?? 15,
      Support: activeShip?.deckLimits?.supportLimit ?? 15,
      Upgrade: activeShip?.deckLimits?.upgradeLimit ?? 10
    };
    const totalLimit = activeShip?.deckLimits?.totalCards ?? 40;
    const valid = Object.keys(limits).every(
      type => typeCounts[type] <= limits[type]
    );
    return {
      typeLimits: limits,
      totalCardLimit: totalLimit,
      typeValid: valid,
      isDeckValid: cardCount === totalLimit && valid
    };
  }, [activeShip, typeCounts, cardCount]);

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
