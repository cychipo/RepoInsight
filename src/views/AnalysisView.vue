<template>
  <div class="analysis-view">
    <div class="view-header">
      <h1>▤ CODE ANALYSIS</h1>
      <button
        v-if="repositoryStore.hasRepository"
        class="btn btn-primary"
        @click="runAnalysis"
        :disabled="isAnalyzing">
        <span v-if="!isAnalyzing">⚡ RUN ANALYSIS</span>
        <span v-else class="flex items-center gap-2">
          <span class="loader" style="width: 18px; height: 18px"></span>
          ANALYZING...
        </span>
      </button>
    </div>

    <!-- Analysis Progress -->
    <div v-if="isAnalyzing" class="progress-section card card-accent-yellow">
      <div class="progress-header">
        <span class="font-bold">{{ analysisProgress.message }}</span>
        <span class="badge"
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
      <div class="empty-icon">▤</div>
      <h3>NO REPOSITORY SELECTED</h3>
      <p>Select a repository from the home page to view analysis results.</p>
      <router-link to="/" class="btn btn-primary"
        >◆ OPEN REPOSITORY</router-link
      >
    </div>

    <!-- Analysis Results -->
    <template v-else>
      <div class="stats-row">
        <div class="stat-card" style="background: var(--neo-blue)">
          <div class="stat-value">{{ graphStore.stats.commits }}</div>
          <div class="stat-label">COMMITS</div>
        </div>

        <div class="stat-card" style="background: var(--neo-green)">
          <div class="stat-value">{{ graphStore.stats.files }}</div>
          <div class="stat-label">FILES</div>
        </div>

        <div class="stat-card" style="background: var(--neo-orange)">
          <div class="stat-value">{{ graphStore.stats.functions }}</div>
          <div class="stat-label">FUNCTIONS</div>
        </div>

        <div class="stat-card" style="background: var(--neo-pink)">
          <div class="stat-value">{{ graphStore.stats.totalEdges }}</div>
          <div class="stat-label">RELATIONSHIPS</div>
        </div>
      </div>

      <div class="analysis-grid">
        <!-- Hotspot Files -->
        <div class="card card-accent-pink">
          <div class="card-header">
            <h3 class="card-title">★ HOTSPOT FILES</h3>
            <span class="badge badge-pink">MOST MODIFIED</span>
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
                <span class="item-meta">{{
                  (file.metadata as any).language
                }}</span>
              </div>
              <span class="badge badge-danger"
                >{{ (file.metadata as any).modifyCount }}×</span
              >
            </div>
            <div v-if="hotspotFiles.length === 0" class="empty-list">
              NO DATA AVAILABLE
            </div>
          </div>
        </div>

        <!-- Hotspot Functions -->
        <div class="card card-accent-orange">
          <div class="card-header">
            <h3 class="card-title">⚡ HOTSPOT FUNCTIONS</h3>
            <span class="badge badge-warning">FREQUENTLY CHANGED</span>
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
                <span class="item-meta truncate">{{
                  (func.metadata as any).filePath
                }}</span>
              </div>
              <span class="badge badge-warning"
                >{{ (func.metadata as any).modifyCount }}×</span
              >
            </div>
            <div v-if="hotspotFunctions.length === 0" class="empty-list">
              NO DATA AVAILABLE
            </div>
          </div>
        </div>

        <!-- Co-Change Patterns -->
        <div class="card card-accent-blue full-width">
          <div class="card-header">
            <h3 class="card-title">◈ CO-CHANGE PATTERNS</h3>
            <span class="badge badge-primary">FILES CHANGED TOGETHER</span>
          </div>
          <div class="cochange-grid">
            <div
              v-for="(pattern, index) in coChangePatterns"
              :key="index"
              class="cochange-item">
              <code class="truncate">{{ getFileName(pattern.files[0]) }}</code>
              <span class="cochange-arrow">↔</span>
              <code class="truncate">{{ getFileName(pattern.files[1]) }}</code>
              <span class="badge badge-primary">{{ pattern.count }}×</span>
            </div>
            <div
              v-if="coChangePatterns.length === 0"
              class="empty-list full-width">
              NO CO-CHANGE PATTERNS DETECTED
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
  message: "INITIALIZING...",
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
    message: "STARTING ANALYSIS...",
  };

  try {
    window.electronAPI.onAnalysisProgress((progress) => {
      analysisProgress.value = {
        ...progress,
        message: progress.message.toUpperCase(),
      };
    });

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
  flex-wrap: wrap;
  gap: var(--spacing-md);
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
  font-size: 0.9rem;
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
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
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

/* List Items */
.list-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-height: 320px;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-primary);
  border: 3px solid var(--neo-black);
  transition: all var(--transition-fast);
}

.list-item:hover {
  background: var(--neo-yellow);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neo-black);
  color: var(--neo-white);
  font-size: 0.8rem;
  font-weight: 700;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 0.85rem;
  font-weight: 600;
}

.item-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.empty-list {
  padding: var(--spacing-lg);
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* Co-Change Grid */
.cochange-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-sm);
}

.cochange-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-primary);
  border: 3px solid var(--neo-black);
  transition: all var(--transition-fast);
}

.cochange-item:hover {
  background: var(--neo-yellow);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.cochange-item code {
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  background: var(--neo-white);
}

.cochange-arrow {
  font-weight: 700;
  font-size: 1.1rem;
}
</style>
