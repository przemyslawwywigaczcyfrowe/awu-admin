<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Stepper from 'primevue/stepper'
import StepList from 'primevue/steplist'
import StepPanels from 'primevue/steppanels'
import Step from 'primevue/step'
import StepPanel from 'primevue/steppanel'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { formatPrice } from '@/utils/priceFormatter'

const router = useRouter()

const activeStep = ref<string | number>('1')

// --- Step 1: Client data ---
const clientData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  documentType: null as string | null,
  documentNumber: '',
  isCompany: false,
  nip: '',
  companyName: '',
  street: '',
  postalCode: '',
  city: ''
})

const documentTypeOptions = [
  { label: 'Dowod osobisty', value: 'dowod' },
  { label: 'Paszport', value: 'paszport' }
]

const clientFullName = computed(() => {
  return `${clientData.value.firstName} ${clientData.value.lastName}`.trim()
})

const isStep1Valid = computed(() => {
  return (
    clientData.value.firstName.trim() !== '' &&
    clientData.value.lastName.trim() !== '' &&
    clientData.value.email.trim() !== '' &&
    clientData.value.phone.trim() !== '' &&
    clientData.value.documentType !== null &&
    clientData.value.documentNumber.trim() !== '' &&
    clientData.value.street.trim() !== '' &&
    clientData.value.postalCode.trim() !== '' &&
    clientData.value.city.trim() !== ''
  )
})

// --- Step 2: Products ---
interface ManualProduct {
  id: number
  name: string
  serialNumber: string
  rating: number | null
  accessories: string[]
  price: number | null
}

const ratingOptions = [
  { label: '10 - Idealny', value: 10 },
  { label: '9 - Bardzo dobry', value: 9 },
  { label: '8 - Dobry', value: 8 },
  { label: '7 - Dobry minus', value: 7 },
  { label: '6 - Dostateczny', value: 6 },
  { label: '5 - Slaby', value: 5 }
]

const accessoryOptions = [
  { label: 'Ladowarka', value: 'ladowarka' },
  { label: 'Kabel USB', value: 'kabel_usb' },
  { label: 'Sluchawki', value: 'sluchawki' },
  { label: 'Etui / Pokrowiec', value: 'etui' },
  { label: 'Oryginalne pudelko', value: 'pudelko' },
  { label: 'Instrukcja', value: 'instrukcja' },
  { label: 'Karta gwarancyjna', value: 'gwarancja' },
  { label: 'Pasek', value: 'pasek' },
  { label: 'Rysik', value: 'rysik' }
]

const newProduct = ref<ManualProduct>({
  id: 0,
  name: '',
  serialNumber: '',
  rating: null,
  accessories: [],
  price: null
})

const products = ref<ManualProduct[]>([])
let productIdCounter = 1

function addProduct() {
  if (!newProduct.value.name.trim() || newProduct.value.price === null) return

  products.value.push({
    ...newProduct.value,
    id: productIdCounter++
  })

  newProduct.value = {
    id: 0,
    name: '',
    serialNumber: '',
    rating: null,
    accessories: [],
    price: null
  }
}

function removeProduct(id: number) {
  products.value = products.value.filter(p => p.id !== id)
}

const isStep2Valid = computed(() => products.value.length > 0)

const totalPrice = computed(() => {
  return products.value.reduce((sum, p) => sum + (p.price || 0), 0)
})

function getRatingLabel(rating: number | null): string {
  if (rating === null) return '-'
  const opt = ratingOptions.find(r => r.value === rating)
  return opt ? opt.label : String(rating)
}

function getAccessoriesLabel(accessories: string[]): string {
  if (!accessories.length) return '-'
  return accessories
    .map(a => accessoryOptions.find(o => o.value === a)?.label || a)
    .join(', ')
}

// --- Step 4: Completion ---
const appraisalCompleted = ref(false)
const generatedNumber = ref('')

function generateAppraisalNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `AWU-${y}${m}${d}-${seq}`
}

function completeAppraisal() {
  generatedNumber.value = generateAppraisalNumber()
  appraisalCompleted.value = true
}

function printContract() {
  window.print()
}

function newAppraisal() {
  clientData.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentType: null,
    documentNumber: '',
    isCompany: false,
    nip: '',
    companyName: '',
    street: '',
    postalCode: '',
    city: ''
  }
  products.value = []
  appraisalCompleted.value = false
  generatedNumber.value = ''
  activeStep.value = '1'
}

function goToStoreOps() {
  router.push('/salon')
}
</script>

<template>
  <div class="manual-appraisal">
    <div class="manual-appraisal__header">
      <div>
        <h1>Reczna wycena</h1>
        <p class="manual-appraisal__subtitle">Przyjecie sprzetu od klienta w salonie</p>
      </div>
      <Button icon="pi pi-arrow-left" label="Powrot do operacji" severity="secondary" text @click="goToStoreOps" />
    </div>

    <Card class="manual-appraisal__stepper-card">
      <template #content>
        <Stepper v-model:value="activeStep" linear>
          <StepList>
            <Step value="1">Dane klienta</Step>
            <Step value="2">Produkty</Step>
            <Step value="3">Podsumowanie</Step>
            <Step value="4">Zakonczenie</Step>
          </StepList>

          <StepPanels>
            <!-- Step 1: Client data -->
            <StepPanel v-slot="{ activateCallback }" value="1">
              <div class="step-content">
                <h2 class="step-content__title">Dane klienta</h2>

                <div class="form-grid">
                  <div class="form-field">
                    <label>Imie *</label>
                    <InputText v-model="clientData.firstName" placeholder="Imie" />
                  </div>
                  <div class="form-field">
                    <label>Nazwisko *</label>
                    <InputText v-model="clientData.lastName" placeholder="Nazwisko" />
                  </div>
                  <div class="form-field">
                    <label>Email *</label>
                    <InputText v-model="clientData.email" placeholder="email@example.com" type="email" />
                  </div>
                  <div class="form-field">
                    <label>Telefon *</label>
                    <InputText v-model="clientData.phone" placeholder="+48 ..." />
                  </div>
                  <div class="form-field">
                    <label>Typ dokumentu *</label>
                    <Select
                      v-model="clientData.documentType"
                      :options="documentTypeOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Wybierz typ dokumentu"
                    />
                  </div>
                  <div class="form-field">
                    <label>Numer dokumentu *</label>
                    <InputText v-model="clientData.documentNumber" placeholder="Nr dokumentu" />
                  </div>
                </div>

                <div class="form-checkbox">
                  <Checkbox v-model="clientData.isCompany" :binary="true" inputId="isCompany" />
                  <label for="isCompany">Firma</label>
                </div>

                <div v-if="clientData.isCompany" class="form-grid">
                  <div class="form-field">
                    <label>NIP</label>
                    <InputText v-model="clientData.nip" placeholder="NIP firmy" />
                  </div>
                  <div class="form-field">
                    <label>Nazwa firmy</label>
                    <InputText v-model="clientData.companyName" placeholder="Nazwa firmy" />
                  </div>
                </div>

                <h3 class="step-content__section-title">Adres</h3>
                <div class="form-grid">
                  <div class="form-field form-field--wide">
                    <label>Ulica i numer *</label>
                    <InputText v-model="clientData.street" placeholder="ul. Przykladowa 12/3" />
                  </div>
                  <div class="form-field">
                    <label>Kod pocztowy *</label>
                    <InputText v-model="clientData.postalCode" placeholder="00-000" />
                  </div>
                  <div class="form-field">
                    <label>Miasto *</label>
                    <InputText v-model="clientData.city" placeholder="Miasto" />
                  </div>
                </div>

                <div class="step-actions">
                  <span />
                  <Button label="Dalej" icon="pi pi-arrow-right" iconPos="right" :disabled="!isStep1Valid" @click="activateCallback('2')" />
                </div>
              </div>
            </StepPanel>

            <!-- Step 2: Products -->
            <StepPanel v-slot="{ activateCallback }" value="2">
              <div class="step-content">
                <h2 class="step-content__title">Produkty</h2>

                <div class="product-form">
                  <div class="form-grid">
                    <div class="form-field form-field--wide">
                      <label>Nazwa produktu *</label>
                      <InputText v-model="newProduct.name" placeholder="np. Canon EOS R5" />
                    </div>
                    <div class="form-field">
                      <label>Numer seryjny</label>
                      <InputText v-model="newProduct.serialNumber" placeholder="S/N" />
                    </div>
                    <div class="form-field">
                      <label>Ocena</label>
                      <Select
                        v-model="newProduct.rating"
                        :options="ratingOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Wybierz ocene"
                      />
                    </div>
                    <div class="form-field form-field--wide">
                      <label>Akcesoria</label>
                      <MultiSelect
                        v-model="newProduct.accessories"
                        :options="accessoryOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Wybierz akcesoria"
                        display="chip"
                      />
                    </div>
                    <div class="form-field">
                      <label>Cena (zl) *</label>
                      <InputNumber
                        v-model="newProduct.price"
                        mode="currency"
                        currency="PLN"
                        locale="pl-PL"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <Button icon="pi pi-plus" label="Dodaj produkt" severity="secondary" outlined @click="addProduct" :disabled="!newProduct.name.trim() || newProduct.price === null" />
                </div>

                <DataTable
                  v-if="products.length"
                  :value="products"
                  size="small"
                  stripedRows
                  class="products-table"
                >
                  <Column field="name" header="Nazwa produktu" />
                  <Column field="serialNumber" header="Nr seryjny" style="width: 140px">
                    <template #body="{ data }">
                      {{ data.serialNumber || '-' }}
                    </template>
                  </Column>
                  <Column field="rating" header="Ocena" style="width: 160px">
                    <template #body="{ data }">
                      {{ getRatingLabel(data.rating) }}
                    </template>
                  </Column>
                  <Column field="accessories" header="Akcesoria" style="width: 200px">
                    <template #body="{ data }">
                      <span class="accessories-text">{{ getAccessoriesLabel(data.accessories) }}</span>
                    </template>
                  </Column>
                  <Column field="price" header="Cena" style="width: 120px">
                    <template #body="{ data }">
                      {{ formatPrice(data.price) }}
                    </template>
                  </Column>
                  <Column header="" style="width: 60px">
                    <template #body="{ data }">
                      <Button icon="pi pi-trash" severity="danger" text size="small" @click="removeProduct(data.id)" />
                    </template>
                  </Column>
                </DataTable>

                <div v-if="products.length" class="total-row">
                  <strong>Razem: {{ formatPrice(totalPrice) }}</strong>
                </div>

                <div v-if="!products.length" class="empty-hint">
                  <i class="pi pi-box" />
                  <p>Dodaj co najmniej jeden produkt</p>
                </div>

                <div class="step-actions">
                  <Button label="Wstecz" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('1')" />
                  <Button label="Dalej" icon="pi pi-arrow-right" iconPos="right" :disabled="!isStep2Valid" @click="activateCallback('3')" />
                </div>
              </div>
            </StepPanel>

            <!-- Step 3: Summary -->
            <StepPanel v-slot="{ activateCallback }" value="3">
              <div class="step-content">
                <h2 class="step-content__title">Podsumowanie</h2>

                <div class="summary-section">
                  <h3>Dane klienta</h3>
                  <div class="summary-grid">
                    <div class="summary-item">
                      <span class="summary-item__label">Imie i nazwisko</span>
                      <span class="summary-item__value">{{ clientFullName }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-item__label">Email</span>
                      <span class="summary-item__value">{{ clientData.email }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-item__label">Telefon</span>
                      <span class="summary-item__value">{{ clientData.phone }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-item__label">Dokument</span>
                      <span class="summary-item__value">
                        {{ clientData.documentType === 'dowod' ? 'Dowod osobisty' : 'Paszport' }} - {{ clientData.documentNumber }}
                      </span>
                    </div>
                    <div v-if="clientData.isCompany" class="summary-item">
                      <span class="summary-item__label">Firma</span>
                      <span class="summary-item__value">{{ clientData.companyName }} (NIP: {{ clientData.nip }})</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-item__label">Adres</span>
                      <span class="summary-item__value">{{ clientData.street }}, {{ clientData.postalCode }} {{ clientData.city }}</span>
                    </div>
                  </div>
                </div>

                <div class="summary-section">
                  <h3>Produkty ({{ products.length }})</h3>
                  <DataTable
                    :value="products"
                    size="small"
                    stripedRows
                  >
                    <Column field="name" header="Nazwa produktu" />
                    <Column field="serialNumber" header="Nr seryjny" style="width: 140px">
                      <template #body="{ data }">
                        {{ data.serialNumber || '-' }}
                      </template>
                    </Column>
                    <Column field="rating" header="Ocena" style="width: 140px">
                      <template #body="{ data }">
                        {{ getRatingLabel(data.rating) }}
                      </template>
                    </Column>
                    <Column field="price" header="Cena" style="width: 120px">
                      <template #body="{ data }">
                        {{ formatPrice(data.price) }}
                      </template>
                    </Column>
                  </DataTable>
                  <div class="total-row total-row--large">
                    <strong>Laczna kwota: {{ formatPrice(totalPrice) }}</strong>
                  </div>
                </div>

                <div class="step-actions">
                  <Button label="Wstecz" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('2')" />
                  <Button label="Zatwierdz wycene" icon="pi pi-check" severity="success" @click="completeAppraisal(); activateCallback('4')" />
                </div>
              </div>
            </StepPanel>

            <!-- Step 4: Completion -->
            <StepPanel value="4">
              <div class="step-content step-content--center">
                <div class="completion">
                  <div class="completion__icon">
                    <i class="pi pi-check-circle" />
                  </div>
                  <h2>Wycena zostala utworzona</h2>
                  <p class="completion__number">Nr wyceny: <strong>{{ generatedNumber }}</strong></p>
                  <p class="completion__info">Wycena zostala zapisana w systemie. Mozesz teraz wydrukowac umowe lub rozpoczac nowa wycene.</p>

                  <div class="completion__actions">
                    <Button icon="pi pi-print" label="Drukuj umowe" severity="secondary" outlined @click="printContract" />
                    <Button icon="pi pi-plus" label="Nowa wycena" @click="newAppraisal" />
                    <Button icon="pi pi-arrow-left" label="Wroc do operacji salonowych" severity="secondary" text @click="goToStoreOps" />
                  </div>
                </div>
              </div>
            </StepPanel>
          </StepPanels>
        </Stepper>
      </template>
    </Card>
  </div>
</template>

<style scoped lang="scss">
.manual-appraisal {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    h1 { margin: 0; }
  }

  &__subtitle {
    color: var(--awu-gray-500);
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
  }

  &__stepper-card {
    :deep(.p-card-content) { padding: 0; }
  }
}

.step-content {
  padding: 1.5rem 0;

  &__title {
    margin: 0 0 1.5rem;
    font-size: 1.25rem;
  }

  &__section-title {
    margin: 1.5rem 0 0.75rem;
    font-size: 1rem;
    color: var(--awu-gray-600);
  }

  &--center {
    display: flex;
    justify-content: center;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--awu-gray-600);
  }

  &--wide {
    grid-column: 1 / -1;
  }
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;

  label {
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
}

.product-form {
  background: #f8fafc;
  border: 1px solid var(--awu-gray-200);
  border-radius: var(--awu-border-radius);
  padding: 1.25rem;
  margin-bottom: 1rem;

  .form-grid {
    margin-bottom: 1rem;
  }
}

.products-table {
  margin-top: 0.5rem;
}

.accessories-text {
  font-size: 0.8rem;
  color: var(--awu-gray-500);
}

.total-row {
  text-align: right;
  padding: 0.75rem 0;
  font-size: 1rem;

  &--large {
    font-size: 1.25rem;
    padding-top: 1rem;
    border-top: 2px solid var(--awu-gray-200);
    margin-top: 0.5rem;
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

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--awu-gray-200);
}

.summary-section {
  margin-bottom: 1.5rem;

  h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    color: var(--awu-gray-700);
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;

  &__label {
    font-size: 0.75rem;
    color: var(--awu-gray-500);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  &__value {
    font-size: 0.925rem;
  }
}

.completion {
  text-align: center;
  max-width: 500px;

  &__icon {
    font-size: 4rem;
    color: #10B981;
    margin-bottom: 1rem;
  }

  h2 {
    margin: 0 0 0.5rem;
  }

  &__number {
    font-size: 1.25rem;
    color: var(--awu-blue);
    margin: 0 0 0.5rem;
  }

  &__info {
    color: var(--awu-gray-500);
    font-size: 0.875rem;
    margin: 0 0 1.5rem;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .manual-appraisal__header {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
