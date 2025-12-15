<template>
  <div class="flex h-full p-6 gap-6">
    <div
      class="fixed top-6 left-[268px] right-6 flex items-center justify-between z-10 bg-neo-cream py-2">
      <h1 class="text-2xl">◷ DÒNG THỜI GIAN COMMIT</h1>

      <!-- Branch Selector -->
      <div class="flex items-center gap-2">
        <label class="text-xs font-bold">NHÁNH:</label>
        <select
          v-model="selectedBranch"
          @change="onBranchChange"
          class="px-4 py-2 font-sans text-xs font-bold border-3 border-neo-black bg-neo-white cursor-pointer min-w-[150px] disabled:opacity-60 disabled:cursor-not-allowed outline-none focus:bg-neo-yellow focus:shadow-brutal"
          :disabled="repositoryStore.isLoading">
          <option
            v-for="branch in repositoryStore.branches"
            :key="branch.name"
            :value="branch.name">
            {{ branch.name }}{{ branch.isCurrent ? " ✓" : "" }}
          </option>
        </select>
      </div>

      <div
        class="flex items-center bg-neo-white border-3 border-neo-black shadow-brutal">
        <span class="pl-4 pr-2 text-xl">⌕</span>
        <input
          v-model="searchQuery"
          type="text"
          class="border-none shadow-none w-[220px] text-sm focus:bg-neo-yellow focus:shadow-none bg-transparent outline-none p-2"
          placeholder="TÌM KIẾM COMMIT..." />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!repositoryStore.hasRepository"
      class="flex-1 flex flex-col items-center justify-center gap-6 text-center mt-[60px] card">
      <div class="text-6xl opacity-30">◷</div>
      <h3 class="text-2xl font-bold">CHƯA CHỌN KHO CHỨA</h3>
      <p class="font-medium text-stone-600">
        Chọn một kho chứa từ trang chủ để xem dòng thời gian commit.
      </p>
      <router-link to="/" class="btn btn-primary"
        >◆ MỞ KHO CHỨA</router-link
      >
    </div>

    <!-- Timeline Content -->
    <div v-else class="flex-1 flex flex-col mt-[60px] overflow-hidden">
      <!-- Stats Bar -->
      <div
        class="flex items-center gap-6 px-6 py-4 bg-neo-yellow border-3 border-neo-black shadow-brutal mb-6">
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold">{{ filteredCommits.length }}</span>
          <span class="text-xs font-bold uppercase">COMMITS</span>
        </div>
        <div class="w-[3px] h-[30px] bg-neo-black"></div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold">{{ uniqueAuthors.length }}</span>
          <span class="text-xs font-bold uppercase">TÁC GIẢ</span>
        </div>
        <div class="w-[3px] h-[30px] bg-neo-black"></div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold">{{ dateRange }}</span>
          <span class="text-xs font-bold uppercase">KHOẢNG THỜI GIAN</span>
        </div>
      </div>

      <!-- Timeline -->
      <div class="flex-1 overflow-y-auto pr-4">
        <div>
          <div v-for="(group, date) in groupedCommits" :key="date" class="mb-8">
            <div class="flex items-center gap-4 mb-4">
              <span class="font-bold text-sm">{{ formatGroupDate(date) }}</span>
              <span class="badge badge-yellow">{{ group.length }} COMMITS</span>
            </div>

            <div class="flex flex-col gap-2 pl-6 border-l-4 border-neo-black">
              <div
                v-for="commit in group"
                :key="commit.hash"
                class="flex gap-4 p-4 -ml-6 bg-neo-white border-3 border-neo-black cursor-pointer transition-all hover:bg-neo-yellow hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
                @click="selectedCommit = commit"
                :class="{
                  '!bg-neo-pink shadow-brutal':
                    selectedCommit?.hash === commit.hash,
                }">
                <div
                  class="w-4 h-4 mt-1 bg-neo-blue border-3 border-neo-black flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <code
                      class="text-xs bg-neo-blue px-2 py-0.5 border-2 border-neo-black text-[0.75rem]"
                      >{{ commit.shortHash }}</code
                    >
                    <span class="text-xs font-semibold text-stone-500">{{
                      formatTime(commit.date)
                    }}</span>
                  </div>
                  <p class="text-sm font-semibold mb-2 leading-tight">
                    {{ commit.message }}
                  </p>
                  <div class="flex items-center justify-between gap-4">
                    <span class="flex items-center gap-1 text-xs font-semibold">
                      <span class="text-neo-green">●</span>
                      {{ commit.author }}
                    </span>
                    <div class="flex gap-2 text-xs font-mono font-bold">
                      <span class="text-green-700"
                        >+{{ commit.insertions }}</span
                      >
                      <span class="text-red-600">-{{ commit.deletions }}</span>
                      <span class="text-stone-500"
                        >{{ commit.filesChanged }} tệp</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="filteredCommits.length === 0"
            class="p-8 text-center font-bold">
            <p>KHÔNG TÌM THẤY COMMIT NÀO PHÙ HỢP "{{ searchQuery }}"</p>
          </div>
        </div>

        <!-- Load More Button -->
        <div
          v-if="repositoryStore.hasMoreCommits && !searchQuery"
          class="flex justify-center p-8">
          <button
            class="btn btn-secondary btn-lg"
            @click="handleLoadMore"
            :disabled="repositoryStore.isLoading">
            <span v-if="repositoryStore.isLoading">ĐANG TẢI...</span>
            <span v-else>↓ TẢI THÊM COMMIT</span>
          </button>
        </div>

        <div
          v-if="!repositoryStore.hasMoreCommits"
          class="text-center p-6 text-stone-500 text-xs font-bold">
          <span>— HẾT COMMIT —</span>
        </div>
      </div>
    </div>

    <!-- Commit Details Sidebar -->
    <aside
      v-if="selectedCommit"
      class="w-[360px] flex flex-col mt-[60px] overflow-hidden card">
      <div
        class="flex items-center justify-between pb-4 border-b-3 border-neo-black mb-4">
        <h3 class="m-0 text-xl">CHI TIẾT COMMIT</h3>
        <button class="btn btn-icon btn-ghost" @click="selectedCommit = null">
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto flex flex-col gap-6">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold tracking-wider text-stone-500"
            >HASH</label
          >
          <code
            class="break-all text-xs bg-neo-yellow px-1 border-2 border-neo-black"
            >{{ selectedCommit.hash }}</code
          >
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold tracking-wider text-stone-500"
            >TÁC GIẢ</label
          >
          <span class="font-bold">{{ selectedCommit.author }}</span>
          <span class="text-stone-500 text-sm">{{
            selectedCommit.authorEmail
          }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold tracking-wider text-stone-500"
            >NGÀY</label
          >
          <span class="text-sm font-medium">{{
            formatFullDate(selectedCommit.date)
          }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold tracking-wider text-stone-500"
            >NỘI DUNG</label
          >
          <p class="font-medium leading-normal text-sm">
            {{ selectedCommit.message }}
          </p>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold tracking-wider text-stone-500"
            >THAY ĐỔI</label
          >
          <div class="flex gap-2 flex-wrap">
            <span class="badge badge-success"
              >+{{ selectedCommit.insertions }}</span
            >
            <span class="badge badge-danger"
              >-{{ selectedCommit.deletions }}</span
            >
            <span class="badge">{{ selectedCommit.filesChanged }} TỆP</span>
          </div>
        </div>

        <div class="flex flex-col gap-1 flex-1 min-h-0">
          <label class="text-xs font-bold tracking-wider text-stone-500"
            >TỆP ĐÃ THAY ĐỔI</label
          >
          <div
            class="flex flex-col gap-1 overflow-y-auto max-h-[200px] border-2 border-neo-black p-1 bg-neo-cream/50">
            <div
              v-for="file in commitFiles"
              :key="file.path"
              class="flex items-center gap-2 p-1 bg-neo-white border-2 border-neo-black">
              <span
                class="w-[22px] h-[22px] flex items-center justify-center text-xs font-bold border-2 border-neo-black"
                :class="{
                  'bg-neo-green': file.status === 'added',
                  'bg-neo-orange': file.status === 'modified',
                  'bg-neo-red text-white': file.status === 'deleted',
                  'bg-neo-purple': file.status === 'renamed',
                }">
                {{ getStatusIcon(file.status) }}
              </span>
              <span class="flex-1 min-w-0 font-mono text-xs truncate">{{
                file.path
              }}</span>
            </div>
            <div v-if="loadingFiles" class="flex items-center gap-2 p-2">
              <span class="loader" style="width: 16px; height: 16px"></span>
              <span class="text-sm font-bold">ĐANG TẢI TỆP...</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRepositoryStore } from "@/stores/repository";
import type { Commit, FileChange } from "@/types";

const repositoryStore = useRepositoryStore();
const searchQuery = ref("");
const selectedCommit = ref<Commit | null>(null);
const commitFiles = ref<FileChange[]>([]);
const loadingFiles = ref(false);
const selectedBranch = ref("");

// Load branches when component mounts
onMounted(async () => {
  if (repositoryStore.hasRepository) {
    await repositoryStore.loadBranches();
    selectedBranch.value =
      repositoryStore.selectedBranch || repositoryStore.currentBranch;
  }
});

// Handle branch change
async function onBranchChange() {
  if (selectedBranch.value) {
    await repositoryStore.loadCommitsForBranch(selectedBranch.value);
  }
}

// Handle load more
async function handleLoadMore() {
  await repositoryStore.loadMoreCommits();
}

const filteredCommits = computed(() => {
  if (!searchQuery.value) return repositoryStore.commits;

  const query = searchQuery.value.toLowerCase();
  return repositoryStore.commits.filter(
    (commit) =>
      commit.message.toLowerCase().includes(query) ||
      commit.author.toLowerCase().includes(query) ||
      commit.hash.toLowerCase().includes(query)
  );
});

const groupedCommits = computed(() => {
  const groups: Record<string, Commit[]> = {};

  filteredCommits.value.forEach((commit) => {
    const date = new Date(commit.date).toISOString().split("T")[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(commit);
  });

  return groups;
});

const uniqueAuthors = computed(() => {
  const authors = new Set(repositoryStore.commits.map((c) => c.author));
  return Array.from(authors);
});

const dateRange = computed(() => {
  if (repositoryStore.commits.length === 0) return "-";

  const first = new Date(
    repositoryStore.commits[repositoryStore.commits.length - 1].date
  );
  const last = new Date(repositoryStore.commits[0].date);
  const diffDays = Math.ceil(
    (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 30) return `${diffDays} NGÀY`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)} THÁNG`;
  return `${Math.round(diffDays / 365)} NĂM`;
});

watch(selectedCommit, async (commit) => {
  if (!commit) {
    commitFiles.value = [];
    return;
  }

  loadingFiles.value = true;
  try {
    commitFiles.value = await repositoryStore.getFileChanges(commit.hash);
  } catch (e) {
    console.error("Failed to load file changes:", e);
    commitFiles.value = [];
  } finally {
    loadingFiles.value = false;
  }
});

function formatGroupDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "HÔM NAY";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "HÔM QUA";
  }

  return date
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

function getStatusIcon(status: string): string {
  switch (status) {
    case "added":
      return "A";
    case "modified":
      return "M";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    default:
      return "?";
  }
}
</script>
