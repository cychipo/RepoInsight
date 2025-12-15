<template>
  <div class="home-view">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content animate-fadeIn">
        <h1 class="hero-title">
          Explore Your
          <span class="gradient-text">Codebase</span>
        </h1>
        <p class="hero-description">
          Analyze Git repositories and visualize code relationships as beautiful
          knowledge graphs. Discover hotspots, understand dependencies, and gain
          insights into your codebase evolution.
        </p>

        <div class="hero-actions">
          <button
            class="btn btn-primary btn-lg"
            @click="handleSelectRepository"
            :disabled="repositoryStore.isLoading">
            <svg
              v-if="!repositoryStore.isLoading"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2">
              <path
                d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <div v-else class="loader" style="width: 20px; height: 20px"></div>
            {{ repositoryStore.isLoading ? "Loading..." : "Open Repository" }}
          </button>
        </div>

        <p v-if="repositoryStore.error" class="error-message">
          {{ repositoryStore.error }}
        </p>
      </div>

      <!-- Decorative Graph Animation -->
      <div class="hero-visual">
        <div class="graph-decoration">
          <div
            class="node node-commit"
            style="--delay: 0s; --x: 50%; --y: 20%"></div>
          <div
            class="node node-file"
            style="--delay: 0.2s; --x: 25%; --y: 50%"></div>
          <div
            class="node node-file"
            style="--delay: 0.4s; --x: 75%; --y: 50%"></div>
          <div
            class="node node-function"
            style="--delay: 0.6s; --x: 15%; --y: 80%"></div>
          <div
            class="node node-function"
            style="--delay: 0.8s; --x: 40%; --y: 80%"></div>
          <div
            class="node node-function"
            style="--delay: 1s; --x: 65%; --y: 80%"></div>
          <div
            class="node node-function"
            style="--delay: 1.2s; --x: 85%; --y: 80%"></div>
          <svg class="connections" viewBox="0 0 400 300">
            <line
              x1="200"
              y1="60"
              x2="100"
              y2="150"
              class="edge"
              style="--delay: 0.3s" />
            <line
              x1="200"
              y1="60"
              x2="300"
              y2="150"
              class="edge"
              style="--delay: 0.5s" />
            <line
              x1="100"
              y1="150"
              x2="60"
              y2="240"
              class="edge"
              style="--delay: 0.7s" />
            <line
              x1="100"
              y1="150"
              x2="160"
              y2="240"
              class="edge"
              style="--delay: 0.9s" />
            <line
              x1="300"
              y1="150"
              x2="260"
              y2="240"
              class="edge"
              style="--delay: 1.1s" />
            <line
              x1="300"
              y1="150"
              x2="340"
              y2="240"
              class="edge"
              style="--delay: 1.3s" />
          </svg>
        </div>
      </div>
    </section>

    <!-- Repository Info (if loaded) -->
    <section
      v-if="repositoryStore.currentRepository"
      class="repo-section animate-fadeIn">
      <div class="section-header">
        <h2>Current Repository</h2>
        <button class="btn btn-ghost" @click="repositoryStore.clearRepository">
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
          Close
        </button>
      </div>

      <div class="repo-card card">
        <div class="repo-header">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <div>
            <h3>{{ repositoryStore.repositoryName }}</h3>
            <p class="text-muted text-sm font-mono">
              {{ repositoryStore.currentRepository }}
            </p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ repositoryStore.totalCommits }}</div>
            <div class="stat-label">Commits</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">
              {{ repositoryStore.repositoryInfo?.totalContributors || "-" }}
            </div>
            <div class="stat-label">Contributors</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ repositoryStore.currentBranch }}</div>
            <div class="stat-label">Current Branch</div>
          </div>
        </div>

        <div class="repo-actions">
          <router-link to="/graph" class="btn btn-primary">
            <svg
              width="18"
              height="18"
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
            View Knowledge Graph
          </router-link>
          <router-link to="/analysis" class="btn btn-secondary">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            View Analysis
          </router-link>
        </div>
      </div>

      <!-- Recent Commits Preview -->
      <div class="commits-preview card">
        <div class="card-header">
          <h3 class="card-title">Recent Commits</h3>
          <router-link to="/timeline" class="btn btn-ghost text-sm">
            View All
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12,5 19,12 12,19" />
            </svg>
          </router-link>
        </div>

        <div class="commits-list">
          <div
            v-for="commit in recentCommits"
            :key="commit.hash"
            class="commit-item">
            <div class="commit-hash font-mono">{{ commit.shortHash }}</div>
            <div class="commit-info">
              <div class="commit-message truncate">{{ commit.message }}</div>
              <div class="commit-meta text-muted text-xs">
                <span>{{ commit.author }}</span>
                <span>•</span>
                <span>{{ formatDate(commit.date) }}</span>
              </div>
            </div>
            <div class="commit-stats">
              <span class="stat-add">+{{ commit.insertions }}</span>
              <span class="stat-del">-{{ commit.deletions }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section (when no repo) -->
    <section v-else class="features-section">
      <h2 class="section-title">What You Can Do</h2>
      <div class="features-grid">
        <div class="feature-card card">
          <div class="feature-icon" style="background: rgba(59, 130, 246, 0.2)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-primary)"
              stroke-width="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <h3>Knowledge Graph</h3>
          <p>
            Visualize relationships between commits, files, and functions as an
            interactive graph.
          </p>
        </div>

        <div class="feature-card card">
          <div class="feature-icon" style="background: rgba(34, 197, 94, 0.2)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-success)"
              stroke-width="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
          </div>
          <h3>Code Analysis</h3>
          <p>
            Static analysis to extract functions, classes, and understand call
            relationships.
          </p>
        </div>

        <div class="feature-card card">
          <div class="feature-icon" style="background: rgba(245, 158, 11, 0.2)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-warning)"
              stroke-width="2">
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </div>
          <h3>Hotspot Detection</h3>
          <p>
            Identify frequently modified files and functions that may need
            attention.
          </p>
        </div>

        <div class="feature-card card">
          <div class="feature-icon" style="background: rgba(139, 92, 246, 0.2)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-secondary)"
              stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <h3>Timeline View</h3>
          <p>
            Explore how your codebase evolved over time with commit timeline
            visualization.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRepositoryStore } from "@/stores/repository";

const repositoryStore = useRepositoryStore();

const recentCommits = computed(() => {
  return repositoryStore.commits.slice(0, 5);
});

async function handleSelectRepository() {
  await repositoryStore.selectRepository();
}

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

<style scoped>
.home-view {
  min-height: 100%;
  padding: var(--spacing-2xl);
}

/* Hero Section */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
  align-items: center;
  min-height: 400px;
  margin-bottom: var(--spacing-2xl);
}

.hero-content {
  max-width: 500px;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: var(--spacing-lg);
}

.gradient-text {
  background: linear-gradient(
    135deg,
    var(--accent-primary),
    var(--accent-secondary)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: var(--spacing-md);
}

.error-message {
  margin-top: var(--spacing-md);
  color: var(--accent-danger);
  font-size: 0.875rem;
}

/* Hero Visual - Animated Graph */
.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.graph-decoration {
  position: relative;
  width: 400px;
  height: 300px;
}

.node {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  left: var(--x);
  top: var(--y);
  transform: translate(-50%, -50%) scale(0);
  animation: nodeAppear 0.5s ease forwards;
  animation-delay: var(--delay);
  box-shadow: 0 0 20px currentColor;
}

.node-commit {
  background: var(--node-commit);
  color: var(--node-commit);
}
.node-file {
  background: var(--node-file);
  color: var(--node-file);
}
.node-function {
  background: var(--node-function);
  color: var(--node-function);
  width: 18px;
  height: 18px;
}

@keyframes nodeAppear {
  to {
    transform: translate(-50%, -50%) scale(1);
  }
}

.connections {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.edge {
  stroke: var(--text-muted);
  stroke-width: 1.5;
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: drawLine 0.5s ease forwards;
  animation-delay: var(--delay);
}

@keyframes drawLine {
  to {
    stroke-dashoffset: 0;
  }
}

/* Repo Section */
.repo-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.repo-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.repo-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.repo-header svg {
  color: var(--accent-primary);
}

.repo-header h3 {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.repo-actions {
  display: flex;
  gap: var(--spacing-md);
}

/* Commits Preview */
.commits-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.commit-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.commit-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.commit-hash {
  font-size: 0.75rem;
  color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
}

.commit-info {
  flex: 1;
  min-width: 0;
}

.commit-message {
  font-size: 0.875rem;
  font-weight: 500;
}

.commit-meta {
  display: flex;
  gap: var(--spacing-xs);
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

/* Features Section */
.features-section {
  margin-top: var(--spacing-2xl);
}

.section-title {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  text-align: center;
  align-items: center;
}

.feature-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
}

.feature-card h3 {
  font-size: 1rem;
  margin: 0;
}

.feature-card p {
  font-size: 0.875rem;
  margin: 0;
}
</style>
