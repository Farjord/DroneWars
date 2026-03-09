/**
 * Static content data for the in-game Player Manual.
 *
 * Structure:
 *   manualCategories[] → category.topics[] → topic.sections[]
 *
 * Each section may optionally include:
 *   - tip      (string)  — helpful gameplay advice
 *   - warning  (string)  — important rule the player must not miss
 *   - items    (array)   — list of { name, description, color? } entries
 */

export const manualCategories = [
  // ───────────────────────────────────────────────
  // Category 1 — Overview
  // ───────────────────────────────────────────────
  {
    id: 'overview',
    title: 'Overview',
    icon: 'BookOpen',
    topics: [
      {
        id: 'what-is-drone-wars',
        label: 'What is Drone Wars?',
        sections: [
          {
            heading: 'Welcome to Drone Wars',
            body:
              'Drone Wars is a tactical card and drone combat game where two players go head-to-head ' +
              'with fleets of drones, action cards, and powerful ship systems. Each player commands a ' +
              'capital ship made up of 3 sections spread across 3 lanes of battle. Your goal is to ' +
              'deploy drones, play action cards, and launch attacks to cripple your opponent\'s ship ' +
              'before they do the same to yours.',
          },
          {
            heading: 'The Battlefield',
            body:
              'Combat takes place across 3 parallel lanes. Each lane holds one of your ship sections ' +
              'and any drones you deploy there. Both players share the same 3 lanes, so your drones ' +
              'will face off against whatever your opponent places on the other side. Choosing where to ' +
              'deploy your forces — and where to focus your attacks — is the heart of every match.',
          },
        ],
      },
      {
        id: 'how-to-win',
        label: 'How to Win',
        sections: [
          {
            heading: 'Victory Condition',
            body:
              'You win by dealing enough damage to your opponent\'s capital ship. Specifically, you ' +
              'need to deal damage equal to or greater than 60% of their total ship hull. Total ship ' +
              'hull is the sum of the maximum hull points across all 3 of their ship sections.',
            tip:
              'Focus your damage on sections that are already wounded. Pushing a section from Damaged ' +
              'to Critical weakens your opponent\'s output, and concentrated fire gets you to that 60% ' +
              'threshold faster than spreading damage evenly.',
          },
          {
            heading: 'Tracking Progress',
            body:
              'Keep an eye on the hull integrity display during the match. It shows how much total ' +
              'damage you\'ve dealt relative to the victory threshold. For example, if your opponent ' +
              'has 30 total hull points, you need to deal 18 damage to win.',
          },
        ],
      },
      {
        id: 'game-setup',
        label: 'Game Setup',
        sections: [
          {
            heading: 'Step 1 — Deck Selection',
            body:
              'Choose which action card deck to bring into battle. Each deck has a different mix of ' +
              'cards that support different playstyles — aggressive, defensive, utility, or a blend.',
          },
          {
            heading: 'Step 2 — Drone Selection',
            body:
              'Pick your drone roster from the available drone types. These are the drones you\'ll ' +
              'have access to during the match, so think about what combination of stats, keywords, ' +
              'and trigger abilities you want.',
          },
          {
            heading: 'Step 3 — Ship Placement',
            body:
              'Arrange your 3 ship sections — Bridge, Power Cell, and Drone Control Hub — across the ' +
              '3 lanes. The section you place in the middle lane receives bonus stats, so choose ' +
              'carefully based on your strategy.',
            tip:
              'The middle lane bonus can be significant — placing your Power Cell there gives extra ' +
              'energy, while placing the Bridge there boosts your card draw. Think about which bonus ' +
              'best complements your deck and drone choices.',
          },
          {
            heading: 'Into Battle',
            body:
              'After all players finish setup, the first player is determined and the game begins. ' +
              'First player advantage alternates each round, so both players get fair turns at acting ' +
              'first.',
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────
  // Category 2 — Ship & Drones
  // ───────────────────────────────────────────────
  {
    id: 'ship-and-drones',
    title: 'Ship & Drones',
    icon: 'Shield',
    topics: [
      {
        id: 'ship-sections',
        label: 'Ship Sections',
        sections: [
          {
            heading: 'Your Capital Ship',
            body:
              'Your ship is made up of 3 sections, one placed in each lane. Each section type serves ' +
              'a distinct role and provides different stats to fuel your strategy.',
          },
          {
            heading: 'Bridge',
            body:
              'The Bridge controls your card flow. Its key stats are Draw (how many cards you draw ' +
              'each round) and Discard (your maximum hand size). A strong Bridge keeps your hand full ' +
              'of options.',
          },
          {
            heading: 'Power Cell',
            body:
              'The Power Cell generates the energy you need to play cards and use abilities. Its stats ' +
              'are Energy Per Turn (how much energy you gain each round), Max Energy (the most energy ' +
              'you can store), and Shields Per Turn (how many shield tokens you receive each round).',
          },
          {
            heading: 'Drone Control Hub',
            body:
              'The Drone Control Hub manages your fleet. Its stats are Initial Deployment (your ' +
              'starting deployment budget for the first round), CPU Control Value (the maximum total ' +
              'cost of drones you can have deployed at once across all lanes), and Deployment Budget ' +
              '(how many drones you can deploy per round).',
          },
          {
            heading: 'Middle Lane Bonus',
            body:
              'Whichever section you place in the middle lane receives bonus stats. For example, a ' +
              'Power Cell in the middle might gain +2 energy, a Bridge might gain +1 draw, and a ' +
              'Drone Control Hub might gain +4 deployment budget. This bonus can shape your entire ' +
              'strategy.',
          },
          {
            heading: 'Section Variants',
            body:
              'Each section type comes in multiple variants at different rarity levels — Common, ' +
              'Uncommon, and Rare. Higher rarity variants have stronger or more specialised stat ' +
              'profiles, letting you fine-tune your ship to match your playstyle.',
          },
        ],
      },
      {
        id: 'shields-and-health',
        label: 'Shields & Health',
        sections: [
          {
            heading: 'Hull Points',
            body:
              'Every ship section has hull points representing its structural integrity. When a ' +
              'section takes damage, its hull decreases. Accumulate enough total hull damage across ' +
              'all sections and you lose the game.',
          },
          {
            heading: 'Health States',
            body:
              'Ship sections pass through three health states as they take damage: Healthy, Damaged, ' +
              'and Critical. As a section degrades, its stats weaken — a Damaged Bridge draws fewer ' +
              'cards, a Critical Power Cell produces less energy, and so on.',
            warning:
              'When a section reaches Critical status, its output drops significantly. Protect your ' +
              'most important sections or risk losing the resources you depend on.',
          },
          {
            heading: 'Shield Tokens',
            body:
              'Shields act as a buffer that absorbs incoming damage before your hull takes a hit. ' +
              'Each shield token blocks 1 point of damage. At the start of each round during the ' +
              'Shield Allocation phase, you receive shield tokens equal to your Power Cell\'s Shields ' +
              'Per Turn stat and choose which sections or drones to assign them to.',
          },
        ],
      },
      {
        id: 'ship-abilities',
        label: 'Ship Abilities',
        sections: [
          {
            heading: 'Using Ship Abilities',
            body:
              'Each ship section type has a unique ability you can activate during the Action Phase. ' +
              'Abilities cost 1 energy each and can only be used once per round per section.',
            tip:
              'Ship abilities are powerful but cost energy — balance them against playing action ' +
              'cards. Sometimes a well-timed ability is worth more than a card.',
          },
          {
            heading: 'Recalculate (Bridge)',
            body:
              'Draw a card, then discard a card. This helps you cycle through your deck to find the ' +
              'cards you need while getting rid of ones you don\'t.',
          },
          {
            heading: 'Reallocate Shields (Power Cell)',
            body:
              'Take up to 2 shield tokens from your ship sections and move them to other sections or ' +
              'drones. Great for shifting your defenses to where they\'re needed most.',
          },
          {
            heading: 'Recall (Drone Control Hub)',
            body:
              'Return one of your deployed drones from any lane back to your active pool. This is ' +
              'useful for repositioning a drone to a different lane next round or saving a damaged ' +
              'drone from destruction.',
          },
          {
            heading: 'Target Lock (Tactical Bridge)',
            body:
              'Mark an enemy drone, increasing its threat level. Available on the Tactical Bridge ' +
              'variant instead of the standard Recalculate ability.',
          },
        ],
      },
      {
        id: 'drones-and-deployment',
        label: 'Drones & Deployment',
        sections: [
          {
            heading: 'Your Combat Units',
            body:
              'Drones are the units you deploy to the 3 lanes to fight on your behalf. Each drone ' +
              'has four core stats: Hull (health points), Attack (damage dealt when attacking), ' +
              'Speed (determines attack priority — faster drones strike first), and Cost (how much ' +
              'of your deployment budget it takes to deploy).',
            tip:
              'Speed is deceptively important. A fast drone can destroy an enemy before it ever gets ' +
              'a chance to attack, effectively negating all of that enemy\'s damage for the round.',
          },
          {
            heading: 'Deployment Limits',
            body:
              'Two limits control how many drones you can field. Your CPU Control Value sets the ' +
              'maximum total cost of all drones you can have deployed across all lanes at once. Your ' +
              'Deployment Budget limits how many drones you can deploy in a single round.',
          },
          {
            heading: 'Active Pool',
            body:
              'Your selected drones that aren\'t currently on the battlefield sit in your active ' +
              'pool. During the Deployment Phase, you deploy drones from this pool to lanes of your ' +
              'choice.',
          },
          {
            heading: 'Exhaustion',
            body:
              'After a drone attacks, it becomes exhausted and cannot attack again until the start of ' +
              'the next round, when all drones ready automatically. Plan your attacks carefully — ' +
              'once a drone is exhausted, it\'s done for the round.',
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────
  // Category 3 — Gameplay
  // ───────────────────────────────────────────────
  {
    id: 'gameplay',
    title: 'Gameplay',
    icon: 'Swords',
    topics: [
      {
        id: 'round-structure',
        label: 'Round Structure',
        sections: [
          {
            heading: 'How a Round Works',
            body:
              'Each round is made up of several phases that alternate between two styles. ' +
              'Simultaneous phases have both players acting at the same time — these include ' +
              'discarding, shield allocation, and drawing cards. Turn-based phases have players ' +
              'taking turns one at a time — these include deployment and the Action Phase. The first ' +
              'player alternates each round so neither player always has the advantage.',
          },
          {
            heading: 'Round Flow',
            body:
              'The phases play out in this order: Mandatory Discard, Optional Discard, Shield ' +
              'Allocation, Mandatory Drone Removal, Energy Reset, Draw Cards, Deployment Phase, and ' +
              'finally the Action Phase. Once the Action Phase ends, a new round begins and the ' +
              'cycle repeats.',
          },
        ],
      },
      {
        id: 'upkeep-phases',
        label: 'Upkeep Phases',
        sections: [
          {
            heading: 'Mandatory Discard',
            body:
              'If your hand has more cards than your hand limit (determined by your Bridge\'s Discard ' +
              'stat), you must discard down to the limit. Both players do this at the same time.',
          },
          {
            heading: 'Optional Discard',
            body:
              'You may voluntarily discard any cards you don\'t want. This is a good way to cycle ' +
              'through your deck and get closer to the cards you need.',
          },
          {
            heading: 'Shield Allocation',
            body:
              'You receive shield tokens equal to your Power Cell\'s Shields Per Turn stat. Assign ' +
              'them to any combination of your ship sections and deployed drones. Shields last until ' +
              'they absorb damage, so think about where attacks are most likely to land.',
          },
          {
            heading: 'Mandatory Drone Removal',
            body:
              'If your deployed drones exceed your CPU Control Value (for example, because a ship ' +
              'section was damaged and reduced your CPU), you must remove drones until you\'re back ' +
              'within the limit.',
          },
          {
            heading: 'Energy Reset',
            body:
              'Your energy refills based on your Power Cell\'s Energy Per Turn and Max Energy stats. ' +
              'This is the fuel you\'ll spend during the Action Phase on cards and abilities.',
          },
          {
            heading: 'Draw Cards',
            body:
              'Draw cards from your deck equal to your Bridge\'s Draw stat. These join any cards ' +
              'already in your hand, giving you options for the upcoming Action Phase.',
          },
        ],
      },
      {
        id: 'deployment-phase',
        label: 'Deployment Phase',
        sections: [
          {
            heading: 'Deploying Drones',
            body:
              'During the Deployment Phase, players take turns deploying drones from their active ' +
              'pool to lanes. Each drone has a deployment cost that counts against your round\'s ' +
              'Deployment Budget. Choose your lanes carefully — where you place a drone determines ' +
              'what it can attack, defend, and which triggers it activates.',
            warning:
              'You cannot deploy more drones than your CPU Control Value allows in total. Even if you ' +
              'have budget remaining, you\'re capped by your CPU.',
          },
          {
            heading: 'Passing',
            body:
              'You can pass to stop deploying for the round. Once both players pass, the Deployment ' +
              'Phase ends and the Action Phase begins.',
          },
        ],
      },
      {
        id: 'action-phase',
        label: 'Action Phase',
        sections: [
          {
            heading: 'Taking Actions',
            body:
              'The Action Phase is where the real battle happens. Players take turns performing one ' +
              'action at a time. On your turn you can play an action card from your hand (spending ' +
              'energy for its effect), attack with a ready drone, use one of your ship abilities, or ' +
              'pass. You can keep taking actions in any order until you decide to pass.',
            tip:
              'You\'re not limited to one action per turn — you can attack with multiple drones, play ' +
              'a card AND attack, or use an ability then follow up with a card. Mix and match to ' +
              'create devastating combos.',
          },
          {
            heading: 'Ending the Round',
            body:
              'When you have nothing left to do (or choose not to act), pass your turn. When both ' +
              'players pass consecutively, the Action Phase and the entire round ends. A new round ' +
              'then begins.',
          },
        ],
      },
      {
        id: 'combat-and-interception',
        label: 'Combat & Interception',
        sections: [
          {
            heading: 'Attacking',
            body:
              'To attack, choose one of your ready (non-exhausted) drones and pick a target — either ' +
              'an enemy drone or an enemy ship section. Your drone deals damage equal to its Attack ' +
              'stat. After attacking, your drone becomes exhausted for the rest of the round.',
          },
          {
            heading: 'Speed Priority',
            body:
              'When a drone attacks, speed determines who strikes first. If the attacker is faster ' +
              'than the defender, it deals its damage before the defender can retaliate. This can ' +
              'mean destroying an enemy before it ever gets to fight back.',
          },
          {
            heading: 'Interception',
            body:
              'When a drone attacks an enemy ship section, the defending player can choose one of ' +
              'their drones in that lane to intercept the attack. The intercepting drone takes the ' +
              'hit instead of the ship section, shielding it from damage.',
          },
          {
            heading: 'Interceptor Endurance',
            body:
              'Interceptors do not become exhausted when they intercept — they can block multiple ' +
              'attacks in a single round. However, each hit still damages their hull and shields, so ' +
              'even a tough interceptor will eventually go down under sustained fire.',
          },
          {
            heading: 'Guardian Keyword',
            body:
              'Drones with the Guardian keyword force enemies to deal with them before attacking the ' +
              'ship section in their lane. While a Guardian is active, the ship section behind it ' +
              'cannot be directly targeted — attackers must destroy the Guardian first.',
            warning:
              'A destroyed drone is removed from the lane permanently for the rest of the game. ' +
              'There is no way to bring it back, so protect your key drones.',
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────
  // Category 4 — Cards & Keywords
  // ───────────────────────────────────────────────
  {
    id: 'cards-and-keywords',
    title: 'Cards & Keywords',
    icon: 'Zap',
    topics: [
      {
        id: 'action-cards',
        label: 'Action Cards',
        sections: [
          {
            heading: 'Playing Cards',
            body:
              'Action cards are played from your hand during the Action Phase by spending energy. ' +
              'Cards can deal damage, heal your units, move drones between lanes, draw extra cards, ' +
              'gain energy, modify stats, and much more. Each card shows its energy cost — make sure ' +
              'you have enough energy before committing to a play.',
            tip:
              'Managing your energy is key. Powerful cards cost more, so balance big plays with ' +
              'smaller utility cards. Sometimes playing two cheap cards is better than one expensive ' +
              'one.',
          },
          {
            heading: 'Upgrades',
            body:
              'Upgrades are a special type of action card that permanently modify a drone type\'s ' +
              'base stats for the rest of the game. When you play an upgrade, every drone of that ' +
              'type — including ones you deploy later — benefits from the stat change.',
          },
          {
            heading: 'Deck Recycling',
            body:
              'When your draw deck runs out of cards, your discard pile is shuffled to form a new ' +
              'deck. You\'ll never run out of cards entirely, but the cards you discard will cycle ' +
              'back around eventually.',
          },
        ],
      },
      {
        id: 'damage-types',
        label: 'Damage Types',
        sections: [
          {
            heading: 'Understanding Damage Types',
            body:
              'Not all damage is created equal. Different damage types interact with shields and hull ' +
              'in different ways. Knowing when to use each type is a big part of mastering combat.',
            items: [
              {
                name: 'Kinetic',
                description:
                  'Standard damage. Blocked by shields first, then damages hull. This is the most ' +
                  'common damage type and is reliable in all situations.',
                color: '#ef4444',
              },
              {
                name: 'Ion',
                description:
                  'Only damages shields. Cannot damage hull at all. Use Ion damage to strip away an ' +
                  'enemy\'s defenses before following up with other damage types.',
                color: '#3b82f6',
              },
              {
                name: 'Piercing',
                description:
                  'Ignores shields entirely and damages hull directly. Extremely deadly against ' +
                  'heavily shielded targets since their defenses offer no protection.',
                color: '#a855f7',
              },
              {
                name: 'Shield Breaker',
                description:
                  'Deals double effectiveness against shields (each point removes 2 shield tokens), ' +
                  'then damages hull normally for any remaining amount. Excellent for punching through ' +
                  'heavy shielding.',
                color: '#eab308',
              },
            ],
            tip:
              'Match your damage types to the situation. Use Ion or Shield Breaker to strip shields, ' +
              'then follow up with Piercing or Kinetic to finish off the hull.',
          },
        ],
      },
      {
        id: 'keywords-and-status',
        label: 'Keywords & Status',
        sections: [
          {
            heading: 'Keywords',
            body:
              'Keywords are special abilities printed on certain drones that change how they behave ' +
              'in combat. Understanding these keywords is essential for building effective strategies.',
            items: [
              {
                name: 'Piercing',
                description:
                  'This drone\'s attacks ignore shields and damage hull directly. Shield tokens on ' +
                  'the target offer no protection.',
              },
              {
                name: 'Guardian',
                description:
                  'While this drone is active in a lane, the ship section in that lane cannot be ' +
                  'targeted by attacks. Enemies must destroy the Guardian before they can hit the ' +
                  'ship.',
              },
              {
                name: 'Jammer',
                description:
                  'While this drone is ready (not exhausted), opponent card effects can only target ' +
                  'this drone in its lane. This protects allied drones from enemy cards. The Jammer ' +
                  'effect is disabled when the drone is exhausted.',
              },
            ],
          },
          {
            heading: 'Status Effects',
            body:
              'Status effects are temporary conditions that can be applied to drones through cards, ' +
              'abilities, or triggers. Some help, most hinder.',
            items: [
              {
                name: 'Exhausted',
                description:
                  'Cannot attack or use abilities. Drones become exhausted after attacking and ' +
                  'automatically ready at the start of the next round.',
              },
              {
                name: 'Marked',
                description:
                  'This drone has been targeted, increasing its threat level.',
              },
              {
                name: 'Suppressed',
                description:
                  'A debilitating status effect applied by certain cards that weakens the drone.',
              },
              {
                name: 'Snared',
                description: 'This drone cannot move to another lane.',
              },
              {
                name: 'Cannot Move',
                description: 'This drone is prevented from moving to another lane.',
              },
              {
                name: 'Cannot Attack',
                description: 'This drone is prevented from attacking.',
              },
              {
                name: 'Cannot Intercept',
                description: 'This drone is prevented from intercepting attacks.',
              },
              {
                name: 'Does Not Ready',
                description:
                  'This drone will NOT ready at the start of the next round. It stays exhausted ' +
                  'until the effect wears off, locking it out of combat for an extra round.',
              },
            ],
          },
        ],
      },
      {
        id: 'triggers',
        label: 'Triggers',
        sections: [
          {
            heading: 'What Are Triggers?',
            body:
              'Some drones have trigger abilities — automatic effects that fire when specific events ' +
              'happen during the game. Triggers activate on their own without costing energy or ' +
              'requiring you to take an action. They just happen when the right conditions are met.',
            tip:
              'Position trigger drones carefully. Lane triggers only fire for events in their lane, ' +
              'so where you deploy a trigger drone matters just as much as which drone you pick.',
          },
          {
            heading: 'Self Triggers',
            body:
              'Self triggers fire based on what the drone itself does.',
            items: [
              {
                name: 'On Deploy',
                description: 'Fires when this drone is deployed to a lane.',
              },
              {
                name: 'On Attack',
                description: 'Fires when this drone attacks a target.',
              },
              {
                name: 'On Move',
                description: 'Fires when this drone moves to a new lane.',
              },
              {
                name: 'On Round Start',
                description: 'Fires at the beginning of each round.',
              },
              {
                name: 'On Intercept',
                description: 'Fires when this drone intercepts an attack aimed at a ship section.',
              },
              {
                name: 'On Attacked',
                description: 'Fires when this drone is attacked by an enemy.',
              },
            ],
          },
          {
            heading: 'Controller Triggers',
            body:
              'Controller triggers fire based on what the drone\'s owner does.',
            items: [
              {
                name: 'On Card Drawn',
                description: 'Fires when you draw cards.',
              },
              {
                name: 'On Energy Gained',
                description: 'Fires when you gain energy.',
              },
              {
                name: 'On Card Play',
                description: 'Fires when you play an action card.',
              },
            ],
          },
          {
            heading: 'Lane Triggers',
            body:
              'Lane triggers fire based on events happening in the same lane as the drone.',
            items: [
              {
                name: 'On Lane Entry',
                description: 'Fires when any drone moves into this lane.',
              },
              {
                name: 'On Lane Exit',
                description: 'Fires when any drone moves out of this lane.',
              },
              {
                name: 'On Lane Deployment',
                description: 'Fires when a drone is deployed to this lane.',
              },
              {
                name: 'On Lane Attack',
                description: 'Fires when an attack occurs in this lane.',
              },
            ],
          },
        ],
      },
    ],
  },
];
