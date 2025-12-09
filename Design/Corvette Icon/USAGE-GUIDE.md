# Corvette Ship Icon - Usage Guide

## What You Got

I've created a simple animated ship icon that looks like a white-line blueprint schematic of your corvette. The ship has:

1. **The distinctive shape** - Pointed bow (front), detailed middle section, and wide engine compartment at the back
2. **Animated movement** - The ship drifts and rotates slightly to look like it's flying
3. **Pulsing engine glow** - A small glowing circle at the back that pulses to show active engines
4. **Thruster trails** - Faint lines behind the ship showing propulsion

## How to Use It in Your Game

### Basic Setup

In your tactical map screen, you can import and use the icon like this:

```jsx
import CorvetteIcon from './CorvetteIcon';

// Then in your component:
<CorvetteIcon size={50} color="white" speed={1} />
```

### Customization Options

The icon accepts three settings you can change:

**Size** - How big the icon appears (in pixels)
- `size={30}` - Small (good for zoomed-out maps)
- `size={50}` - Medium (default, good balance)
- `size={70}` - Large (for close-up views)

**Color** - What color the lines are drawn in
- `color="white"` - For friendly/allied ships
- `color="#4a9eff"` - Blue for player ships
- `color="#ff4444"` - Red for enemy ships
- Any hex color code works

**Speed** - How fast the animations play
- `speed={0.5}` - Slower, more graceful movement
- `speed={1}` - Normal speed (default)
- `speed={2}` - Faster, more urgent movement

### Positioning on Map

To place ships at specific locations on your tactical map:

```jsx
<div style={{ position: 'absolute', top: 100, left: 200 }}>
  <CorvetteIcon size={50} color="#4a9eff" />
</div>
```

The `top` and `left` numbers are pixel positions on your map. You can calculate these from your game's coordinate system.

### Rotation

If you need ships pointing in different directions:

```jsx
<div style={{ transform: 'rotate(45deg)' }}>
  <CorvetteIcon size={50} />
</div>
```

Change the `45deg` to any angle:
- `0deg` - Pointing right
- `90deg` - Pointing down
- `180deg` - Pointing left
- `270deg` or `-90deg` - Pointing up
- Any value in between for diagonal angles

## What's Happening Behind the Scenes

The icon is made using SVG (Scalable Vector Graphics), which means:
- It stays crisp at any size
- Very lightweight (tiny file size)
- Can be animated smoothly
- Works on all browsers/devices

The shape is built from several parts:
1. **Main hull path** - Creates the elongated body and pointed nose
2. **Bridge details** - Small vertical lines showing the superstructure
3. **Engine section** - The rectangular box at the rear
4. **Engine detail lines** - Horizontal stripes inside the engine
5. **Engine glow** - A pulsing circle that animates
6. **Thruster trail** - A fading line showing engine exhaust

The drift animation makes the ship move in a small figure-8 pattern, and the rotation animation gently tilts it back and forth - this makes it look like it's actively flying rather than static.

## Testing It

Open the `corvette-icon-demo.html` file in a browser to see:
- Different size options
- Different color schemes
- How it looks on a grid map
- Multiple ships at different angles

## Making It Match Your Other Ships

When you create icons for other ship types (destroyers, cruisers, etc.), you can use the same structure but change:
- The main hull shape (make it wider, longer, more angular, etc.)
- The number and position of detail elements
- The engine section (bigger engines for larger ships)

This keeps all your ship icons visually consistent while making each type recognizable.

## Integration Tips

For your EREMOS game, you might want to:

1. **Store ship positions** in your game state
2. **Map over the positions** to render multiple ships
3. **Use color to show** friendly vs enemy ships
4. **Rotate based on** the ship's heading/direction
5. **Scale based on** zoom level of the tactical map
6. **Add click handlers** so players can select ships

Example of rendering multiple ships:

```jsx
{ships.map(ship => (
  <div 
    key={ship.id}
    style={{ 
      position: 'absolute', 
      top: ship.y, 
      left: ship.x,
      transform: `rotate(${ship.heading}deg)`
    }}
  >
    <CorvetteIcon 
      size={50} 
      color={ship.isEnemy ? '#ff4444' : '#4a9eff'} 
    />
  </div>
))}
```

This loops through your ships array and creates an icon for each one at its position, with the right color and rotation.
