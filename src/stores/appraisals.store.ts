import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AppraisalListItem } from '@/types/appraisal.types'
import type { AppraisalFilters } from '@/types/filters.types'
import type { AppraisalStatus } from '@/types/enums'

const STORAGE_PREFIX = 'awu_appraisal_'

export const useAppraisalsStore = defineStore('appraisals', () => {
  // --- State ---
  const appraisals = ref<AppraisalListItem[]>([])
  const loading = ref(false)
  const filters = ref<AppraisalFilters>({
    search: '',
    trackingNumber: '',
    customerEmail: '',
    appraisalNumber: '',
    status: null,
    dateFrom: null,
    dateTo: null,
    locationId: null,
    operatorId: null
  })
  const sortField = ref<string>('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')
  const page = ref(1)
  const pageSize = ref(20)

  // --- Getters ---
  const filteredAppraisals = computed(() => {
    let result = [...appraisals.value]

    // Search filter (matches appraisalNumber, clientName, clientEmail)
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      result = result.filter(
        (a) =>
          a.appraisalNumber.toLowerCase().includes(searchLower) ||
          a.clientName.toLowerCase().includes(searchLower) ||
          a.clientEmail.toLowerCase().includes(searchLower)
      )
    }

    // Tracking number filter
    if (filters.value.trackingNumber) {
      const trackingLower = filters.value.trackingNumber.toLowerCase()
      result = result.filter(
        (a) => a.trackingNumber && a.trackingNumber.toLowerCase().includes(trackingLower)
      )
    }

    // Customer email filter
    if (filters.value.customerEmail) {
      const emailLower = filters.value.customerEmail.toLowerCase()
      result = result.filter((a) => a.clientEmail.toLowerCase().includes(emailLower))
    }

    // Appraisal number filter
    if (filters.value.appraisalNumber) {
      const numLower = filters.value.appraisalNumber.toLowerCase()
      result = result.filter((a) => a.appraisalNumber.toLowerCase().includes(numLower))
    }

    // Status filter
    if (filters.value.status !== null) {
      result = result.filter((a) => a.status === filters.value.status)
    }

    // Date range filter
    if (filters.value.dateFrom) {
      const fromTime = filters.value.dateFrom.getTime()
      result = result.filter((a) => new Date(a.createdAt).getTime() >= fromTime)
    }
    if (filters.value.dateTo) {
      const toTime = filters.value.dateTo.getTime()
      result = result.filter((a) => new Date(a.createdAt).getTime() <= toTime)
    }

    // Location filter
    if (filters.value.locationId !== null) {
      result = result.filter((a) => a.locationName !== null)
    }

    // Operator filter
    if (filters.value.operatorId !== null) {
      result = result.filter((a) => a.assignedOperatorName !== null)
    }

    // Sorting
    result.sort((a, b) => {
      const fieldA = a[sortField.value as keyof AppraisalListItem]
      const fieldB = b[sortField.value as keyof AppraisalListItem]

      if (fieldA === null || fieldA === undefined) return 1
      if (fieldB === null || fieldB === undefined) return -1

      let comparison = 0
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        comparison = fieldA.localeCompare(fieldB)
      } else if (typeof fieldA === 'number' && typeof fieldB === 'number') {
        comparison = fieldA - fieldB
      } else {
        comparison = String(fieldA).localeCompare(String(fieldB))
      }

      return sortOrder.value === 'asc' ? comparison : -comparison
    })

    return result
  })

  const statusCounts = computed(() => {
    const counts: Record<number, number> = {}
    for (const appraisal of appraisals.value) {
      counts[appraisal.status] = (counts[appraisal.status] || 0) + 1
    }
    return counts
  })

  const totalPages = computed(() => {
    return Math.ceil(filteredAppraisals.value.length / pageSize.value)
  })

  // --- Actions ---
  async function loadAppraisals(): Promise<void> {
    loading.value = true
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Dynamic import of mock data (will be created as mock grows)
      try {
        const module = await import('@/mock/data/appraisals.json')
        appraisals.value = module.default as AppraisalListItem[]
      } catch {
        // If no mock data file exists yet, start with empty array
        appraisals.value = []
      }

      // Overlay localStorage changes onto list items
      // (detail store persists full appraisal; we sync key fields back to the list)
      for (const item of appraisals.value) {
        try {
          const cached = localStorage.getItem(`${STORAGE_PREFIX}${item.id}`)
          if (cached) {
            const detail = JSON.parse(cached)
            if (detail.status !== undefined) item.status = detail.status
            if (detail.assignedOperatorName !== undefined) item.assignedOperatorName = detail.assignedOperatorName
            if (detail.assignedOperatorId !== undefined) item.assignedOperatorId = detail.assignedOperatorId
          }
        } catch {
          // Corrupted entry — skip
        }
      }
    } finally {
      loading.value = false
    }
  }

  function setFilter<K extends keyof AppraisalFilters>(key: K, value: AppraisalFilters[K]): void {
    filters.value[key] = value
    page.value = 1
  }

  function clearFilters(): void {
    filters.value = {
      search: '',
      trackingNumber: '',
      customerEmail: '',
      appraisalNumber: '',
      status: null,
      dateFrom: null,
      dateTo: null,
      locationId: null,
      operatorId: null
    }
    page.value = 1
  }

  function findByTrackingNumber(trackingNumber: string): AppraisalListItem | undefined {
    return appraisals.value.find(
      (a) =>
        a.trackingNumber !== null &&
        a.trackingNumber.toLowerCase() === trackingNumber.toLowerCase()
    )
  }

  return {
    // State
    appraisals,
    loading,
    filters,
    sortField,
    sortOrder,
    page,
    pageSize,
    // Getters
    filteredAppraisals,
    statusCounts,
    totalPages,
    // Actions
    loadAppraisals,
    setFilter,
    clearFilters,
    findByTrackingNumber
  }
})
