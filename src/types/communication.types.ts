import type { MessageType } from './enums'

export interface CommunicationMessage {
  id: number
  appraisalId: number
  type: MessageType
  from: string
  to: string
  subject: string | null
  body: string
  timestamp: string
  status: 'sent' | 'delivered' | 'failed' | 'read'
}
