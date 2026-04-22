'use client';

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';

const COLORS = ['#1a1a1a', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ffffff'];
const BRUSH_SIZES = [2, 5, 10, 20];

function SketchNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState(data.color || '#1a1a1a');
  const [brushSize, setBrushSize] = useState(data.brushSize || 5);
  const [isEraser, setIsEraser] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(data.url || '');
  const [nodeWidth, setNodeWidth] = useState(320);

  // Track node width for compact mode
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setNodeWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Restore canvas from saved data on mount
  useEffect(() => {
    if (!data.canvasData || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0);
    };
    img.src = data.canvasData;
  }, []); // Only on mount

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isDrawing.current || !canvasRef.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }, [color, brushSize, isEraser]);

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    // Save canvas state to node data
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) updateNodeData(id, { canvasData: dataUrl });
  }, [id, updateNodeData]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateNodeData(id, { canvasData: undefined, url: undefined });
    setUploadedUrl('');
  };

  const sendAsRef = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsUploading(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas to blob failed'))),
          'image/png'
        );
      });
      const formData = new FormData();
      formData.append('file', blob, 'sketch.png');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Upload failed');
      setUploadedUrl(result.url);
      updateNodeData(id, { url: result.url });
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const isCompact = nodeWidth < 220;

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col overflow-hidden rounded-xl border-2 border-violet-400 bg-white shadow-md dark:border-violet-500 dark:bg-gray-900"
    >
      <NodeResizer
        minWidth={220}
        minHeight={280}
        isVisible={selected}
        lineClassName="border-violet-400"
        handleClassName="h-3 w-3 bg-white border-2 border-violet-400 rounded"
      />

      {/* Header */}
      <div className="flex h-10 flex-none items-center gap-2 rounded-t-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 dark:from-violet-900/30 dark:to-fuchsia-900/30">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-violet-600 text-[11px] font-bold text-white">
          ✏️
        </span>
        {!isCompact && (
          <span className="text-sm font-bold text-violet-700 dark:text-violet-300">Sketch</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEraser((v) => !v)}
            title={isEraser ? 'Switch to Brush' : 'Switch to Eraser'}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              isEraser
                ? 'bg-violet-500 text-white'
                : 'text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-800'
            }`}
          >
            {isEraser ? '⌫ Eraser' : '🖌 Brush'}
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            title="Clear canvas"
            className="rounded px-2 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-800"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-none items-center gap-2 border-b border-violet-100 px-3 py-2 dark:border-violet-900/40">
        {/* Color swatches */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setIsEraser(false); }}
              className="rounded-full transition-transform hover:scale-110"
              style={{
                width: 16,
                height: 16,
                background: c,
                border:
                  color === c && !isEraser
                    ? '2px solid #7c3aed'
                    : '1.5px solid #d1d5db',
                boxShadow:
                  color === c && !isEraser ? '0 0 0 1px white' : undefined,
              }}
            />
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Brush sizes */}
        <div className="flex items-center gap-1">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setBrushSize(s); setIsEraser(false); }}
              className={`flex items-center justify-center rounded transition-colors ${
                brushSize === s && !isEraser
                  ? 'bg-violet-100 dark:bg-violet-800'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              style={{ width: 22, height: 22 }}
              title={`${s}px`}
            >
              <span
                className="block rounded-full bg-gray-700 dark:bg-gray-300"
                style={{ width: Math.min(s, 16), height: Math.min(s, 16) }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div className="relative flex-1 overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="h-full w-full cursor-crosshair touch-none nodrag"
          style={{ display: 'block' }}
          onMouseDown={(e) => { e.stopPropagation(); startDraw(e); }}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={(e) => { e.stopPropagation(); startDraw(e); }}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Footer */}
      <div className="flex flex-none items-center gap-2 p-2">
        <button
          type="button"
          onClick={sendAsRef}
          disabled={isUploading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Send as Ref
            </>
          )}
        </button>
        {uploadedUrl && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
            ✓ Ready
          </span>
        )}
      </div>

      {/* Output handle — same id as ImageRefNode so ImageNode accepts it */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        className="!h-3 !w-3 !bg-violet-500"
      />
    </div>
  );
}

export default memo(SketchNode);
