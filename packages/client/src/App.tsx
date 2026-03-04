import { useState } from 'react';
import { ConnectionStatus } from './components/ConnectionStatus';
import { MapCanvas } from './components/MapCanvas';
import { LayerControl, LayerControlProvider, useLayers } from './components/LayerControl';
import { DebugPanel } from './hooks/usePerformanceMonitor';
import { useRosConnection } from './hooks/useRosConnection';
import { useKeyboardTeleop } from './hooks/useKeyboardTeleop';

function AppContent() {
  const [showDebug, setShowDebug] = useState(false);
  const { ros, isConnected } = useRosConnection('ws://localhost:9090');
  const { subscriptionSettings } = useLayers();

  // Enable keyboard teleop when connected
  useKeyboardTeleop(ros, {
    linearSpeed: 0.5,
    angularSpeed: 1.0,
    cmdVelTopic: '/cmd_vel',
  }, isConnected);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">WebBot-Viz</h1>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>
        <ConnectionStatus wsUrl="ws://localhost:9090" />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r p-4 overflow-y-auto">
          <LayerControl />
        </aside>

        {/* Map Canvas */}
        <main className="flex-1 relative">
          {showDebug && <DebugPanel />}
          <MapCanvas ros={ros} isConnected={isConnected} />
        </main>
      </div>

      {/* Keyboard Control Help */}
      {isConnected && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded text-sm">
          <span className="font-mono">W/A/S/D</span> or <span className="font-mono">Arrow Keys</span> to move
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <LayerControlProvider>
      <AppContent />
    </LayerControlProvider>
  );
}

export default App;
