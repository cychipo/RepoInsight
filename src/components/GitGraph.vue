<template>
  <div class="git-graph">
    <div v-if="loading" class="loading-state">
      <span class="loader"></span>
      <span>LOADING GIT GRAPH...</span>
    </div>

    <div v-else-if="commits.length === 0" class="empty-state">
      <div class="empty-icon">◈</div>
      <h3>NO GIT DATA</h3>
      <p>Select a repository to view the git graph.</p>
    </div>

    <div v-else class="graph-container" ref="scrollContainer">
      <div class="graph-list">
        <div
          v-for="(commit, index) in commits"
          :key="commit.hash"
          class="graph-row"
          :class="{ selected: selectedCommit?.hash === commit.hash }"
          @click="selectedCommit = commit">
          <!-- Branch visualization lane -->
          <div class="lane-container">
            <svg class="lane-svg" :width="laneWidth" height="48">
              <!-- Draw branch lines -->
              <template
                v-for="(lane, laneIndex) in getLanes(index)"
                :key="laneIndex">
                <!-- Vertical line through -->
                <line
                  v-if="lane.through"
                  :x1="getLaneX(lane.column)"
                  y1="0"
                  :x2="getLaneX(lane.column)"
                  y2="48"
                  :stroke="lane.color"
                  stroke-width="2" />
                <!-- Line from parent (above) to this commit -->
                <line
                  v-if="lane.fromAbove && lane.toColumn !== undefined"
                  :x1="getLaneX(lane.column)"
                  y1="0"
                  :x2="getLaneX(lane.toColumn)"
                  y2="24"
                  :stroke="lane.color"
                  stroke-width="2" />
                <!-- Line from this commit to child (below) -->
                <line
                  v-if="lane.toBelow && lane.toColumn !== undefined"
                  :x1="getLaneX(lane.column)"
                  y1="24"
                  :x2="getLaneX(lane.toColumn)"
                  y2="48"
                  :stroke="lane.color"
                  stroke-width="2" />
              </template>
              <!-- Commit node -->
              <circle
                :cx="getLaneX(getCommitColumn(index))"
                cy="24"
                r="6"
                :fill="getCommitColor(index)"
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
        <h3>COMMIT DETAILS</h3>
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
          <label>AUTHOR</label>
          <span class="font-bold">{{ selectedCommit.author }}</span>
          <span class="text-muted text-sm">{{
            selectedCommit.authorEmail
          }}</span>
        </div>

        <div class="detail-group">
          <label>DATE</label>
          <span>{{ formatFullDate(selectedCommit.date) }}</span>
        </div>

        <div class="detail-group">
          <label>MESSAGE</label>
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
          <label>PARENTS</label>
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
import { ref, onMounted, computed, watch } from "vue";
import { useRepositoryStore } from "@/stores/repository";
import type { GitGraphCommit } from "@/types";

const repositoryStore = useRepositoryStore();
const commits = ref<GitGraphCommit[]>([]);
const loading = ref(false);
const selectedCommit = ref<GitGraphCommit | null>(null);
const scrollContainer = ref<HTMLElement | null>(null);

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

  loading.value = true;
  try {
    commits.value = await window.electronAPI.getGitGraph(
      repositoryStore.currentRepository,
      500
    );
    calculateBranchLanes();
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

function getLanes(index: number): Lane[] {
  const lanes: Lane[] = [];
  const commit = commits.value[index];
  const commitColumn = getCommitColumn(index);

  // Track which lanes have active commits passing through
  const activeLanesAtRow = new Set<number>();

  // Check commits above to see what lanes are active
  for (let i = 0; i < index; i++) {
    const aboveCommit = commits.value[i];
    const aboveColumn = getCommitColumn(i);

    // Check if any parent of the above commit passes through this row
    for (const parentHash of aboveCommit.parentHashes) {
      const parentIndex = commits.value.findIndex((c) => c.hash === parentHash);
      if (parentIndex > index) {
        // Parent is below, so this lane passes through
        const parentColumn = commitColumns.value.get(parentHash);
        if (parentColumn !== undefined) {
          activeLanesAtRow.add(aboveColumn);
        }
      }
    }
  }

  // Draw through lines for active lanes
  for (const laneCol of activeLanesAtRow) {
    if (laneCol !== commitColumn) {
      lanes.push({
        column: laneCol,
        color: branchColors[laneCol % branchColors.length],
        through: true,
      });
    }
  }

  // Draw merge lines from parents
  if (commit.parentHashes.length > 1) {
    // This is a merge commit
    for (let p = 1; p < commit.parentHashes.length; p++) {
      const parentHash = commit.parentHashes[p];
      const parentColumn = commitColumns.value.get(parentHash);
      if (parentColumn !== undefined && parentColumn !== commitColumn) {
        lanes.push({
          column: parentColumn,
          color: branchColors[parentColumn % branchColors.length],
          toBelow: true,
          toColumn: commitColumn,
        });
      }
    }
  }

  // Main branch line (first parent)
  if (commit.parentHashes.length > 0) {
    lanes.push({
      column: commitColumn,
      color: branchColors[commitColumn % branchColors.length],
      toBelow: true,
      toColumn: commitColumn,
    });
  }

  return lanes;
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

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString();
}

function formatFullDate(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
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
  if (repositoryStore.currentRepository) {
    loadGitGraph();
  }
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
}

.graph-list {
  display: flex;
  flex-direction: column;
}

.graph-row {
  display: flex;
  align-items: stretch;
  border-bottom: 2px solid var(--neo-black);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 48px;
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
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.refs-container {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.ref-badge {
  display: inline-block;
  padding: 2px 8px;
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
  padding: 2px 6px;
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
