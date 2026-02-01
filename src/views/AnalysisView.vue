<template>
  <div class="p-6 flex flex-col gap-6">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <h1 class="text-2xl font-bold uppercase">▤ CODE ANALYSIS</h1>
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
    <div v-if="isAnalyzing" class="flex flex-col gap-2 card card-accent-yellow">
      <div class="flex justify-between text-sm font-bold">
        <span>{{ analysisProgress.message }}</span>
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
    <div
      v-if="!repositoryStore.hasRepository"
      class="flex flex-col items-center justify-center gap-4 p-12 text-center card">
      <div class="text-6xl opacity-30">▤</div>
      <h3 class="text-xl font-bold m-0">NO REPOSITORY SELECTED</h3>
      <p>Select a repository from the home page to view analysis results.</p>
      <router-link to="/" class="btn btn-primary"
        >◆ OPEN REPOSITORY</router-link
      >
    </div>

    <!-- Analysis Results -->
    <template v-else>
      <div class="grid grid-cols-4 gap-4">
        <div
          class="flex flex-col items-center justify-center h-[120px] p-4 border-3 border-neo-black shadow-brutal"
          style="background: var(--neo-blue)">
          <div class="text-4xl font-bold mb-1">
            {{ graphStore.stats.commits }}
          </div>
          <div class="text-xs font-bold uppercase tracking-wider">COMMITS</div>
        </div>

        <div
          class="flex flex-col items-center justify-center h-[120px] p-4 border-3 border-neo-black shadow-brutal"
          style="background: var(--neo-green)">
          <div class="text-4xl font-bold mb-1">
            {{ graphStore.stats.files }}
          </div>
          <div class="text-xs font-bold uppercase tracking-wider">FILES</div>
        </div>

        <div
          class="flex flex-col items-center justify-center h-[120px] p-4 border-3 border-neo-black shadow-brutal"
          style="background: var(--neo-orange)">
          <div class="text-4xl font-bold mb-1">
            {{ graphStore.stats.functions }}
          </div>
          <div class="text-xs font-bold uppercase tracking-wider">
            FUNCTIONS
          </div>
        </div>

        <div
          class="flex flex-col items-center justify-center h-[120px] p-4 border-3 border-neo-black shadow-brutal"
          style="background: var(--neo-pink)">
          <div class="text-4xl font-bold mb-1">
            {{ graphStore.stats.totalEdges }}
          </div>
          <div class="text-xs font-bold uppercase tracking-wider">
            RELATIONSHIPS
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <!-- Hotspot Files -->
        <div class="card card-accent-pink">
          <div
            class="flex items-center justify-between mb-4 pb-2 border-b-3 border-neo-black">
            <h3 class="text-lg font-bold m-0">★ HOTSPOT FILES</h3>
            <span class="badge badge-pink">MOST MODIFIED</span>
          </div>
          <div class="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
            <div
              v-for="(file, index) in hotspotFiles"
              :key="file.id"
              class="flex items-center gap-4 p-3 bg-neo-white border-3 border-neo-black transition-all hover:bg-neo-yellow hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal">
              <span
                class="w-7 h-7 flex items-center justify-center bg-neo-black text-neo-white text-xs font-bold"
                >{{ index + 1 }}</span
              >
              <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                <span class="text-sm font-semibold truncate font-mono">{{
                  file.label
                }}</span>
                <span class="text-xs font-medium text-stone-500">{{
                  (file.metadata as any).language
                }}</span>
              </div>
              <span class="badge badge-danger"
                >{{ (file.metadata as any).modifyCount }}×</span
              >
            </div>
            <div
              v-if="hotspotFiles.length === 0"
              class="p-6 text-center text-sm font-semibold text-stone-500">
              NO DATA AVAILABLE
            </div>
          </div>
        </div>

        <!-- Hotspot Functions -->
        <div class="card card-accent-orange">
          <div
            class="flex items-center justify-between mb-4 pb-2 border-b-3 border-neo-black">
            <h3 class="text-lg font-bold m-0">⚡ HOTSPOT FUNCTIONS</h3>
            <span class="badge badge-warning">FREQUENTLY CHANGED</span>
          </div>
          <div class="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
            <div
              v-for="(func, index) in hotspotFunctions"
              :key="func.id"
              class="flex items-center gap-4 p-3 bg-neo-white border-3 border-neo-black transition-all hover:bg-neo-yellow hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal">
              <span
                class="w-7 h-7 flex items-center justify-center bg-neo-black text-neo-white text-xs font-bold"
                >{{ index + 1 }}</span
              >
              <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                <span class="text-sm font-semibold truncate font-mono">{{
                  (func.metadata as any).name
                }}</span>
                <span class="text-xs font-medium text-stone-500 truncate">{{
                  (func.metadata as any).filePath
                }}</span>
              </div>
              <span class="badge badge-warning"
                >{{ (func.metadata as any).modifyCount }}×</span
              >
            </div>
            <div
              v-if="hotspotFunctions.length === 0"
              class="p-6 text-center text-sm font-semibold text-stone-500">
              NO DATA AVAILABLE
            </div>
          </div>
        </div>

        <!-- Co-Change Patterns -->
        <div class="card card-accent-blue col-span-full">
          <div
            class="flex items-center justify-between mb-4 pb-2 border-b-3 border-neo-black">
            <h3 class="text-lg font-bold m-0">◈ CO-CHANGE PATTERNS</h3>
            <span class="badge badge-primary">FILES CHANGED TOGETHER</span>
          </div>
          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2">
            <div
              v-for="(pattern, index) in coChangePatterns"
              :key="index"
              class="flex items-center gap-2 p-2 bg-neo-white border-3 border-neo-black transition-all hover:bg-neo-yellow hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal">
              <code class="flex-1 min-w-0 text-xs bg-neo-white truncate">{{
                getFileName(pattern.files[0])
              }}</code>
              <span class="font-bold text-lg">↔</span>
              <code class="flex-1 min-w-0 text-xs bg-neo-white truncate">{{
                getFileName(pattern.files[1])
              }}</code>
              <span class="badge badge-primary">{{ pattern.count }}×</span>
            </div>
            <div
              v-if="coChangePatterns.length === 0"
              class="p-6 text-center text-sm font-semibold text-stone-500 col-span-full">
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
