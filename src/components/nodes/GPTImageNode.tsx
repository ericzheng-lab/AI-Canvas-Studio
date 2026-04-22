'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';

const QUALITIES = ['low', 'medium', 'high'];

const SIZES = [
  { value: '1024x1024', label: '1024×1024（1:1）', experimental: false },
  { value: '1536x1024', label: '1536×1024（横 HD）', experimental: false },
  { value: '1024x1536', label: '1024×1536（竖 HD）', experimental: false },
  { value: '1536x864', label: '1536×864（16:9）', experimental: false },
  { value: '864x1536', label: '864×1536（9:16）', experimental: false },
  { value: '2048x2048', label: '2048×2048（2K 方）', experimental: false },
  { value: '2560x1440', label: '2560×1440（2K 横）', experimental: false },
  { value: '1440x2560', label: '1440×2560（2K 竖）', experimental: false },
  { value: '3840x2160', label: '3840×2160（4K 横 ⚠️ 实验性）', experimental: true },
  { value: '2160x3840', label: '2160×3840（4K 竖 ⚠️ 实验性）', experimental: true },
];

function GPTImageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [quality, setQuality] = useState(data.quality || 'medium');
  const [size, setSize] = useState(data.size || '2560x1440');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(data.resultUrl || null);
  const [error, setError] = useState<string | null>(data.error || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeWidth, setNodeWidth] = useState(400);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setNodeWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isCompact = nodeWidth < 260;

  const getAspectRatio = (sizeVal: string) => {
    const [w, h] = sizeVal.split('x').map(Number);
    return w / h;
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    updateNodeData(id, { status: 'generating', error: undefined });

    try {
      const store = useCanvasStore.getState();
      const edges = store.edges;
      const nodes = store.nodes;

      // Find connected text and ref nodes
      const inputEdges = edges.filter((e) => e.target === id);
      let externalPrompt = '';
      const refImages: string[] = [];

      for (const edge of inputEdges) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (!sourceNode) continue;
        const handle = edge.targetHandle;
        if (handle === 'text-in') {
          externalPrompt = sourceNode.data?.text || '';
        } else if (handle?.startsWith('ref-in-')) {
          const url = sourceNode.data?.url || sourceNode.data?.resultUrl;
          if (url) refImages.push(url);
        }
      }

      const mergedPrompt = externalPrompt ? `${externalPrompt}\n${prompt}` : prompt;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'GPT-Image-2',
          prompt: mergedPrompt,
          quality,
          size,
          referenceImage: refImages[0],
          images: refImages,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      const url = result.resultUrl;
      setResultUrl(url);
      updateNodeData(id, { resultUrl: url, status: 'completed', error: undefined });
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      setError(msg);
      updateNodeData(id, { status: 'error', error: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const cssAspectRatio = getAspectRatio(size);

  return (
    <div
      ref={containerRef}
      className="min-w-[150px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <NodeResizer
        minWidth={280}
        minHeight={200}
        keepAspectRatio={false}
        isVisible={selected}
        lineClassName="border-amber-400"
        handleClassName="h-3 w-3 bg-white border-2 border-amber-400 rounded"
      />

      {/* Header */}
      <div className="flex h-10 items-center gap-2 rounded-t-lg bg-amber-50 px-3 dark:bg-amber-900/30">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500 text-[10px] font-bold text-white">
          🎨
        </span>
        {!isCompact && (
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            GPT Image 2
          </span>
        )}
      </div>

      <div className="space-y-3 p-3">
        {/* Prompt */}
        <textarea
          className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 resize-none"
          rows={3}
          placeholder="Enter prompt..."
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            updateNodeData(id, { prompt: e.target.value });
          }}
        />

        {/* Quality */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Quality</span>
          <select
            className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={quality}
            onChange={(e) => {
              setQuality(e.target.value);
              updateNodeData(id, { quality: e.target.value });
            }}
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        {/* Size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Size</span>
          <select
            className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
              updateNodeData(id, { size: e.target.value });
            }}
          >
            {SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Image display */}
        {resultUrl ? (
          <div
            className="relative w-full overflow-hidden rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            style={{ aspectRatio: cssAspectRatio }}
          >
            <img
              src={resultUrl}
              alt="Generated"
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div
            className="flex w-full min-h-[120px] items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800"
            style={{ aspectRatio: cssAspectRatio }}
          >
            {isLoading ? 'Generating...' : 'No Image Yet'}
          </div>
        )}

        {error && <div className="text-sm text-red-500">{error}</div>}

        <button
          type="button"
          disabled={isLoading || !prompt.trim()}
          className="w-full rounded bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGenerate}
        >
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Input handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="text-in"
        style={{ top: '18%' }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <span className="pointer-events-none absolute left-4 top-[16%] text-[10px] text-gray-500">Prompt</span>

      <Handle
        type="target"
        position={Position.Left}
        id="ref-in-1"
        style={{ top: '34%' }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <span className="pointer-events-none absolute left-4 top-[32%] text-[10px] text-gray-500">Ref 1</span>

      <Handle
        type="target"
        position={Position.Left}
        id="ref-in-2"
        style={{ top: '50%' }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <span className="pointer-events-none absolute left-4 top-[48%] text-[10px] text-gray-500">Ref 2</span>

      <Handle
        type="target"
        position={Position.Left}
        id="ref-in-3"
        style={{ top: '66%' }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <span className="pointer-events-none absolute left-4 top-[64%] text-[10px] text-gray-500">Ref 3</span>

      <Handle
        type="target"
        position={Position.Left}
        id="ref-in-4"
        style={{ top: '82%' }}
        className="!h-3 !w-3 !bg-amber-500"
      />
      <span className="pointer-events-none absolute left-4 top-[80%] text-[10px] text-gray-500">Ref 4</span>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        className="!h-3 !w-3 !bg-amber-500"
      />
    </div>
  );
}

export default memo(GPTImageNode);
