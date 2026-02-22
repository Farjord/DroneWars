# Plan: DeckBuilder.jsx Refactoring

## Overview

Refactor DeckBuilder.jsx from a 2,584-line god component into a clean orchestrator with extracted sub-components, hooks, and utilities.

## Planned Extraction Order

1. Remove dead code and banned comments
2. Write intent-based tests before any extractions
3. Extract utility functions (cardTypeStyles, chartUtils)
4. Extract popup components (CardDetailPopup, DroneDetailPopup, ShipComponentDetailPopup)
5. Extract inline modals (DeckExportModal, DeckImportModal, DeckLoadModal)
6. Extract useDeckBuilderData hook (data processing memos)
7. Extract DeckStatisticsCharts component (chart rendering)
8. Extract DeckBuilderLeftPanel (left panel JSX)
9. Extract DeckBuilderRightPanel (right panel JSX)
10. Verify tests and documentation

## Target Architecture

DeckBuilder.jsx as thin orchestrator:
- State declarations
- Handler functions
- Props construction for child components
- Render: popups, modals, header, mobile toggle, two panel components

## Actual Outcomes

All 10 steps completed on 2026-02-22. Results match plan:

| File | Planned | Actual |
|-|-|-|
| DeckBuilder.jsx | ~360 lines | 386 lines |
| DeckBuilderLeftPanel.jsx | ~593 lines | 632 lines |
| DeckBuilderRightPanel.jsx | ~398 lines | 443 lines |
| DeckStatisticsCharts.jsx | ~238 lines | 204 lines |
| useDeckBuilderData.js | ~470 lines | 454 lines |
| Total tests | 19+ | 21 (19 + 2 extraction) |
| Total suite | 3,686 pass | 3,686 pass |

### Deviations from Plan

- Step 3 also extracted `getRarityDisplay` (not originally planned separately)
- Step 8 cleaned up 11 dead imports discovered during extraction
- Step 9 cleaned up 6 more dead imports
- No `useDeckBuilderState` hook was created — the ~20 useState calls stayed in DeckBuilder.jsx as the component is now a reasonable 386 lines. Extracting state further would add indirection without meaningful benefit.
- No `chartUtils.js` file was created — chart utilities (COLORS, renderCustomizedLabel) were embedded in DeckStatisticsCharts.jsx directly.
