'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

type ViewMode = 'GRID' | 'SINGLE';

interface MJButton {
  label: string;
  customId: string;
}

function MidjourneyNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const nodes = useCanvasStore((s) => s.nodes);
  const addNode = useCanvasStore((s) => s.addNode);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const abortRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeWidth, setNodeWidth] = useState(400);

  const [viewMode, setViewMode] = useState<ViewMode>(data.viewMode || 'GRID');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const taskId: string | undefined = data.taskId;
  const imageUrl: string | undefined = data.imageUrl;
  const buttons: MJButton[] = data.buttons || [];
  const status: string | undefined = data.status;
  const isMicro = nodeWidth < 180;
  const isCompact = nodeWidth < 200;

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

  // Sync viewMode to data when toggled
  useEffect(() => {
    if (data.viewMode !== viewMode) {
      updateNodeData(id, { viewMode });
    }
  }, [viewMode, id, data.viewMode, updateNodeData]);

  // Polling effect
  useEffect(() => {
    if (!taskId || status === 'completed' || status === 'error') return;

    abortRef.current = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      for (let i = 0; i < 60; i++) {
        if (abortRef.current) break;

        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 8000);
        });
        if (abortRef.current) break;

        try {
          const res = await fetch(`/api/status?taskId=${taskId}&provider=midjourney`);
          const statusData = await res.json();

          if (statusData.status === 'completed') {
            const initialView: ViewMode =
              data.viewMode || (statusData.buttons?.some((b: MJButton) => b.label.startsWith('U')) ? 'GRID' : 'SINGLE');
            updateNodeData(id, {
              imageUrl: statusData.imageUrl,
              buttons: statusData.buttons || [],
              status: 'completed',
              viewMode: initialView,
            });
            setViewMode(initialView);
            return;
          }

          if (statusData.status === 'failure' || statusData.status === 'failed') {
            updateNodeData(id, { status: 'error', error: statusData.message || 'Task failed' });
            return;
          }
        } catch (e) {
          // ignore polling errors
        }
      }
      updateNodeData(id, { status: 'error', error: 'Polling timeout' });
    };

    poll();

    return () => {
      abortRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [taskId, status, id, updateNodeData, data.viewMode]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const spawnChildNode = async (btn: MJButton) => {
    if (!taskId || isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: btn.label,
          taskId,
          customId: btn.customId,
        }),
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Action failed');
      }

      const currentNode = nodes.find((n) => n.id === id);
      const newX = (currentNode?.position.x || 0) + 320;
      const newY = currentNode?.position.y || 0;

      // Determine view mode of child based on action type
      const isGridAction =
        /^V\d$/.test(btn.label) ||
        btn.label.includes('🔄') ||
        btn.label.toLowerCase().includes('vary');
      const childViewMode: ViewMode = isGridAction ? 'GRID' : 'SINGLE';

      const newNodeId = `mj-${Date.now()}`;
      const newNode = {
        id: newNodeId,
        type: 'midjourney',
        position: { x: newX, y: newY },
        data: {
          status: 'generating',
          taskId: result.taskId,
          viewMode: childViewMode,
        },
        style: { width: 400 },
      };

      addNode(newNode);
      onConnect({
        source: id,
        target: newNodeId,
        sourceHandle: 'image-out',
        targetHandle: 'image-in',
      });

      showToast('Dispatched!');
    } catch (err: any) {
      showToast(err.message || 'Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const gridButtons = buttons.filter((b) => /^[UV]\d$/.test(b.label));
  const actionButtons = buttons.filter((b) => !/^[UV]\d$/.test(b.label));

  const uButtons = gridButtons.filter((b) => b.label.startsWith('U'));
  const vButtons = gridButtons.filter((b) => b.label.startsWith('V'));

  return (
    <div
      ref={containerRef}
      className="min-w-[150px] overflow-hidden rounded-xl border-2 border-indigo-400 bg-white shadow-md dark:border-indigo-500 dark:bg-gray-900"
    >
      <NodeResizer
        minWidth={150}
        minHeight={100}
        keepAspectRatio={true}
        isVisible={selected}
        lineClassName="border-indigo-400"
        handleClassName="h-3 w-3 bg-white border-2 border-indigo-400 rounded"
      />

      {/* Header with MJ badge */}
      <div className="flex h-10 items-center justify-between rounded-t-xl bg-gradient-to-r from-indigo-50 to-purple-50 px-3 dark:from-indigo-900/30 dark:to-purple-900/30">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white">⛵</span>
          {!isMicro && (
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Midjourney</span>
          )}
        </div>
        {imageUrl && !isCompact && (
          <div className="flex rounded bg-white/60 dark:bg-black/30">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                viewMode === 'GRID'
                  ? 'rounded bg-indigo-500 text-white'
                  : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800'
              }`}
            >
              GRID
            </button>
            <button
              type="button"
              onClick={() => setViewMode('SINGLE')}
              className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                viewMode === 'SINGLE'
                  ? 'rounded bg-indigo-500 text-white'
                  : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800'
              }`}
            >
              SINGLE
            </button>
          </div>
        )}
      </div>

      <div className="relative space-y-3 p-3">
        {/* Prompt input */}
        <textarea
          className="w-full resize-y rounded border border-gray-200 bg-white p-2 text-sm text-gray-800 outline-none focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          rows={2}
          placeholder="Enter Midjourney prompt..."
          value={data.prompt || ''}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
        />

        {/* Image display */}
        {imageUrl ? (
          <div className="space-y-2">
            {viewMode === 'GRID' ? (
              <>
                <div
                  className="relative w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img src={imageUrl} alt="MJ Grid" className="w-full h-auto object-contain" />
                </div>

                {/* U1-U4 / V1-V4 buttons */}
                {gridButtons.length > 0 && !isCompact && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {uButtons.map((btn) => (
                        <button
                          key={btn.customId}
                          type="button"
                          disabled={isLoading}
                          onClick={() => spawnChildNode(btn)}
                          className="min-w-[3rem] rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {vButtons.map((btn) => (
                        <button
                          key={btn.customId}
                          type="button"
                          disabled={isLoading}
                          onClick={() => spawnChildNode(btn)}
                          className="min-w-[3rem] rounded bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  className="relative w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img src={imageUrl} alt="MJ Single" className="w-full h-auto object-contain" />
                </div>

                {/* Action buttons for SINGLE mode */}
                {actionButtons.length > 0 && !isCompact && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {actionButtons.map((btn) => (
                      <button
                        key={btn.customId}
                        type="button"
                        disabled={isLoading}
                        onClick={() => spawnChildNode(btn)}
                        className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex w-full min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/50 text-sm text-gray-500 dark:border-indigo-900 dark:bg-gray-800">
            {status === 'generating' ? 'Imagining...' : 'No Image Yet'}
          </div>
        )}

        {data.error && <div className="text-sm text-red-500">{data.error}</div>}

        {/* Generate button */}
        <button
          type="button"
          disabled={status === 'generating' || isLoading}
          className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={async () => {
            const prompt = data.prompt || '';
            if (!prompt.trim()) return;
            updateNodeData(id, { status: 'generating', error: undefined });
            try {
              const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'Midjourney', prompt }),
              });
              const result = await res.json();
              if (!result.success) throw new Error(result.error || 'Failed');
              updateNodeData(id, {
                taskId: result.taskId,
                status: 'generating',
                viewMode: 'GRID',
              });
              setViewMode('GRID');
            } catch (err: any) {
              updateNodeData(id, { status: 'error', error: err.message });
            }
          }}
        >
          {status === 'generating' || isLoading ? 'Loading...' : 'Imagine'}
        </button>

        <Handle
          type="target"
          position={Position.Left}
          id="image-in"
          className="!h-3 !w-3 !bg-indigo-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="image-out"
          className="!h-3 !w-3 !bg-indigo-500"
        />
      </div>

      {/* Lightbox */}
      {lightboxOpen && imageUrl && (
        <ImageLightbox images={[imageUrl]} initialIndex={0} onClose={() => setLightboxOpen(false)} />
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

export default memo(MidjourneyNode);
