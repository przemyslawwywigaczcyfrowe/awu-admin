import type { AppraisalStatus } from './enums'
import type { AppraisalProduct } from './product.types'
import type { Contract } from './contract.types'
import type { CommunicationMessage } from './communication.types'
import type { Shipment } from './shipping.types'

export interface ClientDetails {
  id: number
  name: string
  email: string
  phoneNumber: string
  address?: {
    street: string
    number: string
    local: string
    postal: string
    city: string
  }
  isCompany: boolean
  nip?: string
  companyName?: string
}

export interface AgreementType {
  id: number
  name: string
}

export interface PaymentType {
  id: number
  name: string
}

export interface CollectionType {
  id: number
  name: string
}

export interface AppraisalVersion {
  versionNumber: number
  createdAt: string
  createdBy: string
  createdByOperatorId: number
  reason: string
  products: AppraisalProduct[]
  totalPriceTransfer: number
  totalPriceGiftCard: number
}

export interface AuditLogEntry {
  id: number
  timestamp: string
  operatorId: number
  operatorName: string
  locationName: string
  action: string
  details: string
  previousValue?: string
  newValue?: string
}

export interface Appraisal {
  id: number
  appraisalNumber: string
  createdAt: string
  expiryDate: string | null
  status: AppraisalStatus
  trackingNumber: string | null
  client: ClientDetails
  locationId: number
  locationName: string
  assignedOperatorId: number | null
  assignedOperatorName: string | null
  agreementType: AgreementType
  paymentType: PaymentType
  collectionType: CollectionType
  products: AppraisalProduct[]
  versions: AppraisalVersion[]
  contracts: Contract[]
  communications: CommunicationMessage[]
  shipments: Shipment[]
  auditLog: AuditLogEntry[]
  offerClientComment: string
  customerDecision: string | null
  expertiseResult: string | null
  expertiseDate: string | null
  totalPriceTransfer: number
  totalPriceGiftCard: number
}

export interface AppraisalListItem {
  id: number
  appraisalNumber: string
  createdAt: string
  status: AppraisalStatus
  trackingNumber: string | null
  clientName: string
  clientEmail: string
  productCount: number
  locationName: string
  assignedOperatorName: string | null
  totalPriceTransfer: number
  totalPriceGiftCard: number
  customerDecision: string | null
}
