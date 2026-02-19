import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Shipment, DeliveryAddress } from '@/types/shipping.types'
import { ShipmentType, ShipmentStatus } from '@/types/enums'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

function generateDpdTrackingNumber(): string {
  // DPD tracking numbers are typically 14 digits
  const digits = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('')
  return digits
}

function generateInPostReturnNumber(): string {
  // 10-digit InPost return number
  const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')
  return digits
}

export const useShippingStore = defineStore('shipping', () => {
  // --- State ---
  const shipments = ref<Shipment[]>([])
  const loading = ref(false)

  // --- Getters ---
  const shipmentCount = computed(() => shipments.value.length)

  const activeShipments = computed(() =>
    shipments.value.filter(
      (s) => s.status !== ShipmentStatus.DELIVERED && s.status !== ShipmentStatus.RETURNED
    )
  )

  // --- Actions ---
  async function loadShipments(): Promise<void> {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Mock data
      shipments.value = [
        {
          id: 1,
          appraisalId: 1,
          type: ShipmentType.INCOMING_COURIER,
          trackingNumber: '12345678901234',
          inpostReturnNumber: null,
          carrier: 'dpd',
          status: ShipmentStatus.DELIVERED,
          address: {
            name: 'Jan Kowalski',
            phone: '+48600100200',
            street: 'ul. Marszałkowska',
            number: '10',
            local: '5',
            postal: '00-001',
            city: 'Warszawa'
          },
          createdAt: '2026-01-14T08:00:00',
          updatedAt: '2026-01-15T09:30:00'
        },
        {
          id: 2,
          appraisalId: 2,
          type: ShipmentType.INCOMING_SALON,
          trackingNumber: null,
          inpostReturnNumber: null,
          carrier: 'self',
          status: ShipmentStatus.DELIVERED,
          address: null,
          createdAt: '2026-01-20T10:00:00',
          updatedAt: '2026-01-20T10:00:00'
        },
        {
          id: 3,
          appraisalId: 3,
          type: ShipmentType.RETURN_INPOST,
          trackingNumber: null,
          inpostReturnNumber: '1234567890',
          carrier: 'inpost',
          status: ShipmentStatus.ORDERED,
          address: null,
          createdAt: '2026-02-10T14:00:00',
          updatedAt: '2026-02-10T14:00:00'
        },
        {
          id: 4,
          appraisalId: 1,
          type: ShipmentType.RETURN_COURIER,
          trackingNumber: '98765432109876',
          inpostReturnNumber: null,
          carrier: 'dpd',
          status: ShipmentStatus.IN_TRANSIT,
          address: {
            name: 'Jan Kowalski',
            phone: '+48600100200',
            street: 'ul. Marszałkowska',
            number: '10',
            local: '5',
            postal: '00-001',
            city: 'Warszawa'
          },
          createdAt: '2026-02-15T11:00:00',
          updatedAt: '2026-02-16T08:00:00'
        }
      ]
    } finally {
      loading.value = false
    }
  }

  function getByAppraisalId(appraisalId: number): Shipment[] {
    return shipments.value.filter((s) => s.appraisalId === appraisalId)
  }

  function createCourierOrder(appraisalId: number, address: DeliveryAddress): Shipment {
    const now = new Date().toISOString()
    const newShipment: Shipment = {
      id: parseInt(generateId(), 36),
      appraisalId,
      type: ShipmentType.RETURN_COURIER,
      trackingNumber: generateDpdTrackingNumber(),
      inpostReturnNumber: null,
      carrier: 'dpd',
      status: ShipmentStatus.ORDERED,
      address,
      createdAt: now,
      updatedAt: now
    }

    shipments.value.push(newShipment)
    return newShipment
  }

  function generateInPostReturn(appraisalId: number): Shipment {
    const now = new Date().toISOString()
    const newShipment: Shipment = {
      id: parseInt(generateId(), 36),
      appraisalId,
      type: ShipmentType.RETURN_INPOST,
      trackingNumber: null,
      inpostReturnNumber: generateInPostReturnNumber(),
      carrier: 'inpost',
      status: ShipmentStatus.ORDERED,
      address: null,
      createdAt: now,
      updatedAt: now
    }

    shipments.value.push(newShipment)
    return newShipment
  }

  function updateShipmentStatus(shipmentId: number, newStatus: ShipmentStatus): boolean {
    const shipment = shipments.value.find((s) => s.id === shipmentId)
    if (!shipment) return false

    shipment.status = newStatus
    shipment.updatedAt = new Date().toISOString()
    return true
  }

  return {
    // State
    shipments,
    loading,
    // Getters
    shipmentCount,
    activeShipments,
    // Actions
    loadShipments,
    getByAppraisalId,
    createCourierOrder,
    generateInPostReturn,
    updateShipmentStatus
  }
})
