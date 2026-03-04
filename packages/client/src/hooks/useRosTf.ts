import { useState, useEffect, useRef, useCallback } from 'react';
import * as ROSLIB from 'roslib';

export interface Transform {
  translation: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}

export interface RobotPose {
  x: number;
  y: number;
  theta: number;
  frameId: string;
}

// TF Tree structure
export interface TFFrame {
  name: string;
  parent: string | null;
  translation: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  timestamp: number;
}

export interface TFTree {
  frames: Map<string, TFFrame>;
}

// Subscribe to /tf topic and build TF tree
export function useRosTfTree(ros: ROSLIB.Ros | null, paused: boolean = false) {
  const [tfTree, setTfTree] = useState<TFTree>({ frames: new Map() });
  const [robotPose, setRobotPose] = useState<RobotPose | null>(null);
  const framesRef = useRef<Map<string, TFFrame>>(new Map());

  useEffect(() => {
    if (!ros) {
      framesRef.current = new Map();
      setTfTree({ frames: new Map() });
      setRobotPose(null);
      return;
    }

    const tfSub = new ROSLIB.Topic({
      ros,
      name: '/tf',
      messageType: 'tf2_msgs/msg/TFMessage',
    });

    tfSub.subscribe((message: unknown) => {
      if (paused) return;

      const tfMsg = message as { transforms: Array<{
        header: { stamp: { sec: number; nsec: number }; frame_id: string; };
        child_frame_id: string;
        transform: { translation: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } };
      }> };

      let updated = false;

      for (const transform of tfMsg.transforms) {
        const frameId = transform.header.frame_id;
        const childFrameId = transform.child_frame_id;
        const timestamp = transform.header.stamp.sec + transform.header.stamp.nsec / 1e9;

        // Update or create frame
        const existingFrame = framesRef.current.get(childFrameId);
        const frame: TFFrame = {
          name: childFrameId,
          parent: frameId,
          translation: transform.transform.translation,
          rotation: transform.transform.rotation,
          timestamp,
        };

        // Only update if newer
        if (!existingFrame || timestamp > existingFrame.timestamp) {
          framesRef.current.set(childFrameId, frame);
          updated = true;
        }
      }

      // Get robot pose from base_link if available
      const baseLinkFrame = framesRef.current.get('base_link');
      if (baseLinkFrame) {
        const mapFrame = framesRef.current.get('map');
        let x = baseLinkFrame.translation.x;
        let y = baseLinkFrame.translation.y;
        let theta = quatToTheta(baseLinkFrame.rotation);

        // If base_link is not directly child of map, try to get transform
        if (mapFrame && baseLinkFrame.parent !== 'map') {
          // For now, use direct base_link position
        }

        setRobotPose({
          x,
          y,
          theta,
          frameId: 'base_link',
        });
      }

      if (updated) {
        setTfTree({ frames: new Map(framesRef.current) });
      }
    });

    // Also subscribe to /tf_static for static transforms
    const tfStaticSub = new ROSLIB.Topic({
      ros,
      name: '/tf_static',
      messageType: 'tf2_msgs/msg/TFMessage',
    });

    tfStaticSub.subscribe((message: unknown) => {
      if (paused) return;

      const tfMsg = message as { transforms: Array<{
        header: { frame_id: string; };
        child_frame_id: string;
        transform: { translation: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } };
      }> };

      let updated = false;

      for (const transform of tfMsg.transforms) {
        const frameId = transform.header.frame_id;
        const childFrameId = transform.child_frame_id;

        const frame: TFFrame = {
          name: childFrameId,
          parent: frameId,
          translation: transform.transform.translation,
          rotation: transform.transform.rotation,
          timestamp: 0, // Static transforms have timestamp 0
        };

        const existingFrame = framesRef.current.get(childFrameId);
        if (!existingFrame || existingFrame.timestamp === 0) {
          framesRef.current.set(childFrameId, frame);
          updated = true;
        }
      }

      if (updated) {
        setTfTree({ frames: new Map(framesRef.current) });
      }
    });

    (tfSub as any).on('error', (err: Error) => {
      console.error('[useRosTfTree] TF subscription error:', err);
    });

    return () => {
      tfSub.unsubscribe();
      tfStaticSub.unsubscribe();
      framesRef.current = new Map();
      setTfTree({ frames: new Map() });
      setRobotPose(null);
    };
  }, [ros, paused]);

  return {
    tfTree,
    robotPose,
  };
}

// Simple TF listener for single frame transform
export function useRosTf(
  ros: ROSLIB.Ros | null,
  targetFrame: string = 'map',
  sourceFrame: string = 'base_link',
  paused: boolean = false
) {
  const [robotPose, setRobotPose] = useState<RobotPose | null>(null);

  useEffect(() => {
    if (!ros) {
      setRobotPose(null);
      return;
    }

    const tfClient = new ROSLIB.TFClient({
      ros,
      fixedFrame: targetFrame,
      angularThres: 0.01,
      transThres: 0.01,
    });

    // Wait for transform to become available
    tfClient.subscribe(sourceFrame, (transform) => {
      if (paused) return;
      if (transform) {
        const pose: RobotPose = {
          x: transform.translation.x,
          y: transform.translation.y,
          theta: quatToTheta(transform.rotation),
          frameId: sourceFrame,
        };
        setRobotPose(pose);
      }
    });

    return () => {
      tfClient.unsubscribe(sourceFrame);
      setRobotPose(null);
    };
  }, [ros, targetFrame, sourceFrame, paused]);

  return robotPose;
}

// Convert quaternion to theta (yaw)
function quatToTheta(q: { x: number; y: number; z: number; w: number }): number {
  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(siny_cosp, cosy_cosp);
}
