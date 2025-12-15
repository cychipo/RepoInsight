<template>
  <div class="timeline-view">
    <div class="view-header">
      <h1>◷ COMMIT TIMELINE</h1>
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input
          v-model="searchQuery"
          type="text"
          class="input"
          placeholder="SEARCH COMMITS..." />
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!repositoryStore.hasRepository" class="empty-state card">
      <div class="empty-icon">◷</div>
      <h3>NO REPOSITORY SELECTED</h3>
      <p>Select a repository from the home page to view the commit timeline.</p>
      <router-link to="/" class="btn btn-primary"
        >◆ OPEN REPOSITORY</router-link
      >
    </div>

    <!-- Timeline Content -->
    <div v-else class="timeline-container">
      <!-- Stats Bar -->
      <div class="timeline-stats">
        <div class="stat-item">
          <span class="stat-num">{{ filteredCommits.length }}</span>
          <span class="stat-text">COMMITS</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">{{ uniqueAuthors.length }}</span>
          <span class="stat-text">AUTHORS</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">{{ dateRange }}</span>
          <span class="stat-text">TIME RANGE</span>
        </div>
      </div>

      <!-- Timeline -->
      <div class="timeline-scroll">
        <div class="timeline">
          <div
            v-for="(group, date) in groupedCommits"
            :key="date"
            class="timeline-group">
            <div class="timeline-date">
              <span class="date-text">{{ formatGroupDate(date) }}</span>
              <span class="badge badge-yellow">{{ group.length }} COMMITS</span>
            </div>

            <div class="timeline-items">
              <div
                v-for="commit in group"
                :key="commit.hash"
                class="timeline-item"
                @click="selectedCommit = commit"
                :class="{ selected: selectedCommit?.hash === commit.hash }">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <div class="commit-header">
                    <code class="commit-hash">{{ commit.shortHash }}</code>
                    <span class="commit-time">{{
                      formatTime(commit.date)
                    }}</span>
                  </div>
                  <p class="commit-message">{{ commit.message }}</p>
                  <div class="commit-meta">
                    <span class="commit-author">
                      <span class="author-icon">●</span>
                      {{ commit.author }}
                    </span>
                    <div class="commit-stats">
                      <span class="stat-add">+{{ commit.insertions }}</span>
                      <span class="stat-del">-{{ commit.deletions }}</span>
                      <span class="stat-files"
                        >{{ commit.filesChanged }} files</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="filteredCommits.length === 0" class="no-results">
            <p>NO COMMITS FOUND MATCHING "{{ searchQuery }}"</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Commit Details Sidebar -->
    <aside v-if="selectedCommit" class="details-sidebar card">
      <div class="sidebar-header">
        <h3>COMMIT DETAILS</h3>
        <button class="btn btn-icon btn-ghost" @click="selectedCommit = null">
          ✕
        </button>
      </div>

      <div class="sidebar-content">
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

        <div class="detail-group">
          <label>CHANGES</label>
          <div class="changes-summary">
            <span class="badge badge-success"
              >+{{ selectedCommit.insertions }}</span
            >
            <span class="badge badge-danger"
              >-{{ selectedCommit.deletions }}</span
            >
            <span class="badge">{{ selectedCommit.filesChanged }} FILES</span>
          </div>
        </div>

        <div class="detail-group">
          <label>CHANGED FILES</label>
          <div class="files-list">
            <div v-for="file in commitFiles" :key="file.path" class="file-item">
              <span class="file-status" :class="file.status">
                {{ getStatusIcon(file.status) }}
              </span>
              <span class="file-path truncate font-mono text-sm">{{
                file.path
              }}</span>
            </div>
            <div v-if="loadingFiles" class="flex items-center gap-2">
              <span class="loader" style="width: 16px; height: 16px"></span>
              <span class="text-sm">LOADING FILES...</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRepositoryStore } from "@/stores/repository";
import type { Commit, FileChange } from "@/types";

const repositoryStore = useRepositoryStore();
const searchQuery = ref("");
const selectedCommit = ref<Commit | null>(null);
const commitFiles = ref<FileChange[]>([]);
const loadingFiles = ref(false);

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

  if (diffDays < 30) return `${diffDays} DAYS`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)} MONTHS`;
  return `${Math.round(diffDays / 365)} YEARS`;
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
    return "TODAY";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "YESTERDAY";
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

<style scoped>
.timeline-view {
  display: flex;
  height: 100%;
  padding: var(--spacing-lg);
  gap: var(--spacing-lg);
}

.view-header {
  position: absolute;
  top: var(--spacing-lg);
  left: var(--spacing-lg);
  right: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
}

.view-header h1 {
  font-size: 1.5rem;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--neo-white);
  border: 3px solid var(--neo-black);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.search-icon {
  padding: 0 var(--spacing-sm) 0 var(--spacing-md);
  font-size: 1.2rem;
}

.search-box .input {
  border: none;
  box-shadow: none;
  width: 220px;
  font-size: 0.85rem;
}

.search-box .input:focus {
  background: var(--neo-yellow);
  transform: none;
  box-shadow: none;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  text-align: center;
  margin-top: 60px;
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
}

/* Timeline Container */
.timeline-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 60px;
  overflow: hidden;
}

.timeline-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--neo-yellow);
  border: 3px solid var(--neo-black);
  box-shadow: 4px 4px 0 var(--neo-black);
  margin-bottom: var(--spacing-lg);
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
}

.stat-num {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-text {
  font-size: 0.75rem;
  font-weight: 700;
}

.stat-divider {
  width: 3px;
  height: 30px;
  background: var(--neo-black);
}

/* Timeline */
.timeline-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: var(--spacing-md);
}

.timeline-group {
  margin-bottom: var(--spacing-xl);
}

.timeline-date {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.date-text {
  font-weight: 700;
  font-size: 0.9rem;
}

.timeline-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-left: var(--spacing-lg);
  border-left: 4px solid var(--neo-black);
}

.timeline-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  margin-left: calc(var(--spacing-md) * -1 - 8px);
  background: var(--neo-white);
  border: 3px solid var(--neo-black);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.timeline-item:hover {
  background: var(--neo-yellow);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.timeline-item.selected {
  background: var(--neo-pink);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.timeline-dot {
  width: 16px;
  height: 16px;
  background: var(--neo-blue);
  border: 3px solid var(--neo-black);
  margin-top: 4px;
  flex-shrink: 0;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.commit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.commit-hash {
  font-size: 0.75rem;
  background: var(--neo-blue);
  padding: 2px 8px;
  border: 2px solid var(--neo-black);
}

.commit-time {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.commit-message {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
}

.commit-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.commit-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.8rem;
  font-weight: 600;
}

.author-icon {
  color: var(--neo-green);
}

.commit-stats {
  display: flex;
  gap: var(--spacing-sm);
  font-size: 0.8rem;
  font-family: var(--font-mono);
  font-weight: 700;
}

.stat-add {
  color: #006600;
}
.stat-del {
  color: #cc0000;
}
.stat-files {
  color: var(--text-muted);
}

.no-results {
  padding: var(--spacing-xl);
  text-align: center;
  font-weight: 600;
}

/* Details Sidebar */
.details-sidebar {
  width: 360px;
  display: flex;
  flex-direction: column;
  margin-top: 60px;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--spacing-md);
  border-bottom: 3px solid var(--neo-black);
  margin-bottom: var(--spacing-md);
}

.sidebar-content {
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

.changes-summary {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px var(--spacing-sm);
  background: var(--bg-primary);
  border: 2px solid var(--neo-black);
}

.file-status {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid var(--neo-black);
}

.file-status.added {
  background: var(--neo-green);
}
.file-status.modified {
  background: var(--neo-orange);
}
.file-status.deleted {
  background: var(--neo-red);
  color: var(--neo-white);
}
.file-status.renamed {
  background: var(--neo-purple);
}

.file-path {
  flex: 1;
  min-width: 0;
}
</style>
