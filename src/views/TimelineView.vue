<template>
  <div class="timeline-view">
    <div class="view-header">
      <h1>Commit Timeline</h1>
      <div class="view-actions">
        <div class="search-box">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="input"
            placeholder="Search commits..." />
        </div>
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
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
      <h3>No Repository Selected</h3>
      <p>Select a repository from the home page to view the commit timeline.</p>
      <router-link to="/" class="btn btn-primary">Open Repository</router-link>
    </div>

    <!-- Timeline -->
    <div v-else class="timeline-container">
      <div class="timeline-stats">
        <div class="stat">
          <span class="stat-value">{{ filteredCommits.length }}</span>
          <span class="stat-label">Commits</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ uniqueAuthors.length }}</span>
          <span class="stat-label">Authors</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ dateRange }}</span>
          <span class="stat-label">Time Range</span>
        </div>
      </div>

      <div class="timeline">
        <div
          v-for="(group, date) in groupedCommits"
          :key="date"
          class="timeline-group">
          <div class="timeline-date">
            <span>{{ formatGroupDate(date) }}</span>
            <span class="badge">{{ group.length }} commits</span>
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
                  <span class="commit-time">{{ formatTime(commit.date) }}</span>
                </div>
                <p class="commit-message">{{ commit.message }}</p>
                <div class="commit-meta">
                  <span class="commit-author">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
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
          <p>No commits found matching "{{ searchQuery }}"</p>
        </div>
      </div>
    </div>

    <!-- Commit Details Sidebar -->
    <aside v-if="selectedCommit" class="details-sidebar card">
      <div class="sidebar-header">
        <h3>Commit Details</h3>
        <button class="btn btn-icon btn-ghost" @click="selectedCommit = null">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="sidebar-content">
        <div class="detail-group">
          <label>Hash</label>
          <code>{{ selectedCommit.hash }}</code>
        </div>

        <div class="detail-group">
          <label>Author</label>
          <span>{{ selectedCommit.author }}</span>
          <span class="text-muted text-sm">{{
            selectedCommit.authorEmail
          }}</span>
        </div>

        <div class="detail-group">
          <label>Date</label>
          <span>{{ formatFullDate(selectedCommit.date) }}</span>
        </div>

        <div class="detail-group">
          <label>Message</label>
          <p>{{ selectedCommit.message }}</p>
        </div>

        <div class="detail-group">
          <label>Changes</label>
          <div class="changes-summary">
            <span class="badge badge-success"
              >+{{ selectedCommit.insertions }}</span
            >
            <span class="badge badge-danger"
              >-{{ selectedCommit.deletions }}</span
            >
            <span class="badge">{{ selectedCommit.filesChanged }} files</span>
          </div>
        </div>

        <div class="detail-group">
          <label>Changed Files</label>
          <div class="files-list">
            <div v-for="file in commitFiles" :key="file.path" class="file-item">
              <span class="file-status" :class="file.status">
                {{ getStatusIcon(file.status) }}
              </span>
              <span class="file-path truncate font-mono text-sm">{{
                file.path
              }}</span>
            </div>
            <div v-if="loadingFiles" class="flex items-center gap-2 text-muted">
              <div class="loader" style="width: 16px; height: 16px"></div>
              Loading files...
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

  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)} months`;
  return `${Math.round(diffDays / 365)} years`;
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
    return "Today";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
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
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.search-box svg {
  color: var(--text-muted);
}

.search-box .input {
  border: none;
  background: transparent;
  padding: var(--spacing-xs);
  width: 200px;
}

.search-box .input:focus {
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
  color: var(--text-muted);
  margin-top: 60px;
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
  gap: var(--spacing-xl);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
}

.timeline-stats .stat {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
}

.timeline-stats .stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.timeline-stats .stat-label {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* Timeline */
.timeline {
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
  font-weight: 600;
  color: var(--text-secondary);
}

.timeline-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-left: var(--spacing-lg);
  border-left: 2px solid var(--border-color);
}

.timeline-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  margin-left: calc(var(--spacing-md) * -1 - 6px);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.timeline-item:hover {
  border-color: var(--accent-primary);
  background: var(--bg-tertiary);
}

.timeline-item.selected {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.timeline-dot {
  width: 12px;
  height: 12px;
  background: var(--accent-primary);
  border-radius: 50%;
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
  color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
}

.commit-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.commit-message {
  font-size: 0.875rem;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
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
  font-size: 0.75rem;
  color: var(--text-muted);
}

.commit-stats {
  display: flex;
  gap: var(--spacing-sm);
  font-size: 0.75rem;
  font-family: var(--font-mono);
}

.stat-add {
  color: var(--accent-success);
}
.stat-del {
  color: var(--accent-danger);
}
.stat-files {
  color: var(--text-muted);
}

.no-results {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--text-muted);
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
  border-bottom: 1px solid var(--border-color);
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
  gap: var(--spacing-xs);
}

.detail-group label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.detail-group code {
  word-break: break-all;
}

.changes-summary {
  display: flex;
  gap: var(--spacing-sm);
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
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.file-status {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.file-status.added {
  background: rgba(34, 197, 94, 0.2);
  color: var(--accent-success);
}
.file-status.modified {
  background: rgba(245, 158, 11, 0.2);
  color: var(--accent-warning);
}
.file-status.deleted {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-danger);
}
.file-status.renamed {
  background: rgba(139, 92, 246, 0.2);
  color: var(--accent-secondary);
}

.file-path {
  flex: 1;
  min-width: 0;
}
</style>
