'use client';

import { useEffect, useCallback } from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider, useReactFlow, type Node, type NodeTypes } from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';
import TextNode from '@/components/nodes/TextNode';
import ImageNode from '@/components/nodes/ImageNode';
import VideoNode from '@/components/nodes/VideoNode';
import ImageRefNode from '@/components/nodes/ImageRefNode';
import MidjourneyNode from '@/components/nodes/MidjourneyNode';
import StickyNoteNode from '@/components/nodes/StickyNoteNode';
import SketchNode from '@/components/nodes/SketchNode';
import GPTImageNode from '@/components/nodes/GPTImageNode';

// 注册自定义节点类型
const nodeTypes: NodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  imageRef: ImageRefNode,
  midjourney: MidjourneyNode,
  stickyNote: StickyNoteNode,
  sketch: SketchNode,
  gptimage: GPTImageNode,
};

function CanvasInner() {
  const { screenToFlowPosition } = useReactFlow();

  const getCenterPosition = () => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    return screenToFlowPosition({ x: centerX, y: centerY });
  };

  // 精准局部订阅
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);
  const saveHistory = useCanvasStore((s) => s.saveHistory);

  // 全局快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // 全局粘贴事件处理
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // 如果用户在输入框内粘贴，不拦截
    const activeElement = document.activeElement;
    if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    // 检查剪贴板内容
    let imageFile: File | null = null;
    let textData: string | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // 如果是图片文件
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFile = file;
          break;
        }
      }
      
      // 如果是纯文本
      if (item.type === 'text/plain') {
        textData = await new Promise((resolve) => {
          item.getAsString((str) => resolve(str));
        });
      }
    }

    // 如果剪贴板里有图片文件，上传到 OSS 并创建参考图节点
    if (imageFile) {
      e.preventDefault();
      
      try {
        const formData = new FormData();
        formData.append('file', imageFile);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        // 创建新的参考图节点
        const id = `imageRef-${Date.now()}`;
        const newNode: Node = {
          id,
          type: 'imageRef',
          position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
          data: { url: result.url },
          style: { width: 400 },
        };
        addNode(newNode);
        
      } catch (error: any) {
        console.error('Paste upload error:', error);
        alert(`图片上传失败: ${error.message}`);
      }
      return;
    }

    // 如果是 URL（但不是图片文件），可以选择创建文本节点或其他处理
    if (textData && textData.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i)) {
      // 这是图片 URL，创建参考图节点
      e.preventDefault();
      const id = `imageRef-${Date.now()}`;
      const newNode: Node = {
        id,
        type: 'imageRef',
        position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
        data: { url: textData.trim() },
        style: { width: 400 },
      };
      addNode(newNode);
    }
  }, [addNode]);

  // 监听粘贴事件
  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleAddTextNode = () => {
    const id = `text-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'text',
      position: getCenterPosition(),
      data: { text: '' },
      style: { width: 400, height: 300 },
    };
    addNode(newNode);
  };

  const handleAddImageNode = () => {
    const id = `image-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'image',
      position: getCenterPosition(),
      data: { model: 'bfl/flux-2-max', aspectRatio: '1:1' },
      style: { width: 400 },
    };
    addNode(newNode);
  };

  const handleAddVideoNode = () => {
    const id = `video-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'video',
      position: getCenterPosition(),
      data: { model: 'Kling' },
      style: { width: 400 },
    };
    addNode(newNode);
  };

  const handleAddImageRefNode = () => {
    const id = `imageRef-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'imageRef',
      position: getCenterPosition(),
      data: { url: '' },
      style: { width: 400 },
    };
    addNode(newNode);
  };

  const handleAddMidjourneyNode = () => {
    const id = `mj-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'midjourney',
      position: getCenterPosition(),
      data: { prompt: '', viewMode: 'GRID' },
      style: { width: 400 },
    };
    addNode(newNode);
  };

  const handleAddStickyNoteNode = () => {
    const id = `sticky-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'stickyNote',
      position: getCenterPosition(),
      data: { text: '', fontSize: 16 },
      style: { width: 240, height: 240 },
    };
    addNode(newNode);
  };

  const handleAddSketchNode = () => {
    const id = `sketch-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'sketch',
      position: getCenterPosition(),
      data: { color: '#1a1a1a', brushSize: 5 },
      style: { width: 400, height: 350 },
    };
    addNode(newNode);
  };

  const handleAddGPTImageNode = () => {
    const id = `gptimage-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'gptimage',
      position: getCenterPosition(),
      data: { prompt: '', quality: 'medium', size: '2560x1440' },
      style: { width: 400 },
    };
    addNode(newNode);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* 顶部悬浮工具栏 */}
      <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm dark:bg-black/80">
        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          ↩️ 撤销
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          ↪️ 重做
        </button>
        <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600" />
        <button
          onClick={handleAddTextNode}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + 添加文本
        </button>
        <button
          onClick={handleAddImageRefNode}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          + 添加参考图
        </button>
        <button
          onClick={handleAddImageNode}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          + 添加图片
        </button>
        <button
          onClick={handleAddMidjourneyNode}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          + 添加 MJ
        </button>
        <button
          onClick={handleAddVideoNode}
          className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
        >
          + 添加视频
        </button>
        <button
          onClick={handleAddStickyNoteNode}
          className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-bold text-amber-900 hover:bg-amber-300 transition-colors"
        >
          + 添加便签
        </button>
        <button
          onClick={handleAddSketchNode}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          + 添加 Sketch
        </button>
        <button
          onClick={handleAddGPTImageNode}
          className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          + 添加 GPT Image 2
        </button>
        <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600" />
        <button
          onClick={clearCanvas}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          清空画布 (Clear)
        </button>
      </div>

      {/* ReactFlow 画布 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={saveHistory}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        onInit={(instance) => instance.fitView()}
      >
        <Background gap={16} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
