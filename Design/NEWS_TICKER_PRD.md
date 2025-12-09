# News Ticker System - Product Requirements Document

## Overview

A scrolling news-style ticker that displays dynamic intel messages about available sectors on the Hangar screen. The ticker analyzes map data and provides players with useful reconnaissance information before deployment.

---

## Goals

1. **Inform Players**: Provide at-a-glance intel about sector conditions
2. **Enhance Atmosphere**: Add sci-fi immersion with radio chatter/intel feed aesthetic
3. **Guide Decision Making**: Help players choose optimal deployment targets
4. **Scale with Content**: Architecture supports easy addition of new message types and map features

---

## User Experience

### Location
- Positioned at the **top edge of the map container**, overlaying the hex grid
- Semi-transparent background to maintain map visibility
- Height: ~32px

### Behavior
- Continuous left-to-right scroll animation
- **Pause on hover** for readability
- Seamless infinite loop (no visible restart)
- Messages separated by visual dividers

### Visual Style
| Message Type | Color | Example |
|--------------|-------|---------|
| Info | Cyan | General sector intel |
| Warning | Yellow | Elevated threats, requirements |
| Danger | Red | High priority alerts |
| Rumor | Purple/Magenta | Mysterious unconfirmed intel |

---

## Message Categories

### 1. Threat Analysis
Analyzes hostile activity and encounter rates.

**Data Sources**: `baseDetection`, `encounterByZone`

**Example Messages**:
- "Hostile activity minimal in Sector A-5"
- "Elevated threat detected in Sector H-12"
- "Core zones in Sector P-8 showing heavy patrol activity"
- "Perimeter of Sector Z-3 appears clear"

### 2. Resource Intel
Reports on available loot and points of interest.

**Data Sources**: `poiTypeBreakdown`, `poiCount`

**Example Messages**:
- "3 Ordnance caches located in Sector A-5"
- "Multiple support facilities detected in Sector H-12"
- "Sector P-8 reports high salvage potential"
- "Tactical data nodes identified in Sector Z-3"

### 3. Priority Targets
Highlights high-value opportunities and access requirements.

**Data Sources**: `hasDroneBlueprints`, `requiresToken`, `dronePoiCount`

**Example Messages**:
- "HIGH PRIORITY: Drone blueprints confirmed in Sector A-5"
- "Security clearance required for Sector H-12 access"
- "2 manufacturing facilities active in Sector P-8"
- "Restricted zone - security token needed for Sector Z-3"

### 4. Intel Rumors
Atmospheric flavor messages with mysterious hints.

**Data Sources**: Various + randomized selection

**Example Messages**:
- "Salvagers report unusual energy signatures near Sector A-5..."
- "Unconfirmed reports of abandoned cargo in the outer zones..."
- "Static interference detected... source unknown..."
- "Long-range sensors picking up anomalous readings..."
- "Whispers of pre-war tech caches circulating among scavengers..."
- "Drone swarm activity detected on long-range scanners..."

---

## Technical Architecture

### Component Structure
```
src/
├── components/ui/
│   └── NewsTicker.jsx           # UI component
├── logic/ticker/
│   ├── TickerMessageService.js  # Message aggregation
│   ├── tickerConfig.js          # Templates & settings
│   └── generators/
│       ├── index.js             # Export aggregator
│       ├── threatGenerator.js   # Threat messages
│       ├── resourceGenerator.js # Resource messages
│       ├── priorityGenerator.js # Priority messages
│       └── rumorGenerator.js    # Rumor messages
└── styles/
    └── news-ticker.css          # Animations & styling
```

### Data Flow
```
generatedMaps[] (from HangarScreen)
       │
       ▼
TickerMessageService.generateMessages(maps)
       │
       ├─► threatGenerator(maps)    → [...messages]
       ├─► resourceGenerator(maps)  → [...messages]
       ├─► priorityGenerator(maps)  → [...messages]
       └─► rumorGenerator(maps)     → [...messages]
       │
       ▼
Combined, deduplicated, shuffled messages[]
       │
       ▼
NewsTicker component renders scrolling display
```

### Message Object Structure
```javascript
{
  id: string,        // Unique identifier
  text: string,      // Display text
  type: 'info' | 'warning' | 'danger' | 'rumor',
  priority: number,  // For sorting (1-10)
  sectorName: string // Associated sector (optional)
}
```

---

## Scalability

### Adding New Message Types
1. Create new generator file in `generators/`
2. Export from `generators/index.js`
3. Service automatically includes new generator

### Adding New Map Properties
1. Update relevant generator to read new property
2. Add message templates to `tickerConfig.js`

### Adding New Maps
No code changes required - generators automatically process all maps in array.

---

## Animation Specification

### CSS Implementation
```css
@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.news-ticker__content {
  animation: ticker-scroll 60s linear infinite;
}

.news-ticker:hover .news-ticker__content {
  animation-play-state: paused;
}
```

### Timing
- **Scroll Duration**: 60 seconds for full cycle
- **Message Gap**: 4rem between messages
- **Infinite Loop**: Content duplicated to create seamless scroll

---

## Integration Points

### HangarScreen.jsx
- Import `NewsTicker` component
- Position inside map container div
- Pass `generatedMaps` array as prop

### Z-Index Layering
- Ticker: z-index 10 (above map, below modals)
- Map icons: z-index 5
- Modals: z-index 500+

---

## Future Enhancements (Out of Scope)

These features are not included in the initial implementation but the architecture supports them:

1. **Interactive Messages**: Click message to highlight sector on map
2. **Message Filtering**: Toggle message types on/off
3. **Speed Control**: User preference for scroll speed
4. **Dynamic Events**: Time-sensitive messages tied to game progression
5. **Sound Effects**: Optional audio blips for new messages

---

## Acceptance Criteria

- [ ] Ticker displays at top of map container
- [ ] Messages scroll smoothly left-to-right
- [ ] Scroll pauses on hover
- [ ] Messages are color-coded by type
- [ ] All 6 sectors are analyzed for messages
- [ ] At least 10 unique message variations display
- [ ] Adding a new generator requires no changes to core service
- [ ] Visual style matches existing game aesthetic
