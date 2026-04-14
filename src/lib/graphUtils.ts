import { type Edge, type Node } from 'reactflow';

export interface ConnectedData {
  prompt?: string;
  images: string[];
}

/**
 * Get connected data from all inputs of a node
 * Follows edges backward to find source nodes and collects their data
 */
export function getConnectedData(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): ConnectedData {
  const result: ConnectedData = {
    prompt: undefined,
    images: [],
  };

  // Find all edges where this node is the target
  const inputEdges = edges.filter((edge) => edge.target === nodeId);

  for (const edge of inputEdges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) continue;

    const targetHandle = edge.targetHandle;

    // Determine what type of data this is based on targetHandle
    if (targetHandle === 'prompt-in') {
      // Text node - get the text value
      result.prompt = sourceNode.data?.text || '';
    } else if (targetHandle?.startsWith('image-in-')) {
      // Image reference node - get the URL
      const url = sourceNode.data?.url;
      if (url) {
        // Extract the index from image-in-1, image-in-2, etc.
        const index = parseInt(targetHandle.replace('image-in-', '')) - 1;
        result.images[index] = url;
      }
    }
  }

  // Filter out undefined entries and compact the images array
  result.images = result.images.filter(Boolean);

  return result;
}

/**
 * Helper to check if a node has any connected inputs
 */
export function hasConnectedInputs(nodeId: string, edges: Edge[]): boolean {
  return edges.some((edge) => edge.target === nodeId);
}

/**
 * Get the number of connected reference images for an image node
 */
export function getConnectedImageCount(
  nodeId: string,
  edges: Edge[]
): number {
  return edges.filter(
    (edge) =>
      edge.target === nodeId &&
      edge.targetHandle?.startsWith('image-in-')
  ).length;
}
