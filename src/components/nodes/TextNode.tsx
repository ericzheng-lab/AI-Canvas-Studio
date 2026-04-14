'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useCanvasStore } from '@/store/useCanvasStore';

function TextNode({ id, data }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  return (
    <div className="min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="rounded-t-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        Text Prompt
      </div>
      <div className="p-3">
        <textarea
          className="w-full resize-none rounded border border-gray-200 bg-white p-2 text-sm text-gray-800 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          rows={3}
          placeholder="Enter prompt here..."
          value={data.text || ''}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-blue-500"
      />
    </div>
  );
}

export default memo(TextNode);
