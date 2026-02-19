<script setup lang="ts">
import { ref, computed } from 'vue'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

// Notification settings
const emailNotifications = ref(true)
const smsNotifications = ref(false)
const autoAssign = ref(true)
const reminderDays = ref(6)
const soundEnabled = ref(true)

// Display settings
const tableRowsDefault = ref(25)
const dateFormat = ref('DD.MM.YYYY')
const themeMode = ref('light')

// Business rules
const serviceAuditCost = ref(59)
const returnCourierCost = ref(16)
const expiryDays = ref(14)
const maxProductsPerAppraisal = ref(20)

// Keyboard shortcuts
const shortcuts = ref([
  { action: 'Skanowanie kodu', key: 'Ctrl+K', description: 'Przejdź do pola skanowania' },
  { action: 'Nowa wycena', key: 'Ctrl+N', description: 'Otwórz formularz ręcznej wyceny' },
  { action: 'Szukaj wyceny', key: 'Ctrl+F', description: 'Przejdź do wyszukiwarki wycen' },
  { action: 'Dashboard', key: 'Ctrl+D', description: 'Wróć do dashboardu' }
])

const dateFormatOptions = [
  { label: 'DD.MM.YYYY', value: 'DD.MM.YYYY' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' }
]

const themeOptions = [
  { label: 'Jasny', value: 'light' },
  { label: 'Ciemny (wkrótce)', value: 'dark' }
]

const rowOptions = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 }
]

const saved = ref(false)

function saveSettings() {
  saved.value = true
  setTimeout(() => { saved.value = false }, 3000)
}
</script>

<template>
  <div class="settings">
    <div class="settings__header">
      <h1>Ustawienia</h1>
      <Button label="Zapisz zmiany" icon="pi pi-check" @click="saveSettings" />
    </div>

    <Message v-if="saved" severity="success" :closable="true" class="settings__success">
      Ustawienia zostały zapisane pomyślnie.
    </Message>

    <!-- Profile info -->
    <Card class="settings__card">
      <template #title>
        <div class="card-title">
          <i class="pi pi-user" />
          <span>Profil użytkownika</span>
        </div>
      </template>
      <template #content>
        <div class="settings-grid">
          <div class="setting-item">
            <label>Imię i nazwisko</label>
            <InputText :modelValue="authStore.user?.name" disabled />
          </div>
          <div class="setting-item">
            <label>Email</label>
            <InputText :modelValue="authStore.user?.email" disabled />
          </div>
          <div class="setting-item">
            <label>Rola</label>
            <InputText :modelValue="authStore.isAdmin ? 'Administrator' : authStore.canManualPrice ? 'Senior Operator' : 'Operator'" disabled />
          </div>
          <div class="setting-item">
            <label>Lokalizacja</label>
            <InputText :modelValue="authStore.user?.locationName" disabled />
          </div>
        </div>
      </template>
    </Card>

    <!-- Notification settings -->
    <Card class="settings__card">
      <template #title>
        <div class="card-title">
          <i class="pi pi-bell" />
          <span>Powiadomienia</span>
        </div>
      </template>
      <template #content>
        <div class="settings-list">
          <div class="setting-toggle">
            <div class="setting-toggle__info">
              <strong>Powiadomienia email</strong>
              <p>Otrzymuj powiadomienia o nowych wycenach i zmianach statusów</p>
            </div>
            <ToggleSwitch v-model="emailNotifications" />
          </div>
          <Divider />
          <div class="setting-toggle">
            <div class="setting-toggle__info">
              <strong>Powiadomienia SMS</strong>
              <p>Otrzymuj SMS o pilnych zmianach statusów</p>
            </div>
            <ToggleSwitch v-model="smsNotifications" />
          </div>
          <Divider />
          <div class="setting-toggle">
            <div class="setting-toggle__info">
              <strong>Dźwięki</strong>
              <p>Odtwarzaj dźwięk po zeskanowaniu kodu kreskowego</p>
            </div>
            <ToggleSwitch v-model="soundEnabled" />
          </div>
          <Divider />
          <div class="setting-toggle">
            <div class="setting-toggle__info">
              <strong>Automatyczne przypisanie operatora</strong>
              <p>Nowe wyceny są automatycznie przypisywane do zalogowanego operatora</p>
            </div>
            <ToggleSwitch v-model="autoAssign" />
          </div>
          <Divider />
          <div class="setting-inline">
            <div class="setting-toggle__info">
              <strong>Przypomnienie o decyzji klienta</strong>
              <p>Po ilu dniach wysłać przypomnienie do klienta o podjęcie decyzji</p>
            </div>
            <InputNumber v-model="reminderDays" :min="1" :max="30" suffix=" dni" style="width: 120px" />
          </div>
        </div>
      </template>
    </Card>

    <!-- Display settings -->
    <Card class="settings__card">
      <template #title>
        <div class="card-title">
          <i class="pi pi-desktop" />
          <span>Wyświetlanie</span>
        </div>
      </template>
      <template #content>
        <div class="settings-grid">
          <div class="setting-item">
            <label>Format daty</label>
            <Select v-model="dateFormat" :options="dateFormatOptions" optionLabel="label" optionValue="value" />
          </div>
          <div class="setting-item">
            <label>Motyw</label>
            <Select v-model="themeMode" :options="themeOptions" optionLabel="label" optionValue="value" />
          </div>
          <div class="setting-item">
            <label>Domyślna liczba wierszy w tabeli</label>
            <Select v-model="tableRowsDefault" :options="rowOptions" optionLabel="label" optionValue="value" />
          </div>
        </div>
      </template>
    </Card>

    <!-- Business rules -->
    <Card class="settings__card" v-if="authStore.isAdmin">
      <template #title>
        <div class="card-title">
          <i class="pi pi-cog" />
          <span>Reguły biznesowe</span>
        </div>
      </template>
      <template #content>
        <div class="settings-grid">
          <div class="setting-item">
            <label>Koszt audytu serwisowego (PLN)</label>
            <InputNumber v-model="serviceAuditCost" mode="currency" currency="PLN" locale="pl-PL" />
          </div>
          <div class="setting-item">
            <label>Koszt zwrotu kurierem (PLN)</label>
            <InputNumber v-model="returnCourierCost" mode="currency" currency="PLN" locale="pl-PL" />
          </div>
          <div class="setting-item">
            <label>Ważność wyceny (dni)</label>
            <InputNumber v-model="expiryDays" :min="1" :max="90" suffix=" dni" />
          </div>
          <div class="setting-item">
            <label>Max produktów na wycenę</label>
            <InputNumber v-model="maxProductsPerAppraisal" :min="1" :max="50" />
          </div>
        </div>
      </template>
    </Card>

    <!-- Keyboard shortcuts -->
    <Card class="settings__card">
      <template #title>
        <div class="card-title">
          <i class="pi pi-key" />
          <span>Skróty klawiaturowe</span>
        </div>
      </template>
      <template #content>
        <div class="shortcuts-list">
          <div v-for="shortcut in shortcuts" :key="shortcut.action" class="shortcut-item">
            <div class="shortcut-item__info">
              <strong>{{ shortcut.action }}</strong>
              <p>{{ shortcut.description }}</p>
            </div>
            <kbd class="shortcut-item__key">{{ shortcut.key }}</kbd>
          </div>
        </div>
      </template>
    </Card>

    <!-- About -->
    <Card class="settings__card">
      <template #title>
        <div class="card-title">
          <i class="pi pi-info-circle" />
          <span>O systemie</span>
        </div>
      </template>
      <template #content>
        <div class="about-info">
          <div class="about-item">
            <span class="about-item__label">Wersja</span>
            <span class="about-item__value">1.0.0-prototype</span>
          </div>
          <div class="about-item">
            <span class="about-item__label">Środowisko</span>
            <span class="about-item__value">Prototyp (GitHub Pages)</span>
          </div>
          <div class="about-item">
            <span class="about-item__label">Dane</span>
            <span class="about-item__value">Mock data (zaimportowane z Exceli)</span>
          </div>
          <div class="about-item">
            <span class="about-item__label">Technologie</span>
            <span class="about-item__value">Vue 3 + TypeScript + PrimeVue 4 + Pinia</span>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped lang="scss">
.settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 900px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h1 { margin: 0; }
  }

  &__success {
    margin: 0;
  }

  &__card {
    :deep(.p-card-content) { padding: 0; }
  }
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;

  i {
    color: var(--awu-blue);
    font-size: 1.2rem;
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--awu-gray-600);
  }
}

.settings-list {
  display: flex;
  flex-direction: column;
}

.setting-toggle,
.setting-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0;

  &__info {
    flex: 1;

    strong {
      font-size: 0.925rem;
      display: block;
    }

    p {
      margin: 0.125rem 0 0;
      font-size: 0.8rem;
      color: var(--awu-gray-500);
    }
  }
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--awu-gray-50);
  border-radius: var(--awu-border-radius);

  &__info {
    strong {
      font-size: 0.925rem;
      display: block;
    }

    p {
      margin: 0.125rem 0 0;
      font-size: 0.8rem;
      color: var(--awu-gray-500);
    }
  }

  &__key {
    background: var(--awu-gray-100);
    border: none;
    border-radius: var(--awu-border-radius-xs);
    padding: 0.25rem 0.75rem;
    font-family: monospace;
    font-size: 0.85rem;
    color: var(--awu-gray-700);
    white-space: nowrap;
  }
}

.about-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.about-item {
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

@media (max-width: 768px) {
  .settings-grid,
  .about-info {
    grid-template-columns: 1fr;
  }

  .settings__header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
}
</style>
