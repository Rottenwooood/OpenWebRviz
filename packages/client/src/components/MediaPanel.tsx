interface MediaConfig {
  janusBaseUrl: string;
  janusDemoBaseUrl: string;
  streamingUrl: string;
  audioBridgeUrl: string;
}

interface MediaPanelProps {
  media: MediaConfig;
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function MediaPanel({ media }: MediaPanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-gray-500">Media</h3>
        <p className="mt-1 text-xs text-gray-500">
          音视频通过 Jetson 上的 Janus 走 WebRTC，和 ROS 数据链路分开。
        </p>
      </div>

      <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
        <div className="text-xs font-medium text-gray-700">Video / Audio Receive</div>
        <div className="break-all text-xs text-gray-500">{media.streamingUrl}</div>
        <button
          onClick={() => openExternal(media.streamingUrl)}
          className="w-full rounded bg-slate-800 px-3 py-2 text-xs text-white hover:bg-slate-900"
        >
          Open Streaming Demo
        </button>
      </div>

      <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
        <div className="text-xs font-medium text-gray-700">Two-way Audio Send</div>
        <div className="break-all text-xs text-gray-500">{media.audioBridgeUrl}</div>
        <button
          onClick={() => openExternal(media.audioBridgeUrl)}
          className="w-full rounded bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700"
        >
          Open AudioBridge Demo
        </button>
        <p className="text-[11px] text-gray-500">
          页面打开后仍需在浏览器控制台执行 `rtp_forward`，把 Janus 音频转发到 Jetson 本地 UDP 端口。
        </p>
      </div>

      <div className="space-y-1 rounded border border-dashed border-gray-300 p-3 text-[11px] text-gray-500">
        <div>Janus API: {media.janusBaseUrl}</div>
        <div>Janus Demo: {media.janusDemoBaseUrl}</div>
      </div>
    </div>
  );
}
