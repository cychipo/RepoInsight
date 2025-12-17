import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  Commit,
  RepositoryInfo,
  FileChange,
  Branch,
  GitStatusEntry,
  EvolutionData,
} from "@/types";
import { useGraphStore } from "./graph";

const COMMITS_PER_PAGE = 10;

interface RecentRepository {
  path: string;
  name: string;
  lastOpened: number;
}

export const useRepositoryStore = defineStore("repository", () => {
  // State
  const currentRepository = ref<string | null>(null);
  const recentRepositories = ref<RecentRepository[]>([]);
  const repositoryInfo = ref<RepositoryInfo | null>(null);
  const commits = ref<Commit[]>([]);
  const branches = ref<Branch[]>([]);
  const selectedBranch = ref<string>("");
  const gitStatus = ref<GitStatusEntry[]>([]);
  const isLoading = ref(false);
  const hasMoreCommits = ref(true);
  const error = ref<string | null>(null);
  const evolutionData = ref<EvolutionData | null>(null);
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

  // Load recent repositories from localStorage on init
  function loadRecentRepositories() {
    const stored = localStorage.getItem("recentRepositories");
    if (stored) {
      try {
        recentRepositories.value = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse recent repositories:", e);
        recentRepositories.value = [];
      }
    }
  }

  function saveRecentRepositories() {
    localStorage.setItem(
      "recentRepositories",
      JSON.stringify(recentRepositories.value)
    );
  }

  function addToHistory(path: string) {
    const parts = path.split(/[/\\]/);
    const name = parts[parts.length - 1];

    // Remove if exists
    const existingIndex = recentRepositories.value.findIndex(
      (r) => r.path === path
    );
    if (existingIndex > -1) {
      recentRepositories.value.splice(existingIndex, 1);
    }

    // Add to top
    recentRepositories.value.unshift({
      path,
      name,
      lastOpened: Date.now(),
    });

    // Limit to 10
    if (recentRepositories.value.length > 10) {
      recentRepositories.value = recentRepositories.value.slice(0, 10);
    }

    saveRecentRepositories();
  }

  function removeRecentRepository(path: string) {
    const index = recentRepositories.value.findIndex((r) => r.path === path);
    if (index > -1) {
      recentRepositories.value.splice(index, 1);
      saveRecentRepositories();
    }
  }

  // Initialize
  loadRecentRepositories();

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

      if (result.path) {
        currentRepository.value = result.path;
        addToHistory(result.path);
      }
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

      // Load initial commits (10 at a time for timeline)
      commits.value = [];
      const newCommits = await window.electronAPI.getCommits(
        currentRepository.value,
        COMMITS_PER_PAGE,
        0
      );
      commits.value = newCommits;
      hasMoreCommits.value = newCommits.length === COMMITS_PER_PAGE;

      // Load branches
      await loadBranches();

      // Load git status
      await loadGitStatus();

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
    const repoPath = currentRepository.value;
    if (!repoPath) return;

    const graphStore = useGraphStore();

    try {
      // Set up progress listener
      window.electronAPI.onAnalysisProgress((progress) => {
        analysisProgress.value = {
          ...progress,
          message: progress.message.toUpperCase(),
        };
      });

      const result = await window.electronAPI.analyzeRepository(repoPath);

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

  async function setRepository(path: string): Promise<boolean> {
    try {
      isLoading.value = true;
      error.value = null;
      currentRepository.value = path;
      addToHistory(path);
      await loadRepositoryData();
      return true;
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to load repository";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadBranches(): Promise<void> {
    if (!currentRepository.value) return;
    try {
      branches.value = await window.electronAPI.getBranches(
        currentRepository.value
      );
      // Set selected branch to current branch if not set
      if (!selectedBranch.value) {
        const current = branches.value.find((b) => b.isCurrent);
        selectedBranch.value = current?.name || "main";
      }
    } catch (e) {
      console.error("Failed to load branches:", e);
    }
  }

  async function loadGitStatus(): Promise<void> {
    if (!currentRepository.value) return;
    try {
      gitStatus.value = await window.electronAPI.getStatus(
        currentRepository.value
      );
    } catch (e) {
      console.error("Failed to load git status:", e);
    }
  }

  async function loadCommitsForBranch(branchName: string): Promise<void> {
    if (!currentRepository.value) return;
    try {
      isLoading.value = true;
      selectedBranch.value = branchName;
      const newCommits = await window.electronAPI.getCommits(
        currentRepository.value,
        COMMITS_PER_PAGE,
        0,
        branchName
      );
      commits.value = newCommits;
      hasMoreCommits.value = newCommits.length === COMMITS_PER_PAGE;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load commits";
    } finally {
      isLoading.value = false;
    }
  }

  async function loadMoreCommits(): Promise<void> {
    if (!currentRepository.value || !hasMoreCommits.value || isLoading.value)
      return;
    try {
      isLoading.value = true;
      const offset = commits.value.length;
      const branch = selectedBranch.value || undefined;
      const newCommits = await window.electronAPI.getCommits(
        currentRepository.value,
        COMMITS_PER_PAGE,
        offset,
        branch
      );
      commits.value = [...commits.value, ...newCommits];
      hasMoreCommits.value = newCommits.length === COMMITS_PER_PAGE;
    } catch (e) {
      console.error("Failed to load more commits:", e);
    } finally {
      isLoading.value = false;
    }
  }

  function clearRepository() {
    currentRepository.value = null;
    repositoryInfo.value = null;
    commits.value = [];
    branches.value = [];
    selectedBranch.value = "";
    gitStatus.value = [];
    evolutionData.value = null;
    hasMoreCommits.value = true;
    error.value = null;
  }

  async function loadEvolutionData(months: number = 12): Promise<void> {
    if (!currentRepository.value) return;
    try {
      evolutionData.value = await window.electronAPI.getEvolutionData(
        currentRepository.value,
        months
      );
    } catch (e) {
      console.error("Failed to load evolution data:", e);
      evolutionData.value = null;
    }
  }

  return {
    // State
    currentRepository,
    repositoryInfo,
    commits,
    recentRepositories,
    branches,
    selectedBranch,
    gitStatus,
    isLoading,
    hasMoreCommits,
    error,
    evolutionData,
    analysisProgress,

    // Getters
    repositoryName,
    currentBranch,
    totalCommits,
    hasRepository,

    // Actions
    selectRepository,
    setRepository,
    loadRepositoryData,
    loadBranches,
    loadGitStatus,
    loadCommitsForBranch,
    loadMoreCommits,
    runAnalysis,
    getFileChanges,
    setAnalysisProgress,
    clearRepository,
    removeRecentRepository,
    loadEvolutionData,
  };
});
