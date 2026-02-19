import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@/types/enums'

export function usePermissions() {
  const authStore = useAuthStore()

  const canManualPrice = computed(() => {
    if (!authStore.user) return false
    return authStore.user.permissions.includes('manual_price')
  })

  const isAdmin = computed(() => {
    if (!authStore.user) return false
    return authStore.user.role === UserRole.ADMIN
  })

  const canAssignOperator = computed(() => {
    if (!authStore.user) return false
    return (
      authStore.user.role === UserRole.ADMIN ||
      authStore.user.role === UserRole.SENIOR_OPERATOR
    )
  })

  return {
    canManualPrice,
    isAdmin,
    canAssignOperator
  }
}
