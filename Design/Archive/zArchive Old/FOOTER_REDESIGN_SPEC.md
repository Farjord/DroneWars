# Experimental Footer Redesign - Design Document

## 🎯 Overview
Complete redesign of the footer/hand interface with percentage-based responsive scaling, fan-style card display, and hover-to-zoom interactions. Designed to work seamlessly from 1080p to 4K while preventing elongation on ultrawide monitors.

## 📐 Core Sizing System

### **Base Resolution: 1080p (1920x1080)**

**Card Sizes:**
- **Default**: 140px × 175px (18% of vertical screen height)
- **Hovered**: 225px × 275px (28% of vertical screen height)
- **Aspect Ratio**: Always maintain 1:1.25 (width:height) ratio

**Deck/Discard Piles:**
- Same sizing as hand cards: 18% vertical height
- Position: Bottom corners (Deck bottom-left, Discard bottom-right)

### **Responsive Scaling Formula:**
```css
/* Card height based on viewport */
--card-height-base: 18vh;  /* 18% of viewport height */
--card-height-hover: 28vh; /* 28% of viewport height */
--card-width: calc(var(--card-height) * 0.8); /* Maintain 1:1.25 ratio */
```

### **Ultrawide Handling:**
- **Trigger**: When aspect ratio > 16:9
- **Behavior**: Cap maximum content width at `height * 16 / 9`
- **Implementation**: Center content with side margins
- **Prevents**: Horizontal elongation of UI elements

## 🃏 Card Fan Display

### **Layout Style:**
- **Pattern**: Arc/curve fan (like spreading a hand of cards)
- **Rotation**: Subtle tilt (-5° to +5° based on card position)
  - Leftmost card: ~-5° rotation
  - Center cards: 0° rotation
  - Rightmost card: ~+5° rotation
- **Spacing**: Cards overlap slightly (negative margin ~40px)
- **Arc Curve**: Slight vertical offset creating gentle arc shape

### **Position Calculation (per card):**
```javascript
// For N cards in hand, card index i:
const totalCards = hand.length;
const centerIndex = (totalCards - 1) / 2;
const positionFromCenter = i - centerIndex;

// Rotation
const maxRotation = 5; // degrees
const rotation = (positionFromCenter / centerIndex) * maxRotation;

// Vertical offset for arc
const maxArcOffset = 10; // pixels
const arcOffset = Math.abs(positionFromCenter / centerIndex) * maxArcOffset;

// Horizontal spacing
const cardOverlap = 40; // pixels of overlap
const xPosition = i * (cardWidth - cardOverlap);
```

## 🎨 Hover Interaction

### **Behavior:**
1. **Scale Up**: Card grows from 18vh to 28vh
2. **Rise Vertically**: Card moves up 20-30px
3. **Z-Index**: Card comes to front (z-index: 100)
4. **Drop Shadow**: Large shadow appears beneath card

### **Animation:**
- **Duration**: 150-200ms (fast, snappy)
- **Easing**: ease-out for natural feel
- **Properties**: transform (scale, translateY), box-shadow

### **CSS Implementation:**
```css
.card {
  height: 18vh;
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;
  transform-origin: center bottom;
}

.card:hover {
  transform: translateY(-25px) scale(1.556); /* 18vh → 28vh ≈ 1.556x */
  z-index: 100;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}
```

## 📍 Layout Structure

### **Footer Component:**
- **Background**: Transparent (or very subtle with low opacity)
- **Overflow**: visible (allows cards to extend into gameboard)
- **Height**: Auto-sized to content
- **Position**: Fixed at bottom of screen

### **Component Hierarchy:**
```
<footer> (transparent)
  ├─ <deck-pile> (bottom-left corner)
  ├─ <card-fan-container> (center)
  │   └─ <cards> (fanned with hover)
  ├─ <discard-pile> (bottom-right corner)
  ├─ <view-toggle> (below fan: Hand | Drones)
  └─ <log-button> (far right, opens modal)
```

### **View Toggle:**
- **Position**: Directly below card fan (centered)
- **Style**: Hand | Drones toggle buttons
- **Behavior**: Switches between Hand and Drones view

### **Log Button:**
- **Position**: Far right of screen (bottom area)
- **Behavior**: Opens modal overlay (not inline)
- **Modal**: Full-screen overlay with game log table

## 🎮 Drones View

### **Same Behavior as Cards:**
- Arc/curve fan with rotation
- 18vh default, 28vh on hover
- Rise up and drop shadow on hover
- Fast 150-200ms transitions

## 📱 Responsive Breakpoints

### **Resolution Support:**
- **1080p (1920×1080)**: Base design
- **1440p (2560×1440)**: Scales proportionally via vh units
- **4K (3840×2160)**: Scales proportionally via vh units
- **Ultrawide (3440×1440, 21:9)**: Capped width, centered content

### **Scaling Logic:**
```javascript
// Calculate max width for ultrawide
const aspectRatio = window.innerWidth / window.innerHeight;
const MAX_ASPECT = 16 / 9;

if (aspectRatio > MAX_ASPECT) {
  const maxWidth = window.innerHeight * MAX_ASPECT;
  gameContainer.style.maxWidth = `${maxWidth}px`;
  gameContainer.style.margin = '0 auto';
}
```

## 🔧 Implementation Phases

### **Phase 1: Core Sizing System** ✅ COMPLETE
- ✅ Replace fixed px with vh/vw units
- ✅ Implement aspect ratio calculations
- ✅ Add ultrawide detection and capping
- ✅ Update card wrapper styles with hover effects

### **Phase 2: Card Fan Layout** 🔄 IN PROGRESS
- Create arc/curve fan positioning system
- Add rotation calculations
- Implement overlap/spacing

### **Phase 3: Hover Interactions**
- Add scale/translate transforms
- Implement z-index management
- Add drop shadow effects

### **Phase 4: Layout Restructuring**
- Make footer background transparent
- Move deck/discard to corners
- Add view toggle below fan
- Convert log to modal

### **Phase 5: Drones View**
- Apply same fan system to drones
- Add hover effects

### **Phase 6: Polish**
- Fine-tune transitions
- Test across resolutions
- Adjust spacing/sizing

## 📝 Key Design Decisions

### **User Responses:**
- **Fanning Style**: Arc/curve fan with subtle rotation
- **Hover Behavior**: Scale up + rise vertically + z-index front
- **Ultrawide**: Cap at dynamic 16:9 equivalent width
- **Tabs**: Move Hand/Drones toggle below fan, Log becomes modal
- **Deck/Discard**: Same % sizing (18vh), positioned in corners
- **Drones**: Same fan behavior as cards
- **Animation Speed**: Fast (150-200ms)
- **Hover Rise**: 20-30px (just clear the fan)
- **Visual Effects**: Drop shadow only

## 🎨 Visual Design Goals

1. **Responsive**: Scale perfectly from 1080p to 4K
2. **Aspect Ratio**: Maintain all component proportions
3. **Ultrawide Safe**: Prevent horizontal elongation
4. **Clean**: Transparent footer, minimal UI
5. **Interactive**: Smooth hover effects with visual feedback
6. **Unobtrusive**: Cards flow naturally, don't dominate screen
7. **Accessible**: Clear visual hierarchy, easy to parse at a glance

## 📐 Technical Specifications

### **CSS Variables:**
```css
--card-height-base: 18vh;
--card-height-hover: 28vh;
--card-width-base: calc(var(--card-height-base) * 0.8);
--card-width-hover: calc(var(--card-height-hover) * 0.8);
--card-overlap: 40px;
--card-rotation-max: 5deg;
--card-arc-offset-max: 10px;
--hover-rise: 25px;
--hover-duration: 150ms;
--hover-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
--max-content-width: calc(100vh * 16 / 9);
```

### **Z-Index Layers:**
- Deck/Discard: 10
- Card fan base: 1
- Hovered card: 100
- Log modal: 1000

---

**Status**: Phase 1 Complete, Phase 2 In Progress
**Last Updated**: 2025-10-28
