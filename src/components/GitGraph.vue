<template>
  <div class="git-graph">
    <div v-if="loading" class="loading-state">
      <span class="loader"></span>
      <span>ĐANG TẢI BIỂU ĐỒ GIT...</span>
    </div>

    <div v-else-if="commits.length === 0" class="empty-state">
      <div class="empty-icon">◈</div>
      <h3>KHÔNG CÓ DỮ LIỆU GIT</h3>
      <p>Chọn một kho chứa để xem biểu đồ git.</p>
    </div>

    <div
      v-else
      class="graph-container"
      ref="scrollContainer"
      @scroll="onScroll">
      <div class="graph-list" :style="{ height: totalHeight + 'px' }">
        <div
          v-for="(commit, i) in visibleCommits"
          :key="commit.hash"
          class="graph-row"
          :style="{
            transform: `translateY(${getCommitTop(startIndex + i)}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }"
          :class="{ selected: selectedCommit?.hash === commit.hash }"
          @click="selectedCommit = commit">
          <!-- Branch visualization lane -->
          <div class="lane-container">
            <svg class="lane-svg" :width="laneWidth" :height="rowHeight">
              <!-- Draw branch lines -->
              <template
                v-for="(lane, laneIndex) in getLanes(startIndex + i)"
                :key="laneIndex">
                <!-- Vertical line through (From 0 to 48) -->
                <path
                  v-if="lane.through"
                  :d="`M ${getLaneX(lane.column)} 0 L ${getLaneX(lane.column)} ${rowHeight}`"
                  :stroke="lane.color"
                  stroke-width="2"
                  fill="none" />

                <!-- Line from above (From 0 to 24) -->
                <!-- Always vertical as per logic -->
                <path
                  v-if="lane.fromAbove && lane.toColumn !== undefined"
                  :d="`M ${getLaneX(lane.column)} 0 L ${getLaneX(lane.toColumn)} ${rowHeight / 2}`"
                  :stroke="lane.color"
                  stroke-width="2"
                  fill="none" />

                <!-- Line to below (From 24 to 48) -->
                <!-- Can be vertical or curved (merge/branch) -->
                <path
                  v-if="lane.toBelow && lane.toColumn !== undefined"
                  :d="drawCurve(getLaneX(lane.column), rowHeight / 2, getLaneX(lane.toColumn), rowHeight)"
                  :stroke="lane.color"
                  stroke-width="2"
                  fill="none" />
              </template>
              <!-- Commit node -->
              <circle
                :cx="getLaneX(getCommitColumn(startIndex + i))"
                :cy="rowHeight / 2"
                r="6"
                :fill="getCommitColor(startIndex + i)"
                stroke="var(--neo-black)"
                stroke-width="2" />
            </svg>
          </div>

          <!-- Commit info -->
          <div class="commit-content">
            <!-- Branch refs -->
            <div class="refs-container" v-if="commit.refs.length > 0">
              <span
                v-for="ref in commit.refs.slice(0, 3)"
                :key="ref"
                class="ref-badge"
                :class="getRefClass(ref)">
                {{ formatRef(ref) }}
              </span>
              <span v-if="commit.refs.length > 3" class="ref-more">
                +{{ commit.refs.length - 3 }}
              </span>
            </div>

            <div class="commit-main">
              <span class="commit-message truncate">{{ commit.message }}</span>
            </div>

            <div class="commit-meta">
              <code class="commit-hash">{{ commit.shortHash }}</code>
              <span class="commit-author">{{ commit.author }}</span>
              <span class="commit-date">{{ formatDate(commit.date) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected commit details -->
    <aside v-if="selectedCommit" class="details-panel card">
      <div class="panel-header">
        <h3>CHI TIẾT COMMIT</h3>
        <button class="btn btn-icon btn-ghost" @click="selectedCommit = null">
          ✕
        </button>
      </div>

      <div class="panel-content">
        <div class="detail-group">
          <label>HASH</label>
          <code>{{ selectedCommit.hash }}</code>
        </div>

        <div class="detail-group">
          <label>TÁC GIẢ</label>
          <span class="font-bold">{{ selectedCommit.author }}</span>
          <span class="text-muted text-sm">{{
            selectedCommit.authorEmail
          }}</span>
        </div>

        <div class="detail-group">
          <label>NGÀY</label>
          <span>{{ formatFullDate(selectedCommit.date) }}</span>
        </div>

        <div class="detail-group">
          <label>NỘI DUNG</label>
          <p class="commit-full-message">{{ selectedCommit.message }}</p>
        </div>

        <div v-if="selectedCommit.refs.length > 0" class="detail-group">
          <label>REFS</label>
          <div class="refs-list">
            <span
              v-for="ref in selectedCommit.refs"
              :key="ref"
              class="ref-badge"
              :class="getRefClass(ref)">
              {{ ref }}
            </span>
          </div>
        </div>

        <div v-if="selectedCommit.parentHashes.length > 0" class="detail-group">
          <label>COMMIT CHA</label>
          <div class="parents-list">
            <code
              v-for="parent in selectedCommit.parentHashes"
              :key="parent"
              class="parent-hash">
              {{ parent.slice(0, 7) }}
            </code>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from "vue";
import { useRepositoryStore } from "@/stores/repository";
import type { GitGraphCommit } from "@/types";

const repositoryStore = useRepositoryStore();
const commits = ref<GitGraphCommit[]>([]);
const loading = ref(false);
const selectedCommit = ref<GitGraphCommit | null>(null);

// Virtual scrolling
const rowHeight = 48; // Must match CSS
const scrollContainer = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(800); // Initial estimate
const buffer = 10; // Extra items to render

const totalHeight = computed(() => commits.value.length * rowHeight);

const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / rowHeight) - buffer)
);

const endIndex = computed(() =>
  Math.min(
    commits.value.length,
    Math.ceil((scrollTop.value + containerHeight.value) / rowHeight) + buffer
  )
);

const visibleCommits = computed(() =>
  commits.value.slice(startIndex.value, endIndex.value)
);

function getCommitTop(index: number) {
  return index * rowHeight;
}

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop;
}

// Update container height on resize/mount
function updateDimensions() {
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight;
  }
}

// Branch lane tracking
const commitColumns = ref<Map<string, number>>(new Map());
const maxColumn = ref(0);

// Colors for different branches
const branchColors = [
  "var(--neo-blue)",
  "var(--neo-green)",
  "var(--neo-orange)",
  "var(--neo-pink)",
  "var(--neo-purple)",
  "#00D4FF",
  "#7CFF6B",
  "#FF9E2C",
];

const laneWidth = computed(() => Math.max(60, (maxColumn.value + 1) * 20 + 20));

async function loadGitGraph() {
  if (!repositoryStore.currentRepository) return;

  // Simple optimization: if we have data, show it first
  if (commits.value.length === 0) {
    loading.value = true;
  }

  try {
    // Load all commits for the graph (limit=0 means no limit)
    const newCommits = await window.electronAPI.getGitGraph(
      repositoryStore.currentRepository,
      0
    );

    // Only update if changed
    if (newCommits.length !== commits.value.length || newCommits[0]?.hash !== commits.value[0]?.hash) {
       commits.value = newCommits;
       calculateBranchLanes(); // This now also calls precalculateRowLanes
       nextTick(() => updateDimensions());
    }

  } catch (e) {
    console.error("Failed to load git graph:", e);
  } finally {
    loading.value = false;
  }
}

function calculateBranchLanes() {
  commitColumns.value.clear();
  maxColumn.value = 0;

  const activeLanes: string[] = []; // commit hashes currently in each lane

  for (let i = 0; i < commits.value.length; i++) {
    const commit = commits.value[i];

    // Find if this commit is already in an active lane (as a parent)
    let column = activeLanes.indexOf(commit.hash);

    if (column === -1) {
      // Find first empty lane or create new one
      column = activeLanes.indexOf("");
      if (column === -1) {
        column = activeLanes.length;
        activeLanes.push("");
      }
    }

    // Assign this commit to the column
    commitColumns.value.set(commit.hash, column);
    maxColumn.value = Math.max(maxColumn.value, column);

    // Update lanes: replace current hash with first parent
    if (commit.parentHashes.length > 0) {
      activeLanes[column] = commit.parentHashes[0];

      // Add additional parents to new lanes
      for (let p = 1; p < commit.parentHashes.length; p++) {
        const parentHash = commit.parentHashes[p];
        if (!activeLanes.includes(parentHash)) {
          // Find empty lane or create new
          let parentColumn = activeLanes.indexOf("");
          if (parentColumn === -1) {
            parentColumn = activeLanes.length;
            activeLanes.push(parentHash);
          } else {
            activeLanes[parentColumn] = parentHash;
          }
          maxColumn.value = Math.max(maxColumn.value, parentColumn);
        }
      }
    } else {
      // No parents, clear the lane
      activeLanes[column] = "";
    }

    // Clean up lanes that are no longer needed
    while (
      activeLanes.length > 0 &&
      activeLanes[activeLanes.length - 1] === ""
    ) {
      activeLanes.pop();
    }
  }
  precalculateRowLanes(); // Call pre-calculation after columns are determined
}

function getCommitColumn(index: number): number {
  return commitColumns.value.get(commits.value[index].hash) || 0;
}

function getLaneX(column: number): number {
  return column * 20 + 15;
}

function getCommitColor(index: number): string {
  const column = getCommitColumn(index);
  return branchColors[column % branchColors.length];
}

interface Lane {
  column: number;
  color: string;
  through?: boolean;
  fromAbove?: boolean;
  toBelow?: boolean;
  toColumn?: number;
}

// Side storage for row lanes to avoid re-calc
const rowLanes = ref<Lane[][]>([]);

function precalculateRowLanes() {
  rowLanes.value = new Array(commits.value.length);

  // Simulate the activeLanes state for each row to determine drawing instructions
  const currentActiveLanes: (string | null)[] = []; // Stores parent hash or null for empty
  const currentLaneColors: (string | null)[] = []; // Stores color for each lane

  for (let i = 0; i < commits.value.length; i++) {
    const commit = commits.value[i];
    const commitColumn = commitColumns.value.get(commit.hash) || 0;
    const commitColor = branchColors[commitColumn % branchColors.length];
    const lanesForThisRow: Lane[] = [];

    // 1. Determine incoming lanes (before this commit is processed)
    const incomingActiveLanes = [...currentActiveLanes];

    // 2. Draw 'through' lines for lanes that are active and not the current commit's lane
    for (let col = 0; col < incomingActiveLanes.length; col++) {
      if (col === commitColumn) continue; // This lane is for the current commit
      if (incomingActiveLanes[col] !== null) {
        // If this lane is active and not for the current commit, it passes through
        lanesForThisRow.push({
          column: col,
          color: currentLaneColors[col] || branchColors[col % branchColors.length],
          through: true,
        });
      }
    }

    // 3. Draw lines related to the current commit
    // Line from above (if this commit is a child of a previous commit in this lane)
    if (incomingActiveLanes[commitColumn] === commit.hash) {
      lanesForThisRow.push({
        column: commitColumn,
        color: commitColor,
        fromAbove: true,
        toColumn: commitColumn,
      });
    }

    // Line to below (to its first parent)
    if (commit.parentHashes.length > 0) {
      lanesForThisRow.push({
        column: commitColumn, // Start from current commit's column
        color: commitColor,
        toBelow: true,
        toColumn: commitColumn, // Assumes first parent continues in same column initially
      });
    }

    // Merge lines (from this commit to other parents)
    for (let p = 1; p < commit.parentHashes.length; p++) {
      const parentHash = commit.parentHashes[p];
      const parentColumn = commitColumns.value.get(parentHash);
      if (parentColumn !== undefined && parentColumn !== commitColumn) {
        lanesForThisRow.push({
          column: commitColumn, // Start from current commit's column
          color: branchColors[parentColumn % branchColors.length], // Color of the target branch
          toBelow: true,
          toColumn: parentColumn, // End at the parent's column
        });
      }
    }

    // 4. Update currentActiveLanes for the next iteration (as if calculateBranchLanes was run)
    // Find where this commit was supposed to go
    let currentCommitLaneIndex = currentActiveLanes.indexOf(commit.hash);
    if (currentCommitLaneIndex === -1) {
      currentCommitLaneIndex = currentActiveLanes.indexOf(null);
      if (currentCommitLaneIndex === -1) {
        currentCommitLaneIndex = currentActiveLanes.length;
        currentActiveLanes.push(null);
        currentLaneColors.push(null);
      }
    }

    // Assign this commit's parent to its lane
    if (commit.parentHashes.length > 0) {
      currentActiveLanes[currentCommitLaneIndex] = commit.parentHashes[0];
      currentLaneColors[currentCommitLaneIndex] = commitColor;
    } else {
      currentActiveLanes[currentCommitLaneIndex] = null; // Lane ends
      currentLaneColors[currentCommitLaneIndex] = null;
    }

    // Handle additional parents (merges)
    for (let p = 1; p < commit.parentHashes.length; p++) {
      const parentHash = commit.parentHashes[p];
      if (!currentActiveLanes.includes(parentHash)) {
        let newLaneIndex = currentActiveLanes.indexOf(null);
        if (newLaneIndex === -1) {
          newLaneIndex = currentActiveLanes.length;
          currentActiveLanes.push(null);
          currentLaneColors.push(null);
        }
        currentActiveLanes[newLaneIndex] = parentHash;
        currentLaneColors[newLaneIndex] = branchColors[newLaneIndex % branchColors.length];
      }
    }

    // Clean up empty lanes from the end
    while (currentActiveLanes.length > 0 && currentActiveLanes[currentActiveLanes.length - 1] === null) {
      currentActiveLanes.pop();
      currentLaneColors.pop();
    }

    rowLanes.value[i] = lanesForThisRow;
  }
}

function getLanes(index: number): Lane[] {
  return rowLanes.value[index] || [];
}

function drawCurve(x1: number, y1: number, x2: number, y2: number): string {
  if (x1 === x2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // Bezier curve logic
  // Vertical start from y1, Vertical end at y2
  // Control points:
  // cp1: (x1, y1 + smoothing)
  // cp2: (x2, y2 - smoothing)

  const height = y2 - y1;
  const smoothing = height / 2;

  return `M ${x1} ${y1} C ${x1} ${y1 + smoothing}, ${x2} ${y2 - smoothing}, ${x2} ${y2}`;
}

function getRefClass(ref: string): string {
  if (ref.includes("origin/") || ref.includes("HEAD")) {
    return "ref-remote";
  }
  if (ref.startsWith("tag:")) {
    return "ref-tag";
  }
  return "ref-local";
}

function formatRef(ref: string): string {
  // Shorten origin/xxx to just xxx for display
  return ref.replace(/^origin\//, "").slice(0, 20);
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "hôm nay";
  if (diffDays === 1) return "hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  return d.toLocaleDateString();
}

function formatFullDate(date: Date | string): string {
  return new Date(date).toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

watch(
  () => repositoryStore.currentRepository,
  () => {
    if (repositoryStore.currentRepository) {
      loadGitGraph();
    }
  }
);

onMounted(() => {
  window.addEventListener('resize', updateDimensions);
  updateDimensions();
  if (repositoryStore.currentRepository) {
    loadGitGraph();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions);
});
</script>

<style scoped>
.git-graph {
  display: flex;
  height: 100%;
  gap: var(--spacing-lg);
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
}

.graph-container {
  flex: 1;
  overflow-y: auto;
  background: var(--neo-white);
  border: 4px solid var(--neo-black);
  box-shadow: 6px 6px 0 var(--neo-black);
  position: relative; /* For virtual scroll positioning */
}

.graph-list {
  position: relative;
  /* Height set dynamically */
}

.graph-row {
  display: flex;
  align-items: stretch;
  border-bottom: 2px solid var(--neo-black);
  cursor: pointer;
  transition: all var(--transition-fast);
  height: 48px; /* Fixed height for virtualization */
  box-sizing: border-box;
}

.graph-row:hover {
  background: var(--neo-yellow);
}

.graph-row.selected {
  background: var(--neo-pink);
}

.lane-container {
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.03);
  border-right: 2px solid var(--neo-black);
}

.lane-svg {
  display: block;
}

.commit-content {
  flex: 1;
  padding: 0 var(--spacing-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.refs-container {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.ref-badge {
  display: inline-block;
  padding: 1px 6px;
  font-size: 0.65rem;
  font-weight: 700;
  border: 2px solid var(--neo-black);
  white-space: nowrap;
}

.ref-local {
  background: var(--neo-green);
}

.ref-remote {
  background: var(--neo-blue);
}

.ref-tag {
  background: var(--neo-orange);
}

.ref-more {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
}

.commit-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.commit-message {
  font-size: 0.85rem;
  font-weight: 600;
}

.commit-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.commit-hash {
  font-family: var(--font-mono);
  background: var(--neo-blue);
  padding: 1px 4px;
  border: 2px solid var(--neo-black);
  font-size: 0.7rem;
}

.commit-author {
  font-weight: 600;
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
  padding-bottom: var(--spacing-md);
  border-bottom: 3px solid var(--neo-black);
  margin-bottom: var(--spacing-md);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.detail-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-group label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.detail-group code {
  word-break: break-all;
}

.commit-full-message {
  font-weight: 500;
  line-height: 1.5;
}

.refs-list,
.parents-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.parent-hash {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  background: var(--bg-primary);
  padding: 2px 6px;
  border: 2px solid var(--neo-black);
}
</style>
