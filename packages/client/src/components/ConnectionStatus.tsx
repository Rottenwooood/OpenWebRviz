import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
}

export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle size={18} />
        <span className="text-sm font-medium">Connection Error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <Wifi size={18} className="text-green-600" />
          <span className="text-sm font-medium text-green-600">Connected</span>
        </>
      ) : (
        <>
          <WifiOff size={18} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Disconnected</span>
        </>
      )}
    </div>
  );
}
