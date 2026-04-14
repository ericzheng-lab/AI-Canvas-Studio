'use client';

import ReactFlow, { Background, Controls, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';

export default function CanvasPage() {
  // 精准局部订阅 —— 绝不订阅整个 state 对象
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);

  const handleAddTestNode = () => {
    const id = `node-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'default',
      position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
      data: { label: `Test Node ${nodes.length + 1}` },
    };
    addNode(newNode);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* 顶部悬浮工具栏 */}
      <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm dark:bg-black/80">
        <button
          onClick={handleAddTestNode}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + 添加测试节点
        </button>
      </div>

      {/* ReactFlow 画布 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => instance.fitView()}
      >
        <Background gap={16} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
