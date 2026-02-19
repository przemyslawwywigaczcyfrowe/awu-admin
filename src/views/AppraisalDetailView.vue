<script setup lang="ts">
import { computed, onMounted, ref, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Card from 'primevue/card'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Timeline from 'primevue/timeline'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import ProgressBar from 'primevue/progressbar'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Badge from 'primevue/badge'
import { useAppraisalDetailStore } from '@/stores/appraisalDetail.store'
import { useAuthStore } from '@/stores/auth.store'
import { useDictionaryStore } from '@/stores/dictionary.store'
import { STATUS_CONFIG, getAvailableTransitions } from '@/utils/statusConfig'
import { AppraisalStatus } from '@/types/enums'
import { formatDateNumeric, formatDateRelative } from '@/utils/dateFormatter'
import { formatPrice } from '@/utils/priceFormatter'
import type { AppraisalProduct } from '@/types/product.types'
import type { AuditLogEntry } from '@/types/appraisal.types'

// ---------------------------------------------------------------------------
// Router & Stores
// ---------------------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const detailStore = useAppraisalDetailStore()
const authStore = useAuthStore()
const dictStore = useDictionaryStore()

// ---------------------------------------------------------------------------
// General state
// ---------------------------------------------------------------------------
const activeTab = ref(0)
const statusDialogVisible = ref(false)
const selectedNewStatus = ref<AppraisalStatus | null>(null)
const correctionDialogVisible = ref(false)
const correctionReason = ref('')

onMounted(() => {
  const id = Number(route.params.id)
  if (id) detailStore.loadAppraisal(id)
})

const appraisal = computed(() => detailStore.appraisal)
const statusConfig = computed(() => appraisal.value ? STATUS_CONFIG[appraisal.value.status] : null)
const availableTransitions = computed(() => appraisal.value ? getAvailableTransitions(appraisal.value.status) : [])

function changeStatus(newStatus: AppraisalStatus) {
  detailStore.changeStatus(newStatus)
  statusDialogVisible.value = false
}

function goBack() {
  router.push('/wyceny')
}

// ---------------------------------------------------------------------------
// Tab 1: Weryfikacja (Verification) helpers
// ---------------------------------------------------------------------------

interface VerificationChecklist {
  exteriorOk: boolean
  screenLensOk: boolean
  portsOk: boolean
  buttonsOk: boolean
  shutterCount: number | null
  autofocusOk: boolean
  verifiedSerialNumber: string
  firmwareVersion: string
}

// Reactive per-product checklists keyed by product.id
const verificationChecklists = reactive<Record<number, VerificationChecklist>>({})

// External service repair data per product
interface ExternalServiceData {
  enabled: boolean
  estimatedRepairCost: number | null
  clientDecision: string | null // 'repair' | 'return' | 'accept_lower'
}
const externalServiceData = reactive<Record<number, ExternalServiceData>>({})

// Initialise checklists when appraisal loads
watch(appraisal, (val) => {
  if (!val) return
  for (const product of val.products) {
    if (!verificationChecklists[product.id]) {
      verificationChecklists[product.id] = {
        exteriorOk: false,
        screenLensOk: false,
        portsOk: false,
        buttonsOk: false,
        shutterCount: null,
        autofocusOk: false,
        verifiedSerialNumber: product.serialNumber ?? '',
        firmwareVersion: ''
      }
    }
    if (!externalServiceData[product.id]) {
      externalServiceData[product.id] = {
        enabled: false,
        estimatedRepairCost: null,
        clientDecision: null
      }
    }
  }
}, { immediate: true })

const CHECKLIST_REQUIRED_FIELDS: (keyof VerificationChecklist)[] = [
  'exteriorOk', 'screenLensOk', 'portsOk', 'buttonsOk', 'autofocusOk', 'verifiedSerialNumber'
]

function getChecklistFilledCount(productId: number): number {
  const cl = verificationChecklists[productId]
  if (!cl) return 0
  let filled = 0
  if (cl.exteriorOk) filled++
  if (cl.screenLensOk) filled++
  if (cl.portsOk) filled++
  if (cl.buttonsOk) filled++
  if (cl.autofocusOk) filled++
  if (cl.verifiedSerialNumber.trim().length > 0) filled++
  return filled
}

function getChecklistTotalRequired(): number {
  return CHECKLIST_REQUIRED_FIELDS.length
}

function getChecklistPercent(productId: number): number {
  return Math.round((getChecklistFilledCount(productId) / getChecklistTotalRequired()) * 100)
}

function isChecklistComplete(productId: number): boolean {
  return getChecklistFilledCount(productId) === getChecklistTotalRequired()
}

function getRatingLabel(ratingId: number | undefined) {
  if (!ratingId) return '—'
  const r = dictStore.ratingTypes.find(rt => rt.id === ratingId)
  return r ? r.name : `${ratingId}/10`
}

function getRatingDescription(ratingId: number | undefined): string {
  if (!ratingId) return ''
  const r = dictStore.ratingTypes.find(rt => rt.id === ratingId)
  return r?.description ?? ''
}

function getRatingClass(declared: number | undefined, verified: number | undefined) {
  if (!declared || !verified) return ''
  return declared !== verified ? 'mismatch' : 'match'
}

function hasAccessoryMismatch(product: AppraisalProduct): boolean {
  if (!product.verifiedAccessories) return false
  const declaredIds = product.declaredAccessories.map(a => a.data.id).sort()
  const verifiedIds = product.verifiedAccessories.map(a => a.data.id).sort()
  return JSON.stringify(declaredIds) !== JSON.stringify(verifiedIds)
}

function hasRatingMismatch(product: AppraisalProduct): boolean {
  if (!product.verifiedRating || !product.declaredRating) return false
  return product.verifiedRating.id !== product.declaredRating.id
}

function canEditPrice(product: AppraisalProduct): boolean {
  if (product.hasPriceInDatabase) return false
  return authStore.canManualPrice
}

function isProductVerified(product: AppraisalProduct): boolean {
  return product.verifiedRating !== null && isChecklistComplete(product.id)
}

function hasMismatch(product: AppraisalProduct): boolean {
  return hasRatingMismatch(product) || hasAccessoryMismatch(product)
}

// Verification summary
const verificationSummary = computed(() => {
  if (!appraisal.value) return { total: 0, verified: 0, mismatches: 0, ready: false }
  const products = appraisal.value.products
  const total = products.length
  const verified = products.filter(p => isProductVerified(p)).length
  const mismatches = products.filter(p => hasMismatch(p)).length
  const ready = verified === total && total > 0
  return { total, verified, mismatches, ready }
})

// Should show external service for a product (rating < 7)
function shouldShowExternalService(product: AppraisalProduct): boolean {
  if (!product.verifiedRating) return false
  return product.verifiedRating.id < 7
}

const AUDIT_COST = 59

async function handleSaveVerification() {
  await detailStore.saveVerification()
}

async function handleCreateCorrection() {
  if (correctionReason.value.trim()) {
    await detailStore.createCorrectedVersion(correctionReason.value)
    correctionDialogVisible.value = false
    correctionReason.value = ''
  }
}

// ---------------------------------------------------------------------------
// Tab 2: Umowa (Contract) state
// ---------------------------------------------------------------------------
const contractForm = reactive({
  pesel: '',
  representativeName: '',
  signingScenario: null as string | null,
  paymentMethod: null as string | null,
  accountOrCardNumber: '',
})

const signingScenarioOptions = [
  { label: 'Salon → Salon', value: 'salon-salon' },
  { label: 'Centrala → Salon', value: 'centrala-salon' },
  { label: 'Centrala → Centrala', value: 'centrala-centrala' },
  { label: 'Salon → Centrala', value: 'salon-centrala' },
]

const paymentMethodOptions = [
  { label: 'Przelew bankowy', value: 'transfer', icon: 'pi pi-wallet' },
  { label: 'Karta podarunkowa', value: 'gift_card', icon: 'pi pi-credit-card' },
  { label: 'Przelew odwrotny (kupno nowego → zwrot używanego)', value: 'reverse_transfer', icon: 'pi pi-replay' },
]

const contractFormValid = computed(() => {
  const hasPesel = !appraisal.value?.client.isCompany ? contractForm.pesel.length === 11 : true
  return hasPesel && contractForm.signingScenario && contractForm.paymentMethod
})

const contractTimelineEvents = computed(() => {
  if (!appraisal.value) return []
  const events: { label: string; date: string; icon: string; color: string; active: boolean }[] = []

  events.push({
    label: 'Weryfikacja zakończona',
    date: appraisal.value.createdAt,
    icon: 'pi pi-check',
    color: 'var(--awu-green)',
    active: [AppraisalStatus.ZWERYFIKOWANA, AppraisalStatus.ZAAKCEPTOWANA, AppraisalStatus.UMOWA_W_PRZYGOTOWANIU, AppraisalStatus.UMOWA_PODPISANA, AppraisalStatus.REALIZACJA_FINANSOWA, AppraisalStatus.ZAKONCZONA].includes(appraisal.value.status)
  })
  events.push({
    label: 'Decyzja klienta',
    date: '',
    icon: 'pi pi-user',
    color: 'var(--awu-blue)',
    active: [AppraisalStatus.ZAAKCEPTOWANA, AppraisalStatus.UMOWA_W_PRZYGOTOWANIU, AppraisalStatus.UMOWA_PODPISANA, AppraisalStatus.REALIZACJA_FINANSOWA, AppraisalStatus.ZAKONCZONA].includes(appraisal.value.status)
  })
  events.push({
    label: 'Umowa wygenerowana',
    date: '',
    icon: 'pi pi-file',
    color: 'var(--awu-blue)',
    active: [AppraisalStatus.UMOWA_W_PRZYGOTOWANIU, AppraisalStatus.UMOWA_PODPISANA, AppraisalStatus.REALIZACJA_FINANSOWA, AppraisalStatus.ZAKONCZONA].includes(appraisal.value.status)
  })
  events.push({
    label: 'Umowa podpisana',
    date: '',
    icon: 'pi pi-check-circle',
    color: 'var(--awu-green)',
    active: [AppraisalStatus.UMOWA_PODPISANA, AppraisalStatus.REALIZACJA_FINANSOWA, AppraisalStatus.ZAKONCZONA].includes(appraisal.value.status)
  })
  events.push({
    label: 'Realizacja finansowa',
    date: '',
    icon: 'pi pi-money-bill',
    color: 'var(--awu-green)',
    active: [AppraisalStatus.REALIZACJA_FINANSOWA, AppraisalStatus.ZAKONCZONA].includes(appraisal.value.status)
  })
  return events
})

// ---------------------------------------------------------------------------
// Tab 3: Komunikacja (Communication) state
// ---------------------------------------------------------------------------
const emailDialogVisible = ref(false)
const emailSubject = ref('')
const emailBody = ref('')
const newMessage = ref('')
const selectedTemplate = ref<string | null>(null)

interface EmailTemplate {
  id: string
  label: string
  icon: string
  subject: string
  body: string
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'package_received',
    label: 'Potwierdzenie otrzymania przesyłki',
    icon: 'pi pi-box',
    subject: 'Potwierdzenie otrzymania przesyłki – wycena #{number}',
    body: 'Szanowny/a {name},\n\nPotwierdzamy otrzymanie Twojej przesyłki w ramach wyceny #{number}.\nPrzesyłka została przyjęta do weryfikacji. O wynikach poinformujemy Cię w ciągu 2–3 dni roboczych.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
  },
  {
    id: 'verification_match',
    label: 'Wynik weryfikacji – zgodny',
    icon: 'pi pi-check-circle',
    subject: 'Wynik weryfikacji – wycena #{number}',
    body: 'Szanowny/a {name},\n\nInformujemy, że weryfikacja sprzętu w ramach wyceny #{number} została zakończona.\nStan produktu jest zgodny z deklaracją. Oferta cenowa pozostaje bez zmian.\n\nProsimy o podjęcie decyzji w ciągu 14 dni.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
  },
  {
    id: 'verification_mismatch',
    label: 'Wynik weryfikacji – rozbieżności',
    icon: 'pi pi-exclamation-triangle',
    subject: 'Wynik weryfikacji – rozbieżności – wycena #{number}',
    body: 'Szanowny/a {name},\n\nPo przeprowadzeniu weryfikacji sprzętu w ramach wyceny #{number} stwierdzono rozbieżności w stosunku do deklaracji.\n\nSzczegóły rozbieżności:\n- [uzupełnij opis rozbieżności]\n\nW związku z powyższym, przygotowaliśmy skorygowaną ofertę cenową. Prosimy o zapoznanie się i podjęcie decyzji.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
  },
  {
    id: 'corrected_price',
    label: 'Propozycja skorygowanej ceny',
    icon: 'pi pi-money-bill',
    subject: 'Skorygowana oferta cenowa – wycena #{number}',
    body: 'Szanowny/a {name},\n\nW nawiązaniu do wyceny #{number}, przedstawiamy skorygowaną ofertę cenową:\n\n- Przelew bankowy: [kwota] zł\n- Karta podarunkowa: [kwota] zł\n\nProsimy o potwierdzenie akceptacji lub kontakt w razie pytań.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
  },
  {
    id: 'decision_reminder',
    label: 'Przypomnienie o decyzji (6 dni)',
    icon: 'pi pi-clock',
    subject: 'Przypomnienie – oczekujemy na Twoją decyzję – wycena #{number}',
    body: 'Szanowny/a {name},\n\nPrzypominamy, że wycena #{number} oczekuje na Twoją decyzję.\nMinęło 6 dni od przesłania oferty. Prosimy o odpowiedź w ciągu najbliższych dni.\n\nW przypadku braku odpowiedzi w ciągu 14 dni, sprzęt zostanie zwrócony na Twój koszt.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
  },
  {
    id: 'return_info',
    label: 'Informacja o zwrocie',
    icon: 'pi pi-replay',
    subject: 'Informacja o zwrocie sprzętu – wycena #{number}',
    body: 'Szanowny/a {name},\n\nInformujemy, że sprzęt z wyceny #{number} został przygotowany do zwrotu.\n\nSposób zwrotu: [kurier / odbiór w salonie]\nNumer przesyłki: [numer]\n\nW razie pytań prosimy o kontakt.\n\nPozdrawiamy,\nZespół Cyfrowe.pl'
  }
]

function applyEmailTemplate(templateId: string) {
  const tpl = emailTemplates.find(t => t.id === templateId)
  if (!tpl || !appraisal.value) return
  selectedTemplate.value = templateId
  emailSubject.value = tpl.subject
    .replace('{number}', appraisal.value.appraisalNumber)
  emailBody.value = tpl.body
    .replace(/\{name\}/g, appraisal.value.client.name)
    .replace(/\{number\}/g, appraisal.value.appraisalNumber)
}

function openEmailWithTemplate(templateId: string) {
  applyEmailTemplate(templateId)
  emailDialogVisible.value = true
}

function sendEmail() {
  if (appraisal.value && emailSubject.value && emailBody.value) {
    // Push directly into communications array (mock)
    appraisal.value.communications.push({
      id: Date.now(),
      appraisalId: appraisal.value.id,
      type: 'email_sent' as any,
      from: authStore.user?.email ?? 'operator@cyfrowe.pl',
      to: appraisal.value.client.email,
      subject: emailSubject.value,
      body: emailBody.value,
      timestamp: new Date().toISOString(),
      status: 'sent'
    })
    emailSubject.value = ''
    emailBody.value = ''
    selectedTemplate.value = null
    emailDialogVisible.value = false
  }
}

function sendSms() {
  if (appraisal.value && newMessage.value) {
    appraisal.value.communications.push({
      id: Date.now(),
      appraisalId: appraisal.value.id,
      type: 'sms_sent' as any,
      from: 'System',
      to: appraisal.value.client.phoneNumber,
      subject: null,
      body: newMessage.value,
      timestamp: new Date().toISOString(),
      status: 'sent'
    })
    newMessage.value = ''
  }
}

function getMessageTypeLabel(type: string): string {
  const map: Record<string, string> = {
    email_sent: 'Email wysłany',
    email_received: 'Email odebrany',
    sms_sent: 'SMS wysłany',
    sms_received: 'SMS odebrany',
    system: 'System'
  }
  return map[type] ?? type
}

function getMessageIcon(type: string): string {
  if (type.includes('email')) return 'pi pi-envelope'
  if (type.includes('sms')) return 'pi pi-mobile'
  return 'pi pi-info-circle'
}

function getContractStatusLabel(status: string): string {
  const map: Record<string, string> = {
    generated: 'Wygenerowana',
    sent: 'Wysłana',
    signed: 'Podpisana',
    returned: 'Zwrócona'
  }
  return map[status] ?? status
}

function getMessageStatusLabel(status: string): string {
  const map: Record<string, string> = {
    sent: 'Wysłano',
    delivered: 'Dostarczono',
    read: 'Odczytano',
    failed: 'Błąd',
    pending: 'Oczekuje'
  }
  return map[status] ?? status
}

// ---------------------------------------------------------------------------
// Tab 4: Wysłka (Shipping) state
// ---------------------------------------------------------------------------
const courierDialogVisible = ref(false)
const returnDialogVisible = ref(false)
const returnOption = ref<string | null>(null)
const serialNumberTracking = ref('')

const returnOptions = [
  { label: 'Zwrot do salonu (darmowy)', value: 'salon_free', cost: 0, icon: 'pi pi-building' },
  { label: 'Zwrot kurierem na adres klienta (16 PLN COD)', value: 'courier_cod', cost: 16, icon: 'pi pi-truck' },
]

const shipmentTimelineStatuses = [
  { label: 'Zamówiony', key: 'ordered', icon: 'pi pi-shopping-cart' },
  { label: 'Odebrany', key: 'picked_up', icon: 'pi pi-box' },
  { label: 'W transporcie', key: 'in_transit', icon: 'pi pi-truck' },
  { label: 'Dostarczony', key: 'delivered', icon: 'pi pi-check-circle' },
]

function getShipmentTimelineIndex(status: string): number {
  const idx = shipmentTimelineStatuses.findIndex(s => s.key === status)
  return idx >= 0 ? idx : 0
}

// ---------------------------------------------------------------------------
// Tab 5: Historia (History) state & helpers
// ---------------------------------------------------------------------------
const historyFilterCategory = ref<string | null>(null)

const historyCategoryOptions = [
  { label: 'Wszystkie', value: null },
  { label: 'Zmiana statusu', value: 'status' },
  { label: 'Zmiana ceny', value: 'price' },
  { label: 'Komunikacja', value: 'communication' },
  { label: 'Wysyłka', value: 'shipping' },
  { label: 'Weryfikacja', value: 'verification' },
  { label: 'Umowa', value: 'contract' },
]

function categorizeAuditEntry(entry: AuditLogEntry): string {
  const action = entry.action.toLowerCase()
  if (action.includes('status') || action.includes('zmiana statusu')) return 'status'
  if (action.includes('cen') || action.includes('price') || action.includes('kwot')) return 'price'
  if (action.includes('email') || action.includes('sms') || action.includes('komunikac') || action.includes('wiadomo')) return 'communication'
  if (action.includes('przesy') || action.includes('kurier') || action.includes('wysyłka') || action.includes('shipment')) return 'shipping'
  if (action.includes('weryfikac') || action.includes('ekspertyz') || action.includes('ocen')) return 'verification'
  if (action.includes('umow') || action.includes('kontrakt') || action.includes('contract') || action.includes('dokument')) return 'contract'
  return 'status'
}

function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    status: 'pi pi-sync',
    price: 'pi pi-money-bill',
    communication: 'pi pi-envelope',
    shipping: 'pi pi-truck',
    verification: 'pi pi-search',
    contract: 'pi pi-file'
  }
  return map[category] ?? 'pi pi-info-circle'
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    status: 'var(--awu-blue)',
    price: 'var(--awu-orange)',
    communication: 'var(--awu-green)',
    shipping: '#8B5CF6',
    verification: 'var(--awu-blue)',
    contract: 'var(--awu-gray-600)'
  }
  return map[category] ?? 'var(--awu-gray-500)'
}

const filteredAuditLog = computed(() => {
  if (!appraisal.value) return []
  const log = [...appraisal.value.auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  if (!historyFilterCategory.value) return log
  return log.filter(entry => categorizeAuditEntry(entry) === historyFilterCategory.value)
})

// Expiry date helpers
const daysUntilExpiry = computed(() => {
  if (!appraisal.value?.expiryDate) return null
  const expiry = new Date(appraisal.value.expiryDate)
  const now = new Date()
  return Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
})

const expiryUrgency = computed(() => {
  if (daysUntilExpiry.value === null) return null
  if (daysUntilExpiry.value <= 0) return 'danger'
  if (daysUntilExpiry.value <= 3) return 'warn'
  return 'info'
})
</script>

<template>
  <div class="appraisal-detail" v-if="appraisal">
    <!-- ===================================================================
         HEADER
         =================================================================== -->
    <div class="detail-header">
      <div class="detail-header__left">
        <Button icon="pi pi-arrow-left" text rounded severity="secondary" @click="goBack" aria-label="Powrót do listy" />
        <div class="detail-header__info">
          <h1 class="detail-header__title">Wycena #{{ appraisal.appraisalNumber }}</h1>
          <div class="detail-header__meta">
            <Tag :value="statusConfig?.label" :severity="statusConfig?.severity" :icon="statusConfig?.icon" class="detail-header__status-tag" />
            <span class="meta-item"><i class="pi pi-map-marker" /> {{ appraisal.locationName }}</span>
            <span class="meta-item" v-if="appraisal.assignedOperatorName"><i class="pi pi-user" /> {{ appraisal.assignedOperatorName }}</span>
            <span class="meta-item"><i class="pi pi-calendar" /> {{ formatDateNumeric(appraisal.createdAt) }}</span>
            <span
              v-if="daysUntilExpiry !== null"
              :class="['meta-item', 'meta-item--expiry', expiryUrgency === 'danger' ? 'meta-item--danger' : expiryUrgency === 'warn' ? 'meta-item--warn' : '']"
            >
              <i class="pi pi-clock" />
              <template v-if="daysUntilExpiry > 0">Ważna jeszcze {{ daysUntilExpiry }} dni</template>
              <template v-else>Oferta wygasła!</template>
            </span>
          </div>
        </div>
      </div>
      <div class="detail-header__actions">
        <Button
          v-for="trans in availableTransitions"
          :key="trans.id"
          :label="trans.label"
          :icon="trans.icon"
          :severity="trans.severity === 'danger' ? 'danger' : trans.severity === 'success' ? 'success' : 'info'"
          size="small"
          @click="changeStatus(trans.id)"
        />
      </div>
    </div>

    <!-- ===================================================================
         CLIENT INFO BAR
         =================================================================== -->
    <Card class="client-card">
      <template #content>
        <div class="client-info">
          <div class="client-info__details">
            <div class="client-info__item">
              <i class="pi pi-user" />
              <div>
                <strong>{{ appraisal.client.name }}</strong>
                <div v-if="appraisal.client.isCompany" class="text-muted">
                  Firma: {{ appraisal.client.companyName }} | NIP: {{ appraisal.client.nip }}
                </div>
              </div>
            </div>
            <div class="client-info__item">
              <i class="pi pi-envelope" />
              <span>{{ appraisal.client.email }}</span>
            </div>
            <div class="client-info__item">
              <i class="pi pi-phone" />
              <span>{{ appraisal.client.phoneNumber }}</span>
            </div>
            <div class="client-info__item" v-if="appraisal.client.address">
              <i class="pi pi-home" />
              <span>{{ appraisal.client.address.street }} {{ appraisal.client.address.number }}<template v-if="appraisal.client.address.local">/{{ appraisal.client.address.local }}</template>, {{ appraisal.client.address.postal }} {{ appraisal.client.address.city }}</span>
            </div>
            <div class="client-info__item" v-if="appraisal.trackingNumber">
              <i class="pi pi-truck" />
              <span>Nr przesyłki: <strong>{{ appraisal.trackingNumber }}</strong></span>
            </div>
          </div>
          <div class="client-info__totals">
            <div class="client-info__total-item">
              <span class="client-info__total-label">Przelew</span>
              <strong class="client-info__total-value">{{ formatPrice(appraisal.totalPriceTransfer) }}</strong>
            </div>
            <div class="client-info__total-item">
              <span class="client-info__total-label">Karta podarunkowa</span>
              <strong class="client-info__total-value">{{ formatPrice(appraisal.totalPriceGiftCard) }}</strong>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- ===================================================================
         TABS
         =================================================================== -->
    <TabView v-model:activeIndex="activeTab" class="detail-tabs">

      <!-- =================================================================
           TAB 1: WERYFIKACJA
           ================================================================= -->
      <TabPanel header="Weryfikacja" value="0">
        <!-- Version timeline -->
        <Panel header="Historia wersji" toggleable collapsed v-if="appraisal.versions.length > 1" class="mb-3">
          <Timeline :value="appraisal.versions" layout="horizontal" align="top">
            <template #content="{ item }">
              <div class="version-item">
                <strong>Wersja {{ item.versionNumber }}</strong>
                <div class="text-muted">{{ formatDateNumeric(item.createdAt) }}</div>
                <div class="text-muted">{{ item.createdBy }}</div>
                <div v-if="item.reason" class="text-muted text-italic">{{ item.reason }}</div>
              </div>
            </template>
          </Timeline>
        </Panel>

        <!-- Verification progress summary (top) -->
        <Card class="verification-progress-card">
          <template #content>
            <div class="verification-progress">
              <div class="verification-progress__stats">
                <div class="verification-progress__stat">
                  <span class="verification-progress__stat-label">Produkty</span>
                  <Badge :value="String(verificationSummary.total)" severity="info" />
                </div>
                <div class="verification-progress__stat">
                  <span class="verification-progress__stat-label">Zweryfikowane</span>
                  <Badge :value="String(verificationSummary.verified)" :severity="verificationSummary.verified === verificationSummary.total ? 'success' : 'warn'" />
                </div>
                <div class="verification-progress__stat">
                  <span class="verification-progress__stat-label">Rozbieżności</span>
                  <Badge :value="String(verificationSummary.mismatches)" :severity="verificationSummary.mismatches > 0 ? 'danger' : 'success'" />
                </div>
                <div class="verification-progress__stat">
                  <span class="verification-progress__stat-label">Gotowa do zatwierdzenia</span>
                  <Tag
                    :value="verificationSummary.ready ? 'Tak' : 'Nie'"
                    :severity="verificationSummary.ready ? 'success' : 'warn'"
                    :icon="verificationSummary.ready ? 'pi pi-check' : 'pi pi-times'"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Products list with verification -->
        <div class="products-list">
          <Accordion multiple class="products-accordion">
            <AccordionPanel
              v-for="(product, idx) in appraisal.products"
              :key="product.id"
              :value="String(product.id)"
            >
              <AccordionHeader>
                <div class="product-accordion-header">
                  <div class="product-accordion-header__left">
                    <Badge
                      :value="String(idx + 1)"
                      :severity="isProductVerified(product) ? (hasMismatch(product) ? 'warn' : 'success') : 'secondary'"
                    />
                    <span class="product-accordion-header__name">{{ product.data.name }}</span>
                    <Tag v-if="product.data.erpIndex" :value="product.data.erpIndex" severity="secondary" class="product-accordion-header__erp" />
                  </div>
                  <div class="product-accordion-header__right">
                    <Tag v-if="hasMismatch(product)" value="Rozbieżność" severity="warn" icon="pi pi-exclamation-triangle" />
                    <Tag v-if="isProductVerified(product)" value="Zweryfikowany" severity="success" icon="pi pi-check" />
                    <Tag v-else value="Do weryfikacji" severity="secondary" icon="pi pi-clock" />
                    <span class="product-accordion-header__price" v-if="product.priceTransfer">
                      {{ formatPrice(product.priceTransfer) }}
                    </span>
                  </div>
                </div>
              </AccordionHeader>
              <AccordionContent>
                <!-- IDs row -->
                <div class="product-ids">
                  <span v-if="product.idVerto" class="product-ids__item">
                    <strong>ID Verto:</strong> {{ product.idVerto }}
                  </span>
                  <span v-if="product.serialNumber" class="product-ids__item">
                    <strong>S/N:</strong> {{ product.serialNumber }}
                  </span>
                  <span class="product-ids__item">
                    <strong>Gwarancja:</strong>
                    <i :class="product.warranty ? 'pi pi-check-circle' : 'pi pi-times-circle'" :style="{ color: product.warranty ? 'var(--awu-green)' : 'var(--awu-red)' }" />
                    {{ product.warranty ? 'Tak' : 'Nie' }}
                  </span>
                  <span class="product-ids__item">
                    <strong>Oryginalne pudełko:</strong>
                    <i :class="product.hasBox ? 'pi pi-check-circle' : 'pi pi-times-circle'" :style="{ color: product.hasBox ? 'var(--awu-green)' : 'var(--awu-red)' }" />
                    {{ product.hasBox ? 'Tak' : 'Nie' }}
                  </span>
                </div>

                <!-- Verification checklist progress -->
                <div class="checklist-progress" v-if="verificationChecklists[product.id]">
                  <div class="checklist-progress__label">
                    {{ getChecklistFilledCount(product.id) }} z {{ getChecklistTotalRequired() }} wymaganych pól wypełnionych
                  </div>
                  <ProgressBar
                    :value="getChecklistPercent(product.id)"
                    :showValue="true"
                    :class="{ 'checklist-progress__bar--complete': isChecklistComplete(product.id) }"
                  />
                </div>

                <!-- Side-by-side comparison -->
                <div class="product-compare">
                  <!-- Deklaracja klienta -->
                  <div class="compare-col compare-col--client">
                    <div class="compare-col__header compare-col__header--client">
                      <i class="pi pi-user" /> Deklaracja klienta
                    </div>
                    <div class="compare-field">
                      <label>Ocena stanu:</label>
                      <div class="compare-field__rating">
                        <Tag :value="getRatingLabel(product.declaredRating?.id)" severity="info" />
                        <span class="compare-field__rating-desc">{{ getRatingDescription(product.declaredRating?.id) }}</span>
                      </div>
                    </div>
                    <div class="compare-field">
                      <label>Akcesoria ({{ product.declaredAccessories.length }}):</label>
                      <ul class="accessory-list">
                        <li v-for="acc in product.declaredAccessories" :key="acc.id">
                          <i class="pi pi-check-circle" style="color: var(--awu-green)" />
                          <span class="accessory-list__name">{{ acc.data.name }}</span>
                          <span class="accessory-list__price">{{ formatPrice(acc.price) }}</span>
                        </li>
                      </ul>
                    </div>
                    <div class="compare-field" v-if="product.accessoryComment">
                      <label>Uwagi klienta:</label>
                      <p class="client-comment">{{ product.accessoryComment }}</p>
                    </div>
                  </div>

                  <Divider layout="vertical" class="compare-divider" />

                  <!-- Weryfikacja operatora -->
                  <div class="compare-col compare-col--operator">
                    <div class="compare-col__header compare-col__header--operator">
                      <i class="pi pi-shield" /> Weryfikacja operatora
                    </div>

                    <!-- Rating selection -->
                    <div class="compare-field" :class="{ 'compare-field--mismatch': hasRatingMismatch(product) }">
                      <label>Ocena stanu:</label>
                      <Select
                        :modelValue="product.verifiedRating?.id"
                        @update:modelValue="(val: number) => { if (product.verifiedRating) product.verifiedRating.id = val; else product.verifiedRating = { id: val, name: getRatingLabel(val), description: getRatingDescription(val) } }"
                        :options="dictStore.ratingTypes"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Wybierz ocenę"
                        :class="getRatingClass(product.declaredRating?.id, product.verifiedRating?.id)"
                        class="w-full"
                      />
                      <Message
                        v-if="hasRatingMismatch(product)"
                        severity="warn"
                        :closable="false"
                        class="mt-2"
                      >
                        Rozbieżność: klient {{ getRatingLabel(product.declaredRating?.id) }} vs operator {{ getRatingLabel(product.verifiedRating?.id) }}
                      </Message>
                    </div>

                    <!-- Accessories verification -->
                    <div class="compare-field" :class="{ 'compare-field--mismatch': hasAccessoryMismatch(product) }">
                      <label>Akcesoria zweryfikowane:</label>
                      <div v-for="acc in product.declaredAccessories" :key="acc.id" class="accessory-check">
                        <Checkbox
                          :modelValue="product.verifiedAccessories?.some(va => va.data.id === acc.data.id) ?? false"
                          :binary="true"
                          :inputId="'acc_' + product.id + '_' + acc.id"
                        />
                        <label :for="'acc_' + product.id + '_' + acc.id">{{ acc.data.name }}</label>
                        <span class="accessory-check__price">{{ formatPrice(acc.price) }}</span>
                      </div>
                      <Message
                        v-if="hasAccessoryMismatch(product)"
                        severity="warn"
                        :closable="false"
                        class="mt-2"
                      >
                        Rozbieżność w akcesoriach
                      </Message>
                    </div>

                    <!-- Internal note -->
                    <div class="compare-field">
                      <label>Notatka wewnętrzna:</label>
                      <Textarea v-model="product.internalNote" rows="2" class="w-full" placeholder="Notatka operatora..." />
                    </div>
                  </div>
                </div>

                <!-- Structured verification checklist -->
                <Divider />
                <div class="verification-checklist" v-if="verificationChecklists[product.id]">
                  <h4 class="verification-checklist__title">
                    <i class="pi pi-list-check" /> Lista kontrolna weryfikacji
                  </h4>
                  <div class="verification-checklist__grid">
                    <!-- Visual inspection -->
                    <div class="checklist-group">
                      <div class="checklist-group__title">Oględziny wizualne</div>
                      <div class="checklist-item" :class="{ 'checklist-item--incomplete': !verificationChecklists[product.id].exteriorOk }">
                        <Checkbox v-model="verificationChecklists[product.id].exteriorOk" :binary="true" :inputId="'ext_' + product.id" />
                        <label :for="'ext_' + product.id">Obudowa / exterior <span class="checklist-item__required">*</span></label>
                      </div>
                      <div class="checklist-item" :class="{ 'checklist-item--incomplete': !verificationChecklists[product.id].screenLensOk }">
                        <Checkbox v-model="verificationChecklists[product.id].screenLensOk" :binary="true" :inputId="'scr_' + product.id" />
                        <label :for="'scr_' + product.id">Ekran / obiektyw <span class="checklist-item__required">*</span></label>
                      </div>
                      <div class="checklist-item" :class="{ 'checklist-item--incomplete': !verificationChecklists[product.id].portsOk }">
                        <Checkbox v-model="verificationChecklists[product.id].portsOk" :binary="true" :inputId="'port_' + product.id" />
                        <label :for="'port_' + product.id">Porty / złącza <span class="checklist-item__required">*</span></label>
                      </div>
                    </div>
                    <!-- Mechanical check -->
                    <div class="checklist-group">
                      <div class="checklist-group__title">Kontrola mechaniczna</div>
                      <div class="checklist-item" :class="{ 'checklist-item--incomplete': !verificationChecklists[product.id].buttonsOk }">
                        <Checkbox v-model="verificationChecklists[product.id].buttonsOk" :binary="true" :inputId="'btn_' + product.id" />
                        <label :for="'btn_' + product.id">Przyciski / pokrętła <span class="checklist-item__required">*</span></label>
                      </div>
                      <div class="checklist-item">
                        <label :for="'shutter_' + product.id">Licznik zdjęć (opcjonalnie):</label>
                        <InputNumber v-model="verificationChecklists[product.id].shutterCount" :inputId="'shutter_' + product.id" placeholder="np. 12500" :min="0" class="checklist-item__input" />
                      </div>
                      <div class="checklist-item" :class="{ 'checklist-item--incomplete': !verificationChecklists[product.id].autofocusOk }">
                        <Checkbox v-model="verificationChecklists[product.id].autofocusOk" :binary="true" :inputId="'af_' + product.id" />
                        <label :for="'af_' + product.id">Autofocus / stabilizacja <span class="checklist-item__required">*</span></label>
                      </div>
                    </div>
                    <!-- Serial & firmware -->
                    <div class="checklist-group">
                      <div class="checklist-group__title">Identyfikacja</div>
                      <div class="checklist-item" :class="{ 'checklist-item--incomplete': !verificationChecklists[product.id].verifiedSerialNumber.trim() }">
                        <label :for="'sn_' + product.id">Zweryfikowany numer seryjny <span class="checklist-item__required">*</span></label>
                        <InputText
                          v-model="verificationChecklists[product.id].verifiedSerialNumber"
                          :inputId="'sn_' + product.id"
                          placeholder="Wpisz numer seryjny"
                          class="w-full"
                          :class="{ 'p-invalid': !verificationChecklists[product.id].verifiedSerialNumber.trim() }"
                        />
                        <small v-if="product.serialNumber" class="text-muted">Deklarowany: {{ product.serialNumber }}</small>
                      </div>
                      <div class="checklist-item">
                        <label :for="'fw_' + product.id">Wersja firmware (opcjonalnie):</label>
                        <InputText
                          v-model="verificationChecklists[product.id].firmwareVersion"
                          :inputId="'fw_' + product.id"
                          placeholder="np. 1.4.2"
                          class="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- External service section (when rating < 7) -->
                <div v-if="shouldShowExternalService(product)" class="external-service">
                  <Card class="external-service__card">
                    <template #content>
                      <div class="external-service__header">
                        <i class="pi pi-wrench" />
                        <h4>Serwis zewnętrzny</h4>
                        <Tag value="Ocena poniżej 7/10" severity="warn" />
                      </div>
                      <p class="external-service__desc">
                        Stan produktu wymaga ekspertyzy serwisowej. Można zaproponować klientowi naprawę w serwisie zewnętrznym.
                      </p>

                      <Checkbox
                        v-model="externalServiceData[product.id].enabled"
                        :binary="true"
                        :inputId="'ext_svc_' + product.id"
                      />
                      <label :for="'ext_svc_' + product.id" class="external-service__enable-label">
                        Zaproponuj serwis zewnętrzny klientowi
                      </label>

                      <div v-if="externalServiceData[product.id]?.enabled" class="external-service__form">
                        <div class="external-service__cost-row">
                          <div class="field">
                            <label>Koszt ekspertyzy:</label>
                            <InputNumber :modelValue="AUDIT_COST" disabled mode="currency" currency="PLN" locale="pl-PL" class="w-full" />
                            <small class="text-muted">Stała opłata za ekspertyzę</small>
                          </div>
                          <div class="field">
                            <label>Szacunkowy koszt naprawy:</label>
                            <InputNumber v-model="externalServiceData[product.id].estimatedRepairCost" mode="currency" currency="PLN" locale="pl-PL" placeholder="Wpisz kwotę" class="w-full" />
                          </div>
                        </div>

                        <div class="external-service__decisions">
                          <label class="external-service__decisions-title">Decyzja klienta:</label>
                          <div class="external-service__decision-option" v-for="option in [
                            { value: 'repair', label: 'Wyrażam zgodę na naprawę', icon: 'pi pi-wrench', desc: 'Klient wyraża zgodę na naprawę w serwisie zewnętrznym.' },
                            { value: 'return', label: 'Nie, chcę zwrot bez naprawy', icon: 'pi pi-replay', desc: 'Klient rezygnuje – sprzęt zostanie zwrócony.' },
                            { value: 'accept_lower', label: 'Przyjmuję wycenę z obniżoną ceną', icon: 'pi pi-money-bill', desc: 'Klient akceptuje niższą cenę bez naprawy.' }
                          ]" :key="option.value">
                            <div
                              :class="['decision-card', { 'decision-card--selected': externalServiceData[product.id].clientDecision === option.value }]"
                              @click="externalServiceData[product.id].clientDecision = option.value"
                            >
                              <i :class="option.icon" />
                              <div>
                                <strong>{{ option.label }}</strong>
                                <p>{{ option.desc }}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </Card>
                </div>

                <!-- Price section -->
                <Divider />
                <div class="product-price">
                  <h4 class="product-price__title"><i class="pi pi-money-bill" /> Wycena</h4>
                  <div class="price-row" v-if="product.hasPriceInDatabase">
                    <div class="price-item">
                      <label>Przelew:</label>
                      <strong>{{ formatPrice(product.priceTransfer) }}</strong>
                    </div>
                    <div class="price-item">
                      <label>Karta podarunkowa:</label>
                      <strong>{{ formatPrice(product.priceGiftCard) }}</strong>
                    </div>
                    <div class="price-item" v-if="product.priceAllegro">
                      <label>Allegro (ref.):</label>
                      <span class="text-muted">{{ formatPrice(product.priceAllegro) }}</span>
                    </div>
                    <Tag value="Cena z bazy danych" severity="info" icon="pi pi-lock" />
                  </div>
                  <div class="price-row" v-else-if="canEditPrice(product)">
                    <div class="price-item">
                      <label>Przelew:</label>
                      <InputNumber v-model="product.priceTransfer" mode="currency" currency="PLN" locale="pl-PL" />
                    </div>
                    <div class="price-item">
                      <label>Karta podarunkowa:</label>
                      <InputNumber v-model="product.priceGiftCard" mode="currency" currency="PLN" locale="pl-PL" />
                    </div>
                    <div class="price-item" v-if="product.priceAllegro">
                      <label>Allegro (ref.):</label>
                      <span class="text-muted">{{ formatPrice(product.priceAllegro) }}</span>
                    </div>
                    <Tag value="Cena ręczna" severity="warn" icon="pi pi-pencil" />
                  </div>
                  <div class="price-row" v-else>
                    <Message severity="info" :closable="false">
                      Produkt wymaga wyceny przez uprawnionego operatora (senior/admin)
                    </Message>
                  </div>
                  <div class="price-row price-row--secondary" v-if="product.priceMinForClient || product.priceFrontAfterExpertise">
                    <div class="price-item" v-if="product.priceMinForClient">
                      <label>Min. cena dla klienta:</label>
                      <span>{{ formatPrice(product.priceMinForClient) }}</span>
                    </div>
                    <div class="price-item" v-if="product.priceFrontAfterExpertise">
                      <label>Cena front po ekspertyzie:</label>
                      <span>{{ formatPrice(product.priceFrontAfterExpertise) }}</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </div>

        <!-- Verification summary (bottom) -->
        <Card class="verification-summary-card">
          <template #content>
            <div class="verification-summary">
              <div class="verification-summary__info">
                <div class="verification-summary__item">
                  <i class="pi pi-box" />
                  <span>Produkty: <strong>{{ verificationSummary.total }}</strong></span>
                </div>
                <div class="verification-summary__item">
                  <i class="pi pi-check-circle" style="color: var(--awu-green)" />
                  <span>Zweryfikowane: <strong>{{ verificationSummary.verified }}</strong></span>
                </div>
                <div class="verification-summary__item" v-if="verificationSummary.mismatches > 0">
                  <i class="pi pi-exclamation-triangle" style="color: var(--awu-orange)" />
                  <span>Rozbieżności: <strong>{{ verificationSummary.mismatches }}</strong></span>
                </div>
              </div>
              <div class="verification-summary__actions">
                <Button
                  label="Zapisz weryfikację"
                  icon="pi pi-save"
                  severity="secondary"
                  outlined
                  @click="handleSaveVerification"
                  :loading="detailStore.saving"
                />
                <Button
                  label="Utwórz korektę"
                  icon="pi pi-pencil"
                  severity="warn"
                  @click="correctionDialogVisible = true"
                  :disabled="verificationSummary.mismatches === 0"
                />
                <Button
                  label="Zatwierdź weryfikację"
                  icon="pi pi-check"
                  severity="success"
                  @click="changeStatus(AppraisalStatus.ZWERYFIKOWANA)"
                  :disabled="!verificationSummary.ready"
                  :loading="detailStore.saving"
                />
              </div>
            </div>
          </template>
        </Card>

        <!-- Correction dialog -->
        <Dialog v-model:visible="correctionDialogVisible" header="Utwórz skorygowaną wersję" :style="{ width: '500px' }" modal>
          <div class="field">
            <label>Powód korekty:</label>
            <Textarea v-model="correctionReason" rows="4" class="w-full" placeholder="Opisz powód utworzenia korekty..." />
          </div>
          <template #footer>
            <Button label="Anuluj" severity="secondary" text @click="correctionDialogVisible = false" />
            <Button label="Utwórz korektę" icon="pi pi-pencil" severity="warn" @click="handleCreateCorrection" :disabled="!correctionReason.trim()" :loading="detailStore.saving" />
          </template>
        </Dialog>
      </TabPanel>

      <!-- =================================================================
           TAB 2: UMOWA (CONTRACT)
           ================================================================= -->
      <TabPanel header="Umowa" value="1">
        <div class="contract-section">
          <!-- Contract timeline -->
          <Card class="contract-timeline-card mb-3">
            <template #content>
              <div class="contract-timeline">
                <div
                  v-for="(event, idx) in contractTimelineEvents"
                  :key="idx"
                  :class="['contract-timeline__step', { 'contract-timeline__step--active': event.active, 'contract-timeline__step--done': event.active && idx < contractTimelineEvents.findIndex(e => !e.active) }]"
                >
                  <div class="contract-timeline__icon" :style="{ backgroundColor: event.active ? event.color : 'var(--awu-gray-200)' }">
                    <i :class="event.icon" />
                  </div>
                  <div class="contract-timeline__label">{{ event.label }}</div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Contract data form -->
          <Card class="mb-3">
            <template #title>
              <i class="pi pi-file-edit" /> Dane do umowy
            </template>
            <template #content>
              <div class="contract-form">
                <div class="contract-form__row">
                  <div class="field" v-if="!appraisal.client.isCompany">
                    <label>PESEL:</label>
                    <InputText
                      v-model="contractForm.pesel"
                      placeholder="Wpisz numer PESEL (11 cyfr)"
                      class="w-full"
                      maxlength="11"
                      :class="{ 'p-invalid': contractForm.pesel.length > 0 && contractForm.pesel.length !== 11 }"
                    />
                    <small v-if="contractForm.pesel.length > 0 && contractForm.pesel.length !== 11" class="p-error">PESEL musi mieć 11 cyfr</small>
                  </div>
                  <div class="field">
                    <label>Imię i nazwisko przedstawiciela:</label>
                    <InputText v-model="contractForm.representativeName" placeholder="Np. Jan Kowalski" class="w-full" />
                  </div>
                </div>

                <div class="contract-form__row">
                  <div class="field">
                    <label>Scenariusz podpisania:</label>
                    <Select
                      v-model="contractForm.signingScenario"
                      :options="signingScenarioOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Wybierz scenariusz"
                      class="w-full"
                    />
                  </div>
                  <div class="field">
                    <label>Metoda płatności:</label>
                    <Select
                      v-model="contractForm.paymentMethod"
                      :options="paymentMethodOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Wybierz metodę"
                      class="w-full"
                    >
                      <template #option="{ option }">
                        <div class="payment-option">
                          <i :class="option.icon" />
                          <span>{{ option.label }}</span>
                        </div>
                      </template>
                    </Select>
                  </div>
                </div>

                <div class="contract-form__row" v-if="contractForm.paymentMethod">
                  <div class="field">
                    <label>
                      {{ contractForm.paymentMethod === 'gift_card' ? 'Numer karty podarunkowej:' : 'Numer konta bankowego:' }}
                    </label>
                    <InputText
                      v-model="contractForm.accountOrCardNumber"
                      :placeholder="contractForm.paymentMethod === 'gift_card' ? 'Numer karty podarunkowej' : 'PL XX XXXX XXXX XXXX XXXX XXXX XXXX'"
                      class="w-full"
                    />
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Existing contracts -->
          <div class="contract-existing" v-if="appraisal.contracts.length > 0">
            <h3>Wygenerowane umowy</h3>
            <DataTable :value="appraisal.contracts" size="small" stripedRows>
              <Column field="number" header="Nr umowy" />
              <Column field="type" header="Typ">
                <template #body="{ data }">
                  <Tag :value="data.type === 'umowa_kupna' ? 'Umowa kupna' : 'Faktura VAT'" :severity="data.type === 'umowa_kupna' ? 'info' : 'secondary'" />
                </template>
              </Column>
              <Column field="date" header="Data">
                <template #body="{ data }">
                  {{ formatDateNumeric(data.date, false) }}
                </template>
              </Column>
              <Column field="status" header="Status">
                <template #body="{ data }">
                  <Tag :value="getContractStatusLabel(data.status)" :severity="data.status === 'signed' ? 'success' : data.status === 'sent' ? 'info' : 'secondary'" />
                </template>
              </Column>
              <Column header="Akcje" style="width: 250px">
                <template #body="{ data }">
                  <div class="contract-actions-cell">
                    <Button icon="pi pi-eye" label="Podgląd" text size="small" v-if="data.documentUrl" />
                    <Button icon="pi pi-print" label="Drukuj" text size="small" />
                    <Button icon="pi pi-send" label="Wyślij" text size="small" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>

          <!-- Generate contract buttons -->
          <div class="contract-generate">
            <Message v-if="!contractFormValid" severity="warn" :closable="false" class="mb-3">
              Uzupełnij wszystkie wymagane dane do umowy przed wygenerowaniem dokumentu.
            </Message>
            <div class="contract-generate__buttons">
              <Button
                :label="appraisal.client.isCompany ? 'Generuj fakturę VAT' : 'Generuj umowę kupna-sprzedaży'"
                :icon="appraisal.client.isCompany ? 'pi pi-file' : 'pi pi-file-edit'"
                severity="info"
                :disabled="!contractFormValid"
              />
              <Button
                label="Generuj protokół przekazania"
                icon="pi pi-clipboard"
                severity="secondary"
                outlined
              />
            </div>
          </div>
        </div>
      </TabPanel>

      <!-- =================================================================
           TAB 3: KOMUNIKACJA (COMMUNICATION)
           ================================================================= -->
      <TabPanel header="Komunikacja" value="2">
        <div class="communication-section">
          <div class="comm-header">
            <h2>Historia komunikacji</h2>
            <div class="comm-header__actions">
              <Button icon="pi pi-envelope" label="Nowy email" size="small" @click="emailDialogVisible = true" />
            </div>
          </div>

          <!-- Quick templates -->
          <Card class="email-templates-card mb-3">
            <template #title>
              <i class="pi pi-bolt" /> Szybkie szablony
            </template>
            <template #content>
              <div class="email-templates">
                <Button
                  v-for="tpl in emailTemplates"
                  :key="tpl.id"
                  :label="tpl.label"
                  :icon="tpl.icon"
                  outlined
                  size="small"
                  severity="secondary"
                  @click="openEmailWithTemplate(tpl.id)"
                  class="email-templates__btn"
                />
              </div>
            </template>
          </Card>

          <!-- Message thread -->
          <div class="message-thread">
            <div
              v-for="msg in appraisal.communications"
              :key="msg.id"
              :class="['message-item', msg.type.includes('sent') ? 'message-item--sent' : 'message-item--received']"
            >
              <div class="message-item__header">
                <Tag
                  :value="getMessageTypeLabel(msg.type)"
                  :severity="msg.type.includes('sent') ? 'info' : 'success'"
                  :icon="getMessageIcon(msg.type)"
                />
                <span class="message-item__time">
                  {{ formatDateRelative(msg.timestamp) }}
                  <span class="message-item__time-full">({{ formatDateNumeric(msg.timestamp) }})</span>
                </span>
              </div>
              <div class="message-item__subject" v-if="msg.subject">
                <strong>{{ msg.subject }}</strong>
              </div>
              <div class="message-item__body">{{ msg.body }}</div>
              <div class="message-item__meta">
                <span>{{ msg.from }} &rarr; {{ msg.to }}</span>
                <Tag :value="getMessageStatusLabel(msg.status)" size="small"
                  :severity="msg.status === 'read' ? 'success' : msg.status === 'delivered' ? 'info' : msg.status === 'failed' ? 'danger' : 'secondary'"
                />
              </div>
            </div>
            <div v-if="appraisal.communications.length === 0" class="empty-state">
              <i class="pi pi-comments" />
              <p>Brak historii komunikacji</p>
            </div>
          </div>

          <!-- Quick SMS -->
          <div class="quick-sms">
            <InputText v-model="newMessage" placeholder="Szybka wiadomość SMS..." class="flex-1" @keydown.enter="sendSms" />
            <Button icon="pi pi-send" label="Wyślij SMS" size="small" @click="sendSms" :disabled="!newMessage" />
          </div>
        </div>

        <!-- Email Dialog -->
        <Dialog v-model:visible="emailDialogVisible" header="Nowy email" :style="{ width: '700px' }" modal>
          <div class="email-form">
            <!-- Template selector in dialog -->
            <div class="field">
              <label>Szablon:</label>
              <Select
                :modelValue="selectedTemplate"
                @update:modelValue="(val: string) => applyEmailTemplate(val)"
                :options="emailTemplates"
                optionLabel="label"
                optionValue="id"
                placeholder="Wybierz szablon (opcjonalnie)"
                class="w-full"
                showClear
              />
            </div>
            <div class="field">
              <label>Do:</label>
              <InputText :modelValue="appraisal.client.email" disabled class="w-full" />
            </div>
            <div class="field">
              <label>Temat:</label>
              <InputText v-model="emailSubject" placeholder="Temat wiadomości" class="w-full" />
            </div>
            <div class="field">
              <label>Treść:</label>
              <Textarea v-model="emailBody" rows="10" class="w-full" placeholder="Treść wiadomości..." />
            </div>
          </div>
          <template #footer>
            <Button label="Anuluj" severity="secondary" text @click="emailDialogVisible = false" />
            <Button label="Wyślij" icon="pi pi-send" @click="sendEmail" :disabled="!emailSubject || !emailBody" />
          </template>
        </Dialog>
      </TabPanel>

      <!-- =================================================================
           TAB 4: WYSYŁKA (SHIPPING)
           ================================================================= -->
      <TabPanel header="Wysyłka" value="3">
        <div class="shipping-section">
          <h2>Zarządzanie wysyłką</h2>

          <!-- Shipping action cards -->
          <div class="shipping-actions">
            <Card class="shipping-card">
              <template #title><i class="pi pi-truck" /> Zamów kuriera DPD</template>
              <template #content>
                <p>Zamów darmowego kuriera do odbioru produktów od klienta.</p>
                <Button label="Zamów kuriera" icon="pi pi-truck" @click="courierDialogVisible = true" />
              </template>
            </Card>

            <Card class="shipping-card">
              <template #title><i class="pi pi-box" /> Numer InPost</template>
              <template #content>
                <p>Wygeneruj 10-cyfrowy numer zwrotu dla klienta do nadania w paczkomacie.</p>
                <Button label="Generuj numer" icon="pi pi-qrcode" severity="secondary" />
              </template>
            </Card>

            <Card class="shipping-card shipping-card--return">
              <template #title><i class="pi pi-replay" /> Zwrot sprzętu</template>
              <template #content>
                <p>Zorganizuj zwrot sprzętu do klienta.</p>
                <div class="return-options">
                  <div
                    v-for="opt in returnOptions"
                    :key="opt.value"
                    :class="['return-option', { 'return-option--selected': returnOption === opt.value }]"
                    @click="returnOption = opt.value"
                  >
                    <i :class="opt.icon" />
                    <div>
                      <strong>{{ opt.label }}</strong>
                      <div class="return-option__cost">
                        {{ opt.cost === 0 ? 'Bezpłatnie' : formatPrice(opt.cost) }}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  label="Zlecć zwrot"
                  icon="pi pi-replay"
                  severity="warn"
                  :disabled="!returnOption"
                  @click="returnDialogVisible = true"
                  class="mt-2"
                />
              </template>
            </Card>
          </div>

          <!-- Serial number tracking field -->
          <Card class="mb-3">
            <template #title><i class="pi pi-hashtag" /> Śledzenie numeru seryjnego</template>
            <template #content>
              <div class="serial-tracking">
                <div class="field">
                  <label>Numer seryjny produktu (do śledzenia przesyłki):</label>
                  <div class="serial-tracking__input-row">
                    <InputText v-model="serialNumberTracking" placeholder="Wpisz numer seryjny..." class="flex-1" />
                    <Button icon="pi pi-search" label="Wyszukaj" severity="secondary" outlined />
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Shipments list with timeline -->
          <div v-if="appraisal.shipments.length > 0" class="shipments-list">
            <h3>Przesyłki</h3>
            <div class="shipment-cards">
              <Card v-for="shipment in appraisal.shipments" :key="shipment.id" class="shipment-card">
                <template #content>
                  <div class="shipment-card__header">
                    <div>
                      <Tag
                        :value="shipment.carrier === 'dpd' ? 'DPD' : shipment.carrier === 'inpost' ? 'InPost' : 'Osobisty'"
                        :severity="shipment.carrier === 'dpd' ? 'info' : shipment.carrier === 'inpost' ? 'warn' : 'secondary'"
                      />
                      <span v-if="shipment.trackingNumber" class="shipment-card__tracking">
                        Nr: <strong>{{ shipment.trackingNumber }}</strong>
                      </span>
                      <span v-if="shipment.inpostReturnNumber" class="shipment-card__tracking">
                        InPost: <strong>{{ shipment.inpostReturnNumber }}</strong>
                      </span>
                    </div>
                    <span class="text-muted">{{ formatDateNumeric(shipment.createdAt) }}</span>
                  </div>

                  <!-- Shipment status timeline -->
                  <div class="shipment-timeline">
                    <div
                      v-for="(step, stepIdx) in shipmentTimelineStatuses"
                      :key="step.key"
                      :class="['shipment-timeline__step', { 'shipment-timeline__step--active': stepIdx <= getShipmentTimelineIndex(shipment.status) }]"
                    >
                      <div class="shipment-timeline__dot">
                        <i :class="step.icon" />
                      </div>
                      <div class="shipment-timeline__label">{{ step.label }}</div>
                    </div>
                    <div class="shipment-timeline__line">
                      <div class="shipment-timeline__line-fill" :style="{ width: (getShipmentTimelineIndex(shipment.status) / (shipmentTimelineStatuses.length - 1)) * 100 + '%' }"></div>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>
          <div v-else class="empty-state">
            <i class="pi pi-truck" />
            <p>Brak przesyłek</p>
          </div>
        </div>

        <!-- Courier Dialog -->
        <Dialog v-model:visible="courierDialogVisible" header="Zamów kuriera DPD" :style="{ width: '500px' }" modal>
          <div class="courier-form" v-if="appraisal">
            <div class="field">
              <label>Imię i nazwisko:</label>
              <InputText :modelValue="appraisal.client.name" class="w-full" />
            </div>
            <div class="field">
              <label>Telefon:</label>
              <InputText :modelValue="appraisal.client.phoneNumber" class="w-full" />
            </div>
            <div class="field" v-if="appraisal.client.address">
              <label>Ulica:</label>
              <InputText :modelValue="appraisal.client.address.street + ' ' + appraisal.client.address.number" class="w-full" />
            </div>
            <div class="field" v-if="appraisal.client.address">
              <label>Kod pocztowy i miasto:</label>
              <InputText :modelValue="appraisal.client.address.postal + ' ' + appraisal.client.address.city" class="w-full" />
            </div>
          </div>
          <template #footer>
            <Button label="Anuluj" severity="secondary" text @click="courierDialogVisible = false" />
            <Button label="Zamów kuriera" icon="pi pi-truck" />
          </template>
        </Dialog>

        <!-- Return Dialog -->
        <Dialog v-model:visible="returnDialogVisible" header="Potwierdź zlecenie zwrotu" :style="{ width: '500px' }" modal>
          <div class="return-confirm" v-if="returnOption">
            <Message :severity="returnOption === 'salon_free' ? 'info' : 'warn'" :closable="false">
              {{ returnOption === 'salon_free'
                ? 'Zwrot do salonu – klient odbierze sprzęt bezpłatnie w salonie.'
                : 'Zwrot kurierem na adres klienta. Koszt 16 PLN zostanie pobrany za pobraniem (COD).'
              }}
            </Message>
            <div class="field mt-2" v-if="appraisal.client.address && returnOption === 'courier_cod'">
              <label>Adres zwrotu:</label>
              <InputText
                :modelValue="appraisal.client.address.street + ' ' + appraisal.client.address.number + ', ' + appraisal.client.address.postal + ' ' + appraisal.client.address.city"
                disabled
                class="w-full"
              />
            </div>
          </div>
          <template #footer>
            <Button label="Anuluj" severity="secondary" text @click="returnDialogVisible = false" />
            <Button label="Potwierdź zwrot" icon="pi pi-check" severity="warn" />
          </template>
        </Dialog>
      </TabPanel>

      <!-- =================================================================
           TAB 5: HISTORIA (HISTORY)
           ================================================================= -->
      <TabPanel header="Historia" value="4">
        <div class="history-section">
          <div class="history-header">
            <h2>Historia zmian</h2>
            <Select
              v-model="historyFilterCategory"
              :options="historyCategoryOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Filtruj kategorię"
              class="history-filter"
            />
          </div>

          <!-- History timeline -->
          <div class="history-timeline">
            <div
              v-for="entry in filteredAuditLog"
              :key="entry.id"
              class="history-entry"
            >
              <div class="history-entry__icon" :style="{ color: getCategoryColor(categorizeAuditEntry(entry)) }">
                <i :class="getCategoryIcon(categorizeAuditEntry(entry))" />
              </div>
              <div class="history-entry__content">
                <div class="history-entry__header">
                  <strong class="history-entry__action">{{ entry.action }}</strong>
                  <span class="history-entry__time">
                    {{ formatDateRelative(entry.timestamp) }}
                    <span class="history-entry__time-full">&middot; {{ formatDateNumeric(entry.timestamp) }}</span>
                  </span>
                </div>
                <p class="history-entry__details">{{ entry.details }}</p>
                <div class="history-entry__diff" v-if="entry.previousValue || entry.newValue">
                  <span class="history-entry__diff-old" v-if="entry.previousValue">
                    <i class="pi pi-minus-circle" /> {{ entry.previousValue }}
                  </span>
                  <i class="pi pi-arrow-right" v-if="entry.previousValue && entry.newValue" />
                  <span class="history-entry__diff-new" v-if="entry.newValue">
                    <i class="pi pi-plus-circle" /> {{ entry.newValue }}
                  </span>
                </div>
                <div class="history-entry__meta">
                  <Tag :value="categorizeAuditEntry(entry)" size="small" severity="secondary" />
                  <span v-if="entry.operatorName"><i class="pi pi-user" /> {{ entry.operatorName }}</span>
                  <span v-if="entry.locationName"><i class="pi pi-map-marker" /> {{ entry.locationName }}</span>
                </div>
              </div>
            </div>

            <div v-if="filteredAuditLog.length === 0" class="empty-state">
              <i class="pi pi-history" />
              <p>Brak wpisów w historii{{ historyFilterCategory ? ' dla wybranej kategorii' : '' }}</p>
            </div>
          </div>
        </div>
      </TabPanel>

    </TabView>
  </div>

  <!-- Loading -->
  <div v-else-if="detailStore.loading" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    <p>Ładowanie wyceny...</p>
  </div>

  <!-- Not found -->
  <div v-else class="loading-state">
    <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--awu-orange)" />
    <p>Nie znaleziono wyceny</p>
    <Button label="Powrót do listy" icon="pi pi-arrow-left" severity="secondary" @click="goBack" />
  </div>
</template>

<style scoped lang="scss">
// ============================================================
// LAYOUT & HEADER
// ============================================================
.appraisal-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;

  &__left {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  &__info {
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.3;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }

  &__status-tag {
    font-size: 0.85rem;
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
}

.meta-item {
  font-size: 0.875rem;
  color: var(--awu-gray-600);
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &--expiry {
    font-weight: 600;
  }

  &--warn {
    color: var(--awu-orange);
  }

  &--danger {
    color: var(--awu-red);
    animation: pulse-red 2s infinite;
  }
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

// ============================================================
// CLIENT CARD
// ============================================================
.client-card {
  :deep(.p-card-content) {
    padding-top: 0;
  }
}

.client-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;

  &__details {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 2rem;
    align-items: center;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;

    i {
      color: var(--awu-gray-400);
      width: 1rem;
      text-align: center;
    }
  }

  &__totals {
    display: flex;
    gap: 1.5rem;
    flex-shrink: 0;
  }

  &__total-item {
    text-align: right;
  }

  &__total-label {
    display: block;
    font-size: 0.75rem;
    color: var(--awu-gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__total-value {
    font-size: 1.25rem;
    color: var(--awu-green);
  }
}

// ============================================================
// TAB 1: WERYFIKACJA
// ============================================================
.verification-progress-card {
  margin-bottom: 1rem;

  :deep(.p-card-content) {
    padding-top: 0;
  }
}

.verification-progress {
  &__stats {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    align-items: center;
  }

  &__stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__stat-label {
    font-size: 0.85rem;
    color: var(--awu-gray-600);
  }
}

.products-accordion {
  margin-bottom: 1rem;
}

.product-accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 1rem;
  flex-wrap: wrap;
  padding-right: 0.5rem;

  &__left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  &__name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 768px) {
      max-width: 200px;
    }
  }

  &__erp {
    font-size: 0.7rem;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  &__price {
    font-weight: 700;
    font-size: 1rem;
    color: var(--awu-green);
  }
}

.product-ids {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  padding: 0.75rem 1rem;
  background: var(--awu-gray-50);
  border-radius: var(--awu-border-radius);
  margin-bottom: 1rem;
  font-size: 0.85rem;

  &__item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--awu-gray-700);
  }
}

.checklist-progress {
  margin-bottom: 1rem;

  &__label {
    font-size: 0.8rem;
    color: var(--awu-gray-600);
    margin-bottom: 0.375rem;
  }

  &__bar--complete {
    :deep(.p-progressbar-value) {
      background: var(--awu-green) !important;
    }
  }
}

.product-compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;

    .compare-divider {
      display: none;
    }
  }
}

.compare-col {
  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    padding: 0.5rem 0.75rem;
    border-radius: var(--awu-border-radius);
    margin-bottom: 1rem;

    &--client {
      color: #fff;
      background: var(--awu-blue);
    }

    &--operator {
      color: #fff;
      background: var(--awu-green);
    }
  }
}

.compare-field {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: var(--awu-border-radius);
  transition: background-color 0.2s;

  label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--awu-gray-500);
    margin-bottom: 0.25rem;
    text-transform: uppercase;
  }

  &--mismatch {
    background: rgba(239, 68, 68, 0.06);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  &__rating {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__rating-desc {
    font-size: 0.8rem;
    color: var(--awu-gray-500);
    font-style: italic;
  }
}

.accessory-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3rem 0;
    font-size: 0.875rem;
  }

  &__name {
    flex: 1;
  }

  &__price {
    font-size: 0.8rem;
    color: var(--awu-gray-500);
    font-weight: 500;
  }
}

.accessory-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.875rem;

  &__price {
    margin-left: auto;
    font-size: 0.8rem;
    color: var(--awu-gray-500);
    font-weight: 500;
  }
}

.client-comment {
  margin: 0;
  padding: 0.5rem;
  background: var(--awu-gray-50);
  border-radius: var(--awu-border-radius);
  font-size: 0.85rem;
  font-style: italic;
  color: var(--awu-gray-700);
  border-left: 3px solid var(--awu-blue);
}

.mismatch {
  :deep(.p-select) {
    border-color: var(--awu-orange) !important;
  }
}

.match {
  :deep(.p-select) {
    border-color: var(--awu-green) !important;
  }
}

// Verification checklist
.verification-checklist {
  &__title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem;
    font-size: 1rem;
    color: var(--awu-gray-800);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }
}

.checklist-group {
  &__title {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--awu-gray-500);
    margin-bottom: 0.75rem;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--awu-gray-200, #e5e7eb);
    padding-bottom: 0.375rem;
  }
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: var(--awu-border-radius);
  margin-bottom: 0.375rem;
  flex-wrap: wrap;
  transition: background-color 0.2s;

  &--incomplete {
    background: rgba(239, 68, 68, 0.04);
    border: 1px dashed rgba(239, 68, 68, 0.2);
  }

  label {
    font-size: 0.875rem;
    cursor: pointer;
    flex: 1;
    min-width: 120px;
  }

  &__required {
    color: var(--awu-red);
    font-weight: 700;
  }

  &__input {
    width: 100%;
    max-width: 200px;
  }
}

// External service
.external-service {
  margin-top: 1rem;

  &__card {
    border: 2px solid var(--awu-orange) !important;
    background: rgba(245, 158, 11, 0.03) !important;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;

    i {
      font-size: 1.25rem;
      color: var(--awu-orange);
    }

    h4 {
      margin: 0;
      font-size: 1.1rem;
    }
  }

  &__desc {
    font-size: 0.875rem;
    color: var(--awu-gray-600);
    margin: 0 0 1rem;
  }

  &__enable-label {
    font-weight: 600;
    margin-left: 0.5rem;
    cursor: pointer;
  }

  &__form {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--awu-gray-200, #e5e7eb);
  }

  &__cost-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  &__decisions {
    margin-top: 1rem;
  }

  &__decisions-title {
    display: block;
    font-weight: 700;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
    color: var(--awu-gray-700);
  }

  &__decision-option {
    margin-bottom: 0.5rem;
  }
}

.decision-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid var(--awu-gray-200, #e5e7eb);
  border-radius: var(--awu-border-radius);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--awu-blue);
    background: rgba(59, 130, 246, 0.03);
  }

  &--selected {
    border-color: var(--awu-blue);
    background: rgba(59, 130, 246, 0.06);

    i {
      color: var(--awu-blue);
    }
  }

  i {
    font-size: 1.25rem;
    color: var(--awu-gray-400);
    margin-top: 0.125rem;
    flex-shrink: 0;
  }

  strong {
    display: block;
    font-size: 0.9rem;
    margin-bottom: 0.125rem;
  }

  p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--awu-gray-500);
  }
}

// Price section
.product-price {
  &__title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.75rem;
    font-size: 1rem;
    color: var(--awu-gray-800);
  }

  .price-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;

    &--secondary {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--awu-gray-200, #e5e7eb);
      opacity: 0.75;

      .price-item label {
        font-size: 0.75rem;
      }

      .price-item span {
        font-size: 0.9rem;
      }
    }
  }

  .price-item {
    label {
      font-size: 0.8rem;
      color: var(--awu-gray-500);
      display: block;
    }

    strong {
      font-size: 1.25rem;
    }
  }
}

// Verification summary bottom card
.verification-summary-card {
  margin-top: 1rem;
  border-top: 3px solid var(--awu-green);

  :deep(.p-card-content) {
    padding-top: 0;
  }
}

.verification-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;

  &__info {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.9rem;
  }

  &__actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
}

// ============================================================
// TAB 2: UMOWA
// ============================================================
.contract-timeline-card {
  :deep(.p-card-content) {
    padding-top: 0;
  }
}

.contract-timeline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;

  &__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    position: relative;
    z-index: 1;

    &::after {
      content: '';
      position: absolute;
      top: 1.25rem;
      left: 50%;
      width: 100%;
      height: 2px;
      background: var(--awu-gray-200, #e5e7eb);
    }

    &:last-child::after {
      display: none;
    }

    &--active {
      .contract-timeline__icon {
        opacity: 1;
      }

      .contract-timeline__label {
        color: var(--awu-gray-800);
        font-weight: 600;
      }

      &::after {
        background: var(--awu-green);
      }
    }
  }

  &__icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 1rem;
    opacity: 0.3;
    position: relative;
    z-index: 2;
  }

  &__label {
    font-size: 0.75rem;
    text-align: center;
    color: var(--awu-gray-400);
    max-width: 100px;
  }
}

.contract-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.contract-actions-cell {
  display: flex;
  gap: 0.25rem;
}

.contract-generate {
  margin-top: 1.5rem;

  &__buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
}

// ============================================================
// TAB 3: KOMUNIKACJA
// ============================================================
.communication-section {
  .comm-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;

    h2 {
      margin: 0;
    }

    &__actions {
      display: flex;
      gap: 0.5rem;
    }
  }
}

.email-templates-card {
  :deep(.p-card-title) {
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :deep(.p-card-content) {
    padding-top: 0;
  }
}

.email-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  &__btn {
    font-size: 0.8rem !important;
  }
}

.message-thread {
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--awu-gray-50);
  border-radius: var(--awu-border-radius);
  margin-bottom: 1rem;
}

.message-item {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  max-width: 85%;

  &--sent {
    align-self: flex-end;
    background: #e3f2fd;
    border: 1px solid #bbdefb;
    border-bottom-right-radius: 4px;
  }

  &--received {
    align-self: flex-start;
    background: #fff;
    border: 1px solid var(--awu-gray-200, #e5e7eb);
    border-bottom-left-radius: 4px;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  &__time {
    font-size: 0.75rem;
    color: var(--awu-gray-500);
  }

  &__time-full {
    font-size: 0.7rem;
    color: var(--awu-gray-400);
  }

  &__subject {
    margin-bottom: 0.25rem;
  }

  &__body {
    font-size: 0.9rem;
    line-height: 1.5;
    white-space: pre-line;
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: var(--awu-gray-400);
    margin-top: 0.5rem;
    gap: 0.5rem;
  }
}

.quick-sms {
  display: flex;
  gap: 0.5rem;

  .flex-1 {
    flex: 1;
  }
}

// ============================================================
// TAB 4: WYSYLKA
// ============================================================
.shipping-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.shipping-card {
  :deep(.p-card-title) {
    font-size: 1.05rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &--return {
    border: 2px solid var(--awu-orange) !important;
  }
}

.return-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.return-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid var(--awu-gray-200, #e5e7eb);
  border-radius: var(--awu-border-radius);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--awu-blue);
  }

  &--selected {
    border-color: var(--awu-blue);
    background: rgba(59, 130, 246, 0.05);
  }

  i {
    font-size: 1.25rem;
    color: var(--awu-gray-500);
  }

  strong {
    display: block;
    font-size: 0.875rem;
  }

  &__cost {
    font-size: 0.8rem;
    color: var(--awu-gray-500);
    font-weight: 500;
  }
}

.serial-tracking {
  &__input-row {
    display: flex;
    gap: 0.5rem;

    .flex-1 {
      flex: 1;
    }
  }
}

.shipment-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.shipment-card {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__tracking {
    margin-left: 0.75rem;
    font-size: 0.85rem;
  }
}

.shipment-timeline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  padding: 0 1rem;

  &__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    z-index: 1;

    &--active {
      .shipment-timeline__dot {
        background: var(--awu-green);
        color: #fff;
      }

      .shipment-timeline__label {
        color: var(--awu-gray-800);
        font-weight: 600;
      }
    }
  }

  &__dot {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--awu-gray-200, #e5e7eb);
    color: var(--awu-gray-500);
    font-size: 0.85rem;
    position: relative;
    z-index: 2;
  }

  &__label {
    font-size: 0.75rem;
    color: var(--awu-gray-400);
    text-align: center;
  }

  &__line {
    position: absolute;
    top: 1rem;
    left: 2rem;
    right: 2rem;
    height: 2px;
    background: var(--awu-gray-200, #e5e7eb);
    z-index: 0;
  }

  &__line-fill {
    height: 100%;
    background: var(--awu-green);
    transition: width 0.3s ease;
  }
}

// ============================================================
// TAB 5: HISTORIA
// ============================================================
.history-section {
  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;

    h2 {
      margin: 0;
    }
  }

  .history-filter {
    min-width: 200px;
  }
}

.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.history-entry {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--awu-gray-100, #f3f4f6);

  &:last-child {
    border-bottom: none;
  }

  &__icon {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--awu-gray-50);
    font-size: 1rem;
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    flex-wrap: wrap;
  }

  &__action {
    font-size: 0.95rem;
  }

  &__time {
    font-size: 0.8rem;
    color: var(--awu-gray-500);
    white-space: nowrap;
  }

  &__time-full {
    color: var(--awu-gray-400);
    font-size: 0.75rem;
  }

  &__details {
    margin: 0.25rem 0 0.5rem;
    font-size: 0.875rem;
    color: var(--awu-gray-600);
  }

  &__diff {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--awu-gray-50);
    border-radius: var(--awu-border-radius);
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;

    .pi-arrow-right {
      color: var(--awu-gray-400);
      font-size: 0.7rem;
    }
  }

  &__diff-old {
    color: var(--awu-red);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    text-decoration: line-through;
    opacity: 0.8;
  }

  &__diff-new {
    color: var(--awu-green);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 600;
  }

  &__meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--awu-gray-400);
    align-items: center;
    flex-wrap: wrap;

    span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  }
}

// ============================================================
// SHARED STYLES
// ============================================================
.version-item {
  font-size: 0.8rem;
  strong { font-size: 0.9rem; }
}

.text-muted {
  color: var(--awu-gray-500);
  font-size: 0.8rem;
}

.text-italic {
  font-style: italic;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
  color: var(--awu-gray-500);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--awu-gray-400);

  i {
    font-size: 2.5rem;
  }
}

.email-form,
.courier-form,
.return-confirm {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--awu-gray-700);
  }
}

// Utility classes
.mb-3 { margin-bottom: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.w-full { width: 100%; }
.flex-1 { flex: 1; }
.p-error { color: var(--awu-red); font-size: 0.75rem; }

// Responsive tablet/mobile
@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;

    &__actions {
      width: 100%;
      justify-content: flex-end;
    }
  }

  .client-info {
    flex-direction: column;

    &__totals {
      margin-left: 0;
      width: 100%;
      justify-content: space-between;
      padding-top: 0.75rem;
      border-top: 1px solid var(--awu-gray-200, #e5e7eb);
    }
  }

  .verification-summary {
    flex-direction: column;

    &__actions {
      width: 100%;
      justify-content: flex-end;
    }
  }

  .contract-timeline {
    flex-direction: column;
    gap: 0.75rem;

    &__step::after {
      display: none;
    }
  }

  .history-entry {
    &__header {
      flex-direction: column;
    }
  }
}
</style>
