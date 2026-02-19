import type { AppraisalStatus } from './enums'

export interface AppraisalFilters {
  search: string
  trackingNumber: string
  customerEmail: string
  appraisalNumber: string
  status: AppraisalStatus | null
  dateFrom: Date | null
  dateTo: Date | null
  locationId: number | null
  operatorId: number | null
}
