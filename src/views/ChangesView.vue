<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-8">
      <h1
        class="text-2xl font-bold uppercase tracking-tight flex items-center gap-2">
        <Zap :size="24" /> THAY ĐỔI CHƯA COMMIT
      </h1>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-primary"
          @click="handleRebase"
          :disabled="isLoading || isRebasing">
          {{ isRebasing ? "ĐANG REBASE..." : ""
          }}<Download v-if="!isRebasing" :size="14" class="inline" />
          {{ isRebasing ? "" : "REBASE CODE" }}
        </button>
        <button
          class="btn btn-secondary"
          @click="refreshStatus"
          :disabled="isLoading || isRebasing">
          <RefreshCw :size="14" class="inline" /> LÀM MỚI
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!repositoryStore.hasRepository"
      class="flex flex-col items-center justify-center p-12 text-center gap-4 card">
      <div class="text-5xl mb-2"><Zap :size="48" /></div>
      <h3 class="text-xl font-bold">CHƯA CHỌN KHO CHỨA</h3>
      <p class="font-medium text-stone-600">
        Chọn một kho chứa từ trang chủ để xem thay đổi.
      </p>
      <router-link to="/" class="btn btn-primary"
        ><Home :size="14" class="inline" /> MỞ KHO CHỨA</router-link
      >
    </div>

    <!-- No Changes - Ready to Push -->
    <div
      v-else-if="repositoryStore.gitStatus.length === 0"
      class="flex flex-col items-center justify-center p-12 text-center gap-4 card">
      <div class="text-5xl mb-2"><Check :size="48" /></div>
      <h3 class="text-xl font-bold">KHÔNG CÓ THAY ĐỔI CHƯA COMMIT</h3>
      <p class="font-medium text-stone-600">
        Thư mục làm việc sạch sẽ. Tất cả thay đổi đã được commit.
      </p>
      <p v-if="commitsAhead > 0" class="text-sm font-semibold text-neo-purple">
        Có {{ commitsAhead }} commit chưa được push lên remote.
      </p>
      <button
        v-if="commitsAhead > 0"
        class="btn btn-primary bg-neo-purple"
        @click="handlePush"
        :disabled="isPushing">
        <Cloud v-if="!isPushing" :size="14" class="inline" />
        {{ isPushing ? "ĐANG PUSH..." : "PUSH LÊN REMOTE" }}
      </button>
      <p v-else class="text-sm text-stone-500">
        Tất cả đã được đồng bộ với remote.
      </p>
    </div>

    <!-- Smart Commit Section -->
    <div
      v-if="
        (repositoryStore.hasRepository &&
          repositoryStore.gitStatus.length > 0) ||
        stagedChanges.length > 0
      "
      class="card card-accent-blue mb-8">
      <div class="flex flex-col gap-4">
        <Sparkles :size="18" /> SMART COMMIT

        <p class="text-sm font-semibold opacity-70">{{ statusMessage }}</p>

        <div class="flex flex-col gap-2">
          <textarea
            v-model="commitMessage"
            class="input h-24 font-mono text-sm resize-none"
            placeholder="Nhập commit message hoặc tạo tự động..."></textarea>

          <div class="flex justify-between items-center">
            <button
              class="btn btn-secondary text-xs"
              @click="handleGenerateMessage"
              :disabled="stagedChanges.length === 0 || isGenerating">
              <span v-if="isGenerating" class="loader w-3 h-3 border-2"></span>
              {{ isGenerating ? "ĐANG TẠO..." : ""
              }}<Sparkles v-if="!isGenerating" :size="14" class="inline" />
              {{ isGenerating ? "" : "TẠO MESSAGE TỰ ĐỘNG" }}
            </button>

            <div class="flex gap-2">
              <button
                v-if="canPush"
                class="btn btn-primary bg-neo-purple"
                @click="handlePush"
                :disabled="isCommitting">
                {{ isCommitting ? "ĐANG PUSH..." : ""
                }}<Cloud v-if="!isCommitting" :size="14" class="inline" />
                {{ isCommitting ? "" : "PUSH LÊN REMOTE" }}
              </button>

              <button
                v-else
                class="btn btn-primary"
                @click="handleCommit"
                :disabled="!canCommit || isCommitting">
                {{ isCommitting ? "ĐANG COMMIT..." : ""
                }}<GitCommit v-if="!isCommitting" :size="14" class="inline" />
                {{ isCommitting ? "" : "COMMIT" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Changes List -->
    <div
      v-if="stagedChanges.length > 0 || unstagedChanges.length > 0"
      class="flex flex-col gap-8">
      <!-- Staged Changes -->
      <section v-if="stagedChanges.length > 0" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <Check :size="18" class="text-neo-green" /> THAY ĐỔI ĐÃ STAGE
            </h2>
            <span class="badge badge-green"
              >{{ stagedChanges.length }} TỆP</span
            >
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-secondary text-xs"
              @click="handleViewStagedDiff"
              title="Xem tất cả thay đổi đã stage">
              <Eye :size="14" /> XEM TẤT CẢ
            </button>
            <button
              class="btn btn-secondary text-xs"
              @click="handleUnstageAll"
              :disabled="isStaging"
              title="Bỏ stage tất cả">
              <Undo2 :size="14" /> BỎ STAGE TẤT CẢ
            </button>
          </div>
        </div>
        <div
          class="card card-accent-green flex flex-col gap-0 p-0! overflow-hidden">
          <div
            v-for="file in stagedChanges"
            :key="file.path + 'staged'"
            class="flex items-center gap-3 p-3 border-b-2 border-stone-200 last:border-b-0 hover:bg-stone-50">
            <span
              class="w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-neo-black shrink-0"
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
            <span class="text-xs font-bold text-stone-400 min-w-[60px]">{{
              file.status.toUpperCase()
            }}</span>

            <button
              class="w-6 h-6 flex items-center justify-center font-bold border-2 border-stone-300 hover:border-neo-blue hover:bg-neo-blue hover:text-white transition-colors"
              title="Xem thay đổi"
              @click="handleViewFileDiff(file.path, true)">
              <Eye :size="14" />
            </button>

            <button
              class="w-6 h-6 flex items-center justify-center font-bold border-2 border-stone-300 hover:border-neo-red hover:bg-neo-red hover:text-white transition-colors"
              title="Bỏ stage"
              @click="handleUnstage(file.path)"
              :disabled="isStaging">
              <Minus :size="14" />
            </button>
          </div>
        </div>
      </section>

      <!-- Unstaged Changes -->
      <section v-if="unstagedChanges.length > 0" class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <Circle :size="18" class="text-neo-orange" /> THAY ĐỔI CHƯA STAGE
            </h2>
            <span class="badge badge-orange"
              >{{ unstagedChanges.length }} TỆP</span
            >
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-secondary text-xs"
              @click="handleViewUnstagedDiff"
              title="Xem tất cả thay đổi">
              👁 XEM TẤT CẢ
            </button>
            <button
              class="btn btn-secondary text-xs"
              @click="handleStageAll"
              :disabled="isStaging"
              title="Stage tất cả">
              <Plus :size="14" /> STAGE TẤT CẢ
            </button>
            <button
              class="btn btn-secondary text-xs bg-neo-red! text-white"
              @click="handleDiscardAll"
              :disabled="isStaging"
              title="Hủy tất cả thay đổi">
              <X :size="14" /> HỦY TẤT CẢ
            </button>
          </div>
        </div>
        <div
          class="card card-accent-orange flex flex-col gap-0 p-0! overflow-hidden">
          <div
            v-for="file in unstagedChanges"
            :key="file.path + 'unstaged'"
            class="flex items-center gap-3 p-3 border-b-2 border-stone-200 last:border-b-0 hover:bg-stone-50">
            <span
              class="w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-neo-black shrink-0"
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
            <span class="text-xs font-bold text-stone-400 min-w-[60px]">{{
              file.status.toUpperCase()
            }}</span>

            <button
              class="w-6 h-6 flex items-center justify-center font-bold border-2 border-stone-300 hover:border-neo-blue hover:bg-neo-blue hover:text-white transition-colors"
              title="Xem thay đổi"
              @click="handleViewFileDiff(file.path, false)">
              <Eye :size="14" />
            </button>

            <button
              class="w-6 h-6 flex items-center justify-center font-bold border-2 border-stone-300 hover:border-neo-green hover:bg-neo-green hover:text-white transition-colors"
              title="Stage"
              @click="handleStage(file.path)"
              :disabled="isStaging">
              <Plus :size="14" />
            </button>

            <button
              class="w-6 h-6 flex items-center justify-center font-bold border-2 border-stone-300 hover:border-neo-red hover:bg-neo-red hover:text-white transition-colors"
              title="Hủy thay đổi"
              @click="handleDiscard(file.path)"
              :disabled="isStaging">
              <X :size="14" />
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Diff Modal -->
    <div
      v-if="showDiffModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
      @click.self="closeDiffModal">
      <div
        class="bg-neo-white border-4 border-neo-black shadow-brutal-lg w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div
          class="flex items-center justify-between p-4 border-b-4 border-neo-black bg-neo-yellow">
          <h3 class="text-lg font-bold">{{ diffModalTitle }}</h3>
          <button
            class="w-8 h-8 flex items-center justify-center font-bold border-2 border-neo-black hover:bg-neo-red hover:text-white transition-colors"
            @click="closeDiffModal">
            ✕
          </button>
        </div>
        <div class="flex-1 overflow-auto font-mono text-sm bg-stone-900">
          <div v-if="diffContent === 'Loading...'" class="p-4 text-stone-400">
            Loading...
          </div>
          <div
            v-else-if="
              !diffContent ||
              diffContent === 'No changes to show.' ||
              diffContent === 'No staged changes.' ||
              diffContent === 'No unstaged changes.'
            "
            class="p-4 text-stone-400">
            {{ diffContent || "No changes to show." }}
          </div>

          <!-- Accordion view for multiple files -->
          <div
            v-else-if="parsedDiffFiles.length > 1"
            class="divide-y divide-stone-700">
            <details
              v-for="(file, fileIndex) in parsedDiffFiles"
              :key="fileIndex"
              class="group"
              open>
              <summary
                class="px-4 py-3 bg-stone-800 hover:bg-stone-700 cursor-pointer flex items-center gap-3 sticky top-0 z-10">
                <span class="text-neo-yellow font-bold">📄</span>
                <span class="text-stone-200 font-semibold flex-1 truncate">{{
                  file.filename
                }}</span>
                <span class="text-xs text-stone-500"
                  >{{ file.lines.length }} lines</span
                >
                <span
                  class="text-stone-400 group-open:rotate-90 transition-transform"
                  >▶</span
                >
              </summary>
              <div class="diff-lines">
                <div
                  v-for="(line, lineIndex) in file.lines"
                  :key="lineIndex"
                  class="px-4 py-0.5 whitespace-pre"
                  :class="{
                    'bg-green-900/50 text-green-300': line.type === 'add',
                    'bg-red-900/50 text-red-300': line.type === 'del',
                    'bg-blue-900/30 text-blue-300': line.type === 'header',
                    'bg-purple-900/30 text-purple-300': line.type === 'meta',
                    'text-stone-400': line.type === 'normal',
                  }">
                  {{ line.content }}
                </div>
              </div>
            </details>
          </div>

          <!-- Single file view (no accordion needed) -->
          <div v-else class="diff-container">
            <div
              v-for="(line, index) in parsedDiffLines"
              :key="index"
              class="px-4 py-0.5 whitespace-pre"
              :class="{
                'bg-green-900/50 text-green-300': line.type === 'add',
                'bg-red-900/50 text-red-300': line.type === 'del',
                'bg-blue-900/30 text-blue-300': line.type === 'header',
                'bg-purple-900/30 text-purple-300': line.type === 'meta',
                'text-stone-400': line.type === 'normal',
              }">
              {{ line.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRepositoryStore } from "@/stores/repository";
import { GoogleGenAI } from "@google/genai";
import {
  Zap,
  Download,
  RefreshCw,
  Home,
  Check,
  Sparkles,
  Cloud,
  GitCommit,
  Eye,
  Undo2,
  Plus,
  Minus,
  X,
  Circle,
} from "lucide-vue-next";

const repositoryStore = useRepositoryStore();
const isLoading = ref(false);
const isRebasing = ref(false);
const isStaging = ref(false);
const isCommitting = ref(false);
const isGenerating = ref(false);
const isPushing = ref(false);
const commitMessage = ref("");
const commitsAhead = ref(0);

const stagedChanges = computed(() => {
  return repositoryStore.gitStatus.filter((f) => f.staged);
});

const unstagedChanges = computed(() => {
  return repositoryStore.gitStatus.filter((f) => !f.staged);
});

const statusMessage = computed(() => {
  if (unstagedChanges.value.length === 0 && stagedChanges.value.length === 0) {
    return "Không có thay đổi nào. Bạn có thể Push.";
  }
  if (stagedChanges.value.length > 0) {
    return "Sẵn sàng Commit.";
  }
  return "Hãy stage các tệp để commit.";
});

const canCommit = computed(
  () => stagedChanges.value.length > 0 && commitMessage.value.trim().length > 0
);
const canPush = computed(
  () => unstagedChanges.value.length === 0 && stagedChanges.value.length === 0
);

async function checkAheadBehind() {
  if (!repositoryStore.currentRepository) return;
  try {
    const result = await window.electronAPI.getAheadBehind(
      repositoryStore.currentRepository
    );
    commitsAhead.value = result.ahead;
  } catch (e) {
    console.error("Failed to check ahead/behind:", e);
    commitsAhead.value = 0;
  }
}

async function refreshStatus() {
  isLoading.value = true;
  await repositoryStore.loadGitStatus();
  await checkAheadBehind();
  isLoading.value = false;
}

async function handleStage(path: string) {
  if (!repositoryStore.currentRepository) return;
  isStaging.value = true;
  await window.electronAPI.stageFile(repositoryStore.currentRepository, path);
  await repositoryStore.loadGitStatus();
  isStaging.value = false;
}

async function handleUnstage(path: string) {
  if (!repositoryStore.currentRepository) return;
  isStaging.value = true;
  await window.electronAPI.unstageFile(repositoryStore.currentRepository, path);
  await repositoryStore.loadGitStatus();
  isStaging.value = false;
}

async function handleGenerateMessage() {
  if (!repositoryStore.currentRepository) return;

  isGenerating.value = true;
  try {
    // Get API Key
    const apiKey = await window.electronAPI.getApiKey();
    if (!apiKey) {
      alert("Vui lòng cấu hình Google API Key trong phần Cài đặt.");
      return;
    }

    const diff = await window.electronAPI.getStagedDiff(
      repositoryStore.currentRepository
    );
    if (!diff) {
      alert("Không có thay đổi nào được stage để tạo commit message.");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Based on the following git diff, generate a concise and descriptive commit message in Conventional Commits format (e.g., feat: ..., fix: ...). Only return the message, no quotes or markdown code blocks.\n\nDiff:\n${diff}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    if (response) {
      let text = "";
      const rawResponse = response as any;

      if (typeof rawResponse.text === "function") {
        text = rawResponse.text();
      } else if (typeof rawResponse.text === "string") {
        text = rawResponse.text;
      } else {
        // Fallback for some SDK versions where response itself might have text
        text = rawResponse.text || "";
      }
      commitMessage.value = text?.trim() || "";
    }
  } catch (e) {
    console.error("AI Generation failed:", e);
    alert(
      "Không thể tạo commit message: " +
        (e instanceof Error ? e.message : String(e))
    );
  } finally {
    isGenerating.value = false;
  }
}

async function handleCommit() {
  if (!repositoryStore.currentRepository || !canCommit.value) return;

  isCommitting.value = true;
  try {
    const result = await window.electronAPI.commit(
      repositoryStore.currentRepository,
      commitMessage.value
    );
    if (result.success) {
      commitMessage.value = "";
      await repositoryStore.loadGitStatus();
      await checkAheadBehind();
    } else {
      alert("Commit thất bại: " + result.error);
    }
  } catch (e) {
    alert("Lỗi commit: " + e);
  } finally {
    isCommitting.value = false;
  }
}

async function handlePush() {
  if (!repositoryStore.currentRepository) return;

  isPushing.value = true;
  try {
    const result = await window.electronAPI.push(
      repositoryStore.currentRepository
    );
    if (result.success) {
      alert("Push thành công!");
      await checkAheadBehind();
    } else {
      alert("Push thất bại: " + result.error);
    }
  } catch (e) {
    alert("Lỗi push: " + e);
  } finally {
    isPushing.value = false;
  }
}

async function handleRebase() {
  if (!repositoryStore.currentRepository) return;
  if (
    !confirm(
      "Bạn có chắc chắn muốn rebase code mới nhất từ origin? Các thay đổi hiện tại sẽ được stash và pop lại sau khi rebase."
    )
  ) {
    return;
  }

  isRebasing.value = true;
  try {
    const result = await window.electronAPI.rebase(
      repositoryStore.currentRepository
    );
    alert(
      result.message ||
        (result.success ? "Rebase thành công" : "Rebase thất bại")
    );
    await refreshStatus();
  } catch (e) {
    console.error(e);
    alert(
      "Có lỗi xảy ra khi rebase: " +
        (e instanceof Error ? e.message : String(e))
    );
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

// Diff modal state
const showDiffModal = ref(false);
const diffContent = ref("");
const diffModalTitle = ref("");

// Parse diff content into lines with type information for coloring
const parsedDiffLines = computed(() => {
  if (!diffContent.value) return [];

  return diffContent.value.split("\n").map((line) => {
    let type: "add" | "del" | "header" | "meta" | "normal" = "normal";

    if (line.startsWith("+") && !line.startsWith("+++")) {
      type = "add";
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      type = "del";
    } else if (line.startsWith("@@")) {
      type = "header";
    } else if (
      line.startsWith("diff ") ||
      line.startsWith("index ") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    ) {
      type = "meta";
    }

    return { content: line, type };
  });
});

// Parse diff content into separate files for accordion display
interface DiffLine {
  content: string;
  type: "add" | "del" | "header" | "meta" | "normal";
}

interface DiffFile {
  filename: string;
  lines: DiffLine[];
}

const parsedDiffFiles = computed((): DiffFile[] => {
  if (!diffContent.value) return [];

  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;

  const lines = diffContent.value.split("\n");

  for (const line of lines) {
    // Detect new file start
    if (line.startsWith("diff --git")) {
      // Extract filename from "diff --git a/path/to/file b/path/to/file"
      const match = line.match(/diff --git a\/(.+?) b\//);
      const filename = match ? match[1] : "Unknown file";

      currentFile = { filename, lines: [] };
      files.push(currentFile);
    }

    if (currentFile) {
      let type: "add" | "del" | "header" | "meta" | "normal" = "normal";

      if (line.startsWith("+") && !line.startsWith("+++")) {
        type = "add";
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        type = "del";
      } else if (line.startsWith("@@")) {
        type = "header";
      } else if (
        line.startsWith("diff ") ||
        line.startsWith("index ") ||
        line.startsWith("---") ||
        line.startsWith("+++")
      ) {
        type = "meta";
      }

      currentFile.lines.push({ content: line, type });
    }
  }

  return files;
});

function closeDiffModal() {
  showDiffModal.value = false;
  diffContent.value = "";
  diffModalTitle.value = "";
}

async function handleViewFileDiff(path: string, staged: boolean) {
  if (!repositoryStore.currentRepository) return;

  diffModalTitle.value = `${staged ? "Staged" : "Unstaged"}: ${path}`;
  diffContent.value = "Loading...";
  showDiffModal.value = true;

  const diff = await window.electronAPI.getFileDiff(
    repositoryStore.currentRepository,
    path,
    staged
  );
  diffContent.value = diff || "No changes to show.";
}

async function handleViewStagedDiff() {
  if (!repositoryStore.currentRepository) return;

  diffModalTitle.value = "Tất cả thay đổi đã Stage";
  diffContent.value = "Loading...";
  showDiffModal.value = true;

  const diff = await window.electronAPI.getStagedDiff(
    repositoryStore.currentRepository
  );
  diffContent.value = diff || "No staged changes.";
}

async function handleViewUnstagedDiff() {
  if (!repositoryStore.currentRepository) return;

  diffModalTitle.value = "Tất cả thay đổi chưa Stage";
  diffContent.value = "Loading...";
  showDiffModal.value = true;

  const diff = await window.electronAPI.getUnstagedDiff(
    repositoryStore.currentRepository
  );
  diffContent.value = diff || "No unstaged changes.";
}

async function handleStageAll() {
  if (!repositoryStore.currentRepository) return;
  isStaging.value = true;
  await window.electronAPI.stageAll(repositoryStore.currentRepository);
  await repositoryStore.loadGitStatus();
  isStaging.value = false;
}

async function handleUnstageAll() {
  if (!repositoryStore.currentRepository) return;
  isStaging.value = true;
  await window.electronAPI.unstageAll(repositoryStore.currentRepository);
  await repositoryStore.loadGitStatus();
  isStaging.value = false;
}

async function handleDiscard(path: string) {
  if (!repositoryStore.currentRepository) return;
  if (
    !confirm(
      `Bạn có chắc chắn muốn hủy thay đổi của "${path}"? Hành động này không thể hoàn tác.`
    )
  ) {
    return;
  }

  isStaging.value = true;
  await window.electronAPI.discardFile(repositoryStore.currentRepository, path);
  await repositoryStore.loadGitStatus();
  isStaging.value = false;
}

async function handleDiscardAll() {
  if (!repositoryStore.currentRepository) return;
  if (
    !confirm(
      "Bạn có chắc chắn muốn hủy TẤT CẢ thay đổi? Hành động này không thể hoàn tác."
    )
  ) {
    return;
  }

  isStaging.value = true;
  await window.electronAPI.discardAll(repositoryStore.currentRepository);
  await repositoryStore.loadGitStatus();
  isStaging.value = false;
}
</script>
