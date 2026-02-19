import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Location } from '@/types/location.types'
import mockLocations from '@/mock/data/locations.json'

export const useLocationsStore = defineStore('locations', () => {
  // --- State ---
  const locations = ref<Location[]>(mockLocations as Location[])

  // --- Getters ---
  const getLocationById = computed(() => {
    return (id: number): Location | undefined => {
      return locations.value.find((location) => location.id === id)
    }
  })

  const salons = computed(() => {
    return locations.value.filter((location) => location.type === 'salon')
  })

  const centrala = computed(() => {
    return locations.value.find((location) => location.type === 'centrala') ?? null
  })

  return {
    // State
    locations,
    // Getters
    getLocationById,
    salons,
    centrala
  }
})
