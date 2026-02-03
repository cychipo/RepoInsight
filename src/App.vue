<template>
  <div class="h-full flex bg-neo-cream overflow-hidden">
    <!-- Neo-Brutalism Sidebar -->
    <aside
      class="w-[220px] min-w-[220px] h-full flex flex-col bg-neo-white border-r-4 border-neo-black">
      <div class="p-6 border-b-4 border-neo-black bg-neo-yellow">
        <div class="flex items-center gap-2">
          <div class="relative w-9 h-9">
            <span
              class="absolute w-3 h-3 border-3 border-neo-black bg-neo-blue top-0 left-1/2 -translate-x-1/2"></span>
            <span
              class="absolute w-3 h-3 border-3 border-neo-black bg-neo-green bottom-0 left-[2px]"></span>
            <span
              class="absolute w-3 h-3 border-3 border-neo-black bg-neo-orange bottom-0 right-[2px]"></span>
          </div>
          <span class="text-base font-bold tracking-tight"
            >REPO<span
              class="bg-gradient-to-b from-transparent from-50% to-neo-yellow to-50% px-1"
              >INSIGHT</span
            ></span
          >
        </div>
      </div>

      <nav class="flex-1 p-4 flex flex-col gap-1">
        <router-link
          to="/"
          class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neo-black no-underline border-3 border-transparent transition-all hover:bg-neo-yellow hover:border-neo-black hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          active-class="bg-neo-pink !border-neo-black shadow-brutal"
          :class="{ 'opacity-40 pointer-events-none': false }">
          <span class="text-lg">◆</span>
          <span>TRANG CHỦ</span>
        </router-link>

        <router-link
          to="/graph"
          class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neo-black no-underline border-3 border-transparent transition-all hover:bg-neo-yellow hover:border-neo-black hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          active-class="bg-neo-pink !border-neo-black shadow-brutal"
          :class="{ 'opacity-40 pointer-events-none': !hasRepository }">
          <span class="text-lg">◈</span>
          <span>BIỂU ĐỒ</span>
        </router-link>

        <router-link
          to="/analysis"
          class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neo-black no-underline border-3 border-transparent transition-all hover:bg-neo-yellow hover:border-neo-black hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          active-class="bg-neo-pink !border-neo-black shadow-brutal"
          :class="{ 'opacity-40 pointer-events-none': !hasRepository }">
          <span class="text-lg">▤</span>
          <span>PHÂN TÍCH</span>
        </router-link>

        <router-link
          to="/timeline"
          class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neo-black no-underline border-3 border-transparent transition-all hover:bg-neo-yellow hover:border-neo-black hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          active-class="bg-neo-pink !border-neo-black shadow-brutal"
          :class="{ 'opacity-40 pointer-events-none': !hasRepository }">
          <span class="text-lg">◷</span>
          <span>DÒNG THỜI GIAN</span>
        </router-link>

        <router-link
          to="/settings"
          class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neo-black no-underline border-3 border-transparent transition-all hover:bg-neo-yellow hover:border-neo-black hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          active-class="bg-neo-pink !border-neo-black shadow-brutal"
          :class="{ 'opacity-40 pointer-events-none': !hasRepository }">
          <span class="text-lg">⚙</span>
          <span>CÀI ĐẶT</span>
        </router-link>

        <router-link
          to="/changes"
          class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neo-black no-underline border-3 border-transparent transition-all hover:bg-neo-yellow hover:border-neo-black hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          active-class="bg-neo-pink !border-neo-black shadow-brutal"
          :class="{ 'opacity-40 pointer-events-none': !hasRepository }">
          <span class="text-lg">⚡</span>
          <span>THAY ĐỔI</span>
        </router-link>
      </nav>

      <!-- Repository Info -->
      <div
        v-if="repositoryStore.currentRepository"
        class="p-4 border-t-4 border-neo-black bg-neo-blue">
        <div class="flex flex-col gap-1">
          <div
            class="inline-block px-2 py-0.5 text-[0.65rem] font-bold bg-neo-black text-neo-white self-start">
            KHO HOẠT ĐỘNG
          </div>
          <div class="font-bold text-sm truncate">
            {{ repositoryStore.repositoryName }}
          </div>
          <div class="flex items-center gap-1 text-xs font-semibold">
            <span class="text-base">⎇</span>
            <span class="truncate">{{
              repositoryStore.selectedBranch || repositoryStore.currentBranch
            }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 h-full overflow-auto bg-neo-cream">
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
