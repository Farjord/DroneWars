# Tech Slots — Product Requirements

## Problem
The 5-drone-per-lane capacity limit causes mines/beacons/jammers to block combat drone deployments since they occupy lane slots. Non-combat deployables need their own space.

## Solution
**Tech Slots** — a parallel sublayer in each lane that holds non-combat deployable drones ("Tech"), freeing the main lane for combat drones.

## v1 Tech Drones
| Name | Trigger | Effect | Deployed To |
|-|-|-|-|
| Proximity Mine | ON_LANE_MOVEMENT_IN | 4 damage to triggering drone, self-destruct | Enemy lane |
| Inhibitor Mine | ON_LANE_DEPLOYMENT | Exhaust triggering drone, self-destruct | Enemy lane |
| Jitter Mine | ON_LANE_ATTACK | -4 attack permanently, self-destruct | Enemy lane |
| Rally Beacon | ON_LANE_MOVEMENT_IN | Go Again | Own lane |
| Jammer | PASSIVE | Opponent card effects can only target Jammer | Own lane |

## Design Decisions
- **Data model**: Parallel `player.techSlots[laneId]` alongside `dronesOnBoard`
- **Token system**: Preserved — `isTech` is new flag alongside `isToken`
- **Trigger priority**: Self → Tech → Other Drones (new tier between Self and Friendly)
- **Attack targeting**: Same-lane only
- **Tech cap**: Max 5 per lane, separate from drone cap
- **Deployment**: Cards only, never in deployment phase
- **Effect immunity**: Tech immune to ALL indirect effects (AoE, heals, buffs, debuffs)
- **Inertness**: Cannot move, attack, be healed, gain hull/shields/stats, intercept
- **Fixed stats**: 0 atk / 1 hull / 0 shields / 0 speed

## UI
- Circular slots at lane edges (existing scaffolding)
- Drone art in filled slots; enemy=red border, friendly=blue border
- Click opens details; hover glows + beep when action would trigger
- New `TechSlotItem` component (NOT DroneToken)
