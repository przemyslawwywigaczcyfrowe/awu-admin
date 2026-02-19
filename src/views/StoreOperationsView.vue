<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { AppraisalStatus } from '@/types/enums'
import { STATUS_CONFIG } from '@/utils/statusConfig'
import { formatDateNumeric } from '@/utils/dateFormatter'
import { formatPrice } from '@/utils/priceFormatter'

const router = useRouter()

// --- Scan section ---
const scanInput = ref('')
const scanMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

interface ScannedItem {
  id: number
  appraisalNumber: string
  trackingNumber: string
  clientName: string
  productCount: number
  status: AppraisalStatus
  scannedAt: string
}

const recentScans = ref<ScannedItem[]>([])

const mockAppraisals: ScannedItem[] = [
  { id: 1, appraisalNumber: 'AWU-20260210-001', trackingNumber: 'DPD123456789', clientName: 'Jan Kowalski', productCount: 2, status: AppraisalStatus.NOWA, scannedAt: '' },
  { id: 2, appraisalNumber: 'AWU-20260211-002', trackingNumber: 'DPD987654321', clientName: 'Anna Nowak', productCount: 1, status: AppraisalStatus.NOWA, scannedAt: '' },
  { id: 3, appraisalNumber: 'AWU-20260212-003', trackingNumber: 'INPOST00112233', clientName: 'Marek Wisniak', productCount: 3, status: AppraisalStatus.NOWA, scannedAt: '' },
]

function handleScan() {
  const value = scanInput.value.trim()
  if (!value) return

  const found = mockAppraisals.find(a => a.trackingNumber === value)
  if (found) {
    found.status = AppraisalStatus.W_TRAKCIE_WERYFIKACJI
    found.scannedAt = new Date().toISOString()
    recentScans.value.unshift({ ...found })
    scanMessage.value = {
      type: 'success',
      text: `Paczka ${found.trackingNumber} zarejestrowana. Wycena ${found.appraisalNumber} - status zmieniony na "W trakcie weryfikacji".`
    }
  } else {
    scanMessage.value = {
      type: 'error',
      text: `Nie znaleziono wyceny dla numeru przesylki: ${value}`
    }
  }
  scanInput.value = ''
}

// --- Forward to HQ section ---
const forwardScanInput = ref('')
const forwardMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const forwardFoundItem = ref<ScannedItem | null>(null)

interface ForwardedItem {
  id: number
  appraisalNumber: string
  trackingNumber: string
  clientName: string
  productCount: number
  forwardedAt: string
}

const forwardedItems = ref<ForwardedItem[]>([])

const pendingForwardItems = computed(() => {
  return recentScans.value.filter(s => s.status === AppraisalStatus.W_TRAKCIE_WERYFIKACJI)
})

function handleForwardScan() {
  const value = forwardScanInput.value.trim()
  if (!value) return

  const found = recentScans.value.find(s => s.trackingNumber === value && s.status === AppraisalStatus.W_TRAKCIE_WERYFIKACJI)
  if (found) {
    forwardFoundItem.value = { ...found }
    forwardMessage.value = null
  } else {
    forwardFoundItem.value = null
    forwardMessage.value = {
      type: 'error',
      text: `Nie znaleziono paczki do przekazania: ${value}`
    }
  }
  forwardScanInput.value = ''
}

function forwardToHQ() {
  if (!forwardFoundItem.value) return

  const scan = recentScans.value.find(s => s.id === forwardFoundItem.value!.id)
  if (scan) {
    scan.status = AppraisalStatus.PRZEKAZANA_DO_CENTRALI
  }

  forwardedItems.value.unshift({
    id: forwardFoundItem.value.id,
    appraisalNumber: forwardFoundItem.value.appraisalNumber,
    trackingNumber: forwardFoundItem.value.trackingNumber,
    clientName: forwardFoundItem.value.clientName,
    productCount: forwardFoundItem.value.productCount,
    forwardedAt: new Date().toISOString()
  })

  forwardMessage.value = {
    type: 'success',
    text: `Wycena ${forwardFoundItem.value.appraisalNumber} przekazana do centrali.`
  }
  forwardFoundItem.value = null
}

function goToManualAppraisal() {
  router.push('/salon/nowa-wycena')
}

function getStatusLabel(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.label || 'Nieznany'
}

function getStatusSeverity(status: AppraisalStatus) {
  return STATUS_CONFIG[status]?.severity || 'info'
}
</script>

<template>
  <div class="store-ops">
    <div class="store-ops__header">
      <h1>Operacje salonowe</h1>
    </div>

    <!-- Scan packages -->
    <Card class="store-ops__section">
      <template #title>
        <div class="section-title">
          <i class="pi pi-barcode" />
          <span>Skanowanie paczek</span>
        </div>
      </template>
      <template #content>
        <p class="section-desc">Zeskanuj kod kreskowy przesylki, aby zarejestrowac jej przyjecie i zmienic status na "W trakcie weryfikacji".</p>
        <div class="scan-bar">
          <InputText
            v-model="scanInput"
            placeholder="Zeskanuj lub wpisz numer przesylki..."
            class="scan-bar__input"
            @keydown.enter="handleScan"
          />
          <Button icon="pi pi-search" label="Skanuj" @click="handleScan" />
        </div>

        <div v-if="scanMessage" class="scan-message" :class="'scan-message--' + scanMessage.type">
          <i :class="scanMessage.type === 'success' ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'" />
          <span>{{ scanMessage.text }}</span>
        </div>

        <DataTable
          v-if="recentScans.length"
          :value="recentScans"
          :rows="10"
          size="small"
          stripedRows
          class="store-ops__table"
        >
          <Column field="appraisalNumber" header="Nr wyceny" style="width: 160px">
            <template #body="{ data }">
              <strong>{{ data.appraisalNumber }}</strong>
            </template>
          </Column>
          <Column field="trackingNumber" header="Nr przesylki" style="width: 180px" />
          <Column field="clientName" header="Klient" />
          <Column field="productCount" header="Produkty" style="width: 100px" />
          <Column field="status" header="Status" style="width: 220px">
            <template #body="{ data }">
              <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
            </template>
          </Column>
          <Column field="scannedAt" header="Zeskanowano" style="width: 160px">
            <template #body="{ data }">
              {{ formatDateNumeric(data.scannedAt) }}
            </template>
          </Column>
        </DataTable>

        <div v-else class="empty-hint">
          <i class="pi pi-inbox" />
          <p>Brak zeskanowanych paczek</p>
        </div>
      </template>
    </Card>

    <!-- Forward to HQ -->
    <Card class="store-ops__section">
      <template #title>
        <div class="section-title">
          <i class="pi pi-building" />
          <span>Przekazanie do centrali</span>
        </div>
      </template>
      <template #content>
        <p class="section-desc">Zeskanuj paczke, aby przekazac ja do centrali w celu dalszej weryfikacji.</p>
        <div class="scan-bar">
          <InputText
            v-model="forwardScanInput"
            placeholder="Zeskanuj numer przesylki do przekazania..."
            class="scan-bar__input"
            @keydown.enter="handleForwardScan"
          />
          <Button icon="pi pi-search" label="Szukaj" severity="secondary" @click="handleForwardScan" />
        </div>

        <div v-if="forwardMessage" class="scan-message" :class="'scan-message--' + forwardMessage.type">
          <i :class="forwardMessage.type === 'success' ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'" />
          <span>{{ forwardMessage.text }}</span>
        </div>

        <div v-if="forwardFoundItem" class="forward-preview">
          <div class="forward-preview__info">
            <div><strong>Wycena:</strong> {{ forwardFoundItem.appraisalNumber }}</div>
            <div><strong>Nr przesylki:</strong> {{ forwardFoundItem.trackingNumber }}</div>
            <div><strong>Klient:</strong> {{ forwardFoundItem.clientName }}</div>
            <div><strong>Produkty:</strong> {{ forwardFoundItem.productCount }}</div>
          </div>
          <Button icon="pi pi-send" label="Przekaz do centrali" severity="warn" @click="forwardToHQ" />
        </div>

        <h3 v-if="pendingForwardItems.length" class="sub-heading">Oczekujace na przekazanie</h3>
        <DataTable
          v-if="pendingForwardItems.length"
          :value="pendingForwardItems"
          :rows="10"
          size="small"
          stripedRows
          class="store-ops__table"
        >
          <Column field="appraisalNumber" header="Nr wyceny" style="width: 160px" />
          <Column field="trackingNumber" header="Nr przesylki" style="width: 180px" />
          <Column field="clientName" header="Klient" />
          <Column field="productCount" header="Produkty" style="width: 100px" />
          <Column field="status" header="Status" style="width: 220px">
            <template #body="{ data }">
              <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
            </template>
          </Column>
        </DataTable>

        <h3 v-if="forwardedItems.length" class="sub-heading">Przekazane dzisiaj</h3>
        <DataTable
          v-if="forwardedItems.length"
          :value="forwardedItems"
          :rows="10"
          size="small"
          stripedRows
          class="store-ops__table"
        >
          <Column field="appraisalNumber" header="Nr wyceny" style="width: 160px" />
          <Column field="trackingNumber" header="Nr przesylki" style="width: 180px" />
          <Column field="clientName" header="Klient" />
          <Column field="forwardedAt" header="Przekazano" style="width: 160px">
            <template #body="{ data }">
              {{ formatDateNumeric(data.forwardedAt) }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Manual appraisal link -->
    <Card class="store-ops__section store-ops__section--action">
      <template #content>
        <div class="action-row">
          <div class="action-row__info">
            <i class="pi pi-pencil" />
            <div>
              <h3>Reczna wycena</h3>
              <p>Przyjmij sprzet od klienta osobiscie i stworz wycene recznie.</p>
            </div>
          </div>
          <Button icon="pi pi-arrow-right" label="Przejdz do recznej wyceny" @click="goToManualAppraisal" />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped lang="scss">
.store-ops {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__header {
    h1 { margin: 0; }
  }

  &__section {
    :deep(.p-card-content) { padding: 0; }
  }

  &__section--action {
    :deep(.p-card-body) { padding: 1.25rem; }
  }

  &__table {
    margin-top: 1rem;
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;

  i {
    color: var(--awu-blue);
    font-size: 1.25rem;
  }
}

.section-desc {
  margin: 0 0 1rem;
  color: var(--awu-gray-500);
  font-size: 0.875rem;
}

.scan-bar {
  display: flex;
  gap: 0.5rem;
  max-width: 600px;

  &__input {
    flex: 1;
    font-size: 1.1rem;
  }
}

.scan-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--awu-border-radius);
  font-size: 0.875rem;

  &--success {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  &--error {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  i { font-size: 1.1rem; }
}

.forward-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid var(--awu-gray-200);
  border-radius: var(--awu-border-radius);

  &__info {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.5rem;
    font-size: 0.875rem;
  }
}

.sub-heading {
  margin: 1.25rem 0 0.5rem;
  font-size: 0.95rem;
  color: var(--awu-gray-600);
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  &__info {
    display: flex;
    align-items: center;
    gap: 1rem;

    i {
      font-size: 2rem;
      color: var(--awu-blue);
    }

    h3 {
      margin: 0 0 0.25rem;
      font-size: 1.1rem;
    }

    p {
      margin: 0;
      color: var(--awu-gray-500);
      font-size: 0.875rem;
    }
  }
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--awu-gray-400);

  i { font-size: 2rem; }
  p { margin: 0; }
}

@media (max-width: 768px) {
  .scan-bar {
    flex-direction: column;
    max-width: 100%;
  }

  .forward-preview {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-row {
    flex-direction: column;
    text-align: center;

    &__info {
      flex-direction: column;
    }
  }
}
</style>
