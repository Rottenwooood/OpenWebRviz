import { useState, useEffect, useCallback } from 'react';

// Type declarations for global ROSLIB
declare global {
  interface Window {
    ROSLIB: typeof import('roslib');
  }
}

export function useRosConnection(wsUrl: string) {
  const [ros, setRos] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    try {
      if (!window.ROSLIB) {
        throw new Error('ROSLIB not loaded. Check internet connection.');
      }

      const rosInstance = new window.ROSLIB.Ros({
        url: wsUrl,
      });

      rosInstance.on('connection', () => {
        console.log('Connected to ROS WebSocket server');
        setIsConnected(true);
        setError(null);
      });

      rosInstance.on('error', (err: Error) => {
        console.error('ROS connection error:', err);
        setError(err.message);
        setIsConnected(false);
      });

      rosInstance.on('close', () => {
        console.log('ROS WebSocket connection closed');
        setIsConnected(false);
      });

      setRos(rosInstance);
    } catch (err) {
      console.error('Failed to create ROS connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [wsUrl]);

  useEffect(() => {
    connect();

    return () => {
      if (ros) {
        ros.close();
      }
    };
  }, [connect]);

  return { ros, isConnected, error, reconnect: connect };
}
