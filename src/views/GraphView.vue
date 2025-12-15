<template>
  <div class="h-full flex flex-col p-6 gap-4">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-6">
        <h1 class="text-2xl font-bold uppercase">
          {{
            viewMode === "knowledge" ? "◈ BIỂU ĐỒ TRI THỨC" : "◈ BIỂU ĐỒ GIT"
          }}
        </h1>
        <div class="flex gap-0">
          <button
            class="px-4 py-2 font-sans text-xs font-bold bg-neo-white border-3 border-neo-black cursor-pointer transition-all -ml-[3px] first:ml-0 hover:bg-neo-yellow"
            :class="{
              'bg-neo-blue! shadow-[inset_0_0_0_2px_black]':
                viewMode === 'knowledge',
            }"
            @click="viewMode = 'knowledge'">
            TRI THỨC
          </button>
          <button
            class="px-4 py-2 font-sans text-xs font-bold bg-neo-white border-3 border-neo-black cursor-pointer transition-all -ml-[3px] first:ml-0 hover:bg-neo-yellow"
            :class="{
              'bg-neo-blue! shadow-[inset_0_0_0_2px_black]': viewMode === 'git',
            }"
            @click="viewMode = 'git'">
            BIỂU ĐỒ GIT
          </button>
        </div>
      </div>
      <div class="flex gap-4 flex-wrap" v-if="viewMode === 'knowledge'">
        <div class="flex gap-0">
          <button
            v-for="nodeType in nodeTypes"
            :key="nodeType.id"
            class="px-4 py-2 font-sans text-xs font-bold bg-neo-white border-3 border-neo-black cursor-pointer transition-all -ml-[3px] first:ml-0 flex items-center gap-2 hover:bg-(--filter-color)"
            :class="{
              'bg-(--filter-color)! shadow-[inset_0_0_0_2px_black]':
                activeFilters.includes(nodeType.id),
              'opacity-60': !activeFilters.includes(nodeType.id),
            }"
            :style="{ '--filter-color': nodeType.color }"
            @click="toggleFilter(nodeType.id)">
            <span
              class="w-3 h-3 border-2 border-neo-black"
              :style="{ background: nodeType.color }"></span>
            {{ nodeType.label }}
          </button>
        </div>
        <button class="btn btn-secondary" @click="resetView">
          ↻ ĐẶT LẠI GÓC NHÌN
        </button>
      </div>
    </div>

    <!-- Knowledge Graph View -->
    <div v-show="viewMode === 'knowledge'" class="flex-1 flex flex-col min-h-0">
      <div class="flex-1 flex gap-6 min-h-0">
        <!-- Graph Canvas -->
        <div
          ref="graphContainer"
          class="flex-1 bg-neo-white border-4 border-neo-black shadow-brutal relative overflow-hidden">
          <div
            v-if="!graphStore.hasData"
            class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6">
            <div class="text-6xl opacity-30">◈</div>
            <h3 class="text-xl font-bold m-0">KHÔNG CÓ DỮ LIỆU BIỂU ĐỒ</h3>
            <p>Chọn một kho chứa từ trang chủ để tạo biểu đồ tri thức.</p>
            <router-link to="/" class="btn btn-primary">
              ◆ MỞ KHO CHỨA
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
            <h3 class="text-lg font-bold mb-4 wrap-break-word">
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
                    >TÁC GIẢ</span
                  >
                  <span class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.author
                  }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >NGÀY</span
                  >
                  <span class="text-sm font-semibold break-all">{{
                    formatDate(selectedNode.metadata.date)
                  }}</span>
                </div>
                <div class="flex flex-col gap-1 col-span-full">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >NỘI DUNG</span
                  >
                  <p class="text-sm font-semibold break-all">
                    {{ selectedNode.metadata.message }}
                  </p>
                </div>
              </template>

              <template v-else-if="selectedNode.type === 'file'">
                <!-- Hotspot Score Banner -->
                <div
                  class="flex items-center justify-between p-3 border-3 border-neo-black mb-2"
                  :class="
                    getRiskBannerClass(getFileHotspotScore(selectedNode.id))
                  ">
                  <div class="flex flex-col">
                    <span class="text-xs font-bold tracking-wider opacity-80"
                      >ĐIỂM RỦI RO</span
                    >
                    <span class="text-2xl font-bold"
                      >{{ getFileHotspotScore(selectedNode.id) }}/100</span
                    >
                  </div>
                  <div class="text-right">
                    <span
                      class="text-sm font-bold px-2 py-1 bg-neo-white/50 border-2 border-neo-black">
                      {{ getRiskLabel(getFileHotspotScore(selectedNode.id)) }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >ĐƯỜNG DẪN</span
                  >
                  <code class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.path
                  }}</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >NGÔN NGỮ</span
                  >
                  <span class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.language
                  }}</span>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <div
                    class="flex flex-col p-2 bg-neo-blue/20 border-2 border-neo-black text-center">
                    <span class="text-xl font-bold">{{
                      selectedNode.metadata.modifyCount || 0
                    }}</span>
                    <span class="text-xs font-bold">LẦN SỬA</span>
                  </div>
                  <div
                    class="flex flex-col p-2 bg-neo-pink/20 border-2 border-neo-black text-center">
                    <span class="text-xl font-bold">{{
                      getFileContributors(selectedNode.id)
                    }}</span>
                    <span class="text-xs font-bold">TÁC GIẢ</span>
                  </div>
                </div>

                <!-- Co-Change Files -->
                <div
                  class="flex flex-col gap-1 mt-2"
                  v-if="getCoChangeFilesForNode(selectedNode.id).length > 0">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >THƯỜNG THAY ĐỔI CÙNG</span
                  >
                  <div
                    class="flex flex-col gap-1 max-h-[100px] overflow-y-auto">
                    <div
                      v-for="coFile in getCoChangeFilesForNode(
                        selectedNode.id
                      ).slice(0, 5)"
                      :key="coFile.file"
                      class="flex items-center gap-2 text-xs bg-neo-white/50 p-1 border border-stone-300">
                      <span class="flex-1 truncate font-mono">{{
                        getFileName(coFile.file)
                      }}</span>
                      <span class="badge badge-primary text-[10px]"
                        >{{ coFile.count }}×</span
                      >
                    </div>
                  </div>
                </div>

                <!-- Risk Explanation -->
                <div
                  class="flex flex-col gap-1 mt-2 p-2 bg-stone-100 border-2 border-stone-300 text-xs">
                  <span class="font-bold text-stone-600">💡 GIẢI THÍCH</span>
                  <p class="text-stone-600 leading-relaxed">
                    {{ getRiskExplanation(selectedNode) }}
                  </p>
                </div>
              </template>

              <template v-else-if="selectedNode.type === 'function'">
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >TÊN</span
                  >
                  <code class="text-sm font-semibold break-all">{{
                    selectedNode.metadata.name
                  }}</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >TỆP</span
                  >
                  <code class="text-sm font-semibold break-all truncate">{{
                    selectedNode.metadata.filePath
                  }}</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >DÒNG</span
                  >
                  <span class="text-sm font-semibold break-all"
                    >{{ selectedNode.metadata.startLine }} -
                    {{ selectedNode.metadata.endLine }}</span
                  >
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-stone-500 tracking-wider"
                    >SỬA ĐỔI</span
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
        class="flex items-center gap-6 p-4 mt-6 bg-neo-white border-3 border-neo-black shadow-brutal">
        <div class="text-xs font-bold pr-4 border-r-3 border-neo-black">
          CHÚ GIẢI
        </div>
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span
              class="w-[14px] h-[14px] border-2 border-neo-black bg-neo-blue"
              style="background: #00d4ff !important"></span>
            <span>COMMIT</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span
              class="w-[14px] h-[14px] border-2 border-neo-black bg-neo-green"
              style="background: #7cff6b !important"></span>
            <span>TỆP</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span
              class="w-[14px] h-[14px] border-2 border-neo-black"
              style="background: #ff9e2c !important"></span>
            <span>HÀM</span>
          </div>
          <div class="w-[3px] h-5 bg-neo-black"></div>
          <div class="flex items-center gap-2 text-xs font-semibold">
            <span class="w-6 h-[3px] bg-neo-black"></span>
            <span>SỬA ĐỔI</span>
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
            <span>CHỨA</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Git Graph View -->
    <div v-show="viewMode === 'git'" class="flex-1 min-h-0">
      <GitGraph />
    </div>
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
  { id: "file", label: "TỆP", color: "var(--neo-green)" },
  { id: "function", label: "HÀM", color: "var(--neo-orange)" },
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
    if (hasData && viewMode.value === "knowledge" && !cy) {
      initGraph();
    }
  }
);

watch(viewMode, (mode) => {
  if (mode === "knowledge" && graphStore.hasData) {
    // Optimization: Just resize and fit instead of re-initializing
    setTimeout(() => {
      if (cy) {
        cy.resize();
        cy.fit();
      } else {
        initGraph();
      }
    }, 100);
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

// Helper functions for file risk explanation
function getFileHotspotScore(fileId: string): number {
  return graphStore.getFileHotspotScore(fileId);
}

function getRiskBannerClass(score: number): string {
  if (score >= 75) return "bg-neo-red";
  if (score >= 50) return "bg-neo-orange";
  if (score >= 25) return "bg-neo-yellow";
  return "bg-neo-green";
}

function getRiskLabel(score: number): string {
  if (score >= 75) return "RỦI RO CAO";
  if (score >= 50) return "RỦI RO TB";
  if (score >= 25) return "RỦI RO THẤP";
  return "AN TOÀN";
}

function getFileContributors(fileId: string): number {
  // Count unique authors who modified this file
  const commits = graphStore.graph.edges
    .filter((e) => e.type === "MODIFIES" && e.target === fileId)
    .map((e) => e.source);

  const authorSet = new Set<string>();
  commits.forEach((commitId) => {
    const commit = graphStore.graph.nodes.find((n) => n.id === commitId);
    const metadata = commit?.metadata as any;
    if (metadata?.author) {
      authorSet.add(metadata.author);
    }
  });

  return authorSet.size || 1;
}

function getCoChangeFilesForNode(
  fileId: string
): { file: string; count: number }[] {
  const coChangePatterns = graphStore.getCoChangePatterns();
  const results: { file: string; count: number }[] = [];

  for (const pattern of coChangePatterns) {
    if (pattern.files.includes(fileId)) {
      const otherFile = pattern.files.find((f) => f !== fileId);
      if (otherFile) {
        results.push({ file: otherFile, count: pattern.count });
      }
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function getRiskExplanation(node: GraphNode): string {
  const score = getFileHotspotScore(node.id);
  const modifyCount = (node.metadata as any).modifyCount || 0;
  const contributors = getFileContributors(node.id);
  const coChangeFiles = getCoChangeFilesForNode(node.id).length;

  const parts: string[] = [];

  if (modifyCount > 10) {
    parts.push(`Tệp này được sửa đổi ${modifyCount} lần`);
  } else if (modifyCount > 5) {
    parts.push(`Tệp có tần suất thay đổi trung bình (${modifyCount} lần)`);
  } else {
    parts.push(`Tệp ít được thay đổi (${modifyCount} lần)`);
  }

  if (contributors > 3) {
    parts.push(
      `có ${contributors} tác giả tham gia sửa đổi (ownership phân tán)`
    );
  } else if (contributors > 1) {
    parts.push(`có ${contributors} tác giả tham gia`);
  }

  if (coChangeFiles > 0) {
    parts.push(`thường được sửa cùng ${coChangeFiles} tệp khác`);
  }

  if (score >= 75) {
    parts.push("Cần chú ý khi refactor.");
  } else if (score >= 50) {
    parts.push("Nên review kỹ khi thay đổi.");
  }

  return parts.join(", ") + ".";
}
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
