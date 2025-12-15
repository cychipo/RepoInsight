<template>
  <div class="analysis-view">
    <div class="view-header">
      <h1>Code Analysis</h1>
      <button
        v-if="repositoryStore.hasRepository"
        class="btn btn-primary"
        @click="runAnalysis"
        :disabled="isAnalyzing">
        <svg
          v-if="!isAnalyzing"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2">
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </svg>
        <div v-else class="loader" style="width: 18px; height: 18px"></div>
        {{ isAnalyzing ? "Analyzing..." : "Run Analysis" }}
      </button>
    </div>

    <!-- Analysis Progress -->
    <div v-if="isAnalyzing" class="progress-section card">
      <div class="progress-header">
        <span>{{ analysisProgress.message }}</span>
        <span class="text-muted"
          >{{ analysisProgress.current }} / {{ analysisProgress.total }}</span
        >
      </div>
      <div class="progress">
        <div
          class="progress-bar"
          :style="{ width: `${progressPercent}%` }"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!repositoryStore.hasRepository" class="empty-state card">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-muted)"
        stroke-width="1.5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
      <h3>No Repository Selected</h3>
      <p>Select a repository from the home page to view analysis results.</p>
      <router-link to="/" class="btn btn-primary">Open Repository</router-link>
    </div>

    <!-- Analysis Results -->
    <template v-else>
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-icon" style="background: rgba(59, 130, 246, 0.2)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--node-commit)"
              stroke-width="2">
              <circle cx="12" cy="12" r="4" />
              <line x1="1.05" y1="12" x2="7" y2="12" />
              <line x1="17.01" y1="12" x2="22.96" y2="12" />
            </svg>
          </div>
          <div>
            <div class="stat-value">{{ graphStore.stats.commits }}</div>
            <div class="stat-label">Commits</div>
          </div>
        </div>

        <div class="stat-card card">
          <div class="stat-icon" style="background: rgba(34, 197, 94, 0.2)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--node-file)"
              stroke-width="2">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
          </div>
          <div>
            <div class="stat-value">{{ graphStore.stats.files }}</div>
            <div class="stat-label">Files</div>
          </div>
        </div>

        <div class="stat-card card">
          <div class="stat-icon" style="background: rgba(245, 158, 11, 0.2)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--node-function)"
              stroke-width="2">
              <polyline points="4,17 10,11 4,5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <div>
            <div class="stat-value">{{ graphStore.stats.functions }}</div>
            <div class="stat-label">Functions</div>
          </div>
        </div>

        <div class="stat-card card">
          <div class="stat-icon" style="background: rgba(139, 92, 246, 0.2)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-secondary)"
              stroke-width="2">
              <path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15,3 21,3 21,9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
          <div>
            <div class="stat-value">{{ graphStore.stats.totalEdges }}</div>
            <div class="stat-label">Relationships</div>
          </div>
        </div>
      </div>

      <div class="analysis-grid">
        <!-- Hotspot Files -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-danger)"
                stroke-width="2">
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              Hotspot Files
            </h3>
            <span class="badge">Most Modified</span>
          </div>
          <div class="list-container">
            <div
              v-for="(file, index) in hotspotFiles"
              :key="file.id"
              class="list-item">
              <span class="rank">{{ index + 1 }}</span>
              <div class="item-info">
                <span class="item-name truncate font-mono">{{
                  file.label
                }}</span>
                <span class="item-meta text-muted text-xs">{{
                  (file.metadata as any).language
                }}</span>
              </div>
              <span class="badge badge-danger"
                >{{ (file.metadata as any).modifyCount }} changes</span
              >
            </div>
            <div v-if="hotspotFiles.length === 0" class="empty-list">
              No data available
            </div>
          </div>
        </div>

        <!-- Hotspot Functions -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--node-function)"
                stroke-width="2">
                <polyline points="4,17 10,11 4,5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              Hotspot Functions
            </h3>
            <span class="badge">Frequently Changed</span>
          </div>
          <div class="list-container">
            <div
              v-for="(func, index) in hotspotFunctions"
              :key="func.id"
              class="list-item">
              <span class="rank">{{ index + 1 }}</span>
              <div class="item-info">
                <span class="item-name truncate font-mono">{{
                  (func.metadata as any).name
                }}</span>
                <span class="item-meta text-muted text-xs truncate">{{
                  (func.metadata as any).filePath
                }}</span>
              </div>
              <span class="badge badge-warning"
                >{{ (func.metadata as any).modifyCount }} changes</span
              >
            </div>
            <div v-if="hotspotFunctions.length === 0" class="empty-list">
              No data available
            </div>
          </div>
        </div>

        <!-- Co-Change Patterns -->
        <div class="card full-width">
          <div class="card-header">
            <h3 class="card-title">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-primary)"
                stroke-width="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Co-Change Patterns
            </h3>
            <span class="badge">Files Changed Together</span>
          </div>
          <div class="cochange-grid">
            <div
              v-for="(pattern, index) in coChangePatterns"
              :key="index"
              class="cochange-item">
              <div class="cochange-files">
                <code class="truncate">{{
                  getFileName(pattern.files[0])
                }}</code>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12,5 19,12 12,19" />
                </svg>
                <code class="truncate">{{
                  getFileName(pattern.files[1])
                }}</code>
              </div>
              <span class="badge badge-primary">{{ pattern.count }}x</span>
            </div>
            <div
              v-if="coChangePatterns.length === 0"
              class="empty-list full-width">
              No co-change patterns detected
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRepositoryStore } from "@/stores/repository";
import { useGraphStore } from "@/stores/graph";

const repositoryStore = useRepositoryStore();
const graphStore = useGraphStore();

const isAnalyzing = ref(false);
const analysisProgress = ref({
  stage: "",
  current: 0,
  total: 0,
  message: "Initializing...",
});

const progressPercent = computed(() => {
  if (analysisProgress.value.total === 0) return 0;
  return Math.round(
    (analysisProgress.value.current / analysisProgress.value.total) * 100
  );
});

const hotspotFiles = computed(() => graphStore.getMostModifiedFiles(10));
const hotspotFunctions = computed(() => graphStore.getHotspotFunctions(10));
const coChangePatterns = computed(() =>
  graphStore.getCoChangePatterns().slice(0, 10)
);

async function runAnalysis() {
  if (!repositoryStore.currentRepository) return;

  isAnalyzing.value = true;
  analysisProgress.value = {
    stage: "commits",
    current: 0,
    total: 0,
    message: "Starting analysis...",
  };

  try {
    // Subscribe to progress updates
    window.electronAPI.onAnalysisProgress((progress) => {
      analysisProgress.value = progress;
    });

    // Run the analysis
    const result = await window.electronAPI.analyzeRepository(
      repositoryStore.currentRepository
    );

    if (result.success) {
      graphStore.setGraph(result.graph);
    }
  } catch (e) {
    console.error("Analysis failed:", e);
  } finally {
    isAnalyzing.value = false;
    window.electronAPI.removeAnalysisProgressListener();
  }
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}
</script>

<style scoped>
.analysis-view {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.view-header h1 {
  font-size: 1.5rem;
}

/* Progress */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--text-muted);
}

.empty-state h3 {
  color: var(--text-secondary);
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}

/* Analysis Grid */
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.full-width {
  grid-column: 1 / -1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.card-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

/* List Items */
.list-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-height: 300px;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 0.875rem;
}

.empty-list {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* Co-Change Grid */
.cochange-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.cochange-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.cochange-files {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
  flex: 1;
}

.cochange-files code {
  max-width: 120px;
  font-size: 0.75rem;
}
</style>
