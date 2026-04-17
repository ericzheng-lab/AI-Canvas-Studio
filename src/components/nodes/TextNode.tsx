'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';

function TextNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeWidth, setNodeWidth] = useState(400);
  const isMicro = nodeWidth < 180;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setNodeWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <NodeResizer
        minWidth={150}
        minHeight={100}
        isVisible={selected}
        lineClassName="border-blue-400"
        handleClassName="h-3 w-3 bg-white border-2 border-blue-400 rounded"
      />
      <div className="flex h-10 items-center gap-2 rounded-t-lg bg-blue-50 px-3 dark:bg-blue-900/30">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] font-bold text-white">
          T
        </span>
        {!isMicro && (
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Text Prompt
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <textarea
          className="flex-1 w-full h-full resize-none rounded border border-gray-200 bg-white p-2 text-base leading-relaxed text-gray-800 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
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
