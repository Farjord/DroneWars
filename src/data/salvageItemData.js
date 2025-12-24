/**
 * Salvage Item Data
 * Defines collectible items that convert to credits
 * Each item has a credit range - when a pack rolls credits within that range,
 * an eligible item is selected and assigned the rolled value
 *
 * Items are organized by value tier for easy expansion:
 * - Scrap (1-50): Common salvage, many options
 * - Components (40-120): Mid-tier parts
 * - Systems (100-200): Valuable tech
 * - Artifacts (180-350): Rare finds
 * - Premium (300-600+): Exceptional discoveries
 */

export const SALVAGE_ITEMS = [
  // ========================================
  // SCRAP TIER (1-50 credits)
  // Common salvage - many options for variety
  // ========================================
  {
    id: 'SALVAGE_SCRAP_METAL',
    name: 'Scrap Metal',
    creditRange: { min: 1, max: 25 },
    image: '/DroneWars/Credits/scrap-metal.png',
    description: 'Twisted hull plating suitable for recycling.'
  },
  {
    id: 'SALVAGE_BURNT_WIRING',
    name: 'Burnt Wiring Bundle',
    creditRange: { min: 5, max: 30 },
    image: '/DroneWars/Credits/burnt-wiring.png',
    description: 'Damaged but salvageable conductive materials.'
  },
  {
    id: 'SALVAGE_COOLANT_CELLS',
    name: 'Depleted Coolant Cells',
    creditRange: { min: 8, max: 35 },
    image: '/DroneWars/Credits/coolant-cells.png',
    description: 'Thermal regulation units with residual value.'
  },
  {
    id: 'SALVAGE_CIRCUIT_BOARDS',
    name: 'Damaged Circuit Boards',
    creditRange: { min: 10, max: 40 },
    image: '/DroneWars/Credits/circuit-boards.png',
    description: 'Partially functional processing components.'
  },
  {
    id: 'SALVAGE_POWER_CONDUITS',
    name: 'Corroded Power Conduits',
    creditRange: { min: 12, max: 45 },
    image: '/DroneWars/Credits/power-conduits.png',
    description: 'Energy transfer cables in fair condition.'
  },
  {
    id: 'SALVAGE_COMM_FRAGMENTS',
    name: 'Comm Array Fragments',
    creditRange: { min: 15, max: 50 },
    image: '/DroneWars/Credits/comm-fragments.png',
    description: 'Broken transmitter components with trace metals.'
  },
  {
    id: 'SALVAGE_THRUSTER_NOZZLE',
    name: 'Cracked Thruster Nozzle',
    creditRange: { min: 18, max: 50 },
    image: '/DroneWars/Credits/thruster-nozzle.png',
    description: 'Heat-resistant alloy worth refining.'
  },
  {
    id: 'SALVAGE_SENSOR_DEBRIS',
    name: 'Sensor Debris',
    creditRange: { min: 20, max: 55 },
    image: '/DroneWars/Credits/sensor-debris.png',
    description: 'Scattered detection equipment fragments.'
  },

  // ========================================
  // COMPONENTS TIER (40-120 credits)
  // Functional parts with clear value
  // ========================================
  {
    id: 'SALVAGE_GYROSCOPE',
    name: 'Stabilization Gyroscope',
    creditRange: { min: 40, max: 80 },
    image: '/DroneWars/Credits/gyroscope.png',
    description: 'Precision orientation module in working order.'
  },
  {
    id: 'SALVAGE_PLASMA_COIL',
    name: 'Plasma Induction Coil',
    creditRange: { min: 45, max: 85 },
    image: '/DroneWars/Credits/plasma-coil.png',
    description: 'Energy amplification component with minor wear.'
  },
  {
    id: 'SALVAGE_TARGETING_LENS',
    name: 'Targeting Optics Lens',
    creditRange: { min: 50, max: 95 },
    image: '/DroneWars/Credits/targeting-lens.png',
    description: 'High-precision optical array, slightly scratched.'
  },
  {
    id: 'SALVAGE_REACTOR_FRAGMENT',
    name: 'Reactor Core Fragment',
    creditRange: { min: 55, max: 100 },
    image: '/DroneWars/Credits/reactor-fragment.png',
    description: 'Dense power generation material, safely inert.'
  },
  {
    id: 'SALVAGE_SHIELD_EMITTER',
    name: 'Shield Emitter Node',
    creditRange: { min: 60, max: 105 },
    image: '/DroneWars/Credits/shield-emitter.png',
    description: 'Defensive field projector requiring recalibration.'
  },
  {
    id: 'SALVAGE_NAV_COMPUTER',
    name: 'Navigation Processor',
    creditRange: { min: 65, max: 110 },
    image: '/DroneWars/Credits/nav-computer.png',
    description: 'Astrogation computing unit with corrupted memory.'
  },
  {
    id: 'SALVAGE_COMM_RELAY',
    name: 'Subspace Comm Relay',
    creditRange: { min: 70, max: 120 },
    image: '/DroneWars/Credits/comm-relay.png',
    description: 'Long-range communication booster module.'
  },

  // ========================================
  // SYSTEMS TIER (100-200 credits)
  // Complete subsystems with significant value
  // ========================================
  {
    id: 'SALVAGE_LIFE_SUPPORT',
    name: 'Life Support Module',
    creditRange: { min: 100, max: 160 },
    image: '/DroneWars/Credits/life-support.png',
    description: 'Atmospheric processing system in serviceable condition.'
  },
  {
    id: 'SALVAGE_WEAPONS_ARRAY',
    name: 'Weapons Control Array',
    creditRange: { min: 110, max: 170 },
    image: '/DroneWars/Credits/weapons-array.png',
    description: 'Fire control system lacking only calibration.'
  },
  {
    id: 'SALVAGE_SENSOR_SUITE',
    name: 'Tactical Sensor Suite',
    creditRange: { min: 120, max: 185 },
    image: '/DroneWars/Credits/sensor-suite.png',
    description: 'Multi-spectrum detection package, fully operational.'
  },
  {
    id: 'SALVAGE_ENGINE_MANIFOLD',
    name: 'Engine Manifold Assembly',
    creditRange: { min: 130, max: 195 },
    image: '/DroneWars/Credits/engine-manifold.png',
    description: 'Propulsion distribution system with minimal corrosion.'
  },
  {
    id: 'SALVAGE_SHIELD_GENERATOR',
    name: 'Shield Generator Unit',
    creditRange: { min: 140, max: 210 },
    image: '/DroneWars/Credits/shield-generator.png',
    description: 'Defensive barrier projector needing new capacitors.'
  },

  // ========================================
  // ARTIFACTS TIER (180-350 credits)
  // Rare finds with historical or tech value
  // ========================================
  {
    id: 'SALVAGE_NAV_DATA',
    name: 'Pre-War Navigation Data',
    creditRange: { min: 180, max: 280 },
    image: '/DroneWars/Credits/nav-data.png',
    description: 'Encrypted stellar coordinates from before the collapse.'
  },
  {
    id: 'SALVAGE_MILITARY_CIPHER',
    name: 'Military Cipher Module',
    creditRange: { min: 200, max: 300 },
    image: '/DroneWars/Credits/military-cipher.png',
    description: 'Encryption device with classified algorithms intact.'
  },
  {
    id: 'SALVAGE_PROTOTYPE_CORE',
    name: 'Prototype Power Core',
    creditRange: { min: 220, max: 320 },
    image: '/DroneWars/Credits/prototype-core.png',
    description: 'Experimental energy source of unknown origin.'
  },
  {
    id: 'SALVAGE_XENOTECH',
    name: 'Xenotech Component',
    creditRange: { min: 250, max: 360 },
    image: '/DroneWars/Credits/xenotech.png',
    description: 'Technology of non-human design. Highly sought after.'
  },

  // ========================================
  // PREMIUM TIER (300-600+ credits)
  // Exceptional discoveries, rare drops
  // ========================================
  {
    id: 'SALVAGE_AI_FRAGMENT',
    name: 'Dormant AI Fragment',
    creditRange: { min: 300, max: 450 },
    image: '/DroneWars/Credits/ai-fragment.png',
    description: 'Partial artificial intelligence matrix, safely contained.'
  },
  {
    id: 'SALVAGE_STELLAR_CHART',
    name: 'Ancient Stellar Chart',
    creditRange: { min: 350, max: 500 },
    image: '/DroneWars/Credits/stellar-chart.png',
    description: 'Pre-collapse star maps showing forgotten routes.'
  },
  {
    id: 'SALVAGE_COMMAND_CODES',
    name: 'Fleet Command Codes',
    creditRange: { min: 400, max: 550 },
    image: '/DroneWars/Credits/command-codes.png',
    description: 'Military authorization keys with lasting value.'
  },
  {
    id: 'SALVAGE_QUANTUM_PROCESSOR',
    name: 'Quantum Processing Unit',
    creditRange: { min: 450, max: 600 },
    image: '/DroneWars/Credits/quantum-processor.png',
    description: 'Cutting-edge computation hardware, impossibly rare.'
  },
  {
    id: 'SALVAGE_PRECURSOR_RELIC',
    name: 'Precursor Relic',
    creditRange: { min: 500, max: 700 },
    image: '/DroneWars/Credits/precursor-relic.png',
    description: 'An artifact from the civilization that came before.'
  }
];

/**
 * Find all salvage items that can be assigned a specific credit value
 * @param {number} creditValue - The rolled credit amount
 * @returns {Array} Array of eligible salvage items
 */
export function findEligibleItems(creditValue) {
  return SALVAGE_ITEMS.filter(
    item => creditValue >= item.creditRange.min && creditValue <= item.creditRange.max
  );
}

/**
 * Select a random salvage item for a given credit value
 * Uses the provided RNG for deterministic results
 * @param {number} creditValue - The rolled credit amount
 * @param {Object} rng - Random number generator with random() method
 * @returns {Object|null} Selected salvage item or null if none eligible
 */
export function selectSalvageItem(creditValue, rng) {
  const eligible = findEligibleItems(creditValue);

  if (eligible.length === 0) {
    // Fallback: find closest item by expanding search
    // This handles edge cases where a value falls in a gap
    let closest = null;
    let closestDistance = Infinity;

    for (const item of SALVAGE_ITEMS) {
      const distToMin = Math.abs(creditValue - item.creditRange.min);
      const distToMax = Math.abs(creditValue - item.creditRange.max);
      const dist = Math.min(distToMin, distToMax);

      if (dist < closestDistance) {
        closestDistance = dist;
        closest = item;
      }
    }

    return closest;
  }

  const index = Math.floor(rng.random() * eligible.length);
  return eligible[index];
}

/**
 * Generate a salvage item from a credit value
 * @param {number} creditValue - The credit amount this item is worth
 * @param {Object} rng - Random number generator
 * @returns {Object} Salvage item loot object
 */
export function generateSalvageItemFromValue(creditValue, rng) {
  const item = selectSalvageItem(creditValue, rng);

  if (!item) {
    // Ultimate fallback - should never happen with proper data coverage
    return {
      type: 'salvageItem',
      itemId: 'SALVAGE_SCRAP_METAL',
      name: 'Scrap Metal',
      creditValue: creditValue,
      image: '/DroneWars/Credits/scrap-metal.png',
      description: 'Twisted hull plating suitable for recycling.'
    };
  }

  return {
    type: 'salvageItem',
    itemId: item.id,
    name: item.name,
    creditValue: creditValue,
    image: item.image,
    description: item.description
  };
}

export default SALVAGE_ITEMS;
