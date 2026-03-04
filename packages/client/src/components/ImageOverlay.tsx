import { useRosImage } from '../hooks/useRosImage';
import { useLayers } from './LayerControl';

interface ImageOverlayProps {
  ros: any;
}

export function ImageOverlay({ ros }: ImageOverlayProps) {
  const { layers, subscriptionSettings } = useLayers();
  const { imageData, isImageReceived } = useRosImage(ros, '/image_raw/compressed', subscriptionSettings.paused);

  if (!layers.image || !isImageReceived || !imageData) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 w-64 h-48 bg-black border-2 border-gray-600 rounded overflow-hidden">
      <img
        src={imageData}
        alt="Camera feed"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
