import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Commit, RepositoryInfo, FileChange } from "@/types";
import { useGraphStore } from "./graph";

export const useRepositoryStore = defineStore("repository", () => {
  // State
  const currentRepository = ref<string | null>(null);
  const repositoryInfo = ref<RepositoryInfo | null>(null);
  const commits = ref<Commit[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const analysisProgress = ref({
    stage: "",
    current: 0,
    total: 0,
    message: "",
  });

  // Getters
  const repositoryName = computed(() => {
    if (!currentRepository.value) return "";
    const parts = currentRepository.value.split(/[/\\]/);
    return parts[parts.length - 1];
  });

  const currentBranch = computed(() => {
    return repositoryInfo.value?.currentBranch || "main";
  });

  const totalCommits = computed(() => {
    return commits.value.length;
  });

  const hasRepository = computed(() => !!currentRepository.value);

  // Actions
  async function selectRepository(): Promise<boolean> {
    try {
      isLoading.value = true;
      error.value = null;

      const result = await window.electronAPI.selectRepository();

      if (!result.success) {
        if (result.error) {
          error.value = result.error;
        }
        return false;
      }

      currentRepository.value = result.path;
      await loadRepositoryData();
      return true;
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to select repository";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadRepositoryData(): Promise<void> {
    if (!currentRepository.value) return;

    try {
      isLoading.value = true;

      // Get repository info
      repositoryInfo.value = await window.electronAPI.getRepositoryInfo(
        currentRepository.value
      );

      // Get commits
      commits.value = await window.electronAPI.getCommits(
        currentRepository.value,
        500
      );

      // Auto-trigger analysis to populate graph data
      await runAnalysis();
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to load repository data";
    } finally {
      isLoading.value = false;
    }
  }

  async function runAnalysis(): Promise<void> {
    if (!currentRepository.value) return;

    const graphStore = useGraphStore();

    try {
      // Set up progress listener
      window.electronAPI.onAnalysisProgress((progress) => {
        analysisProgress.value = {
          ...progress,
          message: progress.message.toUpperCase(),
        };
      });

      const result = await window.electronAPI.analyzeRepository(
        currentRepository.value
      );

      if (result.success) {
        graphStore.setGraph(result.graph);
      }
    } catch (e) {
      console.error("Analysis failed:", e);
    } finally {
      window.electronAPI.removeAnalysisProgressListener();
    }
  }

  async function getFileChanges(commitHash: string): Promise<FileChange[]> {
    if (!currentRepository.value) return [];

    try {
      return await window.electronAPI.getFileChanges(
        currentRepository.value,
        commitHash
      );
    } catch (e) {
      console.error("Failed to get file changes:", e);
      return [];
    }
  }

  function setAnalysisProgress(progress: typeof analysisProgress.value) {
    analysisProgress.value = progress;
  }

  function clearRepository() {
    currentRepository.value = null;
    repositoryInfo.value = null;
    commits.value = [];
    error.value = null;
  }

  return {
    // State
    currentRepository,
    repositoryInfo,
    commits,
    isLoading,
    error,
    analysisProgress,

    // Getters
    repositoryName,
    currentBranch,
    totalCommits,
    hasRepository,

    // Actions
    selectRepository,
    loadRepositoryData,
    runAnalysis,
    getFileChanges,
    setAnalysisProgress,
    clearRepository,
  };
});
