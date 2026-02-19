<script setup lang="ts">
import { computed } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import { useUiStore } from '@/stores/ui.store'

const uiStore = useUiStore()

const sidebarClass = computed(() => ({
  'layout-sidebar': true,
  collapsed: uiStore.sidebarCollapsed
}))
</script>

<template>
  <div class="layout-wrapper">
    <aside :class="sidebarClass">
      <AppSidebar />
    </aside>

    <div class="layout-main">
      <AppTopbar class="layout-topbar" />

      <main class="layout-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout-wrapper {
  position: relative;
}

/* Mobile overlay when sidebar is open */
@media (max-width: 768px) {
  .layout-sidebar:not(.collapsed)::after {
    content: '';
    position: fixed;
    top: 0;
    left: var(--awu-sidebar-width);
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 999;
  }
}
</style>
