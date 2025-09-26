// ========================================
// AI PHASE PROCESSOR
// ========================================
// Handles AI processing for simultaneous phases in single-player mode
// Provides instant AI decisions for SimultaneousActionManager commitment system

/**
 * AIPhaseProcessor - Handles AI completion of simultaneous phases
 */
class AIPhaseProcessor {
  constructor() {
    this.aiPersonalities = null;
    this.dronePool = null;
    this.currentAIPersonality = null;
  }

  /**
   * Initialize with game data and AI personality
   * @param {Object} aiPersonalities - Available AI personalities
   * @param {Array} dronePool - Available drones for selection
   * @param {Object} currentPersonality - Current AI personality being used
   */
  initialize(aiPersonalities, dronePool, currentPersonality) {
    this.aiPersonalities = aiPersonalities;
    this.dronePool = dronePool;
    this.currentAIPersonality = currentPersonality;
    console.log('🤖 AIPhaseProcessor initialized with personality:', currentPersonality?.name || 'Default');
  }

  /**
   * Process AI drone selection for droneSelection phase
   * @param {Object} aiPersonality - Optional AI personality override
   * @returns {Promise<Array>} Array of 5 selected drone objects
   */
  async processDroneSelection(aiPersonality = null) {
    const personality = aiPersonality || this.currentAIPersonality;

    console.log('🤖 AIPhaseProcessor.processDroneSelection starting...');

    // Use personality's drone pool if available, otherwise use general pool
    let availableDrones = [];
    if (personality && personality.dronePool && personality.dronePool.length > 0) {
      // Map personality drone names to full drone objects from the collection
      availableDrones = personality.dronePool.map(droneName => {
        const droneObject = this.dronePool?.find(drone => drone.name === droneName);
        if (!droneObject) {
          console.warn(`⚠️ AI personality references unknown drone: ${droneName}`);
        }
        return droneObject;
      }).filter(drone => drone); // Remove any undefined entries

      console.log(`🎯 Using ${personality.name} personality drone pool: ${availableDrones.length} drones mapped from ${personality.dronePool.length} names`);

      // Log mapped drone names for verification
      const mappedNames = availableDrones.map(d => d.name).join(', ');
      console.log(`🎯 Mapped drones: ${mappedNames}`);
    } else {
      // Fallback to general drone pool
      availableDrones = this.dronePool ? [...this.dronePool] : [];
      console.log(`🎯 Using general drone pool: ${availableDrones.length} drones`);
    }

    if (availableDrones.length < 5) {
      console.error('❌ Not enough drones available for AI selection:', availableDrones.length);

      // Enhanced error reporting for debugging
      if (personality && personality.dronePool) {
        const missingDrones = personality.dronePool.filter(droneName =>
          !this.dronePool?.find(drone => drone.name === droneName)
        );
        if (missingDrones.length > 0) {
          console.error(`❌ Missing drones from collection: ${missingDrones.join(', ')}`);
        }
        console.error(`❌ Available from personality: ${availableDrones.map(d => d.name).join(', ')}`);
        console.error(`❌ Expected from personality: ${personality.dronePool.join(', ')}`);
      }

      throw new Error(`Insufficient drones for AI selection: ${availableDrones.length} available, need 5`);
    }

    // AI Selection Algorithm: Pick 5 drones using personality preferences
    const selectedDrones = this.selectDronesForAI(availableDrones, personality);

    const selectedNames = selectedDrones.map(d => d.name).join(', ');
    console.log(`🤖 AI selected drones: ${selectedNames}`);

    return selectedDrones;
  }

  /**
   * Select 5 drones for AI based on personality preferences
   * @param {Array} availableDrones - Pool of available drones
   * @param {Object} personality - AI personality with preferences
   * @returns {Array} Array of 5 selected drone objects
   */
  selectDronesForAI(availableDrones, personality) {
    let selected = [];

    // Strategy 1: Use personality's preferred drones if available
    if (personality && personality.preferredDrones) {
      const preferredAvailable = availableDrones.filter(drone =>
        personality.preferredDrones.includes(drone.name)
      );

      // Take up to 3 preferred drones
      const preferredCount = Math.min(3, preferredAvailable.length);
      selected = preferredAvailable.slice(0, preferredCount);

      console.log(`🎯 AI selected ${selected.length} preferred drones:`,
        selected.map(d => d.name).join(', '));
    }

    // Strategy 2: Fill remaining slots with balanced selection
    const remaining = availableDrones.filter(drone => !selected.includes(drone));
    const needed = 5 - selected.length;

    if (needed > 0) {
      // Prioritize different drone types for variety
      const balancedSelection = this.selectBalancedDrones(remaining, needed, personality);
      selected = [...selected, ...balancedSelection];
    }

    // Strategy 3: Random fallback if still not enough
    while (selected.length < 5 && remaining.length > 0) {
      const randomIndex = Math.floor(Math.random() * remaining.length);
      const drone = remaining.splice(randomIndex, 1)[0];
      selected.push(drone);
    }

    if (selected.length !== 5) {
      throw new Error(`AI selection failed: only selected ${selected.length} of 5 drones`);
    }

    return selected;
  }

  /**
   * Select drones with balanced approach (variety in types/costs)
   * @param {Array} availableDrones - Remaining available drones
   * @param {number} count - Number of drones to select
   * @param {Object} personality - AI personality for weighting
   * @returns {Array} Selected drones
   */
  selectBalancedDrones(availableDrones, count, personality) {
    const selected = [];
    const remaining = [...availableDrones];

    // Sort by a combination of cost and capabilities for balanced selection
    remaining.sort((a, b) => {
      const scoreA = (a.energyCost || 1) + (a.health || 0) + (a.attack || 0);
      const scoreB = (b.energyCost || 1) + (b.health || 0) + (b.attack || 0);
      return scoreB - scoreA; // Higher scoring drones first
    });

    // AI personality influences selection weights
    const aggressionWeight = personality?.aggression || 0.5;
    const economyWeight = personality?.economy || 0.5;

    for (let i = 0; i < count && remaining.length > 0; i++) {
      let selectedIndex = 0;

      // Add some variation based on personality
      if (aggressionWeight > 0.7) {
        // Aggressive AI: prefer high-attack drones
        selectedIndex = remaining.findIndex(drone => (drone.attack || 0) > 2);
        if (selectedIndex === -1) selectedIndex = 0;
      } else if (economyWeight > 0.7) {
        // Economic AI: prefer low-cost drones
        selectedIndex = remaining.findIndex(drone => (drone.energyCost || 1) <= 2);
        if (selectedIndex === -1) selectedIndex = 0;
      } else {
        // Balanced selection with some randomness
        const topChoices = Math.min(3, remaining.length);
        selectedIndex = Math.floor(Math.random() * topChoices);
      }

      selected.push(remaining.splice(selectedIndex, 1)[0]);
    }

    console.log(`🎯 AI balanced selection (${count}):`,
      selected.map(d => d.name).join(', '));

    return selected;
  }

  /**
   * Process AI deck selection for deckSelection phase
   * @param {Object} aiPersonality - Optional AI personality override
   * @returns {Promise<Array>} Array of selected deck cards
   */
  async processDeckSelection(aiPersonality = null) {
    const personality = aiPersonality || this.currentAIPersonality;

    console.log('🤖 AIPhaseProcessor.processDeckSelection starting...');

    // Use personality's deck if available, otherwise use standard deck
    let selectedDeck = [];
    if (personality && personality.decklist && personality.decklist.length > 0) {
      // Use AI's custom decklist from personality
      console.log(`🎯 Using ${personality.name} personality decklist`);

      // Import the game engine to build the deck
      const { gameEngine } = await import('../logic/gameLogic.js');
      selectedDeck = gameEngine.buildDeckFromList(personality.decklist);
    } else {
      // Fallback to standard deck
      console.log(`🎯 Using standard deck as fallback`);

      const { gameEngine, startingDecklist } = await import('../logic/gameLogic.js');
      selectedDeck = gameEngine.buildDeckFromList(startingDecklist);
    }

    console.log(`✅ AI selected deck with ${selectedDeck.length} cards`);
    return selectedDeck;
  }

  /**
   * Process AI ship placement for placement phase
   * @param {Object} aiPersonality - Optional AI personality override
   * @returns {Promise<Array>} Array of placed ship sections (5 elements)
   */
  async processPlacement(aiPersonality = null) {
    const personality = aiPersonality || this.currentAIPersonality;

    console.log('🤖 AIPhaseProcessor.processPlacement starting...');

    // Get available ship sections for AI
    const availableSections = ['bridge', 'powerCell', 'droneControlHub'];

    console.log(`🎯 AI placing ${availableSections.length} ship sections`);

    // AI Placement Strategy: Simple but effective
    const placedSections = this.selectSectionsForPlacement(availableSections, personality);

    const placementNames = placedSections.join(', ');
    console.log(`🤖 AI placement completed: ${placementNames}`);

    return placedSections;
  }

  /**
   * Select ship section placement for AI based on personality preferences
   * @param {Array} availableSections - Available ship sections to place
   * @param {Object} personality - AI personality with preferences
   * @returns {Array} Array of 5 placed sections in lane order
   */
  selectSectionsForPlacement(availableSections, personality) {
    const sections = [...availableSections];

    // AI placement strategies based on personality
    if (personality) {
      if (personality.aggression > 0.7) {
        // Aggressive AI: Weapons in front, Bridge protected
        const placement = this.arrangeAggressivePlacement(sections);
        console.log('🎯 AI using aggressive placement strategy');
        return placement;
      } else if (personality.economy > 0.7) {
        // Economic AI: Cargo Bay priority, efficient layout
        const placement = this.arrangeEconomicPlacement(sections);
        console.log('🎯 AI using economic placement strategy');
        return placement;
      }
    }

    // Default balanced placement: Bridge in middle, balanced defense
    const placement = this.arrangeBalancedPlacement(sections);
    console.log('🎯 AI using balanced placement strategy');
    return placement;
  }

  /**
   * Arrange sections for aggressive AI (droneControlHub forward for offensive)
   */
  arrangeAggressivePlacement(sections) {
    const placement = new Array(3).fill(null);
    const remaining = [...sections];

    // Priority order: droneControlHub front (offensive), bridge middle, powerCell back
    const priorities = ['droneControlHub', 'bridge', 'powerCell'];
    const positions = [0, 1, 2]; // drone control front, bridge middle, power back

    for (let i = 0; i < priorities.length && i < remaining.length; i++) {
      const sectionIndex = remaining.findIndex(s => s === priorities[i]);
      if (sectionIndex !== -1) {
        placement[positions[i]] = remaining.splice(sectionIndex, 1)[0];
      }
    }

    // Fill remaining positions
    for (let i = 0; i < placement.length; i++) {
      if (!placement[i] && remaining.length > 0) {
        placement[i] = remaining.shift();
      }
    }

    return placement;
  }

  /**
   * Arrange sections for economic AI (powerCell in center for bonus)
   */
  arrangeEconomicPlacement(sections) {
    const placement = new Array(3).fill(null);
    const remaining = [...sections];

    // Priority: powerCell center for energy bonus, bridge protected, droneControlHub front
    const priorities = ['powerCell', 'bridge', 'droneControlHub'];
    const positions = [1, 2, 0]; // power center, bridge back, drone control front

    for (let i = 0; i < priorities.length && i < remaining.length; i++) {
      const sectionIndex = remaining.findIndex(s => s === priorities[i]);
      if (sectionIndex !== -1) {
        placement[positions[i]] = remaining.splice(sectionIndex, 1)[0];
      }
    }

    // Fill remaining positions
    for (let i = 0; i < placement.length; i++) {
      if (!placement[i] && remaining.length > 0) {
        placement[i] = remaining.shift();
      }
    }

    return placement;
  }

  /**
   * Arrange sections for balanced AI (bridge center for bonus)
   */
  arrangeBalancedPlacement(sections) {
    const placement = new Array(3).fill(null);
    const remaining = [...sections];

    // Balanced: bridge center for bonus, powerCell and droneControlHub on sides
    const priorities = ['bridge', 'powerCell', 'droneControlHub'];
    const positions = [1, 0, 2]; // bridge center, power left, drone control right

    for (let i = 0; i < priorities.length && i < remaining.length; i++) {
      const sectionIndex = remaining.findIndex(s => s === priorities[i]);
      if (sectionIndex !== -1) {
        placement[positions[i]] = remaining.splice(sectionIndex, 1)[0];
      }
    }

    // Fill remaining positions
    for (let i = 0; i < placement.length; i++) {
      if (!placement[i] && remaining.length > 0) {
        placement[i] = remaining.shift();
      }
    }

    return placement;
  }

  /**
   * Get AI processing capabilities
   * @returns {Object} Available AI processing methods
   */
  getCapabilities() {
    return {
      droneSelection: true, // ✅ implemented
      deckSelection: true, // ✅ implemented
      placement: true, // ✅ implemented
      version: '1.1.0'
    };
  }
}

// Create singleton instance
const aiPhaseProcessor = new AIPhaseProcessor();

export default aiPhaseProcessor;