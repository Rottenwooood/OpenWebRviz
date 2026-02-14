# Connection Manager

## Overview

The Connection Manager handles WebSocket connections to `rosbridge_websocket` using `roslibjs`. It provides:

- **Connection State Management**: Track connection lifecycle (disconnected, connecting, connected, error)
- **Automatic Reconnection**: 10-second timeout with manual reconnect button
- **Error Handling**: Clear error messages for troubleshooting

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ConnectionManager                     │
├─────────────────────────────────────────────────────────┤
│  useRosConnection()                                     │
│  ├── ROSLIB.Ros (WebSocket to ws://localhost:9090)   │
│  ├── Connection State Machine                          │
│  │   ├── disconnected → connecting                   │
│  │   ├── connecting → connected OR error              │
│  │   ├── connected → disconnected (on close)         │
│  │   └── error → disconnected (on reconnect)          │
│  └── 10-second connection timeout                      │
└─────────────────────────────────────────────────────────┘
```

## Connection States

| State | Description | UI Indicator |
|-------|-------------|--------------|
| `disconnected` | No active connection | Gray "Disconnected" badge |
| `connecting` | Attempting to connect | Yellow "Connecting..." badge with spinner |
| `connected` | Successfully connected | Green "Connected" badge |
| `error` | Connection failed | Red "Error" badge with error message |

## Usage

### Basic Usage

```tsx
import { useRosConnection } from './hooks/useRosConnection';

function MyComponent() {
  const { ros, isConnected, connectionState, error, reconnect } = useRosConnection('ws://localhost:9090');

  if (isConnected) {
    // Subscribe to ROS topics
    const scanSub = new window.ROSLIB.Topic({
      ros: ros,
      name: '/scan',
      messageType: 'sensor_msgs/msg/LaserScan'
    });
  }

  return (
    <button onClick={reconnect}>Reconnect</button>
  );
}
```

### ConnectionStatus Component

The `ConnectionStatus` component provides a complete UI for connection management:

```tsx
import { ConnectionStatus } from './components/ConnectionStatus';

// Simple usage with default ws://localhost:9090
<ConnectionStatus />

// Custom WebSocket URL
<ConnectionStatus wsUrl="ws://192.168.1.100:9090" />
```

Features:
- Visual connection state badge (color-coded)
- Error message display with truncation
- Manual reconnect button (appears on disconnect/error)
- Reconnection attempt counter
- Animated spinner during connection

## API Reference

### useRosConnection(wsUrl)

**Parameters:**
- `wsUrl` (string): WebSocket URL to rosbridge_websocket server (default: `ws://localhost:9090`)

**Returns:**
- `ros`: ROSLIB.Ros instance (null if disconnected)
- `isConnected`: Boolean indicating active connection
- `isConnecting`: Boolean indicating connection in progress
- `connectionState`: Current state (`disconnected` | `connecting` | `connected` | `error`)
- `error`: Error message string (null if no error)
- `reconnect()`: Function to manually reconnect
- `disconnect()`: Function to close connection
- `reconnectCount`: Number of reconnection attempts

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "ROSLIB not loaded" | CDN scripts blocked or not loaded | Check internet connection, reload page |
| "Connection timeout" | rosbridge_websocket not running | Start rosbridge on ROS machine |
| "Connection refused" | Wrong WebSocket URL | Verify WS URL matches rosbridge config |
| Frequent disconnects | Network instability | Check network, increase timeout if needed |

### Testing Connection

1. Start rosbridge_websocket on ROS machine:
```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

2. Open browser console and check for:
```
Connected to ROS WebSocket server
```

3. If errors appear, check:
- Firewall allows port 9090
- ROS machine is reachable on network
- rosbridge_websocket is running

## Files

- [hooks/useRosConnection.ts](../packages/client/src/hooks/useRosConnection.ts) - Main hook implementation
- [components/ConnectionStatus.tsx](../packages/client/src/components/ConnectionStatus.tsx) - UI component
