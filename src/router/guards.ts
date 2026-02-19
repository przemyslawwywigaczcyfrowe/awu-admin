import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

export function setupGuards(router: Router): void {
  router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()

    // Ensure auth state is loaded from localStorage on first navigation
    if (!authStore.isAuthenticated) {
      authStore.checkAuth()
    }

    const requiresAuth = to.meta.requiresAuth !== false

    if (requiresAuth && !authStore.isAuthenticated) {
      // Not authenticated, redirect to login
      next({ name: 'Login' })
    } else if (to.name === 'Login' && authStore.isAuthenticated) {
      // Already authenticated, redirect to dashboard
      next({ name: 'Dashboard' })
    } else {
      next()
    }
  })
}
