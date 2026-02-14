import { useState } from 'react';
import { ROS } from 'roslibjs';

interface LayerControlProps {
  ros: ROS | null;
}

interface LayerState {
  map: boolean;
  laser: boolean;
  tf: boolean;
  globalPlan: boolean;
  localPlan: boolean;
}

export function LayerControl({ ros }: LayerControlProps) {
  const [layers, setLayers] = useState<LayerState>({
    map: true,
    laser: true,
    tf: true,
    globalPlan: true,
    localPlan: true,
  });

  const toggleLayer = (layer: keyof LayerState) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700">Layers</h2>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.map}
            onChange={() => toggleLayer('map')}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Map</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.laser}
            onChange={() => toggleLayer('laser')}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Laser Scan</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.tf}
            onChange={() => toggleLayer('tf')}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Robot (TF)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.globalPlan}
            onChange={() => toggleLayer('globalPlan')}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Global Plan</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.localPlan}
            onChange={() => toggleLayer('localPlan')}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Local Plan</span>
        </label>
      </div>
    </div>
  );
}
