# Quick Deploy Feature

## Overview

Quick Deploy is a feature that allows players to predefine their turn-1 drone deployments for Extraction mode. This speeds up the game loop by letting players skip the deployment phase entirely when entering combat.

## Purpose

In Extraction mode, players engage in multiple combat encounters as they explore the Eremos. The deployment phase at the start of each combat can become repetitive when players have a preferred opening strategy. Quick Deploy addresses this by:

1. **Saving time** - Skip deployment phase entirely
2. **Maintaining strategy** - Players still control their deployment decisions
3. **Enabling experimentation** - Save multiple deployment configurations to test different approaches

## How It Works

### Creation
Players access the Quick Deploy Manager from the Hangar screen (below ship slots). Here they can:
- Select 5 drones from their available pool (starter + blueprinted drones)
- Assign those drones to lanes using a game board-like interface
- See real-time feedback on deployment cost and deck compatibility
- Save up to 5 quick deployment configurations

### Usage
When initiating a combat encounter:
1. System validates saved quick deployments against the current deck
2. Player chooses between "Standard Deployment" or a valid quick deployment
3. If quick deploy selected:
   - Player's drones are placed automatically during the loading screen
   - AI calculates and executes its reactive deployment (hidden)
   - Game starts directly at Round 1 Action Phase with all drones on board

## Scope

- **Extraction mode only** (multiplayer support may be added later)
- **Turn 1 deployment only** (not for subsequent rounds)
- **Maximum 5 saved configurations**

## Documentation Index

- [PRD.md](./PRD.md) - Product requirements and user flows
- [DATA_MODEL.md](./DATA_MODEL.md) - Data structures and save game schema
- [UI_SPEC.md](./UI_SPEC.md) - UI requirements and interaction design
- [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) - Architecture and game integration
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) - Phased implementation roadmap
