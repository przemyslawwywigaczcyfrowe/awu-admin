<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { useAppraisalsStore } from '@/stores/appraisals.store'
import { useAuthStore } from '@/stores/auth.store'
import { STATUS_CONFIG } from '@/utils/statusConfig'
import { AppraisalStatus } from '@/types/enums'
import { formatDateNumeric } from '@/utils/dateFormatter'
import { formatPrice } from '@/utils/priceFormatter'

const router = useRouter()
const appraisalsStore = useAppraisalsStore()
const authStore = useAuthStore()

const scanInput = ref('')

appraisalsStore.loadAppraisals()

const recentAppraisals = computed(() => {
  return appraisalsStore.appraisals.slice(0, 20)
})

const statCounts = computed(() => appraisalsStore.statusCounts)

const stats = computed(() => [
  { label: 'Nowe', value: statCounts.value[AppraisalStatus.NOWA] || 0, icon: 'pi pi-inbox', color: '#3B82F6' },
  { label: 'W trakcie', value: statCounts.value[AppraisalStatus.W_TRAKCIE_WERYFIKACJI] || 0, icon: 'pi pi-search', color: '#F59E0B' },
  { label: 'Oczekujące', value: statCounts.value[AppraisalStatus.OCZEKUJE_NA_DECYZJE] || 0, icon: 'pi pi-clock', color: '#8B5CF6' },
  { label: 'Zakończone', value: statCounts.value[AppraisalStatus.ZAKONCZONA] || 0, icon: 'pi pi-check', color: '#10B981' }
])

function handleScan() {
  const value = scanInput.value.trim()
  if (value) {
    router.push({ path: '/wyceny', query: { search: value } })
    scanInput.value = ''
  }
}

function goToAppraisal(event: any) {
  const appraisal = event.data
  router.push(`/wyceny/${appraisal.id}`)
}

function goToList() {
  router.push('/wyceny')
}

function getStatusSeverity(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.severity || 'info'
}

function getStatusLabel(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.label || 'Nieznany'
}
</script>

<template>
  <div class="dashboard">
    <div class="dashboard__header">
      <h1>Dashboard</h1>
      <p class="dashboard__welcome">Witaj, {{ authStore.user?.name }}! Lokalizacja: <strong>{{ authStore.user?.locationName }}</strong></p>
    </div>

    <div class="dashboard__stats">
      <Card v-for="stat in stats" :key="stat.label" class="stat-card">
        <template #content>
          <div class="stat-card__body">
            <div class="stat-card__icon" :style="{ color: stat.color }">
              <i :class="stat.icon" />
            </div>
            <div class="stat-card__info">
              <div class="stat-card__value">{{ stat.value }}</div>
              <div class="stat-card__label">{{ stat.label }}</div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <Card class="dashboard__scan">
      <template #content>
        <div class="scan-section">
          <div class="scan-section__icon">
            <i class="pi pi-qrcode" />
          </div>
          <div class="scan-section__content">
            <h2>Skanuj przesyłkę</h2>
            <p>Zeskanuj kod kreskowy z etykiety lub wpisz numer wyceny</p>
            <div class="scan-section__input">
              <InputText
                v-model="scanInput"
                placeholder="Numer przesyłki lub wyceny..."
                class="scan-input"
                @keydown.enter="handleScan"
              />
              <Button icon="pi pi-search" label="Szukaj" @click="handleScan" />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <Card class="dashboard__table">
      <template #title>
        <div class="table-header">
          <span>Ostatnie wyceny</span>
          <Button label="Zobacz wszystkie" icon="pi pi-arrow-right" iconPos="right" text size="small" @click="goToList" />
        </div>
      </template>
      <template #content>
        <DataTable
          :value="recentAppraisals"
          :rows="20"
          stripedRows
          size="small"
          @row-click="goToAppraisal"
          class="cursor-pointer"
          selectionMode="single"
        >
          <Column field="appraisalNumber" header="Nr wyceny" style="width: 120px" />
          <Column field="clientName" header="Klient" />
          <Column field="productCount" header="Produkty" style="width: 90px" />
          <Column field="status" header="Status" style="width: 220px">
            <template #body="{ data }">
              <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
            </template>
          </Column>
          <Column field="locationName" header="Lokalizacja" style="width: 140px" />
          <Column field="totalPriceTransfer" header="Kwota" style="width: 120px">
            <template #body="{ data }">
              {{ formatPrice(data.totalPriceTransfer) }}
            </template>
          </Column>
          <Column field="createdAt" header="Data" style="width: 140px">
            <template #body="{ data }">
              {{ formatDateNumeric(data.createdAt, false) }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__header {
    h1 { margin: 0; }
  }

  &__welcome {
    color: var(--awu-gray-500);
    margin: 0.25rem 0 0;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  &__scan {
    :deep(.p-card-content) { padding: 0; }
  }

  &__table {
    :deep(.p-card-content) { padding: 0; }
  }
}

.stat-card {
  &__body {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__icon {
    font-size: 2rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: color-mix(in srgb, currentColor 10%, transparent);
  }

  &__value {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
  }

  &__label {
    font-size: 0.875rem;
    color: var(--awu-gray-500);
    margin-top: 0.125rem;
  }
}

.scan-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;

  &__icon {
    font-size: 3rem;
    color: var(--awu-blue);
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    p { margin: 0 0 0.75rem; color: var(--awu-gray-500); font-size: 0.875rem; }
  }

  &__input {
    display: flex;
    gap: 0.5rem;
    max-width: 500px;
  }
}

.scan-input { flex: 1; }

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cursor-pointer :deep(tr) { cursor: pointer; }

@media (max-width: 768px) {
  .scan-section {
    flex-direction: column;
    text-align: center;
    &__input { flex-direction: column; max-width: 100%; }
  }
}
</style>
