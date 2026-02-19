import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { CommunicationMessage } from '@/types/communication.types'
import { MessageType } from '@/types/enums'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export const useCommunicationStore = defineStore('communication', () => {
  // --- State ---
  const communications = ref<CommunicationMessage[]>([])
  const loading = ref(false)

  // --- Getters ---
  const messageCount = computed(() => communications.value.length)

  // --- Actions ---
  async function loadCommunications(): Promise<void> {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Mock data
      communications.value = [
        {
          id: 1,
          appraisalId: 1,
          type: MessageType.EMAIL_SENT,
          from: 'system@cyfrowe.pl',
          to: 'klient1@example.com',
          subject: 'Potwierdzenie przyjęcia wyceny',
          body: 'Szanowny Kliencie, potwierdzamy przyjęcie Twojej wyceny nr AWU-2026-0001. Skontaktujemy się wkrótce.',
          timestamp: '2026-01-15T10:30:00',
          status: 'delivered'
        },
        {
          id: 2,
          appraisalId: 1,
          type: MessageType.SMS_SENT,
          from: 'AWU',
          to: '+48600100200',
          subject: null,
          body: 'AWU: Wycena AWU-2026-0001 została zaakceptowana. Szczegóły na e-mail.',
          timestamp: '2026-01-16T09:00:00',
          status: 'sent'
        },
        {
          id: 3,
          appraisalId: 1,
          type: MessageType.EMAIL_RECEIVED,
          from: 'klient1@example.com',
          to: 'system@cyfrowe.pl',
          subject: 'Re: Potwierdzenie przyjęcia wyceny',
          body: 'Dziękuję za informację. Czekam na dalsze kroki.',
          timestamp: '2026-01-16T11:45:00',
          status: 'read'
        },
        {
          id: 4,
          appraisalId: 2,
          type: MessageType.EMAIL_SENT,
          from: 'system@cyfrowe.pl',
          to: 'firma@example.com',
          subject: 'Wycena produktów - faktura VAT',
          body: 'W załączeniu przesyłamy wycenę produktów wraz z proformą faktury VAT.',
          timestamp: '2026-01-20T15:00:00',
          status: 'delivered'
        },
        {
          id: 5,
          appraisalId: 3,
          type: MessageType.SYSTEM,
          from: 'system',
          to: 'operator',
          subject: 'Automatyczna notyfikacja',
          body: 'Wycena AWU-2026-0003 oczekuje na weryfikację.',
          timestamp: '2026-02-05T09:20:00',
          status: 'delivered'
        }
      ]
    } finally {
      loading.value = false
    }
  }

  function getByAppraisalId(appraisalId: number): CommunicationMessage[] {
    return communications.value.filter((c) => c.appraisalId === appraisalId)
  }

  function sendMessage(
    appraisalId: number,
    type: 'email' | 'sms',
    subject: string | null,
    body: string,
    to: string
  ): CommunicationMessage {
    const messageType = type === 'email' ? MessageType.EMAIL_SENT : MessageType.SMS_SENT
    const now = new Date().toISOString()

    const newMessage: CommunicationMessage = {
      id: parseInt(generateId(), 36),
      appraisalId,
      type: messageType,
      from: type === 'email' ? 'system@cyfrowe.pl' : 'AWU',
      to,
      subject: type === 'email' ? subject : null,
      body,
      timestamp: now,
      status: 'sent'
    }

    communications.value.push(newMessage)
    return newMessage
  }

  function getThread(appraisalId: number): CommunicationMessage[] {
    return communications.value
      .filter((c) => c.appraisalId === appraisalId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  return {
    // State
    communications,
    loading,
    // Getters
    messageCount,
    // Actions
    loadCommunications,
    getByAppraisalId,
    sendMessage,
    getThread
  }
})
