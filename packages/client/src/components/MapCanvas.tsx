import { useEffect, useRef } from 'react';
import { ROS } from 'roslibjs';

interface MapCanvasProps {
  ros: ROS | null;
  isConnected: boolean;
}

export function MapCanvas({ ros, isConnected }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Set canvas size to fill container
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !ros) return;

    // TODO: Subscribe to /map topic and render occupancy grid
    // TODO: Subscribe to /tf to get robot position

    console.log('ROS connected, ready to receive data');
  }, [isConnected, ros]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <p className="text-white text-lg">Connect to ROS to view the map</p>
        </div>
      )}
    </div>
  );
}
