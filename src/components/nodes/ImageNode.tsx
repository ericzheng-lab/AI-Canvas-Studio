'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';
import { getConnectedData } from '@/lib/graphUtils';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '21:9'];

function ImageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const abortRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeWidth, setNodeWidth] = useState(400);

  const isLoading = data.status === 'generating';
  const isMicro = nodeWidth < 180;
  const isCompact = nodeWidth < 200;
  const aspectRatio = data.aspectRatio || '1:1';
  const cssAspectRatio = aspectRatio.replace(':', '/');
  const numericAspectRatio = cssAspectRatio.split('/').map(Number).reduce((a: number, b: number) => a / b);

  const results: string[] = data.results || (data.resultUrl ? [data.resultUrl] : []);
  const currentImageUrl = results.length > 0 ? results[currentIndex] : undefined;

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Copied!');
    } catch {
      showToast('Copy failed');
    }
  };

  const handleDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerate = async () => {
    abortRef.current = false;
    const store = useCanvasStore.getState();
    const connected = getConnectedData(id, store.nodes, store.edges);

    const prompt = connected.prompt || '';
    const images = connected.images || [];
    const model = data.model || 'bfl/flux-2-max';
    const ar = data.aspectRatio || '1:1';

    updateNodeData(id, { status: 'generating', error: undefined });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, images, aspectRatio: ar }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      if (result.taskId) {
        const taskId = result.taskId;
        const provider = result.provider;

        for (let i = 0; i < 60; i++) {
          if (abortRef.current) break;
          await new Promise((resolve) => setTimeout(resolve, 8000));
          if (abortRef.current) break;

          const statusRes = await fetch(`/api/status?taskId=${taskId}&provider=${provider}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'completed') {
            const newResults = [...results, statusData.imageUrl];
            updateNodeData(id, {
              results: newResults,
              resultUrl: statusData.imageUrl,
              status: 'completed',
            });
            setCurrentIndex(newResults.length - 1);
            return;
          }

          if (statusData.status === 'failure' || statusData.status === 'failed') {
            throw new Error(statusData.message || 'Task failed');
          }
        }

        throw new Error('Polling timeout');
      }

      if (result.resultUrl) {
        const newResults = [...results, result.resultUrl];
        updateNodeData(id, {
          results: newResults,
          resultUrl: result.resultUrl,
          status: 'completed',
        });
        setCurrentIndex(newResults.length - 1);
        return;
      }

      throw new Error('Unexpected response');
    } catch (err: any) {
      updateNodeData(id, {
        status: 'error',
        error: err.message || 'Unknown error',
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-w-[150px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <NodeResizer
        minWidth={150}
        minHeight={100}
        keepAspectRatio={numericAspectRatio}
        isVisible={selected}
        lineClassName="border-purple-400"
        handleClassName="h-3 w-3 bg-white border-2 border-purple-400 rounded"
      />
      <div className="flex h-10 items-center gap-2 rounded-t-lg bg-purple-50 px-3 dark:bg-purple-900/30">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-600 text-[10px] font-bold text-white">
          🖼️
        </span>
        {!isMicro && (
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
            Image Generation
          </span>
        )}
      </div>
      <div className="relative space-y-3 p-3">
        <select
          className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-purple-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={data.model || 'bfl/flux-2-max'}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          <option>bfl/flux-2-max</option>
          <option>Flux</option>
          <option>Seedream 5</option>
          <option>Nano Banana 2K</option>
          <option>GPT-Image 1.5</option>
          <option>GPT-Image 2</option>
        </select>

        {/* Aspect ratio toggle */}
        <div className="flex items-center justify-between rounded border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          <span className="px-2 text-xs text-gray-500">比例</span>
          <div className="flex gap-1">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar}
                type="button"
                onClick={() => updateNodeData(id, { aspectRatio: ar })}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  aspectRatio === ar
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
          <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {aspectRatio}
          </span>
        </div>

        {currentImageUrl ? (
          <div className="space-y-2">
            {/* Main carousel area */}
            <div
              className="relative w-full overflow-hidden rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer"
              style={{ aspectRatio: cssAspectRatio }}
              onClick={() => setLightboxOpen(true)}
            >
              <img
                src={currentImageUrl}
                alt="Generated"
                className="h-full w-full object-contain"
              />

              {/* Action toolbar */}
              {!isCompact && (
                <div className="absolute right-2 top-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxOpen(true);
                    }}
                    className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                    title="Fullscreen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(currentImageUrl);
                    }}
                    className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                    title="Copy link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(currentImageUrl);
                    }}
                    className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                    title="Download"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Carousel arrows */}
              {results.length > 1 && !isCompact && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex((i) => (i > 0 ? i - 1 : results.length - 1));
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                    title="Previous"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex((i) => (i < results.length - 1 ? i + 1 : 0));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                    title="Next"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                    {currentIndex + 1} / {results.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {results.length > 1 && !isCompact && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {results.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border ${
                      idx === currentIndex
                        ? 'border-purple-500 ring-1 ring-purple-500'
                        : 'border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex w-full min-h-[160px] items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800"
            style={{ aspectRatio: cssAspectRatio }}
          >
            {isLoading ? 'Generating...' : 'No Image Yet'}
          </div>
        )}

        {data.error && (
          <div className="text-sm text-red-500">{data.error}</div>
        )}

        <button
          type="button"
          disabled={isLoading}
          className="w-full rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGenerate}
        >
          {isLoading ? 'Loading...' : 'Generate'}
        </button>

        <Handle
          type="target"
          position={Position.Left}
          id="prompt-in"
          style={{ top: '20%' }}
          className="!h-3 !w-3 !bg-purple-500"
        />
        <span className="pointer-events-none absolute left-4 top-[18%] text-[10px] text-gray-500">文字</span>

        <Handle
          type="target"
          position={Position.Left}
          id="image-in-1"
          style={{ top: '40%' }}
          className="!h-3 !w-3 !bg-purple-500"
        />
        <span className="pointer-events-none absolute left-4 top-[38%] text-[10px] text-gray-500">图片1</span>

        <Handle
          type="target"
          position={Position.Left}
          id="image-in-2"
          style={{ top: '55%' }}
          className="!h-3 !w-3 !bg-purple-500"
        />
        <span className="pointer-events-none absolute left-4 top-[53%] text-[10px] text-gray-500">图片2</span>

        <Handle
          type="target"
          position={Position.Left}
          id="image-in-3"
          style={{ top: '70%' }}
          className="!h-3 !w-3 !bg-purple-500"
        />
        <span className="pointer-events-none absolute left-4 top-[68%] text-[10px] text-gray-500">图片3</span>

        <Handle
          type="target"
          position={Position.Left}
          id="image-in-4"
          style={{ top: '85%' }}
          className="!h-3 !w-3 !bg-purple-500"
        />
        <span className="pointer-events-none absolute left-4 top-[83%] text-[10px] text-gray-500">图片4</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        className="!h-3 !w-3 !bg-purple-500"
      />

      {/* Global Lightbox */}
      {lightboxOpen && results.length > 0 && (
        <ImageLightbox
          images={results}
          initialIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded bg-black/80 px-4 py-2 text-sm text-white shadow">
          {toast}
        </div>
      )}
    </div>
  );
}

export default memo(ImageNode);
