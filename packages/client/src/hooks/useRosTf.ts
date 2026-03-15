import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

export interface RobotPose {
  x: number;
  y: number;
  theta: number;
  frameId: string;
}

type TfTransform = {
  header: { stamp: { sec: number; nsec: number }; frame_id: string };
  child_frame_id: string;
  transform: {
    translation: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  };
};

function quatToYaw(q: { x: number; y: number; z: number; w: number }) {
  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(siny_cosp, cosy_cosp);
}

function normalizeAngle(angle: number) {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function compose2D(
  a: { x: number; y: number; theta: number },
  b: { x: number; y: number; theta: number }
) {
  const cosA = Math.cos(a.theta);
  const sinA = Math.sin(a.theta);

  return {
    x: a.x + cosA * b.x - sinA * b.y,
    y: a.y + sinA * b.x + cosA * b.y,
    theta: normalizeAngle(a.theta + b.theta),
  };
}

// Simple TF listener - compose TF chain manually from /tf
export function useRosTfTree(ros: ROSLIB.Ros | null, paused: boolean = false) {
  const [robotPose, setRobotPose] = useState<RobotPose | null>(null);

  useEffect(() => {
    if (!ros) {
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

      const tfMsg = message as { transforms: TfTransform[] };
      if (!tfMsg.transforms || tfMsg.transforms.length === 0) return;

      const findTf = (parent: string, child: string) =>
        tfMsg.transforms.find(
          t => t.header.frame_id === parent && t.child_frame_id === child
        );

      const mapToCameraInit = findTf('map', 'camera_init');
      const cameraInitToBody = findTf('camera_init', 'body');
      const bodyToBaseLink = findTf('body', 'base_link');

      // 先优先求 map -> body
      if (mapToCameraInit && cameraInitToBody) {
        const a = {
          x: mapToCameraInit.transform.translation.x,
          y: mapToCameraInit.transform.translation.y,
          theta: quatToYaw(mapToCameraInit.transform.rotation),
        };

        const b = {
          x: cameraInitToBody.transform.translation.x,
          y: cameraInitToBody.transform.translation.y,
          theta: quatToYaw(cameraInitToBody.transform.rotation),
        };

        const mapToBody = compose2D(a, b);

        // 如果还存在 body -> base_link，则进一步合成 map -> base_link
        if (bodyToBaseLink) {
          const c = {
            x: bodyToBaseLink.transform.translation.x,
            y: bodyToBaseLink.transform.translation.y,
            theta: quatToYaw(bodyToBaseLink.transform.rotation),
          };

          const mapToBaseLink = compose2D(mapToBody, c);

          setRobotPose({
            x: mapToBaseLink.x,
            y: mapToBaseLink.y,
            theta: mapToBaseLink.theta,
            frameId: 'map->base_link',
          });
          return;
        }

        setRobotPose({
          x: mapToBody.x,
          y: mapToBody.y,
          theta: mapToBody.theta,
          frameId: 'map->body',
        });
        return;
      }

      // 回退：如果没有 map->camera_init，但有 camera_init->body，至少还能显示 SLAM 局部位姿
      if (cameraInitToBody) {
        const translation = cameraInitToBody.transform.translation;
        const rotation = cameraInitToBody.transform.rotation;
        const theta = quatToYaw(rotation);

        setRobotPose({
          x: translation.x,
          y: translation.y,
          theta,
          frameId: 'camera_init->body',
        });
      }
    });

    return () => {
      tfSub.unsubscribe();
      setRobotPose(null);
    };
  }, [ros, paused]);

  return { robotPose };
}

// Simple TF listener for single frame transform (alternative API)
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

    tfClient.subscribe(sourceFrame, (transform) => {
      if (paused) return;
      if (transform) {
        const siny_cosp = 2 * (transform.rotation.w * transform.rotation.z + transform.rotation.x * transform.rotation.y);
        const cosy_cosp = 1 - 2 * (transform.rotation.y * transform.rotation.y + transform.rotation.z * transform.rotation.z);
        const theta = Math.atan2(siny_cosp, cosy_cosp);

        setRobotPose({
          x: transform.translation.x,
          y: transform.translation.y,
          theta,
          frameId: sourceFrame,
        });
      }
    });

    return () => {
      tfClient.unsubscribe(sourceFrame);
      setRobotPose(null);
    };
  }, [ros, targetFrame, sourceFrame, paused]);

  return robotPose;
}
