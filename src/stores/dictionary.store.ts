import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProductRating } from '@/types/product.types'
import type { AgreementType, PaymentType, CollectionType } from '@/types/appraisal.types'

export const useDictionaryStore = defineStore('dictionary', () => {
  // --- State ---
  const ratingTypes = ref<ProductRating[]>([
    { id: 5, name: '5/10', description: 'Bardzo mocne ślady użytkowania' },
    { id: 6, name: '6/10', description: 'Wyraźne ślady użytkowania' },
    { id: 7, name: '7/10', description: 'Widoczne ślady użytkowania' },
    { id: 8, name: '8/10', description: 'Nieznaczne ślady użytkowania' },
    { id: 9, name: '9/10', description: 'Minimalne ślady użytkowania' },
    { id: 10, name: '10/10', description: 'Stan idealny, jak nowy' }
  ])

  const agreementTypes = ref<AgreementType[]>([
    { id: 1, name: 'Umowa kupna-sprzedaży (osoby fizyczne)' },
    { id: 2, name: 'Umowa kupna-sprzedaży (osoby fizyczne VAT)' },
    { id: 3, name: 'Faktura VAT (firmy)' }
  ])

  const paymentTypes = ref<PaymentType[]>([
    { id: 1, name: 'Przelew bankowy' },
    { id: 2, name: 'Karta podarunkowa Cyfrowe.pl' },
    { id: 3, name: 'Gotówka' }
  ])

  const collectionTypes = ref<CollectionType[]>([
    { id: 1, name: 'Kurier DPD' },
    { id: 2, name: 'Salon Cyfrowe.pl' },
    { id: 3, name: 'Paczkomat InPost' }
  ])

  return {
    // State
    ratingTypes,
    agreementTypes,
    paymentTypes,
    collectionTypes
  }
})
