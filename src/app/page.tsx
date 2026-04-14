'use client';

import ReactFlow, { Background, Controls, type Node, type NodeTypes } from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';
import TextNode from '@/components/nodes/TextNode';
import ImageNode from '@/components/nodes/ImageNode';
import VideoNode from '@/components/nodes/VideoNode';
import ImageRefNode from '@/components/nodes/ImageRefNode';

// 注册自定义节点类型
const nodeTypes: NodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  imageRef: ImageRefNode,
};

export default function CanvasPage() {
  // 精准局部订阅
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);

  const handleAddTextNode = () => {
    const id = `text-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'text',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { text: '' },
    };
    addNode(newNode);
  };

  const handleAddImageNode = () => {
    const id = `image-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'image',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { model: 'Midjourney' },
    };
    addNode(newNode);
  };

  const handleAddVideoNode = () => {
    const id = `video-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'video',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { model: 'Kling' },
    };
    addNode(newNode);
  };

  const handleAddImageRefNode = () => {
    const id = `imageRef-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'imageRef',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { url: '' },
    };
    addNode(newNode);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* 顶部悬浮工具栏 */}
      <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm dark:bg-black/80">
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
          onClick={handleAddVideoNode}
          className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
        >
          + 添加视频
        </button>
      </div>

      {/* ReactFlow 画布 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={(instance) => instance.fitView()}
      >
        <Background gap={16} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
