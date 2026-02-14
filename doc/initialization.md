# WebBot-Viz - Phase 1 Initialization

## Project Overview

WebBot-Viz is a web-based 2D visualization tool for ROS 2, similar to a lightweight RViz. It connects to a ROS 2 simulation via `rosbridge_websocket` and renders sensor/map data in 2D.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun 1.3.9 |
| Backend | Hono + Better-Auth + Drizzle ORM |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| ROS Integration | roslibjs (CDN) + ros2djs (CDN) |

## Project Structure

```
ROS/
├── package.json              # Root workspace (monorepo)
├── packages/
│   ├── server/               # Hono backend
│   │   ├── src/
│   │   │   └── index.ts      # Server entry point
│   │   ├── db/
│   │   │   ├── index.ts      # Drizzle database
│   │   │   └── schema.ts     # Database schema
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── client/               # React+Vite frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── ConnectionStatus.tsx
│       │   │   ├── LayerControl.tsx
│       │   │   └── MapCanvas.tsx
│       │   ├── hooks/
│       │   │   └── useRosConnection.ts
│       │   ├── lib/
│       │   │   └── utils.ts
│       │   ├── ros-types.ts
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── refer/                    # RViz reference code
├── doc/                      # Documentation
└── .git/
```

## Development Commands

```bash
# Install dependencies
bun install

# Run both frontend and backend concurrently
bun run dev

# Run only backend
bun run dev:server

# Run only frontend
bun run dev:client

# Build all
bun run build

# Database operations
bun run db:generate  # Generate migrations
bun run db:push      # Push schema to database
```

## ROS Topics (Phase 1)

| Topic | Type | Description |
|-------|------|-------------|
| `/scan` | LaserScan | Laser scan data (points) |
| `/map` | OccupancyGrid | Map grid data |
| `/move_base/global_costmap/costmap` | OccupancyGrid | Global costmap |
| `/tf` | TFMessage | Transform data |
| `/tf_static` | TFMessage | Static transforms |
| `/move_base/NavfnROS/plan` | NavPath | Global navigation plan |
| `/move_base/TCPlanner/local_plan` | NavPath | Local navigation plan |

## Running the Application

### 1. Start ROS Bridge WebSocket Server

```bash
# On your ROS machine or simulation
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

This starts the WebSocket server at `ws://localhost:9090`.

### 2. Start WebBot-Viz

```bash
cd /home/c6h4o2/dev/web/ROS
bun run dev
```

Frontend will be available at `http://localhost:3000`.

## Next Steps

Phase 1 will implement the following features:

1. **Connection Manager** - Connect to rosbridge_websocket with status indicator
2. **Map & TF Rendering** - Render occupancy grid and robot pose
3. **LaserScan Layer** - Render laser scan points
4. **Navigation Path Layers** - Render global and local plans

## References

- [RViz Source Code](refer/rviz/) - Official ROS 2 RViz implementation for reference
- [roslibjs Documentation](https://roslibjs.github.io/roslibjs/)
- [ros2djs Documentation](https://ros.org/wiki/ros2djs)
