import type { ContractType, ContractSubtype, ContractStatus } from './enums'

export interface Contract {
  id: number
  appraisalId: number
  type: ContractType
  subtype: ContractSubtype
  number: string
  date: string
  status: ContractStatus
  documentUrl: string | null
  createdBy: string
  createdAt: string
}

export interface HandoverProtocol {
  id: number
  appraisalId: number
  date: string
  clientName: string
  clientPhone: string
  clientEmail: string
  products: {
    name: string
    serialNumber: string
    accessories: string[]
    condition: string
  }[]
  locationName: string
  operatorName: string
  notes: string
}
