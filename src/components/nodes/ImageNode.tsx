'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useCanvasStore } from '@/store/useCanvasStore';

function ImageNode({ id, data }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  return (
    <div className="min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="rounded-t-lg bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
        Image Generation
      </div>
      <div className="space-y-3 p-3">
        <select
          className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-purple-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={data.model || 'Midjourney'}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          <option>Midjourney</option>
          <option>Seedream 3</option>
          <option>Seedream 5</option>
          <option>NanoBanana</option>
        </select>

        <div className="flex h-24 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800">
          No Image Yet
        </div>

        <button
          type="button"
          className="w-full rounded bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          onClick={() => {
            // UI placeholder - no API logic in this phase
          }}
        >
          Generate
        </button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-purple-500"
      />
    </div>
  );
}

export default memo(ImageNode);
