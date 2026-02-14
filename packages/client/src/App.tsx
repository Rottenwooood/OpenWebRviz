import { useState, useEffect } from 'react';
import { ConnectionStatus } from './components/ConnectionStatus';
import { MapCanvas } from './components/MapCanvas';
import { LayerControl } from './components/LayerControl';
import { useRosConnection } from './hooks/useRosConnection';

function App() {
  const { isConnected, error, ros } = useRosConnection('ws://localhost:9090');

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">WebBot-Viz</h1>
        <ConnectionStatus isConnected={isConnected} error={error} />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r p-4 overflow-y-auto">
          <LayerControl ros={ros} />
        </aside>

        {/* Map Canvas */}
        <main className="flex-1 relative">
          <MapCanvas ros={ros} isConnected={isConnected} />
        </main>
      </div>
    </div>
  );
}

export default App;
