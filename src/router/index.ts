import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/HomeView.vue"),
  },
  {
    path: "/graph",
    name: "graph",
    component: () => import("@/views/GraphView.vue"),
  },
  {
    path: "/analysis",
    name: "analysis",
    component: () => import("@/views/AnalysisView.vue"),
  },
  {
    path: "/timeline",
    name: "timeline",
    component: () => import("@/views/TimelineView.vue"),
  },
  {
    path: "/changes",
    name: "changes",
    component: () => import("@/views/ChangesView.vue"),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
