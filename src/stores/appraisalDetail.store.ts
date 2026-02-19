import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Appraisal, AppraisalVersion } from '@/types/appraisal.types'
import { AppraisalStatus } from '@/types/enums'
import { useAuthStore } from '@/stores/auth.store'

const STORAGE_PREFIX = 'awu_appraisal_'

export const useAppraisalDetailStore = defineStore('appraisalDetail', () => {
  // --- State ---
  const appraisal = ref<Appraisal | null>(null)
  const loading = ref(false)
  const saving = ref(false)

  // --- localStorage persistence helper ---
  function persistAppraisal(): void {
    if (appraisal.value) {
      const key = `${STORAGE_PREFIX}${appraisal.value.id}`
      try {
        localStorage.setItem(key, JSON.stringify(appraisal.value))
      } catch {
        // localStorage full or unavailable — silently ignore
      }
    }
  }

  // --- Getters ---
  const currentVersion = computed((): AppraisalVersion | null => {
    if (!appraisal.value || appraisal.value.versions.length === 0) return null
    return appraisal.value.versions.reduce((latest, version) =>
      version.versionNumber > latest.versionNumber ? version : latest
    )
  })

  const hasMismatch = computed((): boolean => {
    if (!appraisal.value) return false
    return appraisal.value.products.some((product) => {
      if (!product.verifiedRating || !product.declaredRating) return false
      return product.verifiedRating.id !== product.declaredRating.id
    })
  })

  const canEditPrice = computed((): boolean => {
    if (!appraisal.value) return false
    const authStore = useAuthStore()
    const editableStatuses: AppraisalStatus[] = [
      AppraisalStatus.W_TRAKCIE_WERYFIKACJI,
      AppraisalStatus.SKORYGOWANA
    ]
    const hasEditableStatus = editableStatuses.includes(appraisal.value.status)
    return hasEditableStatus && (authStore.canManualPrice || authStore.isAdmin)
  })

  // --- Actions ---
  async function loadAppraisal(id: number): Promise<void> {
    loading.value = true
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 400))

      // 1. Check localStorage first (persisted changes take priority)
      const cachedKey = `${STORAGE_PREFIX}${id}`
      try {
        const cached = localStorage.getItem(cachedKey)
        if (cached) {
          appraisal.value = JSON.parse(cached) as Appraisal
          return
        }
      } catch {
        // Corrupted localStorage entry — fall through to mock data
      }

      // 2. Fallback to mock JSON data
      try {
        const module = await import('@/mock/data/appraisals-detail.json')
        const allAppraisals = module.default as Appraisal[]
        const found = allAppraisals.find((a) => a.id === id)
        appraisal.value = found ?? null
      } catch {
        appraisal.value = null
      }
    } finally {
      loading.value = false
    }
  }

  async function saveVerification(): Promise<boolean> {
    if (!appraisal.value) return false

    saving.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      // In mock mode, just update the status
      if (appraisal.value.status === AppraisalStatus.W_TRAKCIE_WERYFIKACJI) {
        appraisal.value.status = AppraisalStatus.ZWERYFIKOWANA
      }

      const authStore = useAuthStore()
      appraisal.value.auditLog.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        operatorId: authStore.user?.id ?? 0,
        operatorName: authStore.user?.name ?? 'System',
        locationName: authStore.user?.locationName ?? '',
        action: 'Zapisano weryfikację',
        details: 'Weryfikacja produktów została zapisana'
      })

      persistAppraisal()
      return true
    } finally {
      saving.value = false
    }
  }

  async function createCorrectedVersion(reason: string): Promise<boolean> {
    if (!appraisal.value) return false

    saving.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const authStore = useAuthStore()
      const newVersionNumber =
        appraisal.value.versions.length > 0
          ? Math.max(...appraisal.value.versions.map((v) => v.versionNumber)) + 1
          : 1

      const newVersion: AppraisalVersion = {
        versionNumber: newVersionNumber,
        createdAt: new Date().toISOString(),
        createdBy: authStore.user?.name ?? 'System',
        createdByOperatorId: authStore.user?.id ?? 0,
        reason,
        products: JSON.parse(JSON.stringify(appraisal.value.products)),
        totalPriceTransfer: appraisal.value.totalPriceTransfer,
        totalPriceGiftCard: appraisal.value.totalPriceGiftCard
      }

      appraisal.value.versions.push(newVersion)
      appraisal.value.status = AppraisalStatus.SKORYGOWANA

      appraisal.value.auditLog.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        operatorId: authStore.user?.id ?? 0,
        operatorName: authStore.user?.name ?? 'System',
        locationName: authStore.user?.locationName ?? '',
        action: 'Utworzono skorygowaną wersję',
        details: `Wersja ${newVersionNumber}: ${reason}`
      })

      persistAppraisal()
      return true
    } finally {
      saving.value = false
    }
  }

  async function changeStatus(newStatus: AppraisalStatus): Promise<boolean> {
    if (!appraisal.value) return false

    saving.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))

      const authStore = useAuthStore()
      const previousStatus = appraisal.value.status

      appraisal.value.status = newStatus

      appraisal.value.auditLog.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        operatorId: authStore.user?.id ?? 0,
        operatorName: authStore.user?.name ?? 'System',
        locationName: authStore.user?.locationName ?? '',
        action: 'Zmiana statusu',
        details: `Zmieniono status wyceny`,
        previousValue: String(previousStatus),
        newValue: String(newStatus)
      })

      persistAppraisal()
      return true
    } finally {
      saving.value = false
    }
  }

  async function assignOperator(operatorId: number, operatorName: string): Promise<boolean> {
    if (!appraisal.value) return false

    saving.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))

      const authStore = useAuthStore()
      const previousOperator = appraisal.value.assignedOperatorName

      appraisal.value.assignedOperatorId = operatorId
      appraisal.value.assignedOperatorName = operatorName

      appraisal.value.auditLog.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        operatorId: authStore.user?.id ?? 0,
        operatorName: authStore.user?.name ?? 'System',
        locationName: authStore.user?.locationName ?? '',
        action: 'Przypisanie operatora',
        details: `Przypisano operatora: ${operatorName}`,
        previousValue: previousOperator ?? 'Brak',
        newValue: operatorName
      })

      persistAppraisal()
      return true
    } finally {
      saving.value = false
    }
  }

  function addCommunication(msg: { type: string; subject: string | null; body: string; to: string }): void {
    if (!appraisal.value) return
    const authStore = useAuthStore()
    const newMsg = {
      id: Date.now(),
      appraisalId: appraisal.value.id,
      type: msg.type as any,
      from: msg.type.includes('email') ? (authStore.user?.email ?? 'system@cyfrowe.pl') : 'AWU',
      to: msg.to,
      subject: msg.subject,
      body: msg.body,
      timestamp: new Date().toISOString(),
      status: 'sent' as const
    }
    appraisal.value.communications.push(newMsg)

    appraisal.value.auditLog.push({
      id: Date.now() + 1,
      timestamp: new Date().toISOString(),
      operatorId: authStore.user?.id ?? 0,
      operatorName: authStore.user?.name ?? 'System',
      locationName: authStore.user?.locationName ?? '',
      action: msg.type.includes('email') ? 'Wysłano email' : 'Wysłano SMS',
      details: msg.subject ? `Temat: ${msg.subject}` : msg.body.substring(0, 100)
    })

    persistAppraisal()
  }

  return {
    // State
    appraisal,
    loading,
    saving,
    // Getters
    currentVersion,
    hasMismatch,
    canEditPrice,
    // Actions
    loadAppraisal,
    saveVerification,
    createCorrectedVersion,
    changeStatus,
    assignOperator,
    addCommunication
  }
})
