import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { KnowledgeGraph, GraphNode, GraphEdge } from "@/types";

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

  // Query functions
  function getMostModifiedFiles(limit = 10): GraphNode[] {
    return [...fileNodes.value]
      .sort((a, b) => {
        const aCount = (a.metadata as any).modifyCount || 0;
        const bCount = (b.metadata as any).modifyCount || 0;
        return bCount - aCount;
      })
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
  };
});
