<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold uppercase tracking-tight">
        ⚡ THAY ĐỔI CHƯA COMMIT
      </h1>
      <div class="flex items-center gap-2">
      <button
        class="btn btn-primary"
        @click="handleRebase"
        :disabled="isLoading || isRebasing">
        {{ isRebasing ? "ĐANG REBASE..." : "⬇ REBASE CODE" }}
      </button>
      <button
        class="btn btn-secondary"
        @click="refreshStatus"
        :disabled="isLoading || isRebasing">
        ↻ LÀM MỚI
      </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!repositoryStore.hasRepository"
      class="flex flex-col items-center justify-center p-12 text-center gap-4 card">
      <div class="text-5xl mb-2">⚡</div>
      <h3 class="text-xl font-bold">CHƯA CHỌN KHO CHỨA</h3>
      <p class="font-medium text-stone-600">
        Chọn một kho chứa từ trang chủ để xem thay đổi.
      </p>
      <router-link to="/" class="btn btn-primary"
        >◆ MỞ KHO CHỨA</router-link
      >
    </div>

    <!-- No Changes -->
    <div
      v-else-if="repositoryStore.gitStatus.length === 0"
      class="flex flex-col items-center justify-center p-12 text-center gap-4 card">
      <div class="text-5xl mb-2">✓</div>
      <h3 class="text-xl font-bold">KHÔNG CÓ THAY ĐỔI CHƯA COMMIT</h3>
      <p class="font-medium text-stone-600">
        Thư mục làm việc sạch sẽ. Tất cả thay đổi đã được commit.
      </p>
    </div>

    <!-- Changes List -->
    <div v-else class="flex flex-col gap-8">
      <!-- Staged Changes -->
      <section v-if="stagedChanges.length > 0" class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-bold">✓ THAY ĐỔI ĐÃ STAGE</h2>
          <span class="badge badge-green"
            >{{ stagedChanges.length }} TỆP</span
          >
        </div>
        <div
          class="card card-accent-green flex flex-col gap-0 !p-0 overflow-hidden">
          <div
            v-for="file in stagedChanges"
            :key="file.path + 'staged'"
            class="flex items-center gap-4 p-3 border-b-2 border-stone-200 last:border-b-0 hover:bg-stone-50">
            <span
              class="w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-neo-black"
              :class="{
                'bg-neo-green': file.status === 'added',
                'bg-neo-orange': file.status === 'modified',
                'bg-neo-red text-white': file.status === 'deleted',
                'bg-neo-purple': file.status === 'renamed',
                'bg-neo-blue': file.status === 'untracked',
              }">
              {{ getStatusIcon(file.status) }}
            </span>
            <span class="flex-1 min-w-0 font-mono truncate text-sm">{{
              file.path
            }}</span>
            <span class="text-xs font-bold text-stone-400">{{
              file.status.toUpperCase()
            }}</span>
          </div>
        </div>
      </section>

      <!-- Unstaged Changes -->
      <section v-if="unstagedChanges.length > 0" class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-bold">○ THAY ĐỔI CHƯA STAGE</h2>
          <span class="badge badge-orange"
            >{{ unstagedChanges.length }} TỆP</span
          >
        </div>
        <div
          class="card card-accent-orange flex flex-col gap-0 !p-0 overflow-hidden">
          <div
            v-for="file in unstagedChanges"
            :key="file.path + 'unstaged'"
            class="flex items-center gap-4 p-3 border-b-2 border-stone-200 last:border-b-0 hover:bg-stone-50">
            <span
              class="w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-neo-black"
              :class="{
                'bg-neo-green': file.status === 'added',
                'bg-neo-orange': file.status === 'modified',
                'bg-neo-red text-white': file.status === 'deleted',
                'bg-neo-purple': file.status === 'renamed',
                'bg-neo-blue': file.status === 'untracked',
              }">
              {{ getStatusIcon(file.status) }}
            </span>
            <span class="flex-1 min-w-0 font-mono truncate text-sm">{{
              file.path
            }}</span>
            <span class="text-xs font-bold text-stone-400">{{
              file.status.toUpperCase()
            }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRepositoryStore } from "@/stores/repository";

const repositoryStore = useRepositoryStore();
const isLoading = ref(false);
const isRebasing = ref(false);

const stagedChanges = computed(() => {
  return repositoryStore.gitStatus.filter((f) => f.staged);
});

const unstagedChanges = computed(() => {
  return repositoryStore.gitStatus.filter((f) => !f.staged);
});

async function refreshStatus() {
  isLoading.value = true;
  await repositoryStore.loadGitStatus();
  isLoading.value = false;
}

async function handleRebase() {
  if (!repositoryStore.currentRepository) return;
  if (!confirm("Bạn có chắc chắn muốn rebase code mới nhất từ origin? Các thay đổi hiện tại sẽ được stash và pop lại sau khi rebase.")) {
    return;
  }

  isRebasing.value = true;
  try {
    const result = await window.electronAPI.rebase(repositoryStore.currentRepository);
    alert(result.message);
    // Refresh status to show any changes or conflicts
    await refreshStatus();
  } catch (e) {
    console.error(e);
    alert("Có lỗi xảy ra khi rebase.");
  } finally {
    isRebasing.value = false;
  }
}

onMounted(() => {
  if (repositoryStore.hasRepository) {
    refreshStatus();
  }
});

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    modified: "M",
    added: "A",
    deleted: "D",
    renamed: "R",
    copied: "C",
    untracked: "?",
    unmerged: "U",
  };
  return icons[status] || "?";
}
</script>
