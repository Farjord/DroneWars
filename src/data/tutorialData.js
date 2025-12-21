/**
 * Tutorial Data
 * Screen-specific tutorial content and configuration
 *
 * Each tutorial modal provides first-time players with an overview
 * of a game screen and its functionality. Tutorials are dismissed
 * once viewed and tied to the save file (reset on new game).
 */

// ========================================
// TUTORIAL SCREEN IDS
// ========================================

export const TUTORIAL_SCREENS = {
  INTRO: 'intro',
  INVENTORY: 'inventory',
  REPLICATOR: 'replicator',
  BLUEPRINTS: 'blueprints',
  SHOP: 'shop',
  REPAIR_BAY: 'repairBay',
  TACTICAL_MAP_OVERVIEW: 'tacticalMapOverview',
  TACTICAL_MAP: 'tacticalMap',
  DECK_BUILDER: 'deckBuilder',
};

// ========================================
// TUTORIAL CONTENT
// ========================================

export const TUTORIALS = {
  [TUTORIAL_SCREENS.INTRO]: {
    id: TUTORIAL_SCREENS.INTRO,
    title: 'Welcome to the Eremos',
    subtitle: 'A Hostile Frontier Awaits',
    sections: [
      {
        heading: 'The Setting',
        content: 'The Eremos is a vast, abandoned sector of space filled with derelict stations, automated defenses, and valuable salvage. Once a thriving industrial zone, it is now a just a shell of its former self. All that remains are automated factories and abandoned facilities, fiercely guarded by AI controlled ships, programmed to protect and defend their territory against any intruders.',
      },
      {
        heading: 'Your Role',
        content: 'You are a Prospector. Your goal is to venture into the Eremos, defeat hostile automated systems, collect valuable items, and extract before your ship is destroyed. Each successful run brings credits and new equipment.',
      },
      {
        heading: 'Exploring the Eremos',
        content: 'The vast waypoint networks that once connected the facilities of the Eremos are now in a state of flux and dissarray. Prospectors are constantly hacking in to the Waypoint subsystems, looking for ways in. However, the defence protocals are constatly adapting, making the landscape ever changing. On top of this, once sucessfully within a subsector, the automated threat detection protocols kick in. Each move escaltes the threat level of the subsector until ultiamately the area goes on full lockdown, shutting down all Waypoints and making extraction impossible.',
      },
      {
        heading: 'The Hangar',
        content: 'This is your home base - the Hangar. From here you can access your inventory, craft new equipment, repair damaged units, purchase supplies, and prepare your loadout before venturing into the Eremos. The tactical map shows available sectors to explore.',
      },
      {
        heading: 'Getting Started',
        content: 'We recommend completing the introduction missions to familiarize yourself with each system. Select a sector on the tactical map when you\'re ready for your first salvage run. Good luck, pilot.',
      },
    ],
    showOnNewGame: true,
  },

  [TUTORIAL_SCREENS.INVENTORY]: {
    id: TUTORIAL_SCREENS.INVENTORY,
    title: 'Inventory',
    subtitle: 'Your Collection',
    sections: [
      {
        heading: 'What\'s Stored Here',
        content: 'Your inventory contains all cards, drones, ships, and components you\'ve acquired during your salvage operations. Items collected during runs are automatically transferred here upon successful extraction.',
      },
      {
        heading: 'Item Categories',
        content: 'Use the tabs to browse different item types. Action cards enhance your combat options, drones serve as your primary fighters, ships determine your overall capabilities, and components modify your ship\'s sections.',
      },
      {
        heading: 'Using Your Items',
        content: 'Items in your inventory can be equipped through the Deck Builder. Some items may also be used as crafting materials in the Replicator or sold for credits.',
      },
    ],
  },

  [TUTORIAL_SCREENS.REPLICATOR]: {
    id: TUTORIAL_SCREENS.REPLICATOR,
    title: 'Replicator',
    subtitle: 'Craft New Equipment',
    sections: [
      {
        heading: 'Crafting System',
        content: 'The Replicator allows you to clone any cards that you currently own. This is useful for creating multiple copies of powerful cards to include in your deck. NOTE: Starter Cards are not shown hear, as you can equip unlimited copies of these in your deck without needing to replicate them.',
      },
      {
        heading: 'Requirements',
        content: 'To replicate a card you must currently own at least one copy of it. Cards that you have previosuly owned, but have gone \'MIA\' during a run, cannot be replicated. You also need sufficient credits to cover the replication cost.',
      },
      {
        heading: 'Replicated Cards',
        content: 'Successfully replicated cards are immediately added to your inventory and can be used in your next loadout.',
      },
    ],
  },

  [TUTORIAL_SCREENS.BLUEPRINTS]: {
    id: TUTORIAL_SCREENS.BLUEPRINTS,
    title: 'Blueprints',
    subtitle: 'Unlock Schematics',
    sections: [
      {
        heading: 'What Are Blueprints',
        content: 'Blueprints are schematics for new Drones, Ship and Ship Sections. Once unlocked, you always have access to craft these items.',
      },
      {
        heading: 'Acquiring Blueprints',
        content: 'Blueprints can be found from specific sectors in the Eremos. These sectors are high risk and usually require a security token to enter.',
      },
      {
        heading: 'Unlocking Process',
        content: 'Once you have a blueprint, you can view its requirements and create copies of the associated card here.',
      },
    ],
  },

  [TUTORIAL_SCREENS.SHOP]: {
    id: TUTORIAL_SCREENS.SHOP,
    title: 'Shop',
    subtitle: 'Purchase Supplies',
    sections: [
      {
        heading: 'Card Packs',
        content: 'The shop offers card packs containing random cards of various types and rarities. Different pack types focus on different card categories - ordnance for weapons, support for utility, tactical for special abilities, and upgrades for Done upgrade cards.',
      },
      {
        heading: 'Tactical Items',
        content: 'You can also purchase tactical items here - consumables that can be used during salvage runs for emergency situations like evading encounters or making quick extractions.',
      },
      {
        heading: 'Rotating Stock',
        content: 'The featured card pack rotates periodically. Check back after successful extractions for new offers and deals.',
      },
    ],
  },

  [TUTORIAL_SCREENS.REPAIR_BAY]: {
    id: TUTORIAL_SCREENS.REPAIR_BAY,
    title: 'Repair Bay',
    subtitle: 'Restore Your Fleet',
    sections: [
      {
        heading: 'Combat Damage',
        content: 'Drones and ship sections can be damaged during combat encounters. Damaged drones have their deployment limit reduced, and damaged ship sections have reduced effectiveness.',
      },
      {
        heading: 'Repair Process',
        content: 'Spend credits here to repair damaged equipment. Repairs restore full functionality to your units, allowing them to be used in future runs.',
      },
      {
        heading: 'Maintenance Priority',
        content: 'Keep your key combat units repaired before each run. A well-maintained fleet has a much better chance of successful extraction.',
      },
    ],
  },

  [TUTORIAL_SCREENS.TACTICAL_MAP_OVERVIEW]: {
    id: TUTORIAL_SCREENS.TACTICAL_MAP_OVERVIEW,
    title: 'Tactical Map',
    subtitle: 'Sector Overview',
    sections: [
      {
        heading: 'Sector Selection',
        content: 'The tactical map shows available sectors in the Eremos. Each sector has a tier rating indicating difficulty - higher tiers have tougher enemies but better rewards.',
      },
      {
        heading: 'Hex Navigation',
        content: 'Within each sector, you\'ll navigate a hex grid. Moving between hexes consumes time and increases your detection level. Plan your route carefully.',
      },
      {
        heading: 'Extraction Points',
        content: 'Extraction gates are marked on the map. Reach one of these gates to escape with your collected loot. Don\'t stay too long - detection brings more dangerous encounters. NOTE: you cannot extract from your chosen entry gate starting hex.',
      },
    ],
  },

  [TUTORIAL_SCREENS.TACTICAL_MAP]: {
    id: TUTORIAL_SCREENS.TACTICAL_MAP,
    title: 'In the Field',
    subtitle: 'Active Salvage Run',
    sections: [
      {
        heading: 'Movement',
        content: 'Click on adjacent hexes to move your ship. Each movement increases your detection level and may trigger encounters with hostile forces.',
      },
      {
        heading: 'Encounters',
        content: 'When you encounter hostiles, you\'ll enter combat. Win to proceed and claim loot; lose and your ship becomes MIA. Damaged units and lost cargo are the price of defeat.',
      },
      {
        heading: 'Points of Interest',
        content: 'Special hexes marked as Points of Interest contain valuable loot. Looting them increases your threat level but can yield substantial rewards.',
      },
      {
        heading: 'Extraction',
        content: 'When you\'re ready to leave, navigate to an extraction gate. You can also use tactical items for emergency extraction if things get too dangerous.',
      },
    ],
  },

  [TUTORIAL_SCREENS.DECK_BUILDER]: {
    id: TUTORIAL_SCREENS.DECK_BUILDER,
    title: 'Deck Builder',
    subtitle: 'Customize Your Loadout',
    sections: [
      {
        heading: 'Ship Slots',
        content: 'The standard Ship is always avaialbel to you. However, it does not gain reputation and cannot be modified. Additional slots be purchased, allowing you to create and customise your own load out and include Cards, Drones even Ships and Ship Sections. These loadouts then earn you reputation, based off the rarity of the items in your loadout. However, if you fail to extract from a run, your loadout will be classed as MIA - requiring you to pay for salvage costs.',
      },
      {
        heading: 'Deck Construction',
        content: 'Add action cards from your inventory to your deck. Balance offensive, defensive, and utility cards based on your playstyle. Each card type has different strengths.',
      },
      {
        heading: 'Drone Assignment',
        content: 'Assign drones to your ship\'s drone slots. Each drone has unique stats and abilities. Consider team composition - some drones work better together than others.',
      },
      {
        heading: 'Ship Components',
        content: 'Install components in your ship\'s sections (left, middle, right). Components provide passive bonuses and special abilities that can turn the tide of battle.',
      },
    ],
  },
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get tutorial content by screen ID
 * @param {string} screenId - Screen ID from TUTORIAL_SCREENS
 * @returns {Object|undefined} Tutorial content or undefined if not found
 */
export function getTutorialByScreen(screenId) {
  return TUTORIALS[screenId];
}

/**
 * Get all tutorial screen IDs
 * @returns {Array} Array of screen IDs
 */
export function getAllTutorialScreenIds() {
  return Object.values(TUTORIAL_SCREENS);
}

/**
 * Create default tutorial dismissal state (all false)
 * @returns {Object} Default dismissal state object
 */
export function createDefaultTutorialDismissals() {
  const dismissals = {};
  Object.values(TUTORIAL_SCREENS).forEach(screenId => {
    dismissals[screenId] = false;
  });
  return dismissals;
}

export default TUTORIALS;
