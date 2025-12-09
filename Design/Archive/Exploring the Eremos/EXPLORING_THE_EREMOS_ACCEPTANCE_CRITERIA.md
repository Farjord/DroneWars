# Master Acceptance Criteria: Exploring the Eremos
**Version:** 5.0 (Merged Final)
**Scope:** Complete End-to-End Game Loop
**Date:** 2025-11-23

---

## 1. System Architecture: Persistence & Slots

### 1.1 Save State Logic
* **AC-SYS-1.1.1:** The Game State must **only** be serializable (Savable) when `Current_Scene == HANGAR`. Saving during a Run (Map/Combat) is disabled.
* **AC-SYS-1.1.2:** The `Save_File` JSON object must serialize:
    * `Player_Profile`: (Credits, Tokens, Unlocked_Blueprints_List).
    * `Inventory`: (Dictionary of `Card_ID` : `Quantity_Owned`).
    * `Ship_Slots`: (Array of Deck Objects including `Status` flags). * (Note that these are only the ships that the player has created themselves)
* **AC-SYS-1.1.3:** Save files will be downloaded locally for the time being as encrypted files. Players will be able to save and load these files. 
* **AC-SYS-1.1.4:** **Run State:** Upon entering a Map, a temporary `Run_State` object is created. If the application closes unexpectedly while `Run_State` is active, the next launch triggers the **MIA Protocol**.
* **Rationale:** Prevents "Save Scumming" to maintain the high-stakes integrity of the extraction loop.


### 1.2 Ship Slot Management
* **AC-SYS-1.2.1:** The player profile initializes with **4 Ship Slots** to start off with, with a further 2 purchaseable. 
* **AC-SYS-1.2.2:** **Slot 0 (Default):** Hardcoded to the "Starter Deck" configuration. Immutable. Cannot be MIA.
* **AC-SYS-1.2.3:** **MIA Locking:** If `Deck.Status == MIA`, the associated Slot Index is locked. The "Create New Deck" action is disabled for this index.
* **AC-SYS-1.2.4:** **Scrap Action:** Executing `Scrap(Slot_ID)` must:
    1.  Remove all Asset Cards associated with that Deck ID from the `Player_Inventory`.
    2.  Set `Slot_ID` to `Empty/Available`.
* **Rationale:** Creates inventory friction. Losing ships limits future options, forcing players to deal with failure (Salvage or Scrap).
* **AC-SYS-1.2.5:** **New Ship:** When creating a new 'Ship', Players can either start with a blank slate, or with a copy of the default deck (they may only want to tweak a few cards, for example)
---

## 2. Economy & Crafting Logic

### 2.1 Currency & Costs
* **AC-ECO-2.1.1:** **Map Entry Costs:**
    * Tier 1: **0 Credits** (Safety Net).
    * Tier 2: **100 Credits** (Variable Config).
    * Tier 3: **1 Security Bypass Token**.
* **AC-ECO-2.1.2:** **Replicator (Card Duplication):**
    * *Validation:* Input `Card_ID` is valid ONLY if `Inventory[Card_ID] >= 1`.
    * *Cost:* Common (50), Uncommon (150), Rare (400), Mythic (1000).
    * *Output:* Increment `Inventory[Card_ID]` by 1.

### 2.2 Maintenance Sinks (The Friction)
* **AC-ECO-2.2.1:** **Hull Repair:**
    * Formula: `Cost = (Max_Hull - Current_Hull) * Cost_Per_HP`.
  **AC-ECO-2.2.2.:** **Drone Repair:**
    * Input: Check `Deck.Drone_Card.Status`. If `Damaged`, enable "Repair" button.
    * Cost: Flat fee based on Drone Rarity.
    * Output: Clear `Damaged` flag; set `Drone_Card.Is_Deployable = True`.
* **Rationale:** Ensures that "Victory with heavy damage" is still a net resource loss, discouraging reckless play.

---

## 3. Deck Creation (TCG Constraints)

### 3.1 Validation Rules
* **AC-DK-3.1.1:** **Deck Size:** A valid deck must contain exactly **40 Asset Cards**.
* **AC-DK-3.1.2:** **Card Limits:**
    * Max copies per `Card_ID` in deck is equal to the number stated in the cardData.js
* **AC-DK-3.1.3:** **Drone Inclusion:** Compared to Multiplayer, where players select 10 drones, of which they select 5, in single player they will only select 5. This means that they always start with their preferred drones. 
* **AC-DK-3.1.4:** **Drone Exclusion:** If `Drone_Card.Status == Damaged`, it can be included in the deck, but it is excluded from being able to be deployed during the round. 
* **AC-DK-3.1.5:** **Drone Card Persistance:** Each Drone card will need to be uniquely presisted. This is so that the 'Damaged' status can be stored against them, as well as other upgrades that may apply to a specific card as well. For example, you may have two scout drones. One may be damaged, one may not be. 
* **AC-DK-3.1.6:** **Invalid State:** Users can save a deck with < 40 cards (`Deck.IsValid = False`), but the **Deploy** button is disabled for that deck. (This allows players to tweak decks or remove cards from them without having to completey destory the deck)
* **Rationale:** Enforces TCG rarity balance while allowing Quality of Life (saving work-in-progress decks).

---

## 4. Procedural Map Generation

### 4.1 Topology & Grid
* **AC-MAP-4.1.1:** Generate Hex Grid using axial coordinates `(q, r)` with `(0,0)` as the center.
* **AC-MAP-4.1.2.:** **Radius Scaling:** : Maps and Radius scaling must be defined within its own mapData.js file so that the values can be tweaked. As a starting point:
    * `Tier_1`: Radius 5.
    * `Tier_2`: Radius 8.
    * `Tier_3`: Radius 12.
* **AC-MAP-4.1.3:** **Zoning:** Assign hexes to Zones based on distance from Center:
    * `Zone_Core` (0-40%), `Zone_Mid` (41-80%), `Zone_Perimeter` (81-100%).

### 4.2 Entity Placement
* **AC-MAP-4.2.1:** **Gate Placement:** Spawn `Gate_Count` (3, 4, or 5 based on Tier) in `Zone_Perimeter`, spaced equidistantly (e.g., 360° / Count).
* **AC-MAP-4.2.2:** **PoI Clustering:** 70% of PoIs must spawn in `Zone_Core`.
* **AC-MAP-4.2.3:** **Anti-Cheese:** No PoI may spawn within **3 Hexes** of a Gate.
* **AC-MAP-4.2.4:** **Spacing:** Minimum distance of **2 Hexes** between PoIs (unless 5% `Twin_Node` chance).
* **AC-MAP-4.2.5:** **Code:** Map generation is its own mapCreation.js file, and all logic to generate maps is within it. 

### 4.3 Path Validation (A*)
* **AC-MAP-4.3.1:** Run Pathfinding: `Start_Gate` -> `Nearest_PoI` -> `Furthest_Gate`.
* **AC-MAP-4.3.2:** Calculate `Path_Cost = (Hex_Count * Instability_Per_Hex)`.
* **AC-MAP-4.3.3:** If `Path_Cost > 70` (70% of Max Instability), the map is **Rejected** and regenerated.
* **Rationale:** Mathematical guarantee that a run is possible. Leaving a 30% buffer accounts for combat delays and player detours.
* **AC-MAP-4.3.4:** **Code:** Map validations is in the mapCreation .js file. 
---
## 5. Gameplay Loop: Instability & Threat

### 5.1 Tactical Insertion & Gate Logic
* **AC-GAME-5.1.1:** **Entry Lock:** Upon Warp-In, the Gate ID used for Insertion is flagged `Is_Active = False`. All other Gates are `True`.
* **AC-GAME-5.1.2:** Clicking an Inactive Gate does **not** trigger extraction.
* **Rationale:** Forces traversal. Players cannot spawn, loot, and leave through the same door.

### 5.2 The Instability Meter (Hard Timer)
* **AC-GAME-5.2.1:** Initialize `Instability = 0.0`.
* **AC-GAME-5.2.2:** **Triggers:**: These values are also stored in the mapData.js file, and definable for each type of map. 
    * `On_Move`: +X% (Tier Scaled, ~1.5 - 3.0).
    * `On_Salvage`: +10% Flat.
    * `On_Combat_End`: +20% Flat.
* **AC-GAME-5.2.2:** **Threshold:** If `Instability >= 100.0`, trigger `Game_Over(MIA)`.

### 5.3 Dynamic Threat Scaling (The Response Curve)
* **AC-GAME-5.3.1:** **Enemy Deck Selection:** When initiating combat, query `Current_Instability`:
    * `0 - 49%`: Select from `Table_Frigate`.
    * `50 - 79%`: Select from `Table_Cruiser`.
    * `80%+`: Select from `Table_Blockade`.
* **Rationale:** Punishes loitering. The longer you stay, the harder the enemies become.
* **AC-GAME-5.3.2:** **Code:** These lookup values are also stored in the mapData.js file, and definable for each type of map. The AI type will be looked up from aiData.js.

### 5.4 Ambush Logic
* **AC-GAME-5.4.1:** Combat never triggers on empty hexes (unless Hunter Intercept).
* **AC-GAME-5.4.2:** **PoI Formula:** `Roll = Random(0, 100)`. `Risk_Threshold = PoI.Base_Security + Current_Instability`.
    * If `Roll < Risk_Threshold`: Transition to Combat Scene.
    * If `Roll >= Risk_Threshold`: Open Loot UI directly.

---

## 6. Combat & Extraction Resolution

### 6.1 Extraction Blockade
* **AC-EXT-6.1.1:** On "Extract" click at an Active Gate, perform **Ambush Check** (See AC-GAME-5.4.1) using `Instability` as the modifier.
    * *Fail:* Trigger Combat (Blockade Table).
    * *Pass:* Trigger Success State.

### 6.2 Post-Run Logic (Drone Damage Protocol)
* **AC-EXT-6.2.1:** **Condition:** Per Ship section, if that section is Damaged:
* **AC-EXT-6.2.2:** **Selection:** Randomly select 1 `Card_ID` from `Deck.Drone_Slots`.
* **AC-EXT-6.2.3:** **Flagging:** Set `Inventory[Selected_Drone_ID].Status = Damaged`.
* **AC-EXT-6.2.4:** **Loot Commit:** Move contents of `Run_Inventory` to `Player_Inventory`.
* **Rationale:** The critical "Soft Punishment." You kept your loot, but your gear is broken.

---

## 7. Loot System & Data Structure

### 7.1 Pack Logic
* **AC-LOOT-7.1.1:** **Pack Objects:** Packs are inventory items with a `Tier` and `Type`.
* **AC-LOOT-7.1.2:** **Opening Generation:** Card backs have their own cardPackData.js file where the types and weightings are controlled. Ordnance packs will have a higher chance of Ordnance cards, but not guaranteed, for example. Each pack will have a random number of credits as well. 
    * Input: `Pack_Type` (e.g., Ordnance).
    * Query: `Card_Database` where `Role == Ordnance` AND `Rarity` matches Tier weights.
        * Card number (random between 1 & 3)
        * *Tier 1:* 90% Common / 10% Uncommon.
        * *Tier 2:* 60% Common / 35% Uncommon / 5% Rare.
        * Credits - between 10 & 100
    * Output: Up to 3 distinct Card IDs.

### 7.2 Combat Salvage
* **AC-LOOT-7.2.1:** **Scavenger Logic:** Upon winning combat, randomly select **3 Card IDs** from the defeated `Enemy_Deck_List`.
* **AC-LOOT-7.2.2:** **Blueprint Roll:** Random(0, 100). If Result == 100 (1% Chance), add `Enemy_Ship_Blueprint` to rewards.

### 7.3 PoI Definitions (Data Mapping):
* **AC-POI-7.3.0:** All PoIs will be defined in pointsOfInteresData.js file. This will detail the name of the PoI, the types of rewards that it will give (Packs, Specific Card, Blueprint, Credits), as well as the encounter chance and whether there is a boss there. mapData.JS will refernce which PoIs can be generated in the Map. 
* **AC-POI-7.3.1:** **Ordnance Nodes:** (Name: "Munitions Depot", Loot: Ordnance Pack).
* **AC-POI-7.3.2:** **Support Nodes:** (Name: "Auxiliary Energy Hub", Loot: Support Pack).
* **AC-POI-7.3.3:** **Tactical Nodes:** (Name: "Navigation Wreck", Loot: Tactical Pack).
* **AC-POI-7.3.4:** **Upgrade Nodes:** (Name: "Fabrication Unit", Loot: Upgrade Pack).
* **AC-POI-7.3.5:** **Boss Nodes:** (Name: "Fleet Command", Loot: Guaranteed Blueprint).
* **AC-POI-7.3.6:** **Flavour Text:** Must refer to **Physical Fittings** or **AI Data**, not "Cards."

## 8.0 UI/UX & Design Mandate 

### 8.1 Hangar UI: The Galaxy Map View
* **AC-UI-8.1.1:** The Hangar UI must be centered around a **large, interactive Galaxy Map** display.
* **AC-UI-8.1.2:** The Galaxy Map must visually represent all available Jump Gate entry points (Map Tiers 1, 2, and 3).
* **AC-UI-8.1.3:** Each map entry point must be visually distinct on the Galaxy Map, clearly indicating its Tier and required entry currency (Credits/Tokens).
* **AC-UI-8.1.4:** Clicking a Map entry point on the Galaxy Map must trigger the **Map Overview Modal** (See 8.2).
* **AC-UI-8.1.5:** **Ancillary Hangar Functions** (Deck Editor, Replicator, Repair Bay) must be positioned around the central Galaxy Map, maintaining the user's focus on mission selection.
* **Rationale:** Establishes the Hangar as the primary decision hub, emphasizing the risk/reward selection before deployment.

### 8.2 Pre-Deployment UI: Map Overview Modal
* **AC-UI-8.2.1:** The Map Overview Modal must display a low-detail visual representation of the chosen map's topology.
* **AC-UI-8.2.2:** The Overview must include:
    * The **Hex Grid** structure.
    * All **Gate** locations.
    * All **PoI node** locations.
    * The **Entry Cost** (Currency deduction).
* **AC-UI-8.2.3** **Low-Detail Constraint:** The Map Overview must **NOT** display the following information, reserving it for the tactical run:
    * Specific Instability cost per hex.
    * PoI Ambush Risk percentages.
    * Specific loot card names/types.
    * Roaming Hunter AI paths/positions.
* **AC-UI-8.2.4:** The Modal must contain the "Deploy" button, which is disabled if the player lacks the required currency or if the active deck is invalid (AC-DK-04).
* **Rationale:** Provides high-level strategic data (topology, clustering) without revealing critical tactical information, reinforcing the low-detail preview concept.

### 8.3 In-Run Map HUD Interface
* **AC-UI-8.3.1:** **Instability Meter:** The meter must be prominently displayed on the HUD. It must be dynamically color-coded: **Green** (0-49%), **Yellow** (50-79%), **Red** (80-100%).
* **AC-UI-8.3.2:** Hull Integrity status must be displayed numerically and via a color-coded bar near the main Ship status panel.
* **Rationale:** The HUD must provide perfect information regarding risk and state health, especially the Instability timer, which is the core threat element.

### 8.4 Waypoint Movement
* **AC-UI-8.1.1:** Clicking a target Hex must render a path line.
* **AC-UI-8.1.2:** A modal popup must display the **Total Calculated Instability Cost** of the path (e.g., "Path Cost: +12%"), as well as the potential chance of an encounter, the flavour text of the location, the picture of the location, the potential rewards, as well as confirm / decline options to close the modal. 
* **Rationale:** Players should die because of bad decisions, not bad math. Perfect information on movement costs is mandatory.

### 8.5 Map Overview Modal
* **AC-UI-8.2.1:** Must display Hex Grid, Gates, and PoI locations.
* **AC-UI-8.2.2:** PoIs must display **Loot Category** (e.g., "Ordnance") but **HIDE** specific rewards and exact Ambush % and instead state the threat as being low, medium, high (<=10%, <= 25%, >25%) (Remember, this does NOT factor in the current stability either)