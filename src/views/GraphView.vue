<template>
  <div class="h-full flex flex-col p-6 gap-4">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-6">
        <h1 class="text-2xl font-bold uppercase">
          {{ viewMode === "knowledge" ? "◈ KNOWLEDGE GRAPH" : "◈ GIT GRAPH" }}
        </h1>
        <div class="flex gap-0">
          <button
            class="px-4 py-2 font-sans text-xs font-bold bg-neo-white border-3 border-neo-black cursor-pointer transition-all -ml-[3px] first:ml-0 hover:bg-neo-yellow"
            :class="{
              '!bg-neo-blue shadow-[inset_0_0_0_2px_black]':
                viewMode === 'knowledge',
            }"
            @click="viewMode = 'knowledge'">
            KNOWLEDGE
          </button>
          <button
            class="px-4 py-2 font-sans text-xs font-bold bg-neo-white border-3 border-neo-black cursor-pointer transition-all -ml-[3px] first:ml-0 hover:bg-neo-yellow"
            :class="{
              '!bg-neo-blue shadow-[inset_0_0_0_2px_black]': viewMode === 'git',
            }"
            @click="viewMode = 'git'">
            GIT GRAPH
          </button>
        </div>
      </div>
      <div class="flex gap-4 flex-wrap" v-if="viewMode === 'knowledge'">
        <div class="flex gap-0">
          <button
            v-for="nodeType in nodeTypes"
            :key="nodeType.id"
            class="px-4 py-2 font-sans text-xs font-bold bg-neo-white border-3 border-neo-black cursor-pointer transition-all -ml-[3px] first:ml-0 hover:bg-[var(--filter-color)]"
            :class="{
              '!bg-[var(--filter-color)] shadow-[inset_0_0_0_2px_black]':
                activeFilters.includes(nodeType.id),
            }"
            :style="{ '--filter-color': nodeType.color }"
            @click="toggleFilter(nodeType.id)">
            {{ nodeType.label }}
          </button>
        </div>
        <button class="btn btn-secondary" @click="resetView">
          ↻ RESET VIEW
        </button>
      </div>
    </div>

    <!-- Knowledge Graph View -->
    <template v-if="viewMode === 'knowledge'">
      <div class="flex-1 flex gap-6 min-h-0">
        <!-- Graph Canvas -->
        <div
          ref="graphContainer"
          class="flex-1 bg-neo-white border-4 border-neo-black shadow-brutal relative overflow-hidden">
          <div
            v-if="!graphStore.hasData"
            class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6">
            <div class="text-6xl opacity-30">◈</div>
            <h3 class="text-xl font-bold m-0">NO GRAPH DATA</h3>
            <p>
              Select a repository from the home page to generate the knowledge
              graph.
            </p>
            <router-link to="/" class="btn btn-primary">
              ◆ OPEN REPOSITORY
            </router-link>
          </div>
        </div>

        <!-- Node Details Panel -->
        <aside
          v-if="selectedNode"
          class="w-[320px] flex flex-col overflow-hidden card">
          <div
            class="flex items-center justify-between mb-4 pb-4 border-b-3 border-neo-black">
            <div
              class="px-3 py-1 text-xs font-bold border-2 border-neo-black"
              :style="{ background: getNodeColor(selectedNode.type) }">
              {{ selectedNode.type.toUpperCase() }}
            </div>
            <button class="btn btn-icon btn-ghost" @click="selectedNode = null">
              ✕
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <h3 class="text-lg font-bold mb-4 break-words">
              {{ selectedNode.label }}
            </h3>

            <div class="flex flex-col gap-4">
              <template v-if="selectedNode.type === 'commit'">
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >HASH</span
                  >
                  <code class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.hash
                  }}</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >AUTHOR</span
                  >
                  <span class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.author
                  }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >DATE</span
                  >
                  <span class="text-sm font-semibold break-all">{{
                    formatDate(selectedNode.metadata.date)
                  }}</span>
                </div>
                <div class="flex flex-col gap-1 col-span-full">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >MESSAGE</span
                  >
                  <p class="text-sm font-semibold break-all">
                    {{ selectedNode.metadata.message }}
                  </p>
                </div>
              </template>

              <template v-else-if="selectedNode.type === 'file'">
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >PATH</span
                  >
                  <code class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.path
                  }}</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >LANGUAGE</span
                  >
                  <span class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.language
                  }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >MODIFICATIONS</span
                  >
                  <span
                    class="text-sm font-semibold break-all bg-neo-yellow px-1 inline-block w-max"
                    >{{ selectedNode.metadata.modifyCount }}</span
                  >
                </div>
              </template>

              <template v-else-if="selectedNode.type === 'function'">
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >NAME</span
                  >
                  <code class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.name
                  }}</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >FILE</span
                  >
                  <code class="text-sm font-semibold break-all truncate">{{
                    selectedNode.metadata.filePath
                  }}</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >LINES</span
                  >
                  <span class="text-sm font-semibold break-all"
                    >{{ selectedNode.metadata.startLine }} -
                    {{ selectedNode.metadata.endLine }}</span
                  >
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >MODIFICATIONS</span
                  >
                  <span
                    class="text-sm font-semibold break-all bg-neo-yellow px-1 inline-block w-max"
                    >{{ selectedNode.metadata.modifyCount }}</span
                  >
                </div>
              </template>
            </div>
          </div>
        </aside>
      </div>

      <!-- Graph Legend -->
      <div
        class="flex items-center gap-6 p-4 bg-neo-white border-3 border-neo-black shadow-brutal">
        <div class="text-xs font-bold pr-4 border-r-3 border-neo-black">
          LEGEND
        </div>
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span
              class="w-[14px] h-[14px] border-2 border-neo-black"
              style="background: var(--neo-blue)"></span>
            <span>COMMIT</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span
              class="w-[14px] h-[14px] border-2 border-neo-black"
              style="background: var(--neo-green)"></span>
            <span>FILE</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span
              class="w-[14px] h-[14px] border-2 border-neo-black"
              style="background: var(--neo-orange)"></span>
            <span>FUNCTION</span>
          </div>
          <div class="w-[3px] h-5 bg-neo-black"></div>
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span class="w-6 h-[3px] bg-neo-black"></span>
            <span>MODIFIES</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span
              class="w-6 h-[3px]"
              style="
                background: repeating-linear-gradient(
                  90deg,
                  #000 0,
                  #000 4px,
                  transparent 4px,
                  transparent 8px
                );
              "></span>
            <span>CONTAINS</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Git Graph View -->
    <template v-else>
      <GitGraph />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useGraphStore } from "@/stores/graph";
import GitGraph from "@/components/GitGraph.vue";
import type { GraphNode } from "@/types";

const graphStore = useGraphStore();
const graphContainer = ref<HTMLElement | null>(null);
const selectedNode = ref<GraphNode | null>(null);
const activeFilters = ref(["commit", "file", "function"]);
const viewMode = ref<"knowledge" | "git">("git"); // Default to git graph

const nodeTypes = [
  { id: "commit", label: "COMMITS", color: "var(--neo-blue)" },
  { id: "file", label: "FILES", color: "var(--neo-green)" },
  { id: "function", label: "FUNCTIONS", color: "var(--neo-orange)" },
];

let cy: any = null;

function toggleFilter(type: string) {
  const index = activeFilters.value.indexOf(type);
  if (index > -1) {
    activeFilters.value.splice(index, 1);
  } else {
    activeFilters.value.push(type);
  }
  updateGraphVisibility();
}

function getNodeColor(type: string): string {
  switch (type) {
    case "commit":
      return "var(--neo-blue)";
    case "file":
      return "var(--neo-green)";
    case "function":
      return "var(--neo-orange)";
    default:
      return "var(--neo-yellow)";
  }
}

function updateGraphVisibility() {
  if (!cy) return;

  cy.nodes().forEach((node: any) => {
    const nodeType = node.data("type");
    if (activeFilters.value.includes(nodeType)) {
      node.show();
    } else {
      node.hide();
    }
  });
}

function resetView() {
  if (!cy) return;
  cy.fit();
  cy.center();
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function initGraph() {
  if (!graphContainer.value || !graphStore.hasData) return;

  const cytoscape = (await import("cytoscape")).default;

  const nodes = graphStore.graph.nodes.map((node) => ({
    data: {
      id: node.id,
      label: node.label,
      type: node.type,
      ...node.metadata,
    },
  }));

  const edges = graphStore.graph.edges.map((edge) => ({
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    },
  }));

  cy = cytoscape({
    container: graphContainer.value,
    elements: { nodes, edges },
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "bottom",
          "text-halign": "center",
          "font-size": "11px",
          "font-weight": "bold",
          "font-family": "Space Grotesk, sans-serif",
          color: "#000000",
          "text-margin-y": 8,
          width: 28,
          height: 28,
          "border-width": 3,
          "border-color": "#000000",
        },
      },
      {
        selector: 'node[type="commit"]',
        style: {
          "background-color": "#00D4FF",
          shape: "ellipse",
        },
      },
      {
        selector: 'node[type="file"]',
        style: {
          "background-color": "#7CFF6B",
          shape: "rectangle",
          width: 24,
          height: 30,
        },
      },
      {
        selector: 'node[type="function"]',
        style: {
          "background-color": "#FF9E2C",
          shape: "diamond",
          width: 22,
          height: 22,
        },
      },
      {
        selector: "edge",
        style: {
          width: 3,
          "line-color": "#000000",
          "target-arrow-color": "#000000",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "arrow-scale": 1,
        },
      },
      {
        selector: 'edge[type="CONTAINS"]',
        style: {
          "line-style": "dashed",
        },
      },
      {
        selector: 'edge[type="CALLS"]',
        style: {
          "line-style": "dotted",
          "line-color": "#FF9E2C",
        },
      },
      {
        selector: ":selected",
        style: {
          "border-width": 5,
          "border-color": "#FFE500",
        },
      },
    ],
    layout: {
      name: "cose",
      animate: true,
      animationDuration: 500,
      nodeRepulsion: () => 8000,
      idealEdgeLength: () => 100,
    },
    minZoom: 0.2,
    maxZoom: 3,
    wheelSensitivity: 0.3,
  });

  cy.on("tap", "node", (event: any) => {
    const nodeData = event.target.data();
    selectedNode.value = {
      id: nodeData.id,
      type: nodeData.type,
      label: nodeData.label,
      metadata: nodeData,
    } as GraphNode;
  });

  cy.on("tap", (event: any) => {
    if (event.target === cy) {
      selectedNode.value = null;
    }
  });
}

watch(
  () => graphStore.hasData,
  (hasData) => {
    if (hasData && viewMode.value === "knowledge") {
      initGraph();
    }
  }
);

watch(viewMode, (mode) => {
  if (mode === "knowledge" && graphStore.hasData) {
    // Re-init graph when switching back to knowledge view
    setTimeout(() => initGraph(), 100);
  }
});

onMounted(() => {
  if (graphStore.hasData && viewMode.value === "knowledge") {
    initGraph();
  }
});

onUnmounted(() => {
  if (cy) {
    cy.destroy();
    cy = null;
  }
});
</script>

<style scoped>
.graph-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.view-title-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.view-toggle {
  display: flex;
  gap: 0;
}

.toggle-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--neo-white);
  border: 3px solid var(--neo-black);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-left: -3px;
}

.toggle-btn:first-child {
  margin-left: 0;
}

.toggle-btn:hover {
  background: var(--neo-yellow);
}

.toggle-btn.active {
  background: var(--neo-blue);
  box-shadow: inset 0 0 0 2px var(--neo-black);
}

.view-header h1 {
  font-size: 1.5rem;
}

.view-actions {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 0;
}

.filter-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--neo-white);
  border: 3px solid var(--neo-black);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-left: -3px;
}

.filter-btn:first-child {
  margin-left: 0;
}

.filter-btn:hover {
  background: var(--filter-color);
}

.filter-btn.active {
  background: var(--filter-color);
  box-shadow: inset 0 0 0 2px var(--neo-black);
}

/* Graph Container */
.graph-container {
  flex: 1;
  display: flex;
  gap: var(--spacing-lg);
  min-height: 0;
}

.graph-canvas {
  flex: 1;
  background: var(--neo-white);
  border: 4px solid var(--neo-black);
  box-shadow: 6px 6px 0 var(--neo-black);
  position: relative;
  overflow: hidden;
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  text-align: center;
  padding: var(--spacing-xl);
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0;
}

/* Details Panel */
.details-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 3px solid var(--neo-black);
}

.node-type-badge {
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid var(--neo-black);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.node-label {
  font-size: 1.1rem;
  margin-bottom: var(--spacing-lg);
  word-break: break-word;
}

.metadata-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item.full {
  grid-column: 1 / -1;
}

.meta-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 0.9rem;
  font-weight: 600;
  word-break: break-all;
}

/* Legend */
.graph-legend {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--neo-white);
  border: 3px solid var(--neo-black);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.legend-title {
  font-size: 0.75rem;
  font-weight: 700;
  padding-right: var(--spacing-md);
  border-right: 3px solid var(--neo-black);
}

.legend-items {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.legend-dot {
  width: 14px;
  height: 14px;
  border: 2px solid var(--neo-black);
}

.legend-line {
  width: 24px;
  height: 3px;
  background: var(--neo-black);
}

.legend-line.dashed {
  background: repeating-linear-gradient(
    90deg,
    var(--neo-black) 0,
    var(--neo-black) 4px,
    transparent 4px,
    transparent 8px
  );
}

.legend-divider {
  width: 3px;
  height: 20px;
  background: var(--neo-black);
}
</style>
