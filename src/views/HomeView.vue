<template>
  <div class="home-view">
    <!-- Hero Section - Neo-Brutalism Style -->
    <section class="hero">
      <div class="hero-content animate-fadeIn">
        <div class="hero-badge">GIT ANALYSIS TOOL</div>
        <h1 class="hero-title">
          EXPLORE YOUR
          <span class="title-highlight">CODEBASE</span>
        </h1>
        <p class="hero-description">
          Analyze Git repositories and visualize code relationships as beautiful
          knowledge graphs. Discover hotspots, understand dependencies, and gain
          deep insights.
        </p>

        <div class="hero-actions">
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

        <p v-if="repositoryStore.error" class="error-message">
          ⚠ {{ repositoryStore.error }}
        </p>
      </div>

      <!-- Decorative Elements -->
      <div class="hero-decoration">
        <div class="deco-box box-1"></div>
        <div class="deco-box box-2"></div>
        <div class="deco-box box-3"></div>
        <div class="deco-circle"></div>
      </div>
    </section>

    <!-- Repository Info (if loaded) -->
    <section
      v-if="repositoryStore.currentRepository"
      class="repo-section animate-fadeIn">
      <div class="section-header">
        <h2>▤ CURRENT REPOSITORY</h2>
        <button class="btn btn-ghost" @click="repositoryStore.clearRepository">
          ✕ CLOSE
        </button>
      </div>

      <div class="repo-card card card-accent-yellow">
        <div class="repo-header">
          <div class="repo-icon">◈</div>
          <div>
            <h3>{{ repositoryStore.repositoryName }}</h3>
            <code class="repo-path">{{
              repositoryStore.currentRepository
            }}</code>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card" style="background: var(--neo-blue)">
            <div class="stat-value">{{ repositoryStore.totalCommits }}</div>
            <div class="stat-label">COMMITS</div>
          </div>
          <div class="stat-card" style="background: var(--neo-green)">
            <div class="stat-value">
              {{ repositoryStore.repositoryInfo?.totalContributors || "-" }}
            </div>
            <div class="stat-label">CONTRIBUTORS</div>
          </div>
          <div class="stat-card" style="background: var(--neo-pink)">
            <div class="stat-value">{{ repositoryStore.currentBranch }}</div>
            <div class="stat-label">BRANCH</div>
          </div>
        </div>

        <div class="repo-actions">
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
      <div class="commits-preview card card-accent-blue">
        <div class="card-header">
          <h3 class="card-title">◷ RECENT COMMITS</h3>
          <router-link to="/timeline" class="btn btn-ghost">
            VIEW ALL →
          </router-link>
        </div>

        <div class="commits-list">
          <div
            v-for="(commit, index) in recentCommits"
            :key="commit.hash"
            class="commit-item"
            :class="['stagger-' + (index + 1)]">
            <div class="commit-hash">{{ commit.shortHash }}</div>
            <div class="commit-info">
              <div class="commit-message truncate">{{ commit.message }}</div>
              <div class="commit-meta">
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
      <h2 class="section-title">▤ WHAT YOU CAN DO</h2>
      <div class="features-grid">
        <div class="feature-card card card-accent-blue">
          <div class="feature-icon" style="background: var(--neo-blue)">◈</div>
          <h3>KNOWLEDGE GRAPH</h3>
          <p>
            Visualize relationships between commits, files, and functions as an
            interactive graph.
          </p>
        </div>

        <div class="feature-card card card-accent-green">
          <div class="feature-icon" style="background: var(--neo-green)">
            ⚡
          </div>
          <h3>CODE ANALYSIS</h3>
          <p>
            Static analysis to extract functions, classes, and understand call
            relationships.
          </p>
        </div>

        <div class="feature-card card card-accent-orange">
          <div class="feature-icon" style="background: var(--neo-orange)">
            ★
          </div>
          <h3>HOTSPOT DETECTION</h3>
          <p>
            Identify frequently modified files and functions that may need
            attention.
          </p>
        </div>

        <div class="feature-card card card-accent-pink">
          <div class="feature-icon" style="background: var(--neo-pink)">◷</div>
          <h3>TIMELINE VIEW</h3>
          <p>
            Explore how your codebase evolved over time with commit timeline
            visualization.
          </p>
        </div>
      </div>
    </section>

    <!-- Clone Modal -->
    <div
      v-if="showCloneModal"
      class="modal-overlay"
      @click.self="closeCloneModal">
      <div class="modal card">
        <div class="modal-header">
          <h2>↓ CLONE FROM URL</h2>
          <button class="btn btn-icon btn-ghost" @click="closeCloneModal">
            ✕
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>GIT REPOSITORY URL</label>
            <input
              type="text"
              v-model="cloneUrl"
              placeholder="https://github.com/user/repo.git"
              class="input"
              :disabled="isCloning" />
          </div>

          <div class="form-group">
            <label>DESTINATION FOLDER</label>
            <div class="input-with-btn">
              <input
                type="text"
                v-model="cloneDestPath"
                placeholder="Select destination folder..."
                class="input"
                readonly
                :disabled="isCloning" />
              <button
                class="btn btn-secondary"
                @click="selectCloneDestination"
                :disabled="isCloning">
                BROWSE
              </button>
            </div>
          </div>

          <!-- Progress -->
          <div v-if="isCloning" class="clone-progress">
            <div class="progress-header">
              <span class="progress-stage">{{
                cloneProgress.stage.toUpperCase()
              }}</span>
              <span class="progress-percent">{{ cloneProgress.percent }}%</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: cloneProgress.percent + '%' }"></div>
            </div>
            <p class="progress-message">{{ cloneProgress.message }}</p>
          </div>

          <!-- Error -->
          <p v-if="cloneError" class="error-message">⚠ {{ cloneError }}</p>
        </div>

        <div class="modal-footer">
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
import { ref, computed, onUnmounted } from "vue";
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
      // Clone successful, load the repository
      closeCloneModal();
      await repositoryStore.setRepository(result.path);
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
  max-width: 550px;
}

.hero-badge {
  display: inline-block;
  padding: 4px 12px;
  margin-bottom: var(--spacing-md);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--neo-black);
  color: var(--neo-white);
  letter-spacing: 0.1em;
}

.hero-title {
  font-size: 3rem;
  line-height: 1;
  margin-bottom: var(--spacing-lg);
}

.title-highlight {
  display: block;
  background: var(--neo-yellow);
  padding: 8px 16px;
  border: 4px solid var(--neo-black);
  box-shadow: 6px 6px 0 var(--neo-black);
  margin-top: var(--spacing-sm);
}

.hero-description {
  font-size: 1.1rem;
  margin-bottom: var(--spacing-xl);
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: var(--spacing-md);
}

.error-message {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--neo-red);
  color: var(--neo-white);
  font-weight: 700;
  border: 3px solid var(--neo-black);
}

/* Decorative Elements */
.hero-decoration {
  position: relative;
  height: 350px;
}

.deco-box {
  position: absolute;
  border: 4px solid var(--neo-black);
  box-shadow: 6px 6px 0 var(--neo-black);
}

.box-1 {
  width: 180px;
  height: 180px;
  background: var(--neo-yellow);
  top: 20px;
  left: 20%;
  animation: float 3s ease-in-out infinite;
}

.box-2 {
  width: 120px;
  height: 120px;
  background: var(--neo-pink);
  top: 100px;
  right: 15%;
  animation: float 3s ease-in-out infinite 0.5s;
}

.box-3 {
  width: 80px;
  height: 80px;
  background: var(--neo-blue);
  bottom: 40px;
  left: 30%;
  animation: float 3s ease-in-out infinite 1s;
}

.deco-circle {
  position: absolute;
  width: 100px;
  height: 100px;
  border: 4px solid var(--neo-black);
  border-radius: 50%;
  background: var(--neo-green);
  box-shadow: 6px 6px 0 var(--neo-black);
  bottom: 80px;
  right: 25%;
  animation: float 3s ease-in-out infinite 1.5s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
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

.repo-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--neo-yellow);
  border: 3px solid var(--neo-black);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.repo-header h3 {
  font-size: 1.5rem;
  margin: 0;
}

.repo-path {
  font-size: 0.8rem;
  background: var(--neo-black);
  color: var(--neo-yellow);
  padding: 4px 8px;
  border: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.repo-actions {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
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
  background: var(--bg-primary);
  border: 3px solid var(--neo-black);
  transition: all var(--transition-fast);
}

.commit-item:hover {
  background: var(--neo-yellow);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.commit-hash {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--neo-blue);
  padding: 4px 8px;
  border: 2px solid var(--neo-black);
}

.commit-info {
  flex: 1;
  min-width: 0;
}

.commit-message {
  font-size: 0.9rem;
  font-weight: 600;
}

.commit-meta {
  display: flex;
  gap: var(--spacing-xs);
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.feature-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 3px solid var(--neo-black);
  box-shadow: 4px 4px 0 var(--neo-black);
}

.feature-card h3 {
  font-size: 1rem;
  margin: 0;
}

.feature-card p {
  font-size: 0.9rem;
  margin: 0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--spacing-md);
  border-bottom: 3px solid var(--neo-black);
  margin-bottom: var(--spacing-lg);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 3px solid var(--neo-black);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.input {
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  border: 3px solid var(--neo-black);
  background: var(--neo-white);
  outline: none;
  transition: all var(--transition-fast);
}

.input:focus {
  box-shadow: 4px 4px 0 var(--neo-black);
}

.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-with-btn {
  display: flex;
  gap: 0;
}

.input-with-btn .input {
  flex: 1;
  border-right: none;
}

.input-with-btn .btn {
  border-left: 3px solid var(--neo-black);
}

/* Clone Progress */
.clone-progress {
  padding: var(--spacing-md);
  background: var(--neo-blue);
  border: 3px solid var(--neo-black);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
  font-weight: 700;
  font-size: 0.85rem;
}

.progress-bar {
  height: 12px;
  background: var(--neo-white);
  border: 2px solid var(--neo-black);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--neo-green);
  transition: width 0.3s ease;
}

.progress-message {
  margin-top: var(--spacing-sm);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  word-break: break-all;
}
</style>
