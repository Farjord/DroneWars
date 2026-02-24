/**
 * Salvage Item Data
 * Defines collectible items that convert to credits
 * Each item has a credit range - when a pack rolls credits within that range,
 * an eligible item is selected and assigned the rolled value
 *
 * Items are organized by value tier and rarity:
 * - Scrap (1-50): COMMON RARITY - Low-value salvage, many options
 * - Components (40-120): COMMON RARITY - Functional parts with clear value
 * - Systems (100-200): UNCOMMON RARITY - Complete subsystems with significant value
 * - Artifacts (180-350): RARE RARITY - Rare finds with historical or tech value
 * - Premium (300-600+): MYTHIC RARITY - Exceptional discoveries, rare drops
 */

export const SALVAGE_ITEMS = [
  // ========================================
  // SCRAP TIER (1-50 credits) - COMMON RARITY
  // Low-value salvage - many options for variety
  // ========================================
  {
    id: 'SALVAGE_SCRAP_METAL',
    name: 'Scrap Metal',
    rarity: 'Common',
    creditRange: { min: 1, max: 25 },
    image: '/DroneWars/Credits/scrap-metal.png',
    description: 'Twisted hull plating suitable for recycling.'
  },
  {
    id: 'SALVAGE_BURNT_WIRING',
    name: 'Burnt Wiring Bundle',
    rarity: 'Common',
    creditRange: { min: 5, max: 30 },
    image: '/DroneWars/Credits/burnt-wiring.png',
    description: 'Damaged but salvageable conductive materials.'
  },
  {
    id: 'SALVAGE_COOLANT_CELLS',
    name: 'Depleted Coolant Cells',
    rarity: 'Common',
    creditRange: { min: 8, max: 35 },
    image: '/DroneWars/Credits/coolant-cells.png',
    description: 'Thermal regulation units with residual value.'
  },
  {
    id: 'SALVAGE_CIRCUIT_BOARDS',
    name: 'Damaged Circuit Boards',
    rarity: 'Common',
    creditRange: { min: 10, max: 40 },
    image: '/DroneWars/Credits/circuit-boards.png',
    description: 'Partially functional processing components.'
  },
  {
    id: 'SALVAGE_POWER_CONDUITS',
    name: 'Corroded Power Conduits',
    rarity: 'Common',
    creditRange: { min: 12, max: 45 },
    image: '/DroneWars/Credits/power-conduits.png',
    description: 'Energy transfer cables in fair condition.'
  },
  {
    id: 'SALVAGE_COMM_FRAGMENTS',
    name: 'Comm Array Fragments',
    rarity: 'Common',
    creditRange: { min: 15, max: 50 },
    image: '/DroneWars/Credits/comm-fragments.png',
    description: 'Broken transmitter components with trace metals.'
  },
  {
    id: 'SALVAGE_THRUSTER_NOZZLE',
    name: 'Cracked Thruster Nozzle',
    rarity: 'Common',
    creditRange: { min: 18, max: 50 },
    image: '/DroneWars/Credits/thruster-nozzle.png',
    description: 'Heat-resistant alloy worth refining.'
  },
  {
    id: 'SALVAGE_SENSOR_DEBRIS',
    name: 'Sensor Debris',
    rarity: 'Common',
    creditRange: { min: 20, max: 55 },
    image: '/DroneWars/Credits/sensor-debris.png',
    description: 'Scattered detection equipment fragments.'
  },

  // ========================================
  // COMPONENTS TIER (40-120 credits) - COMMON RARITY
  // Functional parts with clear value
  // ========================================
  {
    id: 'SALVAGE_GYROSCOPE',
    name: 'Stabilization Gyroscope',
    rarity: 'Common',
    creditRange: { min: 40, max: 80 },
    image: '/DroneWars/Credits/gyroscope.png',
    description: 'Precision orientation module in working order.'
  },
  {
    id: 'SALVAGE_PLASMA_COIL',
    name: 'Plasma Induction Coil',
    rarity: 'Common',
    creditRange: { min: 45, max: 85 },
    image: '/DroneWars/Credits/plasma-coil.png',
    description: 'Energy amplification component with minor wear.'
  },
  {
    id: 'SALVAGE_TARGETING_LENS',
    name: 'Targeting Optics Lens',
    rarity: 'Common',
    creditRange: { min: 50, max: 95 },
    image: '/DroneWars/Credits/targeting-lens.png',
    description: 'High-precision optical array, slightly scratched.'
  },
  {
    id: 'SALVAGE_REACTOR_FRAGMENT',
    name: 'Reactor Core Fragment',
    rarity: 'Common',
    creditRange: { min: 55, max: 100 },
    image: '/DroneWars/Credits/reactor-fragment.png',
    description: 'Dense power generation material, safely inert.'
  },
  {
    id: 'SALVAGE_SHIELD_EMITTER',
    name: 'Shield Emitter Node',
    rarity: 'Common',
    creditRange: { min: 60, max: 105 },
    image: '/DroneWars/Credits/shield-emitter.png',
    description: 'Defensive field projector requiring recalibration.'
  },
  {
    id: 'SALVAGE_NAV_COMPUTER',
    name: 'Navigation Processor',
    rarity: 'Common',
    creditRange: { min: 65, max: 110 },
    image: '/DroneWars/Credits/nav-computer.png',
    description: 'Astrogation computing unit with corrupted memory.'
  },
  {
    id: 'SALVAGE_COMM_RELAY',
    name: 'Subspace Comm Relay',
    rarity: 'Common',
    creditRange: { min: 70, max: 120 },
    image: '/DroneWars/Credits/comm-relay.png',
    description: 'Long-range communication booster module.'
  },

  // ========================================
  // SYSTEMS TIER (100-200 credits) - UNCOMMON RARITY
  // Complete subsystems with significant value
  // ========================================
  {
    id: 'SALVAGE_LIFE_SUPPORT',
    name: 'Life Support Module',
    rarity: 'Uncommon',
    creditRange: { min: 100, max: 160 },
    image: '/DroneWars/Credits/life-support.png',
    description: 'Atmospheric processing system in serviceable condition.'
  },
  {
    id: 'SALVAGE_WEAPONS_ARRAY',
    name: 'Weapons Control Array',
    rarity: 'Uncommon',
    creditRange: { min: 110, max: 170 },
    image: '/DroneWars/Credits/weapons-array.png',
    description: 'Fire control system lacking only calibration.'
  },
  {
    id: 'SALVAGE_SENSOR_SUITE',
    name: 'Tactical Sensor Suite',
    rarity: 'Uncommon',
    creditRange: { min: 120, max: 185 },
    image: '/DroneWars/Credits/sensor-suite.png',
    description: 'Multi-spectrum detection package, fully operational.'
  },
  {
    id: 'SALVAGE_ENGINE_MANIFOLD',
    name: 'Engine Manifold Assembly',
    rarity: 'Uncommon',
    creditRange: { min: 130, max: 195 },
    image: '/DroneWars/Credits/engine-manifold.png',
    description: 'Propulsion distribution system with minimal corrosion.'
  },
  {
    id: 'SALVAGE_SHIELD_GENERATOR',
    name: 'Shield Generator Unit',
    rarity: 'Uncommon',
    creditRange: { min: 140, max: 210 },
    image: '/DroneWars/Credits/shield-generator.png',
    description: 'Defensive barrier projector needing new capacitors.'
  },

  // ========================================
  // ARTIFACTS TIER (180-350 credits) - RARE RARITY
  // Rare finds with historical or tech value
  // ========================================
  {
    id: 'SALVAGE_NAV_DATA',
    name: 'Pre-War Navigation Data',
    rarity: 'Rare',
    creditRange: { min: 180, max: 280 },
    image: '/DroneWars/Credits/nav-data.png',
    description: 'Encrypted stellar coordinates from before the collapse.'
  },
  {
    id: 'SALVAGE_MILITARY_CIPHER',
    name: 'Military Cipher Module',
    rarity: 'Rare',
    creditRange: { min: 200, max: 300 },
    image: '/DroneWars/Credits/military-cipher.png',
    description: 'Encryption device with classified algorithms intact.'
  },
  {
    id: 'SALVAGE_PROTOTYPE_CORE',
    name: 'Prototype Power Core',
    rarity: 'Rare',
    creditRange: { min: 220, max: 320 },
    image: '/DroneWars/Credits/prototype-core.png',
    description: 'Experimental energy source of unknown origin.'
  },
  {
    id: 'SALVAGE_XENOTECH',
    name: 'Xenotech Component',
    rarity: 'Rare',
    creditRange: { min: 250, max: 360 },
    image: '/DroneWars/Credits/xenotech.png',
    description: 'Technology of non-human design. Highly sought after.'
  },

  // ========================================
  // PREMIUM TIER (300-600+ credits) - MYTHIC RARITY
  // Exceptional discoveries, rare drops
  // ========================================
  {
    id: 'SALVAGE_AI_FRAGMENT',
    name: 'Dormant AI Fragment',
    rarity: 'Mythic',
    creditRange: { min: 300, max: 450 },
    image: '/DroneWars/Credits/ai-fragment.png',
    description: 'Partial artificial intelligence matrix, safely contained.'
  },
  {
    id: 'SALVAGE_STELLAR_CHART',
    name: 'Ancient Stellar Chart',
    rarity: 'Mythic',
    creditRange: { min: 350, max: 500 },
    image: '/DroneWars/Credits/stellar-chart.png',
    description: 'Pre-collapse star maps showing forgotten routes.'
  },
  {
    id: 'SALVAGE_COMMAND_CODES',
    name: 'Fleet Command Codes',
    rarity: 'Mythic',
    creditRange: { min: 400, max: 550 },
    image: '/DroneWars/Credits/command-codes.png',
    description: 'Military authorization keys with lasting value.'
  },
  {
    id: 'SALVAGE_QUANTUM_PROCESSOR',
    name: 'Quantum Processing Unit',
    rarity: 'Mythic',
    creditRange: { min: 450, max: 600 },
    image: '/DroneWars/Credits/quantum-processor.png',
    description: 'Cutting-edge computation hardware, impossibly rare.'
  },
  {
    id: 'SALVAGE_PRECURSOR_RELIC',
    name: 'Precursor Relic',
    rarity: 'Mythic',
    creditRange: { min: 500, max: 700 },
    image: '/DroneWars/Credits/precursor-relic.png',
    description: 'An artifact from the civilization that came before.'
  }
];

// =====================================================
// RE-EXPORTS: Logic functions moved to src/logic/salvage/salvageItemHelpers.js
// Kept here for backward compatibility
// =====================================================
export { findEligibleItems, selectSalvageItem, generateSalvageItemFromValue } from '../logic/salvage/salvageItemHelpers.js';

export default SALVAGE_ITEMS;
