Product Requirements Document: Exploring the Eremos
Scope: Single Player Extraction TCG
I. Executive Summary
"Exploring the Eremos" is a single-player Extraction TCG. Players risk constructed 40-card decks by piloting ships into unstable space storms to scavenge resources. The core loop is driven by a single dynamic timer, Instability, which enforces risk management and sustained friction through the Drone Damage Protocol. The narrative is discovered by interacting with the abandoned ruins of a former galactic hub.
________________________________________
II. The Object Model: Cards and Currencies
2.1. Asset Card Functional Roles
These 40 cards make up the deck and are volatile (can be lost/MIA).
Card Type	Primary Functional Role	Specific Examples (Abstracted)
Ordnance	Destruction & Removal.	Weapons, Missiles, Drone Removal.
Support	Resource & Self-Maintenance.	Hull Repairs, Energy Gain, Card Draw, Friendly Drone Utility.
Tactics	Control & Disruption.	Opponent Debuffing, Exhausting Drones, Opponent Hand/Energy Disruption.
Upgrades	Permanent Slots.	System Regulators, Auxiliary Energy Cores.
2.2. Currencies (Finalised)
Currency	Volatility	Primary Use
Credits	High (Liquid)	Map Entry, Salvage Fees, Hull Repair, Drone Repair, Asset Card Replication.
Security Bypass Tokens	Low (Persistent)	Gate Key: Required for entry to Hard and Extreme Tier Eremos maps.
________________________________________
III. The Core Gameplay Loop
3.1. Tactical Insertion
1.	Player selects an available Jump Gate for insertion.
2.	Gate Destabilization: Upon warp-in, the selected Entry Gate immediately powers down and cannot be used for extraction during the current run.
3.2. Exploration & Conflict
•	Instability (Hard Timer): Rises with every action, forcing a time constraint.
•	PoI Interaction: Combat is only triggered at Points of Interest (PoIs) or by Hunter AI interception.
3.3. Extraction
•	Player must reach any active Gate (not the Entry Gate) before Instability hits 100%.
•	The Blockade Check: Clicking "Extract" triggers a final Ambush Roll based on the current Instability Level. Failure results in a required "Blockade Fleet" combat encounter.
________________________________________
IV. Mechanics: Death, Economy, and Maintenance
4.1. The "MIA" System (Soft Permadeath)
If a ship is destroyed or trapped: Loot is wiped; the 40-card deck is locked as MIA.
•	MIA Occupancy: MIA Ships occupy a slot until resolved via Pay Salvage (Credits) or Scrap (permanent deletion).
4.2. Hull and Drone Damage Protocol
Maintenance is the primary Credit Sink driving the loop.
Component	Condition	Consequence of NOT Repairing
Ship Hull	Damage remains from the previous run.	Player deploys at lower maximum health for the next run.
Drone Card	Marked "Damaged" if Hull < 50% upon extraction.	The Damaged Drone Card cannot be included in the 40-card TCG deck until the repair fee is paid. Must be swapped or removed.
4.3. Crafting and Acquisition
•	Replicator: Used to duplicate single copies of Asset Cards. Cost scales with card rarity.
________________________________________
V. Mechanics: Dynamic Difficulty (Instability Only)
5.1. Instability Level (The Sole Dynamic Timer)
Instability starts at 0% and caps at 100%.
•	Triggers: Movement (+1% per Hex), Looting (+10%), Combat (+20%), Time (+5% per Turn).
•	Ambush Formula: Total Risk = PoI Base Security + Current Instability Level.
5.2. The Response Curve (Instability Governed)
Instability dictates enemy quality and the risk profile of the entire sector.
Instability Level	Dominant Enemy Type / Security Level	Action/Risk Trigger
0% – 49%	Scout Drones, Patrol Frigates (Standard Tier Threat)	Standard risk profile.
50% – 79%	Heavy Cruisers, Specialised Hunter Groups	Threat Escalation: AI patrol groups and PoI security are swapped for high-tier enemy decks.
80% – 100%	Blockade Fleets	Blockades appear on all remaining gates. Extraction is highly dangerous.
________________________________________
VI. Technical Specification: The Map
6.1. Topology: "The Eye of the Storm"
•	Waypoint Pathing UI: The UI must pre-calculate and display the cumulative total of Instability increase, factoring in all static terrain hazards and environmental costs along the plotted route.
Tier	Name	Radius (Hexes)	Gates	PoI Count	Entry Cost
1	The Shallows	5 (Small)	3	6–8	Free
2	The Deep	8 (Medium)	4	12–15	Credits
3	The Core	12 (Large)	5	20–25	Tokens
________________________________________
VII. Loot, Packs, and Narrative
7.1. Pack Types and Acquisition
•	Standard PoIs: Drop guaranteed Pack Types (Ordnance, Support, Tactical (3 cards max), or Upgrades (1 card max)).
•	AI Salvage: Defeating an AI yields 3 random cards from the enemy's deck (+ rare chance for an enemy Drone or Ship Blueprint).
•	Token Utility: Security Bypass Tokens also unlock low-difficulty, high-loot "Hidden Cache" maps.
7.2. PoI Flavour Mandate
•	Abstraction Rule: Flavour Text must logically link the PoI location to the loot's function (Fittings/Data).
________________________________________
VIII. Final PoI Catalogue (Thematically Generalised)
PoI Name	Flavour Text (Fittings/Data Focus)	Loot Category
Munitions Storage Depot	Contains schematics for high-yield weaponry.	Ordnance
Auxiliary Energy Hub	Contains maintenance schematics for automated hull patching.	Support
Navigation Data Wreck	Its flight logs contain advanced evasive vector algorithms.	Tactical
Industrial Fabrication Unit	Contains component fragments for permanent system improvements.	Upgrade
Sector Financial Ledger	Hacking the ledger data yields the last day's receipts.	Credit Payout
Contraband Intercept Point	Contains the encrypted access codes to the storage units.	Security Bypass Token Chance
________________________________________
 
Final End-to-End Gameplay Walkthrough (PRD v3.0)
Phase 1: Hangar Preparation and Dispatch
Step	Action	Consequence/Cost	PRD Mechanic
1.	Player accesses the Deck Creation Screen and confirms the Stealth Frigate deck is valid (no MIA decks, no Damaged Drones).	Hull: 100%. Credits: 700.	Deck Validation
2.	Player chooses the Tier 2: The Deep map.	Cost: 100 Credits.	Map Entry Cost
3.	Player plots the path to the Insertion Gate. The UI shows the path has an initial 8% Instability cost.	Instability starts high.	Waypoint Pathing UI
Phase 2: Tactical Insertion
Step	Action	Current State	PRD Mechanic
4.	The ship warps in via the North Gate.	Instability: 0%. Hull: 100%. Threat: Patrol Frigates.	Starting Condition
5.	The North Gate immediately powers down.	The only exit options are the three remaining gates.	Gate Destabilization
Phase 3: The Delve and Threat Escalation
The player seeks two high-value PoIs, pushing Instability into the danger zone.
Step	Action	Instability Rise	PRD Mechanic
6.	Player moves 4 Hexes toward the first PoI.	Instability: 8%.	Movement Cost
7.	Player lands on PoI 1: Auxiliary Energy Hub (Base Security: 20%). Ambush Risk: 28%. Player fails the roll. Combat Triggered.	Instability: 28% (+20% for combat). Hull drops to 85%.	Ambush Formula
8.	Player moves 5 Hexes toward a Blueprint PoI near the map centre.	Instability: 38%.	Time Pressure
9.	Player lands on PoI 2: Industrial Fabrication Unit (Base Security: 30%). Ambush Risk: 68%. Player fails the roll. Combat Triggered.	Instability: 58% (+20% for combat). Hull drops to 45%.	Crossing the Threshold
10.	Threat Escalation: Instability crossed the 50% threshold during movement/combat. Enemy AI changes from Patrol Frigates to Heavy Cruisers.	Instability: 58%. Threat: Heavy Cruisers.	Instability Escalation
Phase 4: High-Risk Extraction
The player sees the low Hull (45%) and high Instability (58%) and prioritises immediate extraction over the Blueprint loot.
Step	Action	Consequence/Roll	PRD Mechanic
11.	Player plots a path of 7 Hexes toward the nearest exit.	Instability: 72%.	High Instability Cost
12.	Player clicks 'Extract' at the West Gate. The game rolls against the 72% Instability level. Roll Fails.	Blockade Fleet Engages.	Extraction Blockade Check
13.	Blockade Fight: Player defeats the specialized Blockade Fleet (Heavy Cruisers). Hull takes severe damage.	Instability: 92% (+20% for combat). Hull drops to 20%.	Final Challenge
Phase 5 & 6: Post-Run Maintenance and Loop Reset
The run was a success, but the cost of survival is high.
Step	Action	Consequence/Cost	PRD Mechanic
14.	Loot Banking: Player banks 250 Credits and 2 Ordnance Packs.	Credits: 700 - 100 (Entry) + 250 (Loot) = 850 Credits.	Run Success
15.	Hull Integrity Check: Hull is 20% (< 50%).	Drone Damage Protocol Triggered!	Drone Damage Check
16.	Hangar Consequence: The Rare Drone Card is marked "Damaged."	Drone Card is unable to be deployed during the deployment phase during the next run.	TCG Component Lock
17.	Maintenance Sinks: Player must now pay: 200 Credits (Hull Repair) + 150 Credits (Rare Drone Repair).	Total Sinks: 350 Credits. Remaining Credits: 500.	Credit Sinks
18.	Loop Reset: The player repairs fully and opens the packs, now ready for the next run, having spent all the profits on maintenance.	All systems restored. Player's net gain was 0, but they secured 2 valuable Asset Packs.	Friction Loop Closure
________________________________________
This walkthrough confirms that the final ruleset is cohesive: the player is strongly incentivized to manage Instability and Hull damage, as the post-run maintenance costs directly offset profits, reinforcing the core risk/reward loop.


