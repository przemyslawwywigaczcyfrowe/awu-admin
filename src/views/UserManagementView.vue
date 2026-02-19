<script setup lang="ts">
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import type { AdminUser } from '@/types/user.types'
import { UserRole } from '@/types/enums'
import { formatDateNumeric } from '@/utils/dateFormatter'
import usersJson from '@/mock/data/users.json'
import locationsJson from '@/mock/data/locations.json'

// --- Data ---
const users = ref<(AdminUser & { active: boolean })[]>(
  (usersJson as AdminUser[]).map(u => ({
    ...u,
    active: true
  }))
)

const locations = locationsJson as { id: number; name: string; shortName: string }[]

// --- Filters ---
const searchQuery = ref('')
const filterRole = ref<string | null>(null)
const filterLocation = ref<number | null>(null)

const roleOptions = [
  { label: 'Wszystkie role', value: null },
  { label: 'Operator', value: UserRole.OPERATOR },
  { label: 'Senior Operator', value: UserRole.SENIOR_OPERATOR },
  { label: 'Administrator', value: UserRole.ADMIN }
]

const locationFilterOptions = computed(() => [
  { label: 'Wszystkie lokalizacje', value: null },
  ...locations.map(l => ({ label: l.shortName, value: l.id }))
])

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const matchesSearch = !searchQuery.value ||
      u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesRole = filterRole.value === null || u.role === filterRole.value

    const matchesLocation = filterLocation.value === null || u.locationId === filterLocation.value

    return matchesSearch && matchesRole && matchesLocation
  })
})

function clearFilters() {
  searchQuery.value = ''
  filterRole.value = null
  filterLocation.value = null
}

// --- Role display ---
function getRoleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN: return 'Administrator'
    case UserRole.SENIOR_OPERATOR: return 'Senior Operator'
    case UserRole.OPERATOR: return 'Operator'
    default: return 'Nieznany'
  }
}

function getRoleSeverity(role: UserRole): 'danger' | 'warn' | 'info' {
  switch (role) {
    case UserRole.ADMIN: return 'danger'
    case UserRole.SENIOR_OPERATOR: return 'warn'
    case UserRole.OPERATOR: return 'info'
    default: return 'info'
  }
}

// --- Dialog ---
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingUser = ref<(AdminUser & { active: boolean }) | null>(null)

const formData = ref({
  name: '',
  email: '',
  role: null as UserRole | null,
  locationId: null as number | null,
  active: true
})

const roleFormOptions = [
  { label: 'Operator', value: UserRole.OPERATOR },
  { label: 'Senior Operator', value: UserRole.SENIOR_OPERATOR },
  { label: 'Administrator', value: UserRole.ADMIN }
]

const locationFormOptions = computed(() =>
  locations.map(l => ({ label: l.shortName, value: l.id }))
)

const dialogTitle = computed(() => dialogMode.value === 'add' ? 'Dodaj użytkownika' : 'Edytuj użytkownika')

const isFormValid = computed(() => {
  return (
    formData.value.name.trim() !== '' &&
    formData.value.email.trim() !== '' &&
    formData.value.role !== null &&
    formData.value.locationId !== null
  )
})

function openAddDialog() {
  dialogMode.value = 'add'
  editingUser.value = null
  formData.value = {
    name: '',
    email: '',
    role: null,
    locationId: null,
    active: true
  }
  dialogVisible.value = true
}

function openEditDialog(user: AdminUser & { active: boolean }) {
  dialogMode.value = 'edit'
  editingUser.value = user
  formData.value = {
    name: user.name,
    email: user.email,
    role: user.role,
    locationId: user.locationId,
    active: user.active
  }
  dialogVisible.value = true
}

function saveUser() {
  if (!isFormValid.value) return

  const loc = locations.find(l => l.id === formData.value.locationId)

  if (dialogMode.value === 'add') {
    const maxId = users.value.reduce((max, u) => Math.max(max, u.id), 0)
    users.value.push({
      id: maxId + 1,
      name: formData.value.name,
      email: formData.value.email,
      role: formData.value.role!,
      locationId: formData.value.locationId!,
      locationName: loc?.shortName || '',
      permissions: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      active: formData.value.active
    })
  } else if (editingUser.value) {
    const idx = users.value.findIndex(u => u.id === editingUser.value!.id)
    if (idx !== -1) {
      users.value[idx] = {
        ...users.value[idx],
        name: formData.value.name,
        email: formData.value.email,
        role: formData.value.role!,
        locationId: formData.value.locationId!,
        locationName: loc?.shortName || '',
        active: formData.value.active
      }
    }
  }

  dialogVisible.value = false
}

function deleteUser(user: AdminUser & { active: boolean }) {
  users.value = users.value.filter(u => u.id !== user.id)
}
</script>

<template>
  <div class="user-mgmt">
    <div class="user-mgmt__header">
      <h1>Zarządzanie użytkownikami</h1>
      <Button icon="pi pi-plus" label="Dodaj użytkownika" @click="openAddDialog" />
    </div>

    <div class="user-mgmt__filters">
      <div class="filter-row">
        <InputText
          v-model="searchQuery"
          placeholder="Szukaj po imieniu lub emailu..."
          class="filter-input filter-input--wide"
        />
        <Select
          v-model="filterRole"
          :options="roleOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Rola"
          class="filter-input"
        />
        <Select
          v-model="filterLocation"
          :options="locationFilterOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Lokalizacja"
          class="filter-input"
        />
        <Button icon="pi pi-filter-slash" label="Wyczysc" severity="secondary" text size="small" @click="clearFilters" />
      </div>
    </div>

    <DataTable
      :value="filteredUsers"
      :paginator="true"
      :rows="25"
      :rowsPerPageOptions="[10, 25, 50]"
      stripedRows
      removableSort
      size="small"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
    >
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-users" />
          <p>Nie znaleziono użytkowników</p>
        </div>
      </template>

      <Column field="name" header="Imię i nazwisko" sortable>
        <template #body="{ data }">
          <div>
            <strong>{{ data.name }}</strong>
          </div>
        </template>
      </Column>
      <Column field="email" header="Email" sortable style="width: 220px">
        <template #body="{ data }">
          <span class="text-muted">{{ data.email }}</span>
        </template>
      </Column>
      <Column field="role" header="Rola" sortable style="width: 160px">
        <template #body="{ data }">
          <Tag :value="getRoleLabel(data.role)" :severity="getRoleSeverity(data.role)" />
        </template>
      </Column>
      <Column field="locationName" header="Lokalizacja" sortable style="width: 140px" />
      <Column field="active" header="Status" sortable style="width: 110px">
        <template #body="{ data }">
          <Tag
            :value="data.active ? 'Aktywny' : 'Nieaktywny'"
            :severity="data.active ? 'success' : 'secondary'"
          />
        </template>
      </Column>
      <Column field="lastLoginAt" header="Ostatnie logowanie" sortable style="width: 170px">
        <template #body="{ data }">
          {{ data.lastLoginAt ? formatDateNumeric(data.lastLoginAt) : 'Nigdy' }}
        </template>
      </Column>
      <Column header="Akcje" style="width: 120px">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button icon="pi pi-pencil" severity="secondary" text size="small" @click="openEditDialog(data)" />
            <Button icon="pi pi-trash" severity="danger" text size="small" @click="deleteUser(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Add / Edit user dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      modal
      :style="{ width: '500px' }"
      :draggable="false"
    >
      <div class="dialog-form">
        <div class="form-field">
          <label>Imię i nazwisko *</label>
          <InputText v-model="formData.name" placeholder="Jan Kowalski" />
        </div>
        <div class="form-field">
          <label>Email *</label>
          <InputText v-model="formData.email" placeholder="jan@cyfrowe.pl" type="email" />
        </div>
        <div class="form-field">
          <label>Rola *</label>
          <Select
            v-model="formData.role"
            :options="roleFormOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Wybierz rolę"
          />
        </div>
        <div class="form-field">
          <label>Lokalizacja *</label>
          <Select
            v-model="formData.locationId"
            :options="locationFormOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Wybierz lokalizację"
          />
        </div>
        <div class="form-switch">
          <label>Aktywny</label>
          <ToggleSwitch v-model="formData.active" />
        </div>
      </div>

      <template #footer>
        <Button label="Anuluj" severity="secondary" text @click="dialogVisible = false" />
        <Button label="Zapisz" icon="pi pi-check" :disabled="!isFormValid" @click="saveUser" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.user-mgmt {
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
  min-width: 180px;

  &--wide {
    flex: 1;
    min-width: 250px;
  }
}

.text-muted {
  color: var(--awu-gray-500);
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
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

.dialog-form {
  display: flex;
  flex-direction: column;
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
}

.form-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;

  label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--awu-gray-600);
  }
}

@media (max-width: 768px) {
  .user-mgmt__header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .filter-row {
    flex-direction: column;
  }

  .filter-input, .filter-input--wide {
    width: 100%;
    min-width: auto;
  }
}
</style>
