import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Contract } from '@/types/contract.types'
import { ContractType, ContractSubtype, ContractStatus } from '@/types/enums'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

function generateContractNumber(type: ContractType): string {
  const prefix = type === ContractType.UMOWA_KUPNA ? 'UK' : 'FV'
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
  return `${prefix}/${year}/${month}/${seq}`
}

export const useContractsStore = defineStore('contracts', () => {
  // --- State ---
  const contracts = ref<Contract[]>([])
  const loading = ref(false)

  // --- Getters ---
  const contractCount = computed(() => contracts.value.length)

  // --- Actions ---
  async function loadContracts(): Promise<void> {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Mock data
      contracts.value = [
        {
          id: 1,
          appraisalId: 1,
          type: ContractType.UMOWA_KUPNA,
          subtype: ContractSubtype.PHYSICAL_PERSON,
          number: 'UK/2026/01/0001',
          date: '2026-01-15T10:00:00',
          status: ContractStatus.SIGNED,
          documentUrl: null,
          createdBy: 'Ewelina Kostro',
          createdAt: '2026-01-15T10:00:00'
        },
        {
          id: 2,
          appraisalId: 2,
          type: ContractType.FAKTURA_VAT,
          subtype: ContractSubtype.BUSINESS,
          number: 'FV/2026/01/0002',
          date: '2026-01-20T14:30:00',
          status: ContractStatus.SENT,
          documentUrl: null,
          createdBy: 'Paweł Ostęp',
          createdAt: '2026-01-20T14:30:00'
        },
        {
          id: 3,
          appraisalId: 3,
          type: ContractType.UMOWA_KUPNA,
          subtype: ContractSubtype.PHYSICAL_PERSON_VAT,
          number: 'UK/2026/02/0003',
          date: '2026-02-05T09:15:00',
          status: ContractStatus.GENERATED,
          documentUrl: null,
          createdBy: 'Tomasz Tokarczyk',
          createdAt: '2026-02-05T09:15:00'
        }
      ]
    } finally {
      loading.value = false
    }
  }

  function getContractsByAppraisalId(appraisalId: number): Contract[] {
    return contracts.value.filter((c) => c.appraisalId === appraisalId)
  }

  function generateContract(
    appraisalId: number,
    type: ContractType,
    subtype: ContractSubtype
  ): Contract {
    const now = new Date().toISOString()
    const newContract: Contract = {
      id: parseInt(generateId(), 36),
      appraisalId,
      type,
      subtype,
      number: generateContractNumber(type),
      date: now,
      status: ContractStatus.GENERATED,
      documentUrl: null,
      createdBy: 'System',
      createdAt: now
    }

    contracts.value.push(newContract)
    return newContract
  }

  function updateContractStatus(contractId: number, newStatus: ContractStatus): boolean {
    const contract = contracts.value.find((c) => c.id === contractId)
    if (!contract) return false

    contract.status = newStatus
    return true
  }

  function getContractById(id: number): Contract | undefined {
    return contracts.value.find((c) => c.id === id)
  }

  return {
    // State
    contracts,
    loading,
    // Getters
    contractCount,
    // Actions
    loadContracts,
    getContractsByAppraisalId,
    generateContract,
    updateContractStatus,
    getContractById
  }
})
