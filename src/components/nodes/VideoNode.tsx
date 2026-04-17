'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useCanvasStore } from '@/store/useCanvasStore';

function VideoNode({ id, data }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  return (
    <div className="min-w-[150px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-10 items-center gap-2 rounded-t-lg bg-orange-50 px-3 dark:bg-orange-900/30">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-600 text-[10px] font-bold text-white">
          🎬
        </span>
        <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
          Video Generation
        </span>
      </div>
      <div className="relative space-y-3 p-3">
        <select
          className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={data.model || 'Kling'}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          <option>Kling</option>
          <option>Runway</option>
        </select>

        {data.resultUrl ? (
          <div className="relative aspect-square w-full overflow-hidden rounded border border-gray-200 dark:border-gray-700">
            <video
              src={data.resultUrl}
              controls
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
            No Video Yet
          </div>
        )}

        <button
          type="button"
          className="w-full rounded bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
          onClick={() => {
            // UI placeholder - no API logic in this phase
          }}
        >
          Generate
        </button>

        {/* Input handles with labels */}
        <Handle
          type="target"
          position={Position.Left}
          id="prompt-in"
          style={{ top: '30%' }}
          className="!h-3 !w-3 !bg-orange-500"
        />
        <span className="pointer-events-none absolute left-4 top-[28%] text-[10px] text-gray-500">文字</span>

        <Handle
          type="target"
          position={Position.Left}
          id="image-in-1"
          style={{ top: '65%' }}
          className="!h-3 !w-3 !bg-orange-500"
        />
        <span className="pointer-events-none absolute left-4 top-[63%] text-[10px] text-gray-500">图片</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="video-out"
        className="!h-3 !w-3 !bg-orange-500"
      />
    </div>
  );
}

export default memo(VideoNode);
