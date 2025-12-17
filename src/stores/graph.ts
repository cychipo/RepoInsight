import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  FileOwnership,
} from "@/types";

export const useGraphStore = defineStore("graph", () => {
  // State
  const graph = ref<KnowledgeGraph>({
    nodes: [],
    edges: [],
  });
  const isBuilding = ref(false);
  const buildProgress = ref(0);

  // Getters
  const hasData = computed(() => graph.value.nodes.length > 0);

  const commitNodes = computed(() =>
    graph.value.nodes.filter((n) => n.type === "commit")
  );

  const fileNodes = computed(() =>
    graph.value.nodes.filter((n) => n.type === "file")
  );

  const functionNodes = computed(() =>
    graph.value.nodes.filter((n) => n.type === "function")
  );

  const stats = computed(() => ({
    totalNodes: graph.value.nodes.length,
    totalEdges: graph.value.edges.length,
    commits: commitNodes.value.length,
    files: fileNodes.value.length,
    functions: functionNodes.value.length,
  }));

  // Actions
  function setGraph(newGraph: KnowledgeGraph) {
    graph.value = newGraph;
  }

  function addNode(node: GraphNode) {
    graph.value.nodes.push(node);
  }

  function addEdge(edge: GraphEdge) {
    graph.value.edges.push(edge);
  }

  function getNode(id: string): GraphNode | undefined {
    return graph.value.nodes.find((n) => n.id === id);
  }

  function getConnectedNodes(nodeId: string): GraphNode[] {
    const connectedIds = new Set<string>();

    graph.value.edges.forEach((edge) => {
      if (edge.source === nodeId) {
        connectedIds.add(edge.target);
      } else if (edge.target === nodeId) {
        connectedIds.add(edge.source);
      }
    });

    return graph.value.nodes.filter((n) => connectedIds.has(n.id));
  }

  function clearGraph() {
    graph.value = { nodes: [], edges: [] };
    buildProgress.value = 0;
  }

  // Calculate hotspot score for a file
  // Score = normalized(frequency) * 0.5 + normalized(churn) * 0.5
  function calculateHotspotScore(node: GraphNode): number {
    const metadata = node.metadata as any;
    const modifyCount = metadata.modifyCount || 0;
    const churn = (metadata.insertions || 0) + (metadata.deletions || 0);

    // Find max values for normalization
    const allFiles = fileNodes.value;
    const maxModifyCount = Math.max(
      ...allFiles.map((f) => (f.metadata as any).modifyCount || 0),
      1
    );
    const maxChurn = Math.max(
      ...allFiles.map(
        (f) =>
          ((f.metadata as any).insertions || 0) +
          ((f.metadata as any).deletions || 0)
      ),
      1
    );

    // Normalize to 0-1 range
    const normalizedFreq = modifyCount / maxModifyCount;
    const normalizedChurn = churn / maxChurn;

    // Combined score (0-100)
    return Math.round((normalizedFreq * 0.5 + normalizedChurn * 0.5) * 100);
  }

  // Get hotspot score for a specific file path
  function getFileHotspotScore(filePath: string): number {
    const fileNode = fileNodes.value.find(
      (f) => f.label === filePath || f.id === filePath
    );
    if (!fileNode) return 0;
    return calculateHotspotScore(fileNode);
  }

  // Query functions
  type HotspotFile = GraphNode & {
    hotspotScore: number;
  };

  function getMostModifiedFiles(limit = 10): HotspotFile[] {
    return [...fileNodes.value]
      .map((node) => ({
        ...node,
        hotspotScore: calculateHotspotScore(node),
      }))
      .sort((a, b) => b.hotspotScore - a.hotspotScore)
      .slice(0, limit);
  }

  function getHotspotFunctions(limit = 10): GraphNode[] {
    return [...functionNodes.value]
      .sort((a, b) => {
        const aCount = (a.metadata as any).modifyCount || 0;
        const bCount = (b.metadata as any).modifyCount || 0;
        return bCount - aCount;
      })
      .slice(0, limit);
  }

  function getCoChangePatterns(): { files: string[]; count: number }[] {
    // Find files that are frequently modified together
    const coChangeMap = new Map<string, number>();

    // Group file modifications by commit
    const commitFiles = new Map<string, string[]>();
    graph.value.edges
      .filter((e) => e.type === "MODIFIES")
      .forEach((edge) => {
        const files = commitFiles.get(edge.source) || [];
        files.push(edge.target);
        commitFiles.set(edge.source, files);
      });

    // Count co-occurrences
    commitFiles.forEach((files) => {
      if (files.length < 2) return;

      for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
          const key = [files[i], files[j]].sort().join("|");
          coChangeMap.set(key, (coChangeMap.get(key) || 0) + 1);
        }
      }
    });

    // Convert to array and sort
    return Array.from(coChangeMap.entries())
      .map(([key, count]) => ({
        files: key.split("|"),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  // Get file ownership data
  async function getFileOwnership(
    repoPath: string,
    filePath: string
  ): Promise<FileOwnership | null> {
    try {
      return await window.electronAPI.getFileOwnership(repoPath, filePath);
    } catch (error) {
      console.error("Failed to get file ownership:", error);
      return null;
    }
  }

  return {
    // State
    graph,
    isBuilding,
    buildProgress,

    // Getters
    hasData,
    commitNodes,
    fileNodes,
    functionNodes,
    stats,

    // Actions
    setGraph,
    addNode,
    addEdge,
    getNode,
    getConnectedNodes,
    clearGraph,

    // Queries
    getMostModifiedFiles,
    getHotspotFunctions,
    getCoChangePatterns,
    getFileHotspotScore,
    getFileOwnership,
  };
});
