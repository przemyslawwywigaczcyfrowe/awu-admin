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
    { id: 3, name: 'Gotówka' },
    { id: 4, name: 'Przelew odwrotny (kup nowy, odeślij używany)' },
    { id: 5, name: 'Karta podarunkowa z pełną opieką zamówienia' }
  ])

  const collectionTypes = ref<CollectionType[]>([
    { id: 1, name: 'Kurier DPD' },
    { id: 2, name: 'Salon Cyfrowe.pl' },
    { id: 3, name: 'Paczkomat InPost' }
  ])

  // Contract signing scenarios (from PDF Q11)
  const signingScenarios = ref([
    { id: 1, name: 'Salon → Salon', description: 'Klient podpisuje w salonie, salon przechowuje umowę' },
    { id: 2, name: 'Centrala → Salon', description: 'Centrala generuje, salon podpisuje z klientem' },
    { id: 3, name: 'Centrala → Centrala', description: 'Wysyłka kurierem, podpis w centrali' },
    { id: 4, name: 'Salon → Centrala', description: 'Salon generuje, przesyła do centrali' }
  ])

  // Return options (from PDF Q15)
  const returnOptions = ref([
    { id: 1, name: 'Zwrot do salonu (darmowy)', cost: 0, description: 'Klient odbiera w salonie bez kosztów' },
    { id: 2, name: 'Zwrot kurierem na adres klienta', cost: 16, description: 'Kurier COD, koszt 16 PLN' }
  ])

  // Email templates (from PDF Q5)
  const emailTemplates = ref([
    {
      id: 1,
      name: 'Potwierdzenie otrzymania przesyłki',
      subject: 'Potwierdzenie otrzymania przesyłki - wycena #{nr}',
      body: 'Szanowny/a {klient},\n\nPotwierdzamy otrzymanie Twojej przesyłki dotyczącej wyceny nr {nr}. Przesyłka została zarejestrowana w naszym systemie i została przekazana do działu weryfikacji.\n\nO wynikach weryfikacji poinformujemy Cię w osobnej wiadomości.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
    },
    {
      id: 2,
      name: 'Wynik weryfikacji - zgodny',
      subject: 'Wynik weryfikacji wyceny #{nr} - potwierdzenie',
      body: 'Szanowny/a {klient},\n\nInformujemy, że weryfikacja produktów z wyceny nr {nr} została zakończona. Stan produktów jest zgodny z deklaracją.\n\nKwota wyceny: {kwota} PLN (przelew) / {kwota_kp} PLN (karta podarunkowa).\n\nProsimy o potwierdzenie akceptacji wyceny.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
    },
    {
      id: 3,
      name: 'Wynik weryfikacji - rozbieżności',
      subject: 'Wynik weryfikacji wyceny #{nr} - rozbieżności',
      body: 'Szanowny/a {klient},\n\nInformujemy, że weryfikacja produktów z wyceny nr {nr} została zakończona. Niestety stwierdziliśmy rozbieżności między deklarowanym a rzeczywistym stanem produktów.\n\nSkorygowana kwota wyceny: {kwota} PLN (przelew) / {kwota_kp} PLN (karta podarunkowa).\n\nProsimy o podjęcie decyzji:\n1. Akceptuję skorygowaną wycenę\n2. Odrzucam wycenę i proszę o zwrot produktów\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
    },
    {
      id: 4,
      name: 'Propozycja skorygowanej ceny',
      subject: 'Skorygowana wycena #{nr}',
      body: 'Szanowny/a {klient},\n\nW związku z weryfikacją wyceny nr {nr}, przesyłamy propozycję skorygowanej ceny.\n\nPierwotna kwota: {kwota_pierwotna} PLN\nSkorygowana kwota: {kwota} PLN\n\nPrzyczyna korekty: {powod}\n\nProsimy o odpowiedź w ciągu 14 dni.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
    },
    {
      id: 5,
      name: 'Przypomnienie o decyzji (6 dni)',
      subject: 'Przypomnienie - wycena #{nr} oczekuje na Twoją decyzję',
      body: 'Szanowny/a {klient},\n\nPrzypominamy, że wycena nr {nr} oczekuje na Twoją decyzję. Prosimy o odpowiedź w celu kontynuacji procesu.\n\nKwota wyceny: {kwota} PLN (przelew) / {kwota_kp} PLN (karta podarunkowa).\n\nW przypadku braku odpowiedzi w ciągu 14 dni od daty wyceny, produkty zostaną zwrócone.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
    },
    {
      id: 6,
      name: 'Informacja o zwrocie',
      subject: 'Zwrot produktów - wycena #{nr}',
      body: 'Szanowny/a {klient},\n\nInformujemy, że produkty z wyceny nr {nr} zostały przygotowane do zwrotu.\n\nSposób zwrotu: {sposob_zwrotu}\n{dane_zwrotu}\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
    }
  ])

  return {
    // State
    ratingTypes,
    agreementTypes,
    paymentTypes,
    collectionTypes,
    signingScenarios,
    returnOptions,
    emailTemplates
  }
})
