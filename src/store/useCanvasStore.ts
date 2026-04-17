import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Node,
  type Edge,
  type Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Record<string, any>) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
}

const MAX_HISTORY = 50;

let dataChangeTimeout: ReturnType<typeof setTimeout> | null = null;
let dimensionChangeTimeout: ReturnType<typeof setTimeout> | null = null;

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,

      saveHistory: () => {
        const { nodes, edges, past } = get();
        const snapshot: HistorySnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        };
        const newPast = [...past, snapshot].slice(-MAX_HISTORY);
        set({
          past: newPast,
          future: [],
          canUndo: newPast.length > 0,
          canRedo: false,
        });
      },

      undo: () => {
        const { past, future, nodes, edges } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);
        const current: HistorySnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        };
        set({
          nodes: previous.nodes,
          edges: previous.edges,
          past: newPast,
          future: [current, ...future].slice(0, MAX_HISTORY),
          canUndo: newPast.length > 0,
          canRedo: true,
        });
      },

      redo: () => {
        const { past, future, nodes, edges } = get();
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        const current: HistorySnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        };
        set({
          nodes: next.nodes,
          edges: next.edges,
          past: [...past, current].slice(-MAX_HISTORY),
          future: newFuture,
          canUndo: true,
          canRedo: newFuture.length > 0,
        });
      },

      onNodesChange: (changes) => {
        const hasRemove = changes.some((c: any) => c.type === 'remove');
        const hasDimensions = changes.some((c: any) => c.type === 'dimensions');

        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes),
        }));

        if (hasRemove) {
          get().saveHistory();
        }

        if (hasDimensions) {
          if (dimensionChangeTimeout) clearTimeout(dimensionChangeTimeout);
          dimensionChangeTimeout = setTimeout(() => {
            get().saveHistory();
          }, 300);
        }
      },

      onEdgesChange: (changes) => {
        const hasRemove = changes.some((c: any) => c.type === 'remove');

        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges),
        }));

        if (hasRemove) {
          get().saveHistory();
        }
      },

      onConnect: (connection) => {
        get().saveHistory();
        set((state) => ({
          edges: addEdge(connection, state.edges),
        }));
      },

      addNode: (node) => {
        get().saveHistory();
        set((state) => ({
          nodes: [...state.nodes, node],
        }));
      },

      deleteNode: (nodeId) => {
        get().saveHistory();
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
        }));
      },

      updateNodeData: (nodeId, data) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
          ),
        }));
        if (dataChangeTimeout) clearTimeout(dataChangeTimeout);
        dataChangeTimeout = setTimeout(() => {
          get().saveHistory();
        }, 500);
      },

      clearCanvas: () => {
        get().saveHistory();
        set({ nodes: [], edges: [] });
      },
    }),
    {
      name: 'ai-canvas-studio-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        past: state.past,
        future: state.future,
      }),
    }
  )
);
