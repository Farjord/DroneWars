import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Shield, Bolt, Wrench, Sprout, Hand, ShipWheel, Settings, X, ChevronRight, ChevronLeft, Plus, RotateCcw, ShieldCheck, Sword, Search, Gavel, Bomb, Rocket, Skull, Bug, Cpu, Target, View, Zap, Heart, ChevronUp, ChevronDown } from 'lucide-react';
import './App.css';


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

// --- DATA ---
const fullDroneCollection = [
  { name: 'Scout Drone', class: 1, limit: 3, attack: 1, hull: 1, shields: 1, speed: 5, image: 'https://placehold.co/128x128/0ff/000?text=Scout', abilities: [] },
  { name: 'Standard Fighter', class: 2, limit: 3, attack: 3, hull: 2, shields: 1, speed: 4, image: 'https://placehold.co/128x128/f0f/000?text=Fighter', abilities: [] },
  { name: 'Heavy Fighter', class: 3, limit: 2, attack: 4, hull: 4, shields: 1, speed: 3, image: 'https://placehold.co/128x128/ff0/000?text=Heavy', abilities: [] },
   { 
    name: 'Guardian Drone', 
    class: 3, 
    limit: 2, 
    attack: 2, 
    hull: 5, 
    shields: 1, 
    speed: 1, 
    image: 'https://placehold.co/128x128/00f/fff?text=Guardian', 
    abilities: [{
        name: 'Guardian Protocol',
        description: 'The ship section in this lane cannot be targeted by attacks while this drone is active.',
        type: 'PASSIVE',
        icon: Shield,
        effect: { type: 'GRANT_KEYWORD', keyword: 'GUARDIAN' }
    }] 
  },
    { 
    name: 'Bomber', 
    class: 3, 
    limit: 3, 
    attack: 1,
    hull: 2, 
    shields: 1, 
    speed: 1, 
    image: 'https://placehold.co/128x128/f00/fff?text=Bomber', 
    abilities: [{ 
        name: 'Tachyon Warhead',
        description: 'Deals +5 damage when attacking an enemy ship section.',
        type: 'PASSIVE',
        icon: Bomb,
        effect: { type: 'BONUS_DAMAGE_VS_SHIP', value: 4 }
    }] 
  },
  { 
    name: 'Repair Drone', 
    class: 1, limit: 2, attack: 0, hull: 1, shields: 3, speed: 2, 
    image: 'https://placehold.co/128x128/0f0/000?text=Repair', 
    abilities: [{
        name: 'Nano Repair',
        description: 'Pay 1 Energy and exhaust to restore 2 hull to a damaged friendly drone in the same lane.',
        type: 'ACTIVE',
        icon: Wrench,
        targeting: {
            type: 'DRONE',
            affinity: 'FRIENDLY',
            location: 'SAME_LANE',
            custom: ['DAMAGED_HULL']
        },
        effect: { type: 'HEAL', value: 2 },
        cost: { energy: 1, exhausts: true }
    }]
  },
{ 
    name: 'Interceptor', 
    class: 3, limit: 3, attack: 1, hull: 4, shields: 0, speed: 2, 
    image: 'https://placehold.co/128x128/fff/000?text=Interceptor',
    abilities: [{
        name: 'Vigilant',
        description: 'Can always intercept attacks in this lane, regardless of speed.',
        type: 'PASSIVE',
        icon: ShieldCheck,
        effect: { type: 'GRANT_KEYWORD', keyword: 'ALWAYS_INTERCEPTS' }
    }, {
        name: 'Defender',
        description: 'Does not exhaust when intercepting.',
        type: 'PASSIVE',
        icon: Shield,
        effect: { type: 'GRANT_KEYWORD', keyword: 'DEFENDER' }
    }] 
  },
  { 
    name: 'Aegis Drone', 
    class: 3, limit: 2, attack: 1, hull: 2, shields: 2, speed: 2, 
    image: 'https://placehold.co/128x128/ccc/000?text=Aegis',
    abilities: [{
        name: 'Shield Harmonizer',
        description: 'Other friendly drones in this lane gain +1 max shields.',
        type: 'PASSIVE',
        icon: Shield,
        scope: 'FRIENDLY_IN_LANE',
        effect: { type: 'MODIFY_STAT', stat: 'shields', value: 1 }
    }]
  },
  { name: 'Kamikaze Drone', class: 2, limit: 1, attack: 6, hull: 1, shields: 0, speed: 4, image: 'https://placehold.co/128x128/f80/000?text=Kamikaze', abilities: [] },
  { name: 'Swarm Drone', class: 0, limit: 3, attack: 1, hull: 1, shields: 0, speed: 3, image: 'https://placehold.co/128x128/80f/fff?text=Swarm', abilities: [] },
  { 
    name: 'Sniper Drone', 
    class: 4, limit: 1, attack: 1, hull: 1, shields: 0, speed: 2, 
    image: 'https://placehold.co/128x128/aaa/000?text=Sniper', 
    abilities: [{
        name: 'Long-Range Shot',
        description: 'Pay 1 Energy and exhaust to deal 4 damage to an enemy drone in any lane.',
        type: 'ACTIVE',
        icon: Target,
        targeting: {
            type: 'DRONE',
            affinity: 'ENEMY',
            location: 'ANY_LANE'
        },
        effect: { type: 'DAMAGE', value: 4 },
        cost: { energy: 1, exhausts: true }
    }]
  },
  { 
    name: 'Sabot Drone', 
    class: 3, 
    limit: 2, 
    attack: 2, 
    hull: 3, 
    shields: 1, 
    speed: 2, 
    image: 'https://placehold.co/128x128/888/fff?text=Sabot', 
    abilities: [{
        name: 'Piercing',
        description: 'Damage ignores enemy shields.',
  }],
      damageType: 'PIERCING' // This new property makes its attacks ignore shields
  },
  { 
    name: 'Avenger Drone', 
    class: 1, 
    limit: 2, 
    attack: 1, 
    hull: 1, 
    shields: 1, 
    speed: 3, 
    image: 'https://placehold.co/128x128/f59e0b/000?text=Avenger', 
    abilities: [{
        name: 'Vengeance Protocol',
        description: 'Gains +2 attack if the friendly ship section in this lane has taken hull damage.',
        type: 'PASSIVE',
        icon: Sword,
        effect: {
            type: 'CONDITIONAL_MODIFY_STAT',
            mod: { stat: 'attack', value: 2 },
            condition: { 
                type: 'SHIP_SECTION_HULL_DAMAGED',
                location: 'SAME_LANE'
            }
        }
    }]
  },
  {
    name: 'Vindicator Drone',
    class: 1,
    limit: 3,
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 3,
    image: 'https://placehold.co/128x128/c084fc/000?text=Vindicator',
    abilities: [{
        name: 'Retribution',
        description: 'Gains +1 attack for each of your damaged or critical ship sections.',
        type: 'PASSIVE',
        icon: Sword,
        effect: {
            type: 'CONDITIONAL_MODIFY_STAT_SCALING',
            mod: { stat: 'attack', value: 1 },
            condition: {
                type: 'OWN_DAMAGED_SECTIONS',
            }
        }
    }]
  }
];
// --- CARD DATA ---
const fullCardCollection = [
  {
    id: 'CARD001',
    name: 'Laser Blast',
    type: 'Action',
    cost: 2,
    image: 'https://placehold.co/128x128/f43f5e/ffffff?text=Blast',
    description: 'Deal 3 damage to any drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY', 
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 3
    }
  },
    {
    id: 'CARD002',
    name: 'System Reboot',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/22d3ee/ffffff?text=Draw',
    description: 'Draw 2 cards from your deck.',
    // No targeting key is needed for this card
    effect: {
      type: 'DRAW',
      value: 2
    }
  },
   {
    id: 'CARD003',
    name: 'Out Think',
    type: 'Action',
    cost: 0,
    image: 'https://placehold.co/128x128/a855f7/ffffff?text=Out+Think',
    description: 'Draw 1 card.',
    // No targeting is needed
    effect: {
      type: 'DRAW',
      value: 1,
     }
  },
    {
    id: 'CARD004',
    name: 'Energy Surge',
    type: 'Action',
    cost: 0,
    image: 'https://placehold.co/128x128/facc15/000000?text=Energy',
    description: 'Gain 2 Energy.',
    // No targeting is needed for this effect
    effect: {
      type: 'GAIN_ENERGY',
      value: 2
    }
  },
    {
    id: 'CARD005',
    name: 'Adrenaline Rush',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/10b981/ffffff?text=Ready',
    description: 'Ready an exhausted friendly drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE',
      custom: ['EXHAUSTED'] 
    },
    effect: {
      type: 'READY_DRONE'
    }
  },
    {
    id: 'CARD006',
    name: 'Nanobot Repair',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/60a5fa/ffffff?text=Repair+',
    description: 'Restore 3 hull to a friendly drone. Cannot exceed its maximum hull.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'HEAL_HULL', 
      value: 3
    }
  },
  {
    id: 'CARD007',
    name: 'Emergency Patch',
    type: 'Action',
    cost: 3,
    image: 'https://placehold.co/128x128/34d399/ffffff?text=Patch',
    description: 'Restore 4 hull to one of your ship sections.',
    targeting: {
      type: 'SHIP_SECTION',
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_HULL', 
      value: 4
    }
  },
  {
    id: 'CARD008',
    name: 'Shield Recharge',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/4ade80/000000?text=Recharge',
    description: 'Restore 1 shield to all friendly drones in a target lane.',
    targeting: {
      type: 'LANE', // New targeting type
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_SHIELDS',
      value: 1
    }
  },
  // Single-target destroy
  {
    id: 'CARD009',
    name: 'Target Lock',
    type: 'Action',
    cost: 4, // High cost for a powerful effect
    image: 'https://placehold.co/128x128/f87171/ffffff?text=Target',
    description: 'Destroy a single target drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DESTROY',
      scope: 'SINGLE' // Our new 'scope' for single targets
    }
  },

  // Filtered-target destroy
  {
    id: 'CARD010',
    name: 'Shrieker Missiles',
    type: 'Action',
    cost: 4,
    image: 'https://placehold.co/128x128/60a5fa/ffffff?text=Shrieker',
    description: 'Destroy all enemy drones with a speed of 5 or higher in a selected lane.',
    targeting: {
      type: 'LANE',
      affinity: 'ENEMY' // This card can only target enemy lanes
    },
    effect: {
      type: 'DESTROY',
      scope: 'FILTERED', // Our new 'scope' for conditional effects
      filter: { stat: 'speed', comparison: 'GTE', value: 5 }
    }
  },

  // NUKE card
  {
    id: 'CARD011',
    name: 'Nuke',
    type: 'Action',
    cost: 7, // Increased cost to reflect its power
    image: 'https://placehold.co/128x128/ef4444/ffffff?text=Nuke',
    description: 'Destroy ALL drones in a selected lane (both sides).',
    targeting: {
      type: 'LANE',
      affinity: 'ANY'
    },
    effect: {
      type: 'DESTROY',
      scope: 'LANE' // This scope remains the same
    }
  },
// Piercing Attack Card
    {
    id: 'CARD012',
    name: 'Armor-Piercing Shot',
    type: 'Action',
    cost: 3,
    image: 'https://placehold.co/128x128/84cc16/ffffff?text=Pierce',
    description: 'Deal 2 piercing damage to any drone. (Piercing damage ignores shields).',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY', 
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      damageType: 'PIERCING' // This new property defines the damage type
    }
  },

   {
    id: 'CARD013',
    name: 'Sidewinder Missiles',
    type: 'Action',
    cost: 3,
    image: 'https://placehold.co/128x128/60a5fa/ffffff?text=Sidewinder',
    description: 'Deal 2 damage to all enemy drones with a speed of 3 or Less in a selected lane.',
    targeting: {
      type: 'LANE',
      affinity: 'ENEMY' // This card can only target enemy lanes
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      scope: 'FILTERED', // Our new 'scope' for conditional effects
       filter: { stat: 'speed', comparison: 'LTE', value: 3 }
    }
  },
   {
    id: 'CARD014',
    name: 'Overcharge',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/fb923c/ffffff?text=ATK+',
    description: 'Give a friendly drone +2 attack until the end of the turn.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'attack', value: 2, type: 'temporary' },
    }
  },
  {
    id: 'CARD015',
    name: 'Streamline',
    type: 'Action',
    cost: 2,
    image: 'https://placehold.co/128x128/38bdf8/ffffff?text=SPD+',
    description: 'Give a friendly drone a permanent +1 speed bonus.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'speed', value: 1, type: 'permanent' },
    }
  },
  {
    id: 'CARD016',
    name: 'Static Field',
    type: 'Action',
    cost: 0,
    image: 'https://placehold.co/128x128/f87171/ffffff?text=ATK-',
    description: 'Give an enemy drone -2 attack until the end of the turn. Go again.',
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'attack', value: -2, type: 'temporary' },
      goAgain: true
    }
  },
  {
    id: 'CARD017',
    name: 'Boosters',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/7dd3fc/ffffff?text=SPD+',
    description: 'Give a friendly drone +2 speed until the end of the turn.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'speed', value: 2, type: 'temporary' },
    }
  },
  {
    id: 'CARD018',
    name: 'Desperate Measures',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/f59e0b/ffffff?text=Desperate',
    description: 'Draw 1 card and gain 1 Energy. Repeat this effect for each of your damaged or critical ship sections.',
    effect: {
      type: 'REPEATING_EFFECT',
      effects: [{ type: 'DRAW', value: 1 }, { type: 'GAIN_ENERGY', value: 1 }],
      condition: 'OWN_DAMAGED_SECTIONS'
    }
  },
    {
    id: 'CARD019',
    name: 'Reposition',
    type: 'Action',
    cost: 1,
    image: 'https://placehold.co/128x128/a78bfa/ffffff?text=Move',
    description: 'Select a lane. Move up to 2 friendly drones from that lane to another. The moved drones are not exhausted.',
    effect: {
      type: 'MULTI_MOVE',
      count: 2,
      source: { location: 'SAME_LANE', affinity: 'FRIENDLY' },
      destination: { affinity: 'FRIENDLY' },
      properties: ['DO_NOT_EXHAUST']
    }
  }
];

// --- AI PERSONALITY DEFINITIONS ---

const aiPersonalities = [
  {
    name: 'Annihilator Alpha',
    description: 'Focuses on overwhelming firepower and direct destruction.',
    // The specific 5 drones this AI will use.
    dronePool: [
      'Heavy Fighter', 
      'Standard Fighter', 
      'Kamikaze Drone', 
      'Bomber', 
      'Swarm Drone'
    ],
    // The specific cards and quantities for this AI's deck.
    decklist: [
    { id: 'CARD001', quantity: 0 },
    { id: 'CARD002', quantity: 0 },
    { id: 'CARD003', quantity: 0 },
    { id: 'CARD004', quantity: 0 },
    { id: 'CARD005', quantity: 0 },
    { id: 'CARD006', quantity: 0 },
    { id: 'CARD007', quantity: 0 },
    { id: 'CARD008', quantity: 0 },
    { id: 'CARD009', quantity: 0 },
    { id: 'CARD010', quantity: 0 },
    { id: 'CARD011', quantity: 0 },
    { id: 'CARD012', quantity: 0 },
    { id: 'CARD013', quantity: 10 },
    { id: 'CARD014', quantity: 0 },
    { id: 'CARD015', quantity: 0 }, 
    { id: 'CARD016', quantity: 0 }, 
    { id: 'CARD017', quantity: 0 }, 
    { id: 'CARD018', quantity: 0 }, 
    { id: 'CARD019', quantity: 2 },
    ]
  },
  // You can add more AI personalities here in the future
  // {
  //   name: 'Swarm Tactician',
  //   description: 'Overwhelms the enemy with numerous, low-cost drones.',
  //   dronePool: ['Swarm Drone', 'Scout Drone', 'Standard Fighter', 'Interceptor', 'Repair Drone'],
  //   decklist: [
  //      { id: 'CARD002', quantity: 2 },
  //      { id: 'CARD008', quantity: 2 },
  //   ]
  // }
];


// --- HELPER FUNCTIONS ---
const getRandomDrones = (collection, count) => {
  const shuffled = [...collection].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// --- MODIFIED ---
const createCard = (cardTemplate, instanceId) => {
  return { ...cardTemplate, instanceId };
};

// --- NEW: DECKLIST DEFINITION ---
// This list defines the contents of the starting deck.
const startingDecklist = [
    { id: 'CARD001', quantity: 0 },
    { id: 'CARD002', quantity: 0 },
    { id: 'CARD003', quantity: 0 },
    { id: 'CARD004', quantity: 0 },
    { id: 'CARD005', quantity: 0 },
    { id: 'CARD006', quantity: 0 },
    { id: 'CARD007', quantity: 0 },
    { id: 'CARD008', quantity: 0 },
    { id: 'CARD009', quantity: 0 },
    { id: 'CARD010', quantity: 0 },
    { id: 'CARD011', quantity: 0 },
    { id: 'CARD012', quantity: 0 },
    { id: 'CARD013', quantity: 0 },
    { id: 'CARD014', quantity: 0 }, 
    { id: 'CARD015', quantity: 0 }, 
    { id: 'CARD016', quantity: 0 }, 
    { id: 'CARD017', quantity: 0 }, 
    { id: 'CARD018', quantity: 0 }, 
    { id: 'CARD019', quantity: 10 },
];


// --- NEW: UPDATED FUNCTION ---
const buildDeckFromList = (decklist) => {
  const deck = [];
  let instanceCounter = 0;

  decklist.forEach(item => {
    // Find the full card data using the id from the decklist
    const cardTemplate = fullCardCollection.find(c => c.id === item.id);
    if (cardTemplate) {
      // Add the specified quantity of that card
      for (let i = 0; i < item.quantity; i++) {
        deck.push(createCard(cardTemplate, `card-${Date.now()}-${instanceCounter++}`));
      }
    }
  });

  // Shuffle the final deck so the cards are in a random order
  return deck.sort(() => 0.5 - Math.random());
};

const getShipStatus = (section) => {
    if (section.hull <= section.thresholds.critical) {
      return 'critical';
    }
    if (section.hull <= section.thresholds.damaged) {
      return 'damaged';
    }
    return 'healthy';
};

const calculateEffectiveShipStats = (playerState) => {
    const stats = {};
    if (!playerState || !playerState.shipSections) {
        return { handLimit: 0, discardLimit: 0, energyPerTurn: 0, maxEnergy: 0, shieldsPerTurn: 0, initialDeployment: 0, cpuLimit: 0 };
    }
    for (const sectionName in playerState.shipSections) {
      const section = playerState.shipSections[sectionName];
      const status = getShipStatus(section);
      stats[sectionName] = section.stats[status];
    }
    return {
      handLimit: stats.bridge['Draw'],
      discardLimit: stats.bridge['Discard'],
      energyPerTurn: stats.powerCell['Energy Per Turn'],
      maxEnergy: stats.powerCell['Max Energy'],
      shieldsPerTurn: stats.powerCell['Shields Per Turn'],
      initialDeployment: stats.droneControlHub['Initial Deployment'],
      deploymentBudget: stats.droneControlHub['Deployment Budget'],
      cpuLimit: stats.droneControlHub['CPU Control Value'],
    };
};

const calculateLaneScore = (laneId, aiPlayerState, humanPlayerState, aiPlacedSections, humanPlacedSections, getShipStatus, calculateEffectiveStats, calculatePotentialEffectiveStats) => {
  const aiDronesInLane = aiPlayerState.dronesOnBoard[laneId] || [];
  const humanDronesInLane = humanPlayerState.dronesOnBoard[laneId] || [];
  const laneIndex = parseInt(laneId.slice(-1)) - 1;

  // 1. Raw Power Score
  const getPower = (drones, owner, opponent, sections) => drones.reduce((sum, drone) => {
    const isAI = owner.name !== 'Player 1';
    const stats = isAI 
      ? calculatePotentialEffectiveStats(drone, laneId, owner, opponent, sections)
      : calculateEffectiveStats(drone, laneId, owner, opponent, sections);

    // The Bomber's threat is its potential ship damage, not its low attack.
    const threatValue = (stats.attack || 0) + (stats.potentialShipDamage || 0);
    return sum + threatValue + (drone.hull || 0) + (drone.currentShields || 0);
  }, 0);

  const aiPower = getPower(aiDronesInLane, aiPlayerState, humanPlayerState, aiPlacedSections);
  const humanPower = getPower(humanDronesInLane, humanPlayerState, aiPlayerState, humanPlacedSections);
  const baseScore = aiPower - humanPower;

  // 2. Speed Advantage Score
  const getMaxSpeed = (drones, owner, opponent, sections) => {
    if (drones.length === 0) return 0;
    // Both sides use actual speed for this calculation
    return Math.max(...drones.map(d => calculateEffectiveStats(d, laneId, owner, opponent, sections).speed));
  };
  const aiMaxSpeed = getMaxSpeed(aiDronesInLane, aiPlayerState, humanPlayerState, aiPlacedSections);
  const humanMaxSpeed = getMaxSpeed(humanDronesInLane, humanPlayerState, aiPlayerState, humanPlacedSections);
  const speedScore = (aiMaxSpeed - humanMaxSpeed) * 5;

  // 3. Ship Section Health Modifiers
  let healthModifier = 0;
  // Defensive Urgency
  const aiSectionName = aiPlacedSections[laneIndex];
  if (aiSectionName) {
    const aiSectionStatus = getShipStatus(aiPlayerState.shipSections[aiSectionName]);
    if (aiSectionStatus === 'damaged') healthModifier -= 20;
    if (aiSectionStatus === 'critical') healthModifier -= 40;
  }
  // Offensive Opportunity
  const humanSectionName = humanPlacedSections[laneIndex];
  if (humanSectionName) {
    const humanSectionStatus = getShipStatus(humanPlayerState.shipSections[humanSectionName]);
    if (humanSectionStatus === 'damaged') healthModifier += 15;
    if (humanSectionStatus === 'critical') healthModifier += 30;
  }

  return baseScore + speedScore + healthModifier;
};


// --- INITIAL STATE ---
const initialPlayerState = (name, decklist = startingDecklist) => {
  const shipSections = {
    bridge: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'The command center of your ship.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Draw': 5, 'Discard': 2 },
        damaged: { 'Draw': 4, 'Discard': 1 }, 
        critical: { 'Draw': 3, 'Discard': 1 },
      },
      image: '/img/Bridge.png'
    },

    powerCell: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'Generates energy to power your abilities.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Energy Per Turn': 10, 'Max Energy': 10, 'Shields Per Turn': 4 },
        damaged: { 'Energy Per Turn': 8, 'Max Energy': 8, 'Shields Per Turn': 3 },
        critical: { 'Energy Per Turn': 6, 'Max Energy': 6, 'Shields Per Turn': 2 },
      },
      image: '/img/Power_Cell.png'
    },

    droneControlHub: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'Controls your drone fleet.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Initial Deployment': 6, 'CPU Control Value': 10, 'Deployment Budget': 3 },
        damaged: { 'Initial Deployment': 5, 'CPU Control Value': 8, 'Deployment Budget': 2 },
        critical: { 'Initial Deployment': 4, 'CPU Control Value': 6, 'Deployment Budget': 1 },
      },
      image: '/img/Drone_Control_Hub.png'
    }
  };

  const healthyStats = calculateEffectiveShipStats({ shipSections });

  return {
    name: name,
    shipSections: shipSections,
    energy: healthyStats.energyPerTurn,
    initialDeploymentBudget: healthyStats.initialDeployment,
    deploymentBudget: 0,
    hand: [],
    deck: buildDeckFromList(decklist),
    discardPile: [],
    activeDronePool: [],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    deployedDroneCounts: {},
  };
};

const onDroneDestroyed = (playerState, destroyedDrone) => {
    if (!playerState.deployedDroneCounts.hasOwnProperty(destroyedDrone.name)) {
        return {};
    }
    const newDeployedCounts = { ...playerState.deployedDroneCounts };
    const droneName = destroyedDrone.name;
    if (newDeployedCounts[droneName] > 0) {
        newDeployedCounts[droneName] -= 1;
    }
    return { deployedDroneCounts: newDeployedCounts };
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
  const [player1, setPlayer1] = useState(initialPlayerState('Player 1'));
  const [player2, setPlayer2] = useState(initialPlayerState('Player 2'));
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [firstPlayerOfRound, setFirstPlayerOfRound] = useState(null);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [passInfo, setPassInfo] = useState({ firstPasser: null, player1Passed: false, player2Passed: false });
  const [aiActionCount, setAiActionCount] = useState(0);
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
  const [tempSelectedDrones, setTempSelectedDrones] = useState([]);
  const [droneSelectionPool, setDroneSelectionPool] = useState([]);
  const [droneSelectionPair, setDroneSelectionPair] = useState([]);
  const [recentlyHitDrones, setRecentlyHitDrones] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [arrowState, setArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const droneRefs = useRef({});
  const gameAreaRef = useRef(null);
  const [winner, setWinner] = useState(null);
  const [showActionPhaseStartModal, setShowActionPhaseStartModal] = useState(false);
  const [showRoundEndModal, setShowRoundEndModal] = useState(false);
  const [gameLog, setGameLog] = useState([]);
  const [isFooterOpen, setIsFooterOpen] = useState(true);
  const [aiDecisionLogToShow, setAiDecisionLogToShow] = useState(null);
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
   // We use the 'turn' state variable directly here
 setGameLog(prevLog => [...prevLog, { round: turn, debugSource, ...entry, aiDecisionContext: aiContext }]); // Modified line
  }, [turn]); // This hook depends on the 'turn' state

  // --- ABILITY STATE ---
  const [abilityMode, setAbilityMode] = useState(null); // { drone, ability }
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);
  
  // --- NEW: CARD PLAYING STATE ---
  const [selectedCard, setSelectedCard] = useState(null); // { card data }
  const [validCardTargets, setValidCardTargets] = useState([]); // [id1, id2, ...]
  const [cardConfirmation, setCardConfirmation] = useState(null); // { card, target }
  const [multiSelectState, setMultiSelectState] = useState(null); // To manage multi-step card effects

  
  // --- MANDATORY ACTION STATE ---
  const [mandatoryAction, setMandatoryAction] = useState(null); // e.g., { type: 'discard'/'destroy', player: 'player1', count: X }
  const [showMandatoryActionModal, setShowMandatoryActionModal] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(null); // For confirm/cancel popups
  const [initialShieldAllocation, setInitialShieldAllocation] = useState(null); // For shield allocation reset
  const [optionalDiscardCount, setOptionalDiscardCount] = useState(0); // For optional discard phase

  // Memoize effective stats for performance and easy access
  const player1EffectiveStats = useMemo(() => calculateEffectiveShipStats(player1), [player1.shipSections]);
  const player2EffectiveStats = useMemo(() => calculateEffectiveShipStats(player2), [player2.shipSections]);

  const totalPlayer1Drones = useMemo(() => Object.values(player1.dronesOnBoard).flat().length, [player1.dronesOnBoard]);
  const totalPlayer2Drones = useMemo(() => Object.values(player2.dronesOnBoard).flat().length, [player2.dronesOnBoard]);


  // --- ABILITY & GAME LOGIC (ORDER MATTERS HERE) ---

  const calculateEffectiveStats = useCallback((drone, lane, playerState, opponentState, allPlacedSections) => {
    // If drone data is incomplete, return a safe default
    if (!drone || !lane || !playerState || !opponentState || !allPlacedSections) {
        return { attack: 0, speed: 0, hull: 0, maxShields: 0, baseAttack: 0, baseSpeed: 0, keywords: new Set() };
    }
  
    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
    if (!baseDrone) return { ...drone, baseAttack: drone.attack, baseSpeed: drone.speed, maxShields: 0, keywords: new Set() };
  
    // Start with base stats
    let effectiveStats = {
      ...drone,
      attack: baseDrone.attack,
      speed: baseDrone.speed,
      maxShields: baseDrone.shields,
      // Store base stats for UI comparison
      baseAttack: baseDrone.attack,
      baseSpeed: baseDrone.speed,
      keywords: new Set()
    };
  
    // 1. Apply Permanent & Temporary Mods from the drone's statMods array
    drone.statMods?.forEach(mod => {
      if (mod.stat === 'attack') effectiveStats.attack += mod.value;
      if (mod.stat === 'speed') effectiveStats.speed += mod.value;
      // Future stats like 'hull' or 'maxShields' could be added here
    });
  
    // 2. Apply Self-Passives (Keywords and Conditional Mods)
    baseDrone.abilities?.forEach(ability => {
      if (ability.type !== 'PASSIVE') return;
  
      // Grant simple keywords
      if (ability.effect.type === 'GRANT_KEYWORD') {
        effectiveStats.keywords.add(ability.effect.keyword);
      }
      
      // Handle conditional stat modifications
      if (ability.effect.type === 'CONDITIONAL_MODIFY_STAT') {
        const { condition, mod } = ability.effect;
        let conditionMet = false;
  
        if (condition.type === 'SHIP_SECTION_HULL_DAMAGED' && condition.location === 'SAME_LANE') {
          const laneIndex = parseInt(lane.slice(-1)) - 1;
          const sectionName = allPlacedSections[laneIndex];
          if (sectionName) {
            const shipSection = playerState.shipSections[sectionName];
            if (shipSection) {
              // Use getShipStatus to check if it's not 'healthy'
              const status = getShipStatus(shipSection);
              if (status === 'damaged' || status === 'critical') {
                conditionMet = true;
              }
            }
          }
        }
        // ... Other conditions can be added here in the future
  
        if (conditionMet) {
          if (mod.stat === 'attack') effectiveStats.attack += mod.value;
          if (mod.stat === 'speed') effectiveStats.speed += mod.value;
        }
      }
      
      // Handle scaling conditional stat modifications
      if (ability.effect.type === 'CONDITIONAL_MODIFY_STAT_SCALING') {
        const { condition, mod } = ability.effect;
        let scaleFactor = 0;

        if (condition.type === 'OWN_DAMAGED_SECTIONS') {
          // Count the number of damaged or critical sections for the player owning the drone
          for (const sectionName in playerState.shipSections) {
            const shipSection = playerState.shipSections[sectionName];
            const status = getShipStatus(shipSection);
            if (status === 'damaged' || status === 'critical') {
              scaleFactor++;
            }
          }
        }
        // ... Other scaling conditions can be added here in the future

        if (scaleFactor > 0) {
          if (mod.stat === 'attack') effectiveStats.attack += (mod.value * scaleFactor);
          if (mod.stat === 'speed') effectiveStats.speed += (mod.value * scaleFactor);
        }
      }
    });
  
    // 3. Apply Auras from other friendly drones in the same lane
    playerState.dronesOnBoard[lane]?.forEach(otherDrone => {
      if (otherDrone.id === drone.id) return;
      const otherBaseDrone = fullDroneCollection.find(d => d.name === otherDrone.name);
      otherBaseDrone?.abilities?.forEach(ability => {
        if (ability.type === 'PASSIVE' && ability.scope === 'FRIENDLY_IN_LANE' && ability.effect.type === 'MODIFY_STAT') {
          // GENERALIZE this section for any stat
          const { stat, value } = ability.effect;
          if (stat === 'shields') { // Max shields is a special case
            effectiveStats.maxShields += value;
          } else if (stat === 'attack') {
            effectiveStats.attack += value;
          } else if (stat === 'speed') {
            effectiveStats.speed += value;
          }
        }
      });
    });
  
    // Negative attack/speed values are allowed internally, but we treat them as 0 for damage/interception.
    // The actual calculation part of the code will handle this, so we don't need to floor it here.
  
    return effectiveStats;
  }, []);


const calculatePotentialEffectiveStats = useCallback((drone, lane, playerState, opponentState, allPlacedSections) => {
    if (!drone || !lane || !playerState || !opponentState || !allPlacedSections) {
        return { attack: 0, speed: 0, hull: 0, maxShields: 0, baseAttack: 0, baseSpeed: 0, keywords: new Set() };
    }
  
    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
    if (!baseDrone) return { ...drone, baseAttack: drone.attack, baseSpeed: drone.speed, maxShields: 0, keywords: new Set() };
  
    let effectiveStats = {
      ...drone,
      attack: baseDrone.attack,
      speed: baseDrone.speed,
      maxShields: baseDrone.shields,
      baseAttack: baseDrone.attack,
      baseSpeed: baseDrone.speed,
      keywords: new Set()
    };
  
    drone.statMods?.forEach(mod => {
      if (mod.stat === 'attack') effectiveStats.attack += mod.value;
      if (mod.stat === 'speed') effectiveStats.speed += mod.value;
    });
  
    baseDrone.abilities?.forEach(ability => {
      if (ability.type !== 'PASSIVE') return;
  
      if (ability.effect.type === 'GRANT_KEYWORD') {
        effectiveStats.keywords.add(ability.effect.keyword);
      }
      
      // --- START: MODIFIED LOGIC FOR POTENTIAL ---
      if (ability.effect.type === 'CONDITIONAL_MODIFY_STAT') {
        const { condition, mod } = ability.effect;
        let conditionMet = false;
  
        // PREDICTION: Check if the ship section IS damaged
        if (condition.type === 'SHIP_SECTION_HULL_DAMAGED' && condition.location === 'SAME_LANE') {
          const laneIndex = parseInt(lane.slice(-1)) - 1;
          const sectionName = allPlacedSections[laneIndex];
          if (sectionName) {
            const shipSection = playerState.shipSections[sectionName];
            const status = getShipStatus(shipSection);
            if (status === 'damaged' || status === 'critical') {
              conditionMet = true;
            }
          }
        }
  
        if (conditionMet) {
          if (mod.stat === 'attack') effectiveStats.attack += mod.value;
        }
      }
      
      if (ability.effect.type === 'CONDITIONAL_MODIFY_STAT_SCALING') {
        const { condition, mod } = ability.effect;
        let scaleFactor = 0;

        // PREDICTION: Count currently damaged sections
        if (condition.type === 'OWN_DAMAGED_SECTIONS') {
          for (const sectionName in playerState.shipSections) {
            const shipSection = playerState.shipSections[sectionName];
            const status = getShipStatus(shipSection);
            if (status === 'damaged' || status === 'critical') {
              scaleFactor++;
            }
          }
        }

        if (scaleFactor > 0) {
          if (mod.stat === 'attack') effectiveStats.attack += (mod.value * scaleFactor);
        }
      }

      // PREDICTION: Add potential bonus damage for ship attacks
      if (ability.effect.type === 'BONUS_DAMAGE_VS_SHIP') {
        // We'll add this as a special property for the AI to consider
        effectiveStats.potentialShipDamage = (effectiveStats.potentialShipDamage || 0) + ability.effect.value;
      }
      // --- END: MODIFIED LOGIC FOR POTENTIAL ---
    });
  
    playerState.dronesOnBoard[lane]?.forEach(otherDrone => {
      if (otherDrone.id === drone.id) return;
      const otherBaseDrone = fullDroneCollection.find(d => d.name === otherDrone.name);
      otherBaseDrone?.abilities?.forEach(ability => {
        if (ability.type === 'PASSIVE' && ability.scope === 'FRIENDLY_IN_LANE' && ability.effect.type === 'MODIFY_STAT') {
          const { stat, value } = ability.effect;
          if (stat === 'shields') {
            effectiveStats.maxShields += value;
          } else if (stat === 'attack') {
            effectiveStats.attack += value;
          }
        }
      });
    });
  
    return effectiveStats;
  }, []);

const updateAuras = useCallback((playerState, opponentState, sections) => {
    const newDronesOnBoard = JSON.parse(JSON.stringify(playerState.dronesOnBoard));
    
    for(const lane in newDronesOnBoard) {
     newDronesOnBoard[lane].forEach(drone => {
        const oldMaxShields = drone.currentMaxShields;
        const { maxShields: newMaxShields } = calculateEffectiveStats(drone, lane, playerState, opponentState, sections);

        if (newMaxShields > oldMaxShields) {
          drone.currentShields += (newMaxShields - oldMaxShields);
        }
        drone.currentMaxShields = newMaxShields;
        drone.currentShields = Math.min(drone.currentShields, newMaxShields);
      });
    }
    return newDronesOnBoard;
  }, [calculateEffectiveStats]);

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
      setCurrentPlayer(actingPlayer);
      if (actingPlayer === 'player1') {
          setModalContent({ title: "Opponent Has Passed", text: "It's your turn again.", isBlocking: true});
      }
      return; 
  }

  setCurrentPlayer(nextPlayer);
  if (nextPlayer === 'player1') {
      setModalContent({ title: "Your Turn", text: "It's your turn to act.", isBlocking: true});
  } else {
      setModalContent({ title: "Opponent's Turn", text: "The AI is taking its turn.", isBlocking: false });
  }
}, [endActionPhase]);
  
  const getLaneOfDrone = useCallback((droneId, playerState) => {
      for (const [lane, drones] of Object.entries(playerState.dronesOnBoard)) {
          if (drones.some(d => d.id === droneId)) {
              return lane;
          }
      }
      return null;
  }, []);
  
  const getValidTargets = useCallback((actingPlayerId, source, definition) => {
    const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
    const opponentPlayerState = actingPlayerId === 'player1' ? player2 : player1;
    const targets = [];
    const isCard = typeof definition.cost === 'number';
    const isAbility = !isCard;

    const { type, affinity, location, custom } = definition.targeting;
    
    let userLane = null;
    if (isAbility) {
        // Find the lane of the drone using the ability, from the perspective of the acting player
        userLane = getLaneOfDrone(source.id, actingPlayerState);
        if (!userLane) return [];
    }
    
    const processPlayerDrones = (playerState, playerType) => {
      Object.entries(playerState.dronesOnBoard).forEach(([lane, drones]) => {
        let isValidLocation = false;
        if (location === 'ANY_LANE') isValidLocation = true;
        if (isAbility && location === 'SAME_LANE') isValidLocation = lane === userLane;
        
        if (isValidLocation) {
          drones.forEach(targetDrone => {
            let meetsCustomCriteria = true;
            if (custom?.includes('DAMAGED_HULL')) {
              const baseDrone = fullDroneCollection.find(d => d.name === targetDrone.name);
              if (!baseDrone || targetDrone.hull >= baseDrone.hull) {
                meetsCustomCriteria = false;
              }
            }
            if (custom?.includes('EXHAUSTED')) {
                if (!targetDrone.isExhausted) {
                    meetsCustomCriteria = false;
                }
            }

            if (meetsCustomCriteria) {
              targets.push({ ...targetDrone, lane, owner: playerType });
            }
          });
        }
      });
    };
    
    // --- NEW LOGIC for Ship Sections and Lanes ---
    const processPlayerSections = (playerState, playerType) => {
        Object.keys(playerState.shipSections).forEach(sectionName => {
            // Give the section an 'id' property for consistency with drone targets
            targets.push({ id: sectionName, owner: playerType, ...playerState.shipSections[sectionName] });
        });
    };

if (type === 'DRONE') {
      if (affinity === 'FRIENDLY' || affinity === 'ANY') {
        processPlayerDrones(actingPlayerState, actingPlayerId);
      }
      if (affinity === 'ENEMY' || affinity === 'ANY') {
        const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
        processPlayerDrones(opponentPlayerState, opponentId);
      }
    } else if (type === 'SHIP_SECTION') {
      if (affinity === 'FRIENDLY' || affinity === 'ANY') {
        processPlayerSections(actingPlayerState, actingPlayerId);
      }
      if (affinity === 'ENEMY' || affinity === 'ANY') {
        const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
        processPlayerSections(opponentPlayerState, opponentId);
      }
    } else if (type === 'LANE') {
      // Per your request, any lane-targeting card should make all lanes clickable.
      // The card's affinity will be checked during the effect resolution.
      ['lane1', 'lane2', 'lane3'].forEach(laneId => {
        targets.push({ id: laneId, owner: 'player1' }); // Player's lanes
        targets.push({ id: laneId, owner: 'player2' }); // Opponent's lanes
      });
    }
    return targets;
  }, [player1, player2, getLaneOfDrone]);


useEffect(() => {
    if (abilityMode) {
      // The player is always 'player1' when using the UI for abilities/cards
      const targets = getValidTargets('player1', abilityMode.drone, abilityMode.ability);
      setValidAbilityTargets(targets);
      setValidCardTargets([]);
      setSelectedCard(null);
    } else if (multiSelectState) { // --- NEW --- Check for multiSelectState first
      let targets = [];
      const { phase, sourceLane, selectedDrones } = multiSelectState;

      if (phase === 'select_source_lane') {
        // Target friendly lanes that have at least one drone
        ['lane1', 'lane2', 'lane3'].forEach(laneId => {
          if (player1.dronesOnBoard[laneId].length > 0) {
            targets.push({ id: laneId, owner: 'player1' });
          }
        });
      } else if (phase === 'select_drones') {
        // Target drones within the selected source lane
        player1.dronesOnBoard[sourceLane].forEach(drone => {
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
      const targets = getValidTargets('player1', null, selectedCard);
      setValidCardTargets(targets);
      setValidAbilityTargets([]);
    }
    else {
      setValidAbilityTargets([]);
      setValidCardTargets([]);
    }
  }, [abilityMode, selectedCard, getValidTargets, player1, multiSelectState]);

  const cancelAbilityMode = () => {
    if (abilityMode) {
     setAbilityMode(null);
     setSelectedDrone(null);
    }
  };

  // --- NEW --- Function to cancel card selection
  const cancelCardSelection = () => {
    setSelectedCard(null);
    setMultiSelectState(null);
  };
  
const resolveAttack = useCallback((attackDetails, isAbilityOrCard = false) => {
    const { attacker, target, targetType, interceptor, attackingPlayer, abilityDamage, goAgain, aiContext } = attackDetails;
    const finalTarget = interceptor || target;
    const finalTargetType = interceptor ? 'drone' : targetType;

    // --- REVISED LOGIC: Clearly define attacking and defending players ---
    const attackingPlayerId = attackingPlayer;
    // The defending player is the owner of the final target. Default if owner isn't set (e.g. regular attacks)
    const defendingPlayerId = finalTarget.owner || (attackingPlayerId === 'player1' ? 'player2' : 'player1');

    const attackerPlayerState = attackingPlayerId === 'player1' ? player1Ref.current : player2Ref.current;
    const defenderPlayerState = defendingPlayerId === 'player1' ? player1Ref.current : player2Ref.current;

    const attackerSections = attackingPlayerId === 'player1' ? placedSections : opponentPlacedSections;
    const defenderSections = defendingPlayerId === 'player1' ? placedSections : opponentPlacedSections;
    
    const attackerStateSetter = attackingPlayerId === 'player1' ? setPlayer1 : setPlayer2;
    const defenderStateSetter = defendingPlayerId === 'player1' ? setPlayer1 : setPlayer2;
    
    const attackerLane = getLaneOfDrone(attacker.id, attackerPlayerState);
    const effectiveAttacker = calculateEffectiveStats(attacker, attackerLane, attackerPlayerState, defenderPlayerState, attackerSections);
    
    let damage = abilityDamage ?? Math.max(0, effectiveAttacker.attack);
    const damageType = attackDetails.damageType || attacker.damageType;

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
    } else { // 'section'
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

    addLogEntry({
        player: attackingPlayerId === 'player1' ? player1Ref.current.name : player2Ref.current.name,
actionType: 'ATTACK',
        source: attacker.name,
        target: finalTarget.name,
        outcome: outcome
    }, 'resolveAttack', attackingPlayerId === 'player2' ? aiContext : null);

    if (attackingPlayerId === 'player2') {
        const report = {
            attackerName: attacker.name, lane: attackDetails.lane, targetName: finalTarget.name,
            targetType: finalTargetType, interceptorName: interceptor ? interceptor.name : null,
            shieldDamage, hullDamage, wasDestroyed, remainingShields, remainingHull, isBlocking: true
        };
        setAiActionReport(report);
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
                        Object.assign(newPlayerState, onDroneDestroyed(newPlayerState, destroyedDrone));
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
                newPlayerState.dronesOnBoard = updateAuras(newPlayerState, opponentState, defenderSections);
            }
        } else {
            newPlayerState.shipSections[finalTarget.name].hull -= hullDamage;
            newPlayerState.shipSections[finalTarget.name].allocatedShields -= shieldDamage;
            const newEffectiveStats = calculateEffectiveShipStats(newPlayerState);
            if (newPlayerState.energy > newEffectiveStats.maxEnergy) {
                newPlayerState.energy = newEffectiveStats.maxEnergy;
            }
        }
        return newPlayerState;
    });

    if (!isAbilityOrCard) {
        attackerStateSetter(prev => {
            const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));
            for (const lane in newDronesOnBoard) {
                const attackerIndex = newDronesOnBoard[lane].findIndex(d => d.id === attacker.id);
                if (attackerIndex !== -1) {
                    newDronesOnBoard[lane][attackerIndex].isExhausted = true;
                    break;
                }
            }
            return { ...prev, dronesOnBoard: newDronesOnBoard };
        });

        if (interceptor) {
            const interceptorUpdater = attackingPlayerId === 'player1' ? setPlayer2 : setPlayer1;
              interceptorUpdater(prev => {
                const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));
                for (const lane in newDronesOnBoard) {
                    const interceptorIndex = newDronesOnBoard[lane].findIndex(d => d.id === interceptor.id);
                    if (interceptorIndex !== -1) {
                        const interceptorOwnerState = defendingPlayerId === 'player1' ? player1Ref.current : player2Ref.current;
                        const interceptorOpponentState = defendingPlayerId === 'player1' ? player2Ref.current : player1Ref.current;
                        const interceptorOwnerSections = defendingPlayerId === 'player1' ? placedSections : opponentPlacedSections;
                        const effectiveStats = calculateEffectiveStats(newDronesOnBoard[lane][interceptorIndex], lane, interceptorOwnerState, interceptorOpponentState, interceptorOwnerSections);
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
}, [endTurn, updateAuras, calculateEffectiveStats, triggerExplosion, addLogEntry]);
  const resolveAbility = useCallback((ability, userDrone, targetDrone) => {
    const { effect, cost } = ability;

    // 1. Pay costs
    setPlayer1(prev => {
        let newEnergy = prev.energy;
        if (cost.energy) {
            newEnergy -= cost.energy;
        }

        const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard)); // Deep copy
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
            const baseTarget = fullDroneCollection.find(d => d.name === targetDrone.name);
            for (const lane in newDronesOnBoard) {
                const droneIndex = newDronesOnBoard[lane].findIndex(d => d.id === targetDrone.id);
                if (droneIndex !== -1) {
                    newDronesOnBoard[lane][droneIndex].hull = Math.min(baseTarget.hull, newDronesOnBoard[lane][droneIndex].hull + effect.value);
                    break;
                }
            }
            return { ...prev, dronesOnBoard: newDronesOnBoard };
        });
    } else if (effect.type === 'DAMAGE') {
        const targetLane = getLaneOfDrone(targetDrone.id, player2);
        if (targetLane) {
          resolveAttack({
            attacker: userDrone,
            target: targetDrone,
            targetType: 'drone',
            attackingPlayer: 'player1',
            abilityDamage: effect.value,
            lane: targetLane,
            damageType: effect.damageType, // Add this line
        }, true);
        }
    } else if (effect.type === 'GAIN_ENERGY') {
        setPlayer1(prev => {
            const effectiveStatsP1 = calculateEffectiveShipStats(prev);
            if (prev.energy >= effectiveStatsP1.maxEnergy) return prev; // Check against current max
            const newEnergy = Math.min(effectiveStatsP1.maxEnergy, prev.energy + effect.value);
            return {...prev, energy: newEnergy };
        });
    }

    cancelAbilityMode();
    if (!effect.goAgain) { 
        endTurn('player1');
    }
  }, [endTurn, player2, getLaneOfDrone, resolveAttack]); 

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
                const status = getShipStatus(section);
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

    // --- REFACTORED LOGIC ---
    if (effect.type === 'MODIFY_STAT' && target) {
        // Apply the effect to the correct player (friendly or enemy)
        const updater = target.owner === actingPlayerId ? actingPlayerUpdater : opponentUpdater;
        updater(prev => {
            const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));
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
            return { ...prev, dronesOnBoard: newDronesOnBoard };
        });

        // --- FIX: Pay the cost and discard the card from the acting player's hand ---
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
                const effectiveStatsP1 = calculateEffectiveShipStats(newState);
                const newEnergy = Math.min(effectiveStatsP1.maxEnergy, newState.energy + effect.value);
                newState = { ...newState, energy: newEnergy };
            }
            // REPEATING_EFFECT
            else if (effect.type === 'REPEATING_EFFECT') {
                let repeatCount = 1; // Base effect always happens once
                if (effect.condition === 'OWN_DAMAGED_SECTIONS') {
                    for (const sectionName in newState.shipSections) {
                        const section = newState.shipSections[sectionName];
                        const status = getShipStatus(section);
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
                            const effectiveStats = calculateEffectiveShipStats(newState);
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
                        const updates = onDroneDestroyed(newState, d);
                        newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                    });
                    newDronesOnBoard[laneId] = [];
                }
                else if (effect.scope === 'SINGLE' && target && target.owner === 'player1') {
                    const laneId = getLaneOfDrone(target.id, newState);
                    if (laneId) {
                        const droneToDestroy = newDronesOnBoard[laneId].find(d => d.id === target.id);
                        if(droneToDestroy) {
                            dronesWereDestroyed = true;
                            triggerExplosion(droneToDestroy.id);
                            const updates = onDroneDestroyed(newState, droneToDestroy);
                            newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
                            newDronesOnBoard[laneId] = newDronesOnBoard[laneId].filter(d => d.id !== target.id);
                        }
                    }
                }
                
                newState.dronesOnBoard = newDronesOnBoard;
                if (dronesWereDestroyed) {
                    const opponentState = actingPlayerId === 'player1' ? player2Ref.current : player1Ref.current;
                    const sections = actingPlayerId === 'player1' ? placedSections : opponentPlacedSections;
                    newState.dronesOnBoard = updateAuras(newState, opponentState, sections);
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
        const targetLane = getLaneOfDrone((target && target.id), targetPlayerState);

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
            const updates = onDroneDestroyed(newState, d);
            newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
          });
          newState.dronesOnBoard[laneId] = [];
        }
        else if (effect.scope === 'SINGLE' && target && target.owner === 'player2') {
          const laneId = getLaneOfDrone(target.id, newState);
          if (laneId) {
            const droneToDestroy = newState.dronesOnBoard[laneId].find(d => d.id === target.id);
            if (droneToDestroy) {
              dronesWereDestroyed = true;
              triggerExplosion(droneToDestroy.id);
              const updates = onDroneDestroyed(newState, droneToDestroy);
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
              triggerExplosion(d.id);
              const updates = onDroneDestroyed(newState, d);
              newState.deployedDroneCounts = { ...(newState.deployedDroneCounts || {}), ...updates.deployedDroneCounts };
            });
            newState.dronesOnBoard[laneId] = dronesToKeep;
          }
        }

        if (dronesWereDestroyed) {
          const opponentState = actingPlayerId === 'player1' ? player1Ref.current : player2Ref.current;
          const sections = actingPlayerId === 'player1' ? opponentPlacedSections : placedSections;
          newState.dronesOnBoard = updateAuras(newState, opponentState, sections);
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
}, [player1, player2, getLaneOfDrone, resolveAttack, endTurn, calculateEffectiveShipStats, triggerExplosion, updateAuras, addLogEntry]);

const resolveMultiMove = useCallback((card, dronesToMove, fromLane, toLane) => {
    const { cost, effect } = card;

    // 1. Pay costs, discard card, and move drones
    setPlayer1(prev => {
        const dronesBeingMovedIds = new Set(dronesToMove.map(d => d.id));
        const newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));

        // Create the moved drone objects. 
        // We check for the 'DO_NOT_EXHAUST' property from the card definition.
        const movedDrones = dronesToMove.map(d => ({ ...d, isExhausted: effect.properties?.includes('DO_NOT_EXHAUST') ? false : true }));

        // Remove from source lane
        newDronesOnBoard[fromLane] = newDronesOnBoard[fromLane].filter(d => !dronesBeingMovedIds.has(d.id));
        // Add to destination lane
        newDronesOnBoard[toLane] = [...newDronesOnBoard[toLane], ...movedDrones];

        let finalPlayerState = {
            ...prev,
            energy: prev.energy - cost,
            hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
            discardPile: [...prev.discardPile, card],
            dronesOnBoard: newDronesOnBoard,
        };
        
        finalPlayerState.dronesOnBoard = updateAuras(finalPlayerState, player2Ref.current, placedSections);
        return finalPlayerState;
    });
    
    addLogEntry({
        player: player1.name,
        actionType: 'MULTI_MOVE',
        source: card.name,
        target: `${dronesToMove.map(d => d.name).join(', ')}`,
        outcome: `Moved ${dronesToMove.length} drone(s) from ${fromLane} to ${toLane}.`
    }, 'resolveMultiMove');

    // 2. Reset UI state and end turn
    setMultiSelectState(null);
    cancelCardSelection();
    endTurn('player1');

}, [endTurn, updateAuras, addLogEntry, placedSections]);

 
  //--- END ABILITY/CARD LOGIC ---

 
  //--- END ABILITY/CARD LOGIC ---

const startOptionalDiscardPhase = () => {
    const p1Stats = player1EffectiveStats; // Use the memoized stats
    setOptionalDiscardCount(0);
    setTurnPhase('optionalDiscard');
    setModalContent({
        title: 'Optional Discard Phase',
        text: `You may discard up to ${p1Stats.discardLimit} cards from your hand. Click a card to discard it, then press "Finish Discarding" when you are done.`,
        isBlocking: true
    });
  };

const handleFinishOptionalDiscard = () => {
    setModalContent(null);
    drawPlayerHand();
    proceedToShieldAllocation();
  };

  const handleConfirmOptionalDiscard = (card) => {
    setPlayer1(prev => ({
        ...prev,
        hand: prev.hand.filter(c => c.instanceId !== card.instanceId),
        discardPile: [...prev.discardPile, card]
    }));
    setOptionalDiscardCount(prev => prev + 1);
    setConfirmationModal(null);
  };

  const handleOptionalDiscardClick = (card) => {
    if (optionalDiscardCount >= player1EffectiveStats.discardLimit) {
        setModalContent({
            title: "Discard Limit Reached",
            text: `You cannot discard any more cards this turn. Your limit is ${player1EffectiveStats.discardLimit}.`,
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
  // ==                         WIN CONDITION LOGIC                         ==
  // =========================================================================
  useEffect(() => {
    if (winner) return;

    // New function to check for the win conditions based on ship section status
    const checkWinCondition = (opponentPlayerState) => {
      if (!opponentPlayerState || !opponentPlayerState.shipSections) {
        return false;
      }
      
      const sectionStatuses = Object.values(opponentPlayerState.shipSections).map(
        (section) => getShipStatus(section)
      );

      // Win if two or more opponent sections are 'critical'
      const criticalCount = sectionStatuses.filter(
        (status) => status === 'critical'
      ).length;
      if (criticalCount >= 2) {
        return true;
      }

      // OR Win if all three opponent sections are at least 'damaged'
      const damagedOrWorseCount = sectionStatuses.filter(
        (status) => status === 'damaged' || status === 'critical'
      ).length;
      if (damagedOrWorseCount >= 3) {
        return true;
      }

      return false;
    };

    // Check if Player 1 has met the win condition against Player 2
    if (checkWinCondition(player2)) {
     setWinner('Player 1');
        addLogEntry({ player: 'SYSTEM', actionType: 'GAME_END', source: 'N/A', target: 'N/A', outcome: 'Player 1 wins!' }, 'winConditionEffect');
    // Check if Player 2 has met the win condition against Player 1
    } else if (checkWinCondition(player1)) {
     setWinner('Player 2');
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
    // New logic: Highlight potential interceptors as soon as an attacker is selected.
    if (turnPhase === 'action' && selectedDrone && !selectedDrone.isExhausted) {
        // 1. Find the lane of the selected attacker.
        const attackerLane = getLaneOfDrone(selectedDrone.id, player1);

        if (attackerLane) {
            // 2. Calculate the attacker's effective stats.
            const effectiveAttacker = calculateEffectiveStats(selectedDrone, attackerLane, player1, player2, placedSections);
            
            // 3. Find all opponent drones in that same lane.
            const opponentsInLane = player2.dronesOnBoard[attackerLane] || [];
            
            // 4. Filter to find valid interceptors.
            const potential = opponentsInLane.filter(opponentDrone => {
                const effectiveInterceptor = calculateEffectiveStats(opponentDrone, attackerLane, player2, player1, opponentPlacedSections);
                return !opponentDrone.isExhausted &&
                       (effectiveInterceptor.speed > effectiveAttacker.speed || effectiveInterceptor.keywords.has('ALWAYS_INTERCEPTS'));
            }).map(d => d.id);
            
            setPotentialInterceptors(potential);
        } else {
            // This case handles if the drone's lane can't be found (e.g., it was just destroyed).
            setPotentialInterceptors([]);
        }
    } else {
        // 5. If no drone is selected or it's not the action phase, clear highlights.
        setPotentialInterceptors([]);
    }
  }, [selectedDrone, turnPhase, player1, player2, getLaneOfDrone, calculateEffectiveStats, placedSections, opponentPlacedSections]);
 
  useEffect(() => {
   setHoveredTarget(null);
  }, [selectedDrone]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (selectedDrone && !abilityMode && turnPhase === 'action') {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const startPos = getElementCenter(droneRefs.current[selectedDrone.id]);
        if (startPos) {
         setArrowState({
            visible: true,
            start: startPos,
            end: { x: e.clientX - gameAreaRect.left, y: e.clientY - gameAreaRect.top }
          });
        }
      } else if (arrowState.visible) {
       setArrowState(prev => ({ ...prev, visible: false }));
      }
    };
    const gameArea = gameAreaRef.current;
   gameArea?.addEventListener('mousemove', handleMouseMove);
    return () => gameArea?.removeEventListener('mousemove', handleMouseMove);
  }, [selectedDrone, turnPhase, arrowState.visible, abilityMode]); 

  const handleOpponentTurn = useCallback(() => {
    if (passInfo.player2Passed) {
      endTurn('player2');
      return;
    }

    const effectiveStats = calculateEffectiveShipStats(player2);
    const totalDrones = Object.values(player2.dronesOnBoard).flat().length;
    const availableResources = turn === 1
      ? (player2.initialDeploymentBudget + player2.energy)
      : (player2.deploymentBudget + player2.energy);

    const deployableDrones = player2.activeDronePool.filter(drone => {
      const cost = drone.class;
      return availableResources >= cost &&
             (player2.deployedDroneCounts[drone.name] || 0) < drone.limit &&
             totalDrones < effectiveStats.cpuLimit;
    });
    
    if (deployableDrones.length === 0) {
      addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during deployment phase (no deployable drones).` }, 'aiDeploymentPass', []);
      setPassInfo(prev => {
          const wasFirstToPass = !prev.player1Passed;
          const newPassInfo = { ...prev, player2Passed: true, firstPasser: prev.firstPasser || (wasFirstToPass ? 'player2' : null) };
          if (newPassInfo.player1Passed) { endDeploymentPhase(); } else { endTurn('player2'); }
          return newPassInfo;
      });
      return;
    }
    
    // --- NEW AI LOGIC STARTS HERE ---
    
    const possibleDeployments = [];
    const lanes = ['lane1', 'lane2', 'lane3'];
    
    // 1. Get current scores for all lanes
    const currentLaneScores = {
      lane1: calculateLaneScore('lane1', player2, player1, opponentPlacedSections, placedSections, getShipStatus, calculateEffectiveStats, calculatePotentialEffectiveStats),
      lane2: calculateLaneScore('lane2', player2, player1, opponentPlacedSections, placedSections, getShipStatus, calculateEffectiveStats, calculatePotentialEffectiveStats),
      lane3: calculateLaneScore('lane3', player2, player1, opponentPlacedSections, placedSections, getShipStatus, calculateEffectiveStats, calculatePotentialEffectiveStats),
    };

    // 2. Evaluate every possible deployment
    for (const drone of deployableDrones) {
      for (const laneId of lanes) {
        
        // Simulate the deployment
        const tempAiState = JSON.parse(JSON.stringify(player2));
        const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
        tempAiState.dronesOnBoard[laneId].push({ ...baseDrone, id: 'temp' });

        const projectedScore = calculateLaneScore(laneId, tempAiState, player1, opponentPlacedSections, placedSections, getShipStatus, calculateEffectiveStats, calculatePotentialEffectiveStats);
        const impactScore = projectedScore - currentLaneScores[laneId];

        // Apply strategic bonuses
        let strategicBonus = 0;
        const currentLaneScore = currentLaneScores[laneId];
        const droneKeywords = new Set(baseDrone.abilities.filter(a => a.effect.keyword).map(a => a.effect.keyword));

        if (currentLaneScore < -15) { // Behind
          if (drone.speed >= 4) strategicBonus += 15;
          if (droneKeywords.has('ALWAYS_INTERCEPTS') || droneKeywords.has('GUARDIAN')) strategicBonus += 20;
        } else if (currentLaneScore > 15) { // Ahead
          if (drone.attack >= 4) strategicBonus += 15;
          if (baseDrone.abilities.some(a => a.effect.type === 'BONUS_DAMAGE_VS_SHIP')) strategicBonus += 20;
        } else { // Balanced
          if (drone.class <= 1) strategicBonus += 10;
        }

        // --- NEW: Lane Stabilization Bonus ---
        let stabilizationBonus = 0;
        if (currentLaneScore < 0 && projectedScore >= 0) {
          // Randomize the bonus to make the AI less predictable
          stabilizationBonus = Math.floor(Math.random() * (30 - 10 + 1));
        }

        // --- NEW: Randomized Lane Dominance Bonus ---
        let dominanceBonus = 0;
        // Reward plays that create a significant advantage from a non-dominant state
        if (projectedScore > 20 && currentLaneScore <= 20) {
          dominanceBonus = Math.floor(Math.random() * (30 - 10 + 1));
        }

        const finalScore = impactScore + strategicBonus + stabilizationBonus + dominanceBonus;

        possibleDeployments.push({
          drone,
          laneId,
          score: finalScore,
          instigator: drone.name,
          targetName: laneId,
          logic: [
            `LaneScore: ${currentLaneScore.toFixed(0)}`,
            `Projected: ${projectedScore.toFixed(0)}`,
            `Impact: ${impactScore.toFixed(0)}`,
            `Bonus: ${strategicBonus.toFixed(0)}`,
            `Stabilize: ${stabilizationBonus.toFixed(0)}`,
            `Dominance: ${dominanceBonus.toFixed(0)}` 
          ],
        });
      }
    }

    // 3. Decide whether to pass or deploy
    const topScore = possibleDeployments.length > 0 ? Math.max(...possibleDeployments.map(a => a.score)) : -1;
    
    if (topScore < 5) { // Pass if no move has a significant positive impact
      addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during deployment phase (no high-impact plays).` }, 'aiDeploymentPass', possibleDeployments);
      setPassInfo(prev => {
          const wasFirstToPass = !prev.player1Passed;
          const newPassInfo = { ...prev, player2Passed: true, firstPasser: prev.firstPasser || (wasFirstToPass ? 'player2' : null) };
          if (newPassInfo.player1Passed) { endDeploymentPhase(); } else { endTurn('player2'); }
          return newPassInfo;
      });
      return;
    }

    // 4. Select the best action
    const bestActions = possibleDeployments.filter(d => d.score === topScore);
    const chosenAction = bestActions[Math.floor(Math.random() * bestActions.length)];
    chosenAction.isChosen = true;

    const { drone: droneToDeploy, laneId: targetLane } = chosenAction;
    const droneCost = droneToDeploy.class;

    addLogEntry({ player: player2.name, actionType: 'DEPLOY', source: droneToDeploy.name, target: targetLane, outcome: `Deployed to ${targetLane}.` }, 'aiDeploymentDeploy', possibleDeployments);

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
      newPlayerState.dronesOnBoard = updateAuras(newPlayerState, player1Ref.current, opponentPlacedSections);
      return newPlayerState;
    });
    endTurn('player2');
  }, [player1, player2, passInfo, turn, endTurn, updateAuras, endDeploymentPhase, placedSections, opponentPlacedSections, addLogEntry]);

  const beginTurnProcedures = () => {
    setModalContent(null); // Close the 'Start of Turn' modal
    const p1Stats = player1EffectiveStats;
    const p2Stats = player2EffectiveStats;

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
                const effectiveStats = calculateEffectiveStats(drone, lane, player, opponent, sections);

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
      energy: player1EffectiveStats.energyPerTurn,
      initialDeploymentBudget: 0,
      deploymentBudget: player1EffectiveStats.deploymentBudget
    }));

    setPlayer2(prev => {
        const readiedState = readyDronesAndRestoreShields({
           ...prev,
           energy: player2EffectiveStats.energyPerTurn,
           initialDeploymentBudget: 0,
           deploymentBudget: player2EffectiveStats.deploymentBudget
        });

        let newDeck = [...readiedState.deck];
        let newHand = [...readiedState.hand];
        let newDiscard = [...readiedState.discardPile];
        const handSize = player2EffectiveStats.handLimit;

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
    const p2Stats = calculateEffectiveShipStats(player2);
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

    const firstPlayerIsOverLimit = totalPlayer1Drones > player1EffectiveStats.cpuLimit;
    const secondPlayerIsOverLimit = totalPlayer2Drones > player2EffectiveStats.cpuLimit;
    
    const checkOrder = firstPlayerOfRound === 'player1' ? ['player1', 'player2'] : ['player2', 'player1'];

    const resolvePlayerCompliance = (player) => {
      if (player === 'player1') {
        if (firstPlayerIsOverLimit) {
         setMandatoryAction({
            type: 'destroy',
            player: 'player1',
            count: totalPlayer1Drones - player1EffectiveStats.cpuLimit,
          });
         setShowMandatoryActionModal(true);
          return true;
        }
      } else {
        if (secondPlayerIsOverLimit) {
           setPlayer2(p2 => {
                let newP2 = {...p2};
                let dronesToDestroyCount = Object.values(p2.dronesOnBoard).flat().length - player2EffectiveStats.cpuLimit;
                for (let i = 0; i < dronesToDestroyCount; i++) {
                    const allDrones = Object.entries(newP2.dronesOnBoard).flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));
                    if (allDrones.length === 0) break;

                    const lowestClass = Math.min(...allDrones.map(d => d.class));
                    const candidates = allDrones.filter(d => d.class === lowestClass);
                    const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];
                    
                    newP2.dronesOnBoard[droneToDestroy.lane] = newP2.dronesOnBoard[droneToDestroy.lane].filter(d => d.id !== droneToDestroy.id);
                    const onDestroyUpdates = onDroneDestroyed(newP2, droneToDestroy);
                    Object.assign(newP2, onDestroyUpdates);
                }
                newP2.dronesOnBoard = updateAuras(newP2, player1Ref.current, opponentPlacedSections);
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


    // =========================================================================
    // ==                               AI ACTIONS                            ==
    // =========================================================================


const handleOpponentAction = useCallback(() => {
// If the AI has already passed, it cannot take any more actions. End the turn immediately.
    if (passInfo.player2Passed) {
      endTurn('player2');
      return;
    }

    // =========================================================================
    // ==                      STEP 1: GENERATE ALL ACTIONS                   ==
    // =========================================================================
    const possibleActions = [];
    const readyAiDrones = Object.entries(player2.dronesOnBoard).flatMap(([lane, drones]) =>
      drones.filter(d => !d.isExhausted).map(d => ({ ...d, lane }))
    );

    // --- 1a: Generate Card Play Actions ---
    const playableCards = player2.hand.filter(card => player2.energy >= card.cost);
    for (const card of playableCards) {
      if (card.targeting) {
        let targets = getValidTargets('player2', null, card);

        // Filter out invalid targets for healing cards
        if (card.effect.type === 'HEAL_SHIELDS') {
            targets = targets.filter(t => t.currentShields < t.currentMaxShields);
        }
        if (card.effect.type === 'HEAL_HULL' && card.targeting.type === 'SHIP_SECTION') {
            targets = targets.filter(t => t.hull < t.maxHull);
        }

        // --- CHANGE 1: Prevent AI from targeting itself with harmful cards ---
        // The AI is player2, so it should only target the opponent (player1).
        if (card.effect.type === 'DAMAGE' || card.effect.type === 'DESTROY') {
            targets = targets.filter(t => t.owner === 'player1');
        }
        // --- END CHANGE 1 ---

        for (const target of targets) {
          possibleActions.push({ type: 'play_card', card, target, score: 0 });
        }
      } else {
        possibleActions.push({ type: 'play_card', card, target: null, score: 0 });
      }
    }

    // --- 1b: Generate Drone Attack Actions ---
    for (const attacker of readyAiDrones) {
      const playerDronesInLane = player1.dronesOnBoard[attacker.lane];
      for (const target of playerDronesInLane) {
        possibleActions.push({ type: 'attack', attacker, target, targetType: 'drone', score: 0 });
      }
      const sectionIndex = parseInt(attacker.lane.slice(-1)) - 1;
      const sectionName = placedSections[sectionIndex];
      if (sectionName && player1.shipSections[sectionName].hull > 0) {
        const playerDronesInLaneForGuard = player1.dronesOnBoard[attacker.lane];
        const hasGuardian = playerDronesInLaneForGuard.some(drone => {
            const effectiveStats = calculateEffectiveStats(drone, attacker.lane, player1, player2, placedSections);
            return effectiveStats.keywords.has('GUARDIAN');
        });

        if (!hasGuardian) {
            const shipTarget = { id: sectionName, name: sectionName, ...player1.shipSections[sectionName] };
            possibleActions.push({ type: 'attack', attacker, target: shipTarget, targetType: 'section', score: 0 });
        }
      }
    }

    // --- 1c: Generate Drone Move Actions ---
    for (const drone of readyAiDrones) {
      const fromLaneIndex = parseInt(drone.lane.slice(-1));
      [fromLaneIndex - 1, fromLaneIndex + 1].forEach(toLaneIndex => {
        if (toLaneIndex >= 1 && toLaneIndex <= 3) {
          const toLane = `lane${toLaneIndex}`;
          possibleActions.push({ type: 'move', drone, fromLane: drone.lane, toLane, score: 0 });
        }
      });
    }


    // =========================================================================
    // ==                      STEP 2: SCORE EACH ACTION                      ==
    // =========================================================================
    possibleActions.forEach(action => {
      // NEW: Add detailed info for logging
      action.instigator = action.card?.name || action.attacker?.name;
      action.targetName = action.target?.name || action.target?.id || 'N/A';
      action.logic = [];
      
      let score = 0;
      switch (action.type) {
        // --- 2a: Scoring Card Plays ---
        case 'play_card': {
          const { card, target } = action;

          if (card.effect.type === 'DESTROY') {
            if (card.effect.scope === 'SINGLE' && target) {
              const resourceValue = (target.hull || 0) + (target.currentShields || 0);
              score = (resourceValue * 8) - (card.cost * 4);
              action.logic.push(`(Target Value: ${resourceValue} * 8) - (Card Cost: ${card.cost} * 4)`);
            }
            // --- NEW: Scoring for filtered destroy cards ---
            else if (card.effect.scope === 'FILTERED' && target && target.id.startsWith('lane')) {
              const { stat, comparison, value } = card.effect.filter;
              const dronesInLane = player1.dronesOnBoard[target.id] || [];
              let totalResourceValue = 0;
              dronesInLane.forEach(drone => {
                let meetsCondition = false;
                if (comparison === 'GTE' && drone[stat] >= value) meetsCondition = true;
                if (comparison === 'LTE' && drone[stat] <= value) meetsCondition = true;
                if (meetsCondition) {
                  totalResourceValue += (drone.hull || 0) + (drone.currentShields || 0) + (drone.class * 5);
                }
              });
              score = (totalResourceValue * 8) - (card.cost * 4);
              action.logic.push(`(Filtered Value: ${totalResourceValue} * 8) - (Card Cost: ${card.cost} * 4)`);
            }
          }
          else if (card.effect.type === 'DAMAGE' && target) {
            // --- NEW: Scoring for filtered damage cards ---
            if (card.effect.scope === 'FILTERED' && target.id.startsWith('lane') && card.effect.filter) {
                const { stat, comparison, value } = card.effect.filter;
                const dronesInLane = player1.dronesOnBoard[target.id] || [];
                let potentialDamage = 0;
                let targetsHit = 0;
                const laneId = target.id;
                dronesInLane.forEach(drone => {
                    // Use effective stats to check the condition accurately
                    const effectiveTarget = calculateEffectiveStats(drone, laneId, player1, player2, placedSections);
                    let meetsCondition = false;
                    if (comparison === 'GTE' && effectiveTarget[stat] >= value) meetsCondition = true;
                    if (comparison === 'LTE' && effectiveTarget[stat] <= value) meetsCondition = true;

                    if (meetsCondition) {
                        targetsHit++;
                        potentialDamage += card.effect.value;
                        if (card.effect.damageType === 'PIERCING') {
                            potentialDamage += (effectiveTarget.currentShields || 0);
                        }
                    }
                });
                // Better scoring that rewards multi-hits
                score = (potentialDamage * 10) + (targetsHit > 1 ? targetsHit * 15 : 0) - (card.cost * 4);
                action.logic.push(`(Filtered Damage: ${potentialDamage} * 10) + (Multi-Hit Bonus: ${targetsHit > 1 ? targetsHit * 15 : 0}) - (Card Cost: ${card.cost} * 4)`);
            } else { // Existing single-target damage logic
                score = card.effect.value * 10;
                action.logic.push(`(Damage Value: ${card.effect.value} * 10)`);
                if (card.effect.damageType === 'PIERCING') {
                    const bonus = (target.currentShields || 0) * 8;
                    score += bonus;
                    action.logic.push(`(Piercing Bonus: ${bonus})`);
                }
            }
          }
          else if (card.effect.type === 'READY_DRONE') {
            score = (target.class * 12);
            action.logic.push(`(Target Class: ${target.class} * 12)`);
          } else if (card.effect.type === 'GAIN_ENERGY') {
            score = 15;
            action.logic.push(`Base Score: 15`);
          } else if (card.effect.type === 'DRAW') {
            const energyAfterPlay = player2.energy - card.cost;
            if (energyAfterPlay > 0) {
              score = 10 + (energyAfterPlay * 2);
              action.logic.push(`(Base: 10) + (Energy Left: ${energyAfterPlay} * 2)`);
            } else {
              score = 1;
              action.logic.push(`Low Priority: 1`);
            }
          } else if (card.effect.type === 'HEAL_SHIELDS') {
            const shieldsToHeal = Math.min(card.effect.value, target.currentMaxShields - target.currentShields);
            score = shieldsToHeal * 5;
            action.logic.push(`(Shields Healed: ${shieldsToHeal} * 5)`);
          }
          else if (card.effect.type === 'HEAL_HULL' && card.targeting.type === 'SHIP_SECTION') {
            score = 80;
            action.logic.push(`High Priority Section Heal: 80`);
          }
          else if (card.effect.type === 'REPEATING_EFFECT') {
            let repeatCount = 1; // Base effect
            if (card.condition === 'OWN_DAMAGED_SECTIONS') {
              // The AI (player2) checks its own ship sections
              for (const sectionName in player2.shipSections) {
                const section = player2.shipSections[sectionName];
                const status = getShipStatus(section);
                if (status === 'damaged' || status === 'critical') {
                  repeatCount++;
                }
              }
            }
            // This card is very powerful. Give it a high base score for each effect it triggers.
            // It gives 2 benefits (draw + energy) for each repeat.
            score = (repeatCount * 25) - (card.cost * 4);
            action.logic.push(`(Repeats: ${repeatCount} * 25) - (Card Cost: ${card.cost} * 4)`);
          }
          action.score = score;
          break;
        }

        // --- 2b: Scoring Drone Attacks ---
        case 'attack': {
          const { attacker, target: attackTarget, targetType } = action;
          // --- AI UPDATE: Use effective stats for scoring ---
          const effectiveAttacker = calculateEffectiveStats(attacker, attacker.lane, player2, player1, opponentPlacedSections);
          const attackerAttack = Math.max(0, effectiveAttacker.attack); // Floor negative attack at 0 for damage
          
          if (targetType === 'drone') {
            const effectiveTarget = calculateEffectiveStats(attackTarget, attacker.lane, player1, player2, placedSections);
            score = (effectiveTarget.class * 10);
            action.logic.push(`(Target Class: ${effectiveTarget.class} * 10)`);
            if (effectiveAttacker.class < effectiveTarget.class) { 
                score += 20; 
                action.logic.push(`Favorable Trade Bonus: 20`);
            }
            if (!attackTarget.isExhausted) { 
                score += 10;
                action.logic.push(`Ready Target Bonus: 10`);
            }
            // Add bonus for piercing drone attacks
            if (attacker.damageType === 'PIERCING') {
              const bonus = effectiveTarget.currentShields * 8;
              score += bonus;
              action.logic.push(`Piercing Bonus: ${bonus}`);
            }
          } else if (targetType === 'section') {
            score = (attackerAttack * 8); // Use the calculated effective attack
            action.logic.push(`(Effective Attack: ${attackerAttack} * 8)`);
            const status = getShipStatus(attackTarget);
            if (status === 'damaged') { score += 15; action.logic.push(`Damaged Section Bonus: 15`); }
            if (status === 'critical') { score += 30; action.logic.push(`Critical Section Bonus: 30`); }
            if (attackTarget.allocatedShields === 0) {
                score += 40;
                action.logic.push(`No Shields Bonus: 40`);
            }
            else if (attackerAttack >= attackTarget.allocatedShields) {
                score += 35;
                action.logic.push(`Shield Break Bonus: 35`);
            }
            if (attackerAttack >= 3) {
                score += 10;
                action.logic.push(`High Attack Bonus: 10`);
            }
            // Add bonus for piercing attacks on ship sections ---
            if (attacker.damageType === 'PIERCING') {
              const bonus = attackTarget.allocatedShields * 10;
              score += bonus;
              action.logic.push(`Piercing Bonus: ${bonus}`);
            }
          }
          action.score = score;
          break;
        }

        // --- 2c: Scoring Drone Moves ---
        case 'move': {
          const { drone, fromLane } = action;
          const aiShipSectionInLane = opponentPlacedSections[parseInt(fromLane.slice(-1)) - 1];
          const isSectionDestroyed = player2.shipSections[aiShipSectionInLane].hull <= 0;
          if (isSectionDestroyed) {
            score = 5;
            action.logic.push(`Escape Destroyed Lane: 5`);
          } else {
            const playerDronesInLane = player1.dronesOnBoard[fromLane];
            const isFasterThanAllEnemies = playerDronesInLane.every(enemy => drone.speed > enemy.speed);
            if (!isFasterThanAllEnemies) { 
                score = 5; 
                action.logic.push(`Reposition from Disadvantage: 5`);
            }
          }
          action.score = score;
          break;
        }
        default:
          break;
      }
    });

    // =========================================================================
    // ==               STEP 3 & 4: SELECT AND EXECUTE ACTION                 ==
    // =========================================================================
    const topScore = possibleActions.length > 0 ? Math.max(...possibleActions.map(a => a.score)) : 0;

    if (topScore <= 0) {
          addLogEntry({ player: player2.name, actionType: 'PASS', source: 'N/A', target: 'N/A', outcome: `Passed during action phase.` }, 'aiActionPass', possibleActions); // Modified Line

      setPassInfo(prev => {
        const wasFirstToPass = !prev.player1Passed;
        const newPassInfo = { ...prev, player2Passed: true, firstPasser: prev.firstPasser || (wasFirstToPass ? 'player2' : null) };
        if (newPassInfo.player1Passed) { endActionPhase(); }
        else { endTurn('player2'); }
        return newPassInfo;
      });
      return;
    }

    const actionPool = possibleActions.filter(action => action.score >= topScore - 20);
    const chosenAction = actionPool[Math.floor(Math.random() * actionPool.length)];

    // NEW: Mark the chosen action for the log
    chosenAction.isChosen = true;

    switch (chosenAction.type) {
      case 'play_card':
        resolveCardPlay(chosenAction.card, chosenAction.target, 'player2', possibleActions); // Pass context
        break;
      case 'attack':
        setPendingAttack({
          attacker: chosenAction.attacker,
          target: chosenAction.target,
          targetType: chosenAction.targetType,
          lane: chosenAction.attacker.lane,
          attackingPlayer: 'player2',
          aiContext: possibleActions, // Add context here
        });
        break;
      case 'move':
        const { drone, fromLane, toLane } = chosenAction;

            addLogEntry({ player: player2.name, actionType: 'MOVE', source: drone.name, target: toLane, outcome: `Moved from ${fromLane} to ${toLane}.` }, 'aiActionMove', possibleActions); // Modified Line

        setPlayer2(prev => {
          let newDronesOnBoard = JSON.parse(JSON.stringify(prev.dronesOnBoard));
          newDronesOnBoard[fromLane] = newDronesOnBoard[fromLane].filter(d => d.id !== drone.id);
          const movedDrone = { ...drone, isExhausted: true };
          newDronesOnBoard[toLane] = [...newDronesOnBoard[toLane], movedDrone];
          let newPlayerState = { ...prev, dronesOnBoard: newDronesOnBoard };
          newPlayerState.dronesOnBoard = updateAuras(newPlayerState, player1Ref.current, opponentPlacedSections);
          return newPlayerState;
        });
        endTurn('player2');
        break;
      default:
        endTurn('player2');
        break;
    }
}, [player1, player2, passInfo, placedSections, endActionPhase, endTurn, calculateEffectiveStats, getValidTargets, resolveCardPlay, updateAuras]);

    // =========================================================================
    // ==                           END AI ACTIONS                            ==
    // =========================================================================

    useEffect(() => {
    // We add !aiCardPlayReport here to pause the AI while its card play is being shown.
    const isAiTurn = currentPlayer === 'player2' && (!modalContent || !modalContent.isBlocking) && !winner && !aiActionReport && !aiCardPlayReport && !pendingAttack && !playerInterceptionChoice && !mandatoryAction && !showFirstPlayerModal && !showActionPhaseStartModal && !showRoundEndModal;
    if (!isAiTurn) return;

    // --- CHANGE 1: Define a variable to hold the timer ID ---
    let aiTurnTimer;

    if (turnPhase === 'deployment' && !passInfo.player2Passed) {
      // --- CHANGE 2: Assign the timeout to the variable ---
      aiTurnTimer = setTimeout(handleOpponentTurn, 1500);
    } else if (turnPhase === 'action' && !passInfo.player2Passed) {
      // --- CHANGE 3: Assign the timeout to the variable ---
      aiTurnTimer = setTimeout(handleOpponentAction, 1500);
    }
  
    // --- CHANGE 4: Add the cleanup function ---
    // This function will automatically run before the effect runs again,
    // clearing any previously scheduled AI turn.
    return () => {
      clearTimeout(aiTurnTimer);
    };
  }, [currentPlayer, turnPhase, passInfo, winner, handleOpponentTurn, handleOpponentAction, aiActionReport, aiCardPlayReport, pendingAttack, playerInterceptionChoice, mandatoryAction, modalContent, showFirstPlayerModal, showActionPhaseStartModal, showRoundEndModal]);

  const handleReset = () => {
   setTurnPhase('preGame');
   setTurn(1);
   setPlacedSections([]);
   setOpponentPlacedSections([]);
   setPlayer1(initialPlayerState('Player 1'));
   setPlayer2(initialPlayerState('Player 2'));
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
        ...initialPlayerState(selectedAI.name, selectedAI.decklist), // Use AI's name and decklist
        activeDronePool: aiDrones,
        deployedDroneCounts: aiInitialCounts,
      };
    });

    // 2. Standard game start procedure
    setTurnPhase('placement');
    // Randomly place the opponent's ship sections
    const sections = Object.keys(player2.shipSections);
    const shuffledSections = sections.sort(() => 0.5 - Math.random());
    setOpponentPlacedSections(shuffledSections);
    
    // 3. Set the initial modal message for the player
    setModalContent({
        title: 'Phase 1: Place Your Ship Sections',
        text: 'To begin, select a lane below to place your first ship section, the Bridge. The sections must be placed in a specific order: Bridge, then Power Cell, then Drone Control Hub.',
        isBlocking: true
    });
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
      const effectiveStats = calculateEffectiveShipStats(prev);
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
    const shieldsPerTurn = player1EffectiveStats.shieldsPerTurn;
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
     setTurnPhase('droneSelection');
     setModalContent({
            title: 'Phase 3: Choose Your Drones',
            text: 'Select 5 drones from your full collection to add to your Active Drone Pool. These are the drones you can launch during the game. Once you have made your selection, click "Confirm Selection".',
            isBlocking: true
        });
      const initialPool = [...fullDroneCollection].sort(() => 0.5 - Math.random());
      const firstPair = initialPool.slice(0, 2);
      const remaining = initialPool.slice(2);
      
     setDroneSelectionPair(firstPair);
     setDroneSelectionPool(remaining);
     setTempSelectedDrones([]);
    }
  };

  const handleAllocateShield = (sectionName) => {
    const section = player1.shipSections[sectionName];
    if (shieldsToAllocate > 0 && section.allocatedShields < section.shields) {
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
   setShieldsToAllocate(player1EffectiveStats.shieldsPerTurn);
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
    const initialCounts = {};
   selectedDrones.forEach(drone => {
     initialCounts[drone.name] = 0;
    });
    setPlayer1(prev => ({ ...prev, activeDronePool: selectedDrones, deployedDroneCounts: initialCounts }));

    setPlayer2(prev => {
      let newDeck = [...prev.deck];
      let newHand = [];
      const handSize = calculateEffectiveShipStats(prev).handLimit;

      for (let i = 0; i < handSize; i++) {
        if (newDeck.length > 0) {
          newHand.push(newDeck.pop());
        } else {
            break;
        }
      }
      return { ...prev, deck: newDeck, hand: newHand };
    });

    // --- MODIFIED: Automatically draw and show a new modal ---
    drawPlayerHand();
    setTurnPhase('initialDraw');
    
    const proceed = () => {
        setModalContent(null);
        proceedToFirstTurn();
        isBlocking: true
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
        const effectiveStats = calculateEffectiveStats(selectedDrone, lane, tempPlayerState);

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

        finalPlayerState.dronesOnBoard = updateAuras(finalPlayerState, player2Ref.current, placedSections);

        return finalPlayerState;
    });
   setSelectedDrone(null);
   endTurn('player1');
  };

  const handleDeployDrone = (lane) => {
    if (!selectedDrone || currentPlayer !== 'player1' || passInfo.player1Passed) return;

    if (totalPlayer1Drones >= player1EffectiveStats.cpuLimit) {
     setModalContent({ title: "CPU Limit Reached", text: "You cannot deploy more drones than your CPU Control Value.", isBlocking: true });
      return;
    }

    if ((player1.deployedDroneCounts[selectedDrone.name] || 0) >= selectedDrone.limit) {
     setModalContent({ title: "Deployment Limit Reached", text: `You have already deployed the maximum number of ${selectedDrone.name} drones.`, isBlocking: true });
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
    
    // Get effective stats for the attacker regardless of who is attacking
    const attackerPlayer = attackingPlayer === 'player1' ? player1Ref.current : player2Ref.current;
    const attackerOpponent = attackingPlayer === 'player1' ? player2Ref.current : player1Ref.current;
    const attackerSections = attackingPlayer === 'player1' ? placedSections : opponentPlacedSections;
    const effectiveAttacker = calculateEffectiveStats(attacker, lane, attackerPlayer, attackerOpponent, attackerSections);

    if (attackingPlayer === 'player1') {
      const potentialInterceptors = player2Ref.current.dronesOnBoard[lane]
        .filter(d => {
            const effectiveInterceptor = calculateEffectiveStats(d, lane, player2Ref.current, player1Ref.current, opponentPlacedSections);
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
            const effectiveInterceptor = calculateEffectiveStats(d, lane, player1Ref.current, player2Ref.current, placedSections);
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
  // --- CHANGE: The dependency array is now much smaller to prevent the loop ---
  }, [pendingAttack, resolveAttack, calculateEffectiveStats]);

  // --- MODIFIED --- to handle targeting for cards
  const handleTargetClick = (target, targetType, isPlayer) => {
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
                    const effectiveStats = calculateEffectiveStats(drone, targetLane, player2);
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

    if (abilityMode && abilityMode.drone.id === drone.id) {
       cancelAbilityMode();
    } else {
       setAbilityMode({ drone, ability });
       setSelectedDrone(drone);
       cancelCardSelection();
    }
  };

  const handleTokenClick = (e, token, isPlayer) => {
      // --- NEW --- Handle multi-select drone selection
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

    // --- NEW --- Handle multi-select clicks
    if (multiSelectState && isPlayer && validCardTargets.some(t => t.id === lane)) {
        const { phase, sourceLane, selectedDrones } = multiSelectState;
        
        if (phase === 'select_source_lane') {
            setMultiSelectState(prev => ({
                ...prev,
                phase: 'select_drones',
                sourceLane: lane
            }));
            return;
        }

        if (phase === 'select_destination_lane') {
            // This is the final step, resolve the card effect
            resolveMultiMove(multiSelectState.card, selectedDrones, sourceLane, lane);
            return;
        }
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
      // Potentially show a "not enough energy" message
      return;
    }

    // --- NEW --- Handle multi-move cards
    if (card.effect.type === 'MULTI_MOVE') {
      // If we are already in this card's multi-select mode, cancel it
      if (multiSelectState && multiSelectState.card.instanceId === card.instanceId) {
        cancelCardSelection();
      } else {
        // Start the multi-select process
        setMultiSelectState({
          card: card,
          phase: 'select_source_lane',
          sourceLane: null,
          selectedDrones: [],
          maxSelection: card.effect.count,
        });
        // Clear other interaction states while keeping the card visually selected
        setSelectedCard(card); 
        setSelectedDrone(null);
        setAbilityMode(null);
      }
      return; // Stop further execution for this card type
    }


    if (selectedCard?.instanceId === card.instanceId) {
      cancelCardSelection();
    } else {
 if (!card.targeting) {
        setCardConfirmation({ card, target: null });
        setSelectedCard(null);
        setAbilityMode(null);
        setSelectedDrone(null);
      } else {
        setSelectedCard(card);
        // Clear other selections
        setSelectedDrone(null);
        setAbilityMode(null);
    }
  }
  };

  const executeMove = () => {
    if (!moveConfirmation) return;
    const { drone, from, to } = moveConfirmation;

    addLogEntry({ player: player1.name, actionType: 'MOVE', source: drone.name, target: to, outcome: `Moved from ${from} to ${to}.` }, 'playerMove');

   setPlayer1(prev => {
        let newDronesOnBoard = { ...prev.dronesOnBoard };
       newDronesOnBoard[from] = newDronesOnBoard[from].filter(d => d.id !== drone.id);
        const movedDrone = { ...drone, isExhausted: true };
       newDronesOnBoard[to] = [...newDronesOnBoard[to], movedDrone];
        
        let newPlayerState = { ...prev, dronesOnBoard: newDronesOnBoard };
        newPlayerState.dronesOnBoard = updateAuras(newPlayerState, player2Ref.current, placedSections);
        return newPlayerState;
    });

   setMoveConfirmation(null);
   setSelectedDrone(null);
    
   endTurn('player1');
  };
  
  const handleConfirmMandatoryDiscard = (card) => {
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
        const lane = getLaneOfDrone(drone.id, newPlayerState);
        if (lane) {
            newPlayerState.dronesOnBoard[lane] = newPlayerState.dronesOnBoard[lane].filter(d => d.id !== drone.id);
            const onDestroyUpdates = onDroneDestroyed(newPlayerState, drone);
            Object.assign(newPlayerState, onDestroyUpdates);
            newPlayerState.dronesOnBoard = updateAuras(newPlayerState, player2Ref.current, placedSections);
        }
        return newPlayerState;
    });

   setMandatoryAction(prev => {
        const newCount = prev.count - 1;
        if (newCount <= 0) {
            const p2IsOver = totalPlayer2Drones > player2EffectiveStats.cpuLimit;
            if (p2IsOver) {
               setPlayer2(p2 => {
                    let newP2 = {...p2};
                    let dronesToDestroyCount = Object.values(p2.dronesOnBoard).flat().length - calculateEffectiveShipStats(p2).cpuLimit;
                    for (let i = 0; i < dronesToDestroyCount; i++) {
                        const allDrones = Object.entries(newP2.dronesOnBoard).flatMap(([lane, drones]) => drones.map(d => ({...d, lane})));
                        if (allDrones.length === 0) break;

                        const lowestClass = Math.min(...allDrones.map(d => d.class));
                        const candidates = allDrones.filter(d => d.class === lowestClass);
                        const droneToDestroy = candidates[Math.floor(Math.random() * candidates.length)];
                        
                        newP2.dronesOnBoard[droneToDestroy.lane] = newP2.dronesOnBoard[droneToDestroy.lane].filter(d => d.id !== droneToDestroy.id);
                        const onDestroyUpdates = onDroneDestroyed(newP2, droneToDestroy);
                        Object.assign(newP2, onDestroyUpdates);
                    }
                    newP2.dronesOnBoard = updateAuras(newP2, player1Ref.current, opponentPlacedSections);
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
  
      const headers = ['Round', 'Player', 'Action', 'Source', 'Target', 'Outcome', 'DebugSource'];
      
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
    return Object.values(player1.shipSections).some(section => section.allocatedShields < section.shields);
  }, [player1.shipSections]);

  const getFirstPlayerReasonText = () => {
    if (turn === 1) {
      return "The first player is determined randomly for the first round.";
    }
    const passerName = firstPasserOfPreviousRound === 'player1' ? player1.name : player2.name;
    return `${passerName} passed first in the previous round, securing the initiative.`;
  };

  // --- UI COMPONENTS ---
  const TargetingArrow = ({ visible, start, end }) => {
    if (!visible) return null;
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-40">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
          refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ff0055" />
          </marker>
        </defs>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#ff0055" strokeWidth="4" markerEnd="url(#arrowhead)" strokeDasharray="10, 5" />
      </svg>
    );
  };

  const Explosion = ({ top, left }) => (
    <div className="explosion" style={{ top: `${top}px`, left: `${left}px` }}></div>
  );

    const DroneToken = ({ drone, onClick, isPlayer, isSelected, isSelectedForMove, isHit, isPotentialInterceptor, onMouseEnter, onMouseLeave, effectiveStats, onAbilityClick, isActionTarget }) => { // MODIFIED PROP
    const borderColor = isPlayer ? 'border-cyan-400' : 'border-pink-500';
    const exhaustEffect = drone.isExhausted ? 'grayscale opacity-60' : '';
    const selectedEffect = isSelected ? 'ring-4 ring-cyan-400 scale-110' : '';
    const hitEffect = isHit ? 'animate-shake' : '';
    const interceptorEffect = isPotentialInterceptor ? 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50' : '';
    const selectedForMoveEffect = isSelectedForMove ? 'ring-4 ring-green-400 scale-110' : ''; // New visual effect
    const actionTargetEffect = isActionTarget ? 'ring-4 ring-purple-400 shadow-lg shadow-purple-400/50 animate-pulse' : ''; // MODIFIED
    const mandatoryDestroyEffect = mandatoryAction?.type === 'destroy' && isPlayer ? 'ring-4 ring-red-500 animate-pulse' : '';
    const baseDrone = useMemo(() => fullDroneCollection.find(d => d.name === drone.name), [drone.name]);
    const maxHull = baseDrone ? baseDrone.hull : 1;
    const { maxShields, keywords } = effectiveStats;
    const currentShields = drone.currentShields ?? maxShields;
    const activeAbilities = baseDrone.abilities.filter(a => a.type === 'ACTIVE');
    
    const isAbilityUsable = (ability) => {
        if (drone.isExhausted && ability.cost.exhausts !== false) return false;
        if (ability.cost.energy && player1.energy < ability.cost.energy) return false;
        return true;
    };
    
    return (
      <div
        ref={el => droneRefs.current[drone.id] = el}
        onClick={(e) => onClick && onClick(e, drone, isPlayer)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`relative w-24 bg-gray-900/80 rounded-lg flex flex-col p-2 shadow-lg border-2 ${borderColor} cursor-pointer transition-transform duration-200 hover:scale-110 ${exhaustEffect} ${selectedEffect} ${hitEffect} ${interceptorEffect} ${selectedForMoveEffect} ${actionTargetEffect} ${mandatoryDestroyEffect} shadow-black`}
      >
        <div className="flex justify-between items-center w-full text-base font-bold">
          <span className={`flex items-center gap-1 bg-slate-800/70 px-2 py-0.5 rounded-full
            ${effectiveStats.attack > effectiveStats.baseAttack ? 'text-green-400' : ''}
            ${effectiveStats.attack < effectiveStats.baseAttack ? 'text-red-400' : ''}
            ${effectiveStats.attack === effectiveStats.baseAttack ? 'text-white' : ''}
          `}>
            <Sword size={12} /> {effectiveStats.attack}
          </span>
          <span className={`flex items-center gap-1 bg-slate-800/70 px-2 py-0.5 rounded-full
            ${effectiveStats.speed > effectiveStats.baseSpeed ? 'text-green-400' : ''}
            ${effectiveStats.speed < effectiveStats.baseSpeed ? 'text-red-400' : ''}
            ${effectiveStats.speed === effectiveStats.baseSpeed ? 'text-white' : ''}
          `}>
            <Rocket size={12} /> {effectiveStats.speed}
          </span>
        </div>
        <div className="flex flex-col items-center my-1 relative">
          <img src={drone.image} alt={drone.name} className="w-14 h-14 rounded-md object-cover border-2 border-black/50" />
            {isPlayer && activeAbilities.length > 0 && (
                <div className="absolute -bottom-2 -right-2 flex flex-col gap-1">
                {activeAbilities.map((ability, index) => (
                    <button key={index} onClick={(e) => onAbilityClick && onAbilityClick(e, drone, ability)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-black
                            ${isAbilityUsable(ability) ? 'bg-purple-600 text-yellow-300 hover:bg-purple-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                        `}
                        title={ability.name}
                    >
                        <Zap size={14} />
                    </button>
                 ))}
                </div>
            )}
        </div>
        <div className="w-full flex flex-col gap-1.5 mt-auto">
              <div className="flex w-full justify-center gap-1.5 min-h-[12px]">
                  {maxShields > 0 && Array.from({ length: maxShields }).map((_, i) => (
                      <div key={`shield-${i}`}>
                          {i < currentShields ? <ShieldCheck size={12} className="text-cyan-300" /> : <Shield size={12} className="text-gray-600" />}
                      </div>
                   ))}
              </div>
              <div className="flex w-full justify-center gap-1">
                  {Array.from({ length: maxHull }).map((_, i) => (
                      <div key={`hull-${i}`} className={`h-3 w-3 rounded-sm ${i < drone.hull ? 'bg-green-500' : 'bg-red-500'}`}></div>
                   ))}
              </div>
        </div>
      </div>
    );
  };

  const renderDronesOnBoard = (drones, isPlayer, lane) => {
    return (
      <div className="flex flex-wrap gap-2 p-1 min-h-[100px] justify-center items-center">
       {drones.map((drone) => {
            const player = isPlayer ? player1 : player2;
            const opponent = isPlayer ? player2 : player1;
            const sections = isPlayer ? placedSections : opponentPlacedSections;
            const effectiveStats = calculateEffectiveStats(drone, lane, player, opponent, sections);
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
           <DroneToken drone={attacker} isPlayer={false} effectiveStats={calculateEffectiveStats(attacker, lane, player2, player1, opponentPlacedSections)}/>
          </div>
          <div className="text-4xl font-bold text-gray-500">VS</div>
          <div className="flex flex-col items-center">
            <h4 className="text-lg font-bold text-cyan-400 mb-2">Target</h4>
           {targetType === 'drone' ? (
             <DroneToken drone={target} isPlayer={true} effectiveStats={calculateEffectiveStats(target, lane, player1, player2, placedSections)} />

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
        <div className="flex flex-wrap justify-center gap-4 my-4">
         {interceptors.map(drone => (
           <DroneToken
             key={drone.id}
             drone={drone}
             isPlayer={true}
             onClick={() => onIntercept(drone)}
               effectiveStats={calculateEffectiveStats(drone, lane, player1, player2, placedSections)}
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

  const DroneCard = ({ drone, onClick, isSelectable, isSelected, deployedCount, ignoreDeployLimit = false }) => {
    const atLimit = deployedCount >= drone.limit;
    const isInteractive = isSelectable && (!atLimit || ignoreDeployLimit);
    const deploymentCost = drone.class;
    
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
      `}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
      >
        <div
          className={`
            w-full h-full bg-black flex flex-col font-orbitron text-cyan-300 overflow-hidden
           transition-all duration-200
            ${isInteractive && !isSelected ? 'group-hover:bg-gray-900' : ''}
          `}
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
        >
          <div className="absolute inset-0 bg-grid-cyan opacity-10"></div>
          
          <div className="text-center py-1 px-3 bg-cyan-900/50 flex-shrink-0 h-8 flex items-center justify-center">
           <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap" />
          </div>

          <div className="p-1 flex-shrink-0 h-14">
            <div className="relative h-full" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
              <img src={image} alt={name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-cyan-400/50"></div>
           </div>
          </div>

            <div className="flex flex-col gap-1 px-2 flex-shrink-0 h-[50px] mt-2">
              <div className="flex justify-between gap-2 text-xs">
               <div className="flex items-center justify-center gap-1 bg-cyan-900/50 p-1 rounded w-1/2"><Sword size={12} /> {attack}</div>
               <div className="flex items-center justify-center gap-1 bg-cyan-900/50 p-1 rounded w-1/2"><Rocket size={12} /> {speed}</div>
              </div>
              <div className="flex flex-col items-center gap-1">
               <div className="flex w-full justify-center gap-1.5 min-h-[12px]">
                   {shields > 0 && Array.from({ length: shields }).map((_, i) => (
                     <ShieldCheck key={`shield-${i}`} size={12} className="text-cyan-300" />
                   ))}
               </div>
               <div className="flex w-full justify-center gap-1">
                   {Array.from({ length: hull }).map((_, i) => (
                     <div key={`hull-${i}`} className="h-2 w-2 rounded-sm bg-green-500 border border-green-300/50"></div>
                   ))}
               </div>
              </div>
            </div>

        <div className="flex-grow mx-2 mt-1 bg-black/50 border border-cyan-800/70 p-2 flex flex-col min-h-0 space-y-2 overflow-y-auto">
            {abilities && abilities.length > 0 ? (
                abilities.map((ability, index) => (
                    <div key={index}>
                      <h4 className="text-xs text-purple-400 tracking-wider font-bold">{ability.name}</h4>
                      <p className="text-gray-400 text-xs leading-tight font-exo">{ability.description}</p>
                    </div>
                ))
            ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-cyan-700 italic opacity-70">[ No Signal ]</p>
                </div>
            )}
          </div>

            <div className="flex items-center justify-between p-1 border-t border-cyan-800/70 flex-shrink-0 h-12">
              <div className="flex flex-col items-center">
               <span className="text-[10px] text-gray-400">Cost</span>
                <div className="flex items-center">
                    <Bolt size={14} className="text-yellow-300"/>
                    <span className="text-white font-bold text-base ml-1">{deploymentCost}</span>
               </div>
              </div>
              <div className="flex flex-col items-center">
               <span className="text-[10px] text-gray-400">Deployed</span>
                <div className="flex items-center">
                    <span className={`font-bold text-base ml-1 ${atLimit ? 'text-pink-500' : 'text-white'}`}>
                        {deployedCount}/{drone.limit}
                    </span>
               </div>
              </div>
            </div>
        </div>
      </div>
    );
  };


const ShipSection = ({ section, stats, isPlayer, isPlaceholder, onClick, isInteractive, isOpponent, isHovered, onMouseEnter, onMouseLeave, isCardTarget }) => {
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
    
    const status = getShipStatus(stats);
    const effectiveStats = stats.stats[status];
    
    // The background color is now used for the overlay, giving a nice tint based on damage
    const overlayColor = status === 'critical' ? 'bg-red-900/60' : status === 'damaged' ? 'bg-yellow-900/50' : 'bg-black/60';
    const borderColor = status === 'critical' ? 'border-red-500' : status === 'damaged' ? 'border-yellow-500' : (isOpponent ? 'border-pink-500' : 'border-cyan-500');
    const shadowColor = isOpponent ? 'shadow-pink-500/20' : 'shadow-cyan-500/20';
    const hoverEffect = isHovered ? 'scale-105 shadow-xl' : 'hover:scale-105';

    const cardTargetEffect = isCardTarget ? 'ring-4 ring-purple-400 shadow-lg shadow-purple-400/50 animate-pulse' : '';
    const sectionName = section === 'droneControlHub' ? 'Drone Control Hub' : section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    // This creates the style needed to apply the background image
    const backgroundImageStyle = {
      backgroundImage: `url(${stats.image})`,
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover', // Ensures the image fills the component area
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
        style={backgroundImageStyle} // The background image is applied here
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* An overlay is added to ensure the text on top is easy to read */}
        <div className={`absolute inset-0 ${overlayColor}`}></div>
        
        {/* A new wrapper to place all the content on top of the image and overlay */}
        <div className="relative z-10 flex flex-col items-center justify-between p-4 h-full">
          <div className={`absolute top-2 right-2 flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${status === 'healthy' ? 'bg-green-500/20 text-green-300' : status === 'damaged' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-bold text-lg text-white">{sectionName}</p>
            <p className="text-xs text-gray-400 italic max-w-[200px]">{stats.description}</p>
          </div>
          {effectiveStats && (
            <div className="flex flex-col items-start w-full mt-2 text-sm text-gray-300">
              {Object.entries(effectiveStats).map(([key, value]) => (
                <span key={key} className="flex items-center"><span className="font-bold mr-1">{key}:</span> {value}</span>
              ))}
            </div>
          )}
          <div className="flex flex-col items-center w-full mt-2">
            <div className="flex gap-1 items-center mb-2">
              {Array(stats.shields).fill(0).map((_, i) => (
                <div key={i}>
                  {i < stats.allocatedShields ? <ShieldCheck size={16} className="text-cyan-300" /> : <Shield size={16} className="text-gray-600" />}
                </div>
              ))}
            </div>
            <div className="flex w-full justify-center gap-1">
              {Array.from({ length: stats.maxHull }).map((_, i) => (
                <div key={i} className={`h-3 w-3 rounded-sm ${i < stats.hull ? 'bg-green-500' : 'bg-red-500'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ShipSectionsDisplay = ({ player, isPlayer, placedSections, onSectionClick, isInteractive, onTargetClick, selectedCard, validCardTargets }) => {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-row gap-4 w-full">
            {Array.from({ length: 3 }).map((_, index) => {
                const sectionName = placedSections[index];
                const laneName = `lane${index + 1}`;
                const isHovered = hoveredTarget && hoveredTarget.type === 'section' && hoveredTarget.target.name === sectionName;
                const isCardTarget = !!selectedCard && validCardTargets.some(t => t.id === sectionName);
                   return (
                    <div key={index} className="flex-1">
                        {sectionName ? (
                            <ShipSection
                                section={sectionName}
                                stats={player.shipSections[sectionName]}
                                isPlayer={isPlayer}
                                isInteractive={isInteractive}
                                isCardTarget={isCardTarget} 
                                onClick={() => {

                                    // Create the data object for the clicked section
                                    const targetData = { 
                                        id: sectionName, // This adds the required ID for target validation
                                        name: sectionName,
                                        owner: isPlayer ? 'player1' : 'player2'
                                    };

                                    // First, check if the click is meant for a selected card
                                    if (isCardTarget) {
                                        onTargetClick(targetData, 'section', isPlayer);
                                        return; // Stop here to prevent other actions
                                    }

                                    // If not a card target, perform the original actions
                                    if (isPlayer && isInteractive) {
                                        onSectionClick(sectionName); // Handle shield allocation
                                    } else if (!isPlayer) {
                                        onTargetClick(targetData, 'section', isPlayer); // Handle attacks on the opponent
                                    }
                                }}
                                isOpponent={!isPlayer} // Corrected prop name
                                isHovered={isHovered}
                                onMouseEnter={() => !isPlayer && setHoveredTarget({ target: {name: sectionName}, type: 'section', lane: laneName })}
                                onMouseLeave={() => !isPlayer && setHoveredTarget(null)}
                            />
                        ) : <div className="min-h-[220px]"></div>}
                    </div>
                );
            })}
        </div>
      </div>
    );
  };

  const DroneLanesDisplay = ({ player, isPlayer, placedSections, onLaneClick, selectedDrone, selectedCard, validCardTargets }) => {
      const isDeployable = (laneIndex) => {
          if (turnPhase !== 'deployment' || !isPlayer || !selectedDrone || !placedSections[laneIndex]) return false;
          if (turn === 1) return (player.initialDeploymentBudget + player.energy) >= selectedDrone.class;
          return player.energy >= selectedDrone.class;
      };

      const isMoveTarget = (lane) => {
          if (turnPhase !== 'action' || !selectedDrone) return false;
          const [sourceLaneName] = Object.entries(player1.dronesOnBoard).find(([_, drones]) => drones.some(d => d.id === selectedDrone.id)) || [];
          if (!sourceLaneName) return false;
          
          const sourceLaneIndex = parseInt(sourceLaneName.replace('lane', ''), 10);
          const targetLaneIndex = parseInt(lane.replace('lane', ''), 10);
          return Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
      };

      return (
            <div className="flex justify-center w-full">
                <div className="flex flex-row gap-4 w-full">
                    {['lane1', 'lane2', 'lane3'].map((lane, index) => {
                        const owner = isPlayer ? 'player1' : 'player2';
                        const isCardTarget = validCardTargets.some(t => t.id === lane && t.owner === owner);

                        return (
                            <div key={lane}
                                className={`lane-background flex-1 min-h-[140px] h-auto rounded-lg border-2 p-2 transition-all duration-200
                                 ${isPlayer ? 'bg-black/30 border-cyan-500/50' : 'bg-black/30 border-pink-500/50'}
                                 ${isDeployable(index) ? 'cursor-pointer hover:bg-cyan-900/50 hover:border-cyan-400' : ''}
                                 ${isPlayer && isMoveTarget(lane) ? 'cursor-pointer bg-yellow-900/50 border-yellow-400' : ''}
                                 ${isCardTarget ? 'cursor-pointer bg-purple-900/50 border-purple-400 ring-2 ring-purple-400 animate-pulse' : ''}
                               `}
                                onClick={(e) => onLaneClick(e, lane, isPlayer)} // MODIFIED LINE
                            >
                               {renderDronesOnBoard(player.dronesOnBoard[lane], isPlayer, lane)}
                                 <p className={`text-center text-sm mt-2 ${isPlayer ? 'text-cyan-300' : 'text-pink-300'}`}>
                                     {isPlayer ? `Lane ${index + 1}` : `Opponent Lane ${index + 1}`}
                                 </p>
                            </div>
                        );
                    })}
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
    w-52 h-72 rounded-lg p-1 relative group transition-all duration-200
          ${isPlayable ? 'cursor-pointer' : 'cursor-not-allowed'}
          ${isSelected ? 'bg-purple-400' : 'bg-purple-800/80'}
          ${!isPlayable && !isMandatoryTarget ? 'opacity-50 grayscale' : ''}
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
  
  return (
    <div className="h-screen bg-gray-950 text-white font-sans overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-indigo-950 to-black relative" ref={gameAreaRef} onClick={() => { cancelAbilityMode(); cancelCardSelection(); }}>
      <style>
        {`
            @import url('https://fonts.googleapis.com/css2?family=Exo:wght@400;700&family=Orbitron:wght@400;700;900&display=swap');
           .font-orbitron { font-family: 'Orbitron', sans-serif; }
            .font-exo { font-family: 'Exo', sans-serif; }
            
            @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
           .animate-shake { animation: shake 0.5s ease-in-out; }
            .explosion { position: absolute; width: 100px; height: 100px; background-image: radial-gradient(circle, rgba(255,159,64,1) 0%, rgba(255,87,34,0.8) 40%, rgba(255,255,255,0) 70%); border-radius: 50%; transform: translate(-50%, -50%) scale(0); animation: explode 1s ease-out forwards; pointer-events: none; z-index: 50; }
            @keyframes explode { 0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
           .bg-grid-cyan { background-image: linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px); background-size: 20px 20px; }
            `}
        </style>
     <TargetingArrow visible={arrowState.visible} start={arrowState.start} end={arrowState.end} />
     {explosions.map(exp => <Explosion key={exp.id} top={exp.top} left={exp.left} />)}

      <header className="w-full flex justify-between items-center mb-2 flex-shrink-0 px-5 pt-8">
          {turnPhase !== 'preGame' && (
              <div className="flex flex-col items-start gap-2">
                  <h2 className="text-lg font-bold text-pink-300 flex items-center">
                  Opponent Resources
                  {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === 'player2' && <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
                  {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo.player2Passed && <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
                  </h2>
                  <div className="flex items-center gap-4">
                      <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${player2.energy > player2EffectiveStats.maxEnergy ? 'text-red-400' : ''}`}><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{player2.energy} / {player2EffectiveStats.maxEnergy}</span></div>
                        <div 
                            onClick={() => AI_HAND_DEBUG_MODE && setShowAiHandModal(true)}
                            className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${AI_HAND_DEBUG_MODE ? 'cursor-pointer hover:bg-gray-800' : ''} ${player2.hand.length > player2EffectiveStats.handLimit ? 'text-red-400' : ''}`}
                          >
                              <Hand className="text-gray-400 mr-2" /> 
                              <span className="font-bold text-lg">{player2.hand.length} / {player2EffectiveStats.handLimit}</span>
                          </div>
                      {turnPhase === 'deployment' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{turn === 1 ? player2.initialDeploymentBudget : player2.deploymentBudget}</span></div>}
                      <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${totalPlayer2Drones > player2EffectiveStats.cpuLimit ? 'text-red-400' : ''}`}><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{totalPlayer2Drones} / {player2EffectiveStats.cpuLimit}</span></div>
                  </div>
              </div>
          )}
          <div className="text-center">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-xl font-orbitron" style={{textShadow: '0 0 15px rgba(236, 72, 153, 0.5), 0 0 5px rgba(255, 255, 255, 0.5)'}}>Drone Wars</h1>
             {turnPhase !== 'preGame' && <h2 className="text-2xl font-bold text-gray-300 mt-2 tracking-widest font-exo">{getPhaseDisplayName(turnPhase)}</h2>}
          </div>
          {turnPhase !== 'preGame' && (
              <div className="flex flex-col items-end gap-2">
                  <h2 className="text-lg font-bold text-cyan-300 flex items-center">
                      Your Resources
                  {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === 'player1' && <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
                  {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo.player1Passed && <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
                  </h2>
                    <div className="flex items-center gap-6">
                        <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${player1.energy > player1EffectiveStats.maxEnergy ? 'text-red-400' : ''}`}><Bolt className="text-yellow-300 mr-2" /> <span className="font-bold text-lg">{player1.energy} / {player1EffectiveStats.maxEnergy}</span></div>
                        {turnPhase === 'deployment' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><Rocket className="text-purple-400 mr-2" /> <span className="font-bold text-lg">{turn === 1 ? player1.initialDeploymentBudget : player1.deploymentBudget}</span></div>}
                        <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${totalPlayer1Drones > player1EffectiveStats.cpuLimit ? 'text-red-400' : ''}`}><Cpu className="text-cyan-400 mr-2" /> <span className="font-bold text-lg">{totalPlayer1Drones} / {player1EffectiveStats.cpuLimit}</span></div>
                        {turnPhase === 'allocateShields' && <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50"><ShieldCheck className="text-cyan-300 mr-2" /> <span className="font-bold text-lg">{shieldsToAllocate}</span></div>}
                        <button onClick={handleReset} className="bg-pink-700 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-colors duration-200" aria-label="Reset Game"><RotateCcw /></button>
                        <button className="bg-slate-700 text-white p-3 rounded-full shadow-lg hover:bg-slate-600 transition-colors duration-200"><Settings /></button>
                    </div>
              </div>
          )}
         </header>
      
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
                ) : (
                  <div className="flex flex-col items-center w-full space-y-2">
                      <ShipSectionsDisplay player={player2} isPlayer={false} placedSections={opponentPlacedSections} onTargetClick={handleTargetClick} isInteractive={false} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <DroneLanesDisplay player={player2} isPlayer={false} placedSections={opponentPlacedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <DroneLanesDisplay player={player1} isPlayer={true} placedSections={placedSections} onLaneClick={handleLaneClick} selectedDrone={selectedDrone} selectedCard={selectedCard} validCardTargets={validCardTargets} />
                      <ShipSectionsDisplay player={player1} isPlayer={true} placedSections={placedSections} onSectionClick={handleAllocateShield} onTargetClick={handleTargetClick} isInteractive={turnPhase === 'allocateShields'} selectedCard={selectedCard} validCardTargets={validCardTargets} />
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
                    Hand ({player1.hand.length}/{player1EffectiveStats.handLimit})
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

             {/* Add this new button */}
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
                  {(turnPhase === 'deployment' || turnPhase === 'action') && currentPlayer === 'player1' && !mandatoryAction && !multiSelectState && (
                  <button
                      onClick={handlePlayerPass}
                      disabled={passInfo.player1Passed}
                      className={`absolute top-4 right-4 z-10 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 ${
                          passInfo.player1Passed ? 'bg-gray-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
                      }`}
                  >
                      Pass
</button>
              )}
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
              <div className="flex flex-row justify-between w-full">
               <div className="flex flex-col items-center w-32 min-w-32">
                 <div className="w-24 h-32 bg-gray-900/80 rounded-lg border-2 border-gray-700 flex items-center justify-center shadow-md"><p className="font-bold text-sm text-gray-400">{player1.discardPile.length}</p></div>
                  <p className="mt-2 text-xs text-gray-400 font-semibold">Discard Pile</p>
               </div>
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-4 mb-4">
                   <h3 className={`text-lg font-semibold ${player1.hand.length > player1EffectiveStats.handLimit ? 'text-red-400' : 'text-white'}`}>Your Hand ({player1.hand.length}/{player1EffectiveStats.handLimit})</h3>
                 </div>
                 <div className="flex flex-wrap justify-center gap-4">{player1.hand.map((card) => 
                   <ActionCard 
                     key={card.instanceId} 
                     card={card} 
                      isPlayable={
                          (turnPhase === 'action' && 
                          currentPlayer === 'player1' && 
                          !passInfo.player1Passed && 
                          player1.energy >= card.cost &&
                          (!card.targeting || getValidTargets('player1', null, card).length > 0)) ||
                          (turnPhase === 'optionalDiscard' && optionalDiscardCount < player1EffectiveStats.discardLimit)
                      }
                      isMandatoryTarget={mandatoryAction?.type === 'discard'}
                      onClick={
                          mandatoryAction?.type === 'discard' 
                          ? (c) => setConfirmationModal({type: 'discard', target: c, onConfirm: () => handleConfirmMandatoryDiscard(c), onCancel: () => setConfirmationModal(null), text: `Are you sure you want to discard ${c.name}?`})
                          : turnPhase === 'optionalDiscard'
                          ? handleOptionalDiscardClick
                          : handleCardClick
                      }
                   />)}
                 </div>
               </div>
               <div className="flex flex-col items-center w-32 min-w-32">
                 <div className="w-24 h-32 bg-indigo-900/50 rounded-lg border-2 border-purple-500 flex items-center justify-center shadow-md cursor-pointer hover:bg-indigo-800/50 transition-colors duration-200"><p className="font-bold text-sm text-white">{player1.deck.length}</p></div>
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
            ) : footerView === 'drones' ? ( // <<<<<<<<<<<<< MODIFIED THIS LINE
              <div className="flex flex-col items-center mb-4 w-full">
               <div className="flex flex-wrap justify-center gap-4">
                   {sortedPlayer1ActivePool.map((drone, index) => {
                       const totalResource = turn === 1 ? player1.initialDeploymentBudget + player1.energy : player1.energy;
                       const canAfford = totalResource >= drone.class;
                       return <DroneCard key={index} drone={drone} onClick={handleToggleDroneSelection} isSelected={selectedDrone && selectedDrone.name === drone.name} isSelectable={turnPhase === 'deployment' && currentPlayer === 'player1' && !passInfo.player1Passed && canAfford && !mandatoryAction} deployedCount={player1.deployedDroneCounts[drone.name] || 0} />;
                     })}
               </div>
              </div>
            ) : (
              // >>>>>>>>>>> ADD THIS ENTIRE BLOCK FOR THE LOG VIEW
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
                        <tr key={index} className="border-b border-gray-700/50 hover:bg-slate-700/50">
                          <td className="p-2 font-bold">{entry.round}</td>
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
                    <button onClick={handleEndAllocation} disabled={shieldsToAllocate > 0 && canAllocateMoreShields} className={`text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 ${shieldsToAllocate > 0 && canAllocateMoreShields ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30'}`}>End Allocation</button>
                </div>
            }
          </div>
        </footer>
      )}

      {/* Modals are unaffected and remain at the end */}
      {modalContent && <GamePhaseModal title={modalContent.title} text={modalContent.text} onClose={modalContent.onClose || (() => setModalContent(null))}>{modalContent.children}</GamePhaseModal>}
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

 {winner && (
        <GamePhaseModal
            title={`${winner} is Victorious!`}
            text={winner === 'Player 1' ? "You have crippled the enemy command ship." : "Your command ship has been crippled."}
            onClose={handleReset}
            >
      <div className="flex justify-center mt-6">
      <button onClick={handleReset} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
       Play Again
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
{/* --- NEW --- Card Confirmation Modal */}
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
                    isPlayable={false} // Cards are not playable from this view
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
    </div>
  );
};
export default App;