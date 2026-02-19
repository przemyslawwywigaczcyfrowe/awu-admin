import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AdminUser } from '@/types/user.types'
import { UserRole } from '@/types/enums'
import mockUsers from '@/mock/data/users.json'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export const useUsersStore = defineStore('users', () => {
  // --- State ---
  const users = ref<AdminUser[]>([])
  const loading = ref(false)

  // --- Getters ---
  const activeUsers = computed(() =>
    users.value.filter((u) => u.lastLoginAt !== null)
  )

  const operatorCount = computed(() =>
    users.value.filter((u) => u.role === UserRole.OPERATOR).length
  )

  const adminCount = computed(() =>
    users.value.filter((u) => u.role === UserRole.ADMIN).length
  )

  const seniorOperatorCount = computed(() =>
    users.value.filter((u) => u.role === UserRole.SENIOR_OPERATOR).length
  )

  const totalCount = computed(() => users.value.length)

  // --- Actions ---
  async function loadUsers(): Promise<void> {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      users.value = (mockUsers as AdminUser[]).map((u) => {
        const user = { ...u }
        delete user.password
        return user
      })
    } finally {
      loading.value = false
    }
  }

  function getUserById(id: number): AdminUser | undefined {
    return users.value.find((u) => u.id === id)
  }

  function createUser(userData: Omit<AdminUser, 'id' | 'createdAt' | 'lastLoginAt'>): AdminUser {
    const now = new Date().toISOString()
    const newUser: AdminUser = {
      ...userData,
      id: parseInt(generateId(), 36),
      createdAt: now,
      lastLoginAt: null
    }

    users.value.push(newUser)
    return newUser
  }

  function updateUser(id: number, userData: Partial<AdminUser>): boolean {
    const index = users.value.findIndex((u) => u.id === id)
    if (index === -1) return false

    users.value[index] = { ...users.value[index], ...userData, id }
    return true
  }

  function deleteUser(id: number): boolean {
    const index = users.value.findIndex((u) => u.id === id)
    if (index === -1) return false

    users.value.splice(index, 1)
    return true
  }

  function getUsersByLocation(locationId: number): AdminUser[] {
    return users.value.filter((u) => u.locationId === locationId)
  }

  function getUsersByRole(role: UserRole): AdminUser[] {
    return users.value.filter((u) => u.role === role)
  }

  return {
    // State
    users,
    loading,
    // Getters
    activeUsers,
    operatorCount,
    adminCount,
    seniorOperatorCount,
    totalCount,
    // Actions
    loadUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUsersByLocation,
    getUsersByRole
  }
})
