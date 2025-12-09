# AI Card Appraisal Guide

This document describes how the AI evaluates each card in the game. Cards marked "No AI Logic" will score 0 or negative and the AI will not play them effectively.

---

## UNIFIED TARGET SCORING SYSTEM

All damage and destroy cards now use a unified `calculateTargetValue()` function. This ensures consistent target prioritization across all card types and drone attacks.

### Priority Order (Flat Additive Bonuses)

| Priority | Factor | Bonus | Description |
|----------|--------|-------|-------------|
| 1 | Jammer Blocking | +30 base + protected value | Ready Jammers protecting other drones |
| 2 | Interception Blocker | +40 per attacker blocked | Enemy drones that can intercept our ship attackers |
| 3 | Ready State | +25 | Ready drones more threatening than exhausted |
| 4 | Threat Value | Class + Attack + Ability | See breakdown below |
| 5 | Damage Efficiency | +20 Lethal, +5 Piercing | Tiebreakers for optimal targeting |

### Threat Value Breakdown

| Factor | Bonus |
|--------|-------|
| Class 0 | +0 |
| Class 1 | +3 |
| Class 2 | +6 |
| Class 3 | +10 |
| Attack 0-1 | +0 |
| Attack 2-3 | +4 |
| Attack 4+ | +8 |
| GUARDIAN ability | +15 |
| DEFENDER ability | +12 |
| Anti-Ship ability | +10 |

### Example Calculations

```
Ready Class 2, Attack 3 drone:
  Ready: +25
  Class 2: +6
  Attack 2-3: +4
  = 35 base target value

Same drone blocking 2 attackers:
  Base: 35
  Interception Blocker: +80 (2 × 40)
  = 115 target value

Jammer protecting 2 Class 2 ready drones:
  Jammer Base: +30
  Protected value: (2 × 6) + (2 × 10) = +32
  = 62 bonus from Jammer status alone
```

---

## AI CONSTANTS REFERENCE

### Target Scoring Constants (NEW)

| Constant | Value | Used For |
|----------|-------|----------|
| JAMMER_BLOCKING_BASE | 30 | Jammer protection bonus |
| INTERCEPTION_BLOCKER_BONUS | 40 | Per friendly attacker blocked |
| READY_TARGET_BONUS | 25 | Ready vs exhausted |
| CLASS_0/1/2/3_BONUS | 0/3/6/10 | Target class value |
| LOW/MED/HIGH_ATTACK_BONUS | 0/4/8 | Target attack value |
| GUARDIAN_ABILITY_BONUS | 15 | Guardian keyword threat |
| DEFENDER_ABILITY_BONUS | 12 | Defender keyword threat |
| ANTI_SHIP_ABILITY_BONUS | 10 | Bomber-type threat |
| LETHAL_BONUS | 20 | Kill confirmed |
| PIERCING_BYPASS_BONUS | 5 | Shields ignored |

### General Constants

| Constant | Value | Used For |
|----------|-------|----------|
| COST_PENALTY_MULTIPLIER | 4 | All card costs |
| GO_AGAIN_BONUS | 40 | Go-again cards |
| SECTION_HEAL_VALUE | 80 | Ship healing |
| SHIELD_HEAL_VALUE_PER_POINT | 5 | Shield restore |
| GROWTH_MULTIPLIER | 8 | Gladiator per +1 stat |
| MARK_ENEMY_VALUE | 15 | Scanner deployment bonus |
| OVERFLOW_SHIP_DAMAGE_MULTIPLIER | 12 | Railgun overflow damage |
| MULTI_HIT_BONUS | 15 | Per additional target hit |
| INTERCEPTION_COVERAGE_MULTIPLIER | -5 | Per threat point of blocked enemies |
| INTERCEPTION_COVERAGE_MIN | -10 | Minimum coverage loss penalty |

---

## ORDNANCE CARDS

All ordnance cards now use the **Unified Target Scoring** system. The formula is:
```
Score = calculateTargetValue(target, context, { damageAmount, isPiercing, lane }) - (Cost × 4)
```

### CARD001 - Laser Blast
Targets any drone. Uses unified scoring with 1 damage.
```
Score = TargetValue(damage=1) - (1 × 4)
Example: Ready Class 1 drone = Ready(25)+Class(3)+Atk(4) = 32 - 4 = 28
         If lethal: +20 lethal bonus
```

### CARD001_ENHANCED - Laser Blast+
Same as Laser Blast with 2 damage.
```
Score = TargetValue(damage=2) - (2 × 4)
```

### CARD009 - Target Lock
Destroys marked enemy. Uses unified scoring with lethal guaranteed.
```
Score = TargetValue(damage=999) - (3 × 4)
Always includes +20 lethal bonus
```

### CARD010 - Shrieker Missiles
Destroys fast drones (speed >= 5) in lane. Sums unified target values.
```
Score = SUM(TargetValue for each drone WHERE Speed >= 5) - (5 × 4)
```

### CARD011 - Nuke
Destroys ALL drones in lane. Compares unified enemy vs friendly loss.
```
EnemyValue = SUM(TargetValue) for enemy drones (always lethal)
FriendlyValue = old formula for friendlies
Score = EnemyValue - FriendlyValue - (8 × 4)
```

### CARD012 - Piercing Shot
Piercing damage ignores shields. Unified scoring with isPiercing=true.
```
Score = TargetValue(damage=2, piercing=true) - (4 × 4)
Includes +5 piercing bypass bonus if target has shields
```

### CARD012_ENHANCED - Piercing Shot+
Same formula, lower cost.
```
Score = TargetValue(damage=2, piercing=true) - (3 × 4)
```

### CARD013 - Sidewinder Missiles
Damages slow drones (speed <= 3). Multi-hit bonus for multiple targets.
```
TargetsHit = COUNT(drones WHERE Speed <= 3)
Score = SUM(TargetValue for each hit) + (TargetsHit × 15) - (3 × 4)
```

### CARD031 - Railgun Strike
Piercing overflow damage. Kills drone, excess damages ship section.
```
TotalDamage = 2 + IF(marked: 2)
Score = TargetValue(damage=TotalDamage, piercing=true)
      + IF(overflow > 0): (Overflow × 12)
      - (5 × 4)
```

### CARD032 - Barrage
Splash damage to target and adjacent drones. Bonus damage if 3+ friendly drones in lane.
```
BonusDamage = IF(FriendlyCount >= 3): +1
EffectiveDamage = 1 + BonusDamage
PrimaryScore = TargetValue(damage=EffectiveDamage)
SplashScore = SUM(TargetValue for adjacent)
MultiHitBonus = TargetsHit × 15
Score = PrimaryScore + SplashScore + MultiHitBonus - (4 × 4)
```

### CARD033 - Finishing Volley
Destroys exhausted enemy drone. Unified scoring (always lethal).
```
Score = TargetValue(damage=999) - (2 × 4)
Note: Target is exhausted so no Ready bonus (+0)
```

### CARD034 - Strafe Run
Damages up to 3 enemies in lane. Multi-hit bonus.
```
TargetsHit = MIN(3, EnemyCount)
Score = SUM(TargetValue for each hit) + (TargetsHit × 15) - (3 × 4)
```

### CARD035 - Overwhelming Force
Damage scales with ready friendly drones in lane.
```
Damage = COUNT(ready friendly drones in lane)
Score = TargetValue(damage=Damage) - (2 × 4)
```

### CARD036 - Purge Protocol
Destroys all marked enemies. Sums unified target values.
```
Score = SUM(TargetValue(damage=999) for each marked) - (7 × 4)
```

### CARD038 - Particle Whip
Light damage with go-again.
```
Score = TargetValue(damage=1) + 40 - (1 × 4)
```

### CARD039 - Thermal Lance
Basic damage card.
```
Score = TargetValue(damage=2) - (2 × 4)
```

### CARD039_ENHANCED - Thermal Lance+
Higher damage version.
```
Score = TargetValue(damage=3) - (3 × 4)
```

---

## CONDITIONAL ORDNANCE CARDS

These cards have conditional effects that are now evaluated by the AI.

### CARD050 - Scavenger Shot
Damage with draw-on-destroy. POST conditional evaluated by predicting kill.
```
BaseScore = (2 × 8) + IF(lethal: Class × 15 + 50) - (2 × 4)
IF damage >= (shields + hull):
  POST ON_DESTROY triggers → DrawBonus = 1 × 10 = 10
Score = BaseScore + DrawBonus
```

### CARD051 - Finishing Blow
Bonus damage against low-hull targets. PRE conditional evaluated.
```
BaseScore = (2 × 8) - (3 × 4)
IF Hull <= 2:
  ConditionalBonus = 2 × 8 = 16
Score = BaseScore + ConditionalBonus
```

### CARD052 - Opportunist Strike
Bonus damage against marked targets. PRE conditional evaluated.
```
BaseScore = (2 × 8) - (4 × 4)
IF TARGET_IS_MARKED:
  ConditionalBonus = 2 × 8 = 16
Score = BaseScore + ConditionalBonus
Note: POST conditionals (energy, goAgain on destroy) not pre-scored
```

### CARD053 - Executioner
Destroys weak drones. PRE conditional DESTROY evaluated.
```
BaseScore = (0 × 8) - (2 × 4) = -8
IF Hull < 2:
  ConditionalBonus = (Hull + Shields) × 8 + (Class × 15 + 50)
Score = BaseScore + ConditionalBonus
Example: 1-hull drone → -8 + 73 = 65
```

### CARD054 - Energy Leech
Damage with energy gain. POST conditional evaluated (always triggers on damage).
```
BaseScore = (1 × 8) + IF(lethal: Class × 15 + 50) - (2 × 4)
POST ON_DAMAGE always triggers → EnergyBonus = 3 × 5 = 15
Score = BaseScore + EnergyBonus
```

---

## SUPPORT CARDS

### CARD002 - System Reboot
Draw cards with go-again. Scores based on remaining energy.
```
IF EnergyAfter > 0:
  Score = 10 + (EnergyAfter × 2)
ELSE:
  Score = 1
```

### CARD002_ENHANCED - System Reboot+
Same formula (draws 3 instead of 2).
```
Score = 10 + (EnergyAfter × 2) OR 1
```

### CARD003 - Out Think
Simple draw card.
```
Score = 10 + ((Energy - 1) × 2) OR 1
```

### CARD004 - Energy Surge
Gain energy. Scores high if enables expensive cards.
```
ProjectedEnergy = Energy - 1 + 2
IF enables new cards:
  Score = 60 + (MostExpensiveEnabled × 5)
ELSE:
  Score = 1
```

### CARD004_ENHANCED - Energy Surge+
Same formula, gains 3 energy.
```
Score = 60 + (MostExpensiveEnabled × 5) OR 1
```

### CARD006 - Nanobot Repair
Restores hull to a friendly drone with go-again.
```
HullToHeal = MIN(3, MaxHull - CurrentHull)
Score = HullToHeal × 8 + 40 (go-again)
```

### CARD007 - Emergency Patch
Heals ship section hull. Fixed score.
```
Score = 80
```

### CARD007_ENHANCED - Emergency Patch+
Same fixed score.
```
Score = 80
```

### CARD008 - Shield Recharge
Heals shields on all friendly drones in lane.
```
ShieldsToHeal = MIN(2, MaxShields - CurrentShields)
Score = ShieldsToHeal × 5
```

### CARD018 - Desperate Measures
Repeating effect. More damaged sections = more value.
```
RepeatCount = 1 + COUNT(damaged or critical sections)
Score = (RepeatCount × 25) - (1 × 4)
```

### CARD025 - Strategic Planning
Search top 5, draw 1.
```
Score = (1 × 12) + (5 × 2) + (EnergyAfter × 2)
```

### CARD026 - Equipment Cache
Search deck for Upgrade. Note: Filter not evaluated.
```
Score = (1 × 12) + (999 × 2) + (EnergyAfter × 2)
```

### CARD037 - Shield Boost
Restore shields to ship section. Scores based on actual restoration.
```
MissingShields = MaxShields - AllocatedShields
ShieldsToRestore = MIN(2, MissingShields)
Score = ShieldsToRestore × 5
```

### CARD037_ENHANCED - Shield Boost+
Same formula, higher restore value.
```
ShieldsToRestore = MIN(3, MissingShields)
Score = ShieldsToRestore × 5
```

---

## TACTIC CARDS

### CARD005 - Adrenaline Rush
Ready exhausted drone. Complex multi-factor evaluation.
```
ShipAttackValue = IF(no GUARDIAN): (Attack + BonusShipDmg) × 8
DroneAttackValue = Attack × 8 × EnemyCount
InterceptionValue = ThreatsCanBlock × 20
KeywordBonus = IF(DEFENDER: +40) + IF(GUARDIAN: +30)
LaneImpact = (ProjectedScore - CurrentScore) × 1.5
LaneFlipBonus = IF(flips negative to positive: +30)
Score = All above - (2 × 4)
```

### CARD005_ENHANCED - Adrenaline Rush+
Same with go-again.
```
Score = [All above] + 40 - (3 × 4)
```

### CARD014 - Overcharge
Buff friendly attack +2.
```
IF Exhausted: Score = -1
ELSE:
  Score = (Class × 10) + (2 × 8) - (1 × 4)
```

### CARD015 - Streamline
Permanent +1 speed to all in lane. Go-again.
```
LaneImpact = (Projected - Current) × 1.5
MultiBuffBonus = ActiveDrones × 10
Score = (LaneImpact + MultiBuffBonus) × 1.5 + 40 - (2 × 4)
```

### CARD016 - Static Field
Debuff enemy attack -2. Go-again.
```
IF Exhausted: Score = -1
ELSE:
  Score = (EnemyAttack × 8) + 40 - (2 × 4)
```

### CARD017 - Boosters
Speed buff +2.
```
IF Exhausted: Score = -1
ELSE IF overcomes interceptors:
  Score = 60 - (1 × 4)
ELSE:
  Score = 20 - (1 × 4)
```

### CARD019 - Reposition
Moves up to 3 drones from one lane to other lanes. Scores based on flexibility.
```
AvailableMoves = MIN(DronesInLane, 3)
FlexibilityValue = AvailableMoves × 15
ReadyBonus = IF(DO_NOT_EXHAUST): AvailableMoves × 10
Score = FlexibilityValue + ReadyBonus - (Cost × 4)
```

### CARD022 - System Sabotage
Destroys an enemy upgrade. Scores based on upgrade value.
```
IF attack upgrade: Score = value × 20
IF speed upgrade: Score = value × 10
IF keyword upgrade: Score = 25
Score = UpgradeValue - (1 × 4)
```

### CARD023 - Maneuver
Move drone without exhaust.
```
ToLaneImpact = ProjectedTo - CurrentTo
FromLaneImpact = ProjectedFrom - CurrentFrom
OnMoveBonus = IF(has ability): (attackMod × 15) + (speedMod × 10)
Score = ToLaneImpact + FromLaneImpact + OnMoveBonus - (0 × 4)
```

### CARD023_ENHANCED - Maneuver+
Same with go-again.
```
Score = TotalImpact + OnMoveBonus + 40 - (1 × 4)
```

### CARD030 - Deploy Jammers
Create Jammers in all lanes. Scales by available lanes.
```
AvailableLanes = COUNT(lanes without Jammer)
ScalingFactor = AvailableLanes / 3
BaseScore = 30
CPUBonus = TotalFriendlyCPU × 5
HighValueBonus = COUNT(class >= 3) × 15
Score = (30 + CPUBonus + HighValueBonus - 20) × ScalingFactor
```

---

## CONDITIONAL TACTIC CARDS

These movement cards have conditional effects that ARE evaluated by the AI.

### CARD060 - Swift Maneuver
Move with conditional go-again. PRE conditional evaluated via TARGET_STAT_GTE.
```
BaseScore = MoveImpact - (1 × 4)
IF drone speed >= 5:
  ConditionalBonus = GO_AGAIN_BONUS = +40
Score = BaseScore + ConditionalBonus
```

### CARD061 - Tactical Shift
Move with conditional draw. PRE conditional evaluated via OPPONENT_HAS_MORE_IN_LANE.
```
BaseScore = MoveImpact - (1 × 4)
IF opponent has more drones in destination lane:
  ConditionalBonus = DRAW_BASE_VALUE = +10
Score = BaseScore + ConditionalBonus
```

### CARD062 - Assault Reposition
Move with conditional attack buff. POST conditional evaluated via TARGET_STAT_LTE.
```
BaseScore = MoveImpact - (2 × 4)
IF drone attack <= 3:
  ConditionalBonus = MODIFY_STAT (+1 attack) = +16
Score = BaseScore + ConditionalBonus
```

---

## UPGRADE CARDS

### CARD020 - Slimline Bodywork
Increase deployment limit. Go-again.
```
BaseValue = 50
ClassBonus = DroneClass × 8
DeployedBonus = DeployedCount × 15
ReadyBonus = ReadyCount × 8
FutureBonus = RemainingCapacity × 10
Penalties = IF(capacity=0: -20) + IF(deployed=0: -30)
Score = 50 + Bonuses + Penalties + 40 - (3 × 4)
```

### CARD021 - Overclocked Thrusters
Permanent +1 speed.
```
BaseValue = 35
SynergyBonus = IF(attack >= 3: +15)
ClassBonus = DroneClass × 8
DeployedBonus = DeployedCount × 15
ReadyBonus = ReadyCount × 8
FutureBonus = RemainingCapacity × 10
Score = 35 + Bonuses + Penalties - (3 × 4)
```

### CARD024 - Piercing Rounds
Grant Piercing keyword.
```
BaseValue = 60
SynergyBonus = IF(attack >= 3: +30)
ClassBonus = DroneClass × 8
DeployedBonus = DeployedCount × 15
ReadyBonus = ReadyCount × 8
IF already has keyword: Score = -999
Score = 60 + Bonuses + Penalties - (6 × 4)
```

### CARD027 - Efficiency Module
Reduce deployment cost.
```
BaseValue = 45
ClassBonus = DroneClass × 8
DeployedBonus = DeployedCount × 15
ReadyBonus = ReadyCount × 8
FutureBonus = RemainingCapacity × 10
Score = 45 + Bonuses + Penalties - (4 × 4)
```

### CARD028 - Combat Enhancement
Permanent +1 attack.
```
BaseValue = 40
SynergyBonus = IF(speed >= 4: +20)
ClassBonus = DroneClass × 8
DeployedBonus = DeployedCount × 15
ReadyBonus = ReadyCount × 8
FutureBonus = RemainingCapacity × 10
Score = 40 + Bonuses + Penalties - (5 × 4)
```

### CARD029 - Shield Amplifier
Permanent +1 shields.
```
BaseValue = 30
ClassBonus = DroneClass × 8
DeployedBonus = DeployedCount × 15
ReadyBonus = ReadyCount × 8
FutureBonus = RemainingCapacity × 10
Score = 30 + Bonuses + Penalties - (4 × 4)
```

---

## DRONE ABILITIES

The AI evaluates drone abilities during deployment, attack, and action phases. Abilities are grouped by type.

**Note:** Drone-on-drone attacks now use the **Unified Target Scoring** system as their base, with drone-specific adjustments layered on top:
```
DroneAttackScore = TargetValue(damage=AttackerAttack, piercing, lane)
                 + FavorableTradeBonus (if attacker class < target class)
                 + GrowthBonus (Gladiator)
                 + LaneImpactBonus
                 - GuardianRisk (if attacking with Guardian when enemies present)
                 - InterceptionCoveragePenalty (if losing interception coverage)
```

### Interception Coverage Penalty

When a drone attacks, it will exhaust and lose its ability to intercept. If the drone is currently providing interception coverage (able to intercept enemy ship attackers in the lane), a penalty is applied based on the threat level of enemies being blocked.

```
IF (!GUARDIAN && !DEFENDER):
  EnemiesCanIntercept = enemies WHERE attacker.speed >= enemy.speed
  ThreatValue = SUM(enemy.attack + enemy.class × 2) for each
  Penalty = MIN(ThreatValue × -5, -10)
```

**Exceptions:**
- **GUARDIAN** drones: Already handled by GuardianRisk penalty (-200)
- **DEFENDER** drones: Don't exhaust on intercept, so no coverage is lost

### NO ABILITIES (Base stats only)

These drones are evaluated purely on their stats (attack, hull, shields, speed, class).

- **Scout Drone** - Class 1 - Fast scout (speed 6)
- **Standard Fighter** - Class 2 - Balanced fighter
- **Heavy Fighter** - Class 3 - Slow powerhouse
- **Swarm Drone** - Class 0 - Cheap fodder

### KEYWORD ABILITIES

Keywords are granted passively and affect AI decision-making.

#### Guardian Drone - GUARDIAN
Ship section cannot be targeted while Guardian is active. AI heavily penalizes attacking with Guardian when enemies are present.
```
Penalty = IF(attackingWithEnemiesPresent): -200
```

#### Interceptor - DEFENDER
Does not exhaust when intercepting. Prioritized for interception decisions.
```
InterceptionBonus = +20 (DEFENDER_BONUS)
```

#### Sabot Drone - PIERCING
Damage ignores shields. Applied in attack and ship attack evaluation.
```
PiercingBonus = TargetShields × 8
```

#### Jammer - JAMMER
Blocks card targeting. AI prioritizes efficient Jammer removal.
```
RemovalBonus = +30 (if attacker attack <= 2)
```

### PASSIVE STAT MODIFIERS

These abilities modify effective stats, automatically factored into AI decisions.

#### Bomber - BONUS_DAMAGE_VS_SHIP
Deals +5 damage to ship sections. AI heavily prioritizes Bombers for ship attacks.
```
ShipAttackScore = (Attack + 5) × 8
```

#### Avenger Drone - CONDITIONAL_MODIFY_STAT
+3 attack if friendly section has hull damage. Calculated via effective stats service.
```
Attack = IF(sectionDamaged): BaseAttack + 3
```

#### Vindicator Drone - CONDITIONAL_MODIFY_STAT_SCALING
+1 attack per damaged/critical section. Scales with damage taken.
```
Attack = BaseAttack + COUNT(damagedSections)
```

#### Skirmisher Drone - FLANKING_BONUS
+1 attack, +2 speed in outer lanes (Lane 1 or Lane 3).
```
IF(lane1 OR lane3): Attack += 1, Speed += 2
```

### AFTER_ATTACK ABILITIES

Evaluated during attack scoring phase.

#### Kamikaze Drone - DESTROY_SELF
Destroyed after attacking. No AI penalty - the self-destruction cost is already factored into the drone's low class value (Class 1). The AI evaluates Kamikaze attacks using standard unified target scoring.
```
Score = TargetValue(damage=AttackerAttack) + DroneSpecificBonuses
```

#### Gladiator - PERMANENT_STAT_MOD (Veteran Instincts)
Gains +1 attack permanently after attacking. Bonus applied to attack score.
```
Score = TargetValue + (1 × GROWTH_MULTIPLIER) = TargetValue + 8
```

### CONDITIONAL KEYWORD

#### Hunter - CONDITIONAL_KEYWORD (PIERCING)
Gains PIERCING when attacking marked targets. Uses unified scoring with piercing=true.
```
IF(targetIsMarked):
  Score = TargetValue(damage=Attack, piercing=true)
  Includes +5 Piercing Bypass bonus if target has shields
  Logic: "Hunter Protocol: Piercing vs marked target"
```

### TRIGGERED ABILITIES

#### Scanner - ON_DEPLOY (MARK_RANDOM_ENEMY)
Marks random enemy in lane on deployment. Deployment bonus when enemies exist to mark.
```
IF(unmarkedEnemiesInLane > 0):
  DeploymentBonus = +15
```

#### Phase Jumper - ON_MOVE (PERMANENT_STAT_MOD)
Gains +1 attack and +1 speed after moving. Bonus applied to move scoring.
```
MoveBonus = (1 × 15) + (1 × 10) = +25
```

### ACTIVE ABILITIES

Active abilities are evaluated as separate actions with energy costs.

#### Repair Drone - HEAL (Same Lane)
Pay 1 Energy, exhaust to heal 3 hull to damaged friendly in same lane.
```
MissingHull = MaxHull - CurrentHull
ActualHeal = MIN(3, MissingHull)
IF(ActualHeal <= 0): Score = -999 (invalid)
Score = (ActualHeal × 8) + (TargetClass × 5) - (1 × 4)
```

#### Nano Repair Drone - HEAL (Lane-wide)
Pay 1 Energy, exhaust to heal 1 hull to all damaged friendlies in lane.
```
TotalHeal = COUNT(damagedFriendlies) × 1
Score = (TotalHeal × 8) - (1 × 4)
```

#### Sniper Drone - DAMAGE (Any Lane)
Pay 1 Energy, exhaust to deal 4 damage to enemy in any lane. Uses unified target scoring.
```
Score = TargetValue(damage=4) + 20 (cross-lane bonus) - (1 × 4)
```

---

## SUMMARY

### Cards

| Status | Count | Cards |
|--------|-------|-------|
| Full AI Support | 50 | Most base cards + unified target scoring for damage/destroy |
| PRE Conditionals Evaluated | 5 | CARD051-053 (damage), CARD060-061 (movement) |
| POST Conditionals Evaluated | 3 | CARD050, CARD054 (damage), CARD062 (movement) |

All 58 cards now have complete AI evaluation logic.

### Key Systems
- **Unified Target Scoring**: All damage/destroy cards and drone attacks use consistent priority-based evaluation
- **Conditional Effects**: PRE conditionals modify damage/behavior, POST conditionals add bonuses based on outcomes

### Drones

| Category | Count | AI Support |
|----------|-------|------------|
| No Abilities | 4 | Base stats only |
| Keywords | 4 | Full (GUARDIAN, DEFENDER, PIERCING, JAMMER) |
| Passive Modifiers | 4 | Full (via effective stats) |
| After Attack | 2 | Full (Gladiator bonus) |
| Conditional Keyword | 1 | Full (Hunter piercing vs marked) |
| Triggered | 2 | Full (Scanner deploy, Phase Jumper move) |
| Active | 3 | Full (Repair, Nano Repair, Sniper) |

All 20 drones now have complete AI evaluation.
