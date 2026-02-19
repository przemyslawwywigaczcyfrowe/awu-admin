<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Toolbar from 'primevue/toolbar'
import { useAppraisalsStore } from '@/stores/appraisals.store'
import { useLocationsStore } from '@/stores/locations.store'
import { STATUS_CONFIG, getAllStatuses } from '@/utils/statusConfig'
import { AppraisalStatus } from '@/types/enums'
import { formatDateNumeric } from '@/utils/dateFormatter'
import { formatPrice } from '@/utils/priceFormatter'

const router = useRouter()
const route = useRoute()
const appraisalsStore = useAppraisalsStore()
const locationsStore = useLocationsStore()

const statusOptions = computed(() => [
  { label: 'Wszystkie statusy', value: null },
  ...getAllStatuses().map(s => ({ label: s.label, value: s.id }))
])

const locationOptions = computed(() => [
  { label: 'Wszystkie lokalizacje', value: null },
  ...locationsStore.locations.map(l => ({ label: l.shortName, value: l.id }))
])

onMounted(() => {
  appraisalsStore.loadAppraisals()
  if (route.query.search) {
    appraisalsStore.filters.search = route.query.search as string
  }
})

function goToAppraisal(event: any) {
  router.push(`/wyceny/${event.data.id}`)
}

function clearFilters() {
  appraisalsStore.clearFilters()
}

function getStatusSeverity(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.severity || 'info'
}

function getStatusLabel(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.label || 'Nieznany'
}

const dt = ref()
function exportCSV() {
  dt.value?.exportCSV()
}
</script>

<template>
  <div class="appraisal-list">
    <div class="appraisal-list__header">
      <h1>Wyceny</h1>
      <Button icon="pi pi-download" label="Eksport CSV" severity="secondary" outlined size="small" @click="exportCSV" />
    </div>

    <div class="appraisal-list__filters">
      <div class="filter-row">
        <InputText
          v-model="appraisalsStore.filters.search"
          placeholder="Szukaj (nr wyceny, email, klient)..."
          class="filter-input filter-input--wide"
        />
        <InputText
          v-model="appraisalsStore.filters.trackingNumber"
          placeholder="Nr przesyłki..."
          class="filter-input"
        />
        <Select
          v-model="appraisalsStore.filters.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Status"
          class="filter-input"
        />
        <Select
          v-model="appraisalsStore.filters.locationId"
          :options="locationOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Lokalizacja"
          class="filter-input"
        />
        <Button icon="pi pi-filter-slash" label="Wyczyść" severity="secondary" text size="small" @click="clearFilters" />
      </div>
    </div>

    <DataTable
      ref="dt"
      :value="appraisalsStore.filteredAppraisals"
      :paginator="true"
      :rows="25"
      :rowsPerPageOptions="[10, 25, 50, 100]"
      stripedRows
      removableSort
      size="small"
      @row-click="goToAppraisal"
      class="cursor-pointer"
      selectionMode="single"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      currentPageReportTemplate="Pokazuję {first} do {last} z {totalRecords} wycen"
      :loading="appraisalsStore.loading"
    >
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox" />
          <p>Brak wycen spełniających kryteria</p>
        </div>
      </template>

      <Column field="appraisalNumber" header="Nr wyceny" sortable style="width: 120px">
        <template #body="{ data }">
          <strong>{{ data.appraisalNumber }}</strong>
        </template>
      </Column>
      <Column field="clientName" header="Klient" sortable>
        <template #body="{ data }">
          <div>{{ data.clientName }}</div>
          <small class="text-muted">{{ data.clientEmail }}</small>
        </template>
      </Column>
      <Column field="productCount" header="Produkty" sortable style="width: 100px" />
      <Column field="status" header="Status" sortable style="width: 240px">
        <template #body="{ data }">
          <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>
      <Column field="locationName" header="Lokalizacja" sortable style="width: 140px" />
      <Column field="assignedOperatorName" header="Operator" sortable style="width: 160px">
        <template #body="{ data }">
          {{ data.assignedOperatorName || '—' }}
        </template>
      </Column>
      <Column field="totalPriceTransfer" header="Kwota" sortable style="width: 130px">
        <template #body="{ data }">
          {{ formatPrice(data.totalPriceTransfer) }}
        </template>
      </Column>
      <Column field="createdAt" header="Data" sortable style="width: 130px">
        <template #body="{ data }">
          {{ formatDateNumeric(data.createdAt, false) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped lang="scss">
.appraisal-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h1 { margin: 0; }
  }

  &__filters {
    background: #fff;
    border-radius: var(--awu-border-radius);
    padding: 1.25rem;
    box-shadow: var(--awu-card-shadow);
  }
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.filter-input {
  min-width: 0;
  width: 180px;
  flex-shrink: 1;

  &--wide {
    flex: 1;
    min-width: 200px;
    width: auto;
  }
}

.text-muted {
  color: var(--awu-gray-500);
  font-size: 0.8rem;
}

.cursor-pointer :deep(tr) { cursor: pointer; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--awu-gray-400);

  i { font-size: 2.5rem; }
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
  }
  .filter-input, .filter-input--wide {
    width: 100%;
    min-width: auto;
  }
}
</style>
