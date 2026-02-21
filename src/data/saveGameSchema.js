/**
 * Save Game Schema
 * Defines the structure for single-player save files
 * Version 1.0
 */

import { starterDeck } from './playerDeckData.js';
import { ECONOMY } from './economyData.js';

export const SAVE_VERSION = '1.0';

/**
 * Starter pool cards - cards with unlimited availability
 * All cards/components/drones from starter deck can be used in all 6 slots
 */
export const starterPoolCards = [
  // All action cards from starter deck
  ...starterDeck.decklist.map(c => c.id),
  // All ship components from starter deck
  ...Object.keys(starterDeck.shipComponents)
];

export const starterPoolDroneNames = starterDeck.droneSlots.filter(s => s.assignedDrone).map(s => s.assignedDrone);

/**
 * Starter pool ship - ship card from starter deck
 * Available in all 6 slots without needing to unlock
 */
export const starterPoolShipIds = [starterDeck.shipId];

/**
 * Default player profile (new game)
 */
export const defaultPlayerProfile = {
  saveVersion: SAVE_VERSION,
  createdAt: Date.now(),
  lastPlayedAt: Date.now(),

  // Currency
  credits: ECONOMY.STARTING_CREDITS,
  securityTokens: 0,
  aiCores: 0,  // Currency from defeating AI enemies, required for blueprint crafting

  // Progression - empty at start
  unlockedBlueprints: [],

  // Single seed for entire single-player game (deterministic map generation)
  gameSeed: Date.now(),

  // Default ship slot for deployment (0-5)
  defaultShipSlotId: 0,

  // Deck slot unlocking - highest slot number unlocked (0 = only starter)
  // Must unlock slots sequentially (Slot 1 before Slot 2, etc.)
  highestUnlockedSlot: 0,

  // Statistics (optional for MVP)
  stats: {
    runsCompleted: 0,
    runsLost: 0,
    totalCreditsEarned: 0,
    totalCombatsWon: 0,
    totalCombatsLost: 0,
    highestTierCompleted: 0,
  },

  // Reputation system - rewards players for risking custom loadouts
  reputation: {
    current: 0,             // Current reputation points
    level: 0,               // Current level (starts at 0)
    unclaimedRewards: [],   // Array of level numbers with unclaimed rewards
  },

  // Tactical items - consumables for use on the tactical map
  tacticalItems: {
    ITEM_EVADE: 0,
    ITEM_EXTRACT: 0,
    ITEM_THREAT_REDUCE: 0,
  },

  // Shop pack - one random card pack available for purchase
  // Refreshes on game start and after successful extraction
  // { packType: string, tier: number, seed: number } | null
  shopPack: null,

  // Boss battle progress tracking
  bossProgress: {
    defeatedBosses: [],      // Array of bossIds that have been defeated (for first-time rewards)
    totalBossVictories: 0,   // Total number of boss wins (including repeats)
    totalBossAttempts: 0     // Total number of boss fight attempts
  },

  // Mission tracking system
  missions: {
    completed: [],    // Array of mission IDs that have been completed
    claimable: [],    // Array of mission IDs with unclaimed rewards
    hidden: [],       // Array of mission IDs hidden (e.g., skipped intro missions)
    progress: {},     // { missionId: { current: number, target: number } }
  },

  // Tutorial dismissal tracking (reset on new game)
  tutorialDismissals: {
    intro: false,
    inventory: false,
    replicator: false,
    blueprints: false,
    shop: false,
    repairBay: false,
    tacticalMapOverview: false,
    tacticalMap: false,
    deckBuilder: false,
  },
};

/**
 * Default inventory - empty at start
 * Starter deck cards exist only in Ship Slot 0
 * This only contains cards acquired through gameplay (loot, crafting, packs)
 */
export const defaultInventory = {};


/**
 * Default discovered cards - empty at start
 * Cards added when unlocked from card packs
 * Format: { cardId, state: 'owned' | 'discovered' | 'undiscovered' }
 * - 'owned': Player has the card in inventory or Ship Slot 0
 * - 'discovered': Player has seen the card but doesn't own it
 * - 'undiscovered': Player has never seen the card (default for cards not in this array)
 */
export const defaultDiscoveredCards = [];

/**
 * Default quick deployments - empty at start
 * Deck-agnostic deployment templates for turn 1
 * Format: { id, name, createdAt, droneRoster: string[], placements: { droneName, lane }[] }
 * - droneRoster: 5 unique drone names this deployment is designed for
 * - placements: which drones to deploy in which lanes (0=left, 1=middle, 2=right)
 * Maximum 5 quick deployments allowed
 */
export const defaultQuickDeployments = [];
