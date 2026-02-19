<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
import { useAppraisalDetailStore } from '@/stores/appraisalDetail.store'
import { useAuthStore } from '@/stores/auth.store'
import { useDictionaryStore } from '@/stores/dictionary.store'
import { STATUS_CONFIG, getAvailableTransitions } from '@/utils/statusConfig'
import { AppraisalStatus } from '@/types/enums'
import { formatDateNumeric, formatDateRelative } from '@/utils/dateFormatter'
import { formatPrice } from '@/utils/priceFormatter'
import type { AppraisalProduct } from '@/types/product.types'

const route = useRoute()
const router = useRouter()
const detailStore = useAppraisalDetailStore()
const authStore = useAuthStore()
const dictStore = useDictionaryStore()

const activeTab = ref(0)
const statusDialogVisible = ref(false)
const selectedNewStatus = ref<AppraisalStatus | null>(null)
const courierDialogVisible = ref(false)
const emailDialogVisible = ref(false)
const emailSubject = ref('')
const emailBody = ref('')
const newMessage = ref('')

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

function getRatingLabel(ratingId: number | undefined) {
  if (!ratingId) return '—'
  const r = dictStore.ratingTypes.find(rt => rt.id === ratingId)
  return r ? r.name : `${ratingId}/10`
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

function canEditPrice(product: AppraisalProduct): boolean {
  if (product.hasPriceInDatabase) return false
  return authStore.canManualPrice
}

function sendEmail() {
  if (appraisal.value && emailSubject.value && emailBody.value) {
    detailStore.addCommunication({
      type: 'email_sent',
      subject: emailSubject.value,
      body: emailBody.value,
      to: appraisal.value.client.email
    })
    emailSubject.value = ''
    emailBody.value = ''
    emailDialogVisible.value = false
  }
}

function sendSms() {
  if (appraisal.value && newMessage.value) {
    detailStore.addCommunication({
      type: 'sms_sent',
      subject: null,
      body: newMessage.value,
      to: appraisal.value.client.phoneNumber
    })
    newMessage.value = ''
  }
}
</script>

<template>
  <div class="appraisal-detail" v-if="appraisal">
    <!-- Header -->
    <div class="detail-header">
      <div class="detail-header__left">
        <Button icon="pi pi-arrow-left" text rounded severity="secondary" @click="goBack" />
        <div>
          <h1 class="detail-header__title">Wycena #{{ appraisal.appraisalNumber }}</h1>
          <div class="detail-header__meta">
            <Tag :value="statusConfig?.label" :severity="statusConfig?.severity" />
            <span class="meta-item"><i class="pi pi-map-marker" /> {{ appraisal.locationName }}</span>
            <span class="meta-item" v-if="appraisal.assignedOperatorName"><i class="pi pi-user" /> {{ appraisal.assignedOperatorName }}</span>
            <span class="meta-item"><i class="pi pi-calendar" /> {{ formatDateNumeric(appraisal.createdAt) }}</span>
          </div>
        </div>
      </div>
      <div class="detail-header__actions">
        <Button
          v-for="trans in availableTransitions"
          :key="trans.id"
          :label="trans.label"
          :icon="trans.icon"
          :severity="trans.severity === 'danger' ? 'danger' : 'info'"
          size="small"
          @click="changeStatus(trans.id)"
        />
      </div>
    </div>

    <!-- Client Info -->
    <Card class="client-card">
      <template #content>
        <div class="client-info">
          <div class="client-info__item">
            <i class="pi pi-user" />
            <div>
              <strong>{{ appraisal.client.name }}</strong>
              <div v-if="appraisal.client.isCompany" class="text-muted">Firma: {{ appraisal.client.companyName }} | NIP: {{ appraisal.client.nip }}</div>
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
          <div class="client-info__item" v-if="appraisal.trackingNumber">
            <i class="pi pi-truck" />
            <span>Nr przesyłki: <strong>{{ appraisal.trackingNumber }}</strong></span>
          </div>
          <div class="client-info__totals">
            <div>Przelew: <strong>{{ formatPrice(appraisal.totalPriceTransfer) }}</strong></div>
            <div>Karta podarunkowa: <strong>{{ formatPrice(appraisal.totalPriceGiftCard) }}</strong></div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Tabs -->
    <TabView v-model:activeIndex="activeTab" class="detail-tabs">
      <!-- Tab 1: Weryfikacja -->
      <TabPanel header="Weryfikacja">
        <!-- Version timeline -->
        <Panel header="Historia wersji" toggleable collapsed v-if="appraisal.versions.length > 1" class="mb-3">
          <Timeline :value="appraisal.versions" layout="horizontal" align="top">
            <template #content="{ item }">
              <div class="version-item">
                <strong>Wersja {{ item.versionNumber }}</strong>
                <div class="text-muted">{{ formatDateNumeric(item.createdAt) }}</div>
                <div class="text-muted">{{ item.createdBy }}</div>
                <div v-if="item.reason" class="text-muted">{{ item.reason }}</div>
              </div>
            </template>
          </Timeline>
        </Panel>

        <!-- Products comparison -->
        <div class="products-list">
          <Card v-for="(product, idx) in appraisal.products" :key="product.id" class="product-card">
            <template #title>
              <div class="product-card__header">
                <span>{{ idx + 1 }}. {{ product.data.name }}</span>
                <div class="product-card__ids">
                  <small v-if="product.idVerto">ID Verto: {{ product.idVerto }}</small>
                  <small v-if="product.serialNumber">S/N: {{ product.serialNumber }}</small>
                </div>
              </div>
            </template>
            <template #content>
              <div class="product-compare">
                <!-- Deklaracja klienta -->
                <div class="compare-col compare-col--client">
                  <h3><i class="pi pi-user" /> Deklaracja klienta</h3>
                  <div class="compare-field">
                    <label>Ocena stanu:</label>
                    <Tag :value="getRatingLabel(product.declaredRating?.id)" severity="info" />
                  </div>
                  <div class="compare-field">
                    <label>Akcesoria ({{ product.declaredAccessories.length }}):</label>
                    <ul class="accessory-list">
                      <li v-for="acc in product.declaredAccessories" :key="acc.id">
                        <i class="pi pi-check-circle" style="color: var(--awu-green)" /> {{ acc.data.name }}
                      </li>
                    </ul>
                  </div>
                  <div class="compare-field" v-if="product.accessoryComment">
                    <label>Uwagi klienta:</label>
                    <p>{{ product.accessoryComment }}</p>
                  </div>
                </div>

                <Divider layout="vertical" class="compare-divider" />

                <!-- Weryfikacja operatora -->
                <div class="compare-col compare-col--operator">
                  <h3><i class="pi pi-shield" /> Weryfikacja operatora</h3>
                  <div class="compare-field">
                    <label>Ocena stanu:</label>
                    <Select
                      :modelValue="product.verifiedRating?.id"
                      @update:modelValue="(val: number) => { if (product.verifiedRating) product.verifiedRating.id = val }"
                      :options="dictStore.ratingTypes"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Wybierz ocenę"
                      :class="getRatingClass(product.declaredRating?.id, product.verifiedRating?.id)"
                    />
                    <Message
                      v-if="product.verifiedRating && product.declaredRating && product.verifiedRating.id !== product.declaredRating.id"
                      severity="warn"
                      :closable="false"
                      class="mt-2"
                    >
                      Rozbieżność: klient {{ getRatingLabel(product.declaredRating.id) }} vs operator {{ getRatingLabel(product.verifiedRating.id) }}
                    </Message>
                  </div>
                  <div class="compare-field">
                    <label>Akcesoria zweryfikowane:</label>
                    <div v-for="acc in product.declaredAccessories" :key="acc.id" class="accessory-check">
                      <Checkbox
                        :modelValue="product.verifiedAccessories?.some(va => va.data.id === acc.data.id) ?? false"
                        :binary="true"
                        :inputId="'acc_' + product.id + '_' + acc.id"
                      />
                      <label :for="'acc_' + product.id + '_' + acc.id">{{ acc.data.name }}</label>
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
                  <div class="compare-field">
                    <label>Notatka wewnętrzna:</label>
                    <Textarea v-model="product.internalNote" rows="2" class="w-full" placeholder="Notatka operatora..." />
                  </div>
                </div>
              </div>

              <!-- Price section -->
              <Divider />
              <div class="product-price">
                <div class="price-row" v-if="product.hasPriceInDatabase">
                  <div class="price-item">
                    <label>Przelew:</label>
                    <strong>{{ formatPrice(product.priceTransfer) }}</strong>
                  </div>
                  <div class="price-item">
                    <label>Karta podarunkowa:</label>
                    <strong>{{ formatPrice(product.priceGiftCard) }}</strong>
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
                  <Tag value="Cena ręczna" severity="warn" icon="pi pi-pencil" />
                </div>
                <div class="price-row" v-else>
                  <Message severity="info" :closable="false">
                    Produkt wymaga wyceny przez uprawnionego operatora (senior/admin)
                  </Message>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <div class="verification-actions">
          <Button label="Zatwierdź weryfikację" icon="pi pi-check" severity="success" @click="changeStatus(AppraisalStatus.ZWERYFIKOWANA)" />
          <Button label="Utwórz korektę" icon="pi pi-pencil" severity="warn" @click="changeStatus(AppraisalStatus.SKORYGOWANA)" />
        </div>
      </TabPanel>

      <!-- Tab 2: Umowa -->
      <TabPanel header="Umowa">
        <div class="contract-section">
          <h2>Zarządzanie umową</h2>
          <div class="contract-info" v-if="appraisal.contracts.length > 0">
            <DataTable :value="appraisal.contracts" size="small" stripedRows>
              <Column field="number" header="Nr umowy" />
              <Column field="date" header="Data" />
              <Column field="status" header="Status">
                <template #body="{ data }">
                  <Tag :value="data.status" />
                </template>
              </Column>
              <Column header="Akcje" style="width: 200px">
                <template #body>
                  <Button icon="pi pi-print" label="Drukuj" text size="small" />
                  <Button icon="pi pi-send" label="Wyślij" text size="small" />
                </template>
              </Column>
            </DataTable>
          </div>
          <div v-else class="empty-contract">
            <p>Brak wygenerowanych umów dla tej wyceny.</p>
            <div class="contract-actions">
              <Button label="Generuj umowę kupna-sprzedaży" icon="pi pi-file" severity="info"
                v-if="!appraisal.client.isCompany" />
              <Button label="Informacja o fakturze VAT" icon="pi pi-file" severity="info"
                v-if="appraisal.client.isCompany" />
              <Button label="Generuj protokół przekazania" icon="pi pi-clipboard" severity="secondary" outlined />
            </div>
          </div>
        </div>
      </TabPanel>

      <!-- Tab 3: Komunikacja -->
      <TabPanel header="Komunikacja">
        <div class="communication-section">
          <div class="comm-header">
            <h2>Historia komunikacji</h2>
            <Button icon="pi pi-envelope" label="Nowy email" size="small" @click="emailDialogVisible = true" />
          </div>

          <div class="message-thread">
            <div
              v-for="msg in appraisal.communications"
              :key="msg.id"
              :class="['message-item', msg.type.includes('sent') ? 'message-item--sent' : 'message-item--received']"
            >
              <div class="message-item__header">
                <Tag
                  :value="msg.type === 'email_sent' ? 'Email wysłany' : msg.type === 'email_received' ? 'Email odebrany' : msg.type === 'sms_sent' ? 'SMS wysłany' : msg.type === 'sms_received' ? 'SMS odebrany' : 'System'"
                  :severity="msg.type.includes('sent') ? 'info' : 'success'"
                  :icon="msg.type.includes('email') ? 'pi pi-envelope' : msg.type.includes('sms') ? 'pi pi-mobile' : 'pi pi-info-circle'"
                />
                <span class="message-item__time">{{ formatDateNumeric(msg.timestamp) }}</span>
              </div>
              <div class="message-item__subject" v-if="msg.subject">
                <strong>{{ msg.subject }}</strong>
              </div>
              <div class="message-item__body">{{ msg.body }}</div>
              <div class="message-item__meta">
                {{ msg.from }} → {{ msg.to }}
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
        <Dialog v-model:visible="emailDialogVisible" header="Nowy email" :style="{ width: '600px' }" modal>
          <div class="email-form">
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
              <Textarea v-model="emailBody" rows="6" class="w-full" placeholder="Treść wiadomości..." />
            </div>
          </div>
          <template #footer>
            <Button label="Anuluj" severity="secondary" text @click="emailDialogVisible = false" />
            <Button label="Wyślij" icon="pi pi-send" @click="sendEmail" :disabled="!emailSubject || !emailBody" />
          </template>
        </Dialog>
      </TabPanel>

      <!-- Tab 4: Wysyłka -->
      <TabPanel header="Wysyłka">
        <div class="shipping-section">
          <h2>Zarządzanie wysyłką</h2>

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
          </div>

          <div v-if="appraisal.shipments.length > 0" class="shipments-list">
            <h3>Przesyłki</h3>
            <DataTable :value="appraisal.shipments" size="small" stripedRows>
              <Column field="trackingNumber" header="Nr przesyłki" />
              <Column field="carrier" header="Kurier" />
              <Column field="status" header="Status">
                <template #body="{ data }">
                  <Tag :value="data.status" />
                </template>
              </Column>
              <Column field="createdAt" header="Data">
                <template #body="{ data }">
                  {{ formatDateNumeric(data.createdAt) }}
                </template>
              </Column>
            </DataTable>
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
      </TabPanel>

      <!-- Tab 5: Historia -->
      <TabPanel header="Historia">
        <div class="history-section">
          <h2>Historia zmian</h2>
          <DataTable :value="appraisal.auditLog" size="small" stripedRows :paginator="true" :rows="20">
            <Column field="timestamp" header="Data" style="width: 160px">
              <template #body="{ data }">
                {{ formatDateNumeric(data.timestamp) }}
              </template>
            </Column>
            <Column field="operatorName" header="Operator" style="width: 160px" />
            <Column field="locationName" header="Lokalizacja" style="width: 130px" />
            <Column field="action" header="Akcja" />
            <Column field="details" header="Szczegóły" />
          </DataTable>
        </div>
      </TabPanel>
    </TabView>
  </div>

  <!-- Loading -->
  <div v-else class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    <p>Ładowanie wyceny...</p>
  </div>
</template>

<style scoped lang="scss">
.appraisal-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
    gap: 0.5rem;
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
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
}

.client-card {
  :deep(.p-card-content) { padding-top: 0; }
}

.client-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;

  &__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    i { color: var(--awu-gray-400); }
  }

  &__totals {
    margin-left: auto;
    display: flex;
    gap: 1.5rem;
    font-size: 0.9rem;
  }
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.product-card {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  &__ids {
    display: flex;
    gap: 1rem;
    color: var(--awu-gray-500);
  }
}

.product-compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    .compare-divider { display: none; }
  }
}

.compare-col {
  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem;
    font-size: 1rem;
  }

  &--client {
    h3 { color: var(--awu-blue); }
  }
  &--operator {
    h3 { color: var(--awu-green); }
  }
}

.compare-field {
  margin-bottom: 1rem;
  label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--awu-gray-500);
    margin-bottom: 0.25rem;
    text-transform: uppercase;
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
    padding: 0.25rem 0;
    font-size: 0.875rem;
  }
}

.accessory-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}

.mismatch { :deep(.p-select) { border-color: var(--awu-orange) !important; } }
.match { :deep(.p-select) { border-color: var(--awu-green) !important; } }

.product-price {
  .price-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .price-item {
    label {
      font-size: 0.8rem;
      color: var(--awu-gray-500);
      display: block;
    }
    strong { font-size: 1.25rem; }
  }
}

.verification-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}

.version-item {
  font-size: 0.8rem;
  strong { font-size: 0.9rem; }
}

.text-muted { color: var(--awu-gray-500); font-size: 0.8rem; }

// Communication
.communication-section {
  .comm-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    h2 { margin: 0; }
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
  border-radius: 8px;
  max-width: 80%;

  &--sent {
    align-self: flex-end;
    background: #e3f2fd;
    border: 1px solid #bbdefb;
  }
  &--received {
    align-self: flex-start;
    background: #fff;
    border: 1px solid var(--awu-gray-200);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }
  &__time { font-size: 0.75rem; color: var(--awu-gray-500); }
  &__subject { margin-bottom: 0.25rem; }
  &__body { font-size: 0.9rem; line-height: 1.4; }
  &__meta { font-size: 0.75rem; color: var(--awu-gray-400); margin-top: 0.375rem; }
}

.quick-sms {
  display: flex;
  gap: 0.5rem;
  .flex-1 { flex: 1; }
}

// Shipping
.shipping-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.shipping-card {
  :deep(.p-card-title) {
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

// Contract
.contract-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.empty-contract {
  text-align: center;
  padding: 2rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--awu-gray-400);
  i { font-size: 2.5rem; }
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

.email-form, .courier-form {
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

.mb-3 { margin-bottom: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.w-full { width: 100%; }
</style>
