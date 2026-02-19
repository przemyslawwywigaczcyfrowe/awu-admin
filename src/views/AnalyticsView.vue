<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import Card from 'primevue/card'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import { useAppraisalsStore } from '@/stores/appraisals.store'
import { AppraisalStatus } from '@/types/enums'
import { STATUS_CONFIG } from '@/utils/statusConfig'
import { formatPrice } from '@/utils/priceFormatter'
import { formatDateNumeric } from '@/utils/dateFormatter'
import type { AppraisalListItem } from '@/types/appraisal.types'

const appraisalsStore = useAppraisalsStore()

onMounted(() => {
  appraisalsStore.loadAppraisals()
})

// --- Period Filter ---
const periodOptions = [
  { label: 'Ostatnie 30 dni', value: 30 },
  { label: 'Ostatnie 90 dni', value: 90 },
  { label: 'Ostatni rok', value: 365 },
  { label: 'Cały okres', value: 0 }
]
const selectedPeriod = ref(0)

const filteredAppraisals = computed<AppraisalListItem[]>(() => {
  const all = appraisalsStore.appraisals
  if (selectedPeriod.value === 0) return all
  const now = new Date()
  const cutoff = new Date(now.getTime() - selectedPeriod.value * 86400000)
  return all.filter(a => new Date(a.createdAt) >= cutoff)
})

// --- Helpers ---
function daysBetween(dateStr: string, refDate: Date): number {
  const d = new Date(dateStr)
  return Math.max(0, Math.round((refDate.getTime() - d.getTime()) / 86400000))
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

const now = new Date()

// ============================================================
// TAB 1: PRZEGLĄD (Overview)
// ============================================================

const totalAppraisals = computed(() => filteredAppraisals.value.length)

const totalBuybackValue = computed(() =>
  filteredAppraisals.value
    .filter(a => [
      AppraisalStatus.ZAAKCEPTOWANA,
      AppraisalStatus.UMOWA_W_PRZYGOTOWANIU,
      AppraisalStatus.UMOWA_PODPISANA,
      AppraisalStatus.REALIZACJA_FINANSOWA,
      AppraisalStatus.ZAKONCZONA
    ].includes(a.status))
    .reduce((sum, a) => sum + a.totalPriceTransfer, 0)
)

const avgProcessingDays = computed(() => {
  const items = filteredAppraisals.value
  if (items.length === 0) return 0
  const totalDays = items.reduce((sum, a) => {
    const days = daysBetween(a.createdAt, now)
    const statusMultiplier =
      a.status >= AppraisalStatus.ZAKONCZONA ? 0.6 :
      a.status >= AppraisalStatus.ZAAKCEPTOWANA ? 0.8 : 1.0
    return sum + Math.round(days * statusMultiplier * seededRandom(a.id + 7) + 1)
  }, 0)
  return Math.round(totalDays / items.length)
})

const acceptanceRate = computed(() => {
  const decided = filteredAppraisals.value.filter(a =>
    [AppraisalStatus.ZAAKCEPTOWANA, AppraisalStatus.ODRZUCONA,
     AppraisalStatus.UMOWA_W_PRZYGOTOWANIU, AppraisalStatus.UMOWA_PODPISANA,
     AppraisalStatus.REALIZACJA_FINANSOWA, AppraisalStatus.ZAKONCZONA].includes(a.status)
  )
  const accepted = decided.filter(a => a.status !== AppraisalStatus.ODRZUCONA)
  if (decided.length === 0) return 0
  return Math.round((accepted.length / decided.length) * 100)
})

const avgAppraisalValue = computed(() => {
  const items = filteredAppraisals.value
  if (items.length === 0) return 0
  return Math.round(items.reduce((sum, a) => sum + a.totalPriceTransfer, 0) / items.length)
})

const productsInProgress = computed(() =>
  filteredAppraisals.value
    .filter(a => ![AppraisalStatus.ZAKONCZONA, AppraisalStatus.ODRZUCONA, AppraisalStatus.ZWROT_DO_KLIENTA].includes(a.status))
    .reduce((sum, a) => sum + a.productCount, 0)
)

const overviewKpis = computed(() => [
  { label: 'Łączna liczba wycen', value: totalAppraisals.value.toString(), icon: 'pi pi-list', color: '#3B82F6' },
  { label: 'Wartość odkupionych (PLN)', value: formatPrice(totalBuybackValue.value), icon: 'pi pi-wallet', color: '#10B981' },
  { label: 'Średni czas obsługi (dni)', value: avgProcessingDays.value.toString(), icon: 'pi pi-clock', color: '#F59E0B' },
  { label: 'Wskaźnik akceptacji (%)', value: acceptanceRate.value + '%', icon: 'pi pi-thumbs-up', color: '#8B5CF6' },
  { label: 'Średnia wartość wyceny (PLN)', value: formatPrice(avgAppraisalValue.value), icon: 'pi pi-chart-line', color: '#3B82F6' },
  { label: 'Produkty w toku', value: productsInProgress.value.toString(), icon: 'pi pi-box', color: '#F59E0B' }
])

// Status distribution
const statusDistribution = computed(() => {
  const counts: Record<number, number> = {}
  const total = filteredAppraisals.value.length
  filteredAppraisals.value.forEach(a => {
    counts[a.status] = (counts[a.status] || 0) + 1
  })
  const allStatuses = Object.values(AppraisalStatus).filter(v => typeof v === 'number') as number[]
  return allStatuses
    .filter(s => (counts[s] || 0) > 0)
    .map(s => ({
      status: s as AppraisalStatus,
      label: STATUS_CONFIG[s as AppraisalStatus]?.label || 'Nieznany',
      color: STATUS_CONFIG[s as AppraisalStatus]?.color || '#999',
      count: counts[s] || 0,
      percent: total > 0 ? Math.round(((counts[s] || 0) / total) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count)
})

// Location breakdown
const locationBreakdown = computed(() => {
  const map = new Map<string, { count: number; totalValue: number }>()
  const total = filteredAppraisals.value.length
  filteredAppraisals.value.forEach(a => {
    const loc = a.locationName || 'Nieprzypisana'
    if (!map.has(loc)) map.set(loc, { count: 0, totalValue: 0 })
    const entry = map.get(loc)!
    entry.count++
    entry.totalValue += a.totalPriceTransfer
  })
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalValue: data.totalValue,
      avgValue: data.count > 0 ? Math.round(data.totalValue / data.count) : 0,
      percentOfTotal: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count)
})

// Monthly trend
const monthlyTrend = computed(() => {
  const map = new Map<string, number>()
  filteredAppraisals.value.forEach(a => {
    const d = new Date(a.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  })
  const monthNames: Record<string, string> = {
    '01': 'Styczeń', '02': 'Luty', '03': 'Marzec', '04': 'Kwiecień',
    '05': 'Maj', '06': 'Czerwiec', '07': 'Lipiec', '08': 'Sierpień',
    '09': 'Wrzesień', '10': 'Październik', '11': 'Listopad', '12': 'Grudzień'
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [year, month] = key.split('-')
      return {
        key,
        label: `${monthNames[month]} ${year}`,
        count
      }
    })
})

const maxMonthlyCount = computed(() =>
  monthlyTrend.value.length > 0 ? Math.max(...monthlyTrend.value.map(m => m.count)) : 1
)

// ============================================================
// TAB 2: CZASY OBSŁUGI (Processing Times)
// ============================================================

function mockProcessingTime(appraisal: AppraisalListItem, phase: 'verification' | 'decision' | 'total'): number {
  const base = daysBetween(appraisal.createdAt, now)
  const seed = appraisal.id + (phase === 'verification' ? 13 : phase === 'decision' ? 37 : 59)
  const r = seededRandom(seed)
  if (phase === 'verification') return Math.max(1, Math.round(r * Math.min(base, 14) * 0.5 + 0.5))
  if (phase === 'decision') return Math.max(1, Math.round(r * Math.min(base, 21) * 0.4 + 1))
  return Math.max(2, Math.round(r * Math.min(base, 45) * 0.6 + 2))
}

const processingKpis = computed(() => {
  const items = filteredAppraisals.value
  if (items.length === 0) return [
    { label: 'Śr. czas do weryfikacji', value: '0 dni', icon: 'pi pi-search', color: '#3B82F6' },
    { label: 'Śr. czas do decyzji klienta', value: '0 dni', icon: 'pi pi-user', color: '#F59E0B' },
    { label: 'Śr. czas całkowity', value: '0 dni', icon: 'pi pi-clock', color: '#10B981' },
    { label: 'Najdłużej oczekujące', value: '0 dni', icon: 'pi pi-exclamation-triangle', color: '#EF4444' }
  ]
  const avgVerification = Math.round(items.reduce((s, a) => s + mockProcessingTime(a, 'verification'), 0) / items.length)
  const avgDecision = Math.round(items.reduce((s, a) => s + mockProcessingTime(a, 'decision'), 0) / items.length)
  const avgTotal = Math.round(items.reduce((s, a) => s + mockProcessingTime(a, 'total'), 0) / items.length)
  const pending = items.filter(a => ![AppraisalStatus.ZAKONCZONA, AppraisalStatus.ODRZUCONA, AppraisalStatus.ZWROT_DO_KLIENTA].includes(a.status))
  const longest = pending.length > 0 ? Math.max(...pending.map(a => daysBetween(a.createdAt, now))) : 0
  return [
    { label: 'Śr. czas do weryfikacji', value: avgVerification + ' dni', icon: 'pi pi-search', color: '#3B82F6' },
    { label: 'Śr. czas do decyzji klienta', value: avgDecision + ' dni', icon: 'pi pi-user', color: '#F59E0B' },
    { label: 'Śr. czas całkowity', value: avgTotal + ' dni', icon: 'pi pi-clock', color: '#10B981' },
    { label: 'Najdłużej oczekujące', value: longest + ' dni', icon: 'pi pi-exclamation-triangle', color: '#EF4444' }
  ]
})

// Processing times by location
const processingByLocation = computed(() => {
  const map = new Map<string, { verificationSum: number; decisionSum: number; totalSum: number; count: number }>()
  filteredAppraisals.value.forEach(a => {
    const loc = a.locationName || 'Nieprzypisana'
    if (!map.has(loc)) map.set(loc, { verificationSum: 0, decisionSum: 0, totalSum: 0, count: 0 })
    const entry = map.get(loc)!
    entry.verificationSum += mockProcessingTime(a, 'verification')
    entry.decisionSum += mockProcessingTime(a, 'decision')
    entry.totalSum += mockProcessingTime(a, 'total')
    entry.count++
  })
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      avgVerification: data.count > 0 ? Math.round(data.verificationSum / data.count) : 0,
      avgDecision: data.count > 0 ? Math.round(data.decisionSum / data.count) : 0,
      avgTotal: data.count > 0 ? Math.round(data.totalSum / data.count) : 0,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count)
})

// Processing times by operator
const processingByOperator = computed(() => {
  const map = new Map<string, { verificationSum: number; decisionSum: number; totalSum: number; count: number }>()
  filteredAppraisals.value.forEach(a => {
    const op = a.assignedOperatorName || 'Nieprzypisany'
    if (!map.has(op)) map.set(op, { verificationSum: 0, decisionSum: 0, totalSum: 0, count: 0 })
    const entry = map.get(op)!
    entry.verificationSum += mockProcessingTime(a, 'verification')
    entry.decisionSum += mockProcessingTime(a, 'decision')
    entry.totalSum += mockProcessingTime(a, 'total')
    entry.count++
  })
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      avgVerification: data.count > 0 ? Math.round(data.verificationSum / data.count) : 0,
      avgDecision: data.count > 0 ? Math.round(data.decisionSum / data.count) : 0,
      avgTotal: data.count > 0 ? Math.round(data.totalSum / data.count) : 0,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count)
})

// ============================================================
// TAB 3: OPERATORZY (Operators)
// ============================================================

const operatorPerformance = computed(() => {
  const map = new Map<string, {
    locations: Set<string>
    active: number
    completed: number
    total: number
    accepted: number
    decided: number
    totalTimeSum: number
  }>()
  filteredAppraisals.value.forEach(a => {
    const op = a.assignedOperatorName
    if (!op) return
    if (!map.has(op)) map.set(op, { locations: new Set(), active: 0, completed: 0, total: 0, accepted: 0, decided: 0, totalTimeSum: 0 })
    const entry = map.get(op)!
    entry.locations.add(a.locationName)
    entry.total++
    entry.totalTimeSum += mockProcessingTime(a, 'total')
    if ([AppraisalStatus.ZAKONCZONA].includes(a.status)) {
      entry.completed++
    }
    if (![AppraisalStatus.ZAKONCZONA, AppraisalStatus.ODRZUCONA, AppraisalStatus.ZWROT_DO_KLIENTA].includes(a.status)) {
      entry.active++
    }
    if ([AppraisalStatus.ZAAKCEPTOWANA, AppraisalStatus.UMOWA_W_PRZYGOTOWANIU, AppraisalStatus.UMOWA_PODPISANA,
         AppraisalStatus.REALIZACJA_FINANSOWA, AppraisalStatus.ZAKONCZONA].includes(a.status)) {
      entry.accepted++
      entry.decided++
    } else if (a.status === AppraisalStatus.ODRZUCONA) {
      entry.decided++
    }
  })
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      location: Array.from(data.locations).join(', '),
      active: data.active,
      completed: data.completed,
      total: data.total,
      avgTime: data.total > 0 ? Math.round(data.totalTimeSum / data.total) : 0,
      acceptanceRate: data.decided > 0 ? Math.round((data.accepted / data.decided) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)
})

// Salon self-sufficiency
const salonSelfSufficiency = computed(() => {
  const locationNames = [...new Set(filteredAppraisals.value.map(a => a.locationName))]
  return locationNames.map(loc => {
    const locAppraisals = filteredAppraisals.value.filter(a => a.locationName === loc)
    const forwarded = locAppraisals.filter(a => a.status === AppraisalStatus.PRZEKAZANA_DO_CENTRALI).length
    const total = locAppraisals.length
    const completedLocally = total - forwarded
    return {
      location: loc,
      total,
      completedLocally,
      forwarded,
      selfSufficiency: total > 0 ? Math.round((completedLocally / total) * 100) : 0
    }
  }).sort((a, b) => b.selfSufficiency - a.selfSufficiency)
})

// Mismatch analysis (simulated)
const mismatchAnalysis = computed(() => {
  const operators = [...new Set(filteredAppraisals.value.map(a => a.assignedOperatorName).filter(Boolean))] as string[]
  return operators.map(op => {
    const opAppraisals = filteredAppraisals.value.filter(a => a.assignedOperatorName === op)
    const total = opAppraisals.length
    const seed = op.charCodeAt(0) + op.length * 17
    const mismatchRate = Math.round(seededRandom(seed) * 25 + 5)
    const corrections = Math.round(total * mismatchRate / 100)
    const avgDiff = Math.round(seededRandom(seed + 3) * 15 + 3)
    return {
      operator: op,
      totalAppraised: total,
      corrections,
      mismatchRate,
      avgPriceDiffPercent: avgDiff
    }
  }).sort((a, b) => b.mismatchRate - a.mismatchRate)
})

// ============================================================
// TAB 4: FINANSOWE (Financial)
// ============================================================

const financialKpis = computed(() => {
  const items = filteredAppraisals.value
  const completedStatuses = [
    AppraisalStatus.ZAAKCEPTOWANA, AppraisalStatus.UMOWA_W_PRZYGOTOWANIU,
    AppraisalStatus.UMOWA_PODPISANA, AppraisalStatus.REALIZACJA_FINANSOWA,
    AppraisalStatus.ZAKONCZONA
  ]
  const completed = items.filter(a => completedStatuses.includes(a.status))
  const totalTransfer = completed.reduce((s, a) => s + a.totalPriceTransfer, 0)
  const totalGiftCard = completed.reduce((s, a) => s + a.totalPriceGiftCard, 0)
  const totalAll = items.reduce((s, a) => s + a.totalPriceTransfer, 0)
  const simulatedMargin = totalAll > 0 ? Math.round(seededRandom(42) * 8 + 12) : 0

  return [
    { label: 'Całkowita wartość skupu', value: formatPrice(totalTransfer + totalGiftCard), icon: 'pi pi-dollar', color: '#10B981' },
    { label: 'Średnia marża (symulowana)', value: simulatedMargin + '%', icon: 'pi pi-percentage', color: '#3B82F6' },
    { label: 'Wartość przelew', value: formatPrice(totalTransfer), icon: 'pi pi-send', color: '#8B5CF6' },
    { label: 'Wartość karta podarunkowa', value: formatPrice(totalGiftCard), icon: 'pi pi-credit-card', color: '#F59E0B' }
  ]
})

// Financial by location
const financialByLocation = computed(() => {
  const map = new Map<string, { transfer: number; giftCard: number; count: number }>()
  filteredAppraisals.value.forEach(a => {
    const loc = a.locationName || 'Nieprzypisana'
    if (!map.has(loc)) map.set(loc, { transfer: 0, giftCard: 0, count: 0 })
    const entry = map.get(loc)!
    entry.transfer += a.totalPriceTransfer
    entry.giftCard += a.totalPriceGiftCard
    entry.count++
  })
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      transfer: data.transfer,
      giftCard: data.giftCard,
      total: data.transfer + data.giftCard,
      count: data.count,
      avgValue: data.count > 0 ? Math.round((data.transfer + data.giftCard) / data.count) : 0
    }))
    .sort((a, b) => b.total - a.total)
})

// Top 10 highest
const topAppraisals = computed(() =>
  [...filteredAppraisals.value]
    .sort((a, b) => (b.totalPriceTransfer + b.totalPriceGiftCard) - (a.totalPriceTransfer + a.totalPriceGiftCard))
    .slice(0, 10)
)

// Value distribution
const valueDistribution = computed(() => {
  const ranges = [
    { label: '0 - 200 PLN', min: 0, max: 200 },
    { label: '200 - 500 PLN', min: 200, max: 500 },
    { label: '500 - 1 000 PLN', min: 500, max: 1000 },
    { label: '1 000 - 2 000 PLN', min: 1000, max: 2000 },
    { label: '2 000+ PLN', min: 2000, max: Infinity }
  ]
  const total = filteredAppraisals.value.length
  return ranges.map(range => {
    const count = filteredAppraisals.value.filter(a => {
      const val = a.totalPriceTransfer
      return val >= range.min && (range.max === Infinity ? true : val < range.max)
    }).length
    return {
      ...range,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0
    }
  })
})

const maxDistributionCount = computed(() =>
  valueDistribution.value.length > 0 ? Math.max(...valueDistribution.value.map(d => d.count)) : 1
)

// ============================================================
// TAB 5: KOMUNIKACJA (Communication)
// ============================================================

// Simulated communication KPIs
const communicationKpis = computed(() => {
  const items = filteredAppraisals.value
  const total = items.length
  const avgMessages = total > 0 ? (Math.round((items.reduce((s, a) => s + seededRandom(a.id + 100) * 6 + 2, 0) / total) * 10) / 10) : 0
  const awaitingResponse = items.filter(a =>
    [AppraisalStatus.OCZEKUJE_NA_DECYZJE, AppraisalStatus.W_TRAKCIE_WERYFIKACJI].includes(a.status)
  ).length
  const avgResponseHours = total > 0 ? Math.round(items.reduce((s, a) => s + seededRandom(a.id + 200) * 36 + 2, 0) / total) : 0
  return [
    { label: 'Śr. wiadomości na wycenę', value: avgMessages.toFixed(1), icon: 'pi pi-envelope', color: '#3B82F6' },
    { label: 'Wyceny oczekujące na odpowiedź', value: awaitingResponse.toString(), icon: 'pi pi-clock', color: '#F59E0B' },
    { label: 'Śr. czas odpowiedzi', value: avgResponseHours + ' godz.', icon: 'pi pi-stopwatch', color: '#10B981' }
  ]
})

// Delay reasons (simulated)
const delayReasons = computed(() => {
  const reasons = [
    { reason: 'Brak odpowiedzi klienta', percentage: 34, color: '#EF4444' },
    { reason: 'Oczekiwanie na przesyłkę', percentage: 22, color: '#F59E0B' },
    { reason: 'Weryfikacja stanu technicznego', percentage: 18, color: '#3B82F6' },
    { reason: 'Konsultacja z ekspertem', percentage: 12, color: '#8B5CF6' },
    { reason: 'Kompletowanie dokumentacji', percentage: 9, color: '#10B981' },
    { reason: 'Inne', percentage: 5, color: '#6B7280' }
  ]
  const total = filteredAppraisals.value.length
  return reasons.map(r => ({
    ...r,
    estimatedCount: Math.round(total * r.percentage / 100)
  }))
})

// Communication flow steps
const communicationFlow = [
  { step: 1, title: 'Formularz online', description: 'Klient wypełnia formularz z danymi produktów', icon: 'pi pi-file-edit', color: '#3B82F6' },
  { step: 2, title: 'Potwierdzenie przyjęcia', description: 'Automatyczny e-mail z numerem wyceny', icon: 'pi pi-envelope', color: '#3B82F6' },
  { step: 3, title: 'Weryfikacja produktów', description: 'Operator weryfikuje stan i kompletność', icon: 'pi pi-search', color: '#F59E0B' },
  { step: 4, title: 'Oferta cenowa', description: 'Wysłanie wyceny z propozycją kwoty', icon: 'pi pi-tag', color: '#10B981' },
  { step: 5, title: 'Decyzja klienta', description: 'Klient akceptuje lub odrzuca ofertę', icon: 'pi pi-user', color: '#8B5CF6' },
  { step: 6, title: 'Umowa i rozliczenie', description: 'Generowanie umowy, wypłata środków', icon: 'pi pi-check-circle', color: '#10B981' }
]

// Utility for severity display
function getAcceptanceSeverity(rate: number): 'success' | 'warn' | 'danger' {
  if (rate >= 80) return 'success'
  if (rate >= 60) return 'warn'
  return 'danger'
}

function getSufficiencySeverity(rate: number): 'success' | 'warn' | 'danger' {
  if (rate >= 85) return 'success'
  if (rate >= 60) return 'warn'
  return 'danger'
}

function getMismatchSeverity(rate: number): 'success' | 'warn' | 'danger' {
  if (rate <= 10) return 'success'
  if (rate <= 20) return 'warn'
  return 'danger'
}

// Export placeholder
// Communication by location
const communicationByLocation = computed(() => {
  const map = new Map<string, { count: number; msgSum: number; awaiting: number; responseSum: number }>()
  filteredAppraisals.value.forEach(a => {
    const loc = a.locationName || 'Nieprzypisana'
    if (!map.has(loc)) map.set(loc, { count: 0, msgSum: 0, awaiting: 0, responseSum: 0 })
    const entry = map.get(loc)!
    entry.count++
    entry.msgSum += Math.round(seededRandom(a.id + 100) * 6 + 2)
    if ([AppraisalStatus.OCZEKUJE_NA_DECYZJE, AppraisalStatus.W_TRAKCIE_WERYFIKACJI].includes(a.status)) {
      entry.awaiting++
    }
    entry.responseSum += Math.round(seededRandom(a.id + 200) * 36 + 2)
  })
  return Array.from(map.entries())
    .map(([loc, data]) => ({
      location: loc,
      totalAppraisals: data.count,
      avgMessages: data.count > 0 ? data.msgSum / data.count : 0,
      awaiting: data.awaiting,
      avgResponseTime: data.count > 0 ? Math.round(data.responseSum / data.count) : 0
    }))
    .sort((a, b) => b.totalAppraisals - a.totalAppraisals)
})

function exportData() {
  // Placeholder for future export functionality
}
</script>

<template>
  <div class="analytics">
    <!-- Header -->
    <div class="analytics__header">
      <div class="analytics__header-left">
        <h1>Analityka</h1>
        <p class="analytics__subtitle">Szczegółowe statystyki i metryki programu skupu sprzętu</p>
      </div>
      <div class="analytics__header-right">
        <Select
          v-model="selectedPeriod"
          :options="periodOptions"
          optionLabel="label"
          optionValue="value"
          class="analytics__period-select"
        />
        <Button
          icon="pi pi-download"
          label="Eksportuj"
          severity="secondary"
          outlined
          size="small"
          @click="exportData"
        />
      </div>
    </div>

    <!-- Tabs -->
    <TabView class="analytics__tabs">

      <!-- TAB 1: Przegląd -->
      <TabPanel header="Przegląd" value="0">
        <div class="analytics__section">
          <!-- KPI Cards -->
          <div class="analytics__kpi-grid analytics__kpi-grid--6">
            <Card v-for="kpi in overviewKpis" :key="kpi.label" class="kpi-card">
              <template #content>
                <div class="kpi-card__body">
                  <div class="kpi-card__icon" :style="{ color: kpi.color }">
                    <i :class="kpi.icon" />
                  </div>
                  <div class="kpi-card__info">
                    <div class="kpi-card__value">{{ kpi.value }}</div>
                    <div class="kpi-card__label">{{ kpi.label }}</div>
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <!-- Status Distribution -->
          <Card class="analytics__card">
            <template #title>Rozkład statusów</template>
            <template #content>
              <div class="status-bar">
                <div class="status-bar__track">
                  <div
                    v-for="item in statusDistribution"
                    :key="item.status"
                    class="status-bar__segment"
                    :style="{ width: item.percent + '%', backgroundColor: item.color }"
                    :title="`${item.label}: ${item.count} (${item.percent}%)`"
                  />
                </div>
                <div class="status-bar__legend">
                  <div
                    v-for="item in statusDistribution"
                    :key="item.status"
                    class="status-bar__legend-item"
                  >
                    <span class="status-bar__dot" :style="{ backgroundColor: item.color }" />
                    <span class="status-bar__legend-label">{{ item.label }}</span>
                    <span class="status-bar__legend-value">{{ item.count }} ({{ item.percent }}%)</span>
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Location Breakdown -->
          <Card class="analytics__card">
            <template #title>Rozbicie wg lokalizacji</template>
            <template #content>
              <DataTable :value="locationBreakdown" stripedRows size="small" :rows="10">
                <Column field="name" header="Lokalizacja" />
                <Column field="count" header="Liczba wycen" sortable>
                  <template #body="{ data }">
                    <strong>{{ data.count }}</strong>
                  </template>
                </Column>
                <Column header="Wartość łączna" sortable sortField="totalValue">
                  <template #body="{ data }">
                    {{ formatPrice(data.totalValue) }}
                  </template>
                </Column>
                <Column header="Śr. wartość" sortable sortField="avgValue">
                  <template #body="{ data }">
                    {{ formatPrice(data.avgValue) }}
                  </template>
                </Column>
                <Column header="% całości" sortable sortField="percentOfTotal">
                  <template #body="{ data }">
                    <div class="percent-cell">
                      <ProgressBar :value="data.percentOfTotal" :showValue="false" style="height: 8px; flex: 1" />
                      <span class="percent-cell__text">{{ data.percentOfTotal }}%</span>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>

          <!-- Monthly Trend -->
          <Card class="analytics__card">
            <template #title>Trend miesięczny</template>
            <template #content>
              <div class="monthly-chart">
                <div
                  v-for="month in monthlyTrend"
                  :key="month.key"
                  class="monthly-chart__item"
                >
                  <div class="monthly-chart__bar-wrapper">
                    <div
                      class="monthly-chart__bar"
                      :style="{ height: (month.count / maxMonthlyCount * 100) + '%' }"
                    >
                      <span class="monthly-chart__bar-value">{{ month.count }}</span>
                    </div>
                  </div>
                  <div class="monthly-chart__label">{{ month.label }}</div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </TabPanel>

      <!-- TAB 2: Czasy obsługi -->
      <TabPanel header="Czasy obsługi" value="1">
        <div class="analytics__section">
          <!-- KPI Cards -->
          <div class="analytics__kpi-grid analytics__kpi-grid--4">
            <Card v-for="kpi in processingKpis" :key="kpi.label" class="kpi-card">
              <template #content>
                <div class="kpi-card__body">
                  <div class="kpi-card__icon" :style="{ color: kpi.color }">
                    <i :class="kpi.icon" />
                  </div>
                  <div class="kpi-card__info">
                    <div class="kpi-card__value">{{ kpi.value }}</div>
                    <div class="kpi-card__label">{{ kpi.label }}</div>
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <!-- Processing by location -->
          <Card class="analytics__card">
            <template #title>Średnie czasy obsługi wg lokalizacji</template>
            <template #content>
              <DataTable :value="processingByLocation" stripedRows size="small" :rows="10">
                <Column field="name" header="Lokalizacja" />
                <Column field="count" header="Liczba wycen" sortable />
                <Column header="Śr. weryfikacja (dni)" sortable sortField="avgVerification">
                  <template #body="{ data }">
                    <Tag :value="data.avgVerification + ' dni'" :severity="data.avgVerification <= 3 ? 'success' : data.avgVerification <= 7 ? 'warn' : 'danger'" />
                  </template>
                </Column>
                <Column header="Śr. decyzja klienta (dni)" sortable sortField="avgDecision">
                  <template #body="{ data }">
                    <Tag :value="data.avgDecision + ' dni'" :severity="data.avgDecision <= 5 ? 'success' : data.avgDecision <= 10 ? 'warn' : 'danger'" />
                  </template>
                </Column>
                <Column header="Śr. czas całkowity (dni)" sortable sortField="avgTotal">
                  <template #body="{ data }">
                    <div class="time-cell">
                      <ProgressBar :value="Math.min(data.avgTotal * 3, 100)" :showValue="false" style="height: 8px; flex: 1" />
                      <strong>{{ data.avgTotal }} dni</strong>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>

          <!-- Processing by operator -->
          <Card class="analytics__card">
            <template #title>Średnie czasy obsługi wg operatora</template>
            <template #content>
              <DataTable :value="processingByOperator" stripedRows size="small" :rows="15" paginator>
                <Column field="name" header="Operator" />
                <Column field="count" header="Liczba wycen" sortable />
                <Column header="Śr. weryfikacja (dni)" sortable sortField="avgVerification">
                  <template #body="{ data }">
                    <Tag :value="data.avgVerification + ' dni'" :severity="data.avgVerification <= 3 ? 'success' : data.avgVerification <= 7 ? 'warn' : 'danger'" />
                  </template>
                </Column>
                <Column header="Śr. decyzja (dni)" sortable sortField="avgDecision">
                  <template #body="{ data }">
                    <Tag :value="data.avgDecision + ' dni'" :severity="data.avgDecision <= 5 ? 'success' : data.avgDecision <= 10 ? 'warn' : 'danger'" />
                  </template>
                </Column>
                <Column header="Śr. całkowity (dni)" sortable sortField="avgTotal">
                  <template #body="{ data }">
                    <div class="time-cell">
                      <ProgressBar :value="Math.min(data.avgTotal * 3, 100)" :showValue="false" style="height: 8px; flex: 1" />
                      <strong>{{ data.avgTotal }} dni</strong>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>
        </div>
      </TabPanel>

      <!-- TAB 3: Operatorzy -->
      <TabPanel header="Operatorzy" value="2">
        <div class="analytics__section">
          <!-- Operator performance -->
          <Card class="analytics__card">
            <template #title>Wydajność operatorów</template>
            <template #content>
              <DataTable :value="operatorPerformance" stripedRows size="small" :rows="15" paginator>
                <Column field="name" header="Operator" style="min-width: 160px">
                  <template #body="{ data }">
                    <div>
                      <strong>{{ data.name }}</strong>
                      <div class="cell-sub">{{ data.location }}</div>
                    </div>
                  </template>
                </Column>
                <Column field="active" header="Aktywne" sortable style="width: 90px" />
                <Column field="completed" header="Zakończone" sortable style="width: 110px" />
                <Column field="total" header="Łącznie" sortable style="width: 90px" />
                <Column header="Śr. czas (dni)" sortable sortField="avgTime" style="width: 130px">
                  <template #body="{ data }">
                    {{ data.avgTime }} dni
                  </template>
                </Column>
                <Column header="Wsk. akceptacji" sortable sortField="acceptanceRate" style="width: 150px">
                  <template #body="{ data }">
                    <Tag :value="data.acceptanceRate + '%'" :severity="getAcceptanceSeverity(data.acceptanceRate)" />
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>

          <!-- Salon self-sufficiency -->
          <Card class="analytics__card">
            <template #title>Samodzielność salonów</template>
            <template #subtitle>Procent wycen obsłużonych lokalnie vs przekazanych do centrali</template>
            <template #content>
              <DataTable :value="salonSelfSufficiency" stripedRows size="small" :rows="10">
                <Column field="location" header="Lokalizacja" />
                <Column field="total" header="Łącznie" sortable />
                <Column field="completedLocally" header="Obsłużono lokalnie" sortable />
                <Column field="forwarded" header="Przekazano do centrali" sortable />
                <Column header="Samodzielność" sortable sortField="selfSufficiency" style="min-width: 200px">
                  <template #body="{ data }">
                    <div class="sufficiency-cell">
                      <ProgressBar :value="data.selfSufficiency" :showValue="false" style="height: 10px; flex: 1" />
                      <Tag
                        :value="data.selfSufficiency + '%'"
                        :severity="getSufficiencySeverity(data.selfSufficiency)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>

          <!-- Mismatch analysis -->
          <Card class="analytics__card">
            <template #title>Analiza rozbieżności deklaracja vs ekspertyza</template>
            <template #subtitle>Symulowane dane częstotliwości korekty wycen przez operatorów</template>
            <template #content>
              <DataTable :value="mismatchAnalysis" stripedRows size="small" :rows="15" paginator>
                <Column field="operator" header="Operator" />
                <Column field="totalAppraised" header="Wyceny łącznie" sortable />
                <Column field="corrections" header="Korekty" sortable />
                <Column header="Wsk. rozbieżności" sortable sortField="mismatchRate">
                  <template #body="{ data }">
                    <Tag :value="data.mismatchRate + '%'" :severity="getMismatchSeverity(data.mismatchRate)" />
                  </template>
                </Column>
                <Column header="Śr. różnica cenowa" sortable sortField="avgPriceDiffPercent">
                  <template #body="{ data }">
                    {{ data.avgPriceDiffPercent }}%
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>
        </div>
      </TabPanel>

      <!-- TAB 4: Finansowe -->
      <TabPanel header="Finansowe" value="3">
        <div class="analytics__section">
          <!-- Financial KPIs -->
          <div class="analytics__kpi-grid analytics__kpi-grid--4">
            <Card v-for="kpi in financialKpis" :key="kpi.label" class="kpi-card">
              <template #content>
                <div class="kpi-card__body">
                  <div class="kpi-card__icon" :style="{ color: kpi.color }">
                    <i :class="kpi.icon" />
                  </div>
                  <div class="kpi-card__info">
                    <div class="kpi-card__value">{{ kpi.value }}</div>
                    <div class="kpi-card__label">{{ kpi.label }}</div>
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <!-- Financial by location -->
          <Card class="analytics__card">
            <template #title>Wartość wg lokalizacji</template>
            <template #content>
              <DataTable :value="financialByLocation" stripedRows size="small" :rows="10">
                <Column field="name" header="Lokalizacja" />
                <Column field="count" header="Wyceny" sortable />
                <Column header="Przelew" sortable sortField="transfer">
                  <template #body="{ data }">
                    {{ formatPrice(data.transfer) }}
                  </template>
                </Column>
                <Column header="Karta podarunkowa" sortable sortField="giftCard">
                  <template #body="{ data }">
                    {{ formatPrice(data.giftCard) }}
                  </template>
                </Column>
                <Column header="Łącznie" sortable sortField="total">
                  <template #body="{ data }">
                    <strong>{{ formatPrice(data.total) }}</strong>
                  </template>
                </Column>
                <Column header="Śr. wartość" sortable sortField="avgValue">
                  <template #body="{ data }">
                    {{ formatPrice(data.avgValue) }}
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>

          <!-- Top 10 appraisals -->
          <Card class="analytics__card">
            <template #title>Top 10 najwyższych wycen</template>
            <template #content>
              <DataTable :value="topAppraisals" stripedRows size="small">
                <Column header="#" style="width: 40px">
                  <template #body="{ index }">
                    <strong>{{ index + 1 }}</strong>
                  </template>
                </Column>
                <Column field="appraisalNumber" header="Nr wyceny" style="width: 100px" />
                <Column field="clientName" header="Klient" />
                <Column field="locationName" header="Lokalizacja" />
                <Column field="productCount" header="Produkty" style="width: 90px" />
                <Column header="Wartość przelew" sortable sortField="totalPriceTransfer">
                  <template #body="{ data }">
                    {{ formatPrice(data.totalPriceTransfer) }}
                  </template>
                </Column>
                <Column header="Wartość karta" sortable sortField="totalPriceGiftCard">
                  <template #body="{ data }">
                    {{ formatPrice(data.totalPriceGiftCard) }}
                  </template>
                </Column>
                <Column header="Łącznie">
                  <template #body="{ data }">
                    <strong>{{ formatPrice(data.totalPriceTransfer + data.totalPriceGiftCard) }}</strong>
                  </template>
                </Column>
                <Column header="Data">
                  <template #body="{ data }">
                    {{ formatDateNumeric(data.createdAt, false) }}
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>

          <!-- Value Distribution -->
          <Card class="analytics__card">
            <template #title>Rozkład wartości wycen</template>
            <template #content>
              <div class="distribution">
                <div
                  v-for="range in valueDistribution"
                  :key="range.label"
                  class="distribution__row"
                >
                  <div class="distribution__label">{{ range.label }}</div>
                  <div class="distribution__bar-wrapper">
                    <div
                      class="distribution__bar"
                      :style="{ width: (range.count / maxDistributionCount * 100) + '%' }"
                    />
                  </div>
                  <div class="distribution__count">{{ range.count }}</div>
                  <div class="distribution__percent">{{ range.percent }}%</div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </TabPanel>

      <!-- TAB 5: Komunikacja -->
      <TabPanel header="Komunikacja" value="4">
        <div class="analytics__section">
          <!-- Communication KPIs -->
          <div class="analytics__kpi-grid analytics__kpi-grid--3">
            <Card v-for="kpi in communicationKpis" :key="kpi.label" class="kpi-card">
              <template #content>
                <div class="kpi-card__body">
                  <div class="kpi-card__icon" :style="{ color: kpi.color }">
                    <i :class="kpi.icon" />
                  </div>
                  <div class="kpi-card__info">
                    <div class="kpi-card__value">{{ kpi.value }}</div>
                    <div class="kpi-card__label">{{ kpi.label }}</div>
                  </div>
                </div>
              </template>
            </Card>
          </div>

          <!-- Delay reasons -->
          <Card class="analytics__card">
            <template #title>Przyczyny opóźnień</template>
            <template #subtitle>Symulowany rozkład powodów opóźnień w obsłudze wycen</template>
            <template #content>
              <div class="delay-reasons">
                <div
                  v-for="item in delayReasons"
                  :key="item.reason"
                  class="delay-reasons__row"
                >
                  <div class="delay-reasons__label">{{ item.reason }}</div>
                  <div class="delay-reasons__bar-wrapper">
                    <div
                      class="delay-reasons__bar"
                      :style="{ width: item.percentage + '%', backgroundColor: item.color }"
                    />
                  </div>
                  <div class="delay-reasons__stats">
                    <span class="delay-reasons__percent">{{ item.percentage }}%</span>
                    <span class="delay-reasons__count">~{{ item.estimatedCount }} wycen</span>
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Communication flow -->
          <Card class="analytics__card">
            <template #title>Przepływ komunikacji z klientem</template>
            <template #subtitle>Idealny schemat komunikacji w procesie wyceny</template>
            <template #content>
              <div class="comm-flow">
                <div
                  v-for="(step, idx) in communicationFlow"
                  :key="step.step"
                  class="comm-flow__step"
                >
                  <div class="comm-flow__connector" v-if="idx > 0" />
                  <div class="comm-flow__node">
                    <div class="comm-flow__icon" :style="{ backgroundColor: step.color + '1A', color: step.color }">
                      <i :class="step.icon" />
                    </div>
                    <div class="comm-flow__content">
                      <div class="comm-flow__number">Krok {{ step.step }}</div>
                      <div class="comm-flow__title">{{ step.title }}</div>
                      <div class="comm-flow__desc">{{ step.description }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Communication stats table -->
          <Card class="analytics__card">
            <template #title>Statystyki komunikacji wg lokalizacji</template>
            <template #content>
              <DataTable :value="communicationByLocation" stripedRows size="small" :rows="10">
                <Column field="location" header="Lokalizacja" />
                <Column field="totalAppraisals" header="Wyceny" sortable />
                <Column header="Śr. wiadomości" sortable sortField="avgMessages">
                  <template #body="{ data }">
                    {{ data.avgMessages.toFixed(1) }}
                  </template>
                </Column>
                <Column header="Oczekujące" sortable sortField="awaiting">
                  <template #body="{ data }">
                    <Tag
                      :value="data.awaiting.toString()"
                      :severity="data.awaiting > 5 ? 'danger' : data.awaiting > 2 ? 'warn' : 'success'"
                    />
                  </template>
                </Column>
                <Column header="Śr. czas odpowiedzi (godz.)" sortable sortField="avgResponseTime">
                  <template #body="{ data }">
                    <Tag
                      :value="data.avgResponseTime + ' godz.'"
                      :severity="data.avgResponseTime <= 12 ? 'success' : data.avgResponseTime <= 24 ? 'warn' : 'danger'"
                    />
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>

<style scoped lang="scss">
.analytics {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;

    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
    }
  }

  &__header-left {
    flex: 1;
  }

  &__header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__subtitle {
    color: var(--awu-gray-500);
    margin: 0.25rem 0 0;
    font-size: 0.925rem;
  }

  &__period-select {
    min-width: 200px;
  }

  &__tabs {
    :deep(.p-tabview-panels) {
      padding: 1.25rem 0 0;
    }
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__kpi-grid {
    display: grid;
    gap: 1rem;

    &--3 {
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    &--4 {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    &--6 {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
  }

  &__card {
    :deep(.p-card-content) {
      padding: 0;
    }

    :deep(.p-card-title) {
      font-size: 1.1rem;
      font-weight: 600;
    }

    :deep(.p-card-subtitle) {
      font-size: 0.85rem;
      color: var(--awu-gray-500);
      margin-top: 0.25rem;
    }
  }
}

// KPI Card
.kpi-card {
  :deep(.p-card-content) {
    padding: 0;
  }

  &__body {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__icon {
    font-size: 1.5rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: color-mix(in srgb, currentColor 10%, transparent);
    flex-shrink: 0;
  }

  &__info {
    min-width: 0;
  }

  &__value {
    font-size: 1.375rem;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__label {
    font-size: 0.8rem;
    color: var(--awu-gray-500);
    margin-top: 0.125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// Status bar
.status-bar {
  &__track {
    display: flex;
    height: 32px;
    border-radius: var(--awu-border-radius, 8px);
    overflow: hidden;
    margin-bottom: 1.25rem;
  }

  &__segment {
    min-width: 3px;
    transition: width 0.3s ease;
    cursor: default;
    position: relative;

    &:hover {
      opacity: 0.85;
    }
  }

  &__legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
  }

  &__legend-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.85rem;
  }

  &__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__legend-label {
    color: var(--awu-gray-700);
  }

  &__legend-value {
    color: var(--awu-gray-500);
    font-weight: 500;
  }
}

// Percent cell in tables
.percent-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__text {
    font-size: 0.85rem;
    font-weight: 600;
    min-width: 40px;
    text-align: right;
  }
}

// Time cell
.time-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  strong {
    min-width: 50px;
    text-align: right;
    white-space: nowrap;
  }
}

// Sufficiency cell
.sufficiency-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

// Monthly chart
.monthly-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 1rem 0;
  overflow-x: auto;
  min-height: 220px;

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    min-width: 70px;
  }

  &__bar-wrapper {
    width: 100%;
    height: 160px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  &__bar {
    width: 60%;
    max-width: 48px;
    min-height: 8px;
    background: var(--awu-blue);
    border-radius: var(--awu-border-radius-xs) var(--awu-border-radius-xs) 0 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    transition: height 0.3s ease;
    position: relative;
  }

  &__bar-value {
    position: absolute;
    top: -22px;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--awu-gray-700);
    white-space: nowrap;
  }

  &__label {
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: var(--awu-gray-500);
    text-align: center;
    white-space: nowrap;
  }
}

// Cell sub
.cell-sub {
  font-size: 0.75rem;
  color: var(--awu-gray-500);
  margin-top: 0.125rem;
}

// Value distribution
.distribution {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;

  &__row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__label {
    width: 160px;
    font-size: 0.875rem;
    font-weight: 500;
    flex-shrink: 0;
    color: var(--awu-gray-700);
  }

  &__bar-wrapper {
    flex: 1;
    height: 24px;
    background: var(--awu-gray-50);
    border-radius: var(--awu-border-radius-xs);
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    background: var(--awu-blue);
    border-radius: var(--awu-border-radius-xs);
    min-width: 4px;
    transition: width 0.3s ease;
  }

  &__count {
    width: 40px;
    text-align: right;
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--awu-gray-700);
  }

  &__percent {
    width: 50px;
    text-align: right;
    font-size: 0.85rem;
    color: var(--awu-gray-500);
  }
}

// Delay reasons
.delay-reasons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;

  &__row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__label {
    width: 240px;
    font-size: 0.875rem;
    font-weight: 500;
    flex-shrink: 0;
    color: var(--awu-gray-700);
  }

  &__bar-wrapper {
    flex: 1;
    height: 20px;
    background: var(--awu-gray-50, #f8f9fa);
    border-radius: 4px;
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    border-radius: 4px;
    min-width: 4px;
    transition: width 0.3s ease;
  }

  &__stats {
    display: flex;
    gap: 0.75rem;
    min-width: 140px;
    justify-content: flex-end;
  }

  &__percent {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--awu-gray-700);
  }

  &__count {
    font-size: 0.8rem;
    color: var(--awu-gray-500);
    white-space: nowrap;
  }
}

// Communication flow
.comm-flow {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 1rem 0;

  &__step {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  &__connector {
    width: 2px;
    height: 24px;
    background: var(--awu-gray-200, #e5e7eb);
    margin-left: 23px;
  }

  &__node {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  &__content {
    padding-top: 4px;
  }

  &__number {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--awu-gray-400);
    font-weight: 600;
    margin-bottom: 0.125rem;
  }

  &__title {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--awu-gray-800);
  }

  &__desc {
    font-size: 0.825rem;
    color: var(--awu-gray-500);
    margin-top: 0.125rem;
  }
}

// Responsive
@media (max-width: 768px) {
  .analytics {
    &__header {
      flex-direction: column;
    }

    &__header-right {
      width: 100%;
      flex-direction: column;
    }

    &__period-select {
      width: 100%;
    }
  }

  .delay-reasons {
    &__row {
      flex-wrap: wrap;
    }
    &__label {
      width: 100%;
    }
  }

  .distribution {
    &__row {
      flex-wrap: wrap;
    }
    &__label {
      width: 100%;
    }
  }

  .monthly-chart {
    &__item {
      min-width: 50px;
    }
  }
}
</style>
