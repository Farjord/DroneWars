# Asset Preloading System - Design Document

## Overview

This document describes the implementation of an asset preloading system with an animated splash screen for the Drone Wars game. The system addresses the issue of art assets loading on-demand when the game is hosted online, causing clunky screen transitions.

---

## Problem Statement

**Current Behavior:**
- Art assets (~200MB across 108 files) load on-demand as components render
- First-time visitors experience visual "pop-in" and delays when navigating screens
- No loading feedback is provided to users
- Current `AppRouter.jsx` has a simple 100ms delay placeholder (lines 40-128)

**Impact:**
- Poor user experience on first visit
- Screens appear broken or incomplete while images load
- Users may think the game is malfunctioning

---

## Solution Overview

Implement an asset preloading system that:
1. Loads ALL game assets during an initial splash screen
2. Shows animated progress with themed visuals
3. Provides feedback on loading status
4. Gracefully handles failures
5. Leverages browser caching for fast subsequent visits

---

## Technical Architecture

### Component Diagram

```
                    ┌─────────────────────┐
                    │      main.jsx       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    AppRouter.jsx    │
                    │  (Integration Point)│
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────────┐     │      ┌─────────▼─────────┐
    │ SplashLoadingScreen│     │      │    MenuScreen     │
    │   (When Loading)   │     │      │  (After Loading)  │
    └─────────┬─────────┘     │      └───────────────────┘
              │               │
    ┌─────────▼─────────┐    │
    │   AssetPreloader  │────┘
    │     (Service)     │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │   assetManifest   │
    │   (Data Source)   │
    └───────────────────┘
```

### Data Flow

```
1. AppRouter mounts
2. AppRouter calls AssetPreloader.loadAll(onProgress)
3. AssetPreloader reads asset paths from assetManifest
4. AssetPreloader creates Image() objects for each path
5. As images load, onProgress callback fires with updated counts
6. SplashLoadingScreen renders progress
7. When complete, SplashLoadingScreen fades out
8. AppRouter renders MenuScreen
```

---

## File Structure

```
src/
├── services/
│   ├── assetManifest.js      # NEW - Asset path extraction
│   └── AssetPreloader.js     # NEW - Preloading service
├── components/
│   └── ui/
│       ├── SplashLoadingScreen.jsx  # NEW - Loading UI
│       └── SplashLoadingScreen.css  # NEW - Loading styles
└── AppRouter.jsx             # MODIFY - Integration point
```

---

## Detailed Component Specifications

### 1. Asset Manifest (`src/services/assetManifest.js`)

**Purpose:** Centralize all asset paths for preloading

**Implementation:**
```javascript
// Import all data files that contain image references
import fullDroneCollection from '../data/droneData.js';
import fullCardCollection from '../data/cardData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import poiTypes from '../data/pointsOfInterestData.js';
import aiPersonalities from '../data/aiData.js';
import { BACKGROUNDS } from '../config/backgrounds.js';

// Extract unique paths from each data source
const extractPaths = (items, key) =>
  [...new Set(items.map(item => item[key]).filter(Boolean))];

// Categorized asset paths
export const assetManifest = {
  drones: extractPaths(fullDroneCollection, 'image'),
  cards: extractPaths(fullCardCollection, 'image'),
  shipSections: extractPaths(shipComponentCollection, 'image'),
  pointsOfInterest: extractPaths(poiTypes, 'image'),
  aiPortraits: extractPaths(aiPersonalities, 'imagePath'),
  backgrounds: BACKGROUNDS.filter(bg => bg.type === 'static').map(bg => bg.path),

  // Static assets not in data files
  menu: [
    '/DroneWars/Menu/Eremos.png',
    '/DroneWars/Menu/VSAI.png',
    '/DroneWars/Menu/VSMultiplayer.png',
    '/DroneWars/Menu/Deck.png',
    '/DroneWars/Menu/Train.png',
    '/DroneWars/Menu/NewGame.png',
    '/DroneWars/Menu/LoadGame.png'
  ],
  hanger: [
    '/DroneWars/Hanger/Inventory.png',
    '/DroneWars/Hanger/Replicator.png',
    '/DroneWars/Hanger/Blueprints.png',
    '/DroneWars/Hanger/RepairBay.png'
  ],
  tactical: [
    '/DroneWars/Tactical/Tactical1.jpg',
    '/DroneWars/Tactical/Tactical2.jpg',
    '/DroneWars/Tactical/Tactical3.jpg',
    '/DroneWars/Tactical/Tactical4.jpg',
    '/DroneWars/Tactical/Tactical15.jpg'
  ],
  eremos: [
    '/DroneWars/Eremos/Eremos.jpg',
    '/DroneWars/Eremos/Eremos_2.jpg'
    // Note: Eremos.mp4 intentionally omitted - video streams better
  ]
};

// Helper functions
export const getAllAssetPaths = () => Object.values(assetManifest).flat();
export const getAssetCounts = () => {
  const counts = {};
  for (const [cat, paths] of Object.entries(assetManifest)) {
    counts[cat] = paths.length;
  }
  counts.total = getAllAssetPaths().length;
  return counts;
};
```

**Design Decisions:**
- Video files (Eremos.mp4) are excluded - browsers handle video streaming efficiently
- Paths are deduplicated to avoid redundant loading
- Categories enable per-section progress tracking

---

### 2. Asset Preloader Service (`src/services/AssetPreloader.js`)

**Purpose:** Load images with progress tracking and error handling

**Key Features:**
- Promise-based API
- Concurrency limiting (5 parallel requests)
- Progress callbacks with detailed status
- Graceful error handling
- Singleton pattern for state persistence

**Public API:**
```javascript
class AssetPreloader {
  // Load all assets with progress reporting
  async loadAll(onProgress: (progress: Progress) => void): Promise<LoadResult>

  // Check if loading is complete
  isComplete(): boolean

  // Get a preloaded image
  getImage(url: string): HTMLImageElement | undefined

  // Get load result summary
  getLoadResult(): LoadResult

  // Reset state (for testing)
  reset(): void
}

interface Progress {
  total: number;
  loaded: number;
  failed: number;
  percentage: number;
  currentCategory: string;
  categories: {
    [categoryName: string]: {
      total: number;
      loaded: number;
      status: 'pending' | 'loading' | 'complete';
    }
  }
}

interface LoadResult {
  success: boolean;
  loaded: number;
  failed: number;
  failedAssets: string[];
  isComplete: boolean;
}
```

**Concurrency Control:**
```javascript
async loadCategoryWithConcurrency(urls, limit, onItemLoaded) {
  const executing = [];

  for (const url of urls) {
    const promise = this.preloadImage(url)
      .finally(() => onItemLoaded());

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      // Remove completed promise
    }
  }

  return Promise.allSettled(executing);
}
```

---

### 3. Splash Loading Screen (`src/components/ui/SplashLoadingScreen.jsx`)

**Purpose:** Display animated loading progress to users

**Visual Design:**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│                       EREMOS                            │
│                  Loading Game Assets                    │
│                                                         │
│              ████████████░░░░░░░░░░░░                   │
│                        67%                              │
│                                                         │
│              Loading Card Artwork...                    │
│                   72 / 108 assets                       │
│                                                         │
│                   [Show Details]                        │
│                                                         │
│  ┌─────────────┬─────────────┬─────────────┐           │
│  │ Cards  37/37│ Drones 20/20│ Menu    7/7 │           │
│  │ Ships   5/5 │ POI   10/10 │ Tactical... │           │
│  └─────────────┴─────────────┴─────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface SplashLoadingScreenProps {
  progress: Progress | null;
  onComplete: () => void;
}
```

**State:**
- `fadeOut: boolean` - Triggers fade-out animation on completion
- `showDetailedProgress: boolean` - Toggles category breakdown

**Animations:**
- Gradient title with shifting colors
- Progress bar with glow sweep effect
- Fade-in on mount, fade-out on complete
- Subtle background pulse

**Status Messages:**
```javascript
const getStatusMessage = (percentage, currentCategory) => {
  if (percentage < 10) return 'Initializing systems...';
  if (percentage < 30) return `Loading ${CATEGORY_LABELS[currentCategory]}...`;
  if (percentage < 50) return 'Calibrating drone networks...';
  if (percentage < 70) return 'Syncing tactical data...';
  if (percentage < 90) return 'Finalizing preparations...';
  return 'Ready for deployment!';
};
```

---

### 4. AppRouter Integration

**Current Code (lines 40-128):**
```javascript
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    setIsLoading(false);
  }, 100);
  return () => clearTimeout(timer);
}, []);

if (isLoading) {
  return (
    <div style={{...}}>
      <div>Loading EREMOS...</div>
    </div>
  );
}
```

**New Code:**
```javascript
import SplashLoadingScreen from './components/ui/SplashLoadingScreen.jsx';
import assetPreloader from './services/AssetPreloader.js';

// In component:
const [isLoading, setIsLoading] = useState(true);
const [loadProgress, setLoadProgress] = useState(null);

useEffect(() => {
  const preloadAssets = async () => {
    // Skip if already loaded (hot reload, navigation back)
    if (assetPreloader.isComplete()) {
      setIsLoading(false);
      return;
    }

    try {
      await assetPreloader.loadAll((progress) => {
        setLoadProgress(progress);
      });
    } catch (error) {
      console.error('Asset preload error:', error);
    }

    // Brief delay to show 100% complete
    setTimeout(() => setIsLoading(false), 300);
  };

  preloadAssets();
}, []);

if (isLoading) {
  return (
    <SplashLoadingScreen
      progress={loadProgress}
      onComplete={() => setIsLoading(false)}
    />
  );
}
```

---

## Asset Inventory

| Category | Pattern | Count | Size | Notes |
|----------|---------|-------|------|-------|
| Cards | `/DroneWars/cards/*.png` | 37 | ~52MB | Card artwork |
| Drones/UI | `/DroneWars/img/*.png` | 29 | ~42MB | Drone images, UI elements |
| Backgrounds | `/DroneWars/Backgrounds/*` | 3 | ~22MB | Static backgrounds |
| Tactical | `/DroneWars/Tactical/*.jpg` | 5 | ~12MB | Tactical map backgrounds |
| Menu | `/DroneWars/Menu/*.png` | 7 | ~11MB | Menu screen graphics |
| Ships | `/DroneWars/Ships/*.png` | 5 | ~6MB | Ship images |
| Hangar | `/DroneWars/Hanger/*.png` | 4 | ~6MB | Hangar UI |
| POI | `/DroneWars/poi/*` | 10 | ~6MB | Points of interest |
| AI | `/DroneWars/AI/*.png` | 2 | ~4MB | AI portraits |
| Eremos | `/DroneWars/Eremos/*.jpg` | 5 | ~24MB | Campaign images |

**Total: ~108 images, ~185MB** (excluding 18MB video)

---

## Browser Caching Behavior

| Scenario | Behavior |
|----------|----------|
| First visit | Full download (~185MB), progress shown |
| Return visit (cached) | Near-instant load from cache, progress flies through |
| Cache cleared | Full download again |
| Partial cache | Mixed - cached items instant, others download |

The preloader doesn't implement custom caching - it relies on standard browser HTTP caching. This is intentional:
- Browser cache is well-optimized
- Server can set appropriate cache headers
- No additional complexity needed

---

## Error Handling

**Failed Asset Loading:**
1. Log warning to console with failed URLs
2. Continue loading remaining assets
3. Show warning badge on splash screen if failures occur
4. Proceed to menu anyway (game may still be playable with missing images)

**Why not block on failures?**
- A missing card image shouldn't prevent playing the game
- User can refresh to retry
- Better UX to show degraded experience than infinite loading

---

## Performance Considerations

**Concurrency Limit (5):**
- Prevents overwhelming the browser's network stack
- Avoids connection limits (browsers typically allow 6-8 concurrent connections per host)
- Provides smoother progress updates

**No Lazy Loading After:**
- All assets loaded upfront = zero delays during gameplay
- Trade-off: Longer initial load, but seamless experience after

**Hot Reload Support:**
- Singleton preloader maintains state
- `isComplete()` check prevents re-loading on HMR

---

## Future Enhancements (Out of Scope)

- **Progressive loading**: Load menu assets first, background load rest
- **Low-bandwidth mode**: Compressed/lower-res assets option
- **Service Worker**: Offline support with cached assets
- **Image optimization**: WebP format, responsive images
- **Skip button**: Allow users to skip loading (with degraded experience)

---

## Testing Approach

1. **Network Throttling**: Use Chrome DevTools to simulate slow connections (Slow 3G)
2. **Cache Testing**: Test with cleared cache and with cached assets
3. **Error Simulation**: Block specific assets in DevTools to test failure handling
4. **Hot Reload**: Verify preloader state persists during development
5. **Cross-browser**: Test on Chrome, Firefox, Safari, Edge

---

## Implementation Steps

1. Create `src/services/assetManifest.js`
2. Create `src/services/AssetPreloader.js`
3. Create `src/components/ui/SplashLoadingScreen.jsx`
4. Create `src/components/ui/SplashLoadingScreen.css`
5. Modify `src/AppRouter.jsx` to integrate preloader
6. Test with network throttling
7. Verify on deployed environment

---

## References

- Existing pattern: `src/components/ui/LoadingEncounterScreen.jsx`
- Vite base path config: `vite.config.js` line 7 (`base: '/DroneWars/'`)
- Data files with asset references:
  - `src/data/droneData.js`
  - `src/data/cardData.js`
  - `src/data/shipSectionData.js`
  - `src/data/pointsOfInterestData.js`
  - `src/data/aiData.js`
  - `src/config/backgrounds.js`
