import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AdminUser } from '@/types/user.types'
import { UserRole } from '@/types/enums'
import mockUsers from '@/mock/data/users.json'

const STORAGE_KEY_USER = 'awu_admin_user'
const STORAGE_KEY_TOKEN = 'awu_admin_token'

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref<AdminUser | null>(null)
  const token = ref<string | null>(null)
  const isAuthenticated = ref(false)

  // --- Getters ---
  const canManualPrice = computed(() => {
    if (!user.value) return false
    return user.value.permissions.includes('manual_price')
  })

  const isAdmin = computed(() => {
    if (!user.value) return false
    return user.value.role === UserRole.ADMIN
  })

  const currentLocation = computed(() => {
    if (!user.value) return null
    return {
      id: user.value.locationId,
      name: user.value.locationName
    }
  })

  // --- Actions ---
  function login(email: string, password: string): boolean {
    const foundUser = (mockUsers as AdminUser[]).find(
      (u) => u.email === email && u.password === password
    )

    if (!foundUser) {
      return false
    }

    const authenticatedUser: AdminUser = { ...foundUser }
    delete authenticatedUser.password

    const generatedToken = `mock-jwt-${Date.now()}-${Math.random().toString(36).substring(2)}`

    user.value = authenticatedUser
    token.value = generatedToken
    isAuthenticated.value = true

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authenticatedUser))
    localStorage.setItem(STORAGE_KEY_TOKEN, generatedToken)

    return true
  }

  function logout(): void {
    user.value = null
    token.value = null
    isAuthenticated.value = false

    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
  }

  function checkAuth(): void {
    const storedUser = localStorage.getItem(STORAGE_KEY_USER)
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN)

    if (storedUser && storedToken) {
      try {
        user.value = JSON.parse(storedUser) as AdminUser
        token.value = storedToken
        isAuthenticated.value = true
      } catch {
        logout()
      }
    }
  }

  return {
    // State
    user,
    token,
    isAuthenticated,
    // Getters
    canManualPrice,
    isAdmin,
    currentLocation,
    // Actions
    login,
    logout,
    checkAuth
  }
})
