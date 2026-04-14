'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useCanvasStore } from '@/store/useCanvasStore';

function ImageRefNode({ id, data }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [url, setUrl] = useState(data.url || '');

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    updateNodeData(id, { url: newUrl });
  };

  return (
    <div className="min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="rounded-t-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
        Reference Image
      </div>
      <div className="space-y-2 p-3">
        <input
          type="text"
          className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-green-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Paste image URL..."
          value={url}
          onChange={handleUrlChange}
        />
        {url ? (
          <div className="relative h-24 w-full overflow-hidden rounded border border-gray-200 dark:border-gray-700">
            <img
              src={url}
              alt="Reference"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800">
            No Image
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        className="!h-3 !w-3 !bg-green-500"
      />
    </div>
  );
}

export default memo(ImageRefNode);
