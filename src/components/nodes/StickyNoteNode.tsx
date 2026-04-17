'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';

function StickyNoteNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeWidth, setNodeWidth] = useState(200);
  const fontSize = data.fontSize || 16;

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

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(8, Math.min(72, fontSize + delta));
    updateNodeData(id, { fontSize: newSize });
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col overflow-hidden rounded-sm border border-amber-300 bg-amber-200 shadow-md dark:border-amber-500 dark:bg-amber-300/90"
    >
      <NodeResizer
        minWidth={100}
        minHeight={100}
        isVisible={selected}
        lineClassName="border-amber-500"
        handleClassName="h-3 w-3 bg-white border-2 border-amber-500 rounded"
      />

      {selected && (
        <div className="absolute -top-8 left-0 flex items-center gap-1 rounded bg-white/95 px-2 py-1 shadow dark:bg-black/80">
          <button
            type="button"
            onClick={() => changeFontSize(-2)}
            className="rounded px-1.5 py-0.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            title="减小字体"
          >
            A-
          </button>
          <span className="min-w-[1.5rem] text-center text-xs font-medium text-gray-600 dark:text-gray-300">
            {fontSize}
          </span>
          <button
            type="button"
            onClick={() => changeFontSize(2)}
            className="rounded px-1.5 py-0.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            title="增大字体"
          >
            A+
          </button>
        </div>
      )}

      <textarea
        className="flex-1 w-full h-full bg-transparent resize-none p-4 outline-none border-none text-gray-800 placeholder-amber-700/50"
        style={{ fontSize: `${fontSize}px` }}
        placeholder="Write a note..."
        value={data.text || ''}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
      />

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-amber-600"
      />
    </div>
  );
}

export default memo(StickyNoteNode);
