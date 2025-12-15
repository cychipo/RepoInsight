<template>
  <div class="graph-view">
    <div class="view-header">
      <h1>Knowledge Graph</h1>
      <div class="view-actions">
        <div class="filter-group">
          <button
            v-for="nodeType in nodeTypes"
            :key="nodeType.id"
            class="btn btn-ghost"
            :class="{ active: activeFilters.includes(nodeType.id) }"
            @click="toggleFilter(nodeType.id)">
            <span
              class="filter-dot"
              :style="{ background: nodeType.color }"></span>
            {{ nodeType.label }}
          </button>
        </div>
        <button class="btn btn-secondary" @click="resetView">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <polyline points="1,4 1,10 7,10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reset View
        </button>
      </div>
    </div>

    <div class="graph-container">
      <!-- Graph Canvas -->
      <div ref="graphContainer" class="graph-canvas">
        <div v-if="!graphStore.hasData" class="empty-state">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            stroke-width="1.5">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <h3>No Graph Data</h3>
          <p>
            Select a repository from the home page to generate the knowledge
            graph.
          </p>
          <router-link to="/" class="btn btn-primary">
            Open Repository
          </router-link>
        </div>
      </div>

      <!-- Node Details Panel -->
      <aside v-if="selectedNode" class="details-panel card">
        <div class="panel-header">
          <div class="node-type-badge" :class="`badge-${selectedNode.type}`">
            {{ selectedNode.type }}
          </div>
          <button class="btn btn-icon btn-ghost" @click="selectedNode = null">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="panel-content">
          <h3 class="node-label">{{ selectedNode.label }}</h3>

          <div class="metadata-section">
            <template v-if="selectedNode.type === 'commit'">
              <div class="meta-item">
                <span class="meta-label">Hash</span>
                <code class="meta-value">{{ selectedNode.metadata.hash }}</code>
              </div>
              <div class="meta-item">
                <span class="meta-label">Author</span>
                <span class="meta-value">{{
                  selectedNode.metadata.author
                }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Date</span>
                <span class="meta-value">{{
                  formatDate(selectedNode.metadata.date)
                }}</span>
              </div>
              <div class="meta-item full">
                <span class="meta-label">Message</span>
                <p class="meta-value">{{ selectedNode.metadata.message }}</p>
              </div>
            </template>

            <template v-else-if="selectedNode.type === 'file'">
              <div class="meta-item">
                <span class="meta-label">Path</span>
                <code class="meta-value">{{ selectedNode.metadata.path }}</code>
              </div>
              <div class="meta-item">
                <span class="meta-label">Language</span>
                <span class="meta-value">{{
                  selectedNode.metadata.language
                }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Modifications</span>
                <span class="meta-value">{{
                  selectedNode.metadata.modifyCount
                }}</span>
              </div>
            </template>

            <template v-else-if="selectedNode.type === 'function'">
              <div class="meta-item">
                <span class="meta-label">Name</span>
                <code class="meta-value">{{ selectedNode.metadata.name }}</code>
              </div>
              <div class="meta-item">
                <span class="meta-label">File</span>
                <code class="meta-value truncate">{{
                  selectedNode.metadata.filePath
                }}</code>
              </div>
              <div class="meta-item">
                <span class="meta-label">Lines</span>
                <span class="meta-value"
                  >{{ selectedNode.metadata.startLine }} -
                  {{ selectedNode.metadata.endLine }}</span
                >
              </div>
              <div class="meta-item">
                <span class="meta-label">Modifications</span>
                <span class="meta-value">{{
                  selectedNode.metadata.modifyCount
                }}</span>
              </div>
            </template>
          </div>
        </div>
      </aside>
    </div>

    <!-- Graph Legend -->
    <div class="graph-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: var(--node-commit)"></span>
        <span>Commit</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: var(--node-file)"></span>
        <span>File</span>
      </div>
      <div class="legend-item">
        <span
          class="legend-dot"
          style="background: var(--node-function)"></span>
        <span>Function</span>
      </div>
      <div class="legend-divider"></div>
      <div class="legend-item">
        <span class="legend-line"></span>
        <span>MODIFIES</span>
      </div>
      <div class="legend-item">
        <span class="legend-line dashed"></span>
        <span>CONTAINS</span>
      </div>
      <div class="legend-item">
        <span class="legend-line dotted"></span>
        <span>CALLS</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useGraphStore } from "@/stores/graph";
import type { GraphNode } from "@/types";

const graphStore = useGraphStore();
const graphContainer = ref<HTMLElement | null>(null);
const selectedNode = ref<GraphNode | null>(null);
const activeFilters = ref(["commit", "file", "function"]);

const nodeTypes = [
  { id: "commit", label: "Commits", color: "var(--node-commit)" },
  { id: "file", label: "Files", color: "var(--node-file)" },
  { id: "function", label: "Functions", color: "var(--node-function)" },
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function initGraph() {
  if (!graphContainer.value || !graphStore.hasData) return;

  // Dynamically import Cytoscape
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
          "font-size": "10px",
          color: "#94a3b8",
          "text-margin-y": 8,
          width: 30,
          height: 30,
        },
      },
      {
        selector: 'node[type="commit"]',
        style: {
          "background-color": "#3b82f6",
          "border-width": 3,
          "border-color": "#1e40af",
        },
      },
      {
        selector: 'node[type="file"]',
        style: {
          "background-color": "#22c55e",
          "border-width": 3,
          "border-color": "#15803d",
          shape: "rectangle",
          width: 24,
          height: 30,
        },
      },
      {
        selector: 'node[type="function"]',
        style: {
          "background-color": "#f59e0b",
          "border-width": 2,
          "border-color": "#b45309",
          shape: "diamond",
          width: 20,
          height: 20,
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": "#475569",
          "target-arrow-color": "#475569",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "arrow-scale": 0.8,
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
          "line-color": "#f59e0b",
          "target-arrow-color": "#f59e0b",
        },
      },
      {
        selector: ":selected",
        style: {
          "border-color": "#ffffff",
          "border-width": 4,
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
    if (hasData) {
      initGraph();
    }
  }
);

onMounted(() => {
  if (graphStore.hasData) {
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
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.view-header h1 {
  font-size: 1.5rem;
}

.view-actions {
  display: flex;
  gap: var(--spacing-md);
}

.filter-group {
  display: flex;
  gap: var(--spacing-xs);
  background: var(--bg-secondary);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
}

.filter-group .btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.75rem;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.filter-group .btn.active {
  background: var(--bg-tertiary);
}

.filter-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
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
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
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
  color: var(--text-muted);
}

.empty-state h3 {
  color: var(--text-secondary);
}

/* Details Panel */
.details-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.node-type-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-commit {
  background: rgba(59, 130, 246, 0.2);
  color: var(--node-commit);
}

.badge-file {
  background: rgba(34, 197, 94, 0.2);
  color: var(--node-file);
}

.badge-function {
  background: rgba(245, 158, 11, 0.2);
  color: var(--node-function);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.node-label {
  font-size: 1rem;
  margin-bottom: var(--spacing-lg);
  word-break: break-word;
}

.metadata-section {
  display: grid;
  gap: var(--spacing-md);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.meta-item.full {
  grid-column: 1 / -1;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.meta-value {
  font-size: 0.875rem;
  word-break: break-all;
}

/* Legend */
.graph-legend {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-top: var(--spacing-lg);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-line {
  width: 24px;
  height: 2px;
  background: var(--text-muted);
}

.legend-line.dashed {
  background: repeating-linear-gradient(
    90deg,
    var(--text-muted) 0,
    var(--text-muted) 4px,
    transparent 4px,
    transparent 8px
  );
}

.legend-line.dotted {
  background: repeating-linear-gradient(
    90deg,
    var(--node-function) 0,
    var(--node-function) 2px,
    transparent 2px,
    transparent 6px
  );
}

.legend-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
}
</style>
