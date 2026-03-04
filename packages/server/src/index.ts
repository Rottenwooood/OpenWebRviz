import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const app = new Hono();

const MAPS_DIR = path.join(process.cwd(), 'maps');
const SLAM_PROCESS_FILE = path.join(process.cwd(), '.slam_pid');
const ROSBRIDGE_PROCESS_FILE = path.join(process.cwd(), '.rosbridge_pid');

// Ensure maps directory exists
if (!fs.existsSync(MAPS_DIR)) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
}

app.use('/*', cors({
  origin: 'http://localhost:3000',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check rosbridge status
app.get('/api/rosbridge/status', async (c) => {
  try {
    const { stdout } = await execAsync('pgrep -f rosbridge_websocket || true');
    const isRunning = stdout.trim().length > 0;
    return c.json({ running: isRunning });
  } catch {
    return c.json({ running: false });
  }
});

// Start rosbridge
app.post('/api/rosbridge/start', async (c) => {
  try {
    // Check if already running
    const { stdout } = await execAsync('pgrep -f rosbridge_websocket || true');
    if (stdout.trim().length > 0) {
      return c.json({ status: 'already_running' });
    }

    // Start rosbridge
    const cmd = 'ros2 launch rosbridge_server rosbridge_websocket_launch.xml &';
    exec(cmd);

    await new Promise(resolve => setTimeout(resolve, 2000));

    return c.json({ status: 'started' });
  } catch (error) {
    return c.json({ error: 'Failed to start rosbridge', details: String(error) }, 500);
  }
});

// Stop rosbridge
app.post('/api/rosbridge/stop', async (c) => {
  try {
    exec('pkill -f rosbridge_websocket');
    return c.json({ status: 'stopped' });
  } catch {
    return c.json({ status: 'error' });
  }
});

app.get('/api/ros-topics', (c) => {
  return c.json({
    topics: [],
    message: 'ROS connection is handled client-side via rosbridge_websocket'
  });
});

// Get list of saved maps
app.get('/api/maps', async (c) => {
  try {
    const files = fs.readdirSync(MAPS_DIR);
    const maps = files
      .filter(f => f.endsWith('.yaml'))
      .map(f => {
        const stats = fs.statSync(path.join(MAPS_DIR, f));
        return {
          name: f.replace('.yaml', ''),
          filename: f,
          path: path.join(MAPS_DIR, f),
          created: stats.birthtime.toISOString(),
        };
      });
    return c.json({ maps });
  } catch (error) {
    return c.json({ error: 'Failed to list maps', details: String(error) }, 500);
  }
});

// Get slam config
app.get('/api/slam-config', async (c) => {
  try {
    // Try local config first (packages/server/config/)
    const localConfig = path.join(process.cwd(), 'config', 'slam_default.yaml');
    if (fs.existsSync(localConfig)) {
      const content = fs.readFileSync(localConfig, 'utf-8');
      return c.json({ configPath: localConfig, content });
    }

    // Try to find slam config in common system locations
    const configPaths = [
      '/opt/ros/humble/share/slam_toolbox/params/mapper_params_online_async.yaml',
      '/opt/ros/humble/share/slam_toolbox/params/mapper_params_offline.yaml',
      '/usr/share/slam_toolbox/params/mapper_params_online_async.yaml',
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        return c.json({ configPath, content: content.substring(0, 1000) });
      }
    }

    // Return default config
    return c.json({
      configPath: 'default',
      content: 'lidar_frame: laser\nodom_frame: odom\nmap_frame: map\nmode: mapping\n',
    });
  } catch (error) {
    return c.json({ error: 'Failed to get config', details: String(error) }, 500);
  }
});

// Start SLAM
app.post('/api/slam/start', async (c) => {
  try {
    const body = await c.req.json();

    // Find config file - use local first, then system
    let configPath = body.configPath;
    if (!configPath || configPath === 'default') {
      const localConfig = path.join(process.cwd(), 'config', 'slam_default.yaml');
      if (fs.existsSync(localConfig)) {
        configPath = localConfig;
      } else {
        configPath = '/opt/ros/humble/share/slam_toolbox/params/mapper_params_online_async.yaml';
      }
    }

    // Kill existing slam if running
    if (fs.existsSync(SLAM_PROCESS_FILE)) {
      const pid = fs.readFileSync(SLAM_PROCESS_FILE, 'utf-8').trim();
      try {
        exec(`kill ${pid}`);
        console.log(`Killed existing SLAM process ${pid}`);
      } catch {}
    }

    // Start slam_toolbox
    const cmd = `ros2 launch slam_toolbox online_async_launch.py params_file:=${configPath} use_sim_time:=true &`;
    console.log('Starting SLAM with config:', configPath);
    exec(cmd);

    // Save PID
    const { stdout } = await execAsync('pgrep -f "slam_toolbox" | head -1');
    const pid = stdout.trim();
    if (pid) {
      fs.writeFileSync(SLAM_PROCESS_FILE, pid);
    }

    return c.json({ status: 'started', pid });
  } catch (error) {
    return c.json({ error: 'Failed to start SLAM', details: String(error) }, 500);
  }
});

// Stop SLAM
app.post('/api/slam/stop', async (c) => {
  try {
    if (fs.existsSync(SLAM_PROCESS_FILE)) {
      const pid = fs.readFileSync(SLAM_PROCESS_FILE, 'utf-8').trim();
      try {
        exec(`kill ${pid}`);
      } catch {}
      fs.unlinkSync(SLAM_PROCESS_FILE);
    }

    // Also try to kill by process name
    try {
      exec('pkill -f slam_toolbox');
    } catch {}

    return c.json({ status: 'stopped' });
  } catch (error) {
    return c.json({ error: 'Failed to stop SLAM', details: String(error) }, 500);
  }
});

// Save map
app.post('/api/maps/save', async (c) => {
  try {
    const body = await c.req.json();
    const mapName = body.name || `map_${Date.now()}`;
    const mapYamlPath = path.join(MAPS_DIR, `${mapName}.yaml`);
    const mapPgmPath = path.join(MAPS_DIR, `${mapName}.pgm`);

    // Use map_saver_cli to save the map
    const cmd = `ros2 run nav2_map_server map_saver_cli -f ${path.join(MAPS_DIR, mapName)}`;
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
      console.error('Map saver error:', e);
    }

    // Wait a bit for map to be saved
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if files exist
    const yamlExists = fs.existsSync(mapYamlPath);
    const pgmExists = fs.existsSync(mapPgmPath);

    if (!yamlExists) {
      return c.json({ error: 'Failed to save map files' }, 500);
    }

    return c.json({
      status: 'saved',
      map: {
        name: mapName,
        yamlPath: mapYamlPath,
        pgmPath: mapPgmPath,
      }
    });
  } catch (error) {
    return c.json({ error: 'Failed to save map', details: String(error) }, 500);
  }
});

// Delete map
app.delete('/api/maps/:name', async (c) => {
  try {
    const mapName = c.req.param('name');
    const mapYamlPath = path.join(MAPS_DIR, `${mapName}.yaml`);
    const mapPgmPath = path.join(MAPS_DIR, `${mapName}.pgm`);

    if (fs.existsSync(mapYamlPath)) {
      fs.unlinkSync(mapYamlPath);
    }
    if (fs.existsSync(mapPgmPath)) {
      fs.unlinkSync(mapPgmPath);
    }

    return c.json({ status: 'deleted', name: mapName });
  } catch (error) {
    return c.json({ error: 'Failed to delete map', details: String(error) }, 500);
  }
});

// Check SLAM status
app.get('/api/slam/status', async (c) => {
  try {
    // Check for tmux session first
    let tmuxRunning = false;
    try {
      execSync('tmux has-session -t webbot_viz 2>/dev/null', { stdio: 'ignore' });
      tmuxRunning = true;
    } catch {
      tmuxRunning = false;
    }

    // Also check for actual slam_toolbox processes or map publisher
    const { stdout } = await execAsync('pgrep -a slam_toolbox || true');
    let slamRunning = stdout.trim().length > 0 && !stdout.includes('grep');

    // Alternative: check if map topic has publishers
    if (!slamRunning) {
      try {
        execSync('ros2 topic info /map 2>/dev/null | grep "Publisher count: [1-9]"', { stdio: 'ignore' });
        slamRunning = true;
      } catch {
        slamRunning = false;
      }
    }

    return c.json({ running: slamRunning, tmux: tmuxRunning });
  } catch {
    return c.json({ running: false, tmux: false });
  }
});

// Start with tmux session
app.post('/api/slam/start-tmux', async (c) => {
  try {
    const body = await c.req.json();
    const scriptPath = body.scriptPath || path.join(process.cwd(), '..', '..', 'start_webbot_viz.sh');

    // Kill existing slam first
    try {
      exec('pkill -f slam_toolbox');
      exec('pkill -f start_webbot_viz');
    } catch {}

    // Check if tmux session exists and kill it
    try {
      exec('tmux kill-session -t webbot_viz 2>/dev/null || true');
    } catch {}

    // Create new tmux session and run script
    const cmd = `tmux new -s webbot_viz -d "bash ${scriptPath}"`;
    exec(cmd);

    // Wait a moment for script to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Save PID info
    const { stdout } = await execAsync('pgrep -f start_webbot_viz | head -1 || true');
    if (stdout.trim()) {
      fs.writeFileSync(SLAM_PROCESS_FILE, stdout.trim());
    }

    return c.json({ status: 'started', session: 'webbot_viz', script: scriptPath });
  } catch (error) {
    return c.json({ error: 'Failed to start tmux', details: String(error) }, 500);
  }
});

// Stop tmux session
app.post('/api/slam/stop-tmux', async (c) => {
  try {
    // Kill TMUX session first
    try {
      exec('tmux kill-session -t webbot_viz 2>/dev/null || true');
    } catch {}

    // Kill all related processes - be more aggressive
    try {
      exec('pkill -f start_webbot_viz');
    } catch {}
    try {
      exec('pkill -f slam_toolbox');
    } catch {}
    try {
      exec('pkill -f turtlebot3_gazebo');
    } catch {}
    try {
      exec('pkill -f "gz sim"');
    } catch {}

    if (fs.existsSync(SLAM_PROCESS_FILE)) {
      fs.unlinkSync(SLAM_PROCESS_FILE);
    }

    return c.json({ status: 'stopped' });
  } catch (error) {
    return c.json({ error: 'Failed to stop tmux', details: String(error) }, 500);
  }
});

// Get server network info
app.get('/api/network', async (c) => {
  try {
    const { stdout } = await execAsync('hostname -I 2>/dev/null || ip addr show | grep inet | grep -v 127.0.0.1 | head -1');
    const ips = stdout.trim().split(' ').filter(ip => ip.match(/\d+\.\d+\.\d+\.\d+/));

    return c.json({
      ips,
      hostname: require('os').hostname(),
      port: PORT,
    });
  } catch {
    return c.json({ ips: ['localhost'], hostname: 'localhost', port: PORT });
  }
});

// Broadcast presence (for discovery)
app.post('/api/broadcast', async (c) => {
  const body = await c.req.json();
  const port = body.port || PORT;

  // This endpoint can be called by other services to register themselves
  // For now, just acknowledge
  return c.json({ status: 'acknowledged', port });
});

const PORT = process.env.PORT || 4000;

console.log(`Server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
