import { useState, useEffect, useRef } from 'react';
import * as ROSLIB from 'roslib';

export interface PathPoint {
  x: number;
  y: number;
}

export interface NavPath {
  points: PathPoint[];
  timestamp: number;
}

export function useRosPath(
  ros: ROSLIB.Ros | null,
  globalPlanTopic: string = '/plan',
  localPlanTopic: string = '/local_plan',
  paused: boolean = false
) {
  const [globalPath, setGlobalPath] = useState<NavPath | null>(null);
  const [localPath, setLocalPath] = useState<NavPath | null>(null);

  useEffect(() => {
    if (!ros) {
      setGlobalPath(null);
      setLocalPath(null);
      return;
    }

    // Subscribe to global plan
    const globalSub = new ROSLIB.Topic({
      ros,
      name: globalPlanTopic,
      messageType: 'nav_msgs/msg/Path',
    });

    globalSub.subscribe((message: unknown) => {
      if (paused) return;

      const pathMsg = message as {
        header: { stamp: { sec: number; nsec: number } };
        poses: Array<{
          pose: {
            position: { x: number; y: number; z: number };
            orientation: { x: number; y: number; z: number; w: number };
          };
        }>;
      };

      const points: PathPoint[] = pathMsg.poses.map(p => ({
        x: p.pose.position.x,
        y: p.pose.position.y,
      }));

      setGlobalPath({
        points,
        timestamp: pathMsg.header.stamp.sec + pathMsg.header.stamp.nsec / 1e9,
      });
    });

    // Subscribe to local plan
    const localSub = new ROSLIB.Topic({
      ros,
      name: localPlanTopic,
      messageType: 'nav_msgs/msg/Path',
    });

    localSub.subscribe((message: unknown) => {
      if (paused) return;

      const pathMsg = message as {
        header: { stamp: { sec: number; nsec: number } };
        poses: Array<{
          pose: {
            position: { x: number; y: number; z: number };
            orientation: { x: number; y: number; z: number; w: number };
          };
        }>;
      };

      const points: PathPoint[] = pathMsg.poses.map(p => ({
        x: p.pose.position.x,
        y: p.pose.position.y,
      }));

      setLocalPath({
        points,
        timestamp: pathMsg.header.stamp.sec + pathMsg.header.stamp.nsec / 1e9,
      });
    });

    (globalSub as any).on('error', (err: Error) => {
      console.error('[useRosPath] Global plan error:', err);
    });

    (localSub as any).on('error', (err: Error) => {
      console.error('[useRosPath] Local plan error:', err);
    });

    return () => {
      globalSub.unsubscribe();
      localSub.unsubscribe();
      setGlobalPath(null);
      setLocalPath(null);
    };
  }, [ros, globalPlanTopic, localPlanTopic, paused]);

  return {
    globalPath,
    localPath,
  };
}

// Goal pose publisher hook
export function useGoalPublisher(
  ros: ROSLIB.Ros | null,
  goalTopic: string = '/goal_pose'
) {
  const goalPubRef = useRef<any>(null);

  useEffect(() => {
    if (!ros) return;

    goalPubRef.current = new ROSLIB.Topic({
      ros,
      name: goalTopic,
      messageType: 'geometry_msgs/msg/PoseStamped',
    });

    return () => {
      if (goalPubRef.current) {
        goalPubRef.current.unadvertise();
        goalPubRef.current = null;
      }
    };
  }, [ros, goalTopic]);

  const publishGoal = (x: number, y: number, theta: number = 0) => {
    if (!goalPubRef.current) return;

    const quat = {
      x: 0,
      y: 0,
      z: Math.sin(theta / 2),
      w: Math.cos(theta / 2),
    };

    const now = new Date();
    const goal = {
      header: {
        stamp: {
          sec: Math.floor(now.getTime() / 1000),
          nsec: (now.getTime() % 1000) * 1000000,
        },
        frame_id: 'map',
      },
      pose: {
        position: { x, y, z: 0 },
        orientation: quat,
      },
    };

    goalPubRef.current.publish(goal);
    console.log('[useGoalPublisher] Published goal:', x, y, theta);
  };

  return { publishGoal };
}

// Initial pose publisher hook
export function useInitialPosePublisher(
  ros: ROSLIB.Ros | null,
  topic: string = '/initialpose'
) {
  const posePubRef = useRef<any>(null);

  useEffect(() => {
    if (!ros) return;

    posePubRef.current = new ROSLIB.Topic({
      ros,
      name: topic,
      messageType: 'geometry_msgs/msg/PoseWithCovarianceStamped',
    });

    return () => {
      if (posePubRef.current) {
        posePubRef.current.unadvertise();
        posePubRef.current = null;
      }
    };
  }, [ros, topic]);

  const publishInitialPose = (x: number, y: number, theta: number = 0) => {
    if (!posePubRef.current) return;

    const quat = {
      x: 0,
      y: 0,
      z: Math.sin(theta / 2),
      w: Math.cos(theta / 2),
    };

    const now = new Date();
    const pose = {
      header: {
        stamp: {
          sec: Math.floor(now.getTime() / 1000),
          nsec: (now.getTime() % 1000) * 1000000,
        },
        frame_id: 'map',
      },
      pose: {
        pose: {
          position: { x, y, z: 0 },
          orientation: quat,
        },
        covariance: [
          0.25, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.25, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0685389192,
        ],
      },
    };

    posePubRef.current.publish(pose);
    console.log('[useInitialPosePublisher] Published initial pose:', x, y, theta);
  };

  return { publishInitialPose };
}
