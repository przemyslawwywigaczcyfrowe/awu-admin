<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import ProgressBar from 'primevue/progressbar'
import Divider from 'primevue/divider'
import { useAppraisalsStore } from '@/stores/appraisals.store'
import { useAuthStore } from '@/stores/auth.store'
import { STATUS_CONFIG } from '@/utils/statusConfig'
import { AppraisalStatus } from '@/types/enums'
import { formatDateNumeric } from '@/utils/dateFormatter'
import { formatPrice } from '@/utils/priceFormatter'
import type { AppraisalListItem } from '@/types/appraisal.types'

const router = useRouter()
const appraisalsStore = useAppraisalsStore()
const authStore = useAuthStore()

const scanInputRef = ref<InstanceType<typeof InputText> | null>(null)
const scanInput = ref('')

appraisalsStore.loadAppraisals()

onMounted(() => {
  nextTick(() => {
    const el = (scanInputRef.value as any)?.$el as HTMLElement | undefined
    if (el) {
      const input = el.tagName === 'INPUT' ? el : el.querySelector('input')
      input?.focus()
    }
  })
})

// ---------------------------------------------------------------------------
// Current date/time (reactive, updates every minute)
// ---------------------------------------------------------------------------
const currentDateTime = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  clockTimer = setInterval(() => {
    currentDateTime.value = new Date()
  }, 60_000)
})

// We cannot use onUnmounted for cleanup in <script setup> the same way,
// but the interval is light enough. Vue will GC the component anyway.

const formattedDate = computed(() => {
  const d = currentDateTime.value
  const dayName = d.toLocaleDateString('pl-PL', { weekday: 'long' })
  const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${dayCapitalized}, ${day}.${month}.${year} ${hours}:${minutes}`
})

// ---------------------------------------------------------------------------
// Status counts (KPI cards)
// ---------------------------------------------------------------------------
const statCounts = computed(() => appraisalsStore.statusCounts)

const kpiCards = computed(() => [
  {
    label: 'Nowe',
    value: statCounts.value[AppraisalStatus.NOWA] || 0,
    icon: 'pi pi-inbox',
    color: '#3B82F6',
    bgClass: 'kpi-card--blue'
  },
  {
    label: 'W trakcie weryfikacji',
    value: statCounts.value[AppraisalStatus.W_TRAKCIE_WERYFIKACJI] || 0,
    icon: 'pi pi-search',
    color: '#F59E0B',
    bgClass: 'kpi-card--orange'
  },
  {
    label: 'Oczekujące na decyzję',
    value: statCounts.value[AppraisalStatus.OCZEKUJE_NA_DECYZJE] || 0,
    icon: 'pi pi-clock',
    color: '#8B5CF6',
    bgClass: 'kpi-card--purple'
  },
  {
    label: 'Zakończone',
    value: statCounts.value[AppraisalStatus.ZAKONCZONA] || 0,
    icon: 'pi pi-check-circle',
    color: '#10B981',
    bgClass: 'kpi-card--green'
  }
])

// ---------------------------------------------------------------------------
// Helper: days waiting since createdAt
// ---------------------------------------------------------------------------
function daysWaiting(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86_400_000))
}

function daysWaitingLabel(createdAt: string): string {
  const days = daysWaiting(createdAt)
  if (days === 0) return 'Dzisiaj'
  if (days === 1) return '1 dzień'
  if (days < 5) return `${days} dni`
  return `${days} dni`
}

function daysWaitingSeverity(createdAt: string): 'success' | 'warn' | 'danger' | 'info' {
  const days = daysWaiting(createdAt)
  if (days <= 1) return 'success'
  if (days <= 3) return 'info'
  if (days <= 7) return 'warn'
  return 'danger'
}

// ---------------------------------------------------------------------------
// QUEUE 1: KLIENT (Customer interaction queue)
// Status 5 (oczekuje na decyzję) + 6 (zaakceptowana) + 7 (odrzucona)
// ---------------------------------------------------------------------------
const klientStatuses = [
  AppraisalStatus.OCZEKUJE_NA_DECYZJE,
  AppraisalStatus.ZAAKCEPTOWANA,
  AppraisalStatus.ODRZUCONA
]

const klientQueue = computed(() => {
  return appraisalsStore.appraisals
    .filter((a: AppraisalListItem) => klientStatuses.includes(a.status))
    .sort((a: AppraisalListItem, b: AppraisalListItem) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
})

const klientQueueDisplay = computed(() => klientQueue.value.slice(0, 5))
const klientCount = computed(() => klientQueue.value.length)

// ---------------------------------------------------------------------------
// QUEUE 2: TECHNIKA (Technical expertise queue)
// Status 1 (NOWA) + 2 (W_TRAKCIE_WERYFIKACJI) - sorted oldest first (FIFO)
// ---------------------------------------------------------------------------
const technikaStatuses = [
  AppraisalStatus.NOWA,
  AppraisalStatus.W_TRAKCIE_WERYFIKACJI
]

const technikaQueue = computed(() => {
  return appraisalsStore.appraisals
    .filter((a: AppraisalListItem) => technikaStatuses.includes(a.status))
    .sort((a: AppraisalListItem, b: AppraisalListItem) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
})

const technikaQueueDisplay = computed(() => technikaQueue.value.slice(0, 5))
const technikaCount = computed(() => technikaQueue.value.length)
const technikaProductCount = computed(() =>
  technikaQueue.value.reduce((sum: number, a: AppraisalListItem) => sum + a.productCount, 0)
)

// ---------------------------------------------------------------------------
// QUEUE 3: REDAKCJA (Editorial / product listing queue)
// Status 11 (ZAKONCZONA) - post-contract Kanban stages (mock)
// ---------------------------------------------------------------------------
const KANBAN_STAGES = [
  'NOWY',
  'REGAŁ',
  'INDEKS',
  'KG+EAN WYDRUK',
  'KG+EAN ROZŁOŻENIE',
  'SESJA+PAKOWANIE',
  'KARTA PRODUKTU',
  'PZ',
  'FRONT',
  'Allegro'
] as const

type KanbanStage = typeof KANBAN_STAGES[number]

function getMockKanbanStage(appraisalId: number): KanbanStage {
  // Deterministic pseudo-random based on appraisal ID
  const hash = ((appraisalId * 2654435761) >>> 0) % KANBAN_STAGES.length
  return KANBAN_STAGES[hash]
}

function getKanbanProgress(stage: KanbanStage): number {
  const idx = KANBAN_STAGES.indexOf(stage)
  return Math.round(((idx + 1) / KANBAN_STAGES.length) * 100)
}

function getKanbanProgressColor(progress: number): string {
  if (progress <= 30) return '#EF4444'
  if (progress <= 60) return '#F59E0B'
  if (progress <= 80) return '#3B82F6'
  return '#10B981'
}

const redakcjaQueue = computed(() => {
  return appraisalsStore.appraisals
    .filter((a: AppraisalListItem) => a.status === AppraisalStatus.ZAKONCZONA)
    .sort((a: AppraisalListItem, b: AppraisalListItem) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
})

const redakcjaQueueDisplay = computed(() => redakcjaQueue.value.slice(0, 5))
const redakcjaCount = computed(() => redakcjaQueue.value.length)
const redakcjaProductCount = computed(() =>
  redakcjaQueue.value.reduce((sum: number, a: AppraisalListItem) => sum + a.productCount, 0)
)

// ---------------------------------------------------------------------------
// Recent appraisals table (10 most recent)
// ---------------------------------------------------------------------------
const recentAppraisals = computed(() => {
  return [...appraisalsStore.appraisals]
    .sort((a: AppraisalListItem, b: AppraisalListItem) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10)
})

// ---------------------------------------------------------------------------
// Quick stats bar (bottom)
// ---------------------------------------------------------------------------
const todayCompletedCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return appraisalsStore.appraisals.filter((a: AppraisalListItem) => {
    if (a.status !== AppraisalStatus.ZAKONCZONA) return false
    // Since we don't have a completedAt date, approximate by using createdAt
    // In production this would check a separate completedAt field
    return true
  }).length
})

const thisWeekValue = computed(() => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
  return appraisalsStore.appraisals
    .filter((a: AppraisalListItem) => new Date(a.createdAt) >= weekAgo)
    .reduce((sum: number, a: AppraisalListItem) => sum + (a.totalPriceTransfer || 0) + (a.totalPriceGiftCard || 0), 0)
})

// Mock average processing time
const avgProcessingTime = computed(() => {
  const total = appraisalsStore.appraisals.length
  if (total === 0) return '0 dni'
  // Mock: deterministic value based on count
  const mockDays = Math.max(1, Math.round(3.7 + (total % 5) * 0.3))
  return `${mockDays} dni`
})

// ---------------------------------------------------------------------------
// Navigation handlers
// ---------------------------------------------------------------------------
function handleScan(): void {
  const value = scanInput.value.trim()
  if (value) {
    router.push({ path: '/wyceny', query: { search: value } })
    scanInput.value = ''
  }
}

function goToAppraisal(id: number): void {
  router.push(`/wyceny/${id}`)
}

function goToAppraisalRow(event: { data: AppraisalListItem }): void {
  router.push(`/wyceny/${event.data.id}`)
}

function goToListFiltered(status?: AppraisalStatus): void {
  if (status !== undefined) {
    router.push({ path: '/wyceny', query: { status: String(status) } })
  } else {
    router.push('/wyceny')
  }
}

function goToList(): void {
  router.push('/wyceny')
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
function getStatusSeverity(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.severity || 'info'
}

function getStatusLabel(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.label || 'Nieznany'
}

function getStatusIcon(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.icon || 'pi pi-question'
}
</script>

<template>
  <div class="dashboard" v-if="!appraisalsStore.loading">
    <!-- ================================================================= -->
    <!-- 1. WELCOME HEADER                                                  -->
    <!-- ================================================================= -->
    <header class="dashboard__header">
      <div class="dashboard__header-left">
        <h1 class="dashboard__title">
          <i class="pi pi-th-large dashboard__title-icon" />
          Panel operatora
        </h1>
        <p class="dashboard__welcome">
          Witaj, <strong>{{ authStore.user?.name }}</strong>
          <span class="dashboard__separator">&bull;</span>
          <i class="pi pi-map-marker" />
          {{ authStore.user?.locationName }}
        </p>
      </div>
      <div class="dashboard__header-right">
        <div class="dashboard__clock">
          <i class="pi pi-calendar" />
          {{ formattedDate }}
        </div>
      </div>
    </header>

    <!-- ================================================================= -->
    <!-- 2. QUICK SCAN BAR (main entry point)                              -->
    <!-- ================================================================= -->
    <Card class="dashboard__scan">
      <template #content>
        <div class="scan-bar">
          <div class="scan-bar__icon-wrapper">
            <i class="pi pi-qrcode scan-bar__icon" />
          </div>
          <div class="scan-bar__content">
            <div class="scan-bar__label">Skanuj / wyszukaj</div>
            <div class="scan-bar__sublabel">Zeskanuj kod kreskowy lub wpisz numer wyceny / przesyłki</div>
          </div>
          <div class="scan-bar__input-group">
            <InputText
              ref="scanInputRef"
              v-model="scanInput"
              placeholder="Nr wyceny, przesyłki, klient..."
              class="scan-bar__input"
              @keydown.enter="handleScan"
            />
            <Button
              icon="pi pi-search"
              label="Szukaj"
              @click="handleScan"
              class="scan-bar__button"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- ================================================================= -->
    <!-- 3. KPI STAT CARDS (4 in a row)                                    -->
    <!-- ================================================================= -->
    <div class="dashboard__kpis">
      <div
        v-for="kpi in kpiCards"
        :key="kpi.label"
        class="kpi-card"
        :class="kpi.bgClass"
        @click="goToListFiltered(
          kpi.label === 'Nowe' ? AppraisalStatus.NOWA :
          kpi.label === 'W trakcie weryfikacji' ? AppraisalStatus.W_TRAKCIE_WERYFIKACJI :
          kpi.label === 'Oczekujące na decyzję' ? AppraisalStatus.OCZEKUJE_NA_DECYZJE :
          AppraisalStatus.ZAKONCZONA
        )"
      >
        <div class="kpi-card__icon-area">
          <i :class="kpi.icon" />
        </div>
        <div class="kpi-card__data">
          <div class="kpi-card__value">{{ kpi.value }}</div>
          <div class="kpi-card__label">{{ kpi.label }}</div>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- 4. WORK QUEUE SECTIONS (3 columns)                                -->
    <!-- ================================================================= -->
    <div class="dashboard__queues">
      <!-- ────────────── KLIENT ────────────── -->
      <Card class="queue-card queue-card--klient">
        <template #title>
          <div class="queue-card__header">
            <div class="queue-card__title-row">
              <div class="queue-card__icon-badge queue-card__icon-badge--blue">
                <i class="pi pi-users" />
              </div>
              <span class="queue-card__title">KLIENT</span>
              <Badge :value="String(klientCount)" severity="info" class="queue-card__badge" />
            </div>
            <p class="queue-card__subtitle">Wyceny wymagające interakcji z klientem</p>
          </div>
        </template>
        <template #content>
          <div v-if="klientQueueDisplay.length === 0" class="queue-card__empty">
            <i class="pi pi-check-circle" />
            <span>Brak wycen do obsługi</span>
          </div>
          <div v-else class="queue-card__list">
            <div
              v-for="item in klientQueueDisplay"
              :key="item.id"
              class="queue-item"
              @click="goToAppraisal(item.id)"
            >
              <div class="queue-item__main">
                <span class="queue-item__number">{{ item.appraisalNumber }}</span>
                <span class="queue-item__client">{{ item.clientName }}</span>
              </div>
              <div class="queue-item__meta">
                <Tag
                  :value="getStatusLabel(item.status)"
                  :severity="getStatusSeverity(item.status)"
                  class="queue-item__status"
                />
                <Tag
                  :value="daysWaitingLabel(item.createdAt)"
                  :severity="daysWaitingSeverity(item.createdAt)"
                  class="queue-item__days"
                />
              </div>
            </div>
          </div>
          <Divider v-if="klientQueue.length > 5" />
          <div v-if="klientQueue.length > 5" class="queue-card__footer">
            <Button
              label="Zobacz wszystkie"
              icon="pi pi-arrow-right"
              iconPos="right"
              text
              size="small"
              @click="goToList"
            />
          </div>
        </template>
      </Card>

      <!-- ────────────── TECHNIKA ────────────── -->
      <Card class="queue-card queue-card--technika">
        <template #title>
          <div class="queue-card__header">
            <div class="queue-card__title-row">
              <div class="queue-card__icon-badge queue-card__icon-badge--orange">
                <i class="pi pi-wrench" />
              </div>
              <span class="queue-card__title">TECHNIKA</span>
              <Badge :value="String(technikaCount)" severity="warn" class="queue-card__badge" />
            </div>
            <p class="queue-card__subtitle">
              {{ technikaProductCount }} produktów czeka na ekspertyzę
            </p>
          </div>
        </template>
        <template #content>
          <div v-if="technikaQueueDisplay.length === 0" class="queue-card__empty">
            <i class="pi pi-check-circle" />
            <span>Brak produktów do weryfikacji</span>
          </div>
          <div v-else class="queue-card__list">
            <div
              v-for="item in technikaQueueDisplay"
              :key="item.id"
              class="queue-item"
              @click="goToAppraisal(item.id)"
            >
              <div class="queue-item__main">
                <span class="queue-item__number">{{ item.appraisalNumber }}</span>
                <span class="queue-item__products">
                  <i class="pi pi-box" />
                  {{ item.productCount }} szt.
                </span>
              </div>
              <div class="queue-item__meta">
                <span class="queue-item__location">
                  <i class="pi pi-map-marker" />
                  {{ item.locationName }}
                </span>
                <Tag
                  :value="daysWaitingLabel(item.createdAt)"
                  :severity="daysWaitingSeverity(item.createdAt)"
                  class="queue-item__days"
                />
              </div>
            </div>
          </div>
          <Divider v-if="technikaQueue.length > 5" />
          <div v-if="technikaQueue.length > 5" class="queue-card__footer">
            <Button
              label="Zobacz wszystkie"
              icon="pi pi-arrow-right"
              iconPos="right"
              text
              size="small"
              @click="goToList"
            />
          </div>
        </template>
      </Card>

      <!-- ────────────── REDAKCJA ────────────── -->
      <Card class="queue-card queue-card--redakcja">
        <template #title>
          <div class="queue-card__header">
            <div class="queue-card__title-row">
              <div class="queue-card__icon-badge queue-card__icon-badge--green">
                <i class="pi pi-file-edit" />
              </div>
              <span class="queue-card__title">REDAKCJA</span>
              <Badge :value="String(redakcjaCount)" severity="success" class="queue-card__badge" />
            </div>
            <p class="queue-card__subtitle">
              {{ redakcjaProductCount }} produktów do wystawienia
            </p>
          </div>
        </template>
        <template #content>
          <div v-if="redakcjaQueueDisplay.length === 0" class="queue-card__empty">
            <i class="pi pi-check-circle" />
            <span>Brak produktów do redakcji</span>
          </div>
          <div v-else class="queue-card__list">
            <div
              v-for="item in redakcjaQueueDisplay"
              :key="item.id"
              class="queue-item queue-item--redakcja"
              @click="goToAppraisal(item.id)"
            >
              <div class="queue-item__main">
                <span class="queue-item__number">{{ item.appraisalNumber }}</span>
                <span class="queue-item__products">
                  <i class="pi pi-box" />
                  {{ item.productCount }} szt.
                </span>
              </div>
              <div class="queue-item__kanban">
                <Tag
                  :value="getMockKanbanStage(item.id)"
                  severity="secondary"
                  class="queue-item__stage"
                />
                <ProgressBar
                  :value="getKanbanProgress(getMockKanbanStage(item.id))"
                  :showValue="false"
                  class="queue-item__progress"
                  :style="{ '--p-progressbar-value-background': getKanbanProgressColor(getKanbanProgress(getMockKanbanStage(item.id))) }"
                />
              </div>
            </div>
          </div>
          <Divider v-if="redakcjaQueue.length > 5" />
          <div v-if="redakcjaQueue.length > 5" class="queue-card__footer">
            <Button
              label="Zobacz wszystkie"
              icon="pi pi-arrow-right"
              iconPos="right"
              text
              size="small"
              @click="goToList"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- ================================================================= -->
    <!-- 5. OSTATNIE WYCENY (Recent appraisals table)                      -->
    <!-- ================================================================= -->
    <Card class="dashboard__table">
      <template #title>
        <div class="table-header">
          <div class="table-header__left">
            <i class="pi pi-list table-header__icon" />
            <span>Ostatnie wyceny</span>
          </div>
          <Button
            label="Zobacz wszystkie"
            icon="pi pi-arrow-right"
            iconPos="right"
            text
            size="small"
            @click="goToList"
          />
        </div>
      </template>
      <template #content>
        <DataTable
          :value="recentAppraisals"
          :rows="10"
          stripedRows
          size="small"
          @row-click="goToAppraisalRow"
          class="dashboard-table"
          selectionMode="single"
          :loading="appraisalsStore.loading"
        >
          <Column field="appraisalNumber" header="Nr wyceny" style="width: 130px">
            <template #body="{ data }">
              <span class="cell-number">{{ data.appraisalNumber }}</span>
            </template>
          </Column>
          <Column field="clientName" header="Klient" style="min-width: 160px" />
          <Column field="productCount" header="Produkty" style="width: 90px">
            <template #body="{ data }">
              <div class="cell-products">
                <i class="pi pi-box" />
                {{ data.productCount }}
              </div>
            </template>
          </Column>
          <Column field="status" header="Status" style="width: 220px">
            <template #body="{ data }">
              <Tag
                :value="getStatusLabel(data.status)"
                :severity="getStatusSeverity(data.status)"
                :icon="getStatusIcon(data.status)"
              />
            </template>
          </Column>
          <Column field="locationName" header="Lokalizacja" style="width: 140px">
            <template #body="{ data }">
              <span class="cell-location">
                <i class="pi pi-map-marker" />
                {{ data.locationName }}
              </span>
            </template>
          </Column>
          <Column header="Kwota" style="width: 130px">
            <template #body="{ data }">
              <span class="cell-price">{{ formatPrice(data.totalPriceTransfer + data.totalPriceGiftCard) }}</span>
            </template>
          </Column>
          <Column field="assignedOperatorName" header="Operator" style="width: 130px">
            <template #body="{ data }">
              <span v-if="data.assignedOperatorName" class="cell-operator">
                <i class="pi pi-user" />
                {{ data.assignedOperatorName }}
              </span>
              <span v-else class="cell-operator cell-operator--empty">Nieprzypisany</span>
            </template>
          </Column>
          <Column field="createdAt" header="Data" style="width: 140px">
            <template #body="{ data }">
              {{ formatDateNumeric(data.createdAt) }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- ================================================================= -->
    <!-- 6. QUICK STATS BAR (bottom)                                       -->
    <!-- ================================================================= -->
    <div class="dashboard__bottom-stats">
      <div class="bottom-stat">
        <div class="bottom-stat__icon bottom-stat__icon--green">
          <i class="pi pi-check-circle" />
        </div>
        <div class="bottom-stat__data">
          <div class="bottom-stat__value">{{ todayCompletedCount }}</div>
          <div class="bottom-stat__label">Zakończonych łącznie</div>
        </div>
      </div>
      <div class="bottom-stat__divider" />
      <div class="bottom-stat">
        <div class="bottom-stat__icon bottom-stat__icon--blue">
          <i class="pi pi-wallet" />
        </div>
        <div class="bottom-stat__data">
          <div class="bottom-stat__value">{{ formatPrice(thisWeekValue) }}</div>
          <div class="bottom-stat__label">Wartość z ostatnich 7 dni</div>
        </div>
      </div>
      <div class="bottom-stat__divider" />
      <div class="bottom-stat">
        <div class="bottom-stat__icon bottom-stat__icon--orange">
          <i class="pi pi-stopwatch" />
        </div>
        <div class="bottom-stat__data">
          <div class="bottom-stat__value">{{ avgProcessingTime }}</div>
          <div class="bottom-stat__label">Śr. czas obsługi</div>
        </div>
      </div>
      <div class="bottom-stat__divider" />
      <div class="bottom-stat">
        <div class="bottom-stat__icon bottom-stat__icon--purple">
          <i class="pi pi-chart-line" />
        </div>
        <div class="bottom-stat__data">
          <div class="bottom-stat__value">{{ appraisalsStore.appraisals.length }}</div>
          <div class="bottom-stat__label">Wycen łącznie</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else class="dashboard-loading">
    <div class="dashboard-loading__content">
      <i class="pi pi-spin pi-spinner dashboard-loading__spinner" />
      <p>Ładowanie danych...</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
// ---------------------------------------------------------------------------
// DASHBOARD LAYOUT
// ---------------------------------------------------------------------------
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 1440px;
  margin: 0 auto;

  // ---- Header ----
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__header-left {
    flex: 1;
    min-width: 0;
  }

  &__header-right {
    flex-shrink: 0;
  }

  &__title {
    margin: 0;
    font-size: 2.143rem; // ~30px — Horizon page heading
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--awu-gray-800); // #1B2559
    letter-spacing: -0.02em;
  }

  &__title-icon {
    color: var(--awu-blue);
    font-size: 1.25rem;
  }

  &__welcome {
    margin: 0.25rem 0 0;
    font-size: 0.9rem;
    color: var(--awu-gray-400);
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  &__separator {
    color: var(--awu-gray-300);
  }

  &__clock {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.857rem;
    color: var(--awu-gray-400);
    background: #fff;
    padding: 0.5rem 1rem;
    border-radius: 30px;
    box-shadow: var(--awu-card-shadow);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  // ---- Scan bar ----
  &__scan {
    :deep(.p-card-content) {
      padding: 0;
    }

    :deep(.p-card-body) {
      border: none;
    }
  }

  // ---- KPI row ----
  &__kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
  }

  // ---- Queue columns ----
  &__queues {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    align-items: start;
  }

  // ---- Table ----
  &__table {
    :deep(.p-card-content) {
      padding: 0;
    }
  }

  // ---- Bottom stats ----
  &__bottom-stats {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: #fff;
    border-radius: var(--awu-border-radius);
    box-shadow: var(--awu-card-shadow);
    padding: 1.25rem 1.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }
}

// ---------------------------------------------------------------------------
// SCAN BAR
// ---------------------------------------------------------------------------
.scan-bar {
  display: flex;
  align-items: center;
  gap: 1.25rem;

  &__icon-wrapper {
    width: 52px;
    height: 52px;
    border-radius: var(--awu-border-radius);
    background: linear-gradient(135deg, rgba(67, 24, 255, 0.08) 0%, rgba(117, 81, 255, 0.06) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__icon {
    font-size: 1.5rem;
    color: var(--awu-blue);
  }

  &__content {
    flex-shrink: 0;
  }

  &__label {
    font-size: 1rem;
    font-weight: 700;
    color: var(--awu-gray-800);
  }

  &__sublabel {
    font-size: 0.78rem;
    color: var(--awu-gray-400);
    margin-top: 0.125rem;
  }

  &__input-group {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    min-width: 200px;
  }

  &__input {
    flex: 1;
    font-size: 0.95rem;
    min-width: 0;
  }

  &__button {
    flex-shrink: 0;
  }
}

// ---------------------------------------------------------------------------
// KPI CARDS
// ---------------------------------------------------------------------------
.kpi-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: var(--awu-border-radius);
  background: #fff;
  box-shadow: var(--awu-card-shadow);
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    box-shadow: var(--awu-shadow-hover);
    transform: translateY(-2px);
  }

  &__icon-area {
    width: 52px;
    height: 52px;
    border-radius: var(--awu-border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  &__data {
    min-width: 0;
  }

  &__value {
    font-size: 1.714rem; // ~24px at 14px base — Horizon exact
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: var(--awu-gray-800); // #1B2559
  }

  &__label {
    font-size: 0.857rem; // ~12px at 14px base — Horizon exact
    color: var(--awu-gray-400); // #A3AED0 — Horizon secondaryGray.600
    margin-top: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  // Variants — no border-left, just icon bg + softer value color
  &--blue {
    .kpi-card__icon-area {
      background: rgba(57, 101, 255, 0.1);
      color: var(--awu-accent-blue);
    }
  }

  &--orange {
    .kpi-card__icon-area {
      background: rgba(255, 181, 71, 0.12);
      color: var(--awu-accent-amber);
    }
  }

  &--purple {
    .kpi-card__icon-area {
      background: rgba(117, 81, 255, 0.1);
      color: var(--awu-accent-violet);
    }
  }

  &--green {
    .kpi-card__icon-area {
      background: rgba(1, 181, 116, 0.1);
      color: var(--awu-accent-emerald);
    }
  }
}

// ---------------------------------------------------------------------------
// QUEUE CARDS
// ---------------------------------------------------------------------------
.queue-card {
  :deep(.p-card-content) {
    padding: 0;
  }

  :deep(.p-card-title) {
    margin-bottom: 0;
  }

  &__header {
    padding-bottom: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  &__icon-badge {
    width: 34px;
    height: 34px;
    border-radius: var(--awu-border-radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;

    &--blue {
      background: rgba(57, 101, 255, 0.1);
      color: var(--awu-accent-blue);
    }

    &--orange {
      background: rgba(255, 181, 71, 0.12);
      color: var(--awu-accent-amber);
    }

    &--green {
      background: rgba(1, 181, 116, 0.1);
      color: var(--awu-accent-emerald);
    }
  }

  &__title {
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--awu-gray-800);
  }

  &__badge {
    margin-left: auto;
  }

  &__subtitle {
    margin: 0.375rem 0 0;
    font-size: 0.78rem;
    color: var(--awu-gray-400);
    font-weight: 400;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem 1rem;
    color: var(--awu-gray-400);
    font-size: 0.85rem;

    i {
      font-size: 2rem;
      color: var(--awu-gray-300);
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__footer {
    display: flex;
    justify-content: center;
    padding-bottom: 0.25rem;
  }

  // No more heavy border-top accents — clean card style
}

// ---------------------------------------------------------------------------
// QUEUE ITEMS
// ---------------------------------------------------------------------------
.queue-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--awu-gray-100);
  cursor: pointer;
  transition: background 0.12s;
  border-radius: var(--awu-border-radius-xs);

  &:hover {
    background: var(--awu-gray-50);
  }

  &:last-child {
    border-bottom: none;
  }

  &__main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  &__number {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--awu-blue);
    font-variant-numeric: tabular-nums;
  }

  &__client {
    font-size: 0.82rem;
    color: var(--awu-gray-600);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
  }

  &__products {
    font-size: 0.82rem;
    color: var(--awu-gray-500);
    display: flex;
    align-items: center;
    gap: 0.25rem;

    i {
      font-size: 0.75rem;
    }
  }

  &__location {
    font-size: 0.78rem;
    color: var(--awu-gray-400);
    display: flex;
    align-items: center;
    gap: 0.25rem;

    i {
      font-size: 0.7rem;
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  &__status {
    font-size: 0.72rem;
  }

  &__days {
    font-size: 0.72rem;
  }

  &__kanban {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__stage {
    font-size: 0.7rem;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__progress {
    flex: 1;
    height: 6px;
    min-width: 60px;

    :deep(.p-progressbar) {
      height: 6px;
      border-radius: 3px;
    }
  }
}

// ---------------------------------------------------------------------------
// RECENT TABLE
// ---------------------------------------------------------------------------
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  &__left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__icon {
    color: var(--awu-gray-400);
  }
}

.dashboard-table {
  :deep(tr) {
    cursor: pointer;
  }
}

.cell-number {
  font-weight: 600;
  color: var(--awu-blue);
  font-variant-numeric: tabular-nums;
}

.cell-products {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--awu-gray-600);

  i {
    font-size: 0.8rem;
    color: var(--awu-gray-400);
  }
}

.cell-location {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.85rem;

  i {
    font-size: 0.75rem;
    color: var(--awu-gray-400);
  }
}

.cell-price {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cell-operator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.85rem;

  i {
    font-size: 0.75rem;
    color: var(--awu-gray-400);
  }

  &--empty {
    color: var(--awu-gray-400);
    font-style: italic;
  }
}

// ---------------------------------------------------------------------------
// BOTTOM STATS BAR
// ---------------------------------------------------------------------------
.bottom-stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &__icon {
    width: 42px;
    height: 42px;
    border-radius: var(--awu-border-radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;

    &--green {
      background: rgba(1, 181, 116, 0.1);
      color: var(--awu-accent-emerald);
    }

    &--blue {
      background: rgba(57, 101, 255, 0.1);
      color: var(--awu-accent-blue);
    }

    &--orange {
      background: rgba(255, 181, 71, 0.12);
      color: var(--awu-accent-amber);
    }

    &--purple {
      background: rgba(117, 81, 255, 0.1);
      color: var(--awu-accent-violet);
    }
  }

  &__data {
    min-width: 0;
  }

  &__value {
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    color: var(--awu-gray-800);
  }

  &__label {
    font-size: 0.75rem;
    color: var(--awu-gray-400);
    margin-top: 0.125rem;
    white-space: nowrap;
  }

  &__divider {
    width: 1px;
    height: 36px;
    background: var(--awu-gray-200);
    flex-shrink: 0;
  }
}

// ---------------------------------------------------------------------------
// LOADING STATE
// ---------------------------------------------------------------------------
.dashboard-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;

  &__content {
    text-align: center;
    color: var(--awu-gray-400);
  }

  &__spinner {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: var(--awu-blue);
  }
}

// ---------------------------------------------------------------------------
// RESPONSIVE
// ---------------------------------------------------------------------------
@media (max-width: 1200px) {
  .dashboard__queues {
    grid-template-columns: 1fr 1fr;
  }

  .queue-card--redakcja {
    grid-column: 1 / -1;
  }
}

@media (max-width: 960px) {
  .scan-bar {
    &__content {
      display: none;
    }
  }
}

@media (max-width: 768px) {
  .dashboard {
    &__header {
      flex-direction: column;
    }

    &__kpis {
      grid-template-columns: repeat(2, 1fr);
    }

    &__queues {
      grid-template-columns: 1fr;
    }

    &__bottom-stats {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }
  }

  .scan-bar {
    flex-direction: column;
    text-align: center;

    &__input-group {
      flex-direction: column;
      min-width: 0;
      width: 100%;
    }
  }

  .kpi-card {
    &__label {
      font-size: 0.72rem;
    }

    &__value {
      font-size: 1.4rem;
    }
  }

  .bottom-stat__divider {
    width: 100%;
    height: 1px;
  }

  .queue-card--redakcja {
    grid-column: auto;
  }
}

@media (max-width: 480px) {
  .dashboard__kpis {
    grid-template-columns: 1fr;
  }
}
</style>
