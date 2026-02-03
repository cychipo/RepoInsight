<template>
  <div class="p-8 max-w-4xl mx-auto h-full overflow-y-auto">
    <div class="flex items-center gap-4 mb-8">
      <h1 class="text-3xl font-bold uppercase tracking-tight">
        ⚙ CÀI ĐẶT
      </h1>
    </div>

    <div class="flex flex-col gap-8">
      <!-- Git Configuration -->
      <section class="card shadow-brutal border-4 border-neo-black bg-white p-6">
        <div class="flex items-center gap-3 mb-6 border-b-4 border-neo-black pb-4">
          <div class="text-3xl">👤</div>
          <div>
            <h2 class="text-xl font-bold uppercase">CẤU HÌNH GIT (KHO HIỆN TẠI)</h2>
            <p class="text-stone-500 font-medium text-sm">
              Thông tin định danh cho các commit trong kho: <span class="font-bold font-mono">{{ repositoryStore.repositoryName }}</span>
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div class="form-group">
            <label class="font-bold mb-1 block">TÊN HIỂN THỊ (user.name)</label>
            <input
              v-model="gitName"
              type="text"
              class="w-full p-3 border-2 border-neo-black font-mono focus:bg-neo-yellow focus:outline-none transition-colors"
              placeholder="Ví dụ: Nguyen Van A"
            />
          </div>

          <div class="form-group">
            <label class="font-bold mb-1 block">EMAIL (user.email)</label>
            <input
              v-model="gitEmail"
              type="email"
              class="w-full p-3 border-2 border-neo-black font-mono focus:bg-neo-yellow focus:outline-none transition-colors"
              placeholder="Ví dụ: email@example.com"
            />
          </div>
        </div>
      </section>

      <!-- AI Configuration -->
      <section class="card shadow-brutal border-4 border-neo-black bg-white p-6">
        <div class="flex items-center gap-3 mb-6 border-b-4 border-neo-black pb-4">
          <div class="text-3xl">🤖</div>
          <div>
            <h2 class="text-xl font-bold uppercase">CẤU HÌNH AI (GEMINI)</h2>
            <p class="text-stone-500 font-medium text-sm">API Key để sử dụng các tính năng thông minh</p>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div class="form-group">
            <label class="font-bold mb-1 block">GEMINI API KEY</label>
            <div class="relative">
              <input
                v-model="apiKey"
                :type="showApiKey ? 'text' : 'password'"
                class="w-full p-3 border-2 border-neo-black font-mono focus:bg-neo-yellow focus:outline-none transition-colors pr-12"
                placeholder="Nhập API Key từ Google AI Studio"
              />
              <button
                @click="showApiKey = !showApiKey"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-xl opacity-50 hover:opacity-100"
              >
                {{ showApiKey ? '👁' : '👁‍🗨' }}
              </button>
            </div>
            <p class="text-xs text-stone-500 mt-2 font-medium">
              Key được lưu trữ cục bộ trong thư mục cấu hình của ứng dụng.
            </p>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex justify-end gap-4 mt-4">
        <button
          @click="saveSettings"
          class="btn btn-primary px-8 py-3 text-lg flex items-center gap-2"
          :disabled="isSaving"
        >
          {{ isSaving ? '⏳ ĐANG LƯU...' : '💾 LƯU CẤU HÌNH' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRepositoryStore } from '@/stores/repository';
import { useRouter } from 'vue-router';

const repositoryStore = useRepositoryStore();
const router = useRouter();

const gitName = ref('');
const gitEmail = ref('');
const apiKey = ref('');
const showApiKey = ref(false);
const isSaving = ref(false);

async function loadSettings() {
  if (!repositoryStore.currentRepository) {
     router.push('/');
     return;
  }

  try {
    const repoPath = repositoryStore.currentRepository;
    gitName.value = await window.electronAPI.getGitConfig('user.name', repoPath);
    gitEmail.value = await window.electronAPI.getGitConfig('user.email', repoPath);
    apiKey.value = await window.electronAPI.getApiKey();
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
}

onMounted(() => {
  loadSettings();
});

// Reload if repository changes (though the route guard in App.vue might prevent access)
watch(() => repositoryStore.currentRepository, () => {
    loadSettings();
});

async function saveSettings() {
  if (!repositoryStore.currentRepository) return;

  isSaving.value = true;
  try {
    const repoPath = repositoryStore.currentRepository;
    await window.electronAPI.setGitConfig('user.name', gitName.value, repoPath);
    await window.electronAPI.setGitConfig('user.email', gitEmail.value, repoPath);
    await window.electronAPI.setApiKey(apiKey.value);
    alert('Đã lưu cấu hình thành công!');
  } catch (e) {
    console.error("Failed to save settings:", e);
    alert('Lỗi khi lưu cấu hình.');
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.form-group input:focus {
  box-shadow: 4px 4px 0 var(--neo-black);
  transform: translate(-2px, -2px);
}
</style>
