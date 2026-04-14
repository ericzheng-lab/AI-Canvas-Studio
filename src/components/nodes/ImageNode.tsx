'use client';

import { memo, useRef } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useCanvasStore } from '@/store/useCanvasStore';
import { getConnectedData } from '@/lib/graphUtils';

function ImageNode({ id, data }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const abortRef = useRef(false);

  const isLoading = data.status === 'generating';

  const handleGenerate = async () => {
    abortRef.current = false;
    const store = useCanvasStore.getState();
    const connected = getConnectedData(id, store.nodes, store.edges);

    const prompt = connected.prompt || '';
    const images = connected.images || [];
    const model = data.model || 'Midjourney';

    // Update status to loading
    updateNodeData(id, { status: 'generating', error: undefined });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, images, aspect: '1:1' }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      // Async task (Midjourney) -> poll for status
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
            updateNodeData(id, {
              resultUrl: statusData.imageUrl,
              status: 'completed',
            });
            return;
          }

          if (statusData.status === 'failure' || statusData.status === 'failed') {
            throw new Error(statusData.message || 'Task failed');
          }
        }

        throw new Error('Polling timeout');
      }

      // Synchronous result (NanoBanana, Seedream, GPT-Image, etc.)
      if (result.resultUrl) {
        updateNodeData(id, {
          resultUrl: result.resultUrl,
          status: 'completed',
        });
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
    <div className="min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="rounded-t-lg bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
        Image Generation
      </div>
      <div className="relative space-y-3 p-3">
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

        {data.resultUrl ? (
          <div className="relative h-28 w-full overflow-hidden rounded border border-gray-200 dark:border-gray-700">
            <img
              src={data.resultUrl}
              alt="Generated"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800">
            {isLoading ? 'Generating...' : 'No Image Yet'}
          </div>
        )}

        {data.error && (
          <div className="text-xs text-red-500">{data.error}</div>
        )}

        <button
          type="button"
          disabled={isLoading}
          className="w-full rounded bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGenerate}
        >
          {isLoading ? 'Loading...' : 'Generate'}
        </button>

        {/* Input handles with labels */}
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
    </div>
  );
}

export default memo(ImageNode);
