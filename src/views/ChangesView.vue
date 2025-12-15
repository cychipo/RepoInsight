<template>
  <div class="changes-view">
    <div class="view-header">
      <h1>⚡ UNCOMMITTED CHANGES</h1>
      <button
        class="btn btn-secondary"
        @click="refreshStatus"
        :disabled="isLoading">
        ↻ REFRESH
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!repositoryStore.hasRepository" class="empty-state card">
      <div class="empty-icon">⚡</div>
      <h3>NO REPOSITORY SELECTED</h3>
      <p>Select a repository from the home page to view changes.</p>
      <router-link to="/" class="btn btn-primary"
        >◆ OPEN REPOSITORY</router-link
      >
    </div>

    <!-- No Changes -->
    <div
      v-else-if="repositoryStore.gitStatus.length === 0"
      class="empty-state card">
      <div class="empty-icon">✓</div>
      <h3>NO UNCOMMITTED CHANGES</h3>
      <p>Working directory is clean. All changes have been committed.</p>
    </div>

    <!-- Changes List -->
    <div v-else class="changes-container">
      <!-- Staged Changes -->
      <section v-if="stagedChanges.length > 0" class="changes-section">
        <div class="section-header">
          <h2>✓ STAGED CHANGES</h2>
          <span class="badge badge-green"
            >{{ stagedChanges.length }} FILES</span
          >
        </div>
        <div class="changes-list card card-accent-green">
          <div
            v-for="file in stagedChanges"
            :key="file.path + 'staged'"
            class="change-item">
            <span class="change-status" :class="file.status">
              {{ getStatusIcon(file.status) }}
            </span>
            <span class="change-path font-mono truncate">{{ file.path }}</span>
            <span class="change-type">{{ file.status.toUpperCase() }}</span>
          </div>
        </div>
      </section>

      <!-- Unstaged Changes -->
      <section v-if="unstagedChanges.length > 0" class="changes-section">
        <div class="section-header">
          <h2>○ UNSTAGED CHANGES</h2>
          <span class="badge badge-orange"
            >{{ unstagedChanges.length }} FILES</span
          >
        </div>
        <div class="changes-list card card-accent-orange">
          <div
            v-for="file in unstagedChanges"
            :key="file.path + 'unstaged'"
            class="change-item">
            <span class="change-status" :class="file.status">
              {{ getStatusIcon(file.status) }}
            </span>
            <span class="change-path font-mono truncate">{{ file.path }}</span>
            <span class="change-type">{{ file.status.toUpperCase() }}</span>
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

<style scoped>
.changes-view {
  padding: var(--spacing-lg);
  max-width: 1000px;
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);
}

.view-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xxl);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

.changes-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.changes-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.section-header h2 {
  font-size: 1rem;
  margin: 0;
}

.changes-list {
  display: flex;
  flex-direction: column;
}

.change-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 2px solid var(--border-color);
}

.change-item:last-child {
  border-bottom: none;
}

.change-status {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  border: 3px solid var(--neo-black);
}

.change-status.modified {
  background: var(--neo-orange);
}

.change-status.added {
  background: var(--neo-green);
}

.change-status.deleted {
  background: var(--neo-red);
  color: white;
}

.change-status.untracked {
  background: var(--neo-blue);
}

.change-status.renamed {
  background: var(--neo-purple);
}

.change-path {
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
}

.change-type {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
}
</style>
