import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', () => {
  // --- State ---
  const sidebarCollapsed = ref(false)
  const loading = ref(false)

  // --- Actions ---
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setLoading(value: boolean): void {
    loading.value = value
  }

  return {
    // State
    sidebarCollapsed,
    loading,
    // Actions
    toggleSidebar,
    setLoading
  }
})
