#!/bin/bash

# WebBot-Viz Startup Script
# This script starts ROS 2 simulation and SLAM for WebBot-Viz
# Run in TMUX: tmux new -s webbot_viz -d "bash /path/to/start_webbot_viz.sh"
# Stop: tmux kill-session -t webbot_viz

# Source ROS 2
source /opt/ros/jazzy/setup.bash

# Save PIDs of all child processes
CHILD_PIDS=""

cleanup() {
    echo "Stopping all processes..."
    for pid in $CHILD_PIDS; do
        kill -TERM "$pid" 2>/dev/null
    done
    # Also kill any remaining child processes
    pkill -P $$ 2>/dev/null
    exit 0
}

trap cleanup SIGHUP SIGTERM EXIT

echo "=== Starting TurtleBot3 Gazebo Simulation ==="
export TURTLEBOT3_MODEL=burger

# Start gazebo and save its PID
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py &
CHILD_PIDS="$CHILD_PIDS $!"

# Wait for Gazebo to start
sleep 15

echo "=== Starting Robot State Publisher (for TF) ==="
ros2 run robot_state_publisher robot_state_publisher &
CHILD_PIDS="$CHILD_PIDS $!"

echo "=== Starting SLAM Toolbox ==="
ros2 launch slam_toolbox online_async_launch.py &
CHILD_PIDS="$CHILD_PIDS $!"

echo "=== Setup Complete ==="
echo "SLAM running. Kill TMUX session to stop all processes."
echo "Child PIDs: $CHILD_PIDS"

# Wait for all background processes
wait
