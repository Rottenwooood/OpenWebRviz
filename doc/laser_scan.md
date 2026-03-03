# LaserScan Layer

## Overview

The LaserScan layer visualizes laser range data from the `/scan` topic as red points on the map.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LaserScan Layer                          │
├─────────────────────────────────────────────────────────────┤
│  useRosLaserScan()                                         │
│  └── Subscribes to: /scan (sensor_msgs/msg/LaserScan)    │
│  └── Converts ranges to Cartesian coordinates              │
│  └── Returns: LaserPoint[] {x, y, intensity}             │
├─────────────────────────────────────────────────────────────┤
│  MapCanvas Rendering                                       │
│  └── Transforms points from laser frame to map frame      │
│  └── Draws red dots at obstacle positions                 │
│  └── Toggle via LayerControl                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Format

### LaserScan Message

```typescript
interface LaserScanData {
  header: {
    stamp: { sec: number; nsec: number };
    frame_id: string;
  };
  angle_min: number;      // Starting angle (radians)
  angle_max: number;      // Ending angle (radians)
  angle_increment: number; // Angle between measurements
  range_min: number;      // Minimum range (meters)
  range_max: number;      // Maximum range (meters)
  ranges: number[];      // Range measurements array
  intensities: number[];  // Intensity measurements
}
```

### LaserPoint

```typescript
interface LaserPoint {
  x: number;        // X position in meters
  y: number;        // Y position in meters
  intensity: number; // Normalized intensity (0-1)
}
```

## Coordinate Transformation

The laser scan points are in the laser frame (typically `base_scan` or `laser`). To render them on the map:

```
laser_point (laser frame)
    │
    │  + rotation (from TF)
    │
    ▼
robot_pose (base_link frame, from TF)
    │
    │  + translation
    │
    ▼
map_point (map frame)
```

## Rendering Details

| Property | Value |
|----------|-------|
| Color | Red (#ef4444) |
| Shape | Filled circles |
| Size | Dynamic (1px to scale/20) |
| Frame | Transformed to map frame |

## Layer Toggle

The LaserScan layer can be toggled on/off from the sidebar:

- **Checkbox**: `Laser Scan` in LayerControl
- **Default**: Off (for better performance)
- **State**: Shared via LayerContext

## Usage

```tsx
// In MapCanvas
const { laserPoints, isScanReceived } = useRosLaserScan(ros, '/scan');

// Draw in canvas render loop
if (layers.laser && laserPoints.length > 0 && actualPose) {
  // Transform and draw points
}
```

## Performance Considerations

- Laser scan is only rendered when layer is enabled
- Points are filtered by range_min/range_max
- Invalid ranges (NaN, Inf) are skipped
- Canvas render loop handles 60fps updates

## Files

- [hooks/useRosLaserScan.ts](../packages/client/src/hooks/useRosLaserScan.ts) - LaserScan subscription hook
- [components/MapCanvas.tsx](../packages/client/src/components/MapCanvas.tsx) - Canvas rendering with laser points

## Troubleshooting

### Laser points not appearing
- Check `/scan` topic: `ros2 topic echo /scan`
- Verify layer is enabled in sidebar
- Check laser frame ID matches TF tree

### Laser points in wrong position
- Check TF transform (laser → base_link → odom → map)
- Verify robot pose is being received

### Too many/too few points
- Check `angle_increment` in LaserScan message
- Verify `range_min`/`range_max` filtering
