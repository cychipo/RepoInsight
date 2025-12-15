<template>
  <div class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="url(#gradient)"
              stroke-width="2" />
            <circle cx="16" cy="10" r="3" fill="var(--node-commit)" />
            <circle cx="10" cy="20" r="3" fill="var(--node-file)" />
            <circle cx="22" cy="20" r="3" fill="var(--node-function)" />
            <line
              x1="16"
              y1="13"
              x2="11"
              y2="17"
              stroke="var(--text-muted)"
              stroke-width="1.5" />
            <line
              x1="16"
              y1="13"
              x2="21"
              y2="17"
              stroke="var(--text-muted)"
              stroke-width="1.5" />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stop-color="var(--accent-primary)" />
                <stop offset="100%" stop-color="var(--accent-secondary)" />
              </linearGradient>
            </defs>
          </svg>
          <span class="logo-text">RepoInsight</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" active-class="active">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
          <span>Home</span>
        </router-link>

        <router-link
          to="/graph"
          class="nav-item"
          active-class="active"
          :class="{ disabled: !hasRepository }">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Knowledge Graph</span>
        </router-link>

        <router-link
          to="/analysis"
          class="nav-item"
          active-class="active"
          :class="{ disabled: !hasRepository }">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Analysis</span>
        </router-link>

        <router-link
          to="/timeline"
          class="nav-item"
          active-class="active"
          :class="{ disabled: !hasRepository }">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <span>Timeline</span>
        </router-link>
      </nav>

      <!-- Repository Info -->
      <div v-if="repositoryStore.currentRepository" class="sidebar-footer">
        <div class="repo-info">
          <div class="repo-name truncate">
            {{ repositoryStore.repositoryName }}
          </div>
          <div class="repo-branch">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <span class="truncate">{{ repositoryStore.currentBranch }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRepositoryStore } from "@/stores/repository";

const repositoryStore = useRepositoryStore();

const hasRepository = computed(() => !!repositoryStore.currentRepository);
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 240px;
  min-width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
}

.sidebar-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    var(--accent-primary),
    var(--accent-secondary)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  text-decoration: none;
}

.nav-item:hover:not(.disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.active {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.2),
    rgba(139, 92, 246, 0.1)
  );
  color: var(--accent-primary);
}

.nav-item.disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* Sidebar Footer */
.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.repo-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.repo-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.repo-branch {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Main Content */
.main-content {
  flex: 1;
  height: 100%;
  overflow: auto;
  background: var(--bg-primary);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
