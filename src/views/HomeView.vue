<template>
  <div class="home-view p-4">
    <!-- Hero Section - Neo-Brutalism Style -->
    <section class="grid grid-cols-2 gap-12 items-center min-h-[400px] mb-12">
      <div class="max-w-[550px] animate-fadeIn">
        <div
          class="inline-block px-3 py-1 mb-2 text-xs font-bold bg-neo-black text-neo-white tracking-widest">
          GIT ANALYSIS TOOL
        </div>
        <h1 class="text-5xl leading-none mb-4">
          EXPLORE YOUR
          <span
            class="block bg-neo-yellow px-4 py-2 border-4 border-neo-black shadow-brutal mt-2 w-fit"
            >CODEBASE</span
          >
        </h1>
        <p class="text-lg mb-8 leading-relaxed">
          Analyze Git repositories and visualize code relationships as beautiful
          knowledge graphs. Discover hotspots, understand dependencies, and gain
          deep insights.
        </p>

        <div class="flex gap-4">
          <button
            class="btn btn-primary btn-lg"
            @click="handleSelectRepository"
            :disabled="repositoryStore.isLoading">
            <span v-if="!repositoryStore.isLoading">◆ OPEN REPOSITORY</span>
            <span v-else class="flex items-center gap-2">
              <span class="loader" style="width: 20px; height: 20px"></span>
              LOADING...
            </span>
          </button>
          <button
            class="btn btn-secondary btn-lg"
            @click="showCloneModal = true"
            :disabled="isCloning">
            ↓ CLONE FROM URL
          </button>
        </div>

        <p
          v-if="repositoryStore.error"
          class="mt-4 px-4 py-2 bg-neo-red text-neo-white font-bold border-3 border-neo-black">
          ⚠ {{ repositoryStore.error }}
        </p>
      </div>

      <!-- Decorative Elements -->
      <div class="relative h-[350px]">
        <div
          class="absolute w-[180px] h-[180px] bg-neo-yellow border-4 border-neo-black shadow-brutal-lg top-5 left-[20%] animate-bounce [animation-duration:3s]"></div>
        <div
          class="absolute w-[120px] h-[120px] bg-neo-pink border-4 border-neo-black shadow-brutal-lg top-[100px] right-[15%] animate-bounce [animation-duration:3s] [animation-delay:0.5s]"></div>
        <div
          class="absolute w-[80px] h-[80px] bg-neo-blue border-4 border-neo-black shadow-brutal-lg bottom-10 left-[30%] animate-bounce [animation-duration:3s] [animation-delay:1s]"></div>
        <div
          class="absolute w-[100px] h-[100px] bg-neo-green border-4 border-neo-black shadow-brutal-lg rounded-full bottom-20 right-[25%] animate-bounce [animation-duration:3s] [animation-delay:1.5s]"></div>
      </div>
    </section>

    <!-- Repository Info (if loaded) -->
    <section
      v-if="repositoryStore.currentRepository"
      class="flex flex-col gap-8 animate-fadeIn">
      <div class="flex items-center justify-between">
        <h2>▤ CURRENT REPOSITORY</h2>
        <button class="btn btn-ghost" @click="repositoryStore.clearRepository">
          ✕ CLOSE
        </button>
      </div>

      <div class="flex flex-col gap-6 card card-accent-yellow">
        <div class="flex items-center gap-4">
          <div
            class="text-3xl w-[60px] h-[60px] flex items-center justify-center bg-neo-yellow border-3 border-neo-black shadow-brutal">
            ◈
          </div>
          <div>
            <h3>{{ repositoryStore.repositoryName }}</h3>
            <code
              class="text-xs bg-neo-black text-neo-yellow px-2 py-1 border-none"
              >{{ repositoryStore.currentRepository }}</code
            >
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div
            class="flex flex-col gap-1 p-4 bg-neo-blue border-3 border-neo-black shadow-brutal">
            <div class="text-4xl font-bold leading-none">
              {{ repositoryStore.totalCommits }}
            </div>
            <div
              class="text-xs font-bold uppercase tracking-widest text-neo-white">
              COMMITS
            </div>
          </div>
          <div
            class="flex flex-col gap-1 p-4 bg-neo-green border-3 border-neo-black shadow-brutal">
            <div class="text-4xl font-bold leading-none">
              {{ repositoryStore.repositoryInfo?.totalContributors || "-" }}
            </div>
            <div
              class="text-xs font-bold uppercase tracking-widest text-neo-black">
              CONTRIBUTORS
            </div>
          </div>
          <div
            class="flex flex-col gap-1 p-4 bg-neo-pink border-3 border-neo-black shadow-brutal">
            <div class="text-4xl font-bold leading-none truncate">
              {{ repositoryStore.currentBranch }}
            </div>
            <div
              class="text-xs font-bold uppercase tracking-widest text-neo-white">
              BRANCH
            </div>
          </div>
        </div>

        <div class="flex gap-4 flex-wrap">
          <router-link to="/graph" class="btn btn-primary">
            ◈ VIEW GRAPH
          </router-link>
          <router-link to="/analysis" class="btn btn-secondary">
            ▤ ANALYSIS
          </router-link>
          <router-link to="/timeline" class="btn btn-secondary">
            ◷ TIMELINE
          </router-link>
        </div>
      </div>

      <!-- Recent Commits Preview -->
      <div class="card card-accent-blue">
        <div class="card-header">
          <h3 class="card-title">◷ RECENT COMMITS</h3>
          <router-link to="/timeline" class="btn btn-ghost">
            VIEW ALL →
          </router-link>
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="(commit, index) in recentCommits"
            :key="commit.hash"
            class="flex items-center gap-4 p-2 bg-neo-white border-3 border-neo-black transition-all hover:bg-neo-yellow hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal"
            :class="['stagger-' + (index + 1)]">
            <div
              class="font-mono text-xs font-bold bg-neo-blue px-2 py-1 border-2 border-neo-black">
              {{ commit.shortHash }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate">
                {{ commit.message }}
              </div>
              <div class="flex gap-2 text-xs font-medium text-stone-500">
                <span>{{ commit.author }}</span>
                <span>•</span>
                <span>{{ formatDate(commit.date) }}</span>
              </div>
            </div>
            <div class="flex gap-2 text-xs font-mono font-bold">
              <span class="text-green-700">+{{ commit.insertions }}</span>
              <span class="text-red-600">-{{ commit.deletions }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Uncommitted Changes -->
      <div
        v-if="repositoryStore.gitStatus.length > 0"
        class="mt-4 card card-accent-orange">
        <div class="card-header">
          <h3 class="card-title">⚠ UNCOMMITTED CHANGES</h3>
          <span
            class="text-xs font-bold bg-neo-orange px-2 py-1 border-2 border-neo-black"
            >{{ repositoryStore.gitStatus.length }} FILES</span
          >
        </div>

        <div class="flex flex-col gap-1">
          <div
            v-for="file in repositoryStore.gitStatus.slice(0, 10)"
            :key="file.path + file.staged"
            class="flex items-center gap-2 px-2 py-1 bg-bg-primary border-2 border-transparent"
            :class="{ 'border-neo-green bg-green-50': file.staged }">
            <span
              class="w-5 h-5 flex items-center justify-center text-[0.7rem] font-bold border-2 border-neo-black"
              :class="{
                'bg-neo-orange': file.status === 'modified',
                'bg-neo-green': file.status === 'added',
                'bg-neo-red text-white': file.status === 'deleted',
                'bg-neo-blue': file.status === 'untracked',
                'bg-neo-purple': file.status === 'renamed',
              }"
              >{{ file.status.toUpperCase().slice(0, 1) }}</span
            >
            <span class="flex-1 min-w-0 text-sm font-mono truncate">{{
              file.path
            }}</span>
            <span
              class="text-[0.65rem] font-bold bg-neo-green px-1.5 py-0.5 border-2 border-neo-black"
              v-if="file.staged"
              >STAGED</span
            >
          </div>
          <div
            v-if="repositoryStore.gitStatus.length > 10"
            class="text-sm text-stone-500 p-1">
            +{{ repositoryStore.gitStatus.length - 10 }} more files...
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section (when no repo) -->
    <section v-else class="mt-8">
      <h2 class="text-center mb-8">▤ WHAT YOU CAN DO</h2>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        <div class="flex flex-col gap-4 card card-accent-blue">
          <div
            class="w-14 h-14 flex items-center justify-center text-2xl border-3 border-neo-black shadow-brutal bg-neo-blue">
            ◈
          </div>
          <h3 class="text-base m-0">KNOWLEDGE GRAPH</h3>
          <p class="text-[0.9rem] m-0">
            Visualize relationships between commits, files, and functions as an
            interactive graph.
          </p>
        </div>

        <div class="flex flex-col gap-4 card card-accent-green">
          <div
            class="w-14 h-14 flex items-center justify-center text-2xl border-3 border-neo-black shadow-brutal bg-neo-green">
            ⚡
          </div>
          <h3 class="text-base m-0">CODE ANALYSIS</h3>
          <p class="text-[0.9rem] m-0">
            Static analysis to extract functions, classes, and understand call
            relationships.
          </p>
        </div>

        <div class="flex flex-col gap-4 card card-accent-orange">
          <div
            class="w-14 h-14 flex items-center justify-center text-2xl border-3 border-neo-black shadow-brutal bg-neo-orange">
            ★
          </div>
          <h3 class="text-base m-0">HOTSPOT DETECTION</h3>
          <p class="text-[0.9rem] m-0">
            Identify frequently modified files and functions that may need
            attention.
          </p>
        </div>

        <div class="flex flex-col gap-4 card card-accent-pink">
          <div
            class="w-14 h-14 flex items-center justify-center text-2xl border-3 border-neo-black shadow-brutal bg-neo-pink">
            ◷
          </div>
          <h3 class="text-base m-0">TIMELINE VIEW</h3>
          <p class="text-[0.9rem] m-0">
            Explore how your codebase evolved over time with commit timeline
            visualization.
          </p>
        </div>
      </div>
    </section>

    <!-- Clone Modal -->
    <div
      v-if="showCloneModal"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
      @click.self="closeCloneModal">
      <div class="w-full max-w-[500px] max-h-[90vh] overflow-y-auto card">
        <div
          class="flex items-center justify-between pb-4 mb-6 border-b-3 border-neo-black">
          <h2 class="m-0 text-xl">↓ CLONE FROM URL</h2>
          <button class="btn btn-icon btn-ghost" @click="closeCloneModal">
            ✕
          </button>
        </div>

        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold tracking-wider"
              >GIT REPOSITORY URL</label
            >
            <input
              type="text"
              v-model="cloneUrl"
              placeholder="https://github.com/user/repo.git"
              class="input text-base"
              :disabled="isCloning" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold tracking-wider"
              >DESTINATION FOLDER</label
            >
            <div class="flex gap-0">
              <input
                type="text"
                v-model="cloneDestPath"
                placeholder="Select destination folder..."
                class="input flex-1 border-r-0 text-base"
                readonly
                :disabled="isCloning" />
              <button
                class="btn btn-secondary border-l-3 border-neo-black"
                @click="selectCloneDestination"
                :disabled="isCloning">
                BROWSE
              </button>
            </div>
          </div>

          <!-- Progress -->
          <div
            v-if="isCloning"
            class="p-4 bg-neo-blue border-3 border-neo-black">
            <div class="flex justify-between mb-2 font-bold text-sm">
              <span class="uppercase">{{
                cloneProgress.stage.toUpperCase()
              }}</span>
              <span class="font-mono">{{ cloneProgress.percent }}%</span>
            </div>
            <div
              class="h-3 bg-neo-white border-2 border-neo-black overflow-hidden">
              <div
                class="h-full bg-neo-green transition-all duration-300 ease-out"
                :style="{ width: cloneProgress.percent + '%' }"></div>
            </div>
            <p class="mt-2 text-xs font-mono break-all">
              {{ cloneProgress.message }}
            </p>
          </div>

          <!-- Error -->
          <p
            v-if="cloneError"
            class="px-4 py-2 bg-neo-red text-neo-white font-bold border-3 border-neo-black">
            ⚠ {{ cloneError }}
          </p>
        </div>

        <div
          class="flex justify-end gap-4 mt-8 pt-6 border-t-3 border-neo-black">
          <button
            class="btn btn-ghost"
            @click="closeCloneModal"
            :disabled="isCloning">
            CANCEL
          </button>
          <button
            class="btn btn-primary"
            @click="handleClone"
            :disabled="!cloneUrl || !cloneDestPath || isCloning">
            <span v-if="isCloning">CLONING...</span>
            <span v-else>↓ START CLONE</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRepositoryStore } from "@/stores/repository";
import type { CloneProgress } from "@/types";

const repositoryStore = useRepositoryStore();

// Clone state
const showCloneModal = ref(false);
const cloneUrl = ref("");
const cloneDestPath = ref("");
const isCloning = ref(false);
const cloneError = ref("");
const cloneProgress = ref<CloneProgress>({
  stage: "cloning",
  percent: 0,
  message: "",
});

const recentCommits = computed(() => {
  return repositoryStore.commits.slice(0, 5);
});

// Load git status when component mounts or repository changes
onMounted(async () => {
  if (repositoryStore.hasRepository) {
    await repositoryStore.loadGitStatus();
  }
});

watch(
  () => repositoryStore.currentRepository,
  async () => {
    if (repositoryStore.hasRepository) {
      await repositoryStore.loadGitStatus();
    }
  }
);

async function handleSelectRepository() {
  await repositoryStore.selectRepository();
}

function closeCloneModal() {
  if (isCloning.value) return;
  showCloneModal.value = false;
  cloneUrl.value = "";
  cloneDestPath.value = "";
  cloneError.value = "";
  cloneProgress.value = { stage: "cloning", percent: 0, message: "" };
}

async function selectCloneDestination() {
  const result = await window.electronAPI.selectDirectory();
  if (result.success && result.path) {
    cloneDestPath.value = result.path;
  }
}

async function handleClone() {
  if (!cloneUrl.value || !cloneDestPath.value) return;

  isCloning.value = true;
  cloneError.value = "";
  cloneProgress.value = {
    stage: "cloning",
    percent: 0,
    message: "Starting clone...",
  };

  // Set up progress listener
  window.electronAPI.onCloneProgress((progress: CloneProgress) => {
    cloneProgress.value = progress;
  });

  try {
    const result = await window.electronAPI.cloneRepository(
      cloneUrl.value,
      cloneDestPath.value
    );

    if (result.success) {
      // Clone successful - close modal first, then load repository
      isCloning.value = false;
      window.electronAPI.removeCloneProgressListener();
      showCloneModal.value = false;
      cloneUrl.value = "";
      cloneDestPath.value = "";
      cloneError.value = "";
      cloneProgress.value = { stage: "cloning", percent: 0, message: "" };

      await repositoryStore.setRepository(result.path);
      return;
    } else {
      cloneError.value = result.error || "Clone failed";
    }
  } catch (e) {
    cloneError.value = e instanceof Error ? e.message : "Clone failed";
  } finally {
    isCloning.value = false;
    window.electronAPI.removeCloneProgressListener();
  }
}

onUnmounted(() => {
  window.electronAPI.removeCloneProgressListener();
});

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString();
}
</script>
```
