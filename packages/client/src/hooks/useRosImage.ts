import { useState, useEffect, useRef } from 'react';
import * as ROSLIB from 'roslib';

export function useRosImage(
  ros: ROSLIB.Ros | null,
  imageTopic: string = '/image_raw/compressed',
  paused: boolean = false
) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isImageReceived, setIsImageReceived] = useState(false);

  useEffect(() => {
    if (!ros) {
      setImageData(null);
      setIsImageReceived(false);
      return;
    }

    const imageSub = new ROSLIB.Topic({
      ros,
      name: imageTopic,
      messageType: 'sensor_msgs/msg/CompressedImage',
    });

    imageSub.subscribe((message: unknown) => {
      if (paused) return;

      const imageMsg = message as {
        header: { stamp: { sec: number; nsec: number } };
        format: string;
        data: number[];
      };

      // Convert Uint8Array to base64
      const uint8Array = new Uint8Array(imageMsg.data);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:image/${imageMsg.format};base64,${base64}`;

      setImageData(dataUrl);
      setIsImageReceived(true);
    });

    (imageSub as any).on('error', (err: Error) => {
      console.error('[useRosImage] Image subscription error:', err);
    });

    return () => {
      imageSub.unsubscribe();
      setImageData(null);
      setIsImageReceived(false);
    };
  }, [ros, imageTopic, paused]);

  return {
    imageData,
    isImageReceived,
  };
}
