<template>
  <div class="app-container">
    <!-- Neo-Brutalism Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">
            <span class="logo-node node-1"></span>
            <span class="logo-node node-2"></span>
            <span class="logo-node node-3"></span>
          </div>
          <span class="logo-text"
            >REPO<span class="highlight">INSIGHT</span></span
          >
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" active-class="active">
          <span class="nav-icon">◆</span>
          <span>HOME</span>
        </router-link>

        <router-link
          to="/graph"
          class="nav-item"
          active-class="active"
          :class="{ disabled: !hasRepository }">
          <span class="nav-icon">◈</span>
          <span>GRAPH</span>
        </router-link>

        <router-link
          to="/analysis"
          class="nav-item"
          active-class="active"
          :class="{ disabled: !hasRepository }">
          <span class="nav-icon">▤</span>
          <span>ANALYSIS</span>
        </router-link>

        <router-link
          to="/timeline"
          class="nav-item"
          active-class="active"
          :class="{ disabled: !hasRepository }">
          <span class="nav-icon">◷</span>
          <span>TIMELINE</span>
        </router-link>
      </nav>

      <!-- Repository Info -->
      <div v-if="repositoryStore.currentRepository" class="sidebar-footer">
        <div class="repo-info">
          <div class="repo-badge">ACTIVE REPO</div>
          <div class="repo-name truncate">
            {{ repositoryStore.repositoryName }}
          </div>
          <div class="repo-branch">
            <span class="branch-icon">⎇</span>
            <span class="truncate">{{ repositoryStore.currentBranch }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
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
  background: var(--bg-primary);
}

/* Neo-Brutalism Sidebar */
.sidebar {
  width: 220px;
  min-width: 220px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--neo-white);
  border-right: 4px solid var(--neo-black);
}

.sidebar-header {
  padding: var(--spacing-lg);
  border-bottom: 4px solid var(--neo-black);
  background: var(--neo-yellow);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  position: relative;
  width: 36px;
  height: 36px;
}

.logo-node {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 3px solid var(--neo-black);
  background: var(--neo-white);
}

.node-1 {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background: var(--neo-blue);
}

.node-2 {
  bottom: 0;
  left: 2px;
  background: var(--neo-green);
}

.node-3 {
  bottom: 0;
  right: 2px;
  background: var(--neo-orange);
}

.logo-text {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
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
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
  border: 3px solid transparent;
  transition: all var(--transition-fast);
}

.nav-icon {
  font-size: 1.1rem;
}

.nav-item:hover:not(.disabled) {
  background: var(--neo-yellow);
  border-color: var(--neo-black);
  box-shadow: 3px 3px 0 var(--neo-black);
  transform: translate(-2px, -2px);
}

.nav-item.active {
  background: var(--neo-pink);
  border-color: var(--neo-black);
  box-shadow: 3px 3px 0 var(--neo-black);
}

.nav-item.disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* Sidebar Footer */
.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 4px solid var(--neo-black);
  background: var(--neo-blue);
}

.repo-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.repo-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--neo-black);
  color: var(--neo-white);
  align-self: flex-start;
}

.repo-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.repo-branch {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.8rem;
  font-weight: 600;
}

.branch-icon {
  font-size: 1rem;
}

/* Main Content */
.main-content {
  flex: 1;
  height: 100%;
  overflow: auto;
  background: var(--bg-primary);
}

/* Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
