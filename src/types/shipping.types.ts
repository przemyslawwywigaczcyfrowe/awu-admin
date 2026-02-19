import type { ShipmentType, ShipmentStatus } from './enums'

export interface DeliveryAddress {
  name: string
  phone: string
  street: string
  number: string
  local: string
  postal: string
  city: string
}

export interface Shipment {
  id: number
  appraisalId: number
  type: ShipmentType
  trackingNumber: string | null
  inpostReturnNumber: string | null
  carrier: 'dpd' | 'inpost' | 'self'
  status: ShipmentStatus
  address: DeliveryAddress | null
  createdAt: string
  updatedAt: string
}
