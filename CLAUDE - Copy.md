# Drone Wars Game - Claude Context

## Project Overview
A React-based drone warfare strategy game with multiplayer capabilities using PeerJS for peer-to-peer networking.

## Tech Stack
- **Frontend**: React 19.1.1 with Vite
- **Styling**: TailwindCSS + PostCSS
- **Networking**: PeerJS for multiplayer
- **UI Icons**: Lucide React
- **Charts**: Recharts
- **Linting**: ESLint

## Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure
```
src/
├── components/
│   ├── ui/           - Reusable UI components (cards, tokens, displays)
│   ├── modals/       - Modal dialogs
│   └── screens/      - Game screens (drone selection, ship placement)
├── data/             - Game data (cards, drones, ships, AI)
├── hooks/            - React hooks (useGameState)
├── logic/            - Core game logic and AI logic
├── network/          - P2P networking (P2PManager, CommandManager)
├── state/            - State management (GameStateManager, ActionProcessor)
├── theme/            - Theme configuration
└── utils/            - Utility functions
```

## Recent Development (Based on Commits)
- **Currently**: Mid-refactor splitting out App.jsx (major architectural changes)
- **Focus**: Multiplayer implementation with architectural challenges
- **Status**: Working through multiplayer networking issues and component restructuring

## Current State
- Clean working directory
- On master branch
- Recent commits show ongoing multiplayer implementation and App.jsx refactoring

## Game Features
- Drone-based strategy game
- Card-based actions
- Ship placement and combat
- AI opponents
- Deck building
- Multiplayer support via P2P networking

## Known Issues/Focus Areas
- Major architectural issues with multiplayer (based on commit messages)
- App.jsx component splitting in progress
- P2P networking implementation challenges

---
*This file helps Claude understand project context between sessions*