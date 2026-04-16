import type { RouteRecordRaw } from "vue-router";
import ConversationDetailPage from "./pages/ConversationDetailPage.vue";
import ConversationListPage from "./pages/ConversationListPage.vue";
import DashboardPage from "./pages/DashboardPage.vue";
import MemoryEditPage from "./pages/MemoryEditPage.vue";
import MemoryListPage from "./pages/MemoryListPage.vue";
import ProjectDetailPage from "./pages/ProjectDetailPage.vue";
import ProjectListPage from "./pages/ProjectListPage.vue";
import SearchPage from "./pages/SearchPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", component: DashboardPage },
  { path: "/conversations", component: ConversationListPage },
  { path: "/conversations/:id(.*)", component: ConversationDetailPage },
  { path: "/projects", component: ProjectListPage },
  { path: "/projects/:id(.*)", component: ProjectDetailPage },
  { path: "/memory", component: MemoryListPage },
  { path: "/memory/:id(.*)/edit", component: MemoryEditPage },
  { path: "/search", component: SearchPage },
  { path: "/settings", component: SettingsPage },
];
